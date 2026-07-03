import React from 'react';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, CheckCircle, XCircle, MessageSquareQuote } from 'lucide-react';
import { fetchAdminTestimonials, createAdminTestimonial, updateAdminTestimonial, deleteAdminTestimonial } from '../../lib/api';

export default function AdminTestimonials() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ authorName: '', authorTitle: '', content: '', rating: 5, status: 'taslak' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const data = await fetchAdminTestimonials();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openForm = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        authorName: item.authorName,
        authorTitle: item.authorTitle || '',
        content: item.content,
        rating: item.rating || 5,
        status: item.status
      });
    } else {
      setEditingId(null);
      setForm({ authorName: '', authorTitle: '', content: '', rating: 5, status: 'taslak' });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await updateAdminTestimonial(editingId, form);
      } else {
        await createAdminTestimonial(form);
      }
      closeForm();
      await load();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu yorumu tamamen silmek istediğinize emin misiniz?')) return;
    try {
      await deleteAdminTestimonial(id);
      await load();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const toggleStatus = async (item: any) => {
    const newStatus = item.status === 'yayinlandi' ? 'taslak' : 'yayinlandi';
    try {
      await updateAdminTestimonial(item.id, { status: newStatus });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Müşteri Yorumları</h1>
          <p className="text-sm text-gray-500 mt-1">Sitenizde görünecek olan müşteri referanslarını yönetin.</p>
        </div>
        <button 
          onClick={() => openForm()} 
          className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Ekle
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{editingId ? 'Yorumu Düzenle' : 'Yeni Yorum Ekle'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Adı Soyadı</label>
                <input required type="text" value={form.authorName} onChange={e => setForm({...form, authorName: e.target.value})} className="w-full border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unvan veya Şirket</label>
                <input type="text" value={form.authorTitle} onChange={e => setForm({...form, authorTitle: e.target.value})} className="w-full border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary" placeholder="Örn: CEO" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yorum İçeriği</label>
              <textarea required rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puan (1-5)</label>
                <input type="number" min="1" max="5" value={form.rating} onChange={e => setForm({...form, rating: parseInt(e.target.value)})} className="w-full border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary">
                  <option value="taslak">Taslak (Gizli)</option>
                  <option value="yayinlandi">Yayında</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-theme font-medium">İptal</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-theme font-medium">
                {submitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <MessageSquareQuote className="w-12 h-12 text-gray-300 mb-3" />
            <p>Henüz hiç yorum eklenmemiş.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Müşteri</th>
                <th className="px-6 py-4 font-semibold">Yorum</th>
                <th className="px-6 py-4 font-semibold">Puan</th>
                <th className="px-6 py-4 font-semibold">Durum</th>
                <th className="px-6 py-4 text-right font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{item.authorName}</div>
                    <div className="text-xs text-gray-500">{item.authorTitle}</div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600 line-clamp-2 max-w-md" title={item.content}>{item.content}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < (item.rating || 5) ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => toggleStatus(item)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${item.status === 'yayinlandi' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {item.status === 'yayinlandi' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {item.status === 'yayinlandi' ? 'Yayında' : 'Taslak'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openForm(item)} className="p-2 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-theme">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-theme">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
