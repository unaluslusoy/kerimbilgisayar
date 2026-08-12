import React, { useState, useEffect } from 'react';
import { Truck, ArrowRightLeft, Package, History, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { adminRequest, fetchAdminStock } from '../../../lib/api';

export default function AdminWarehouseTransfer() {
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movementsHistory, setMovementsHistory] = useState<any[]>([]);

  // Form State
  const [selectedStockId, setSelectedStockId] = useState('');
  const [fromWarehouse, setFromWarehouse] = useState('Ana Depo');
  const [toWarehouse, setToWarehouse] = useState('Mağaza Deposu');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [items, history] = await Promise.all([
        fetchAdminStock(),
        adminRequest('/api/admin/stock/movements').catch(() => []),
      ]);
      setStockItems(items || []);
      setMovementsHistory(history || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStockId || !quantity || parseInt(quantity) <= 0) {
      alert('Lütfen geçerli bir ürün ve miktar seçin');
      return;
    }
    if (fromWarehouse === toWarehouse) {
      alert('Çıkış deposu ile giriş deposu aynı olamaz');
      return;
    }

    const selectedItem = stockItems.find(i => i.id === parseInt(selectedStockId));
    if (selectedItem && selectedItem.currentStock < parseInt(quantity)) {
      alert(`Yetersiz stok! Mevcut stok: ${selectedItem.currentStock}`);
      return;
    }

    setSaving(true);
    try {
      await adminRequest('/api/admin/stock/transfer', {
        method: 'POST',
        body: JSON.stringify({
          stockItemId: parseInt(selectedStockId),
          fromWarehouse,
          toWarehouse,
          quantity: parseInt(quantity),
          reason: reason || 'Depolar Arası Transfer',
        }),
      });

      alert('Stok transferi başarıyla gerçekleştirildi!');
      setSelectedStockId('');
      setQuantity('1');
      setReason('');
      loadData();
    } catch (e: any) {
      alert('Transfer Hatası: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedItemObj = stockItems.find(i => i.id === parseInt(selectedStockId));

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ArrowRightLeft className="w-7 h-7 text-primary" />
            Depolar Arası Stok Transferi
          </h1>
          <p className="text-gray-500 mt-1">Ana depo, şubeler ve teknik servis depoları arasında stok transferi yapın</p>
        </div>
        <button onClick={loadData} className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl transition-colors shadow-2xs cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transfer Formu */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-2xs p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Yeni Transfer İşlemi
          </h2>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Transfer Edilecek Ürün *</label>
              <select
                required
                value={selectedStockId}
                onChange={e => setSelectedStockId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-primary outline-none shadow-2xs"
              >
                <option value="">-- Ürün Seçin --</option>
                {stockItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku || 'SKU yok'}) - Stok: {item.currentStock}
                  </option>
                ))}
              </select>
            </div>

            {selectedItemObj && (
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-1">
                <p className="text-emerald-900 font-bold">{selectedItemObj.name}</p>
                <p className="text-emerald-700">Mevcut Toplam Stok: <b className="text-emerald-800">{selectedItemObj.currentStock} {selectedItemObj.unit || 'Adet'}</b></p>
                {selectedItemObj.costPrice && <p className="text-emerald-700">Maliyet: ₺{parseFloat(selectedItemObj.costPrice).toFixed(2)}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Çıkış Deposu</label>
                <select
                  value={fromWarehouse}
                  onChange={e => setFromWarehouse(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-primary outline-none shadow-2xs"
                >
                  <option value="Ana Depo">Ana Depo</option>
                  <option value="Mağaza Deposu">Mağaza Deposu</option>
                  <option value="Servis Deposu">Servis Deposu</option>
                  <option value="Yedek Parça Deposu">Yedek Parça Deposu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Varış Deposu</label>
                <select
                  value={toWarehouse}
                  onChange={e => setToWarehouse(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-primary outline-none shadow-2xs"
                >
                  <option value="Mağaza Deposu">Mağaza Deposu</option>
                  <option value="Ana Depo">Ana Depo</option>
                  <option value="Servis Deposu">Servis Deposu</option>
                  <option value="Yedek Parça Deposu">Yedek Parça Deposu</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Transfer Miktarı *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-primary outline-none shadow-2xs"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Açıklama / Sebep</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-primary outline-none shadow-2xs"
                placeholder="Transfer sebebi"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !selectedStockId}
              className="w-full py-2.5 bg-primary hover:bg-secondary text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <Save className="w-4 h-4" />
              {saving ? 'İşleniyor...' : 'Transferi Tamamla'}
            </button>
          </form>
        </div>

        {/* Transfer Geçmişi */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-2xs p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Son Stok Hareketleri & Transferler
          </h2>

          {movementsHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-400" />
              <p className="text-xs font-medium">Henüz kayıtlı stok hareketi bulunmuyor</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold uppercase">
                    <th className="px-3.5 py-3 rounded-l-xl">Tarih</th>
                    <th className="px-3.5 py-3">Ürün</th>
                    <th className="px-3.5 py-3">Tür</th>
                    <th className="px-3.5 py-3 text-center">Miktar</th>
                    <th className="px-3.5 py-3 rounded-r-xl">Açıklama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movementsHistory.map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-3.5 py-3 text-gray-500 text-xs font-medium">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString('tr-TR') : '-'}
                      </td>
                      <td className="px-3.5 py-3 font-bold text-gray-900">
                        {m.stockItemName || `Ürün #${m.stockItemId}`}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          m.type === 'transfer' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          m.type === 'giris' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {m.type === 'transfer' ? 'Transfer' : m.type === 'giris' ? 'Giriş' : 'Çıkış'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center font-extrabold text-gray-900">
                        {m.quantity}
                      </td>
                      <td className="px-3.5 py-3 text-gray-600 text-xs">
                        {m.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
