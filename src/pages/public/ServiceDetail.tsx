import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchService, fetchServices } from '../../lib/api';
import { Server, Code, Network, Video, MonitorSmartphone, Database, MousePointerClick, ArrowLeft, CheckCircle2, ChevronRight, Activity, Zap, ShieldCheck } from 'lucide-react';
import { usePageTitle } from '../../lib/usePageTitle';

const getIconForCategory = (cat: string | null) => {
  switch (cat) {
    case 'ag_sistemleri': return Server;
    case 'yazilim': return Code;
    case 'guvenlik': return Video;
    case 'bakim': return Network;
    case 'donanim': return MonitorSmartphone;
    case 'verikurtarma': return Database;
    default: return MousePointerClick;
  }
};

const getImageForCategory = (cat: string | null) => {
  switch (cat) {
    case 'ag_sistemleri': return "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1920";
    case 'yazilim': return "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1920";
    case 'guvenlik': return "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=1920";
    case 'bakim': return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1920";
    case 'donanim': return "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&q=80&w=1920";
    case 'verikurtarma': return "https://images.unsplash.com/photo-1614064641913-6b7140414c71?auto=format&fit=crop&q=80&w=1920";
    default: return "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1920";
  }
};

const getCategoryFeatures = (cat: string | null) => {
  switch (cat) {
    case 'ag_sistemleri': 
       return ['Yüksek Performanslı Altyapı ve Kablolama', 'Kesintisiz Yedekli Bağlantı (Redundancy)', 'Kurumsal Ağ Güvenliği (Firewall) Optimizasyonu', '7/24 Kesintisiz Monitoring (İzleme)'];
    case 'yazilim': 
       return ['Kuruma Özel B2B/B2C İş Çözümleri', 'Ölçeklenebilir ve Modüler Mimari', 'Güncel Teknolojiler (React, Node.js)', 'Tüm Cihazlarla %100 Mobil & Web Uyumlu'];
    case 'guvenlik': 
       return ['Yüksek Çözünürlüklü (HD) Gece Görüş Sistemleri', 'Mobil Cihazlardan Uzaktan İzleme Desteği', 'Akıllı Hareket ve Yüz Algılama (AI) Sistemleri', 'KVKK Uyumlu Güvenli Kayıt Yönetimi'];
    case 'bakim': 
       return ['Aylık Düzenli Fiziksel ve Yazılımsal Bakım', 'Yerinde Anında Hızlı Müdahale', 'Donanım Temizliği ve Periyodik Kontrol', 'Güvenli Bulut Yedekleme ve Raporlama'];
    case 'donanim': 
       return ['Garantili Orijinal Yedek Parça Değişimi', 'Yetkili Servis Kalitesinde Onarım', 'Hızlı Onarım ve Teslimat Süreci', 'Kurulum Sonrası Kapsamlı Performans Testleri'];
    case 'verikurtarma': 
       return ['Laboratuvar Ortamında %98 Başarı Oranı', 'ISO Standartlarında Temiz Oda Teknolojisi', 'Hukuki Gizlilik Sözleşmesi (NDA) Güvencesi', 'İşlem Öncesi Ücretsiz Analiz Raporu'];
    default: 
       return ['Profesyonel ve Şeffaf Yaklaşım', 'Tamamen Müşteri Odaklı Sistemler', 'Uluslararası Standartlarda Kaliteli Altyapı', 'İşlem Sonrası Garantili Servis Desteği'];
  }
};

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState<any>(null);
  const [relatedServices, setRelatedServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  usePageTitle(service?.name || '');

  useEffect(() => {
    if (id) {
       window.scrollTo(0,0);
      fetchService(id)
        .then(res => {
          setService(res);
          // Fetch related services
          return fetchServices();
        })
        .then(all => {
          // will be filtered after service is set
          if (Array.isArray(all)) {
            setRelatedServices(all);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className="min-h-[70vh] flex flex-col justify-center items-center">
       <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
       <p className="mt-4 text-gray-500 font-medium">Hizmet detayları yükleniyor...</p>
    </div>;
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50">
         <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
             <Activity className="w-10 h-10 text-gray-500" />
         </div>
         <h1 className="text-3xl font-extrabold mb-3 text-gray-900">Hizmet Bulunamadı</h1>
         <p className="text-gray-500 mb-8 max-w-md text-center">Aradığınız kurumsal çözüme ulaşılamadı. Hizmet yayından kaldırılmış veya bağlantı hatalı olabilir.</p>
         <Link to="/hizmetler" className="bg-primary text-white hover:bg-secondary px-6 py-3 rounded-theme font-semibold transition-colors shadow-sm">
           Tüm Hizmetlere Dön
         </Link>
      </div>
    );
  }

  const Icon = getIconForCategory(service.category);
  const featuresList = getCategoryFeatures(service.category);

  return (
    <div className="bg-white min-h-screen">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2 font-medium">
            <Link to="/" className="hover:text-primary transition-colors">Anasayfa</Link>
            <span>&gt;</span>
            <Link to="/hizmetler" className="hover:text-primary transition-colors">Çözümlerimiz</Link>
            <span>&gt;</span>
            <span className="text-gray-900">{service.name}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            {service.name}
          </h1>
          <div className="flex items-center gap-2 mt-4">
            <span className="bg-primary text-white tracking-widest text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
              {service.category?.replaceAll('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col lg:flex-row gap-12">
        {/* Main Content Area */}
        <div className="lg:w-2/3">
            <div className="prose prose-lg prose-gray max-w-none prose-headings:text-gray-900 prose-p:leading-relaxed mb-16">
               <h2 className="text-3xl font-bold tracking-tight mb-8">Kurumsal İhtiyaçlarınız İçin Profesyonel Çözüm</h2>
               {typeof service.description === 'string' ? (
                 service.description.split('\n').map((para: string, i: number) => (
                    para.trim() ? <p key={i} className="mb-6">{para}</p> : null
                 ))
               ) : (
                 <p>{service.description}</p>
               )}
            </div>

            {/* Featured Worksteps or Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
               <div className="bg-gray-50 border border-gray-100 p-8 rounded-theme">
                  <div className="w-12 h-12 bg-white rounded-theme shadow-sm flex items-center justify-center mb-6 border border-gray-200">
                     <Zap className="w-6 h-6 text-yellow-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Hızlı ve Kesintisiz</h3>
                  <p className="text-gray-600">İş süreçlerinizin aksamaması için hedef odaklı ve zamanında teslimat prensibi ile çalışıyoruz.</p>
               </div>
               <div className="bg-gray-50 border border-gray-100 p-8 rounded-theme">
                  <div className="w-12 h-12 bg-white rounded-theme shadow-sm flex items-center justify-center mb-6 border border-gray-200">
                     <ShieldCheck className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Güvenlik Odaklı</h3>
                  <p className="text-gray-600">Altyapınızda kullanılan tüml donanım ve yazılımlar KVKK standartlarına ve global güvenlik mimarisine uygun seçilir.</p>
               </div>
            </div>

            {/* Related Services */}
            {(() => {
              const related = relatedServices
                .filter(s => s.id !== service.id && s.status !== 'pasif')
                .filter(s => s.category === service.category)
                .slice(0, 3);
              const fallback = related.length === 0
                ? relatedServices.filter(s => s.id !== service.id && s.status !== 'pasif').slice(0, 3)
                : related;
              if (fallback.length === 0) return null;
              return (
                <div className="border-t border-gray-100 pt-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">İlgili Hizmetler</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {fallback.map((s: any) => {
                      const RelIcon = getIconForCategory(s.category);
                      return (
                        <Link
                          key={s.id}
                          to={`/hizmetler/${s.id}`}
                          className="group bg-gray-50 hover:bg-white border border-gray-100 hover:border-primary/20 hover:shadow-md rounded-theme p-5 transition-all"
                        >
                          <div className="w-10 h-10 bg-primary/10 rounded-theme flex items-center justify-center mb-3 group-hover:bg-primary transition-colors">
                            <RelIcon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                          </div>
                          <p className="font-semibold text-gray-900 text-sm line-clamp-2">{s.name}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.shortDescription || s.excerpt}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
        </div>

        {/* Sidebar */}
        <aside className="lg:w-1/3">
           <div className="sticky top-24 space-y-8">
              {/* Features List */}
              <div className="bg-gray-900 rounded-theme p-8 border border-gray-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Icon className="w-32 h-32 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-8 border-b border-gray-700 pb-4 relative z-10">Öne Çıkan Özellikler</h3>
                <ul className="space-y-5 relative z-10">
                   {featuresList.map((item, i) => (
                      <li key={i} className="flex items-start">
                         <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 shrink-0 mt-0.5" />
                         <span className="text-gray-300 font-medium">{item}</span>
                      </li>
                   ))}
                </ul>
              </div>

              {/* Call to Action Box */}
              <div className="bg-green-50 rounded-theme p-8 border border-green-100">
                 <h3 className="text-xl font-bold text-gray-900 mb-4">Bir Projeniz mi Var?</h3>
                 <p className="text-gray-600 text-sm leading-relaxed mb-8">
                   Uzman danışmanlarımız ile hemen iletişime geçin, firmanız için en uygun kurumsal teknoloji altyapısını birlikte planlayalım.
                 </p>
                 <div className="space-y-4">
                    <Link to="/randevu" className="w-full flex items-center justify-center bg-primary hover:bg-secondary text-white font-bold py-3.5 px-6 rounded-theme shadow-md transition-all group">
                      Talep Oluştur <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link to="/iletisim" className="w-full flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-bold py-3.5 px-6 rounded-theme transition-all">
                      İletişime Geç
                    </Link>
                 </div>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}

