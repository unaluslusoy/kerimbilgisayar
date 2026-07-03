import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Copy, Check, Info, X } from 'lucide-react';
import { fetchAdminMedia, uploadAdminMedia, adminRequest } from '../../lib/api';

export default function AdminMedia() {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Details & SEO Edit state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', altText: '', description: '' });
  const [savingDetails, setSavingDetails] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const d = await fetchAdminMedia();
      setMedia(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      await uploadAdminMedia(file);
      await load();
    } catch (err: any) {
      alert('Yükleme hatası: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyUrl = (url: string, id: number) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenDetails = (item: any) => {
    setSelectedItem(item);
    setForm({
      title: item.title || '',
      altText: item.altText || '',
      description: item.description || ''
    });
  };

  const handleSaveDetails = async () => {
    if (!selectedItem) return;
    setSavingDetails(true);
    try {
      await adminRequest(`/api/admin/media/${selectedItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      setSelectedItem(null);
      await load();
    } catch (e: any) {
      alert('Güncelleme hatası: ' + e.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Bu görseli kalıcı olarak silmek istediğinizden emin misiniz?')) return;
    setDeletingId(id);
    try {
      await adminRequest(`/api/admin/media/${id}`, {
        method: 'DELETE'
      });
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
      await load();
    } catch (e: any) {
      alert('Silme hatası: ' + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Ortam Kütüphanesi</h1>
          <p className="text-sm text-gray-500 mt-1">Sitenizdeki tüm görsel ve dosyaları buradan yönetin.</p>
        </div>
        <div>
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploading ? 'Yükleniyor...' : 'Yeni Ekle'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : media.length === 0 ? (
          <div className="text-center py-20">
            <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Henüz ortam dosyası yok</h3>
            <p className="text-gray-500 mt-1">Görsel yüklemek için "Yeni Ekle" butonunu kullanın.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {media.map((file) => (
              <div key={file.id} className="group relative aspect-square bg-gray-100 rounded-theme border border-gray-200 overflow-hidden hover:border-primary transition-colors">
                {file.mimeType?.startsWith('image/') ? (
                  <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <div className="text-sm font-medium text-gray-600 truncate w-full text-center">{file.fileName}</div>
                    <div className="text-xs text-gray-400 mt-1">{(file.fileSize / 1024).toFixed(1)} KB</div>
                  </div>
                )}
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => copyUrl(file.fileUrl, file.id)}
                    className="p-2 bg-white rounded-full text-gray-900 hover:text-primary shadow-sm transition-colors"
                    title="URL Kopyala"
                  >
                    {copiedId === file.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleOpenDetails(file)}
                    className="p-2 bg-white rounded-full text-gray-900 hover:text-primary shadow-sm transition-colors"
                    title="Dosya Detayları & SEO"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(file.id)}
                    disabled={deletingId === file.id}
                    className="p-2 bg-white rounded-full text-red-600 hover:bg-red-55 shadow-sm transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row">
            {/* Left side: Image preview */}
            <div className="w-full md:w-1/2 bg-gray-50 p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
              {selectedItem.mimeType?.startsWith('image/') ? (
                <div className="space-y-4 text-center w-full">
                  <img src={selectedItem.fileUrl} alt={selectedItem.fileName} className="max-h-[300px] object-contain rounded border mx-auto shadow-sm" />
                  <a href={selectedItem.fileUrl} target="_blank" rel="noreferrer" className="inline-block text-xs text-primary hover:underline font-semibold mt-2">
                    Tam Boyutta Aç ↗
                  </a>
                </div>
              ) : (
                <div className="text-gray-400 font-medium">Önizleme yok</div>
              )}
            </div>
            {/* Right side: Meta settings */}
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 font-display">Dosya Detayları & SEO</h2>
                    <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{selectedItem.fileName}</p>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-1.5 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded">
                  <div><strong>Tür:</strong> {selectedItem.mimeType}</div>
                  <div><strong>Boyut:</strong> {(selectedItem.fileSize / 1024).toFixed(1)} KB</div>
                  <div><strong>URL:</strong> <span className="font-mono break-all">{selectedItem.fileUrl}</span></div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Görsel Başlığı (Title)</label>
                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-theme px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary outline-none" placeholder="Örn: Bilgisayar Tamiri Servisi" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Alternatif Metin (Alt Text - SEO için)</label>
                    <input type="text" value={form.altText} onChange={e => setForm({ ...form, altText: e.target.value })}
                      className="w-full border border-gray-300 rounded-theme px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary outline-none" placeholder="Örn: istanbul-bilgisayar-tamiri" />
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Arama motorları görseli anlamlandırmak için bu etiketi kullanır.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Açıklama (Description)</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                      className="w-full border border-gray-300 rounded-theme px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary outline-none" placeholder="Görsel açıklaması..." />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-6 mt-6 border-t border-gray-100">
                <button
                  onClick={() => handleDeleteItem(selectedItem.id)}
                  disabled={deletingId === selectedItem.id}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-theme text-xs font-semibold flex items-center justify-center border border-red-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Sil
                </button>
                <div className="flex-1 flex gap-2 justify-end">
                  <button onClick={() => setSelectedItem(null)} className="px-3 py-2 border border-gray-300 text-gray-700 rounded-theme text-xs font-semibold hover:bg-gray-50">İptal</button>
                  <button onClick={handleSaveDetails} disabled={savingDetails}
                    className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-theme text-xs font-semibold disabled:opacity-50 flex items-center justify-center">
                    {savingDetails && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>}
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
