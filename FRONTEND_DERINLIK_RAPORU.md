# Frontend Derinlik Raporu (Seçenek A)

**Tarih:** 8 Temmuz 2026
**Kapsam:** En büyük admin ekranlarının satır satır incelenmesi
**İncelenen dosyalar:** `AdminPos.tsx` (938), `ServiceManager.tsx` (612), `AdminStock.tsx` (509), `AdminMedia.tsx` (503), `AdminMenus.tsx` (480), `AdminSettings.tsx` (658) + 8 admin ekranının çapraz karşılaştırması

> **Başlık bulgu:** `AdminStock.tsx` şu an **bozuk** — commit'lenmemiş çalışma değişiklikleri sayfanın yarısını (modallar, tablo kolonları, kategori sekmesi) silmiş. Aşağıdaki **P0** maddesi tek satırlık `git` komutuyla geri alınabilir.

---

## Özet Tablo

| # | Bulgu | Önem | Dosya |
|---|-------|------|-------|
| 1 | **AdminStock çalışma kopyası bozuk** — modallar, 5 tablo kolonu, kategori sekmesi kayıp | 🔴 P0 | AdminStock.tsx |
| 2 | tsconfig'de `strict` / `noUnusedLocals` yok → bozuk JSX & ölü kod sessizce derleniyor | 🟠 P1 | tsconfig.json |
| 3 | `teslim_edildi` durumu UI'da tanımsız → teslim edilen kayıt boş etiket gösteriyor | 🟡 P2 | ServiceManager.tsx |
| 4 | POS: `parseFloat(sellingPrice)` guard'sız → null fiyat "NaN" olarak sunucuya gidiyor | 🟡 P2 | AdminPos.tsx |
| 5 | POS: `showSaleDetails` global `loading`'i tetikliyor → ürün gridi spinner'a düşüyor | 🔵 P3 | AdminPos.tsx |
| 6 | POS: `handleCreateCustomer` bayat (stale) `customersList` closure'ını okuyor | 🔵 P3 | AdminPos.tsx |
| 7 | Yaygın `alert()` tabanlı hata UX'i + Error Boundary yok | 🔵 P3 | genel |

---

## 🔴 P0 — AdminStock.tsx bozuk (acil)

**Kanıt (git karşılaştırması):**

