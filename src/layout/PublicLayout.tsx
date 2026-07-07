import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Monitor, Phone, MapPin, Mail, Shield, ShieldCheck,
  ChevronDown, Menu as MenuIcon, X,
  Facebook, Twitter, Instagram, Linkedin,
  ArrowRight, MessageCircle
} from 'lucide-react';
import CookieConsent from '../components/CookieConsent';
import { useSettings } from '../context/SettingsContext';
import { mediaUrl } from '../lib/media';

const buildTree = (items: any[], parentId: number | null = null): any[] => {
  return items
    .filter(item => item.parentId === parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => ({ ...item, children: buildTree(items, item.id) }));
};

const NavbarItem: React.FC<{ item: any; isActive: boolean }> = ({ item, isActive }) => {
  if (item.children && item.children.length > 0) {
    return (
      <div className="relative group">
        <Link
          to={item.url}
          target={item.target}
          aria-haspopup="true"
          aria-expanded="false"
          className={`whitespace-nowrap group-hover:text-gray-900 text-[17px] font-medium transition-colors flex items-center py-2 px-3 gap-1.5 ${isActive ? 'text-gray-900' : 'text-gray-600'}`}
        >
          {item.title}
          <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-200" />
        </Link>
        
        {item.megaMenu && item.megaMenu.columns ? (
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-[800px] bg-white border border-gray-100 shadow-2xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {item.megaMenu.columns.map((col: any, idx: number) => (
                <div key={idx}>
                  <h4 className="font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100 text-sm uppercase tracking-wider">{col.title}</h4>
                  <div className="flex flex-col space-y-2">
                    {col.links && col.links.map((link: any, linkIdx: number) => (
                      <Link
                        key={linkIdx}
                        to={link.url}
                        className="text-gray-600 hover:text-primary text-[15px] font-medium transition-colors hover:translate-x-1 inline-block"
                      >
                        {link.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute top-full left-0 w-64 bg-white border border-gray-100 shadow-2xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50">
            <div className="p-2 flex flex-col">
              {item.children.map((child: any) => (
                <Link
                  key={child.id}
                  to={child.url}
                  target={child.target}
                  className="px-4 py-3 hover:bg-gray-50 rounded-xl text-[16px] font-medium text-gray-700 hover:text-primary transition-colors"
                >
                  {child.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.url}
      target={item.target}
      className={`whitespace-nowrap hover:text-gray-900 text-[17px] font-medium transition-colors py-2 px-3 ${isActive ? 'text-gray-900' : 'text-gray-600'}`}
    >
      {item.title}
    </Link>
  );
};

export default function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerItems, setHeaderItems] = useState<any[]>([]);
  const [footerItems, setFooterItems] = useState<any[]>([]);
  const [footerQuickItems, setFooterQuickItems] = useState<any[]>([]);
  const [footerBottomItems, setFooterBottomItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [activePlugins, setActivePlugins] = useState<string[]>([]);
  const [googleRating, setGoogleRating] = useState<any>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [isMobileMenuOpen]);

  // Scroll-aware header
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('/api/public/menus')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const headerMenu = data.find(m => m.location === 'header');
          const footerMenu = data.find(m => m.location === 'footer');
          const footerQuickMenu = data.find(m => m.location === 'footer_quick');
          const footerBottomMenu = data.find(m => m.location === 'footer_bottom');
          
          if (headerMenu) setHeaderItems(headerMenu.items || []);
          if (footerMenu) setFooterItems(footerMenu.items || []);
          if (footerQuickMenu) setFooterQuickItems(footerQuickMenu.items || []);
          if (footerBottomMenu) setFooterBottomItems(footerBottomMenu.items || []);
        }
      })
      .catch(console.error);

    fetch('/api/public/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error);

    fetch('/api/public/plugins')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setActivePlugins(data); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activePlugins.includes('google-business')) {
      fetch('/api/public/google-business')
        .then(res => res.json())
        .then(data => {
          if (!data.error && data.rating) {
            setGoogleRating(data);
          }
        })
        .catch(console.error);
    }
  }, [activePlugins]);

  const isActive = useCallback((path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const contactPhone = settings?.contactPhone || settings?.contact_phone || '';
  const contactEmail = settings?.contactEmail || settings?.contact_email || '';
  const contactAddress = settings?.contactAddress || settings?.contact_address || '';
  const siteTitle = settings?.site_title || 'Kerim Bilgisayar';
  const headerLogo = mediaUrl(settings?.logoUrl || settings?.siteLogo || '/assets/images/kerim-logo.svg');
  const footerLogo = mediaUrl(settings?.footerLogo || settings?.siteLogoWhite || settings?.logoUrl || settings?.siteLogo || '/assets/images/kerim-logo-beyaz.svg');
  const googleAnalyticsId = (settings?.googleAnalyticsId || '').trim();
  const googleSearchConsoleCode = (
    settings?.googleSearchConsoleCode
    || settings?.googleSiteVerification
    || settings?.googleSearchConsoleVerification
    || settings?.googleVerificationCode
    || settings?.searchConsoleCode
    || ''
  ).trim();
  const googleSiteVerification = googleSearchConsoleCode.match(/content=["']([^"']+)["']/i)?.[1] || googleSearchConsoleCode;

  if (activePlugins.includes('maintenance-mode')) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans p-4 text-center">
        <Monitor className="w-16 h-16 text-primary mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Sistem Güncellemesi Yapılmaktadır</h1>
        <p className="text-gray-600 max-w-md">
          Sizlere daha gelişmiş ve yüksek performanslı bir deneyim sunabilmek amacıyla sistemlerimizi geçici olarak bakıma aldık. Çalışmalarımız en kısa sürede tamamlanacaktır. Gösterdiğiniz anlayış için teşekkür ederiz.
        </p>
      </div>
    );
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/arama?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <style>{`
        :root {
          --theme-primary: ${settings.themeColor || '#2563eb'};
          --theme-secondary: ${settings.themeSecondaryColor || '#1e40af'};
          --theme-radius: ${settings.themeRadius || '0.5rem'};
          --theme-font: ${settings.themeFont || 'ui-sans-serif, system-ui, sans-serif'};
        }
        body, html {
          font-family: var(--theme-font);
        }
      `}</style>
      <Helmet>
        {googleSiteVerification && <meta name="google-site-verification" content={googleSiteVerification} />}
        {googleAnalyticsId && <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} />}
        {googleAnalyticsId && (
          <script>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}');
            `}
          </script>
        )}
      </Helmet>

      {/* ===== SEARCH OVERLAY ===== */}
      <div className={`fixed inset-0 bg-white z-[60] transition-all duration-300 ease-in-out ${isSearchOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 h-[88px] flex items-center justify-between border-b border-gray-100">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center h-full max-w-4xl mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input 
              type="text" 
              placeholder="Site içinde arama yapın..." 
              className="w-full h-full text-2xl bg-transparent outline-none text-gray-800 placeholder-gray-400 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus={isSearchOpen}
            />
            <button type="submit" className="px-6 py-2 bg-primary text-white rounded-full font-medium ml-4 hover:bg-green-700 transition-colors">
              Ara
            </button>
          </form>
          <button onClick={() => setIsSearchOpen(false)} className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors ml-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* ===== HEADER — transparent over gray hero ===== */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md border-b border-gray-200' : 'bg-transparent'}`}>
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex items-center h-[88px] gap-8">

            {/* Logo */}
            <Link to="/" aria-label="Anasayfaya git" onClick={() => setIsMobileMenuOpen(false)} className="shrink-0 py-2">
              <img
                src={headerLogo}
                alt={siteTitle}
                className="h-[62px] lg:h-[80px] w-auto object-contain drop-shadow-sm"
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center justify-center gap-2 flex-1">
              {buildTree(headerItems).map((item: any) => (
                <NavbarItem key={item.id} item={item} isActive={isActive(item.url)} />
              ))}
            </nav>

            {/* Right side: search + language */}
            <div className="flex items-center gap-3 ml-auto">
              {/* Search */}
              <button onClick={() => setIsSearchOpen(true)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Ara">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </button>
              {/* Language */}
              <div className="relative group hidden sm:block">
              <button className="flex items-center gap-1.5 px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-[45px] hover:border-gray-300 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  TR
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Menü"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 shadow-lg absolute w-full max-h-[calc(100vh-88px)] overflow-y-auto">
            {buildTree(headerItems).map((item: any) => (
              <Link
                key={item.id}
                onClick={() => setIsMobileMenuOpen(false)}
                to={item.url}
                className={`flex items-center w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                  isActive(item.url) ? 'bg-[#e6fce8] text-[#5da350]' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.title}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              <a href={`tel:${contactPhone}`} className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 text-gray-700 font-medium text-sm">
                <Phone className="w-4 h-4 text-[#5da350]" /> {contactPhone}
              </a>
              <Link to="/randevu" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center px-4 py-3 rounded-lg bg-[#5da350] text-white font-semibold text-sm">
                Randevu Al
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 page-enter">
        <Outlet />
      </main>

      <CookieConsent />

      {/* WhatsApp Float Button — Tüm Public Sayfalarda */}
      {(() => {
        const wa = settings?.whatsappPhone || settings?.contactPhone || '';
        if (!wa) return null;
        const url = `https://wa.me/${wa.replace(/[^0-9]/g, '')}?text=Merhaba%2C%20bilgi%20almak%20istiyorum.`;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-200 print:hidden"
            style={{ backgroundColor: '#25D366' }}
            aria-label="WhatsApp ile iletişim"
            title="WhatsApp'tan yazın"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </a>
        );
      })()}

      {/* Footer — Dark Premium */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link to="/" aria-label="Anasayfaya git" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-2 mb-5">
              <img src={footerLogo} alt={siteTitle} className="h-12 sm:h-14 w-auto object-contain" />
            </Link>
            <p className="text-gray-400 mb-6 max-w-sm text-sm leading-relaxed">
              {settings.siteTagline || 'Bireysel ve kurumsal IT altyapı çözümleri, proaktif bakım anlaşmaları, sistem entegrasyonu ve siber güvenlik hizmetleri.'}
            </p>
            {activePlugins.includes('google-business') && googleRating && (
              <a href={googleRating.url || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-gray-300 font-medium mb-6 bg-gray-800 hover:bg-gray-750 p-3 rounded-theme border border-gray-700 inline-flex transition-colors group">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
                <div className="flex flex-col">
                  <span>Google İşletme Puanı: <strong className="text-white ml-1">{googleRating.rating}/5.0</strong></span>
                  <span className="text-xs text-gray-400 font-normal group-hover:text-gray-300 transition-colors">
                    {googleRating.user_ratings_total} değerlendirme
                  </span>
                </div>
              </a>
            )}
            {/* Social Icons */}
            <div className="flex space-x-3">
              {settings.socialFacebook && (
                <a href={settings.socialFacebook} target="_blank" rel="noreferrer" aria-label="Facebook"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all border border-gray-700 hover:border-blue-600">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {settings.socialTwitter && (
                <a href={settings.socialTwitter} target="_blank" rel="noreferrer" aria-label="Twitter/X"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-sky-500 hover:text-white transition-all border border-gray-700 hover:border-sky-500">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {settings.socialInstagram && (
                <a href={settings.socialInstagram} target="_blank" rel="noreferrer" aria-label="Instagram"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-pink-600 hover:text-white transition-all border border-gray-700 hover:border-pink-600">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {settings.socialLinkedin && (
                <a href={settings.socialLinkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-blue-700 hover:text-white transition-all border border-gray-700 hover:border-blue-700">
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Kurumsal */}
          <div>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">Kurumsal</h3>
            <ul className="space-y-3 text-sm">
              {footerItems.map((item: any) => (
                <li key={item.id}>
                  <Link to={item.url} target={item.target} className="hover:text-white transition-colors">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hızlı Bağlantılar */}
          <div>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">Hızlı Bağlantılar</h3>
            <ul className="space-y-3 text-sm">
              {footerQuickItems.map((item: any) => (
                <li key={item.id}>
                  <Link to={item.url} target={item.target} className="hover:text-white transition-colors">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">İletişim</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3 text-gray-400">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{contactAddress}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href={`tel:${contactPhone.replace(/[^0-9+]/g, '')}`} className="hover:text-white transition-colors">
                  {contactPhone}
                </a>
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors">
                  {contactEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-gray-500">
              {settings.footerText || `© ${new Date().getFullYear()} ${siteTitle}. Tüm hakları saklıdır.`}
            </p>
            <div className="flex items-center gap-4 text-gray-600">
              {footerBottomItems.map((item: any, idx: number) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <span>•</span>}
                  <Link to={item.url} target={item.target} className="hover:text-gray-400 transition-colors">
                    {item.title}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
