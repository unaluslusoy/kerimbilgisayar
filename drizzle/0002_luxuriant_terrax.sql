CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`sale_id` int,
	`stock_item_id` int,
	`serialized_item_id` int,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(12,2) NOT NULL,
	`vat_rate` int DEFAULT 20,
	`total_price` decimal(12,2) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`customer_id` int,
	`salesperson_id` int,
	`receipt_number` varchar(100) NOT NULL,
	`total_amount` decimal(12,2) NOT NULL,
	`tax_amount` decimal(12,2) DEFAULT '0.00',
	`discount_amount` decimal(12,2) DEFAULT '0.00',
	`payment_type` enum('nakit','kredi_karti','havale','cari') NOT NULL,
	`status` enum('odendi','beklemede','iptal','iade') DEFAULT 'odendi',
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_receipt_number_unique` UNIQUE(`receipt_number`)
);
--> statement-breakpoint
CREATE TABLE `serialized_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`stock_item_id` int,
	`serial_number` varchar(255) NOT NULL,
	`status` enum('stokta','satildi','iade','servis') DEFAULT 'stokta',
	`warehouse_id` int,
	`purchase_price` decimal(12,2),
	`purchased_at` timestamp,
	`sold_at` timestamp,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serialized_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`stock_item_id` int,
	`serialized_item_id` int,
	`from_warehouse_id` int,
	`to_warehouse_id` int,
	`quantity` int NOT NULL DEFAULT 0,
	`type` enum('giris','cikis','transfer','iade','fire') NOT NULL,
	`reason` varchar(255),
	`reference_id` int,
	`created_by_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`code` varchar(50),
	`address` text,
	`is_default` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `page_blocks` RENAME COLUMN `visibility_rules` TO `visibility_rule`;--> statement-breakpoint
ALTER TABLE `tickets` MODIFY COLUMN `status` enum('yeni','isleme_alindi','parca_bekliyor','musteri_onayi_bekliyor','cozuldu','kapatildi','iptal','teslim_edildi') DEFAULT 'yeni';--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `idx_tickets_number` UNIQUE(`ticket_number`);--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_stock_item_id_stock_items_id_fk` FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_serialized_item_id_serialized_items_id_fk` FOREIGN KEY (`serialized_item_id`) REFERENCES `serialized_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_salesperson_id_users_id_fk` FOREIGN KEY (`salesperson_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serialized_items` ADD CONSTRAINT `serialized_items_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serialized_items` ADD CONSTRAINT `serialized_items_stock_item_id_stock_items_id_fk` FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serialized_items` ADD CONSTRAINT `serialized_items_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_stock_item_id_stock_items_id_fk` FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_serialized_item_id_serialized_items_id_fk` FOREIGN KEY (`serialized_item_id`) REFERENCES `serialized_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_from_warehouse_id_warehouses_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_to_warehouse_id_warehouses_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_apikeys_hash` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_blog_slug` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_blog_status` ON `blog_posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_customers_user` ON `customers` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_customers_company` ON `customers` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_menuitems_menu` ON `menu_items` (`menu_id`);--> statement-breakpoint
CREATE INDEX `idx_pageblocks_owner` ON `page_blocks` (`owner_type`,`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_pages_slug` ON `pages` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_pages_status` ON `pages` (`status`);--> statement-breakpoint
CREATE INDEX `idx_settings_key` ON `settings` (`key`);--> statement-breakpoint
CREATE INDEX `idx_stock_sku` ON `stock_items` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_stock_barcode` ON `stock_items` (`barcode`);--> statement-breakpoint
CREATE INDEX `idx_stock_category` ON `stock_items` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_termrel_object` ON `term_relationships` (`object_type`,`object_id`);--> statement-breakpoint
CREATE INDEX `idx_termrel_term` ON `term_relationships` (`term_id`);--> statement-breakpoint
CREATE INDEX `idx_tickets_user` ON `tickets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_tickets_status` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tickets_device` ON `tickets` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_translations_lang` ON `translations` (`lang_code`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role_type`);--> statement-breakpoint
CREATE INDEX `idx_users_tenant` ON `users` (`tenant_id`);