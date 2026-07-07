import React, { useState, useEffect } from 'react';
import { fetchAdminMedia, fetchMediaFolders } from '../../lib/api';
import { Folder as FolderIcon, File as FileIcon, Image as ImageIcon, FileText, Music, Video, ChevronRight, ArrowLeft, X } from 'lucide-react';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaUrl: string) => void;
  acceptedTypes?: string; // e.g., 'image/*'
}

export default function MediaPickerModal({ isOpen, onClose, onSelect, acceptedTypes = 'image/*' }: MediaPickerModalProps) {
  const [media, setMedia] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [f, m] = await Promise.all([
        fetchMediaFolders(),
        fetchAdminMedia(currentFolderId)
      ]);
      setFolders(f);
      
      // Filter by acceptedTypes if needed
      let filteredMedia = m;
      if (acceptedTypes === 'image/*') {
        filteredMedia = m.filter((item: any) => item.mimeType?.startsWith('image/'));
      }
      setMedia(filteredMedia);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      load();
    }
  }, [isOpen, currentFolderId]);

  if (!isOpen) return null;

  const currentFolders = folders.filter(f => (f.parentId || null) === currentFolderId);
  const parentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  const getFileIcon = (mimeType: string) => {
    if (!mimeType) return <FileIcon className="h-8 w-8 text-gray-400" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-8 w-8 text-yellow-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    return <FileIcon className="h-8 w-8 text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Medya Seçin</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm text-gray-600">
          {currentFolderId && (
            <button onClick={() => setCurrentFolderId(parentFolder?.parentId || null)} className="flex items-center gap-1 hover:text-blue-600 font-medium">
              <ArrowLeft className="h-4 w-4" /> Geri
            </button>
          )}
          <span className="font-medium text-gray-900 ml-2">
            {currentFolderId ? parentFolder?.name : 'Ana Dizin'}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {/* Folders */}
              {currentFolders.map(folder => (
                <div 
                  key={`folder-${folder.id}`} 
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <FolderIcon className="h-10 w-10 text-blue-500 opacity-80" fill="currentColor" />
                  <span className="text-sm font-medium text-gray-700 text-center truncate w-full">{folder.name}</span>
                </div>
              ))}

              {/* Files */}
              {media.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-blue-500 transition-shadow"
                  onClick={() => {
                    onSelect(item.fileUrl);
                    onClose();
                  }}
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center p-2">
                    {item.mimeType?.startsWith('image/') ? (
                      <img
                        src={item.fileUrl}
                        alt={item.title}
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                      />
                    ) : (
                      getFileIcon(item.mimeType)
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-100 text-center">
                    <p className="text-xs font-medium text-gray-700 truncate" title={item.fileName}>
                      {item.title || item.fileName}
                    </p>
                  </div>
                </div>
              ))}

              {media.length === 0 && currentFolders.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-500">
                  <p>Bu klasör boş veya uygun formatta dosya yok.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
