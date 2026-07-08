import { db } from './src/db/index.js';
import { menus, menuItems } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function seedMenus() {
  console.log('Clearing existing menus...');
  await db.delete(menuItems).where(eq(menuItems.tenantId, 1));
  await db.delete(menus).where(eq(menus.tenantId, 1));

  console.log('Inserting menus...');
  await db.insert(menus).values([
    { tenantId: 1, name: 'Ana Menü (Header)', location: 'header' },
    { tenantId: 1, name: 'Kurumsal (Footer)', location: 'footer' },
    { tenantId: 1, name: 'Hızlı Bağlantılar (Footer)', location: 'footer_quick' },
    { tenantId: 1, name: 'Alt Bilgi (Footer Bottom)', location: 'footer_bottom' }
  ]);

  const allMenus = await db.select().from(menus).where(eq(menus.tenantId, 1));
  const hId = allMenus.find(m => m.location === 'header')?.id;
  const fId = allMenus.find(m => m.location === 'footer')?.id;
  const fqId = allMenus.find(m => m.location === 'footer_quick')?.id;
  const fbId = allMenus.find(m => m.location === 'footer_bottom')?.id;

  if (!hId || !fId || !fqId || !fbId) throw new Error('Could not find inserted menus');

  console.log('Inserting items...');

  // Header Menu
  await db.insert(menuItems).values([
    { tenantId: 1, menuId: hId, title: 'Anasayfa', url: '/', displayOrder: 1 },
    { tenantId: 1, menuId: hId, title: 'Kurumsal', url: '#', displayOrder: 2 },
    { tenantId: 1, menuId: hId, title: 'Çözümlerimiz', url: '#', displayOrder: 3 },
    { tenantId: 1, menuId: hId, title: 'Medya & Blog', url: '#', displayOrder: 4 },
    { tenantId: 1, menuId: hId, title: 'İletişim & Destek', url: '#', displayOrder: 5 }
  ]);

  const hItems = await db.select().from(menuItems).where(eq(menuItems.menuId, hId));
  const kurumsalId = hItems.find(i => i.title === 'Kurumsal')?.id;
  const cozumlerId = hItems.find(i => i.title === 'Çözümlerimiz')?.id;
  const medyaId = hItems.find(i => i.title === 'Medya & Blog')?.id;
  const iletisimId = hItems.find(i => i.title === 'İletişim & Destek')?.id;

  await db.insert(menuItems).values([
    // Kurumsal
    { tenantId: 1, menuId: hId, parentId: kurumsalId, title: 'Hakkımızda', url: '/hakkimizda', displayOrder: 1 },
    { tenantId: 1, menuId: hId, parentId: kurumsalId, title: 'Vizyon & Misyon', url: '/hakkimizda#vizyon-misyon', displayOrder: 2 },
    { tenantId: 1, menuId: hId, parentId: kurumsalId, title: 'S.S.S.', url: '/sss', displayOrder: 3 },
    
    // Çözümlerimiz
    { tenantId: 1, menuId: hId, parentId: cozumlerId, title: 'Yönetim Bilişim Sistemleri', url: '/hizmetler#ozel-yazilim-gelistirme', displayOrder: 1 },
    { tenantId: 1, menuId: hId, parentId: cozumlerId, title: 'Ağ ve Siber Güvenlik', url: '/hizmetler#guvenlik-cozumleri', displayOrder: 2 },
    { tenantId: 1, menuId: hId, parentId: cozumlerId, title: 'Sunucu ve Bulut Çözümleri', url: '/hizmetler#kurumsal-it-hizmetleri', displayOrder: 3 },

    // Medya & Blog
    { tenantId: 1, menuId: hId, parentId: medyaId, title: 'Teknoloji Blogu', url: '/blog', displayOrder: 1 },
    { tenantId: 1, menuId: hId, parentId: medyaId, title: 'Güncel Kampanyalar', url: '/kampanyalar', displayOrder: 2 },

    // İletişim & Destek
    { tenantId: 1, menuId: hId, parentId: iletisimId, title: 'İletişim Bilgileri', url: '/iletisim', displayOrder: 1 },
    { tenantId: 1, menuId: hId, parentId: iletisimId, title: 'Arıza Sorgulama', url: '/ariza-sorgulama', displayOrder: 2 }
  ]);

  // Footer Kurumsal Menu
  await db.insert(menuItems).values([
    { tenantId: 1, menuId: fId, title: 'Hakkımızda', url: '/hakkimizda', displayOrder: 1 },
    { tenantId: 1, menuId: fId, title: 'Sıkça Sorulan Sorular', url: '/sss', displayOrder: 2 },
    { tenantId: 1, menuId: fId, title: 'Kampanyalar', url: '/kampanyalar', displayOrder: 3 },
    { tenantId: 1, menuId: fId, title: 'İletişim', url: '/iletisim', displayOrder: 4 }
  ]);

  // Footer Hızlı Bağlantılar Menu
  await db.insert(menuItems).values([
    { tenantId: 1, menuId: fqId, title: 'Tüm Hizmetler', url: '/hizmetler', displayOrder: 1 },
    { tenantId: 1, menuId: fqId, title: 'Servis Randevusu', url: '/randevu', displayOrder: 2 },
    { tenantId: 1, menuId: fqId, title: 'Arıza Sorgulama', url: '/ariza-sorgulama', displayOrder: 3 },
    { tenantId: 1, menuId: fqId, title: 'Blog', url: '/blog', displayOrder: 4 }
  ]);

  // Footer Bottom (Legal) Menu
  await db.insert(menuItems).values([
    { tenantId: 1, menuId: fbId, title: 'KVKK Metni', url: '/kvkk', displayOrder: 1 },
    { tenantId: 1, menuId: fbId, title: 'Çerez Politikası', url: '/cerez-politikasi', displayOrder: 2 },
    { tenantId: 1, menuId: fbId, title: 'Gizlilik Politikası', url: '/gizlilik-politikalari', displayOrder: 3 },
    { tenantId: 1, menuId: fbId, title: 'Kullanım Koşulları', url: '/kullanim-kosullari', displayOrder: 4 }
  ]);

  console.log('Seed successful!');
  process.exit(0);
}

seedMenus().catch(console.error);
