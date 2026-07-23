import { useEffect, useState } from 'react';
import { Shield, Search, Filter, ChevronLeft, ChevronRight, User, Clock, Activity, Eye } from 'lucide-react';
import { fetchAuditLogs } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';

const ACTION_LABELS: Record<string, string> = {
  'ticket.created': 'Servis Oluşturuldu',
  'ticket.updated': 'Servis Güncellendi',
  'ticket.deleted': 'Servis Silindi',
  'ticket.status_changed': 'Durum Değişti',
  'user.created': 'Kullanıcı Oluşturuldu',
  'user.updated': 'Kullanıcı Güncellendi',
  'user.deleted': 'Kullanıcı Silindi',
  'customer.created': 'Müşteri Oluşturuldu',
  'customer.updated': 'Müşteri Güncellendi',
  'stock.created': 'Stok Eklendi',
  'stock.updated': 'Stok Güncellendi',
  'stock.adjusted': 'Stok Ayarlandı',
  'sale.created': 'Satış Yapıldı',
  'invoice.created': 'Fatura Oluşturuldu',
  'invoice.updated': 'Fatura Güncellendi',
  'settings.updated': 'Ayarlar Güncellendi',
  'login.success': 'Giriş Yapıldı',
  'login.failed': 'Başarısız Giriş',
  'page.created': 'Sayfa Oluşturuldu',
  'page.updated': 'Sayfa Güncellendi',
  'blog.created': 'Blog Yazıldı',
  'blog.updated': 'Blog Güncellendi',
};

const ENTITY_COLORS: Record<string, string> = {
  'Ticket': 'bg-blue-100 text-blue-700',
  'User': 'bg-purple-100 text-purple-700',
  'Customer': 'bg-green-100 text-green-700',
  'StockItem': 'bg-amber-100 text-amber-700',
  'Sale': 'bg-emerald-100 text-emerald-700',
  'Invoice': 'bg-pink-100 text-pink-700',
  'Settings': 'bg-gray-100 text-gray-600',
  'Page': 'bg-indigo-100 text-indigo-700',
  'BlogPost': 'bg-orange-100 text-orange-700',
};

export default function AdminAuditLogs() {
  usePageTitle('Denetim Logları');

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const limit = 25;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs({
        page,
        limit,
        entityType: entityFilter || undefined,
        action: search || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      });
      setLogs(data.logs || []);
      setTotalCount(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [page, entityFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(totalCount / limit);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Denetim Logları
        </h1>
        <p className="text-sm text-gray-500 mt-1">Sistemdeki tüm kullanıcı aksiyonlarının kaydı.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-theme border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Aksiyon ara (ör: ticket.created)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-theme text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <select
            value={entityFilter}
            onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">Tüm Modüller</option>
            <option value="Ticket">Servis</option>
            <option value="User">Kullanıcı</option>
            <option value="Customer">Müşteri</option>
            <option value="StockItem">Stok</option>
            <option value="Sale">Satış</option>
            <option value="Invoice">Fatura</option>
            <option value="Settings">Ayarlar</option>
            <option value="Page">Sayfa</option>
            <option value="BlogPost">Blog</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            placeholder="Başlangıç"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            placeholder="Bitiş"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Henüz denetim logu bulunamadı</p>
            <p className="text-xs mt-1">Filtrelerinizi kontrol edin veya farklı tarih aralığı seçin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tarih</th>
                  <th className="px-4 py-3 font-semibold">Kullanıcı</th>
                  <th className="px-4 py-3 font-semibold">Aksiyon</th>
                  <th className="px-4 py-3 font-semibold">Modül</th>
                  <th className="px-4 py-3 font-semibold">IP Adresi</th>
                  <th className="px-4 py-3 font-semibold w-10">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log: any) => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(log.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">{log.userName || 'Sistem'}</p>
                            <p className="text-[10px] text-gray-400">{log.userEmail || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-700">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.entityType && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${ENTITY_COLORS[log.entityType] || 'bg-gray-100 text-gray-600'}`}>
                            {log.entityType} #{log.entityId || ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-400">{log.ipAddress || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {log.details && (
                          <button
                            onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                            className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                            title="Detayları göster"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedRow === log.id && log.details && (
                      <tr key={`detail-${log.id}`} className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="text-xs">
                            <p className="font-semibold text-gray-600 mb-1">Değişiklik Detayları:</p>
                            <pre className="bg-white border border-gray-200 rounded-theme p-3 text-xs text-gray-600 overflow-x-auto max-h-40">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Toplam <span className="font-semibold">{totalCount}</span> kayıt • Sayfa {page} / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-theme border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 rounded-theme text-xs font-medium transition-colors ${
                      p === page ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-theme border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
