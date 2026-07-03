import { db } from './src/db/index.js';
import { settings } from './src/db/schema.js';
import { eq, inArray } from 'drizzle-orm';

const newSettings = [
  { key: 'contactMukellefAdi', value: 'YILMAZ KERİM' },
  { key: 'contactTicaretUnvan', value: 'KERİM BİLGİSAYAR' },
  { key: 'contactAddress', value: 'ORHANTEPE MAH. İRFAN SK. NO: 14 B KARTAL/İSTANBUL' },
  { key: 'contactVergiDairesi', value: 'KARTAL' },
  { key: 'contactVkn', value: '5440221314' },
];

const fieldsToDelete = ['contactFax', 'contactMersis', 'contactTicaretSicil', 'contactKep'];

async function run() {
  // Delete fields that shouldn't be there
  await db.delete(settings).where(inArray(settings.key, fieldsToDelete));

  for (const s of newSettings) {
    const existing = await db.select().from(settings).where(eq(settings.key, s.key));
    if (existing.length > 0) {
      await db.update(settings).set({ value: s.value }).where(eq(settings.key, s.key));
    } else {
      await db.insert(settings).values(s);
    }
  }
  console.log("Contact settings updated and cleaned.");
  process.exit(0);
}
run();
