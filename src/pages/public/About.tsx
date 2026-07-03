import { useState, useEffect } from 'react';
import { Shield, Target, Users, Zap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { fetchPage } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import { useSettings } from '../../context/SettingsContext';

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
                  src={settings?.aboutImage || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800"} 
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
              ) : (
                <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 mb-10 leading-relaxed text-justify">
                  <p><strong>Kerim Bilgisayar</strong>, 15 yılı aşkın köklü sektörel tecrübesiyle, bireysel ve kurumsal paydaşlarına uçtan uca, yenilikçi ve yüksek standartlarda bilişim teknolojileri çözümleri sunmaktadır. Faaliyete başladığımız ilk günden itibaren, dinamik olarak değişen teknoloji dünyasında müşterilerimizin dijital olgunluk seviyelerini artırmayı ve dijital dönüşüm yolculuklarına stratejik rehberlik yapmayı misyon edindik.</p>
                  
                  <h3 className="text-2xl font-bold mt-8 mb-4 text-gray-900">Misyonumuz</h3>
                  <p className="whitespace-pre-line">{settings?.aboutMission || 'Müşterilerimizin teknolojik ekosistemlerini en güncel standartlarla donatmak; donanım, yazılım, siber güvenlik ve ağ mimarisi alanlarında proaktif ve katma değerli çözümler sunarak iş sürekliliklerini en üst düzeye taşımaktır.'}</p>

                  <h3 className="text-2xl font-bold mt-8 mb-4 text-gray-900">Vizyonumuz</h3>
                  <p className="whitespace-pre-line">{settings?.aboutVision || 'Türkiye bilişim teknolojileri sektöründe, yenilikçi ve sürdürülebilir mühendislik çözümleri ile referans kabul edilen, güvenilirliği ve hizmet kalitesiyle ilk sırada tercih edilen öncü teknoloji partneri olmak.'}</p>

                  <h3 className="text-2xl font-bold mt-8 mb-4 text-gray-900">Neden Biz?</h3>
                  <p>Sektörün küresel liderleri olan Microsoft, Google ve Hikvision gibi markaların resmi iş ortağı olarak, en yeni teknolojik gelişmeleri ve lisanslama çözümlerini müşterilerimize ulaştırıyoruz. İleri düzey kurumsal sunucu entegrasyonlarından, yüksek güvenlikli CCTV sistemlerine, endüstriyel ağ (Network) altyapısı tasarımından özel yazılım projelerine ve yüksek hassasiyetli veri kurtarma süreçlerine kadar geniş bir yelpazede profesyonel hizmet sunmaktayız.</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-theme p-8 mb-10 border border-gray-100">
                <h3 className="font-bold text-gray-900 text-lg mb-6">Neden Biz?</h3>
                <div className="space-y-4">
                  {[
                    "Kaliteden ve orijinallikten ödün vermeyen hizmet anlayışı",
                    "Müşteri memnuniyetini merkeze alan proaktif yaklaşımlar",
                    "Dünya standartlarında güvenlik ve KVKK uyumlu altyapılar",
                    "Sürekli kendini geliştiren, sertifikalı teknik uzman kadrosu"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start">
                      <CheckCircle2 className="w-6 h-6 text-primary mr-4 shrink-0 mt-0.5" />
                      <span className="text-gray-700 font-medium leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link to="/iletisim" className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-theme text-white bg-primary hover:bg-secondary transition-all shadow-lg hover:shadow-primary/30 w-full sm:w-auto">
                Projelerinizi Birlikte Planlayalım
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gray-50 py-24 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-6">Değerlerimiz ve Yaklaşımımız</h2>
            <p className="text-lg text-gray-600 leading-relaxed">Her projeye ve her kuruma yaklaşımımızı belirleyen, kalitemizin temelini oluşturan prensiplerimiz.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: "Şeffaflık", desc: "Tüm süreçlerimizde şeffaf iletişim kurar, veri güvenliğinize ve kurumsal gizliliğinize en yüksek düzeyde hassasiyet gösteririz." },
              { icon: Target, title: "Stratejik Odak", desc: "İşletmenizin iş süreçlerini analiz ederek en doğru, sürdürülebilir ve maliyet-etkin teknolojik yol haritasını çıkarırız." },
              { icon: Zap, title: "Operasyonel Çeviklik", desc: "Zamanın değerini biliyoruz; acil destek, entegrasyon ve altyapı taleplerinize SLA standartlarında en hızlı yanıtı üretiyoruz." },
              { icon: Users, title: "Stratejik Ortaklık", desc: "Sadece tek seferlik hizmet sunumunu değil, satış sonrası proaktif kurumsal desteği ve uzun soluklu iş ortaklıklarını merkeze alırız." }
            ].map((val, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
                <div className="w-16 h-16 bg-primary/10 rounded-theme flex items-center justify-center mb-8 border border-primary/20 group-hover:bg-primary transition-colors">
                  <val.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{val.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
