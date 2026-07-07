import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Clock, Tag, MousePointerClick } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { fetchServices, fetchServiceCategories } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import { mediaUrl } from '../../lib/media';

const DynamicIcon = ({ name, className }: { name?: string | null; className?: string }) => {
  if (!name) return <MousePointerClick className={className} />;
  const IconComponent = (LucideIcons as any)[name];
  return IconComponent ? <IconComponent className={className} /> : <MousePointerClick className={className} />;
};

export default function Services() {
  usePageTitle('Hizmetlerimiz');
  const { hash } = useLocation();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');

  useEffect(() => {
    Promise.all([fetchServices(), fetchServiceCategories()])
      .then(([svcRes, catRes]) => {
        setServices(svcRes);
        setCategories(catRes);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else if (!loading) {
      window.scrollTo(0, 0);
    }
  }, [hash, loading]);

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'all' || service.categoryId === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2 font-medium">
            <Link to="/" className="hover:text-primary transition-colors">Anasayfa</Link>
            <span>&gt;</span>
            <span className="text-gray-900">Çözümlerimiz</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Uçtan Uca Bilişim Çözümleri
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            İşletmenizin sürdürülebilir büyümesini desteklemek amacıyla; kurumsal ağ altyapısı, siber güvenlik, yazılım entegrasyonları ve profesyonel IT danışmanlığı alanlarında uçtan uca çözümler sunuyoruz.
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-theme shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Tümü
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === cat.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Hizmet ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="pb-20 pt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-theme shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="skeleton w-16 h-16 rounded-theme mr-5"></div>
                  <div className="skeleton h-7 w-1/2 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="skeleton h-4 w-full rounded"></div>
                  <div className="skeleton h-4 w-5/6 rounded"></div>
                  <div className="skeleton h-4 w-4/6 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {searchQuery ? `"${searchQuery}" için sonuç bulunamadı.` : 'Hizmet bulunamadı.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {filteredServices.map((service) => {
              const catDetails = service.categoryDetails || {};
              const imageUrl = mediaUrl(service.imageUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d', 800);
              const serviceTags = Array.isArray(catDetails.features) ? catDetails.features.slice(0, 3) : [];
              return (
                <div key={service.id} id={catDetails.slug || `cat-${service.categoryId}`} className="bg-white rounded-theme shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 group scroll-mt-24 flex flex-col justify-between overflow-hidden">
                  <div className="h-48 overflow-hidden relative">
                    <img src={imageUrl} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-md p-3 rounded-xl border border-white/30">
                       <DynamicIcon name={catDetails.icon} className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="mb-4 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-gray-800 border border-primary/20">{catDetails.name || 'Kategorisiz'}</div>
                      <h2 className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-4">{service.name}</h2>
                      <p className="text-gray-600 mb-6 leading-relaxed line-clamp-3">
                        {service.description}
                      </p>
                      {serviceTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {serviceTags.map((tag: string, index: number) => (
                            <span key={`${service.id}-${index}`} className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 font-medium">
                        {service.basePrice && (
                          <div className="flex items-center text-gray-800 bg-green-50 border border-green-100 px-3 py-1 rounded-full">
                            <Tag className="w-4 h-4 mr-1.5" />
                            {service.basePrice} ₺'den başlayan fiyatlarla
                          </div>
                        )}
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1.5" />
                          Hızlı Destek
                        </div>
                      </div>
                      <Link to={`/hizmetler/${service.id}`} className="inline-flex items-center text-primary font-bold hover:text-secondary transition-colors gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">
                        Detayları İncele <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call to action */}
      <div className="bg-green-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-6">İşletmenize Özel Teknolojik Çözümler Tasarlayalım</h2>
          <p className="text-green-100 mb-8 max-w-2xl mx-auto text-lg">
            Kurumsal ağ projeleri, özel yazılım entegrasyonları veya CCTV güvenlik sistemleri ihtiyaçlarınız için uzmanlarımızdan keşif ve profesyonel danışmanlık talep edin.
          </p>
          <div className="flex justify-center gap-4">
           <Link to="/iletisim" className="bg-white text-primary px-8 py-3 rounded-theme font-bold hover:bg-gray-100 transition-colors shadow-lg">
              İletişime Geçin
            </Link>
            <Link to="/randevu" className="bg-primary/80 text-white border border-primary/50 px-8 py-3 rounded-theme font-bold hover:bg-secondary transition-colors shadow-lg">
              Randevu Alın
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
