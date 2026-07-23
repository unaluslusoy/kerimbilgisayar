-- ============================================================
-- MANUEL MİGRASYON (1B): ticket_parts — KDV oranı + manuel kalem desteği
--
-- Mevcut satırlar etkilenmez: stock_item_id NOT NULL -> NULL genişletmesi
-- (kısıtlama gevşetiliyor, daraltılmıyor), yeni kolonlar hepsi NULL/DEFAULT'lu.
--
-- Çalıştırma:
--   mysql -u KULLANICI -p VERITABANI < drizzle/manual_0006_ticket_parts_vat_manual.sql
-- ============================================================

ALTER TABLE `ticket_parts` MODIFY `stock_item_id` int;
--> statement-breakpoint

ALTER TABLE `ticket_parts` ADD COLUMN `name` varchar(150);
--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD COLUMN `brand` varchar(80);
--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD COLUMN `vat_rate` int NOT NULL DEFAULT 20;
--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD COLUMN `source` enum('stok','manuel') DEFAULT 'stok';
--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD COLUMN `created_by` int;
--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD COLUMN `removed_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD COLUMN `removed_by` int;
--> statement-breakpoint

ALTER TABLE `ticket_parts` ADD CONSTRAINT `ticket_parts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD CONSTRAINT `ticket_parts_removed_by_users_id_fk` FOREIGN KEY (`removed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Var olan satırlarda name/brand boş kalır; stockItemId join ile hâlâ okunabilir.
-- Geriye dönük UI uyumluluğu için var olan satırları stok adıyla doldur:
UPDATE `ticket_parts` tp
  JOIN `stock_items` si ON tp.stock_item_id = si.id
  SET tp.name = si.name, tp.brand = si.brand, tp.source = 'stok'
  WHERE tp.name IS NULL;

-- Doğrulama (opsiyonel):
-- SHOW COLUMNS FROM `ticket_parts`;
