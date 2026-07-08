import { db } from './src/db/index.js';
import { settings } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const newSettings = [
  { key: 'contactTicaretUnvan', value: 'KERİM BİLGİSAYAR' },
  { key: 'contactAddress', value: 'ORHANTEPE MAH. İRFAN SK. NO: 14 B KARTAL/İSTANBUL' },
  { key: 'contactVergiDairesi', value: 'KARTAL' },
  { key: 'contactVkn', value: '5440221314' },
];

async function run() {
  for (const s of newSettings) {
    const existing = await db.select().from(settings).where(eq(settings.key, s.key));
    if (existing.length > 0) {
      await db.update(settings).set({ value: s.value }).where(eq(settings.key, s.key));
    } else {
      await db.insert(settings).values(s);
    }
  }
  console.log("Contact settings updated.");
  process.exit(0);
}
run();
