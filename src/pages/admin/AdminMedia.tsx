import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Copy, Check, Plus, Folder as FolderIcon, File as FileIcon, Image as ImageIcon, FileText, Music, Video, ChevronRight, ArrowLeft, DownloadCloud } from 'lucide-react';
import { fetchAdminMedia, uploadAdminMedia, adminRequest, fetchMediaFolders, createMediaFolder, deleteMediaFolder, importRemoteMedia } from '../../lib/api';
import { mediaUrl } from '../../lib/media';

export default function AdminMedia() {
  const [media, setMedia] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importingRemote, setImportingRemote] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New folder state
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Details & SEO Edit state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', altText: '', description: '', folderId: '' });
  const [savingDetails, setSavingDetails] = useState(false);

  // Alert/Confirm modal states
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; message: string; title: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; message: string; title: string; onConfirm: () => void } | null>(null);

  const showAlert = (message: string, title = 'Hata') => {
    setAlertConfig({ isOpen: true, message, title });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = 'Onay Gerekli') => {
    setConfirmConfig({ isOpen: true, message, title, onConfirm });
  };

  const load = async () => {
    setLoading(true);
    try {
      const [f, m] = await Promise.all([
        fetchMediaFolders(),
        fetchAdminMedia(currentFolderId)
      ]);
      setFolders(f);
      setMedia(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentFolderId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      await uploadAdminMedia(file, currentFolderId);
      await load();
    } catch (err: any) {
      showAlert('Yükleme hatası: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteUrl.trim()) return;
    setImportingRemote(true);
    try {
      await importRemoteMedia(remoteUrl.trim());
      setRemoteUrl('');
      await load();
    } catch (err: any) {
      showAlert('İçe aktarma hatası: ' + err.message);
    } finally {
      setImportingRemote(false);
    }
  };

  const copyUrl = (url: string, id: number) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createMediaFolder({ name: newFolderName, parentId: currentFolderId || undefined });
      setNewFolderName('');
      setCreatingFolder(false);
      await load();
    } catch (err: any) {
      showAlert('Klasör oluşturulamadı: ' + err.message);
    }
  };

  const handleDeleteFolder = (id: number) => {
    showConfirm(
      'Bu klasörü silmek istediğinize emin misiniz? (İçindeki dosyalar kök dizine taşınacaktır)',
      async () => {
        try {
          await deleteMediaFolder(id);
          await load();
        } catch (err: any) {
          showAlert('Klasör silinemedi: ' + err.message);
        }
      }
    );
  };

  const handleOpenDetails = (item: any) => {
    setSelectedItem(item);
    setForm({
      title: item.title || '',
      altText: item.altText || '',
      description: item.description || '',
      folderId: item.folderId ? String(item.folderId) : ''
    });
  };

  const handleSaveDetails = async () => {
    if (!selectedItem) return;
    setSavingDetails(true);
    try {
      const payload: any = {
        title: form.title,
        altText: form.altText,
        description: form.description,
        folderId: form.folderId ? parseInt(form.folderId) : null
      };
      await adminRequest(`/api/admin/media/${selectedItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setSelectedItem(null);
      await load();
    } catch (e: any) {
      showAlert('Güncelleme hatası: ' + e.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const handleDeleteItem = (id: number) => {
    showConfirm(
      'Bu medyayı kalıcı olarak silmek istediğinizden emin misiniz?',
      async () => {
        try {
          await adminRequest(`/api/admin/media/${id}`, { method: 'DELETE' });
          if (selectedItem && selectedItem.id === id) {
            setSelectedItem(null);
          }
          await load();
        } catch (e: any) {
          showAlert('Silme hatası: ' + e.message);
        }
      }
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (!mimeType) return <FileIcon className="h-8 w-8 text-gray-400" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-8 w-8 text-yellow-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-8 w-8 text-blue-600" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText className="h-8 w-8 text-green-600" />;
    return <FileIcon className="h-8 w-8 text-gray-400" />;
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData('mediaId', item.id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: number | null) => {
    e.preventDefault();
    const mediaIdStr = e.dataTransfer.getData('mediaId');
    if (!mediaIdStr) return;
    const mediaId = parseInt(mediaIdStr);
    
    try {
      await adminRequest(`/api/admin/media/${mediaId}`, {
        method: 'PUT',
        body: JSON.stringify({ folderId: targetFolderId })
      });
      await load();
    } catch (err: any) {
      showAlert('Taşıma başarısız: ' + err.message);
    }
  };

  const currentFolders = folders.filter(f => (f.parentId || null) === currentFolderId);
  const parentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  const renderFolderTree = (parentId: number | null, level = 0) => {
    const children = folders.filter(f => f.parentId === parentId);
    if (children.length === 0) return null;
    return (
      <div className={level > 0 ? 'pl-4 border-l border-gray-100 ml-2 mt-1 space-y-1' : 'mt-2 space-y-1 pl-4 border-l border-gray-100 ml-2'}>
        {children.map(folder => (
          <div key={folder.id}>
            <div 
              className={`flex items-center justify-between p-2 rounded cursor-pointer group ${currentFolderId === folder.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, folder.id)}
            >
              <div className="flex items-center gap-2" onClick={() => setCurrentFolderId(folder.id)}>
                <FolderIcon className="h-4 w-4" />
                <span className="text-sm truncate max-w-[120px]">{folder.name}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                className="text-gray-400 hover:text-red-600 hidden group-hover:block"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            {renderFolderTree(folder.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      
      {/* Sidebar: Folder Navigation */}
      <div className="w-64 bg-white shadow-sm rounded-lg border border-gray-200 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Klasörler</h2>
          <button onClick={() => setCreatingFolder(!creatingFolder)} className="text-gray-500 hover:text-blue-600">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {creatingFolder && (
            <form onSubmit={handleCreateFolder} className="p-2 mb-2 bg-gray-50 rounded border border-gray-200">
              <input
                type="text"
                autoFocus
                placeholder="Klasör adı"
                className="w-full px-2 py-1 text-sm border rounded mb-2"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCreatingFolder(false)} className="text-xs text-gray-500">İptal</button>
                <button type="submit" className="text-xs text-blue-600 font-medium">Oluştur</button>
              </div>
            </form>
          )}

          <div 
            onClick={() => setCurrentFolderId(null)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer ${currentFolderId === null ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
          >
            <FolderIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Ana Dizin (Kök)</span>
          </div>

          {renderFolderTree(null)}
        </div>
      </div>

      {/* Main Content: Files */}
      <div className="flex-1 bg-white shadow-sm rounded-lg border border-gray-200 flex flex-col h-full overflow-hidden">
        {/* Header toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {currentFolderId && (
              <button 
                onClick={() => setCurrentFolderId(parentFolder?.parentId || null)} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, parentFolder?.parentId || null)}
                className="flex items-center gap-1 hover:text-blue-600 p-1 rounded hover:bg-blue-50 border border-transparent hover:border-blue-200"
              >
                <ArrowLeft className="h-4 w-4" /> Geri
              </button>
            )}
            <span className="font-medium text-gray-900 ml-2">
              {currentFolderId ? parentFolder?.name : 'Ana Dizin'}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span>{media.length} Dosya, {currentFolders.length} Klasör</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={handleImportRemote} className="flex items-center gap-2">
              <input
                type="url"
                value={remoteUrl}
                onChange={e => setRemoteUrl(e.target.value)}
                placeholder="Dış görsel URL"
                className="w-52 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={importingRemote || !remoteUrl.trim()}
                className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <DownloadCloud className="h-4 w-4" />
                {importingRemote ? 'Alınıyor...' : 'URL’den Al'}
              </button>
            </form>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Yükleniyor...' : 'Dosya Yükle'}
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Folders first */}
              {currentFolders.map(folder => (
                <div 
                  key={`folder-${folder.id}`} 
                  onClick={() => setCurrentFolderId(folder.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  className="relative group bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  <FolderIcon className="h-10 w-10 text-blue-500" fill="currentColor" opacity={0.2} />
                  <span className="text-sm font-medium text-gray-700 text-center truncate w-full">{folder.name}</span>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                      className="p-1.5 bg-white/90 backdrop-blur-sm rounded shadow-sm text-gray-600 hover:text-red-600"
                      title="Sil"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Media Files */}
              {media.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className={`relative group bg-white border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${selectedItem?.id === item.id ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200'}`}
                  onClick={() => handleOpenDetails(item)}
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center p-2">
                    {item.mimeType?.startsWith('image/') ? (
                      <img
                        src={mediaUrl(item.fileUrl)}
                        alt={item.altText || item.title || item.fileName}
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                      />
                    ) : (
                      getFileIcon(item.mimeType)
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs font-medium text-gray-700 truncate" title={item.fileName}>
                      {item.title || item.fileName}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {item.fileSize ? (item.fileSize / 1024).toFixed(1) + ' KB' : 'Bilinmeyen boyut'}
                    </p>
                  </div>
                  
                  {/* Quick actions on hover */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyUrl(item.fileUrl, item.id); }}
                      className="p-1.5 bg-white/90 backdrop-blur-sm rounded shadow-sm text-gray-600 hover:text-blue-600"
                      title="Bağlantıyı Kopyala"
                    >
                      {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                      className="p-1.5 bg-white/90 backdrop-blur-sm rounded shadow-sm text-gray-600 hover:text-red-600"
                      title="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              
              {media.length === 0 && currentFolders.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <FolderIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>Bu klasör boş.</p>
                  <p className="text-sm mt-1">Dosya yüklemek için "Dosya Yükle" butonunu kullanın.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Details Pane */}
      {selectedItem && (
        <div className="w-80 bg-white shadow-sm rounded-lg border border-gray-200 flex flex-col h-full overflow-hidden shrink-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Dosya Detayları</h3>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">
              &times;
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-gray-100 rounded-lg p-2 aspect-video flex items-center justify-center overflow-hidden">
               {selectedItem.mimeType?.startsWith('image/') ? (
                 <img src={mediaUrl(selectedItem.fileUrl)} alt={selectedItem.title} className="max-w-full max-h-full object-contain" />
               ) : (
                 getFileIcon(selectedItem.mimeType)
               )}
            </div>

            <div className="text-sm space-y-2 bg-gray-50 p-3 rounded border border-gray-100">
              <p><span className="text-gray-500">Dosya:</span> <span className="font-medium text-gray-800 break-all">{selectedItem.fileName}</span></p>
              <p><span className="text-gray-500">Tip:</span> <span className="font-medium text-gray-800">{selectedItem.mimeType}</span></p>
              <p><span className="text-gray-500">Boyut:</span> <span className="font-medium text-gray-800">{selectedItem.fileSize ? (selectedItem.fileSize / 1024).toFixed(1) + ' KB' : '-'}</span></p>
              <p><span className="text-gray-500">URL:</span> 
                <a href={selectedItem.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline break-all">Aç &nearr;</a>
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Klasör</label>
                <select
                  value={form.folderId}
                  onChange={e => setForm({ ...form, folderId: e.target.value })}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Ana Dizin</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Başlık</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Alt Metin (SEO)</label>
                <input
                  type="text"
                  value={form.altText}
                  onChange={e => setForm({ ...form, altText: e.target.value })}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {savingDetails ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertConfig && alertConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full p-6 mx-4 transform transition-all duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-red-500">⚠</span> {alertConfig.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {alertConfig.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertConfig(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmConfig && confirmConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full p-6 mx-4 transform transition-all duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-yellow-500">❓</span> {confirmConfig.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {confirmConfig.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmConfig(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
