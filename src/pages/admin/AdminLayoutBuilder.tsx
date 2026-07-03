import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, GripVertical } from 'lucide-react';
import { adminRequest } from '../../lib/api';

export default function AdminLayoutBuilder() {
  const { id } = useParams();
  const [layout, setLayout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminRequest('/api/admin/layouts');
        const current = data.find((l: any) => l.id === parseInt(id || '0'));
        setLayout(current);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <p>Yükleniyor...</p>;
  if (!layout) return <p>Şablon bulunamadı.</p>;

  return (
    <div className="min-h-screen bg-gray-100 -m-6 p-6">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between mb-6 shadow-sm rounded-theme">
        <div className="flex items-center gap-4">
          <Link to="/admin/layouts" className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{layout.name} <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded ml-2">{layout.type}</span></h1>
            <p className="text-xs text-gray-500">Template Builder (Faz 4'te aktif olacak sürükle-bırak arayüzü)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-theme text-sm font-medium flex items-center transition-colors">
            <Save className="w-4 h-4 mr-2" /> Kaydet
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-140px)]">
        {/* Sol Panel: Bileşenler */}
        <div className="w-64 bg-white rounded-theme border border-gray-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">
            Bileşenler
          </div>
          <div className="p-4 space-y-2 overflow-y-auto flex-1">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded cursor-move flex items-center gap-2 hover:border-primary transition-colors">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">Header Menu</span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded cursor-move flex items-center gap-2 hover:border-primary transition-colors">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">Logo</span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded cursor-move flex items-center gap-2 hover:border-primary transition-colors">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">Mini Cart</span>
            </div>
          </div>
        </div>

        {/* Orta Panel: Canvas */}
        <div className="flex-1 bg-white rounded-theme border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center border-dashed">
          <p className="text-gray-500 mb-4">Şablonu buraya sürükleyip bırakarak oluşturabilirsiniz.</p>
          <div className="w-full max-w-4xl min-h-[200px] border-2 border-dashed border-gray-300 rounded bg-gray-50 flex items-center justify-center text-gray-400 font-medium">
            Header Bölgesi (Bırakma Alanı)
          </div>
        </div>

        {/* Sağ Panel: Ayarlar */}
        <div className="w-80 bg-white rounded-theme border border-gray-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">
            Ayarlar
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500 text-center py-10">Bileşen seçilmedi.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
