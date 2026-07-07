import {
  ShieldCheck,
  Server,
  Cloud,
  Headset,
  ArrowRight,
  CheckCircle2,
  Activity,
  Award,
  Users,
  ChevronRight,
  TrendingUp,
  Cpu,
  Database,
  Lock,
  ArrowUpRight,
  PlayCircle,
  Clock,
  Sparkles,
  Network,
  Zap,
  Globe2,
  GraduationCap,
  HeartPulse,
  Monitor,
  Truck,
  Settings,
  Building2,
  Star,
  MonitorSmartphone,
  HardDrive,
  MousePointerClick,
  Code,
  Video,
  ArrowLeft,
  Gamepad2,
  Shield,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { mediaUrl } from '../../lib/media';
import { useSettings } from '../../context/SettingsContext';
import { useEffect, useState } from 'react';
import { fetchServices, fetchCampaigns } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import SEO from '../../components/SEO';

const getIconForCategory = (cat: string | null) => {
  switch (cat) {
    case 'ag_sistemleri': return Server;
    case 'yazilim': return Code;
    case 'guvenlik': return Video;
    case 'bakim': return Network;
    case 'donanim': return MonitorSmartphone;
    case 'verikurtarma': return HardDrive;
    default: return MousePointerClick;
  }
};

const formatHtml = (htmlStr: string) => {
  if (!htmlStr) return '';
  return htmlStr.replace(/className=/g, 'class=');
};

// Simple intersection observer hook for scroll animations
function useInView(threshold = 0.15) {
  const [inView, setInView] = useState(false);
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!node) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(node);
    return () => obs.disconnect();
  }, [node, threshold]);

  return { ref: setNode, inView };
}

