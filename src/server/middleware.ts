import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';

// --- JWT OTURUM YÖNETİMİ ---
export interface SessionPayload { userId: number; email: string; name: string; role: string }

const JWT_SECRET: string = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  console.warn('⚠ JWT_SECRET tanımlı değil! .env dosyasına güçlü bir JWT_SECRET ekleyin.');
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || crypto.createHash('sha256').update('kerimbilgisayar-fallback-' + (process.env.DATABASE_NAME || 'db')).digest('hex');
export const ADMIN_TOKEN_TTL = '8h';
export const CUSTOMER_TOKEN_TTL = '30d';

export function signToken(payload: SessionPayload, scope: 'admin' | 'customer', ttl: string): string {
  return jwt.sign({ ...payload, scope }, EFFECTIVE_JWT_SECRET, { expiresIn: ttl } as jwt.SignOptions);
}

export function verifyToken(token: string, scope: 'admin' | 'customer'): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET) as any;
    if (decoded.scope !== scope) return null;
    return { userId: decoded.userId, email: decoded.email, name: decoded.name, role: decoded.role };
  } catch {
    return null;
  }
}

// --- ŞİFRE GÜVENLİĞİ ---
const SALT_ROUNDS = 12;
export async function hashPassword(raw: string): Promise<string> {
  return bcrypt.hash(raw, SALT_ROUNDS);
}
export function isBcryptHash(value?: string | null): boolean {
  return !!value && /^\$2[aby]\$/.test(value);
}
export async function verifyPassword(raw: string, stored?: string | null): Promise<boolean> {
  if (!stored) return false;
  if (isBcryptHash(stored)) return bcrypt.compare(raw, stored);
  return raw === stored;
}

// --- AUTH MIDDLEWARES ---
export function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  }
  const token = authHeader.slice(7);
  const session = verifyToken(token, 'admin');
  if (!session) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
  (req as any).adminUser = session;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = (req as any).adminUser;
    if (!session || !roles.includes(session.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    next();
  };
}

export function requireCustomer(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  }
  const token = authHeader.slice(7);
  const session = verifyToken(token, 'customer');
  if (!session) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
  (req as any).customerUser = session;
  next();
}

export async function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['x-api-key'] || req.headers.authorization;
  let providedKey = '';

  if (typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7);
    } else {
      providedKey = authHeader;
    }
  }

  if (!providedKey || !providedKey.startsWith('kb_')) {
    return res.status(401).json({ error: 'Geçersiz veya eksik API Key' });
  }

  try {
    const keyHash = crypto.createHash('sha256').update(providedKey).digest('hex');
    const matchedKey = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);

    if (matchedKey.length === 0) {
      return res.status(401).json({ error: 'Yetkisiz API Key' });
    }

    db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, matchedKey[0].id)).execute().catch(console.error);

    (req as any).apiClient = matchedKey[0];
    next();
  } catch (err) {
    res.status(500).json({ error: 'API Key doğrulama hatası' });
  }
}

// --- RATE LIMITERS ---
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
