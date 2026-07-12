import { Search, Plus, X, Printer, MessageSquare, Send, ChevronRight, Calendar, DollarSign, Phone, Mail, Clock, AlertCircle, Image as ImageIcon, Trash2, Truck } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { fetchAdminTickets, createAdminTicket, updateAdminTicket, fetchTicketMessages, createTicketMessage, fetchTicketAttachments, createTicketAttachment, deleteTicketAttachment, triggerTicketWhatsApp, fetchAdminShipments, createAdminShipment } from '../../lib/api';
import MediaPicker from '../../components/ui/MediaPicker';
import { mediaUrl } from '../../lib/media';

const STATUS_COLORS: Record<string, string> = {
  'yeni': 'bg-blue-100 text-blue-700',
  'isleme_alindi': 'bg-purple-100 text-purple-700',
  'parca_bekliyor': 'bg-orange-100 text-orange-700',
  'musteri_onayi_bekliyor': 'bg-amber-100 text-amber-700',
  'cozuldu': 'bg-green-100 text-green-700',
  'kapatildi': 'bg-gray-100 text-gray-500',
  'teslim_edildi': 'bg-teal-100 text-teal-700',
  'iptal': 'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  'yeni': 'Servise Alındı',
  'isleme_alindi': 'Arıza Tespiti',
  'parca_bekliyor': 'Parça Bekleniyor',
  'musteri_onayi_bekliyor': 'Onay Bekleniyor',
  'cozuldu': 'Çözüldü',
  'kapatildi': 'Kapatıldı',
  'teslim_edildi': 'Teslim Edildi',
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
  const [ticketAttachments, setTicketAttachments] = useState<any[]>([]);
  const [ticketShipment, setTicketShipment] = useState<any | null>(null);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState('yurtici');
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
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
    try {
      const atts = await fetchTicketAttachments(ticket.id);
      setTicketAttachments(atts || []);
    } catch (e) {
      setTicketAttachments([]);
    }
    try {
      const shipmentsData = await fetchAdminShipments();
      const match = shipmentsData.find((s: any) => s.ticketId === ticket.id);
      setTicketShipment(match || null);
    } catch (e) {
      setTicketShipment(null);
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

  const handleDeleteAttachment = async (id: number) => {
    if (!window.confirm('Bu görseli silmek istediğinize emin misiniz?')) return;
    try {
      await deleteTicketAttachment(id);
      if (detailTicket) {
        const atts = await fetchTicketAttachments(detailTicket.id);
        setTicketAttachments(atts || []);
      }
    } catch (e: any) {
      alert('Silme hatası: ' + e.message);
    }
  };

  const handleCreateShipment = async () => {
    if (!detailTicket) return;
    setIsCreatingShipment(true);
    try {
      const receiverDetails = `${detailTicket.customerName}\nTel: ${detailTicket.customerPhone || ''}\nCihaz: ${[detailTicket.deviceBrand, detailTicket.deviceModel].filter(Boolean).join(' ') || detailTicket.deviceType || ''}`;
      const payload = {
        ticketId: detailTicket.id,
        carrier: selectedCarrier,
        senderDetails: 'Kerim Bilgisayar Merkez Ofis - İstanbul',
        receiverDetails,
        notes: `${detailTicket.ticketNumber} nolu servis kaydı için otomatik oluşturuldu.`
      };
      const res = await createAdminShipment(payload);
      if (res.success) {
        const shipmentsData = await fetchAdminShipments();
        const match = shipmentsData.find((s: any) => s.ticketId === detailTicket.id);
        setTicketShipment(match || null);
        alert(`Kargo başarıyla oluşturuldu! Takip No: ${res.trackingNumber}`);
      }
    } catch (e: any) {
      alert('Kargo oluşturulurken hata: ' + e.message);
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const FILTER_TABS = [
    { key: 'all', label: 'Tümü' },
    { key: 'yeni', label: 'Servise Alındı' },
    { key: 'isleme_alindi', label: 'Arıza Tespiti' },
    { key: 'parca_bekliyor', label: 'Parça Bekl.' },
    { key: 'musteri_onayi_bekliyor', label: 'Onay Bekl.' },
    { key: 'cozuldu', label: 'Çözüldü' },
    { key: 'teslim_edildi', label: 'Teslim Edildi' },
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
      <div className="flex gap-5 flex-1 overflow-hidden min-h-0">
        {/* Ticket Grid (Always Full Width now) */}
        <div className="w-full overflow-y-auto pb-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => openDetail(ticket)}
                  className={cn(
                    "bg-white rounded-theme border shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col p-5 cursor-pointer",
                    detailTicket?.id === ticket.id ? 'border-primary ring-1 ring-primary' : 'border-gray-200',
                    ticket.status === 'musteri_onayi_bekliyor' && detailTicket?.id !== ticket.id ? 'border-amber-300' : ''
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs font-bold text-gray-400">{ticket.ticketNumber}</span>
                    <div className="flex items-center gap-2">
                      {ticket.status === 'musteri_onayi_bekliyor' && (
                        <span title="Müşteri onayı bekleniyor"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /></span>
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

        {/* Detail Modal (Full Screen Overlay) */}
        {detailTicket && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-6 transition-all duration-300">
            <div className="bg-white w-full h-full md:max-w-6xl md:h-[90vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl shadow-sm">
                    {detailTicket.ticketNumber}
                  </span>
                  <h2 className="font-black text-gray-900 text-base leading-none">{detailTicket.subject}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/print/ticket/${detailTicket.ticketNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Yazdır
                  </Link>
                  <button 
                    onClick={() => setDetailTicket(null)} 
                    className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
                {/* Left Area: Detail & Actions */}
                <div className="w-full lg:w-3/5 overflow-y-auto p-6 space-y-6">
                  
                  {/* Grid fields */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                      <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Müşteri</p>
                      <p className="text-gray-800 font-bold text-sm">{detailTicket.customerName || '—'}</p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 flex flex-col justify-between">
                      <div>
                        <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Telefon</p>
                        <p className="text-gray-800 font-bold text-sm">
                          {detailTicket.customerPhone
                            ? <a href={`tel:${detailTicket.customerPhone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" /> {detailTicket.customerPhone}
                              </a>
                            : '—'}
                        </p>
                      </div>
                      {detailTicket.customerPhone && (
                        <div className="mt-2 flex items-center gap-2">
                          <a
                            href={`https://wa.me/${detailTicket.customerPhone.replace(/\D/g, '').startsWith('0') ? '90' + detailTicket.customerPhone.replace(/\D/g, '').substring(1) : detailTicket.customerPhone.replace(/\D/g, '').startsWith('90') ? detailTicket.customerPhone.replace(/\D/g, '') : '90' + detailTicket.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Merhaba Sayın Müşterimiz, ${detailTicket.ticketNumber} numaralı cihazınızın servis işlemlerini takip etmek için: https://kerimbilgisayar.com/ariza-sorgulama?no=${detailTicket.ticketNumber}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-[10px] font-bold transition-colors"
                          >
                            <Send className="w-3 h-3 text-green-600" /> WhatsApp Web
                          </a>
                          <button
                            onClick={async () => {
                              try {
                                const res = await triggerTicketWhatsApp(detailTicket.id);
                                if (res.success) {
                                  alert('WhatsApp bildirimi arka planda başarıyla sıraya alındı.');
                                } else {
                                  alert('Hata: Gönderilemedi. Ayarları kontrol edin.');
                                }
                              } catch (e: any) {
                                alert('WhatsApp API hatası: ' + e.message);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-colors"
                          >
                            <Send className="w-3 h-3 text-blue-600" /> API ile Gönder
                          </button>
                        </div>
                      )}
                    </div>
                    {detailTicket.customerEmail && (
                      <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                        <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">E-Posta</p>
                        <a href={`mailto:${detailTicket.customerEmail}`} className="text-blue-600 hover:underline flex items-center gap-1 truncate font-bold text-sm">
                          <Mail className="w-3.5 h-3.5 shrink-0" /> {detailTicket.customerEmail}
                        </a>
                      </div>
                    )}
                    <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                      <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Cihaz</p>
                      <p className="text-gray-800 font-bold text-sm">
                        {[detailTicket.deviceBrand, detailTicket.deviceModel].filter(Boolean).join(' ') || detailTicket.deviceType || '—'}
                      </p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                      <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Öncelik</p>
                      <p className={cn('font-bold text-sm', PRIORITY_COLORS[detailTicket.priority || 'normal'])}>
                        ● {PRIORITY_LABELS[detailTicket.priority || 'normal']}
                      </p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                      <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Oluşturulma
                      </p>
                      <p className="text-gray-700 font-bold text-sm">{formatDate(detailTicket.createdAt)}</p>
                    </div>
                  </div>

                  {/* Maliyet */}
                  <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" /> Servis Ücreti / Maliyet
                      </p>
                      {!editingCost && (
                        <button
                          onClick={() => { setEditingCost(true); setCostValue(detailTicket.cost || ''); }}
                          className="text-xs text-blue-600 hover:underline font-bold"
                        >
                          Düzenle
                        </button>
                      )}
                    </div>
                    {editingCost ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₺</span>
                          <input
                            type="number"
                            value={costValue}
                            onChange={e => setCostValue(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                        <button
                          onClick={handleCostSave}
                          disabled={costSaving}
                          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-secondary disabled:opacity-50"
                        >
                          {costSaving ? '...' : 'Kaydet'}
                        </button>
                        <button
                          onClick={() => setEditingCost(false)}
                          className="px-3 py-2 border border-gray-200 text-gray-500 text-xs rounded-xl hover:bg-gray-150"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className={`text-lg font-black ${parseFloat(detailTicket.cost || 0) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {parseFloat(detailTicket.cost || 0) > 0
                          ? `₺${parseFloat(detailTicket.cost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                          : 'Belirtilmedi'}
                      </p>
                    )}
                  </div>

                  {/* Durum Değiştir */}
                  <div className="border border-gray-200 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Durum Değiştir</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => handleStatusChange(detailTicket.id, val)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
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
                    <div className="border border-gray-200 rounded-2xl p-4">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Açıklama / Şikayet</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detailTicket.description}</p>
                    </div>
                  )}

                  {/* Ekli Görseller (Cihaz Fotoğrafları) */}
                  <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Cihaz Görselleri ({ticketAttachments.length})
                      </p>
                      <button
                        onClick={() => setIsMediaPickerOpen(true)}
                        className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Fotoğraf Ekle
                      </button>
                    </div>

                    {ticketAttachments.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Cihaza ait yüklenmiş görsel bulunmamaktadır.</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {ticketAttachments.map(att => (
                          <div key={att.id} className="relative group border border-gray-100 rounded-xl overflow-hidden aspect-video bg-gray-50 flex items-center justify-center">
                            <a href={mediaUrl(att.fileUrl)} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                              <img
                                src={mediaUrl(att.fileUrl)}
                                alt={att.fileName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Kargo Yönetim Entegrasyonu */}
                  <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-blue-500" /> Kargo Yönetim Entegrasyonu
                    </p>

                    {ticketShipment ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-800">
                            {ticketShipment.carrier.toUpperCase()} Kargo
                          </span>
                          <span className="font-mono text-gray-900 bg-white border border-gray-150 px-2 py-0.5 rounded-lg font-bold">
                            {ticketShipment.trackingNumber}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">Kargo Durumu:</span>
                          <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                            {ticketShipment.status === 'hazirlaniyor' ? 'Hazırlanıyor' :
                             ticketShipment.status === 'kargoya_verildi' ? 'Kargoya Verildi' :
                             ticketShipment.status === 'yolda' ? 'Yolda / Dağıtımda' :
                             ticketShipment.status === 'teslim_edildi' ? 'Teslim Edildi' : 'İade Edildi'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">Son Güncelleme: {new Date(ticketShipment.updatedAt || ticketShipment.createdAt).toLocaleDateString('tr-TR')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">Cihazı müşteriye anlaşmalı fiyatlarla göndermek için kargo çıkışı yapın.</p>
                        <div className="flex gap-2">
                          <select
                            value={selectedCarrier}
                            onChange={e => setSelectedCarrier(e.target.value)}
                            className="text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                          >
                            <option value="yurtici">Yurtiçi Kargo (%35 İndirim)</option>
                            <option value="aras">Aras Kargo (%30 İndirim)</option>
                            <option value="mng">MNG Kargo (%25 İndirim)</option>
                            <option value="ptt">PTT Kargo (%40 İndirim)</option>
                          </select>
                          <button
                            onClick={handleCreateShipment}
                            disabled={isCreatingShipment}
                            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            {isCreatingShipment ? '...' : <><Truck className="w-3.5 h-3.5" /> Kargola</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Area: Chat & Internal Notes */}
                <div className="w-full lg:w-2/5 flex flex-col min-h-0 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-gray-200">
                  <div className="p-4 border-b border-gray-200 shrink-0 bg-white">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-blue-500" /> Dahili Notlar ({ticketNotes.length})
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {ticketNotes.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-8">Henüz not eklenmemiş.</p>
                    )}
                    {ticketNotes.map(note => (
                      <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-amber-800">{note.senderName}</span>
                          <span className="text-[10px] text-amber-600 font-medium">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{note.message}</p>
                      </div>
                    ))}
                    <div ref={notesEndRef} />
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-white flex gap-2 shrink-0">
                    <textarea
                      rows={2}
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Dahili not ekle... (Ctrl+Enter ile gönder)"
                      className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-primary outline-none resize-none"
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSendNote(); }}
                    />
                    <button
                      onClick={handleSendNote}
                      disabled={noteSending || !noteText.trim()}
                      className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-xl transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center"
                      title="Gönder (Ctrl+Enter)"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
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

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={async (url) => {
          setIsMediaPickerOpen(false);
          if (!detailTicket) return;
          try {
            await createTicketAttachment(detailTicket.id, {
              fileName: url.split('/').pop() || 'Fotoğraf',
              fileUrl: url,
              fileType: 'image/*',
            });
            const atts = await fetchTicketAttachments(detailTicket.id);
            setTicketAttachments(atts || []);
          } catch (err: any) {
            alert('Dosya ekleme hatası: ' + err.message);
          }
        }}
      />
    </div>
  );
}
