-- Hızlı Satış Geliştirme — Migration
-- Tarih: 2026-08-12

-- 1. Hızlı satış grupları tablosu
CREATE TABLE IF NOT EXISTS `quick_sale_groups` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(20) DEFAULT NULL,
  `icon` VARCHAR(50) DEFAULT NULL,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. stock_items tablosuna hızlı satış grup ve sıralama alanları
ALTER TABLE `stock_items`
  ADD COLUMN IF NOT EXISTS `quick_sale_group_id` INT DEFAULT NULL AFTER `is_quick_sale`,
  ADD COLUMN IF NOT EXISTS `quick_sale_sort_order` INT DEFAULT 0 AFTER `quick_sale_group_id`;

-- 3. sale_items tablosuna serbest ürün adı alanı
ALTER TABLE `sale_items`
  ADD COLUMN IF NOT EXISTS `product_name` VARCHAR(255) DEFAULT NULL AFTER `serialized_item_id`;

-- 4. stock_items tablosuna ön muhasebe alanları (KDV hariç alış, toptan satış, GTİP, muhasebe kodu, nakliye maliyeti, döviz)
ALTER TABLE `stock_items`
  ADD COLUMN IF NOT EXISTS `cost_price_excl_vat` DECIMAL(10,2) DEFAULT NULL AFTER `quick_sale_sort_order`,
  ADD COLUMN IF NOT EXISTS `wholesale_price` DECIMAL(10,2) DEFAULT NULL AFTER `cost_price_excl_vat`,
  ADD COLUMN IF NOT EXISTS `currency` VARCHAR(10) DEFAULT 'TRY' AFTER `wholesale_price`,
  ADD COLUMN IF NOT EXISTS `gtip_code` VARCHAR(50) DEFAULT NULL AFTER `currency`,
  ADD COLUMN IF NOT EXISTS `accounting_code` VARCHAR(50) DEFAULT NULL AFTER `gtip_code`,
  ADD COLUMN IF NOT EXISTS `landed_cost` DECIMAL(10,2) DEFAULT NULL AFTER `accounting_code`;
