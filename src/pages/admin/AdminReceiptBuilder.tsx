import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { adminRequest } from '../../lib/api';
import { Printer, Settings, Eye, Check, RefreshCw, Undo, Save, Info, AlertTriangle, FileText, Compass, Type, Layout, Sliders } from 'lucide-react';
import { usePageTitle } from '../../lib/usePageTitle';

interface TemplateConfig {
  fontSize: number;
  fontFamily: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  headerTitle: string;
  headerSub: string;
  headerInfo: string;
  footerText: string;
  showLogo: boolean;
  logoUrl: string;
  showQrCode: boolean;
  showPatternLock: boolean;
  showSignature: boolean;
  signatureText: string;
}

const defaultA4: TemplateConfig = {
  fontSize: 12,
  fontFamily: 'Inter, sans-serif',
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 20,
  marginRight: 20,
  headerTitle: 'KERİM BİLGİSAYAR & TEKNİK SERVİS',
  headerSub: 'Bilgisayar - Tablet - Telefon Onarım Merkezi',
  headerInfo: 'Gsm: 0538 317 24 37 • E-posta: bilgi@kerimbilgisayar.com',
  footerText: 'Cihaz teslim alınırken bu giriş fişinin ibraz edilmesi zorunludur. 90 gün içerisinde teslim alınmayan cihazlardan firmamız sorumlu değildir.',
  showLogo: true,
  logoUrl: '',
  showQrCode: true,
  showPatternLock: true,
  showSignature: true,
  signatureText: 'Cihazı Teslim Alan Yetkili'
};

const defaultPOS: TemplateConfig = {
  fontSize: 10,
  fontFamily: 'Courier New, monospace',
  marginTop: 5,
  marginBottom: 5,
  marginLeft: 5,
  marginRight: 5,
  headerTitle: 'KERİM BİLGİSAYAR',
  headerSub: 'TEKNİK SERVİS FİŞİ',
  headerInfo: 'Destek: 0538 317 24 37',
  footerText: 'Cihaz takibi için QR kodu taratın.',
  showLogo: false,
  logoUrl: '',
  showQrCode: true,
  showPatternLock: false,
  showSignature: true,
  signatureText: 'Müşteri İmzası'
};

