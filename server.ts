// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL PROCESS GUARDS — sistem çökse bile nedeni görünür kalsın
// ═══════════════════════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
  console.error('\n💥 [FATAL] uncaughtException (process kept alive):', err);
  console.error('Stack:', err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('\n💥 [WARNING] unhandledRejection (process kept alive):', reason);
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
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import { db } from './src/db/index';
import { routes } from './src/routes/index';
import { rootDir, checkPickupReminders, requestCounters, autoBlockedIps } from './src/server/helpers';

// ═══════════════════════════════════════════════════════════════════════════
// DB WARM-UP — startup'ta gerçek bağlantı testi
// ═══════════════════════════════════════════════════════════════════════════
let dbHealthy = false;
let dbLastError: string | null = null;

async function warmUpDatabase() {
  const t0 = Date.now();
  try {
    await db.execute(sql`SELECT 1 as ping`);
    dbHealthy = true;
    dbLastError = null;
    console.log(`✓ DB bağlantısı OK (${Date.now() - t0}ms)`);
  } catch (err: any) {
    dbHealthy = false;
    dbLastError = err?.message || String(err);
    console.error(`✗ DB bağlantısı BAŞARISIZ: ${dbLastError}`);
    console.error('   → .env dosyasında DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME var mı?');
    console.error('   → MySQL servisi çalışıyor mu?');
  }
}

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

  // Periodic memory cleanup to prevent memory leaks from in-memory Maps
  setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of requestCounters.entries()) {
      if (now - bucket.startedAt > 10 * 60 * 1000) {
        requestCounters.delete(ip);
      }
    }
    for (const [ip, blockedUntil] of autoBlockedIps.entries()) {
      if (blockedUntil < now) {
        autoBlockedIps.delete(ip);
      }
    }
  }, 10 * 60 * 1000).unref();

  // Teslim yaşlandırma taraması (2D): boot'ta bir kez, sonra her 6 saatte bir.
  setTimeout(() => { checkPickupReminders().catch(console.error); }, 60_000).unref();
  setInterval(() => { checkPickupReminders().catch(console.error); }, 6 * 60 * 60 * 1000).unref();

  // Ödeal Recovery Job: Belirsiz durumdaki ödemeleri 2 dk'da bir sorgula
  const { runRecoveryJob } = await import('./src/server/odeal.service');
  setInterval(() => { runRecoveryJob().catch(err => console.error('[Ödeal Recovery] Hata:', err.message)); }, 2 * 60 * 1000).unref();

  // TCMB Günlük Kur Senkronizasyonu: Boot'ta ve her 6 saatte bir
  const { fetchTcmbRates } = await import('./src/server/exchangeRate.service');
  setTimeout(() => { fetchTcmbRates().catch(err => console.error('[TCMB Rates] Hata:', err.message)); }, 30_000).unref();
  setInterval(() => { fetchTcmbRates().catch(err => console.error('[TCMB Rates] Hata:', err.message)); }, 6 * 60 * 60 * 1000).unref();

  app.use(express.json({ limit: '2mb' }));

  // ─── HEALTH ENDPOINTS
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

  keepDbAlive().catch(err => console.error('[boot] DB warm-up error:', err));

  // --- SECURITY MIDDLEWARE ---
  const isDev = process.env.NODE_ENV !== 'production';
  console.log(`[boot] mode: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} | port: ${PORT}`);

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

  // Serve static files from /uploads
  const uploadsDir = path.join(rootDir, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
  }

  // Production build static files
  const distDir = path.join(rootDir, 'dist');
  if (!isDev && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
  }

  // --- MOUNT ALL DOMAIN ROUTERS ---
  app.use(routes);

  // Dev mode: Vite middleware embed
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
    }
  }

  // ─── GLOBAL ERROR HANDLER
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Express Error]', req.method, req.path, err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Sunucu hatası, lütfen tekrar deneyin' });
    }
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

  const shutdown = (sig: string) => {
    console.log(`\n${sig} alındı, server kapatılıyor...`);
    server.close(() => {
      console.log('✓ Server temiz şekilde kapandı');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch(console.error);