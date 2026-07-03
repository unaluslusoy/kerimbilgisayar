import React, { useState, useEffect } from 'react';
import { Plus, Layout, Type, Edit, Trash2, Settings, ArrowRight, X } from 'lucide-react';
import { adminRequest } from '../../lib/api';
import { Link } from 'react-router-dom';

export default function AdminLayouts() {
  const [layouts, setLayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeLayout, setActiveLayout] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  // New Layout Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newLayoutData, setNewLayoutData] = useState({ name: '', type: 'header', isDefault: false });

  const load = async () => {
    try {
      const data = await adminRequest('/api/admin/layouts');
      setLayouts(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreateLayout = async () => {
    try {
      await adminRequest('/api/admin/layouts', {
        method: 'POST',
        body: JSON.stringify(newLayoutData)
      });
      setShowNewModal(false);
      setNewLayoutData({ name: '', type: 'header', isDefault: false });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openAssignments = async (layout: any) => {
    setActiveLayout(layout);
    try {
      const data = await adminRequest(`/api/admin/layouts/${layout.id}/assignments`);
      setAssignments(data);
      setShowAssignModal(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await adminRequest(`/api/admin/layouts/${activeLayout.id}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          conditionType: formData.get('conditionType'),
          conditionValue: formData.get('conditionValue'),
          priority: parseInt(formData.get('priority') as string || '0')
        })
      });
      openAssignments(activeLayout); // Refresh
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    try {
      await adminRequest(`/api/admin/layouts/assignments/${id}`, { method: 'DELETE' });
      openAssignments(activeLayout);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Şablonlar (Template Builder)</h1>
          <p className="text-sm text-gray-500 mt-1">Sitenizin header, footer, ürün ve diğer sayfa şablonlarını yönetin.</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-theme text-sm font-medium flex items-center transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Yeni Şablon
        </button>
      </div>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {layouts.map(layout => (
            <div key={layout.id} className="bg-white border border-gray-200 rounded-theme p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Layout className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{layout.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{layout.type} {layout.isDefault ? '(Varsayılan)' : ''}</p>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2">
                <button onClick={() => openAssignments(layout)} className="flex-1 text-center py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors">
                  Koşullar
                </button>
                <Link to={`/admin/builder/${layout.id}`} className="flex-1 text-center py-2 bg-primary hover:bg-secondary text-white rounded text-sm font-medium transition-colors">
                  Düzenle
                </Link>
              </div>
            </div>
          ))}
          {layouts.length === 0 && <p className="text-gray-500">Henüz bir şablon bulunmuyor.</p>}
        </div>
      )}

      {/* New Layout Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Yeni Şablon Oluştur</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şablon Adı</label>
                <input type="text" className="w-full border-gray-300 rounded focus:ring-primary focus:border-primary" value={newLayoutData.name} onChange={e => setNewLayoutData({...newLayoutData, name: e.target.value})} placeholder="Örn: Global Header" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipi</label>
                <select className="w-full border-gray-300 rounded focus:ring-primary focus:border-primary" value={newLayoutData.type} onChange={e => setNewLayoutData({...newLayoutData, type: e.target.value})}>
                  <option value="header">Header (Üst Kısım)</option>
                  <option value="footer">Footer (Alt Kısım)</option>
                  <option value="single_product">Ürün Detay Sayfası</option>
                  <option value="archive">Arşiv / Kategori Sayfası</option>
                  <option value="popup">Popup / Modal</option>
                </select>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="isDef" className="rounded text-primary focus:ring-primary mr-2" checked={newLayoutData.isDefault} onChange={e => setNewLayoutData({...newLayoutData, isDefault: e.target.checked})} />
                <label htmlFor="isDef" className="text-sm font-medium text-gray-700">Varsayılan Şablon Olarak Ayarla</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-gray-600 font-medium">İptal</button>
                <button onClick={handleCreateLayout} className="px-4 py-2 bg-primary text-white rounded font-medium">Oluştur</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Modal */}
      {showAssignModal && activeLayout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Koşullu Atamalar: {activeLayout.name}</h2>
              <button onClick={() => setShowAssignModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Mevcut Koşullar</h3>
              <ul className="space-y-2">
                {assignments.map(a => (
                  <li key={a.id} className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-100">
                    <div>
                      <span className="font-medium">{a.conditionType}</span>
                      {a.conditionValue && <span className="text-gray-500 ml-2">({a.conditionValue})</span>}
                      <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded ml-3">Öncelik: {a.priority}</span>
                    </div>
                    <button onClick={() => handleDeleteAssignment(a.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
                {assignments.length === 0 && <p className="text-sm text-gray-500">Bu şablona atanmış özel bir koşul yok (Varsayılan olarak çalışır).</p>}
              </ul>
            </div>

            <form onSubmit={handleAddAssignment} className="bg-gray-50 p-4 rounded border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Yeni Koşul Ekle</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Koşul Tipi</label>
                  <select name="conditionType" className="w-full text-sm border-gray-300 rounded focus:ring-primary focus:border-primary">
                    <option value="all">Tüm Site</option>
                    <option value="homepage">Sadece Anasayfa</option>
                    <option value="category">Belirli Kategori</option>
                    <option value="specific_page">Belirli Sayfa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Değer (ID veya Slug)</label>
                  <input type="text" name="conditionValue" className="w-full text-sm border-gray-300 rounded focus:ring-primary focus:border-primary" placeholder="Tüm site için boş bırakın" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Öncelik (Yüksek kazanır)</label>
                  <input type="number" name="priority" defaultValue="0" className="w-full text-sm border-gray-300 rounded focus:ring-primary focus:border-primary" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded text-sm font-medium">Koşul Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
