ALTER TABLE `tickets` MODIFY COLUMN `status` enum('yeni','isleme_alindi','parca_bekliyor','musteri_onaji_bekliyor','cozuldu','kapatildi','iptal','teslim_edildi') DEFAULT 'yeni';--> statement-breakpoint
ALTER TABLE `inventory_categories` ADD `parent_id` int;--> statement-breakpoint
ALTER TABLE `stock_items` ADD `barcode` varchar(100);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `model` varchar(100);--> statement-breakpoint
ALTER TABLE `stock_items` ADD `unit` varchar(50) DEFAULT 'adet';--> statement-breakpoint
ALTER TABLE `stock_items` ADD `vat_rate` int DEFAULT 20;--> statement-breakpoint
ALTER TABLE `stock_items` ADD `image_url` varchar(500);--> statement-breakpoint
ALTER TABLE `tickets` ADD `labor_cost` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `tickets` ADD `accessories` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `is_under_warranty` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `tickets` ADD `warranty_note` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `estimated_cost` decimal(10,2);--> statement-breakpoint
ALTER TABLE `tickets` ADD `estimated_due_at` timestamp;--> statement-breakpoint
ALTER TABLE `tickets` ADD `completed_at` timestamp;--> statement-breakpoint
ALTER TABLE `tickets` ADD `delivered_at` timestamp;--> statement-breakpoint
ALTER TABLE `tickets` ADD `customer_signature` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `delivery_signature` text;