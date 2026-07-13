# FAZ 0 - DISCOVERY.md - Codebase Kesif Raporu
Tarih: 2026-07-13

## Stack
- Runtime: Node.js + tsx (TypeScript)
- ORM: Drizzle ORM (mysql2) - Prisma DEGIL
- DB: MySQL/MariaDB 11
- HTTP: Express 4
- Frontend: React 19 + Vite 6 + TailwindCSS 4
- Auth: JWT + bcryptjs
- Upload: Multer + Sharp (local disk, uploads/ folder)
- Email: Nodemailer
- WhatsApp: Twilio
- BullMQ: YOK
- Socket.io: YOK
- dnd-kit: YOK
- Zustand: YOK
- TanStack Query: YOK

## KRITIK UYARI
Brief Prisma/BullMQ/dnd-kit/Socket.io varsaydi, gercek proje bunlari kullanmiyor.
Tum migrasyonlar: Drizzle schema genisleme + npm run db:push

## Mevcut Tablolar (schema.ts)
- tenants, plans, subscriptions
- companies, leads
- users (roleType: superadmin/tenant_admin/staff/technician/customer)
- customers (users 1-1)
- devices, serviceCategories, services, maintenanceContracts
- tickets (ANA TABLO), ticketMessages, ticketAttachments, ticketParts
- inventoryCategories, stockItems, warehouses, serializedItems, stockMovements
- invoices, invoiceItems, payments
- sales, saleItems (POS)
- shipments, expenses
- pages, blogPosts, faqCategories, knowledgeBase (CMS)
- campaigns, notifications, settings, auditLogs
- mediaFolders, mediaLibrary
- taxonomies, terms, termRelationships, menus, menuItems
- forms, formSubmissions, testimonials
- apiKeys, webhooks, plugins
- themeSettings, themePresets, layoutTemplates, layoutAssignments, pageBlocks
- languages, translations, blockedIps

## Auth
- requireAdmin: Bearer JWT scope=admin
- requireCustomer: Bearer JWT scope=customer
- requireApiKey: X-Api-Key: kb_...
- req.adminUser = { userId, email, name, role }

## Ticket Durumlar
yeni -> isleme_alindi -> parca_bekliyor -> musteri_onayi_bekliyor -> cozuldu -> kapatildi -> teslim_edildi -> iptal

## Upload Altyapisi
- Multer + yerel disk (uploads/)
- POST /api/upload/media (genel)
- POST /api/admin/tickets/:id/attachments (fis eki)
- Sharp ile gorsel optimizasyon

## Bildirim
- Email: Nodemailer (SMTP from settings table)
- WhatsApp: Twilio API

## GAP ANALIZI
| Spec | Durum | Aksiyon |
|---|---|---|
| Kanban board | YOK | EKLE |
| Cari alanlar (vergi no, kvkk) | KISMEN | GENISLET |
| Bayi + acik hesap | YOK | EKLE |
| Kasa disiplini (reversal) | YOK | EKLE |
| Fatura | VAR | DOKUNMA |
| TCMB kur | YOK | EKLE |
| Foto upload/kamera | KISMEN | GENISLET |
| Bayi portal | YOK | EKLE |
| Donem kilidi | YOK | EKLE |
| Audit middleware | TABLO VAR, middleware yok | EKLE |

## ACIK SORULAR
1. @dnd-kit yuklensin mi?
2. TCMB cron: setInterval server.ts mi, manuel buton mu?
3. Bayi portal: ayri /portal/login mi, yoksa mevcut /admin/login mi?
4. Hangi faz once baslansin?
