import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Wrench, Clock, AlertTriangle, ShieldCheck, ArrowRight, PackageSearch } from 'lucide-react';
import { fetchDeviceHistory } from '../../lib/api';
import { TICKET_STATUS_LABELS } from '../../lib/ticketStatus';

interface DeviceHistoryEntry {
  ticketNumber: string;
  subject: string;
  type: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  deliveredAt?: string | null;
  customerName: string;
}

const STATUS_BADGE: Record<string, string> = {
  yeni: 'bg-blue-50 text-blue-700 border-blue-200',
  isleme_alindi: 'bg-amber-50 text-amber-700 border-amber-200',
  parca_bekliyor: 'bg-purple-50 text-purple-700 border-purple-200',
  dis_servis: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  musteri_onayi_bekliyor: 'bg-amber-50 text-amber-700 border-amber-200',
  onay_red: 'bg-rose-50 text-rose-700 border-rose-200',
  onarimda: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  cozuldu: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  iade: 'bg-rose-50 text-rose-700 border-rose-200',
  teslim_edildi: 'bg-gray-100 text-gray-700 border-gray-300',
  kapatildi: 'bg-gray-100 text-gray-700 border-gray-300',
  iptal: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function DeviceHistory() {
  const { identifier } = useParams<{ identifier: string }>();
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<{ brand?: string; model?: string; deviceType?: string } | null>(null);
  const [history, setHistory] = useState<DeviceHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) return;
    setLoading(true);
    fetchDeviceHistory(identifier)
      .then((data) => {
        setDevice(data.device);
        setHistory(data.history || []);
        setError(null);
      })
      .catch((err: any) => {
        setError(err.message || 'Cihaz geçmişi bulunamadı.');
      })
      .finally(() => setLoading(false));
  }, [identifier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-lg">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Cihaz Geçmişi Bulunamadı</h2>
          <p className="text-gray-500 text-sm">{error || 'Bu seri no / IMEI ile eşleşen bir servis kaydı bulunamadı.'}</p>
        </div>
      </div>
    );
  }

  const deviceLabel = [device.brand, device.model].filter(Boolean).join(' ') || device.deviceType || 'Cihaz';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-10 px-4 font-sans flex justify-center">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Kerim Bilgisayar Teknik Servisi
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cihaz Servis Geçmişi</h1>
          <p className="text-gray-500 text-xs">{deviceLabel}</p>
        </div>

        {history.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <PackageSearch className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-600 font-semibold">Bu cihaz için henüz servis kaydı bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.ticketNumber} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">{h.ticketNumber}</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_BADGE[h.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {TICKET_STATUS_LABELS[h.status] || h.status}
                  </span>
                </div>
                <p className="text-sm text-gray-800 font-medium">{h.subject}</p>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(h.createdAt).toLocaleDateString('tr-TR')}</span>
                  <span>{h.customerName}</span>
                </div>
                <Link
                  to={`/ariza-sorgulama?no=${h.ticketNumber}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Bu Kaydı Görüntüle <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-2">
          <Wrench className="w-3.5 h-3.5" /> 0541 422 61 71
        </div>
      </div>
    </div>
  );
}
