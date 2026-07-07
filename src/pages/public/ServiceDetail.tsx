import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchService, fetchServices } from '../../lib/api';
import { MousePointerClick, ArrowLeft, CheckCircle2, ChevronRight, Activity, Zap, ShieldCheck } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { usePageTitle } from '../../lib/usePageTitle';

const DynamicIcon = ({ name, className }: { name?: string | null; className?: string }) => {
  if (!name) return <MousePointerClick className={className} />;
  const IconComponent = (LucideIcons as any)[name];
  return IconComponent ? <IconComponent className={className} /> : <MousePointerClick className={className} />;
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
          return fetchServices();
        })
        .then(all => {
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

  const catDetails = service.categoryDetails || {};
  let featuresList = Array.isArray(catDetails.features) ? catDetails.features : [];
  if (featuresList.length === 0) {
    featuresList = ['Profesyonel ve Şeffaf Yaklaşım', 'Tamamen Müşteri Odaklı Sistemler', 'Uluslararası Standartlarda Kaliteli Altyapı', 'İşlem Sonrası Garantili Servis Desteği'];
  }

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
              {catDetails.name || 'Hizmet Detayı'}
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
                .filter(s => s.id !== service.id && s.isActive !== false)
                .filter(s => s.categoryId === service.categoryId)
                .slice(0, 3);
              const fallback = related.length === 0
                ? relatedServices.filter(s => s.id !== service.id && s.isActive !== false).slice(0, 3)
                : related;
              if (fallback.length === 0) return null;
              return (
                <div className="border-t border-gray-100 pt-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">İlgili Hizmetler</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {fallback.map((s: any) => {
                      return (
                        <Link
                          key={s.id}
                          to={`/hizmetler/${s.id}`}
                          className="group bg-gray-50 hover:bg-white border border-gray-100 hover:border-primary/20 hover:shadow-md rounded-theme p-5 transition-all"
                        >
                          <div className="w-10 h-10 bg-primary/10 rounded-theme flex items-center justify-center mb-3 group-hover:bg-primary transition-colors">
                            <DynamicIcon name={s.categoryDetails?.icon} className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
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
                   <DynamicIcon name={catDetails.icon} className="w-32 h-32 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-8 border-b border-gray-700 pb-4 relative z-10">Öne Çıkan Özellikler</h3>
                <ul className="space-y-5 relative z-10">
                   {featuresList.map((item: string, i: number) => (
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
