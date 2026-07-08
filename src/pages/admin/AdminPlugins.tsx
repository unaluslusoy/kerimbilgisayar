import { useState, useEffect } from 'react';
import { ShieldAlert, MonitorPlay, BarChart, CheckCircle, XCircle, CreditCard, Copy, AlertCircle, ChevronRight } from 'lucide-react';
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
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [isPaytrModalOpen, setIsPaytrModalOpen] = useState(false);
  const [paytrMerchantId, setPaytrMerchantId] = useState('');
  const [paytrMerchantKey, setPaytrMerchantKey] = useState('');
  const [paytrMerchantSalt, setPaytrMerchantSalt] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [oauthJustCompleted, setOauthJustCompleted] = useState(false);

  // Redirect URI that must be registered in Google Cloud Console
  const redirectUri = `${window.location.origin}/api/admin/plugins/google-business/oauth/callback`;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPlugins = async (): Promise<any[]> => {
    try {
      const data = await adminRequest('/api/admin/plugins');
      setPlugins(data);
      return data;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleLocations = async () => {
    setLoadingLocations(true);
    setLocationsError('');
    try {
      const data = await adminRequest('/api/admin/plugins/google-business/locations');
      if (Array.isArray(data)) {
        setGoogleLocationsList(data);
        // Auto-select if only one location and none selected yet
        if (data.length === 1 && !googleLocation) {
          setGoogleLocation(data[0].name);
        }
      }
    } catch (e: any) {
      setLocationsError(e.message || 'Konumlar yüklenemedi');
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    // Handle OAuth redirect result (?oauth=success or ?oauth=error)
    const params = new URLSearchParams(window.location.search);
    const oauthResult = params.get('oauth');

    fetchPlugins().then((data) => {
      if (oauthResult === 'success') {
        setOauthJustCompleted(true);
        showToast('Google hesabı başarıyla yetkilendirildi! Şimdi işletme konumunuzu seçin.', 'success');
        const gmbPlugin = data?.find((p: any) => p.pluginId === 'google-business');
        if (gmbPlugin) openGoogleSettingsInternal(gmbPlugin, true);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (oauthResult === 'error') {
        const reason = params.get('reason') || '';
        const msg = reason
          ? `Google yetkilendirme hatası: ${decodeURIComponent(reason)}`
          : 'Google yetkilendirmesi başarısız oldu. Client ID, Secret ve Redirect URI\'yı kontrol edin.';
        showToast(msg, 'error');
        // Open modal so user can see the redirect URI and fix it
        const gmbPlugin = data?.find((p: any) => p.pluginId === 'google-business');
        if (gmbPlugin) openGoogleSettingsInternal(gmbPlugin);
        window.history.replaceState({}, '', window.location.pathname);
      }
    });
  }, []);

  const openGoogleSettingsInternal = async (dbPlugin: any, justAuthed = false) => {
    let settings = dbPlugin?.settings;
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (_) {}
    }
    const authorized = !!settings?.tokens;
    setGoogleClientId(settings?.clientId || '');
    setGoogleClientSecret(settings?.clientSecret || '');
    setGoogleLocation(settings?.selectedLocation || '');
    setIsGoogleAuthorized(authorized);
    setGoogleLocationsList([]);
    setLocationsError('');
    setIsGoogleModalOpen(true);

    if (authorized) {
      setLoadingLocations(true);
      try {
        const data = await adminRequest('/api/admin/plugins/google-business/locations');
        if (Array.isArray(data)) {
          setGoogleLocationsList(data);
          if (data.length === 1 && !settings?.selectedLocation) {
            setGoogleLocation(data[0].name);
          }
        }
      } catch (e: any) {
        setLocationsError(e.message || 'Konumlar yüklenemedi');
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const openGoogleSettings = (plugin: any) => {
    setOauthJustCompleted(false);
    openGoogleSettingsInternal(plugin);
  };

  const togglePlugin = async (pluginId: string, currentStatus: boolean) => {
    try {
      await adminRequest('/api/admin/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({ pluginId, isActive: !currentStatus })
      });
      await fetchPlugins();
    } catch (e: any) {
      showToast('Hata: ' + e.message, 'error');
    }
  };

  const saveGoogleSettings = async () => {
    setSavingSettings(true);
    try {
      // Save credentials + location (merges with existing tokens in DB)
      await adminRequest('/api/admin/plugins/google-business/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings: { clientId: googleClientId, clientSecret: googleClientSecret, selectedLocation: googleLocation }
        })
      });

      if (!isGoogleAuthorized) {
        // Get OAuth URL and redirect to Google
        const res = await adminRequest('/api/admin/plugins/google-business/oauth/url');
        if (res.url) {
          // Warn user to verify redirect URI before continuing
          if (res.redirectUri) {
            console.log('[GMB OAuth] Redirect URI being used:', res.redirectUri);
          }
          window.location.href = res.url;
          return;
        }
      }

      showToast('Ayarlar başarıyla kaydedildi!', 'success');
      setIsGoogleModalOpen(false);
      setOauthJustCompleted(false);
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
      setOauthJustCompleted(false);
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
      try { settings = JSON.parse(settings); } catch (_) {}
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

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // Current step in the Google setup wizard
  const googleStep = !isGoogleAuthorized ? 1 : !googleLocation ? 2 : 3;

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
              <div className="absolute top-4 right-4">
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

              <p className="text-sm text-gray-600 flex-1 mb-6">{plugin.description}</p>

              <div className="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center">
                {isActive && plugin.id === 'google-business' ? (
                  <button onClick={() => openGoogleSettings(dbPlugin)} className="text-sm text-primary font-medium hover:underline">
                    Ayarlar
                  </button>
                ) : isActive && plugin.id === 'paytr-integration' ? (
                  <button onClick={() => openPaytrSettings(dbPlugin)} className="text-sm text-primary font-medium hover:underline">
                    Ayarlar
                  </button>
                ) : (
                  <div />
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

      {/* ── Google Business Settings Modal ── */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Google İşletme Ayarları</h2>
                {oauthJustCompleted && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Yetkilendirme başarılı — işletme konumunuzu seçin
                  </p>
                )}
              </div>
              <button onClick={() => setIsGoogleModalOpen(false)} className="text-gray-400 hover:text-gray-600 mt-0.5">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step progress */}
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {[
                  { n: 1, label: 'Kimlik Bilgileri' },
                  { n: 2, label: 'Yetkilendirme' },
                  { n: 3, label: 'Konum Seç' },
                ].map(({ n, label }, i) => (
                  <div key={n} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                      googleStep > n ? 'bg-green-100 text-green-700' :
                      googleStep === n ? 'bg-primary text-white' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {googleStep > n ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{n}</span>}
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Redirect URI — must be added to Google Cloud Console */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Google Cloud Console → OAuth 2.0 → Yetkili Yönlendirme URI'ları
                </p>
                <div className="flex items-center gap-2 bg-white rounded border border-blue-200 px-2 py-1.5">
                  <code className="text-xs text-gray-700 flex-1 break-all">{redirectUri}</code>
                  <button onClick={copyRedirectUri} className="shrink-0 text-blue-600 hover:text-blue-800" title="Kopyala">
                    {copied
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-1">Bu URI'yı Google Cloud Console'a eklemeyi unutmayın.</p>
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="xxxx.apps.googleusercontent.com"
                  disabled={isGoogleAuthorized}
                />
              </div>

              {/* Client Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                <input
                  type={isGoogleAuthorized ? 'password' : 'text'}
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="GOCSPX-..."
                  disabled={isGoogleAuthorized}
                />
              </div>

              {/* After OAuth: location selector */}
              {isGoogleAuthorized && (
                <div className="space-y-3">
                  {loadingLocations ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      İşletme konumları yükleniyor...
                    </div>
                  ) : locationsError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      <strong>Konum yükleme hatası:</strong> {locationsError}
                      <br />
                      <span className="text-xs text-red-500">
                        Google Cloud Console'da ilgili API'lerin etkin olduğundan emin olun.
                      </span>
                      <button
                        onClick={loadGoogleLocations}
                        className="block mt-2 text-xs text-red-600 underline hover:text-red-800"
                      >
                        Tekrar dene
                      </button>
                    </div>
                  ) : googleLocationsList.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        İşletme Konumu
                        {oauthJustCompleted && (
                          <span className="ml-2 text-xs font-normal text-green-600">← Bir konum seçin ve kaydedin</span>
                        )}
                      </label>
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
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      Hesabınıza bağlı işletme konumu bulunamadı. Google Hesabınızın bir işletmeye yönetici olarak eklendiğinden emin olun.
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Google hesabı yetkilendirilmiş
                      {googleLocation && <span className="ml-1 text-gray-400">· Konum seçildi ✓</span>}
                    </span>
                    <button
                      onClick={() => {
                        setIsGoogleAuthorized(false);
                        setGoogleLocationsList([]);
                        setGoogleLocation('');
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Farklı hesapla yetkilendir
                    </button>
                  </div>
                </div>
              )}

              {/* Required APIs info (only before auth) */}
              {!isGoogleAuthorized && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1.5">Google Cloud Console'da etkin olması gereken API'ler:</p>
                  <ul className="text-xs text-gray-500 space-y-0.5">
                    <li>• Business Profile API</li>
                    <li>• My Business Business Information API</li>
                    <li>• My Business Account Management API</li>
                    <li>• Business Profile Performance API</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 flex justify-between items-center gap-3 rounded-b-xl border-t border-gray-100">
              <button
                onClick={resetGoogleSettings}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-theme hover:bg-red-100 transition-colors"
              >
                Sıfırla
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
                  disabled={
                    savingSettings ||
                    !googleClientId ||
                    !googleClientSecret ||
                    (isGoogleAuthorized && !googleLocation)
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-theme hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {savingSettings
                    ? 'İşleniyor...'
                    : isGoogleAuthorized
                      ? 'Konumu Kaydet'
                      : 'Google ile Yetkilendir →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PayTR Settings Modal ── */}
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
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-4 rounded-xl shadow-2xl text-white text-base font-semibold transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
