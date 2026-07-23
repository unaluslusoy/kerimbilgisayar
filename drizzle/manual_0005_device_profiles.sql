-- ============================================================
-- MANUEL MİGRASYON (1A): Cihaz profili sistemi
--   device_types + device_type_tests tabloları oluşturulur,
--   devices tablosuna device_type_id (FK, nullable), color, variant eklenir.
--
-- Sadece EKLEME yapar (CREATE TABLE / ADD COLUMN), mevcut veriyi değiştirmez.
-- devices.device_type (serbest metin) korunur — geriye dönük uyumluluk için
-- device_type_id nullable, eski cihaz kayıtları bozulmaz.
--
-- Çalıştırma:
--   mysql -u KULLANICI -p VERITABANI < drizzle/manual_0005_device_profiles.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `device_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(50) NOT NULL,
	`has_imei` boolean DEFAULT false,
	`has_pattern_lock` boolean DEFAULT false,
	`lock_label` varchar(60),
	`variant_label` varchar(60),
	`variant_placeholder` varchar(100),
	`accessories_hint` varchar(200),
	`sort_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `device_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `device_type_tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`device_type_id` int NOT NULL,
	`test_name` varchar(80) NOT NULL,
	`sort_order` int DEFAULT 0,
	CONSTRAINT `device_type_tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

ALTER TABLE `device_type_tests` ADD CONSTRAINT `device_type_tests_device_type_id_device_types_id_fk` FOREIGN KEY (`device_type_id`) REFERENCES `device_types`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX `idx_device_type_tests_type` ON `device_type_tests` (`device_type_id`);
--> statement-breakpoint

ALTER TABLE `devices` ADD COLUMN `device_type_id` int;
--> statement-breakpoint
ALTER TABLE `devices` ADD COLUMN `color` varchar(40);
--> statement-breakpoint
ALTER TABLE `devices` ADD COLUMN `variant` varchar(100);
--> statement-breakpoint

ALTER TABLE `devices` ADD CONSTRAINT `devices_device_type_id_device_types_id_fk` FOREIGN KEY (`device_type_id`) REFERENCES `device_types`(`id`) ON DELETE no action ON UPDATE no action;

-- Doğrulama (opsiyonel):
-- SHOW CREATE TABLE `device_types`;
-- SHOW CREATE TABLE `device_type_tests`;
-- SHOW COLUMNS FROM `devices` LIKE 'device_type_id';
