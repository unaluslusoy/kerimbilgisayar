-- Veritabanı İyileştirme ve Şema Düzenleme Migration
-- Tarih: 2026-08-12

-- Expenses tablosuna Tedarikçi ve Alış Faturası Numarası eklentisi
ALTER TABLE `expenses`
  ADD COLUMN IF NOT EXISTS `supplier_id` INT DEFAULT NULL AFTER `tenant_id`,
  ADD COLUMN IF NOT EXISTS `invoice_number` VARCHAR(100) DEFAULT NULL AFTER `supplier_id`;
