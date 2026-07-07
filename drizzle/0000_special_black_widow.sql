CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`key_hash` varchar(255) NOT NULL,
	`prefix` varchar(10) NOT NULL,
	`last_used_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`user_id` int,
	`action` varchar(255) NOT NULL,
	`entity_type` varchar(100),
	`entity_id` int,
	`details` json,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`excerpt` text,
	`image_url` varchar(500),
	`author_id` int,
	`status` enum('taslak','yayinlandi','arsivlendi') DEFAULT 'taslak',
	`published_at` timestamp,
	`meta_title` varchar(255),
	`meta_description` text,
	`canonical_url` varchar(500),
	`og_image_url` varchar(500),
	`focus_keyword` varchar(100),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`image_url` varchar(500),
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`discount_rate` decimal(5,2),
	`status` enum('aktif','pasif','taslak') DEFAULT 'taslak',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`tax_id` varchar(50),
	`tax_office` varchar(100),
	`address` text,
	`phone` varchar(20),
	`email` varchar(255),
	`website` varchar(255),
	`sector` varchar(100),
	`type` enum('lead','customer','partner','vendor') DEFAULT 'lead',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int DEFAULT 1,
	`user_id` int NOT NULL,
	`company_id` int,
	`plan_id` int NOT NULL,
	`status` enum('trial','active','past_due','canceled','unpaid') DEFAULT 'active',
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`cancel_at_period_end` boolean DEFAULT false,
	`agreement_notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int DEFAULT 1,
	`user_id` int NOT NULL,
	`company_id` int,
	`account_code` varchar(50),
	`balance` decimal(10,2) DEFAULT '0.00',
	`credit_limit` decimal(10,2) DEFAULT '0.00',
	`notes` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`user_id` int,
	`company_id` int,
	`name` varchar(255),
	`device_type` varchar(100) NOT NULL,
	`brand` varchar(100),
	`model` varchar(100),
	`serial_number` varchar(100),
	`purchase_date` date,
	`warranty_status` boolean DEFAULT false,
	`warranty_expiry` date,
	`status` enum('active','in_repair','retired') DEFAULT 'active',
	`details` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faq_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`icon` varchar(50),
	`display_order` int DEFAULT 0,
	CONSTRAINT `faq_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`form_id` int NOT NULL,
	`data` json,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `form_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`schema` json,
	`is_active` boolean DEFAULT true,
	`email_notifications` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `forms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(100) NOT NULL,
	`description` text,
	CONSTRAINT `inventory_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(10,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	CONSTRAINT `invoice_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`invoice_number` varchar(100) NOT NULL,
	`company_id` int,
	`user_id` int,
	`ticket_id` int,
	`contract_id` int,
	`subtotal` decimal(10,2) NOT NULL,
	`tax_rate` decimal(5,2) DEFAULT '18.00',
	`tax_amount` decimal(10,2) NOT NULL,
	`discount_amount` decimal(10,2) DEFAULT '0.00',
	`total_amount` decimal(10,2) NOT NULL,
	`status` enum('taslak','kuyrukta','gonderildi','odendi','iptal','gecikmis') DEFAULT 'taslak',
	`issue_date` date NOT NULL,
	`due_date` date NOT NULL,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`category_id` int,
	`question` varchar(500) NOT NULL,
	`answer` text NOT NULL,
	`is_helpful_count` int DEFAULT 0,
	`is_not_helpful_count` int DEFAULT 0,
	`status` enum('taslak','yayinlandi') DEFAULT 'yayinlandi',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `languages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(50) NOT NULL,
	`is_default` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `languages_id` PRIMARY KEY(`id`),
	CONSTRAINT `languages_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `layout_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`layout_template_id` int NOT NULL,
	`condition_type` enum('all','category','specific_page','specific_product','post_type','homepage') NOT NULL,
	`condition_value` varchar(255),
	`priority` int DEFAULT 0,
	CONSTRAINT `layout_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `layout_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`type` enum('header','footer','single_post','single_product','archive','popup','page_header') NOT NULL,
	`name` varchar(128) NOT NULL,
	`is_default` boolean DEFAULT false,
	`structure` json NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `layout_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`company_name` varchar(255),
	`email` varchar(255),
	`phone` varchar(20),
	`source` varchar(100),
	`status` enum('new','contacted','qualified','lost','converted') DEFAULT 'new',
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`company_id` int,
	`title` varchar(255) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`status` enum('aktif','pasif','iptal','bekliyor') DEFAULT 'bekliyor',
	`sla_details` text,
	`monthly_fee` decimal(10,2),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`parent_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `media_folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`uploader_id` int,
	`folder_id` int,
	`file_name` varchar(255) NOT NULL,
	`file_url` varchar(500) NOT NULL,
	`mime_type` varchar(100),
	`file_size` int,
	`alt_text` varchar(255),
	`title` varchar(255),
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `media_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`menu_id` int NOT NULL,
	`parent_id` int,
	`title` varchar(255) NOT NULL,
	`url` varchar(500),
	`target` varchar(20) DEFAULT '_self',
	`display_order` int DEFAULT 0,
	`icon` varchar(50),
	`css_class` varchar(255),
	`mega_menu` json,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(100) NOT NULL,
	`location` varchar(100),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('info','success','warning','error','system') DEFAULT 'info',
	`is_read` boolean DEFAULT false,
	`link_url` varchar(500),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`owner_type` enum('page','layout_template') NOT NULL,
	`owner_id` int NOT NULL,
	`region` varchar(64) DEFAULT 'main',
	`element_key` varchar(64) NOT NULL,
	`props` json NOT NULL,
	`responsive_overrides` json,
	`sort_order` int DEFAULT 0,
	`is_visible` boolean DEFAULT true,
	`visibility_rules` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `page_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`content` text,
	`meta_title` varchar(255),
	`meta_description` text,
	`canonical_url` varchar(500),
	`og_image_url` varchar(500),
	`focus_keyword` varchar(100),
	`status` enum('taslak','yayinlandi','arsivlendi') DEFAULT 'taslak',
	`is_system` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`invoice_id` int,
	`company_id` int,
	`amount` decimal(10,2) NOT NULL,
	`payment_method` enum('kredi_karti','havale_eft','nakit','diger') NOT NULL,
	`status` enum('basarili','basarisiz','bekliyor','iade') DEFAULT 'basarili',
	`transaction_id` varchar(100),
	`notes` text,
	`payment_date` timestamp DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`group` varchar(100),
	`description` text,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`discount_rate` decimal(5,2) DEFAULT '0.00',
	`billing_cycle` enum('monthly','yearly') NOT NULL,
	`features` json,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `plugins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`plugin_id` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`is_active` boolean DEFAULT false,
	`settings` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plugins_id` PRIMARY KEY(`id`),
	CONSTRAINT `plugins_plugin_id_unique` UNIQUE(`plugin_id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` int NOT NULL,
	`permission_id` int NOT NULL,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(100) NOT NULL,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(100),
	`features` json,
	`meta_title` varchar(255),
	`meta_description` text,
	`is_active` boolean DEFAULT true,
	`display_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `service_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`base_price` decimal(10,2),
	`category_id` int,
	`image_url` varchar(500),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`key` varchar(100) NOT NULL,
	`value` text,
	`group` varchar(100),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`category_id` int,
	`sku` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`brand` varchar(100),
	`cost_price` decimal(10,2),
	`selling_price` decimal(10,2),
	`current_stock` int DEFAULT 0,
	`min_stock_level` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`plan_id` int,
	`status` enum('trial','active','past_due','canceled','unpaid') DEFAULT 'trial',
	`trial_ends_at` timestamp,
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`cancel_at_period_end` boolean DEFAULT false,
	`stripe_customer_id` varchar(255),
	`stripe_subscription_id` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxonomies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	CONSTRAINT `taxonomies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`custom_domain` varchar(255),
	`logo_url` varchar(500),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `tenants_custom_domain_unique` UNIQUE(`custom_domain`)
);
--> statement-breakpoint
CREATE TABLE `term_relationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`object_id` int NOT NULL,
	`object_type` varchar(50) NOT NULL,
	`term_id` int NOT NULL,
	CONSTRAINT `term_relationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`taxonomy_id` int,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`parent_id` int,
	CONSTRAINT `terms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`author_name` varchar(255) NOT NULL,
	`author_title` varchar(255),
	`author_image_url` varchar(500),
	`content` text NOT NULL,
	`rating` int DEFAULT 5,
	`status` enum('taslak','yayinlandi') DEFAULT 'taslak',
	`display_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `theme_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(128) NOT NULL,
	`thumbnail_url` varchar(255),
	`sector` varchar(64),
	`settings_payload` json NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `theme_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `theme_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`setting_group` varchar(64) NOT NULL,
	`setting_key` varchar(128) NOT NULL,
	`setting_value` json NOT NULL,
	`is_draft` boolean NOT NULL DEFAULT false,
	`updated_by` int,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `theme_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`ticket_id` int NOT NULL,
	`message_id` int,
	`file_name` varchar(255) NOT NULL,
	`file_url` varchar(500) NOT NULL,
	`file_type` varchar(50),
	`file_size` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ticket_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`ticket_id` int NOT NULL,
	`sender_id` int NOT NULL,
	`message` text NOT NULL,
	`is_internal` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ticket_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`ticket_id` int NOT NULL,
	`stock_item_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(10,2) NOT NULL,
	`total_price` decimal(10,2) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ticket_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`ticket_number` varchar(50) NOT NULL,
	`user_id` int,
	`company_id` int,
	`device_id` int,
	`contract_id` int,
	`type` enum('ariza','destek','kurulum','bakim','diger') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`priority` enum('dusuk','normal','yuksek','acil') DEFAULT 'normal',
	`status` enum('yeni','isleme_alindi','parca_bekliyor','musteri_onaji_bekliyor','cozuldu','kapatildi','iptal') DEFAULT 'yeni',
	`assigned_to` int,
	`cost` decimal(10,2) DEFAULT '0.00',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolved_at` timestamp,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lang_code` varchar(10) NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `translations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`role_id` int NOT NULL,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`company_id` int,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255),
	`phone` varchar(20),
	`avatar_url` varchar(500),
	`role_type` enum('superadmin','tenant_admin','staff','technician','customer') DEFAULT 'customer',
	`is_active` boolean DEFAULT true,
	`last_login_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`name` varchar(255) NOT NULL,
	`event` varchar(100) NOT NULL,
	`url` varchar(500) NOT NULL,
	`secret` varchar(255),
	`is_active` boolean DEFAULT true,
	`failure_count` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `companies` ADD CONSTRAINT `companies_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_subscriptions` ADD CONSTRAINT `customer_subscriptions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_subscriptions` ADD CONSTRAINT `customer_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_subscriptions` ADD CONSTRAINT `customer_subscriptions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_subscriptions` ADD CONSTRAINT `customer_subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faq_categories` ADD CONSTRAINT `faq_categories_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_submissions` ADD CONSTRAINT `form_submissions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_submissions` ADD CONSTRAINT `form_submissions_form_id_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forms` ADD CONSTRAINT `forms_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_categories` ADD CONSTRAINT `inventory_categories_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_contract_id_maintenance_contracts_id_fk` FOREIGN KEY (`contract_id`) REFERENCES `maintenance_contracts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD CONSTRAINT `knowledge_base_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD CONSTRAINT `knowledge_base_category_id_faq_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `faq_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `layout_assignments` ADD CONSTRAINT `layout_assignments_layout_template_id_layout_templates_id_fk` FOREIGN KEY (`layout_template_id`) REFERENCES `layout_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `layout_templates` ADD CONSTRAINT `layout_templates_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_contracts` ADD CONSTRAINT `maintenance_contracts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_contracts` ADD CONSTRAINT `maintenance_contracts_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_folders` ADD CONSTRAINT `media_folders_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_library` ADD CONSTRAINT `media_library_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_library` ADD CONSTRAINT `media_library_uploader_id_users_id_fk` FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_library` ADD CONSTRAINT `media_library_folder_id_media_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `media_folders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_menu_id_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menus` ADD CONSTRAINT `menus_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_blocks` ADD CONSTRAINT `page_blocks_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pages` ADD CONSTRAINT `pages_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plugins` ADD CONSTRAINT `plugins_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_categories` ADD CONSTRAINT `service_categories_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_category_id_service_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settings` ADD CONSTRAINT `settings_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_items` ADD CONSTRAINT `stock_items_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_items` ADD CONSTRAINT `stock_items_category_id_inventory_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `inventory_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taxonomies` ADD CONSTRAINT `taxonomies_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `term_relationships` ADD CONSTRAINT `term_relationships_term_id_terms_id_fk` FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `terms` ADD CONSTRAINT `terms_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `terms` ADD CONSTRAINT `terms_taxonomy_id_taxonomies_id_fk` FOREIGN KEY (`taxonomy_id`) REFERENCES `taxonomies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `theme_presets` ADD CONSTRAINT `theme_presets_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `theme_settings` ADD CONSTRAINT `theme_settings_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `theme_settings` ADD CONSTRAINT `theme_settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_attachments` ADD CONSTRAINT `ticket_attachments_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_attachments` ADD CONSTRAINT `ticket_attachments_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_attachments` ADD CONSTRAINT `ticket_attachments_message_id_ticket_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `ticket_messages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD CONSTRAINT `ticket_parts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD CONSTRAINT `ticket_parts_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_parts` ADD CONSTRAINT `ticket_parts_stock_item_id_stock_items_id_fk` FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_contract_id_maintenance_contracts_id_fk` FOREIGN KEY (`contract_id`) REFERENCES `maintenance_contracts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `translations` ADD CONSTRAINT `translations_lang_code_languages_code_fk` FOREIGN KEY (`lang_code`) REFERENCES `languages`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhooks` ADD CONSTRAINT `webhooks_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;