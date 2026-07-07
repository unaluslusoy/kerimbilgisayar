import React, { useState, useEffect } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, X, Trash2 } from 'lucide-react';
import { adminRequest } from '../../lib/api';
import { cn } from '../../lib/utils';
import LucideIconPicker from '../../components/admin/LucideIconPicker';

const defaultForm = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  features: [] as string[],
  metaTitle: '',
  metaDescription: '',
  displayOrder: 0,
  isActive: true,
};

export default function AdminServiceCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [featureInput, setFeatureInput] = useState('');

  const load = async () => {
    try {
      const data = await adminRequest('/api/admin/service-categories');
      setCategories(data);
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

  const openEdit = (cat: any) => {
    setEditing(cat);
    setForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      icon: cat.icon || '',
      features: Array.isArray(cat.features) ? cat.features : [],
      metaTitle: cat.metaTitle || '',
      metaDescription: cat.metaDescription || '',
      displayOrder: cat.displayOrder || 0,
      isActive: cat.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await adminRequest(`/api/admin/service-categories/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await adminRequest('/api/admin/service-categories', {
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

  const handleToggle = async (cat: any) => {
    try {
      await adminRequest(`/api/admin/service-categories/${cat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const handleDelete = async (cat: any) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz? (Bağlı hizmetler etkilenebilir)')) return;
    try {
      await adminRequest(`/api/admin/service-categories/${cat.id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm({ ...form, features: [...form.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setForm({
      ...form,
      features: form.features.filter((_, i) => i !== index)
    });
  };

  const generateSlug = (text: string) => {
    const mapping: Record<string, string> = {
      'ç': 'c', 'Ç': 'c',
      'ğ': 'g', 'Ğ': 'g',
      'ı': 'i', 'I': 'i', 'İ': 'i',
      'ö': 'o', 'Ö': 'o',
      'ş': 's', 'Ş': 's',
      'ü': 'u', 'Ü': 'u'
    };
    let str = text || '';
    Object.keys(mapping).forEach(key => {
      str = str.toString().replace(new RegExp(key, 'g'), mapping[key]);
    });
    return str.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hizmet Kategorileri</h1>
          <p className="text-gray-500 mt-1">SEO URL yapıları, ikonlar ve özellikleri yönetin</p>
        </div>
        <button onClick={openCreate} className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-theme font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" /> Yeni Kategori
        </button>
      </div>

      <div className="bg-white rounded-theme shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz kategori yok</h3>
            <p className="text-gray-500 mb-6">Hizmetleri gruplamak için ilk kategorinizi oluşturun.</p>
            <button onClick={openCreate} className="text-primary font-medium hover:underline">Oluşturmaya Başla</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-4">Kategori Adı</th>
                  <th className="px-5 py-4">Slug (URL)</th>
                  <th className="px-5 py-4">İkon</th>
                  <th className="px-5 py-4">Sıra</th>
                  <th className="px-5 py-4">Durum</th>
                  <th className="px-5 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-5 py-4 text-gray-500 font-mono text-xs">{cat.slug}</td>
                    <td className="px-5 py-4 text-gray-500">{cat.icon || '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{cat.displayOrder}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggle(cat)}
                        className={cn('flex items-center gap-1.5 text-xs font-semibold transition-colors', cat.isActive ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600')}
                      >
                        {cat.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {cat.isActive ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openEdit(cat)} className="p-1.5 text-primary hover:bg-blue-50 rounded-theme transition-colors mr-2">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-theme transition-colors">
                        <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Adı *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => {
                      setForm({ 
                        ...form, 
                        name: e.target.value,
                        // Otomatik slug doldur (eğer yeni ekleniyorsa)
                        slug: !editing && !form.slug ? generateSlug(e.target.value) : form.slug
                      });
                    }}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Örn: Ağ Sistemleri"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (SEO URL) *</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="örn: ag-sistemleri"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İkon Adı (Lucide)</label>
                  <LucideIconPicker value={form.icon} onChange={icon => setForm({ ...form, icon })} />
                  <p className="text-xs text-gray-500 mt-1">Lucide ikonlarını arayıp listeden seçebilirsiniz.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Görünüm Sırası</label>
                  <input
                    type="number"
                    value={form.displayOrder}
                    onChange={e => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Özellikleri (Maddeler)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={e => setFeatureInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    className="flex-1 border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Örn: Kesintisiz Yedekli Bağlantı"
                  />
                  <button type="button" onClick={addFeature} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-theme text-sm font-medium">Ekle</button>
                </div>
                {form.features.length > 0 && (
                  <ul className="space-y-2 mt-3">
                    {form.features.map((feature, i) => (
                      <li key={i} className="flex items-center justify-between bg-blue-50 text-blue-700 px-3 py-2 rounded-theme text-sm">
                        <span>{feature}</span>
                        <button type="button" onClick={() => removeFeature(i)} className="text-blue-400 hover:text-blue-600">
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">SEO Ayarları</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Başlık (Title)</label>
                    <input
                      type="text"
                      value={form.metaTitle}
                      onChange={e => setForm({ ...form, metaTitle: e.target.value })}
                      className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Açıklama (Description)</label>
                    <textarea
                      rows={2}
                      value={form.metaDescription}
                      onChange={e => setForm({ ...form, metaDescription: e.target.value })}
                      className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
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
            
            <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-10">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-white transition-colors">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.slug.trim()}
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
