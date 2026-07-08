import { useState, FormEvent } from 'react';
import Breadcrumb from '../../components/Breadcrumb';
import { Search, Package, CheckCircle2, Wrench, Clock, FileText, AlertCircle, CalendarPlus, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fetchTicket } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import { Link } from 'react-router-dom';

export default function DeviceStatus() {
  usePageTitle('Cihaz Durumu Sorgula');
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setLoading(true);
    setError(false);
    try {
      const data = await fetchTicket(ticketId.trim().toUpperCase());
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(true);
    }
    setLoading(false);
  };

  const statusMap: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    // English legacy statuses
    'pending': { label: 'Kayıt Kabul / Alındı', icon: Package, color: 'text-gray-500', bg: 'bg-gray-100' },
    'diagnosing': { label: 'Laboratuvar Analizi', icon: Search, color: 'text-purple-600', bg: 'bg-purple-100' },
    'waiting_parts': { label: 'Yedek Parça Tedariği', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
    'repairing': { label: 'Aktif Onarım / Entegrasyon', icon: Wrench, color: 'text-primary', bg: 'bg-primary/10' },
    'ready': { label: 'Test Sürecinde / Teslime Hazır', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
    'delivered': { label: 'Teslim Edildi', icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-100' },
    // Turkish statuses
    'yeni': { label: 'Servise Alındı', icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    'isleme_alindi': { label: 'Arıza Tespiti', icon: Wrench, color: 'text-purple-600', bg: 'bg-purple-100' },
    'parca_bekliyor': { label: 'Parça Bekleniyor', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
    'musteri_onaji_bekliyor': { label: 'Müşteri Onayı Bekleniyor', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
    'cozuldu': { label: 'Çözüldü', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
    'kapatildi': { label: 'Teslim Edildi', icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-100' },
    'iptal': { label: 'İptal Edildi', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' },
  };

  const getStatusInfo = (status: string) => statusMap[status] ?? { label: status, icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb className="mb-6" items={[{ label: 'Anasayfa', href: '/' }, { label: 'Arıza Sorgulama' }]} />
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Cihaz Durumu Sorgulama
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            Teknik laboratuvarımıza bıraktığınız cihazlarınızın güncel onarım ve test durumunu takip numarasıyla anlık olarak sorgulayabilirsiniz.
          </p>
        </div>
      </div>

      <div className="py-16 md:py-24 px-4 flex justify-center">
        <div className="max-w-2xl w-full">

        <form onSubmit={handleSearch} className="bg-white p-2 rounded-theme border border-gray-200 shadow-sm flex items-center mb-10 font-sans">
          <Search className="w-6 h-6 text-gray-400 ml-4 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Örn: SRV-2023-001"
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
              <div className="bg-white rounded-theme border border-gray-200 overflow-hidden shadow-xl shadow-gray-200/50">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Takip Numarası</p>
                    <p className="text-xl font-bold font-mono text-gray-900">{result.ticketNumber || result.id}</p>
                  </div>
                  <div className={cn('px-4 py-2 rounded-full flex items-center text-sm font-bold', getStatusInfo(result.status).bg, getStatusInfo(result.status).color)}>
                    {(() => { const Icon = getStatusInfo(result.status).icon; return <Icon className="w-4 h-4 mr-2" />; })()}
                    {getStatusInfo(result.status).label}
                  </div>
                </div>

                <div className="p-6">
                  {/* Device Info */}
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {[result.deviceBrand, result.deviceModel].filter(Boolean).join(' ') ||
                     result.deviceType || result.brandModel || 'Cihaz Bilgisi'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    {result.customerName && (
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Müşteri</p>
                        <p className="font-medium text-gray-900">
                          {result.customerName.charAt(0)}{'*'.repeat(Math.min(3, result.customerName.length - 1))}{' '}
                          {result.customerName.split(' ').slice(1).map((n: string) => n.charAt(0) + '***').join(' ')}
                        </p>
                      </div>
                    )}
                    {(result.deviceType || result.type) && (
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Cihaz Türü</p>
                        <p className="font-medium text-gray-900 capitalize">{result.deviceType || result.type}</p>
                      </div>
                    )}
                    {result.subject && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Konu</p>
                        <p className="font-medium text-gray-800">{result.subject}</p>
                      </div>
                    )}
                    {(result.issueDescription || result.description) && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Şikayet / Arıza
                        </p>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-theme border border-gray-100 leading-relaxed font-medium">
                          {result.issueDescription || result.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-gray-100"></div>
                    <div className="space-y-6 relative">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center shrink-0 z-10">
                          <FileText className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Kayıt Oluşturuldu</p>
                          <p className="text-sm text-gray-500 font-medium">{new Date(result.createdAt).toLocaleString('tr-TR')}</p>
                        </div>
                      </div>

                      {result.status !== 'pending' && result.status !== 'yeni' && (
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-white shadow-sm flex items-center justify-center shrink-0 z-10">
                            <Wrench className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Durum Güncellendi</p>
                            <p className="text-sm text-gray-500 font-medium">{new Date(result.updatedAt).toLocaleString('tr-TR')}</p>
                            <p className="text-sm text-gray-600 mt-1">Cihaz durumu "{getStatusInfo(result.status).label}" olarak güncellendi.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cost */}
                  {parseFloat(result.cost || result.estimatedCost || 0) > 0 && (
                    <div className="bg-gray-900 rounded-theme p-5 mt-6 flex flex-col md:flex-row justify-between items-start md:items-center text-white gap-3">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Servis Ücreti / Maliyet</p>
                        <p className="text-2xl font-bold text-primary">
                          {parseFloat(result.cost || result.estimatedCost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                    <Link
                      to="/randevu"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-secondary text-white font-bold py-3 px-5 rounded-theme transition-colors shadow-sm"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Yeni Servis Talebi
                    </Link>
                    <Link
                      to="/iletisim"
                      className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-5 rounded-theme transition-colors"
                    >
                      Bize Ulaşın <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 bg-white rounded-theme border border-gray-200 border-dashed shadow-sm">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Kayıt Bulunamadı</h3>
                <p className="text-gray-500 font-medium max-w-md mx-auto">Girdiğiniz numaraya ait bir servis kaydı bulanmıyor. Lütfen takip numarasını kontrol edip tekrar deneyiniz.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
