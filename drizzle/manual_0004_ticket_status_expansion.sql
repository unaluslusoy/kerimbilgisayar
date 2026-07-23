-- ============================================================
-- MANUEL MİGRASYON: tickets.status enumuna 3 yeni aşama ekleniyor
--   dis_servis (Dış Serviste), onay_red (Teklif Reddedildi), iade (İade Bekliyor)
--
-- Bu migrasyon sadece EKLEME yapar (enum'a yeni değer eklemek), mevcut
-- satırlardaki değerleri değiştirmez veya silmez — güvenlidir.
--
-- Çalıştırma:
--   mysql -u KULLANICI -p VERITABANI < drizzle/manual_0004_ticket_status_expansion.sql
-- ============================================================

ALTER TABLE `tickets`
  MODIFY `status` ENUM(
    'yeni','isleme_alindi','parca_bekliyor','dis_servis',
    'musteri_onayi_bekliyor','onay_red',
    'cozuldu','iade','kapatildi','iptal','teslim_edildi'
  ) NOT NULL DEFAULT 'yeni';

-- Doğrulama (opsiyonel):
-- SHOW COLUMNS FROM `tickets` LIKE 'status';
