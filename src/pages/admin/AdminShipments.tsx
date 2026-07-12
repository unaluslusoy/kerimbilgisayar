import React, { useState, useEffect } from 'react';
import { Truck, Search, Plus, Printer, RefreshCw, X, Check, Eye, Trash2, ArrowUpDown } from 'lucide-react';
import { fetchAdminShipments, createAdminShipment, updateAdminShipment, deleteAdminShipment, fetchAdminTickets } from '../../lib/api';

const CARRIERS: Record<string, { label: string; color: string; logo: string }> = {
  yurtici: { label: 'Yurtiçi Kargo', color: 'bg-blue-600 text-white', logo: 'YK' },
  aras: { label: 'Aras Kargo', color: 'bg-red-600 text-white', logo: 'AK' },
  mng: { label: 'MNG Kargo', color: 'bg-orange-500 text-white', logo: 'MNG' },
  ptt: { label: 'PTT Kargo', color: 'bg-yellow-500 text-black', logo: 'PTT' },
  diger: { label: 'Diğer Taşıyıcı', color: 'bg-gray-600 text-white', logo: 'DR' },
};

const STATUS_LABELS: Record<string, string> = {
  hazirlaniyor: 'Hazırlanıyor',
  kargoya_verildi: 'Kargoya Verildi',
  yolda: 'Yolda / Dağıtımda',
  teslim_edildi: 'Teslim Edildi',
  iade: 'İade Edildi',
};

