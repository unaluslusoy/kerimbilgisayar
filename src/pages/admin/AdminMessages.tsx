import { useState, useEffect } from 'react';
import { Mail, Search, User, Clock, MessageSquare } from 'lucide-react';
import { fetchAdminMessages } from '../../lib/api';

export default function AdminMessages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetchAdminMessages()
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = messages.filter(m => {
    if (!search) return true;
    const d = m.data || {};
    return (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.subject || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col">
      <div className="mb-5 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">İletişim Mesajları</h1>
        <p className="text-sm text-gray-500 mt-1">Web sitesi iletişim formundan gelen mesajlar.</p>
      </div>

      <div className="flex-1 bg-white rounded-theme border border-gray-200 shadow-sm flex overflow-hidden">
        {/* List */}
        <div className="w-full sm:w-80 border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Mesaj ara..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-theme bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Mesaj bulunamadı</p>
              </div>
            ) : filtered.map(msg => {
              const d = msg.data || {};
              const isSelected = selected?.id === msg.id;
              return (
                <button key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">{d.name || 'Anonim'}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                      {new Date(msg.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate mb-1">{d.email}</div>
                  <div className="text-xs text-gray-600 font-medium truncate">{d.subject || 'Konu belirtilmedi'}</div>
                  {d.message && <div className="text-xs text-gray-400 truncate mt-1">{d.message}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 flex flex-col">
          {selected ? (() => {
            const d = selected.data || {};
            return (
              <>
                <div className="p-5 border-b border-gray-200 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-secondary font-bold shrink-0">
                      {(d.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">{d.name || 'Anonim'}</h2>
                      <p className="text-xs text-gray-500">{d.email} {d.phone ? `• ${d.phone}` : ''}</p>
                    </div>
                    <div className="ml-auto text-xs text-gray-400">
                      {new Date(selected.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {d.subject && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Konu</p>
                      <p className="font-bold text-gray-900">{d.subject}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Mesaj</p>
                    <div className="bg-gray-50 rounded-theme p-5 text-sm text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-line">
                      {d.message || 'Mesaj içeriği yok.'}
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    {d.email && (
                      <a href={`mailto:${d.email}?subject=Re: ${d.subject || 'İletişim'}`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-secondary text-white text-sm font-semibold rounded-theme transition-colors">
                        <Mail className="w-4 h-4" /> E-Posta Yanıtla
                      </a>
                    )}
                    {d.phone && (
                      <a href={`tel:${d.phone}`}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-theme transition-colors">
                        Ara
                      </a>
                    )}
                  </div>
                </div>
              </>
            );
          })() : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Mail className="w-14 h-14 mx-auto mb-4 opacity-20" />
                <p className="font-semibold">Bir mesaj seçin</p>
                <p className="text-sm mt-1">Detayları görmek için sol listeden mesaj tıklayın</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
