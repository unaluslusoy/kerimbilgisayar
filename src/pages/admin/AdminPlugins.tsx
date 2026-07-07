import { useState, useEffect } from 'react';
import { Puzzle, ShieldAlert, MonitorPlay, BarChart, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { adminRequest } from '../../lib/api';

const AVAILABLE_PLUGINS = [
  {
    id: 'google-business',
    name: 'Google My Business',
    description: 'Google Haritalar işletme puanınızı ve yorumlarınızı sitenizin alt kısmında (footer) canlı olarak gösterir. Ziyaretçilere güven verir.',
    icon: BarChart,
    color: 'text-primary',
    bg: 'bg-blue-50',
    type: 'Marketing'
  },
  {
    id: 'maintenance-mode',
    name: 'Bakım Modu',
    description: 'Sitenizi ziyaretçilere kapatarak "Kısa Bir Süreliğine Bakımdayız" mesajı gösterir. Yöneticiler paneli kullanmaya devam edebilir.',
    icon: ShieldAlert,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    type: 'System'
  },
  {
    id: 'advanced-seo',
    name: 'Gelişmiş SEO ve Analitik',
    description: 'Tüm sayfalarda geçerli Google Analytics, Facebook Pixel ve Meta etiketlerini yönetebileceğiniz ekstra bir alan açar.',
    icon: MonitorPlay,
    color: 'text-green-600',
    bg: 'bg-green-50',
    type: 'Marketing'
  },
  {
    id: 'paytr-integration',
    name: 'PayTR Entegre Öde Al',
    description: 'PayTR sanal pos entegrasyonu ile web sitenizden güvenle ödeme alın.',
    icon: CreditCard,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    type: 'Payment'
  }
];

export default function AdminPlugins() {
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleLocation, setGoogleLocation] = useState('');
  const [googleLocationsList, setGoogleLocationsList] = useState<any[]>([]);
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [isPaytrModalOpen, setIsPaytrModalOpen] = useState(false);
  const [paytrMerchantId, setPaytrMerchantId] = useState('');
  const [paytrMerchantKey, setPaytrMerchantKey] = useState('');
  const [paytrMerchantSalt, setPaytrMerchantSalt] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPlugins = async () => {
    try {
      const data = await adminRequest('/api/admin/plugins');
      setPlugins(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const togglePlugin = async (pluginId: string, currentStatus: boolean) => {
    try {
      await adminRequest('/api/admin/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({ pluginId, isActive: !currentStatus })
      });
      await fetchPlugins(); // Refresh state
    } catch (e: any) {
      showToast('Hata: ' + e.message, 'error');
    }
  };

  const openGoogleSettings = async (plugin: any) => {
    let settings = plugin?.settings;
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) {}
    }
    setGoogleClientId(settings?.clientId || '');
    setGoogleClientSecret(settings?.clientSecret || '');
    setGoogleLocation(settings?.selectedLocation || '');
    setIsGoogleAuthorized(!!settings?.tokens);
    setIsGoogleModalOpen(true);
    
    if (settings?.tokens) {
      try {
        const data = await adminRequest('/api/admin/plugins/google-business/locations');
        if (Array.isArray(data)) setGoogleLocationsList(data);
      } catch(e) {}
    }
  };

  const saveGoogleSettings = async () => {
    setSavingSettings(true);
    try {
      await adminRequest('/api/admin/plugins/google-business/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings: { clientId: googleClientId, clientSecret: googleClientSecret, selectedLocation: googleLocation }
        })
      });
      showToast('Ayarlar başarıyla kaydedildi!', 'success');
      
      if (!isGoogleAuthorized) {
        const res = await adminRequest('/api/admin/plugins/google-business/oauth/url');
        if (res.url) {
          window.location.href = res.url;
          return;
        }
      }
      
      setIsGoogleModalOpen(false);
      fetchPlugins();
    } catch (e: any) {
      showToast('Hata: ' + e.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const resetGoogleSettings = async () => {
    if (!confirm('Tüm Google ayarlarını sıfırlamak istediğinize emin misiniz? (Bağlantınız kesilecektir)')) return;
    try {
      await adminRequest('/api/admin/plugins/google-business/settings', { method: 'DELETE' });
      setGoogleClientId('');
      setGoogleClientSecret('');
      setGoogleLocation('');
      setIsGoogleAuthorized(false);
      setGoogleLocationsList([]);
      fetchPlugins();
      showToast('Ayarlar başarıyla sıfırlandı.', 'success');
      setIsGoogleModalOpen(false);
    } catch (e: any) {
      showToast('Hata: ' + e.message, 'error');
    }
  };

  const openPaytrSettings = (plugin: any) => {
    let settings = plugin?.settings;
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) {}
    }
    setPaytrMerchantId(settings?.merchantId || '');
    setPaytrMerchantKey(settings?.merchantKey || '');
    setPaytrMerchantSalt(settings?.merchantSalt || '');
    setIsPaytrModalOpen(true);
  };

  const savePaytrSettings = async () => {
    setSavingSettings(true);
    try {
      await adminRequest('/api/admin/plugins/paytr-integration/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings: { merchantId: paytrMerchantId, merchantKey: paytrMerchantKey, merchantSalt: paytrMerchantSalt }
        })
      });
      showToast('PayTR ayarları başarıyla kaydedildi!', 'success');
      setIsPaytrModalOpen(false);
      fetchPlugins();
    } catch (e: any) {
      showToast('Hata: ' + e.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const resetPaytrSettings = async () => {
    if (!confirm('PayTR ayarlarını sıfırlamak istediğinize emin misiniz?')) return;
    try {
      await adminRequest('/api/admin/plugins/paytr-integration/settings', { method: 'DELETE' });
      setPaytrMerchantId('');
      setPaytrMerchantKey('');
      setPaytrMerchantSalt('');
      fetchPlugins();
      showToast('Ayarlar başarıyla sıfırlandı.', 'success');
      setIsPaytrModalOpen(false);
    } catch (e: any) {
      showToast('Hata: ' + e.message, 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Eklentiler & Modüller</h1>
        <p className="text-sm text-gray-500 mt-1">Sisteminize ekstra özellikler kazandıran eklentileri buradan yönetebilirsiniz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AVAILABLE_PLUGINS.map(plugin => {
          const dbPlugin = plugins.find(p => p.pluginId === plugin.id);
          const isActive = dbPlugin ? dbPlugin.isActive : false;
          
          return (
            <div key={plugin.id} className="bg-white border border-gray-200 rounded-theme p-6 flex flex-col relative overflow-hidden transition-shadow hover:shadow-md">
              {/* Badge */}
              <div className="absolute top-4 right-4 flex items-center space-x-1">
                {isActive ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" /> Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                    <XCircle className="w-3 h-3 mr-1" /> Pasif
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4 mb-4 mt-2">
                <div className={`p-3 rounded-theme ${plugin.bg}`}>
                  <plugin.icon className={`w-6 h-6 ${plugin.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 leading-tight">{plugin.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plugin.type}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 flex-1 mb-6">
                {plugin.description}
              </p>

              <div className="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center">
                {isActive && plugin.id === 'google-business' ? (
                  <button onClick={() => openGoogleSettings(dbPlugin)} className="text-sm text-primary font-medium hover:underline">Ayarlar</button>
                ) : isActive && plugin.id === 'paytr-integration' ? (
                  <button onClick={() => openPaytrSettings(dbPlugin)} className="text-sm text-primary font-medium hover:underline">Ayarlar</button>
                ) : (
                  <div></div>
                )}

                <button
                  onClick={() => togglePlugin(plugin.id, isActive)}
                  className={`px-4 py-2 rounded-theme text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                      : 'bg-primary text-white hover:bg-secondary'
                  }`}
                >
                  {isActive ? 'Devre Dışı Bırak' : 'Aktifleştir'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Google İşletme Ayarları</h2>
              <button onClick={() => setIsGoogleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID (İstemci Kimliği)</label>
                <input 
                  type="text" 
                  value={googleClientId} 
                  onChange={(e) => setGoogleClientId(e.target.value)} 
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="xxxx.apps.googleusercontent.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret (İstemci Gizli Anahtarı)</label>
                <input 
                  type="password" 
                  value={googleClientSecret} 
                  onChange={(e) => setGoogleClientSecret(e.target.value)} 
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="GOCSPX-..."
                />
              </div>
              
              {isGoogleAuthorized && googleLocationsList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yönetilecek İşletme Konumu (Location)</label>
                  <select 
                    value={googleLocation} 
                    onChange={(e) => setGoogleLocation(e.target.value)} 
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">Seçiniz...</option>
                    {googleLocationsList.map((loc: any) => (
                      <option key={loc.name} value={loc.name}>{loc.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50 flex justify-between items-center gap-3 rounded-b-xl border-t border-gray-100">
              <button 
                onClick={resetGoogleSettings}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-theme hover:bg-red-100 transition-colors"
              >
                Ayarları Sıfırla
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsGoogleModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-theme hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button 
                  onClick={saveGoogleSettings}
                  disabled={savingSettings || !googleClientId || !googleClientSecret}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-theme hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {savingSettings ? 'İşleniyor...' : (isGoogleAuthorized ? 'Kaydet' : 'Google ile Yetkilendir')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPaytrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">PayTR Ayarları</h2>
              <button onClick={() => setIsPaytrModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza No (Merchant ID)</label>
                <input 
                  type="text" 
                  value={paytrMerchantId} 
                  onChange={(e) => setPaytrMerchantId(e.target.value)} 
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Örn: 123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza Parolası (Merchant Key)</label>
                <input 
                  type="password" 
                  value={paytrMerchantKey} 
                  onChange={(e) => setPaytrMerchantKey(e.target.value)} 
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="XXXXX..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza Gizli Anahtarı (Merchant Salt)</label>
                <input 
                  type="password" 
                  value={paytrMerchantSalt} 
                  onChange={(e) => setPaytrMerchantSalt(e.target.value)} 
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="YYYYY..."
                />
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-between items-center gap-3 rounded-b-xl border-t border-gray-100">
              <button 
                onClick={resetPaytrSettings}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-theme hover:bg-red-100 transition-colors"
              >
                Ayarları Sıfırla
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsPaytrModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-theme hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button 
                  onClick={savePaytrSettings}
                  disabled={savingSettings || !paytrMerchantId || !paytrMerchantKey || !paytrMerchantSalt}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-theme hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {savingSettings ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-4 rounded-xl shadow-2xl text-white text-base font-semibold transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
