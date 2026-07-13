import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectTimeout: 30000,
});

console.log('✅ DB bağlantısı kuruldu');

try {
  await conn.execute(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS technician_notes TEXT NULL`);
  console.log('✅ tickets.technician_notes kolonu başarıyla eklendi');
} catch (err) {
  console.error('❌ Hata:', err.message);
}

await conn.end();
