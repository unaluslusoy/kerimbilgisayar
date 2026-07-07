import { useState, useEffect } from 'react';
import { adminRequest } from '../../../lib/api';
import { Store, Loader2, Save, Image as ImageIcon, Phone } from 'lucide-react';

export default function AdminGoogleInfo() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState({
    title: '',
    primaryPhone: '',
    profile: { description: '' }
  });
  const [media, setMedia] = useState<any[]>([]);

  const fetchInfoAndMedia = async () => {
    try {
      const [infoData, mediaData] = await Promise.all([
        adminRequest('/api/admin/plugins/google-business/info'),
        adminRequest('/api/admin/plugins/google-business/media')
      ]);
      if (infoData) setInfo(infoData);
      if (mediaData && Array.isArray(mediaData)) setMedia(mediaData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfoAndMedia();
  }, []);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminRequest('/api/admin/plugins/google-business/info', {
        method: 'PATCH',
        body: JSON.stringify(info)
      });
      // Show success toast here if global toast is implemented, else alert for now or silent
      alert('İşletme bilgileri güncellendi.');
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" />
          İşletme Bilgileri & Medya
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Google Haritalar'daki temel profil bilgilerinizi ve fotoğraflarınızı buradan yönetin.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* INFO FORM */}
          <div className="lg:col-span-1">
            <form onSubmit={handleSaveInfo} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Temel Bilgiler</h2>
              
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İşletme Adı</label>
                  <input 
                    type="text" 
                    value={info.title || ''} 
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 rounded-theme px-3 py-2 text-sm text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">İşletme adı buradan değiştirilemez.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Phone className="w-4 h-4" /> Telefon Numarası
                  </label>
                  <input 
                    type="text" 
                    value={info.primaryPhone || ''} 
                    onChange={(e) => setInfo({...info, primaryPhone: e.target.value})}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0555..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hakkımızda (Açıklama)</label>
                  <textarea 
                    value={info.profile?.description || ''} 
                    onChange={(e) => setInfo({...info, profile: { ...info.profile, description: e.target.value }})}
                    rows={6}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="İşletmenizi Google'da arayanlara anlatın..."
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-theme hover:bg-secondary disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>

          {/* MEDIA GALLERY */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gray-400" /> Profil Fotoğrafları
                </h2>
              </div>
              
              {media.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">İşletme profilinize henüz fotoğraf yüklenmemiş.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {media.map((item, idx) => (
                    <div key={idx} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      <img 
                        src={item.googleUrl} 
                        alt={item.mediaFormat} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <span className="text-[10px] font-medium text-white uppercase tracking-wider">{item.mediaFormat}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
