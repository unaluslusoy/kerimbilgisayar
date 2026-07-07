import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Users, Box, MessageSquare, Settings, LogOut,
  Menu, BookOpen, Tag, HelpCircle, Inbox, ExternalLink, UserCircle, Image as ImageIcon, MessageSquareQuote, Palette, Puzzle, Key, Webhook, Layout, Megaphone, Store, BarChart3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminRequest } from '../lib/api';

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [isGoogleBusinessActive, setIsGoogleBusinessActive] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      adminRequest('/api/admin/plugins')
        .then((plugins) => {
          const gmb = plugins?.find((p: any) => p.pluginId === 'google-business');
          setIsGoogleBusinessActive(!!gmb?.isActive);
        })
        .catch(console.error);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  let navItems: any[] = [
    { name: 'Başlangıç', path: '/admin', icon: LayoutDashboard },
    { name: 'Servis Kayıtları', path: '/admin/servis', icon: Wrench },
    { name: 'Stok & Depo', path: '/admin/stok', icon: Box },
    { name: 'Hizmetlerimiz', path: '/admin/hizmetler', icon: Wrench },
    { name: 'Hizmet Kategorileri', path: '/admin/hizmet-kategorileri', icon: Tag },
    { name: 'Kullanıcılar', path: '/admin/kullanicilar', icon: Users },
    { name: 'Müşteriler', path: '/admin/musteriler', icon: Users },
    { name: 'Abonelik Paketleri', path: '/admin/abonelik-paketleri', icon: Tag },
    { name: 'Başvurular', path: '/admin/basvurular', icon: Inbox },
    { name: 'Mesajlar', path: '/admin/mesajlar', icon: MessageSquare },
    { separator: true, name: 'İçerik Yönetimi' },
    { name: 'Ortam Kütüphanesi', path: '/admin/ortam', icon: ImageIcon },
    { name: 'Sayfalar', path: '/admin/sayfalar', icon: BookOpen },
    { name: 'Blog Yazıları', path: '/admin/blog', icon: BookOpen },
    { name: 'Kategoriler', path: '/admin/kategoriler', icon: Tag },
    { name: 'Müşteri Yorumları', path: '/admin/musteri-yorumlari', icon: MessageSquareQuote },
    { name: 'Kampanyalar', path: '/admin/kampanyalar', icon: Tag },
    { name: 'SSS / Yardım', path: '/admin/sss', icon: HelpCircle },
    { separator: true, name: 'Görünüm' },
    { name: 'Özelleştir', path: '/admin/ozellestir', icon: Layout },
    { name: 'Temalar', path: '/admin/temalar', icon: Palette },
    { name: 'Menüler', path: '/admin/menuler', icon: Menu },
    { name: 'Sistem', separator: true },
    { name: 'API Anahtarları', path: '/admin/api-anahtarlari', icon: Key },
    { name: 'Webhooks', path: '/admin/webhooks', icon: Webhook },
    { name: 'Eklentiler', path: '/admin/eklentiler', icon: Puzzle },
    { name: 'Dil Yönetimi', path: '/admin/diller', icon: BookOpen },
    { name: 'Ayarlar', path: '/admin/ayarlar', icon: Settings },
  ];

  if (isGoogleBusinessActive) {
    navItems = navItems.concat([
      { name: 'Google İşletme', separator: true },
      { name: 'Yayınlar (Posts)', path: '/admin/google/posts', icon: Megaphone as any },
      { name: 'Yorumlar', path: '/admin/google/reviews', icon: MessageSquareQuote as any },
      { name: 'İşletme Bilgileri', path: '/admin/google/info', icon: Store as any },
      { name: 'İstatistikler', path: '/admin/google/insights', icon: BarChart3 as any },
    ] as any);
  }

  return (
    <div className="admin-panel min-h-screen flex flex-col font-sans text-[#3c434a] bg-[#f0f0f1]">
      
      {/* Top Admin Bar (WordPress Style) */}
      <div className="h-8 bg-[#1d2327] text-[#f0f0f1] flex items-center justify-between px-3 shrink-0 z-50 sticky top-0">
        <div className="flex items-center space-x-4 h-full">
          <Link to="/" target="_blank" className="flex items-center text-[13px] hover:text-[#72aee6] transition-colors h-full px-2">
            <span className="font-semibold mr-2">Kerim Bilgisayar</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex items-center h-full">
          <Link to="/admin/profilim" className="flex items-center px-3 hover:text-[#72aee6] cursor-pointer h-full text-[13px] transition-colors">
            <span className="mr-2">Merhaba, {user?.name || 'Admin'}</span>
            <UserCircle className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-900/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar (WordPress Style) */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-40 md:w-48 bg-[#1d2327] text-[#f0f0f1] transform transition-transform duration-300 md:translate-x-0 md:static md:inset-0 flex flex-col pt-2 pb-10",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          
          <nav className="flex-1 overflow-y-auto w-full">
            <ul className="space-y-0 text-[13px]">
              {navItems.map((item: any, idx) => {
                if (item.separator) {
                  return (
                    <li key={idx} className="mt-4 mb-2 px-3">
                      <div className="text-[11px] font-semibold text-[#a7aaad] uppercase tracking-wider">{item.name}</div>
                    </li>
                  );
                }
                const isActive = location.pathname === item.path ||
                  (item.path !== '/admin' && location.pathname.startsWith(item.path));
                return (
                  <li key={item.path} className="relative group">
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                    )}
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center px-3 py-2 transition-colors",
                        isActive ? "bg-[#2c3338] text-white" : "text-[#f0f0f1] hover:text-[#72aee6] hover:bg-[#1d2327]"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 mr-2.5 shrink-0", isActive ? "text-[#72aee6]" : "text-[#a7aaad] group-hover:text-[#72aee6]")} />
                      <span className="truncate leading-tight">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="w-full mt-auto">
            <button
              onClick={() => { logout(); }}
              className="w-full flex items-center px-4 py-3 text-[13px] text-[#a7aaad] hover:text-[#72aee6] transition-colors border-t border-[#2c3338]"
            >
              <LogOut className="w-4 h-4 mr-2.5 shrink-0" />
              Çıkış Yap
            </button>
          </div>
        </aside>

        {/* Main Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Mobile header (for opening sidebar) */}
          <div className="md:hidden flex items-center p-3 bg-white border-b border-gray-200">
             <button
                className="p-1 mr-3 text-gray-500 hover:text-gray-900"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-sm font-semibold">Kerim Bilgisayar</h1>
          </div>

          {/* Dynamic Page Content */}
          <main className="flex-1 p-4 sm:p-5 lg:p-6 bg-[#f0f0f1] text-[#3c434a]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
