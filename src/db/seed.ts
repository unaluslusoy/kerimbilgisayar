import { db } from './index';
import { pages, services, campaigns } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log("Seeding started...");

  // 1. Pages
  const defaultPages = [
    {
      title: 'Hakkımızda',
      slug: 'hakkimizda',
      content: 'Kerim Bilgisayar, 15 yılı aşkın köklü sektörel tecrübesiyle, bireysel ve kurumsal paydaşlarına uçtan uca, yenilikçi ve yüksek standartlarda bilişim teknolojileri çözümleri sunmaktadır. Faaliyete başladığımız ilk günden itibaren, dinamik olarak değişen teknoloji dünyasında müşterilerimizin dijital olgunluk seviyelerini artırmayı ve dijital dönüşüm yolculuklarına stratejik rehberlik yapmayı misyon edindik.\n\nSistem ağ kurulumlarından veri kurtarmaya, kurumsal bakım anlaşmalarından profesyonel yazılım çözümlerine kadar geniş bir yelpazede hizmet veriyoruz.',
      metaDescription: 'Teknolojideki stratejik iş ortağınız olarak bireysel ve kurumsal IT altyapı çözümleri.',
      status: 'yayinlandi',
    },
    {
      title: 'Gizlilik Politikası',
      slug: 'gizlilik-politikasi',
      content: 'Bu gizlilik politikası, Kerim Bilgisayar olarak kişisel verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklamaktadır.\n\n### Veri Toplama\nSitemizi ziyaret ettiğinizde veya hizmetlerimizden yararlandığınızda bazı temel bilgileri toplayabiliriz.',
      metaDescription: 'Kerim Bilgisayar Gizlilik Politikası',
      status: 'yayinlandi',
    },
    {
      title: 'Hizmet Şartları',
      slug: 'sartlar',
      content: 'Lütfen web sitemizi ve hizmetlerimizi kullanmadan önce bu kullanım şartlarını dikkatlice okuyunuz.\n\nSitemizi kullanarak bu şartları kabul etmiş sayılırsınız.',
      metaDescription: 'Kullanım ve Hizmet Şartları',
      status: 'yayinlandi',
    }
  ];

  for (const p of defaultPages) {
    const existing = await db.select().from(pages).where(eq(pages.slug, p.slug));
    if (existing.length === 0) {
      await db.insert(pages).values(p as any);
      console.log(`Inserted page: ${p.slug}`);
    }
  }

  // 2. Services
  const defaultServices = [
    {
      name: "Ağ Tasarımı & Sistem Entegrasyonları",
      category: "ag_sistemleri",
      description: "Kurumsal ağ altyapı tasarımı, siber güvenlik yapılandırmaları, aktif cihaz kurulumları ve yapısal kablolama mühendisliği.",
      basePrice: "1000.00",
      isActive: true,
    },
    {
      name: "Özel Web & Yazılım Geliştirme",
      category: "yazilim",
      description: "İş süreçlerinizi dijitalleştiren, yüksek performanslı, ölçeklenebilir ve güvenli kurumsal web uygulamaları ve B2B/B2C e-ticaret platformları.",
      basePrice: "5000.00",
      isActive: true,
    },
    {
      name: "CCTV & Kapalı Devre Güvenlik",
      category: "guvenlik",
      description: "Yüksek çözünürlüklü IP kamera sistemleri, biyometrik geçiş kontrolleri ve 7/24 merkezi izleme merkezi (CCTV) kurulumları.",
      basePrice: "2000.00",
      isActive: true,
    },
    {
      name: "Kurumsal Bakım Anlaşmaları (SLA)",
      category: "danismanlik",
      description: "İş sürekliliğinizi garanti altına alan, periyodik önleyici bakım ve 7/24 acil müdahale garantili (SLA) kurumsal teknoloji ortaklığı.",
      basePrice: "1500.00",
      isActive: true,
    },
    {
      name: "Donanım Onarımı & Teknik Servis",
      category: "donanim",
      description: "Masaüstü, dizüstü ve sunucu mimarilerinde anakart seviyesinde mikro-lehimleme onarımları ve performans optimizasyonları.",
      basePrice: "500.00",
      isActive: true,
    },
    {
      name: "Kritik Veri Kurtarma Merkezleri",
      category: "diger",
      description: "Fiziksel hasarlı veya mantıksal çökmüş disklerden, RAID dizilerinden ve fidye yazılımı (Ransomware) saldırılarından veri kurtarma.",
      basePrice: "3000.00",
      isActive: true,
    }
  ];

  for (const s of defaultServices) {
    const existing = await db.select().from(services).where(eq(services.name, s.name));
    if (existing.length === 0) {
      await db.insert(services).values(s as any);
      console.log(`Inserted service: ${s.name}`);
    }
  }

  // 3. Campaigns
  const defaultCampaigns = [
    {
      title: "Yeni Kurulumlarda %20 İndirim",
      slug: "yeni-kurulum-indirimi",
      description: "Ağ ve sistem kurulumlarında ilk aya özel bakım anlaşması hediyesi.",
      imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
      discountRate: "20",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // +30 days
      status: 'aktif'
    }
  ];

  for (const c of defaultCampaigns) {
    const existing = await db.select().from(campaigns).where(eq(campaigns.title, c.title));
    if (existing.length === 0) {
      await db.insert(campaigns).values(c as any);
      console.log(`Inserted campaign: ${c.title}`);
    }
  }

  console.log("Seeding completed successfully.");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
