import React, { useEffect, useState } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { Package, Clock, CheckCircle, Wrench, AlertCircle, ArrowRight, CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  yeni: { label: 'Servise Alındı', color: 'bg-blue-100 text-blue-800', icon: Package },
  isleme_alindi: { label: 'İşlemde', color: 'bg-yellow-100 text-yellow-800', icon: Wrench },
  parca_bekliyor: { label: 'Parça Bekleniyor', color: 'bg-orange-100 text-orange-800', icon: Clock },
  musteri_onayi_bekliyor: { label: 'Onay Bekleniyor', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  onarimda: { label: 'Onarımda', color: 'bg-indigo-100 text-indigo-800', icon: Wrench },
  cozuldu: { label: 'Çözüldü', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  kapatildi: { label: 'Teslim Edildi', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  iptal: { label: 'İptal', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-6 bg-gray-200 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="p-5 border-b border-gray-100 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-3 bg-gray-200 rounded w-48" />
        <div className="h-3 bg-gray-200 rounded w-36" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-20" />
    </div>
  );
}

export default function CustomerDashboard() {
  const { token, user } = useCustomerAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setTickets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [token]);

  const activeTickets = tickets.filter(t => !['cozuldu', 'kapatildi', 'iptal'].includes(t.status));
  const completedTickets = tickets.filter(t => ['cozuldu', 'kapatildi'].includes(t.status));
  const awaitingApproval = tickets.filter(t => t.status === 'musteri_onayi_bekliyor');
  const recentTickets = tickets.slice(0, 5);

  const stats = [
    {
      label: 'Toplam Kayıt',
      value: tickets.length,
      icon: Package,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      description: 'Tüm servis kayıtları',
    },
    {
      label: 'Aktif İşlemler',
      value: activeTickets.length,
      icon: Wrench,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      description: 'Devam eden servisler',
    },
    {
      label: 'Tamamlanan',
      value: completedTickets.length,
      icon: CheckCircle,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      description: 'Çözülen & teslim edilenler',
    },
    {
      label: 'Onay Bekliyor',
      value: awaitingApproval.length,
      icon: AlertCircle,
      iconBg: awaitingApproval.length > 0 ? 'bg-red-50' : 'bg-gray-50',
      iconColor: awaitingApproval.length > 0 ? 'text-red-600' : 'text-gray-400',
      description: awaitingApproval.length > 0 ? 'Aksiyon gerekiyor!' : 'Bekleyen onay yok',
      urgent: awaitingApproval.length > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hoş geldiniz{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-sm text-gray-500 mt-1">Servis kayıtlarınıza genel bakış</p>
        </div>
        <Link
          to="/randevu"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
        >
          <CalendarPlus className="w-4 h-4" />
          Yeni Servis Talebi
        </Link>
      </div>

      {/* Onay Bekliyor Uyarısı */}
      {!loading && awaitingApproval.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">
              {awaitingApproval.length} servis kaydınız onayınızı bekliyor
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Lütfen servis geçmişinizi inceleyerek onaylayın veya red edin.
            </p>
          </div>
          <Link
            to="/musteri/servis-gecmisi"
            className="ml-auto text-xs font-semibold text-red-700 hover:text-red-900 whitespace-nowrap underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-sm"
          >
            İncele →
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((stat, i) => (
              <div
                key={i}
                className={`bg-white rounded-xl shadow-sm p-5 border transition-shadow hover:shadow-md ${
                  stat.urgent ? 'border-red-200 ring-1 ring-red-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{stat.label}</p>
                <p className={`text-xs mt-1 ${stat.urgent ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                  {stat.description}
                </p>
              </div>
            ))}
      </div>

      {/* Recent Tickets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900">Son Servis Kayıtları</h2>
          <Link
            to="/musteri/servis-gecmisi"
            className="text-sm text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-sm"
          >
            Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
          ) : recentTickets.length === 0 ? (
            <div className="py-14 text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">Henüz servis kaydınız bulunmuyor.</p>
              <Link
                to="/randevu"
                className="mt-4 inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-semibold"
              >
                İlk servis talebinizi oluşturun <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            recentTickets.map(ticket => {
              const status = STATUS_MAP[ticket.status] || STATUS_MAP['yeni'];
              const StatusIcon = status.icon;
              return (
                <div key={ticket.id} className="p-5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg shrink-0 mt-0.5">
                        <Wrench className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{ticket.ticketNumber}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {ticket.deviceBrand
                            ? `${ticket.deviceBrand} ${ticket.deviceModel || ''}`.trim()
                            : ticket.deviceType || 'Bilinmeyen Cihaz'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ticket.subject}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-10 sm:pl-0">
                      <p className="text-xs text-gray-400">
                        {new Date(ticket.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      {parseFloat(ticket.cost || 0) > 0 && (
                        <p className="text-sm font-bold text-gray-800 mt-1">
                          ₺{parseFloat(ticket.cost).toLocaleString('tr-TR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
