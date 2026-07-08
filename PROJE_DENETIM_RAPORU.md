# Kerim Bilgisayar — Proje Denetim Raporu

**Tarih:** 8 Temmuz 2026
**Kapsam:** Mimari, veritabanı, backend güvenliği, frontend, derleme
**Stack:** Node.js + Express + Drizzle ORM (MySQL/MariaDB) + React 19 + Vite 6

> **Genel değerlendirme:** Fonksiyonel olarak zengin, ancak **prodüksiyon için güvenli değil.** TypeScript derlemesi (`tsc --noEmit`) temiz geçiyor — sözdizimi/tip hatası yok. Sorunlar mimari ve güvenlik katmanında. Aşağıdaki **P0** maddeleri canlıya çıkmadan mutlaka düzeltilmelidir.

---

## Özet Tablo

| # | Bulgu | Önem | Alan |
|---|-------|------|------|
| 1 | Müşteri şifreleri düz metin (plaintext) saklanıyor ve karşılaştırılıyor | 🔴 P0 | Güvenlik |
| 2 | Admin şifreleri düz metin yazılıyor ama `bcrypt.compare` ile doğrulanıyor → panelden açılan admin **giriş yapamaz** | 🔴 P0 | Bug + Güvenlik |
| 3 | `/api/admin/languages` ve `/api/admin/translations` **yetkisiz** (auth yok) | 🔴 P0 | Güvenlik |
| 4 | XSS: `dangerouslySetInnerHTML` sanitizasyon olmadan (5 dosya) | 🔴 P0 | Güvenlik |
| 5 | POS satış / stok düşümü **transaction (atomiklik) yok** | 🔴 P0 | Veri bütünlüğü |
| 6 | Rol tabanlı yetki yok — `technician` bile kullanıcı rolü değiştirebilir | 🟠 P1 | Güvenlik |
| 7 | Oturumlar bellekte (`Map`) — her restart'ta tüm kullanıcılar düşer | 🟠 P1 | Mimari |
| 8 | Multi-tenancy sahte — her yere `tenantId: 1` hardcode | 🟠 P1 | Mimari |
| 9 | DB'de hiç index yok (FK, slug, status, keyHash, email lookup) | 🟠 P1 | Performans |
| 10 | `loginLimiter` tanımlı ama hiçbir route'a bağlı değil | 🟠 P1 | Güvenlik |
| 11 | `express.json()` boyut limiti yok → DoS | 🟠 P1 | Güvenlik |
| 12 | SSRF: `import-remote` keyfi URL'yi sunucudan indiriyor | 🟠 P1 | Güvenlik |
| 13 | Enum yazım hatası: `musteri_onaji_bekliyor` (doğrusu `onayi`) | 🟡 P2 | Veri modeli |
| 14 | `sales` insert sonrası `receiptNumber` ile SELECT → `insertId` kullanılmalı | 🟡 P2 | Sağlamlık |
| 15 | Helmet CSP kapalı + ham HTML render = birleşik risk | 🟡 P2 | Güvenlik |
| 16 | `uploads/` gitignore'da ama repoya commit'lenmiş | 🟡 P2 | Repo hijyeni |

---

## 🔴 P0 — Kritik (Canlıya çıkmadan düzeltilmeli)

### 1 & 2. Şifre yönetimi bozuk ve güvensiz

**Neden:** Kod tabanında `bcrypt.hash` **hiçbir yerde çağrılmıyor.** Şifreler her yerde düz metin yazılıyor:

```ts
// server.ts:761 — müşteri kaydı
passwordHash: password,                    // ❌ düz metin
// server.ts:782 — müşteri login
if (u.passwordHash !== password) ...       // ❌ düz metin karşılaştırma
// server.ts:2491 — panelden admin ekleme
passwordHash: password || 'admin123',      // ❌ düz metin
// server.ts:2587 — panelden müşteri ekleme
passwordHash: password || 'musteri123',    // ❌ düz metin
```

Ama admin **login** bcrypt bekliyor:

```ts
// server.ts:1122
const isValid = u.passwordHash ? await bcrypt.compare(password, u.passwordHash) : false;
```

**Sonuç:** Panelden (`/api/admin/users`) oluşturulan admin, `bcrypt.compare('sifre', 'sifre')` her zaman `false` döneceği için **hiçbir zaman giriş yapamaz.** Sadece seed script'iyle hash'lenmiş kullanıcılar çalışır. Müşteri tarafı ise tamamen düz metin — veritabanı sızarsa tüm şifreler açık.

**Çözüm — kayıt/oluşturma tarafında hash'le:**