export default function AdminReceiptBuilder() {
  usePageTitle('Şablon Tasarımcısı');
  const { settings, reloadSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'a4' | 'pos'>('a4');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // States for configs
  const [a4Config, setA4Config] = useState<TemplateConfig>(defaultA4);
  const [posConfig, setPosConfig] = useState<TemplateConfig>(defaultPOS);

  useEffect(() => {
    if (settings.print_ticket_a4_template) {
      try {
        setA4Config(JSON.parse(settings.print_ticket_a4_template));
      } catch (e) {
        console.error("Error parsing A4 print settings", e);
      }
    }
    if (settings.print_ticket_pos_template) {
      try {
        setPosConfig(JSON.parse(settings.print_ticket_pos_template));
      } catch (e) {
        console.error("Error parsing POS print settings", e);
      }
    }
  }, [settings]);

  const currentConfig = activeTab === 'a4' ? a4Config : posConfig;

  const updateConfigField = (field: keyof TemplateConfig, value: any) => {
    if (activeTab === 'a4') {
      setA4Config(prev => ({ ...prev, [field]: value }));
    } else {
      setPosConfig(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleReset = () => {
    if (window.confirm('Bu şablonu varsayılan değerlere sıfırlamak istediğinize emin misiniz?')) {
      if (activeTab === 'a4') {
        setA4Config(defaultA4);
      } else {
        setPosConfig(defaultPOS);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const payload = {
        print_ticket_a4_template: JSON.stringify(a4Config),
        print_ticket_pos_template: JSON.stringify(posConfig)
      };
      await adminRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      await reloadSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-150/80 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-950 uppercase tracking-wider flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary" /> Fiş & Fatura Şablon Tasarımcısı
          </h2>
          <p className="text-xs text-gray-450 mt-1">
            Teknik servis biletleri ve teslimat makbuzları için yazdırma yerleşimlerini dinamik olarak tasarlayın.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
          >
            <Undo className="w-3.5 h-3.5" /> Varsayılana Dön
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-secondary text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-primary/20"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : success ? (
              <Check className="w-3.5 h-3.5 text-green-200" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? 'Kaydediliyor...' : success ? 'Kaydedildi!' : 'Şablonları Kaydet'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white p-2.5 rounded-2xl shadow-sm border border-gray-150/80">
        <button
          type="button"
          onClick={() => setActiveTab('a4')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'a4'
              ? 'bg-primary text-white shadow-md shadow-primary/10'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FileText className="w-4 h-4" /> Servis Giriş Formu (A4 Standart)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'pos'
              ? 'bg-primary text-white shadow-md shadow-primary/10'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Compass className="w-4 h-4" /> Termal Giriş/Teslim Fişi (80mm POS)
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Settings Panel */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-150/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" /> Yerleşim ve İçerik Ayarları
            </h3>
            <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
              {activeTab} Modu
            </span>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Header Content Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-900 border-l-2 border-primary pl-2 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-gray-450" /> Başlık & Kimlik Bilgileri
              </h4>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Şirket Ünvanı / Logosu</label>
                  <input
                    type="text"
                    value={currentConfig.headerTitle}
                    onChange={e => updateConfigField('headerTitle', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Örn: KERİM BİLGİSAYAR"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Alt Başlık / Slogan</label>
                  <input
                    type="text"
                    value={currentConfig.headerSub}
                    onChange={e => updateConfigField('headerSub', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Örn: Teknik Servis & Onarım Merkezi"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">İletişim & Adres Bilgileri</label>
                  <textarea
                    value={currentConfig.headerInfo}
                    onChange={e => updateConfigField('headerInfo', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-primary outline-none resize-none"
                    placeholder="Örn: Tel: 05XX XXX XX XX • Adres: ..."
                  />
                </div>
              </div>
            </div>

            {/* Layout Tuning Section */}
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <h4 className="text-xs font-bold text-gray-900 border-l-2 border-primary pl-2 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-gray-450" /> Tipografi ve Kenar Boşlukları
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Yazı Boyutu (px)</label>
                  <input
                    type="number"
                    value={currentConfig.fontSize}
                    onChange={e => updateConfigField('fontSize', parseInt(e.target.value) || 12)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    min={8}
                    max={20}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Yazı Tipi (Font)</label>
                  <select
                    value={currentConfig.fontFamily}
                    onChange={e => updateConfigField('fontFamily', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="Inter, sans-serif">Inter (Modern & Düzgün)</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="monospace">Monospace (Terminal Tipi)</option>
                    <option value="Courier New, monospace">Courier New</option>
                    <option value="Arial, sans-serif">Arial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 text-center">Üst (px)</label>
                  <input
                    type="number"
                    value={currentConfig.marginTop}
                    onChange={e => updateConfigField('marginTop', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-center text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 text-center">Alt (px)</label>
                  <input
                    type="number"
                    value={currentConfig.marginBottom}
                    onChange={e => updateConfigField('marginBottom', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-center text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 text-center">Sol (px)</label>
                  <input
                    type="number"
                    value={currentConfig.marginLeft}
                    onChange={e => updateConfigField('marginLeft', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-center text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 text-center">Sağ (px)</label>
                  <input
                    type="number"
                    value={currentConfig.marginRight}
                    onChange={e => updateConfigField('marginRight', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-center text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Display / Features Switches */}
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <h4 className="text-xs font-bold text-gray-900 border-l-2 border-primary pl-2 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-gray-450" /> Şablon Özellikleri
              </h4>
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-gray-100">
                {activeTab === 'a4' && (
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-gray-700">Logo Gösterilsin</div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentConfig.showLogo}
                        onChange={e => updateConfigField('showLogo', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-gray-700">Takip QR Kodu Ekle</div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentConfig.showQrCode}
                      onChange={e => updateConfigField('showQrCode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {activeTab === 'a4' && (
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-gray-700">Desen Kilit Şemasını Göster</div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentConfig.showPatternLock}
                        onChange={e => updateConfigField('showPatternLock', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-gray-700">İmza Çizgisi Ekle</div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentConfig.showSignature}
                      onChange={e => updateConfigField('showSignature', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {currentConfig.showSignature && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mt-2 mb-1">İmza Alt Yazısı</label>
                    <input
                      type="text"
                      value={currentConfig.signatureText}
                      onChange={e => updateConfigField('signatureText', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer terms Section */}
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <h4 className="text-xs font-bold text-gray-900 border-l-2 border-primary pl-2">Alt Bilgi & Taahhütname (Footer)</h4>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Şartname / Yasal Metin</label>
                <textarea
                  value={currentConfig.footerText}
                  onChange={e => updateConfigField('footerText', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-primary outline-none resize-none"
                  placeholder="Yazıcı çıktısının en altında yer alacak bilgilendirme metni..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex justify-between items-center shadow-md">
            <span className="text-xs font-extrabold flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-400" /> ANLIK BASKI ÖNİZLEME (WYSWYG)
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Gerçeğe Yakın Ölçeklendirme</span>
          </div>

          <div className="bg-gray-200 p-8 rounded-3xl border border-gray-300 shadow-inner overflow-x-auto flex justify-center min-h-[500px]">
            {activeTab === 'a4' ? (
              // A4 Preview
              <div
                style={{
                  fontFamily: currentConfig.fontFamily,
                  fontSize: `${currentConfig.fontSize}px`,
                  paddingTop: `${currentConfig.marginTop}px`,
                  paddingBottom: `${currentConfig.marginBottom}px`,
                  paddingLeft: `${currentConfig.marginLeft}px`,
                  paddingRight: `${currentConfig.marginRight}px`,
                }}
                className="bg-white text-black shadow-lg w-[595px] min-h-[842px] relative border border-gray-300 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="border-b-2 border-black pb-4 text-center">
                  {currentConfig.showLogo && (
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto mb-2 flex items-center justify-center border border-gray-200 text-gray-400 font-black text-xs uppercase shadow-sm">
                      [ LOGO ]
                    </div>
                  )}
                  <h1 className="text-base font-black tracking-tight uppercase">{currentConfig.headerTitle || 'ŞİRKET ÜNVANI'}</h1>
                  <p className="text-xs text-gray-700 font-semibold">{currentConfig.headerSub || 'Slogan / Alt Başlık'}</p>
                  <p className="text-[10px] text-gray-500 whitespace-pre-line mt-1">{currentConfig.headerInfo || 'İletişim Bilgileri'}</p>
                </div>

                {/* Simulated Content Body */}
                <div className="flex-1 py-6 space-y-6">
                  {/* Bilet ID and Date */}
                  <div className="flex justify-between border border-gray-300 bg-gray-50 p-3 rounded-xl">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Servis Fiş No</p>
                      <p className="font-black text-xs">KB-19283</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Giriş Tarihi</p>
                      <p className="font-semibold text-xs">14.07.2026 21:58</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-2 gap-4 border border-gray-200 rounded-2xl p-4">
                    <div>
                      <h5 className="font-black text-[10px] text-gray-500 uppercase mb-1">Müşteri Bilgileri</h5>
                      <p className="font-bold text-xs">Ahmet Yılmaz</p>
                      <p className="text-[10px] text-gray-600">0532 123 45 67</p>
                      <p className="text-[10px] text-gray-600">ahmet@email.com</p>
                    </div>
                    <div>
                      <h5 className="font-black text-[10px] text-gray-500 uppercase mb-1">Cihaz Bilgileri</h5>
                      <p className="font-bold text-xs">Apple MacBook Pro M2</p>
                      <p className="text-[10px] text-gray-600">Seri No: C02DF893Q05D</p>
                      <p className="text-[10px] text-gray-600">Şikayet: Ekran gelmiyor, sıvı teması şüphesi.</p>
                    </div>
                  </div>

                  {/* Simulated Draw Lock Pattern if checked */}
                  {currentConfig.showPatternLock && (
                    <div className="flex flex-col items-center py-4 border border-gray-200 rounded-2xl">
                      <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Cihaz Giriş Şifre Şeması</p>
                      <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className="w-4 h-4 rounded-full bg-slate-300 border border-slate-400" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Terms */}
                  <div className="text-[10px] text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200 italic leading-relaxed">
                    {currentConfig.footerText || 'Şartname metni buraya gelecektir.'}
                  </div>
                </div>

                {/* Footer section (QR + Signatures) */}
                <div className="border-t border-gray-300 pt-4 flex justify-between items-end mt-4">
                  {currentConfig.showQrCode && (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-100 border border-gray-200 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-450 uppercase shadow-inner">
                        [ QR ]
                      </div>
                      <span className="text-[8px] font-bold text-gray-400 mt-1">Cihaz Durum Takip QR</span>
                    </div>
                  )}
                  {currentConfig.showSignature && (
                    <div className="w-40 border-t border-black text-center pt-1 mt-12">
                      <span className="text-[10px] font-bold text-black">{currentConfig.signatureText}</span>
                      <p className="text-[8px] text-gray-400 mt-2">İmza / Kaşe</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // POS (80mm) Preview
              <div
                style={{
                  fontFamily: currentConfig.fontFamily,
                  fontSize: `${currentConfig.fontSize}px`,
                  paddingTop: `${currentConfig.marginTop}px`,
                  paddingBottom: `${currentConfig.marginBottom}px`,
                  paddingLeft: `${currentConfig.marginLeft}px`,
                  paddingRight: `${currentConfig.marginRight}px`,
                }}
                className="bg-white text-black shadow-lg w-[302px] min-h-[500px] relative border border-gray-300 p-4 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="text-center pb-2 border-b border-dashed border-black">
                  <h2 className="text-xs font-black uppercase">{currentConfig.headerTitle || 'KERİM BİLGİSAYAR'}</h2>
                  <p className="text-[10px] text-gray-800 font-bold uppercase">{currentConfig.headerSub || 'Servis Fişi'}</p>
                  <p className="text-[8px] text-gray-600 leading-tight mt-0.5">{currentConfig.headerInfo}</p>
                </div>

                {/* Content */}
                <div className="flex-1 py-3 space-y-3.5">
                  <div className="text-[10px] leading-tight space-y-1">
                    <p><strong>Fiş No:</strong> KB-19283</p>
                    <p><strong>Tarih:</strong> 14.07.2026 21:58</p>
                    <p><strong>Müşteri:</strong> Ahmet Yılmaz</p>
                    <p><strong>Cihaz:</strong> MacBook Pro M2</p>
                    <p><strong>Şikayet:</strong> Tetik almıyor, elektrik gelmiyor.</p>
                  </div>

                  <div className="border-t border-b border-dashed border-gray-400 py-1.5 text-[9px] text-gray-700">
                    * Servis kaydınız açılmıştır. Cihaz durumunuzu takip etmek için aşağıdaki QR kodu okutabilirsiniz.
                  </div>

                  {currentConfig.showQrCode && (
                    <div className="flex flex-col items-center py-1">
                      <div className="w-16 h-16 bg-slate-100 border border-gray-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                        [ QR ]
                      </div>
                    </div>
                  )}

                  <div className="text-[8px] text-gray-600 text-center italic leading-tight">
                    {currentConfig.footerText}
                  </div>
                </div>

                {/* Signature */}
                {currentConfig.showSignature && (
                  <div className="border-t border-dashed border-black pt-2 mt-4 text-center">
                    <div className="h-10"></div>
                    <span className="text-[9px] font-bold">{currentConfig.signatureText}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
