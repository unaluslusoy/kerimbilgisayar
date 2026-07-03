import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Menu, ArrowUp, ArrowDown, Save, Edit, X, Settings } from 'lucide-react';
import { fetchAdminMenus, createAdminMenu, createAdminMenuItem, deleteAdminMenuItem, reorderAdminMenuItems, adminRequest } from '../../lib/api';

export default function AdminMenus() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<any>(null);

  // New Menu form
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuLocation, setNewMenuLocation] = useState('header');
  const [creatingMenu, setCreatingMenu] = useState(false);

  // Edit Menu form
  const [showEditMenuModal, setShowEditMenuModal] = useState(false);
  const [editMenuName, setEditMenuName] = useState('');
  const [editMenuLocation, setEditMenuLocation] = useState('header');
  const [updatingMenu, setUpdatingMenu] = useState(false);

  // New Item form
  const [newItemForm, setNewItemForm] = useState({ title: '', url: '', target: '_self', parentId: '' });
  const [addingItem, setAddingItem] = useState(false);

  // Mega Menu Modal
  const [showMegaModal, setShowMegaModal] = useState(false);
  const [activeMegaItem, setActiveMegaItem] = useState<any>(null);
  const [megaMenuJson, setMegaMenuJson] = useState('');

  const load = async () => {
    try { 
      const d = await fetchAdminMenus(); 
      setMenus(d); 
      if (d.length > 0 && !activeMenu) {
        setActiveMenu(d[0]);
      } else if (d.length > 0 && activeMenu) {
        // refresh active menu data
        const updatedActive = d.find((m: any) => m.id === activeMenu.id);
        if (updatedActive) {
          // Sort items by displayOrder
          updatedActive.items = (updatedActive.items || []).sort((a:any, b:any) => a.displayOrder - b.displayOrder);
          setActiveMenu(updatedActive);
        } else {
          setActiveMenu(d[0]);
        }
      } else {
        setActiveMenu(null);
      }
    }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) return;
    setCreatingMenu(true);
    try {
      await createAdminMenu({ name: newMenuName, location: newMenuLocation });
      setNewMenuName('');
      setNewMenuLocation('header');
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setCreatingMenu(false); }
  };

  const handleOpenEditMenu = () => {
    if (!activeMenu) return;
    setEditMenuName(activeMenu.name);
    setEditMenuLocation(activeMenu.location || 'header');
    setShowEditMenuModal(true);
  };

  const handleUpdateMenu = async () => {
    if (!activeMenu || !editMenuName.trim()) return;
    setUpdatingMenu(true);
    try {
      await adminRequest(`/api/admin/menus/${activeMenu.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editMenuName, location: editMenuLocation })
      });
      setShowEditMenuModal(false);
      await load();
    } catch (e: any) {
      alert('Güncelleme hatası: ' + e.message);
    } finally {
      setUpdatingMenu(false);
    }
  };

  const handleDeleteMenu = async () => {
    if (!activeMenu) return;
    if (!confirm(`"${activeMenu.name}" menüsünü ve içindeki tüm bağlantıları kalıcı olarak silmek istediğinizden emin misiniz?`)) return;
    try {
      await adminRequest(`/api/admin/menus/${activeMenu.id}`, {
        method: 'DELETE'
      });
      setActiveMenu(null);
      await load();
    } catch (e: any) {
      alert('Silme hatası: ' + e.message);
    }
  };

  const handleAddItem = async () => {
    if (!activeMenu || !newItemForm.title || !newItemForm.url) return;
    setAddingItem(true);
    try {
      const payload = {
        title: newItemForm.title,
        url: newItemForm.url,
        target: newItemForm.target,
        parentId: newItemForm.parentId ? parseInt(newItemForm.parentId) : null
      };
      await createAdminMenuItem(activeMenu.id, payload);
      setNewItemForm({ title: '', url: '', target: '_self', parentId: '' });
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setAddingItem(false); }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Bu bağlantıyı kaldırmak istediğinize emin misiniz?')) return;
    try {
      await deleteAdminMenuItem(itemId);
      await load();
    } catch (e: any) { alert(e.message); }
  };

  const handleOpenMegaMenu = (item: any) => {
    setActiveMegaItem(item);
    setMegaMenuJson(item.megaMenu ? (typeof item.megaMenu === 'string' ? item.megaMenu : JSON.stringify(item.megaMenu, null, 2)) : '{\n  "columns": [\n    {\n      "title": "Kategori 1",\n      "links": []\n    }\n  ]\n}');
    setShowMegaModal(true);
  };

  const handleSaveMegaMenu = async () => {
    if (!activeMegaItem) return;
    try {
      let parsed = null;
      if (megaMenuJson.trim()) {
        parsed = JSON.parse(megaMenuJson);
      }
      await adminRequest(`/api/admin/menus/items/${activeMegaItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: activeMegaItem.title,
          url: activeMegaItem.url,
          target: activeMegaItem.target,
          parentId: activeMegaItem.parentId,
          megaMenu: parsed
        })
      });
      setShowMegaModal(false);
      await load();
    } catch (e: any) {
      alert('Mega menü JSON formatı hatalı: ' + e.message);
    }
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (!activeMenu || !activeMenu.items) return;
    const items = [...activeMenu.items];
    if (direction === 'up' && index > 0) {
      const temp = items[index];
      items[index] = items[index - 1];
      items[index - 1] = temp;
    } else if (direction === 'down' && index < items.length - 1) {
      const temp = items[index];
      items[index] = items[index + 1];
      items[index + 1] = temp;
    } else {
      return;
    }
    
    // Update displayOrder property
    items.forEach((item, i) => { item.displayOrder = i; });
    setActiveMenu({ ...activeMenu, items });
  };

  const [savingOrder, setSavingOrder] = useState(false);
  const handleSaveOrder = async () => {
    if (!activeMenu || !activeMenu.items) return;
    setSavingOrder(true);
    try {
      const payload = activeMenu.items.map((item: any) => ({ id: item.id, displayOrder: item.displayOrder }));
      await reorderAdminMenuItems(payload);
      alert('Sıralama başarıyla kaydedildi!');
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSavingOrder(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Menüler</h1>
        <p className="text-sm text-gray-500 mt-1">Sitenizin üst (Header) ve alt (Footer) kısım menü bağlantılarını düzenleyin.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar - Menus List & Add New */}
        <div className="w-full lg:w-1/3 space-y-6">
          
          <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Menü Seçimi</h2>
            <div className="space-y-1">
              {menus.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMenu(m)}
                  className={`w-full text-left px-3 py-2 rounded-theme text-sm font-medium transition-colors flex justify-between items-center ${
                    activeMenu?.id === m.id ? 'bg-primary text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{m.name}</span>
                  <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${activeMenu?.id === m.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {m.location === 'header' ? 'Üst' : 'Alt'}
                  </span>
                </button>
              ))}
              {menus.length === 0 && <p className="text-sm text-gray-500">Henüz menü yok.</p>}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Yeni Menü Oluştur</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Menü Adı</label>
                  <input 
                    type="text" 
                    value={newMenuName} 
                    onChange={e => setNewMenuName(e.target.value)}
                    placeholder="Örn: Footer Menü" 
                    className="w-full text-sm border border-gray-300 rounded-theme px-3 py-1.5 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Menü Konumu</label>
                    <select
                      value={newMenuLocation}
                      onChange={e => setNewMenuLocation(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-theme px-3 py-1.5 focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="header">Üst Menü (Header)</option>
                    <option value="footer">Alt Menü (Footer Kurumsal)</option>
                    <option value="footer_quick">Alt Menü (Footer Hızlı Bağlantılar)</option>
                    <option value="footer_bottom">Alt Menü (Footer En Alt Yasal Linkler)</option>
                  </select>
                </div>
                <button 
                  onClick={handleCreateMenu}
                  disabled={creatingMenu || !newMenuName.trim()}
                  className="w-full py-1.5 bg-primary hover:bg-secondary text-white rounded-theme text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Yeni Menü Ekle
                </button>
              </div>
            </div>
          </div>

          {activeMenu && (
            <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Bağlantı Ekle</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Başlık</label>
                  <input type="text" value={newItemForm.title} onChange={e => setNewItemForm({...newItemForm, title: e.target.value})} placeholder="Örn: Hakkımızda" className="w-full text-sm border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">URL / Bağlantı</label>
                  <input type="text" value={newItemForm.url} onChange={e => setNewItemForm({...newItemForm, url: e.target.value})} placeholder="Örn: /hakkimizda" className="w-full text-sm border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Açılış Hedefi</label>
                  <select value={newItemForm.target} onChange={e => setNewItemForm({...newItemForm, target: e.target.value})} className="w-full text-sm border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                    <option value="_self">Aynı Sekmede Aç</option>
                    <option value="_blank">Yeni Sekmede Aç</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Üst Menü (Opsiyonel)</label>
                  <select value={newItemForm.parentId} onChange={e => setNewItemForm({...newItemForm, parentId: e.target.value})} className="w-full text-sm border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                    <option value="">-- Ana Menü (En Üst Düzey) --</option>
                    {activeMenu.items?.filter((i: any) => !i.parentId).map((item: any) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={handleAddItem}
                  disabled={addingItem || !newItemForm.title || !newItemForm.url}
                  className="w-full py-2 bg-primary hover:bg-secondary text-white rounded-theme text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Menüye Ekle
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Content - Menu Items Editor */}
        <div className="w-full lg:w-2/3">
          {activeMenu ? (
            <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-display">{activeMenu.name} Yapısı</h2>
                  <div className="flex gap-2 items-center mt-1.5">
                    <button onClick={handleOpenEditMenu} className="text-xs text-primary hover:text-secondary font-semibold flex items-center gap-1">
                      <Edit className="w-3.5 h-3.5" /> Menüyü Düzenle
                    </button>
                    <span className="text-gray-300">|</span>
                    <button onClick={handleDeleteMenu} className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Menüyü Sil
                    </button>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-primary text-xs font-semibold rounded-full uppercase tracking-wider font-display">
                  Konum: {activeMenu.location === 'header' ? 'Üst Menü (Header)' : 
                         activeMenu.location === 'footer' ? 'Alt Menü (Footer Kurumsal)' : 
                         activeMenu.location === 'footer_quick' ? 'Alt Menü (Footer Hızlı Bağlantılar)' : 
                         activeMenu.location === 'footer_bottom' ? 'Alt Menü (Footer En Alt)' : 'Belirtilmemiş'}
                </span>
              </div>

              {(!activeMenu.items || activeMenu.items.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-theme">
                  <p className="text-gray-500">Bu menüde henüz hiç bağlantı yok.</p>
                  <p className="text-xs text-gray-400 mt-1">Sol taraftan yeni bağlantılar ekleyebilirsiniz.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeMenu.items.map((item: any, index: number) => (
                    <div key={item.id} className="flex items-center bg-gray-50 border border-gray-200 rounded-theme p-3 group transition-colors hover:bg-gray-100">
                      <div className="flex flex-col items-center mr-3 space-y-1">
                        <button onClick={() => handleMoveItem(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-400 p-0.5">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleMoveItem(index, 'down')} disabled={index === activeMenu.items.length - 1} className="text-gray-400 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-400 p-0.5">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 ml-2">
                        <div className="font-medium text-gray-900 text-sm font-display">
                          {item.parentId ? <span className="text-gray-400 mr-2">↳</span> : null}
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.url} • {item.target === '_blank' ? 'Yeni sekme' : 'Aynı sekme'}</div>
                      </div>
                      <div className="flex items-center">
                        {!item.parentId && (
                          <button 
                            onClick={() => handleOpenMegaMenu(item)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-theme opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                            title="Mega Menü Ayarları"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-theme opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Bağlantıyı Kaldır"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button 
                      onClick={handleSaveOrder}
                      disabled={savingOrder}
                      className="inline-flex items-center px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-theme hover:bg-secondary disabled:opacity-50 transition-colors shadow-sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingOrder ? 'Kaydediliyor...' : 'Menüyü (Sıralamayı) Kaydet'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-theme flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center text-gray-500">
                <Menu className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Düzenlemek için sol taraftan bir menü seçin</p>
              </div>
            </div>
          )}
        </div>
        
      </div>

      {/* Edit Menu Modal */}
      {showEditMenuModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 font-display">Menüyü Düzenle</h2>
              <button onClick={() => setShowEditMenuModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menü Adı *</label>
                <input type="text" value={editMenuName} onChange={e => setEditMenuName(e.target.value)}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Örn: Footer Menü" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menü Konumu</label>
                  <select
                    value={editMenuLocation}
                    onChange={e => setEditMenuLocation(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-theme px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="header">Üst Menü (Header)</option>
                    <option value="footer">Alt Menü (Footer Kurumsal)</option>
                    <option value="footer_quick">Alt Menü (Footer Hızlı Bağlantılar)</option>
                    <option value="footer_bottom">Alt Menü (Footer En Alt Yasal Linkler)</option>
                  </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowEditMenuModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={handleUpdateMenu} disabled={updatingMenu || !editMenuName.trim()}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center">
                {updatingMenu && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mega Menu Modal */}
      {showMegaModal && activeMegaItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900 font-display">Mega Menü Ayarları</h2>
                <p className="text-sm text-gray-500">"{activeMegaItem.title}" bağlantısı için yapılandırma.</p>
              </div>
              <button onClick={() => setShowMegaModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mega Menü JSON</label>
              <textarea 
                value={megaMenuJson}
                onChange={(e) => setMegaMenuJson(e.target.value)}
                className="w-full h-64 font-mono text-sm border border-gray-300 rounded-theme p-3 focus:ring-2 focus:ring-primary outline-none"
                placeholder='Örn: { "columns": [ { "title": "...", "links": [] } ] }'
              ></textarea>
              <p className="text-xs text-gray-500 mt-2">İptal etmek için boş bırakın. (JSON formatında olmalıdır)</p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowMegaModal(false)} className="px-5 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={handleSaveMegaMenu}
                className="px-5 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold flex items-center justify-center">
                <Save className="w-4 h-4 mr-2" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
