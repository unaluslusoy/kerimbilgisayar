import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import PublicLayout from './layout/PublicLayout';
import Home from './pages/public/Home';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { ToastProvider } from './context/ToastContext';
import PwaInstallBanner from './components/ui/PwaInstallBanner';

// Lazy load layout components
const AdminLayout = lazy(() => import('./layout/AdminLayout'));
const CustomerLayout = lazy(() => import('./layout/CustomerLayout'));

// Lazy load page components
const DeviceStatus = lazy(() => import('./pages/public/DeviceStatus'));
const Appointment = lazy(() => import('./pages/public/Appointment'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const ServiceManager = lazy(() => import('./pages/admin/ServiceManager'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminSubscriptionPlans = lazy(() => import('./pages/admin/AdminSubscriptionPlans'));
const AdminStock = lazy(() => import('./pages/admin/AdminStock'));
const AdminPos = lazy(() => import('./pages/admin/AdminPos'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminBlog = lazy(() => import('./pages/admin/AdminBlog'));
const AdminCampaigns = lazy(() => import('./pages/admin/AdminCampaigns'));
const AdminFAQ = lazy(() => import('./pages/admin/AdminFAQ'));
const AdminLeads = lazy(() => import('./pages/admin/AdminLeads'));
const AdminPages = lazy(() => import('./pages/admin/AdminPages'));
const AdminMedia = lazy(() => import('./pages/admin/AdminMedia'));
const AdminMenus = lazy(() => import('./pages/admin/AdminMenus'));
const AdminTaxonomies = lazy(() => import('./pages/admin/AdminTaxonomies'));
const AdminTestimonials = lazy(() => import('./pages/admin/AdminTestimonials'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const AdminThemes = lazy(() => import('./pages/admin/AdminThemes'));
const AdminAppearance = lazy(() => import('./pages/admin/AdminAppearance'));
const AdminPlugins = lazy(() => import('./pages/admin/AdminPlugins'));
const AdminApiKeys = lazy(() => import('./pages/admin/AdminApiKeys'));
const AdminWebhooks = lazy(() => import('./pages/admin/AdminWebhooks'));
const AdminSecurity = lazy(() => import('./pages/admin/AdminSecurity'));
const AdminSystemHealth = lazy(() => import('./pages/admin/AdminSystemHealth'));
const LanguageSettings = lazy(() => import('./pages/admin/LanguageSettings'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminServiceCategories = lazy(() => import('./pages/admin/AdminServiceCategories'));
const AdminShipments = lazy(() => import('./pages/admin/AdminShipments'));
const AdminExpenses = lazy(() => import('./pages/admin/AdminExpenses'));
const AdminDealers = lazy(() => import('./pages/admin/AdminDealers'));
const AdminReceiptBuilder = lazy(() => import('./pages/admin/AdminReceiptBuilder'));
const DynamicPage = lazy(() => import('./pages/public/DynamicPage'));
const LegalPage = lazy(() => import('./pages/public/LegalPage'));
const About = lazy(() => import('./pages/public/About'));
const Contact = lazy(() => import('./pages/public/Contact'));
const BlogList = lazy(() => import('./pages/public/BlogList'));
const BlogPost = lazy(() => import('./pages/public/BlogPost'));
const Services = lazy(() => import('./pages/public/Services'));
const ServiceDetail = lazy(() => import('./pages/public/ServiceDetail'));
const Campaigns = lazy(() => import('./pages/public/Campaigns'));
const FAQ = lazy(() => import('./pages/public/FAQ'));
const Search = lazy(() => import('./pages/public/Search'));
const MaintenancePage = lazy(() => import('./pages/public/MaintenancePage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const CustomerAuth = lazy(() => import('./pages/customer/CustomerAuth'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const CustomerTickets = lazy(() => import('./pages/customer/CustomerTickets'));
const TicketPrintView = lazy(() => import('./pages/shared/TicketPrintView'));
const PrintTicketTagView = lazy(() => import('./pages/shared/PrintTicketTagView'));

const AdminLiveCustomizer = lazy(() => import('./pages/admin/AdminLiveCustomizer'));
const AdminLayouts = lazy(() => import('./pages/admin/AdminLayouts'));
const AdminLayoutBuilder = lazy(() => import('./pages/admin/AdminLayoutBuilder'));

const AdminGoogleDashboard = lazy(() => import('./pages/admin/google/AdminGoogleDashboard'));
const AdminGooglePosts = lazy(() => import('./pages/admin/google/AdminGooglePosts'));
const AdminGoogleReviews = lazy(() => import('./pages/admin/google/AdminGoogleReviews'));
const AdminGoogleInfo = lazy(() => import('./pages/admin/google/AdminGoogleInfo'));
const AdminGoogleInsights = lazy(() => import('./pages/admin/google/AdminGoogleInsights'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminInvoices = lazy(() => import('./pages/admin/AdminInvoices'));
const AdminContracts = lazy(() => import('./pages/admin/AdminContracts'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));


function AppContent() {
  const { apiReady, apiChecked, loading } = useSettings();

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

  // API kontrol edilene kadar loading göster
  if (!apiChecked || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // API erişilemezse bakım sayfası göster (admin route'lar hariç)
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  if (!apiReady && !isAdminRoute) {
    return <MaintenancePage />;
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400 font-medium">Yükleniyor...</p>
        </div>
      </div>
    }>
      <Routes>
         {/* Public Routes */}
         <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="hakkimizda" element={<About />} />
            <Route path="iletisim" element={<Contact />} />
            <Route path="blog" element={<BlogList />} />
            <Route path="blog/:slug" element={<BlogPost />} />
            <Route path="ariza-sorgulama" element={<DeviceStatus />} />
            <Route path="track/:orderNo" element={<DeviceStatus />} />
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
            <Route path="musteriler" element={<AdminCustomers />} />
            <Route path="abonelik-paketleri" element={<AdminSubscriptionPlans />} />
            <Route path="stok" element={<AdminStock />} />
            <Route path="satis-pos" element={<AdminPos />} />
            <Route path="bayiler" element={<AdminDealers />} />
            <Route path="sablon-tasarimci" element={<AdminReceiptBuilder />} />
            <Route path="mesajlar" element={<AdminMessages />} />
            <Route path="ayarlar" element={<AdminSettings />} />
            <Route path="profilim" element={<AdminProfile />} />
            <Route path="diller" element={<LanguageSettings />} />
            <Route path="hizmetler" element={<AdminServices />} />
            <Route path="hizmet-kategorileri" element={<AdminServiceCategories />} />
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
            <Route path="guvenlik" element={<AdminSecurity />} />
            <Route path="sistem-sagligi" element={<AdminSystemHealth />} />
            <Route path="hizmetler" element={<AdminServices />} />
            <Route path="kargo" element={<AdminShipments />} />
            <Route path="masraflar" element={<AdminExpenses />} />
            <Route path="bildirimler" element={<AdminNotifications />} />
            <Route path="denetim-loglari" element={<AdminAuditLogs />} />
            <Route path="faturalar" element={<AdminInvoices />} />
            <Route path="sozlesmeler" element={<AdminContracts />} />
            <Route path="raporlar" element={<AdminReports />} />
            
            {/* Google Business Routes */}
            <Route path="google" element={<AdminGoogleDashboard />} />
            <Route path="google/posts" element={<AdminGooglePosts />} />
            <Route path="google/reviews" element={<AdminGoogleReviews />} />
            <Route path="google/info" element={<AdminGoogleInfo />} />
            <Route path="google/insights" element={<AdminGoogleInsights />} />
         </Route>
   
         {/* Customer Portal Routes */}
         <Route path="/musteri/giris" element={<CustomerAuth />} />
         <Route path="/musteri" element={<CustomerLayout />}>
            <Route path="panel" element={<CustomerDashboard />} />
            <Route path="servis-gecmisi" element={<CustomerTickets />} />
         </Route>
         
         {/* Shared / Print Routes */}
         <Route path="/print/ticket/:ticketNumber" element={<TicketPrintView />} />
         <Route path="/print/ticket-tag/:ticketNumber" element={<PrintTicketTagView />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <CustomerAuthProvider>
          <SettingsProvider>
            <ToastProvider>
              <AppContent />
              <PwaInstallBanner />
            </ToastProvider>
          </SettingsProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </Router>
  );
}
