import { useState, useEffect } from 'react';
import { Shield, Target, Users, Zap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { fetchPage } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import { useSettings } from '../../context/SettingsContext';
import { mediaUrl } from '../../lib/media';

export default function About() {
  usePageTitle('Hakkımızda');
  const { settings } = useSettings();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPage('hakkimizda')
      .then(res => setPage(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2 font-medium">
            <Link to="/" className="hover:text-primary transition-colors">Anasayfa</Link>
            <span>&gt;</span>
            <span className="text-gray-900">{page?.title || 'Hakkımızda'}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            {page?.title || 'Hakkımızda'}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            {page?.metaDescription || 'Teknolojideki stratejik iş ortağınız olarak, uzun yıllara dayanan sektörel tecrübemizle bireysel ve kurumsal IT altyapı ihtiyaçlarınıza yenilikçi ve uçtan uca çözümler sunuyoruz.'}
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="lg:w-1/2">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 sticky top-24">
                <img 
                  src={mediaUrl(settings?.aboutImage) || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800"} 
                  alt={page?.title || "Hakkımızda"} 
                  className="w-full object-cover aspect-video sm:aspect-square"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/60 to-transparent"></div>
                <div className="absolute bottom-8 left-8">
                  <div className="bg-white/95 backdrop-blur py-5 px-8 rounded-theme shadow-xl border border-white/40">
                    <div className="text-4xl font-black text-green-600 mb-1">15+</div>
                    <div className="text-gray-800 font-bold uppercase tracking-widest text-sm">Yıllık Deneyim</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/2">
              <div className="flex items-center gap-3 mb-6">
                 <span className="w-12 h-1 bg-primary rounded-full"></span>
                 <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Köklerimiz ve Vizyonumuz</h2>
              </div>
              
              {loading ? (
                <div className="h-40 flex items-center justify-center">Yükleniyor...</div>
              ) : page?.content ? (
                <div className="prose prose-lg prose-green max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 mb-10 text-justify leading-relaxed">
                  <ReactMarkdown>{page.content}</ReactMarkdown>
                </div>
              ) : null}

              {page?.content && (
                <Link to="/iletisim" className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-theme text-white bg-primary hover:bg-secondary transition-all shadow-lg hover:shadow-primary/30 w-full sm:w-auto">
                  Projelerinizi Birlikte Planlayalım
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
            <div className="bg-gray-50 border border-gray-100 rounded-theme p-8 shadow-sm">
              <div className="w-12 h-12 bg-white rounded-theme border border-gray-200 shadow-sm flex items-center justify-center mb-5">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Misyonumuz</h2>
              <p className="text-gray-600 leading-relaxed mb-0">
                Bireysel ve kurumsal müşterilerimizin teknoloji ihtiyaçlarını doğru analiz ederek güvenilir, sürdürülebilir ve ölçülebilir bilişim çözümleri sunmak; servis, bakım, güvenlik ve altyapı süreçlerinde kesintisiz destek sağlamaktır.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-theme p-8 shadow-sm">
              <div className="w-12 h-12 bg-white rounded-theme border border-gray-200 shadow-sm flex items-center justify-center mb-5">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Vizyonumuz</h2>
              <p className="text-gray-600 leading-relaxed mb-0">
                Teknolojiyi sadece bir destek aracı değil, işletmelerin büyümesini hızlandıran stratejik bir güç haline getirmek; İstanbul ve çevresinde güvenilir, yenilikçi ve çözüm odaklı bilişim iş ortağı olarak ilk akla gelen marka olmaktır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
