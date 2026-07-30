import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTicket } from '../../lib/api';
import QRCode from 'qrcode';
import { Printer, ArrowLeft } from 'lucide-react';

export default function PrintTicketTagView() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (!ticketNumber) return;
    fetchTicket(ticketNumber)
      .then(async data => {
        setTicket(data);
        if (data && data.ticketNumber) {
          // Seri no / IMEI varsa QR cihaza bağlanır (tüm geçmiş servisleri gösterir);
          // yoksa bu tek fişin durum sorgulamasına düşer (eski davranış).
          const deviceIdentifier = (data.serialNumber || data.imei || '').trim();
          const trackingUrl = deviceIdentifier
            ? `${window.location.origin}/cihaz-gecmisi/${encodeURIComponent(deviceIdentifier)}`
            : `${window.location.origin}/ariza-sorgulama?no=${data.ticketNumber}`;
          const qr = await QRCode.toDataURL(trackingUrl, { margin: 0, width: 200 });
          setQrCodeDataUrl(qr);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [ticketNumber]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <p className="text-red-600 font-bold mb-4">Servis kaydı bulunamadı!</p>
        <button onClick={() => navigate('/admin/servis')} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">Geri Dön</button>
      </div>
    );
  }

  const deviceIdentifier = ticket.serialNumber || ticket.imei || '';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6">
      {/* Control Bar (Screen only) */}
      <div className="print:hidden bg-white border border-gray-200 shadow-md rounded-2xl p-4 mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 border rounded-xl text-xs font-semibold hover:bg-gray-50 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <div className="text-sm font-bold text-gray-800">Cihaz Etiketi — #{ticket.ticketNumber}</div>
        <button onClick={handlePrint} className="px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-secondary flex items-center gap-1.5 shadow-sm">
          <Printer className="w-4 h-4" /> Cihaz Etiketi Bas (50x30mm)
        </button>
      </div>

      {!deviceIdentifier && (
        <div className="print:hidden max-w-[280px] mb-4 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          Bu kayıtta seri no / IMEI girilmemiş — QR kod bu servis fişinin durum sorgulamasına yönlendirecek (cihaz geçmişi takibi için seri no ekleyin).
        </div>
      )}

      {/* Printable Tag Container — 50x30mm yapışkanlı etiket rulosu için tasarlandı.
          40x30mm rulo kullanılıyorsa hem burada hem @media print bloğunda genişliği 40mm'ye çekmeniz yeterli. */}
      <div className="device-label-card bg-white border border-gray-300 shadow-lg w-[220px] h-[132px] print:w-[50mm] print:h-[30mm] rounded-md font-sans text-black flex items-stretch gap-2 p-2.5 print:p-[2mm] print:gap-[1.5mm]">
        {/* Sol: QR Kod */}
        <div className="shrink-0 flex items-center justify-center">
          {qrCodeDataUrl && (
            <img src={qrCodeDataUrl} alt="Cihaz Takip QR" className="w-[88px] h-[88px] print:w-[19mm] print:h-[19mm] object-contain" />
          )}
        </div>

        {/* Sağ: Metin Sütunu */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <p className="font-extrabold text-[9px] print:text-[6.5pt] uppercase tracking-tight leading-tight">KERİM BİLGİSAYAR</p>
            <p className="text-[7px] print:text-[5pt] text-gray-600 font-semibold leading-tight">TEKNİK SERVİS TAKİP ETİKETİ</p>
          </div>

          <div className="space-y-0.5">
            <p className="font-mono text-[9px] print:text-[6.5pt] font-extrabold bg-black text-white px-1 py-0.5 rounded inline-block leading-none">
              {ticket.ticketNumber}
            </p>
            {deviceIdentifier && (
              <p className="font-mono text-[7px] print:text-[5pt] text-gray-700 font-bold leading-tight truncate">
                S/N: {deviceIdentifier}
              </p>
            )}
          </div>

          <p className="text-[7px] print:text-[5pt] text-gray-500 font-semibold leading-tight">
            0541 422 61 71
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: 50mm 30mm;
            margin: 0;
          }
          body, html {
            width: 50mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .device-label-card {
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
