import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, Wrench, FileText, Phone, Check, X } from 'lucide-react';

interface ApprovalTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  cost: string;
  laborCost: string;
  estimatedCost: string;
  technicianNotes?: string;
  deviceName?: string;
  brand?: string;
  model?: string;
  customerName?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  parts?: Array<{ name: string; quantity: number; unitPrice: string }>;
}

export default function TicketPublicApproval() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<ApprovalTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    fetchTicketInfo();
  }, [ticketNumber]);

  const fetchTicketInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/ticket-approval-info/${ticketNumber}${token ? `?token=${token}` : ''}`);
      if (!res.ok) {
        throw new Error('Servis kaydı bulunamadı veya onay süresi dolmuş.');
      }
      const data = await res.json();
      setTicket(data.ticket);
      if (data.ticket.approvalStatus === 'approved') setActionDone('approved');
      if (data.ticket.approvalStatus === 'rejected') setActionDone('rejected');
    } catch (err: any) {
      setError(err.message || 'Bilgiler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (approved: boolean) => {
    if (!ticket) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/public/ticket-approval-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          approved,
          token,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');

      setActionDone(approved ? 'approved' : 'rejected');
    } catch (err: any) {
      alert(err.message || 'Onay kaydedilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Servis Kaydı Bulunamadı</h2>
          <p className="text-slate-400 text-sm">{error || 'Belirtilen servis numarasına ait onay kaydı bulunamadı.'}</p>
        </div>
      </div>
    );
  }

  const totalCost = Number(ticket.estimatedCost || ticket.cost || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 font-sans flex justify-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Başlık / Marka */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Kerim Bilgisayar Teknik Servisi
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Servis Onay Portalı</h1>
          <p className="text-slate-400 text-xs">Takip No: <span className="font-mono text-white font-bold">{ticket.ticketNumber}</span></p>
        </div>

        {/* Cihaz & Müşteri Kartı */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs text-slate-400">Cihaz Bilgisi</div>
              <div className="text-lg font-semibold text-white">{ticket.brand || ''} {ticket.model || ticket.deviceName || 'Cihaz'}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400">Şikayet / Arıza Beyanı</div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-sm text-slate-200">
              {ticket.description || ticket.subject}
            </div>
          </div>

          {ticket.technicianNotes && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-amber-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Teknisyen Arıza Tespiti & Notu
              </div>
              <div className="bg-amber-950/20 border border-amber-500/20 p-3 rounded-xl text-sm text-amber-200">
                {ticket.technicianNotes}
              </div>
            </div>
          )}
        </div>

        {/* Değişecek Parçalar & İşçilik Özeti */}
        {ticket.parts && ticket.parts.length > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Değişecek Parçalar / İşlemler</div>
            <div className="divide-y divide-slate-800">
              {ticket.parts.map((p, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-200">{p.quantity}x {p.name}</span>
                  <span className="font-semibold text-white">{Number(p.unitPrice) * p.quantity} ₺</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fiyat & Onay Aksiyon Kartı */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Toplam Tahmini Ücret</div>
              <div className="text-3xl font-extrabold text-blue-400">{totalCost.toLocaleString('tr-TR')} ₺</div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              KDV Dahil Net Fiyat
            </div>
          </div>

          {actionDone === 'approved' ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto" />
              <div className="font-bold text-base">Teklifi Onayladınız</div>
              <div className="text-xs text-emerald-300">Teknisyenimiz işlemlere başlamıştır. Teşekkür ederiz.</div>
            </div>
          ) : actionDone === 'rejected' ? (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl text-rose-400 text-center space-y-2">
              <XCircle className="w-10 h-10 mx-auto" />
              <div className="font-bold text-base">Teklif Reddedildi</div>
              <div className="text-xs text-rose-300">Cihazınız işleme alınmadan iade sürecine kaydırılmıştır.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDecision(false)}
                className="py-3.5 px-4 rounded-xl border border-rose-500/40 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Reddet
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDecision(true)}
                className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold text-sm hover:opacity-90 shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Onayla ve Başlat
              </button>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Phone className="w-3.5 h-3.5" /> Detaylı bilgi için bizi arayabilirsiniz: 0541 422 61 71
        </div>
      </div>
    </div>
  );
}
