// Tek kaynak: servis kaydı (ticket) durum listesi.
// server.ts ve admin/müşteri arayüzleri buradan türetilmeli — durum etiketleri
// daha önce 3 ayrı yerde server.ts içinde, 2 ayrı yerde de frontend'de elle
// kopyalanmıştı ve birbirinden sürüklenmişti (ör. teslim_edildi bir kopyada
// hiç yoktu). DB enumu ile bu listenin key'leri birebir eşleşmeli
// (src/db/schema.ts -> tickets.status).

export interface TicketStatusDef {
  key: string;
  label: string;
}

export const TICKET_STATUSES: TicketStatusDef[] = [
  { key: 'yeni', label: 'Servise Alındı' },
  { key: 'isleme_alindi', label: 'Arıza Tespiti' },
  { key: 'parca_bekliyor', label: 'Parça Bekleniyor' },
  { key: 'dis_servis', label: 'Dış Serviste' },
  { key: 'musteri_onayi_bekliyor', label: 'Onay Bekleniyor' },
  { key: 'onay_red', label: 'Teklif Reddedildi' },
  { key: 'cozuldu', label: 'Çözüldü' },
  { key: 'iade', label: 'İade Bekliyor' },
  { key: 'teslim_edildi', label: 'Teslim Edildi' },
  { key: 'kapatildi', label: 'Kapatıldı' },
  { key: 'iptal', label: 'İptal' },
];

export const TICKET_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  TICKET_STATUSES.map((s) => [s.key, s.label])
);

// Bu durumlardan sonra müşteri onay/red işlemi tekrar yapılamaz (staff müdahalesi gerekir).
export const TICKET_TERMINAL_STATUSES = ['cozuldu', 'teslim_edildi', 'kapatildi', 'iptal', 'onay_red'];
