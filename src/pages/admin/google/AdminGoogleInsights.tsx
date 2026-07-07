import { useState, useEffect } from 'react';
import { adminRequest } from '../../../lib/api';
import { BarChart3, Loader2, Users, Search, MousePointerClick, Phone, Map, Globe } from 'lucide-react';

export default function AdminGoogleInsights() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);

  const fetchInsights = async () => {
    try {
      const data = await adminRequest('/api/admin/plugins/google-business/insights', {
        method: 'POST'
      });
      if (data && data.locationMetrics && data.locationMetrics.length > 0) {
        setInsights(data.locationMetrics[0].metricValues);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  // Helper to extract metric value safely
  const getMetric = (metricName: string) => {
    if (!insights) return 0;
    const m = insights.find((x: any) => x.metric === metricName);
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            İşletme İstatistikleri
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Son 3 aylık Google Haritalar arama, görüntülenme ve etkileşim raporlarınız.
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Veriler Google My Business API üzerinden anlık alınır.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !insights ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">İstatistik verisi bulunamadı.</p>
          <p className="text-sm text-gray-400 mt-1">İşletme hesabınızda henüz yeterli veri birikmemiş olabilir.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Toplam Arama</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalQueries.toLocaleString('tr-TR')}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Toplam Görüntülenme</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString('tr-TR')}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <MousePointerClick className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Müşteri Etkileşimleri</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalActions.toLocaleString('tr-TR')}</h3>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Görüntülenme Platformları</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 flex items-center gap-2"><Map className="w-4 h-4 text-gray-400"/> Google Haritalar</span>
                    <span className="font-bold">{viewsMaps.toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${totalViews > 0 ? (viewsMaps/totalViews)*100 : 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400"/> Google Arama Ağı</span>
                    <span className="font-bold">{viewsSearch.toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${totalViews > 0 ? (viewsSearch/totalViews)*100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Müşteri Eylemleri</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400"/> Web Sitesi Ziyareti</span>
                    <span className="font-bold">{actionWebsite.toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${totalActions > 0 ? (actionWebsite/totalActions)*100 : 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400"/> Telefon Tıklamaları</span>
                    <span className="font-bold">{actionPhone.toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${totalActions > 0 ? (actionPhone/totalActions)*100 : 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 flex items-center gap-2"><Map className="w-4 h-4 text-gray-400"/> Yol Tarifi İstekleri</span>
                    <span className="font-bold">{actionDirections.toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${totalActions > 0 ? (actionDirections/totalActions)*100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
