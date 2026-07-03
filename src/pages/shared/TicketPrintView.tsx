import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { fetchTicket } from '../../lib/api';
import { Printer, Receipt } from 'lucide-react';

export default function TicketPrintView() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState<'select' | 'a4' | 'pos'>('select');

  useEffect(() => {
    if (ticketNumber) {
      fetchTicket(ticketNumber)
        .then((data) => {
          setTicket(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [ticketNumber]);

  useEffect(() => {
    const handleAfterPrint = () => {
      // Revert to select mode after printing dialog closes
      setPrintMode('select');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const triggerPrint = (mode: 'a4' | 'pos') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 300); // Give DOM time to update with new layout
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Yükleniyor...</div>;
  if (!ticket) return (
    <div className="p-8 text-center text-red-600 font-medium">
      Servis kaydı bulunamadı. <button onClick={() => navigate(-1)} className="underline ml-2">Geri Dön</button>
    </div>
  );

  const statusMap: any = {
    'pending': 'Yeni',
    'diagnosing': 'İşlemde',
    'waiting_parts': 'Parça/Onay Bekleniyor',
    'ready': 'Çözüldü',
    'delivered': 'Teslim Edildi / Kapatıldı'
  };

  // --- COMPONENT: POS (80mm) Receipt Layout ---
  const PosReceipt = () => (
    <div className="pos-receipt mx-auto bg-white text-black text-[12px] font-mono leading-tight w-[80mm] p-2 print:p-0 print:w-full print:max-w-full">
      <div className="text-center mb-4">
        <h1 className="font-bold text-lg uppercase mb-1">{settings.site_name || 'Servis'}</h1>
        <p className="text-[10px]">{settings.contact_address}</p>
        <p className="text-[10px]">Tel: {settings.contact_phone}</p>
      </div>

      <div className="border-b border-dashed border-black pb-2 mb-2">
        <h2 className="text-center font-bold text-[14px]">SERVİS FORMU</h2>
        <p className="text-center font-bold text-[16px] mt-1">{ticketNumber}</p>
      </div>

      <div className="mb-2">
        <p><span className="font-bold">Tarih:</span> {new Date(ticket.createdAt).toLocaleDateString('tr-TR')} {new Date(ticket.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</p>
        <p><span className="font-bold">Müşteri:</span> {ticket.customerName}</p>
      </div>

      <div className="border-t border-dashed border-black pt-2 mb-2">
        <p><span className="font-bold">Cihaz:</span> {ticket.deviceType}</p>
        <p><span className="font-bold">Model:</span> {ticket.brandModel}</p>
        <p><span className="font-bold">Durum:</span> {statusMap[ticket.status] || ticket.status}</p>
      </div>

      <div className="border-t border-dashed border-black pt-2 mb-2">
        <p className="font-bold">Şikayet / Detay:</p>
        <p className="mt-1 whitespace-pre-wrap">{ticket.issueDescription || '-'}</p>
      </div>

      {ticket.estimatedCost && parseFloat(ticket.estimatedCost) > 0 && (
        <div className="border-t border-dashed border-black pt-2 mb-4 text-right">
          <p className="font-bold text-[14px]">TUTAR: ₺{parseFloat(ticket.estimatedCost).toLocaleString('tr-TR')}</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="font-bold mb-8">Müşteri İmzası</p>
        <p>_______________________</p>
      </div>

      <div className="mt-6 text-center text-[10px]">
        <p>Bizi tercih ettiğiniz için teşekkür ederiz.</p>
        <p>Cihazınızı teslim alırken bu fişi ibraz etmeniz gerekmektedir.</p>
      </div>
    </div>
  );

  // --- COMPONENT: Single A5 Form Layout ---
  const A5Form = ({ copyType }: { copyType: 'MÜŞTERİ NÜSHASI' | 'FİRMA NÜSHASI' }) => (
    <div className="bg-white text-black font-sans w-full p-4 print:p-2 box-border h-[148mm]">
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-2 mb-3">
        <div>
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-10 mb-1" />
          ) : (
            <h1 className="text-xl font-extrabold tracking-tight uppercase">
              {settings.site_name || 'Servis'}
            </h1>
          )}
          <p className="text-[11px] text-gray-700">{settings.contact_address}</p>
          <p className="text-[11px] text-gray-700">Tel: {settings.contact_phone} | Email: {settings.contact_email}</p>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-800">Servis Kabul Formu</h2>
          <p className="text-[10px] font-bold text-gray-500 mb-1">{copyType}</p>
          <div className="inline-block border border-gray-400 p-1 bg-gray-50 text-center min-w-[120px]">
             <p className="text-sm font-bold font-mono">{ticketNumber}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-b border-gray-300 pb-3 mb-3 text-xs">
        <div>
          <h3 className="font-bold border-b border-gray-200 pb-1 mb-1 uppercase text-[11px]">Müşteri Bilgileri</h3>
          <p><span className="font-semibold inline-block w-20">Ad Soyad:</span> {ticket.customerName}</p>
          <p><span className="font-semibold inline-block w-20">Tarih:</span> {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}</p>
        </div>
        <div>
          <h3 className="font-bold border-b border-gray-200 pb-1 mb-1 uppercase text-[11px]">Cihaz Bilgileri</h3>
          <p><span className="font-semibold inline-block w-20">Tür/Model:</span> {ticket.deviceType} - {ticket.brandModel}</p>
          <p><span className="font-semibold inline-block w-20">Durum:</span> {statusMap[ticket.status] || ticket.status}</p>
        </div>
      </div>

      <div className="mb-4 text-xs flex-1">
        <h3 className="font-bold border-b border-gray-200 pb-1 mb-1 uppercase text-[11px]">Şikayet ve Detaylar</h3>
        <div className="border border-gray-300 p-2 rounded bg-gray-50 whitespace-pre-wrap min-h-[60px]">
          {ticket.issueDescription || 'Açıklama belirtilmemiş.'}
        </div>
      </div>
      
      {ticket.estimatedCost && parseFloat(ticket.estimatedCost) > 0 && (
        <div className="mb-4 flex justify-end text-xs">
           <table className="w-1/2 border-collapse border border-gray-800">
            <tbody>
              <tr>
                <td className="border border-gray-800 p-1 font-bold bg-gray-100">Tutar:</td>
                <td className="border border-gray-800 p-1 text-right font-bold text-sm">₺{parseFloat(ticket.estimatedCost).toLocaleString('tr-TR')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-6 text-center text-xs">
        <div>
          <p className="font-bold mb-8">Teslim Eden (Müşteri)</p>
          <p className="border-t border-gray-400 mx-8 pt-1">İmza</p>
        </div>
        <div>
          <p className="font-bold mb-8">Teslim Alan (Yetkili)</p>
          <p className="border-t border-gray-400 mx-8 pt-1">İmza / Kaşe</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white">
      
      {/* SELECTION SCREEN (Hidden when printing) */}
      {printMode === 'select' && (
        <div className="max-w-2xl mx-auto bg-white rounded-theme shadow-xl overflow-hidden print:hidden">
          <div className="p-6 border-b border-gray-100 text-center bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900">Yazdırma Formatı Seçin</h2>
            <p className="text-gray-500 mt-1">Kayıt: <span className="font-mono font-bold text-gray-700">{ticketNumber}</span></p>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* A4 Format Option */}
            <button 
              onClick={() => triggerPrint('a4')}
              className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-theme hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="w-16 h-20 border-2 border-current rounded mb-4 flex flex-col justify-between p-1 text-gray-400 group-hover:text-blue-500">
                <div className="w-full h-[45%] border border-dashed border-current rounded-sm"></div>
                <div className="w-full h-0 border-t-2 border-dashed border-current opacity-50"></div>
                <div className="w-full h-[45%] border border-dashed border-current rounded-sm"></div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700">Normal Yazıcı</h3>
              <p className="text-sm text-gray-500 text-center mt-2">A4 kağıdına 2 nüsha (A5) olarak çıkarılır. Biri müşteriye, diğeri size.</p>
            </button>

            {/* 80mm POS Format Option */}
            <button 
              onClick={() => triggerPrint('pos')}
              className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-theme hover:border-green-500 hover:bg-green-50 transition-all group"
            >
              <div className="w-12 h-24 border-2 border-current rounded mb-4 bg-gray-100 flex flex-col items-center pt-2 text-gray-400 group-hover:text-green-500 relative overflow-hidden">
                 <Receipt className="w-6 h-6 absolute top-4" />
                 <div className="absolute bottom-0 w-full h-4 border-t-2 border-dashed border-current"></div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-green-700">Fiş Yazıcısı</h3>
              <p className="text-sm text-gray-500 text-center mt-2">80mm Termal rulo yazıcılar için optimize edilmiştir. Tek fiş çıkar.</p>
            </button>

          </div>
          <div className="p-4 bg-gray-50 text-center">
            <button onClick={() => navigate(-1)} className="text-gray-600 font-medium hover:text-gray-900">İptal ve Geri Dön</button>
          </div>
        </div>
      )}

      {/* PRINT LAYOUT: A4 Double Copy */}
      <div className={`print-container-a4 ${printMode === 'a4' ? 'block' : 'hidden'} print:block mx-auto max-w-4xl bg-white shadow-xl print:shadow-none`}>
        {printMode === 'a4' && (
          <div className="w-full h-[297mm] flex flex-col justify-between">
            {/* Top Copy */}
            <A5Form copyType="FİRMA NÜSHASI" />
            
            {/* Cut Line */}
            <div className="relative w-full border-t-2 border-dashed border-gray-400 my-0 py-0 flex items-center justify-center print:border-black">
               <span className="absolute bg-white px-4 text-[10px] text-gray-400 tracking-widest uppercase print:text-black">Kesim Çizgisi ✂</span>
            </div>

            {/* Bottom Copy */}
            <A5Form copyType="MÜŞTERİ NÜSHASI" />
          </div>
        )}
      </div>

      {/* PRINT LAYOUT: POS 80mm */}
      <div className={`print-container-pos ${printMode === 'pos' ? 'block' : 'hidden'} print:block mx-auto`}>
         {printMode === 'pos' && <PosReceipt />}
      </div>

      <style>{`
        /* Global Print Rules */
        @media print {
          body, html { 
            background: white !important; 
            margin: 0; 
            padding: 0; 
            width: 100%;
          }
          /* Hide scrollbars during print */
          ::-webkit-scrollbar { display: none; }
          
          /* Force hidden mode for non-selected prints */
          ${printMode === 'a4' ? `
            @page { size: A4 portrait; margin: 0; }
            .print-container-pos { display: none !important; }
            .print-container-a4 { display: block !important; width: 100%; height: 100%; }
          ` : `
            @page { size: 80mm auto; margin: 0; }
            .print-container-a4 { display: none !important; }
            .print-container-pos { display: block !important; width: 80mm; }
            .pos-receipt { width: 100% !important; margin: 0 !important; }
          `}
        }
      `}</style>
    </div>
  );
}
