// Migration script — FAZ 1 schema changes
// Run: node scripts/migrate-faz1.mjs

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  multipleStatements: true,
  connectTimeout: 30000,
});

console.log('✅ DB bağlantısı kuruldu');

const migrations = [
  // FAZ 1A — users tablosu: cari alanlar (tümü nullable, migration güvenli)
  {
    name: 'users.tax_number',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50) NULL`
  },
  {
    name: 'users.tax_office',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100) NULL`
  },
  {
    name: 'users.tc_no',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS tc_no VARCHAR(11) NULL`
  },
  {
    name: 'users.kvkk_consent',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS kvkk_consent BOOLEAN NOT NULL DEFAULT FALSE`
  },
  {
    name: 'users.kvkk_consent_at',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS kvkk_consent_at TIMESTAMP NULL`
  },
  {
    name: 'users.currency',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'TRY'`
  },
  {
    name: 'users.user_notes',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS user_notes TEXT NULL`
  },
  {
    name: 'users.roleType dealer_user',
    sql: `ALTER TABLE users MODIFY COLUMN role_type ENUM('superadmin','tenant_admin','staff','technician','customer','dealer_user') NOT NULL DEFAULT 'customer'`
  },

  // FAZ 1A — customers tablosu: finansal alanlar
  {
    name: 'customers.risk_limit',
    sql: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS risk_limit DECIMAL(15,2) NULL`
  },
  {
    name: 'customers.default_due_days',
    sql: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS default_due_days INT NOT NULL DEFAULT 0`
  },
  {
    name: 'customers.discount_rate',
    sql: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00`
  },

  // FAZ 1B — companies tablosu: bayi alanları
  {
    name: 'companies.dealer_type',
    sql: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS dealer_type ENUM('none','dealer') NOT NULL DEFAULT 'none'`
  },
  {
    name: 'companies.dealer_risk_limit',
    sql: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS dealer_risk_limit DECIMAL(15,2) NULL`
  },
  {
    name: 'companies.dealer_due_days',
    sql: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS dealer_due_days INT NOT NULL DEFAULT 0`
  },
  {
    name: 'companies.dealer_discount_rate',
    sql: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS dealer_discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00`
  },
  {
    name: 'companies.dealer_price_list_note',
    sql: `ALTER TABLE companies ADD COLUMN IF NOT EXISTS dealer_price_list_note TEXT NULL`
  },

  // FAZ 1B — tickets tablosu: bayi entegrasyonu
  {
    name: 'tickets.dealer_id',
    sql: `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS dealer_id INT NULL REFERENCES companies(id)`
  },
  {
    name: 'tickets.source',
    sql: `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS source ENUM('walk_in','dealer','online','phone') NOT NULL DEFAULT 'walk_in'`
  },
  {
    name: 'tickets.idx_dealer',
    sql: `ALTER TABLE tickets ADD INDEX IF NOT EXISTS idx_tickets_dealer (dealer_id)`
  },

  // FAZ 3A — payments tablosu: ters kayıt + ticketId
  {
    name: 'payments.ticket_id',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS ticket_id INT NULL REFERENCES tickets(id)`
  },
  {
    name: 'payments.status iptal',
    sql: `ALTER TABLE payments MODIFY COLUMN status ENUM('basarili','basarisiz','bekliyor','iade','iptal') NOT NULL DEFAULT 'basarili'`
  },
  {
    name: 'payments.reversal_of_id',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversal_of_id INT NULL`
  },
  {
    name: 'payments.reversed_at',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP NULL`
  },
  {
    name: 'payments.reversed_by_user_id',
    sql: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_by_user_id INT NULL REFERENCES users(id)`
  },

  // FAZ 1B — YENİ TABLO: dealer_ledger
  {
    name: 'CREATE dealer_ledger',
    sql: `CREATE TABLE IF NOT EXISTS dealer_ledger (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NULL REFERENCES tenants(id),
      dealer_company_id INT NOT NULL REFERENCES companies(id),
      ticket_id INT NULL REFERENCES tickets(id),
      payment_id INT NULL REFERENCES payments(id),
      type ENUM('debit','credit') NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
      description VARCHAR(500) NULL,
      due_date DATE NULL,
      reversal_of_id INT NULL,
      is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
      reconciled_with INT NULL,
      reconciled_amount DECIMAL(15,2) NULL,
      created_by_user_id INT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dealer_ledger_company (dealer_company_id),
      INDEX idx_dealer_ledger_ticket (ticket_id)
    )`
  },

  // FAZ 1D — YENİ TABLO: exchange_rates
  {
    name: 'CREATE exchange_rates',
    sql: `CREATE TABLE IF NOT EXISTS exchange_rates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NULL REFERENCES tenants(id),
      base_currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
      target_currency VARCHAR(10) NOT NULL,
      rate DECIMAL(15,6) NOT NULL,
      source ENUM('tcmb','manual','carried_over') NOT NULL DEFAULT 'tcmb',
      rate_date DATE NOT NULL,
      fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_exchange_rates_date (rate_date),
      INDEX idx_exchange_rates_currency (target_currency)
    )`
  },

  // FAZ 1D — YENİ TABLO: period_locks
  {
    name: 'CREATE period_locks',
    sql: `CREATE TABLE IF NOT EXISTS period_locks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NULL REFERENCES tenants(id),
      year INT NOT NULL,
      month INT NOT NULL,
      locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      locked_by_user_id INT NULL REFERENCES users(id),
      notes TEXT NULL,
      INDEX idx_period_locks_period (year, month)
    )`
  },

  // FAZ 2A — YENİ TABLO: ticket_attachment_meta
  {
    name: 'CREATE ticket_attachment_meta',
    sql: `CREATE TABLE IF NOT EXISTS ticket_attachment_meta (
      id INT AUTO_INCREMENT PRIMARY KEY,
      attachment_id INT NOT NULL REFERENCES ticket_attachments(id),
      phase ENUM('teslim_alim','tamir','teslim','genel') NOT NULL DEFAULT 'genel',
      is_locked BOOLEAN NOT NULL DEFAULT FALSE,
      locked_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
];

let passed = 0;
let skipped = 0;
let failed = 0;

for (const migration of migrations) {
  try {
    await conn.execute(migration.sql);
    console.log(`  ✅ ${migration.name}`);
    passed++;
  } catch (err) {
    // IF NOT EXISTS zaten varsa 1060 hatasını sessizce atla
    if (err.errno === 1060 || err.errno === 1061 || err.message.includes('Duplicate')) {
      console.log(`  ⏭️  ${migration.name} (zaten mevcut)`);
      skipped++;
    } else {
      console.error(`  ❌ ${migration.name}: ${err.message}`);
      failed++;
    }
  }
}

await conn.end();
console.log(`\n📊 Sonuç: ${passed} başarılı, ${skipped} atlandı, ${failed} başarısız`);
if (failed > 0) process.exit(1);
