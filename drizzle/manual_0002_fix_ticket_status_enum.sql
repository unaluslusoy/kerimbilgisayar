-- ============================================================
-- MANUEL MİGRASYON: tickets.status enum yazım düzeltmesi
--   'musteri_onaji_bekliyor'  ->  'musteri_onayi_bekliyor'
--
-- Bu dosyayı MySQL/MariaDB'de ELLE çalıştırın (drizzle-kit otomatik
-- enum-değeri yeniden adlandırmayı güvenli yapamaz):
--   mysql -u KULLANICI -p VERITABANI < drizzle/manual_0002_fix_ticket_status_enum.sql
--
-- Sıra önemli: önce yeni değeri EKLE, veriyi TAŞI, sonra eskiyi KALDIR.
-- ============================================================

-- 1) Enum'a yeni (doğru) değeri geçici olarak EKLE — her iki değer de geçerli olsun
ALTER TABLE `tickets`
  MODIFY `status` ENUM(
    'yeni','isleme_alindi','parca_bekliyor',
    'musteri_onaji_bekliyor','musteri_onayi_bekliyor',
    'cozuldu','kapatildi','iptal','teslim_edildi'
  ) NOT NULL DEFAULT 'yeni';

-- 2) Mevcut satırları eski değerden yeni değere TAŞI
UPDATE `tickets`
  SET `status` = 'musteri_onayi_bekliyor'
  WHERE `status` = 'musteri_onaji_bekliyor';

-- 3) Eski (yanlış) değeri enum'dan KALDIR — son hâl
ALTER TABLE `tickets`
  MODIFY `status` ENUM(
    'yeni','isleme_alindi','parca_bekliyor',
    'musteri_onayi_bekliyor',
    'cozuldu','kapatildi','iptal','teslim_edildi'
  ) NOT NULL DEFAULT 'yeni';

-- Doğrulama (opsiyonel):
-- SHOW COLUMNS FROM `tickets` LIKE 'status';
-- SELECT status, COUNT(*) FROM `tickets` GROUP BY status;
