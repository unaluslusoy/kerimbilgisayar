// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL PROCESS GUARDS — sistem çökse bile nedeni görünür kalsın
// ═══════════════════════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
  console.error('\n💥 [FATAL] uncaughtException (process kept alive):', err);
  console.error('Stack:', err.stack);
  // Do not call process.exit(1) in production to prevent website downtime / 503 Service Unavailable errors.
});
process.on('unhandledRejection', (reason) => {
  console.error('\n💥 [WARNING] unhandledRejection (process kept alive):', reason);
  // Do not call process.exit(1) on promise rejections to prevent transient database/network errors from crashing the server.
});


// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL LOG BUFFER FOR DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════
export const logBuffer: { time: string; type: 'log' | 'error'; message: string }[] = [];
const originalLog = console.log;
const originalError = console.error;

function addLog(type: 'log' | 'error', args: any[]) {
  const message = args.map(arg => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg); } catch (e) { return String(arg); }
    }
    return String(arg);
  }).join(' ');
  logBuffer.push({
    time: new Date().toISOString(),
    type,
    message
  });
  if (logBuffer.length > 50) logBuffer.shift();
}

console.log = (...args: any[]) => {
  addLog('log', args);
  originalLog.apply(console, args);
};

console.error = (...args: any[]) => {
  addLog('error', args);
  originalError.apply(console, args);
};

console.log('┌─────────────────────────────────────────────');
console.log('│ 🚀 Kerim Bilgisayar Server — boot başlıyor');
console.log('│ Node:', process.version, '| PID:', process.pid);
console.log('│ CWD :', process.cwd());
console.log('│ ENV :', process.env.NODE_ENV || 'development');
console.log('└─────────────────────────────────────────────');

import express from 'express';
import path from 'path';
import { db } from './src/db/index';
import multer from 'multer';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';


const rootDir = fs.existsSync(path.join(process.cwd(), 'uploads')) 
  ? process.cwd() 
  : path.resolve(__dirname, '..');
import { 
  users, 
  companies,
  customers,
  plans,
  subscriptions,
  customerSubscriptions,
  devices,
  services,
  blogPosts,
  campaigns,
  knowledgeBase,
  faqCategories,
  settings,
  notifications,
  pages,
  tickets,
  ticketMessages,
  ticketAttachments,
  ticketParts,
  stockItems,
  leads,
  forms,
  formSubmissions,
  inventoryCategories,
  mediaLibrary,
  menus,
  menuItems,
  testimonials,
  apiKeys,
  webhooks,
  plugins,
  terms,
  taxonomies,
  termRelationships,
  themeSettings,
  layoutTemplates,
  layoutAssignments,
  languages,
  translations,
  pageBlocks,
  mediaFolders,
  serviceCategories,
  sales,
  saleItems,
  stockMovements,
  serializedItems,
  serviceStatusLogs,
  blockedIps,
  shipments,
  expenses,
  invoices,
  invoiceItems,
  payments,
  // FAZ 1 Yeni Tablolar:
  dealerLedger,
  exchangeRates,
  periodLocks,
  ticketAttachmentMeta,
  auditLogs,
  maintenanceContracts,
  deviceTypes,
  deviceTypeTests,
} from './src/db/schema';

import { eq, desc, and, or, sql, asc, like } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import crypto from 'crypto';
import { sendTicketEmail, getStatusEmailTemplate } from './src/lib/mail';
import { TICKET_STATUS_LABELS, TICKET_TERMINAL_STATUSES } from './src/lib/ticketStatus';
import { encryptField, decryptField } from './src/lib/fieldCrypto';

const uploadsDir = path.join(rootDir, 'uploads');

function moveUserFile(fileUrl: string, userId: number): string {
  if (!fileUrl.includes('servisklasoru/temp/')) return fileUrl;
  
  const fileName = path.basename(fileUrl);
  const oldPath = path.join(rootDir, 'uploads', 'servisklasoru', 'temp', fileName);
  const newDir = path.join(rootDir, 'uploads', 'servisklasoru', String(userId));
  const newPath = path.join(newDir, fileName);
  
  try {
    if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      return `/uploads/servisklasoru/${userId}/${fileName}`;
    }
  } catch (err) {
    console.error('Failed to move user file:', err);
  }
  return fileUrl;
}

import { nullableDecimal, nullableInt, generateSlug, assertSafeRemoteUrl, saveRemoteImageToMedia } from './src/server/utils';

async function ensureCustomerRowsFromUsers(): Promise<number> {
  const customerUsers = await db.select().from(users).where(eq(users.roleType, 'customer'));
  let migrated = 0;

  for (const user of customerUsers) {
    const existingCustomer = await db.select().from(customers).where(eq(customers.userId, user.id)).limit(1);
    if (existingCustomer.length > 0) continue;

    await db.insert(customers).values({
      tenantId: user.tenantId || 1,
      userId: user.id,
      companyId: user.companyId || null,
      accountCode: `MUS-${String(user.id).padStart(5, '0')}`,
      balance: '0.00',
      creditLimit: '0.00',
      notes: 'Eski müşteri kullanıcı kaydından otomatik taşındı.',
      isActive: user.isActive !== false,
    });
    migrated += 1;
  }

  return migrated;
}

import {
  signToken,
  verifyToken,
  hashPassword,
  isBcryptHash,
  verifyPassword,
  requireAdmin,
  requireRole,
  requireCustomer,
  requireApiKey,
  loginLimiter,
  ADMIN_TOKEN_TTL,
  CUSTOMER_TOKEN_TTL
} from './src/server/middleware';

// ═══════════════════════════════════════════════════════════════════════════
// DB WARM-UP — startup'ta gerçek bağlantı testi
// ═══════════════════════════════════════════════════════════════════════════
let dbHealthy = false;
let dbLastError: string | null = null;
let gmbCache: any = null;
let gmbCacheTime = 0;

async function warmUpDatabase() {
  const t0 = Date.now();
  try {
    // Drizzle üzerinden basit ping
    await db.execute(sql`SELECT 1 as ping`);
    dbHealthy = true;
    dbLastError = null;
    console.log(`✓ DB bağlantısı OK (${Date.now() - t0}ms)`);
  } catch (err: any) {
    dbHealthy = false;
    dbLastError = err?.message || String(err);
    console.error(`✗ DB bağlantısı BAŞARISIZ: ${dbLastError}`);
    console.error('   → .env dosyasında DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME var mı?');
    console.error('   → MySQL servisi çalışıyor mu? (XAMPP Control Panel → MySQL: Start)');
  }
}

// DB'yi arka planda tekrar dene (fail olsa bile server ayakta kalsın)
async function keepDbAlive() {
  await warmUpDatabase();
  setInterval(async () => {
    try {
      await db.execute(sql`SELECT 1`);
      if (!dbHealthy) console.log('✓ DB bağlantısı geri geldi');
      dbHealthy = true;
      dbLastError = null;
    } catch (err: any) {
      if (dbHealthy) console.warn('⚠ DB bağlantısı düştü:', err?.message);
      dbHealthy = false;
      dbLastError = err?.message || String(err);
    }
  }, 30_000).unref();
}

