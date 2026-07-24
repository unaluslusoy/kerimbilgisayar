-- ============================================================
-- MANUEL MİGRASYON (1G): ticket_approval_requests — onay tutar kilidi + kanal takibi
--
-- Sadece EKLEME yapar (yeni tablo), mevcut veriyi etkilemez.
--
-- Çalıştırma:
--   mysql -u KULLANICI -p VERITABANI < drizzle/manual_0009_ticket_approval_requests.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `ticket_approval_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`channel` enum('portal','manuel') NOT NULL,
	`quoted_amount` decimal(10,2) NOT NULL,
	`sent_at` timestamp DEFAULT (now()),
	`approved_at` timestamp NULL,
	`approved_ip` varchar(45),
	`rejected_at` timestamp NULL,
	`created_by` int,
	CONSTRAINT `ticket_approval_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE INDEX `idx_ticket_approval_requests_ticket` ON `ticket_approval_requests` (`ticket_id`);
--> statement-breakpoint

ALTER TABLE `ticket_approval_requests` ADD CONSTRAINT `ticket_approval_requests_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `ticket_approval_requests` ADD CONSTRAINT `ticket_approval_requests_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- Doğrulama (opsiyonel):
-- SHOW CREATE TABLE `ticket_approval_requests`;
