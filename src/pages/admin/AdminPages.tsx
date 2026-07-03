import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, Loader2 } from 'lucide-react';
import { fetchAdminPages, createAdminPage, updateAdminPage, deleteAdminPage } from '../../lib/api';
import RichTextEditor from '../../components/ui/RichTextEditor';

export default function AdminPages() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', content: '', status: 'taslak', metaTitle: '', metaDescription: '' });

  const load = async () => {
    try { const d = await fetchAdminPages(); setPages(d); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ title: '', slug: '', content: '', status: 'taslak', metaTitle: '', metaDescription: '' }); setShowModal(true); };
  const openEdit = (page: any) => { setEditing(page); setForm({ title: page.title, slug: page.slug, content: page.content || '', status: page.status, metaTitle: page.metaTitle || '', metaDescription: page.metaDescription || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      if (editing) await updateAdminPage(editing.id, form);
      else await createAdminPage(form);
      setShowModal(false);
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu sayfayı silmek istediğinizden emin misiniz?')) return;
    try { await deleteAdminPage(id); await load(); }
    catch (e: any) { alert('Hata: ' + e.message); }
  };

  const filtered = pages.filter(p => !search || p.title?.toLowerCase().includes(search.toLowerCase()));

  const STATUS_LABELS: Record<string, string> = { taslak: 'Taslak', yayinlandi: 'Yayında', arsivlendi: 'Arşivlendi' };
  const STATUS_COLORS: Record<string, string> = { taslak: 'bg-gray-100 text-gray-600', yayinlandi: 'bg-blue-100 text-secondary', arsivlendi: 'bg-red-100 text-red-600' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sayfalar</h1>
          <p className="text-sm text-gray-500 mt-1">Sitenizin sabit sayfalarını oluşturun ve yönetin.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Yeni Sayfa
        </button>
      </div>

      <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Sayfa ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-theme text-sm focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Başlık</th>
                  <th className="px-5 py-3.5 font-semibold">Slug</th>
                  <th className="px-5 py-3.5 font-semibold">Durum</th>
                  <th className="px-5 py-3.5 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400">Sayfa bulunamadı</td></tr>
                ) : filtered.map(page => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900 max-w-xs truncate">{page.title}</td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-500">{page.slug}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[page.status] || ''}`}>{STATUS_LABELS[page.status] || page.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => openEdit(page)} className="p-1.5 text-primary hover:bg-blue-50 rounded-theme"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(page.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-theme"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Sayfayı Düzenle' : 'Yeni Sayfa'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary transition-colors" placeholder="Sayfa başlığını girin..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                  <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary font-mono transition-colors" placeholder="otomatik-uretilir" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary transition-colors">
                    <option value="taslak">Taslak</option>
                    <option value="yayinlandi">Yayınla</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Başlık (SEO)</label>
                  <input type="text" value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Açıklama (SEO)</label>
                  <input type="text" value={form.metaDescription} onChange={e => setForm({ ...form, metaDescription: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary transition-colors" />
                </div>
              </div>
              <div className="h-[400px] flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">İçerik</label>
                <div className="flex-1 overflow-hidden border border-gray-300 rounded-theme focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                  <RichTextEditor 
                    value={form.content} 
                    onChange={(val) => setForm({ ...form, content: val })} 
                    placeholder="İçeriğinizi buraya yazın..."
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4 p-6 border-t border-gray-100 shrink-0 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-theme font-semibold hover:bg-gray-100 transition-colors">İptal</button>
              <button onClick={handleSave} disabled={saving || !form.title}
                className="flex-[2] bg-primary hover:bg-secondary text-white py-3 rounded-theme font-semibold disabled:opacity-70 flex items-center justify-center transition-colors shadow-md">
                {saving && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                {editing ? 'Değişiklikleri Güncelle' : 'Sayfayı Yayınla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
