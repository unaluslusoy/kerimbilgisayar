import React from 'react';
import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { adminRequest } from '../../lib/api';

export default function AdminApiKeys() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    try {
      const data = await adminRequest('/api/admin/apikeys');
      setKeys(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    try {
      const res = await adminRequest('/api/admin/apikeys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName })
      });
      setGeneratedKey(res.apiKey);
      setNewKeyName('');
      fetchKeys();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu API Anahtarını silmek istediğinize emin misiniz? Dış uygulamalar erişimini kaybeder.')) return;
    try {
      await adminRequest(`/api/admin/apikeys/${id}`, { method: 'DELETE' });
      fetchKeys();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">API Anahtarları</h1>
        <p className="text-sm text-gray-500 mt-1">Dış uygulamaların sisteminize (örn: yeni servis kaydı açmak) erişmesi için gereken yetki anahtarları.</p>
      </div>

      {generatedKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-theme p-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-yellow-800 font-semibold mb-1">Yeni API Anahtarınız Oluşturuldu!</h3>
              <p className="text-yellow-700 text-sm mb-4">
                Lütfen bu anahtarı <strong>hemen kopyalayın ve güvenli bir yere kaydedin.</strong> Güvenlik nedeniyle bu anahtar bir daha asla tam olarak gösterilmeyecektir.
              </p>
              <div className="flex items-center space-x-2">
                <code className="bg-white px-4 py-2 rounded border border-yellow-300 text-gray-800 flex-1 overflow-x-auto font-mono text-sm">
                  {generatedKey}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded border border-yellow-300 font-medium text-sm flex items-center transition-colors"
                >
                  {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <div className="mt-4">
                <button onClick={() => setGeneratedKey('')} className="text-sm text-yellow-800 hover:underline">Gizle ve Devam Et</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sol Kolon: Anahtar Oluştur */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-theme border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2 text-primary" />
              Yeni Anahtar Üret
            </h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anahtar Adı</label>
                <input 
                  type="text" 
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Örn: Muhasebe Programı Entegrasyonu" 
                  className="w-full border border-gray-300 rounded-theme px-4 py-2 focus:ring-2 focus:ring-primary"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Bu anahtarın hangi uygulama tarafından kullanılacağını belirtin.</p>
              </div>
              <button 
                type="submit"
                className="w-full flex justify-center items-center px-4 py-2.5 bg-primary hover:bg-secondary text-white font-medium rounded-theme transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Anahtar Üret
              </button>
            </form>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-theme p-6 text-sm text-blue-800">
            <h3 className="font-semibold mb-2">Nasıl Kullanılır?</h3>
            <p className="mb-2">API istekleri yaparken bu anahtarı HTTP header olarak göndermelisiniz:</p>
            <code className="block bg-white p-2 rounded border border-blue-200 mb-2">x-api-key: kb_e3a1...</code>
            <p>Veya Bearer token olarak:</p>
            <code className="block bg-white p-2 rounded border border-blue-200">Authorization: Bearer kb_e3a1...</code>
          </div>
        </div>

        {/* Sağ Kolon: Mevcut Anahtarlar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Aktif Anahtarlar</h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
            ) : keys.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Henüz hiç API anahtarı üretmediniz.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">İsim</th>
                    <th className="px-6 py-3 font-medium">Ön Eki (Prefix)</th>
                    <th className="px-6 py-3 font-medium">Son Kullanım</th>
                    <th className="px-6 py-3 font-medium">Oluşturulma</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {keys.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{key.name}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono">{key.prefix}••••••••</td>
                      <td className="px-6 py-4 text-gray-500">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('tr-TR') : 'Hiç kullanılmadı'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(key.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(key.id)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                          title="İptal Et"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