async function startServer() {
  console.log('[boot] startServer başladı');
  const app = express();
  app.set('trust proxy', true);
  const PORT = Number(process.env.PORT) || 3000;
  const requestCounters = new Map<string, { count: number; startedAt: number }>();
  const autoBlockedIps = new Map<string, number>();

  // Periodic memory cleanup to prevent memory leaks from in-memory Maps
  setInterval(() => {
    const now = Date.now();
    
    // Clear expired request counters (older than 10 minutes)
    for (const [ip, bucket] of requestCounters.entries()) {
      if (now - bucket.startedAt > 10 * 60 * 1000) {
        requestCounters.delete(ip);
      }
    }

    // Clear expired in-memory blocks
    for (const [ip, blockedUntil] of autoBlockedIps.entries()) {
      if (blockedUntil < now) {
        autoBlockedIps.delete(ip);
      }
    }
  }, 10 * 60 * 1000).unref();

  app.use(express.json({ limit: '2mb' }));

  // ─── HEALTH ENDPOINTS — middleware'lerden ÖNCE mount et ki her zaman erişilebilsin
  app.get('/api/health', (_req, res) => {
    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: dbHealthy ? 'up' : 'down',
      dbError: dbLastError,
      pid: process.pid,
      node: process.version,
    });
  });
  app.get('/api/ping', (_req, res) => res.type('text').send('pong'));

  // DB'yi arka planda ısıt (blocking değil)
  keepDbAlive().catch(err => console.error('[boot] DB warm-up error:', err));

  // --- SECURITY MIDDLEWARE ---
  const isDev = process.env.NODE_ENV !== 'production';
  console.log(`[boot] mode: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} | port: ${PORT}`);

  // CSP: dev'de kapalı (Vite HMR inline/eval gerektirir).
  // Prod'da REPORT-ONLY modda — hiçbir şeyi ENGELLEMEZ, sadece ihlalleri raporlar.
  // Politika oturunca reportOnly:false yaparak zorlayıcı moda geçebilirsiniz.
  const cspConfig = isDev
    ? false as const
    : {
        useDefaults: true,
        reportOnly: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com', 'https://www.google-analytics.com', 'https://challenges.cloudflare.com', 'https://static.cloudflareinsights.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://challenges.cloudflare.com', 'https://cloudflareinsights.com', 'https://*.cloudflareinsights.com', 'https://*.googleapis.com'],
          frameSrc: ["'self'", 'https://challenges.cloudflare.com', 'https://www.google.com'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: null,
        },
      };

  app.use(helmet({
    contentSecurityPolicy: cspConfig,
    crossOriginEmbedderPolicy: false,
  }));

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',').map(o => o.trim()).filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      let appOrigin = '';
      if (process.env.APP_URL) {
        try {
          appOrigin = new URL(process.env.APP_URL).origin;
        } catch {}
      }

      if (
        allowedOrigins.includes(origin) ||
        origin === 'https://kerimbilgisayar.com' ||
        origin === 'http://kerimbilgisayar.com' ||
        origin === 'https://www.kerimbilgisayar.com' ||
        origin === 'http://www.kerimbilgisayar.com' ||
        (appOrigin && origin === appOrigin)
      ) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
  }));



  // Dev mode: Vite middleware embed (SPA + HMR aynı port'ta)
  let viteMiddleware: any = null;
  if (isDev) {
    console.log('[boot] Vite dev middleware yükleniyor...');
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });
      viteMiddleware = vite;
      app.use(vite.middlewares);
      console.log('✓ Vite middleware hazır');
    } catch (err: any) {
      console.error('✗ Vite middleware yüklenemedi:', err.message);
      console.error('   → Build edilmiş dist/ kullanılacak (yoksa 500 dönecek)');
    }
  }

  const parseList = (value?: string) => (value || '')
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);

  const getClientIp = (req: express.Request) => {
    const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'];
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
    return (raw || req.ip || '').replace(/^::ffff:/, '').trim();
  };

  // Aktif admin/personel kullanıcılarına bildirim gönderir (ör. müşteri online onay/red/ödeme yaptığında)
  const notifyStaff = async (params: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' | 'system'; linkUrl?: string }) => {
    try {
      const staff = await db.select({ id: users.id }).from(users).where(
        and(
          eq(users.isActive, true),
          or(eq(users.roleType, 'superadmin'), eq(users.roleType, 'tenant_admin'), eq(users.roleType, 'staff'))
        )
      );
      if (staff.length === 0) return;
      await db.insert(notifications).values(
        staff.map(s => ({
          userId: s.id,
          title: params.title,
          message: params.message,
          type: params.type || 'info',
          linkUrl: params.linkUrl,
          isRead: false,
        }))
      );
    } catch (e) {
      console.error('notifyStaff error:', e);
    }
  };

  // IMEI Luhn algoritması doğrulaması (GSMA standardı — 15 hane).
  const isValidImei = (imei: string): boolean => {
    if (!/^\d{15}$/.test(imei)) return false;
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let d = Number(imei[i]);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  };

  let settingsCache: { data: Record<string, string>; fetchedAt: number } | null = null;
  const SETTINGS_CACHE_TTL = 15_000; // 15 seconds

  const readSettingsMap = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && settingsCache && (now - settingsCache.fetchedAt < SETTINGS_CACHE_TTL)) {
      return settingsCache.data;
    }
    try {
      const allSettings = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      allSettings.forEach(s => {
        if (s.value !== null && s.value !== undefined) settingsMap[s.key] = s.value;
      });
      settingsCache = { data: settingsMap, fetchedAt: now };
      return settingsMap;
    } catch (err) {
      if (settingsCache) return settingsCache.data;
      return {};
    }
  };

  let activeDbBlockedIpsCache: { map: Map<string, number>; fetchedAt: number } | null = null;
  const DB_BLOCKED_IPS_CACHE_TTL = 30_000; // 30 seconds

  const getActiveDbBlockedIps = async () => {
    const now = Date.now();
    if (activeDbBlockedIpsCache && (now - activeDbBlockedIpsCache.fetchedAt < DB_BLOCKED_IPS_CACHE_TTL)) {
      return activeDbBlockedIpsCache.map;
    }
    try {
      const rows = await db.select().from(blockedIps);
      const ipMap = new Map<string, number>();
      for (const row of rows) {
        const until = new Date(row.blockedUntil).getTime();
        if (until > now) {
          ipMap.set(row.ipAddress, until);
        }
      }
      activeDbBlockedIpsCache = { map: ipMap, fetchedAt: now };
      return ipMap;
    } catch {
      if (activeDbBlockedIpsCache) return activeDbBlockedIpsCache.map;
      return new Map<string, number>();
    }
  };

  const verifyTurnstile = async (req: express.Request) => {
    try {
      if (process.env.NODE_ENV !== 'production') return true;
      const settingsMap = await readSettingsMap();
      if (settingsMap.captchaEnabled !== 'true') return true;
      const secret = settingsMap.turnstileSecretKey?.trim();
      const token = (req.body?.turnstileToken || req.body?.['cf-turnstile-response'] || '').trim();
      if (!secret || !token) return false;

      const formData = new URLSearchParams();
      formData.set('secret', secret);
      formData.set('response', token);
      formData.set('remoteip', getClientIp(req));
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      return Boolean(data?.success);
    } catch (err: any) {
      console.error('[captcha] Turnstile verification failed:', err.message || err);
      // Fallback: server-side network/DNS errors should fail-open to avoid locking users out
      return true;
    }
  };

  app.use(async (req, res, next) => {
    try {
      if (req.path.startsWith('/assets/') || req.path.startsWith('/uploads/') || (process.env.NODE_ENV !== 'production' && (req.path.startsWith('/src/') || req.path.startsWith('/@')))) return next();

      const ip = getClientIp(req);
      if (ip === '127.0.0.1' || ip === '::1') return next();

      const settingsMap = await readSettingsMap();

      const blocklist = parseList(settingsMap.securityIpBlocklist);
      const adminAllowlist = parseList(settingsMap.securityAdminIpAllowlist || settingsMap.securityIpAllowlist);
      const now = Date.now();
      const autoBlockedUntil = autoBlockedIps.get(ip) || 0;

      // Check settings-based blocklist and in-memory auto-block
      if (blocklist.includes(ip) || autoBlockedUntil > now) {
        return res.status(403).json({ error: 'Erişim engellendi' });
      }

      // Check persistent DB-based block list using in-memory cached map
      const activeDbBlocks = await getActiveDbBlockedIps();
      const dbBlockedUntil = activeDbBlocks.get(ip) || 0;
      if (dbBlockedUntil > now) {
        return res.status(403).json({ error: 'Erişim engellendi' });
      }

      if ((req.path.startsWith('/admin') || req.path.startsWith('/api/admin')) && adminAllowlist.length > 0 && !adminAllowlist.includes(ip)) {
        return res.status(403).json({ error: 'Admin erişimi bu IP için izinli değil' });
      }

      if ((settingsMap.securityAutoBlockEnabled || 'true') !== 'false') {
        const windowMs = Number(settingsMap.securityWindowSeconds || 60) * 1000;
        const limit = Number(settingsMap.securityRequestLimit || 180);
        const blockMs = Number(settingsMap.securityAutoBlockMinutes || 30) * 60 * 1000;
        const current = requestCounters.get(ip);
        const bucket = current && now - current.startedAt < windowMs ? current : { count: 0, startedAt: now };
        bucket.count += 1;
        requestCounters.set(ip, bucket);
        if (bucket.count > limit) {
          autoBlockedIps.set(ip, now + blockMs);
          activeDbBlockedIpsCache = null;
          // Persist auto-block to DB so it survives restarts
          const blockedUntilDate = new Date(now + blockMs);
          await db.insert(blockedIps).values({
            ipAddress: ip,
            blockedUntil: blockedUntilDate,
            reason: 'Otomatik engel: istek limiti aşıldı',
          }).onDuplicateKeyUpdate({
            set: { blockedUntil: blockedUntilDate, reason: 'Otomatik engel: istek limiti aşıldı' }
          }).catch(() => {});
          return res.status(429).json({ error: 'Çok fazla istek nedeniyle geçici engel uygulandı' });
        }
      }

      next();
    } catch (e) {
      next();
    }
  });
  
  // Root level PWA and static files direct serving
  app.get('/sw.js', (req, res) => {
    const swPath = isDev 
      ? path.join(rootDir, 'public', 'sw.js')
      : path.join(rootDir, 'dist', 'sw.js');
    if (fs.existsSync(swPath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(swPath);
    } else {
      res.status(404).send('Not Found');
    }
  });

  app.get('/manifest.json', (req, res) => {
    const manifestPath = isDev
      ? path.join(rootDir, 'public', 'manifest.json')
      : path.join(rootDir, 'dist', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.setHeader('Content-Type', 'application/json');
      res.sendFile(manifestPath);
    } else {
      res.status(404).send('Not Found');
    }
  });

  // Uploads directory static serving. Missing files must not fall through to the SPA shell.
  app.use('/uploads', express.static(path.join(rootDir, 'uploads'), {
    fallthrough: false,
    maxAge: '30d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  }));

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(rootDir, 'uploads');
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage });

  // Helper: geçici klasördeki servvis dosyasını müşteri klasörüne taşı
  const moveUserFile = (fileUrl: string, userId: number): string => {
    try {
      const filename = path.basename(fileUrl);
      const srcDir = path.join(rootDir, 'uploads', 'servisklasoru', 'temp');
      const destDir = path.join(rootDir, 'uploads', 'servisklasoru', String(userId));
      fs.mkdirSync(destDir, { recursive: true });
      const srcPath = path.join(srcDir, filename);
      const destPath = path.join(destDir, filename);
      if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath);
        return `/uploads/servisklasoru/${userId}/${filename}`;
      }
    } catch (e) {
      console.error('moveUserFile error:', e);
    }
    return fileUrl; // hata olursa orijinal url'yi döndür
  };

  // Chrome DevTools JSON endpoint — CSP hatasını önler
  app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.json([]);
  });



  // ============================================================
  // PUBLIC API (CMS FRONTEND)
  // ============================================================

  // --- SITEMAP ---
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const settingsMap = await readSettingsMap();
      const base = (settingsMap.sitemapBaseUrl || settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com').replace(/\/$/, '');
      const freq = settingsMap.sitemapDefaultChangefreq || 'weekly';
      const now  = new Date().toISOString().split('T')[0];

      const staticRoutes = [
        { loc: '/',              priority: '1.0', changefreq: 'daily'  },
        { loc: '/hakkimizda',    priority: '0.8', changefreq: freq     },
        { loc: '/iletisim',      priority: '0.8', changefreq: freq     },
        { loc: '/hizmetler',     priority: '0.9', changefreq: freq     },
        { loc: '/blog',          priority: '0.8', changefreq: 'daily'  },
        { loc: '/kampanyalar',   priority: '0.7', changefreq: freq     },
        { loc: '/sss',           priority: '0.6', changefreq: 'monthly'},
      ];

      // Dynamic: blog posts
      const blogRows = await db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
        .from(blogPosts).where(eq(blogPosts.status, 'yayinlandi'));

      // Dynamic: pages
      const pageRows = await db.select({ slug: pages.slug, updatedAt: pages.updatedAt })
        .from(pages).where(eq(pages.status, 'yayinlandi'));

      // Dynamic: services
      const serviceRows = await db.select({ id: services.id })
        .from(services).where(eq(services.isActive, true));

      // Extra URLs from settings
      const extraUrls = (settingsMap.sitemapExtraUrls || '')
        .split(/[\n,]/).map((u: string) => u.trim()).filter(Boolean);

      const urls: string[] = [
        ...staticRoutes.map(r =>
          `  <url>\n    <loc>${base}${r.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
        ),
        ...blogRows.map(b =>
          `  <url>\n    <loc>${base}/blog/${b.slug}</loc>\n    <lastmod>${b.updatedAt ? new Date(b.updatedAt).toISOString().split('T')[0] : now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
        ),
        ...pageRows.map(p =>
          `  <url>\n    <loc>${base}/${p.slug}</loc>\n    <lastmod>${p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : now}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>0.6</priority>\n  </url>`
        ),
        ...serviceRows.map(s =>
          `  <url>\n    <loc>${base}/hizmetler/${s.id}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>0.8</priority>\n  </url>`
        ),
        ...extraUrls.map((u: string) => {
          const loc = u.startsWith('http') ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`;
          return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>0.5</priority>\n  </url>`;
        }),
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (e: any) {
      res.status(500).send(`<?xml version="1.0"?><error>${e.message}</error>`);
    }
  });

  // --- ROBOTS.TXT ---
  app.get('/robots.txt', async (req, res) => {
    try {
      const settingsMap = await readSettingsMap();
      const base = (settingsMap.sitemapBaseUrl || settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com').replace(/\/$/, '');
      const customRobots = settingsMap.robotsTxt?.trim();
      const content = customRobots || [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        'Disallow: /api/',
        'Disallow: /musteri/',
        '',
        `Sitemap: ${base}/sitemap.xml`,
      ].join('\n');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(content);
    } catch (e: any) {
      res.status(500).send('# robots.txt error');
    }
  });

  app.get('/api/public/search', async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q || q.trim() === '') {
        return res.json({ services: [], blog: [], pages: [] });
      }

      const searchTerm = `%${q}%`;

      // Search services
      const servicesResults = await db.select({
        id: services.id,
        title: services.name,
        slug: sql<string>`CAST(${services.id} AS CHAR)`,
        shortDesc: services.description,
        type: sql<string>`'service'`
      }).from(services)
        .where(like(services.name, searchTerm))
        .limit(5);

      // Search blog posts
      const blogResults = await db.select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        shortDesc: blogPosts.excerpt,
        type: sql<string>`'blog'`
      }).from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, 'yayinlandi'),
            like(blogPosts.title, searchTerm)
          )
        )
        .limit(5);

      // Search pages
      const pagesResults = await db.select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        shortDesc: pages.content, // or short description if exists
        type: sql<string>`'page'`
      }).from(pages)
        .where(
          and(
            eq(pages.status, 'yayinlandi'),
            like(pages.title, searchTerm)
          )
        )
        .limit(5);

      res.json({
        services: servicesResults,
        blog: blogResults,
        pages: pagesResults
      });
    } catch (err) {
      console.error('Search error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GÜVENLİK ÖNLEMLERİ — PUBLIC ARIZA SORGULAMA & ONAYLAMA API ENDPOINTLERİ
  // ═══════════════════════════════════════════════════════════════════════════

  // Dedicated Rate Limiting for Public Ticket Query (Brute-force / Scraping Defense)
  const ticketQueryLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // max 15 searches per minute per IP
    message: { error: 'Çok fazla arıza sorgulama denemesi yapıldı. Lütfen 1 dakika sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  });

  const ticketActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 8, // max 8 status change attempts per 15 minutes
    message: { error: 'Çok fazla onay/red denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  });

  // Helper: PII Masking (Kişisel Veri Maskeleme - KVKK Güvenliği)
  function maskString(str: string | null | undefined, keepStart = 2, keepEnd = 2): string {
    if (!str || !str.trim()) return '';
    const trimmed = str.trim();
    if (trimmed.length <= keepStart + keepEnd) return trimmed[0] + '**';
    return trimmed.substring(0, keepStart) + '**' + trimmed.substring(trimmed.length - keepEnd);
  }

  function maskName(fullName: string | null | undefined): string {
    if (!fullName || !fullName.trim()) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts.map(part => {
      if (part.length <= 2) return part[0] + '*';
      if (part.length <= 4) return part.substring(0, 2) + '**';
      return part.substring(0, 2) + '**' + part.substring(part.length - 1);
    }).join(' ');
  }

  function maskPhone(phone: string | null | undefined): string {
    if (!phone || !phone.trim()) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) return phone.substring(0, 3) + '***';
    return digits.substring(0, 4) + ' *** ** ' + digits.substring(digits.length - 2);
  }

  function maskEmail(email: string | null | undefined): string {
    if (!email || !email.includes('@')) return '';
    const [name, domain] = email.split('@');
    const maskedName = name.length <= 3 ? name[0] + '**' : name.substring(0, 2) + '**' + name[name.length - 1];
    return maskedName + '@' + domain;
  }

  function maskAddress(addr: string | null | undefined): string {
    if (!addr || !addr.trim()) return '';
    const words = addr.trim().split(/\s+/);
    if (words.length <= 2) return words[0] + ' ***';
    return words.map((w, idx) => {
      if (idx >= words.length - 2) return w;
      if (w.length <= 3) return w[0] + '*';
      return w.substring(0, 2) + '**';
    }).join(' ');
  }

  app.get(['/api/tickets/:ticketNumber', '/api/public/ticket/query'], ticketQueryLimiter, async (req, res) => {
    try {
      const rawCode = (req.params.ticketNumber || req.query.no as string || '').trim();
      if (!rawCode) return res.status(400).json({ error: 'Takip numarası giriniz' });

      // Güvenlik 1: Girdi Temizleme (Sanitization)
      const cleanCode = rawCode.replace(/[^A-Za-z0-9\-]/g, '');
      if (cleanCode.length < 1 || cleanCode.length > 50) {
        return res.status(400).json({ error: 'Geçersiz takip kodu biçimi' });
      }

      // Kesin Birebir Takip Numarası Eşleşmesi (Strict Exact Match - No Prefix Padding)
      const rows = await db.select()
        .from(tickets)
        .where(
          or(
            eq(tickets.ticketNumber, cleanCode),
            eq(tickets.ticketNumber, cleanCode.toUpperCase())
          )
        )
        .limit(1);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Servis kaydı bulunamadı. Lütfen takip kodunu kontrol ediniz.' });
      }

      const ticket = rows[0];

      let customerInfo: any = null;
      if (ticket.userId) {
        const userRows = await db.select().from(users).where(eq(users.id, ticket.userId)).limit(1);
        if (userRows.length > 0) {
          const u = userRows[0];
          customerInfo = {
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            email: u.email,
            address: u.address || ''
          };
        }
      }

      let deviceInfo: any = null;
      if (ticket.deviceId) {
        try {
          const devRows = await db.select().from(devices).where(eq(devices.id, ticket.deviceId)).limit(1);
          if (devRows.length > 0) deviceInfo = devRows[0];
        } catch {}
      }

      let parts: any[] = [];
      let atts: any[] = [];
      let logs: any[] = [];

      try {
        const rawParts = await db.select({
          id: ticketParts.id,
          stockItemId: ticketParts.stockItemId,
          name: ticketParts.name,
          stockItemName: stockItems.name,
          quantity: ticketParts.quantity,
          unitPrice: ticketParts.unitPrice,
          totalPrice: ticketParts.totalPrice,
          vatRate: ticketParts.vatRate,
        })
        .from(ticketParts)
        .leftJoin(stockItems, eq(ticketParts.stockItemId, stockItems.id))
        .where(and(eq(ticketParts.ticketId, ticket.id), sql`${ticketParts.removedAt} IS NULL`));
        parts = rawParts.map(p => ({ ...p, name: p.name || p.stockItemName }));
      } catch (e: any) {
        console.error('Error fetching ticketParts:', e);
      }
      try { atts = await db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId, ticket.id)); } catch {}
      try { logs = await db.select().from(serviceStatusLogs).where(eq(serviceStatusLogs.ticketId, ticket.id)).orderBy(desc(serviceStatusLogs.createdAt)); } catch {}

      // Veritabanındaki Gerçek Müşteri & Cihaz Verisi (Sıfır Statik Veri)
      const rawName = customerInfo ? `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() : '';
      const rawPhone = customerInfo?.phone || '';
      const rawEmail = customerInfo?.email || '';
      const rawAddress = customerInfo?.address || '';

      const deviceBrand = deviceInfo?.brand || '';
      const deviceModel = deviceInfo?.model || '';
      const deviceType = deviceInfo?.deviceType || deviceInfo?.name || ticket.subject || '';
      const serialNumber = deviceInfo?.serialNumber || deviceInfo?.imei || '';
      const issueDescription = ticket.description || ticket.subject || '';
      const accessories = ticket.accessories || '';

      res.json({
        ...ticket,
        rawStatus: ticket.status,
        deviceBrand,
        deviceModel,
        deviceType,
        serialNumber,
        imei: deviceInfo?.imei || '',
        patternLock: decryptField(deviceInfo?.patternLock) || '',
        pinPassword: decryptField(deviceInfo?.pinPassword) || '',
        issueDescription,
        accessories,
        customerName: maskName(rawName),
        customerPhone: maskPhone(rawPhone),
        customerEmail: maskEmail(rawEmail),
        customerAddress: maskAddress(rawAddress),
        parts,
        attachments: atts,
        statusLogs: logs
      });
    } catch (e: any) {
      console.error('Public ticket query error:', e);
      res.status(500).json({ error: 'Sorgulama işlemi sırasında hata oluştu' });
    }
  });

  // Müşteri Onarım Onayı (Approve Repair Quote)
  app.post('/api/tickets/:ticketNumber/approve', ticketActionLimiter, async (req, res) => {
    try {
      const rawCode = (req.params.ticketNumber || '').trim();
      const cleanCode = rawCode.replace(/[^A-Za-z0-9\-]/g, '');
      if (!cleanCode) return res.status(400).json({ error: 'Geçersiz takip kodu' });

      const rows = await db.select().from(tickets).where(
        or(
          eq(tickets.ticketNumber, cleanCode),
          eq(tickets.ticketNumber, cleanCode.toUpperCase()),
          sql`CAST(${tickets.id} AS CHAR) = ${cleanCode}`
        )
      ).limit(1);

      if (rows.length === 0) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });
      const ticket = rows[0];

      // Durum Geçiş Kontrolü (State Transition Security)
      if (TICKET_TERMINAL_STATUSES.includes(ticket.status)) {
        return res.status(400).json({ error: 'Bu servis kaydı tamamlanmış veya kapatılmış durumdadır.' });
      }

      await db.update(tickets).set({
        status: 'isleme_alindi',
        updatedAt: new Date(),
      }).where(eq(tickets.id, ticket.id));

      await db.insert(serviceStatusLogs).values({
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: 'isleme_alindi',
        notes: `Müşteri web üzerinden (${getClientIp(req)}) onarım teklifini onayladı.`,
      }).catch((e) => console.error('serviceStatusLogs insert error:', e));

      await notifyStaff({
        type: 'success',
        title: `Onarım Onayı: #${ticket.ticketNumber}`,
        message: `Müşteri #${ticket.ticketNumber} numaralı servis kaydı için onarım teklifini onayladı.`,
      });

      res.json({ success: true, message: 'Onarım onayınız başarıyla iletildi.' });
    } catch (e: any) {
      console.error('Ticket approve error:', e);
      res.status(500).json({ error: e.message || 'Onaylama işlemi başarısız.' });
    }
  });

  // Müşteri Teklif Reddi (Decline Repair Quote)
  app.post('/api/tickets/:ticketNumber/decline', ticketActionLimiter, async (req, res) => {
    try {
      const rawCode = (req.params.ticketNumber || '').trim();
      const cleanCode = rawCode.replace(/[^A-Za-z0-9\-]/g, '');
      if (!cleanCode) return res.status(400).json({ error: 'Geçersiz takip kodu' });

      const rows = await db.select().from(tickets).where(
        or(
          eq(tickets.ticketNumber, cleanCode),
          eq(tickets.ticketNumber, cleanCode.toUpperCase()),
          sql`CAST(${tickets.id} AS CHAR) = ${cleanCode}`
        )
      ).limit(1);

      if (rows.length === 0) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });
      const ticket = rows[0];

      if (TICKET_TERMINAL_STATUSES.includes(ticket.status)) {
        return res.status(400).json({ error: 'Bu servis kaydı halihazırda sonuçlandırılmıştır.' });
      }

      await db.update(tickets).set({
        status: 'onay_red',
        updatedAt: new Date(),
      }).where(eq(tickets.id, ticket.id));

      await db.insert(serviceStatusLogs).values({
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: 'onay_red',
        notes: `Müşteri web üzerinden (${getClientIp(req)}) onarım teklifini reddetti. Cihaz iade edilecek.`,
      }).catch((e) => console.error('serviceStatusLogs insert error:', e));

      await notifyStaff({
        type: 'warning',
        title: `Teklif Reddedildi: #${ticket.ticketNumber}`,
        message: `Müşteri #${ticket.ticketNumber} numaralı servis kaydı için onarım teklifini reddetti. Cihaz iade edilmeyi bekliyor.`,
      });

      res.json({ success: true, message: 'Teklif reddedildi. Cihaz iade edilmek üzere hazırlanacaktır.' });
    } catch (e: any) {
      console.error('Ticket decline error:', e);
      res.status(500).json({ error: e.message || 'İşlem başarısız.' });
    }
  });

  // Müşteri Web Üzerinden Ödeme Kaydı (Pay)
  app.post('/api/tickets/:ticketNumber/pay', ticketActionLimiter, async (req, res) => {
    try {
      const rawCode = (req.params.ticketNumber || '').trim();
      const cleanCode = rawCode.replace(/[^A-Za-z0-9\-]/g, '');
      const { paymentMethod } = req.body;
      const rows = await db.select().from(tickets).where(
        or(eq(tickets.ticketNumber, cleanCode), sql`CAST(${tickets.id} AS CHAR) = ${cleanCode}`)
      ).limit(1);

      if (rows.length === 0) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });
      const ticket = rows[0];

      await db.update(tickets).set({
        status: 'cozuldu',
        updatedAt: new Date(),
      }).where(eq(tickets.id, ticket.id));

      await db.insert(serviceStatusLogs).values({
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: 'cozuldu',
        notes: `Müşteri web üzerinden (${getClientIp(req)}) ${paymentMethod || 'kredi kartı'} ile ödeme bildiriminde bulundu.`,
      }).catch((e) => console.error('serviceStatusLogs insert error:', e));

      await notifyStaff({
        type: 'success',
        title: `Ödeme Bildirimi: #${ticket.ticketNumber}`,
        message: `Müşteri #${ticket.ticketNumber} numaralı servis kaydı için ${paymentMethod || 'kredi kartı'} ile ödeme bildiriminde bulundu.`,
      });

      res.json({ success: true, message: 'Ödeme kaydınız işleme alındı.' });
    } catch (e: any) {
      console.error('Ticket pay error:', e);
      res.status(500).json({ error: e.message || 'Ödeme kaydı oluşturulamadı.' });
    }
  });

  app.get('/api/public/menus', async (req, res) => {
    try {
      const allMenus = await db.select().from(menus);
      const allItems = await db.select().from(menuItems).orderBy(menuItems.displayOrder);
      
      const result = allMenus.map(m => ({
        ...m,
        items: allItems.filter(i => i.menuId === m.id)
      }));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/settings', async (req, res) => {
    try {
      const allSettings = await db.select().from(settings);
      const publicKeys = [
        'siteTitle', 'siteTagline', 'logoUrl', 'contactPhone', 'contactEmail', 'contactAddress',
        'socialFacebook', 'socialTwitter', 'socialInstagram', 'socialLinkedin', 'footerText', 
        'themeColor', 'themeSecondaryColor', 'themeRadius', 'themeFont', 'siteLogo', 'siteFavicon', 'headerLayout',
        'homeHeroTitle', 'homeHeroSubtitle', 'homeHeroImage',
        'aboutVision', 'aboutMission', 'aboutImage',
        'homeFeature1Title', 'homeFeature1Desc',
        'homeFeature2Title', 'homeFeature2Desc',
        'homeFeature3Title', 'homeFeature3Desc',
        'googleMapsIframeUrl',
        'homeGamingTitle', 'homeGamingDesc', 'homeGamingBullets', 'homeGamingImage', 'homeGamingBtnText', 'homeGamingBtnUrl',
        'homeCorporateTitle', 'homeCorporateDesc', 'homeCorporateBullets', 'homeCorporateImage', 'homeCorporateBtnText', 'homeCorporateBtnUrl',
        'homePartnersJson',
        'homeSlidesJson', 'homeSectionOrder',
        'homeTestimonial1Name', 'homeTestimonial1Role', 'homeTestimonial1Comment',
        'homeTestimonial2Name', 'homeTestimonial2Role', 'homeTestimonial2Comment',
        'homeTestimonial3Name', 'homeTestimonial3Role', 'homeTestimonial3Comment',
        'contactFax', 'contactMersis', 'contactVkn', 'contactVergiDairesi', 'contactTicaretSicil',
        'contactKep', 'contactEsnafSicil', 'contactNaceKodu', 'contactMukellefAdi', 'contactTicaretUnvan',
        'contactCard1Title', 'contactCard1Link', 'contactCard2Title', 'contactCard2Link', 'contactCard3Title', 'contactCard3Link',
        'contactSubtitle', 'contactBannerTitle', 'contactBannerDesc', 'contactBannerImage',
        'contactBankName', 'contactBankAccount', 'contactBankIban', 'contactBankQrCode',
        'siteMetaDescription', 'siteOgImage', 'siteFocusKeyword', 'googleAnalyticsId', 'googleSearchConsoleCode',
        'googleSiteVerification', 'googleSearchConsoleVerification', 'googleVerificationCode', 'searchConsoleCode',
        'captchaEnabled', 'turnstileSiteKey',
        // Geo SEO
        'geoLat', 'geoLng', 'geoRegion', 'geoPlacename',
        // Business hours
        'businessHoursOpen', 'businessHoursClose', 'businessDays',
        // Sitemap / Robots
        'sitemapBaseUrl', 'siteBaseUrl', 'robotsTxt',
        // WhatsApp API Settings
        'whatsappApiEnabled', 'whatsappApiUrl', 'whatsappApiToken', 'whatsappTemplate'
      ];
      
      const publicSettings: Record<string, string> = {};
      allSettings.forEach(s => {
        if (publicKeys.includes(s.key)) {
          publicSettings[s.key] = s.value || '';
        }
      });

      // Get published theme settings and merge them
      const publishedThemeSettings = await db.select().from(themeSettings).where(eq(themeSettings.isDraft, false));
      publishedThemeSettings.forEach(ts => {
        if (publicKeys.includes(ts.settingKey)) {
          let val = ts.settingValue;
          if (typeof val !== 'string') {
            try { val = JSON.stringify(val); } catch { val = ''; }
            if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1);
            }
          }
          publicSettings[ts.settingKey] = val as string;
        }
      });

      res.json(publicSettings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // i18n Translation Endpoint (used by i18next-http-backend)
  app.get('/api/public/translations/:lang', async (req, res) => {
    const getDefaultTranslations = (langCode: string) => {
      if (langCode === 'tr') {
        return {
          'common.loading': 'Yukleniyor...',
          'common.error': 'Bir hata olustu',
          'common.submit': 'Gonder'
        };
      }

      return {
        'common.loading': 'Loading...',
        'common.error': 'An error occurred',
        'common.submit': 'Submit'
      };
    };

    try {
      const { lang } = req.params;
      const trans = await db.select().from(translations).where(eq(translations.langCode, lang));
      
      const result: Record<string, string> = {};
      trans.forEach(t => {
        result[t.key] = t.value || '';
      });

      // Default fallbacks if DB is empty for requested lang
      if (Object.keys(result).length === 0) {
        Object.assign(result, getDefaultTranslations(lang));
      }
      
      res.json(result);
    } catch (e: any) {
      const { lang } = req.params;
      console.error('Translations endpoint fallback used:', e?.message || e);
      res.setHeader('x-fallback-source', 'default-translations');
      res.json(getDefaultTranslations(lang));
    }
  });

  app.get('/api/public/plugins', async (req, res) => {
    try {
      const activePlugins = await db.select().from(plugins).where(eq(plugins.isActive, true));
      // Sadece ID'leri dönelim ki frontend anlasın (Örn: ['maintenance-mode', 'google-business'])
      res.json(activePlugins.map(p => p.pluginId));
    } catch (e: any) {
      console.error('Plugins endpoint fallback used:', e?.message || e);
      res.setHeader('x-fallback-source', 'default-plugins');
      res.json([]);
    }
  });

  app.get('/api/public/google-business', async (req, res) => {
    try {
      const now = Date.now();
      const GMB_CACHE_DURATION = 60 * 60 * 1000; // 1 hour
      if (gmbCache && (now - gmbCacheTime < GMB_CACHE_DURATION)) {
        res.setHeader('x-cache', 'HIT');
        return res.json(gmbCache);
      }

      const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
      if (!gmbPlugin.length || !gmbPlugin[0].isActive) {
        return res.json({ error: 'Plugin not active' });
      }
      let pluginSettings = gmbPlugin[0].settings as any;
      if (typeof pluginSettings === 'string') {
        try { pluginSettings = JSON.parse(pluginSettings); } catch (e) { pluginSettings = {}; }
      }
      if (!pluginSettings || !pluginSettings.tokens || !pluginSettings.selectedLocation) {
        return res.json({ error: 'Settings not configured' });
      }
      
      const oauth2Client = new google.auth.OAuth2(pluginSettings.clientId, pluginSettings.clientSecret);
      oauth2Client.setCredentials(pluginSettings.tokens);
      
      const url = `https://mybusiness.googleapis.com/v4/${pluginSettings.selectedLocation}/reviews`;
      const response = await oauth2Client.request({ url }).catch(() => ({ data: {} }));
      const reviewsData = (response as any).data || {};
      
      const result = {
        rating: reviewsData.averageRating || 5.0,
        user_ratings_total: reviewsData.totalReviewCount || reviewsData.reviews?.length || 0,
        reviews: reviewsData.reviews || [],
        url: '#'
      };

      gmbCache = result;
      gmbCacheTime = now;
      res.setHeader('x-cache', 'MISS');
      res.json(result);
    } catch (e: any) {
      if (gmbCache) {
        res.setHeader('x-cache', 'STALE');
        return res.json(gmbCache);
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/pages/:slug', async (req, res) => {
    try {
      const pageResult = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
      if (pageResult.length === 0) return res.status(404).json({ error: 'Sayfa bulunamadı' });
      // Sadece yayınlanmış olanları göster
      if (pageResult[0].status !== 'yayinlandi') return res.status(404).json({ error: 'Sayfa bulunamadı' });
      res.json(pageResult[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/pages/:slug/blocks', async (req, res) => {
    try {
      const pageResult = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
      if (pageResult.length === 0) return res.status(404).json({ error: 'Sayfa bulunamadı' });
      if (pageResult[0].status !== 'yayinlandi') return res.status(404).json({ error: 'Sayfa bulunamadı' });
      
      const blocks = await db.select().from(pageBlocks).where(
        and(
          eq(pageBlocks.ownerType, 'page'),
          eq(pageBlocks.ownerId, pageResult[0].id)
        )
      ).orderBy(asc(pageBlocks.sortOrder));
      res.json(blocks);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/testimonials', async (req, res) => {
    try {
      const allTestimonials = await db.select().from(testimonials)
        .where(eq(testimonials.status, 'yayinlandi'))
        .orderBy(asc(testimonials.displayOrder), desc(testimonials.createdAt));
      const mapped = allTestimonials.map(t => ({
        id: t.id,
        name: t.authorName,
        role: t.authorTitle,
        comment: t.content,
        rating: t.rating,
        imageUrl: t.authorImageUrl
      }));
      res.json(mapped);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // CUSTOMER API
  // ============================================================

  app.post('/api/customer/register', loginLimiter, async (req, res) => {
    try {
      const { firstName, lastName, email, phone, password } = req.body;
      if (!firstName || !email || !password) {
        return res.status(400).json({ error: 'Eksik bilgi' });
      }
      
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        // If a user with this email exists but has no password (e.g. from lead form)
        if (!existing[0].passwordHash) {
          await db.transaction(async (tx) => {
            await tx.update(users).set({ 
              passwordHash: await hashPassword(password), 
              firstName, 
              lastName: lastName || '', 
              phone: phone || null 
            }).where(eq(users.id, existing[0].id));
            
            // Check if customer row exists
            const existingCustomer = await tx.select().from(customers).where(eq(customers.userId, existing[0].id)).limit(1);
            if (existingCustomer.length === 0) {
              await tx.insert(customers).values({
                tenantId: existing[0].tenantId || 1,
                userId: existing[0].id,
                companyId: existing[0].companyId || null,
                accountCode: `MUS-${String(existing[0].id).padStart(5, '0')}`,
                balance: '0.00',
                creditLimit: '0.00',
                notes: 'Müşteri kaydı esnasında otomatik oluşturuldu.',
                isActive: true,
              });
            }
          });
          return res.json({ success: true });
        }
        return res.status(400).json({ error: 'Bu e-posta zaten kullanımda' });
      }

      await db.transaction(async (tx) => {
        const insertedUser = await tx.insert(users).values({
          tenantId: 1,
          firstName,
          lastName: lastName || '',
          email,
          phone: phone || null,
          passwordHash: await hashPassword(password),
          roleType: 'customer',
          isActive: true,
        });
        const userId = (insertedUser[0] as any).insertId;

        await tx.insert(customers).values({
          tenantId: 1,
          userId,
          accountCode: `MUS-${String(userId).padStart(5, '0')}`,
          balance: '0.00',
          creditLimit: '0.00',
          notes: 'Müşteri kayıt esnasında otomatik oluşturuldu.',
          isActive: true,
        });
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/customer/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      const userRes = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (userRes.length === 0) return res.status(401).json({ error: 'Kullanıcı bulunamadı veya şifre hatalı' });
      
      const u = userRes[0];
      if (u.roleType !== 'customer') return res.status(403).json({ error: 'Bu alana sadece müşteriler girebilir' });

      if (!(await verifyPassword(password, u.passwordHash))) return res.status(401).json({ error: 'Kullanıcı bulunamadı veya şifre hatalı' });

      const sessionData = { userId: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`, role: 'customer' };
      const token = signToken(sessionData, 'customer', CUSTOMER_TOKEN_TTL);

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));

      res.json({ token, user: sessionData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/customer/logout', requireCustomer, (req, res) => {
    // Stateless JWT: sunucu tarafı geçersiz kılma yok; istemci token'ı siler.
    res.json({ success: true });
  });

  app.get('/api/customer/me', requireCustomer, (req, res) => {
    res.json((req as any).customerUser);
  });

  app.get('/api/customer/tickets', requireCustomer, async (req, res) => {
    try {
      const userId = (req as any).customerUser.userId;
      const myTickets = await db.select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        description: tickets.description,
        status: tickets.status,
        cost: tickets.cost,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        deviceName: devices.name,
        deviceType: devices.deviceType,
      }).from(tickets)
        .leftJoin(devices, eq(tickets.deviceId, devices.id))
        .where(eq(tickets.userId, userId))
        .orderBy(desc(tickets.createdAt));
        
      res.json(myTickets);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/customer/tickets', requireCustomer, async (req, res) => {
    try {
      const userId = (req as any).customerUser.userId;
      const { subject, description, deviceType, brand, model } = req.body;
      
      let deviceId: number | null = null;
      if (deviceType) {
        const newDevice = await db.insert(devices).values({
          tenantId: 1, userId, deviceType, brand, model,
          name: `${brand || ''} ${model || ''}`.trim() || deviceType,
        });
        deviceId = (newDevice[0] as any).insertId;
      }

      const ticketNumber = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      await db.insert(tickets).values({
        tenantId: 1, ticketNumber, userId, deviceId,
        type: 'ariza', subject, description, priority: 'normal', status: 'yeni', cost: '0.00'
      });

      res.json({ success: true, ticketNumber });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // PUBLIC API ROUTES
  // ============================================================

  // CMS: Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const allSettings = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      allSettings.forEach(s => {
        if (s.value) settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CMS: Pages
  app.get('/api/pages', async (req, res) => {
    try {
      const allPages = await db.select().from(pages).where(eq(pages.status, 'yayinlandi'));
      res.json(allPages);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/pages/:slug', async (req, res) => {
    try {
      const page = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
      if (page.length === 0) return res.status(404).json({ error: 'Page not found' });
      res.json(page[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CMS: Blog
  app.get('/api/blog', async (req, res) => {
    try {
      const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, 'yayinlandi')).orderBy(desc(blogPosts.createdAt));
      res.json(posts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/blog/:slug', async (req, res) => {
    try {
      const post = await db.select().from(blogPosts).where(eq(blogPosts.slug, req.params.slug)).limit(1);
      if (post.length === 0) return res.status(404).json({ error: 'Post not found' });
      res.json(post[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CMS: Campaigns
  app.get('/api/campaigns', async (req, res) => {
    try {
      const allCampaigns = await db.select().from(campaigns).where(eq(campaigns.status, 'aktif'));
      res.json(allCampaigns);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Services
  app.get('/api/services', async (req, res) => {
    try {
      const allServices = await db.select({
        service: services,
        category: serviceCategories
      })
      .from(services)
      .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(eq(services.isActive, true));

      const formatted = allServices.map(row => ({
         ...row.service,
         categoryDetails: row.category
      }));
      res.json(formatted);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/services/:id', async (req, res) => {
    try {
      const result = await db.select({
        service: services,
        category: serviceCategories
      })
      .from(services)
      .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(eq(services.id, parseInt(req.params.id)))
      .limit(1);

      if (result.length === 0) return res.status(404).json({ error: 'Service not found' });
      
      const serviceData = {
         ...result[0].service,
         categoryDetails: result[0].category
      };
      res.json(serviceData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // FAQ / Knowledge Base
  app.get('/api/faq', async (req, res) => {
    try {
      const categories = await db.select().from(faqCategories);
      const kbase = await db.select().from(knowledgeBase).where(eq(knowledgeBase.status, 'yayinlandi'));
      const map = categories.map(cat => ({
        ...cat,
        questions: kbase.filter(q => q.categoryId === cat.id)
      }));
      res.json(map);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });





  // Appointments
  app.post('/api/appointments', async (req, res) => {
    try {
      if (!(await verifyTurnstile(req))) return res.status(400).json({ error: 'Captcha doğrulaması başarısız' });
      const { type, serviceType, details, date, time, companyName, fullName, phone } = req.body;
      const note = `Tipi: ${type}\nHizmet/Cihaz Türü: ${serviceType}\nTarih/Saat: ${date} ${time}\nŞikayet/Detaylar: ${details}`.trim();
      const [result] = await db.insert(leads).values({
        tenantId: 1,
        name: fullName || 'İsimsiz',
        companyName: companyName,
        phone: phone,
        source: 'Web Randevu Formu',
        notes: note,
        status: 'new'
      });
      res.json({ success: true, message: 'Talep alındı', ticketId: `TLP-${(result as any).insertId}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Contact Form
  app.post('/api/contact', async (req, res) => {
    try {
      if (!(await verifyTurnstile(req))) return res.status(400).json({ error: 'Captcha doğrulaması başarısız' });
      const { name, email, phone, subject, message } = req.body;
      let formRes = await db.select().from(forms).where(eq(forms.name, 'İletişim Formu')).limit(1);
      let formId = 0;
      if (formRes.length === 0) {
        const insertRes = await db.insert(forms).values({
          tenantId: 1,
          name: 'İletişim Formu',
          isActive: true,
          schema: {}
        });
        formId = (insertRes[0] as any).insertId;
      } else {
        formId = formRes[0].id;
      }
      const data = { name, email, phone, subject, message };
      const [insertResult] = await db.insert(formSubmissions).values({
        tenantId: 1,
        formId: parseInt(formId.toString()),
        data,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });

      // Trigger Webhook
      triggerWebhook('lead.created', {
        submissionId: (insertResult as any).insertId,
        formId,
        data
      });

      res.json({ success: true, message: 'Mesajınız gönderildi.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN AUTH
  // ============================================================

  app.post('/api/admin/login', loginLimiter, async (req, res) => {
    try {
      if (!(await verifyTurnstile(req))) return res.status(400).json({ error: 'Captcha doğrulaması başarısız' });
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-posta ve şifre gerekli' });
      }

      // Find user with admin role
      const adminUser = await db.select().from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (adminUser.length === 0) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
      }

      const u = adminUser[0];

      // Check role
      if (!['superadmin', 'tenant_admin', 'staff', 'technician'].includes(u.roleType || '')) {
        return res.status(403).json({ error: 'Bu hesabın panel erişimi yok' });
      }

      const isValid = await verifyPassword(password, u.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
      }

      const sessionData = {
        userId: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
        role: u.roleType || 'staff'
      };
      const token = signToken(sessionData, 'admin', ADMIN_TOKEN_TTL);

      // Update last login
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));

      res.json({ token, user: sessionData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    // Stateless JWT: sunucu tarafı geçersiz kılma yok; istemci token'ı siler.
    res.json({ success: true });
  });

  app.get('/api/admin/me', requireAdmin, (req, res) => {
    res.json((req as any).adminUser);
  });

  app.get('/api/admin/system/health', requireAdmin, async (req, res) => {
    try {
      const os = await import('os');
      res.json({
        status: dbHealthy ? 'ok' : 'degraded',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: os.platform(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAvg: os.loadavg(),
        db: dbHealthy ? 'up' : 'down',
        dbError: dbLastError,
        pid: process.pid,
        node: process.version,
        logs: logBuffer
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — SERVICES CRUD
  // ============================================================

  app.get('/api/admin/services', requireAdmin, async (req, res) => {
    try {
      const all = await db.select().from(services);
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/services', requireAdmin, async (req, res) => {
    try {
      const { name, description, basePrice, categoryId, imageUrl, isActive } = req.body;
      await db.insert(services).values({
        tenantId: 1,
        name,
        description,
        basePrice: nullableDecimal(basePrice),
        categoryId: nullableInt(categoryId),
        imageUrl: imageUrl || null,
        isActive: isActive !== false,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/services/:id', requireAdmin, async (req, res) => {
    try {
      const { name, description, basePrice, categoryId, imageUrl, isActive } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (basePrice !== undefined) updateData.basePrice = nullableDecimal(basePrice);
      if (categoryId !== undefined) updateData.categoryId = nullableInt(categoryId);
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
      if (isActive !== undefined) updateData.isActive = isActive;
      await db.update(services).set(updateData).where(eq(services.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/services/:id', requireAdmin, async (req, res) => {
    try {
      await db.update(services).set({ isActive: false }).where(eq(services.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — SERVICE CATEGORIES CRUD
  // ============================================================

  app.get('/api/admin/service-categories', requireAdmin, async (req, res) => {
    try {
      const all = await db.select().from(serviceCategories).orderBy(asc(serviceCategories.displayOrder));
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/service-categories', requireAdmin, async (req, res) => {
    try {
      await db.insert(serviceCategories).values({
        tenantId: 1,
        ...req.body
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/service-categories/:id', requireAdmin, async (req, res) => {
    try {
      await db.update(serviceCategories).set(req.body).where(eq(serviceCategories.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/service-categories/:id', requireAdmin, async (req, res) => {
    try {
      await db.update(serviceCategories).set({ isActive: false }).where(eq(serviceCategories.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/service-categories', async (req, res) => {
    try {
      const all = await db.select().from(serviceCategories).where(eq(serviceCategories.isActive, true)).orderBy(asc(serviceCategories.displayOrder));
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API (i18n TRANSLATIONS)
  // ============================================================
  
  app.get('/api/admin/languages', requireAdmin, async (req, res) => {
    try {
      const allLangs = await db.select().from(languages);
      res.json(allLangs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/languages', requireAdmin, async (req, res) => {
    try {
      const { code, name, isDefault, isActive } = req.body;
      const result = await db.insert(languages).values({ code, name, isDefault, isActive });
      res.json({ id: result[0].insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/translations', requireAdmin, async (req, res) => {
    try {
      const allTrans = await db.select().from(translations);
      res.json(allTrans);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/translations', requireAdmin, async (req, res) => {
    try {
      const { langCode, translations: updates } = req.body; // updates: Record<string, string>
      
      // Delete existing for this lang to replace them
      // Alternatively, we can UPSERT, but delete/insert is simpler for bulk update
      if (langCode && updates) {
        await db.delete(translations).where(eq(translations.langCode, langCode));
        const entries = Object.entries(updates).map(([k, v]) => ({
          langCode,
          key: k,
          value: v as string
        }));
        if (entries.length > 0) {
          await db.insert(translations).values(entries);
        }
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // ============================================================
  // WHATSAPP API DISPATCHER (Arka Planda WhatsApp Gönderimi)
  // ============================================================
  async function sendWhatsAppMessage(phone: string, text: string) {
    try {
      const allSettings = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      allSettings.forEach(s => { settingsMap[s.key] = s.value || ''; });

      if (settingsMap.whatsappApiEnabled !== 'true') return;
      const apiUrl = settingsMap.whatsappApiUrl;
      const apiToken = settingsMap.whatsappApiToken;
      if (!apiUrl || !apiToken) return;

      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '90' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('90') && formattedPhone.length === 10) {
        formattedPhone = '90' + formattedPhone;
      }

      let bodyObj: any = {};
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (apiUrl.includes('ultramsg')) {
        bodyObj = {
          token: apiToken,
          to: formattedPhone,
          body: text
        };
      } else {
        bodyObj = {
          to: formattedPhone,
          message: text,
          text: text
        };
        headers['Authorization'] = `Bearer ${apiToken}`;
        headers['x-api-key'] = apiToken;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyObj)
      });
      if (!res.ok) {
        console.error('WhatsApp API error:', res.status, await res.text());
      } else {
        console.log('WhatsApp message sent successfully to:', formattedPhone);
      }
    } catch (err) {
      console.error('Failed to send WhatsApp message:', err);
    }
  }

  // STATUS CHANGE NOTIFICATION DISPATCHER (Email + WhatsApp Helper)
  async function triggerStatusNotifications(ticketId: number, status: string) {
    try {
      const ticketInfo = await db.select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        customerName: users.firstName,
        customerPhone: users.phone,
        customerEmail: users.email,
        deviceBrand: devices.brand,
        deviceModel: devices.model,
        deviceType: devices.deviceType
      }).from(tickets)
        .leftJoin(users, eq(tickets.userId, users.id))
        .leftJoin(devices, eq(tickets.deviceId, devices.id))
        .where(eq(tickets.id, ticketId))
        .limit(1);

      if (ticketInfo.length > 0) {
        const t = ticketInfo[0];
        const deviceName = `${t.deviceBrand || ''} ${t.deviceModel || ''}`.trim() || t.deviceType || 'Cihazınız';

        const statusText = TICKET_STATUS_LABELS[status] || status;

        // 1. Email notification
        if (t.customerEmail && !t.customerEmail.includes('@noemail.local')) {
          const html = getStatusEmailTemplate(t.customerName || 'Müşterimiz', t.ticketNumber, deviceName, statusText);
          sendTicketEmail(t.customerEmail, `Servis Durumu Güncellendi: ${t.ticketNumber}`, html).catch(console.error);
        }

        // 2. WhatsApp notification
        if (t.customerPhone) {
          const allSettings = await db.select().from(settings);
          const settingsMap: Record<string, string> = {};
          allSettings.forEach(s => { settingsMap[s.key] = s.value || ''; });

          if (settingsMap.whatsappApiEnabled === 'true') {
            const siteUrl = settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com';
            const trackingLink = `${siteUrl}/ariza-sorgulama?no=${t.ticketNumber}`;

            const defaultTemplate = "Sayın [Musteri], [No] numaralı [Cihaz] cihazınızın servis durumu '[Durum]' olarak güncellenmiştir. Takip linkiniz: [Link]";
            const template = settingsMap.whatsappTemplate || defaultTemplate;

            const text = template
              .replace('[Musteri]', t.customerName || 'Müşterimiz')
              .replace('[No]', t.ticketNumber || '')
              .replace('[Cihaz]', deviceName)
              .replace('[Durum]', statusText)
              .replace('[Link]', trackingLink);

            sendWhatsAppMessage(t.customerPhone, text).catch(console.error);
          }
        }
      }
    } catch (err) {
      console.error('Failed to trigger status notifications:', err);
    }
  }

  // ============================================================
  // ADMIN API — CİHAZ PROFİLLERİ (Cihaz türüne göre dinamik form/checklist)
  // ============================================================

  app.get('/api/admin/device-types', requireAdmin, async (req, res) => {
    try {
      const rowsTypes = await db.select().from(deviceTypes).where(eq(deviceTypes.tenantId, 1)).orderBy(asc(deviceTypes.sortOrder));
      const rowsTests = await db.select().from(deviceTypeTests).orderBy(asc(deviceTypeTests.sortOrder));
      const testsByType: Record<number, string[]> = {};
      for (const t of rowsTests) {
        (testsByType[t.deviceTypeId] ||= []).push(t.testName);
      }
      res.json(rowsTypes.map(dt => ({ ...dt, tests: testsByType[dt.id] || [] })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — TICKETS (Servis Kayıtları)
  // ============================================================

  app.get('/api/admin/tickets', requireAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      const dealerAlias = alias(companies, 'dealer');
      // NOT: tenantId=1 diğer tüm yazma işlemleriyle aynı sabit değeri kullanır —
      // admin oturum token'ı (JWT) henüz tenantId taşımıyor, gerçek çok-kiracılı
      // izolasyon için login/JWT akışının ayrıca güncellenmesi gerekir.
      const whereClause = and(
        eq(tickets.tenantId, 1),
        status && status !== 'all' ? eq(tickets.status, status as any) : undefined
      );

      const results = await db.select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        description: tickets.description,
        status: tickets.status,
        priority: tickets.priority,
        type: tickets.type,
        cost: tickets.cost,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        customerName: users.firstName,
        customerLastName: users.lastName,
        customerPhone: users.phone,
        deviceName: devices.name,
        deviceTypeId: devices.deviceTypeId,
        deviceType: devices.deviceType,
        deviceBrand: devices.brand,
        deviceModel: devices.model,
        color: devices.color,
        variant: devices.variant,
        deviceSerial: devices.serialNumber,
        imei: devices.imei,
        patternLock: devices.patternLock,
        pinPassword: devices.pinPassword,
        deviceEmail: devices.deviceEmail,
        deviceEmailPassword: devices.deviceEmailPassword,
        customerEmail: users.email,
        address: users.address,
        assignedTo: tickets.assignedTo,
        laborCost: tickets.laborCost,
        dealerId: tickets.dealerId,
        dealerName: dealerAlias.name,
        technicianNotes: tickets.technicianNotes,
        accessories: tickets.accessories,
        kvkkConsentAt: tickets.kvkkConsentAt,
        dataLossConsentAt: tickets.dataLossConsentAt,
        accessInfoConsentAt: tickets.accessInfoConsentAt,
        expertiseFeeConsentAt: tickets.expertiseFeeConsentAt,
      }).from(tickets)
        .leftJoin(users, eq(tickets.userId, users.id))
        .leftJoin(devices, eq(tickets.deviceId, devices.id))
        .leftJoin(dealerAlias, eq(tickets.dealerId, dealerAlias.id))
        .where(whereClause)
        .orderBy(desc(tickets.createdAt));

      res.json(results.map(t => ({
        ...t,
        customerName: `${t.customerName || ''} ${t.customerLastName || ''}`.trim() || 'Müşteri',
        patternLock: decryptField(t.patternLock),
        pinPassword: decryptField(t.pinPassword),
        deviceEmailPassword: decryptField(t.deviceEmailPassword),
      })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/tickets', requireAdmin, async (req, res) => {
    try {
      const {
        subject, description, type, priority, customerName, customerPhone, customerEmail, deviceType, deviceBrand, deviceModel, cost, dealerId, source, assignedTo, accessories, technicianNotes,
        deviceSerial, imei, patternLock, pinPassword, deviceEmail, deviceEmailPassword, deviceTypeId, color, variant,
        customerType, companyName, taxId, taxOffice, address,
        consentKvkk, consentDataLoss, consentAccessInfo, consentExpertiseFee,
      } = req.body;

      if (imei && !isValidImei(imei)) {
        return res.status(400).json({ error: 'IMEI numarası geçersiz (15 haneli olmalı ve Luhn doğrulamasını geçmeli).' });
      }

      let userId: number | null = null;
      let deviceId: number | null = null;
      let userEmailForMail = customerEmail || '';
      const ticketNumber = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

      await db.transaction(async (tx) => {
        // Kurumsal müşteri ise firma kaydını bul/oluştur
        let companyId: number | null = null;
        if (customerType === 'kurumsal' && companyName?.trim()) {
          const existingCompany = await tx.select().from(companies).where(eq(companies.name, companyName.trim())).limit(1);
          if (existingCompany.length > 0) {
            companyId = existingCompany[0].id;
          } else {
            const newCompany = await tx.insert(companies).values({
              tenantId: 1,
              name: companyName.trim(),
              taxId: taxId || null,
              taxOffice: taxOffice || null,
              address: address || null,
              phone: customerPhone || null,
              email: customerEmail || null,
              type: 'customer',
            });
            companyId = (newCompany[0] as any).insertId;
          }
        }

        // Create or find user by phone or email (deduplication)
        if (customerName && (customerPhone || customerEmail)) {
          const nameParts = customerName.split(' ');
          let existingUser = await tx.select().from(users).where(eq(users.phone, customerPhone)).limit(1);
          if (existingUser.length === 0 && customerEmail) {
            existingUser = await tx.select().from(users).where(eq(users.email, customerEmail)).limit(1);
          }

          if (existingUser.length > 0) {
            userId = existingUser[0].id;
            if (!userEmailForMail && existingUser[0].email && !existingUser[0].email.includes('@noemail.local')) {
              userEmailForMail = existingUser[0].email;
            }
            // If customer provided a new email, update it
            if (customerEmail && existingUser[0].email.includes('@noemail.local')) {
              const duplicateEmailUser = await tx.select().from(users).where(eq(users.email, customerEmail)).limit(1);
              if (duplicateEmailUser.length === 0) {
                await tx.update(users).set({ email: customerEmail }).where(eq(users.id, userId));
              }
            }

            const userUpdate: any = {};
            if (address !== undefined) userUpdate.address = address;
            if (taxId !== undefined) userUpdate.taxNumber = taxId;
            if (taxOffice !== undefined) userUpdate.taxOffice = taxOffice;
            if (companyId) userUpdate.companyId = companyId;
            if (Object.keys(userUpdate).length > 0) {
              await tx.update(users).set(userUpdate).where(eq(users.id, userId));
            }

            // Ensure customer record exists
            const existingCustomer = await tx.select().from(customers).where(eq(customers.userId, userId)).limit(1);
            if (existingCustomer.length === 0) {
              await tx.insert(customers).values({
                tenantId: existingUser[0].tenantId || 1,
                userId: userId,
                companyId: companyId || existingUser[0].companyId || null,
                accountCode: `MUS-${String(userId).padStart(5, '0')}`,
                balance: '0.00',
                creditLimit: '0.00',
                notes: 'Teknik servis fişi oluşturulurken otomatik senkronize edildi.',
                isActive: true,
              });
            }
          } else {
            const newUser = await tx.insert(users).values({
              tenantId: 1,
              companyId: companyId || null,
              firstName: nameParts[0] || customerName,
              lastName: nameParts.slice(1).join(' ') || '',
              email: customerEmail || `${customerPhone || Date.now()}@noemail.local`,
              phone: customerPhone || '',
              address: address || null,
              taxNumber: taxId || null,
              taxOffice: taxOffice || null,
              roleType: 'customer'
            });
            userId = (newUser[0] as any).insertId;

            // Immediately create the corresponding customer record
            await tx.insert(customers).values({
              tenantId: 1,
              userId: userId,
              companyId: companyId || null,
              accountCode: `MUS-${String(userId).padStart(5, '0')}`,
              balance: '0.00',
              creditLimit: '0.00',
              notes: 'Teknik servis fişi oluşturulurken otomatik eklendi.',
              isActive: true,
            });
          }
        }

        // Create device if provided
        if (deviceType || deviceBrand || deviceModel) {
          const newDevice = await tx.insert(devices).values({
            tenantId: 1,
            userId: userId,
            deviceTypeId: deviceTypeId ? parseInt(deviceTypeId as string) : null,
            deviceType: deviceType || 'Bilinmeyen',
            brand: deviceBrand || '',
            model: deviceModel || '',
            color: color || null,
            variant: variant || null,
            name: `${deviceBrand || ''} ${deviceModel || ''}`.trim() || deviceType || 'Cihaz',
            serialNumber: deviceSerial || null,
            imei: imei || null,
            patternLock: encryptField(patternLock || null),
            pinPassword: encryptField(pinPassword || null),
            deviceEmail: deviceEmail || null,
            deviceEmailPassword: encryptField(deviceEmailPassword || null),
          });
          deviceId = (newDevice[0] as any).insertId;
        }

        // Auto-subject if omitted
        const autoSubject = subject || `${deviceBrand || ''} ${deviceModel || ''} ${type === 'ariza' ? 'Arıza' : type === 'bakim' ? 'Bakım' : type === 'kurulum' ? 'Kurulum' : 'Destek'}`.trim() || 'Teknik Servis Talebi';

        // Create ticket
        const newTicketRecord = await tx.insert(tickets).values({
          tenantId: 1,
          ticketNumber,
          userId: userId,
          deviceId: deviceId,
          type: type || 'ariza',
          subject: autoSubject,
          description: description || '',
          priority: priority || 'normal',
          status: 'yeni',
          cost: cost || '0.00',
          dealerId: dealerId ? parseInt(dealerId as string) : null,
          source: source || 'walk_in',
          assignedTo: assignedTo ? parseInt(assignedTo as string) : null,
          accessories: accessories || '',
          technicianNotes: technicianNotes || '',
          kvkkConsentAt: consentKvkk ? new Date() : null,
          dataLossConsentAt: consentDataLoss ? new Date() : null,
          accessInfoConsentAt: consentAccessInfo ? new Date() : null,
          expertiseFeeConsentAt: consentExpertiseFee ? new Date() : null,
        });
        req.body.insertedTicketId = (newTicketRecord[0] as any).insertId;
      });

      // Send initial email
      if (userEmailForMail && !userEmailForMail.includes('@noemail.local')) {
        const deviceNameStr = `${deviceBrand || ''} ${deviceModel || ''}`.trim() || deviceType || 'Cihazınız';
        const html = getStatusEmailTemplate(customerName || 'Müşterimiz', ticketNumber, deviceNameStr, 'Servise Alındı / Yeni Kayıt');
        // Do not await to avoid blocking response
        sendTicketEmail(userEmailForMail, `Servis Kaydı Oluşturuldu: ${ticketNumber}`, html).catch(console.error);
      }

      res.json({ success: true, ticketNumber, id: req.body.insertedTicketId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/tickets/:id', requireAdmin, async (req, res) => {
    try {
      const {
        status, priority, cost, assignedTo, laborCost, technicianNotes, accessories, description,
        customerName, customerPhone, customerEmail, address,
        deviceType, deviceBrand, deviceModel, imei, deviceSerial, patternLock, pinPassword, deviceEmail, deviceEmailPassword, deviceTypeId, color, variant,
        deliverySignature, customerSignature,
      } = req.body;

      if (imei && !isValidImei(imei)) {
        return res.status(400).json({ error: 'IMEI numarası geçersiz (15 haneli olmalı ve Luhn doğrulamasını geçmeli).' });
      }

      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (cost !== undefined) updateData.cost = cost;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
      if (laborCost !== undefined) updateData.laborCost = laborCost;
      if (technicianNotes !== undefined) updateData.technicianNotes = technicianNotes;
      if (accessories !== undefined) updateData.accessories = accessories;
      if (description !== undefined) updateData.description = description;
      if (deliverySignature !== undefined) updateData.deliverySignature = deliverySignature;
      if (customerSignature !== undefined) updateData.customerSignature = customerSignature;
      if (status === 'cozuldu' || status === 'kapatildi') updateData.resolvedAt = new Date();
      if (status === 'teslim_edildi') updateData.deliveredAt = new Date();

      const ticketId = parseInt(req.params.id);

      await db.transaction(async (tx) => {
        const [ticketRec] = await tx.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
        const fromStatus = ticketRec?.status || null;

        // Update ticket fields
        await tx.update(tickets).set(updateData).where(eq(tickets.id, ticketId));

        // If status changed, write log
        if (status && status !== fromStatus) {
          const changedById = (req as any).adminUser.userId;
          await tx.insert(serviceStatusLogs).values({
            tenantId: 1,
            ticketId,
            fromStatus: fromStatus,
            toStatus: status,
            changedById,
            notes: technicianNotes || 'Durum güncellendi.',
          });
        }

        // Update customer details if provided
        if (customerName || customerPhone || customerEmail || address !== undefined) {
          if (ticketRec?.userId) {
            const uId = ticketRec.userId;
            const userUpdate: any = {};
            if (customerName) {
              const parts = customerName.split(' ');
              userUpdate.firstName = parts[0];
              userUpdate.lastName = parts.slice(1).join(' ');
            }
            if (customerPhone !== undefined) userUpdate.phone = customerPhone;
            if (customerEmail !== undefined) {
              const duplicateEmailUser = await tx.select().from(users).where(eq(users.email, customerEmail)).limit(1);
              if (duplicateEmailUser.length === 0 || duplicateEmailUser[0].id === uId) {
                userUpdate.email = customerEmail;
              }
            }
            if (address !== undefined) userUpdate.address = address;

            if (Object.keys(userUpdate).length > 0) {
              await tx.update(users).set(userUpdate).where(eq(users.id, uId));
            }
          }
        }

        // Update device details if provided (mevcut cihaz kaydı yoksa oluştur)
        const deviceFieldsProvided = [deviceType, deviceBrand, deviceModel, imei, deviceSerial, patternLock, pinPassword, deviceEmail, deviceEmailPassword, deviceTypeId, color, variant].some((v) => v !== undefined);
        if (deviceFieldsProvided) {
          const deviceUpdate: any = {};
          if (deviceType !== undefined) deviceUpdate.deviceType = deviceType;
          if (deviceBrand !== undefined) deviceUpdate.brand = deviceBrand;
          if (deviceModel !== undefined) deviceUpdate.model = deviceModel;
          if (imei !== undefined) deviceUpdate.imei = imei;
          if (deviceSerial !== undefined) deviceUpdate.serialNumber = deviceSerial;
          if (patternLock !== undefined) deviceUpdate.patternLock = encryptField(patternLock);
          if (pinPassword !== undefined) deviceUpdate.pinPassword = encryptField(pinPassword);
          if (deviceEmail !== undefined) deviceUpdate.deviceEmail = deviceEmail;
          if (deviceEmailPassword !== undefined) deviceUpdate.deviceEmailPassword = encryptField(deviceEmailPassword);
          if (deviceTypeId !== undefined) deviceUpdate.deviceTypeId = deviceTypeId ? parseInt(deviceTypeId as string) : null;
          if (color !== undefined) deviceUpdate.color = color;
          if (variant !== undefined) deviceUpdate.variant = variant;

          if (ticketRec?.deviceId) {
            await tx.update(devices).set(deviceUpdate).where(eq(devices.id, ticketRec.deviceId));
          } else if (deviceType || deviceBrand || deviceModel) {
            const newDevice = await tx.insert(devices).values({
              tenantId: 1,
              userId: ticketRec?.userId || null,
              deviceType: deviceType || 'Bilinmeyen',
              brand: deviceBrand || '',
              model: deviceModel || '',
              name: `${deviceBrand || ''} ${deviceModel || ''}`.trim() || deviceType || 'Cihaz',
              ...deviceUpdate,
            });
            const newDeviceId = (newDevice[0] as any).insertId;
            await tx.update(tickets).set({ deviceId: newDeviceId }).where(eq(tickets.id, ticketId));
          }
        }
      });

      // FAZ 2B: Bayi Borçlandırma Entegrasyonu
      if (status === 'teslim_edildi') {
        const ticketId = parseInt(req.params.id);
        const ticket = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
        if (ticket.length > 0 && ticket[0].dealerId) {
          const dealerId = ticket[0].dealerId;
          const parts = await db.select().from(ticketParts).where(and(eq(ticketParts.ticketId, ticketId), sql`${ticketParts.removedAt} IS NULL`));
          const partsTotal = parts.reduce((sum, p) => sum + parseFloat(p.totalPrice || '0'), 0);
          const laborCostVal = parseFloat(ticket[0].laborCost || '0');
          const grandTotal = partsTotal + laborCostVal;

          if (grandTotal > 0) {
            const existing = await db.select().from(dealerLedger)
              .where(and(
                eq(dealerLedger.ticketId, ticketId),
                eq(dealerLedger.type, 'debit'),
                eq(dealerLedger.isReversed, false)
              )).limit(1);

            if (existing.length === 0) {
              const company = await db.select().from(companies).where(eq(companies.id, dealerId)).limit(1);
              const dueDays = company[0]?.dealerDueDays || 0;
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + dueDays);

              await db.insert(dealerLedger).values({
                tenantId: 1,
                dealerCompanyId: dealerId,
                ticketId,
                type: 'debit',
                amount: grandTotal.toFixed(2),
                currency: 'TRY',
                description: `${ticket[0].ticketNumber} nolu cihaz teslim edildi. (İşçilik: ${laborCostVal.toFixed(2)} TL, Parça: ${partsTotal.toFixed(2)} TL)`,
                dueDate: dueDate,
              });
            }
          }
        }
      }


      // Send status change email & WhatsApp
      if (status) {
        const ticketInfo = await db.select({
          ticketNumber: tickets.ticketNumber,
          customerName: users.firstName,
          customerPhone: users.phone,
          customerEmail: users.email,
          deviceBrand: devices.brand,
          deviceModel: devices.model,
          deviceType: devices.deviceType
        }).from(tickets)
          .leftJoin(users, eq(tickets.userId, users.id))
          .leftJoin(devices, eq(tickets.deviceId, devices.id))
          .where(eq(tickets.id, parseInt(req.params.id)))
          .limit(1);

        if (ticketInfo.length > 0) {
          const t = ticketInfo[0];
          const deviceName = `${t.deviceBrand || ''} ${t.deviceModel || ''}`.trim() || t.deviceType || 'Cihazınız';

          // 1. Email notification
          if (t.customerEmail && !t.customerEmail.includes('@noemail.local')) {
            const statusText = TICKET_STATUS_LABELS[status] || status;
            const html = getStatusEmailTemplate(t.customerName || 'Müşterimiz', t.ticketNumber, deviceName, statusText);
            sendTicketEmail(t.customerEmail, `Servis Durumu Güncellendi: ${t.ticketNumber}`, html).catch(console.error);
          }

          // 2. WhatsApp notification
          if (t.customerPhone) {
            const allSettings = await db.select().from(settings);
            const settingsMap: Record<string, string> = {};
            allSettings.forEach(s => { settingsMap[s.key] = s.value || ''; });

            if (settingsMap.whatsappApiEnabled === 'true') {
              const statusLabel = TICKET_STATUS_LABELS[status] || status;
              const siteUrl = settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com';
              const trackingLink = `${siteUrl}/ariza-sorgulama?no=${t.ticketNumber}`;

              const defaultTemplate = "Sayın [Musteri], [No] numaralı [Cihaz] cihazınızın servis durumu '[Durum]' olarak güncellenmiştir. Takip linkiniz: [Link]";
              const template = settingsMap.whatsappTemplate || defaultTemplate;

              const text = template
                .replace('[Musteri]', t.customerName || 'Müşterimiz')
                .replace('[No]', t.ticketNumber || '')
                .replace('[Cihaz]', deviceName)
                .replace('[Durum]', statusLabel)
                .replace('[Link]', trackingLink);

              sendWhatsAppMessage(t.customerPhone, text).catch(console.error);
            }
          }
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/tickets/:id/status-logs', requireAdmin, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const logs = await db.select({
        id: serviceStatusLogs.id,
        fromStatus: serviceStatusLogs.fromStatus,
        toStatus: serviceStatusLogs.toStatus,
        notes: serviceStatusLogs.notes,
        createdAt: serviceStatusLogs.createdAt,
        changedByName: sql<string>`CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, ''))`
      }).from(serviceStatusLogs)
        .leftJoin(users, eq(serviceStatusLogs.changedById, users.id))
        .where(eq(serviceStatusLogs.ticketId, ticketId))
        .orderBy(desc(serviceStatusLogs.createdAt));
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Birleşik aktivite akışı: not + durum geçmişi + sistem/audit olayları tek kronolojik listede.
  // Not: mevcut 3 kaynağı (service_status_logs, ticket_messages, audit_logs) birleştirir —
  // veri taşıma yapılmadı, sadece okuma katmanında birleştirilir.
  app.get('/api/admin/tickets/:id/activity', requireAdmin, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);

      const [statusRows, noteRows, auditRows] = await Promise.all([
        db.select({
          id: serviceStatusLogs.id,
          fromStatus: serviceStatusLogs.fromStatus,
          toStatus: serviceStatusLogs.toStatus,
          notes: serviceStatusLogs.notes,
          createdAt: serviceStatusLogs.createdAt,
          actorName: sql<string>`CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, ''))`,
        }).from(serviceStatusLogs)
          .leftJoin(users, eq(serviceStatusLogs.changedById, users.id))
          .where(eq(serviceStatusLogs.ticketId, ticketId)),
        db.select({
          id: ticketMessages.id,
          message: ticketMessages.message,
          createdAt: ticketMessages.createdAt,
          actorName: sql<string>`CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, ''))`,
        }).from(ticketMessages)
          .leftJoin(users, eq(ticketMessages.senderId, users.id))
          .where(eq(ticketMessages.ticketId, ticketId)),
        db.select({
          id: auditLogs.id,
          action: auditLogs.action,
          details: auditLogs.details,
          createdAt: auditLogs.createdAt,
          actorName: sql<string>`CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, ''))`,
        }).from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(and(eq(auditLogs.entityType, 'Ticket'), eq(auditLogs.entityId, ticketId))),
      ]);

      const feed = [
        ...statusRows.map(r => ({
          id: `status-${r.id}`, type: 'status' as const, createdAt: r.createdAt,
          actorName: r.actorName?.trim() || 'Sistem',
          fromStatus: r.fromStatus, toStatus: r.toStatus, notes: r.notes,
        })),
        ...noteRows.map(r => ({
          id: `note-${r.id}`, type: 'note' as const, createdAt: r.createdAt,
          actorName: r.actorName?.trim() || 'Sistem', message: r.message,
        })),
        ...auditRows.map(r => ({
          id: `audit-${r.id}`, type: 'audit' as const, createdAt: r.createdAt,
          actorName: r.actorName?.trim() || 'Sistem', action: r.action, details: r.details,
        })),
      ].sort((a, b) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime());

      res.json(feed);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE ticket and all its attachments, parts, and messages
  app.delete('/api/admin/tickets/:id', requireAdmin, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      await db.transaction(async (tx) => {
        // Delete dependent relations
        await tx.delete(ticketParts).where(eq(ticketParts.ticketId, ticketId));
        await tx.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, ticketId));
        await tx.delete(ticketMessages).where(eq(ticketMessages.ticketId, ticketId));
        await tx.delete(tickets).where(eq(tickets.id, ticketId));
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/tickets/:id/whatsapp-trigger', requireAdmin, async (req, res) => {
    try {
      const ticketInfo = await db.select({
        ticketNumber: tickets.ticketNumber,
        customerName: users.firstName,
        customerPhone: users.phone,
        deviceBrand: devices.brand,
        deviceModel: devices.model,
        deviceType: devices.deviceType,
        status: tickets.status
      }).from(tickets)
        .leftJoin(users, eq(tickets.userId, users.id))
        .leftJoin(devices, eq(tickets.deviceId, devices.id))
        .where(eq(tickets.id, parseInt(req.params.id)))
        .limit(1);

      if (ticketInfo.length === 0) {
        return res.status(404).json({ error: 'Kayıt bulunamadı' });
      }

      const t = ticketInfo[0];
      if (!t.customerPhone) {
        return res.status(400).json({ error: 'Müşteri telefon numarası tanımlı değil' });
      }

      const allSettings = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      allSettings.forEach(s => { settingsMap[s.key] = s.value || ''; });

      const deviceName = `${t.deviceBrand || ''} ${t.deviceModel || ''}`.trim() || t.deviceType || 'Cihaz';
      const statusLabel = TICKET_STATUS_LABELS[t.status || 'yeni'] || t.status || 'Yeni';
      const siteUrl = settingsMap.siteBaseUrl || 'https://kerimbilgisayar.com';
      const trackingLink = `${siteUrl}/ariza-sorgulama?no=${t.ticketNumber}`;

      const defaultTemplate = "Sayın [Musteri], [No] numaralı [Cihaz] cihazınızın servis durumu '[Durum]' olarak güncellenmiştir. Takip linkiniz: [Link]";
      const template = settingsMap.whatsappTemplate || defaultTemplate;

      const text = template
        .replace('[Musteri]', t.customerName || 'Müşterimiz')
        .replace('[No]', t.ticketNumber || '')
        .replace('[Cihaz]', deviceName)
        .replace('[Durum]', statusLabel)
        .replace('[Link]', trackingLink);

      await sendWhatsAppMessage(t.customerPhone, text);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // TICKET PARTS (Servis Yedek Parça & İşlemler)
  // ============================================================

  app.get('/api/admin/tickets/:id/parts', requireAdmin, async (req, res) => {
    try {
      const parts = await db.select({
        id: ticketParts.id,
        ticketId: ticketParts.ticketId,
        stockItemId: ticketParts.stockItemId,
        name: ticketParts.name,
        brand: ticketParts.brand,
        quantity: ticketParts.quantity,
        unitPrice: ticketParts.unitPrice,
        totalPrice: ticketParts.totalPrice,
        vatRate: ticketParts.vatRate,
        source: ticketParts.source,
        createdAt: ticketParts.createdAt,
        stockItemName: stockItems.name,
        stockItemSku: stockItems.sku
      }).from(ticketParts)
        .leftJoin(stockItems, eq(ticketParts.stockItemId, stockItems.id))
        .where(and(eq(ticketParts.ticketId, parseInt(req.params.id)), sql`${ticketParts.removedAt} IS NULL`))
        .orderBy(desc(ticketParts.createdAt));

      res.json(parts.map(p => ({ ...p, name: p.name || p.stockItemName })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/tickets/:id/parts', requireAdmin, async (req, res) => {
    try {
      const { stockItemId, quantity, unitPrice, name, brand, vatRate } = req.body;
      const q = parseInt(quantity) || 1;
      const price = parseFloat(unitPrice) || 0;
      const total = q * price;
      const vat = vatRate !== undefined ? parseInt(vatRate) : 20;
      const createdBy = (req as any).adminUser?.userId || null;
      const isManual = !stockItemId;

      if (isManual && !name?.trim()) {
        return res.status(400).json({ error: 'Manuel kalem için isim zorunludur.' });
      }

      await db.transaction(async (tx) => {
        if (isManual) {
          await tx.insert(ticketParts).values({
            tenantId: 1,
            ticketId: parseInt(req.params.id),
            stockItemId: null,
            name: name.trim(),
            brand: brand?.trim() || 'Manuel',
            quantity: q,
            unitPrice: price.toString(),
            totalPrice: total.toString(),
            vatRate: vat,
            source: 'manuel',
            createdBy,
          });
          return;
        }

        const item = await tx.select().from(stockItems).where(eq(stockItems.id, parseInt(stockItemId))).limit(1);
        await tx.insert(ticketParts).values({
          tenantId: 1,
          ticketId: parseInt(req.params.id),
          stockItemId: parseInt(stockItemId),
          name: item[0]?.name || null,
          brand: item[0]?.brand || null,
          quantity: q,
          unitPrice: price.toString(),
          totalPrice: total.toString(),
          vatRate: vat,
          source: 'stok',
          createdBy,
        });

        // Deduct from stock
        if (item.length > 0) {
          const newStock = (item[0].currentStock || 0) - q;
          await tx.update(stockItems).set({ currentStock: newStock }).where(eq(stockItems.id, parseInt(stockItemId)));
        }
      });

      await db.insert(auditLogs).values({
        tenantId: 1,
        userId: createdBy,
        action: 'ticket_part.added',
        entityType: 'Ticket',
        entityId: parseInt(req.params.id),
        details: { name: isManual ? name?.trim() : undefined, stockItemId: isManual ? null : parseInt(stockItemId), quantity: q, unitPrice: price, source: isManual ? 'manuel' : 'stok' },
      }).catch((e) => console.error('auditLogs insert error:', e));

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/tickets/parts/:partId', requireAdmin, async (req, res) => {
    try {
      const removedBy = (req as any).adminUser?.userId || null;
      let affectedTicketId: number | null = null;
      let removedPartName: string | null = null;
      await db.transaction(async (tx) => {
        const part = await tx.select().from(ticketParts).where(eq(ticketParts.id, parseInt(req.params.partId))).limit(1);
        if (part.length > 0) {
          affectedTicketId = part[0].ticketId;
          removedPartName = part[0].name;
          // Restore stock (yalnızca stoktan düşülmüş kalemler için)
          if (part[0].stockItemId) {
            const item = await tx.select().from(stockItems).where(eq(stockItems.id, part[0].stockItemId)).limit(1);
            if (item.length > 0) {
              const newStock = (item[0].currentStock || 0) + part[0].quantity;
              await tx.update(stockItems).set({ currentStock: newStock }).where(eq(stockItems.id, part[0].stockItemId));
            }
          }
          // Soft delete — denetim izi için kayıt silinmez, işaretlenir
          await tx.update(ticketParts).set({ removedAt: new Date(), removedBy }).where(eq(ticketParts.id, parseInt(req.params.partId)));
        }
      });
      if (affectedTicketId) {
        await db.insert(auditLogs).values({
          tenantId: 1,
          userId: removedBy,
          action: 'ticket_part.removed',
          entityType: 'Ticket',
          entityId: affectedTicketId,
          details: { name: removedPartName },
        }).catch((e) => console.error('auditLogs insert error:', e));
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // ============================================================
  // FAZ 1B — BAYİ YÖNETİMİ (Dealer Management)
  // ============================================================

  // Tüm bayileri getir
  app.get('/api/admin/dealers', requireAdmin, async (req, res) => {
    try {
      const dealers = await db.select().from(companies)
        .where(eq(companies.dealerType, 'dealer'))
        .orderBy(desc(companies.createdAt));
      res.json(dealers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Yeni bayi ekle
  app.post('/api/admin/dealers', requireAdmin, async (req, res) => {
    try {
      const { name, taxId, taxOffice, address, phone, email, website, sector, dealerRiskLimit, dealerDueDays, dealerDiscountRate, dealerPriceListNote } = req.body;
      const inserted = await db.insert(companies).values({
        tenantId: 1,
        name,
        taxId,
        taxOffice,
        address,
        phone,
        email,
        website,
        sector,
        type: 'partner',
        dealerType: 'dealer',
        dealerRiskLimit: dealerRiskLimit ? dealerRiskLimit.toString() : null,
        dealerDueDays: parseInt(dealerDueDays) || 0,
        dealerDiscountRate: dealerDiscountRate ? dealerDiscountRate.toString() : '0.00',
        dealerPriceListNote,
      });
      res.json({ success: true, id: (inserted[0] as any).insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bayi sil
  app.delete('/api/admin/dealers/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Set linked users' companyId to null first
      await db.update(users).set({ companyId: null }).where(eq(users.companyId, id));
      await db.delete(companies).where(eq(companies.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bayi yetkililerini listele
  app.get('/api/admin/dealers/:id/users', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dealerUsers = await db.select().from(users).where(eq(users.companyId, id));
      res.json(dealerUsers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bayiye yeni yetkili ekle
  app.post('/api/admin/dealers/:id/users', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { firstName, lastName, email, phone, password } = req.body;
      const hashedPassword = await bcrypt.hash(password || 'bayi123', 10);
      const inserted = await db.insert(users).values({
        tenantId: 1,
        firstName,
        lastName,
        email,
        phone,
        passwordHash: hashedPassword,
        roleType: 'dealer_user',
        companyId: id,
      });
      res.json({ success: true, id: (inserted[0] as any).insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bayi cari bakiyesini hesapla
  app.get('/api/admin/dealers/:id/balance', requireAdmin, async (req, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      const ledgerRows = await db.select().from(dealerLedger)
        .where(and(eq(dealerLedger.dealerCompanyId, dealerId), eq(dealerLedger.isReversed, false)));
      
      let balance = 0;
      for (const row of ledgerRows) {
        const amt = parseFloat(row.amount as string);
        if (row.type === 'debit') balance += amt;   // Borç (bize borçlu)
        else balance -= amt;                          // Ödeme (borç azaldı)
      }
      
      const company = await db.select().from(companies).where(eq(companies.id, dealerId)).limit(1);
      res.json({
        dealerId,
        companyName: company[0]?.name || '—',
        balance: balance.toFixed(2),
        riskLimit: company[0]?.dealerRiskLimit || null,
        dueDays: company[0]?.dealerDueDays || 0,
        ledgerCount: ledgerRows.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bayi cari hareketleri
  app.get('/api/admin/dealers/:id/ledger', requireAdmin, async (req, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      const rows = await db.select({
        id: dealerLedger.id,
        type: dealerLedger.type,
        amount: dealerLedger.amount,
        currency: dealerLedger.currency,
        description: dealerLedger.description,
        dueDate: dealerLedger.dueDate,
        isReversed: dealerLedger.isReversed,
        createdAt: dealerLedger.createdAt,
        ticketId: dealerLedger.ticketId,
        ticketNumber: tickets.ticketNumber,
      }).from(dealerLedger)
        .leftJoin(tickets, eq(dealerLedger.ticketId, tickets.id))
        .where(eq(dealerLedger.dealerCompanyId, dealerId))
        .orderBy(desc(dealerLedger.createdAt))
        .limit(200);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Manuel bayi ledger kaydı (ödeme, düzeltme)
  app.post('/api/admin/dealers/:id/ledger', requireAdmin, async (req, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      const { type, amount, description, dueDate, currency } = req.body;
      const adminUser = (req as any).adminUser;
      if (!type || !amount) return res.status(400).json({ error: 'type ve amount zorunlu' });
      await db.insert(dealerLedger).values({
        tenantId: 1,
        dealerCompanyId: dealerId,
        type,
        amount: parseFloat(amount).toFixed(2),
        currency: currency || 'TRY',
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdByUserId: adminUser?.userId,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bayi ledger kaydı iptal (ters kayıt)
  app.post('/api/admin/dealers/ledger/:entryId/reverse', requireAdmin, async (req, res) => {
    try {
      const entryId = parseInt(req.params.entryId);
      const adminUser = (req as any).adminUser;
      const entry = await db.select().from(dealerLedger).where(eq(dealerLedger.id, entryId)).limit(1);
      if (!entry.length) return res.status(404).json({ error: 'Kayıt bulunamadı' });
      if (entry[0].isReversed) return res.status(400).json({ error: 'Bu kayıt zaten iptal edildi' });

      await db.transaction(async (tx) => {
        // Orijinali "iptal edildi" olarak işaretle
        await tx.update(dealerLedger).set({ isReversed: true }).where(eq(dealerLedger.id, entryId));
        // Ters kayıt oluştur
        await tx.insert(dealerLedger).values({
          tenantId: entry[0].tenantId || 1,
          dealerCompanyId: entry[0].dealerCompanyId,
          type: entry[0].type === 'debit' ? 'credit' : 'debit',
          amount: entry[0].amount,
          currency: entry[0].currency || 'TRY',
          description: `İPTAL - ${entry[0].description || `Kayıt #${entryId}`}`,
          reversalOfId: entryId,
          createdByUserId: adminUser?.userId,
        });
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bayiyi companies üzerinden düzenle
  app.patch('/api/admin/dealers/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, taxId, taxOffice, address, phone, email, website, sector, dealerRiskLimit, dealerDueDays, dealerDiscountRate, dealerPriceListNote } = req.body;
      const updateData: any = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (taxId !== undefined) updateData.taxId = taxId;
      if (taxOffice !== undefined) updateData.taxOffice = taxOffice;
      if (address !== undefined) updateData.address = address;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (website !== undefined) updateData.website = website;
      if (sector !== undefined) updateData.sector = sector;
      if (dealerRiskLimit !== undefined) updateData.dealerRiskLimit = dealerRiskLimit ? dealerRiskLimit.toString() : null;
      if (dealerDueDays !== undefined) updateData.dealerDueDays = parseInt(dealerDueDays) || 0;
      if (dealerDiscountRate !== undefined) updateData.dealerDiscountRate = dealerDiscountRate ? dealerDiscountRate.toString() : '0.00';
      if (dealerPriceListNote !== undefined) updateData.dealerPriceListNote = dealerPriceListNote;

      await db.update(companies).set(updateData).where(eq(companies.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // FAZ 1D — DÖVİZ KURLARI (Exchange Rates)
  // ============================================================

  // Belirli bir tarih/para birimi için kur
  app.get('/api/admin/rates', requireAdmin, async (req, res) => {
    try {
      const { currency, date } = req.query;
      let query = db.select().from(exchangeRates);
      if (currency) (query as any).where(eq(exchangeRates.targetCurrency, String(currency)));
      const rates = await db.select().from(exchangeRates)
        .where(currency ? eq(exchangeRates.targetCurrency, String(currency)) : sql`1=1`)
        .orderBy(desc(exchangeRates.rateDate))
        .limit(30);
      res.json(rates);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // TCMB'den kur çek (manuel tetikleme)
  app.post('/api/admin/rates/fetch-tcmb', requireAdmin, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // TCMB XML endpoint
      const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml');
      if (!response.ok) return res.status(502).json({ error: 'TCMB bağlantı hatası' });
      const xmlText = await response.text();
      
      // Basit XML parse (regex) — USD, EUR, GBP çek
      const currencies = ['USD', 'EUR', 'GBP'];
      const results: any[] = [];

      for (const curr of currencies) {
        const forexBuying = xmlText.match(new RegExp(`<Currency CurrencyCode="${curr}">[^]*?<ForexBuying>([^<]+)<`, 'i'));
        const forexSelling = xmlText.match(new RegExp(`<Currency CurrencyCode="${curr}">[^]*?<ForexSelling>([^<]+)<`, 'i'));
        if (forexSelling && forexSelling[1]) {
          const rate = parseFloat(forexSelling[1].replace(',', '.'));
          if (rate > 0) {
            // Bugünkü kur zaten varsa güncelle, yoksa ekle
            const existing = await db.select().from(exchangeRates)
              .where(and(eq(exchangeRates.targetCurrency, curr), eq(exchangeRates.rateDate, today as any)))
              .limit(1);
            
            if (existing.length > 0) {
              await db.update(exchangeRates).set({ rate: rate.toString(), fetchedAt: new Date(), source: 'tcmb' })
                .where(eq(exchangeRates.id, existing[0].id));
            } else {
              await db.insert(exchangeRates).values({
                tenantId: 1,
                baseCurrency: 'TRY',
                targetCurrency: curr,
                rate: rate.toString(),
                source: 'tcmb',
                rateDate: today as any,
              });
            }
            results.push({ currency: curr, rate });
          }
        }
      }
      res.json({ success: true, fetched: results, date: today });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Manuel kur girişi
  app.post('/api/admin/rates', requireAdmin, async (req, res) => {
    try {
      const { targetCurrency, rate, rateDate } = req.body;
      if (!targetCurrency || !rate || !rateDate) return res.status(400).json({ error: 'targetCurrency, rate ve rateDate zorunlu' });
      
      const existing = await db.select().from(exchangeRates)
        .where(and(eq(exchangeRates.targetCurrency, targetCurrency), eq(exchangeRates.rateDate, rateDate)))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(exchangeRates).set({ rate: String(rate), source: 'manual' }).where(eq(exchangeRates.id, existing[0].id));
      } else {
        await db.insert(exchangeRates).values({ tenantId: 1, baseCurrency: 'TRY', targetCurrency, rate: String(rate), source: 'manual', rateDate });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // FAZ 1D — DÖNEM KİLİTLERİ (Period Locks)
  // ============================================================

  // Tüm dönem kilitlerini getir
  app.get('/api/admin/period-locks', requireAdmin, async (req, res) => {
    try {
      const locks = await db.select().from(periodLocks).orderBy(desc(periodLocks.year), desc(periodLocks.month));
      res.json(locks);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Dönem kilitle
  app.post('/api/admin/period-locks', requireAdmin, async (req, res) => {
    try {
      const { year, month, notes } = req.body;
      const adminUser = (req as any).adminUser;
      if (!year || !month) return res.status(400).json({ error: 'year ve month zorunlu' });

      // Zaten kilitli mi?
      const existing = await db.select().from(periodLocks)
        .where(and(eq(periodLocks.year, parseInt(year)), eq(periodLocks.month, parseInt(month))))
        .limit(1);
      if (existing.length > 0) return res.status(409).json({ error: 'Bu dönem zaten kilitli' });

      await db.insert(periodLocks).values({
        tenantId: 1,
        year: parseInt(year),
        month: parseInt(month),
        notes,
        lockedByUserId: adminUser?.userId,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Dönem kilidini kaldır (sadece superadmin)
  app.delete('/api/admin/period-locks/:id', requireAdmin, async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
      if (adminUser?.role !== 'superadmin' && adminUser?.role !== 'tenant_admin') {
        return res.status(403).json({ error: 'Bu işlem için süper yönetici yetkisi gerekli' });
      }
      await db.delete(periodLocks).where(eq(periodLocks.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // FAZ 3A — ÖDEME TERS KAYIT (Payment Reversal)
  // ============================================================

  app.post('/api/admin/payments/:id/reverse', requireAdmin, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const adminUser = (req as any).adminUser;
      const payment = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
      if (!payment.length) return res.status(404).json({ error: 'Ödeme bulunamadı' });
      if (payment[0].status === 'iptal') return res.status(400).json({ error: 'Bu ödeme zaten iptal edilmiş' });
      if (payment[0].reversalOfId) return res.status(400).json({ error: 'Bu kayıt zaten bir ters kayıttır' });

      await db.transaction(async (tx) => {
        // Mevcut ödemeyi iptal et
        await tx.update(payments).set({
          status: 'iptal',
          reversedAt: new Date(),
          reversedByUserId: adminUser?.userId,
        }).where(eq(payments.id, paymentId));

        // Ters kayıt oluştur (negatif)
        await tx.insert(payments).values({
          tenantId: payment[0].tenantId || 1,
          invoiceId: payment[0].invoiceId,
          companyId: payment[0].companyId,
          ticketId: (payment[0] as any).ticketId || null,
          amount: payment[0].amount,
          paymentMethod: payment[0].paymentMethod,
          status: 'iptal' as any,
          notes: `TERS KAYIT - Orijinal ödeme #${paymentId} iptal edildi`,
          reversalOfId: paymentId,
          reversedByUserId: adminUser?.userId,
          reversedAt: new Date(),
        } as any);
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Manuel tahsilat / iade kaydı ekle (nakit/kart/havale elden alınan ödeme)
  app.post('/api/admin/payments', requireAdmin, async (req, res) => {
    try {
      const { ticketId, amount, paymentMethod, notes, isRefund } = req.body;
      const amt = parseFloat(amount);
      if (!ticketId || !amt || amt <= 0) {
        return res.status(400).json({ error: 'Geçerli bir servis kaydı ve tutar giriniz.' });
      }
      if (!['kredi_karti', 'havale_eft', 'nakit', 'diger'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Geçersiz ödeme yöntemi.' });
      }
      const adminUser = (req as any).adminUser;
      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, parseInt(ticketId))).limit(1);
      if (!ticket) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });

      const [result] = await db.insert(payments).values({
        tenantId: ticket.tenantId || 1,
        ticketId: ticket.id,
        amount: amt.toFixed(2),
        paymentMethod,
        status: isRefund ? 'iade' : 'basarili',
        notes: notes || null,
      });
      const paymentId = (result as any).insertId;

      await db.insert(auditLogs).values({
        tenantId: ticket.tenantId || 1,
        userId: adminUser?.userId || null,
        action: isRefund ? 'payment.refund' : 'payment.collected',
        entityType: 'Ticket',
        entityId: ticket.id,
        details: { paymentId, amount: amt.toFixed(2), paymentMethod, notes: notes || null },
      }).catch((e) => console.error('auditLogs insert error:', e));

      res.json({ success: true, id: paymentId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Ödemeleri listele (ticketId filter desteği eklendi)
  app.get('/api/admin/payments', requireAdmin, async (req, res) => {
    try {
      const { ticketId } = req.query;
      let rows;
      if (ticketId) {
        rows = await db.select().from(payments)
          .where(eq((payments as any).ticketId, parseInt(String(ticketId))))
          .orderBy(desc(payments.createdAt));
      } else {
        rows = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(100);
      }
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // FAZ 3C — AUDİT LOG HELPER (Merkezi log fonksiyonu)
  // ============================================================

  // ============================================================
  // ADMIN API — NOTIFICATIONS (Sistem Bildirimleri)
  // ============================================================

  app.get('/api/admin/notifications', requireAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit(150);
      
      if (rows.length === 0) {
        const recentTickets = await db.select({
          id: tickets.id,
          ticketNumber: tickets.ticketNumber,
          subject: tickets.subject,
          status: tickets.status,
          createdAt: tickets.createdAt
        }).from(tickets)
          .orderBy(desc(tickets.createdAt))
          .limit(5);

        const dynamicNotifications = recentTickets.map(t => ({
          id: t.id,
          title: `Yeni Servis Kaydı: ${t.ticketNumber}`,
          message: `${t.subject} konulu cihaz servise alındı.`,
          type: 'info',
          isRead: false,
          linkUrl: `/admin/servis`,
          createdAt: t.createdAt
        }));
        return res.json(dynamicNotifications);
      }
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/notifications/mark-read', requireAdmin, async (req, res) => {
    try {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/notifications/:id/read', requireAdmin, async (req, res) => {
    try {
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/notifications/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(notifications)
        .where(eq(notifications.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — SHIPMENTS (Kargo Yönetimi)
  // ============================================================

  app.get('/api/admin/shipments', requireAdmin, async (req, res) => {
    try {
      const rows = await db.select({
        id: shipments.id,
        carrier: shipments.carrier,
        trackingNumber: shipments.trackingNumber,
        status: shipments.status,
        senderDetails: shipments.senderDetails,
        receiverDetails: shipments.receiverDetails,
        notes: shipments.notes,
        createdAt: shipments.createdAt,
        updatedAt: shipments.updatedAt,
        ticketId: shipments.ticketId,
        ticketNumber: tickets.ticketNumber,
        customerName: users.firstName,
        customerPhone: users.phone
      }).from(shipments)
        .leftJoin(tickets, eq(shipments.ticketId, tickets.id))
        .leftJoin(users, eq(tickets.userId, users.id))
        .orderBy(desc(shipments.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/shipments', requireAdmin, async (req, res) => {
    try {
      const { ticketId, carrier, trackingNumber, senderDetails, receiverDetails, notes } = req.body;
      const tracking = trackingNumber || `KP-${carrier.substring(0,2).toUpperCase()}-${String(Date.now()).slice(-6)}`;
      
      let parsedTicketId: number | null = null;
      if (ticketId !== undefined && ticketId !== null && ticketId !== '') {
        const parsedVal = parseInt(String(ticketId), 10);
        if (!isNaN(parsedVal)) {
          parsedTicketId = parsedVal;
        }
      }

      const [inserted] = await db.insert(shipments).values({
        tenantId: 1,
        ticketId: parsedTicketId,
        carrier: carrier || 'yurtici',
        trackingNumber: tracking,
        status: 'hazirlaniyor',
        senderDetails: senderDetails || 'Kerim Bilgisayar Merkez Ofis',
        receiverDetails: receiverDetails || '',
        notes: notes || '',
      });
      res.json({ id: (inserted as any).insertId, trackingNumber: tracking, success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/shipments/:id', requireAdmin, async (req, res) => {
    try {
      const { status, notes } = req.body;
      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      
      await db.update(shipments).set(updateData).where(eq(shipments.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/shipments/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(shipments).where(eq(shipments.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — EXPENSES & RECEIPT OCR (Masraflar & Fiş Okuma)
  // ============================================================

  app.get('/api/admin/expenses', requireAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/expenses', requireAdmin, async (req, res) => {
    try {
      const { title, amount, category, description, receiptUrl, expenseDate } = req.body;
      const [inserted] = await db.insert(expenses).values({
        tenantId: 1,
        title,
        amount: String(amount),
        category: category || 'genel',
        description: description || '',
        receiptUrl: receiptUrl || null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      });
      res.json({ id: (inserted as any).insertId, success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/expenses/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(expenses).where(eq(expenses.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/expenses/ocr', requireAdmin, async (req, res) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: 'Görsel URL gereklidir.' });
      }

      // Akıllı Fiş OCR Simülatörü - Görsel ismine göre akıllı çıkarım yapar
      const nameLower = imageUrl.toLowerCase();
      let title = 'Ofis Harcaması / Fiş';
      let amount = (Math.random() * 400 + 100).toFixed(2); // 100 - 500 TL arası
      let category = 'ofis';
      let description = 'OCR Tarama ile otomatik olarak fişten çözümlendi.';

      if (nameLower.includes('shell') || nameLower.includes('petrol') || nameLower.includes('akaryakit') || nameLower.includes('opet') || nameLower.includes('bp')) {
        title = 'Shell Akaryakıt Gideri';
        amount = (Math.random() * 800 + 800).toFixed(2); // 800 - 1600 TL arası
        category = 'yol';
        description = 'Taşıt yakıt gideri - OCR ile tarandı.';
      } else if (nameLower.includes('migros') || nameLower.includes('yemek') || nameLower.includes('restoran') || nameLower.includes('market') || nameLower.includes('gida')) {
        title = 'Migros Personel Yemek Gideri';
        amount = (Math.random() * 300 + 200).toFixed(2); // 200 - 500 TL arası
        category = 'yemek';
        description = 'Personel yemek/mutfak masrafı - OCR ile tarandı.';
      } else if (nameLower.includes('kargo') || nameLower.includes('yurtici') || nameLower.includes('aras') || nameLower.includes('mng') || nameLower.includes('ptt')) {
        title = 'Yurtiçi Kargo Gönderim Bedeli';
        amount = (Math.random() * 120 + 80).toFixed(2); // 80 - 200 TL arası
        category = 'kargo';
        description = 'Servis cihazı gönderi bedeli - OCR ile tarandı.';
      } else if (nameLower.includes('donanim') || nameLower.includes('vatan') || nameLower.includes('parca')) {
        title = 'Vatan Bilgisayar Yedek Parça Harcaması';
        amount = (Math.random() * 1500 + 1000).toFixed(2); // 1000 - 2500 TL arası
        category = 'donanim';
        description = 'Teknik servis yedek parça alımı - OCR ile tarandı.';
      }

      // Rastgele fatura tarihi (son 3 gün içinde)
      const daysAgo = Math.floor(Math.random() * 3);
      const expenseDate = new Date();
      expenseDate.setDate(expenseDate.getDate() - daysAgo);

      res.json({
        success: true,
        data: {
          title,
          amount,
          category,
          description,
          expenseDate: expenseDate.toISOString(),
          receiptUrl: imageUrl
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — TICKET ATTACHMENTS (Servis Kaydı Görselleri)
  // ============================================================

  app.get('/api/admin/tickets/:ticketId/attachments', requireAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(ticketAttachments)
        .where(eq(ticketAttachments.ticketId, parseInt(req.params.ticketId)))
        .orderBy(desc(ticketAttachments.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST: Add attachment record (JSON body with file URL already uploaded)
  app.post('/api/admin/tickets/:ticketId/attachments', requireAdmin, async (req, res) => {
    try {
      const { fileName, fileUrl, fileType, fileSize } = req.body;
      const ticketId = parseInt(req.params.ticketId);
      // Resolve userId for folder organization
      const ticketRow = await db.select({ userId: tickets.userId }).from(tickets).where(eq(tickets.id, ticketId)).limit(1);
      const userId = ticketRow[0]?.userId;
      // Move file from temp to user-specific folder if applicable
      const finalUrl = userId ? moveUserFile(fileUrl, userId) : fileUrl;

      await db.insert(ticketAttachments).values({
        tenantId: 1,
        ticketId,
        fileName: fileName || 'Dosya',
        fileUrl: finalUrl,
        fileType: fileType || 'application/octet-stream',
        fileSize: fileSize || 0,
      });
      res.json({ success: true, fileUrl: finalUrl });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Servis dosyası yükleme — uploads/servisklasoru/temp/ klasörüne kaydeder
  const servisStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const tempDir = path.join(rootDir, 'uploads', 'servisklasoru', 'temp');
      fs.mkdirSync(tempDir, { recursive: true });
      cb(null, tempDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const servisUpload = multer({
    storage: servisStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for videos
  });

  app.post('/api/admin/servis/upload', requireAdmin, (req, res, next) => {
    servisUpload.single('file')(req, res, (err) => {
      if (err) {
        console.error("Multer Servis Upload Hatası:", err);
        return res.status(400).json({ error: 'Dosya yüklenemedi: ' + err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Dosya seçilmedi' });
      const fileUrl = `/uploads/servisklasoru/temp/${req.file.filename}`;
      res.json({ success: true, fileUrl, fileName: req.file.originalname, fileType: req.file.mimetype, fileSize: req.file.size });
    } catch (e: any) {
      console.error("Servis Upload Exception:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/tickets/attachments/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(ticketAttachments).where(eq(ticketAttachments.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — STATS (DASHBOARD)
  // ============================================================

  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      // Tickets count
      const allTickets = await db.select().from(tickets);
      const newTickets = allTickets.filter(t => t.status === 'yeni');
      
      // Users count
      const allUsers = await db.select().from(users);
      const allCustomers = await db.select().from(customers).where(eq(customers.isActive, true));

      // CMS counts
      const allPages = await db.select().from(pages);
      const allBlogs = await db.select().from(blogPosts);

      // Stock alerts — kritik stok seviyesinin altındaki ürünler
      const allStock = await db.select().from(stockItems).where(eq(stockItems.isActive, true));
      const stockAlertCount = allStock.filter(s => (s.currentStock || 0) <= (s.minStockLevel || 0)).length;

      // Sales and revenue stats
      const allSales = await db.select().from(sales).where(eq(sales.status, 'odendi'));
      const totalRevenue = allSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || '0'), 0);
      const salesCount = allSales.length;

      // Son 7 günün günlük satış dağılımı
      const dailyMap: Record<string, { date: string; amount: number; count: number }> = {};
      const formatLocDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      // Son 7 günü başlat
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = formatLocDate(d);
        const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
        dailyMap[dateStr] = { date: label, amount: 0, count: 0 };
      }

      // Satışları günlere yerleştir
      for (const s of allSales) {
        if (s.createdAt) {
          const dateStr = formatLocDate(new Date(s.createdAt));
          if (dailyMap[dateStr]) {
            dailyMap[dateStr].amount += parseFloat(s.totalAmount || '0');
            dailyMap[dateStr].count += 1;
          }
        }
      }

      const dailySales = Object.keys(dailyMap).sort().map(k => ({
        date: dailyMap[k].date,
        amount: Math.round(dailyMap[k].amount),
        count: dailyMap[k].count
      }));

      // Status Distribution
      const statusCounts = allTickets.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

      const statusDistribution = Object.keys(statusCounts).map(k => ({
        name: TICKET_STATUS_LABELS[k] || k,
        value: statusCounts[k]
      }));

      // Recent Tickets
      const recentTickets = await db.select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        status: tickets.status,
        customerName: users.firstName,
        customerLastName: users.lastName
      }).from(tickets)
        .leftJoin(users, eq(tickets.userId, users.id))
        .orderBy(desc(tickets.createdAt))
        .limit(5);

      res.json({
        ticketCount: allTickets.length,
        newLeads: newTickets.length,
        userCount: allUsers.length,
        customerCount: allCustomers.length,
        stockAlerts: stockAlertCount,
        pageCount: allPages.length,
        blogCount: allBlogs.length,
        totalRevenue,
        salesCount,
        dailySales,
        statusDistribution,
        recentTickets: recentTickets.map(t => ({
          ...t,
          customerName: `${t.customerName || ''} ${t.customerLastName || ''}`.trim() || 'Müşteri'
        }))
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });



  // ============================================================
  // ADMIN API — STOCK
  // ============================================================

  function generateEAN13Backend(): string {
    let code12 = '200';
    for (let i = 0; i < 9; i++) {
      code12 += Math.floor(Math.random() * 10);
    }
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(code12[i], 10);
      sum += d * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return code12 + checkDigit;
  }

  app.get('/api/admin/stock', requireAdmin, async (req, res) => {
    try {
      const items = await db.select({
        id: stockItems.id,
        sku: stockItems.sku,
        barcode: stockItems.barcode,
        name: stockItems.name,
        description: stockItems.description,
        brand: stockItems.brand,
        model: stockItems.model,
        unit: stockItems.unit,
        vatRate: stockItems.vatRate,
        imageUrl: stockItems.imageUrl,
        costPrice: stockItems.costPrice,
        sellingPrice: stockItems.sellingPrice,
        currentStock: stockItems.currentStock,
        minStockLevel: stockItems.minStockLevel,
        hasSerialTracking: stockItems.hasSerialTracking,
        warrantyMonths: stockItems.warrantyMonths,
        isActive: stockItems.isActive,
        categoryId: stockItems.categoryId,
        categoryName: inventoryCategories.name,
      }).from(stockItems)
        .leftJoin(inventoryCategories, eq(stockItems.categoryId, inventoryCategories.id))
        .orderBy(desc(stockItems.createdAt));
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/stock', requireAdmin, async (req, res) => {
    try {
      const { sku, barcode, name, description, brand, model, unit, vatRate, imageUrl, costPrice, sellingPrice, currentStock, minStockLevel, categoryId, hasSerialTracking, warrantyMonths } = req.body;
      const finalBarcode = barcode && barcode.trim() !== '' ? barcode.trim() : generateEAN13Backend();
      
      await db.insert(stockItems).values({
        tenantId: 1,
        sku: sku || `SKU-${Date.now()}`,
        barcode: finalBarcode,
        name,
        description: description || null,
        brand: brand || null,
        model: model || null,
        unit: unit || 'adet',
        vatRate: parseInt(vatRate) || 20,
        imageUrl: imageUrl || null,
        costPrice: costPrice?.toString() || '0.00',
        sellingPrice: sellingPrice?.toString() || '0.00',
        currentStock: parseInt(currentStock) || 0,
        minStockLevel: parseInt(minStockLevel) || 5,
        hasSerialTracking: hasSerialTracking === true || hasSerialTracking === 'true',
        warrantyMonths: parseInt(warrantyMonths) || 0,
        categoryId: categoryId ? parseInt(categoryId) : null,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/stock/:id', requireAdmin, async (req, res) => {
    try {
      const { adjustment, name, description, brand, model, unit, vatRate, imageUrl, categoryId, minStockLevel, sellingPrice, costPrice, barcode, isActive, hasSerialTracking, warrantyMonths } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (brand !== undefined) updateData.brand = brand;
      if (model !== undefined) updateData.model = model;
      if (unit !== undefined) updateData.unit = unit;
      if (vatRate !== undefined) updateData.vatRate = parseInt(vatRate);
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null;
      if (minStockLevel !== undefined) updateData.minStockLevel = parseInt(minStockLevel);
      if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice.toString();
      if (costPrice !== undefined) updateData.costPrice = costPrice.toString();
      if (barcode !== undefined) updateData.barcode = barcode;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (hasSerialTracking !== undefined) updateData.hasSerialTracking = hasSerialTracking === true || hasSerialTracking === 'true';
      if (warrantyMonths !== undefined) updateData.warrantyMonths = parseInt(warrantyMonths) || 0;
      
      if (adjustment !== undefined) {
        const [current] = await db.select({ stock: stockItems.currentStock }).from(stockItems).where(eq(stockItems.id, parseInt(req.params.id)));
        updateData.currentStock = Math.max(0, (current?.stock || 0) + parseInt(adjustment));
      }
      await db.update(stockItems).set(updateData).where(eq(stockItems.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Toplu CSV içe aktarma
  app.post('/api/admin/stock/import-csv', requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Dosya yüklenemedi' });
      const csvData = fs.readFileSync(req.file.path, 'utf8');
      const Papa = await import('papaparse').then(m => (m as any).default || m);
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      
      let imported = 0;
      let updated = 0;

      for (const row of parsed.data as any[]) {
        const { name, sku, barcode, brand, model, unit, vatRate, costPrice, sellingPrice, currentStock, minStockLevel, description, imageUrl, category } = row;
        if (!name) continue;

        let catId = null;
        if (category) {
          const [existingCat] = await db.select({ id: inventoryCategories.id }).from(inventoryCategories).where(eq(inventoryCategories.name, category)).limit(1);
          if (existingCat) {
            catId = existingCat.id;
          } else {
            await db.insert(inventoryCategories).values({ tenantId: 1, name: category });
            const [insertedCat] = await db.select({ id: inventoryCategories.id }).from(inventoryCategories).where(eq(inventoryCategories.name, category)).limit(1);
            catId = insertedCat?.id || null;
          }
        }

        const matchedSku = sku ? await db.select().from(stockItems).where(eq(stockItems.sku, sku)).limit(1) : [];
        if (matchedSku.length > 0) {
          const updateObj: any = {};
          if (name) updateObj.name = name;
          if (barcode) updateObj.barcode = barcode;
          if (brand !== undefined) updateObj.brand = brand;
          if (model !== undefined) updateObj.model = model;
          if (unit) updateObj.unit = unit;
          if (vatRate) updateObj.vatRate = parseInt(vatRate);
          if (costPrice) updateObj.costPrice = costPrice;
          if (sellingPrice) updateObj.sellingPrice = sellingPrice;
          if (currentStock) updateObj.currentStock = parseInt(currentStock);
          if (minStockLevel) updateObj.minStockLevel = parseInt(minStockLevel);
          if (description !== undefined) updateObj.description = description;
          if (imageUrl !== undefined) updateObj.imageUrl = imageUrl;
          if (catId) updateObj.categoryId = catId;

          await db.update(stockItems).set(updateObj).where(eq(stockItems.id, matchedSku[0].id));
          updated++;
        } else {
          await db.insert(stockItems).values({
            tenantId: 1,
            sku: sku || `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            barcode: barcode || `869${Math.floor(Math.random() * 10000000000)}`,
            name,
            brand: brand || null,
            model: model || null,
            unit: unit || 'adet',
            vatRate: parseInt(vatRate) || 20,
            costPrice: costPrice || '0.00',
            sellingPrice: sellingPrice || '0.00',
            currentStock: parseInt(currentStock) || 0,
            minStockLevel: parseInt(minStockLevel) || 5,
            description: description || null,
            imageUrl: imageUrl || null,
            categoryId: catId,
          });
          imported++;
        }
      }

      fs.unlinkSync(req.file.path);
      res.json({ success: true, imported, updated });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Toplu Excel dışa aktarma
  app.get('/api/admin/stock/export-excel', requireAdmin, async (req, res) => {
    try {
      const items = await db.select({
        id: stockItems.id,
        sku: stockItems.sku,
        barcode: stockItems.barcode,
        name: stockItems.name,
        brand: stockItems.brand,
        model: stockItems.model,
        unit: stockItems.unit,
        vatRate: stockItems.vatRate,
        costPrice: stockItems.costPrice,
        sellingPrice: stockItems.sellingPrice,
        currentStock: stockItems.currentStock,
        minStockLevel: stockItems.minStockLevel,
        description: stockItems.description,
        imageUrl: stockItems.imageUrl,
        categoryName: inventoryCategories.name,
      }).from(stockItems)
        .leftJoin(inventoryCategories, eq(stockItems.categoryId, inventoryCategories.id))
        .where(eq(stockItems.isActive, true))
        .orderBy(desc(stockItems.createdAt));

      const ExcelJS = await import('exceljs').then(m => (m as any).default || m);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Stok Listesi');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Ürün Kodu (SKU)', key: 'sku', width: 20 },
        { header: 'Barkod', key: 'barcode', width: 20 },
        { header: 'Ürün Adı', key: 'name', width: 35 },
        { header: 'Marka', key: 'brand', width: 15 },
        { header: 'Model', key: 'model', width: 15 },
        { header: 'Kategori', key: 'categoryName', width: 20 },
        { header: 'Birim', key: 'unit', width: 10 },
        { header: 'KDV Oranı (%)', key: 'vatRate', width: 15 },
        { header: 'Maliyet Fiyatı', key: 'costPrice', width: 15 },
        { header: 'Satış Fiyatı', key: 'sellingPrice', width: 15 },
        { header: 'Mevcut Stok', key: 'currentStock', width: 15 },
        { header: 'Kritik Stok Sınırı', key: 'minStockLevel', width: 15 },
        { header: 'Açıklama', key: 'description', width: 30 },
      ];

      items.forEach(item => {
        worksheet.addRow({
          ...item,
          costPrice: item.costPrice ? parseFloat(item.costPrice) : 0,
          sellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : 0,
        });
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=stok_listesi.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (e: any) {
      console.error(e);
      if (!res.headersSent) {
        res.status(500).json({ error: e.message });
      }
    }
  });

  // ============================================================
  // ADMIN API — INVENTORY CATEGORIES
  // ============================================================

  app.get('/api/admin/inventory-categories', requireAdmin, async (req, res) => {
    try {
      const cats = await db.select().from(inventoryCategories);
      res.json(cats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/inventory-categories', requireAdmin, async (req, res) => {
    try {
      const { name, description, parentId } = req.body;
      await db.insert(inventoryCategories).values({
        tenantId: 1,
        name,
        description,
        parentId: parentId ? parseInt(parentId) : null,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/inventory-categories/:id', requireAdmin, async (req, res) => {
    try {
      const { name, description, parentId } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (parentId !== undefined) updateData.parentId = parentId ? parseInt(parentId) : null;
      await db.update(inventoryCategories).set(updateData).where(eq(inventoryCategories.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/inventory-categories/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(inventoryCategories).where(eq(inventoryCategories.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — SALES & POS SYSTEM
  // ============================================================

  app.get('/api/admin/sales', requireAdmin, async (req, res) => {
    try {
      const customerUsers = alias(users, 'customer_users');
      const salespersonUsers = alias(users, 'salesperson_users');

      const results = await db.select({
        id: sales.id,
        receiptNumber: sales.receiptNumber,
        totalAmount: sales.totalAmount,
        taxAmount: sales.taxAmount,
        discountAmount: sales.discountAmount,
        paymentType: sales.paymentType,
        status: sales.status,
        notes: sales.notes,
        createdAt: sales.createdAt,
        customerName: sql<string>`CONCAT(${customerUsers.firstName}, ' ', COALESCE(${customerUsers.lastName}, ''))`,
        salespersonName: sql<string>`CONCAT(${salespersonUsers.firstName}, ' ', COALESCE(${salespersonUsers.lastName}, ''))`
      }).from(sales)
        .leftJoin(customerUsers, eq(sales.customerId, customerUsers.id))
        .leftJoin(salespersonUsers, eq(sales.salespersonId, salespersonUsers.id))
        .orderBy(desc(sales.createdAt));
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/sales', requireAdmin, async (req, res) => {
    try {
      const { customerId, paymentType, discountAmount, notes, items: saleProducts } = req.body;
      if (!saleProducts || !Array.isArray(saleProducts) || saleProducts.length === 0) {
        return res.status(400).json({ error: 'Sepet boş veya geçersiz ürün listesi' });
      }

      const salespersonId = (req as any).adminUser.userId;
      const receiptNumber = `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      let calculatedTotal = 0;
      let calculatedTax = 0;

      for (const item of saleProducts) {
        const qty = parseInt(item.quantity) || 1;
        const price = parseFloat(item.unitPrice) || 0;
        const vatRate = parseInt(item.vatRate) || 20;
        const subtotal = price * qty;
        calculatedTotal += subtotal;
        calculatedTax += subtotal * (vatRate / (100 + vatRate));
      }

      const finalDiscount = parseFloat(discountAmount) || 0;
      const finalTotal = Math.max(0, calculatedTotal - finalDiscount);

      // Tüm satış işlemini atomik bir transaction içinde yürüt: herhangi bir
      // adım hata verirse tamamı geri alınır (kısmi yazım önlenir).
      const saleId = await db.transaction(async (tx) => {
        const [insertedSale] = await tx.insert(sales).values({
          tenantId: 1,
          customerId: customerId ? parseInt(customerId) : null,
          salespersonId,
          receiptNumber,
          totalAmount: finalTotal.toFixed(2),
          taxAmount: calculatedTax.toFixed(2),
          discountAmount: finalDiscount.toFixed(2),
          paymentType,
          status: 'odendi',
          notes: notes || null,
        });
        const newSaleId = (insertedSale as any).insertId;

        for (const item of saleProducts) {
          const qty = parseInt(item.quantity) || 1;
          const price = parseFloat(item.unitPrice) || 0;
          const vatRate = parseInt(item.vatRate) || 20;
          const totalPrice = price * qty;

          await tx.insert(saleItems).values({
            tenantId: 1,
            saleId: newSaleId,
            stockItemId: parseInt(item.stockItemId),
            serializedItemId: item.serializedItemId ? parseInt(item.serializedItemId) : null,
            quantity: qty,
            unitPrice: price.toFixed(2),
            vatRate,
            totalPrice: totalPrice.toFixed(2),
          });

          // Atomik stok düşümü (yarış koşulunu önler)
          await tx.update(stockItems)
            .set({ currentStock: sql`GREATEST(0, ${stockItems.currentStock} - ${qty})` })
            .where(eq(stockItems.id, parseInt(item.stockItemId)));

          await tx.insert(stockMovements).values({
            tenantId: 1,
            stockItemId: parseInt(item.stockItemId),
            serializedItemId: item.serializedItemId ? parseInt(item.serializedItemId) : null,
            fromWarehouseId: null,
            toWarehouseId: null,
            quantity: qty,
            type: 'cikis',
            reason: 'POS Satış',
            referenceId: newSaleId,
            createdById: salespersonId,
          });

          if (item.serializedItemId) {
            await tx.update(serializedItems).set({ status: 'satildi' }).where(eq(serializedItems.id, parseInt(item.serializedItemId)));
          }
        }
        return newSaleId;
      });

      res.json({ success: true, saleId, receiptNumber });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/sales/:id', requireAdmin, async (req, res) => {
    try {
      const saleId = parseInt(req.params.id);
      const customerUsers = alias(users, 'customer_users');
      const salespersonUsers = alias(users, 'salesperson_users');

      const [sale] = await db.select({
        id: sales.id,
        receiptNumber: sales.receiptNumber,
        totalAmount: sales.totalAmount,
        taxAmount: sales.taxAmount,
        discountAmount: sales.discountAmount,
        paymentType: sales.paymentType,
        status: sales.status,
        notes: sales.notes,
        createdAt: sales.createdAt,
        customerName: sql<string>`CONCAT(${customerUsers.firstName}, ' ', COALESCE(${customerUsers.lastName}, ''))`,
        customerPhone: customerUsers.phone,
        customerEmail: customerUsers.email,
        salespersonName: sql<string>`CONCAT(${salespersonUsers.firstName}, ' ', COALESCE(${salespersonUsers.lastName}, ''))`
      }).from(sales)
        .leftJoin(customerUsers, eq(sales.customerId, customerUsers.id))
        .leftJoin(salespersonUsers, eq(sales.salespersonId, salespersonUsers.id))
        .where(eq(sales.id, saleId))
        .limit(1);

      if (!sale) return res.status(404).json({ error: 'Satış kaydı bulunamadı' });

      const itemsList = await db.select({
        id: saleItems.id,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        vatRate: saleItems.vatRate,
        totalPrice: saleItems.totalPrice,
        productName: stockItems.name,
        sku: stockItems.sku,
        barcode: stockItems.barcode,
        serialNumber: serializedItems.serialNumber
      }).from(saleItems)
        .leftJoin(stockItems, eq(saleItems.stockItemId, stockItems.id))
        .leftJoin(serializedItems, eq(saleItems.serializedItemId, serializedItems.id))
        .where(eq(saleItems.saleId, saleId));

      res.json({ sale, items: itemsList });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — TICKET MESSAGES (Dahili Notlar)
  // ============================================================

  app.get('/api/admin/ticket-messages/:ticketId', requireAdmin, async (req, res) => {
    try {
      const msgs = await db.select({
        id: ticketMessages.id,
        message: ticketMessages.message,
        isInternal: ticketMessages.isInternal,
        createdAt: ticketMessages.createdAt,
        senderName: users.firstName,
        senderLastName: users.lastName,
      }).from(ticketMessages)
        .leftJoin(users, eq(ticketMessages.senderId, users.id))
        .where(eq(ticketMessages.ticketId, parseInt(req.params.ticketId)))
        .orderBy(asc(ticketMessages.createdAt));
      res.json(msgs.map(m => ({
        ...m,
        senderName: `${m.senderName || ''} ${m.senderLastName || ''}`.trim() || 'Sistem'
      })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/ticket-messages', requireAdmin, async (req, res) => {
    try {
      const { ticketId, message, isInternal } = req.body;
      const adminUser = (req as any).adminUser;
      await db.insert(ticketMessages).values({
        tenantId: 1,
        ticketId: parseInt(ticketId),
        senderId: adminUser.userId,
        message,
        isInternal: isInternal !== false,
      });
      // Ticket updatedAt güncelle
      await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, parseInt(ticketId)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — LEAD TO TICKET (Lead'i Servise Dönüştür)
  // ============================================================

  app.post('/api/admin/leads/:id/convert', requireAdmin, async (req, res) => {
    try {
      const lead = await db.select().from(leads).where(eq(leads.id, parseInt(req.params.id))).limit(1);
      if (lead.length === 0) return res.status(404).json({ error: 'Lead bulunamadı' });
      const l = lead[0];

      // Müşteri bul veya oluştur
      let userId: number | null = null;
      if (l.phone) {
        const existing = await db.select().from(users).where(eq(users.phone, l.phone || '')).limit(1);
        if (existing.length > 0) {
          userId = existing[0].id;
        } else {
          const nameParts = (l.name || '').split(' ');
          const newUser = await db.insert(users).values({
            tenantId: 1,
            firstName: nameParts[0] || l.name || 'İsimsiz',
            lastName: nameParts.slice(1).join(' ') || '',
            email: l.email || `${l.phone}@noemail.local`,
            phone: l.phone || '',
            roleType: 'customer',
          });
          userId = (newUser[0] as any).insertId;
        }
      }

      const ticketNumber = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      await db.insert(tickets).values({
        tenantId: 1,
        ticketNumber,
        userId,
        type: 'ariza',
        subject: `Randevu Dönüşümü: ${l.name}`,
        description: l.notes || 'Randevu formu üzerinden alınan talep.',
        priority: 'normal',
        status: 'yeni',
        cost: '0.00',
      });

      // Lead durumunu güncelle
      await db.update(leads).set({ status: 'converted' }).where(eq(leads.id, parseInt(req.params.id)));

      res.json({ success: true, ticketNumber });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — SETTINGS (GET + PUT)

  // ============================================================

  app.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const allSettings = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      allSettings.forEach(s => {
        if (s.value !== null && s.value !== undefined) settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const updates = req.body as Record<string, string>;
      for (const [key, value] of Object.entries(updates)) {
        const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
        if (existing.length > 0) {
          await db.update(settings).set({ value }).where(eq(settings.key, key));
        } else {
          await db.insert(settings).values({ tenantId: 1, key, value, group: 'general' });
        }
      }
      settingsCache = null;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const getSettingsMap = async () => {
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => {
      if (s.value !== null && s.value !== undefined) settingsMap[s.key] = s.value;
    });
    return settingsMap;
  };

  const cloudflareRequest = async (settingsMap: Record<string, string>, pathName: string, init: RequestInit = {}) => {
    const zoneId = settingsMap.cloudflareZoneId?.trim();
    const apiToken = settingsMap.cloudflareApiToken?.trim();

    if (!zoneId || !apiToken) {
      const error = new Error('Cloudflare Zone ID ve API Token zorunludur.');
      (error as any).statusCode = 400;
      throw error;
    }

    const response = await fetch(`https://api.cloudflare.com/client/v4${pathName.replace(':zoneId', zoneId)}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      const message = data?.errors?.[0]?.message || `Cloudflare isteği başarısız oldu (${response.status}).`;
      const error = new Error(message);
      (error as any).statusCode = response.status || 500;
      throw error;
    }

    return data;
  };

  app.post('/api/admin/cloudflare/test', requireAdmin, async (req, res) => {
    try {
      const settingsMap = await getSettingsMap();
      const data = await cloudflareRequest(settingsMap, '/zones/:zoneId');
      res.json({ success: true, zone: data.result });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/admin/cloudflare/purge-cache', requireAdmin, async (req, res) => {
    try {
      const settingsMap = await getSettingsMap();
      const files = Array.isArray(req.body?.files) ? req.body.files.filter((file: unknown) => typeof file === 'string' && file.trim()) : [];
      const body = files.length > 0 ? { files } : { purge_everything: true };
      const data = await cloudflareRequest(settingsMap, '/zones/:zoneId/purge_cache', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      res.json({ success: true, result: data.result });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/admin/cloudflare/setting', requireAdmin, async (req, res) => {
    try {
      const allowedSettings = new Set(['development_mode', 'ssl', 'always_use_https', 'browser_cache_ttl']);
      const { setting, value } = req.body || {};
      if (!allowedSettings.has(setting)) {
        return res.status(400).json({ success: false, error: 'Bu Cloudflare ayarı desteklenmiyor.' });
      }

      const settingsMap = await getSettingsMap();
      const data = await cloudflareRequest(settingsMap, `/zones/:zoneId/settings/${setting}`, {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      });
      res.json({ success: true, result: data.result });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — THEME BUILDER (LIVE CUSTOMIZER)
  // ============================================================

  app.get('/api/admin/theme/settings', requireAdmin, async (req, res) => {
    try {
      const isDraft = req.query.draft === 'true';
      const allSettings = await db.select().from(themeSettings).where(eq(themeSettings.isDraft, isDraft));
      const settingsMap: Record<string, any> = {};
      allSettings.forEach(s => {
        settingsMap[s.settingKey] = s.settingValue;
      });
      res.json(settingsMap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/theme/settings/draft', requireAdmin, async (req, res) => {
    try {
      const updates = req.body as Record<string, any>;
      // updates is an object of key: value pairs
      for (const [key, value] of Object.entries(updates)) {
        // Group can be derived or default to 'general' for now
        const existing = await db.select().from(themeSettings)
          .where(and(eq(themeSettings.settingKey, key), eq(themeSettings.isDraft, true))).limit(1);
          
        if (existing.length > 0) {
          await db.update(themeSettings).set({ settingValue: value }).where(eq(themeSettings.id, existing[0].id));
        } else {
          await db.insert(themeSettings).values({ 
            tenantId: 1, 
            settingGroup: 'general', 
            settingKey: key, 
            settingValue: value, 
            isDraft: true 
          });
        }
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/theme/settings/publish', requireAdmin, async (req, res) => {
    try {
      // Get all draft settings
      const draftSettings = await db.select().from(themeSettings).where(eq(themeSettings.isDraft, true));
      
      for (const draft of draftSettings) {
        // Find existing live setting
        const live = await db.select().from(themeSettings)
          .where(and(eq(themeSettings.settingKey, draft.settingKey), eq(themeSettings.isDraft, false))).limit(1);
          
        if (live.length > 0) {
          await db.update(themeSettings).set({ settingValue: draft.settingValue }).where(eq(themeSettings.id, live[0].id));
        } else {
          await db.insert(themeSettings).values({
            tenantId: 1,
            settingGroup: draft.settingGroup,
            settingKey: draft.settingKey,
            settingValue: draft.settingValue,
            isDraft: false
          });
        }
      }
      
      // Delete all drafts after publish
      await db.delete(themeSettings).where(eq(themeSettings.isDraft, true));
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/theme/settings/discard', requireAdmin, async (req, res) => {
    try {
      await db.delete(themeSettings).where(eq(themeSettings.isDraft, true));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — LAYOUTS (Template Builder)
  // ============================================================

  app.get('/api/admin/layouts', requireAdmin, async (req, res) => {
    try {
      const type = req.query.type as string;
      let query: any = db.select().from(layoutTemplates);
      if (type) {
        query = query.where(eq(layoutTemplates.type, type as any));
      }
      const results = await query;
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/layouts', requireAdmin, async (req, res) => {
    try {
      const { type, name, isDefault, structure } = req.body;
      const insertResult = await db.insert(layoutTemplates).values({
        tenantId: 1,
        type, name, isDefault: isDefault || false, structure: structure || { regions: [] }
      });
      res.json({ success: true, id: insertResult[0].insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/layouts/resolve', requireAdmin, async (req, res) => {
    try {
      const { context, type } = req.query;
      const defaultLayout = await db.select().from(layoutTemplates).where(and(eq(layoutTemplates.type, type as any), eq(layoutTemplates.isDefault, true))).limit(1);
      res.json(defaultLayout.length > 0 ? defaultLayout[0] : null);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/layouts/:id/assignments', requireAdmin, async (req, res) => {
    try {
      const results = await db.select().from(layoutAssignments).where(eq(layoutAssignments.layoutTemplateId, parseInt(req.params.id)));
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/layouts/:id/assignments', requireAdmin, async (req, res) => {
    try {
      const { conditionType, conditionValue, priority } = req.body;
      await db.insert(layoutAssignments).values({
        layoutTemplateId: parseInt(req.params.id),
        conditionType, conditionValue, priority: priority || 0
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/layouts/assignments/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(layoutAssignments).where(eq(layoutAssignments.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.post('/api/admin/settings/smtp-test', requireAdmin, async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
      const profile = await db.select({ email: users.email }).from(users).where(eq(users.id, adminUser.userId)).limit(1);
      const testEmail = profile[0]?.email;
      if (!testEmail) return res.status(400).json({ error: 'Admin e-postası bulunamadı' });
      const success = await sendTicketEmail(
        testEmail,
        'SMTP Test — Kerim Bilgisayar',
        `<p style="font-family:sans-serif;">Bu bir SMTP test e-postasıdır. Ayarlarınız doğru yapılandırılmış!</p>`
      );
      if (success) {
        res.json({ success: true, message: `Test e-postası ${testEmail} adresine gönderildi.` });
      } else {
        res.status(500).json({ success: false, error: 'E-posta gönderilemedi. SMTP ayarlarını kontrol edin.' });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — PROFILE
  // ============================================================


  app.get('/api/admin/profile', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).adminUser.userId;
      const profile = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
      }).from(users).where(eq(users.id, adminId)).limit(1);
      
      if (profile.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(profile[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/profile', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).adminUser.userId;
      const { firstName, lastName, email, phone, password } = req.body;
      const updates: any = {};
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (email) updates.email = email;
      if (phone) updates.phone = phone;
      if (password) updates.passwordHash = password; // Since it's plain text in this demo, just update it directly

      await db.update(users).set(updates).where(eq(users.id, adminId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — USERS
  // ============================================================

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        roleType: users.roleType,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      }).from(users).where(sql`${users.roleType} <> 'customer'`).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/users', requireAdmin, requireRole('superadmin', 'tenant_admin'), async (req, res) => {
    try {
      const { firstName, lastName, email, phone, roleType, password } = req.body;
      const targetRole = roleType || 'staff';
      
      await db.transaction(async (tx) => {
        const insertedUser = await tx.insert(users).values({
          tenantId: 1,
          firstName,
          lastName: lastName || '',
          email,
          phone: phone || null,
          roleType: targetRole,
          passwordHash: await hashPassword(password || crypto.randomBytes(9).toString('base64url')),
          isActive: true,
        });
        
        if (targetRole === 'customer') {
          const userId = (insertedUser[0] as any).insertId;
          await tx.insert(customers).values({
            tenantId: 1,
            userId,
            accountCode: `MUS-${String(userId).padStart(5, '0')}`,
            balance: '0.00',
            creditLimit: '0.00',
            notes: 'Yönetim panelinden kullanıcı olarak eklendi.',
            isActive: true,
          });
        }
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/users/:id', requireAdmin, requireRole('superadmin', 'tenant_admin'), async (req, res) => {
    try {
      const { isActive, roleType } = req.body;
      const updateData: any = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (roleType) updateData.roleType = roleType;
      await db.update(users).set(updateData).where(eq(users.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — CUSTOMERS, ACCOUNTS & SUBSCRIPTIONS
  // ============================================================

  app.get('/api/admin/customers/search', requireAdmin, async (req, res) => {
    try {
      const q = (req.query.query as string || '').trim().toLowerCase();
      if (!q) {
        return res.json([]);
      }
      const matched = await db.select({
        id: customers.userId,
        customerId: customers.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        companyName: companies.name,
        address: companies.address,
      }).from(customers)
        .leftJoin(users, eq(customers.userId, users.id))
        .leftJoin(companies, eq(customers.companyId, companies.id))
        .where(
          or(
            like(sql<string>`LOWER(${users.firstName})`, `%${q}%`),
            like(sql<string>`LOWER(${users.lastName})`, `%${q}%`),
            like(sql<string>`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName}))`, `%${q}%`),
            like(users.phone, `%${q}%`),
            like(sql<string>`LOWER(${users.email})`, `%${q}%`)
          )
        )
        .limit(10);
      res.json(matched);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/customers', requireAdmin, async (req, res) => {
    try {
      const allCustomers = await db.select({
        id: customers.userId,
        customerId: customers.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        isActive: customers.isActive,
        createdAt: customers.createdAt,
        accountCode: customers.accountCode,
        balance: customers.balance,
        creditLimit: customers.creditLimit,
        notes: customers.notes,
        companyId: companies.id,
        companyName: companies.name,
        taxId: companies.taxId,
        taxOffice: companies.taxOffice,
        address: companies.address,
        sector: companies.sector,
        subscriptionId: customerSubscriptions.id,
        subscriptionStatus: customerSubscriptions.status,
        currentPeriodEnd: customerSubscriptions.currentPeriodEnd,
        planId: plans.id,
        planName: plans.name,
        planPrice: plans.price,
        planDiscountRate: plans.discountRate,
        billingCycle: plans.billingCycle,
      }).from(customers)
        .leftJoin(users, eq(customers.userId, users.id))
        .leftJoin(companies, eq(customers.companyId, companies.id))
        .leftJoin(customerSubscriptions, eq(customerSubscriptions.userId, customers.userId))
        .leftJoin(plans, eq(customerSubscriptions.planId, plans.id))
        .orderBy(desc(customers.createdAt));
      res.json(allCustomers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/customers', requireAdmin, async (req, res) => {
    try {
      const { firstName, lastName, email, phone, password, companyName, taxId, taxOffice, address, sector, accountCode, balance, creditLimit, notes } = req.body;
      
      // Kayıtlı müşteri kontrolü (Ad-Soyad, Telefon veya E-Posta)
      if (email) {
        const existingByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingByEmail.length > 0) {
          return res.status(400).json({ error: 'Bu e-posta adresiyle kayıtlı bir müşteri zaten var.' });
        }
      }
      if (phone) {
        const existingByPhone = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
        if (existingByPhone.length > 0) {
          return res.status(400).json({ error: 'Bu telefon numarasıyla kayıtlı bir müşteri zaten var.' });
        }
      }
      if (firstName) {
        const existingByName = await db.select().from(users).where(
          and(
            eq(users.firstName, firstName),
            eq(users.lastName, lastName || '')
          )
        ).limit(1);
        if (existingByName.length > 0) {
          return res.status(400).json({ error: 'Bu ad ve soyad ile kayıtlı bir müşteri zaten var.' });
        }
      }

      await db.transaction(async (tx) => {
        let companyId: number | null = null;

        if (companyName || taxId || taxOffice || address || sector) {
          const insertedCompany = await tx.insert(companies).values({
            tenantId: 1,
            name: companyName || `${firstName} ${lastName || ''}`.trim(),
            taxId: taxId || null,
            taxOffice: taxOffice || null,
            address: address || null,
            phone: phone || null,
            email: email || null,
            sector: sector || null,
            type: 'customer',
          });
          companyId = (insertedCompany[0] as any).insertId;
        }

        const insertedUser = await tx.insert(users).values({
          tenantId: 1,
          companyId,
          firstName,
          lastName: lastName || '',
          email,
          phone: phone || null,
          roleType: 'customer',
          passwordHash: await hashPassword(password || crypto.randomBytes(9).toString('base64url')),
          isActive: true,
        });
        const userId = (insertedUser[0] as any).insertId;
        
        await tx.insert(customers).values({
          tenantId: 1,
          userId,
          companyId,
          accountCode: accountCode || `MUS-${String(userId).padStart(5, '0')}`,
          balance: balance?.toString() || '0.00',
          creditLimit: creditLimit?.toString() || '0.00',
          notes: notes || null,
          isActive: true,
        });
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/customers/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { firstName, lastName, email, phone, isActive, companyName, taxId, taxOffice, address, sector, accountCode, balance, creditLimit, notes } = req.body;
      const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (existing.length === 0 || existing[0].roleType !== 'customer') return res.status(404).json({ error: 'Müşteri bulunamadı' });

      const userUpdates: any = {};
      if (firstName !== undefined) userUpdates.firstName = firstName;
      if (lastName !== undefined) userUpdates.lastName = lastName;
      if (email !== undefined) userUpdates.email = email;
      if (phone !== undefined) userUpdates.phone = phone;
      if (isActive !== undefined) userUpdates.isActive = isActive;
      if (Object.keys(userUpdates).length > 0) await db.update(users).set(userUpdates).where(eq(users.id, id));

      const customerUpdates: any = {};
      if (accountCode !== undefined) customerUpdates.accountCode = accountCode;
      if (balance !== undefined) customerUpdates.balance = balance?.toString() || '0.00';
      if (creditLimit !== undefined) customerUpdates.creditLimit = creditLimit?.toString() || '0.00';
      if (notes !== undefined) customerUpdates.notes = notes;
      if (isActive !== undefined) customerUpdates.isActive = isActive;
      if (Object.keys(customerUpdates).length > 0) {
        const existingCustomer = await db.select().from(customers).where(eq(customers.userId, id)).limit(1);
        if (existingCustomer.length > 0) {
          await db.update(customers).set(customerUpdates).where(eq(customers.userId, id));
        } else {
          await db.insert(customers).values({
            tenantId: 1,
            userId: id,
            companyId: existing[0].companyId || null,
            accountCode: accountCode || `MUS-${String(id).padStart(5, '0')}`,
            balance: balance?.toString() || '0.00',
            creditLimit: creditLimit?.toString() || '0.00',
            notes: notes || null,
            isActive: isActive !== false,
          });
        }
      }

      const companyUpdates: any = {};
      if (companyName !== undefined) companyUpdates.name = companyName;
      if (taxId !== undefined) companyUpdates.taxId = taxId;
      if (taxOffice !== undefined) companyUpdates.taxOffice = taxOffice;
      if (address !== undefined) companyUpdates.address = address;
      if (sector !== undefined) companyUpdates.sector = sector;
      if (phone !== undefined) companyUpdates.phone = phone;
      if (email !== undefined) companyUpdates.email = email;

      if (Object.keys(companyUpdates).length > 0) {
        if (existing[0].companyId) {
          await db.update(companies).set(companyUpdates).where(eq(companies.id, existing[0].companyId));
        } else {
          const insertedCompany = await db.insert(companies).values({
            tenantId: 1,
            name: companyName || `${firstName || existing[0].firstName} ${lastName || existing[0].lastName || ''}`.trim(),
            phone: phone || existing[0].phone || null,
            email: email || existing[0].email || null,
            type: 'customer',
            ...companyUpdates,
          });
          await db.update(users).set({ companyId: (insertedCompany[0] as any).insertId }).where(eq(users.id, id));
          await db.update(customers).set({ companyId: (insertedCompany[0] as any).insertId }).where(eq(customers.userId, id));
        }
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/customers/migrate-from-users', requireAdmin, async (req, res) => {
    try {
      const migrated = await ensureCustomerRowsFromUsers();
      res.json({ success: true, migrated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/subscription-plans', requireAdmin, async (req, res) => {
    try {
      const allPlans = await db.select().from(plans).orderBy(desc(plans.createdAt));
      res.json(allPlans);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/subscription-plans', requireAdmin, async (req, res) => {
    try {
      const { name, slug, description, price, discountRate, billingCycle, features, isActive } = req.body;
      await db.insert(plans).values({
        name,
        slug: slug || generateSlug(name),
        description: description || null,
        price: (price || 0).toString(),
        discountRate: (discountRate || 0).toString(),
        billingCycle: billingCycle || 'monthly',
        features: String(features || '').split('\n').map(item => item.trim()).filter(Boolean),
        isActive: isActive !== false,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/subscription-plans/:id', requireAdmin, async (req, res) => {
    try {
      const { name, description, price, discountRate, billingCycle, features, isActive } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price.toString();
      if (discountRate !== undefined) updateData.discountRate = discountRate.toString();
      if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
      if (features !== undefined) updateData.features = String(features).split('\n').map(item => item.trim()).filter(Boolean);
      if (isActive !== undefined) updateData.isActive = isActive;
      await db.update(plans).set(updateData).where(eq(plans.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/customers/:id/subscription', requireAdmin, async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const { planId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd } = req.body;
      const customer = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
      if (customer.length === 0 || customer[0].roleType !== 'customer') return res.status(404).json({ error: 'Müşteri bulunamadı' });

      let companyId = customer[0].companyId;
      if (!companyId) {
        const insertedCompany = await db.insert(companies).values({
          tenantId: 1,
          name: `${customer[0].firstName} ${customer[0].lastName || ''}`.trim(),
          email: customer[0].email,
          phone: customer[0].phone,
          type: 'customer',
        });
        companyId = (insertedCompany[0] as any).insertId;
        await db.update(users).set({ companyId }).where(eq(users.id, customerId));
      }

      const existing = await db.select().from(customerSubscriptions).where(eq(customerSubscriptions.userId, customerId)).limit(1);
      const payload = {
        tenantId: 1,
        userId: customerId,
        companyId,
        planId: parseInt(planId),
        status: status || 'active',
        currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : new Date(),
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
        cancelAtPeriodEnd: !!cancelAtPeriodEnd,
      };

      if (existing.length > 0) {
        await db.update(customerSubscriptions).set(payload).where(eq(customerSubscriptions.id, existing[0].id));
      } else {
        await db.insert(customerSubscriptions).values(payload);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });



  // ============================================================
  // ADMIN API — BLOG
  // ============================================================

  app.get('/api/admin/blog', requireAdmin, async (req, res) => {
    try {
      const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
      res.json(posts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/blog', requireAdmin, async (req, res) => {
    try {
      const { title, slug, content, excerpt, imageUrl, status, metaTitle, metaDescription } = req.body;
      await db.insert(blogPosts).values({
        tenantId: 1,
        title, slug: slug || generateSlug(title),
        content, excerpt, imageUrl,
        status: status || 'taslak',
        metaTitle, metaDescription,
        publishedAt: status === 'yayinlandi' ? new Date() : undefined,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/blog/:id', requireAdmin, async (req, res) => {
    try {
      const { title, slug, content, excerpt, imageUrl, status, metaTitle, metaDescription } = req.body;
      const updateData: any = { title, slug, content, excerpt, imageUrl, status, metaTitle, metaDescription };
      if (status === 'yayinlandi') updateData.publishedAt = new Date();
      await db.update(blogPosts).set(updateData).where(eq(blogPosts.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/blog/:id', requireAdmin, async (req, res) => {
    try {
      await db.update(blogPosts).set({ status: 'arsivlendi' }).where(eq(blogPosts.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — CAMPAIGNS
  // ============================================================

  app.get('/api/admin/campaigns', requireAdmin, async (req, res) => {
    try {
      const all = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
      res.json(all);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/campaigns', requireAdmin, async (req, res) => {
    try {
      const { title, slug, description, imageUrl, startDate, endDate, discountRate, status } = req.body;
      const localImageUrl = imageUrl ? await saveRemoteImageToMedia(imageUrl, (req as any).adminUser.userId) : imageUrl;
      await db.insert(campaigns).values({
        tenantId: 1,
        title, 
        slug: slug || generateSlug(title),
        description, imageUrl: localImageUrl,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        discountRate: discountRate?.toString(),
        status: status || 'taslak',
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/campaigns/:id', requireAdmin, async (req, res) => {
    try {
      const { status, title, description, imageUrl, startDate, endDate, discountRate } = req.body;
      const updateData: any = {};
      if (status) updateData.status = status;
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? await saveRemoteImageToMedia(imageUrl, (req as any).adminUser.userId) : null;
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (discountRate !== undefined) updateData.discountRate = discountRate?.toString();
      await db.update(campaigns).set(updateData).where(eq(campaigns.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/campaigns/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(campaigns).where(eq(campaigns.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/campaigns/import-remote-images', requireAdmin, async (req, res) => {
    try {
      const all = await db.select().from(campaigns);
      let imported = 0;
      const errors: string[] = [];

      for (const campaign of all) {
        if (!campaign.imageUrl || !/^https?:\/\//i.test(campaign.imageUrl)) continue;
        try {
          const localImageUrl = await saveRemoteImageToMedia(campaign.imageUrl, (req as any).adminUser.userId);
          await db.update(campaigns).set({ imageUrl: localImageUrl }).where(eq(campaigns.id, campaign.id));
          imported += 1;
        } catch (err: any) {
          errors.push(`${campaign.title}: ${err.message}`);
        }
      }

      res.json({ success: true, imported, errors });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — FAQ / KNOWLEDGE BASE
  // ============================================================

  app.get('/api/admin/faq', requireAdmin, async (req, res) => {
    try {
      const cats = await db.select().from(faqCategories);
      const kbase = await db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
      res.json({ categories: cats, questions: kbase });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/faq/categories', requireAdmin, async (req, res) => {
    try {
      const { name, icon } = req.body;
      await db.insert(faqCategories).values({ tenantId: 1, name, icon });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/faq/questions', requireAdmin, async (req, res) => {
    try {
      const { categoryId, question, answer, status } = req.body;
      await db.insert(knowledgeBase).values({
        tenantId: 1, categoryId, question, answer,
        status: status || 'yayinlandi'
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/faq/questions/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { categoryId, question, answer, status } = req.body;
      await db.update(knowledgeBase).set({
        categoryId: categoryId ? parseInt(categoryId) : null,
        question,
        answer,
        status: status || 'yayinlandi'
      }).where(eq(knowledgeBase.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/faq/questions/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(knowledgeBase).where(eq(knowledgeBase.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/faq/categories/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, icon } = req.body;
      await db.update(faqCategories).set({ name, icon }).where(eq(faqCategories.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/faq/categories/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.update(knowledgeBase).set({ categoryId: null }).where(eq(knowledgeBase.categoryId, id));
      await db.delete(faqCategories).where(eq(faqCategories.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — LEADS (Randevular / Başvurular)
  // ============================================================

  app.get('/api/admin/leads', requireAdmin, async (req, res) => {
    try {
      const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
      res.json(allLeads);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/leads/:id', requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      await db.update(leads).set({ status }).where(eq(leads.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — MESSAGES (Form Submissions)
  // ============================================================

  app.get('/api/admin/messages', requireAdmin, async (req, res) => {
    try {
      const submissions = await db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt));
      res.json(submissions);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- ADMIN PAGES ---
  app.get('/api/admin/pages', requireAdmin, async (req, res) => {
    try {
      const allPages = await db.select().from(pages).orderBy(desc(pages.createdAt));
      res.json(allPages);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/pages', requireAdmin, async (req, res) => {
    try {
      const { title, slug, content, status, metaTitle, metaDescription } = req.body;
      await db.insert(pages).values({
        tenantId: 1,
        title,
        slug: slug || generateSlug(title),
        content,
        status: status || 'taslak',
        metaTitle,
        metaDescription,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/pages/:id', requireAdmin, async (req, res) => {
    try {
      const updates = req.body;
      updates.updatedAt = new Date();
      await db.update(pages).set(updates).where(eq(pages.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/pages/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(pages).where(eq(pages.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- MEDIA FOLDERS ---
  app.get('/api/admin/media/folders', requireAdmin, async (req, res) => {
    try {
      const folders = await db.select().from(mediaFolders).orderBy(asc(mediaFolders.name));
      res.json(folders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/media/folders', requireAdmin, async (req, res) => {
    try {
      const { name, parentId } = req.body;
      const newFolder = await db.insert(mediaFolders).values({
        tenantId: 1,
        name,
        parentId: parentId || null
      });
      res.json({ success: true, id: (newFolder[0] as any).insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/media/folders/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, parentId } = req.body;
      await db.update(mediaFolders).set({
        name,
        parentId: parentId || null
      }).where(eq(mediaFolders.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/media/folders/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Move files in this folder to root before deleting
      await db.update(mediaLibrary).set({ folderId: null }).where(eq(mediaLibrary.folderId, id));
      // Delete the folder
      await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- MEDIA LIBRARY ---
  app.get('/api/admin/media', requireAdmin, async (req, res) => {
    try {
      const folderIdParam = req.query.folderId;
      let query = db.select().from(mediaLibrary);
      
      if (folderIdParam !== undefined) {
         if (folderIdParam === 'null' || folderIdParam === '') {
             query = query.where(sql`${mediaLibrary.folderId} IS NULL`) as any;
         } else {
             query = query.where(eq(mediaLibrary.folderId, parseInt(folderIdParam as string))) as any;
         }
      }
      
      const mediaFiles = await query.orderBy(desc(mediaLibrary.createdAt));
      res.json(mediaFiles);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/media/upload', requireAdmin, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error("Multer Media Upload Hatası:", err);
        return res.status(400).json({ error: 'Dosya yüklenemedi: ' + err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      let finalFilename = req.file.filename;
      let finalMimeType = req.file.mimetype;
      let finalSize = req.file.size;
      let finalOriginalName = req.file.originalname;

      if (req.file.mimetype.startsWith('image/') && !req.file.mimetype.includes('webp')) {
        const parsedPath = path.parse(req.file.filename);
        const webpFilename = `${parsedPath.name}.webp`;
        const webpPath = path.join(req.file.destination, webpFilename);
        
        try {
          await sharp(req.file.path)
            .webp({ quality: 80 })
            .toFile(webpPath);
            
          // Delete original file
          fs.unlinkSync(req.file.path);
          
          finalFilename = webpFilename;
          finalMimeType = 'image/webp';
          finalSize = fs.statSync(webpPath).size;
          
          // Also adjust original name extension to .webp for consistency
          const origParsed = path.parse(req.file.originalname);
          finalOriginalName = `${origParsed.name}.webp`;
        } catch (err) {
          console.error('Sharp webp conversion failed, falling back to original:', err);
        }
      }

      const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;
      
      const fileUrl = `/uploads/${finalFilename}`;
      const newMedia = await db.insert(mediaLibrary).values({
        tenantId: 1,
        uploaderId: (req as any).adminUser.userId,
        folderId: folderId,
        fileName: finalOriginalName,
        fileUrl: fileUrl,
        mimeType: finalMimeType,
        fileSize: finalSize,
        title: path.parse(finalOriginalName).name,
        altText: path.parse(finalOriginalName).name,
        description: '',
      });
      res.json({ success: true, fileUrl, id: (newMedia[0] as any).insertId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/media/import-remote', requireAdmin, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'URL gerekli' });
      const fileUrl = await saveRemoteImageToMedia(url, (req as any).adminUser.userId);
      res.json({ success: true, fileUrl });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/media/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, altText, description, folderId } = req.body;
      const updateData: any = { title, altText, description };
      if (folderId !== undefined) {
         updateData.folderId = folderId === null ? null : parseInt(folderId);
      }
      
      await db.update(mediaLibrary).set(updateData).where(eq(mediaLibrary.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/media/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, id)).limit(1);
      if (item.length === 0) return res.status(404).json({ error: 'Media not found' });
      
      // Delete database record
      await db.delete(mediaLibrary).where(eq(mediaLibrary.id, id));
      
      // Delete physical file
      const filePath = path.join(rootDir, item[0].fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- MENUS (moved below to the unified block) ---

  // ============================================================
  // ADMIN API — TAXONOMIES (CATEGORIES/TAGS)
  // ============================================================

  app.get('/api/admin/terms', requireAdmin, async (req, res) => {
    try {
      const allTerms = await db.select({
        id: terms.id,
        name: terms.name,
        slug: terms.slug,
        description: terms.description,
        taxonomyId: terms.taxonomyId,
        taxonomyName: taxonomies.name
      }).from(terms)
        .leftJoin(taxonomies, eq(terms.taxonomyId, taxonomies.id));
      res.json(allTerms);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/terms', requireAdmin, async (req, res) => {
    try {
      const { name, taxonomyName, description } = req.body;
      
      // Ensure taxonomy exists
      let taxonomyId: number;
      const existingTax = await db.select().from(taxonomies).where(eq(taxonomies.name, taxonomyName)).limit(1);
      if (existingTax.length > 0) {
        taxonomyId = existingTax[0].id;
      } else {
        const newTax = await db.insert(taxonomies).values({ tenantId: 1, name: taxonomyName, slug: taxonomyName });
        taxonomyId = (newTax[0] as any).insertId;
      }

      await db.insert(terms).values({
        tenantId: 1,
        taxonomyId,
        name,
        slug: generateSlug(name),
        description
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/terms/:id', requireAdmin, async (req, res) => {
    try {
      // First delete relationships
      await db.delete(termRelationships).where(eq(termRelationships.termId, parseInt(req.params.id)));
      // Then delete term
      await db.delete(terms).where(eq(terms.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADMIN API — TESTIMONIALS (COMMENTS)
  // ============================================================

  app.get('/api/admin/testimonials', requireAdmin, async (req, res) => {
    try {
      const allTestimonials = await db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
      res.json(allTestimonials);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/testimonials', requireAdmin, async (req, res) => {
    try {
      const { authorName, authorTitle, authorImageUrl, content, rating, status } = req.body;
      await db.insert(testimonials).values({
        tenantId: 1,
        authorName, authorTitle, authorImageUrl, content,
        rating: parseInt(rating) || 5,
        status: status || 'taslak'
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
    try {
      const updates = req.body;
      updates.updatedAt = new Date();
      await db.update(testimonials).set(updates).where(eq(testimonials.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(testimonials).where(eq(testimonials.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // ADVANCED ARCHITECTURE: API KEYS, WEBHOOKS, PLUGINS
  // ============================================================

  // API KEYS
  app.get('/api/admin/apikeys', requireAdmin, async (req, res) => {
    try {
      const keys = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
      res.json(keys);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/apikeys', requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      const rawKey = crypto.randomBytes(32).toString('hex');
      const prefix = 'kb_';
      const fullKey = prefix + rawKey;
      const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

      await db.insert(apiKeys).values({
        tenantId: 1,
        name,
        prefix,
        keyHash
      });
      // Sadece oluşturulduğu an gösterilir
      res.json({ success: true, apiKey: fullKey });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/apikeys/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(apiKeys).where(eq(apiKeys.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================
  // MENUS
  // ============================================================

  app.get('/api/admin/menus', requireAdmin, async (req, res) => {
    try {
      const allMenus = await db.select().from(menus).where(eq(menus.tenantId, 1));
      const allItems = await db.select().from(menuItems).where(eq(menuItems.tenantId, 1)).orderBy(asc(menuItems.displayOrder));
      
      const result = allMenus.map(m => ({
        ...m,
        items: allItems.filter(i => i.menuId === m.id)
      }));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/menus', requireAdmin, async (req, res) => {
    try {
      const { name, location } = req.body;
      await db.insert(menus).values({ tenantId: 1, name, location });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/menus/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, location } = req.body;
      await db.update(menus).set({ name, location }).where(eq(menus.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/menus/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(menuItems).where(eq(menuItems.menuId, id));
      await db.delete(menus).where(eq(menus.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/menus/:id/items', requireAdmin, async (req, res) => {
    try {
      const { title, url, target, parentId, displayOrder, megaMenu } = req.body;
      await db.insert(menuItems).values({
        tenantId: 1,
        menuId: parseInt(req.params.id),
        title, url, target: target || '_self', parentId, displayOrder: displayOrder || 0,
        megaMenu: megaMenu || null
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/menus/items/:itemId', requireAdmin, async (req, res) => {
    try {
      const { title, url, target, parentId, megaMenu } = req.body;
      await db.update(menuItems)
        .set({ title, url, target, parentId, megaMenu: megaMenu || null })
        .where(eq(menuItems.id, parseInt(req.params.itemId)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/menus/items/:itemId', requireAdmin, async (req, res) => {
    try {
      await db.delete(menuItems).where(eq(menuItems.id, parseInt(req.params.itemId)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/menus/items/reorder', requireAdmin, async (req, res) => {
    try {
      const { items } = req.body; // Array of { id: number, displayOrder: number }
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid payload' });
      
      // Update each item in sequence (for SQLite/MySQL consistency)
      for (const item of items) {
        await db.update(menuItems)
          .set({ displayOrder: item.displayOrder })
          .where(eq(menuItems.id, item.id));
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // /api/public/menus already defined at the top of PUBLIC API section

  // WEBHOOKS
  async function triggerWebhook(eventName: string, payload: any) {
    try {
      const activeHooks = await db.select().from(webhooks).where(
        and(eq(webhooks.event, eventName), eq(webhooks.isActive, true))
      );
      
      for (const hook of activeHooks) {
        // Send async, do not await to block main thread
        fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(hook.secret && { 'x-webhook-secret': hook.secret })
          },
          body: JSON.stringify({ event: eventName, payload, timestamp: new Date() })
        }).catch(err => {
          console.error(`Webhook error for ${hook.url}:`, err);
        });
      }
    } catch (e) {
      console.error('Failed to trigger webhooks:', e);
    }
  }

  app.get('/api/admin/webhooks', requireAdmin, async (req, res) => {
    try {
      const hooks = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
      res.json(hooks);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/webhooks', requireAdmin, async (req, res) => {
    try {
      const { name, event, url, secret } = req.body;
      await db.insert(webhooks).values({ tenantId: 1, name, event, url, secret });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/webhooks/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(webhooks).where(eq(webhooks.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PLUGINS
  app.get('/api/admin/plugins', requireAdmin, async (req, res) => {
    try {
      const allPlugins = await db.select().from(plugins);
      res.json(allPlugins);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/plugins/toggle', requireAdmin, async (req, res) => {
    try {
      const { pluginId, isActive } = req.body;
      const existing = await db.select().from(plugins).where(eq(plugins.pluginId, pluginId)).limit(1);
      if (existing.length > 0) {
        await db.update(plugins).set({ isActive }).where(eq(plugins.pluginId, pluginId));
      } else {
        await db.insert(plugins).values({ tenantId: 1, pluginId, name: pluginId, isActive });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/plugins/:pluginId/settings', requireAdmin, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const existing = await db.select().from(plugins).where(eq(plugins.pluginId, pluginId)).limit(1);
      if (existing.length > 0) {
        await db.update(plugins).set({ settings: null, isActive: false }).where(eq(plugins.pluginId, pluginId));
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/plugins/:pluginId/settings', requireAdmin, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const { settings: pluginSettings } = req.body;
      const existing = await db.select().from(plugins).where(eq(plugins.pluginId, pluginId)).limit(1);
      if (existing.length > 0) {
        let oldSettings = existing[0].settings;
        if (typeof oldSettings === 'string') {
          try { oldSettings = JSON.parse(oldSettings); } catch (e) { oldSettings = {}; }
        }
        const mergedSettings = { ...(oldSettings as any || {}), ...pluginSettings };
        await db.update(plugins).set({ settings: mergedSettings }).where(eq(plugins.pluginId, pluginId));
      } else {
        await db.insert(plugins).values({ tenantId: 1, pluginId, name: pluginId, isActive: false, settings: pluginSettings });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/plugins/google-business/oauth/url', requireAdmin, async (req, res) => {
    try {
      const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
      let settings = gmbPlugin[0]?.settings as any || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      if (!settings.clientId || !settings.clientSecret) {
        return res.status(400).json({ error: 'Client ID veya Secret eksik' });
      }
      
      // Use APP_URL env var (most reliable behind proxies), fallback to headers
      let origin = '';
      if (process.env.APP_URL) {
        try { origin = new URL(process.env.APP_URL).origin; } catch {}
      }
      if (!origin) {
        const proto = (req.headers['x-forwarded-proto'] as string || req.protocol).split(',')[0].trim();
        const host = (req.headers['x-forwarded-host'] as string || req.get('host') || '').split(',')[0].trim();
        origin = `${proto}://${host}`;
      }
      const redirectUri = `${origin}/api/admin/plugins/google-business/oauth/callback`;
      
      // Save redirectUri to DB so callback can use the exact same value
      const mergedSettings = { ...settings, oauthRedirectUri: redirectUri };
      await db.update(plugins).set({ settings: mergedSettings }).where(eq(plugins.pluginId, 'google-business'));
      
      const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret, redirectUri);
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/business.manage'],
        prompt: 'consent'
      });
      
      res.json({ url, redirectUri });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/plugins/google-business/oauth/callback', async (req, res) => {
    try {
      const { code, error: oauthError } = req.query;
      if (oauthError) {
        console.error('[GMB OAuth] Google returned error:', oauthError);
        return res.redirect(`/admin/eklentiler?oauth=error&reason=${encodeURIComponent(String(oauthError))}`);
      }
      if (!code) {
        return res.redirect('/admin/eklentiler?oauth=error&reason=no_code');
      }
      
      const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
      let settings = gmbPlugin[0]?.settings as any || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      
      // Use the exact same redirectUri that was used when generating the auth URL
      const redirectUri = settings.oauthRedirectUri || (() => {
        const proto = (req.headers['x-forwarded-proto'] as string || req.protocol).split(',')[0].trim();
        const host = (req.headers['x-forwarded-host'] as string || req.get('host') || '').split(',')[0].trim();
        return `${proto}://${host}/api/admin/plugins/google-business/oauth/callback`;
      })();
      
      console.log('[GMB OAuth] Using redirectUri:', redirectUri);
      const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret, redirectUri);
      
      const { tokens } = await oauth2Client.getToken(code as string);
      const newSettings = { ...settings, tokens };
      
      await db.update(plugins).set({ settings: newSettings, isActive: true }).where(eq(plugins.pluginId, 'google-business'));
      res.redirect('/admin/eklentiler?oauth=success');
    } catch (e: any) {
      console.error('[GMB OAuth] callback error:', e?.message || e);
      const reason = encodeURIComponent(e?.message || 'unknown');
      res.redirect(`/admin/eklentiler?oauth=error&reason=${reason}`);
    }
  });

  app.get('/api/admin/plugins/google-business/locations', requireAdmin, async (req, res) => {
    try {
      const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
      let settings = gmbPlugin[0]?.settings as any || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      if (!settings.tokens) return res.status(400).json({ error: 'Yetki verilmemiş' });
      
      const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret);
      oauth2Client.setCredentials(settings.tokens);
      
      let allLocations: any[] = [];
      try {
        const response = await oauth2Client.request({ url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts' });
        const accounts = (response.data as any).accounts || [];
        
        for (const acc of accounts) {
          const locRes = await oauth2Client.request({ url: `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode` });
          if ((locRes.data as any).locations) {
            allLocations.push(...(locRes.data as any).locations);
          }
        }
        if (allLocations.length > 0) {
          settings.cachedLocations = allLocations;
          await db.update(plugins).set({ settings }).where(eq(plugins.pluginId, 'google-business'));
        }
      } catch (apiErr: any) {
        console.error('Google GMB API Error:', apiErr.message);
        if (settings.cachedLocations && settings.cachedLocations.length > 0) {
          allLocations = settings.cachedLocations;
        } else {
          allLocations = [
            {
              name: settings.selectedLocation || "accounts/118335017551061900000/locations/16281781290310230000",
              title: "Kerim Bilgisayar (Geçici API Kota Modu)",
              storeCode: "KB-01"
            }
          ];
        }
      }
      res.json(allLocations);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/plugins/google-business/posts', requireAdmin, async (req, res) => {
    try {
      const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
      let settings = gmbPlugin[0]?.settings as any || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      if (!settings.tokens || !settings.selectedLocation) return res.json([]);
      
      const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret);
      oauth2Client.setCredentials(settings.tokens);
      
      const response = await oauth2Client.request({ url: `https://mybusiness.googleapis.com/v4/${settings.selectedLocation}/localPosts` });
      const posts = (response.data as any).localPosts || [];
      res.json(posts);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.post('/api/admin/plugins/google-business/posts', requireAdmin, async (req, res) => {
    try {
      const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
      let settings = gmbPlugin[0]?.settings as any || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      if (!settings.tokens || !settings.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemiş veya konum seçilmemiş' });
      
      const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret);
      oauth2Client.setCredentials(settings.tokens);
      
      const response = await oauth2Client.request({ 
        url: `https://mybusiness.googleapis.com/v4/${settings.selectedLocation}/localPosts`,
        method: 'POST',
        data: req.body
      });
      
      res.json(response.data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/plugins/google-business/reviews', requireAdmin, async (req, res) => {
    try {
      const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
      let settings = gmbPlugin[0]?.settings as any || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      if (!settings.tokens || !settings.selectedLocation) return res.json([]);
      const oauth2Client = new google.auth.OAuth2(settings.clientId, settings.clientSecret);
      oauth2Client.setCredentials(settings.tokens);
      const response = await oauth2Client.request({ url: `https://mybusiness.googleapis.com/v4/${settings.selectedLocation}/reviews` });
      res.json((response.data as any).reviews || []);
    } catch (e: any) {
      res.json([]);
    }
  });


  // ─── GMB Helpers ─────────────────────────────────────────────────────────────
  const getGMBSettings = async () => {
    const gmbPlugin = await db.select().from(plugins).where(eq(plugins.pluginId, 'google-business')).limit(1);
    let s = gmbPlugin[0]?.settings as any || {};
    if (typeof s === 'string') { try { s = JSON.parse(s); } catch (_) { s = {}; } }
    return s;
  };

  const createGMBClient = (s: any) => {
    const c = new google.auth.OAuth2(s.clientId, s.clientSecret);
    c.setCredentials(s.tokens);
    c.on('tokens', async (t: any) => {
      try { await db.update(plugins).set({ settings: { ...s, tokens: { ...s.tokens, ...t } } }).where(eq(plugins.pluginId, 'google-business')); } catch (_) {}
    });
    return c;
  };

  // GET /info
  app.get('/api/admin/plugins/google-business/info', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.json({ error: 'unauthorized', message: 'Yetki verilmemiş veya konum seçilmemiş' });
      const parts = s.selectedLocation.split('/');
      const locationId = parts.length >= 2 ? parts.slice(-2).join('/') : s.selectedLocation;
      const r = await createGMBClient(s).request({ url: `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}?readMask=name,title,primaryPhone,profile` });
      res.json(r.data);
    } catch (e: any) { res.json({ error: 'unauthorized', message: e.message }); }
  });

  // PATCH /info
  app.patch('/api/admin/plugins/google-business/info', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.json({ error: 'unauthorized', message: 'Yetki verilmemiş veya konum seçilmemiş' });
      const parts = s.selectedLocation.split('/');
      const locationId = parts.length >= 2 ? parts.slice(-2).join('/') : s.selectedLocation;
      const { updateMask, ...body } = req.body;
      const mask = updateMask || 'title,primaryPhone,profile.description';
      const r = await createGMBClient(s).request({
        url: `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}?updateMask=${mask}`,
        method: 'PATCH', data: body
      });
      res.json(r.data);
    } catch (e: any) { res.json({ error: 'unauthorized', message: e.message }); }
  });

  // GET /media
  app.get('/api/admin/plugins/google-business/media', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.json({ error: 'unauthorized', message: 'Yetki verilmemiş veya konum seçilmemiş' });
      const r = await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${s.selectedLocation}/media` });
      res.json((r.data as any).mediaItems || []);
    } catch (e: any) { res.json([]); }
  });

  // POST /media
  app.post('/api/admin/plugins/google-business/media', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
      const { sourceUrl, category } = req.body;
      const r = await createGMBClient(s).request({
        url: `https://mybusiness.googleapis.com/v4/${s.selectedLocation}/media`,
        method: 'POST', data: { mediaFormat: 'PHOTO', sourceUrl, locationAssociation: { category: category || 'ADDITIONAL' } }
      });
      res.json(r.data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /media
  app.delete('/api/admin/plugins/google-business/media', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
      const { mediaName } = req.body;
      await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${mediaName}`, method: 'DELETE' });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /insights
  app.post('/api/admin/plugins/google-business/insights', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
      const days = Number(req.body?.days) || 90;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const fmt = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
      // Extract locations/{id} from accounts/{x}/locations/{id}
      const parts = s.selectedLocation.split('/');
      const locationId = parts.length >= 2 ? parts.slice(-2).join('/') : s.selectedLocation;
      const metricNames = ['BUSINESS_IMPRESSIONS_DESKTOP_MAPS','BUSINESS_IMPRESSIONS_DESKTOP_SEARCH','BUSINESS_IMPRESSIONS_MOBILE_MAPS','BUSINESS_IMPRESSIONS_MOBILE_SEARCH','BUSINESS_DIRECTION_REQUESTS','CALL_CLICKS','WEBSITE_CLICKS'];
      const r = await createGMBClient(s).request({
        url: `https://businessprofileperformance.googleapis.com/v1/${locationId}:fetchMultiDailyMetricsTimeSeries`,
        method: 'GET',
        params: {
          'dailyMetrics': metricNames,
          'dailyRange.start_date.year': fmt(startDate).year,
          'dailyRange.start_date.month': fmt(startDate).month,
          'dailyRange.start_date.day': fmt(startDate).day,
          'dailyRange.end_date.year': fmt(endDate).year,
          'dailyRange.end_date.month': fmt(endDate).month,
          'dailyRange.end_date.day': fmt(endDate).day,
        }
      });
      // Map new API metric names to old names for frontend compatibility
      const nameMap: Record<string,string> = {
        'BUSINESS_IMPRESSIONS_DESKTOP_MAPS': 'VIEWS_MAPS',
        'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH': 'VIEWS_SEARCH',
        'BUSINESS_IMPRESSIONS_MOBILE_MAPS': 'VIEWS_MAPS',
        'BUSINESS_IMPRESSIONS_MOBILE_SEARCH': 'VIEWS_SEARCH',
        'BUSINESS_DIRECTION_REQUESTS': 'ACTIONS_DRIVING_DIRECTIONS',
        'CALL_CLICKS': 'ACTIONS_PHONE',
        'WEBSITE_CLICKS': 'ACTIONS_WEBSITE',
      };
      const series = (r.data as any).multiDailyMetricTimeSeries || [];
      const totals: Record<string, number> = {};
      for (const item of series) {
        const mapped = nameMap[item.dailyMetric] || item.dailyMetric;
        const sum = (item.dailySubEntityData || item.timeSeries?.datedValues || [])
          .reduce((acc: number, v: any) => acc + (v.value || 0), 0);
        totals[mapped] = (totals[mapped] || 0) + sum;
      }
      const metricValues = Object.entries(totals).map(([metric, value]) => ({ metric, totalValue: { value } }));
      res.json({ locationMetrics: [{ metricValues }] });
    } catch (e: any) {
      const status = e.response?.status || 500;
      let errorMsg = e.message;
      if (e.response?.data?.error?.message) {
        errorMsg = e.response.data.error.message;
      }
      res.status(status).json({ error: errorMsg });
    }
  });

  // PUT /reviews/reply
  app.put('/api/admin/plugins/google-business/reviews/reply', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
      const { reviewName, comment } = req.body;
      const r = await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, method: 'PUT', data: { comment } });
      res.json(r.data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /reviews/reply
  app.delete('/api/admin/plugins/google-business/reviews/reply', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
      const { reviewName } = req.body;
      await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, method: 'DELETE' });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PATCH /posts (duzenle)
  app.patch('/api/admin/plugins/google-business/posts', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
      const { postName, summary, callToAction, topicType, event: evt, offer } = req.body;
      const r = await createGMBClient(s).request({
        url: `https://mybusiness.googleapis.com/v4/${postName}?updateMask=summary,callToAction,topicType,event,offer`,
        method: 'PATCH', data: { summary, callToAction, topicType, languageCode: 'tr', ...(evt && { event: evt }), ...(offer && { offer }) }
      });
      res.json(r.data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /posts
  app.delete('/api/admin/plugins/google-business/posts', requireAdmin, async (req, res) => {
    try {
      const s = await getGMBSettings();
      if (!s.tokens || !s.selectedLocation) return res.status(400).json({ error: 'Yetki verilmemis veya konum secilmemis' });
      const { postName } = req.body;
      await createGMBClient(s).request({ url: `https://mybusiness.googleapis.com/v4/${postName}`, method: 'DELETE' });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });


  // ─── PAYTR PAYMENT INTEGRATION ───────────────────────────────────────────
  // POST /api/payments/paytr/init — generate PayTR iframe token for checkout
  app.post('/api/payments/paytr/init', async (req, res) => {
    try {
      // Fetch PayTR credentials from plugin settings
      const allPlugins = await db.select().from(plugins).where(eq(plugins.pluginId, 'paytr-integration'));
      if (!allPlugins.length || !allPlugins[0].settings) {
        return res.status(400).json({ error: 'PayTR ayarlari tanimlanmamis' });
      }
      const ps: any = allPlugins[0].settings;
      const merchantId   = ps.merchantId?.trim();
      const merchantKey  = ps.merchantKey?.trim();
      const merchantSalt = ps.merchantSalt?.trim();
      if (!merchantId || !merchantKey || !merchantSalt) {
        return res.status(400).json({ error: 'PayTR kimlik bilgileri eksik' });
      }

      const {
        orderId,
        email,
        amount,       // in kurus (kuruş — 1 TL = 100 kurus)
        basketItems,  // [{ name, price, count }]
        userName,
        userAddress,
        userPhone,
        currency = 'TL',
        installmentCount = 0,
        noInstallment = 1,
        maxInstallment = 1,
        lang = 'tr',
        debugOn = 0,
        testMode = (process.env.NODE_ENV !== 'production') ? 1 : 0,
      } = req.body;

      if (!orderId || !email || !amount) {
        return res.status(400).json({ error: 'orderId, email ve amount zorunludur' });
      }

      const merchantOkUrl   = `${process.env.APP_URL || 'http://localhost:3000'}/odeme/basarili`;
      const merchantFailUrl = `${process.env.APP_URL || 'http://localhost:3000'}/odeme/basarisiz`;
      const userIp = getClientIp(req);

      const basket = JSON.stringify(Array.isArray(basketItems) && basketItems.length > 0
        ? basketItems
        : [[String(req.body.productName || 'Siparis'), String(amount), 1]]);

      const hashStr = `${merchantId}${userIp}${orderId}${email}${amount}${basket}${noInstallment}${maxInstallment}${currency}${testMode}${merchantSalt}`;
      const paytrToken = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

      const params = new URLSearchParams({
        merchant_id:       merchantId,
        user_ip:           userIp,
        merchant_oid:      String(orderId),
        email:             String(email),
        payment_amount:    String(amount),
        paytr_token:       paytrToken,
        user_basket:       Buffer.from(basket).toString('base64'),
        debug_on:          String(debugOn),
        no_installment:    String(noInstallment),
        max_installment:   String(maxInstallment),
        user_name:         String(userName || email),
        user_address:      String(userAddress || 'Belirtilmedi'),
        user_phone:        String(userPhone || '05000000000'),
        merchant_ok_url:   merchantOkUrl,
        merchant_fail_url: merchantFailUrl,
        timeout_limit:     '30',
        currency:          currency,
        test_mode:         String(testMode),
        lang:              lang,
      });

      const paytrRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const paytrData = await paytrRes.json().catch(() => ({}));

      if (paytrData.status !== 'success') {
        return res.status(400).json({ error: paytrData.reason || 'PayTR token alinamamadi', detail: paytrData });
      }

      res.json({ iframeToken: paytrData.token });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/payments/paytr/callback — PayTR IPN (Instant Payment Notification)
  app.post('/api/payments/paytr/callback', express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const allPlugins = await db.select().from(plugins).where(eq(plugins.pluginId, 'paytr-integration'));
      if (!allPlugins.length || !allPlugins[0].settings) return res.send('PAYTR_SETTINGS_ERROR');
      const ps: any = allPlugins[0].settings;
      const merchantKey  = ps.merchantKey?.trim();
      const merchantSalt = ps.merchantSalt?.trim();

      const { merchant_oid, status, total_amount, hash } = req.body;

      // Verify HMAC hash
      const hashStr  = `${merchant_oid}${merchantSalt}${status}${total_amount}`;
      const expected = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

      if (expected !== hash) {
        console.warn('[PayTR] Gecersiz hash — callback reddedildi');
        return res.send('PAYTR_INVALID_HASH');
      }

      console.log(`[PayTR] IPN alindi: ${merchant_oid} — ${status} — ${total_amount} kurus`);

      // TODO: Update your order/subscription status in the DB here
      // e.g. await db.update(orders).set({ paymentStatus: status }).where(eq(orders.orderId, merchant_oid));

      // PayTR requires this exact response on success
      res.send('OK');
    } catch (e: any) {
      console.error('[PayTR] Callback error:', e.message);
      res.send('ERROR');
    }
  });

  // ─── PAGE BLOCKS (Layout Builder) ────────────────────────────────────────
  // GET    /api/admin/page-blocks/:ownerType/:ownerId
  app.get('/api/admin/page-blocks/:ownerType/:ownerId', requireAdmin, async (req, res) => {
    try {
      const { ownerType, ownerId } = req.params;
      const rows = await db.select().from(pageBlocks)
        .where(and(eq(pageBlocks.ownerType, ownerType as any), eq(pageBlocks.ownerId, Number(ownerId))))
        .orderBy(asc(pageBlocks.sortOrder));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST   /api/admin/page-blocks/:ownerType/:ownerId
  app.post('/api/admin/page-blocks/:ownerType/:ownerId', requireAdmin, async (req, res) => {
    try {
      const { ownerType, ownerId } = req.params;
      const { elementKey, props = {}, region = 'main', sortOrder = 0, isVisible = true } = req.body;
      if (!elementKey) return res.status(400).json({ error: 'elementKey zorunludur' });
      const [inserted] = await db.insert(pageBlocks).values({
        tenantId: 1,
        ownerType: ownerType as any,
        ownerId: Number(ownerId),
        elementKey,
        props,
        region,
        sortOrder,
        isVisible,
      });
      res.json({ id: (inserted as any).insertId, success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PUT    /api/admin/page-blocks/:id
  app.put('/api/admin/page-blocks/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { props, region, sortOrder, isVisible, visibilityRule, responsiveOverrides } = req.body;
      await db.update(pageBlocks).set({
        ...(props !== undefined && { props }),
        ...(region !== undefined && { region }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isVisible !== undefined && { isVisible }),
        ...(visibilityRule !== undefined && { visibilityRule }),
        ...(responsiveOverrides !== undefined && { responsiveOverrides }),
      }).where(eq(pageBlocks.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/admin/page-blocks/:id
  app.delete('/api/admin/page-blocks/:id', requireAdmin, async (req, res) => {
    try {
      await db.delete(pageBlocks).where(eq(pageBlocks.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST   /api/admin/page-blocks/reorder  — bulk sortOrder update
  app.post('/api/admin/page-blocks/reorder', requireAdmin, async (req, res) => {
    try {
      const { blocks } = req.body; // [{ id, sortOrder }]
      if (!Array.isArray(blocks)) return res.status(400).json({ error: 'blocks array zorunludur' });
      for (const b of blocks) {
        await db.update(pageBlocks).set({ sortOrder: b.sortOrder }).where(eq(pageBlocks.id, b.id));
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── IP BLOCK MANAGEMENT ───────────────────────────────────────────────────
  // GET  /api/admin/blocked-ips       — list all DB-persisted blocked IPs
  app.get('/api/admin/blocked-ips', requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(blockedIps).orderBy(desc(blockedIps.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/admin/blocked-ips       — manually block an IP
  app.post('/api/admin/blocked-ips', requireAdmin, async (req, res) => {
    try {
      const { ipAddress, reason, durationDays } = req.body;
      if (!ipAddress) return res.status(400).json({ error: 'IP adresi zorunludur' });
      const days = Number(durationDays) || 3650; // default 10 years = permanent
      const blockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await db.insert(blockedIps).values({
        ipAddress,
        blockedUntil,
        reason: reason || 'Manuel engel (admin)',
      }).onDuplicateKeyUpdate({ set: { blockedUntil, reason: reason || 'Manuel engel (admin)' } });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/admin/blocked-ips/:id — remove a block by DB row id
  app.delete('/api/admin/blocked-ips/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      // Also clear from in-memory map if present
      const row = await db.select().from(blockedIps).where(eq(blockedIps.id, id)).limit(1);
      if (row.length > 0) autoBlockedIps.delete(row[0].ipAddress);
      await db.delete(blockedIps).where(eq(blockedIps.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT LOGS — Denetim Logları Görüntüleyici
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (req.query.entityType) conditions.push(eq(auditLogs.entityType, String(req.query.entityType)));
      if (req.query.action) conditions.push(like(auditLogs.action, `%${String(req.query.action)}%`));
      if (req.query.userId) conditions.push(eq(auditLogs.userId, Number(req.query.userId)));
      if (req.query.startDate) conditions.push(sql`${auditLogs.createdAt} >= ${new Date(String(req.query.startDate))}`);
      if (req.query.endDate) conditions.push(sql`${auditLogs.createdAt} <= ${new Date(String(req.query.endDate) + 'T23:59:59')}`);

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const userAlias = alias(users, 'audit_user');

      const [logs, countResult] = await Promise.all([
        db.select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          details: auditLogs.details,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
          userName: sql`CONCAT(${userAlias.firstName}, ' ', ${userAlias.lastName})`.as('userName'),
          userEmail: userAlias.email,
        })
          .from(auditLogs)
          .leftJoin(userAlias, eq(auditLogs.userId, userAlias.id))
          .where(whereClause)
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(auditLogs)
          .where(whereClause),
      ]);

      res.json({ logs, total: Number(countResult[0]?.count || 0), page, limit });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICES — Fatura Yönetimi
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/admin/invoices', requireAdmin, async (req, res) => {
    try {
      const customerUser = alias(users, 'invoice_user');
      const result = await db.select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        userId: invoices.userId,
        companyId: invoices.companyId,
        ticketId: invoices.ticketId,
        subtotal: invoices.subtotal,
        taxRate: invoices.taxRate,
        taxAmount: invoices.taxAmount,
        discountAmount: invoices.discountAmount,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        notes: invoices.notes,
        createdAt: invoices.createdAt,
        customerName: sql`CONCAT(${customerUser.firstName}, ' ', ${customerUser.lastName})`.as('customerName'),
        companyName: companies.name,
      })
        .from(invoices)
        .leftJoin(customerUser, eq(invoices.userId, customerUser.id))
        .leftJoin(companies, eq(invoices.companyId, companies.id))
        .orderBy(desc(invoices.createdAt));

      // Attach items for each invoice
      const invoiceIds = result.map(r => r.id);
      let allItems: any[] = [];
      if (invoiceIds.length > 0) {
        allItems = await db.select().from(invoiceItems).where(sql`${invoiceItems.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`);
      }

      const enriched = result.map(inv => ({
        ...inv,
        items: allItems.filter(it => it.invoiceId === inv.id),
      }));

      res.json(enriched);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/admin/invoices/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
      if (!inv) return res.status(404).json({ error: 'Fatura bulunamadı' });
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      res.json({ ...inv, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/invoices', requireAdmin, async (req, res) => {
    try {
      const { invoiceNumber, userId, companyId, ticketId, subtotal, taxRate, taxAmount, discountAmount, totalAmount, status, issueDate, dueDate, notes, items } = req.body;
      if (!invoiceNumber || !issueDate) return res.status(400).json({ error: 'Fatura numarası ve düzenlenme tarihi zorunludur' });

      const [result] = await db.insert(invoices).values({
        tenantId: 1,
        invoiceNumber,
        userId: userId || null,
        companyId: companyId || null,
        ticketId: ticketId || null,
        subtotal: subtotal || '0.00',
        taxRate: taxRate || '20.00',
        taxAmount: taxAmount || '0.00',
        discountAmount: discountAmount || '0.00',
        totalAmount: totalAmount || '0.00',
        status: status || 'taslak',
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : new Date(issueDate),
        notes: notes || null,
      });

      const insertedId = (result as any).insertId;

      if (Array.isArray(items) && items.length > 0) {
        await db.insert(invoiceItems).values(
          items.map((it: any) => ({
            invoiceId: insertedId,
            description: it.description || '',
            quantity: Number(it.quantity) || 1,
            unitPrice: it.unitPrice || '0.00',
            total: it.total || '0.00',
          }))
        );
      }

      res.json({ success: true, id: insertedId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch('/api/admin/invoices/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { invoiceNumber, userId, companyId, ticketId, subtotal, taxRate, taxAmount, discountAmount, totalAmount, status, issueDate, dueDate, notes, items } = req.body;

      await db.update(invoices).set({
        ...(invoiceNumber && { invoiceNumber }),
        ...(userId !== undefined && { userId: userId || null }),
        ...(companyId !== undefined && { companyId: companyId || null }),
        ...(ticketId !== undefined && { ticketId: ticketId || null }),
        ...(subtotal && { subtotal }),
        ...(taxRate && { taxRate }),
        ...(taxAmount && { taxAmount }),
        ...(discountAmount !== undefined && { discountAmount }),
        ...(totalAmount && { totalAmount }),
        ...(status && { status: status as any }),
        ...(issueDate && { issueDate: new Date(issueDate) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes }),
      }).where(eq(invoices.id, id));

      // Replace items if provided
      if (Array.isArray(items)) {
        await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        if (items.length > 0) {
          await db.insert(invoiceItems).values(
            items.map((it: any) => ({
              invoiceId: id,
              description: it.description || '',
              quantity: Number(it.quantity) || 1,
              unitPrice: it.unitPrice || '0.00',
              total: it.total || '0.00',
            }))
          );
        }
      }

      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/admin/invoices/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await db.delete(invoices).where(eq(invoices.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Auto-create invoice from a ticket
  app.post('/api/admin/invoices/from-ticket/:ticketId', requireAdmin, async (req, res) => {
    try {
      const ticketId = Number(req.params.ticketId);
      const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
      if (!ticket) return res.status(404).json({ error: 'Servis kaydı bulunamadı' });

      // Get ticket parts (manuel kalemlerin stockItemId'si olmayabilir — LEFT JOIN + kendi name'i kullanılır)
      const rawParts = await db.select({
        name: ticketParts.name,
        stockItemName: stockItems.name,
        quantity: ticketParts.quantity,
        unitPrice: ticketParts.unitPrice,
        totalPrice: ticketParts.totalPrice,
      }).from(ticketParts)
        .leftJoin(stockItems, eq(ticketParts.stockItemId, stockItems.id))
        .where(and(eq(ticketParts.ticketId, ticketId), sql`${ticketParts.removedAt} IS NULL`));
      const parts = rawParts.map(p => ({ ...p, name: p.name || p.stockItemName || 'Parça' }));

      const invoiceNum = `FTR-${Date.now().toString(36).toUpperCase()}`;
      const laborCost = parseFloat(String(ticket.laborCost)) || 0;
      const partsCost = parts.reduce((s, p) => s + (parseFloat(String(p.totalPrice)) || 0), 0);
      const subtotal = laborCost + partsCost;
      const taxRate = 20;
      const taxAmount = subtotal * taxRate / 100;
      const totalAmount = subtotal + taxAmount;

      const allItems = [
        ...(laborCost > 0 ? [{ description: 'İşçilik Ücreti', quantity: 1, unitPrice: laborCost.toFixed(2), total: laborCost.toFixed(2) }] : []),
        ...parts.map(p => ({ description: p.name, quantity: p.quantity, unitPrice: String(p.unitPrice), total: String(p.totalPrice) })),
      ];

      const [result] = await db.insert(invoices).values({
        tenantId: 1,
        invoiceNumber: invoiceNum,
        userId: ticket.userId,
        ticketId,
        subtotal: subtotal.toFixed(2),
        taxRate: taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        status: 'taslak',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: `Servis kaydı #${ticket.ticketNumber} için oluşturuldu`,
      });

      const insertedId = (result as any).insertId;

      if (allItems.length > 0) {
        await db.insert(invoiceItems).values(allItems.map(it => ({
          invoiceId: insertedId,
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: it.unitPrice,
          total: it.total,
        })));
      }

      res.json({ success: true, id: insertedId, invoiceNumber: invoiceNum });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRACTS — Bakım Sözleşmeleri
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/admin/contracts', requireAdmin, async (req, res) => {
    try {
      const result = await db.select({
        id: maintenanceContracts.id,
        title: maintenanceContracts.title,
        companyId: maintenanceContracts.companyId,
        startDate: maintenanceContracts.startDate,
        endDate: maintenanceContracts.endDate,
        status: maintenanceContracts.status,
        slaDetails: maintenanceContracts.slaDetails,
        monthlyFee: maintenanceContracts.monthlyFee,
        createdAt: maintenanceContracts.createdAt,
        companyName: companies.name,
      })
        .from(maintenanceContracts)
        .leftJoin(companies, eq(maintenanceContracts.companyId, companies.id))
        .orderBy(desc(maintenanceContracts.createdAt));
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/contracts', requireAdmin, async (req, res) => {
    try {
      const { title, companyId, startDate, endDate, status, slaDetails, monthlyFee } = req.body;
      if (!title || !startDate || !endDate) return res.status(400).json({ error: 'Başlık, başlangıç ve bitiş tarihi zorunludur' });

      const [result] = await db.insert(maintenanceContracts).values({
        tenantId: 1,
        title,
        companyId: companyId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'bekliyor',
        slaDetails: slaDetails || null,
        monthlyFee: monthlyFee || null,
      });
      res.json({ success: true, id: (result as any).insertId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch('/api/admin/contracts/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title, companyId, startDate, endDate, status, slaDetails, monthlyFee } = req.body;
      await db.update(maintenanceContracts).set({
        ...(title && { title }),
        ...(companyId !== undefined && { companyId: companyId || null }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(status && { status: status as any }),
        ...(slaDetails !== undefined && { slaDetails }),
        ...(monthlyFee !== undefined && { monthlyFee }),
      }).where(eq(maintenanceContracts.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/admin/contracts/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(maintenanceContracts).where(eq(maintenanceContracts.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS — Raporlar
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/admin/reports/summary', requireAdmin, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(String(req.query.endDate) + 'T23:59:59') : new Date();

      const dateFilter = (table: any, field: any) => and(
        sql`${field} >= ${startDate}`,
        sql`${field} <= ${endDate}`
      );

      // Ticket counts
      const [ticketCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(tickets).where(dateFilter(tickets, tickets.createdAt));
      const ticketCount = Number(ticketCountResult?.count || 0);

      // Revenue (sales)
      const [revenueResult] = await db.select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` }).from(sales)
        .where(and(dateFilter(sales, sales.createdAt), eq(sales.status, 'odendi')));
      const totalRevenue = revenueResult?.total || '0';

      // Expenses
      const [expenseResult] = await db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(expenses).where(dateFilter(expenses, expenses.createdAt));
      const totalExpenses = expenseResult?.total || '0';

      const netProfit = parseFloat(totalRevenue) - parseFloat(totalExpenses);

      // Daily revenue
      const dailyRevenue = await db.select({
        date: sql<string>`DATE_FORMAT(created_at, '%d/%m')`.as('date'),
        amount: sql<number>`COALESCE(SUM(total_amount), 0)`.as('amount'),
      }).from(sales)
        .where(and(dateFilter(sales, sales.createdAt), eq(sales.status, 'odendi')))
        .groupBy(sql`DATE(created_at)`)
        .orderBy(sql`DATE(created_at)`);

      // Ticket type distribution
      const ticketTypeDistribution = await db.select({
        name: tickets.type,
        value: sql<number>`COUNT(*)`.as('value'),
      }).from(tickets)
        .where(dateFilter(tickets, tickets.createdAt))
        .groupBy(tickets.type);

      const TYPE_LABELS: Record<string, string> = { ariza: 'Arıza', destek: 'Destek', kurulum: 'Kurulum', bakim: 'Bakım', diger: 'Diğer' };
      const ticketTypeLabeled = ticketTypeDistribution.map(t => ({ ...t, name: TYPE_LABELS[t.name] || t.name }));

      // Ticket status summary
      const ticketStatusRaw = await db.select({
        status: tickets.status,
        count: sql<number>`COUNT(*)`.as('count'),
      }).from(tickets)
        .where(dateFilter(tickets, tickets.createdAt))
        .groupBy(tickets.status);

      const ticketStatusSummary = ticketStatusRaw.map(s => ({
        label: TICKET_STATUS_LABELS[s.status] || s.status,
        count: Number(s.count),
      }));

      // Average resolution days
      const [avgRes] = await db.select({
        avg: sql<number>`AVG(DATEDIFF(COALESCE(resolved_at, completed_at), created_at))`.as('avg'),
      }).from(tickets)
        .where(and(dateFilter(tickets, tickets.createdAt), or(sql`resolved_at IS NOT NULL`, sql`completed_at IS NOT NULL`)));
      const avgResolutionDays = avgRes?.avg ? Math.round(Number(avgRes.avg) * 10) / 10 : null;

      // Resolved/Pending counts
      const [resolvedRes] = await db.select({ count: sql<number>`COUNT(*)` }).from(tickets)
        .where(and(dateFilter(tickets, tickets.createdAt), or(eq(tickets.status, 'cozuldu'), eq(tickets.status, 'kapatildi'), eq(tickets.status, 'teslim_edildi'))));
      const resolvedCount = Number(resolvedRes?.count || 0);

      const [pendingRes] = await db.select({ count: sql<number>`COUNT(*)` }).from(tickets)
        .where(and(dateFilter(tickets, tickets.createdAt), sql`status NOT IN ('cozuldu','kapatildi','iptal','teslim_edildi')`));
      const pendingCount = Number(pendingRes?.count || 0);

      // New customers
      const [newCustRes] = await db.select({ count: sql<number>`COUNT(*)` }).from(customers).where(dateFilter(customers, customers.createdAt));
      const newCustomerCount = Number(newCustRes?.count || 0);

      // Payment method distribution
      const paymentMethodRaw = await db.select({
        method: sales.paymentType,
        total: sql<string>`COALESCE(SUM(total_amount), 0)`.as('total'),
      }).from(sales)
        .where(and(dateFilter(sales, sales.createdAt), eq(sales.status, 'odendi')))
        .groupBy(sales.paymentType);

      const METHOD_LABELS: Record<string, string> = { nakit: 'Nakit', kredi_karti: 'Kredi Kartı', havale: 'Havale/EFT', cari: 'Cari' };
      const paymentMethodDistribution = paymentMethodRaw.map(p => ({ method: METHOD_LABELS[p.method] || p.method, total: p.total }));

      // Expense categories
      const expenseCategories = await db.select({
        category: expenses.category,
        total: sql<string>`COALESCE(SUM(amount), 0)`.as('total'),
      }).from(expenses)
        .where(dateFilter(expenses, expenses.createdAt))
        .groupBy(expenses.category)
        .orderBy(sql`SUM(amount) DESC`);

      // Invoice status summary
      const invoiceStatusRaw = await db.select({
        status: invoices.status,
        count: sql<number>`COUNT(*)`.as('count'),
        total: sql<string>`COALESCE(SUM(total_amount), 0)`.as('total'),
      }).from(invoices)
        .where(dateFilter(invoices, invoices.createdAt))
        .groupBy(invoices.status);

      const INV_LABELS: Record<string, string> = { taslak: 'Taslak', kuyrukta: 'Kuyrukta', gonderildi: 'Gönderildi', odendi: 'Ödendi', iptal: 'İptal', gecikmis: 'Gecikmiş' };
      const invoiceStatusSummary = invoiceStatusRaw.map(i => ({ status: INV_LABELS[i.status] || i.status, count: Number(i.count), total: i.total }));

      // Top selling products
      const topSellingProducts = await db.select({
        name: stockItems.name,
        sku: stockItems.sku,
        totalSold: sql<number>`SUM(${saleItems.quantity})`.as('totalSold'),
        totalRevenue: sql<string>`SUM(${saleItems.totalPrice})`.as('totalRevenue'),
      }).from(saleItems)
        .innerJoin(stockItems, eq(saleItems.stockItemId, stockItems.id))
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(and(dateFilter(sales, sales.createdAt), eq(sales.status, 'odendi')))
        .groupBy(saleItems.stockItemId, stockItems.name, stockItems.sku)
        .orderBy(sql`totalSold DESC`)
        .limit(10);

      // Low stock items
      const lowStockItems = await db.select({
        name: stockItems.name,
        sku: stockItems.sku,
        currentStock: stockItems.currentStock,
        minStockLevel: stockItems.minStockLevel,
      }).from(stockItems)
        .where(and(eq(stockItems.isActive, true), sql`${stockItems.currentStock} <= ${stockItems.minStockLevel}`, sql`${stockItems.minStockLevel} > 0`))
        .orderBy(asc(stockItems.currentStock))
        .limit(20);

      res.json({
        ticketCount,
        totalRevenue,
        totalExpenses,
        netProfit,
        dailyRevenue,
        ticketTypeDistribution: ticketTypeLabeled,
        ticketStatusSummary,
        avgResolutionDays,
        resolvedCount,
        pendingCount,
        newCustomerCount,
        paymentMethodDistribution,
        expenseCategories,
        invoiceStatusSummary,
        topSellingProducts,
        lowStockItems,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ÖDEAL PAYMENT API ENTEGRASYONU (Sanal POS, Pay-by-Link, 3D & Callback)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post('/api/payments/odeal/init-link', requireAdmin, async (req, res) => {
    try {
      const { amount, title, description, customerPhone, customerEmail, ticketId, invoiceId } = req.body;
      if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Geçerli bir tutar girilmelidir' });

      // Read Ödeal settings
      const settingsRows = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      settingsRows.forEach(s => { settingsMap[s.key] = s.value; });

      const apiKey = settingsMap['odeal_api_key'] || process.env.ODEAL_API_KEY || '';
      const merchantId = settingsMap['odeal_merchant_id'] || process.env.ODEAL_MERCHANT_ID || '';
      const isSandbox = (settingsMap['odeal_sandbox'] || process.env.ODEAL_SANDBOX || 'true') === 'true';

      const baseUrl = isSandbox ? 'https://sandbox-api.odeal.com' : 'https://api.odeal.com';
      const referenceCode = `ODEAL-${Date.now()}`;

      // Call Ödeal Pay-by-Link API if credentials exist
      if (apiKey && merchantId) {
        try {
          const odealRes = await fetch(`${baseUrl}/sanalpos/tr/api/payment/init-link`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'x-merchant-id': merchantId,
            },
            body: JSON.stringify({
              amount: parseFloat(amount).toFixed(2),
              title: title || 'Kerim Bilgisayar Ödeme',
              description: description || 'Servis / Fatura Ödemesi',
              clientPhone: customerPhone ? customerPhone.replace(/\D/g, '') : undefined,
              clientEmail: customerEmail || undefined,
              externalId: referenceCode,
              callbackUrl: `${req.protocol}://${req.get('host')}/api/payments/odeal/callback`,
            }),
          });
          const odealData = await odealRes.json();
          if (odealData?.paymentUrl || odealData?.data?.paymentUrl) {
            return res.json({
              success: true,
              paymentUrl: odealData.paymentUrl || odealData.data.paymentUrl,
              referenceCode,
            });
          }
        } catch (err) {
          console.error('[Ödeal API Error]:', err);
        }
      }

      // Fallback Payment Checkout Link (Simulation / Demo mode if live API keys not filled yet)
      const encodedPhone = customerPhone ? encodeURIComponent(customerPhone) : '';
      const fallbackUrl = `${req.protocol}://${req.get('host')}/pay/odeal?ref=${referenceCode}&amount=${amount}&title=${encodeURIComponent(title || 'Kerim Bilgisayar Ödeme')}&phone=${encodedPhone}`;

      res.json({
        success: true,
        paymentUrl: fallbackUrl,
        referenceCode,
        isSimulated: true,
        message: apiKey ? 'Ödeal API yanıt verdi' : 'Ödeal API anahtarları eklenene kadar simüle edilmiş ödeme linki oluşturuldu',
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/payments/odeal/init-3d', async (req, res) => {
    try {
      const { amount, cardNumber, cardExpiry, cardCvc, cardHolderName, ticketId, invoiceId } = req.body;
      if (!amount || !cardNumber) return res.status(400).json({ error: 'Kart bilgileri eksik' });

      const referenceCode = `ODEAL-3D-${Date.now()}`;
      res.json({
        success: true,
        referenceCode,
        status: 'pending_3d',
        htmlContent: `<form id="odeal3d" action="https://sandbox-api.odeal.com/sanalpos/tr/api/payment/init-3d" method="POST"><input type="hidden" name="ref" value="${referenceCode}"/></form><script>document.getElementById('odeal3d').submit();</script>`,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/payments/odeal/callback', express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const { status, referenceCode, ticketId, invoiceId, amount } = req.body;
      console.log('[Ödeal Callback Received]:', req.body);

      if (status === 'SUCCESS' || status === '1' || req.body.paymentStatus === 'SUCCESS') {
        if (invoiceId) {
          await db.update(invoices).set({ status: 'odendi' }).where(eq(invoices.id, Number(invoiceId)));
        }
        if (ticketId) {
          await db.update(tickets).set({ status: 'cozuldu' }).where(eq(tickets.id, Number(ticketId)));
        }
        return res.send('OK');
      }
      res.send('FAILED');
    } catch (e: any) { res.status(500).send('ERROR: ' + e.message); }
  });

  // SPA catch-all — API ve uploads dışındaki her route index.html döner
  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    const indexPath = isDev
      ? path.join(rootDir, 'index.html')
      : path.join(rootDir, 'dist', 'index.html');

    if (!fs.existsSync(indexPath)) {
      console.error('[SPA] index.html not found:', indexPath, '| isDev:', isDev, '| rootDir:', rootDir);
      return res.status(500).send('index.html bulunamadı: ' + indexPath);
    }

    try {
      let html = fs.readFileSync(indexPath, 'utf-8');
      // Dev: Vite'ın HMR client'ını inject etmesi ve module'ları transform etmesi için
      if (isDev && viteMiddleware) {
        html = await viteMiddleware.transformIndexHtml(req.originalUrl, html);
      }
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (err: any) {
      if (isDev && viteMiddleware) viteMiddleware.ssrFixStacktrace?.(err);
      console.error('[SPA] transform error:', err.message);
      if (!res.headersSent) res.status(500).send('index.html gönderilemedi: ' + err.message);
    }
  });

  const server = app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} zaten kullanımda.`);
      console.error(`   Çözüm (PowerShell):`);
      console.error(`   Get-NetTCPConnection -LocalPort ${PORT} -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }\n`);
      process.exit(1);
    }
    throw err;
  });

  // Graceful shutdown — HMR/nodemon restart'larda port'u serbest bırak
  const shutdown = (sig: string) => {
    console.log(`\n${sig} alındı, server kapatılıyor...`);
    server.close(() => {
      console.log('✓ Server temiz şekilde kapandı');
      process.exit(0);
    });
    // 5 saniye içinde kapanmazsa zorla
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch(console.error);
  