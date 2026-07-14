import { useState, useEffect } from 'react';
import { Plus, X, Tag, DownloadCloud, Edit2, Trash2, Calendar, Percent } from 'lucide-react';
import { fetchAdminCampaigns, createCampaign, updateCampaign, deleteCampaign, importCampaignRemoteImages } from '../../lib/api';
import MediaPicker from '../../components/ui/MediaPicker';

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    imageUrl: '', 
    startDate: '', 
    endDate: '', 
    discountRate: '', 
    status: 'taslak' 
  });
  const [showPicker, setShowPicker] = useState(false);

  const load = async () => {
    try { 
      setLoading(true);
      const d = await fetchAdminCampaigns(); 
      setCampaigns(d || []); 
    }
    catch (e) { 
      console.error(e); 
    }
    finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ 
      title: '', 
      description: '', 
      imageUrl: '', 
      startDate: '', 
      endDate: '', 
      discountRate: '', 
      status: 'taslak' 
    });
    setShowModal(true);
  };

  const openEdit = (camp: any) => {
    setEditing(camp);
    // Format dates to YYYY-MM-DD for HTML input[type=date]
    const fmtDate = (dStr: string) => {
      if (!dStr) return '';
      const d = new Date(dStr);
      return d.toISOString().split('T')[0];
    };
    setForm({
      title: camp.title || '',
      description: camp.description || '',
      imageUrl: camp.imageUrl || '',
      startDate: fmtDate(camp.startDate),
      endDate: fmtDate(camp.endDate),
      discountRate: camp.discountRate ? Number(camp.discountRate).toString() : '',
      status: camp.status || 'taslak'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCampaign(editing.id, form);
      } else {
        await createCampaign(form);
      }
      setShowModal(false);
      await load();
    } catch (e: any) { 
      alert('Hata: ' + e.message); 
    }
    finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteCampaign(id);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const toggleStatus = async (id: number, current: string) => {
    const next = current === 'aktif' ? 'pasif' : 'aktif';
    try { 
      await updateCampaign(id, { status: next }); 
      await load(); 
    }
    catch (e: any) { 
      alert('Hata: ' + e.message); 
    }
  };

  const handleImportRemoteImages = async () => {
    setImporting(true);
    try {
      const result = await importCampaignRemoteImages();
      alert(`${result.imported || 0} kampanya görseli medya kütüphanesine alındı.`);
      await load();
    } catch (e: any) { 
      alert('Hata: ' + e.message); 
    }
    finally { 
      setImporting(false); 
    }
  };

  const STATUS_COLORS: Record<string, string> = { 
    aktif: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
    pasif: 'bg-gray-50 text-gray-500 border-gray-200', 
    taslak: 'bg-amber-50 text-amber-700 border-amber-100' 
  };
  const STATUS_LABELS: Record<string, string> = { 
    aktif: 'Aktif', 
    pasif: 'Pasif', 
    taslak: 'Taslak' 
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kampanya Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Sitede aktif ve pasif olarak listelenecek kampanyaları yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleImportRemoteImages} 
            disabled={importing} 
            className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 shadow-xs disabled:opacity-50 transition-colors"
          >
            <DownloadCloud className="w-4 h-4 mr-2 text-gray-500" /> Dış Görselleri İçe Aktar
          </button>
          <button 
            onClick={openCreate} 
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-semibold rounded-xl shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 mr-2" /> Yeni Kampanya
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white border border-gray-100 rounded-3xl shadow-xs">
              <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300 stroke-[1.5]" />
              <p className="font-bold text-gray-700 text-lg">Henüz kampanya eklenmedi</p>
              <p className="text-gray-400 text-sm mt-1">Sitenizde gösterecek ilk kampanyanızı oluşturun.</p>
            </div>
          ) : campaigns.map(camp => (
            <div key={camp.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col relative group">
              
              {/* Campaign Image Wrapper */}
              <div className="h-44 relative bg-slate-50 overflow-hidden">
                {camp.imageUrl ? (
                  <img src={camp.imageUrl} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                    <Tag className="w-10 h-10 mb-2 stroke-[1.5]" />
                    <span className="text-xs font-semibold">Görsel Seçilmedi</span>
                  </div>
                )}
                {camp.discountRate && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white font-black px-3 py-1 rounded-full text-xs shadow-md flex items-center gap-0.5">
                    <Percent className="w-3.5 h-3.5" />
                    <span>{Number(camp.discountRate)} İndirim</span>
                  </div>
                )}

                {/* Edit & Delete quick actions overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button 
                    onClick={() => openEdit(camp)}
                    className="p-2 bg-white hover:bg-gray-100 text-gray-900 rounded-xl transition-all shadow-lg hover:scale-110"
                    title="Düzenle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(camp.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-lg hover:scale-110"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card content */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-primary transition-colors">{camp.title}</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-full shrink-0 ml-2 ${STATUS_COLORS[camp.status]}`}>
                    {STATUS_LABELS[camp.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex-1 mb-4 leading-relaxed line-clamp-3">{camp.description || 'Açıklama girilmemiş.'}</p>
                
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(camp.startDate).toLocaleDateString('tr-TR')} — {new Date(camp.endDate).toLocaleDateString('tr-TR')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button
                    onClick={() => openEdit(camp)}
                    className="py-2 bg-slate-50 hover:bg-slate-100 text-gray-700 rounded-xl text-xs font-bold border border-slate-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" /> Düzenle
                  </button>
                  <button
                    onClick={() => toggleStatus(camp.id, camp.status)}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors ${camp.status === 'aktif' ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100' : 'bg-blue-50 text-primary hover:bg-blue-100 border border-blue-100'}`}
                  >
                    {camp.status === 'aktif' ? 'Pasife Al' : 'Aktife Al'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Edit & Create */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 font-display">{editing ? 'Kampanyayı Düzenle' : 'Yeni Kampanya Ekle'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Başlık *</label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                  placeholder="Kampanya başlığını yazın..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Açıklama</label>
                <textarea 
                  rows={3} 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none resize-none" 
                  placeholder="Kampanya açıklamasını yazın..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Görsel Seç *</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={form.imageUrl} 
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none font-mono" 
                    placeholder="https://... veya seçin" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPicker(true)} 
                    className="px-4 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shrink-0 transition-colors"
                  >
                    Seç / Yükle
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Başlangıç *</label>
                  <input 
                    type="date" 
                    value={form.startDate} 
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Bitiş *</label>
                  <input 
                    type="date" 
                    value={form.endDate} 
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">İndirim %</label>
                  <input 
                    type="number" 
                    value={form.discountRate} 
                    onChange={e => setForm({ ...form, discountRate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                    placeholder="20" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Yayın Durumu</label>
                <select 
                  value={form.status} 
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
                >
                  <option value="taslak">Taslak</option>
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors">İptal</button>
              <button 
                onClick={handleSave} 
                disabled={saving || !form.title || !form.startDate || !form.endDate}
                className="flex-1 bg-primary hover:bg-secondary text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center transition-colors shadow-md"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                {editing ? 'Güncelle' : 'Oluştur'}
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
