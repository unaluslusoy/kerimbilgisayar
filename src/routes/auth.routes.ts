import express from 'express';
import os from 'os';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { users } from '../db/schema';
import {
  verifyPassword,
  signToken,
  requireAdmin,
  loginLimiter,
  ADMIN_TOKEN_TTL
} from '../server/middleware';
import { verifyTurnstile, readSettingsMap } from '../server/helpers';

export const authRouter = express.Router();

authRouter.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    if (!(await verifyTurnstile(req))) return res.status(400).json({ error: 'Captcha doğrulaması başarısız' });
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre gerekli' });
    }

    const adminUser = await db.select().from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (adminUser.length === 0) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    const u = adminUser[0];

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

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));

    res.json({ token, user: sessionData });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

authRouter.post('/api/admin/logout', requireAdmin, (req, res) => {
  res.json({ success: true });
});

authRouter.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json((req as any).adminUser);
});

authRouter.get('/api/admin/system/health', requireAdmin, async (req, res) => {
  try {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: os.platform(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAvg: os.loadavg(),
      db: 'up',
      pid: process.pid,
      node: process.version,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
