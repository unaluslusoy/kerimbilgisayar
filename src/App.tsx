import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import PublicLayout from './layout/PublicLayout';
import AdminLayout from './layout/AdminLayout';
import Home from './pages/public/Home';
import DeviceStatus from './pages/public/DeviceStatus';
import Appointment from './pages/public/Appointment';
import AdminOverview from './pages/admin/AdminOverview';
import ServiceManager from './pages/admin/ServiceManager';
import AdminUsers from './pages/admin/AdminUsers';
import AdminStock from './pages/admin/AdminStock';
import AdminMessages from './pages/admin/AdminMessages';
import AdminSettings from './pages/admin/AdminSettings';
import AdminBlog from './pages/admin/AdminBlog';
import AdminCampaigns from './pages/admin/AdminCampaigns';
import AdminFAQ from './pages/admin/AdminFAQ';
import AdminLeads from './pages/admin/AdminLeads';
import AdminPages from './pages/admin/AdminPages';
import AdminMedia from './pages/admin/AdminMedia';
import AdminMenus from './pages/admin/AdminMenus';
import AdminTaxonomies from './pages/admin/AdminTaxonomies';
import AdminTestimonials from './pages/admin/AdminTestimonials';
import AdminProfile from './pages/admin/AdminProfile';
import AdminThemes from './pages/admin/AdminThemes';
import AdminAppearance from './pages/admin/AdminAppearance';
import AdminPlugins from './pages/admin/AdminPlugins';
import AdminApiKeys from './pages/admin/AdminApiKeys';
import AdminWebhooks from './pages/admin/AdminWebhooks';
import AdminServices from './pages/admin/AdminServices';
import DynamicPage from './pages/public/DynamicPage';
import LegalPage from './pages/public/LegalPage';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import BlogList from './pages/public/BlogList';
import BlogPost from './pages/public/BlogPost';
import Services from './pages/public/Services';
import ServiceDetail from './pages/public/ServiceDetail';
import Campaigns from './pages/public/Campaigns';
import FAQ from './pages/public/FAQ';
import Search from './pages/public/Search';
import AdminLogin from './pages/admin/AdminLogin';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import CustomerLayout from './layout/CustomerLayout';
import CustomerAuth from './pages/customer/CustomerAuth';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerTickets from './pages/customer/CustomerTickets';
import TicketPrintView from './pages/shared/TicketPrintView';

import AdminLiveCustomizer from './pages/admin/AdminLiveCustomizer';

import AdminLayouts from './pages/admin/AdminLayouts';
import AdminLayoutBuilder from './pages/admin/AdminLayoutBuilder';

export default function App() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'LIVE_CUSTOMIZER_UPDATE') {
        const { key, value } = event.data.payload;
        if (key === 'themeColor') {
          document.documentElement.style.setProperty('--color-primary', value);
        } else if (key === 'themeSecondaryColor') {
          document.documentElement.style.setProperty('--color-accent', value);
          document.documentElement.style.setProperty('--color-secondary', value);
        } else if (key === 'themeTextColor') {
          document.documentElement.style.setProperty('--color-gray-500', value);
        } else if (key === 'themeDarkColor') {
          document.documentElement.style.setProperty('--color-gray-900', value);
        } else if (key === 'themeRadius') {
          document.documentElement.style.setProperty('--theme-radius', value);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <CustomerAuthProvider>
          <SettingsProvider>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<PublicLayout />}>
               <Route index element={<Home />} />
               <Route path="hakkimizda" element={<About />} />
               <Route path="iletisim" element={<Contact />} />
               <Route path="blog" element={<BlogList />} />
               <Route path="blog/:slug" element={<BlogPost />} />
               <Route path="ariza-sorgulama" element={<DeviceStatus />} />
               <Route path="randevu" element={<Appointment />} />
               <Route path="hizmetler" element={<Services />} />
               <Route path="hizmetler/:id" element={<ServiceDetail />} />
               <Route path="kampanyalar" element={<Campaigns />} />
               <Route path="sss" element={<FAQ />} />
               <Route path="arama" element={<Search />} />
               
               {/* Legal Pages */}
               <Route path="kvkk" element={<LegalPage type="kvkk" />} />
               <Route path="cerez-politikasi" element={<LegalPage type="cookies" />} />
               <Route path="sistem-guvenligi" element={<LegalPage type="security" />} />
               <Route path="telif-hakki" element={<LegalPage type="copyright" />} />
               <Route path="gizlilik-politikalari" element={<LegalPage type="privacy" />} />
               <Route path="kisisel-veriler" element={<LegalPage type="personalData" />} />
               <Route path="posta-hukuki-hukum-ve-sartlar" element={<LegalPage type="mailTerms" />} />
               <Route path="kullanim-kosullari" element={<LegalPage type="terms" />} />
               <Route path="aydinlatma-metni" element={<LegalPage type="disclosure" />} />

               <Route path="panel" element={<Navigate to="/admin" replace />} />
               
               {/* Dynamic Page Routing (Catch-All for CMS Pages) */}
               <Route path=":slug" element={<DynamicPage />} />
            </Route>

            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Live Customizer Route (Standalone) */}
            <Route path="/admin/customizer" element={<AdminLiveCustomizer />} />

            {/* Admin/Dashboard Routes */}
            <Route path="/admin" element={<AdminLayout />}>
               <Route index element={<AdminOverview />} />
               <Route path="servis" element={<ServiceManager />} />
               <Route path="kullanicilar" element={<AdminUsers />} />
               <Route path="stok" element={<AdminStock />} />
               <Route path="mesajlar" element={<AdminMessages />} />
               <Route path="ayarlar" element={<AdminSettings />} />
               <Route path="ozellestir" element={<AdminAppearance />} />
               <Route path="blog" element={<AdminBlog />} />
               <Route path="kampanyalar" element={<AdminCampaigns />} />
               <Route path="sss" element={<AdminFAQ />} />
               <Route path="basvurular" element={<AdminLeads />} />
               <Route path="sayfalar" element={<AdminPages />} />
               <Route path="ortam" element={<AdminMedia />} />
               <Route path="menuler" element={<AdminMenus />} />
               <Route path="sablonlar" element={<AdminLayouts />} />
               <Route path="builder/:id" element={<AdminLayoutBuilder />} />
               <Route path="kategoriler" element={<AdminTaxonomies />} />
               <Route path="musteri-yorumlari" element={<AdminTestimonials />} />
               <Route path="profilim" element={<AdminProfile />} />
               <Route path="temalar" element={<AdminThemes />} />
               <Route path="eklentiler" element={<AdminPlugins />} />
               <Route path="api-anahtarlari" element={<AdminApiKeys />} />
               <Route path="webhooks" element={<AdminWebhooks />} />
               <Route path="hizmetler" element={<AdminServices />} />
            </Route>

            {/* Customer Portal Routes */}
            <Route path="/musteri/giris" element={<CustomerAuth />} />
            <Route path="/musteri" element={<CustomerLayout />}>
               <Route path="panel" element={<CustomerDashboard />} />
               <Route path="servis-gecmisi" element={<CustomerTickets />} />
            </Route>

            {/* Shared / Print Routes */}
            <Route path="/print/ticket/:ticketNumber" element={<TicketPrintView />} />
          </Routes>
        </SettingsProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </Router>
  );
}
