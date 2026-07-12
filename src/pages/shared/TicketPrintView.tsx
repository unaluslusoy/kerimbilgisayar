import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { fetchTicket } from "../../lib/api";
import { Printer, Receipt, ArrowLeft, Calendar, User, Laptop, Settings, BadgeAlert, FileText, QrCode } from "lucide-react";

export default function TicketPrintView() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState<"select" | "a4" | "pos">("select");

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
      setPrintMode("select");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const triggerPrint = (mode: "a4" | "pos") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-500">Servis kaydı yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <BadgeAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Kayıt Bulunamadı</h2>
          <p className="text-sm text-gray-500 mb-6">Aradığınız {ticketNumber} numaralı servis kaydı sistemde bulunamadı.</p>
          <button onClick={() => navigate(-1)} className="w-full bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl font-medium transition-colors">
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  const statusMap: any = {
    pending: "Yeni Kayıt",
    diagnosing: "İşlem Göörüyor",
    waiting_parts: "Parça / Onay Bekliyor",
    ready: "Tamamlandı (Hazır)",
    delivered: "Teslim Edildi",
  };

  const statusColors: any = {
    pending: "bg-blue-50 text-blue-700 border-blue-200",
    diagnosing: "bg-amber-50 text-amber-700 border-amber-200",
    waiting_parts: "bg-purple-50 text-purple-700 border-purple-200",
    ready: "bg-green-50 text-green-700 border-green-200",
    delivered: "bg-gray-100 text-gray-700 border-gray-300",
  };

  const BarcodeSVG = () => (
    <svg className="h-9 w-44 text-black" viewBox="0 0 100 20" fill="currentColor">
      <rect x="0" y="0" width="2" height="20" />
      <rect x="3" y="0" width="1" height="20" />
      <rect x="5" y="0" width="4" height="20" />
      <rect x="10" y="0" width="2" height="20" />
      <rect x="13" y="0" width="1" height="20" />
      <rect x="15" y="0" width="3" height="20" />
      <rect x="19" y="0" width="1" height="20" />
      <rect x="21" y="0" width="4" height="20" />
      <rect x="26" y="0" width="2" height="20" />
      <rect x="29" y="0" width="1" height="20" />
      <rect x="31" y="0" width="3" height="20" />
      <rect x="35" y="0" width="2" height="20" />
      <rect x="38" y="0" width="4" height="20" />
      <rect x="43" y="0" width="1" height="20" />
      <rect x="45" y="0" width="2" height="20" />
      <rect x="48" y="0" width="3" height="20" />
      <rect x="52" y="0" width="1" height="20" />
      <rect x="54" y="0" width="4" height="20" />
      <rect x="59" y="0" width="2" height="20" />
      <rect x="62" y="0" width="1" height="20" />
      <rect x="64" y="0" width="3" height="20" />
      <rect x="68" y="0" width="2" height="20" />
      <rect x="71" y="0" width="4" height="20" />
      <rect x="76" y="0" width="1" height="20" />
      <rect x="78" y="0" width="2" height="20" />
      <rect x="81" y="0" width="3" height="20" />
      <rect x="85" y="0" width="1" height="20" />
      <rect x="87" y="0" width="4" height="20" />
      <rect x="92" y="0" width="2" height="20" />
      <rect x="95" y="0" width="1" height="20" />
      <rect x="97" y="0" width="3" height="20" />
    </svg>
  );

  const trackingUrl = `${settings.siteBaseUrl || "https://kerimbilgisayar.com"}/ariza-sorgulama?no=${ticketNumber}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(trackingUrl)}`;

  // --- COMPONENT: POS (80mm) Receipt Layout ---
  const PosReceipt = () => (
    <div className="pos-receipt mx-auto bg-white text-black text-[12px] font-sans leading-tight w-[80mm] p-4 print:p-0 print:w-full">
      <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
        <h1 className="font-extrabold text-base tracking-tight uppercase mb-0.5">{settings.siteTitle || "KERİM BİLGİSAYAR"}</h1>
        <p className="text-[10px] text-gray-600 font-medium mb-1">{settings.siteTagline}</p>
        <p className="text-[9px] text-gray-500 leading-normal max-w-[200px] mx-auto">{settings.contactAddress}</p>
        <p className="text-[10px] font-semibold mt-1">Tel: {settings.contactPhone}</p>
      </div>

      <div className="text-center mb-3">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Servis Kayıt Fişi</div>
        <div className="text-lg font-black tracking-wider my-0.5">{ticketNumber}</div>
        <div className="text-[9px] text-gray-400">{new Date(ticket.createdAt).toLocaleString("tr-TR")}</div>
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-2 mb-3 space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Müşteri:</span> <span className="font-bold">{ticket.customerName}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Cihaz Türü:</span> <span className="font-semibold">{ticket.deviceType}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Model:</span> <span className="font-semibold">{ticket.brandModel}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Durum:</span> <span className="font-bold text-gray-900">{statusMap[ticket.status] || ticket.status}</span></div>
      </div>

      <div className="mb-4">
        <p className="font-bold text-gray-800 mb-1">Sorun / Şikayet:</p>
        <p className="text-[11px] bg-gray-50 border border-gray-100 rounded p-1.5 whitespace-pre-wrap leading-relaxed">{ticket.issueDescription || "Açıklama belirtilmemiş."}</p>
      </div>

      {ticket.estimatedCost && parseFloat(ticket.estimatedCost) > 0 && (
        <div className="border-t border-dashed border-gray-400 pt-2 mb-4 text-right">
          <p className="text-[11px] text-gray-500 font-medium">Tahmini Tutar</p>
          <p className="font-black text-base text-gray-900">₺{parseFloat(ticket.estimatedCost).toLocaleString("tr-TR")}</p>
        </div>
      )}

      <div className="flex flex-col items-center justify-center border-t border-dashed border-gray-400 pt-4 mb-4 text-center">
        <img src={qrCodeUrl} alt="Takip QR" className="w-24 h-24 mb-2 border p-1 rounded" />
        <p className="text-[9px] font-bold text-gray-700">Telefondan Durum Sorgulama</p>
        <p className="text-[8px] text-gray-400">QR kodu taratarak cihazınızın anlık durumunu takip edin.</p>
      </div>

      <div className="mt-8 text-center">
        <p className="font-bold text-[10px] text-gray-600 mb-10">Müşteri İmzası</p>
        <p className="text-gray-300">________________________</p>
      </div>

      <div className="mt-6 pt-3 border-t border-dashed border-gray-400 text-center text-[9px] text-gray-400 leading-normal">
        <p className="font-semibold text-gray-600 mb-0.5">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
        <p>Cihaz tesliminde bu fişin ibraz edilmesi zorunludur.</p>
      </div>
    </div>
  );

  // --- COMPONENT: A5 Form Copy ---
  const A5Form = ({ copyType }: { copyType: "MÜŞTERİ NÜSHASI" | "FİRMA NÜSHASI" }) => (
    <div className="bg-white text-black font-sans w-full p-6 print:p-4 box-border h-[148mm] flex flex-col justify-between border border-gray-200 print:border-0 rounded-2xl print:rounded-none">
      <div>
        {/* Header Block */}
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-3 mb-4">
          <div className="flex gap-3 items-center">
            {settings.siteLogo ? (
              <img src={settings.siteLogo} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div className="bg-black text-white h-10 px-3 flex items-center justify-center font-black text-base tracking-tighter rounded-lg">
                KB
              </div>
            )}
            <div>
              <h1 className="text-sm font-black tracking-tight uppercase leading-none mb-1">
                {settings.siteTitle || "KERİM BİLGİSAYAR"}
              </h1>
              <p className="text-[9px] text-gray-500 leading-tight max-w-[280px] font-medium">{settings.contactAddress}</p>
              <p className="text-[9px] text-gray-700 font-bold mt-0.5">Tel: {settings.contactPhone} | {settings.contactEmail}</p>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-0.5">SERVIS KABUL FORMU</h2>
            <div className="text-[8px] font-bold bg-gray-100 px-2 py-0.5 rounded inline-block text-gray-600 mb-2">{copyType}</div>
            <div className="flex flex-col items-end gap-1">
              <BarcodeSVG />
              <p className="text-[9px] font-bold font-mono tracking-widest">{ticketNumber}</p>
            </div>
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          {/* Customer Card */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 border-b pb-1">Müşteri Bilgileri</h3>
            <table className="w-full text-[11px] leading-relaxed">
              <tbody>
                <tr>
                  <td className="text-gray-500 font-medium w-16 py-0.5">Müşteri:</td>
                  <td className="font-bold text-gray-900 py-0.5">{ticket.customerName}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 font-medium py-0.5">Kayıt Tarihi:</td>
                  <td className="font-semibold text-gray-700 py-0.5">{new Date(ticket.createdAt).toLocaleDateString("tr-TR")}</td>
                </tr>
                {ticket.customerPhone && (
                  <tr>
                    <td className="text-gray-500 font-medium py-0.5">Telefon:</td>
                    <td className="font-semibold text-gray-700 py-0.5">{ticket.customerPhone}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Device Card */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 border-b pb-1">Cihaz Bilgileri</h3>
            <table className="w-full text-[11px] leading-relaxed">
              <tbody>
                <tr>
                  <td className="text-gray-500 font-medium w-16 py-0.5">Cihaz Türü:</td>
                  <td className="font-bold text-gray-900 py-0.5">{ticket.deviceType}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 font-medium py-0.5">Model:</td>
                  <td className="font-semibold text-gray-700 py-0.5">{ticket.brandModel}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 font-medium py-0.5">Durum:</td>
                  <td className="font-bold text-gray-900 py-0.5">{statusMap[ticket.status] || ticket.status}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Issue Description block */}
        <div className="border border-gray-200 rounded-xl p-3 mb-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 border-b pb-1">Şikayet ve Detaylar</h3>
          <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[50px]">
            {ticket.issueDescription || "Açıklama belirtilmemiş."}
          </p>
        </div>

        {/* Cost & QR tracking */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 border border-gray-100 rounded-xl p-2 bg-gray-50/30">
            <img src={qrCodeUrl} alt="Takip QR" className="w-12 h-12" />
            <div>
              <p className="text-[9px] font-bold text-gray-800 mb-0.5">Cihaz Durumunu Cepten Sorgulayın</p>
              <p className="text-[8px] text-gray-500">Kameranızla taratarak anlık servis aşamalarını izleyebilirsiniz.</p>
            </div>
          </div>

          {ticket.estimatedCost && parseFloat(ticket.estimatedCost) > 0 ? (
            <div className="border border-gray-900 rounded-xl px-4 py-2 text-right bg-gray-900 text-white min-w-[140px]">
              <p className="text-[9px] uppercase tracking-wider font-bold opacity-70">Toplam Tutar</p>
              <p className="text-base font-black">₺{parseFloat(ticket.estimatedCost).toLocaleString("tr-TR")}</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl px-4 py-2 text-center text-gray-400 font-bold text-[10px] bg-gray-50">
              Ücretsiz Tespit / Servis Bedeli Bekleniyor
            </div>
          )}
        </div>
      </div>

      {/* Signature block */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-center text-[10px]">
          <div>
            <p className="font-bold text-gray-600 mb-10">Müşteri (Teslim Eden)</p>
            <p className="text-gray-400 text-[9px]">İmza / Tarih</p>
          </div>
          <div>
            <p className="font-bold text-gray-600 mb-10">Yetkili Servis (Teslim Alan)</p>
            <p className="text-gray-400 text-[9px]">İmza / Kaşe</p>
          </div>
        </div>
        <div className="text-[8px] text-gray-400 text-center mt-4 border-t pt-2">
          90 gün teslim alınmayan cihazlardan firmamız sorumlu değildir. Garanti kapsamında işlem yapılması için bu formun saklanması zorunludur.
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 print:py-0 print:bg-white flex items-center justify-center">
      
      {/* SELECTION SCREEN (Hidden when printing) */}
      {printMode === "select" && (
        <div className="max-w-2xl w-full mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden print:hidden transition-all duration-300">
          <div className="p-8 border-b border-gray-100 text-center bg-slate-50/50">
            <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Yazdırma Formatı Seçin</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Kayıt Numarası: <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{ticketNumber}</span>
            </p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* A4 Format Option */}
            <button
              onClick={() => triggerPrint("a4")}
              className="flex flex-col items-center text-center p-6 border-2 border-slate-100 rounded-3xl hover:border-blue-600 hover:bg-blue-50/30 transition-all duration-300 group"
            >
              <div className="w-14 h-16 bg-blue-50 text-blue-600 rounded-2xl mb-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700">A4 Yazıcı</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                A4 kağıdına kesim çizgisiyle ayrılmış 2 adet nüsha (Müşteri & Firma) basılır.
              </p>
            </button>

            {/* 80mm POS Format Option */}
            <button
              onClick={() => triggerPrint("pos")}
              className="flex flex-col items-center text-center p-6 border-2 border-slate-100 rounded-3xl hover:border-green-600 hover:bg-green-50/30 transition-all duration-300 group"
            >
              <div className="w-14 h-16 bg-green-50 text-green-600 rounded-2xl mb-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-green-700">Termal Fiş Yazıcısı</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                80mm genişliğinde rulolu fiş yazıcıları için optimize edilmiş tek kopya form çıkartır.
              </p>
            </button>
          </div>

          <div className="px-8 pb-8 pt-2 flex justify-between items-center bg-slate-50/30">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Geri Dön
            </button>
            <div className={`text-xs font-bold border px-3 py-1 rounded-full shadow-sm ${statusColors[ticket.status] || "bg-gray-100"}`}>
              {statusMap[ticket.status] || ticket.status}
            </div>
          </div>
        </div>
      )}

      {/* PRINT LAYOUT: A4 Double Copy */}
      <div className={`print-container-a4 ${printMode === "a4" ? "block" : "hidden"} print:block mx-auto max-w-4xl bg-white w-full shadow-lg print:shadow-none p-6 print:p-0`}>
        {printMode === "a4" && (
          <div className="w-full h-[297mm] flex flex-col justify-between">
            {/* Top Copy */}
            <A5Form copyType="FİRMA NÜSHASI" />
            
            {/* Cut Line */}
            <div className="relative w-full border-t-2 border-dashed border-gray-300 my-4 py-0 flex items-center justify-center print:border-black">
              <span className="absolute bg-white px-4 text-[9px] text-gray-400 tracking-widest uppercase font-bold print:text-black">
                Kesim Çizgisi ✂
              </span>
            </div>

            {/* Bottom Copy */}
            <A5Form copyType="MÜŞTERİ NÜSHASI" />
          </div>
        )}
      </div>

      {/* PRINT LAYOUT: POS 80mm */}
      <div className={`print-container-pos ${printMode === "pos" ? "block" : "hidden"} print:block mx-auto`}>
        {printMode === "pos" && <PosReceipt />}
      </div>

      <style>{`
        @media print {
          body, html { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100%;
          }
          ::-webkit-scrollbar { display: none; }
          
          ${printMode === "a4" ? `
            @page { size: A4 portrait; margin: 0; }
            .print-container-pos { display: none !important; }
            .print-container-a4 { display: block !important; width: 100%; height: 100%; margin: 0 !important; padding: 0 !important; }
          ` : `
            @page { size: 80mm auto; margin: 0; }
            .print-container-a4 { display: none !important; }
            .print-container-pos { display: block !important; width: 80mm; margin: 0 !important; padding: 0 !important; }
            .pos-receipt { width: 100% !important; margin: 0 !important; padding: 10px !important; }
          `}
        }
      `}</style>
    </div>
  );
}
