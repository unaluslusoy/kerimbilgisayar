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
          const queryUrl = `${window.location.origin}/ariza-sorgulama?no=${data.ticketNumber}`;
          const qr = await QRCode.toDataURL(queryUrl, { margin: 1, width: 140 });
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6">
      {/* Control Bar (Screen only) */}
      <div className="print:hidden bg-white border border-gray-200 shadow-md rounded-2xl p-4 mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 border rounded-xl text-xs font-semibold hover:bg-gray-50 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <div className="text-sm font-bold text-gray-800">Cihaz Etiketi — #{ticket.ticketNumber}</div>
        <button onClick={handlePrint} className="px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-secondary flex items-center gap-1.5 shadow-sm">
          <Printer className="w-4 h-4" /> Termal Etiket Bas (58mm/80mm)
        </button>
      </div>

      {/* Printable Tag Container */}
      <div className="thermal-tag-card bg-white border border-gray-300 shadow-lg p-4 w-[280px] print:w-[76mm] rounded-lg font-sans text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-2">
          <p className="font-extrabold text-sm tracking-tight uppercase">KERİM BİLGİSAYAR</p>
          <p className="text-[11px] font-bold text-gray-800">TEKNİK SERVİS CİHAZ ETİKETİ</p>
        </div>

        <div className="text-center my-2">
          <span className="font-mono text-base font-extrabold bg-black text-white px-3 py-1 rounded inline-block">
            {ticket.ticketNumber}
          </span>
        </div>

        <div className="text-[12px] space-y-1 border-y border-dashed border-gray-800 py-2 my-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-700">Müşteri:</span>
            <span className="font-extrabold text-black truncate max-w-[170px]">{ticket.customerName || '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-700">Cihaz:</span>
            <span className="font-extrabold text-black truncate max-w-[170px]">{[ticket.deviceBrand, ticket.deviceModel].filter(Boolean).join(' ') || ticket.deviceType || '—'}</span>
          </div>
          {ticket.deviceSerial && (
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">Seri No:</span>
              <span className="font-mono text-[11px] font-bold text-black">{ticket.deviceSerial}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-700">Tarih:</span>
            <span className="text-[11px] font-bold text-black">{new Date(ticket.createdAt).toLocaleDateString('tr-TR')}</span>
          </div>
        </div>

        {/* QR Code */}
        {qrCodeDataUrl && (
          <div className="flex flex-col items-center justify-center pt-1">
            <img src={qrCodeDataUrl} alt="QR Code" className="w-28 h-28" />
            <p className="text-[9px] font-extrabold text-gray-800 mt-1">ARIZA SORGULAMA QR KODU</p>
          </div>
        )}

        {/* Thermal Cutter Clearance Gap (Auto-Cutter Margins) */}
        <div className="mt-8 pt-6 border-t border-dashed border-gray-400 text-center font-mono text-[8pt] text-gray-500">
          --- KESİM NOKTASI ---
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body, html {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .thermal-tag-card {
            width: 76mm !important;
            margin: 0 auto !important;
            padding: 4mm 3mm !important;
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
