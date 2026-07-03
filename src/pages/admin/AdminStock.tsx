import { useState, useEffect } from 'react';
import { Box, Plus, Search, AlertTriangle, X, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { fetchAdminStock, createStockItem, updateStockItem, deleteStockItem, fetchInventoryCategories, createInventoryCategory, deleteInventoryCategory } from '../../lib/api';

export default function AdminStock() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'ok'>('all');

  const [newItem, setNewItem] = useState({
    sku: '', name: '', brand: '', description: '',
    currentStock: '', minStockLevel: '5',
    costPrice: '', sellingPrice: '',
  });

  const load = async () => {
    try {
      const [itemData, catData] = await Promise.all([
        fetchAdminStock(),
        fetchInventoryCategories()
      ]);
      setItems(itemData);
      setCategories(catData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => {
    const matchSearch = !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.sku?.toLowerCase().includes(search.toLowerCase()) ||
      i.brand?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || i.categoryId === parseInt(categoryFilter) ||
      categories.find(c => c.id === i.categoryId)?.name === categoryFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'critical' && (i.currentStock || 0) <= (i.minStockLevel || 0)) ||
      (statusFilter === 'ok' && (i.currentStock || 0) > (i.minStockLevel || 0));
    return matchSearch && matchCategory && matchStatus;
  });

  const totalItems = items.length;
  const totalQty = items.reduce((s, i) => s + (i.currentStock || 0), 0);
  const criticalCount = items.filter(i => (i.currentStock || 0) <= (i.minStockLevel || 0)).length;

  const handleCreate = async () => {
    if (!newItem.name) return;
    setSaving(true);
    try {
      await createStockItem(newItem);
      setShowModal(false);
      setNewItem({ sku: '', name: '', brand: '', description: '', currentStock: '', minStockLevel: '5', costPrice: '', sellingPrice: '' });
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleAdjust = async (id: number, direction: number) => {
    const amt = parseInt(adjustAmount) || 1;
    try {
      await updateStockItem(id, { adjustment: direction * amt });
      setAdjustingId(null);
      setAdjustAmount('');
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu stok kalemini pasif etmek istediğinizden emin misiniz?')) return;
    try {
      await deleteStockItem(id);
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) return;
    setSaving(true);
    try {
      await createInventoryCategory(newCategory);
      setNewCategory({ name: '', description: '' });
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz? (Bağlı stoklar etkilenebilir)')) return;
    try {
      await deleteInventoryCategory(id);
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
  };

  const getStatusLabel = (item: any) => {
    const stock = item.currentStock || 0;
    const min = item.minStockLevel || 0;
    if (stock === 0) return { label: 'Tükendi', cls: 'bg-red-100 text-red-700' };
    if (stock <= min) return { label: 'Kritik', cls: 'bg-red-100 text-red-700' };
    if (stock <= min * 2) return { label: 'Azalıyor', cls: 'bg-orange-100 text-orange-700' };
    return { label: 'Yeterli', cls: 'bg-blue-100 text-secondary' };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stok ve Depo Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Donanım ve yedek parçaların güncel stok durumu.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> Yeni Parça Ekle
        </button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'items' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Stok Kalemleri
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Kategori Yönetimi
        </button>
      </div>

      {activeTab === 'items' ? (
        <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium mb-1">Toplam Çeşit</p>
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
        </div>
        <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium mb-1">Toplam Stok Adedi</p>
          <p className="text-2xl font-bold text-gray-900">{totalQty.toLocaleString('tr-TR')}</p>
        </div>
        <div className={`p-5 rounded-theme border shadow-sm ${criticalCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm font-medium mb-1 flex items-center gap-1.5 ${criticalCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
            {criticalCount > 0 && <AlertTriangle className="w-4 h-4" />} Kritik Stok
          </p>
          <p className="text-2xl font-bold text-gray-900">{criticalCount} Parça</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Parça adı, SKU veya marka..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-theme text-sm focus:ring-2 focus:ring-primary"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-theme px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary bg-gray-50"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <div className="flex gap-1.5">
            {(['all', 'critical', 'ok'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-theme text-xs font-semibold transition-colors ${
                  statusFilter === s
                    ? s === 'critical' ? 'bg-red-600 text-white' : s === 'ok' ? 'bg-green-600 text-white' : 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? `Tümü (${items.length})` : s === 'critical' ? `Kritik (${items.filter(i => (i.currentStock || 0) <= (i.minStockLevel || 0)).length})` : `Yeterli (${items.filter(i => (i.currentStock || 0) > (i.minStockLevel || 0)).length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">SKU</th>
                  <th className="px-5 py-3.5 font-semibold">Ürün Adı</th>
                  <th className="px-5 py-3.5 font-semibold">Kategori / Marka</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Mevcut / Min</th>
                  <th className="px-5 py-3.5 font-semibold">Durum</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Stok İşlemi</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Sil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400 font-medium">Stok kalemi bulunamadı</td></tr>
                ) : filtered.map(item => {
                  const st = getStatusLabel(item);
                  const isAdjusting = adjustingId === item.id;
                  return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{item.sku}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {item.name}
                        {item.sellingPrice && <span className="ml-2 text-xs text-gray-400">₺{parseFloat(item.sellingPrice).toLocaleString('tr-TR')}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{item.categoryName || '—'} {item.brand && `/ ${item.brand}`}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={item.currentStock <= item.minStockLevel ? 'text-red-600 font-bold' : 'text-gray-900 font-semibold'}>{item.currentStock}</span>
                        <span className="text-gray-400 text-xs"> / {item.minStockLevel}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-md ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          {isAdjusting ? (
                            <div className="flex items-center gap-1.5">
                              <input type="number" min="1" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                                className="w-14 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:ring-primary" placeholder="1" />
                              <button onClick={() => handleAdjust(item.id, 1)} className="p-1.5 bg-blue-100 text-secondary hover:bg-green-200 rounded text-xs font-bold"><TrendingUp className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleAdjust(item.id, -1)} className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded text-xs font-bold"><TrendingDown className="w-3.5 h-3.5" /></button>
                              <button onClick={() => { setAdjustingId(null); setAdjustAmount(''); }} className="p-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <button onClick={() => setAdjustingId(item.id)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-theme font-medium transition-colors">
                              Düzenle
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-theme transition-colors"
                          title="Pasife Al"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Adı</label>
              <input type="text" value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="Örn: Ağ Ürünleri" />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (Opsiyonel)</label>
              <input type="text" value={newCategory.description} onChange={e => setNewCategory({ ...newCategory, description: e.target.value })} className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="Kategori açıklaması" />
            </div>
            <button disabled={saving} onClick={handleCreateCategory} className="px-4 py-2 bg-primary text-white rounded-theme text-sm font-medium hover:bg-secondary transition-colors w-full sm:w-auto h-[38px] flex items-center justify-center">
              Ekle
            </button>
          </div>
          
          <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Kategori Adı</th>
                  <th className="px-5 py-3.5 font-semibold">Açıklama</th>
                  <th className="px-5 py-3.5 font-semibold text-center w-24">Sil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-10 text-gray-400 font-medium">Kategori bulunamadı</td></tr>
                ) : categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{cat.description || '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Sil"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Yeni Stok Kalemi</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı *</label>
                <input type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="Örn: Samsung 1TB NVMe SSD" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input type="text" value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="SKU-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                  <input type="text" value={newItem.brand} onChange={e => setNewItem({ ...newItem, brand: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="Samsung" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Adet</label>
                  <input type="number" value={newItem.currentStock} onChange={e => setNewItem({ ...newItem, currentStock: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. Stok</label>
                  <input type="number" value={newItem.minStockLevel} onChange={e => setNewItem({ ...newItem, minStockLevel: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maliyet (₺)</label>
                  <input type="number" value={newItem.costPrice} onChange={e => setNewItem({ ...newItem, costPrice: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satış Fiyatı (₺)</label>
                  <input type="number" value={newItem.sellingPrice} onChange={e => setNewItem({ ...newItem, sellingPrice: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={handleCreate} disabled={saving || !newItem.name}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
