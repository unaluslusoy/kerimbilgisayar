import React, { useState, useEffect, useRef } from 'react';
import { Upload, Copy, Check, Info, X, Image as ImageIcon } from 'lucide-react';
import { fetchAdminMedia, uploadAdminMedia } from '../../lib/api';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function MediaPicker({ isOpen, onClose, onSelect }: MediaPickerProps) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const d = await fetchAdminMedia();
      setMedia(d || []);
    } catch (e) {
      console.error('Failed to load media in picker:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      load();
      setSelectedItem(null);
    }
  }, [isOpen]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const response = await uploadAdminMedia(file);
      await load();
      if (response && response.fileUrl) {
        // Find newly uploaded item to select it
        const newMediaList = await fetchAdminMedia();
        setMedia(newMediaList);
        const newItem = newMediaList.find((m: any) => m.fileUrl === response.fileUrl);
        if (newItem) {
          setSelectedItem(newItem);
        }
      }
    } catch (err: any) {
      alert('Yükleme hatası: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem.fileUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white rounded-theme shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-150 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 font-display flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Ortam Kütüphanesinden Seç
            </h2>
            <p className="text-xs text-gray-500">Yüklenmiş bir görsel seçin veya yeni bir tane yükleyin.</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded shadow-sm disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1.5"></div>
              ) : (
                <Upload className="w-3.5 h-3.5 mr-1.5" />
              )}
              {uploading ? 'Yükleniyor...' : 'Yeni Yükle'}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Grid View */}
          <div className="flex-1 p-4 overflow-y-auto min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : media.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <Upload className="w-12 h-12 text-gray-300 mb-3" />
                <p className="font-semibold text-sm">Görsel bulunamadı</p>
                <p className="text-xs mt-1">Lütfen yeni bir görsel yükleyin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {media.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedItem(file)}
                    className={`group relative aspect-square bg-gray-50 rounded border overflow-hidden hover:border-primary transition-all text-left ${
                      selectedItem?.id === file.id
                        ? 'border-2 border-primary ring-2 ring-primary/20'
                        : 'border-gray-200'
                    }`}
                  >
                    {file.mimeType?.startsWith('image/') ? (
                      <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                        <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-600 font-medium truncate w-full">{file.fileName}</span>
                      </div>
                    )}
                    
                    {/* Selected Indicator */}
                    {selectedItem?.id === file.id && (
                      <div className="absolute top-1.5 right-1.5 bg-primary text-white p-0.5 rounded-full shadow">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="w-72 border-l border-gray-150 bg-gray-50 p-4 flex flex-col justify-between shrink-0 hidden md:flex">
            {selectedItem ? (
              <div className="space-y-4 overflow-y-auto flex-1 pb-4">
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Görsel Detayları</h3>
                {selectedItem.mimeType?.startsWith('image/') && (
                  <img src={selectedItem.fileUrl} alt={selectedItem.fileName} className="max-h-[160px] object-contain rounded border bg-white mx-auto shadow-sm" />
                )}
                
                <div className="text-[11px] text-gray-600 space-y-1 bg-white p-2.5 rounded border border-gray-150">
                  <div className="truncate"><strong>Adı:</strong> {selectedItem.fileName}</div>
                  <div><strong>Tür:</strong> {selectedItem.mimeType}</div>
                  <div><strong>Boyut:</strong> {(selectedItem.fileSize / 1024).toFixed(1)} KB</div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-500">Alternatif Metin (Alt Text)</span>
                    <span className="block text-xs text-gray-800 bg-white p-2 rounded border border-gray-200 mt-0.5 italic min-h-[32px]">
                      {selectedItem.altText || <span className="text-gray-400">Belirtilmemiş</span>}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-gray-500">Görsel Başlığı (Title)</span>
                    <span className="block text-xs text-gray-800 bg-white p-2 rounded border border-gray-200 mt-0.5 min-h-[32px]">
                      {selectedItem.title || <span className="text-gray-400">Belirtilmemiş</span>}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                <ImageIcon className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-xs">Detayları görmek ve seçmek için bir görsel tıklayın.</p>
              </div>
            )}

            <div className="border-t border-gray-200 pt-3 flex gap-2 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 bg-white"
              >
                Kapat
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedItem}
                className="flex-1 py-2 bg-primary hover:bg-secondary disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center justify-center"
              >
                Görseli Seç
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Footer Selector */}
        <div className="p-3 border-t border-gray-150 bg-gray-50 flex gap-2 justify-end md:hidden shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 bg-white"
          >
            İptal
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedItem}
            className="px-5 py-2 bg-primary hover:bg-secondary disabled:opacity-50 text-white rounded text-xs font-semibold"
          >
            Seç ({selectedItem ? '1 Seçildi' : '0'})
          </button>
        </div>
      </div>
    </div>
  );
}
