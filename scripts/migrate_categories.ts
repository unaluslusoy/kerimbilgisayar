import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Creating service_categories table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`service_categories\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`tenant_id\` int,
        \`name\` varchar(255) NOT NULL,
        \`slug\` varchar(255) NOT NULL UNIQUE,
        \`description\` text,
        \`icon\` varchar(100),
        \`features\` json,
        \`meta_title\` varchar(255),
        \`meta_description\` text,
        \`is_active\` boolean DEFAULT true,
        \`display_order\` int DEFAULT 0,
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Adding category_id to services...');
    try {
      await db.execute(sql`ALTER TABLE \`services\` ADD COLUMN \`category_id\` int;`);
    } catch(e: any) {
      console.log('category_id already exists or error:', e.message);
    }

    console.log('Dropping old category column...');
    try {
      await db.execute(sql`ALTER TABLE \`services\` DROP COLUMN \`category\`;`);
    } catch(e: any) {
      console.log('category column already dropped or error:', e.message);
    }

    console.log('Migration completed.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
