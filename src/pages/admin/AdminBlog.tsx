import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, ExternalLink, Globe } from 'lucide-react';
import { fetchAdminBlog, createBlogPost, updateBlogPost, deleteBlogPost } from '../../lib/api';
import RichTextEditor from '../../components/ui/RichTextEditor';
import MediaPicker from '../../components/ui/MediaPicker';

export default function AdminBlog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', content: '', excerpt: '', imageUrl: '', status: 'taslak', metaTitle: '', metaDescription: '' });
  const [showPicker, setShowPicker] = useState(false);

  const load = async () => {
    try { const d = await fetchAdminBlog(); setPosts(d); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ title: '', slug: '', content: '', excerpt: '', imageUrl: '', status: 'taslak', metaTitle: '', metaDescription: '' }); setShowModal(true); };
  const openEdit = (post: any) => { setEditing(post); setForm({ title: post.title, slug: post.slug, content: post.content || '', excerpt: post.excerpt || '', imageUrl: post.imageUrl || '', status: post.status, metaTitle: post.metaTitle || '', metaDescription: post.metaDescription || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      if (editing) await updateBlogPost(editing.id, form);
      else await createBlogPost(form);
      setShowModal(false);
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu yazıyı arşivlemek istediğinizden emin misiniz?')) return;
    try { await deleteBlogPost(id); await load(); }
    catch (e: any) { alert('Hata: ' + e.message); }
  };

  const filtered = posts.filter(p => !search || p.title?.toLowerCase().includes(search.toLowerCase()));

  const STATUS_LABELS: Record<string, string> = { taslak: 'Taslak', yayinlandi: 'Yayında', arsivlendi: 'Arşivlendi' };
  const STATUS_COLORS: Record<string, string> = { taslak: 'bg-gray-100 text-gray-600', yayinlandi: 'bg-blue-100 text-secondary', arsivlendi: 'bg-red-100 text-red-600' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Blog Yazıları</h1>
          <p className="text-sm text-gray-500 mt-1">İçerik yönetimi ve blog yazılarını düzenleyin.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Yeni Yazı
        </button>
      </div>

      <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Yazı ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-theme text-sm focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Başlık</th>
                  <th className="px-5 py-3.5 font-semibold">Slug</th>
                  <th className="px-5 py-3.5 font-semibold">Durum</th>
                  <th className="px-5 py-3.5 font-semibold">Tarih</th>
                  <th className="px-5 py-3.5 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Yazı bulunamadı</td></tr>
                ) : filtered.map(post => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900 max-w-xs truncate">{post.title}</td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-500">{post.slug}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[post.status] || ''}`}>{STATUS_LABELS[post.status] || post.status}</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {post.status === 'yayinlandi' && (
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-theme"
                            title="Önizle"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => openEdit(post)} className="p-1.5 text-primary hover:bg-blue-50 rounded-theme" title="Düzenle"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(post.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-theme" title="Arşivle"><Trash2 className="w-4 h-4" /></button>
                      </div>
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
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Yazıyı Düzenle' : 'Yeni Blog Yazısı'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                  <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary font-mono" placeholder="otomatik-uretilir" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary">
                    <option value="taslak">Taslak</option>
                    <option value="yayinlandi">Yayınla</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kapak Görseli URL</label>
                <div className="flex gap-2">
                  <input type="text" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="https://images.unsplash.com/..." />
                  <button type="button" onClick={() => setShowPicker(true)} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-theme text-xs font-semibold text-gray-700 shrink-0">Seç</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Özet</label>
                <textarea rows={2} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İçerik</label>
                <RichTextEditor 
                  value={form.content} 
                  onChange={(val) => setForm({ ...form, content: val })} 
                  placeholder="İçeriğinizi buraya yazın..."
                />
              </div>
              {/* SEO Bölümü */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700">SEO Ayarları</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Başlık <span className="text-gray-400 font-normal">(boş bırakılırsa yazı başlığı kullanılır)</span></label>
                    <input
                      type="text"
                      value={form.metaTitle}
                      onChange={e => setForm({ ...form, metaTitle: e.target.value })}
                      placeholder={form.title || 'Meta başlık...'}
                      maxLength={70}
                      className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{form.metaTitle.length}/70 karakter</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Açıklama</label>
                    <textarea
                      rows={2}
                      value={form.metaDescription}
                      onChange={e => setForm({ ...form, metaDescription: e.target.value })}
                      placeholder="Arama motorlarında görünecek açıklama..."
                      maxLength={160}
                      className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary resize-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{form.metaDescription.length}/160 karakter</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={handleSave} disabled={saving || !form.title}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                {editing ? 'Güncelle' : 'Yayınla'}
              </button>
            </div>
          </div>
        </div>
      )}
      <MediaPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(url) => setForm({ ...form, imageUrl: url })}
      />
    </div>
  );
}
