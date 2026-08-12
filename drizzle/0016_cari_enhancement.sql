-- Cari Kart Genişletme Migration
-- Tarih: 2026-08-12

ALTER TABLE `customers`
  ADD COLUMN IF NOT EXISTS `category_type` ENUM('musteri', 'tedarikci', 'son_kullanici', 'kurumsal', 'bayi') DEFAULT 'musteri' AFTER `is_active`,
  ADD COLUMN IF NOT EXISTS `authorized_person` VARCHAR(150) DEFAULT NULL AFTER `category_type`,
  ADD COLUMN IF NOT EXISTS `city` VARCHAR(100) DEFAULT NULL AFTER `authorized_person`,
  ADD COLUMN IF NOT EXISTS `district` VARCHAR(100) DEFAULT NULL AFTER `city`,
  ADD COLUMN IF NOT EXISTS `iban` VARCHAR(50) DEFAULT NULL AFTER `district`,
  ADD COLUMN IF NOT EXISTS `bank_name` VARCHAR(100) DEFAULT NULL AFTER `iban`,
  ADD COLUMN IF NOT EXISTS `is_einvoice_user` TINYINT(1) DEFAULT 0 AFTER `bank_name`;
