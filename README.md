<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9dae6590-8bfc-4379-83b7-0fd063358294

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## 🚨 Önemli Canlı Ortam ve Dağıtım Kuralları (Critical Production Rules)

Canlı ortamın çökmesini ve kararsız çalışmasını önlemek için geliştirme yaparken aşağıdaki hususlara mutlaka dikkat edilmelidir:

### 1. Veritabanı Bağlantısı (DATABASE_HOST)
* **Kural:** Canlı ortamda `DATABASE_HOST` adresi olarak **asla** uzak IP adresi olan `45.43.152.5` kullanılmamalıdır.
* **Gerekçe:** Sunucu üzerindeki MySQL/MariaDB portu (3306) dış dünyaya kapalıdır. Sunucu kendi üzerine bağlanırken **`127.0.0.1`** veya **`localhost`** adresini kullanmalıdır.
* **Uygulama:** [src/db/index.ts](src/db/index.ts) içinde production ortamında IP eşlemesini yerel ağa çeviren otomatik bir mekanizma mevcuttur. Bu yapıyı devre dışı bırakmayın.

### 2. Süreç Çökme Koruması (unhandledRejection)
* **Kural:** [server.ts](server.ts) içindeki `unhandledRejection` (yakalanamayan promise reddi) olay yöneticisinde `process.exit(1)` çağrılmamalıdır.
* **Gerekçe:** Geçici veritabanı ağ kopmaları veya harici API yavaşlıklarında oluşan reddetmelerin süreci çökertmesi engellenmeli, sistem ayakta kalmalıdır.

### 3. Bellek Sızıntısı Koruması (Memory Leak)
* **Kural:** Bellekte tutulan istek limit ve engelleme sayaçları (`requestCounters` vb.) için tanımlanmış olan periyodik temizleme görevi (`setInterval`) korunmalıdır.
* **Gerekçe:** Ziyaretçilerin IP adreslerinin bellekte birikerek RAM'i tüketmesi ve sunucuyu kilitlemesi önlenmektedir.

### 4. CI/CD Dağıtımı (Deploy Workflow)
* **Kural:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml) dosyasında güncelleme yaparken, sunucuya yazılan `.env` bloğunda `JWT_SECRET` ve `ALLOWED_ORIGINS` değişkenlerinin eksiksiz yer aldığından emin olun.
* **Gerekçe:** Aksi takdirde sunucu oturum doğrulamaları için güvensiz yedek anahtarlara döner ve güvenlik uyarıları üretir.

### 5. Medya Yüklemeleri ve Sunumu (.htaccess)
* **Kural:** [.htaccess](.htaccess) dosyasında `/uploads/*` isteklerini `/dist/uploads/*` klasörüne yönlendirmeyin. Doğrudan ana dizindeki `/uploads/` klasöründen sunulması için `RewriteRule ^uploads/ - [L]` kuralını koruyun.
* **Gerekçe:** Kullanıcılar tarafından yüklenen dosyalar dinamik olarak `/uploads/` klasörüne yazılır. `/dist/uploads/` yönlendirmesi yeni yüklenen dosyaların 404 (kırık resim) hatası vermesine sebep olur, çünkü bu klasör yalnızca build aşamasında kopyalanan dosyaları içerir.
