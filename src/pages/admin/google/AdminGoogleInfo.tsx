import { useState, useEffect } from 'react';
import { adminRequest } from '../../../lib/api';
import {
  Store, Loader2, Save, Image as ImageIcon, Phone, FileText,
  Trash2, RefreshCw, AlertTriangle, CheckCircle, X, Upload, Link as LinkIcon
} from 'lucide-react';

const MEDIA_CATEGORIES = [
  { value: 'ADDITIONAL', label: 'Genel Fotoğraf' },
  { value: 'COVER', label: 'Kapak Fotoğrafı' },
  { value: 'PROFILE', label: 'Profil Fotoğrafı' },
  { value: 'LOGO', label: 'Logo' },
  { value: 'EXTERIOR', label: 'Dış Görünüm' },
  { value: 'INTERIOR', label: 'İç Mekan' },
  { value: 'PRODUCT', label: 'Ürün' },
  { value: 'AT_WORK', label: 'Çalışma Ortamı' },
  { value: 'FOOD_AND_DRINK', label: 'Yiyecek & İçecek' },
  { value: 'MENU', label: 'Menü' },
  { value: 'COMMON_AREA', label: 'Ortak Alan' },
  { value: 'ROOMS', label: 'Odalar' },
  { value: 'TEAMS', label: 'Ekip' },
];

export default function AdminGoogleInfo() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [info, setInfo] = useState({ title: '', primaryPhone: '', profile: { description: '' } });
  const [media, setMedia] = useState<any[]>([]);
  const [deletingMedia, setDeletingMedia] = useState<any | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadCategory, setUploadCategory] = useState('ADDITIONAL');
  const [uploading, setUploading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [infoData, mediaData] = await Promise.all([
        adminRequest('/api/admin/plugins/google-business/info'),
        adminRequest('/api/admin/plugins/google-business/media'),
      ]);
      if (infoData) setInfo(infoData);
      if (Array.isArray(mediaData)) setMedia(mediaData);
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminRequest('/api/admin/plugins/google-business/info', {
        method: 'PATCH',
        body: JSON.stringify({ primaryPhone: info.primaryPhone, profile: { description: info.profile?.description } }),
      });
      showToast('İşletme bilgileri güncellendi.');
    } catch (e: any) { showToast('Güncellenemedi: ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;
    setUploading(true);
    try {
      await adminRequest('/api/admin/plugins/google-business/media', {
        method: 'POST',
        body: JSON.stringify({ sourceUrl: uploadUrl, category: uploadCategory }),
      });
      setUploadOpen(false);
      setUploadUrl('');
      setUploadCategory('ADDITIONAL');
      showToast('Fotoğraf eklendi.');
      fetchAll();
    } catch (e: any) { showToast('Yüklenemedi: ' + e.message, 'error'); }
    finally { setUploading(false); }
  };

  const handleDeleteMedia = async () => {
    if (!deletingMedia) return;
    setDeletingLoading(true);
    try {
      await adminRequest('/api/admin/plugins/google-business/media', {
        method: 'DELETE',
        body: JSON.stringify({ mediaName: deletingMedia.name }),
      });
      setDeletingMedia(null);
      showToast('Fotoğraf silindi.');
      fetchAll();
    } catch (e: any) { showToast('Silinemedi: ' + e.message, 'error'); }
    finally { setDeletingLoading(false); }
  };

  if (errorMsg && !loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-red-100">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Google Hesabınız Bağlı Değil</h2>
      <p className="text-gray-500 mb-6 text-center max-w-md">{errorMsg}</p>
      <a href="/admin/eklentiler" className="px-5 py-2.5 bg-primary text-white font-medium rounded-theme hover:bg-secondary">Eklentiler Sayfasına Git</a>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Store className="w-6 h-6 text-primary" /> İşletme Bilgileri & Medya</h1>
          <p className="text-sm text-gray-500 mt-1">Google Haritalar profil bilgilerinizi ve fotoğraflarınızı yönetin.</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Yenile
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* INFO FORM */}
          <form onSubmit={handleSaveInfo} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h2 className="text-sm font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> Temel Bilgiler
            </h2>
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">İşletme Adı</label>
                <input type="text" value={info.title || ''} disabled className="w-full border border-gray-200 bg-gray-50 rounded-theme px-3 py-2 text-sm text-gray-500 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Google tarafından yönetilir.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Telefon
                </label>
                <input type="text" value={info.primaryPhone || ''} onChange={(e) => setInfo({ ...info, primaryPhone: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="+90 555 000 00 00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Açıklama</label>
                <textarea value={info.profile?.description || ''} onChange={(e) => setInfo({ ...info, profile: { ...info.profile, description: e.target.value } })}
                  rows={7} className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                  placeholder="İşletmenizi tanıtın..." />
                <p className="text-xs text-gray-400 mt-1 text-right">{(info.profile?.description || '').length} karakter</p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <button type="submit" disabled={saving} className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-theme hover:bg-secondary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Kaydet
              </button>
            </div>
          </form>

          {/* MEDIA */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-400" /> Profil Fotoğrafları
                {media.length > 0 && <span className="text-xs font-normal text-gray-400">({media.length})</span>}
              </h2>
              <button onClick={() => setUploadOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-secondary">
                <Upload className="w-3.5 h-3.5" /> Fotoğraf Ekle
              </button>
            </div>

            {media.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium text-sm">Henüz fotoğraf bulunmuyor</p>
                <p className="text-xs text-gray-400 mt-1">URL girerek Google profilinize fotoğraf ekleyebilirsiniz.</p>
                <button onClick={() => setUploadOpen(true)} className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary/5">
                  <Upload className="w-3.5 h-3.5" /> Fotoğraf Ekle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {media.map((item, idx) => (
                  <div key={item.name || idx} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:shadow-md transition-all">
                    <img src={item.thumbnailUrl || item.googleUrl} alt={item.mediaFormat || 'Media'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-semibold text-white uppercase tracking-wider truncate">{item.mediaFormat}</span>
                      <button onClick={() => setDeletingMedia(item)} className="p-1.5 bg-red-600 rounded-lg text-white hover:bg-red-700 shrink-0" title="Sil">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-primary" /> URL ile Fotoğraf Ekle</h3>
              <button onClick={() => setUploadOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fotoğraf URL'si</label>
                <input type="url" value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="https://example.com/photo.jpg" required />
                <p className="text-xs text-gray-400 mt-1">Fotoğraf herkese açık bir URL üzerinde erişilebilir olmalıdır.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                  {MEDIA_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setUploadOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">İptal</button>
                <button type="submit" disabled={uploading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-theme hover:bg-secondary disabled:opacity-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Media Confirm */}
      {deletingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">Fotoğrafı sil?</h3>
                {deletingMedia.thumbnailUrl && <img src={deletingMedia.thumbnailUrl} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-200 mb-2" referrerPolicy="no-referrer" />}
                <p className="text-xs text-red-500">Bu işlem geri alınamaz.</p>
              </div>
              <button onClick={() => setDeletingMedia(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingMedia(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">İptal</button>
              <button onClick={handleDeleteMedia} disabled={deletingLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-theme hover:bg-red-700 disabled:opacity-50">
                {deletingLoading && <Loader2 className="w-4 h-4 animate-spin" />} Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
