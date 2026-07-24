-- ============================================================
-- MANUEL MİGRASYON (Faz 2 — 2A/2B/2D): tedarik talebi + dış servis sevk +
-- teslim yaşlandırma kolonları
--
-- Sadece EKLEME yapar (yeni tablo + ADD COLUMN), mevcut veriyi etkilemez.
--
-- Çalıştırma:
--   mysql -u KULLANICI -p VERITABANI < drizzle/manual_0010_faz2_tedarik_dis_servis_yaslandirma.sql
-- ============================================================

-- 2A: Tedarik talebi
CREATE TABLE IF NOT EXISTS `ticket_supply_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`item_name` varchar(150) NOT NULL,
	`supplier` varchar(120),
	`eta_date` date,
	`arrived_at` timestamp NULL,
	`created_by` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ticket_supply_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE INDEX `idx_ticket_supply_requests_ticket` ON `ticket_supply_requests` (`ticket_id`);
--> statement-breakpoint

ALTER TABLE `ticket_supply_requests` ADD CONSTRAINT `ticket_supply_requests_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `ticket_supply_requests` ADD CONSTRAINT `ticket_supply_requests_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- 2B: Dış servis sevk
ALTER TABLE `tickets` ADD COLUMN `external_service_name` varchar(120);
--> statement-breakpoint
ALTER TABLE `tickets` ADD COLUMN `external_sent_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `tickets` ADD COLUMN `external_cost` decimal(10,2);
--> statement-breakpoint
ALTER TABLE `tickets` ADD COLUMN `external_returned_at` timestamp NULL;
--> statement-breakpoint

-- 2D: Teslim yaşlandırma
ALTER TABLE `tickets` ADD COLUMN `ready_since` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `tickets` ADD COLUMN `pickup_reminder_7d_sent_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `tickets` ADD COLUMN `pickup_reminder_15d_sent_at` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `tickets` ADD COLUMN `pickup_legal_notice_30d_sent_at` timestamp NULL;

-- Doğrulama (opsiyonel):
-- SHOW CREATE TABLE `ticket_supply_requests`;
-- SHOW COLUMNS FROM `tickets` LIKE 'external_%';
-- SHOW COLUMNS FROM `tickets` LIKE '%pickup%';
