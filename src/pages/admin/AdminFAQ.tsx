import { useState, useEffect } from 'react';
import { Plus, Trash2, X, HelpCircle, FolderPlus, Edit } from 'lucide-react';
import { fetchAdminFAQ, createFAQCategory, createFAQQuestion, deleteFAQQuestion, adminRequest } from '../../lib/api';
import RichTextEditor from '../../components/ui/RichTextEditor';

export default function AdminFAQ() {
  const [data, setData] = useState<{ categories: any[]; questions: any[] }>({ categories: [], questions: [] });
  const [loading, setLoading] = useState(true);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showQModal, setShowQModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Category state
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: '', icon: '' });

  // Question state
  const [editingQId, setEditingQId] = useState<number | null>(null);
  const [qForm, setQForm] = useState({ categoryId: '', question: '', answer: '' });

  const load = async () => {
    try {
      const d = await fetchAdminFAQ();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenCreateCat = () => {
    setEditingCatId(null);
    setCatForm({ name: '', icon: '' });
    setShowCatModal(true);
  };

  const handleOpenEditCat = (cat: any) => {
    setEditingCatId(cat.id);
    setCatForm({ name: cat.name, icon: cat.icon || '' });
    setShowCatModal(true);
  };

  const handleCreateOrUpdateCat = async () => {
    if (!catForm.name) return;
    setSaving(true);
    try {
      if (editingCatId) {
        await adminRequest(`/api/admin/faq/categories/${editingCatId}`, {
          method: 'PUT',
          body: JSON.stringify(catForm)
        });
      } else {
        await createFAQCategory(catForm);
      }
      setShowCatModal(false);
      setCatForm({ name: '', icon: '' });
      setEditingCatId(null);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCat = async (id: number, name: string) => {
    if (!confirm(`"${name}" kategorisini silmek istediğinizden emin misiniz? Sadece kategori silinecektir, içindeki sorular silinmeyecek ve 'Kategorisiz' olarak işaretlenecektir.`)) return;
    try {
      await adminRequest(`/api/admin/faq/categories/${id}`, {
        method: 'DELETE'
      });
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const handleOpenCreateQ = () => {
    setEditingQId(null);
    setQForm({ categoryId: '', question: '', answer: '' });
    setShowQModal(true);
  };

  const handleOpenEditQ = (q: any) => {
    setEditingQId(q.id);
    setQForm({
      categoryId: q.categoryId ? q.categoryId.toString() : '',
      question: q.question,
      answer: q.answer
    });
    setShowQModal(true);
  };

  const handleCreateOrUpdateQ = async () => {
    if (!qForm.question || !qForm.answer) return;
    setSaving(true);
    try {
      const payload = {
        categoryId: qForm.categoryId ? parseInt(qForm.categoryId) : null,
        question: qForm.question,
        answer: qForm.answer
      };

      if (editingQId) {
        await adminRequest(`/api/admin/faq/questions/${editingQId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await createFAQQuestion(payload);
      }
      setShowQModal(false);
      setQForm({ categoryId: '', question: '', answer: '' });
      setEditingQId(null);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQ = async (id: number) => {
    if (!confirm('Bu soruyu kaldırmak istediğinizden emin misiniz?')) return;
    try {
      await deleteFAQQuestion(id);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">SSS / Sıkça Sorulan Sorular</h1>
          <p className="text-sm text-gray-500 mt-1">Ziyaretçilere gösterilen yardım içeriklerini yönetin.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleOpenCreateCat} className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-theme hover:bg-gray-50">
            <FolderPlus className="w-4 h-4 mr-1.5" /> Kategori Ekle
          </button>
          <button onClick={handleOpenCreateQ} className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Soru Ekle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div></div>
      ) : data.questions.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-theme border border-gray-200">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Henüz soru eklenmemiş</p>
          <p className="text-sm mt-1">İlk soruyu eklemek için "Soru Ekle" düğmesini kullanın.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.categories.map(cat => {
            const catQuestions = data.questions.filter(q => q.categoryId === cat.id);
            return (
              <div key={cat.id} className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-sm font-display">{cat.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenEditCat(cat)} className="text-xs text-primary hover:text-secondary font-semibold flex items-center gap-1">
                      <Edit className="w-3 h-3" /> Düzenle
                    </button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => handleDeleteCat(cat.id, cat.name)} className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Sil
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {catQuestions.length > 0 ? (
                    catQuestions.map(q => (
                      <div key={q.id} className="px-5 py-4 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm mb-1">{q.question}</p>
                          <div className="text-xs text-gray-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.answer }} />
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleOpenEditQ(q)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-theme">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteQ(q.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-theme">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-4 text-xs text-gray-400 italic">Bu kategoride henüz soru yok.</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Uncategorized */}
          {data.questions.filter(q => !q.categoryId).length > 0 && (
            <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-650 text-sm font-display">Kategorisiz</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {data.questions.filter(q => !q.categoryId).map(q => (
                  <div key={q.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm mb-1">{q.question}</p>
                      <div className="text-xs text-gray-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.answer }} />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleOpenEditQ(q)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-theme">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteQ(q.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-theme">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 font-display">{editingCatId ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</h2>
              <button onClick={() => setShowCatModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Adı *</label>
                <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Ör: Teknik Servis" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowCatModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={handleCreateOrUpdateCat} disabled={saving || !catForm.name}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                {editingCatId ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 font-display">{editingQId ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</h2>
              <button onClick={() => setShowQModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select value={qForm.categoryId} onChange={e => setQForm({ ...qForm, categoryId: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="">Kategorisiz</option>
                  {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soru *</label>
                <input type="text" value={qForm.question} onChange={e => setQForm({ ...qForm, question: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Sık sorulan soru..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cevap *</label>
                <RichTextEditor 
                  value={qForm.answer} 
                  onChange={(val) => setQForm({ ...qForm, answer: val })} 
                  placeholder="Detaylı cevap..."
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowQModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={handleCreateOrUpdateQ} disabled={saving || !qForm.question || !qForm.answer}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                {editingQId ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
