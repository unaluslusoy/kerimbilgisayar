#!/usr/bin/env node
/**
 * DOCTOR — sistem sağlık kontrolü.
 * `npm run doctor` çalıştırınca env, port ve DB durumunu raporlar.
 */
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? green('✓') : red('✗')} ${name}${detail ? ' — ' + detail : ''}`);
};

console.log(bold('\n🩺 KERİM BİLGİSAYAR — Sistem Doktoru\n'));

// ─── 1) Node sürümü
const nodeMajor = Number(process.versions.node.split('.')[0]);
check(`Node.js ${process.version}`, nodeMajor >= 20, nodeMajor >= 20 ? '' : 'v20+ gerekiyor');

// ─── 2) .env dosyası
const envPath = path.resolve('.env');
const envExists = fs.existsSync(envPath);
check('.env dosyası', envExists, envExists ? envPath : 'oluştur ve DATABASE_* değişkenlerini gir');

// ─── 3) DB env
const required = ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_NAME'];
const missing = required.filter(k => !process.env[k]);
const hasUrl = !!process.env.DATABASE_URL?.startsWith('mysql');
check(
  'Database env değişkenleri',
  hasUrl || missing.length === 0,
  hasUrl ? 'DATABASE_URL set' : (missing.length ? 'eksik: ' + missing.join(', ') : 'HOST/USER/NAME OK'),
);

// ─── 4) Port müsaitliği
const checkPort = (port) => new Promise((resolve) => {
  const srv = net.createServer();
  srv.once('error', (err) => resolve({ port, free: false, code: err.code }));
  srv.once('listening', () => srv.close(() => resolve({ port, free: true })));
  srv.listen(port, '127.0.0.1');
});

for (const p of [3000, 5173, 24678]) {
  const r = await checkPort(p);
  check(`Port ${p}`, r.free, r.free ? 'boş' : yellow(`kullanımda (${r.code}) → npm run kill-ports`));
}

// ─── 5) MySQL bağlantısı
if (envExists && (hasUrl || missing.length === 0)) {
  try {
    const mysql = (await import('mysql2/promise')).default;
    const conn = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT || 3306),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME,
      connectTimeout: 5000,
    });
    const [rows] = await conn.query('SELECT VERSION() AS v');
    check('MySQL bağlantısı', true, `MySQL ${rows[0].v}`);
    await conn.end();
  } catch (err) {
    check('MySQL bağlantısı', false, err.message);
  }
} else {
  check('MySQL bağlantısı', false, 'env eksik olduğu için atlandı');
}

// ─── 6) Kritik dosyalar
for (const f of ['index.html', 'src/main.tsx', 'server.ts', 'vite.config.ts']) {
  check(`Dosya: ${f}`, fs.existsSync(path.resolve(f)));
}

// ─── Özet
const failed = results.filter(r => !r.ok);
console.log('\n' + bold(failed.length ? red(`❌ ${failed.length} sorun bulundu`) : green('✅ Sistem sağlıklı')));
process.exit(failed.length ? 1 : 0);