```ts
// Merkezi yardımcı
const SALT_ROUNDS = 12;
async function hashPassword(raw: string) {
  return bcrypt.hash(raw, SALT_ROUNDS);
}

// Müşteri kaydı (server.ts:758)
await db.insert(users).values({
  tenantId: 1, firstName, lastName, email, phone,
  passwordHash: await hashPassword(password),   // ✅
  roleType: 'customer', isActive: true,
});

// Panelden kullanıcı ekleme (server.ts:2484)
passwordHash: await hashPassword(password || crypto.randomBytes(9).toString('base64url')),
```

**Çözüm — müşteri login'i bcrypt'e taşı (server.ts:782):**

```ts
const isValid = u.passwordHash ? await bcrypt.compare(password, u.passwordHash) : false;
if (!isValid) return res.status(401).json({ error: 'Kullanıcı bulunamadı veya şifre hatalı' });
```

> **Migrasyon notu:** Mevcut düz metin şifreleri tek seferlik bir script ile hash'leyin; ya da kullanıcıları "şifre sıfırla" akışına yönlendirin. Bcrypt hash'i düz metinden ayırt edilebilir (`$2a$`/`$2b$` ön eki), aşamalı geçiş mümkün.

---

### 3. Yetkisiz admin endpoint'leri

`languages` ve `translations` route'larında `requireAdmin` **yok** — herkes dil ekleyebilir, çeviri silip yazabilir:

```ts
// server.ts:1270,1279,1289,1298 — hepsi korumasız
app.get('/api/admin/languages', async (req, res) => { ... });
app.post('/api/admin/languages', async (req, res) => { ... });      // ❌ auth yok
app.get('/api/admin/translations', async (req, res) => { ... });
app.post('/api/admin/translations', async (req, res) => { ... });   // ❌ auth yok — DELETE+INSERT yapıyor
```

`POST /translations` bir dilin tüm çevirilerini `DELETE` edip yeniden yazdığı için, korumasız haliyle **kolay bir vandalizm/DoS vektörü.**

**Çözüm:**

```ts
app.get('/api/admin/languages', requireAdmin, async (req, res) => { ... });
app.post('/api/admin/languages', requireAdmin, async (req, res) => { ... });
app.get('/api/admin/translations', requireAdmin, async (req, res) => { ... });
app.post('/api/admin/translations', requireAdmin, async (req, res) => { ... });
```

---

### 4. XSS — sanitize edilmeyen HTML enjeksiyonu

Admin/DB içeriği ham olarak DOM'a basılıyor, sanitizasyon yok:

```
src/pages/public/DynamicPage.tsx:72   dangerouslySetInnerHTML={{ __html: page.content }}
src/pages/public/LegalPage.tsx:120    dangerouslySetInnerHTML={{ __html: pageData.content }}
src/pages/public/FAQ.tsx:160          dangerouslySetInnerHTML={{ __html: q.answer }}
src/pages/public/Home.tsx:241/245/358/365
```

Zengin metin editörü (react-quill) çıktısı DB'ye yazılıp müşteri tarafında ham render ediliyor. Editöre `<script>`/`onerror` içeren içerik giren biri (veya ele geçirilmiş bir admin token'ı) **kalıcı XSS** oluşturur. Helmet CSP'nin kapalı olması (madde 15) riski büyütüyor.

**Çözüm — DOMPurify ile temizle:**

```bash
npm i dompurify && npm i -D @types/dompurify
```

```tsx
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content || '') }} />
```

Tekrarı önlemek için ortak bir bileşen önerilir:

```tsx
// src/components/SafeHtml.tsx
import DOMPurify from 'dompurify';
export function SafeHtml({ html, className }: { html?: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || '') }} />;
}
```

---

### 5. POS satışında transaction (atomiklik) yok

`POST /api/admin/sales` (server.ts:1888) tek bir mantıksal işlemi **ardışık bağımsız sorgularla** yürütüyor: satış ekle → id'yi tekrar SELECT et → her ürün için satır ekle, stok düş, stok hareketi yaz, seri no güncelle. Ortada bir hata olursa **kısmi yazım** kalır (satış var ama kalemler eksik, ya da stok düşmüş satış yok).

```ts
await db.insert(sales).values({...});
const [insertedSale] = await db.select(...).where(eq(sales.receiptNumber, receiptNumber)); // ❌ ayrı sorgu
for (const item of saleProducts) {
  await db.insert(saleItems)...        // ❌ her biri ayrı, rollback yok
  await db.update(stockItems)...
  await db.insert(stockMovements)...
}
```

**Çözüm — Drizzle transaction:**

