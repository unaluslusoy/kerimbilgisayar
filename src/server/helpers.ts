/**
 * Shared server-side helpers.
 * Bu dosya server.ts'teki startServer() kapsamından çıkarılan,
 * tüm route dosyalarının ortak kullandığı yardımcı fonksiyonları içerir.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db } from '../db/index';
import { users, notifications, settings, blockedIps, ticketApprovalRequests, webhooks } from '../db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

// ─── ROOT DIR ───────────────────────────────────────────────────────────────
export const rootDir = fs.existsSync(path.join(process.cwd(), 'uploads'))
  ? process.cwd()
  : path.resolve(process.cwd(), '..');

// ─── LOG BUFFER ──────────────────────────────────────────────────────────────
export const logBuffer: { time: string; type: 'log' | 'error'; message: string }[] = [];

// ─── ENV ─────────────────────────────────────────────────────────────────────
export const isDev = process.env.NODE_ENV !== 'production';

// ─── IP UTILS ────────────────────────────────────────────────────────────────
export const getClientIp = (req: express.Request): string => {
  const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return (raw || req.ip || '').replace(/^::ffff:/, '').trim();
};

export const parseList = (value?: string): string[] =>
  (value || '')
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);

// ─── SETTINGS CACHE ──────────────────────────────────────────────────────────
let settingsCache: { data: Record<string, string>; fetchedAt: number } | null = null;
const SETTINGS_CACHE_TTL = 60_000;

export const readSettingsMap = async (forceRefresh = false): Promise<Record<string, string>> => {
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

// ─── DB BLOCKED IPS CACHE ────────────────────────────────────────────────────
let activeDbBlockedIpsCache: { map: Map<string, number>; fetchedAt: number } | null = null;
const DB_BLOCKED_IPS_CACHE_TTL = 60_000;

export const getActiveDbBlockedIps = async (): Promise<Map<string, number>> => {
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

export const invalidateDbBlockedIpsCache = () => {
  activeDbBlockedIpsCache = null;
};

// ─── TURNSTILE CAPTCHA ───────────────────────────────────────────────────────
export const verifyTurnstile = async (req: express.Request): Promise<boolean> => {
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
    return true; // fail-open: network errors should not lock users out
  }
};

// ─── NOTIFY STAFF ────────────────────────────────────────────────────────────
export const notifyStaff = async (params: {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'system';
  linkUrl?: string;
}): Promise<void> => {
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

// ─── IMEI VALIDATION ─────────────────────────────────────────────────────────
export const isValidImei = (imei: string): boolean => {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(imei[i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
};

// ─── APPROVAL REQUEST ────────────────────────────────────────────────────────
export const markLatestApprovalRequest = async (
  ticketId: number,
  decision: 'approved' | 'rejected',
  ip: string
): Promise<void> => {
  try {
    const pending = await db.select().from(ticketApprovalRequests)
      .where(and(
        eq(ticketApprovalRequests.ticketId, ticketId),
        sql`${ticketApprovalRequests.approvedAt} IS NULL`,
        sql`${ticketApprovalRequests.rejectedAt} IS NULL`
      ))
      .orderBy(desc(ticketApprovalRequests.sentAt))
      .limit(1);
    if (pending.length === 0) return;
    await db.update(ticketApprovalRequests).set(
      decision === 'approved'
        ? { approvedAt: new Date(), approvedIp: ip }
        : { rejectedAt: new Date() }
    ).where(eq(ticketApprovalRequests.id, pending[0].id));
  } catch (e) {
    console.error('markLatestApprovalRequest error:', e);
  }
};

// ─── MULTER UPLOAD ───────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.zip', '.rar'
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(rootDir, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + safeExt);
  },
});
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB Max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Güvenlik nedeniyle '${ext}' uzantılı dosyaların yüklenmesine izin verilmiyor.`));
    }
    cb(null, true);
  },
});

// ─── MOVE USER FILE ──────────────────────────────────────────────────────────
export const moveUserFile = (fileUrl: string, userId: number): string => {
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
  return fileUrl;
};

// ─── TRIGGER WEBHOOK ─────────────────────────────────────────────────────────
export const triggerWebhook = async (eventName: string, payload: any): Promise<void> => {
  try {
    const activeHooks = await db.select().from(webhooks).where(
      and(eq(webhooks.event, eventName), eq(webhooks.isActive, true))
    );
    
    for (const hook of activeHooks) {
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
};

// ─── MEMORY COUNTERS & CACHES ────────────────────────────────────────────────
export const requestCounters = new Map<string, { count: number; startedAt: number }>();
export const autoBlockedIps = new Map<string, number>();

// ─── PICKUP REMINDERS ────────────────────────────────────────────────────────
export const checkPickupReminders = async (): Promise<void> => {
  try {
    const { tickets: ticketsTable } = await import('../db/schema');
    const now = new Date();
    const readyTickets = await db.select().from(ticketsTable)
      .where(and(
        sql`${ticketsTable.status} = 'teslim_bekliyor'`,
        sql`${ticketsTable.completedAt} IS NOT NULL`
      ));

    for (const t of readyTickets) {
      if (!t.completedAt) continue;
      const daysSinceCompleted = Math.floor((now.getTime() - new Date(t.completedAt).getTime()) / (1000 * 60 * 60 * 24));
      let targetTier: 1 | 2 | 3 | null = null;
      if (daysSinceCompleted >= 90) targetTier = 3;
      else if (daysSinceCompleted >= 60) targetTier = 2;
      else if (daysSinceCompleted >= 30) targetTier = 1;

      const currentTier = (t as any).pickupReminderTier || 0;
      if (targetTier && currentTier < targetTier) {
        await db.update(ticketsTable)
          .set({ pickupReminderTier: targetTier, pickupReminderSentAt: now } as any)
          .where(eq(ticketsTable.id, t.id));
        console.log(`[Pickup Reminder Tier ${targetTier}] Ticket #${t.ticketNumber} (${daysSinceCompleted} gün bekliyor)`);
      }
    }
  } catch (e) {
    console.error('checkPickupReminders error:', e);
  }
};


