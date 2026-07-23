import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Wrench, Users, Package, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { fetchAdminReportSummary } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function AdminReports() {
  usePageTitle('Raporlar');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'genel' | 'servis' | 'finans' | 'stok'>('genel');

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchAdminReportSummary({ startDate, endDate });
      setData(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [startDate, endDate]);

  const formatMoney = (val: any) => {
    const n = parseFloat(val);
    return isNaN(n) ? '₺0' : `₺${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
  };

  const tabs = [
    { key: 'genel', label: 'Genel Özet', icon: BarChart3 },
    { key: 'servis', label: 'Servis', icon: Wrench },
    { key: 'finans', label: 'Finans', icon: DollarSign },
    { key: 'stok', label: 'Stok', icon: Package },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Raporlar
          </h1>
          <p className="text-sm text-gray-500 mt-1">Detaylı iş analitikleri ve performans raporları.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-theme px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-theme px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-theme w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-theme text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary KPI Cards */}
      {activeTab === 'genel' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-theme"><Wrench className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Servis Kayıtları</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.ticketCount ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-theme"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Toplam Gelir</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatMoney(data?.totalRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 rounded-theme"><TrendingDown className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Toplam Gider</p>
                  <p className="text-2xl font-bold text-red-600">{formatMoney(data?.totalExpenses)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-theme ${(data?.netProfit ?? 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <DollarSign className={`w-5 h-5 ${(data?.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Net Kâr/Zarar</p>
                  <p className={`text-2xl font-bold ${(data?.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMoney(data?.netProfit)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          {data?.dailyRevenue?.length > 0 && (
            <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">Günlük Gelir Trendi</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dailyRevenue} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: any) => [`₺${Number(value).toLocaleString('tr-TR')}`, 'Gelir']}
                    />
                    <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* Service Tab */}
      {activeTab === 'servis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Servis Türü Dağılımı</h3>
            {data?.ticketTypeDistribution?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.ticketTypeDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                      {data.ticketTypeDistribution.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Veri bulunamadı</div>
            )}
          </div>

          <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Durum Özeti</h3>
            {data?.ticketStatusSummary?.length > 0 ? (
              <div className="space-y-3">
                {data.ticketStatusSummary.map((item: any, i: number) => {
                  const total = data.ticketStatusSummary.reduce((s: number, it: any) => s + it.count, 0);
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-semibold text-gray-800">{item.count} <span className="text-gray-400 font-normal">(%{pct})</span></span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Veri bulunamadı</div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Ortalama Çözüm Süresi (gün)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-theme">
                <p className="text-3xl font-bold text-blue-600">{data?.avgResolutionDays ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-1">Ortalama</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-theme">
                <p className="text-3xl font-bold text-green-600">{data?.resolvedCount ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Çözülen</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-theme">
                <p className="text-3xl font-bold text-amber-600">{data?.pendingCount ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Bekleyen</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-theme">
                <p className="text-3xl font-bold text-purple-600">{data?.newCustomerCount ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Yeni Müşteri</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finance Tab */}
      {activeTab === 'finans' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 mb-2">Ödeme Yöntemi Dağılımı</p>
              {data?.paymentMethodDistribution?.length > 0 ? (
                <div className="space-y-2">
                  {data.paymentMethodDistribution.map((pm: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{pm.method}</span>
                      <span className="font-semibold">{formatMoney(pm.total)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Veri yok</p>}
            </div>
            <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 mb-2">Gider Kategorileri</p>
              {data?.expenseCategories?.length > 0 ? (
                <div className="space-y-2">
                  {data.expenseCategories.map((cat: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{cat.category || 'Diğer'}</span>
                      <span className="font-semibold text-red-600">{formatMoney(cat.total)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Veri yok</p>}
            </div>
            <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 mb-2">Fatura Durumu</p>
              {data?.invoiceStatusSummary?.length > 0 ? (
                <div className="space-y-2">
                  {data.invoiceStatusSummary.map((inv: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{inv.status}</span>
                      <span className="font-semibold">{inv.count} adet — {formatMoney(inv.total)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Veri yok</p>}
            </div>
          </div>
        </div>
      )}

      {/* Stock Tab */}
      {activeTab === 'stok' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">En Çok Satılan Ürünler</h3>
            {data?.topSellingProducts?.length > 0 ? (
              <div className="space-y-3">
                {data.topSellingProducts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-theme hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{p.totalSold} adet</p>
                      <p className="text-[10px] text-gray-400">{formatMoney(p.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="py-8 text-center text-gray-400 text-sm">Veri yok</div>}
          </div>
          <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Kritik Stok Uyarıları</h3>
            {data?.lowStockItems?.length > 0 ? (
              <div className="space-y-2">
                {data.lowStockItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-theme bg-red-50/50 border border-red-100">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-[10px] text-gray-400">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{item.currentStock} adet</p>
                      <p className="text-[10px] text-gray-400">Min: {item.minStockLevel}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-green-500 text-sm">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Tüm stoklar normal seviyede
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