```ts
const result = await db.transaction(async (tx) => {
  const [ins] = await tx.insert(sales).values({ ...saleData }); // insertId kullan
  const saleId = (ins as any).insertId;

  for (const item of saleProducts) {
    const qty = parseInt(item.quantity) || 1;
    await tx.insert(saleItems).values({ saleId, ... });

    // Stok yarışını önlemek için atomik düşüm:
    await tx.update(stockItems)
      .set({ currentStock: sql`GREATEST(0, ${stockItems.currentStock} - ${qty})` })
      .where(eq(stockItems.id, parseInt(item.stockItemId)));

    await tx.insert(stockMovements).values({ ..., referenceId: saleId });
    if (item.serializedItemId) {
      await tx.update(serializedItems).set({ status: 'satildi' })
        .where(eq(serializedItems.id, parseInt(item.serializedItemId)));
    }
  }
  return { saleId, receiptNumber };
});
```

> Aynı desen `customers` oluşturma (company+user+customer, server.ts:2559) ve ticket oluşturma (device+ticket) akışlarında da geçerli — hepsi transaction'a alınmalı.

---

## 🟠 P1 — Yüksek Öncelik

### 6. Rol tabanlı yetkilendirme (RBAC) yok

`requireAdmin` yalnızca token'ın geçerli olup olmadığına bakar; **rolü kontrol etmez.** `superadmin`, `staff`, `technician` fark etmeksizin her admin endpoint'ine erişir — bir teknisyen `/api/admin/users` ile kendini `superadmin` yapabilir.

**Çözüm — rol kontrol middleware'i:**

```ts
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    const u = (req as any).adminUser;
    if (!u || !roles.includes(u.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    next();
  };
}
// Kullanım:
app.post('/api/admin/users', requireAdmin, requireRole('superadmin', 'tenant_admin'), ...);
```

Şema tarafında `roles`, `permissions`, `rolePermissions`, `userRoles` tabloları tanımlı ama **hiç kullanılmıyor** — RBAC yarım bırakılmış.

### 7. Oturumlar bellekte tutuluyor

```ts
const activeSessions = new Map<string, ...>();     // server.ts:189
const customerSessions = new Map<string, ...>();
```

`ecosystem.config.cjs` içinde `autorestart: true` + `max_memory_restart: '512M'` var. Her restart/deploy'da **bütün oturumlar silinir**, tüm kullanıcılar aniden çıkış yapar. Ayrıca çok işlemli (cluster) moda geçilirse oturumlar process'ler arası paylaşılmaz.

**Çözüm:** JWT (stateless) veya Redis/DB tabanlı oturum. JWT en hızlı geçiş:

```ts
import jwt from 'jsonwebtoken';
const token = jwt.sign({ userId: u.id, role: u.roleType }, process.env.JWT_SECRET!, { expiresIn: '8h' });
// requireAdmin içinde: jwt.verify(token, process.env.JWT_SECRET!)
```

### 8. Multi-tenancy sahte

Şemada neredeyse tüm tablolarda `tenantId` var ama tüm INSERT'ler `tenantId: 1` hardcode ediyor ve hiçbir SELECT tenant'a göre filtrelemiyor. Bu durumda tenant kolonu ne izolasyon sağlıyor ne de kullanılıyor — **ölü mimari.** Tek kiracılı kalacaksa kolonları kaldırıp sadeleştirin; SaaS hedefiyse gerçek tenant scoping (her sorguya `where(eq(x.tenantId, ctx.tenantId))`) eklenmeli. Şu anki hali her iki dünyanın da dezavantajını taşıyor.

### 9. Veritabanında index yok

`schema.ts` içinde tek bir `index()` tanımı yok (yalnızca `.unique()` kısıtları var). Sık sorgulanan kolonlar tam tarama yapıyor:

| Tablo | Kolon | Kullanım |
|-------|-------|----------|
| `users` | `email` | login (unique var ✓), `roleType` filtresi (yok) |
| `pages` / `blogPosts` | `slug`, `status` | public sayfa çözümleme |
| `tickets` | `ticketNumber`, `userId`, `status` | sorgulama/liste |
| `translations` | `langCode` | her i18n isteği |
| `apiKeys` | `keyHash` | her API çağrısı |
| `settings` | `key` | her ayar okuması |
| `pageBlocks` | `ownerType, ownerId` | blok çözümleme |

**Çözüm (Drizzle):**

```ts
import { index, uniqueIndex } from 'drizzle-orm/mysql-core';

export const tickets = mysqlTable('tickets', { /* ...cols... */ }, (t) => ({
  ticketNumberIdx: uniqueIndex('idx_tickets_number').on(t.ticketNumber),
  userIdx: index('idx_tickets_user').on(t.userId),
  statusIdx: index('idx_tickets_status').on(t.status),
}));

export const translations = mysqlTable('translations', { /* ... */ }, (t) => ({
  langKeyIdx: uniqueIndex('idx_trans_lang_key').on(t.langCode, t.key),
}));

export const settings = mysqlTable('settings', { /* ... */ }, (t) => ({
  keyIdx: uniqueIndex('idx_settings_key').on(t.key),   // ayrıca tenant+key benzersiz olmalı
}));
```

