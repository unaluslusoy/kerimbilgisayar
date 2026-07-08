/**
 * MariaDB / MySQL bağlantı testi
 * Kullanım: node scripts/test-db.mjs
 */
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const cfg = {
  remote: {
    host:     process.env.DATABASE_HOST,
    port:     Number(process.env.DATABASE_PORT) || 3306,
    user:     process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
    connectTimeout: 10_000,
  },
  local: {
    host:     '127.0.0.1',
    port:     3306,
    user:     'root',
    password: '',
    database: process.env.DATABASE_NAME,
    connectTimeout: 5_000,
  },
};

async function testConnection(label, opts) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${label}`);
  console.log(`  ${opts.user}@${opts.host}:${opts.port}/${opts.database}`);
  console.log('─'.repeat(50));

  let conn;
  try {
    conn = await mysql.createConnection(opts);
    const [[row]] = await conn.query('SELECT VERSION() AS v, NOW() AS ts, DATABASE() AS db');
    console.log('  ✅  Bağlantı BAŞARILI');
    console.log(`  Versiyon  : ${row.v}`);
    console.log(`  Sunucu ts : ${row.ts}`);
    console.log(`  Veritab.  : ${row.db}`);

    const [tables] = await conn.query('SHOW TABLES');
    console.log(`  Tablo say.: ${tables.length}`);
    if (tables.length > 0) {
      const col = Object.keys(tables[0])[0];
      console.log('  Tablolar  :', tables.map(t => t[col]).join(', '));
    }
  } catch (err) {
    console.log(`  ❌  Bağlantı HATASI`);
    console.log(`  Kod    : ${err.code}`);
    console.log(`  Mesaj  : ${err.message}`);
  } finally {
    await conn?.end().catch(() => {});
  }
}

(async () => {
  console.log('\n🔍  MariaDB Bağlantı Testi');

  await testConnection('UZAK SUNUCU', cfg.remote);
  await testConnection('LOCALHOST (XAMPP)', cfg.local);

  console.log(`\n${'─'.repeat(50)}\n`);
})();
