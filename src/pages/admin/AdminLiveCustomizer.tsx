import { useState, useEffect, useRef } from 'react';
import { Save, RotateCcw, Monitor, Tablet, Smartphone, Loader2, Layout, Type, Palette } from 'lucide-react';
import { adminRequest } from '../../lib/api';
import DynamicForm from '../../components/ui/DynamicForm';

// Örnek ayar şemaları
const SCHEMAS = {
  colors: {
    type: 'object',
    properties: {
      themeColor: { type: 'string', title: 'Ana Renk (Primary)', widget: 'color', default: '#8bde86' },
      themeSecondaryColor: { type: 'string', title: 'İkincil Renk', widget: 'color', default: '#131827' },
      themeTextColor: { type: 'string', title: 'Metin Rengi', widget: 'color', default: '#575756' },
      themeDarkColor: { type: 'string', title: 'Koyu Renk (Arkaplan/Başlık)', widget: 'color', default: '#030404' },
    }
  },
  typography: {
    type: 'object',
    properties: {
      themeFont: { type: 'string', title: 'Yazı Tipi', widget: 'select', options: [{ label: 'Inter', value: 'Inter' }, { label: 'Roboto', value: 'Roboto' }] },
      themeRadius: { type: 'string', title: 'Kenar Yuvarlaklığı', widget: 'select', options: [{ label: 'Keskin (0px)', value: '0px' }, { label: 'Hafif (4px)', value: '4px' }, { label: 'Tam (9999px)', value: '9999px' }] },
    }
  }
} as any;

export default function AdminLiveCustomizer() {
  const [activeGroup, setActiveGroup] = useState<'colors' | 'typography' | 'header'>('colors');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadDraftSettings();
  }, []);

  const loadDraftSettings = () => {
    adminRequest('/api/admin/theme/settings?draft=true').then(drafts => {
      adminRequest('/api/admin/theme/settings?draft=false').then(live => {
        // Merge live with drafts (drafts override live)
        setSettings({ ...live, ...drafts });
      });
    }).catch(console.error);
  };

  const handleSettingChange = (updates: Record<string, any>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    // Iframe'e postMessage ile canlı önizleme gönder
    if (iframeRef.current?.contentWindow) {
      Object.entries(updates).forEach(([key, value]) => {
        iframeRef.current!.contentWindow!.postMessage({
          type: 'LIVE_CUSTOMIZER_UPDATE',
          payload: { key, value }
        }, '*');
      });
    }

    // Debounced draft update (basit timeout)
    const timeout = setTimeout(() => {
      adminRequest('/api/admin/theme/settings/draft', {
        method: 'PUT',
        body: JSON.stringify(updates)
      }).catch(console.error);
    }, 500);

    return () => clearTimeout(timeout);
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await adminRequest('/api/admin/theme/settings/publish', { method: 'POST' });
      alert('Ayarlar başarıyla yayınlandı!');
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm('Tüm taslak değişiklikleri silinecek. Emin misiniz?')) return;
    try {
      await adminRequest('/api/admin/theme/settings/discard', { method: 'POST' });
      loadDraftSettings(); // Yeniden yükle
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src; // iframe'i yenile
      }
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const getDeviceWidth = () => {
    switch (device) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100 relative">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800 mr-4">Tema Özelleştirici</span>
          <div className="flex bg-gray-100 p-1 rounded-theme">
            <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded ${device === 'desktop' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-700'}`}><Monitor className="w-4 h-4"/></button>
            <button onClick={() => setDevice('tablet')} className={`p-1.5 rounded ${device === 'tablet' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-700'}`}><Tablet className="w-4 h-4"/></button>
            <button onClick={() => setDevice('mobile')} className={`p-1.5 rounded ${device === 'mobile' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-700'}`}><Smartphone className="w-4 h-4"/></button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDiscard} className="text-gray-500 hover:text-red-600 px-3 py-1.5 text-sm font-medium flex items-center transition-colors">
            <RotateCcw className="w-4 h-4 mr-1.5" /> Taslağı Sıfırla
          </button>
          <button onClick={handlePublish} disabled={saving} className="bg-primary hover:bg-secondary text-white px-5 py-2 rounded-theme text-sm font-medium flex items-center transition-colors shadow-sm disabled:opacity-70">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Yayınla
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Options */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-lg">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex gap-2">
            <button onClick={() => setActiveGroup('colors')} className={`flex-1 py-2 text-xs font-medium rounded border ${activeGroup === 'colors' ? 'bg-white border-gray-300 text-primary shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
              <Palette className="w-4 h-4 mx-auto mb-1" /> Renkler
            </button>
            <button onClick={() => setActiveGroup('typography')} className={`flex-1 py-2 text-xs font-medium rounded border ${activeGroup === 'typography' ? 'bg-white border-gray-300 text-primary shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
              <Type className="w-4 h-4 mx-auto mb-1" /> Tipografi
            </button>
            <button onClick={() => setActiveGroup('header')} className={`flex-1 py-2 text-xs font-medium rounded border ${activeGroup === 'header' ? 'bg-white border-gray-300 text-primary shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
              <Layout className="w-4 h-4 mx-auto mb-1" /> Düzen
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {activeGroup === 'colors' && (
              <DynamicForm schema={SCHEMAS.colors} value={settings} onChange={handleSettingChange} />
            )}
            {activeGroup === 'typography' && (
              <DynamicForm schema={SCHEMAS.typography} value={settings} onChange={handleSettingChange} />
            )}
            {activeGroup === 'header' && (
              <p className="text-sm text-gray-500">Header ve Footer ayarları burada yer alacak.</p>
            )}
          </div>
        </div>

        {/* Right Area - Live Preview Iframe */}
        <div className="flex-1 bg-gray-200 flex items-center justify-center p-4">
          <div className="relative bg-white shadow-2xl rounded-sm overflow-hidden transition-all duration-300 ease-in-out border border-gray-300" style={{ width: getDeviceWidth(), height: '100%' }}>
            <iframe
              ref={iframeRef}
              src="/"
              className="w-full h-full border-none"
              title="Live Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
