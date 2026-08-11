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
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ArrowRightLeft className="w-7 h-7 text-emerald-400" />
            Depolar Arası Stok Transferi
          </h1>
          <p className="text-gray-400 mt-1">Ana depo, şubeler ve teknik servis depoları arasında stok transferi yapın</p>
        </div>
        <button onClick={loadData} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transfer Formu */}
        <div className="lg:col-span-1 bg-gray-800/60 rounded-xl border border-gray-700/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Yeni Transfer İşlemi
          </h2>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Transfer Edilecek Ürün *</label>
              <select
                required
                value={selectedStockId}
                onChange={e => setSelectedStockId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
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
              <div className="p-3 bg-gray-700/40 rounded-lg border border-gray-600/50 text-xs space-y-1">
                <p className="text-gray-300 font-semibold">{selectedItemObj.name}</p>
                <p className="text-gray-400">Mevcut Toplam Stok: <b className="text-emerald-400">{selectedItemObj.currentStock} {selectedItemObj.unit || 'Adet'}</b></p>
                {selectedItemObj.costPrice && <p className="text-gray-400">Maliyet: ₺{parseFloat(selectedItemObj.costPrice).toFixed(2)}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Çıkış Deposu</label>
                <select
                  value={fromWarehouse}
                  onChange={e => setFromWarehouse(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="Ana Depo">Ana Depo</option>
                  <option value="Mağaza Deposu">Mağaza Deposu</option>
                  <option value="Servis Deposu">Servis Deposu</option>
                  <option value="Yedek Parça Deposu">Yedek Parça Deposu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Varış Deposu</label>
                <select
                  value={toWarehouse}
                  onChange={e => setToWarehouse(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="Mağaza Deposu">Mağaza Deposu</option>
                  <option value="Ana Depo">Ana Depo</option>
                  <option value="Servis Deposu">Servis Deposu</option>
                  <option value="Yedek Parça Deposu">Yedek Parça Deposu</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Transfer Miktarı *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Açıklama / Sebep</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="Transfer sebebi"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !selectedStockId}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'İşleniyor...' : 'Transferi Tamamla'}
            </button>
          </form>
        </div>

        {/* Transfer Geçmişi */}
        <div className="lg:col-span-2 bg-gray-800/60 rounded-xl border border-gray-700/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            Son Stok Hareketleri & Transferler
          </h2>

          {movementsHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Henüz kayıtlı stok hareketi bulunmuyor</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="px-3 py-2 font-medium">Tarih</th>
                    <th className="px-3 py-2 font-medium">Ürün</th>
                    <th className="px-3 py-2 font-medium">Tür</th>
                    <th className="px-3 py-2 font-medium text-center">Miktar</th>
                    <th className="px-3 py-2 font-medium">Açıklama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {movementsHistory.map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-700/30">
                      <td className="px-3 py-2 text-gray-400 text-xs">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString('tr-TR') : '-'}
                      </td>
                      <td className="px-3 py-2 font-medium text-white">
                        {m.stockItemName || `Ürün #${m.stockItemId}`}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.type === 'transfer' ? 'bg-blue-500/20 text-blue-400' :
                          m.type === 'giris' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {m.type === 'transfer' ? 'Transfer' : m.type === 'giris' ? 'Giriş' : 'Çıkış'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-white">
                        {m.quantity}
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">
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
