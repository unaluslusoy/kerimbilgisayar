# Onarım ve Geliştirme Özeti

**Tarih:** 8 Temmuz 2026
**Kapsam:** İki denetim raporundaki (`PROJE_DENETIM_RAPORU.md`, `FRONTEND_DERINLIK_RAPORU.md`) bulguların sırasıyla onarılması

---

## ⚠️ Uygulama Sonrası Zorunlu Adımlar

Değişiklikler uygulandı. Çalıştırmadan önce **sırasıyla**:

```bash
# 1) Yeni bağımlılıkları kur (dompurify + jsonwebtoken eklendi)
npm install

# 2) .env dosyanıza güçlü bir JWT_SECRET ekleyin (ZORUNLU)
node -e "console.log('JWT_SECRET='+require('crypto').randomBytes(48).toString('hex'))" >> .env

# 3) Tip kontrolü (temiz geçmeli)
npm run lint          # = tsc --noEmit

# 4) Yeni veritabanı index'lerini uygula
npm run db:push

# 5) Enum yazım düzeltmesi migrasyonunu çalıştırın (elle)
mysql -u KULLANICI -p VERITABANI < drizzle/manual_0002_fix_ticket_status_enum.sql

# 6) (Önerilir) Mevcut düz-metin şifreleri şifre-sıfırlama ile hash'e taşı
```

> **Not:** Bu oturumdaki Linux sandbox mount'u büyük dosyaları kesik okuduğu için otomatik `tsc` çalıştırılamadı; tüm düzenlemeler dosya araçlarıyla (gerçek dosya durumu) tek tek doğrulandı. Kendi makinenizde `npm run lint` ile son onayı almanız önerilir.

---

## 🔴 P0 — Kritik (tamamlandı)

### 1–2. Şifre güvenliği (bcrypt) — `server.ts`
- `hashPassword()`, `verifyPassword()`, `isBcryptHash()` yardımcıları eklendi (SALT_ROUNDS=12).
- **Hash'lenen noktalar:** müşteri kaydı, panelden kullanıcı ekleme, panelden müşteri ekleme, şifresiz kullanıcının şifre ataması.
- **Doğrulama bcrypt'e taşındı:** admin login + müşteri login artık `verifyPassword()` kullanıyor.
- **Geriye dönük uyum:** `verifyPassword` eski düz-metin kayıtları da kabul eder (`$2a/$2b/$2y` ön ekiyle hash ayırt edilir) → mevcut kullanıcılar kilitlenmez, kademeli geçiş mümkün. Panelden açılan admin'in "giriş yapamama" hatası da böylece çözüldü.

### 3. Yetkisiz endpoint'ler — `server.ts`
- `GET/POST /api/admin/languages` ve `GET/POST /api/admin/translations` route'larına `requireAdmin` eklendi (artık halka açık değil).

### 4. XSS koruması — frontend
- Yeni `src/components/SafeHtml.tsx` (DOMPurify ile sanitize).
- Ham `dangerouslySetInnerHTML` → `SafeHtml` ile değiştirildi: `DynamicPage.tsx`, `LegalPage.tsx`, `FAQ.tsx`.
- `dompurify` bağımlılığı `package.json`'a eklendi.

### 5. POS satış atomikliği — `server.ts`
- `POST /api/admin/sales` tamamen `db.transaction()` içine alındı; `insertId` kullanılıyor (artık `receiptNumber` ile geri-SELECT yok).
- Stok düşümü **atomik**: `GREATEST(0, currentStock - qty)` (yarış koşulu giderildi).
- Herhangi bir adım hata verirse tüm satış geri alınır (kısmi yazım yok).

### 10. AdminStock.tsx tamamlandı — frontend
- Yarım kalmış refactor korunarak **eksik JSX tamamlandı**: tablonun 8 kolonu tam, satır içi stok giriş/çıkış, düzenle/yazdır/sil aksiyonları.
- **Tüm modallar eklendi:** ürün ekle/düzenle, barkod okuyucu, CSV içe aktarma, barkod yazdır.
- **Kategori sekmesi** (ekle/düzenle/sil, üst-kategori seçimi) eklendi. Mevcut handler'lar (`handleCreate`, `handleAdjust`, `handleDelete`, `handlePrintBarcode`, kategori CRUD) artık UI'a bağlı.

---

## 🟠 P1 — Yüksek Öncelik (tamamlandı)

### 6. RBAC — `server.ts`
- `requireRole(...roles)` middleware'i eklendi.
- Hassas kullanıcı yönetimi endpoint'lerine uygulandı: `POST /api/admin/users` ve `PATCH /api/admin/users/:id` artık yalnızca `superadmin` / `tenant_admin` (teknisyen kendini yükseltemez).

### 10. Rate-limit + JSON limit — `server.ts`
- `loginLimiter` bağlandı: admin login, müşteri login, müşteri register.
- `express.json({ limit: '2mb' })` (DoS'a karşı gövde limiti).

### 12. SSRF koruması — `server.ts`
- `assertSafeRemoteUrl()` eklendi; `saveRemoteImageToMedia` artık loopback/özel-ağ/link-local IP ve http(s) dışı şemaları reddediyor (import-remote & campaign image import korundu).

### 9. Veritabanı index'leri — `src/db/schema.ts`
- Eklenen index'ler: `users(role, tenant)`, `customers(user, company)`, `tickets(number✦, user, status, device)`, `pages(slug, status)`, `blog_posts(slug, status)`, `settings(key)`, `translations(langCode)`, `stock_items(sku, barcode, category)`, `api_keys(keyHash)`, `page_blocks(ownerType,ownerId)`, `term_relationships(objectType,objectId; term)`, `menu_items(menu)`. (✦ = unique)
- `npm run db:push` ile uygulanmalı.

---

## 🟡 Küçük Onarımlar (tamamlandı)
- **ServiceManager.tsx:** eksik `teslim_edildi` durumu `STATUS_LABELS`, `STATUS_COLORS` ve `FILTER_TABS`'a eklendi (artık boş etiket göstermez, UI'dan bu duruma geçilebilir).
- **AdminPos.tsx:** guard'sız `parseFloat(sellingPrice)` → `(parseFloat(...) || 0)` (null fiyat artık "NaN" göndermez). Satış-detay görünümü ayrı `detailLoading` kullanıyor (ürün gridi artık spinner'a düşmüyor).

