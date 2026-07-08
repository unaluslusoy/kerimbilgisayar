import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './src/db/schema';
import { 
  tenants,
  settings, 
  pages, 
  blogPosts, 
  campaigns, 
  services,
  faqCategories,
  knowledgeBase,
  testimonials
} from './src/db/schema';
import { eq, and } from 'drizzle-orm';

async function seed() {
  console.log('Seeding data...');
  const conn = await mysql.createConnection('mysql://root:@127.0.0.1:3306/todestek_kerim?connectTimeout=10000');
  const db = drizzle(conn, { schema, mode: 'default' });
  
  // 1. Create a default tenant
  const tenantResult = await db.select().from(tenants).limit(1);
  let tenantId: number;
  if (tenantResult.length === 0) {
    const [res] = await db.insert(tenants).values({
      name: 'Kerim Bilgisayar',
      slug: 'kerim-bilgisayar',
      customDomain: 'kerimbilgisayar.com',
    });
    tenantId = res.insertId;
    console.log(`Tenant created with ID: ${tenantId}`);
  } else {
    tenantId = tenantResult[0].id;
    console.log(`Using existing Tenant ID: ${tenantId}`);
  }

  // 2. Settings (Contact Info, Socials, Maps API, SEO)
  const defaultSettings = [
    { tenantId, key: 'site_title', value: 'Kerim Bilgisayar', group: 'general' },
    { tenantId, key: 'site_description', value: 'Bireysel ve kurumsal IT altyapı çözümleri, proaktif bakım anlaşmaları, sistem entegrasyonu ve siber güvenlik hizmetleri.', group: 'seo' },
    { tenantId, key: 'contact_email', value: 'info@kerimbilgisayar.com', group: 'contact' },
    { tenantId, key: 'contact_phone', value: '+90 850 123 45 67', group: 'contact' },
    { tenantId, key: 'contact_address', value: 'Teknoloji Plaza Kat: 4, Bilişim Sokak, Kadıköy / İstanbul', group: 'contact' },
    { tenantId, key: 'social_facebook', value: 'https://facebook.com', group: 'social' },
    { tenantId, key: 'social_instagram', value: 'https://instagram.com', group: 'social' },
    { tenantId, key: 'social_twitter', value: 'https://twitter.com', group: 'social' },
    { tenantId, key: 'google_maps_api_key', value: '', group: 'api' }, // Empty for now
    { tenantId, key: 'whatsapp_number', value: '+905551234567', group: 'contact' },
    { tenantId, key: 'timezone', value: 'Europe/Istanbul', group: 'general' },
    { tenantId, key: 'logo_url', value: '', group: 'design' }, // User can upload
  ];
  for (const s of defaultSettings) {
    const existing = await db.select().from(settings).where(eq(settings.key, s.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(settings).values(s);
    }
  }
  console.log('Settings seeded.');

  // 3. Pages
  const defaultPages = [
    {
      tenantId,
      title: 'Hakkımızda',
      slug: 'hakkimizda',
      content: '## Biz Kimiz?\n\nKerim Bilgisayar, 15 yılı aşkın köklü sektörel tecrübesiyle, bireysel ve kurumsal paydaşlarına uçtan uca, yenilikçi ve yüksek standartlarda bilişim teknolojileri çözümleri sunmaktadır.',
      status: 'yayinlandi' as const,
      isSystem: true
    },
    {
      tenantId,
      title: 'KVKK Aydınlatma Metni',
      slug: 'kvkk',
      content: `
        <h2>1. Veri Sorumlusunun Kimliği</h2>
        <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("Kanun") uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla Kerim Bilgisayar tarafından aşağıda açıklanan kapsamda işlenebilecektir.</p>
        
        <h2>2. Kişisel Verilerin İşlenme Amacı</h2>
        <p>Toplanan kişisel verileriniz; sunmakta olduğumuz kurumsal bilişim çözümleri, SLA hizmetleri ve entegrasyon süreçlerinin kesintisiz yürütülmesi, kayıt ve belgelerin düzenlenmesi, yerel ve uluslararası yasal mevzuatın öngördüğü bilgi saklama, raporlama, bilgilendirme yükümlülüklerine uyulması ve sözleşme gerekliliklerinin yerine getirilmesi amacıyla işlenmektedir.</p>
        
        <h2>3. Kişisel Verilerin Aktarımı</h2>
        <p>Kişisel verileriniz, yasal zorunluluklar haricinde hiçbir üçüncü taraf ile ticari veri paylaşımına konu edilmemektedir. Kanuni yükümlülüklerimiz dahilinde, resmi kurum ve kuruluşlarla veya yetkili iş ortaklarımızla (Microsoft, Google vb. lisanslama süreçlerinde) sınırlı olarak paylaşılabilir.</p>

        <h2>4. İlgili Kişinin Kanun'un 11. Maddesinde Sayılan Hakları</h2>
        <ul>
          <li>Kişisel veri işlenip işlenmediğini öğrenme,</li>
          <li>Kişisel verileri işlenmişse buna ilişkin bilgi talep etme,</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme haklarına sahipsiniz.</li>
        </ul>
      `,
      status: 'yayinlandi' as const,
      isSystem: true
    },
    {
      tenantId,
      title: 'Çerez (Cookie) Politikası',
      slug: 'cerez-politikasi',
      content: `
        <h2>1. Çerez (Cookie) Nedir?</h2>
        <p>Çerezler, ziyaret ettiğiniz web siteleri tarafından cihazınıza (bilgisayar, telefon, tablet) kaydedilen küçük metin dosyalarıdır. Sitemizin kullanıcı dostu bir deneyim sunması için elzemdir.</p>
        
        <h2>2. Hangi Çerezleri Kullanıyoruz?</h2>
        <ul>
          <li><strong>Zorunlu Çerezler:</strong> Web sitesinin çalışması için gerekli olan ve sistemlerimizde kapatılamayan çerezlerdir.</li>
          <li><strong>Performans Çerezleri:</strong> Ziyaretçi sayısını ve trafik kaynaklarını ölçmemizi sağlar.</li>
          <li><strong>İşlevsel Çerezler:</strong> Sitenin gelişmiş işlevsellik ve kişiselleştirme sunmasına olanak tanır.</li>
        </ul>
        
        <h2>3. Çerez Yönetimi</h2>
        <p>Tarayıcınızın ayarlarını değiştirerek çerezlere ilişkin tercihlerinizi kişiselleştirebilirsiniz. Çerezleri tamamen engellemeniz durumunda sitemizin bazı fonksiyonlarının çalışmayabileceğini hatırlatmak isteriz.</p>
      `,
      status: 'yayinlandi' as const,
      isSystem: true
    },
    {
      tenantId,
      title: 'Sistem ve Veri Güvenliği Politikası',
      slug: 'sistem-guvenligi',
      content: `
        <h2>1. Altyapı Güvenliği</h2>
        <p>Kerim Bilgisayar sunucuları, endüstri standardı güvenlik duvarları (Firewall) ve Saldırı Tespit/Önleme Sistemleri (IDS/IPS) ile korunmaktadır. Paydaşlarımızın ve müşterilerimizin verileri, izole edilmiş güvenli sanal ağlarda (VLAN) ve en son güvenlik standartlarına uygun olarak barındırılmaktadır.</p>
        
        <h2>2. Veri Şifreleme ve SSL</h2>
        <p>Web sitemiz ve tüm API iletişimlerimiz 256-bit SSL/TLS teknolojisi ile şifrelenmektedir. Parolalarınız veritabanımızda tek yönlü (hash) olarak şifrelenmiş halde saklanır.</p>

        <h2>3. Yedekleme Politikası</h2>
        <p>Sistemlerimiz günlük, haftalık ve aylık periyotlarla yedeklenmekte olup, felaket kurtarma senaryolarına (Disaster Recovery) karşı coğrafi olarak farklı veri merkezlerinde kopyalanmaktadır.</p>
      `,
      status: 'yayinlandi' as const,
      isSystem: true
    },
    {
      tenantId,
      title: 'Telif Hakkı',
      slug: 'telif-hakki',
      content: `
        <h2>1. Fikrî Mülkiyet Hakları</h2>
        <p>Kerim Bilgisayar web sitesinde ("Site") yer alan tüm metinler, görseller, logolar, grafikler, ses dosyaları, animasyonlar, kodlar ve tasarımın telif hakları Kerim Bilgisayar'a aittir ve ulusal/uluslararası telif hakkı kanunları ile korunmaktadır.</p>
        
        <h2>2. Kullanım Sınırları</h2>
        <p>Sitede bulunan hiçbir materyal; önceden yazılı izin alınmaksızın kopyalanamaz, çoğaltılamaz, yeniden yayımlanamaz, başka bir bilgisayara yüklenemez, postalanamaz veya ticari bir amaçla kullanılamaz.</p>

        <h2>3. İhlal Durumu</h2>
        <p>Telif haklarının ihlali durumunda, Kerim Bilgisayar her türlü hukuki ve cezai yola başvurma hakkını saklı tutar.</p>
      `,
      status: 'yayinlandi' as const,
      isSystem: true
    },
    {
      tenantId,
      title: 'Gizlilik Politikaları',
      slug: 'gizlilik-politikalari',
      content: `
        <h2>1. Gizlilik Taahhüdü</h2>
        <p>Kerim Bilgisayar olarak, müşterilerimizin ve ziyaretçilerimizin gizliliğine en yüksek düzeyde saygı duyuyoruz. Formlar aracılığıyla bize ilettiğiniz hiçbir bilgi, bilginiz ve onayınız dışında üçüncü şahıs veya kurumlarla satılamaz, kiralanamaz veya paylaşılamaz.</p>
        
        <h2>2. İletişim Formları ve Kayıtlar</h2>
        <p>Servis talebi veya iletişim formu doldurduğunuzda, sadece size daha iyi hizmet vermek ve talebinizi yanıtlamak amacıyla isim, e-posta, telefon ve cihaz bilgilerinizi alırız.</p>
        
        <h2>3. Dış Bağlantılar</h2>
        <p>Sitemiz üzerinden farklı web sitelerine bağlantı (link) verilebilir. Kerim Bilgisayar, bağlantı verilen sitelerin gizlilik politikalarından veya içeriklerinden sorumlu tutulamaz.</p>
      `,
      status: 'yayinlandi' as const,
      isSystem: true
    },
    {
      tenantId,
      title: 'Kişisel Veriler',
      slug: 'kisisel-veriler',
      content: `
        <h2>1. Kişisel Veri Toplama Yöntemleri</h2>
        <p>Kişisel verileriniz; web sitemiz, çağrı merkezimiz, e-posta, SMS ve benzeri dijital ve basılı ortamlar üzerinden sözlü, yazılı veya elektronik ortamda toplanabilir.</p>
        
        <h2>2. Veri Saklama ve İmha</h2>
        <p>Hizmet sözleşmesinin sona ermesi veya kanuni saklama sürelerinin dolması halinde, kişisel verileriniz Kerim Bilgisayar tarafından periyodik imha politikasına uygun olarak silinir, yok edilir veya anonim hale getirilir.</p>
      `,
      status: 'yayinlandi' as const,
      isSystem: true
    },
    {
      tenantId,
      title: 'E-Posta Hukuki Hüküm ve Şartlar',
      slug: 'posta-hukuki-hukum-ve-sartlar',
      content: `
        <h2>1. E-Posta İletişiminin Sınırları</h2>
        <p>Kerim Bilgisayar uzantılı e-posta adreslerinden (@kerimbilgisayar.com) gönderilen mesajlar, sadece gönderilen kişi veya kuruma özeldir ve gizli bilgiler içerebilir.</p>
        
        <h2>2. Sorumluluk Reddi</h2>
        <p>E-posta iletişimlerinde virüs ve zararlı yazılımların bulaşmaması için gerekli tedbirler alınmış olmakla birlikte, mesajın sisteminize verebileceği olası zararlardan Kerim Bilgisayar sorumlu tutulamaz.</p>

        <h2>3. Hatalı Alım</h2>
        <p>Eğer bu e-postanın muhatabı değilseniz, mesajın içeriğini kopyalamanız, dağıtmanız veya kullanmanız kesinlikle yasaktır. Lütfen mesajı derhal silerek göndericiyi bilgilendiriniz.</p>
      `,
      status: 'yayinlandi' as const,
      isSystem: true
    },
    {
      tenantId,
      title: 'Kullanım Koşulları',
      slug: 'kullanim-kosullari',
      content: `
        <h2>1. Kabul ve Değişiklikler</h2>
        <p>Bu web sitesini ziyaret ederek, aşağıdaki kullanım koşullarını kabul etmiş sayılırsınız. Kerim Bilgisayar, bu koşulları önceden haber vermeksizin tek taraflı olarak değiştirme hakkını saklı tutar.</p>
        
        <h2>2. Site İçeriği ve Hatalar</h2>
        <p>Sitede yer alan teknik bilgiler, servis fiyatları veya hizmet açıklamaları bilgi amaçlıdır. Yazım veya güncelleme hatalarından dolayı Kerim Bilgisayar sorumlu tutulamaz.</p>
        
        <h2>3. Hizmet Kesintileri</h2>
        <p>Web sitesinin bakım, güncelleme veya teknik arızalar nedeniyle geçici olarak kullanım dışı kalması durumunda ziyaretçilerin uğrayabileceği veri kayıplarından şirketimiz sorumlu değildir.</p>
      `,
      status: 'yayinlandi' as const,
      isSystem: true
    },
    {
      tenantId,
      title: 'Aydınlatma Metni',
      slug: 'aydinlatma-metni',
      content: `
        <h2>Aydınlatma Metni (Genel Kapsam)</h2>
        <p>Sayın Ziyaretçimiz, Kerim Bilgisayar web sitesini kullanımınız esnasında elde edilen verileriniz, tamamen yasal mevzuata uygun şekilde ve yalnızca size daha iyi teknik destek sunabilmek amacıyla toplanmaktadır.</p>
        <p>Hizmetlerimiz (Server kurulumu, güvenlik sistemleri, bilgisayar onarımı) için talep oluşturduğunuz an itibariyle, verdiğiniz iletişim bilgileri iş süreçlerinin yürütülmesi (teknik servis kaydı oluşturma, randevu takibi) amacıyla kayıt altına alınır.</p>
        <p>Daha detaylı bilgi için lütfen <strong>KVKK Aydınlatma Metni</strong> sayfamızı inceleyiniz.</p>
      `,
      status: 'yayinlandi' as const,
      isSystem: true
    }
  ];
  for (const page of defaultPages) {
    const existing = await db.select().from(pages).where(eq(pages.slug, page.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(pages).values(page);
    } else {
      await db.update(pages).set(page).where(eq(pages.slug, page.slug));
    }
  }
  console.log('Pages seeded.');

  // 4. Services
  const defaultServices = [
    {
      tenantId,
      name: 'Ağ Tasarımı & Sistem Entegrasyonları',
      description: 'Kurumsal ağ altyapı tasarımı, siber güvenlik yapılandırmaları (Next-Gen Firewall), aktif cihaz kurulumları ve yapısal kablolama mühendisliği.',
      category: 'ag_sistemleri' as const,
    },
    {
      tenantId,
      name: 'Kurumsal Web & E-Ticaret Yazılımları',
      description: 'Dönüşüm odaklı B2B/B2C e-ticaret platformları, prestijli kurumsal web projeleri ve işletmenize özel ölçeklenebilir web uygulamaları.',
      category: 'yazilim' as const,
    },
    {
      tenantId,
      name: 'Entegre Güvenlik & PDKS Çözümleri',
      description: 'Yetkili Hikvision iş ortağı sıfatıyla kapalı devre (CCTV) kamera izleme, akıllı görüntü analiz ve personel geçiş kontrol (PDKS) sistemleri tasarımı.',
      category: 'guvenlik' as const,
    },
    {
      tenantId,
      name: 'Kurumsal BT Danışmanlığı & SLA',
      description: 'Mevcut yazılımsal altyapınız için SLA standartlarında bakım-destek, Microsoft/Google lisanslama mimarisi ve BT süreç danışmanlığı.',
      category: 'donanim' as const,
    }
  ];
  for (const serv of defaultServices) {
    const existing = await db.select().from(services).where(eq(services.name, serv.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(services).values(serv);
    }
  }
  console.log('Services seeded.');

  // 5. Blog
  const defaultBlogs = [
    {
      tenantId,
      slug: 'kartal-bilgisayar-tamiri-it-destek',
      title: 'Kartal Bilişim Teknolojileri ve Kurumsal IT Destek Çözümleri',
      excerpt: 'Kartal bölgesinde altyapı kurulumu, yedekli network ve sunucu bakım anlaşmaları için neden Kerim Bilgisayar\'ı seçmelisiniz? Yerinde proaktif teknik servis ayrıcalıkları.',
      imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&q=80&w=800',
      category: 'Teknik Servis',
      content: `İstanbul Kartal bölgesinde faaliyet gösteren işletmeler veya bireysel kullanıcılar için güvenilir bilgisayar tamir servisi ve uzun vadeli IT destek hizmetleri bulmak zaman zaman zorlaşabiliyor. Peki neden yerel bir IT partneri ile çalışmalısınız?

## Yerinde Teknik Servisin Avantajları

Arıza durumunda bilgisayarlarınızı veya çevresel birimlerinizi kucaklayıp teknik servise taşımak hem zaman kaybına hem de veri güvenliği risklerine sebep olabilir. Kurumsal bakım anlaşmamız kapsamında Kartal, Pendik, Maltepe bölgesindeki müşterilerimize olay yerine **2 saat içerisinde müdahale** garantisi veriyoruz.

### Kurumsal Bakım Anlaşması Nedir?

Bakım anlaşması (SLA), şirketinizdeki tüm teknolojik altyapının (bilgisayarlar, sunucular, yazıcılar ve ağ mimarisi) uzman bir ekip tarafından aylık veya yıllık bazda düzenli olarak denetlenmesi sürecidir.

* Olası donanım arızaları yaşanmadan önce tespit edilir.
* Ağ (Network) verimliliği ölçülür ve optimize edilir.
* Kritik firma verileri düzenli otomatik olarak yedeklenir.

> "Bilgisayar sistemleriniz için kriz anını beklemeyin, proaktif bakım süreçleri sayesinde operasyonunuzun kesintiye uğramasını %90 oranında engelleyebilirsiniz."

Kartal bilgisayar tamiri ve kurumsal bakım hizmetlerimiz hakkında detaylı bilgi, yerinde keşif veya firmanıza özel fiyat teklifi almak istiyorsanız iletişim sayfamızdan bize ulaşabilirsiniz.`,
      status: 'yayinlandi' as const,
      publishedAt: new Date()
    },
    {
      tenantId,
      slug: 'kurumsal-ag-guvenligi',
      title: 'Kurumsal Ağ Altyapılarında Güvenlik Stratejileri',
      excerpt: 'Modern işletmelerde veri güvenliği ve ağ erişim kontrolü için alınması gereken kritik önlemler nelerdir? Bilişim altyapınızı nasıl koruyabilirsiniz?',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800',
      category: 'Ağ & Güvenlik',
      content: `Kurumunuz için kurduğunuz ağ sadece kablolar ve cihazlardan ibaret değil. İşletmenizin dijital kalbi olan altyapıların, günümüzün sofistike siber saldırılarına karşı korunması KVKK standartlarına uyum açısından büyük önem taşıyor.

## Güvenlik Duvarı (Firewall) Seçimi

Ağ trafiğinizi izleyen ve kötü amaçlı yazılımları, yetkisiz erişimleri dışarıda tutan güçlü bir güvenlik duvarı hattı oluşturmak ilk adımdır. Yeni nesil firewall sistemleri, şirket dışı çalışan personelin de (VPN aracılığıyla) şirket ağına güvenli bir şekilde bağlanmasına olanak tanır.

### Ağ Bölümlendirme (Network Segmentation)

Şirket içerisindeki misafir ağını (Guest Wi-Fi), güvenlik kamerasını (CCTV ağı), operasyon veri trafiğini ve depo/üretim ağını birbirinden sanal olarak (VLAN) ayırmak risk yönetiminin kritik bir parçasıdır. Bir ağa bulaşan bir fidye yazılımı (Ransomware), doğru yapılandırılmış ağlarda diğer bölümlere sıçrayamaz.

> "Güvenlik sadece yazılım veya donanım yatırımı değil, bir süreç ve kültür meselesidir."

Sisteminiz ne kadar güncel olursa olsun, şirket içerisinde alınacak periyodik güvenlik eğitimleri ve proaktif destek stratejisine ihtiyacınız var. Kerim Bilgisayar olarak ağ güvenliği mimarinizi baştan uca projelendiriyor ve test ediyoruz.`,
      status: 'yayinlandi' as const,
      publishedAt: new Date()
    },
    {
      tenantId,
      slug: 'hikvision-ruijie-guvenlik',
      title: 'Hikvision ve Ruijie Çözümleriyle Tam Kapsamlı Güvenlik',
      excerpt: 'Kurumsal ofisler ve fabrikalar için entegre geçiş sistemleri, IP kamera planlaması ve ağ yedekleme mimarisinin kurulum adımları.',
      imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=800',
      category: 'CCTV & Geçiş',
      content: `Zayıf akım sistemlerinde, IP tabanlı kameraların verimli ve kesilmesiz izlenebilmesi için güçlü bir ağ omurgası şarttır. Sektör öncülerinden Hikvision ve Ruijie'nin gücü ile tam kapsamlı güvenlik ve network çözümleri alanındaki en iyi pratikleri inceliyoruz.

## CCTV Sistemleri ve Network Yükü

Özellikle yüksek çözünürlüklü IP kameralar sürekli ağ üzerinde yüksek bant genişliği tüketir. Yanlış tasarlanmış yerel ağ (LAN) yapılarında görüntüde donmalar ve gecikmeler yaşanması kaçınılmazdır. Burada Ruijie'nin bulut yönetimli akıllı switch (Anahtar) çözümleri devreye girmektedir. PoE switch mimarileri sayesinde hem güç hem veri aktarımı aynı kablo üzerinden tek merkezden yönetilebilir.

### Hikvision Akıllı Analiz Teknolojileri

Güvenlik kameraları sadece kayıt alan cihazlar olmaktan çıktı. Kerim Bilgisayar olarak kurduğumuz Hikvision AcuSense ve ColorVu teknolojisine sahip kameralar şunları sağlar:

* Yüz Tanıma ve Plaka Okuma (PTS) sistemi ile otomatik bariyer entegrasyonu.
* Sanal sınır ihlallerinde insan ve araç tiplerini yapay zeka ile %98 doğrulukla tespit edebilme.
* Karanlık ortamlarda 7/24 tam renkli ve net video kaydı alma izni sağlayan ColorVu sistemi.

> "Doğru kameraları, yanlış ağ altyapısıyla çalıştıramazsınız. Zayıf akım and network çözümleri birbirinden bağımsız düşünülemeyecek bütünsel bir güvenlik paketidir."

Ruijie ürünlerinin endüstriyel dayanıklılığı ve Hikvision'un entegre ekosistemi, işletmenizin uçtan uca koruma altında olmasını sağlar. Ücretsiz keşif ve demo kurulum talepleriniz için uzman saha ekibimiz hizmetinize hazırdır.`,
      status: 'yayinlandi' as const,
      publishedAt: new Date()
    },
    {
      tenantId,
      slug: 'e-ticaret-altyapisi',
      title: 'E-Ticarette Dönüşüm Oranını Artıran Altyapı Çözümleri',
      excerpt: 'Web sitenizin hızı, güvenlik sertifikaları ve sunucu performansı e-ticaret satışlarınızı nasıl etkiler? Teknik detayları inceliyoruz.',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
      category: 'Web & E-Ticaret',
      content: `Dijital vitrininiz olan E-ticaret platformunuzun yavaş açılması veya potansiyel güvenlik açıklarına sahip olması dönüşüm oranlarınızı ciddi ölçüde düşürür. Ziyaretçiler beklerken her saniye şirketiniz için gelir kaybı demektir.

## Sunucu Yanıt Süresi ve CDN Entegrasyonu

İyi bir e-ticaret performansı için sunucu yanıt süreleri (TTFB) oldukça düşük olmalıdır. İçerik Dağıtım Ağları (CDN) sayesinde mağazanızdaki yüksek çözünürlüklü ürün görselleri ziyaretçilerinize coğrafi olarak en yakın merkez üzerinden hızlıca gönderilir.

### Mobil Uyumluluk (Responsive Design)

E-ticaret trafiğinin büyük bir kısmı mobil cihazlardan gelmektedir. Sitenizin mobil cihazlarda kusursuz çalışması, Google gibi arama motorlarında üst sıralara çıkmanıza (Mobile-First Indexing) yardımcı olur.

> "Müşterilerinizin güvenini kazanmak için yüksek güvenlik standartları ve modern ödeme altyapıları ile donatılmış profesyonel bir B2B/B2C altyapısına yatırım yapmalısınız."

Özel web yazılımı ve e-ticaret çözümlerimiz ile markanızı internette en iyi şekilde temsil ediyor, satışlarınızı artırıyoruz.`,
      status: 'yayinlandi' as const,
      publishedAt: new Date()
    },
    {
      tenantId,
      slug: 'ssd-yukseltme-rehberi',
      title: 'SSD Donanım Güncellemeleriyle Kurumsal Cihaz Ömrünün ve Verimliliğinin Artırılması',
      excerpt: 'Eski donanım varlıklarınızı ıskartaya çıkarmadan önce bilmeniz gerekenler. Doğru donanım optimizasyonları ile yüksek performans kazanımları.',
      imageUrl: 'https://images.unsplash.com/photo-1593640498182-41c70f44115c?auto=format&fit=crop&q=80&w=800',
      category: 'Donanım',
      content: `Ofis bilgisayarlarınızın yavaş çalışması günlük personel verimliliğini ciddi şekilde baltalayabilir. Yeni donanım yatırımlarına yüksek bütçeler ayırmadan önce eski donanımları hayata döndürmenin bir yolu var: SSD Terfisi.

## Hız Faktörü

Geleneksel HDD mekanik disklerde çalışma süreleri ilerledikçe yavaşlama veya veri kaybı başlar. Flash tabanlı katı hal sürücüleri (SSD'ler) mekanik bir parça içermediği için okuma yazma hızlarını 10 ila 30 kat arasında artırabilirler. Windows'un hızlı açılması, veri aktarımlarının çabuklaşması için en kesin çözümdür.

### Maliyet Etkinliği

Sistemi tamamen değiştirmek yerine bellek (RAM) ve SSD takviyesi yapmak, çoğu durumda ofis ve genel amaçlı kullanım için fazlasıyla yeterlidir.

> "Bozulduğunu düşündüğünüz bilgisayarınızın tek ihtiyacı olan şey doğru bir donanım optimizasyonu olabilir."

Uzman teknik ekibimiz cihazınızı incelesin ve ihtiyacınıza uygun yükseltme işlemini veri kaybı olmadan gerçekleştirsin.`,
      status: 'yayinlandi' as const,
      publishedAt: new Date()
    }
  ];
  for (const b of defaultBlogs) {
    const existing = await db.select().from(blogPosts).where(eq(blogPosts.slug, b.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(blogPosts).values(b);
    } else {
      await db.update(blogPosts).set(b).where(eq(blogPosts.slug, b.slug));
    }
  }
  console.log('Blogs seeded.');

  // 6. Campaigns
  const defaultCampaigns = [
    {
      tenantId,
      title: 'SLA Kurumsal Bakım Anlaşmalarında İlk Yıla Özel %20 Avantaj',
      slug: 'yillik-bakim-firsati',
      description: 'Kerim Bilgisayar ile teknolojik iş ortaklığına ilk kez adım atan işletmelere özel, Kapsamlı Kurumsal Bakım Anlaşmalarında (SLA) net %20 indirim avantajı sunuyoruz.',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      discountRate: '20.00',
      status: 'aktif' as const,
      imageUrl: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&q=80',
    }
  ];
  for (const c of defaultCampaigns) {
    const existing = await db.select().from(campaigns).where(eq(campaigns.slug, c.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(campaigns).values(c);
    }
  }
  console.log('Campaigns seeded.');

  // 7. Testimonials
  const testits = [
    {
      name: "Mehmet Yılmaz",
      role: "XYZ Lojistik A.Ş. - IT Direktörü",
      comment: "Merkez ve şube lokasyonlarımız arasındaki uçtan uca ağ (VPN) yapılandırmasını ve veri merkezi sistem odası kurulumumuzu Kerim Bilgisayar başarıyla tamamladı. Cihaz temininden entegrasyona kadar her aşamada sergilenen yüksek profesyonellik ve SLA standartlarına bağlılık takdire şayandı. Kesintisiz altyapı desteği sayesinde operasyonel süreçlerimiz tam kapasiteyle ve verimle çalışmaktadır."
    },
    {
      name: "Ayşe K.",
      role: "ABC Mimarlık - Kurucu Ortak",
      comment: "Yeni genel ofisimize taşınma sürecimizde, yapısal kablolama projelerimizi, yedekli network altyapı tasarımını ve yüksek çözünürlüklü kapalı devre (CCTV) güvenlik sistemlerimizi sıfırdan projelendirip devreye aldılar. Tüm taşınma operasyonu iş kesintisi yaşanmadan titizlikle yönetildi."
    },
    {
      name: "Caner D.",
      role: "E-Ticaret Girişimcisi",
      comment: "Sunucumuzda meydana gelen kritik veri kaybı krizinde, teknik ekipleri 7/24 esasıyla müdahalede bulunarak verilerimizin tamamını kayıpsız kurtardı. Bu başarılı operasyonun ardından kurdukları yedekli depolama ve felaket kurtarma (Disaster Recovery) sistemleri sayesinde bilişim altyapımız artık çok daha güvende."
    }
  ];
  for (let i = 0; i < testits.length; i++) {
    const t = testits[i];
    const existing = await db.select().from(testimonials)
      .where(and(
        eq(testimonials.authorName, t.name),
        eq(testimonials.content, t.comment)
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(testimonials).values({
        tenantId,
        authorName: t.name,
        authorTitle: t.role,
        content: t.comment,
        rating: 5,
        status: 'yayinlandi',
        displayOrder: i + 1
      });
    }
  }
  console.log('Testimonials seeded.');

  // 8. FAQs
  const defaultFAQs = [
    {
      categoryName: "Teknik Servis ve Randevu",
      icon: "HelpCircle",
      questions: [
        { question: "Teknik servis ve laboratuvar onarım süreciniz nasıl işliyor?", answer: "Cihazınız teknik laboratuvarımıza ulaştığı andan itibaren öncelikle detaylı bir arıza tespit ve performans analizine tabi tutulur. Hazırlanan ekspertiz raporu doğrultusunda maliyet ve onarım süresi onayınıza sunulur. Onayınızı takiben, orijinal yedek parça güvencesiyle onarım süreci başlatılır." },
        { question: "Randevu almadan yerinde destek veya cihaz teslimi gerçekleştirebilir miyim?", answer: "Cihazlarınızı servis merkezimize doğrudan getirebilirsiniz. Ancak operasyonel yoğunluğu minimize etmek ve bekleme sürenizi azaltmak adına, web sitemiz üzerinden randevu oluşturmanızı önemle tavsiye ederiz." },
        { question: "Uzaktan bağlantı (Remote Support) ile teknik destek veriyor musunuz?", answer: "Evet. Kurumsal SLA (Hizmet Seviyesi Anlaşması) kapsamındaki müşterilerimize ve yazılımsal destek taleplerine, yüksek güvenlikli uzak bağlantı protokolleri aracılığıyla anında müdahale edip çözüm sunmaktayız." }
      ]
    },
    {
      categoryName: "Kurumsal Çözümler & Altyapı",
      icon: "Server",
      questions: [
        { question: "Kurumsal bakım anlaşması (SLA) şartları nelerdir?", answer: "SLA kapsamında firmanızın bilgisayar sayısına ve kritiklik düzeyine göre aylık veya yıllık bakım planları sunuyoruz. Kesintisiz 7/24 veya mesai içi müdahale seçeneklerimiz mevcuttur." },
        { question: "Sunucu (Server) kurulumları ne kadar sürüyor?", answer: "İhtiyaca göre değişmekle birlikte, standart bir Active Directory, Dosya Sunucusu ve yedekleme yapılandırması genellikle 1-3 iş günü içerisinde tamamlanmaktadır." },
        { question: "Güvenlik kamerası sistemleri garantili mi?", answer: "Evet, yetkili Hikvision iş ortağı olarak kurduğumuz tüm güvenlik ve kapalı devre (CCTV) sistemlerinde minimum 2 yıl donanım garantisi sunmaktayız." }
      ]
    }
  ];

  for (let idx = 0; idx < defaultFAQs.length; idx++) {
    const fcat = defaultFAQs[idx];
    let catId: number;

    const existingCat = await db.select().from(faqCategories)
      .where(eq(faqCategories.name, fcat.categoryName))
      .limit(1);

    if (existingCat.length > 0) {
      catId = existingCat[0].id;
    } else {
      const [res] = await db.insert(faqCategories).values({
        tenantId,
        name: fcat.categoryName,
        icon: fcat.icon,
        displayOrder: idx + 1
      });
      catId = res.insertId;
    }

    for (const q of fcat.questions) {
      const existingQ = await db.select().from(knowledgeBase)
        .where(and(
          eq(knowledgeBase.categoryId, catId),
          eq(knowledgeBase.question, q.question)
        ))
        .limit(1);

      if (existingQ.length === 0) {
        await db.insert(knowledgeBase).values({
          tenantId,
          categoryId: catId,
          question: q.question,
          answer: q.answer,
          status: 'yayinlandi'
        });
      }
    }
  }
  console.log('FAQs seeded.');

  console.log('Process finished.');
  process.exit(0);
}

seed().catch(console.error);
