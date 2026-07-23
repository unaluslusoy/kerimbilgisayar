import { useState, useEffect, FormEvent } from 'react';
import Breadcrumb from '../../components/Breadcrumb';
import { Search, Package, CheckCircle2, Wrench, Clock, FileText, AlertCircle, CalendarPlus, ArrowRight, Loader2, CreditCard, Building2, Landmark, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fetchTicket } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import { Link, useParams } from 'react-router-dom';
import TurnstileWidget from '../../components/TurnstileWidget';
import { useSettings } from '../../context/SettingsContext';

export default function DeviceStatus() {
  usePageTitle('Cihaz Durumu Sorgula');
  const { orderNo } = useParams<{ orderNo: string }>();
  const { settings } = useSettings();
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Approval/Rejection & Payment State
  const [turnstileToken, setTurnstileToken] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'bank' | 'cash' | null>(null);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState('');

  // Extract from query params on mount
  useEffect(() => {
    if (orderNo) {
      const code = orderNo.trim().toUpperCase();
      setTicketId(code);
      setSearched(true);
      setLoading(true);
      setError(false);
      fetchTicket(code)
        .then((data) => {
          setResult(data);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const no = params.get('no');
    if (no) {
      const code = no.trim().toUpperCase();
      setTicketId(code);
      setSearched(true);
      setLoading(true);
      setError(false);
      fetchTicket(code)
        .then((data) => {
          setResult(data);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    }
  }, [orderNo]);

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = ticketId.trim();
    if (!cleanId) return;

    setSearched(true);
    setLoading(true);
    setError(false);
    setResult(null);

    try {
      const data = await fetchTicket(cleanId);
      if (data && (data.id || data.ticketNumber)) {
        setResult(data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!result) return;
    const isCaptchaRequired = settings?.captchaEnabled === 'true';
    if (isCaptchaRequired && !turnstileToken) {
      alert('Lütfen önce aşağıdaki güvenlik doğrulamasını (Captcha) kutucuğunu işaretleyerek tamamlayınız.');
      return;
    }
    setProcessingAction(true);
    const code = result.ticketNumber || result.id || ticketId;
    try {
      const res = await fetch(`/api/tickets/${code}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnstileToken })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Onaylama işlemi başarısız.');
      // Refresh ticket info
      const refreshed = await fetchTicket(code);
      setResult(refreshed);
      alert('Onarım onayınız başarıyla iletildi. Cihazınız sıraya alınmıştır.');
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDecline = async () => {
    if (!result) return;
    const isCaptchaRequired = settings?.captchaEnabled === 'true';
    if (isCaptchaRequired && !turnstileToken) {
      alert('Lütfen önce aşağıdaki güvenlik doğrulamasını (Captcha) kutucuğunu işaretleyerek tamamlayınız.');
      return;
    }
    if (!window.confirm('Teklifi reddetmek istediğinize emin misiniz? Cihaz işlem yapılmadan iade edilecektir.')) return;
    setProcessingAction(true);
    const code = result.ticketNumber || result.id || ticketId;
    try {
      const res = await fetch(`/api/tickets/${code}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnstileToken })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız.');
      const refreshed = await fetchTicket(code);
      setResult(refreshed);
      alert('Talebiniz alınmıştır. Cihaz iade edilmek üzere hazırlanacaktır.');
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleMockPayment = async (method: 'kredi_karti' | 'havale_eft' | 'nakit') => {
    if (!result) return;
    setProcessingAction(true);
    const code = result.ticketNumber || result.id || ticketId;
    try {
      const res = await fetch(`/api/tickets/${code}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: method })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ödeme kaydı oluşturulamadı.');
      
      setPaymentSuccess(true);
      if (method === 'kredi_karti') {
        setPaymentMsg('Ödemeniz başarıyla tahsil edildi. Cihazınızı teslim alabilirsiniz.');
      } else if (method === 'havale_eft') {
        setPaymentMsg('Havale ödeme bildiriminiz başarıyla yöneticilere iletildi. Kontrol sonrası onaylanacaktır.');
      } else {
        setPaymentMsg('Elden nakit ödeme tercihiniz kaydedildi.');
      }
      
      const refreshed = await fetchTicket(code);
      setResult(refreshed);
    } catch (err: any) {
      alert('Ödeme hatası: ' + err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const statusMap: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    'pending': { label: 'Kayıt Kabul / Alındı', icon: Package, color: 'text-gray-500', bg: 'bg-gray-100' },
    'yeni': { label: 'Kayıt Kabul / Alındı', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    'in_progress': { label: 'İşlemde / Tamirde', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
    'islemde': { label: 'İşlemde / Tamirde', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
    'isleme_alindi': { label: 'İşleme Alındı', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
    'parca_bekliyor': { label: 'Yedek Parça Bekleniyor', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
    'musteri_onayi_bekliyor': { label: 'Müşteri Onayı Bekleniyor', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
    'ready': { label: 'Hazır / Test Edildi', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    'cozuldu': { label: 'Onarım Tamamlandı (Teslime Hazır)', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100' },
    'teslim_edildi': { label: 'Teslim Edildi', icon: CheckCircle2, color: 'text-gray-700', bg: 'bg-gray-200' },
    'completed': { label: 'Teslim Edildi', icon: CheckCircle2, color: 'text-gray-700', bg: 'bg-gray-200' },
    'kapatildi': { label: 'Kapandı', icon: CheckCircle2, color: 'text-gray-600', bg: 'bg-gray-100' },
    'iptal': { label: 'İade / İptal Edildi', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' }
  };

  const getStatusInfo = (st: string) => {
    return statusMap[st] || { label: st || 'İşlemde', icon: Package, color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  // Fiş toplam maliyeti hesabı
  const partsCost = result?.parts?.reduce((acc: number, p: any) => acc + (parseFloat(p.totalPrice) || 0), 0) || 0;
  const laborCost = parseFloat(result?.laborCost) || 0;
  const grandTotal = partsCost + laborCost > 0 ? partsCost + laborCost : (parseFloat(result?.estimatedCost) || 0);

  const bankIban = 'TR 0400 0100 0851 6494 6919 5006';
  const bankName = 'Ziraat Bankası';
  const bankAccount = 'Yılmaz Kerim';
  const qrBankUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(`iban=${bankIban}&name=${bankAccount}`)}`;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-screen font-sans">
      {/* Page Header (Standart Kurumsal Public Header) */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb className="mb-6" items={[{ label: 'Anasayfa', href: '/' }, { label: 'Arıza Sorgulama' }]} />
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Cihaz Durumu Sorgulama
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            Takip numaranız ile cihazınızın canlı durumunu, teknik dökümünü ve masraf onaylarını takip edin.
          </p>
        </div>
      </div>

      <div className="py-12 md:py-16 px-4 flex justify-center flex-1">
        <div className="max-w-3xl w-full mx-auto">

          <form onSubmit={handleSearch} className="bg-white p-2 rounded-theme border border-gray-200 shadow-sm flex items-center mb-8 font-sans">
            <Search className="w-6 h-6 text-gray-400 ml-4 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Takip Numaranızı Giriniz..."
              aria-label="Takip Numarası"
              className="flex-1 w-full bg-transparent border-none focus:outline-none text-gray-900 font-medium py-3 text-lg placeholder:text-gray-400 min-w-0 disabled:opacity-50"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              disabled={loading}
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-primary hover:bg-secondary text-white px-6 md:px-8 py-3 rounded-theme font-bold transition-colors shadow-sm ml-2 shrink-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sorgula'}
            </button>
          </form>

          {searched && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loading ? (
                <div className="text-center p-12 bg-white rounded-theme border border-gray-200 border-dashed shadow-sm">
                   <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                   <h3 className="text-lg font-bold text-gray-900 mb-2">Sorgulanıyor...</h3>
                   <p className="text-gray-500 font-medium">Lütfen bekleyin, cihazınızın durumu kontrol ediliyor.</p>
                </div>
              ) : result && !error ? (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-200/50">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 bg-gray-50/80">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">Takip Numarası</p>
                      <p className="text-xl font-bold font-mono text-gray-900">#{result.ticketNumber || result.id}</p>
                    </div>
                    <div className={cn('px-4 py-2 rounded-full flex items-center text-sm font-bold', getStatusInfo(result.rawStatus).bg, getStatusInfo(result.rawStatus).color)}>
                      {(() => { const Icon = getStatusInfo(result.rawStatus).icon; return <Icon className="w-4 h-4 mr-2" />; })()}
                      {getStatusInfo(result.rawStatus).label}
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Customer & Device details Grid */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <h3 className="text-lg font-extrabold text-gray-900">
                          {[result.deviceBrand, result.deviceModel].filter(Boolean).join(' ') || result.deviceType || result.subject || 'Cihaz Bilgisi'}
                        </h3>
                        {result.isUnderWarranty !== undefined && (
                          <span className={cn('text-xs font-bold px-3 py-1 rounded-full border', result.isUnderWarranty ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200')}>
                            {result.isUnderWarranty ? '✓ Garantili Cihaz' : 'Garanti Dışı'}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80 shadow-inner">
                        {/* Müşteri Bilgileri (Veritabanından Gelen Gerçek Veriler) */}
                        {(result.customerName || result.customerPhone || result.customerEmail || result.customerAddress) && (
                          <p className="md:col-span-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">Müşteri Bilgileri</p>
                        )}
                        {result.customerName && (
                          <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Müşteri Adı</p>
                            <p className="font-bold text-gray-800">{result.customerName}</p>
                          </div>
                        )}
                        {result.customerPhone && (
                          <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Telefon Numarası</p>
                            <p className="font-mono font-bold text-gray-800">{result.customerPhone}</p>
                          </div>
                        )}
                        {result.customerEmail && (
                          <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">E-Posta Adresi</p>
                            <p className="font-bold text-gray-800">{result.customerEmail}</p>
                          </div>
                        )}
                        {result.customerAddress && (
                          <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Teslimat / Kayıt Adresi</p>
                            <p className="font-bold text-gray-800">{result.customerAddress}</p>
                          </div>
                        )}

                        {/* Ürün & Cihaz Bilgileri */}
                        {(result.deviceType || result.serialNumber) && (
                          <div className="md:col-span-2 border-t border-gray-200 pt-3 mt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <p className="md:col-span-2 text-[11px] font-black text-gray-400 uppercase tracking-widest -mb-1">Cihaz Bilgileri</p>
                            {result.deviceType && (
                              <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Cihaz Türü / Kategorisi</p>
                                <p className="font-bold text-gray-900 capitalize">{result.deviceType}</p>
                              </div>
                            )}
                            {result.serialNumber && (
                              <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Seri Numarası / Kodu</p>
                                <p className="font-mono font-bold text-gray-900">{result.serialNumber}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {result.accessories && (
                          <div className="md:col-span-2 border-t border-gray-200 pt-3">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Emanet Alınan Aksesuarlar</p>
                            <p className="font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5">{result.accessories}</p>
                          </div>
                        )}
                        {(result.issueDescription || result.description || result.subject) && (
                          <div className="md:col-span-2 border-t border-gray-200 pt-3">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Arıza Şikayeti / Bildirilen Sorun</p>
                            <div className="text-gray-800 bg-white p-3.5 rounded-xl border border-gray-200 leading-relaxed font-medium whitespace-pre-wrap shadow-sm">
                              {result.issueDescription || result.description || result.subject}
                            </div>
                          </div>
                        )}
                        {result.technicianNotes && (
                          <div className="md:col-span-2 border-t border-blue-100 pt-3">
                            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-0.5">Servis Personeli Görüş / Notu</p>
                            <div className="text-blue-900 bg-blue-50 p-3.5 rounded-xl border border-blue-200 leading-relaxed font-semibold whitespace-pre-wrap">
                              {result.technicianNotes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-4">Servis Geçmişi</h4>
                      <div className="relative pl-5 border-l-2 border-gray-100 space-y-5">
                        <div className="relative">
                          <div className="absolute -left-[26px] top-0.5 w-3 h-3 rounded-full bg-gray-300 border-2 border-white"></div>
                          <p className="font-bold text-xs text-gray-900">Cihaz Servise Alındı</p>
                          <p className="text-[11px] text-gray-400">{new Date(result.createdAt).toLocaleString('tr-TR')}</p>
                        </div>
                        {(result.statusLogs || []).slice().reverse().map((log: any) => {
                          const info = getStatusInfo(log.toStatus);
                          return (
                            <div key={log.id} className="relative">
                              <div className="absolute -left-[26px] top-0.5 w-3 h-3 rounded-full bg-primary border-2 border-white"></div>
                              <p className="font-bold text-xs text-gray-900">{info.label}</p>
                              {log.notes && <p className="text-[11px] text-gray-500 mt-0.5">{log.notes}</p>}
                              <p className="text-[11px] text-gray-400">{new Date(log.createdAt).toLocaleString('tr-TR')}</p>
                            </div>
                          );
                        })}
                        {(!result.statusLogs || result.statusLogs.length === 0) && result.rawStatus !== 'yeni' && (
                          <div className="relative">
                            <div className="absolute -left-[26px] top-0.5 w-3 h-3 rounded-full bg-primary border-2 border-white"></div>
                            <p className="font-bold text-xs text-gray-900">Durum Güncellemesi</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Cihazınız "{getStatusInfo(result.rawStatus).label}" aşamasına getirildi.</p>
                            <p className="text-[11px] text-gray-400">{new Date(result.updatedAt).toLocaleString('tr-TR')}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fiş Kalemleri ve Maliyet Masraf Listesi */}
                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="text-sm font-black text-gray-900 mb-3">İşlemler & Maliyet Masraf Detayları</h4>
                      <div className="bg-slate-50 rounded-xl border border-gray-200 p-4 space-y-2.5">
                        {result.parts && result.parts.length > 0 ? (
                          result.parts.map((p: any) => (
                            <div key={p.id} className="flex justify-between text-xs text-gray-700">
                              <span className="font-semibold text-gray-800">{p.name || 'Yedek Parça / İşlem'} (x{p.quantity || 1})</span>
                              <span className="font-bold text-gray-900">₺{parseFloat(p.totalPrice || (parseFloat(p.unitPrice || '0') * (p.quantity || 1))).toLocaleString('tr-TR')}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-450 italic">Ekstra yedek parça bulunmuyor.</p>
                        )}
                        
                        {result.laborCost > 0 && (
                          <div className="flex justify-between text-xs text-gray-700 border-t border-dashed border-gray-300 pt-2 mt-2">
                            <span>Teknik İşçilik Hizmeti</span>
                            <span className="font-bold text-gray-900">₺{parseFloat(result.laborCost).toLocaleString('tr-TR')}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm font-black text-gray-900 border-t-2 border-gray-300 pt-3 mt-3">
                          <span>GENEL TOPLAM</span>
                          <span className="text-base text-primary">₺{grandTotal.toLocaleString('tr-TR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Müşteri Onayı Ekranı (musteri_onayi_bekliyor durumunda çıkar) */}
                    {result.rawStatus === 'musteri_onayi_bekliyor' && (
                      <div className="border-2 border-amber-200 bg-amber-50/30 rounded-2xl p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-amber-800">Onarım Onayınız Bekleniyor</h4>
                            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                              Yukarıda dökümü sunulan masrafı ve parça değişimlerini onaylamanız halinde cihazınızın tamir işlemleri hemen başlayacaktır.
                            </p>
                          </div>
                        </div>

                        {/* Turnstile / Captcha Kontrolü */}
                        <div className="my-2 flex justify-center">
                          <TurnstileWidget 
                             enabled={settings?.captchaEnabled === 'true'} 
                             siteKey={settings?.turnstileSiteKey} 
                             onVerify={(token) => setTurnstileToken(token)} 
                          />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={handleApprove}
                            disabled={processingAction}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            {processingAction ? 'Lütfen bekleyin...' : 'Onarımı Onayla'}
                          </button>
                          <button
                            onClick={handleDecline}
                            disabled={processingAction}
                            className="flex-1 border border-red-300 hover:bg-red-50 text-red-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center"
                          >
                            Teklifi Reddet / İade İste
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Ödeme Alma Ekranı (cozuldu/ready durumunda çıkar) */}
                    {(result.rawStatus === 'cozuldu' || result.rawStatus === 'ready') && grandTotal > 0 && (
                      <div className="border-2 border-green-200 bg-green-50/10 rounded-2xl p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-green-800">Onarım Tamamlandı — Ödeme Seçenekleri</h4>
                            <p className="text-xs text-green-700 mt-1">
                              Cihazınız başarıyla onarılmıştır. Teslim alabilmek için lütfen aşağıdaki ödeme yöntemlerinden birini tercih ederek işleminizi tamamlayınız.
                            </p>
                          </div>
                        </div>

                        {!paymentSuccess ? (
                          <div className="space-y-4 pt-2">
                            {/* Ödeme yöntemi seçimi */}
                            <div className="grid grid-cols-3 gap-2.5">
                              <button
                                type="button"
                                onClick={() => setSelectedPaymentMethod('card')}
                                className={cn('p-3 border rounded-xl flex flex-col items-center text-center gap-1.5 transition-all', selectedPaymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-gray-200 hover:bg-gray-50 text-gray-600')}
                              >
                                <CreditCard className="w-5 h-5" />
                                <span className="text-[10px] font-bold">Kredi Kartı</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedPaymentMethod('bank')}
                                className={cn('p-3 border rounded-xl flex flex-col items-center text-center gap-1.5 transition-all', selectedPaymentMethod === 'bank' ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-gray-200 hover:bg-gray-50 text-gray-600')}
                              >
                                <Building2 className="w-5 h-5" />
                                <span className="text-[10px] font-bold">Havale / EFT</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedPaymentMethod('cash')}
                                className={cn('p-3 border rounded-xl flex flex-col items-center text-center gap-1.5 transition-all', selectedPaymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-gray-200 hover:bg-gray-50 text-gray-600')}
                              >
                                <Landmark className="w-5 h-5" />
                                <span className="text-[10px] font-bold">Elden Nakit</span>
                              </button>
                            </div>

                            {/* Detaylar */}
                            {selectedPaymentMethod === 'card' && (
                              <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3 font-sans text-xs">
                                <p className="font-bold text-gray-800">Kart Bilgilerini Girin (Güvenli Mock Ödeme)</p>
                                <div className="space-y-2">
                                  <input
                                    type="text" placeholder="Kart Sahibi Adı Soyadı"
                                    value={cardHolder} onChange={e => setCardHolder(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                                  />
                                  <input
                                    type="text" placeholder="Kart Numarası (16 Hane)"
                                    value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text" placeholder="AA/YY"
                                      value={cardExpiry} onChange={e => setCardExpiry(e.target.value)}
                                      className="border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                                    />
                                    <input
                                      type="text" placeholder="CVV"
                                      value={cardCvv} onChange={e => setCardCvv(e.target.value)}
                                      className="border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleMockPayment('kredi_karti')}
                                  disabled={processingAction || !cardHolder || !cardNumber}
                                  className="w-full bg-primary hover:bg-secondary text-white py-2 rounded-lg font-bold transition-all shadow-sm"
                                >
                                  {processingAction ? 'İşleniyor...' : `₺${grandTotal.toLocaleString('tr-TR')} Öde`}
                                </button>
                              </div>
                            )}

                            {selectedPaymentMethod === 'bank' && (
                              <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3 font-sans text-xs">
                                <p className="font-bold text-gray-800">Banka Havale Bilgileri</p>
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1.5 font-mono text-[11px] text-gray-700">
                                  <div className="flex justify-between"><span>Banka:</span> <span className="font-bold text-gray-900">{bankName}</span></div>
                                  <div className="flex justify-between"><span>Alıcı:</span> <span className="font-bold text-gray-900">{bankAccount}</span></div>
                                  <div className="flex flex-col border-t border-dashed pt-1.5 mt-1.5">
                                    <span>IBAN:</span>
                                    <span className="font-black text-gray-900 text-xs tracking-wider">{bankIban}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center justify-center py-2 bg-slate-50/50 border rounded-lg">
                                  <img src={qrBankUrl} alt="Banka QR" className="w-32 h-32 border p-1 rounded bg-white shadow-sm" />
                                  <p className="text-[9px] font-bold text-gray-500 mt-1">Mobil bankacılık ile IBAN'ı taratın</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleMockPayment('havale_eft')}
                                  disabled={processingAction}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition-all shadow-sm"
                                >
                                  {processingAction ? 'Bildiriliyor...' : 'Havale Yaptım Bildir'}
                                </button>
                              </div>
                            )}

                            {selectedPaymentMethod === 'cash' && (
                              <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3 font-sans text-xs">
                                <p className="text-gray-600 leading-relaxed">
                                  Cihazınızı ofisimize gelip teslim alırken ödemenizi **nakit** olarak elden yapabilirsiniz.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleMockPayment('nakit')}
                                  disabled={processingAction}
                                  className="w-full bg-gray-850 hover:bg-black text-white py-2 rounded-lg font-bold transition-all"
                                >
                                  Elden Nakit Ödeyeceğim
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-green-600 text-white rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                              <Check className="w-5 h-5 text-white font-bold" />
                            </div>
                            <p className="text-xs font-bold">{paymentMsg}</p>
                          </div>
                        )}
                      </div>
                    )}




                  </div>
                </div>
              ) : (
                <div className="text-center p-12 bg-white rounded-theme border border-gray-200 border-dashed shadow-sm">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Kayıt Bulunamadı</h3>
                  <p className="text-gray-500 font-medium max-w-md mx-auto">Girdiğiniz numaraya ait bir servis kaydı bulunmuyor. Lütfen takip numarasını kontrol edip tekrar deneyiniz.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
