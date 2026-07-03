import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './src/db/schema';

async function main() {
  const conn = await mysql.createConnection('mysql://todestek_kerim:39RdaT38tx5rBH7sTvXs@45.43.152.5:3306/todestek_kerim?connectTimeout=10000');
  const db = drizzle(conn, { schema, mode: 'default' });
  const allSettings = await db.select().from(schema.settings);
  console.log(allSettings.length);
  await conn.end();
}
main().catch(console.error);
