import { db } from './src/db/index.js';
import { campaigns } from './src/db/schema.js';

async function main() {
  await db.insert(campaigns).values({
    tenantId: 1,
    title: 'Oyuncu (Gamer) Sistemlerinde %15 İndirim',
    slug: 'gamer-sistemleri-indirim',
    description: 'Yüksek performanslı Gamer (Oyuncu) bilgisayarları ve özel donanım ekipmanlarında yaza özel %15 indirim fırsatını kaçırmayın.',
    imageUrl: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&q=80',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2026-12-31'),
    discountRate: '15.00',
    status: 'aktif'
  });
  console.log('Campaign added successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
