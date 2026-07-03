import { useState, useEffect } from 'react';
import { Trash2, FolderPlus } from 'lucide-react';
import { fetchAdminTerms, createAdminTerm, deleteAdminTerm } from '../../lib/api';

export default function AdminTaxonomies() {
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [taxonomyName, setTaxonomyName] = useState('Kategori');

  const load = async () => {
    try {
      const data = await fetchAdminTerms();
      setTerms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await createAdminTerm({ name, taxonomyName, description });
      setName('');
      setDescription('');
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu terimi silmek istediğinize emin misiniz?')) return;
    try {
      await deleteAdminTerm(id);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const categories = terms.filter(t => t.taxonomyName === 'Kategori');
  const tags = terms.filter(t => t.taxonomyName === 'Etiket');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kategoriler ve Etiketler</h1>
        <p className="text-sm text-gray-500 mt-1">Blog yazılarınızı ve içeriklerinizi sınıflandırın.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Form */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="bg-white p-5 rounded-theme border border-gray-200 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center">
              <FolderPlus className="w-5 h-5 mr-2 text-primary" />
              Yeni Ekle
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İsim</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea 
                  rows={3}
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
                <select 
                  value={taxonomyName} 
                  onChange={e => setTaxonomyName(e.target.value)}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="Kategori">Kategori</option>
                  <option value="Etiket">Etiket</option>
                </select>
              </div>
              <button 
                onClick={handleCreate}
                disabled={adding || !name.trim()}
                className="w-full bg-primary hover:bg-secondary text-white py-2 rounded-theme text-sm font-medium disabled:opacity-50"
              >
                {adding ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>

        {/* Right List */}
        <div className="w-full lg:w-2/3 space-y-6">
          <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Kategoriler</h2>
            {loading ? (
               <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-2 bg-gray-200 rounded w-3/4"></div></div></div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz kategori bulunmuyor.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {categories.map(c => (
                  <div key={c.id} className="py-3 flex justify-between items-center group">
                    <div>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.description || 'Açıklama yok'}</div>
                    </div>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-theme opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-theme border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Etiketler</h2>
            {loading ? (
               <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-2 bg-gray-200 rounded w-3/4"></div></div></div>
            ) : tags.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz etiket bulunmuyor.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <div key={t.id} className="flex items-center bg-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-700">
                    {t.name}
                    <button onClick={() => handleDelete(t.id)} className="ml-2 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