Ardından `npm run db:push` ile uygulayın.

### 10. Login rate-limiter bağlı değil

```ts
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, ... }); // tanımlı
```

Ama hiçbir route'a `loginLimiter` uygulanmamış (kullanım sayısı = 1, yalnızca tanım). Brute-force koruması etkisiz.

**Çözüm:**

```ts
app.post('/api/admin/login', loginLimiter, async (req, res) => { ... });
app.post('/api/customer/login', loginLimiter, ...);
app.post('/api/customer/register', loginLimiter, ...);
```

### 11. `express.json()` gövde limiti yok

```ts
app.use(express.json());   // varsayılan 100kb ama açıkça sınırlanmalı; imza/base64 alanları büyük
```

`customerSignature` / `deliverySignature` base64 olarak geldiği için makul bir limit koyun ve tarayıcı tarafında sıkıştırın:

```ts
app.use(express.json({ limit: '2mb' }));
```

### 12. SSRF — `import-remote`

`saveRemoteImageToMedia` (server.ts:122) ve `POST /api/admin/media/import-remote` (3195), `POST /api/admin/campaigns/import-remote-images` (2877) kullanıcı verdiği URL'yi **sunucudan** indiriyor. Admin korumalı olsa da iç ağ adreslerine (`http://169.254.169.254`, `http://localhost:...`) istek yaptırılabilir.

**Çözüm:** İndirmeden önce host'u çözümleyip özel/loopback IP aralıklarını reddedin; yalnızca `http/https` ve `image/*` içerik tipine izin verin (içerik tipi kontrolü zaten var, IP kontrolü ekleyin).

---

## 🟡 P2 — Orta / İyileştirme

### 13. Enum yazım hatası — `musteri_onaji_bekliyor`
Doğrusu `musteri_onayi_bekliyor`. Şema, server ve 3 frontend dosyasında tutarlı biçimde yanlış yazılmış; bu yüzden şu an çalışıyor ama enum değeri veritabanına gömülü olduğu için sonradan düzeltmek migrasyon gerektirir. Erken düzeltmek maliyeti azaltır.

### 14. `sales` id'sini `insertId` ile alın
`receiptNumber` ile geri SELECT yerine (server.ts:1926) INSERT dönüşündeki `insertId` kullanın (madde 5'teki transaction bunu zaten çözüyor).

### 15. Helmet CSP kapalı
`contentSecurityPolicy: false` (server.ts:329). XSS maddesiyle birleşince savunma katmanı yok. En azından temel bir CSP tanımlayın (script-src 'self' + gerekli CDN'ler).

### 16. `uploads/` repoya commit'lenmiş
`.gitignore`'da `uploads/` var ama dosyalar daha önce eklendiği için hâlâ takip ediliyor. `git rm -r --cached uploads/` ile takipten çıkarın (dosyalar diskte kalır).

### Diğer küçük notlar
- **`.htaccess` mod_proxy zinciri:** Ana sayfa hem `RewriteRule ^$ ... [P]` hem de catch-all ile Node'a proxy'leniyor; `DirectoryIndex disabled` iyi ama kural sırasının Apache mod_proxy + mod_rewrite'ta beklenen davranışı verdiğini prod'da doğrulayın.
- **`ensureCustomerRowsFromUsers()` her `GET /api/admin/customers` isteğinde çalışıyor** (server.ts:2517) — tüm customer kullanıcılarını tarayıp senkronize ediyor. Liste görüntülemede pahalı; tek seferlik migrasyon script'ine taşıyın.
- **IP blocklist / auto-block bellekte** (`Map`) — restart'ta sıfırlanır, cluster'da paylaşılmaz. Kalıcılık gerekiyorsa Redis.
- **`server.ts` içinde tüm route'lar tek 3.980 satırlık dosyada.** Modülerleştirme (route dosyaları + controller/service katmanı) bakımı ciddi kolaylaştırır; DRY ve test edilebilirlik için önerilir.

---

## Doğrulama

- `tsc --noEmit` → **0 hata** (tip/sözdizimi temiz).
- Bulgular satır numaralarıyla kaynak koddan doğrulandı.
- Öncelik: **P0 (1–5) → P1 (6–12) → P2 (13–16)** sırasıyla ele alınmalı.

> Not: Bu rapordaki güvenlik bulguları (özellikle şifre hash'leme ve yetkilendirme) canlı ortama çıkmadan giderilmelidir. İstersen P0 maddelerini tek tek koda uygulayabilirim.
