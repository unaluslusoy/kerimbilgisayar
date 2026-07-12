import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Users, Box, MessageSquare, Settings, LogOut,
  Menu, BookOpen, Tag, HelpCircle, Inbox, ExternalLink, UserCircle, Image as ImageIcon, MessageSquareQuote, Palette, Puzzle, Key, Webhook, Layout, Megaphone, Store, BarChart3, LayoutGrid, Shield, Bell, Truck, DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminRequest, fetchAdminNotifications, markNotificationsAsRead } from '../lib/api';

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [isGoogleBusinessActive, setIsGoogleBusinessActive] = useState(false);

  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellDropdownOpen, setBellDropdownOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const data = await fetchAdminNotifications();
      if (Array.isArray(data)) {
        setNotificationsList(data);
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsAsRead();
      setUnreadCount(0);
      setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    { separator: true, name: 'Yönetim & Takip' },
    { name: 'Başlangıç', path: '/admin', icon: LayoutDashboard },
    { name: 'Servis Kayıtları', path: '/admin/servis', icon: Wrench },
    { name: 'Kargo Takibi', path: '/admin/kargo', icon: Truck },
    { name: 'Başvurular', path: '/admin/basvurular', icon: Inbox },
    { name: 'Mesajlar', path: '/admin/mesajlar', icon: MessageSquare },

    { separator: true, name: 'Ticari & Finans' },
    { name: 'POS Satış (POS)', path: '/admin/satis-pos', icon: Store },
    { name: 'Gider & Masraflar', path: '/admin/masraflar', icon: DollarSign },
    { name: 'Stok & Depo', path: '/admin/stok', icon: Box },
    { name: 'Abonelik Paketleri', path: '/admin/abonelik-paketleri', icon: Tag },

    { separator: true, name: 'Müşteri & CRM' },
    { name: 'Müşteriler', path: '/admin/musteriler', icon: Users },
    { name: 'Kullanıcılar', path: '/admin/kullanicilar', icon: Users },

    { separator: true, name: 'İçerik Yönetimi (CMS)' },
    { name: 'Hizmetlerimiz', path: '/admin/hizmetler', icon: Wrench },
    { name: 'Hizmet Kategorileri', path: '/admin/hizmet-kategorileri', icon: Tag },
    { name: 'Ortam Kütüphanesi', path: '/admin/ortam', icon: ImageIcon },
    { name: 'Sayfalar', path: '/admin/sayfalar', icon: BookOpen },
    { name: 'Blog Yazıları', path: '/admin/blog', icon: BookOpen },
    { name: 'Kategoriler', path: '/admin/kategoriler', icon: Tag },
    { name: 'Müşteri Yorumları', path: '/admin/musteri-yorumlari', icon: MessageSquareQuote },
    { name: 'Kampanyalar', path: '/admin/kampanyalar', icon: Tag },
    { name: 'SSS / Yardım', path: '/admin/sss', icon: HelpCircle },

    { separator: true, name: 'Görünüm & Tasarım' },
    { name: 'Özelleştir', path: '/admin/ozellestir', icon: Layout },
    { name: 'Temalar', path: '/admin/temalar', icon: Palette },
    { name: 'Menüler', path: '/admin/menuler', icon: Menu },

    { separator: true, name: 'Sistem & Ayarlar' },
    { name: 'Ayarlar', path: '/admin/ayarlar', icon: Settings },
    { name: 'Dil Yönetimi', path: '/admin/diller', icon: BookOpen },
    { name: 'Eklentiler', path: '/admin/eklentiler', icon: Puzzle },
    { name: 'Guvenlik', path: '/admin/guvenlik', icon: Shield },
    { name: 'API Anahtarları', path: '/admin/api-anahtarlari', icon: Key },
    { name: 'Webhooks', path: '/admin/webhooks', icon: Webhook },
  ];

  if (isGoogleBusinessActive) {
    navItems = navItems.concat([
      { name: 'Google İşletme', separator: true },
      { name: 'Genel Bakış', path: '/admin/google', icon: LayoutGrid as any },
      { name: 'Yayınlar (Posts)', path: '/admin/google/posts', icon: Megaphone as any },
      { name: 'Yorumlar', path: '/admin/google/reviews', icon: MessageSquareQuote as any },
      { name: 'İşletme & Medya', path: '/admin/google/info', icon: Store as any },
      { name: 'İstatistikler', path: '/admin/google/insights', icon: BarChart3 as any },
    ] as any);
  }

  return (
    <div className="admin-panel min-h-screen flex flex-col font-sans text-[#3c434a] bg-[#f0f0f1]">
      
      {/* Top Admin Bar (WordPress Style) */}
      <div className="hidden md:flex h-8 bg-[#1d2327] text-[#f0f0f1] items-center justify-between px-3 shrink-0 z-50 sticky top-0">
        <div className="flex items-center space-x-4 h-full">
          <Link to="/" target="_blank" className="flex items-center text-[13px] hover:text-[#72aee6] transition-colors h-full px-2">
            <span className="font-semibold mr-2">Kerim Bilgisayar</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex items-center h-full space-x-2">
          {/* Notification Bell Dropdown */}
          <div className="relative h-full flex items-center px-3 border-r border-[#2c3338]" ref={bellRef}>
            <button
              onClick={() => setBellDropdownOpen(!bellDropdownOpen)}
              className="relative text-[#a7aaad] hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center scale-90">
                  {unreadCount}
                </span>
              )}
            </button>

            {bellDropdownOpen && (
              <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 text-gray-800 py-2">
                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                  <span className="font-extrabold text-xs text-gray-700">Bildirimler ({unreadCount})</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[10px] text-blue-600 hover:underline font-bold">
                      Tümünü Okundu Say
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notificationsList.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-6">Yeni bildirim bulunmuyor.</p>
                  ) : (
                    notificationsList.map(item => (
                      <Link
                        key={item.id}
                        to={item.linkUrl || '#'}
                        onClick={() => setBellDropdownOpen(false)}
                        className={cn(
                          "block px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-gray-50 text-left",
                          !item.isRead ? "bg-blue-50/40" : ""
                        )}
                      >
                        <p className={cn("text-xs font-bold text-gray-800", !item.isRead ? "text-blue-900" : "")}>{item.title}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{item.message}</p>
                        <span className="text-[9px] text-gray-400 mt-1 block">
                          {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
                const exactPaths = ['/admin', '/admin/google'];
                const isActive = location.pathname === item.path ||
                  (!exactPaths.includes(item.path) && location.pathname.startsWith(item.path));
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
          <div className="md:hidden flex items-center justify-between p-3 bg-[#1d2327] text-white border-b border-gray-800 sticky top-0 z-30">
            <div className="flex items-center">
              <button
                className="p-1 mr-3 text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-sm font-bold tracking-tight">Kerim Bilgisayar</h1>
            </div>
            
            {/* Mobile Bell Button */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellDropdownOpen(!bellDropdownOpen)}
                className="relative p-1 text-gray-400 hover:text-white cursor-pointer flex items-center justify-center"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center scale-90">
                    {unreadCount}
                  </span>
                )}
              </button>

              {bellDropdownOpen && (
                <div className="absolute right-0 top-9 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 text-gray-800 py-2">
                  <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <span className="font-extrabold text-xs text-gray-700">Bildirimler ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[10px] text-blue-600 hover:underline font-bold">
                        Hepsini Oku
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notificationsList.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-6">Bildirim yok.</p>
                    ) : (
                      notificationsList.map(item => (
                        <Link
                          key={item.id}
                          to={item.linkUrl || '#'}
                          onClick={() => setBellDropdownOpen(false)}
                          className={cn(
                            "block px-4 py-2 hover:bg-slate-50 transition-colors border-b border-gray-50 text-left text-xs",
                            !item.isRead ? "bg-blue-50/40" : ""
                          )}
                        >
                          <p className="font-bold text-gray-800">{item.title}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-2">{item.message}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Page Content */}
          <main className="flex-1 p-4 sm:p-5 lg:p-6 bg-[#f0f0f1] text-[#3c434a]">
            <Outlet />
          </main>

          {/* Footer Version Info */}
          <footer className="py-4 text-center text-xs text-gray-400 bg-[#f0f0f1] shrink-0 mb-12 md:mb-0">
            Kerim Bilgisayar Yönetim Paneli • <span className="font-semibold text-gray-500">v1.2.0</span>
          </footer>

          {/* Mobile Bottom Navigation Bar (for Webviews / Native feel) */}
          <div className="md:hidden sticky bottom-0 bg-[#1d2327] text-gray-400 border-t border-gray-800 flex justify-around py-2 z-40 shrink-0">
            <Link to="/admin" className={cn("flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors", location.pathname === '/admin' ? 'text-[#72aee6]' : 'hover:text-white')}>
              <LayoutDashboard className="w-5 h-5" />
              <span>Panel</span>
            </Link>
            <Link to="/admin/servis" className={cn("flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors", location.pathname.startsWith('/admin/servis') ? 'text-[#72aee6]' : 'hover:text-white')}>
              <Wrench className="w-5 h-5" />
              <span>Servis</span>
            </Link>
            <Link to="/admin/satis-pos" className={cn("flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors", location.pathname.startsWith('/admin/satis-pos') ? 'text-[#72aee6]' : 'hover:text-white')}>
              <Store className="w-5 h-5" />
              <span>POS</span>
            </Link>
            <Link to="/admin/ortam" className={cn("flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors", location.pathname.startsWith('/admin/ortam') ? 'text-[#72aee6]' : 'hover:text-white')}>
              <ImageIcon className="w-5 h-5" />
              <span>Medya</span>
            </Link>
            <Link to="/admin/ayarlar" className={cn("flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors", location.pathname.startsWith('/admin/ayarlar') ? 'text-[#72aee6]' : 'hover:text-white')}>
              <Settings className="w-5 h-5" />
              <span>Ayarlar</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
