import { useState, useEffect } from 'react';
import { Puzzle, ShieldAlert, MonitorPlay, BarChart, CheckCircle, XCircle } from 'lucide-react';
import { adminRequest } from '../../lib/api';

const AVAILABLE_PLUGINS = [
  {
    id: 'google-business',
    name: 'Google My Business',
    description: 'Google Haritalar işletme puanınızı ve yorumlarınızı sitenizin alt kısmında (footer) canlı olarak gösterir. Ziyaretçilere güven verir.',
    icon: BarChart,
    color: 'text-primary',
    bg: 'bg-blue-50',
    type: 'Marketing'
  },
  {
    id: 'maintenance-mode',
    name: 'Bakım Modu',
    description: 'Sitenizi ziyaretçilere kapatarak "Kısa Bir Süreliğine Bakımdayız" mesajı gösterir. Yöneticiler paneli kullanmaya devam edebilir.',
    icon: ShieldAlert,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    type: 'System'
  },
  {
    id: 'advanced-seo',
    name: 'Gelişmiş SEO ve Analitik',
    description: 'Tüm sayfalarda geçerli Google Analytics, Facebook Pixel ve Meta etiketlerini yönetebileceğiniz ekstra bir alan açar.',
    icon: MonitorPlay,
    color: 'text-green-600',
    bg: 'bg-green-50',
    type: 'Marketing'
  }
];

export default function AdminPlugins() {
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlugins = async () => {
    try {
      const data = await adminRequest('/api/admin/plugins');
      setPlugins(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const togglePlugin = async (pluginId: string, currentStatus: boolean) => {
    try {
      await adminRequest('/api/admin/plugins/toggle', {
        method: 'POST',
        body: JSON.stringify({ pluginId, isActive: !currentStatus })
      });
      await fetchPlugins(); // Refresh state
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Eklentiler & Modüller</h1>
        <p className="text-sm text-gray-500 mt-1">Sisteminize ekstra özellikler kazandıran eklentileri buradan yönetebilirsiniz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AVAILABLE_PLUGINS.map(plugin => {
          const dbPlugin = plugins.find(p => p.pluginId === plugin.id);
          const isActive = dbPlugin ? dbPlugin.isActive : false;
          
          return (
            <div key={plugin.id} className="bg-white border border-gray-200 rounded-theme p-6 flex flex-col relative overflow-hidden transition-shadow hover:shadow-md">
              {/* Badge */}
              <div className="absolute top-4 right-4 flex items-center space-x-1">
                {isActive ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" /> Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                    <XCircle className="w-3 h-3 mr-1" /> Pasif
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4 mb-4 mt-2">
                <div className={`p-3 rounded-theme ${plugin.bg}`}>
                  <plugin.icon className={`w-6 h-6 ${plugin.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 leading-tight">{plugin.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plugin.type}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 flex-1 mb-6">
                {plugin.description}
              </p>

              <div className="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center">
                {isActive && plugin.id === 'google-business' ? (
                  <button className="text-sm text-primary font-medium hover:underline">Ayarlar</button>
                ) : (
                  <div></div>
                )}

                <button
                  onClick={() => togglePlugin(plugin.id, isActive)}
                  className={`px-4 py-2 rounded-theme text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                      : 'bg-primary text-white hover:bg-secondary'
                  }`}
                >
                  {isActive ? 'Devre Dışı Bırak' : 'Aktifleştir'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