```
git HEAD sürümü : 385 satır, satır 322'de `{showModal && (` → Yeni Ürün modalı MEVCUT
Çalışma kopyası : 509 satır, hiçbir modal render EDİLMİYOR
```

Çalışma kopyasında butonlar state'i değiştiriyor ama karşılığında **hiçbir JSX yok**:

```tsx
// Butonlar var:
<button onClick={() => setShowModal(true)}>Yeni Ürün Ekle</button>       // ❌ modal render edilmiyor
<button onClick={() => setShowScannerModal(true)}>Barkod Oku</button>     // ❌ modal yok
<button onClick={() => setShowImportModal(true)}>CSV Yükle</button>       // ❌ modal yok

// Ama tüm handler'lar TANIMLI, sadece hiçbir elemana bağlı DEĞİL:
handleCreate, handleUpdate, handleAdjust, handleDelete,
handleCreateCategory, handleUpdateCategory, handlePrintBarcode  // hepsi ölü kod
```

Ayrıca:
- **Tablo 8 kolon başlığı** tanımlıyor ama **satırlar yalnızca 3'ünü** render ediyor (Barkod, SKU/Model, Ürün Adı). Kategori/Marka, Mevcut/Kritik, Durum, Stok Güncelle, İşlemler kolonları kayıp (satır 494-497'de `</tr>` erken kapanıyor).
- **Kategori sekmesi** `activeTab === 'categories' ? … : null` — yani boş render ediyor.
- `const st = getStatusLabel(item)` ve `const isAdjusting = adjustingId === item.id` hesaplanıyor ama kullanılmıyor.

**Sonuç:** Stok yönetimi ekranı, salt-okunur 3 kolonluk bir liste dışında **tamamen işlevsiz** — ürün eklenemiyor, düzenlenemiyor, silinemiyor, stok ayarlanamıyor, barkod basılamıyor, kategori yönetilemiyor.

**Çözüm A (hızlı — çalışan sürümü geri al):**

```bash
git checkout HEAD -- src/pages/admin/AdminStock.tsx
```

**Çözüm B (refactor'u tamamla):** Eğer 509 satırlık sürüm bilinçli bir yenileme ise, eksik JSX blokları (add/edit modal, scanner modal, import modal, print modal, kategori sekmesi UI, eksik tablo kolonları ve satır aksiyon butonları) tamamlanmalı. Handler'lar zaten hazır.

> **Not:** Bu dosya dışındaki 8 admin ekranı (`AdminSettings`, `AdminMedia`, `AdminMenus`, `AdminCampaigns`, `AdminBlog`, `AdminServices`, `AdminUsers`, `AdminCustomers`) HEAD ile birebir aynı ve koşullu render'ları (modalları) yerinde — yani sorun yalnızca AdminStock'a özgü, yarım kalmış bir düzenleme.

---

## 🟠 P1 — TypeScript güvenlik ağı kapalı

`tsconfig.json` içinde `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitAny` **yok.** Bu yüzden:

- AdminStock'taki onlarca ölü handler ve kullanılmayan değişken **hiç uyarı vermeden** derleniyor (`tsc --noEmit` = 0 hata).
- 187 adet `: any` kullanımı tip güvenliğini pratikte devre dışı bırakıyor.
- Yarım kalmış refactor'lar (madde 1 gibi) derleyici tarafından yakalanamıyor.

**Çözüm — kademeli sıkılaştırma:**

```jsonc
{
  "compilerOptions": {
    "strict": true,               // adım adım açılabilir
    "noUnusedLocals": true,       // ölü kod / yarım refactor yakalar
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

En azından `noUnusedLocals` açılırsa AdminStock benzeri kazalar CI'da anında görünür.

---

## 🟡 P2 — Fonksiyonel hatalar

### 3. `teslim_edildi` durumu UI'da eksik (ServiceManager.tsx)

Şema `tickets.status` enum'unda **8 değer** var ama `STATUS_LABELS`, `STATUS_COLORS` ve `FILTER_TABS` yalnızca 7'sini tanıyor — `teslim_edildi` yok:

```ts
// schema.ts:237 — enum: ..., 'kapatildi', 'iptal', 'teslim_edildi'  ← sonuncusu UI'da yok
STATUS_LABELS = { ... 'iptal': 'İptal' };   // 'teslim_edildi' TANIMSIZ
```

Sonuç: durumu `teslim_edildi` olan kayıt **boş etiket** ve stilsiz chip gösterir; ayrıca teknisyen bu duruma UI'dan geçemez.

**Çözüm:**

```ts
STATUS_LABELS['teslim_edildi'] = 'Teslim Edildi';
STATUS_COLORS['teslim_edildi'] = 'bg-teal-100 text-teal-700';
// FILTER_TABS dizisine de ekleyin
```

### 4. POS'ta guard'sız `parseFloat` (AdminPos.tsx:178)

```ts
unitPrice: parseFloat(c.sellingPrice).toFixed(2),   // ❌ sellingPrice null ise "NaN"
```

`sellingPrice` boş/null bir ürün sepete eklenirse sunucuya `"NaN"` gider. Kod tabanının başka yerlerinde `parseFloat(c.sellingPrice || '0')` guard'ı var; burada eksik.

**Çözüm:**

```ts
unitPrice: (parseFloat(c.sellingPrice) || 0).toFixed(2),
```

Daha iyisi: `addToCart` içinde `sellingPrice` null olan ürünü uyarıyla reddedin.

---

## 🔵 P3 — İyileştirmeler

**5. Global `loading` çakışması (AdminPos.tsx):** `showSaleDetails` → `setLoading(true)` çağırıyor; bu aynı `loading` state'i ürün gridini de kontrol ettiği için satış geçmişinden bir kayıt açınca ürün listesi spinner'a düşüyor. Ayrı bir `detailLoading` state'i kullanın.

**6. Bayat closure (AdminPos.tsx:144):** `handleCreateCustomer`, yeni müşteri oluşturduktan sonra henüz güncellenmemiş `customersList` closure'ında arama yapıyor; `res.customerId` dönmezse yeni müşteri seçilemeyebilir. `await loadData()` sonrası dönen taze veriyi kullanın (zaten fallback'te yapılıyor, ana yolda da yapılmalı).

**7. Hata UX'i:** Tüm ekranlar hataları `alert()` ile gösteriyor ve React **Error Boundary** yok — bir alt bileşen render sırasında patlarsa tüm panel beyaz ekrana düşer. Toast bileşeni + kök seviyede `<ErrorBoundary>` önerilir.

---

## Doğrulama
- Bulgular git HEAD ile diff karşılaştırması ve satır numaralarıyla doğrulandı.
- AdminStock regresyonu: HEAD (385 satır, modal mevcut) ↔ çalışma kopyası (509 satır, modal yok) karşılaştırmasıyla kesinleştirildi.
- `tsc --noEmit` temiz geçiyor — ancak bu, madde 2'deki gevşek config yüzünden **yanıltıcı**; derleyici bu hataları yakalayamıyor.

> **En acil aksiyon:** `git checkout HEAD -- src/pages/admin/AdminStock.tsx` ile stok ekranını çalışır hale getirin (veya refactor'u tamamlayın). Ardından `noUnusedLocals` açın.