const STATUS_COLORS: Record<string, string> = {
  hazirlaniyor: 'bg-gray-100 text-gray-700 border-gray-200',
  kargoya_verildi: 'bg-blue-50 text-blue-700 border-blue-200',
  yolda: 'bg-amber-50 text-amber-700 border-amber-200',
  teslim_edildi: 'bg-green-50 text-green-700 border-green-200',
  iade: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminShipments() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Shipment Form
  const [newShipment, setNewShipment] = useState({
    ticketId: '',
    carrier: 'yurtici',
    trackingNumber: '',
    senderDetails: 'Kerim Bilgisayar Merkez Ofis - İstanbul',
    receiverDetails: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [shipmentData, ticketData] = await Promise.all([
        fetchAdminShipments(),
        fetchAdminTickets()
      ]);
      setShipments(shipmentData || []);
      setTickets(ticketData || []);
    } catch (e) {
      console.error('Failed to load shipment data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipment.receiverDetails) {
      alert('Alıcı bilgileri zorunludur.');
      return;
    }
    setSaving(true);
    try {
      await createAdminShipment(newShipment);
      setShowModal(false);
      setNewShipment({
        ticketId: '',
        carrier: 'yurtici',
        trackingNumber: '',
        senderDetails: 'Kerim Bilgisayar Merkez Ofis - İstanbul',
        receiverDetails: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      alert('Kargo kaydı hatası: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: number, currentStatus: string) => {
    // Cycle to next status for demo simulation
    const statusCycle = ['hazirlaniyor', 'kargoya_verildi', 'yolda', 'teslim_edildi', 'iade'];
    const nextIdx = (statusCycle.indexOf(currentStatus) + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIdx];

    try {
      await updateAdminShipment(id, { status: nextStatus });
      loadData();
    } catch (err: any) {
      alert('Güncelleme hatası: ' + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu kargo kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await deleteAdminShipment(id);
      loadData();
    } catch (err: any) {
      alert('Silme hatası: ' + err.message);
    }
  };

  const printLabel = (shipment: any) => {
    const carrierName = CARRIERS[shipment.carrier]?.label || shipment.carrier;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Kargo Barkodu - ${shipment.trackingNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; text-align: center; }
            .label-card { border: 3px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; border-radius: 12px; }
            .carrier { font-size: 24px; font-weight: 800; text-transform: uppercase; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
            .section { text-align: left; margin-bottom: 10px; font-size: 13px; }
            .title { font-weight: 800; color: #555; text-transform: uppercase; font-size: 10px; }
            .barcode { font-family: monospace; font-size: 28px; font-weight: 900; background: #000; color: #fff; padding: 10px; letter-spacing: 5px; margin: 15px 0; border-radius: 4px; display: inline-block; }
            .tracking { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="label-card">
            <div class="carrier">${carrierName}</div>
            <div class="section">
              <span class="title">GÖNDERİCİ:</span>
              <div>${shipment.senderDetails}</div>
            </div>
            <div class="section">
              <span class="title">ALICI:</span>
              <div style="font-size: 15px; font-weight: bold;">${shipment.receiverDetails}</div>
            </div>
            <div class="barcode">${shipment.trackingNumber}</div>
            <div class="tracking">TAKİP NO: ${shipment.trackingNumber}</div>
            <div style="margin-top: 15px; font-size: 10px; color: #666;">Kerim Bilgisayar Kargo Yönetim Entegrasyonu</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const filtered = shipments.filter(s =>
    (s.trackingNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.receiverDetails || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-600" /> Kargo Yönetim Entegrasyonu
          </h1>
          <p className="text-sm text-gray-500">Avantajlı fiyatlarla kargo gönderimleri yapın, takip edin ve tek panelden yönetin.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Yeni Kargo Gönderisi
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Toplam Gönderi</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{shipments.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Yoldaki Kargolar</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {shipments.filter(s => s.status === 'yolda' || s.status === 'kargoya_verildi').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Teslim Edilenler</p>
          <p className="text-2xl font-black text-green-600 mt-1">
            {shipments.filter(s => s.status === 'teslim_edildi').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Anlaşmalı Oranlar</p>
          <p className="text-base font-black text-blue-600 mt-1">%35 Anlaşmalı Fiyat</p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Takip no veya alıcı ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={loadData}
            className="p-2 border border-slate-300 rounded-2xl hover:bg-slate-50 text-gray-500 transition-colors shrink-0"
            title="Tazele"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-12">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Kargo kaydı bulunamadı.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-gray-500">
                  <th className="p-4">Taşıyıcı</th>
                  <th className="p-4">Takip Numarası</th>
                  <th className="p-4">Alıcı Detayları</th>
                  <th className="p-4">İlişkili Servis Fişi</th>
                  <th className="p-4">Kargo Durumu</th>
                  <th className="p-4">Gönderim Tarihi</th>
                  <th className="p-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-gray-700">
                {filtered.map(s => {
                  const carrier = CARRIERS[s.carrier] || CARRIERS.diger;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase shadow-sm ${carrier.color}`}>
                          {carrier.label}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-900">{s.trackingNumber}</td>
                      <td className="p-4 max-w-xs truncate">{s.receiverDetails}</td>
                      <td className="p-4">
                        {s.ticketNumber ? (
                          <span className="font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-xl">
                            {s.ticketNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleStatusUpdate(s.id, s.status)}
                          className={`px-3 py-1 rounded-full border text-[11px] font-black cursor-pointer flex items-center gap-1 ${STATUS_COLORS[s.status || 'hazirlaniyor']}`}
                          title="Sonraki duruma geçmek için tıklayın"
                        >
                          <RefreshCw className="w-3 h-3 animate-spin duration-1000" />
                          {STATUS_LABELS[s.status || 'hazirlaniyor']}
                        </button>
                      </td>
                      <td className="p-4 text-gray-400">
                        {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => printLabel(s)}
                            className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg text-gray-600 transition-colors"
                            title="Barkod & Etiket Yazdır"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg text-red-500 transition-colors"
                            title="Kargo Kaydını Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Shipment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-black text-gray-900">Yeni Kargo Gönderisi Oluştur</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">İlişkili Servis Kaydı (Opsiyonel)</label>
                <select
                  value={newShipment.ticketId}
                  onChange={e => {
                    const ticket = tickets.find(t => String(t.id) === e.target.value);
                    setNewShipment(prev => ({
                      ...prev,
                      ticketId: e.target.value,
                      receiverDetails: ticket ? `${ticket.customerName}\nTel: ${ticket.customerPhone || ''}\nCihaz: ${ticket.deviceBrand || ''} ${ticket.deviceModel || ''}` : prev.receiverDetails
                    }));
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Servis Seçilmedi</option>
                  {tickets.map(t => (
                    <option key={t.id} value={t.id}>{t.ticketNumber} - {t.customerName} ({t.subject})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kargo Firması</label>
                  <select
                    value={newShipment.carrier}
                    onChange={e => setNewShipment({ ...newShipment, carrier: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="yurtici">Yurtiçi Kargo</option>
                    <option value="aras">Aras Kargo</option>
                    <option value="mng">MNG Kargo</option>
                    <option value="ptt">PTT Kargo</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Takip Numarası</label>
                  <input
                    type="text"
                    value={newShipment.trackingNumber}
                    onChange={e => setNewShipment({ ...newShipment, trackingNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Boş bırakılırsa otomatik üretilir"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gönderici Bilgileri</label>
                <input
                  type="text"
                  value={newShipment.senderDetails}
                  onChange={e => setNewShipment({ ...newShipment, senderDetails: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Alıcı Bilgileri</label>
                <textarea
                  rows={3}
                  value={newShipment.receiverDetails}
                  onChange={e => setNewShipment({ ...newShipment, receiverDetails: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Müşteri adresi, telefon numarası ve kargo alım detayları..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notlar / Açıklama</label>
                <input
                  type="text"
                  value={newShipment.notes}
                  onChange={e => setNewShipment({ ...newShipment, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Kargo detay notları..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? 'Oluşturuluyor...' : 'Kargoya Ver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
