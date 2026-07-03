import { useState, useEffect } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { adminRequest } from '../../lib/api';
import { cn } from '../../lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  donanim: 'Donanım',
  yazilim: 'Yazılım',
  ag_sistemleri: 'Ağ & Sistemler',
  guvenlik: 'Güvenlik',
  danismanlik: 'Danışmanlık',
  diger: 'Diğer',
};

const CATEGORY_COLORS: Record<string, string> = {
  donanim: 'bg-blue-100 text-blue-700',
  yazilim: 'bg-purple-100 text-purple-700',
  ag_sistemleri: 'bg-green-100 text-green-700',
  guvenlik: 'bg-red-100 text-red-700',
  danismanlik: 'bg-orange-100 text-orange-700',
  diger: 'bg-gray-100 text-gray-600',
};

const defaultForm = {
  name: '',
  description: '',
  basePrice: '',
  category: 'diger',
  isActive: true,
};

export default function AdminServices() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await adminRequest('/api/admin/services');
      setServices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (svc: any) => {
    setEditing(svc);
    setForm({
      name: svc.name || '',
      description: svc.description || '',
      basePrice: svc.basePrice || '',
      category: svc.category || 'diger',
      isActive: svc.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await adminRequest(`/api/admin/services/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await adminRequest('/api/admin/services', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setShowModal(false);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (svc: any) => {
    try {
      await adminRequest(`/api/admin/services/${svc.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !svc.isActive }),
      });
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, isActive: !s.isActive } : s));
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hizmet Kataloğu</h1>
          <p className="text-sm text-gray-500 mt-1">Müşterilere sunulan hizmetleri yönetin. Bu liste web sitesindeki hizmetler sayfasında gösterilir.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" /> Yeni Hizmet
        </button>
      </div>

      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-semibold text-lg">Henüz hizmet eklenmemiş</p>
            <p className="text-sm mt-1">İlk hizmetinizi eklemek için "Yeni Hizmet" butonunu kullanın.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Hizmet Adı</th>
                  <th className="px-5 py-3.5 font-semibold">Kategori</th>
                  <th className="px-5 py-3.5 font-semibold">Başlangıç Fiyatı</th>
                  <th className="px-5 py-3.5 font-semibold">Durum</th>
                  <th className="px-5 py-3.5 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map(svc => (
                  <tr key={svc.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{svc.name}</div>
                      {svc.description && (
                        <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{svc.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold', CATEGORY_COLORS[svc.category] || CATEGORY_COLORS.diger)}>
                        {CATEGORY_LABELS[svc.category] || svc.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-700 font-mono">
                      {svc.basePrice ? `₺${parseFloat(svc.basePrice).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggle(svc)}
                        className={cn('flex items-center gap-1.5 text-xs font-semibold transition-colors', svc.isActive ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600')}
                      >
                        {svc.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {svc.isActive ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openEdit(svc)} className="p-1.5 text-primary hover:bg-blue-50 rounded-theme transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hizmet Adı *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Örn: Anakart Onarımı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Hizmet hakkında kısa açıklama..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Fiyatı (₺)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.basePrice}
                    onChange={e => setForm({ ...form, basePrice: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Web sitesinde aktif olarak göster
                </label>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50 transition-colors">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center transition-colors"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                {editing ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
