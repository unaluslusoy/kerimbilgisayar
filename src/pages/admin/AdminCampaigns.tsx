import { useState, useEffect } from 'react';
import { Plus, X, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchAdminCampaigns, createCampaign, updateCampaign } from '../../lib/api';
import MediaPicker from '../../components/ui/MediaPicker';

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', imageUrl: '', startDate: '', endDate: '', discountRate: '', status: 'taslak' });
  const [showPicker, setShowPicker] = useState(false);

  const load = async () => {
    try { const d = await fetchAdminCampaigns(); setCampaigns(d); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.startDate || !form.endDate) return;
    setSaving(true);
    try { await createCampaign(form); setShowModal(false); setForm({ title: '', description: '', imageUrl: '', startDate: '', endDate: '', discountRate: '', status: 'taslak' }); await load(); }
    catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (id: number, current: string) => {
    const next = current === 'aktif' ? 'pasif' : 'aktif';
    try { await updateCampaign(id, { status: next }); await load(); }
    catch (e: any) { alert('Hata: ' + e.message); }
  };

  const STATUS_COLORS: Record<string, string> = { aktif: 'bg-blue-100 text-secondary', pasif: 'bg-gray-100 text-gray-500', taslak: 'bg-yellow-100 text-yellow-700' };
  const STATUS_LABELS: Record<string, string> = { aktif: 'Aktif', pasif: 'Pasif', taslak: 'Taslak' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kampanya Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Aktif ve pasif kampanyaları yönetin.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Yeni Kampanya
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Henüz kampanya eklenmedi</p>
            </div>
          ) : campaigns.map(camp => (
            <div key={camp.id} className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              {camp.imageUrl && (
                <div className="h-40 relative">
                  <img src={camp.imageUrl} alt={camp.title} className="w-full h-full object-cover" />
                  {camp.discountRate && (
                    <div className="absolute top-3 right-3 bg-primary text-white font-bold px-2.5 py-1 rounded-full text-xs">
                      %{Number(camp.discountRate)} İndirim
                    </div>
                  )}
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 text-sm">{camp.title}</h3>
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full shrink-0 ml-2 ${STATUS_COLORS[camp.status]}`}>{STATUS_LABELS[camp.status]}</span>
                </div>
                <p className="text-xs text-gray-500 flex-1 mb-4">{camp.description}</p>
                <div className="text-xs text-gray-400 mb-3">
                  {new Date(camp.startDate).toLocaleDateString('tr-TR')} — {new Date(camp.endDate).toLocaleDateString('tr-TR')}
                </div>
                <button
                  onClick={() => toggleStatus(camp.id, camp.status)}
                  className={`w-full py-2 rounded-theme text-xs font-semibold transition-colors ${camp.status === 'aktif' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-50 text-primary hover:bg-blue-100'}`}
                >
                  {camp.status === 'aktif' ? 'Pasife Al' : 'Aktife Al'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Yeni Kampanya</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Görsel URL</label>
                <div className="flex gap-2">
                  <input type="text" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="https://..." />
                  <button type="button" onClick={() => setShowPicker(true)} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-theme text-xs font-semibold text-gray-700 shrink-0">Seç</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İndirim %</label>
                  <input type="number" value={form.discountRate} onChange={e => setForm({ ...form, discountRate: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Durumu</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary">
                  <option value="taslak">Taslak</option>
                  <option value="aktif">Aktif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={handleCreate} disabled={saving || !form.title || !form.startDate || !form.endDate}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                Oluştur
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
