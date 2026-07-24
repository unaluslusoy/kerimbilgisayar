-- ============================================================
-- MANUEL MİGRASYON (1E): tickets — KVKK/erişim/ekspertiz onay zaman damgaları
--
-- Sadece EKLEME yapar (ADD COLUMN, hepsi NULL), mevcut veriyi etkilemez.
--
-- Çalıştırma:
--   mysql -u KULLANICI -p VERITABANI < drizzle/manual_0007_ticket_consent_timestamps.sql
-- ============================================================

ALTER TABLE `tickets` ADD COLUMN `kvkk_consent_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `tickets` ADD COLUMN `data_loss_consent_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `tickets` ADD COLUMN `access_info_consent_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `tickets` ADD COLUMN `expertise_fee_consent_at` timestamp NULL;

-- Doğrulama (opsiyonel):
-- SHOW COLUMNS FROM `tickets` LIKE '%consent%';
