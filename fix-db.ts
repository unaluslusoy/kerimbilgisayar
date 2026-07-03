import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function fixDb() {
  try {
    await db.execute(sql`ALTER TABLE menu_items ADD COLUMN mega_menu JSON DEFAULT NULL;`);
    console.log('Added mega_menu column');
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('Column already exists');
    else console.error(e.message);
  }
  process.exit(0);
}

fixDb();
