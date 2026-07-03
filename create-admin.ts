import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './src/db/schema';
import { users, tenants } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  const conn = await mysql.createConnection('mysql://todestek_kerim:39RdaT38tx5rBH7sTvXs@45.43.152.5:3306/todestek_kerim?connectTimeout=10000');
  const db = drizzle(conn, { schema, mode: 'default' });

  // Get tenant
  const tenant = await db.select().from(tenants).limit(1);
  if (tenant.length === 0) {
    console.error('Tenant bulunamadı! Önce seed.ts çalıştırın.');
    process.exit(1);
  }
  const tenantId = tenant[0].id;
  console.log(`Tenant ID: ${tenantId}`);

  // Check if admin already exists
  const existing = await db.select().from(users).where(eq(users.email, 'admin@kerimbilgisayar.com')).limit(1);
  if (existing.length > 0) {
    console.log('Admin kullanıcısı zaten mevcut:', existing[0].email);
    console.log('Şifre: admin123');
    process.exit(0);
  }

  // Create admin user
  await db.insert(users).values({
    tenantId,
    firstName: 'Sistem',
    lastName: 'Yöneticisi',
    email: 'admin@kerimbilgisayar.com',
    passwordHash: 'admin123',
    phone: '+905551234567',
    roleType: 'tenant_admin',
    isActive: true,
  });

  console.log('✅ Admin kullanıcısı oluşturuldu!');
  console.log('   E-posta: admin@kerimbilgisayar.com');
  console.log('   Şifre  : admin123');
  
  process.exit(0);
}

createAdmin().catch(console.error);
