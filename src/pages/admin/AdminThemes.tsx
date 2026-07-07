import { useState, useEffect } from 'react';
import { Palette, Save, CheckCircle, Type, Square, Image as ImageIcon, LayoutTemplate, Layout, Loader2 } from 'lucide-react';
import { adminRequest } from '../../lib/api';
import { mediaUrl } from '../../lib/media';

const THEME_PRESETS = [
  { id: 'blue', name: 'Kurumsal Mavi', primary: '#2563eb', hover: '#1d4ed8' },
  { id: 'green', name: 'Güven Yeşili', primary: '#16a34a', hover: '#15803d' },
  { id: 'red', name: 'Dinamik Kırmızı', primary: '#dc2626', hover: '#b91c1c' },
  { id: 'purple', name: 'Modern Mor', primary: '#9333ea', hover: '#7e22ce' },
  { id: 'dark', name: 'Premium Siyah', primary: '#1f2937', hover: '#111827' },
];

const RADIUS_OPTIONS = [
  { id: '0rem', name: 'Keskin (0px)' },
  { id: '0.5rem', name: 'Hafif Oval (8px)' },
  { id: '1rem', name: 'Oval (16px)' },
  { id: '9999px', name: 'Yuvarlak' },
];

const FONT_OPTIONS = [
  { id: 'ui-sans-serif, system-ui, sans-serif', name: 'Varsayılan Sans' },
  { id: '"Inter", sans-serif', name: 'Inter (Modern)' },
  { id: '"Outfit", sans-serif', name: 'Outfit (Dinamik)' },
  { id: '"Playfair Display", serif', name: 'Playfair (Klasik)' },
  { id: 'ui-monospace, monospace', name: 'Mono (Teknik)' },
];

