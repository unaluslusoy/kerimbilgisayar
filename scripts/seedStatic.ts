import { db } from './src/db/index.js';
import { settings, testimonials, pages } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  console.log('Seeding data...');
  
  // 1. Settings (Hero & Features & Corporate/Gaming)
  const settingsData = [
    { key: 'homeHeroTitle', value: 'Teknolojide <span className="text-green-400">Kesintisiz Gücünüz</span>' },
    { key: 'homeHeroSubtitle', value: 'Profesyonel teknik servisten öteye geçiyoruz. Sistem kurulumları, ağ altyapıları, kurumsal web yazılımları ve entegre güvenlik çözümleriyle işinizi yarına taşıyan güvenilir teknoloji ortağınızız.' },
    { key: 'homeFeature1Title', value: 'Hızlı Müdahale ve Çözüm' },
    { key: 'homeFeature1Desc', value: 'İleri düzey arıza analizi, orijinal yedek parça güvencesi ve minimize edilmiş onarım süreleriyle yüksek hızlı teslimat.' },
    { key: 'homeFeature2Title', value: 'Hizmet Seviyesi Güvencesi (SLA)' },
    { key: 'homeFeature2Desc', value: 'Tüm entegrasyon, bakım anlaşmaları ve sistem kurulum işlemlerimizde resmi hizmet kalitesi ve servis garantisi.' },
    { key: 'homeFeature3Title', value: 'KVKK ve Bilgi Güvenliği' },
    { key: 'homeFeature3Desc', value: 'Veri kurtarma ve sistem yönetimi operasyonlarında uluslararası standartlarda gizlilik koruması ve tam KVKK/GDPR uyumluluğu.' },
    { key: 'homeGamingTitle', value: 'Profesyonel Gaming Sistemler' },
    { key: 'homeGamingDesc', value: 'Amatörden espor seviyesine kadar, bütçenize en uygun ve en yüksek performanslı oyuncu bilgisayarlarını topluyoruz. Termal optimizasyon, RGB kurulumu ve overclock destekleri ile rakiplerinizden bir adım önde olun.' },
    { key: 'homeGamingBullets', value: 'Özel Sıvı Soğutma Sistemleri, FPS Optimizasyonu & Test, Oyun Ekipmanı Tamirleri' },
    { key: 'homeGamingBtnText', value: 'Gaming Danışmanlığı Al' },
    { key: 'homeGamingBtnUrl', value: '/randevu' },
    { key: 'homeCorporateTitle', value: 'Kurumsal Bakım Anlaşmaları' },
    { key: 'homeCorporateDesc', value: 'İşletmenizin bilişim altyapısını güvence altına alın. Aylık düzenli bakım, anında uzak destek, server kurulumları ve ağ güvenliği çözümleriyle iş kesintilerinizi sıfıra indiriyoruz.' },
    { key: 'homeCorporateBullets', value: '7/24 Öncelikli Destek Hattı, KVKK Uyumlu Sunucu Yönetimi, Düzenli Veri Yedekleme' },
    { key: 'homeCorporateBtnText', value: 'Talep Oluştur' },
    { key: 'homeCorporateBtnUrl', value: '/randevu' },
  ];

  for (const s of settingsData) {
    const existing = await db.select().from(settings).where(eq(settings.key, s.key));
    if (existing.length === 0) {
      await db.insert(settings).values({ key: s.key, value: s.value });
    } else {
      await db.update(settings).set({ value: s.value }).where(eq(settings.key, s.key));
    }
  }

  // 2. Testimonials
  const testData = [
    { authorName: 'Mehmet Yılmaz', authorTitle: 'XYZ Lojistik A.Ş. - IT Direktörü', content: 'Merkez ve şube lokasyonlarımız arasındaki uçtan uca ağ (VPN) yapılandırmasını ve veri merkezi sistem odası kurulumumuzu Kerim Bilgisayar başarıyla tamamladı. Cihaz temininden entegrasyona kadar her aşamada sergilenen yüksek profesyonellik ve SLA standartlarına bağlılık takdire şayandı. Kesintisiz altyapı desteği sayesinde operasyonel süreçlerimiz tam kapasiteyle ve verimle çalışmaktadır.', rating: 5, status: 'yayinlandi' as const, tenantId: 1 },
    { authorName: 'Ayşe K.', authorTitle: 'ABC Mimarlık - Kurucu Ortak', content: 'Yeni genel ofisimize taşınma sürecimizde, yapısal kablolama projelerimizi, yedekli network altyapı tasarımını ve yüksek çözünürlüklü kapalı devre (CCTV) güvenlik sistemlerimizi sıfırdan projelendirip devreye aldılar. Tüm taşınma operasyonu iş kesintisi yaşanmadan titizlikle yönetildi.', rating: 5, status: 'yayinlandi' as const, tenantId: 1 },
    { authorName: 'Caner D.', authorTitle: 'E-Ticaret Girişimcisi', content: 'Sunucumuzda meydana gelen kritik veri kaybı krizinde, teknik ekipleri 7/24 esasıyla müdahalede bulunarak verilerimizin tamamını kayıpsız kurtardı. Bu başarılı operasyonun ardından kurdukları yedekli depolama ve felaket kurtarma (Disaster Recovery) sistemleri sayesinde bilişim altyapımız artık çok daha güvende.', rating: 5, status: 'yayinlandi' as const, tenantId: 1 }
  ];

  const currentTests = await db.select().from(testimonials);
  if (currentTests.length === 0) {
    for (const t of testData) {
      await db.insert(testimonials).values(t);
    }
  }

  console.log('Done!');
  process.exit(0);
}

run().catch(console.error);
