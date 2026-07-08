import { useState, useEffect } from 'react';
import { adminRequest } from '../../../lib/api';
import {
  BarChart3, Loader2, Users, Search, MousePointerClick,
  Phone, Map, Globe, RefreshCw, AlertTriangle
} from 'lucide-react';

const DAY_OPTIONS = [
  { label: 'Son 30 Gün', value: 30 },
  { label: 'Son 60 Gün', value: 60 },
  { label: 'Son 90 Gün', value: 90 },
];

interface MetricValue {
  metric: string;
  totalValue: { value: number };
}

export default function AdminGoogleInsights() {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [insights, setInsights] = useState<MetricValue[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchInsights = async (d: number) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await adminRequest('/api/admin/plugins/google-business/insights', {
        method: 'POST',
        body: JSON.stringify({ days: d }),
      });
      if (data?.locationMetrics?.[0]?.metricValues) {
        setInsights(data.locationMetrics[0].metricValues);
      } else {
        setInsights([]);
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInsights(days); }, []);

  const handleDayChange = (d: number) => {
    setDays(d);
    fetchInsights(d);
  };

  const getMetric = (name: string) => {
    if (!insights) return 0;
    const m = insights.find((x) => x.metric === name);
    return m?.totalValue?.value || 0;
  };

  const directQueries = getMetric('QUERIES_DIRECT');
  const indirectQueries = getMetric('QUERIES_INDIRECT');
  const totalQueries = directQueries + indirectQueries;

  const viewsMaps = getMetric('VIEWS_MAPS');
  const viewsSearch = getMetric('VIEWS_SEARCH');
  const totalViews = viewsMaps + viewsSearch;

  const actionWebsite = getMetric('ACTIONS_WEBSITE');
  const actionPhone = getMetric('ACTIONS_PHONE');
  const actionDirections = getMetric('ACTIONS_DRIVING_DIRECTIONS');
  const totalActions = actionWebsite + actionPhone + actionDirections;

  const fmt = (n: number) => n.toLocaleString('tr-TR');
  const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

  if (errorMsg && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-red-100">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Google Hesabınız Bağlı Değil</h2>
        <p className="text-gray-500 mb-6 text-center max-w-md">{errorMsg}</p>
        <a href="/admin/eklentiler" className="px-5 py-2.5 bg-primary text-white font-medium rounded-theme hover:bg-secondary">
          Eklentiler Sayfasına Git
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            İşletme İstatistikleri
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Google Haritalar arama, görüntülenme ve etkileşim raporları.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Day range tabs */}
          <div className="flex bg-gray-100 rounded-theme p-0.5">
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleDayChange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  days === opt.value
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchInsights(days)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-theme hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-gray-500">İstatistikler yükleniyor...</p>
          </div>
        </div>
      ) : !insights || insights.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <BarChart3 className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">İstatistik verisi bulunamadı.</p>
          <p className="text-sm text-gray-400 mt-1">Seçilen dönemde yeterli veri bulunmuyor olabilir.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Toplam Arama</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{fmt(totalQueries)}</h3>
                {totalQueries > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Doğrudan: {fmt(directQueries)} · Keşif: {fmt(indirectQueries)}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Toplam Görüntülenme</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{fmt(totalViews)}</h3>
                {totalViews > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Harita: {fmt(viewsMaps)} · Arama: {fmt(viewsSearch)}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <MousePointerClick className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Müşteri Eylemleri</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{fmt(totalActions)}</h3>
                {totalActions > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Web: {fmt(actionWebsite)} · Telefon: {fmt(actionPhone)} · Yol: {fmt(actionDirections)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Detail cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Görüntülenme platformları */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">
                Görüntülenme Platformları
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Google Haritalar', icon: Map, value: viewsMaps, total: totalViews, color: 'bg-blue-500' },
                  { label: 'Google Arama', icon: Globe, value: viewsSearch, total: totalViews, color: 'bg-indigo-500' },
                ].map(({ label, icon: Icon, value, total, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700 flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-gray-400" /> {label}
                      </span>
                      <span className="font-bold text-gray-900">{fmt(value)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct(value, total)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct(value, total)}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Müşteri eylemleri */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">
                Müşteri Eylemleri
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Web Sitesi Ziyareti', icon: Globe, value: actionWebsite, total: totalActions, color: 'bg-teal-500' },
                  { label: 'Telefon Tıklamaları', icon: Phone, value: actionPhone, total: totalActions, color: 'bg-green-500' },
                  { label: 'Yol Tarifi İstekleri', icon: Map, value: actionDirections, total: totalActions, color: 'bg-yellow-500' },
                ].map(({ label, icon: Icon, value, total, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700 flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-gray-400" /> {label}
                      </span>
                      <span className="font-bold text-gray-900">{fmt(value)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct(value, total)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct(value, total)}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Arama dağılımı */}
            {totalQueries > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                <h3 className="text-sm font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">
                  Arama Kaynakları
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    {
                      label: 'Doğrudan Aramalar',
                      desc: 'İşletme adınızı veya adresinizi doğrudan arayan kullanıcılar',
                      value: directQueries,
                      total: totalQueries,
                      color: 'bg-blue-500',
                    },
                    {
                      label: 'Keşif Aramaları',
                      desc: 'Sunduğunuz ürün/hizmet kategorisini arayan kullanıcılar',
                      value: indirectQueries,
                      total: totalQueries,
                      color: 'bg-purple-500',
                    },
                  ].map(({ label, desc, value, total, color }) => (
                    <div key={label} className="space-y-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-800">{label}</span>
                        <span className="font-bold text-gray-900">{fmt(value)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${pct(value, total)}%` }} />
                      </div>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