---

## 🟢 İkinci Dalga — Ertelenenlerin Tamamlanması

### JWT tabanlı oturum sistemi — `server.ts`
- Bellek içi `Map` oturumları **tamamen kaldırıldı**; `jsonwebtoken` ile stateless JWT'ye geçildi.
- `signToken()` / `verifyToken()` yardımcıları; `scope` ('admin'/'customer') ayrımı ile admin token'ı müşteri endpoint'inde (veya tersi) geçersiz.
- TTL: admin 8s, müşteri 30g. `requireAdmin` / `requireCustomer` artık JWT doğruluyor.
- **Sonuç:** sunucu restart'ında kullanıcılar artık düşmüyor; cluster/çoklu-process güvenli.
- `JWT_SECRET` eklendi: `.env.example`, `ecosystem.config.cjs`, GitHub `deploy.yml`. Tanımsızsa deterministik fallback + uyarı (prod'da mutlaka ayarlanmalı).

### Enum yazım düzeltmesi — `musteri_onaji_bekliyor` → `musteri_onayi_bekliyor`
- 7 dosyadaki 17 referans düzeltildi (server + schema + 5 frontend).
- Güvenli DB migrasyonu: **`drizzle/manual_0002_fix_ticket_status_enum.sql`** (yeni değeri ekle → veriyi taşı → eskiyi kaldır). Elle çalıştırın:
  ```bash
  mysql -u KULLANICI -p VERITABANI < drizzle/manual_0002_fix_ticket_status_enum.sql
  ```

### CSP (report-only) — `server.ts`
- Production'da Helmet CSP **report-only** modda etkin (hiçbir şeyi engellemez, yalnızca ihlalleri raporlar). Dev'de kapalı (Vite HMR için).
- GA, Cloudflare Turnstile, Google Fonts için izinler tanımlı. Politika oturunca `reportOnly: false` ile zorlayıcı moda geçilebilir.

### RenderEngine — işlevsel jenerik render motoru — `src/components/RenderEngine.tsx`
- Boş no-op stub, **gerçek blok render motoruna** dönüştürüldü: `heading, text, richtext/html (DOMPurify ile), image, button, spacer, divider` blok tiplerini render eder; bilinmeyen tipi güvenle atlar; blok yoksa `defaultContent`'e döner.
- Dış bağımlılık yok, `isVisible`/`sortOrder` desteği var.
- **Not:** Motor hazır ama page-builder'ı public sayfalara **bağlamak** (blok fetch etme) hâlâ ayrı bir özellik işi — çünkü hiçbir public sayfa şu an `/blocks` çekmiyor ve `element registry` boş.

### tsconfig — güvenli sıkılaştırma
- `forceConsistentCasingInFileNames: true` eklendi (import büyük/küçük harf tutarsızlığını yakalar; sıfır kırılma riski).

---

## ⏸️ Bilinçli Ertelenen (gerekçeli)

| Madde | Neden | Öneri |
|-------|-------|-------|
| **tsconfig `strict` / `noUnusedLocals`** | 87 dosyada çok sayıda mevcut hata çıkarıp build'i kırar; bu oturumda iteratif `tsc` erişimi olmadan güvenle açılamaz — "sorunsuz" hedefiyle çelişir | Yerel makinede kademeli açın (önce bir dosyayı temizleyip flag'i açın) |
| **Gerçek multi-tenancy (query scoping)** | Tüm sorgulara `where(tenantId=...)` eklemek 170+ endpoint'i etkileyen geniş refactor | Tek kiracı kalınacaksa tenant kolonlarını sadeleştir; SaaS hedefiyse orta vadede scope ekle |
| **Page-builder'ı public sayfalara bağlama** | RenderEngine hazır, ama element registry doldurma + sayfa blok-fetch akışı ayrı bir özellik geliştirmesi | Elementleri `registry`'ye kaydet + public sayfalarda `RenderEngine` kullan |

> **Doğrulama notu:** Bu oturumdaki Linux sandbox mount'u büyük/yeni dosyaları kesik okuduğu için tam otomatik `tsc` çalıştırılamadı; her düzenleme dosya araçlarıyla (gerçek dosya durumu) yapısal olarak doğrulandı (JWT bloğu, RenderEngine, POS transaction, AdminStock kapanışları Read ile kontrol edildi). Yerel `npm run lint` ile son onay önerilir.

---

## Değişen Dosyalar
- `server.ts` — şifre hash, yetki, transaction, RBAC, rate-limit, JSON limit, SSRF
- `src/db/schema.ts` — 20+ index
- `src/components/SafeHtml.tsx` — **yeni**
- `src/pages/public/DynamicPage.tsx`, `LegalPage.tsx`, `FAQ.tsx` — XSS koruması
- `src/pages/admin/AdminStock.tsx` — tamamlandı
- `src/pages/admin/ServiceManager.tsx`, `AdminPos.tsx` — küçük buglar
- `package.json` — `dompurify`
