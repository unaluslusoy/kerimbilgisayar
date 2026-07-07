import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { submitAppointment } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import { Info, Calendar as CalendarIcon, Clock, UserCircle, Server, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import TurnstileWidget from '../../components/TurnstileWidget';


export default function Appointment() {
  usePageTitle('Randevu Al');
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [appointmentType, setAppointmentType] = useState<'bireysel' | 'kurumsal' | null>(null);
  const [formData, setFormData] = useState({
    serviceType: '',
    details: '',
    date: '',
    time: '',
    companyName: '',
    fullName: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleSubmit = async () => {
    setError('');
    
    // Validation
    if (!formData.fullName.trim()) return setError("Lütfen ad ve soyad alanını doldurunuz.");
    if (appointmentType === 'kurumsal' && !formData.companyName.trim()) return setError("Lütfen firma adını doldurunuz.");
    if (!formData.phone.trim() || formData.phone.length < 10) return setError("Lütfen geçerli bir telefon numarası giriniz.");
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setError("Lütfen geçerli bir e-posta adresi giriniz.");
    if (!formData.date || !formData.time) return setError("Lütfen tarih ve saat seçiminizi tamamlayınız.");

    setLoading(true);
    try {
      const res = await submitAppointment({
        type: appointmentType,
        ...formData,
        turnstileToken
      });
      setTicketId(res?.ticketId || `TLP-${Math.floor(Math.random() * 10000)}`);
      setSuccess(true);
    } catch(err: any) {
      setError(err.message || "Gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="py-16 md:py-24 bg-gray-50 flex-1 flex flex-col justify-center items-center px-4 font-sans">
        <div className="bg-white p-12 rounded-3xl shadow-xl max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Talebiniz Başarıyla Kaydedildi</h2>
          <p className="text-green-800 font-medium mb-4 leading-relaxed">
            Teknik destek veya kurumsal keşif talebiniz başarıyla oluşturulmuştur. Paylaştığınız iletişim kanalları üzerinden uzman ekibimiz en kısa sürede sizinle irtibata geçecektir.
          </p>
          {ticketId && (
            <div className="bg-gray-50 border border-gray-200 rounded-theme p-4 mb-8">
              <p className="text-sm text-gray-500 mb-1">Takip Numaranız</p>
              <p className="text-xl font-mono font-bold text-gray-900">{ticketId}</p>
            </div>
          )}
          <button onClick={() => navigate('/')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-theme transition-colors">
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans flex-1 flex flex-col">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2 font-medium">
            <Link to="/" className="hover:text-primary transition-colors">Anasayfa</Link>
            <span>&gt;</span>
            <span className="text-gray-900">Randevu Al</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Talep / Randevu Oluştur
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            Bireysel donanım servis kaydı veya kurumsal altyapı/bakım anlaşması talebi oluşturun.
          </p>
        </div>
      </div>

      <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">

        <div className="bg-white rounded-theme border border-gray-200 shadow-xl overflow-hidden">
          
          {step === 1 && (
            <div className="p-8 md:p-12 animate-in fade-in slide-in-from-right-8 duration-300">
               <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">Nasıl bir hizmet arıyorsunuz?</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 <button 
                   onClick={() => { setAppointmentType('bireysel'); setStep(2); }}
                   className="group p-8 border-2 border-gray-200 rounded-theme hover:border-green-500 hover:bg-green-50 transition-all text-left relative overflow-hidden"
                 >
                    <div className="bg-green-100 w-16 h-16 rounded-theme flex items-center justify-center mb-6 text-green-600 group-hover:scale-110 transition-transform">
                      <UserCircle className="w-8 h-8" />
                    </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Bireysel Servis</h3>
                     <p className="text-gray-600 font-medium">Kişisel donanım onarımı, işletim sistemi kurulumu, bileşen yükseltme (SSD/RAM) veya yüksek performanslı espor sistem mühendisliği talepleri.</p>
                 </button>

                 <button 
                   onClick={() => { setAppointmentType('kurumsal'); setStep(2); }}
                   className="group p-8 border-2 border-gray-200 rounded-theme hover:border-green-500 hover:bg-green-50 transition-all text-left relative overflow-hidden"
                 >
                    <div className="bg-green-100 w-16 h-16 rounded-theme flex items-center justify-center mb-6 text-green-600 group-hover:scale-110 transition-transform">
                      <Server className="w-8 h-8" />
                    </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Kurumsal Çözüm</h3>
                     <p className="text-gray-600 font-medium">Ofis BT altyapısı tasarımı, SLA destek anlaşmaları, yapısal network kablolaması, güvenli sunucu (Server) kurulumu ve veri yedekleme çözümleri.</p>
                 </button>

               </div>
            </div>
          )}

          {step > 1 && (
            <>
              {/* Progress Bar */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                {[
                  { num: 2, label: appointmentType === 'bireysel' ? 'Cihaz Bilgisi' : 'Talep Tipi' },
                  { num: 3, label: 'Tarih & Saat' },
                  { num: 4, label: 'İletişim' }
                ].map((s) => (
                  <div key={s.num} className={`flex-1 py-4 text-center text-sm font-bold transition-colors ${step >= s.num ? 'bg-green-50 text-green-600 border-b-2 border-green-600' : 'text-gray-400 bg-transparent border-b-2 border-transparent'}`}>
                    {s.num - 1}. {s.label}
                  </div>
                ))}
              </div>

              <div className="p-6 md:p-10">
                {step === 2 && appointmentType === 'bireysel' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Cihaz Türü / Hizmet</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['Laptop', 'Masaüstü', 'Gaming Sistem', 'Diğer'].map(t => (
                          <button 
                            key={t}
                            onClick={() => setFormData({...formData, serviceType: t})}
                            className={`py-3 px-2 border rounded-theme focus:outline-none transition-colors font-medium text-sm ${formData.serviceType === t ? 'border-green-600 bg-green-50 text-green-700' : 'bg-white border-gray-300 text-gray-700 hover:border-green-500 hover:bg-green-50'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marka / Model</label>
                      <input 
                         type="text" 
                         value={formData.details.split('\n')[0] || ''}
                         onChange={(e) => setFormData({...formData, details: e.target.value + '\n' + (formData.details.split('\n')[1] || '')})}
                         className="w-full bg-white border border-gray-300 text-gray-900 rounded-theme py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none placeholder:text-gray-400" 
                         placeholder="Örn: Lenovo, Asus ROG, Custom Kasa" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Şikayetiniz / Talebiniz</label>
                      <textarea 
                        rows={4} 
                        value={formData.details.split('\n').slice(1).join('\n') || ''}
                        onChange={(e) => setFormData({...formData, details: (formData.details.split('\n')[0] || '') + '\n' + e.target.value})}
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-theme py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none placeholder:text-gray-400 resize-none" 
                        placeholder="Cihazınızdaki sorunu veya oyun sistemi toplama vb. talebinizi kısaca açıklayın..."
                      ></textarea>
                    </div>
                    <div className="pt-4 flex justify-between">
                      <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-800 font-bold py-3 px-6 rounded-theme transition-colors border border-transparent hover:bg-gray-100">Geri</button>
                      <button onClick={() => setStep(3)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-theme transition-colors shadow-md">İleri</button>
                    </div>
                  </div>
                )}

                {step === 2 && appointmentType === 'kurumsal' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Hizmet Tipi</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['Aylık Kurumsal Bakım Anlaşması', 'Toplu Sistem/Ağ Kurulumu', 'Server/Veri Yedekleme Çözümleri', 'Diğer Projelendirme'].map(t => (
                          <button 
                             key={t}
                             onClick={() => setFormData({...formData, serviceType: t})}
                             className={`py-4 px-4 border rounded-theme text-left focus:outline-none transition-colors font-medium text-sm ${formData.serviceType === t ? 'border-green-600 bg-green-50 text-green-700' : 'bg-white border-gray-300 text-gray-700 hover:border-green-500 hover:bg-green-50'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Şirket Altyapınız / Talebiniz</label>
                      <textarea 
                        rows={4} 
                        value={formData.details}
                        onChange={(e) => setFormData({...formData, details: e.target.value})}
                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-theme py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none placeholder:text-gray-400 resize-none" 
                        placeholder="Kaç bilgisayarınız var, talebinizin detayları nelerdir? Lütfen kısaca bahsedin..."></textarea>
                    </div>
                    <div className="pt-4 flex justify-between">
                      <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-800 font-bold py-3 px-6 rounded-theme transition-colors border border-transparent hover:bg-gray-100">Geri</button>
                      <button onClick={() => setStep(3)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-theme transition-colors shadow-md">İleri</button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-4 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-green-600"/> Tarih Seçin</label>
                          <div className="bg-gray-50 border border-gray-200 rounded-theme p-8 text-center text-gray-500 font-medium border-dashed">
                            <input 
                               type="date" 
                               value={formData.date}
                               onChange={(e) => setFormData({...formData, date: e.target.value})}
                               className="bg-white border border-gray-300 rounded-theme px-4 py-2 text-gray-900 focus:ring-green-500 focus:border-green-500 w-full"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-4 flex items-center"><Clock className="w-5 h-5 mr-2 text-green-600"/> Saat Seçin</label>
                           <div className="grid grid-cols-3 gap-3">
                             {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                               <button 
                                 key={t} 
                                 onClick={() => setFormData({...formData, time: t})}
                                 className={`py-3 border rounded-theme focus:outline-none transition-colors font-medium text-sm shadow-sm ${formData.time === t ? 'border-primary bg-primary/5 text-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-primary/50 hover:bg-primary/5'}`}
                               >
                                 {t}
                               </button>
                             ))}
                           </div>
                        </div>
                     </div>
                     <div className="pt-6 flex justify-between border-t border-gray-200">
                      <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-800 font-bold py-3 px-6 rounded-theme transition-colors border border-transparent hover:bg-gray-100">Geri</button>
                      <button onClick={() => setStep(4)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-theme transition-colors shadow-md">İleri</button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-theme flex items-start">
                        <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{error}</p>
                      </div>
                    )}
                    <fieldset disabled={loading} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {appointmentType === 'kurumsal' && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Firma Adı</label>
                          <input 
                            type="text" 
                            value={formData.companyName}
                            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-theme py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none placeholder:text-gray-400 disabled:opacity-60" 
                            placeholder="İşletme Unvanı" 
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{appointmentType === 'kurumsal' ? 'Yetkili Ad Soyad' : 'Ad Soyad'}</label>
                        <input 
                           type="text" 
                           value={formData.fullName}
                           onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                           className="w-full bg-white border border-gray-300 text-gray-900 rounded-theme py-3 px-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none placeholder:text-gray-400 disabled:opacity-60" 
                           placeholder="Adınız Soyadınız" 
                        />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Telefon Numarası <span className="text-red-500">*</span></label>
                         <input 
                            type="tel" 
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-theme py-3 px-4 focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none placeholder:text-gray-400 disabled:opacity-60" 
                            placeholder="05XX XXX XX XX" 
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">E-Posta</label>
                         <input 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-theme py-3 px-4 focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none placeholder:text-gray-400 disabled:opacity-60" 
                            placeholder="ornek@mail.com" 
                         />
                       </div>
                    </fieldset>
                    
                    <div className="bg-green-50 border border-green-100 rounded-theme p-4 flex items-start mt-6">
                      <Info className="w-5 h-5 text-green-600 mt-0.5 mr-3 shrink-0" />
                      <p className="text-sm text-green-800 font-medium leading-relaxed">
                        Talebinizin sisteme ulaşmasının ardından, {appointmentType === 'kurumsal' ? 'kurumsal proje yöneticimiz' : 'teknik servis danışmanımız'} detaylı bilgilendirme ve teyit amacıyla sizinle iletişime geçecektir.
                      </p>
                    </div>

                    <TurnstileWidget enabled={settings?.captchaEnabled === 'true'} siteKey={settings?.turnstileSiteKey} onVerify={setTurnstileToken} />

                    <div className="pt-6 flex justify-between border-t border-gray-200">
                      <button onClick={() => setStep(3)} className="text-gray-500 hover:text-gray-800 font-bold py-3 px-6 rounded-theme transition-colors border border-transparent hover:bg-gray-100">Geri</button>
                      <button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-theme transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center min-w-[150px] justify-center">
                        {loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                        {loading ? 'Onaylanıyor' : 'Talebi Onayla'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
