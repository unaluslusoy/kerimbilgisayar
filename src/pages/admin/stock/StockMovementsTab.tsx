// Depo Stok Hareketleri (Stock Movements Log) Sekmesi
import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, RefreshCcw, Search, ArrowRightLeft, History } from 'lucide-react';
import { fetchStockMovements } from '../../../lib/api';

export default function StockMovementsTab() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const loadMovements = async () => {
    setLoading(true);
    try {
      const data = await fetchStockMovements();
      setMovements(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, []);

  const filtered = movements.filter(m => {
    const matchSearch = !search ||
      m.stockItemName?.toLowerCase().includes(search.toLowerCase()) ||
      m.reason?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const getTypeBadge = (type: string, _qty: number) => {
    switch (type) {
      case 'cikis':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200"><TrendingDown className="w-3.5 h-3.5" /> Stok Çıkışı</span>;
      case 'giris':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><TrendingUp className="w-3.5 h-3.5" /> Stok Girişi</span>;
      case 'sayim':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><RefreshCcw className="w-3.5 h-3.5" /> Sayım Düzeltme</span>;
      case 'transfer':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200"><ArrowRightLeft className="w-3.5 h-3.5" /> Depo Transferi</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{type}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Refresh Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-gray-900 text-base">Stok Hareket Logları</h3>
          <span className="text-xs text-gray-400 font-normal">({filtered.length} kayıt)</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Ürün veya açıklama ile ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-700 bg-white outline-none focus:ring-2 focus:ring-primary shrink-0"
          >
            <option value="all">Tüm Hareket Türleri</option>
            <option value="giris">Stok Girişleri</option>
            <option value="cikis">Stok Çıkışları / Satış</option>
            <option value="sayim">Sayım Düzeltmeleri</option>
            <option value="transfer">Depo Transferleri</option>
          </select>
          <button
            onClick={loadMovements}
            className="p-2 border border-gray-300 hover:bg-gray-50 rounded-xl text-gray-600 transition-colors cursor-pointer shrink-0"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-gray-500 font-medium">Stok hareketleri yükleniyor...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 font-medium text-xs">
            Kayıtlı stok hareketi bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/70 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Tarih / Saat</th>
                  <th className="px-5 py-3.5 font-semibold">Ürün / Parça Adı</th>
                  <th className="px-5 py-3.5 font-semibold">Hareket Türü</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Miktar Değişimi</th>
                  <th className="px-5 py-3.5 font-semibold">Açıklama / Neden</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m: any) => {
                  const dateStr = m.createdAt ? new Date(m.createdAt).toLocaleString('tr-TR') : '—';
                  const isPositive = (m.quantity || 0) > 0;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">{dateStr}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">
                        {m.stockItemName || <span className="text-gray-400 italic">Bilinmeyen Ürün (#{m.stockItemId})</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {getTypeBadge(m.type, m.quantity)}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-extrabold text-sm ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">
                        {m.reason || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
