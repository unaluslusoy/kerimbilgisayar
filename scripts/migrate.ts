import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`ALTER TABLE menu_items ADD COLUMN tenant_id INT;`);
    console.log("Success!");
  } catch (e) {
    console.log("Error or already exists:", e.message);
  }
  process.exit(0);
}
main();
