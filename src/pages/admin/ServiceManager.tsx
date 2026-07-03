import { Search, Plus, X, Printer, MessageSquare, Send, ChevronRight, Calendar, DollarSign, Phone, Mail, Clock, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { fetchAdminTickets, createAdminTicket, updateAdminTicket, fetchTicketMessages, createTicketMessage } from '../../lib/api';

const STATUS_COLORS: Record<string, string> = {
  'yeni': 'bg-blue-100 text-blue-700',
  'isleme_alindi': 'bg-purple-100 text-purple-700',
  'parca_bekliyor': 'bg-orange-100 text-orange-700',
  'musteri_onaji_bekliyor': 'bg-amber-100 text-amber-700',
  'cozuldu': 'bg-green-100 text-green-700',
  'kapatildi': 'bg-gray-100 text-gray-500',
  'iptal': 'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  'yeni': 'Servise Alındı',
  'isleme_alindi': 'Arıza Tespiti',
  'parca_bekliyor': 'Parça Bekleniyor',
  'musteri_onaji_bekliyor': 'Onay Bekleniyor',
  'cozuldu': 'Çözüldü',
  'kapatildi': 'Kapatıldı',
  'iptal': 'İptal',
};

const PRIORITY_LABELS: Record<string, string> = {
  'dusuk': 'Düşük',
  'normal': 'Normal',
  'yuksek': 'Yüksek',
  'acil': 'Acil',
};

const PRIORITY_COLORS: Record<string, string> = {
  'dusuk': 'text-gray-400',
  'normal': 'text-blue-500',
  'yuksek': 'text-orange-500',
  'acil': 'text-red-600 font-bold',
};

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ServiceManager() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detay paneli
  const [detailTicket, setDetailTicket] = useState<any>(null);
  const [ticketNotes, setTicketNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteSending, setNoteSending] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Maliyet düzenleme
  const [editingCost, setEditingCost] = useState(false);
  const [costValue, setCostValue] = useState('');
  const [costSaving, setCostSaving] = useState(false);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    type: 'ariza',
    priority: 'normal',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deviceType: '',
    deviceBrand: '',
    deviceModel: '',
  });

  const loadTickets = async () => {
    try {
      const data = await fetchAdminTickets();
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  // Filter counts
  const statusCounts: Record<string, number> = { all: tickets.length };
  tickets.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  const filtered = tickets.filter(t => {
    const matchStatus = filter === 'all' || t.status === filter;
    const matchSearch = search === '' ||
      t.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.customerPhone?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleCreate = async () => {
    if (!newTicket.subject || !newTicket.customerName) return;
    setSaving(true);
    try {
      await createAdminTicket(newTicket);
      setShowModal(false);
      setNewTicket({ subject: '', description: '', type: 'ariza', priority: 'normal', customerName: '', customerPhone: '', customerEmail: '', deviceType: '', deviceBrand: '', deviceModel: '' });
      await loadTickets();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateAdminTicket(id, { status });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      if (detailTicket?.id === id) setDetailTicket((prev: any) => ({ ...prev, status }));
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const handleCostSave = async () => {
    if (!detailTicket) return;
    setCostSaving(true);
    try {
      const cost = parseFloat(costValue) || 0;
      await updateAdminTicket(detailTicket.id, { cost });
      setDetailTicket((prev: any) => ({ ...prev, cost }));
      setTickets(prev => prev.map(t => t.id === detailTicket.id ? { ...t, cost } : t));
      setEditingCost(false);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setCostSaving(false);
    }
  };

  const openDetail = async (ticket: any) => {
    setDetailTicket(ticket);
    setCostValue(ticket.cost || '');
    setEditingCost(false);
    setNoteText('');
    try {
      const msgs = await fetchTicketMessages(ticket.id);
      setTicketNotes(msgs);
      setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setTicketNotes([]);
    }
  };

  const handleSendNote = async () => {
    if (!noteText.trim() || !detailTicket) return;
    setNoteSending(true);
    try {
      await createTicketMessage({ ticketId: detailTicket.id, message: noteText.trim(), isInternal: true });
      const msgs = await fetchTicketMessages(detailTicket.id);
      setTicketNotes(msgs);
      setNoteText('');
      setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setNoteSending(false);
    }
  };

  const FILTER_TABS = [
    { key: 'all', label: 'Tümü' },
    { key: 'yeni', label: 'Servise Alındı' },
    { key: 'isleme_alindi', label: 'Arıza Tespiti' },
    { key: 'parca_bekliyor', label: 'Parça Bekl.' },
    { key: 'musteri_onaji_bekliyor', label: 'Onay Bekl.' },
    { key: 'cozuldu', label: 'Çözüldü' },
    { key: 'kapatildi', label: 'Kapatıldı' },
  ];

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Servis Kayıtları</h1>
          <p className="text-sm text-gray-500 mt-1">Teknik servis ve onarım süreçlerini yönetin.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-theme font-medium transition-colors flex items-center shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Yeni Kayıt
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-theme border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center shrink-0">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-theme text-xs font-semibold transition-colors inline-flex items-center gap-1.5",
                filter === tab.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {tab.label}
              {statusCounts[tab.key] !== undefined && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  filter === tab.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                )}>
                  {statusCounts[tab.key] || 0}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-56 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Kayıt no, müşteri, telefon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-theme text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main layout: list + detail panel */}
      <div className={`flex gap-5 flex-1 overflow-hidden min-h-0`}>
        {/* Ticket Grid */}
        <div className={`${detailTicket ? 'hidden xl:block xl:w-1/2' : 'w-full'} overflow-y-auto pb-4`}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-semibold text-lg">Kayıt bulunamadı</p>
              <p className="text-sm mt-1">Filtrelerinizi değiştirin veya yeni kayıt oluşturun.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => openDetail(ticket)}
                  className={cn(
                    "bg-white rounded-theme border shadow-sm hover:shadow-md transition-all flex flex-col p-5 cursor-pointer",
                    detailTicket?.id === ticket.id ? 'border-primary ring-1 ring-primary' : 'border-gray-200',
                    ticket.status === 'musteri_onaji_bekliyor' && detailTicket?.id !== ticket.id ? 'border-amber-300' : ''
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs font-bold text-gray-400">{ticket.ticketNumber}</span>
                    <div className="flex items-center gap-2">
                      {ticket.status === 'musteri_onaji_bekliyor' && (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" title="Müşteri onayı bekleniyor" />
                      )}
                      <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold", STATUS_COLORS[ticket.status || 'yeni'])}>
                        {STATUS_LABELS[ticket.status || 'yeni']}
                      </span>
                      <Link
                        to={`/print/ticket/${ticket.ticketNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Yazdır"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm line-clamp-1">{ticket.subject}</h3>
                  <p className="text-xs text-gray-500 mb-0.5">{ticket.customerName}</p>
                  {ticket.customerPhone && (
                    <p className="text-xs text-gray-400 mb-2">{ticket.customerPhone}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400">
                    <span className={cn('font-semibold', PRIORITY_COLORS[ticket.priority || 'normal'])}>
                      ● {PRIORITY_LABELS[ticket.priority || 'normal']}
                    </span>
                    <span className="text-[10px]">
                      {new Date(ticket.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {detailTicket && (
          <div className="flex-1 xl:w-1/2 bg-white rounded-theme border border-gray-200 shadow-sm flex flex-col overflow-hidden min-w-0">
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <p className="font-mono text-xs text-gray-400 font-bold">{detailTicket.ticketNumber}</p>
                <h2 className="font-bold text-gray-900 text-sm mt-0.5 line-clamp-1">{detailTicket.subject}</h2>
              </div>
              <button onClick={() => setDetailTicket(null)} className="p-1.5 hover:bg-gray-100 rounded-theme text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ticket Info */}
            <div className="p-4 border-b border-gray-100 grid grid-cols-2 gap-3 text-xs shrink-0">
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Müşteri</p>
                <p className="text-gray-800 font-medium">{detailTicket.customerName || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Telefon</p>
                <p className="text-gray-800 flex items-center gap-1">
                  {detailTicket.customerPhone
                    ? <a href={`tel:${detailTicket.customerPhone}`} className="hover:text-primary flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {detailTicket.customerPhone}
                      </a>
                    : '—'}
                </p>
              </div>
              {detailTicket.customerEmail && (
                <div>
                  <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">E-Posta</p>
                  <a href={`mailto:${detailTicket.customerEmail}`} className="text-primary hover:underline flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" /> {detailTicket.customerEmail}
                  </a>
                </div>
              )}
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Cihaz</p>
                <p className="text-gray-800">{[detailTicket.deviceBrand, detailTicket.deviceModel].filter(Boolean).join(' ') || detailTicket.deviceType || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Öncelik</p>
                <p className={cn('font-semibold', PRIORITY_COLORS[detailTicket.priority || 'normal'])}>
                  {PRIORITY_LABELS[detailTicket.priority || 'normal']}
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Oluşturulma
                </p>
                <p className="text-gray-700">{formatDate(detailTicket.createdAt)}</p>
              </div>
            </div>

            {/* Maliyet */}
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Servis Ücreti / Maliyet
                </p>
                {!editingCost && (
                  <button
                    onClick={() => { setEditingCost(true); setCostValue(detailTicket.cost || ''); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Düzenle
                  </button>
                )}
              </div>
              {editingCost ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₺</span>
                    <input
                      type="number"
                      value={costValue}
                      onChange={e => setCostValue(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-3 py-1.5 border border-gray-300 rounded-theme text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <button
                    onClick={handleCostSave}
                    disabled={costSaving}
                    className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-theme hover:bg-secondary disabled:opacity-50"
                  >
                    {costSaving ? '...' : 'Kaydet'}
                  </button>
                  <button
                    onClick={() => setEditingCost(false)}
                    className="px-2 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-theme hover:bg-gray-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <p className={`text-sm font-bold ${parseFloat(detailTicket.cost || 0) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                  {parseFloat(detailTicket.cost || 0) > 0
                    ? `₺${parseFloat(detailTicket.cost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                    : 'Belirtilmedi'}
                </p>
              )}
            </div>

            {/* Durum Değiştir */}
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Durum Değiştir</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => handleStatusChange(detailTicket.id, val)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors',
                      detailTicket.status === val
                        ? STATUS_COLORS[val] + ' border-current'
                        : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Açıklama */}
            {detailTicket.description && (
              <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Açıklama</p>
                <p className="text-xs text-gray-700 leading-relaxed">{detailTicket.description}</p>
              </div>
            )}

            {/* Notlar */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Dahili Notlar ({ticketNotes.length})
              </p>
              {ticketNotes.length === 0 && (
                <p className="text-xs text-gray-400 italic">Henüz not eklenmemiş.</p>
              )}
              {ticketNotes.map(note => (
                <div key={note.id} className="bg-amber-50 border border-amber-200 rounded-theme p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-amber-800">{note.senderName}</span>
                    <span className="text-[10px] text-amber-600">{formatDate(note.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-700 whitespace-pre-line">{note.message}</p>
                </div>
              ))}
              <div ref={notesEndRef} />
            </div>

            {/* Not Ekle */}
            <div className="p-3 border-t border-gray-200 flex gap-2 shrink-0">
              <textarea
                rows={2}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Dahili not ekle... (Ctrl+Enter gönderin)"
                className="flex-1 border border-gray-300 rounded-theme px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSendNote(); }}
              />
              <button
                onClick={handleSendNote}
                disabled={noteSending || !noteText.trim()}
                className="px-3 py-2 bg-primary hover:bg-secondary text-white rounded-theme transition-colors disabled:opacity-50 shrink-0"
                title="Not Gönder (Ctrl+Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Yeni Servis Kaydı</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Adı *</label>
                  <input
                    type="text" value={newTicket.customerName}
                    onChange={e => setNewTicket({ ...newTicket, customerName: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ad Soyad"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="text" value={newTicket.customerPhone}
                    onChange={e => setNewTicket({ ...newTicket, customerPhone: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Posta (Otomatik Bilgilendirme İçin)</label>
                <input
                  type="email" value={newTicket.customerEmail}
                  onChange={e => setNewTicket({ ...newTicket, customerEmail: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="musteri@ornek.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konu *</label>
                <input
                  type="text" value={newTicket.subject}
                  onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Servis konusu..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cihaz Türü</label>
                  <input
                    type="text" value={newTicket.deviceType}
                    onChange={e => setNewTicket({ ...newTicket, deviceType: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Laptop"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                  <input
                    type="text" value={newTicket.deviceBrand}
                    onChange={e => setNewTicket({ ...newTicket, deviceBrand: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Dell"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text" value={newTicket.deviceModel}
                    onChange={e => setNewTicket({ ...newTicket, deviceModel: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="XPS 15"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
                  <select value={newTicket.type} onChange={e => setNewTicket({ ...newTicket, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary">
                    <option value="ariza">Arıza</option>
                    <option value="destek">Destek</option>
                    <option value="kurulum">Kurulum</option>
                    <option value="bakim">Bakım</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
                  <select value={newTicket.priority} onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary">
                    <option value="dusuk">Düşük</option>
                    <option value="normal">Normal</option>
                    <option value="yuksek">Yüksek</option>
                    <option value="acil">Acil</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama / Şikayet</label>
                <textarea rows={3} value={newTicket.description}
                  onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Müşterinin bildirdiği arıza veya talep..."
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50 transition-colors">
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newTicket.subject || !newTicket.customerName}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                Kayıt Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
