-- ============================================================
-- MANUEL MİGRASYON (1F): Ekspertiz — fiziksel durum + fonksiyon testi
--
-- Sadece EKLEME yapar (yeni tablolar), mevcut veriyi etkilemez.
--
-- Çalıştırma:
--   mysql -u KULLANICI -p VERITABANI < drizzle/manual_0008_ekspertiz_tablolari.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `ticket_physical_conditions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`condition_key` varchar(60) NOT NULL,
	CONSTRAINT `ticket_physical_conditions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE UNIQUE INDEX `uq_ticket_physical_condition` ON `ticket_physical_conditions` (`ticket_id`, `condition_key`);
--> statement-breakpoint

ALTER TABLE `ticket_physical_conditions` ADD CONSTRAINT `ticket_physical_conditions_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `ticket_function_tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`test_name` varchar(80) NOT NULL,
	`result` enum('ok','fail','na'),
	CONSTRAINT `ticket_function_tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE UNIQUE INDEX `uq_ticket_function_test` ON `ticket_function_tests` (`ticket_id`, `test_name`);
--> statement-breakpoint

ALTER TABLE `ticket_function_tests` ADD CONSTRAINT `ticket_function_tests_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;

-- Doğrulama (opsiyonel):
-- SHOW CREATE TABLE `ticket_physical_conditions`;
-- SHOW CREATE TABLE `ticket_function_tests`;
