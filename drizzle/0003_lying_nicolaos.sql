CREATE TABLE `blocked_ips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`blocked_until` timestamp NOT NULL,
	`reason` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `blocked_ips_id` PRIMARY KEY(`id`),
	CONSTRAINT `blocked_ips_ip_address_unique` UNIQUE(`ip_address`),
	CONSTRAINT `idx_blocked_ips_ip` UNIQUE(`ip_address`)
);
--> statement-breakpoint
CREATE TABLE `dealer_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`dealer_company_id` int NOT NULL,
	`ticket_id` int,
	`payment_id` int,
	`type` enum('debit','credit') NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'TRY',
	`description` varchar(500),
	`due_date` date,
	`reversal_of_id` int,
	`is_reversed` boolean DEFAULT false,
	`reconciled_with` int,
	`reconciled_amount` decimal(15,2),
	`created_by_user_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `dealer_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`base_currency` varchar(10) NOT NULL DEFAULT 'TRY',
	`target_currency` varchar(10) NOT NULL,
	`rate` decimal(15,6) NOT NULL,
	`source` enum('tcmb','manual','carried_over') DEFAULT 'tcmb',
	`rate_date` date NOT NULL,
	`fetched_at` timestamp DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `exchange_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`title` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`category` varchar(100),
	`description` text,
	`receipt_url` varchar(500),
	`expense_date` timestamp DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `period_locks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`locked_at` timestamp DEFAULT (now()),
	`locked_by_user_id` int,
	`notes` text,
	CONSTRAINT `period_locks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int,
	`ticket_id` int,
	`carrier` varchar(50) NOT NULL,
	`tracking_number` varchar(100),
	`status` enum('hazirlaniyor','kargoya_verildi','yolda','teslim_edildi','iade') DEFAULT 'hazirlaniyor',
	`sender_details` text,
	`receiver_details` text,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_attachment_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attachment_id` int NOT NULL,
	`phase` enum('teslim_alim','tamir','teslim','genel') DEFAULT 'genel',
	`is_locked` boolean DEFAULT false,
	`locked_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ticket_attachment_meta_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `status` enum('basarili','basarisiz','bekliyor','iade','iptal') DEFAULT 'basarili';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role_type` enum('superadmin','tenant_admin','staff','technician','customer','dealer_user') DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `companies` ADD `dealer_type` enum('none','dealer') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `companies` ADD `dealer_risk_limit` decimal(15,2);--> statement-breakpoint
ALTER TABLE `companies` ADD `dealer_due_days` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `companies` ADD `dealer_discount_rate` decimal(5,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `companies` ADD `dealer_price_list_note` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `risk_limit` decimal(15,2);--> statement-breakpoint
ALTER TABLE `customers` ADD `default_due_days` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `customers` ADD `discount_rate` decimal(5,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `devices` ADD `imei` varchar(100);--> statement-breakpoint
ALTER TABLE `devices` ADD `pattern_lock` varchar(100);--> statement-breakpoint
ALTER TABLE `devices` ADD `pin_password` varchar(100);--> statement-breakpoint
ALTER TABLE `devices` ADD `device_email` varchar(255);--> statement-breakpoint
ALTER TABLE `devices` ADD `device_email_password` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` ADD `ticket_id` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `reversal_of_id` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `reversed_at` timestamp;--> statement-breakpoint
ALTER TABLE `payments` ADD `reversed_by_user_id` int;--> statement-breakpoint
ALTER TABLE `stock_items` ADD `has_serial_tracking` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `stock_items` ADD `warranty_months` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tickets` ADD `technician_notes` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `dealer_id` int;--> statement-breakpoint
ALTER TABLE `tickets` ADD `source` enum('walk_in','dealer','online','phone') DEFAULT 'walk_in';--> statement-breakpoint
ALTER TABLE `users` ADD `tax_number` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `tax_office` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `tc_no` varchar(11);--> statement-breakpoint
ALTER TABLE `users` ADD `kvkk_consent` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `kvkk_consent_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `currency` varchar(10) DEFAULT 'TRY';--> statement-breakpoint
ALTER TABLE `users` ADD `user_notes` text;--> statement-breakpoint
ALTER TABLE `dealer_ledger` ADD CONSTRAINT `dealer_ledger_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dealer_ledger` ADD CONSTRAINT `dealer_ledger_dealer_company_id_companies_id_fk` FOREIGN KEY (`dealer_company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dealer_ledger` ADD CONSTRAINT `dealer_ledger_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dealer_ledger` ADD CONSTRAINT `dealer_ledger_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dealer_ledger` ADD CONSTRAINT `dealer_ledger_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exchange_rates` ADD CONSTRAINT `exchange_rates_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `period_locks` ADD CONSTRAINT `period_locks_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `period_locks` ADD CONSTRAINT `period_locks_locked_by_user_id_users_id_fk` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_attachment_meta` ADD CONSTRAINT `ticket_attachment_meta_attachment_id_ticket_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `ticket_attachments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_dealer_ledger_company` ON `dealer_ledger` (`dealer_company_id`);--> statement-breakpoint
CREATE INDEX `idx_dealer_ledger_ticket` ON `dealer_ledger` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `idx_exchange_rates_date` ON `exchange_rates` (`rate_date`);--> statement-breakpoint
CREATE INDEX `idx_exchange_rates_currency` ON `exchange_rates` (`target_currency`);--> statement-breakpoint
CREATE INDEX `idx_period_locks_period` ON `period_locks` (`year`,`month`);--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_reversed_by_user_id_users_id_fk` FOREIGN KEY (`reversed_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_dealer_id_companies_id_fk` FOREIGN KEY (`dealer_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_tickets_dealer` ON `tickets` (`dealer_id`);