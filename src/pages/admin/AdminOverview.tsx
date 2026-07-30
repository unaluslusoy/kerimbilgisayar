import { useEffect, useState } from 'react';
import { ArrowUpRight, Wrench, Users, Inbox, Printer, Package, CheckCircle2, MessageSquare, CalendarCheck, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { fetchAdminStats, createBlogPost } from '../../lib/api';
import { Link } from 'react-router-dom';
import { cn, generateSlug } from '../../lib/utils';

const STATUS_COLORS_MAP: Record<string, string> = {
  'Yeni': '#10b981',
  'İşlemde': '#8b5cf6',
  'Parça Bekleniyor': '#f97316',
  'Onay Bekleniyor': '#3b82f6',
  'Çözüldü': '#6b7280',
  'Kapatıldı': '#374151',
  'İptal': '#ef4444',
  'Teslim Edildi': '#14b8a6',
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  'yeni': 'Yeni',
  'isleme_alindi': 'İşlemde',
  'parca_bekliyor': 'Parça Bekleniyor',
  'musteri_onayi_bekliyor': 'Onay Bekleniyor',
  'onarimda': 'Onarımda',
  'cozuldu': 'Çözüldü',
  'kapatildi': 'Kapatıldı',
  'iptal': 'İptal',
  'teslim_edildi': 'Teslim Edildi',
};

const STATUS_COLORS_TICKET: Record<string, string> = {
  'yeni': 'bg-blue-100 text-secondary',
  'isleme_alindi': 'bg-purple-100 text-purple-700',
  'parca_bekliyor': 'bg-orange-100 text-orange-700',
  'musteri_onayi_bekliyor': 'bg-blue-100 text-blue-700',
  'onarimda': 'bg-indigo-100 text-indigo-700',
  'cozuldu': 'bg-gray-100 text-gray-600',
  'kapatildi': 'bg-gray-100 text-gray-500',
  'iptal': 'bg-red-100 text-red-600',
  'teslim_edildi': 'bg-teal-100 text-teal-700',
};

export default function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quick Draft state
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState(false);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleQuickDraft = async () => {
    if (!draftTitle.trim()) return;
    setDraftSaving(true);
    try {
      await createBlogPost({
        title: draftTitle,
        content: draftContent || '',
        status: 'taslak',
        slug: generateSlug(draftTitle),
      });
      setDraftTitle('');
      setDraftContent('');
      setDraftSuccess(true);
      setTimeout(() => setDraftSuccess(false), 3000);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setDraftSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalRevVal = stats?.totalRevenue ? `₺${parseFloat(stats.totalRevenue).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : '₺0';

  const kpis = [
    { title: 'Toplam Servis Kaydı', value: stats?.ticketCount ?? '—', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'Tüm kayıtlar', link: '/admin/servis' },
    { title: 'Yeni / Bekleyen', value: stats?.newLeads ?? '—', icon: Inbox, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'İşlem bekliyor', link: '/admin/servis' },
    { title: 'Müşteri Sayısı', value: stats?.customerCount ?? '—', icon: Users, color: 'text-green-600', bg: 'bg-green-50', trend: 'Kayıtlı müşteri', link: '/admin/musteriler' },
    { title: 'Toplam Ciro', value: totalRevVal, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Başarılı satışlar', link: '/admin/pos' },
    { 
      title: 'Kritik Stok', 
      value: stats?.stockAlerts ?? 0, 
      icon: Package, 
      color: (stats?.stockAlerts ?? 0) > 0 ? 'text-red-600' : 'text-gray-400', 
      bg: (stats?.stockAlerts ?? 0) > 0 ? 'bg-red-50' : 'bg-gray-50', 
      trend: (stats?.stockAlerts ?? 0) > 0 ? 'Minimum seviye altında!' : 'Stok normal',
      link: '/admin/stok'
    },
    { title: 'Randevular', value: stats?.appointmentCount ?? '—', icon: CalendarCheck, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'Toplam randevu', link: '/admin/basvurular' },
    { title: 'Yeni Mesajlar', value: stats?.unreadMessages ?? stats?.messageCount ?? '—', icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-50', trend: 'İletişim formu', link: '/admin/mesajlar' },
  ];

  const pieColors = Object.values(STATUS_COLORS_MAP);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gösterge Paneli</h1>
        <p className="text-sm text-gray-500 mt-1">Sistem ve servis durumuna genel bakış.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {kpis.map((kpi, i) => (
          <Link key={i} to={kpi.link} className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 block">
            <div className={`p-2 rounded-theme ${kpi.bg} w-fit mb-3`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-xs text-gray-500 font-medium mb-0.5 leading-tight">{kpi.title}</p>
            <p className={`text-xl font-bold ${
              (i === 4 && (stats?.stockAlerts ?? 0) > 0) ? 'text-red-600' : 'text-gray-900'
            }`}>{kpi.value}</p>
            <p className={`text-[10px] mt-0.5 ${
              (i === 4 && (stats?.stockAlerts ?? 0) > 0) ? 'text-red-500 font-semibold' : 'text-gray-400'
            }`}>{kpi.trend}</p>
          </Link>
        ))}
      </div>

      {/* At a Glance & Quick Draft Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">Bir Bakışta</h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-2 text-sm"><Printer className="w-4 h-4 text-gray-400" /> Sayfalar</span>
                <Link to="/admin/sayfalar" className="font-bold text-primary hover:underline">{stats?.pageCount ?? 0}</Link>
              </li>
              <li className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-gray-400" /> Blog Yazıları</span>
                <Link to="/admin/blog" className="font-bold text-primary hover:underline">{stats?.blogCount ?? 0}</Link>
              </li>
              <li className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-2 text-sm"><Wrench className="w-4 h-4 text-gray-400" /> Servis Kayıtları</span>
                <Link to="/admin/servis" className="font-bold text-primary hover:underline">{stats?.ticketCount ?? 0}</Link>
              </li>
              <li className="flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-gray-400" /> Kullanıcılar</span>
                <Link to="/admin/kullanicilar" className="font-bold text-primary hover:underline">{stats?.userCount ?? 0}</Link>
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
            Node.js + MySQL · Kerim BT CMS
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">Hızlı Blog Taslağı</h3>
          {draftSuccess ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-theme border border-green-200">
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Taslak kaydedildi!</p>
                <p className="text-xs text-green-600 mt-0.5">Blog yazıları sayfasından düzenleyebilirsiniz.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Başlık"
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-theme px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
              <textarea
                rows={4}
                placeholder="İçerik (isteğe bağlı)..."
                value={draftContent}
                onChange={e => setDraftContent(e.target.value)}
                className="w-full border border-gray-300 rounded-theme px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleQuickDraft}
                  disabled={draftSaving || !draftTitle.trim()}
                  className="px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme transition-colors disabled:opacity-50"
                >
                  {draftSaving ? 'Kaydediliyor...' : 'Taslak Kaydet'}
                </button>
                <Link to="/admin/blog" className="text-sm text-primary hover:underline font-medium">
                  Blog Yazılarına Git →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie */}
        {stats?.statusDistribution?.length > 0 && (
          <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm min-w-0">
            <h3 className="text-base font-bold text-gray-900 mb-4">İşlem Durumları</h3>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.statusDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Placeholder if no distribution */}
        {(!stats?.statusDistribution || stats.statusDistribution.length === 0) && (
          <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Henüz servis kaydı yok</p>
            </div>
          </div>
        )}

        {/* Recent Tickets Table */}
        <div className="lg:col-span-2 bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-900">Son Servis Kayıtları</h3>
            <Link to="/admin/servis" className="text-sm text-primary font-medium hover:text-secondary flex items-center">
              Tümünü Gör <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {stats?.recentTickets?.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Takip No</th>
                    <th className="px-5 py-3 font-semibold">Müşteri</th>
                    <th className="px-5 py-3 font-semibold">Konu</th>
                    <th className="px-5 py-3 font-semibold">Durum</th>
                    <th className="px-5 py-3 font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentTickets.map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-mono text-xs font-bold text-gray-500">{t.ticketNumber}</td>
                      <td className="px-5 py-3 text-gray-700 text-xs">{t.customerName}</td>
                      <td className="px-5 py-3 text-gray-700 text-xs max-w-[180px] truncate">{t.subject}</td>
                      <td className="px-5 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', STATUS_COLORS_TICKET[t.status || 'yeni'])}>
                          {TICKET_STATUS_LABELS[t.status || 'yeni']}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Link 
                          to={`/print/ticket/${t.ticketNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-900 transition-colors"
                          title="Yazdır"
                        >
                          <Printer className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm font-medium">Henüz servis kaydı bulunmuyor</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sales Trend Chart */}
      {stats?.dailySales?.length > 0 && (
        <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Son 7 Günlük Satış Trendi</h3>
              <p className="text-xs text-gray-500 mt-0.5">Günlük ciro ve başarılı satış adeti takibi.</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Ciro (₺)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded-full"></span> Satış Adeti</span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailySales} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'amount') return [`₺${value.toLocaleString('tr-TR')}`, 'Ciro'];
                    if (name === 'count') return [`${value} adet`, 'Satış Adeti'];
                    return [value, name];
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="amount" />
                <Line yAxisId="right" type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#f59e0b', r: 3 }} name="count" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