export default function Home() {
  usePageTitle('');
  const { settings } = useSettings();
  const [services, setServices] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  // Slider state
  const [activeSlide, setActiveSlide] = useState(0);

  const featuresSection = useInView();
  const servicesSection = useInView();
  const campaignsSection = useInView();
  const ctaSection = useInView();
  const reviewsSection = useInView();

  useEffect(() => {
    fetchServices().then(res => setServices(res.slice(0, 6))).catch(console.error);
    fetchCampaigns().then(res => setCampaigns(res)).catch(console.error);
    
    // Try fetching real testimonials from API
    fetch('/api/public/testimonials')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data) && data.length > 0) setTestimonials(data.slice(0, 3)); })
      .catch(() => {/* keep static */});
  }, []);

  const getDisplaySlides = () => {
    if (settings?.homeSlidesJson) {
      try {
        const parsed = JSON.parse(settings.homeSlidesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse homeSlidesJson:', e);
      }
    }
    return [];
  };

  const slides = getDisplaySlides();

  // Autoplay slider
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prevSlide = () => setActiveSlide(prev => (prev - 1 + slides.length) % slides.length);
  const nextSlide = () => setActiveSlide(prev => (prev + 1) % slides.length);

  // Compute dynamic features based on settings
  const dynamicFeatures = [
    { icon: Zap, title: settings?.homeFeature1Title, desc: settings?.homeFeature1Desc },
    { icon: ShieldCheck, title: settings?.homeFeature2Title, desc: settings?.homeFeature2Desc },
    { icon: HardDrive, title: settings?.homeFeature3Title, desc: settings?.homeFeature3Desc }
  ].filter(f => f.title); // Sadece başlığı olanları göster

  const getDisplayPartners = () => {
    if (settings?.homePartnersJson) {
      try {
        const parsed = JSON.parse(settings.homePartnersJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse homePartnersJson:', e);
      }
    }
    return [];
  };

  const getDisplayTestimonials = () => {
    if (testimonials && testimonials.length > 0) {
      return testimonials;
    }
    const list = [];
    for (let i = 1; i <= 3; i++) {
      const name = settings?.[`homeTestimonial${i}Name` as keyof typeof settings];
      const role = settings?.[`homeTestimonial${i}Role` as keyof typeof settings];
      const comment = settings?.[`homeTestimonial${i}Comment` as keyof typeof settings];
      if (name && comment) {
        list.push({ name, role, comment, rating: 5 });
      }
    }
    return list;
  };

  const getSectionOrder = () => {
    if (settings?.homeSectionOrder) {
      try {
        const parsed = JSON.parse(settings.homeSectionOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes('references')) {
            const index = parsed.indexOf('partners');
            if (index !== -1) parsed.splice(index + 1, 0, 'references');
            else parsed.push('references');
          }
          return parsed;
        }
      } catch (e) {
        return ['hero', 'partners', 'references', 'features', 'campaigns', 'services', 'split', 'reviews', 'cta'];
      }
    }
    return ['hero', 'partners', 'references', 'features', 'campaigns', 'services', 'split', 'reviews', 'cta'];
  };

  // Section Renderers
  const renderHero = () => {
    const { loading } = useSettings();

    if (loading) {
      return (
        <section className="h-[540px] sm:h-[600px] bg-gray-100 animate-pulse border-b border-gray-200" />
      );
    }

    // ---- SLIDER: logo.com.tr exact style ----
    if (slides.length > 0) {
      return (
        <div className="max-w-[1536px] mx-auto">
          <section className="bg-[#f5f5f5] rounded-b-3xl mb-10">
            <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 pt-[88px]">
            {/* 3-part grid: text + image + CTA */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_280px] gap-6 lg:gap-8 pb-10 pt-8">

              {/* Slider area (text + image) */}
              <div className="lg:col-span-2 relative min-h-[430px]">
                {/* All slides stacked with fade */}
                {slides.map((slide: any, idx: number) => (
                  <div
                    key={idx}
                    className={`${idx === 0 ? 'relative' : 'absolute inset-0'} transition-opacity duration-1000 ease-in-out ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-0 min-h-[430px]">
                      {/* Text */}
                      <div className="flex flex-col justify-between pt-2 pb-8 lg:pb-24 pr-0 lg:pr-6 h-full order-last lg:order-first">
                        <div>
                          <h1
                            className="text-3xl sm:text-4xl lg:text-[2rem] font-extrabold text-gray-900 leading-snug mb-4 font-display"
                            dangerouslySetInnerHTML={{ __html: formatHtml(slide.title) }}
                          />
                          <p
                            className="text-base text-gray-500 mb-8 leading-relaxed max-w-sm"
                            dangerouslySetInnerHTML={{ __html: formatHtml(slide.subtitle) }}
                          />
                        </div>
                        {slide.btnText && (
                          <div className="mt-auto">
                            <Link
                              to={slide.btnUrl || '/randevu'}
                              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#5da350] text-white font-semibold text-base hover:bg-green-700 transition-all w-fit"
                            >
                              {slide.btnText} <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        )}
                      </div>
                      {/* Image — rounded-3xl */}
                      <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 lg:h-auto lg:min-h-[430px] w-full mb-6 lg:mb-0 order-first lg:order-last">
                        <img
                          src={mediaUrl(slide.image) || "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=900"}
                          alt={slide.title?.replace(/<[^>]+>/g, '') || 'Slider'}
                          className="absolute inset-0 w-full h-full object-cover object-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Slide counter — absolute bottom-left inside slider */}
                {slides.length > 1 && (
                  <div className="absolute bottom-0 left-0 z-20 flex items-center gap-4 pb-4">
                    <button
                      onClick={prevSlide}
                      className="w-14 h-14 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all relative"
                      aria-label="Önceki"
                    >
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 56 56"><circle cx="28" cy="28" r="27" fill="none" stroke="#e0e0e0" strokeWidth="2" /></svg>
                      <ArrowLeft className="w-4 h-4 relative z-10" />
                    </button>
                    <span className="text-sm font-bold text-gray-800 tabular-nums mx-1">
                      {String(activeSlide + 1).padStart(2, '0')}
                      <span className="text-gray-400 font-normal"> / {String(slides.length).padStart(2, '0')}</span>
                    </span>
                    <button
                      onClick={nextSlide}
                      className="w-14 h-14 rounded-full flex items-center justify-center text-gray-800 hover:text-gray-900 transition-all relative"
                      aria-label="Sonraki"
                    >
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="27" fill="none" stroke="#e0e0e0" strokeWidth="2" />
                        <circle key={activeSlide} cx="28" cy="28" r="27" fill="none" stroke="#222" strokeWidth="2" strokeDasharray="169.6" className="animate-progress-loader" />
                      </svg>
                      <ArrowRight className="w-4 h-4 relative z-10" />
                    </button>
                  </div>
                )}
              </div>

              {/* CTA card (1 col) — exact logo.com.tr style */}
              <aside className="hidden lg:block h-[280px] md:h-full px-4 2xl:px-0" aria-label="İletişim bilgileri">
                <div className="relative h-full flex flex-col justify-between w-full overflow-hidden rounded-3xl bg-[#63b956] p-8 text-white" aria-label="İletişim formu">
                  <div className="hidden lg:flex flex-1 justify-center">
                    <div className="flex items-center h-[120px]">
                      <div className="img-container rounded-tl-full rounded-bl-full overflow-hidden">
                        <img alt="Contact desktop" loading="lazy" width="87" height="132" decoding="async" className="h-[132px] max-w-[87px] object-cover text-transparent" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256" />
                      </div>
                      <div className="hidden xl:flex flex-col">
                        <svg xmlns="http://www.w3.org/2000/svg" width="67" height="78" viewBox="0 0 67 78" fill="none"><path d="M33.3041 77.9678C15.0863 77.9678 0.317871 63.1993 0.317871 44.9816L0.317871 0.000335693H66.2903V44.9816C66.2903 63.1993 51.5219 77.9678 33.3041 77.9678Z" fill="#3d8232"></path></svg>
                        <svg xmlns="http://www.w3.org/2000/svg" width="67" height="56" viewBox="0 0 67 56" fill="none"><path d="M66.2905 55.6948L33.3043 0.967678L0.318077 55.6948L66.2905 55.6948Z" fill="#2c5c24"></path></svg>
                      </div>
                      <div>
                        <div className="relative">
                          <svg xmlns="http://www.w3.org/2000/svg" width="98" height="133" viewBox="0 0 98 133" fill="none"><path d="M49.2707 132.695C22.358 132.695 0.541016 110.878 0.541016 83.9652L0.541016 0.000244141H44.3578C73.9837 0.000244141 98.0003 24.0168 98.0003 53.6427V83.9652C98.0003 110.878 76.1833 132.695 49.2707 132.695Z" fill="#1a3a1e"></path></svg>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 31 31" fill="none"><path d="M29.1158 26.5427C28.8671 27.0725 28.5406 27.5622 28.1472 27.9956C27.5057 28.7254 26.707 29.3 25.8112 29.6764C24.9318 30.0395 23.9887 30.2235 23.0373 30.2176C21.4352 30.188 19.8556 29.8343 18.3938 29.1778C16.6591 28.4259 15.0153 27.4797 13.4938 26.3575C11.8388 25.1469 10.2771 23.8137 8.82177 22.3692C7.38162 20.9191 6.05337 19.3621 4.84843 17.7114C3.74152 16.2002 2.80521 14.5712 2.05659 12.8542C1.40466 11.3857 1.05437 9.80126 1.02652 8.19485C1.0204 7.25415 1.19447 6.32098 1.53931 5.44575C1.90171 4.54092 2.46131 3.72828 3.17737 3.06699C3.55651 2.65693 4.0141 2.32714 4.52301 2.09715C5.03193 1.86716 5.58183 1.74165 6.14014 1.72805C6.53903 1.72646 6.93323 1.81406 7.29391 1.98444C7.67859 2.15868 8.00852 2.43445 8.24826 2.78211L11.5529 7.43991C11.7814 7.74866 11.9727 8.08334 12.1226 8.437C12.2464 8.71042 12.3142 9.00585 12.3221 9.30588C12.3178 9.66427 12.2139 10.0144 12.0222 10.3172C11.8018 10.6885 11.5328 11.0286 11.2223 11.3285L10.1397 12.4531C10.0649 12.5273 10.0062 12.6163 9.96753 12.7144C9.92882 12.8124 9.91087 12.9175 9.91481 13.0228C9.91499 13.1334 9.92935 13.2435 9.95754 13.3504C10.0003 13.4644 10.043 13.5499 10.0715 13.6353C10.454 14.2839 10.8976 14.8944 11.3962 15.4586C12.0372 16.1993 12.7209 16.9579 13.4616 17.7076C14.2308 18.4626 14.9714 19.1605 15.7264 19.8015C16.292 20.3005 16.9078 20.7397 17.5639 21.112C17.6351 21.1404 17.7206 21.1832 17.8203 21.2259C17.9344 21.2667 18.0552 21.286 18.1764 21.2829C18.2852 21.2853 18.3933 21.265 18.4939 21.2233C18.5944 21.1816 18.6852 21.1195 18.7604 21.0407L19.8437 19.9747C20.1439 19.6592 20.4895 19.3903 20.8692 19.177C21.1712 18.9834 21.5219 18.8795 21.8806 18.8771C22.1796 18.8811 22.4748 18.944 22.7495 19.0623C23.1002 19.2125 23.4343 19.3986 23.7465 19.6178L28.4613 22.9652C28.8034 23.1888 29.0751 23.5049 29.2447 23.8768C29.3915 24.2289 29.4679 24.6064 29.4696 24.9878C29.4685 25.526 29.3477 26.0571 29.1158 26.5427Z" stroke="white" strokeWidth="1.5" strokeMiterlimit="10"></path></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end space-y-3">
                    <div className="contact-area">
                      <h2 className="text-xl lg:text-2xl font-bold text-white leading-tight font-display tracking-tight mb-1">
                        İşletmenize uygun
                      </h2>
                      <p className="text-[13px] font-normal text-white/90 leading-snug">
                        Yönetim Bilişim Sistemleri çözümleri için sizi arayalım!
                      </p>
                    </div>
                    <Link to="/iletisim" className="transition-colors bg-white text-[#63b956] hover:bg-gray-50 group font-bold px-6 py-2.5 rounded-full flex items-center justify-center whitespace-nowrap text-center text-[15px]">
                      Fiyat alın
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true"><path d="M10.9375 10L7 6.0625L8.0625 5L13.0625 10L8.0625 15L7 13.9375L10.9375 10Z" fill="currentColor"></path></svg>
                    </Link>
                  </div>
                </div>
              </aside>

            </div>
          </div>
          </section>
        </div>
      );
    }

    // ---- FALLBACK (no slides configured) ----
    return (
      <section className="relative bg-white border-b border-gray-100 overflow-hidden pt-[88px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-0 min-h-[520px] items-stretch">
            <div className="flex flex-col justify-center py-14 pr-0 lg:pr-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e6fce8] text-[#5da350] font-semibold text-xs mb-6 w-fit">
                <Shield className="w-3.5 h-3.5" /> Kurumsal & Bireysel Bilişim İş Ortağınız
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-800 leading-tight mb-5 font-display">
                {settings?.homeHeroTitle ? (
                  <span dangerouslySetInnerHTML={{ __html: formatHtml(settings.homeHeroTitle) }} />
                ) : (
                  <>Teknolojide <span className="text-[#5da350]">Kesintisiz Gücünüz</span></>
                )}
              </h1>
              <p
                className="text-base sm:text-lg text-gray-500 mb-8 max-w-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatHtml(settings?.homeHeroSubtitle || 'Profesyonel teknik servisten öteye geçiyoruz. Sistem kurulumları, ağ altyapıları ve entegre güvenlik çözümleriyle işinizi yarına taşıyoruz.') }}
              />
              <div className="flex flex-wrap gap-3">
                <Link to="/randevu" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#5da350] text-white font-semibold text-sm hover:bg-green-700 transition-all shadow-md hover:-translate-y-0.5">
                  Hemen Randevu Al <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/hizmetler" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-[#5da350] hover:text-[#5da350] transition-all">
                  Tüm Hizmetler
                </Link>
              </div>
            </div>
            <div className="relative hidden lg:grid grid-cols-[1fr_auto] gap-4 items-stretch py-6">
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-xl">
                <img
                  src={mediaUrl(settings?.homeHeroImage) || "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=900"}
                  alt="Kerim Bilgisayar"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#5da350]/10 to-transparent" />
              </div>
              <div className="w-48 flex flex-col justify-center gap-4">
                <div className="bg-[#e6fce8] rounded-2xl p-5 flex flex-col gap-3 border border-[#5da350]/20 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-[#5da350] flex items-center justify-center">
                    <Headset className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-gray-700 font-semibold text-sm leading-snug">İşletmenize uygun çözümler için sizi arayalım!</p>
                  <Link to="/iletisim" className="inline-flex items-center gap-1 text-xs font-bold text-[#5da350] hover:text-green-800 transition-colors">
                    Fiyat al <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="text-2xl font-extrabold text-gray-800">500+</div>
                  <div className="text-xs text-gray-500 mt-1">Memnun Kurumsal Müşteri</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="text-2xl font-extrabold text-gray-800">15+</div>
                  <div className="text-xs text-gray-500 mt-1">Yıllık Sektörel Tecrübe</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderPartners = () => {
    const partners = getDisplayPartners();
    if (!partners || partners.length === 0) return null;

    // Yeterince geniş bir alan kaplaması için partner listesini birkaç kez çoğaltıyoruz
    const minItemsNeeded = 12;
    const copies = Math.max(1, Math.ceil(minItemsNeeded / partners.length));
    const blockPartners = Array(copies).fill(partners).flat();
    
    // Her bir logo için ortalama 3 saniye süre hesaplayarak sabit hız sağlıyoruz
    const duration = blockPartners.length * 3; 

    return (
      <section className="pb-20 pt-8 bg-white border-b border-gray-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 font-display">
            {settings.homePartnersTitle || "Çözüm Ortaklarımız"}
          </h2>
          <p className="text-lg text-gray-600 font-medium">
            {settings.homePartnersHeading || "Sektörün lider markalarıyla sertifikalı iş ortaklığı"}
          </p>
          <p>
            {settings.homePartnersDesc || "Güvenlik, ağ altyapısı ve bulut teknolojilerinde resmi partnerlik ve sertifikasyonlarımızla, işinizi güvenilir teknolojiler üzerine inşa ediyoruz."}
          </p>

          <div className="flex flex-wrap justify-center gap-8 sm:gap-12 mt-8">
            <div className="text-center">
              <b className="block text-2xl font-bold text-gray-900">{settings.homePartnersStat1Value || "7+"}</b>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{settings.homePartnersStat1Label || "Resmi Partnerlik"}</span>
            </div>
            <div className="text-center">
              <b className="block text-2xl font-bold text-gray-900">{settings.homePartnersStat2Value || "10+"}</b>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{settings.homePartnersStat2Label || "Yıllık Deneyim"}</span>
            </div>
            <div className="text-center">
              <b className="block text-2xl font-bold text-gray-900">{settings.homePartnersStat3Value || "Sertifikalı"}</b>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{settings.homePartnersStat3Label || "Teknik Ekip"}</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden w-full group mt-2" style={{ maskImage: 'linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%)', WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%)' }}>
          <div 
            className="flex items-center w-max transform-gpu"
            style={{ animation: `marquee ${duration}s linear infinite` }}
          >
            {/* 1st set */}
            {blockPartners.map((p: any, idx: number) => (
              <div key={`set1-${idx}`} className="flex-none flex items-center justify-center h-24 px-10 border-r border-gray-200">
                <div className="flex items-center justify-center font-bold text-xl sm:text-2xl text-gray-400 grayscale opacity-80 hover:opacity-100 hover:grayscale-0 hover:text-gray-900 hover:-translate-y-0.5 transition-all duration-300 cursor-default flex-col">
                  {p.logo ? (
                    <img src={mediaUrl(p.logo)} className="h-8 md:h-10 w-auto object-contain" alt={p.name} />
                  ) : (
                    <>
                      <span className="whitespace-nowrap font-serif italic tracking-tight">{p.name}</span>
                      {p.role && <small className="block font-sans not-italic font-semibold text-[10px] tracking-widest uppercase text-gray-400 mt-1 hover:text-primary">{p.role}</small>}
                    </>
                  )}
                </div>
              </div>
            ))}
            {/* 2nd set for seamless loop */}
            {blockPartners.map((p: any, idx: number) => (
              <div key={`set2-${idx}`} className="flex-none flex items-center justify-center h-24 px-10 border-r border-gray-200 last:border-r-0">
                <div className="flex items-center justify-center font-bold text-xl sm:text-2xl text-gray-400 grayscale opacity-80 hover:opacity-100 hover:grayscale-0 hover:text-gray-900 hover:-translate-y-0.5 transition-all duration-300 cursor-default flex-col">
                  {p.logo ? (
                    <img src={mediaUrl(p.logo)} className="h-8 md:h-10 w-auto object-contain" alt={p.name} />
                  ) : (
                    <>
                      <span className="whitespace-nowrap font-serif italic tracking-tight">{p.name}</span>
                      {p.role && <small className="block font-sans not-italic font-semibold text-[10px] tracking-widest uppercase text-gray-400 mt-1 hover:text-primary">{p.role}</small>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <style>{`
            @keyframes marquee {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .group:hover > div[style*="animation"] {
              animation-play-state: paused !important;
            }
          `}</style>
        </div>
      </section>
    );
  };

  const renderReferences = () => {
    // Referanslar bölümü: admin panelden yönetilecek, şimdilik boş
    return null;
  };

  const renderFeatures = () => (
    <section className="py-24 bg-gray-50/50 border-b border-gray-200">
      <div
        ref={featuresSection.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${featuresSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 font-display text-center">Neden Bizi Tercih Etmelisiniz?</h2>
          <p className="text-lg text-gray-600 font-medium">Teknolojik altyapınızı modernize eden, operasyonel sürekliliğinizi güvence altına alan ve kurumsal verilerinizi koruyan ileri düzey çözümler.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {dynamicFeatures.map((feature, i) => (
            <div
              key={i}
              className={`card-modern group ${i === 1 ? "delay-100" : i === 2 ? "delay-200" : "delay-0"}`}
            >
              <div className="glow-overlay" />
              <div className="bg-primary/10 w-14 h-14 rounded-theme flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300 relative z-10">
                <feature.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10 font-display">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed relative z-10">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderCampaigns = () => {
    if (campaigns.length === 0) return null;
    return (
      <section className="py-24 bg-gradient-to-b from-white to-primary/5 border-b border-gray-200">
        <div
          ref={campaignsSection.ref}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${campaignsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 font-display">Güncel Kampanyalar</h2>
            <p className="text-lg text-gray-600 font-medium">İşletmenizin ihtiyaçlarına en uygun yenilikçi çözümlere ve ayrıcalıklı hizmetlere, dönemsel avantajlarla sahip olun.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((camp, i) => (
              <div key={i} className="bg-white rounded-theme overflow-hidden shadow-lg border border-primary/10 hover:shadow-xl transition-shadow flex flex-col">
                {camp.imageUrl && (
                  <div className="h-48 relative overflow-hidden">
                    <img src={mediaUrl(camp.imageUrl)} alt={camp.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    {camp.discountRate && (
                      <div className="absolute top-4 right-4 bg-primary text-white font-bold px-3 py-1 rounded-full text-sm shadow">
                        %{Number(camp.discountRate)} İndirim
                      </div>
                    )}
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 font-display">{camp.title}</h3>
                  <p className="text-gray-600 mb-6 flex-1">{camp.description}</p>
                  <Link to="/iletisim" className="w-full text-center py-3 bg-gray-100 hover:bg-primary hover:text-white text-gray-800 font-semibold rounded-theme transition-colors">
                    Fırsattan Yararlan
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderServices = () => (
    <section ref={servicesSection.ref} className={`py-24 bg-[#f6f6f6] border-b border-gray-100 transition-all duration-700 ${servicesSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 font-display">İhtiyacınıza Uygun Çözümler</h2>
            <p className="text-lg text-gray-600 font-medium">Tüm ihtiyaçlarınıza yönelik Kerim BT çözümlerimizi inceleyin.</p>
          </div>
          <Link to="/hizmetler" className="mt-4 md:mt-0 text-[#5da350] font-bold hover:text-green-700 flex items-center gap-1 transition-colors">
            Tüm Çözümlerimiz <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(280px,auto)]">
          {services.length > 0 ? services.map((service, i) => {
            const Icon = getIconForCategory(service.category);
            const isLarge = i === 0 || i === 3;
            return (
              <div
                key={i}
                className={`card-modern border-2 border-gray-800 group cursor-pointer flex flex-col justify-between ${isLarge ? 'md:col-span-2 lg:col-span-2' : 'col-span-1'} ${i === 1 ? 'delay-50' : i === 2 ? 'delay-100' : i === 3 ? 'delay-150' : ''}`}
              >
                <div className="glow-overlay bg-[#e6fce8]" />
                <div>
                  <div className="bg-[#e6fce8] text-[#5da350] w-14 h-14 rounded-xl flex items-center justify-center mb-6 relative z-10 group-hover:bg-[#5da350] group-hover:text-white transition-colors duration-300">
                    <Icon className="w-7 h-7 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-3 relative z-10 font-display text-xl md:text-2xl">{service.title}</h3>
                  <p className="text-gray-600 leading-relaxed relative z-10 line-clamp-3">{service.short_description || service.description?.substring(0, 100) + '...'}</p>
                </div>
                <Link
                  to={`/hizmetler/${service.id}`}
                  className="mt-8 flex items-center text-[#5da350] font-semibold text-sm relative z-10 gap-2 group-hover:text-green-700 transition-colors"
                >
                  Detaylı İncele <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            );
          }) : null}
        </div>
      </div>
    </section>
  );

  const renderSplit = () => (
    <section className="py-24 bg-gray-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gaming Section */}
          <div className="rounded-[2rem] p-10 md:p-14 text-white relative overflow-hidden group shadow-2xl hover:shadow-purple-500/20 transition-shadow duration-500">
            <div className="absolute inset-0 bg-gray-950"></div>
            <img
              src={mediaUrl(settings?.homeGamingImage) || "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&q=80"}
              alt={settings?.homeGamingTitle || "Profesyonel Gaming Sistemler"}
              className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/80 to-transparent"></div>
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-purple-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <Gamepad2 className="w-12 h-12 text-purple-400 mb-6 relative z-10" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10 font-display">{settings?.homeGamingTitle}</h2>
            <p className="text-gray-100 mb-8 leading-relaxed relative z-10">
              {settings?.homeGamingDesc}
            </p>
            <ul className="space-y-3 mb-8 text-white font-medium relative z-10">
              {(settings?.homeGamingBullets || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map((bullet, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-400 shrink-0" /> {bullet}
                  </li>
                ))
              }
            </ul>
            <Link to={settings?.homeGamingBtnUrl || '#'} className="inline-flex font-semibold bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-theme transition-colors relative z-10 shadow-lg">
              {settings?.homeGamingBtnText}
            </Link>
          </div>

          {/* Corporate Section */}
          <div className="rounded-[2rem] p-10 md:p-14 text-white relative overflow-hidden group shadow-2xl hover:shadow-primary/20 transition-shadow duration-500">
            <div className="absolute inset-0 bg-gray-950"></div>
            <img
              src={mediaUrl(settings?.homeCorporateImage) || "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80"}
              alt={settings?.homeCorporateTitle || "Kurumsal Bakım Anlaşmaları"}
              className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/80 to-transparent"></div>
            <div className="absolute bottom-0 right-0 -mb-8 -mr-8 w-48 h-48 bg-white rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
            <Server className="w-12 h-12 text-white mb-6 relative z-10" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10 font-display">{settings?.homeCorporateTitle}</h2>
            <p className="text-gray-100 mb-8 leading-relaxed relative z-10">
              {settings?.homeCorporateDesc}
            </p>
            <ul className="space-y-3 mb-8 text-white font-medium relative z-10">
              {(settings?.homeCorporateBullets || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map((bullet, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-white shrink-0" /> {bullet}
                  </li>
                ))
              }
            </ul>
            <Link to={settings?.homeCorporateBtnUrl || '#'} className="inline-flex font-semibold bg-white text-primary hover:bg-gray-50 px-6 py-3 rounded-theme transition-colors relative z-10 shadow-lg">
              {settings?.homeCorporateBtnText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );

  const renderReviews = () => (
    <section className="py-20 bg-white border-b border-gray-200">
      <div
        ref={reviewsSection.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${reviewsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="flex flex-col items-center justify-center mb-16 text-center">
          <div className="flex items-center gap-4 mb-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/archive/c/c1/20210618182605%21Google_%22G%22_logo.svg" alt="Google" className="w-10 h-10" />
            <h2 className="text-2xl font-bold text-gray-900 font-display">Google İşletme Yorumları</h2>
          </div>
          <div className="flex items-center text-4xl font-extrabold text-gray-900 gap-4">
            4.9
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-8 h-8 fill-current" />)}
            </div>
          </div>
          <p className="text-gray-500 mt-2 font-medium">150+ Kurumsal ve Bireysel Değerlendirme</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {getDisplayTestimonials().map((testi, i) => (
            <div
              key={i}
              className={`bg-gray-50 p-8 rounded-3xl border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${i === 1 ? "delay-100" : i === 2 ? "delay-200" : "delay-0"}`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-lg font-display">
                  {(testi.name || testi.customerName || '?').charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-gray-900 font-display">{testi.name || testi.customerName}</div>
                  <div className="text-sm text-gray-500">{testi.role || testi.time}</div>
                </div>
              </div>
              <div className="flex text-amber-400 mb-4">
                {[...Array(testi.rating || 5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-gray-700 leading-relaxed">"{testi.comment || testi.content}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderCta = () => (
    <section className="bg-primary py-16">
      <div
        ref={ctaSection.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center transition-all duration-700 ${ctaSection.inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-6 font-display">Kurumsal Çözüm veya Teknik Desteğe mi İhtiyacınız Var?</h2>
        <p className="text-gray-800 max-w-2xl text-lg mb-8 font-medium">
          Bilişim ihtiyaçlarınızı profesyonelce yönetmek adına hemen bir talep oluşturun. Kurumsal bakım anlaşmaları veya donanım arızaları için uzman teknik ekiplerimizi hızla yönlendirelim.
        </p>
        <Link to="/randevu" className="bg-gray-900 text-white px-8 py-4 rounded-theme font-bold text-lg hover:bg-gray-800 transition-colors shadow-xl shadow-black/20 inline-flex items-center gap-2">
          Hemen Talep / Randevu Oluştur
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col bg-white text-gray-800">
      <SEO 
        title="Kerim Bilgisayar" 
        description={settings?.contactBannerDesc || "Kurumsal ve Bireysel BT Çözümleri, Teknik Servis ve Bakım Anlaşmaları"} 
        schema={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Kerim Bilgisayar",
          "image": settings?.contactBannerImage || "",
          "@id": "",
          "url": "https://kerimbilgisayar.com",
          "telephone": settings?.contactPhone || "",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": settings?.contactAddress || "",
            "addressLocality": "Istanbul",
            "addressCountry": "TR"
          },
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday"
            ],
            "opens": "09:00",
            "closes": "18:00"
          }
        }}
      />
      {getSectionOrder().map(section => {
        switch (section) {
          case 'hero': return <div key="hero">{renderHero()}</div>;
          case 'partners': return <div key="partners">{renderPartners()}</div>;
          case 'references': return <div key="references">{renderReferences()}</div>;
          case 'features': return <div key="features">{renderFeatures()}</div>;
          case 'campaigns': return <div key="campaigns">{renderCampaigns()}</div>;
          case 'services': return <div key="services">{renderServices()}</div>;
          case 'split': return <div key="split">{renderSplit()}</div>;
          case 'reviews': return <div key="reviews">{renderReviews()}</div>;
          case 'cta': return <div key="cta">{renderCta()}</div>;
          default: return null;
        }
      })}
    </div>
  );
}
