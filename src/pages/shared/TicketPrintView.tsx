import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { fetchTicket } from "../../lib/api";
import { Printer, Receipt, ArrowLeft, BadgeAlert, FileText } from "lucide-react";

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

  const handleGoBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/admin/servis');
    }
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
          <button onClick={handleGoBack} className="w-full bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl font-medium transition-colors">
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  // Durum Eşleşmeleri
  const statusMap: any = {
    pending: "Servise Alındı",
    diagnosing: "Arıza Tespiti / İşlemde",
    waiting_parts: "Parça / Onay Bekleniyor",
    ready: "Onarım Tamamlandı",
    delivered: "Teslim Edildi",
    yeni: "Servise Alındı",
    isleme_alindi: "Arıza Tespiti / İşlemde",
    parca_bekliyor: "Parça Bekleniyor",
    musteri_onayi_bekliyor: "Onay Bekleniyor",
    cozuldu: "Onarım Tamamlandı",
    kapatildi: "Teslim Edildi",
    teslim_edildi: "Teslim Edildi",
    iptal: "İptal Edildi",
  };

  const statusColors: any = {
    pending: "bg-blue-50 text-blue-700 border-blue-200",
    yeni: "bg-blue-50 text-blue-700 border-blue-200",
    diagnosing: "bg-amber-50 text-amber-700 border-amber-200",
    isleme_alindi: "bg-amber-50 text-amber-700 border-amber-200",
    waiting_parts: "bg-purple-50 text-purple-700 border-purple-200",
    parca_bekliyor: "bg-purple-50 text-purple-700 border-purple-200",
    musteri_onayi_bekliyor: "bg-amber-50 text-amber-700 border-amber-200",
    ready: "bg-green-50 text-green-700 border-green-200",
    cozuldu: "bg-green-50 text-green-700 border-green-200",
    delivered: "bg-gray-100 text-gray-700 border-gray-300",
    teslim_edildi: "bg-gray-100 text-gray-700 border-gray-300",
    kapatildi: "bg-gray-100 text-gray-700 border-gray-300",
  };

  // Dinamik Hesaplamalar
  const partsTotal = ticket.parts ? ticket.parts.reduce((sum: number, p: any) => sum + parseFloat(p.totalPrice || "0"), 0) : 0;
  const grandTotal = partsTotal + (parseFloat(ticket.laborCost) || 0);

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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(trackingUrl)}`;

  // --- BİLEŞEN: POS (80mm) Termal Fiş Nüshası ---
  const PosReceipt = ({ copyType }: { copyType: "FİRMA" | "MÜŞTERİ" }) => (
    <div className="pos-receipt mx-auto bg-white text-black text-[13px] font-sans font-black leading-tight w-[80mm] p-2 print:p-0 print:w-full print:text-black">
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <h1 className="font-extrabold text-lg tracking-tight uppercase mb-0.5">{settings.siteTitle || "KERİM BİLGİSAYAR"}</h1>
        <p className="text-[10px] text-black font-extrabold mb-1">{settings.siteTagline}</p>
        <p className="text-[9px] text-black leading-normal max-w-[220px] mx-auto font-bold">{settings.contactAddress}</p>
        <p className="text-[10px] font-black mt-1">Tel: {settings.contactPhone}</p>
        <div className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded inline-block mt-1 uppercase tracking-widest">{copyType} NÜSHASI</div>
      </div>

      <div className="text-center mb-2">
        <div className="text-[10px] font-black text-black uppercase tracking-wider">Servis Takip Fişi</div>
        <div className="text-xl font-black tracking-wider my-0.5">{ticketNumber}</div>
        <div className="text-[10px] text-black font-bold">{new Date(ticket.createdAt).toLocaleString("tr-TR")}</div>
      </div>

      <div className="border-t-2 border-b-2 border-black py-1.5 mb-2 space-y-0.5 text-[12px]">
        <div className="flex justify-between"><span>Müşteri:</span> <span className="font-black">{ticket.customerName}</span></div>
        {ticket.customerPhone && <div className="flex justify-between"><span>Tel:</span> <span className="font-black">{ticket.customerPhone}</span></div>}
        <div className="flex justify-between"><span>Cihaz:</span> <span className="font-black">{ticket.deviceType}</span></div>
        <div className="flex justify-between"><span>Model:</span> <span className="font-black">{ticket.brandModel}</span></div>
        <div className="flex justify-between"><span>Durum:</span> <span className="font-black bg-black text-white px-1.5 py-0.2 rounded">{statusMap[ticket.rawStatus] || ticket.status}</span></div>
      </div>

      {ticket.accessories && (
        <div className="border-b-2 border-black pb-1.5 mb-2 text-[11px]">
          <span className="font-black text-black">Emanet Alınanlar:</span> <span className="font-bold">{ticket.accessories}</span>
        </div>
      )}

      <div className="mb-2 border-b-2 border-black pb-2">
        <p className="font-black text-black mb-0.5">Şikayet / Açıklama:</p>
        <p className="text-[12px] whitespace-pre-wrap leading-tight font-medium" dangerouslySetInnerHTML={{ __html: ticket.issueDescription }}></p>
      </div>

      {/* Parça ve İşlem Dökümü */}
      <div className="mb-2 border-b-2 border-black pb-2">
        <p className="font-black text-black mb-1">Masraf & İşlem Dökümü:</p>
        <div className="text-[11px] space-y-1">
          {ticket.parts && ticket.parts.length > 0 ? (
            ticket.parts.map((p: any) => (
              <div key={p.id} className="flex justify-between font-bold">
                <span>{p.name} (x{p.quantity})</span>
                <span className="font-black">₺{parseFloat(p.totalPrice).toLocaleString("tr-TR")}</span>
              </div>
            ))
          ) : (
            <div className="italic text-[10px] text-gray-700">Ekstra parça/masraf kaydı bulunmuyor.</div>
          )}
          {parseFloat(ticket.laborCost) > 0 && (
            <div className="flex justify-between border-t border-dashed border-black pt-1 mt-1 font-bold">
              <span>İşçilik Ücreti</span>
              <span className="font-black">₺{parseFloat(ticket.laborCost).toLocaleString("tr-TR")}</span>
            </div>
          )}
        </div>
      </div>

      {grandTotal > 0 ? (
        <div className="pt-1.5 mb-3 text-right">
          <p className="text-[11px] font-black uppercase">Toplam Tutar</p>
          <p className="font-black text-lg">₺{grandTotal.toLocaleString("tr-TR")}</p>
        </div>
      ) : (
        <div className="py-1 mb-3 text-center font-black text-[11px] bg-gray-100 rounded">
          Ücretsiz Tespit / Servis Bedeli Bekleniyor
        </div>
      )}

      {ticket.technicianNotes && (
        <div className="border-t-2 border-black pt-2 mb-2 text-[11px]">
          <span className="font-black block">Teknisyen Görüşü:</span>
          <p className="font-medium text-gray-800 italic leading-tight" dangerouslySetInnerHTML={{ __html: ticket.technicianNotes }}></p>
        </div>
      )}

      <div className="flex flex-col items-center justify-center border-t-2 border-black pt-3 mb-2 text-center">
        <img src={qrCodeUrl} alt="Takip QR" className="w-28 h-28 mb-1 border-2 border-black p-0.5 rounded" />
        <p className="text-[10px] font-black text-black">Cihaz Durum Sorgulama</p>
      </div>

      <div className="mt-4 text-center">
        <div className="grid grid-cols-2 gap-2 text-[10px] font-black mb-6">
          <div>
            <p>Müşteri</p>
            <p className="mt-6 border-t border-black pt-1">İmza</p>
          </div>
          <div>
            <p>Yetkili Servis</p>
            <p className="mt-6 border-t border-black pt-1">İmza / Kaşe</p>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t-2 border-dashed border-black text-center text-[9px] font-black leading-normal">
        <p>Bizi tercih ettiğiniz için teşekkür ederiz.</p>
        <p>Cihaz tesliminde bu fişin ibraz edilmesi zorunludur.</p>
      </div>
    </div>
  );

  // --- BİLEŞEN: A5 Form Nüshası ---
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
                  <td className="font-bold text-gray-900 py-0.5">{statusMap[ticket.rawStatus] || ticket.status}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {ticket.accessories && (
          <div className="border border-gray-200 rounded-xl p-2.5 bg-amber-50/20 mb-3 text-[11px]">
            <span className="font-bold text-gray-700">Emanet Cihaz Yanında Alınanlar:</span> {ticket.accessories}
          </div>
        )}

        {/* Issue Description block */}
        <div className="border border-gray-200 rounded-xl p-3 mb-3">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 border-b pb-1">Müşteri Şikayeti / Açıklama</h3>
          <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[40px]" dangerouslySetInnerHTML={{ __html: ticket.issueDescription || "Açıklama belirtilmemiş." }}></p>
        </div>

        {/* Masraflar ve İşlemler Listesi */}
        <div className="border border-gray-200 rounded-xl p-3 mb-4 bg-slate-50/30">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 border-b pb-1">Yapılan İşlemler & Masraf Dökümü</h3>
          <div className="text-[11px] space-y-1">
            {ticket.parts && ticket.parts.length > 0 ? (
              ticket.parts.map((p: any) => (
                <div key={p.id} className="flex justify-between text-gray-700">
                  <span>{p.name} (x{p.quantity})</span>
                  <span className="font-bold text-gray-900">₺{parseFloat(p.totalPrice).toLocaleString("tr-TR")}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-450 italic text-[10px]">Kullanılan yedek parça veya işlem kaydı bulunmuyor.</div>
            )}
            {parseFloat(ticket.laborCost) > 0 && (
              <div className="flex justify-between text-gray-700 border-t border-dashed pt-1 mt-1 font-bold">
                <span>İşçilik Ücreti</span>
                <span className="font-bold text-gray-900">₺{parseFloat(ticket.laborCost).toLocaleString("tr-TR")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cost & QR tracking */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 border border-gray-100 rounded-xl p-2 bg-gray-50/30">
            <img src={qrCodeUrl} alt="Takip QR" className="w-14 h-14" />
            <div>
              <p className="text-[9px] font-bold text-gray-800 mb-0.5">Cihaz Durumunu Cepten Sorgulayın</p>
              <p className="text-[8px] text-gray-500">Kameranızla taratarak anlık servis aşamalarını izleyebilirsiniz.</p>
            </div>
          </div>

          {grandTotal > 0 ? (
            <div className="border border-gray-900 rounded-xl px-4 py-2 text-right bg-gray-900 text-white min-w-[140px]">
              <p className="text-[9px] uppercase tracking-wider font-bold opacity-70">Toplam Tutar</p>
              <p className="text-base font-black">₺{grandTotal.toLocaleString("tr-TR")}</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl px-4 py-2 text-center text-gray-400 font-bold text-[10px] bg-gray-50">
              Ücretsiz Tespit / Servis Bedeli Bekleniyor
            </div>
          )}
        </div>
      </div>

      {/* Signature block */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-center text-[10px]">
          <div>
            <p className="font-bold text-gray-600 mb-8">Müşteri (Teslim Eden)</p>
            <p className="text-gray-400 text-[9px]">İmza / Tarih</p>
          </div>
          <div>
            <p className="font-bold text-gray-600 mb-8">Yetkili Servis (Teslim Alan)</p>
            <p className="text-gray-400 text-[9px]">İmza / Kaşe</p>
          </div>
        </div>
        <div className="text-[8px] text-gray-400 text-center mt-3 border-t pt-1.5">
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
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700">A4 Yazıcı (2 Kopya)</h3>
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
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-green-700">Termal Fiş Yazıcısı (2 Kopya)</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                80mm genişliğinde termal rulolu fiş yazıcıları için yüksek kontrastlı ardışık 2 kopya basar.
              </p>
            </button>
          </div>

          <div className="px-8 pb-8 pt-2 flex justify-between items-center bg-slate-50/30">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Servis Yönetimine Dön
            </button>
            <div className={`text-xs font-bold border px-3 py-1 rounded-full shadow-sm ${statusColors[ticket.rawStatus] || "bg-gray-100"}`}>
              {statusMap[ticket.rawStatus] || ticket.status}
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
      <div className={`print-container-pos ${printMode === "pos" ? "block" : "hidden"} print:block mx-auto max-w-[80mm]`}>
        {printMode === "pos" && (
          <div className="flex flex-col gap-6">
            <PosReceipt copyType="FİRMA" />
            
            {/* Separation line for POS */}
            <div className="w-full border-t-2 border-dashed border-black my-4 text-center py-2">
              <span className="text-[10px] font-black uppercase text-black">Kesim Çizgisi ✂ (Firma / Müşteri)</span>
            </div>

            <PosReceipt copyType="MÜŞTERİ" />
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body, html { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100%;
            color: black !important;
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
            .pos-receipt { width: 100% !important; margin: 0 !important; padding: 5px !important; }
          `}
        }
      `}</style>
    </div>
  );
}
