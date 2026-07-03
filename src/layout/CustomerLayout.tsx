import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { LayoutDashboard, FileText, User, LogOut } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function CustomerLayout() {
  const { isAuthenticated, logout, user } = useCustomerAuth();
  const location = useLocation();
  const { settings } = useSettings();

  if (!isAuthenticated) {
    return <Navigate to="/musteri/giris" state={{ from: location }} replace />;
  }

  const menuItems = [
    { name: 'Özet', path: '/musteri/panel', icon: LayoutDashboard },
    { name: 'Servis Kayıtlarım', path: '/musteri/servis-gecmisi', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link to="/" className="text-xl font-bold text-gray-900 truncate block">
            {settings.site_name || 'Servis'} - Müşteri
          </Link>
        </div>

        <div className="p-4 flex-1">
          <div className="mb-6 px-2">
            <p className="text-sm text-gray-500">Hoş geldiniz,</p>
            <p className="font-medium text-gray-900 truncate">{user?.name}</p>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-theme transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-theme text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
