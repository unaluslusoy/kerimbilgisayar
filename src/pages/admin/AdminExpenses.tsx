import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Plus, FileText, Image as ImageIcon, Camera, Trash2, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { fetchAdminExpenses, createAdminExpense, deleteAdminExpense, analyzeReceiptOcr } from '../../lib/api';
import MediaPicker from '../../components/ui/MediaPicker';
import { mediaUrl } from '../../lib/media';

const CATEGORY_LABELS: Record<string, string> = {
  ofis: 'Ofis Harcaması',
  yol: 'Yol / Akaryakıt',
  yemek: 'Yemek / Mutfak',
  kargo: 'Kargo Gönderi',
  donanim: 'Donanım / Yedek Parça',
  diger: 'Diğer Giderler',
};

const CATEGORY_COLORS: Record<string, string> = {
  ofis: 'bg-slate-100 text-slate-700',
  yol: 'bg-amber-100 text-amber-700',
  yemek: 'bg-orange-100 text-orange-700',
  kargo: 'bg-blue-100 text-blue-700',
  donanim: 'bg-purple-100 text-purple-700',
  diger: 'bg-gray-100 text-gray-700',
};

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // OCR states
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  // Expense Form
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'ofis',
    description: '',
    receiptUrl: '',
    expenseDate: new Date().toISOString().substring(0, 10),
  });

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminExpenses();
      setExpenses(data || []);
    } catch (e) {
      console.error('Failed to load expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) {
      alert('Masraf adı ve tutar zorunludur.');
      return;
    }
    setSaving(true);
    try {
      await createAdminExpense(form);
      setShowModal(false);
      setForm({
        title: '',
        amount: '',
        category: 'ofis',
        description: '',
        receiptUrl: '',
        expenseDate: new Date().toISOString().substring(0, 10),
      });
      loadExpenses();
    } catch (err: any) {
      alert('Masraf ekleme hatası: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu masraf kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await deleteAdminExpense(id);
      loadExpenses();
    } catch (err: any) {
      alert('Silme hatası: ' + err.message);
    }
  };

  const handleOcrSelect = async (url: string) => {
    setIsMediaPickerOpen(false);
    setOcrLoading(true);
    try {
      const response = await analyzeReceiptOcr(url);
      if (response && response.success && response.data) {
        const ocrData = response.data;
        // Pre-fill form and open modal
        setForm({
          title: ocrData.title || 'Otomatik Fiş Gideri',
          amount: ocrData.amount || '',
          category: ocrData.category || 'ofis',
          description: ocrData.description || '',
          receiptUrl: ocrData.receiptUrl || '',
          expenseDate: ocrData.expenseDate ? ocrData.expenseDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
        });
        setShowModal(true);
      } else {
        alert('OCR tarama başarısız oldu.');
      }
    } catch (err: any) {
      alert('OCR analiz hatası: ' + err.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const filtered = expenses.filter(e =>
    (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-blue-600" /> Gider &amp; Masraf Yönetimi
          </h1>
          <p className="text-sm text-gray-500">Fişlerinizi, faturalarınızı ve işletme giderlerinizi tek noktadan izleyin.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsMediaPickerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Camera className="w-4 h-4" /> Ücretsiz Fiş Okut (OCR)
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Yeni Masraf Girişi
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Filtrelenmiş Masraf</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{filtered.length} Fiş</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Toplam Gider</p>
          <p className="text-2xl font-black text-red-600 mt-1">
            ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm col-span-2 md:col-span-2 flex items-center justify-between bg-blue-50/20 border-blue-100">
          <div>
            <p className="text-xs text-blue-800 font-bold uppercase tracking-wider">Ücretsiz Fiş Okuma</p>
            <p className="text-xs text-gray-500 mt-1">Fişinizi yükleyerek tutar, tarih ve kategorinin otomatik algılanmasını sağlayın.</p>
          </div>
          <button
            onClick={() => setIsMediaPickerOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 text-white text-[11px] font-black rounded-lg hover:bg-blue-700"
          >
            Şimdi Dene
          </button>
        </div>
      </div>

      {/* OCR Loading Overlay */}
      {ocrLoading && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-center gap-4 animate-pulse">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-black text-blue-900">Yapay Zeka OCR Fiş Analizi Başlatıldı...</p>
            <p className="text-xs text-blue-600 mt-0.5">Lütfen bekleyin; fiş görselindeki tutar, tarih ve satıcı bilgileri çıkartılıyor.</p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Masraf adı veya kategori ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-12">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Masraf kaydı bulunamadı.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-gray-500">
                  <th className="p-4">Harcama Tarihi</th>
                  <th className="p-4">Masraf Adı</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Açıklama</th>
                  <th className="p-4">Fiş Görseli</th>
                  <th className="p-4 text-right">Tutar</th>
                  <th className="p-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-gray-700">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-gray-400">
                      {new Date(e.expenseDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-4 font-bold text-gray-900">{e.title}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${CATEGORY_COLORS[e.category || 'diger']}`}>
                        {CATEGORY_LABELS[e.category || 'diger']}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 max-w-xs truncate">{e.description}</td>
                    <td className="p-4">
                      {e.receiptUrl ? (
                        <a href={mediaUrl(e.receiptUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-bold">
                          <ImageIcon className="w-3.5 h-3.5" /> Fişi Görüntüle
                        </a>
                      ) : (
                        <span className="text-gray-300">Yok</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-black text-gray-900 text-sm">
                      ₺{parseFloat(e.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg text-red-500 transition-colors"
                        title="Masrafı Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New/Review Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-black text-gray-900">
                {form.receiptUrl ? '🔍 Fiş Analizi / Masraf Onayı' : 'Yeni Masraf Kaydı Ekle'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {form.receiptUrl && (
              <div className="bg-green-50/50 border-b border-green-100 p-4 flex items-center gap-2 text-xs font-bold text-green-800">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Ücretsiz Fiş Okuma entegrasyonu fiş detaylarını çıkardı. Lütfen doğrulayın.</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Masraf Adı / Firma</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Örn: Shell Akaryakıt, Yemek Sepeti vb."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tutar (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-bold text-gray-900"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Harcama Tarihi</label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fiş Görseli URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.receiptUrl}
                      onChange={e => setForm({ ...form, receiptUrl: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Medya URL'si"
                      readOnly={!!form.receiptUrl}
                    />
                    {form.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, receiptUrl: '' })}
                        className="px-2 bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-100"
                        title="Görseli Kaldır"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Açıklama / Detay</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Masrafa dair ek notlar..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? 'Kaydediliyor...' : 'Gider Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fiş Okuma İçin Ortam Kütüphanesi Tetikleyicisi */}
      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleOcrSelect}
      />
    </div>
  );
}
