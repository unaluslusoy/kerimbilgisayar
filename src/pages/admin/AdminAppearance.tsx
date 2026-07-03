import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Layout, Columns, AppWindow, Loader2, GripVertical, Plus, Trash2, CheckCircle, Monitor } from 'lucide-react';
import { adminRequest } from '../../lib/api';
import MediaPicker from '../../components/ui/MediaPicker';

export default function AdminAppearance() {
  const [activeTab, setActiveTab] = useState('slider');
  const [settings, setSettings] = useState<Record<string, string>>({
    homeSlidesJson: '',
    homeSectionOrder: '',
    homePartnersJson: '',
    homeHeroTitle: '',
    homeHeroSubtitle: '',
    homeHeroImage: '',
    homeGamingTitle: '',
    homeGamingDesc: '',
    homeGamingBullets: '',
    homeGamingImage: '',
    homeGamingBtnText: '',
    homeGamingBtnUrl: '',
    homeCorporateTitle: '',
    homeCorporateDesc: '',
    homeCorporateBullets: '',
    homeCorporateImage: '',
    homeCorporateBtnText: '',
    homeCorporateBtnUrl: '',
    homeFeature1Title: '', homeFeature1Desc: '',
    homeFeature2Title: '', homeFeature2Desc: '',
    homeFeature3Title: '', homeFeature3Desc: '',
    footerText: '',
    siteTagline: ''
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [pickerConfig, setPickerConfig] = useState<{ onSelect: (url: string) => void } | null>(null);

  const [slides, setSlides] = useState<{ title: string; subtitle: string; image: string; btnText: string; btnUrl: string }[]>([]);
  const [partners, setPartners] = useState<{ name: string; logo: string; role: string }[]>([]);
  const [sections, setSections] = useState<string[]>([]);

  const SECTION_LABELS: Record<string, string> = {
    hero: 'Karşılama / Slayt Alanı (Hero)',
    partners: 'Resmi Partnerler Logoları',
    features: 'Neden Biz? Özellik Kartları',
    campaigns: 'Kampanyalar Bölümü',
    services: 'Hizmetler ve Çözümler',
    split: 'Oyuncu & Kurumsal Bölümü',
    reviews: 'Google Müşteri Yorumları',
    cta: 'Talep/İletişim CTA Alanı'
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings.homeSectionOrder) {
      try {
        const parsed = JSON.parse(settings.homeSectionOrder);
        if (Array.isArray(parsed)) {
          setSections(parsed);
        } else {
          setSections(['hero', 'partners', 'features', 'campaigns', 'services', 'split', 'reviews', 'cta']);
        }
      } catch (e) {
        setSections(['hero', 'partners', 'features', 'campaigns', 'services', 'split', 'reviews', 'cta']);
      }
    } else {
      setSections(['hero', 'partners', 'features', 'campaigns', 'services', 'split', 'reviews', 'cta']);
    }
  }, [settings.homeSectionOrder]);

  useEffect(() => {
    if (settings.homeSlidesJson) {
      try {
        const parsed = JSON.parse(settings.homeSlidesJson);
        if (Array.isArray(parsed)) setSlides(parsed);
        else setSlides([]);
      } catch (e) {
        setSlides([]);
      }
    }
  }, [settings.homeSlidesJson]);

  useEffect(() => {
    if (settings.homePartnersJson) {
      try {
        const parsed = JSON.parse(settings.homePartnersJson);
        if (Array.isArray(parsed)) setPartners(parsed);
        else setPartners([]);
      } catch (e) {
        setPartners([]);
      }
    }
  }, [settings.homePartnersJson]);

  const loadSettings = () => {
    adminRequest('/api/admin/settings').then(data => {
      if (data) setSettings(prev => ({ ...prev, ...data }));
    }).catch(console.error);
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const payload = { ...settings };
      payload.homeSlidesJson = JSON.stringify(slides);
      payload.homePartnersJson = JSON.stringify(partners);
      payload.homeSectionOrder = JSON.stringify(sections);
      
      await adminRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      loadSettings();
      setSuccessMsg('Özelleştirmeler başarıyla kaydedildi.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const addSlide = () => setSlides([...slides, { title: '', subtitle: '', image: '', btnText: '', btnUrl: '' }]);
  const updateSlide = (index: number, key: string, value: string) => {
    const newSlides = [...slides];
    (newSlides[index] as any)[key] = value;
    setSlides(newSlides);
  };
  const removeSlide = (index: number) => setSlides(slides.filter((_, i) => i !== index));

  const tabs = [
    { id: 'slider', label: 'Ana Slayt (Hero)', icon: AppWindow },
    { id: 'bloklar', label: 'Ana Sayfa Blokları', icon: Layout },
    { id: 'ortaklar', label: 'Markalar & Logolar', icon: Columns },
    { id: 'header_footer', label: 'Header & Footer', icon: AppWindow },
  ];

  const inputCls = 'w-full border border-gray-300 rounded-theme px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-colors';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-theme shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Özelleştir (Görünüm)</h1>
          <p className="text-sm text-gray-500 mt-1">Sitenizin ön yüz görünümünü, sliderları ve içerik bloklarını yönetin.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-6 py-2.5 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme transition-colors disabled:opacity-70 shadow-md"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Değişiklikleri Kaydet
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-theme flex items-center">
          <CheckCircle className="w-5 h-5 mr-3" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-theme shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-gray-50 border-r border-gray-100 shrink-0 p-4">
          <nav className="space-y-2">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-theme transition-colors ${
                  activeTab === t.id 
                    ? 'bg-white text-primary shadow-sm border border-gray-200' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <t.icon className={`w-5 h-5 mr-3 ${activeTab === t.id ? 'text-primary' : 'text-gray-400'}`} />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white">
          {activeTab === 'slider' && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h3 className="text-lg font-bold text-gray-900">Ana Slayt Alanı</h3>
                <p className="text-sm text-gray-500 mt-1">Ana sayfada büyük boyutlu dönen görselleri düzenleyin.</p>
              </div>
              
              <div className="space-y-6">
                {slides.map((slide, index) => (
                  <div key={index} className="border border-gray-200 rounded-theme p-6 bg-gray-50/50 shadow-sm relative group">
                    <button onClick={() => removeSlide(index)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="flex items-center mb-5 text-gray-500 border-b border-gray-200 pb-3">
                      <GripVertical className="w-5 h-5 mr-2 opacity-50" />
                      <span className="font-semibold text-sm">Slayt {index + 1}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className={labelCls}>Ana Başlık</label>
                          <input type="text" value={slide.title} onChange={e => updateSlide(index, 'title', e.target.value)} className={inputCls} placeholder="Örn: Teknolojide Gücünüz" />
                        </div>
                        <div>
                          <label className={labelCls}>Alt Slogan</label>
                          <input type="text" value={slide.subtitle} onChange={e => updateSlide(index, 'subtitle', e.target.value)} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Buton Yazısı</label>
                            <input type="text" value={slide.btnText} onChange={e => updateSlide(index, 'btnText', e.target.value)} className={inputCls} placeholder="Örn: İncele" />
                          </div>
                          <div>
                            <label className={labelCls}>Buton Linki</label>
                            <input type="text" value={slide.btnUrl} onChange={e => updateSlide(index, 'btnUrl', e.target.value)} className={inputCls} placeholder="/hizmetler" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Arka Plan Görseli</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-theme bg-white relative overflow-hidden group/img h-[220px]">
                          {slide.image ? (
                            <>
                              <img src={slide.image} alt="Slide Preview" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover/img:scale-105 transition-transform duration-500" />
                              <button onClick={() => setPickerConfig({ onSelect: (url) => updateSlide(index, 'image', url) })} className="relative z-10 bg-white/90 backdrop-blur text-gray-900 px-5 py-2.5 rounded-theme font-medium shadow-md opacity-0 group-hover/img:opacity-100 transition-opacity">Değiştir</button>
                            </>
                          ) : (
                            <div className="space-y-1 text-center flex flex-col items-center justify-center">
                              <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                              <button type="button" onClick={() => setPickerConfig({ onSelect: (url) => updateSlide(index, 'image', url) })} className="font-medium text-primary hover:text-primary-dark bg-primary/10 px-4 py-2 rounded-theme">
                                Görsel Seç
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addSlide} className="w-full py-4 border-2 border-dashed border-gray-300 bg-gray-50 rounded-theme text-gray-600 font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center">
                  <Plus className="w-5 h-5 mr-2" /> Yeni Slayt Ekle
                </button>
              </div>
            </div>
          )}

          {activeTab === 'bloklar' && (
            <div className="space-y-8">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-bold text-gray-900">Ana Sayfa Blokları</h3>
                <p className="text-sm text-gray-500 mt-1">Ana sayfa düzenini sürükleyerek ayarlayın ve özel blok içeriklerini yönetin.</p>
              </div>

              {/* Sürükle Bırak Bölüm Sıralayıcı */}
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-theme space-y-4">
                <h4 className="font-bold text-gray-800 flex items-center text-lg">
                  <Layout className="w-6 h-6 mr-2 text-primary" /> Sayfa Dizilimi (Sürükle & Bırak)
                </h4>
                <p className="text-sm text-gray-500">Ana sayfa bloklarının hangi sırayla gösterileceğini değiştirmek için aşağıdaki bölümleri sürükleyerek sıralayın.</p>
                <div className="space-y-2 mt-4 max-w-2xl">
                  {sections.map((sec, idx) => (
                    <div
                      key={sec}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', idx.toString());
                      }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        const dragIdx = parseInt(e.dataTransfer.getData('text/plain'));
                        const dropIdx = idx;
                        const reordered = [...sections];
                        const [dragged] = reordered.splice(dragIdx, 1);
                        reordered.splice(dropIdx, 0, dragged);
                        setSections(reordered);
                        handleChange('homeSectionOrder', JSON.stringify(reordered));
                      }}
                      className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-theme shadow-sm cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-gray-300" />
                        <span className="font-semibold text-sm text-gray-700">{SECTION_LABELS[sec] || sec}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gaming Kartı */}
              <div className="bg-gray-50 p-6 rounded-theme border border-gray-200 space-y-5">
                <h4 className="font-bold text-gray-800 flex items-center text-lg"><Monitor className="w-6 h-6 mr-2 text-purple-500"/> Oyuncu Sistemleri Kartı</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Başlık</label>
                      <input type="text" value={settings.homeGamingTitle} onChange={e => handleChange('homeGamingTitle', e.target.value)} className={inputCls} placeholder="Profesyonel Gaming Sistemler" />
                    </div>
                    <div>
                      <label className={labelCls}>Açıklama</label>
                      <textarea rows={3} value={settings.homeGamingDesc} onChange={e => handleChange('homeGamingDesc', e.target.value)} className={inputCls} placeholder="Oyun deneyiminizi zirveye taşıyın..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div><label className={labelCls}>Buton Yazısı</label><input type="text" value={settings.homeGamingBtnText} onChange={e => handleChange('homeGamingBtnText', e.target.value)} className={inputCls} placeholder="Sistemleri İncele" /></div>
                       <div><label className={labelCls}>Buton URL</label><input type="text" value={settings.homeGamingBtnUrl} onChange={e => handleChange('homeGamingBtnUrl', e.target.value)} className={inputCls} placeholder="/iletisim" /></div>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Görsel</label>
                    <div className="flex items-center gap-2">
                      <input type="text" value={settings.homeGamingImage} onChange={e => handleChange('homeGamingImage', e.target.value)} className={inputCls} placeholder="https://..." />
                      <button onClick={() => setPickerConfig({ onSelect: (url) => handleChange('homeGamingImage', url) })} className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-medium rounded-theme whitespace-nowrap transition-colors shadow-sm">Kütüphaneden Seç</button>
                    </div>
                    {settings.homeGamingImage && <img src={settings.homeGamingImage} className="mt-4 h-40 w-full object-cover rounded-theme border border-gray-200 shadow-sm" alt="Preview"/>}
                  </div>
                </div>
              </div>

              {/* Kurumsal Kartı */}
              <div className="bg-gray-50 p-6 rounded-theme border border-gray-200 space-y-5">
                <h4 className="font-bold text-gray-800 flex items-center text-lg"><Layout className="w-6 h-6 mr-2 text-primary"/> Kurumsal Çözümler Kartı</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Başlık</label>
                      <input type="text" value={settings.homeCorporateTitle} onChange={e => handleChange('homeCorporateTitle', e.target.value)} className={inputCls} placeholder="Kurumsal Bakım Anlaşmaları" />
                    </div>
                    <div>
                      <label className={labelCls}>Açıklama</label>
                      <textarea rows={3} value={settings.homeCorporateDesc} onChange={e => handleChange('homeCorporateDesc', e.target.value)} className={inputCls} placeholder="Şirketiniz için özel IT çözümleri..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div><label className={labelCls}>Buton Yazısı</label><input type="text" value={settings.homeCorporateBtnText} onChange={e => handleChange('homeCorporateBtnText', e.target.value)} className={inputCls} /></div>
                       <div><label className={labelCls}>Buton URL</label><input type="text" value={settings.homeCorporateBtnUrl} onChange={e => handleChange('homeCorporateBtnUrl', e.target.value)} className={inputCls} /></div>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Görsel</label>
                    <div className="flex items-center gap-2">
                      <input type="text" value={settings.homeCorporateImage} onChange={e => handleChange('homeCorporateImage', e.target.value)} className={inputCls} placeholder="https://..." />
                      <button onClick={() => setPickerConfig({ onSelect: (url) => handleChange('homeCorporateImage', url) })} className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-medium rounded-theme whitespace-nowrap transition-colors shadow-sm">Kütüphaneden Seç</button>
                    </div>
                    {settings.homeCorporateImage && <img src={settings.homeCorporateImage} className="mt-4 h-40 w-full object-cover rounded-theme border border-gray-200 shadow-sm" alt="Preview"/>}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'ortaklar' && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h3 className="text-lg font-bold text-gray-900">Markalar & Logolar</h3>
                <p className="text-sm text-gray-500 mt-1">Ana sayfada kayarak geçen partner logolarını yönetin.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {partners.map((partner, index) => (
                  <div key={index} className="flex flex-col border border-gray-200 rounded-theme p-5 bg-gray-50 shadow-sm relative">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold text-sm text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">Marka {index + 1}</span>
                      <button onClick={() => setPartners(partners.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Marka Adı</label>
                        <input type="text" value={partner.name} onChange={e => { const np = [...partners]; np[index].name = e.target.value; setPartners(np); }} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Logo URL</label>
                        <div className="flex gap-2">
                          <input type="text" value={partner.logo} onChange={e => { const np = [...partners]; np[index].logo = e.target.value; setPartners(np); }} className={inputCls} />
                          <button onClick={() => setPickerConfig({ onSelect: (url) => { const np = [...partners]; np[index].logo = url; setPartners(np); } })} className="px-4 py-2 bg-white border border-gray-300 rounded-theme hover:bg-gray-100 font-medium text-sm transition-colors shadow-sm">Seç</button>
                        </div>
                        {partner.logo && (
                           <div className="mt-3 bg-white p-3 rounded-theme border border-gray-200 inline-block">
                             <img src={partner.logo} className="h-10 object-contain" alt="Logo preview" />
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setPartners([...partners, { name: '', logo: '', role: '' }])} className="w-full py-4 border-2 border-dashed border-gray-300 bg-gray-50 rounded-theme text-gray-600 font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center mt-6">
                <Plus className="w-5 h-5 mr-2" /> Yeni Marka Ekle
              </button>
            </div>
          )}

          {activeTab === 'header_footer' && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h3 className="text-lg font-bold text-gray-900">Header & Footer İçerikleri</h3>
                <p className="text-sm text-gray-500 mt-1">Sitenin en üst ve en alt kısımlarındaki metinleri ayarlayın.</p>
              </div>
              
              <div className="space-y-6 max-w-3xl">
                <div className="bg-gray-50 p-6 rounded-theme border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Header (Üst Kısım)</h4>
                  <div>
                    <label className={labelCls}>Slogan / Tagline</label>
                    <input type="text" value={settings.siteTagline} onChange={e => handleChange('siteTagline', e.target.value)} className={inputCls} placeholder="Örn: Profesyonel Bilişim Çözümleri" />
                    <p className="text-xs text-gray-500 mt-1">Logonun yanında veya sekme başlığında kullanılabilir.</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-theme border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Footer (Alt Kısım)</h4>
                  <div>
                    <label className={labelCls}>Telif Hakkı (Copyright) Metni</label>
                    <input type="text" value={settings.footerText} onChange={e => handleChange('footerText', e.target.value)} className={inputCls} placeholder="Örn: © 2026 Kerim Bilgisayar. Tüm hakları saklıdır." />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {pickerConfig && (
        <MediaPicker 
          onSelect={(url) => {
            pickerConfig.onSelect(url);
            setPickerConfig(null);
          }} 
          onClose={() => setPickerConfig(null)} 
          isOpen={true}
        />
      )}
    </div>
  );
}
