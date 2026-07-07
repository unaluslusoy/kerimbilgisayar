import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle, AlertCircle, Loader2, Headset, ShoppingCart, HelpCircle, PlaySquare, Printer, Building, FileText, Landmark, Building2, Facebook, Twitter, Instagram, Linkedin, Youtube, ArrowRight, X, ChevronRight } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { submitContactForm } from '../../lib/api';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../lib/usePageTitle';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';
import { mediaUrl } from '../../lib/media';


export default function Contact() {
  const { t } = useTranslation();
  usePageTitle(t('contact.title', 'İletişim'));
  const { settings } = useSettings();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'İletişim Formu',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitContactForm(formData);
      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', subject: 'İletişim Formu', message: '' });
    } catch (err: any) {
      setError(err.message || t('common.error', 'Bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <SEO 
        title="İletişim" 
        description="Kerim Bilgisayar iletişim bilgileri, adres, telefon ve mesaj formu." 
        schema={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "İletişim | Kerim Bilgisayar",
          "url": "https://kerimbilgisayar.com/iletisim"
        }}
      />
      {/* Breadcrumb & Title */}
      <div className="pt-[140px] pb-8 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2 font-medium">
            <Link to="/" className="hover:text-primary transition-colors">{t('common.home', 'Anasayfa')}</Link>
            <span>&gt;</span>
            <span className="text-gray-900">{t('contact.title', 'İletişim')}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            {t('contact.title', 'İletişim')}
          </h1>
          <p className="text-lg text-gray-600">
            {settings?.contactSubtitle}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Top 3 Cards (Dynamic from Settings) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Headset, title: settings?.contactCard1Title, link: settings?.contactCard1Link || '#' },
            { icon: ShoppingCart, title: settings?.contactCard2Title, link: settings?.contactCard2Link || '#' },
            { icon: HelpCircle, title: settings?.contactCard3Title, link: settings?.contactCard3Link || '#' }
          ].filter(card => card.title).map((card, i) => (
            <div key={i} className="border border-gray-200 rounded-3xl p-8 hover:shadow-lg transition-shadow bg-white flex flex-col justify-between group">
              <div>
                <card.icon className="w-10 h-10 text-[#63b956] mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-bold text-gray-900 mb-6">{card.title}</h3>
              </div>
              <Link to={card.link} className="text-sm font-semibold text-gray-600 group-hover:text-[#63b956] transition-colors flex items-center gap-1">
                {t('contact.viewAll', 'Tümünü İncele')} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* Green Banner */}
        <div className="bg-[#63b956] rounded-[2.5rem] p-8 md:p-12 mb-16 flex flex-col md:flex-row items-center justify-between relative overflow-hidden shadow-xl">
          <div className="md:w-1/2 flex justify-center md:justify-start mb-8 md:mb-0 relative z-10">
            {/* Banner Image Placeholder with some decorative circles */}
            <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center p-4">
              <img src={mediaUrl(settings?.contactBannerImage) || "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=400"} alt="Destek" className="w-full h-full object-cover rounded-full shadow-lg" />
            </div>
          </div>
          <div className="md:w-1/2 text-white relative z-10 md:pl-10">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
              {settings?.contactBannerTitle || 'Kerim Bilgisayar çözümleri için bize ulaşın!'}
            </h2>
            <p className="text-base font-normal mb-8 text-white/90">
              {settings?.contactBannerDesc || 'İşletmenize uygun Yönetim Bilişim Sistemleri çözümleri için sizi arayalım!'}
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-white text-[#63b956] hover:bg-gray-50 px-8 py-3.5 rounded-full font-bold transition-colors flex items-center shadow-md"
              >
                Formu doldur <ArrowRight className="w-5 h-5 ml-2" />
              </button>
              <a 
                href="tel:08508335646" 
                className="bg-white text-gray-900 hover:bg-gray-50 px-8 py-3.5 rounded-full font-bold transition-colors flex items-center shadow-md"
              >
                <Phone className="w-5 h-5 mr-2 text-gray-500" /> 0850 833 56 46
              </a>
            </div>
          </div>
        </div>

        {/* Company Info & Quick Contact */}
        <div className="flex flex-col lg:flex-row gap-12 mb-16">
          <div className="lg:w-2/3">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-100 pb-4">Şirket Bilgileri</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-sm">
              {settings?.contactMukellefAdi && (
                <div className="md:col-span-2 border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Building className="w-4 h-4" /> Mükellefin Adı Soyadı</p>
                  <p className="text-gray-900">{settings.contactMukellefAdi}</p>
                </div>
              )}
              {settings?.contactTicaretUnvan && (
                <div className="md:col-span-2 border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Building className="w-4 h-4" /> Ticaret Ünvanı</p>
                  <p className="text-gray-900">{settings.contactTicaretUnvan}</p>
                </div>
              )}
              {settings?.contactAddress && (
                <div className="md:col-span-2 border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><MapPin className="w-4 h-4" /> İş Yeri Adresi</p>
                  <p className="text-gray-900">{settings.contactAddress}</p>
                </div>
              )}
              {settings?.contactVergiDairesi && (
                <div className="border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Landmark className="w-4 h-4" /> Vergi Dairesi</p>
                  <p className="text-gray-900">{settings.contactVergiDairesi}</p>
                </div>
              )}
              {settings?.contactVkn && (
                <div className="border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><FileText className="w-4 h-4" /> VKN</p>
                  <p className="text-gray-900">{settings.contactVkn}</p>
                </div>
              )}

              {settings?.contactFax && (
                <div className="border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Printer className="w-4 h-4" /> Faks Numarası</p>
                  <p className="text-gray-900">{settings.contactFax}</p>
                </div>
              )}
              {settings?.contactMersis && (
                <div className="border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Building className="w-4 h-4" /> Mersis No</p>
                  <p className="text-gray-900">{settings.contactMersis}</p>
                </div>
              )}
              {settings?.contactTicaretSicil && (
                <div className="border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Building className="w-4 h-4" /> Ticaret Sicil No</p>
                  <p className="text-gray-900">{settings.contactTicaretSicil}</p>
                </div>
              )}
              {settings?.contactEsnafSicil && (
                <div className="border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Building className="w-4 h-4" /> Esnaf Sicil No</p>
                  <p className="text-gray-900">{settings.contactEsnafSicil}</p>
                </div>
              )}
              {settings?.contactNaceKodu && (
                <div className="border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><FileText className="w-4 h-4" /> NACE Kodu</p>
                  <p className="text-gray-900">{settings.contactNaceKodu}</p>
                </div>
              )}
              {settings?.contactKep && (
                <div className="border-b border-gray-100 pb-6">
                  <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Mail className="w-4 h-4" /> KEP Adresi</p>
                  <p className="text-gray-900">{settings.contactKep}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                { icon: Twitter, label: 'Twitter', bg: 'bg-gray-100', text: 'text-gray-600' },
                { icon: Instagram, label: 'Instagram', bg: 'bg-gray-100', text: 'text-gray-600' },
                { icon: Linkedin, label: 'LinkedIn', bg: 'bg-gray-100', text: 'text-gray-600' },
                { icon: Youtube, label: 'YouTube', bg: 'bg-gray-100', text: 'text-gray-600' },
                { icon: Facebook, label: 'Facebook', bg: 'bg-gray-100', text: 'text-gray-600' }
              ].map((s, i) => (
                <a key={i} href="#" className={`${s.bg} ${s.text} hover:bg-gray-200 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors`}>
                  <s.icon className="w-3.5 h-3.5" /> {s.label}
                </a>
              ))}
            </div>
          </div>

          <div className="lg:w-1/3 space-y-6">
            <a href={`mailto:${settings?.contactEmail || 'iletisim@kerimbilgisayar.com'}`} className="block bg-gray-50 hover:bg-gray-100 transition-colors p-8 rounded-3xl border border-gray-100 group relative">
              <Mail className="w-8 h-8 text-[#63b956] mb-6" strokeWidth={1.5} />
              <p className="text-sm text-gray-500 font-semibold mb-1">E-posta Gönderin</p>
              <p className="text-xl font-bold text-gray-900">{settings?.contactEmail || 'iletisim@kerimbilgisayar.com'}</p>
              <ArrowRight className="w-5 h-5 text-gray-400 absolute right-8 bottom-8 group-hover:text-[#63b956] transition-colors transform group-hover:translate-x-1" />
            </a>

            <a href={`tel:${settings?.contactPhone?.replace(/[^0-9+]/g, '') || '08508335646'}`} className="block bg-gray-50 hover:bg-gray-100 transition-colors p-8 rounded-3xl border border-gray-100 group relative">
              <Headset className="w-8 h-8 text-[#63b956] mb-6" strokeWidth={1.5} />
              <p className="text-sm text-gray-500 font-semibold mb-1">Arayın</p>
              <p className="text-xl font-bold text-gray-900">{settings?.contactPhone || '0850 833 56 46'}</p>
              <ArrowRight className="w-5 h-5 text-gray-400 absolute right-8 bottom-8 group-hover:text-[#63b956] transition-colors transform group-hover:translate-x-1" />
            </a>

            {(settings?.contactBankName || settings?.contactBankIban || settings?.contactBankQrCode) && (
              <div className="bg-[#f0f9f1] border border-[#d3ecd6] p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Landmark className="w-24 h-24 text-[#5da350]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 relative z-10"><Landmark className="w-5 h-5 text-[#5da350]" /> Banka & Hızlı Ödeme</h3>
                
                <div className="relative z-10">
                  {settings?.contactBankName && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 font-semibold mb-1">Banka Adı</p>
                      <p className="text-sm font-bold text-gray-900">{settings.contactBankName}</p>
                    </div>
                  )}
                  
                  {settings?.contactBankAccount && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 font-semibold mb-1">Hesap Sahibi</p>
                      <p className="text-sm font-bold text-gray-900">{settings.contactBankAccount}</p>
                    </div>
                  )}
                  
                  {settings?.contactBankIban && (
                    <div className="mb-6">
                      <p className="text-xs text-gray-500 font-semibold mb-1">IBAN Numarası</p>
                      <p className="text-sm font-mono font-bold text-gray-900 break-all">{settings.contactBankIban}</p>
                    </div>
                  )}
                  
                  {settings?.contactBankQrCode && (
                    <div className="mt-6 pt-6 border-t border-[#d3ecd6]">
                      <p className="text-xs text-gray-600 font-semibold mb-3 text-center">QR Kod ile Hızlı Ödeme</p>
                      <div className="bg-white p-3 rounded-2xl border border-gray-200 mx-auto w-full max-w-[160px] shadow-sm">
                        <img src={mediaUrl(settings.contactBankQrCode)} alt="Hızlı Ödeme QR Kodu" className="w-full h-auto object-contain rounded-xl" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Office Section */}
        <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-100 pb-4">Ofisimiz</h2>
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 flex flex-col xl:flex-row gap-8 mb-16">
          <div className="xl:w-1/2">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">İstanbul Şubesi</h3>
            
            <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
              <div className="border-b border-gray-100 pb-4">
                <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Phone className="w-4 h-4" /> Telefon Numarası</p>
                <p className="text-gray-900 font-medium">{settings?.contactPhone || '0850 833 56 46'}</p>
              </div>
              <div className="border-b border-gray-100 pb-4">
                <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><Printer className="w-4 h-4" /> Faks Numarası</p>
                <p className="text-gray-900 font-medium">{settings?.contactFax || '0262 679 80 80'}</p>
              </div>
              <div className="col-span-2 border-b border-gray-100 pb-4">
                <p className="text-gray-500 font-semibold mb-1 flex items-center gap-2"><MapPin className="w-4 h-4" /> Adres</p>
                <p className="text-gray-900 font-medium leading-relaxed mb-4">{settings?.contactAddress || 'Teknoloji Cad. No:1, İstanbul'}</p>
                <a href="https://www.google.com/maps/search/?api=1&query=Kerim+Bilgisayar+Servisi" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#63b956] text-white font-semibold text-sm hover:bg-[#529b46] transition-colors shadow-md hover:shadow-lg">
                  <MapPin className="w-4 h-4" /> Yol Tarifi Al
                </a>
              </div>
            </div>
          </div>
          
          <div className="xl:w-1/2 h-[400px] rounded-xl overflow-hidden border border-gray-200 relative">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4990.19986287963!2d29.161930700000003!3d40.9086984!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cac40ad16a5433%3A0x3052d2cc29aad60e!2sKerim%20-%20Bilgisayar%20Servisi!5e1!3m2!1str!2str!4v1783092827136!5m2!1str!2str"
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="İstanbul Ofis Haritası"
            ></iframe>
          </div>
        </div>

      </div>

      {/* Contact Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-8 md:p-10">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('form.successTitle', 'Talebiniz Alındı')}</h3>
                  <p className="text-gray-600 mb-8">{t('form.successMessage', 'Uzmanlarımız en kısa sürede sizinle iletişime geçecektir.')}</p>
                  <button onClick={() => { setSuccess(false); setIsModalOpen(false); }} className="bg-primary text-white font-bold py-3 px-8 rounded-full">{t('common.close', 'Kapat')}</button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('form.fillForm', 'Formu Doldurun')}</h3>
                  <p className="text-gray-500 mb-8 text-sm">{t('form.fillFormDesc', 'İşletmenize uygun bilişim çözümleri için sizi arayalım.')}</p>
                  
                  {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex gap-2 items-center"><AlertCircle className="w-4 h-4 shrink-0"/> {error}</div>}
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{t('form.name', 'Adınız Soyadınız')} <span className="text-red-500">*</span></label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#63b956]/50 focus:border-[#63b956]" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{t('form.email', 'E-Posta')} <span className="text-red-500">*</span></label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#63b956]/50 focus:border-[#63b956]" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{t('form.phone', 'Telefon Numarası')} <span className="text-red-500">*</span></label>
                      <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#63b956]/50 focus:border-[#63b956]" />
                    </div>
                    <button disabled={loading} type="submit" className="w-full bg-[#63b956] hover:bg-[#52a046] text-white font-bold py-4 rounded-xl transition-colors mt-2 flex items-center justify-center shadow-lg shadow-[#63b956]/20">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('form.submit', 'Gönder')}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
