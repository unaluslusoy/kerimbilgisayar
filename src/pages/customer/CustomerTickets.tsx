import React, { useEffect, useState } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import {
  Package, Clock, CheckCircle, Wrench, AlertCircle,
  FileText, Printer, ChevronDown, ChevronUp, MessageSquare, X
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  yeni: { label: 'Servise Alındı', color: 'bg-blue-100 text-blue-800', icon: Package },
  isleme_alindi: { label: 'İşlemde', color: 'bg-yellow-100 text-yellow-800', icon: Wrench },
  parca_bekliyor: { label: 'Parça Bekleniyor', color: 'bg-orange-100 text-orange-800', icon: Clock },
  musteri_onaji_bekliyor: { label: 'Onay Bekleniyor', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  cozuldu: { label: 'Çözüldü', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  kapatildi: { label: 'Teslim Edildi', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
  iptal: { label: 'İptal', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
};

const STEPS = ['yeni', 'isleme_alindi', 'parca_bekliyor', 'musteri_onaji_bekliyor', 'cozuldu', 'kapatildi'];

function SkeletonRow() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-48" />
      <div className="h-3 bg-gray-200 rounded w-36" />
    </div>
  );
}

function ProgressBar({ status }: { status: string }) {
  if (['kapatildi', 'cozuldu', 'iptal'].includes(status)) {
    return null;
  }
  const idx = STEPS.indexOf(status);
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / (STEPS.length)) * 100);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
        <span>Servis İlerlemesi</span>
        <span>%{pct}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TicketDetailModal({ ticket, onClose }: { ticket: any; onClose: () => void }) {
  const status = STATUS_MAP[ticket.status] || STATUS_MAP['yeni'];
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-gray-400 font-bold">{ticket.ticketNumber}</p>
            <h2 className="font-bold text-gray-900 mt-1">{ticket.subject}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${status.color}`}>
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </span>
          </div>
          <ProgressBar status={ticket.status} />
        </div>

        {/* Info Grid */}
        <div className="p-5 grid grid-cols-2 gap-4 text-sm border-b border-gray-100">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Cihaz</p>
            <p className="text-gray-800 font-medium">
              {[ticket.deviceBrand, ticket.deviceModel].filter(Boolean).join(' ') || ticket.deviceType || '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Tür</p>
            <p className="text-gray-800 font-medium capitalize">{ticket.type || '—'}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Oluşturulma</p>
            <p className="text-gray-800">
              {new Date(ticket.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Maliyet</p>
            <p className={`font-bold ${parseFloat(ticket.cost || 0) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
              {parseFloat(ticket.cost || 0) > 0
                ? `₺${parseFloat(ticket.cost).toLocaleString('tr-TR')}`
                : 'Belirtilmedi'}
            </p>
          </div>
        </div>

        {/* Description */}
        {ticket.description && (
          <div className="p-5 border-b border-gray-100">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Açıklama / Şikayet</p>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{ticket.description}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-5 flex gap-3">
          <Link
            to={`/print/ticket/${ticket.ticketNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            Formu Yazdır
          </Link>
          <button
            onClick={onClose}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerTickets() {
  const { token } = useCustomerAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/customer/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setTickets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [token]);

  const filtered = tickets.filter(t => {
    if (filter === 'active') return !['cozuldu', 'kapatildi', 'iptal'].includes(t.status);
    if (filter === 'completed') return ['cozuldu', 'kapatildi'].includes(t.status);
    return true;
  });

  const activeCount = tickets.filter(t => !['cozuldu', 'kapatildi', 'iptal'].includes(t.status)).length;
  const completedCount = tickets.filter(t => ['cozuldu', 'kapatildi'].includes(t.status)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Servis Geçmişim</h1>
        <p className="text-sm text-gray-500 mt-1">Tüm cihazlarınız ve servis durumları</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: `Tümü (${tickets.length})` },
          { key: 'active', label: `Aktif (${activeCount})` },
          { key: 'completed', label: `Tamamlanan (${completedCount})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              filter === f.key
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ticket Cards */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Bu kategoride kayıt bulunamadı.</p>
          </div>
        ) : (
          filtered.map(ticket => {
            const status = STATUS_MAP[ticket.status] || STATUS_MAP['yeni'];
            const StatusIcon = status.icon;
            const isExpanded = expandedId === ticket.id;

            return (
              <div
                key={ticket.id}
                className={`bg-white rounded-xl border transition-all duration-200 ${
                  ticket.status === 'musteri_onaji_bekliyor'
                    ? 'border-red-200 ring-1 ring-red-100'
                    : 'border-gray-100'
                }`}
              >
                {/* Card Main Row */}
                <div
                  className="p-5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-xl"
                  onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : ticket.id);
                    }
                  }}
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  role="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-gray-400">{ticket.ticketNumber}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {[ticket.deviceBrand, ticket.deviceModel].filter(Boolean).join(' ') || ticket.deviceType || 'Bilinmeyen Cihaz'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{ticket.subject}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {new Date(ticket.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                    </div>
                  </div>
                  <ProgressBar status={ticket.status} />
                </div>

                {/* Expanded Row */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50/50 rounded-b-xl">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Maliyet</p>
                        <p className="font-bold text-gray-800">
                          {parseFloat(ticket.cost || 0) > 0
                            ? `₺${parseFloat(ticket.cost).toLocaleString('tr-TR')}`
                            : 'Belirtilmedi'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Oluşturulma</p>
                        <p className="text-gray-700">
                          {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      {ticket.description && (
                        <div className="col-span-2 sm:col-span-3">
                          <p className="text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Açıklama</p>
                          <p className="text-gray-700 line-clamp-2">{ticket.description}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); }}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Detayları Gör
                      </button>
                      <Link
                        to={`/print/ticket/${ticket.ticketNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Yazdır
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}
