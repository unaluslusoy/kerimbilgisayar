import { useState, useEffect } from 'react';
import { Save, CheckCircle, Send, Globe, Mail, Image, Monitor, Share2, Layout } from 'lucide-react';
import { adminRequest } from '../../lib/api';
import MediaPicker from '../../components/ui/MediaPicker';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('genel');
  const [settings, setSettings] = useState<Record<string, string>>({
    siteTitle: '',
    siteTagline: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    socialFacebook: '',
    socialTwitter: '',
    socialInstagram: '',
    socialLinkedin: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from_name: '',
    // SEO
    siteMetaDescription: '',
    siteOgImage: '',
    siteFocusKeyword: '',
    googleAnalyticsId: '',
    googleSearchConsoleCode: '',
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestMsg, setSmtpTestMsg] = useState('');
  const [pickerConfig, setPickerConfig] = useState<{ onSelect: (url: string) => void } | null>(null);




  const loadSettings = () => {
    adminRequest('/api/admin/settings').then(data => {
      if (data) setSettings(prev => ({ ...prev, ...data }));
    }).catch(console.error);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      await adminRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      loadSettings(); // Güncel değerleri tekrar çek
      setSuccessMsg('Ayarlar başarıyla kaydedildi.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSmtpTest = async () => {
    setSmtpTesting(true);
    setSmtpTestMsg('');
    try {
      // Önce ayarları kaydet
      await adminRequest('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
      const res = await adminRequest('/api/admin/settings/smtp-test', { method: 'POST' });
      setSmtpTestMsg(res.success ? '✅ Test e-postası başarıyla gönderildi!' : '❌ Gönderilemedi: ' + (res.error || 'Bilinmeyen hata'));
    } catch (e: any) {
      setSmtpTestMsg('❌ Hata: ' + e.message);
    } finally {
      setSmtpTesting(false);
      setTimeout(() => setSmtpTestMsg(''), 5000);
    }
  };

  const tabs = [
    { id: 'genel', label: 'Genel Ayarlar', icon: Monitor },
    { id: 'iletisim', label: 'İletişim', icon: Mail },
    { id: 'sosyal', label: 'Sosyal Medya', icon: Share2 },
    { id: 'smtp', label: 'E-Posta (SMTP)', icon: Send },
    { id: 'seo', label: 'SEO', icon: Globe },
  ];

  const inputCls = 'w-full border border-gray-300 rounded-theme px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sistem Ayarları</h1>
          <p className="text-sm text-gray-500 mt-1">Sitenizin çekirdek konfigürasyonlarını (İletişim, SMTP, SEO) buradan yönetin.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme transition-colors disabled:opacity-50 shadow-sm"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-800 rounded-theme flex items-center border border-green-200">
          <CheckCircle className="w-5 h-5 mr-2 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Tabs Sidebar */}
        <div className="w-full md:w-56 bg-gray-50 border-r border-gray-200 p-3 shrink-0">
          <nav className="space-y-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded-theme text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">

          {/* GENEL */}
          {activeTab === 'genel' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className={labelCls}>Site Başlığı</label>
                <input type="text" value={settings.siteTitle} onChange={e => handleChange('siteTitle', e.target.value)} className={inputCls} placeholder="Örn: Kerim Bilgisayar" />
                <p className="text-xs text-gray-500 mt-1">Tarayıcı sekmesinde ve arama sonuçlarında görünür.</p>
              </div>
              <div>
                <label className={labelCls}>Slogan (Tagline)</label>
                <input type="text" value={settings.siteTagline} onChange={e => handleChange('siteTagline', e.target.value)} className={inputCls} placeholder="Bireysel ve kurumsal IT çözümleri..." />
              </div>
            </div>
          )}

          {/* GÖRÜNÜM */}
          {activeTab === 'gorunum' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className={labelCls}>Logo URL (açık tema)</label>
                <div className="flex gap-2">
                  <input type="text" value={settings.logoUrl || ''} onChange={e => handleChange('logoUrl', e.target.value)} className={inputCls} placeholder="https://..." />
                  <button type="button" onClick={() => setPickerConfig({ onSelect: (url) => handleChange('logoUrl', url) })} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-theme text-xs font-semibold text-gray-700 shrink-0">Seç</button>
                </div>
                {settings.logoUrl && <img src={settings.logoUrl} alt="Logo önizleme" className="mt-3 h-12 object-contain border rounded-theme p-1" />}
              </div>
              <div>
                <label className={labelCls}>Footer Telif Metni (Copyright)</label>
                <input type="text" value={settings.footerText} onChange={e => handleChange('footerText', e.target.value)} className={inputCls} placeholder={`© ${new Date().getFullYear()} Tüm hakları saklıdır.`} />
              </div>
            </div>
          )}


          {/* İLETİŞİM */}
          {activeTab === 'iletisim' && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <label className={labelCls}>Ana E-posta Adresi</label>
                <input type="email" value={settings.contactEmail} onChange={e => handleChange('contactEmail', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Telefon Numarası</label>
                <input type="tel" value={settings.contactPhone} onChange={e => handleChange('contactPhone', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Açık Adres</label>
                <textarea rows={3} value={settings.contactAddress} onChange={e => handleChange('contactAddress', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Google Maps Embed URL</label>
                <input type="text" value={settings.googleMapsIframeUrl || ''} onChange={e => handleChange('googleMapsIframeUrl', e.target.value)} className={inputCls} placeholder="https://www.google.com/maps/embed?pb=..." />
                <p className="text-xs text-gray-500 mt-1">Google Haritalar üzerinden 'Paylaş &gt; Harita yerleştir' seçeneğindeki iframe src parametresini buraya ekleyin.</p>
              </div>

              <div className="pt-6 border-t border-gray-200 mt-6">
                <h3 className="font-bold text-gray-900 mb-4">İletişim Sayfası Hızlı Destek Kartları</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Kart 1 Başlık (Örn: Ürün Desteği)</label>
                    <input type="text" value={settings.contactCard1Title || ''} onChange={e => handleChange('contactCard1Title', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Kart 1 Link</label>
                    <input type="text" value={settings.contactCard1Link || ''} onChange={e => handleChange('contactCard1Link', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Kart 2 Başlık (Örn: Satış Desteği)</label>
                    <input type="text" value={settings.contactCard2Title || ''} onChange={e => handleChange('contactCard2Title', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Kart 2 Link</label>
                    <input type="text" value={settings.contactCard2Link || ''} onChange={e => handleChange('contactCard2Link', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Kart 3 Başlık (Örn: Destek Merkezi)</label>
                    <input type="text" value={settings.contactCard3Title || ''} onChange={e => handleChange('contactCard3Title', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Kart 3 Link</label>
                    <input type="text" value={settings.contactCard3Link || ''} onChange={e => handleChange('contactCard3Link', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 mt-6">
                <h3 className="font-bold text-gray-900 mb-4">İletişim Sayfası Üst Bilgiler & Banner</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Sayfa Alt Başlığı (Subtitle)</label>
                    <input type="text" value={settings.contactSubtitle || ''} onChange={e => handleChange('contactSubtitle', e.target.value)} className={inputCls} placeholder="İhtiyaçlarınıza en uygun bilişim sistemleri..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Banner Başlığı</label>
                      <input type="text" value={settings.contactBannerTitle || ''} onChange={e => handleChange('contactBannerTitle', e.target.value)} className={inputCls} placeholder="Kerim Bilgisayar çözümleri için bize ulaşın!" />
                    </div>
                    <div>
                      <label className={labelCls}>Banner Açıklaması</label>
                      <input type="text" value={settings.contactBannerDesc || ''} onChange={e => handleChange('contactBannerDesc', e.target.value)} className={inputCls} placeholder="İşletmenize uygun Yönetim Bilişim Sistemleri..." />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Banner Görseli URL</label>
                    <div className="flex gap-2">
                      <input type="text" value={settings.contactBannerImage || ''} onChange={e => handleChange('contactBannerImage', e.target.value)} className={inputCls} placeholder="https://images.unsplash.com/..." />
                      <button type="button" onClick={() => setPickerConfig({ onSelect: (url) => handleChange('contactBannerImage', url) })} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-theme text-xs font-semibold text-gray-700 shrink-0">Seç</button>
                    </div>
                    {settings.contactBannerImage && <img src={settings.contactBannerImage} alt="Banner önizleme" className="mt-3 h-16 object-cover border rounded-theme" />}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 mt-6">
                <h3 className="font-bold text-gray-900 mb-4">Şirket Resmi Bilgileri (Şirket Bilgileri Bölümü)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}>Mükellef Adı Soyadı</label>
                    <input type="text" value={settings.contactMukellefAdi || ''} onChange={e => handleChange('contactMukellefAdi', e.target.value)} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Ticaret Ünvanı (Şirket İsmi)</label>
                    <input type="text" value={settings.contactTicaretUnvan || ''} onChange={e => handleChange('contactTicaretUnvan', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Faks Numarası</label>
                    <input type="text" value={settings.contactFax || ''} onChange={e => handleChange('contactFax', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Mersis No</label>
                    <input type="text" value={settings.contactMersis || ''} onChange={e => handleChange('contactMersis', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>VKN</label>
                    <input type="text" value={settings.contactVkn || ''} onChange={e => handleChange('contactVkn', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Vergi Dairesi</label>
                    <input type="text" value={settings.contactVergiDairesi || ''} onChange={e => handleChange('contactVergiDairesi', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Ticaret Sicil No</label>
                    <input type="text" value={settings.contactTicaretSicil || ''} onChange={e => handleChange('contactTicaretSicil', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Esnaf Sicil No</label>
                    <input type="text" value={settings.contactEsnafSicil || ''} onChange={e => handleChange('contactEsnafSicil', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>NACE Kodu</label>
                    <input type="text" value={settings.contactNaceKodu || ''} onChange={e => handleChange('contactNaceKodu', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>KEP Adresi</label>
                    <input type="email" value={settings.contactKep || ''} onChange={e => handleChange('contactKep', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-200 mt-6">
                <h3 className="font-bold text-gray-900 mb-4">Banka Hesap Bilgileri & Hızlı Ödeme (QR)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelCls}>Banka Adı</label>
                    <input type="text" value={settings.contactBankName || ''} onChange={e => handleChange('contactBankName', e.target.value)} className={inputCls} placeholder="Örn: Garanti BBVA" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelCls}>Hesap Sahibi</label>
                    <input type="text" value={settings.contactBankAccount || ''} onChange={e => handleChange('contactBankAccount', e.target.value)} className={inputCls} placeholder="Örn: KERİM BİLGİSAYAR" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>IBAN Numarası</label>
                    <input type="text" value={settings.contactBankIban || ''} onChange={e => handleChange('contactBankIban', e.target.value)} className={inputCls} placeholder="TR00 0000 0000 0000 0000 0000 00" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>QR Kod Ödeme Görseli</label>
                    <div className="flex gap-2">
                      <input type="text" value={settings.contactBankQrCode || ''} onChange={e => handleChange('contactBankQrCode', e.target.value)} className={inputCls} placeholder="https://..." />
                      <button type="button" onClick={() => setPickerConfig({ onSelect: (url) => handleChange('contactBankQrCode', url) })} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-theme text-xs font-semibold text-gray-700 shrink-0">Seç</button>
                    </div>
                    {settings.contactBankQrCode && <img src={settings.contactBankQrCode} alt="QR önizleme" className="mt-3 h-24 object-contain border rounded-theme p-1" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SOSYAL MEDYA */}
          {activeTab === 'sosyal' && (
            <div className="space-y-5 max-w-2xl">
              {[
                { key: 'socialFacebook', label: 'Facebook URL', placeholder: 'https://facebook.com/...' },
                { key: 'socialTwitter', label: 'Twitter (X) URL', placeholder: 'https://twitter.com/...' },
                { key: 'socialInstagram', label: 'Instagram URL', placeholder: 'https://instagram.com/...' },
                { key: 'socialLinkedin', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/...' },
              ].map(field => (
                <div key={field.key}>
                  <label className={labelCls}>{field.label}</label>
                  <input type="url" value={settings[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)} className={inputCls} placeholder={field.placeholder} />
                </div>
              ))}
            </div>
          )}

          {/* SMTP */}
          {activeTab === 'smtp' && (
            <div className="space-y-5 max-w-2xl">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-theme text-sm text-blue-800">
                Bu ayarlar, servis durumu değişikliklerinde müşterilere gönderilen otomatik e-postalar için kullanılır.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>SMTP Sunucu (Host)</label>
                  <input type="text" value={settings.smtp_host || ''} onChange={e => handleChange('smtp_host', e.target.value)} className={inputCls} placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className={labelCls}>Port</label>
                  <input type="text" value={settings.smtp_port || '587'} onChange={e => handleChange('smtp_port', e.target.value)} className={inputCls} placeholder="587" />
                </div>
              </div>
              <div>
                <label className={labelCls}>SMTP Kullanıcı Adı (E-posta)</label>
                <input type="email" value={settings.smtp_user || ''} onChange={e => handleChange('smtp_user', e.target.value)} className={inputCls} placeholder="gonderici@ornek.com" />
              </div>
              <div>
                <label className={labelCls}>SMTP Şifre / Uygulama Şifresi</label>
                <input type="password" value={settings.smtp_pass || ''} onChange={e => handleChange('smtp_pass', e.target.value)} className={inputCls} placeholder="••••••••" />
              </div>
              <div>
                <label className={labelCls}>Gönderen Adı</label>
                <input type="text" value={settings.smtp_from_name || ''} onChange={e => handleChange('smtp_from_name', e.target.value)} className={inputCls} placeholder="Kerim Bilgisayar Servis" />
              </div>
              <div className="pt-2 border-t border-gray-200 flex items-center gap-3">
                <button
                  onClick={handleSmtpTest}
                  disabled={smtpTesting || !settings.smtp_host || !settings.smtp_user}
                  className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-theme transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {smtpTesting ? 'Test gönderiliyor...' : 'Test E-postası Gönder'}
                </button>
                {smtpTestMsg && <span className="text-sm font-medium">{smtpTestMsg}</span>}
              </div>
            </div>
          )}

          {/* SEO */}
          {activeTab === 'seo' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Site Geneli SEO Ayarları</h3>
                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Meta Açıklama (Site Geneli)</label>
                    <textarea rows={3} value={settings.siteMetaDescription || ''} onChange={e => handleChange('siteMetaDescription', e.target.value)} className={inputCls} placeholder="Arama motorlarında görünecek kısa site açıklaması (160 karakter önerilir)" />
                    <p className="text-xs text-gray-500 mt-1">{(settings.siteMetaDescription || '').length} / 160 karakter</p>
                  </div>
                  <div>
                    <label className={labelCls}>OG Görsel URL (Sosyal paylaşım görseli)</label>
                    <div className="flex gap-2">
                      <input type="url" value={settings.siteOgImage || ''} onChange={e => handleChange('siteOgImage', e.target.value)} className={inputCls} placeholder="https://..." />
                      <button type="button" onClick={() => setPickerConfig({ onSelect: (url) => handleChange('siteOgImage', url) })} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-theme text-xs font-semibold text-gray-700 shrink-0">Seç</button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Facebook, LinkedIn paylaşımlarında görünür. Önerilen boyut: 1200x630px</p>
                    {settings.siteOgImage && <img src={settings.siteOgImage} alt="OG görsel önizleme" className="mt-2 h-24 object-cover rounded-theme border" />}
                  </div>
                  <div>
                    <label className={labelCls}>Odak Anahtar Kelime</label>
                    <input type="text" value={settings.siteFocusKeyword || ''} onChange={e => handleChange('siteFocusKeyword', e.target.value)} className={inputCls} placeholder="bilgisayar tamiri istanbul, IT servis..." />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Analitik Entegrasyonları</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Google Analytics ID</label>
                    <input type="text" value={settings.googleAnalyticsId || ''} onChange={e => handleChange('googleAnalyticsId', e.target.value)} className={inputCls} placeholder="G-XXXXXXXXXX veya UA-XXXXXXXX-X" />
                  </div>
                  <div>
                    <label className={labelCls}>Google Search Console Doğrulama Kodu</label>
                    <input type="text" value={settings.googleSearchConsoleCode || ''} onChange={e => handleChange('googleSearchConsoleCode', e.target.value)} className={inputCls} placeholder="meta tag content değeri" />
                    <p className="text-xs text-gray-500 mt-1">Sadece content içeriğini (tırnaklar olmadan) girin</p>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
      <MediaPicker
        isOpen={pickerConfig !== null}
        onClose={() => setPickerConfig(null)}
        onSelect={(url) => {
          if (pickerConfig?.onSelect) pickerConfig.onSelect(url);
        }}
      />
    </div>
  );
}
