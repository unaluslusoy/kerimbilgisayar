import { db } from '../src/db/index';
import { deviceTypes, deviceTypeTests } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const PROFILES: {
  name: string;
  hasImei: boolean;
  hasPatternLock: boolean;
  lockLabel: string;
  variantLabel: string;
  variantPlaceholder: string;
  accessoriesHint: string;
  tests: string[];
}[] = [
  {
    name: 'Telefon', hasImei: true, hasPatternLock: true,
    lockLabel: 'Ekran PIN / Şifre', variantLabel: 'Kapasite', variantPlaceholder: '256 GB',
    accessoriesHint: 'Şarj aleti, kılıf, SIM kart, kutu...',
    tests: ['Ekran / Dokunmatik', 'Ön Kamera', 'Arka Kamera', 'Hoparlör', 'Ahize', 'Mikrofon', 'Şarj Soketi', 'Batarya', 'Wi-Fi / Bluetooth', 'SIM / Şebeke', 'Tuşlar / Sensörler', 'Parmak İzi / Face ID'],
  },
  {
    name: 'Tablet', hasImei: true, hasPatternLock: true,
    lockLabel: 'Ekran PIN / Şifre', variantLabel: 'Kapasite', variantPlaceholder: '128 GB',
    accessoriesHint: 'Şarj aleti, kalem, kılıf, klavye...',
    tests: ['Ekran / Dokunmatik', 'Kameralar', 'Hoparlör', 'Mikrofon', 'Şarj Soketi', 'Batarya', 'Wi-Fi / Bluetooth', 'SIM (varsa)', 'Tuşlar / Sensörler'],
  },
  {
    name: 'Notebook', hasImei: false, hasPatternLock: false,
    lockLabel: 'BIOS / Kullanıcı Şifresi', variantLabel: 'Konfigürasyon', variantPlaceholder: 'i7 / 16GB / 512GB SSD',
    accessoriesHint: 'Şarj adaptörü, çanta, mouse...',
    tests: ['Açılış / POST', 'Ekran / Panel', 'Klavye', 'Touchpad', 'Batarya', 'Şarj Adaptörü', 'USB / Portlar', 'Wi-Fi / Bluetooth', 'Kamera', 'Hoparlör / Mikrofon', 'Fan / Sıcaklık', 'Disk Sağlığı (SMART)', 'Menteşe / Kasa'],
  },
  {
    name: 'Masaüstü PC', hasImei: false, hasPatternLock: false,
    lockLabel: 'Kullanıcı Şifresi', variantLabel: 'Konfigürasyon', variantPlaceholder: 'Ryzen 5 / 32GB / RTX 4060',
    accessoriesHint: 'Güç kablosu, klavye, mouse (alındıysa)...',
    tests: ['Açılış / POST', 'Anakart', 'RAM Testi', 'Disk Sağlığı (SMART)', 'PSU', 'Ekran Kartı Çıkışı', 'USB / Portlar', 'Ethernet / Wi-Fi', 'Fan / Sıcaklık', 'Ses Çıkışı'],
  },
  {
    name: 'Televizyon', hasImei: false, hasPatternLock: false,
    lockLabel: 'Kilit / Ebeveyn PIN (varsa)', variantLabel: 'Ekran Boyutu', variantPlaceholder: '55"',
    accessoriesHint: 'Uzaktan kumanda, ayak + vidalar, güç kablosu...',
    tests: ['Panel / Görüntü', 'Ölü Piksel', 'Backlight', 'Hoparlör', 'HDMI Girişleri', 'USB Girişleri', 'Uzaktan Kumanda', 'Smart / Wi-Fi', 'Anten / Uydu Girişi', 'Güç Kartı'],
  },
  {
    name: 'Oyun Konsolu', hasImei: false, hasPatternLock: false,
    lockLabel: 'Hesap PIN (varsa)', variantLabel: 'Model / Sürüm', variantPlaceholder: 'PS5 Slim / Series X',
    accessoriesHint: 'Kol sayısı, HDMI + güç kablosu, oyun diski...',
    tests: ['Açılış', 'Disk Sürücü / Okuyucu', 'HDMI Çıkışı', 'USB Portlar', 'Kol Bağlantısı (BT)', 'Fan / Sıcaklık', 'Depolama', 'Wi-Fi / Ethernet'],
  },
  {
    name: 'Akıllı Saat', hasImei: true, hasPatternLock: false,
    lockLabel: 'Ekran PIN', variantLabel: 'Kasa Boyutu', variantPlaceholder: '44 mm',
    accessoriesHint: 'Şarj kablosu/dock, kordon...',
    tests: ['Ekran / Dokunmatik', 'Batarya', 'Şarj', 'Sensörler', 'Bluetooth', 'Tuş / Crown', 'Hoparlör / Titreşim'],
  },
  {
    name: 'Diğer', hasImei: false, hasPatternLock: false,
    lockLabel: 'Şifre / PIN (varsa)', variantLabel: 'Model Detayı', variantPlaceholder: '',
    accessoriesHint: 'Cihazla alınan tüm parçalar...',
    tests: ['Açılış / Güç', 'Temel Fonksiyon', 'Bağlantılar / Portlar', 'Fiziksel Bütünlük'],
  },
];

async function main() {
  for (let i = 0; i < PROFILES.length; i++) {
    const p = PROFILES[i];
    const existing = await db.select().from(deviceTypes).where(eq(deviceTypes.name, p.name)).limit(1);
    let deviceTypeId: number;
    if (existing.length > 0) {
      deviceTypeId = existing[0].id;
      await db.update(deviceTypes).set({
        hasImei: p.hasImei, hasPatternLock: p.hasPatternLock, lockLabel: p.lockLabel,
        variantLabel: p.variantLabel, variantPlaceholder: p.variantPlaceholder,
        accessoriesHint: p.accessoriesHint, sortOrder: i,
      }).where(eq(deviceTypes.id, deviceTypeId));
      console.log(`updated: ${p.name} (id=${deviceTypeId})`);
    } else {
      const res = await db.insert(deviceTypes).values({
        tenantId: 1, name: p.name, hasImei: p.hasImei, hasPatternLock: p.hasPatternLock,
        lockLabel: p.lockLabel, variantLabel: p.variantLabel, variantPlaceholder: p.variantPlaceholder,
        accessoriesHint: p.accessoriesHint, sortOrder: i,
      });
      deviceTypeId = (res[0] as any).insertId;
      console.log(`created: ${p.name} (id=${deviceTypeId})`);
    }

    // Test listesini tamamen yeniden yaz (idempotent seed)
    await db.delete(deviceTypeTests).where(eq(deviceTypeTests.deviceTypeId, deviceTypeId));
    for (let j = 0; j < p.tests.length; j++) {
      await db.insert(deviceTypeTests).values({ deviceTypeId, testName: p.tests[j], sortOrder: j });
    }
  }
  console.log('Seed tamamlandı.');
  process.exit(0);
}

main().catch((e) => { console.error('SEED ERROR:', e); process.exit(1); });
