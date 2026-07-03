import { useState, useEffect } from 'react';
import { Inbox, Search, Wrench, Building, PhoneCall, Mail, CheckCircle2 } from 'lucide-react';
import { fetchAdminLeads, updateLeadStatus, convertLeadToTicket } from '../../lib/api';
import { cn } from '../../lib/utils';

const STATUS_LABELS: Record<string, string> = {
  new: 'Yeni',
  contacted: 'İletişime Geçildi',
  qualified: 'Nitelikli',
  lost: 'Kayıp',
  converted: 'Dönüştürüldü',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
  converted: 'bg-gray-100 text-gray-500',
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    try { const d = await fetchAdminLeads(); setLeads(d); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateLeadStatus(id, status);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch (e: any) { alert('Hata: ' + e.message); }
  };

  const handleConvert = async (id: number) => {
    if (!confirm('Bu başvuruyu servis kaydına dönüştürmek istediğinizden emin misiniz?')) return;
    try {
      const res = await convertLeadToTicket(id);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'converted' } : l));
      alert(`Servis kaydı oluşturuldu: ${res.ticketNumber}`);
    } catch (e: any) { alert('Hata: ' + e.message); }
  };

  const filtered = leads.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchSearch = !search ||
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.companyName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const newCount = leads.filter(l => l.status === 'new').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Başvurular ve Randevular
            {newCount > 0 && (
              <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                {newCount} Yeni
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Web sitesinden gelen randevu ve servis talepleri.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {['all', 'new', 'contacted', 'qualified', 'lost', 'converted'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-theme text-xs font-semibold transition-colors',
                statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {s === 'all' ? 'Tümü' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Ad, telefon veya firma..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-theme text-sm focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      {/* Leads */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-theme border border-gray-200 text-gray-400">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Başvuru bulunamadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(lead => (
            <div key={lead.id} className="bg-white rounded-theme border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{lead.name}</h3>
                    <span className={cn('px-2 py-0.5 text-[11px] font-bold rounded-full', STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600')}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </div>
                  {lead.companyName && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Building className="w-3 h-3" /> {lead.companyName}
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <PhoneCall className="w-3 h-3" /> {lead.phone}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 shrink-0 text-right">
                  <div>{lead.source || 'Web'}</div>
                  <div>{new Date(lead.createdAt).toLocaleDateString('tr-TR')}</div>
                </div>
              </div>

              {lead.notes && (
                <div className="bg-gray-50 rounded-theme p-3 text-xs text-gray-600 border border-gray-100 whitespace-pre-line">
                  {lead.notes}
                </div>
              )}

              <div className="flex gap-2 pt-1 flex-wrap">
                {lead.status !== 'converted' && (
                  <select
                    value={lead.status}
                    onChange={e => handleStatusChange(lead.id, e.target.value)}
                    className="flex-1 border border-gray-200 rounded-theme px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary bg-gray-50 min-w-0"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                )}
                {lead.status === 'converted' && (
                  <span className="flex-1 flex items-center gap-1.5 text-xs text-green-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Servise Dönüştürüldü
                  </span>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-secondary hover:bg-blue-100 rounded-theme text-xs font-semibold transition-colors"
                    title="Ara"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Ara
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-theme text-xs font-semibold transition-colors border border-gray-200"
                    title="E-Posta Gönder"
                  >
                    <Mail className="w-3.5 h-3.5" /> E-Posta
                  </a>
                )}
                {lead.status !== 'converted' && (
                  <button
                    onClick={() => handleConvert(lead.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-theme text-xs font-semibold transition-colors border border-green-200"
                    title="Bu başvuruyu servis kaydına dönüştür"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Servise Dönüştür
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
