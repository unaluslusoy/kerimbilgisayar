import React from 'react';
import { useState, useEffect } from 'react';
import { Webhook, Plus, Trash2, Activity, Globe } from 'lucide-react';
import { adminRequest } from '../../lib/api';

export default function AdminWebhooks() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [event, setEvent] = useState('ticket.created');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchHooks = async () => {
    try {
      const data = await adminRequest('/api/admin/webhooks');
      setWebhooks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHooks();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminRequest('/api/admin/webhooks', {
        method: 'POST',
        body: JSON.stringify({ name, event, url, secret })
      });
      setName('');
      setUrl('');
      setSecret('');
      fetchHooks();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu webhook bağlantısını silmek istediğinize emin misiniz?')) return;
    try {
      await adminRequest(`/api/admin/webhooks/${id}`, { method: 'DELETE' });
      fetchHooks();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Webhooks</h1>
        <p className="text-sm text-gray-500 mt-1">Sistemde bir olay olduğunda dış servislere otomatik HTTP POST isteği gönderin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sol Kolon: Yeni Webhook */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-theme border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-primary" />
              Yeni Webhook Ekle
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (İsim)</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Zapier Discord Bildirimi" 
                  className="w-full border border-gray-300 rounded-theme px-4 py-2 focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tetiklenecek Olay (Event)</label>
                <select 
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  className="w-full border border-gray-300 rounded-theme px-4 py-2 focus:ring-2 focus:ring-primary"
                >
                  <option value="ticket.created">Yeni Servis Kaydı (ticket.created)</option>
                  <option value="lead.created">Yeni İletişim Formu (lead.created)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Globe className="w-4 h-4 mr-1" /> Hedef URL
                </label>
                <input 
                  type="url" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..." 
                  className="w-full border border-gray-300 rounded-theme px-4 py-2 focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gizli Anahtar (Opsiyonel)</label>
                <input 
                  type="text" 
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Gelen isteği doğrulamak için" 
                  className="w-full border border-gray-300 rounded-theme px-4 py-2 focus:ring-2 focus:ring-primary"
                />
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full flex justify-center items-center px-4 py-2.5 bg-primary hover:bg-secondary text-white font-medium rounded-theme transition-colors disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Webhook Oluştur'}
              </button>
            </form>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-theme p-6 text-sm text-purple-800">
            <h3 className="font-semibold mb-2 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Webhook Payload Örneği
            </h3>
            <p className="mb-2">Sistem hedef URL'ye şu formatta JSON gönderir:</p>
            <pre className="bg-white p-3 rounded border border-purple-200 overflow-x-auto text-xs font-mono">
{`{
  "event": "ticket.created",
  "payload": {
    "ticketId": "SRV-1234",
    "title": "Ekran Kırık"
  },
  "timestamp": "2026-..."
}`}
            </pre>
          </div>
        </div>

        {/* Sağ Kolon: Mevcut Webhooklar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Aktif Webhooklar</h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
            ) : webhooks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Henüz hiçbir webhook tanımlanmamış.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">İsim / URL</th>
                    <th className="px-6 py-3 font-medium">Olay (Event)</th>
                    <th className="px-6 py-3 font-medium">Durum</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {webhooks.map((hook) => (
                    <tr key={hook.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{hook.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{hook.url}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {hook.event}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {hook.isActive ? (
                          <span className="text-green-600 flex items-center text-xs font-medium"><div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>Aktif</span>
                        ) : (
                          <span className="text-red-600 flex items-center text-xs font-medium"><div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>Pasif</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(hook.id)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                          title="Sil"
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
