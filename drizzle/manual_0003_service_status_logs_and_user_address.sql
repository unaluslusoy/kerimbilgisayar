-- ============================================================
-- MANUEL MİGRASYON: service_status_logs tablosunu oluştur + users.address ekle
--
-- Neden: schema.ts içinde `service_status_logs` tablosu ve sunucu kodunda
-- (approve/decline/pay/admin durum güncelleme uçları) buna yazan/okuyan
-- mantık zaten vardı, ama tablo canlı MariaDB'de hiç oluşturulmamıştı.
-- Bu yüzden servis geçmişi kayıtları sessizce (.catch ile yutularak)
-- başarısız oluyordu. Aynı şekilde `users.address` kolonu da yoktu, bu
-- yüzden müşteri sorgulama sayfasındaki adres alanı hiçbir zaman
-- dolamıyordu.
--
-- Bu migrasyon sadece EKLEME yapar (CREATE TABLE / ADD COLUMN),
-- mevcut veriyi değiştirmez veya silmez.
--
-- Çalıştırma:
--   mysql -u KULLANICI -p VERITABANI < drizzle/manual_0003_service_status_logs_and_user_address.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `service_status_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`ticket_id` int NOT NULL,
	`from_status` varchar(50),
	`to_status` varchar(50) NOT NULL,
	`notes` text,
	`changed_by_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `service_status_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

ALTER TABLE `service_status_logs` ADD CONSTRAINT `service_status_logs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `service_status_logs` ADD CONSTRAINT `service_status_logs_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `service_status_logs` ADD CONSTRAINT `service_status_logs_changed_by_id_users_id_fk` FOREIGN KEY (`changed_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX `idx_service_status_logs_ticket` ON `service_status_logs` (`ticket_id`);
--> statement-breakpoint

ALTER TABLE `users` ADD COLUMN `address` text;

-- Doğrulama (opsiyonel):
-- SHOW CREATE TABLE `service_status_logs`;
-- SHOW COLUMNS FROM `users` LIKE 'address';
