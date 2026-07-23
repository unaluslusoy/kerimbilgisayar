import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, CheckCheck, Trash2, Calendar, Search, 
  ArrowRight, Check, Eye, Send, Users, MessageSquare, X
} from 'lucide-react';
import { fetchAdminNotifications, markNotificationsAsRead, adminRequest, fetchAdminCustomers } from '../../lib/api';
import { cn } from '../../lib/utils';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk WhatsApp States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bulkTarget, setBulkTarget] = useState<'all' | 'bireysel' | 'kurumsal'>('all');
  const [bulkMsg, setBulkMsg] = useState('Sayın Müşterimiz, Kerim Bilgisayar avantajlı periyodik bakım fırsatlarını kaçırmayın!');

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (e) {
      console.error('Bildirimler yuklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      // Tekil okundu api endpoint
      await adminRequest(`/api/admin/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    if (!confirm('Bu bildirimi silmek istediginizden emin misiniz?')) return;
    try {
      await adminRequest(`/api/admin/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'unread' && !n.isRead) || 
      (filter === 'read' && n.isRead);

    const matchesSearch = 
      searchQuery === '' || 
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Sistem Bildirimleri</h1>
            <p className="text-xs text-gray-500 font-medium">Sistem tarafından üretilen tüm arıza, onay ve işlem bildirimleri</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setShowBulkModal(true);
              if (customers.length === 0) {
                const custs = await fetchAdminCustomers().catch(() => []);
                setCustomers(custs || []);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-green-600" /> Toplu WhatsApp Gönder
          </button>
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-secondary rounded-xl transition-all shadow-sm"
            >
              <CheckCheck className="w-4 h-4" /> Tümünü Okundu İşaretle
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all",
              filter === 'all' 
                ? "bg-slate-100 border-slate-200 text-slate-800" 
                : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"
            )}
          >
            Tümü ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all",
              filter === 'unread' 
                ? "bg-blue-50 border-blue-100 text-blue-700" 
                : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"
            )}
          >
            Okunmamış ({notifications.filter(n => !n.isRead).length})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all",
              filter === 'read' 
                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"
            )}
          >
            Okunmuş ({notifications.filter(n => n.isRead).length})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Bildirimlerde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400 font-bold">Bildirimler yükleniyor...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-3">
              <Bell className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-gray-800">Gösterilecek bildirim bulunamadı.</p>
            <p className="text-xs text-gray-400 mt-1">Seçtiğiniz filtrelere uygun bildirim kaydı yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-5 flex justify-between items-start gap-4 transition-all hover:bg-slate-50/50",
                  !item.isRead ? "bg-blue-50/20" : ""
                )}
              >
                <div className="flex gap-3.5 items-start min-w-0 flex-1">
                  <div className={cn(
                    "p-2.5 rounded-xl shrink-0 mt-0.5",
                    !item.isRead ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                  )}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={cn(
                        "text-sm font-bold text-gray-800",
                        !item.isRead ? "text-blue-900" : ""
                      )}>
                        {item.title}
                      </h3>
                      {!item.isRead && (
                        <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">YENİ</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold pt-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.linkUrl && (
                    <Link
                      to={item.linkUrl}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg transition-colors flex items-center justify-center"
                      title="Detaya Git"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkOneRead(item.id)}
                      className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-150 text-blue-600 hover:text-blue-800 rounded-lg transition-colors flex items-center justify-center"
                      title="Okundu İşaretle"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNotification(item.id)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-150 text-red-600 hover:text-red-800 rounded-lg transition-colors flex items-center justify-center"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toplu WhatsApp Kampanyası Modalı */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBulkModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-green-600" />
                <h3 className="text-base font-bold text-gray-900">Toplu WhatsApp Duyuru & Kampanya</h3>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {(() => {
              const filteredCusts = customers.filter(c => {
                if (!c.phone) return false;
                if (bulkTarget === 'bireysel') return c.customerType === 'bireysel';
                if (bulkTarget === 'kurumsal') return c.customerType === 'kurumsal' || c.companyName;
                return true;
              });

              return (
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Hedef Müşteri Grubu</label>
                    <div className="flex gap-2">
                      {[
                        { key: 'all', label: `Tüm Müşteriler (${customers.filter(c => c.phone).length})` },
                        { key: 'bireysel', label: 'Bireysel' },
                        { key: 'kurumsal', label: 'Kurumsal' },
                      ].map(t => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setBulkTarget(t.key as any)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                            bulkTarget === t.key ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Kampanya / Duyuru Mesajı</label>
                    <textarea
                      rows={4}
                      value={bulkMsg}
                      onChange={e => setBulkMsg(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="Duyuru mesajı yazın..."
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 p-3 rounded-xl">
                    <p className="text-xs font-semibold text-green-800">
                      Seçilen Hedef Alıcı Sayısı: <span className="font-extrabold">{filteredCusts.length} Kişi</span>
                    </p>
                    <p className="text-[10px] text-green-600 mt-0.5">
                      Mesajlar müşterilerin WhatsApp hatlarına sırayla açılacaktır.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50">İptal</button>
                    <button
                      onClick={() => {
                        if (filteredCusts.length === 0) {
                          alert('Telefon numarası olan müşteri bulunamadı!');
                          return;
                        }
                        const firstCust = filteredCusts[0];
                        const phone = firstCust.phone.replace(/\D/g, '').startsWith('0') ? '90' + firstCust.phone.replace(/\D/g, '').substring(1) : firstCust.phone.replace(/\D/g, '').startsWith('90') ? firstCust.phone.replace(/\D/g, '') : '90' + firstCust.phone.replace(/\D/g, '');
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(bulkMsg)}`, '_blank');
                        alert(`İlk müşteri (${firstCust.firstName || firstCust.companyName}) için WhatsApp açıldı. Toplam ${filteredCusts.length} hedef alıcı mevcut.`);
                        setShowBulkModal(false);
                      }}
                      disabled={filteredCusts.length === 0}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> WhatsApp Kampanyasını Başlat
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
