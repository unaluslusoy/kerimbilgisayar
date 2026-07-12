# server.ts Moduler Yapiya Gecis Kilavuzu

Bu dizin, buyuk monolitik `server.ts` dosyasinin (4000+ satir) modular
Express Router dosyalarina bolunmesi icin olusturulmustur.

## Tamamlanan Moduller
- `src/routes/payments.ts`          — PayTR sanal pos entegrasyonu
- `src/routes/admin/security.ts`    — IP engelleme yonetimi
- `src/routes/admin/pageBlocks.ts`  — Sayfa blok yonetimi (Layout Builder)

## Modüler Gecis Yontemi

Her route modulu soyle tanimlanir:

```ts
// src/routes/admin/myModule.ts
import type { Express } from "express";
import type { RouteDeps } from "../index";

export function registerMyRoutes(app: Express, deps: RouteDeps): void {
  const { db, requireAdmin, eq } = deps;
  app.get("/api/admin/my-route", requireAdmin, async (req, res) => { ... });
}
```

Server.ts icinde kullanimi:

```ts
import { registerMyRoutes } from "./src/routes/admin/myModule";
// startServer() fonksiyonu icinde:
const routeDeps: RouteDeps = { db, requireAdmin, eq, desc, asc, and, ... };
registerMyRoutes(app, routeDeps);
```

## Oneri Siralama (Diger Modueller)

Asagidaki gruplar en az bagimlilikla ayrilabilir:

| Grup              | Dosya Adi             | Tahmini Satir |
|-------------------|-----------------------|---------------|
| Kullanicilar      | admin/users.ts        | ~200          |
| Musteriler        | admin/customers.ts    | ~250          |
| Stok & Depo       | admin/stock.ts        | ~600          |
| POS Satis         | admin/pos.ts          | ~400          |
| Blog & Sayfalar   | admin/content.ts      | ~500          |
| Temalar           | admin/themes.ts       | ~300          |
| Menüler           | admin/menus.ts        | ~200          |
| Webhooks & API    | admin/integrations.ts | ~150          |
| Google Business   | admin/google.ts       | ~800          |
| Public API        | public.ts             | ~400          |
| Musteri Portali   | customer.ts           | ~300          |

NOT: Her modul ayrildiginda server.ts'deki ilgili satirlar silinmeli,
yoksa duplicate route hatasi olusar.