export default function AdminThemes() {
  const [activeTheme, setActiveTheme] = useState('blue');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1e40af');
  const [themeRadius, setThemeRadius] = useState('0.5rem');
  const [themeFont, setThemeFont] = useState('ui-sans-serif, system-ui, sans-serif');
  const [siteLogo, setSiteLogo] = useState('');
  const [siteFavicon, setSiteFavicon] = useState('');
  const [headerLayout, setHeaderLayout] = useState('default');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    adminRequest('/api/public/settings').then(data => {
      if (data) {
        if (data.themeColor) {
          setPrimaryColor(data.themeColor);
          const preset = THEME_PRESETS.find(p => p.primary === data.themeColor);
          if (preset) setActiveTheme(preset.id);
          else setActiveTheme('custom');
        }
        if (data.themeSecondaryColor) setSecondaryColor(data.themeSecondaryColor);
        if (data.themeRadius) setThemeRadius(data.themeRadius);
        if (data.themeFont) setThemeFont(data.themeFont);
        if (data.siteLogo) setSiteLogo(data.siteLogo);
        if (data.siteFavicon) setSiteFavicon(data.siteFavicon);
        if (data.headerLayout) setHeaderLayout(data.headerLayout);
      }
    }).catch(console.error);
  }, []);

  const handleSelectPreset = (preset: any) => {
    setActiveTheme(preset.id);
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.hover);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      await adminRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ 
          themeColor: primaryColor,
          themeSecondaryColor: secondaryColor,
          themeRadius,
          themeFont,
          siteLogo,
          siteFavicon,
          headerLayout
        })
      });
      setSuccessMsg('Tema ayarları başarıyla güncellendi. Site ön yüzüne yansıtıldı.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gelişmiş Tema Motoru</h1>
          <p className="text-sm text-gray-500 mt-1">Sitenizin tüm görsel dilini (Renkler, Tipografi, Köşeler) buradan yönetin.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-6 py-2.5 bg-primary hover:bg-secondary text-white text-sm font-semibold rounded-theme transition-colors disabled:opacity-70 shadow-md min-w-[150px] justify-center"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-800 rounded-theme flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {successMsg}
        </div>
      )}

      {/* Renk Paletleri */}
      <div className="bg-white rounded-theme border border-gray-200 shadow-sm p-6 md:p-8">
        <div className="flex items-center mb-6 border-b pb-4">
          <Palette className="w-6 h-6 text-primary mr-3" />
          <h2 className="text-lg font-semibold">Ana Renk Paletleri</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {THEME_PRESETS.map(preset => (
            <div 
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`cursor-pointer rounded-theme border-2 p-4 flex flex-col items-center transition-all ${activeTheme === preset.id ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="w-12 h-12 rounded-full mb-3 shadow-inner" style={{ backgroundColor: preset.primary }}></div>
              <span className="text-sm font-medium text-center">{preset.name}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 border-t pt-8">
          <div>
             <h3 className="text-sm font-medium text-gray-700 mb-3">Birincil Renk (Primary)</h3>
             <div className="flex items-center space-x-4">
              <input 
                type="color" 
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value);
                  setActiveTheme('custom');
                }}
                className="w-12 h-12 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-sm text-gray-500 font-mono">{primaryColor}</span>
             </div>
          </div>
          <div>
             <h3 className="text-sm font-medium text-gray-700 mb-3">İkincil Renk / Vurgu (Secondary)</h3>
             <div className="flex items-center space-x-4">
              <input 
                type="color" 
                value={secondaryColor}
                onChange={(e) => {
                  setSecondaryColor(e.target.value);
                  setActiveTheme('custom');
                }}
                className="w-12 h-12 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-sm text-gray-500 font-mono">{secondaryColor}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo ve Marka */}
        <div className="bg-white rounded-theme border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center mb-6 border-b pb-4">
            <ImageIcon className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-lg font-semibold">Marka Görselleri</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Logosu URL</label>
              <input type="text" value={siteLogo} onChange={e => setSiteLogo(e.target.value)} placeholder="https://ornek.com/logo.png" className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors" />
              <p className="text-xs text-gray-400 mt-2">Sitenin sol üst köşesinde görünecek ana logo.</p>
              {siteLogo && <img src={mediaUrl(siteLogo)} alt="Logo Önizleme" className="mt-3 h-10 object-contain bg-gray-50 p-2 rounded border" />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Favicon URL</label>
              <input type="text" value={siteFavicon} onChange={e => setSiteFavicon(e.target.value)} placeholder="https://ornek.com/favicon.ico" className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors" />
              <p className="text-xs text-gray-400 mt-2">Tarayıcı sekmesinde görünecek küçük ikon (önerilen: 32x32px).</p>
            </div>
          </div>
        </div>

        {/* Header Düzeni */}
        <div className="bg-white rounded-theme border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center mb-6 border-b pb-4">
            <Layout className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-lg font-semibold">Görünüm Düzenleri (Layouts)</h2>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Üst Menü (Header) Düzeni</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`cursor-pointer border-2 rounded-theme p-4 flex flex-col items-center gap-3 transition-colors ${headerLayout === 'default' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="header_layout" value="default" checked={headerLayout === 'default'} onChange={e => setHeaderLayout(e.target.value)} className="sr-only" />
                <div className="w-full h-8 bg-gray-200 rounded flex justify-between px-2 items-center"><div className="w-4 h-4 bg-gray-400 rounded-full"></div><div className="flex gap-1"><div className="w-6 h-2 bg-gray-400 rounded"></div><div className="w-6 h-2 bg-gray-400 rounded"></div></div></div>
                <span className="text-sm font-medium text-center">Standart (Sağa Dayalı)</span>
              </label>
              <label className={`cursor-pointer border-2 rounded-theme p-4 flex flex-col items-center gap-3 transition-colors ${headerLayout === 'centered' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="header_layout" value="centered" checked={headerLayout === 'centered'} onChange={e => setHeaderLayout(e.target.value)} className="sr-only" />
                <div className="w-full h-8 bg-gray-200 rounded flex justify-center px-2 items-center gap-3"><div className="w-4 h-4 bg-gray-400 rounded-full"></div><div className="flex gap-1"><div className="w-6 h-2 bg-gray-400 rounded"></div><div className="w-6 h-2 bg-gray-400 rounded"></div></div></div>
                <span className="text-sm font-medium text-center">Ortalanmış (Merkez)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Tipografi ve Form (Radius) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tipografi */}
        <div className="bg-white rounded-theme border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center mb-6 border-b pb-4">
            <Type className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-lg font-semibold">Tipografi (Font)</h2>
          </div>
          <div className="space-y-3">
            {FONT_OPTIONS.map(font => (
              <label key={font.id} className={`flex items-center p-4 border rounded-theme cursor-pointer transition-all ${themeFont === font.id ? 'border-primary bg-blue-50' : 'hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="font_family" 
                  value={font.id} 
                  checked={themeFont === font.id}
                  onChange={(e) => setThemeFont(e.target.value)}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-3 font-medium" style={{ fontFamily: font.id }}>{font.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">Not: Bazı fontların sitenizde çalışması için Google Fonts üzerinden import edilmesi gerekebilir.</p>
        </div>

        {/* Kenar Yumuşatma */}
        <div className="bg-white rounded-theme border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center mb-6 border-b pb-4">
            <Square className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-lg font-semibold">Köşe Ovalliği (Border Radius)</h2>
          </div>
          <div className="space-y-3">
            {RADIUS_OPTIONS.map(radius => (
              <label key={radius.id} className={`flex items-center p-4 border rounded-theme cursor-pointer transition-all ${themeRadius === radius.id ? 'border-primary bg-blue-50' : 'hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="border_radius" 
                  value={radius.id} 
                  checked={themeRadius === radius.id}
                  onChange={(e) => setThemeRadius(e.target.value)}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-3 font-medium flex-1">{radius.name}</span>
                <div 
                  className="w-12 h-8 bg-gray-200" 
                  style={{ borderRadius: radius.id }}
                ></div>
              </label>
            ))}
          </div>
        </div>

      </div>

      {/* Canlı Önizleme */}
      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" /> CMS Canlı Önizleme
          </h2>
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div><div className="w-3 h-3 rounded-full bg-yellow-400"></div><div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
        </div>
        <div 
          className="bg-gray-100 flex flex-col w-full h-[400px] overflow-hidden"
          style={{ fontFamily: themeFont }}
        >
          {/* Header Preview */}
          <div className={`bg-white shadow-sm h-14 flex items-center px-6 ${headerLayout === 'centered' ? 'justify-center gap-8' : 'justify-between'}`}>
            <div className="font-bold text-lg" style={{ color: primaryColor }}>{siteLogo ? <img src={mediaUrl(siteLogo)} className="h-6" alt="Logo" /> : 'Marka'}</div>
            <div className="flex space-x-4 text-sm font-medium text-gray-600">
              <span className="hover:text-primary cursor-pointer transition-colors" style={{ color: primaryColor }}>Ana Sayfa</span>
              <span>Kurumsal</span>
              <span>Hizmetler</span>
            </div>
            {headerLayout !== 'centered' && (
              <button className="text-white text-xs px-4 py-1.5 font-medium shadow-md transition-opacity hover:opacity-90" style={{ backgroundColor: primaryColor, borderRadius: themeRadius }}>İletişim</button>
            )}
          </div>
          
          {/* Hero Preview */}
          <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <h1 className="text-3xl font-extrabold text-white mb-4 relative z-10">Yeni Nesil Teknoloji Çözümleri</h1>
            <p className="text-gray-300 max-w-lg mb-6 relative z-10 text-sm">Seçtiğiniz renk paleti, köşe yuvarlamaları ve tipografi ayarları sitenizde bu şekilde gözükecek.</p>
            <div className="flex space-x-3 relative z-10">
              <button className="text-white text-sm px-6 py-2.5 font-bold shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: primaryColor, borderRadius: themeRadius }}>Hemen Başla</button>
              <button className="text-white text-sm px-6 py-2.5 font-bold shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: secondaryColor, borderRadius: themeRadius }}>İncele</button>
            </div>
          </div>

          {/* Card Preview */}
          <div className="h-32 bg-white border-t border-gray-200 px-8 py-4 flex items-center gap-6">
            <div className="flex-1 border bg-gray-50 p-4 shadow-sm" style={{ borderRadius: themeRadius }}>
              <div className="w-8 h-8 rounded mb-2 flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}><Square className="w-4 h-4" /></div>
              <div className="h-2 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="flex-1 border bg-gray-50 p-4 shadow-sm" style={{ borderRadius: themeRadius }}>
              <div className="w-8 h-8 rounded mb-2 flex items-center justify-center text-white" style={{ backgroundColor: secondaryColor }}><Square className="w-4 h-4" /></div>
              <div className="h-2 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
