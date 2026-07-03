import { useEffect, useState } from 'react';
import { Tag, Calendar, ChevronRight, Percent, Clock, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchCampaigns } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';

export default function Campaigns() {
  usePageTitle('Kampanyalar');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchCampaigns()
      .then(res => {
        if (res.length === 0) {
          setCampaigns([
            { id: 'demo1', title: 'Kurumsal Tanışma Paketi: İlk Hizmette %15 Avantaj', description: 'İşletmenizin bilişim altyapısını güvenceye almak ve ekiplerimizle tanışmak için ilk kurumsal SLA anlaşması veya teknik servis hizmetinizde %15 ayrıcalıktan faydalanın.', imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80', discountRate: 15, endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString() },
            { id: 'demo2', title: 'Ücretsiz Kurumsal Ağ ve Siber Güvenlik Analizi', description: 'İşletmenizin yerel ağ (LAN) ve dış ağ güvenliğini, siber güvenlik standartlarına göre ücretsiz denetliyoruz. Tespit edilen zaafiyetleri ve iyileştirme adımlarını içeren raporunuzu sunalım.', imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80', discountRate: 100, endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString() }
          ]);
        } else {
          setCampaigns(res);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const isExpired = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate).getTime() < now.getTime();
  };

  const getCountdown = (endDate: string | null) => {
    if (!endDate) return 'Süresiz';
    const diff = new Date(endDate).getTime() - now.getTime();
    if (diff <= 0) return 'Süresi Doldu';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}g ${hours}s ${minutes}d`;
    return `${hours}s ${minutes}d ${seconds}sn`;
  };

  const activeCampaigns = campaigns.filter(c => !isExpired(c.endDate));
  const expiredCampaigns = campaigns.filter(c => isExpired(c.endDate));

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2 font-medium">
            <Link to="/" className="hover:text-primary transition-colors">Anasayfa</Link>
            <span>&gt;</span>
            <span className="text-gray-900">Kampanyalar</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Kampanyalar ve Özel Fırsatlar
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            Bilişim teknolojileri ve SLA destek anlaşmalarında sunduğumuz dönemsel iş ortaklığı avantajlarını inceleyin.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-theme border border-gray-200 overflow-hidden shadow-sm">
                <div className="skeleton h-48 w-full"></div>
                <div className="p-6 space-y-3">
                  <div className="skeleton h-5 w-1/3 rounded"></div>
                  <div className="skeleton h-6 w-2/3 rounded"></div>
                  <div className="skeleton h-4 w-full rounded"></div>
                  <div className="skeleton h-4 w-5/6 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-theme border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Tag className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Güncel Fırsat Bulunmamaktadır</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Şu an için yayınlanmış aktif bir kurumsal kampanya bulunmamaktadır. İşletmenize özel teklifler ve BT bütçe optimizasyonu için doğrudan iletişime geçebilirsiniz.
            </p>
            <Link to="/iletisim" className="inline-flex items-center bg-primary text-white font-bold px-6 py-3 rounded-theme hover:bg-secondary transition-colors">
              Özel Teklif İsteyin
            </Link>
          </div>
        ) : (
          <>
            {/* Active Campaigns */}
            {activeCampaigns.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <h2 className="text-2xl font-bold text-gray-900">Aktif Kampanyalar</h2>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">{activeCampaigns.length} Kampanya</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {activeCampaigns.map((camp) => (
                    <div key={camp.id} className="bg-white rounded-theme shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all group flex flex-col">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={camp.imageUrl || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80'}
                          alt={camp.title}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                        {camp.discountRate && (
                          <div className="absolute top-4 right-4 bg-primary text-white font-bold px-3 py-1.5 rounded-full text-sm shadow-lg flex items-center gap-1">
                            <Tag className="w-3 h-3" /> %{camp.discountRate} İndirim
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex flex-col flex-1 justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors">{camp.title}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed mb-4">{camp.description}</p>
                        </div>
                        <div>
                          <div className="flex flex-col gap-2 pb-4 border-b border-gray-100 mb-4">
                            <div className="flex items-center text-xs text-gray-500 font-medium">
                              <Calendar className="w-4 h-4 mr-1.5 text-primary" />
                              Bitiş: {camp.endDate ? new Date(camp.endDate).toLocaleDateString('tr-TR') : 'Süresiz'}
                            </div>
                            <div className="flex items-center text-xs text-orange-600 font-bold bg-orange-50 px-2.5 py-1.5 rounded-md self-start">
                              <Clock className="w-4 h-4 mr-1.5" />
                              {getCountdown(camp.endDate)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedCampaign(camp)}
                              className="flex items-center justify-center flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-theme transition-colors text-sm"
                            >
                              <Info className="w-4 h-4 mr-1.5" /> Detaylar
                            </button>
                            <Link
                              to="/iletisim"
                              className="flex items-center justify-center flex-1 py-2.5 bg-primary hover:bg-secondary text-white font-semibold rounded-theme transition-colors text-sm"
                            >
                              Başvur <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Campaigns */}
            {expiredCampaigns.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-500 mb-6 flex items-center gap-3">
                  <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
                  Süresi Dolan Kampanyalar
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {expiredCampaigns.map((camp) => (
                    <div key={camp.id} className="bg-white rounded-theme border border-gray-200 overflow-hidden opacity-60 flex flex-col">
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={camp.imageUrl || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80'}
                          alt={camp.title}
                          className="w-full h-full object-cover grayscale"
                        />
                        <div className="absolute top-4 right-4 bg-gray-600 text-white font-bold px-3 py-1 rounded-full text-xs">
                          Süresi Doldu
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg font-bold text-gray-700 mb-2">{camp.title}</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Bitti: {new Date(camp.endDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Detail Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-theme shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedCampaign(null)} className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100 p-2 rounded-full z-10 transition-colors bg-white/50 backdrop-blur-sm">
              <X className="w-5 h-5" />
            </button>
            <div className="h-64 relative">
              <img src={selectedCampaign.imageUrl || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80'} alt={selectedCampaign.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
              {selectedCampaign.discountRate && (
                <div className="absolute bottom-6 left-6 bg-primary text-white font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-lg">
                  <Tag className="w-5 h-5" /> %{selectedCampaign.discountRate} İndirim
                </div>
              )}
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedCampaign.title}</h2>
              <div className="flex gap-4 mb-6">
                <div className="flex items-center text-sm text-gray-500 font-medium">
                  <Calendar className="w-4 h-4 mr-1.5 text-primary" />
                  Bitiş: {selectedCampaign.endDate ? new Date(selectedCampaign.endDate).toLocaleDateString('tr-TR') : 'Süresiz'}
                </div>
                {!isExpired(selectedCampaign.endDate) && (
                  <div className="flex items-center text-sm text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-md">
                    <Clock className="w-4 h-4 mr-1.5" />
                    Kalan: {getCountdown(selectedCampaign.endDate)}
                  </div>
                )}
              </div>
              <div className="prose prose-gray max-w-none text-gray-600 mb-8 leading-relaxed">
                {selectedCampaign.description}
                <br /><br />
                <strong>Bu Kampanyadan Nasıl Faydalanabilirsiniz?</strong><br />
                <ul>
                  <li>Hemen randevu talebi oluşturun veya bizimle doğrudan iletişime geçin.</li>
                  <li>Müşteri temsilcilerimiz firmanız için keşif planlasın.</li>
                  <li>Kampanya dahilinde belirtilen indirimi anında uygulayalım.</li>
                </ul>
              </div>
              <div className="flex gap-4 border-t border-gray-100 pt-6">
                <button onClick={() => setSelectedCampaign(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-theme transition-colors">
                  Kapat
                </button>
                <Link to="/iletisim" className="flex-1 flex items-center justify-center py-3 bg-primary hover:bg-secondary text-white font-bold rounded-theme transition-colors shadow-lg">
                  Hemen Başvur <ChevronRight className="w-5 h-5 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
