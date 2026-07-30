import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { fetchTicket } from "../../lib/api";
import { Printer, Receipt, ArrowLeft, BadgeAlert, FileText } from "lucide-react";
import PatternLockPicker from "../../components/ui/PatternLockPicker";
import QRCode from "qrcode";

export default function TicketPrintView() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState<"select" | "a4" | "pos">("select");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const [a4Config, setA4Config] = useState<any>({
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    headerTitle: 'KERİM BİLGİSAYAR & TEKNİK SERVİS',
    headerSub: 'Bilgisayar - Tablet - Telefon Onarım Merkezi',
    headerInfo: 'Gsm: 0538 317 24 37 • E-posta: bilgi@kerimbilgisayar.com',
    footerText: 'Cihaz teslim alınırken bu giriş fişinin ibraz edilmesi zorunludur. 90 gün içerisinde teslim alınmayan cihazlardan firmamız sorumlu değildir.',
    showLogo: true,
    logoUrl: '',
    showQrCode: true,
    showPatternLock: true,
    showSignature: true,
    signatureText: 'Cihazı Teslim Alan Yetkili'
  });

  const [posConfig, setPosConfig] = useState<any>({
    fontSize: 10,
    fontFamily: 'Courier New, monospace',
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 5,
    marginRight: 5,
    headerTitle: 'KERİM BİLGİSAYAR',
    headerSub: 'TEKNİK SERVİS FİŞİ',
    headerInfo: 'Destek: 0538 317 24 37',
    footerText: 'Cihaz takibi için QR kodu taratın.',
    showLogo: false,
    logoUrl: '',
    showQrCode: true,
    showPatternLock: false,
    showSignature: true,
    signatureText: 'Müşteri İmzası'
  });

  useEffect(() => {
    if (settings.print_ticket_a4_template) {
      try {
        setA4Config(JSON.parse(settings.print_ticket_a4_template));
      } catch (e) {
        console.error("A4 parse error", e);
      }
    }
    if (settings.print_ticket_pos_template) {
      try {
        setPosConfig(JSON.parse(settings.print_ticket_pos_template));
      } catch (e) {
        console.error("POS parse error", e);
      }
    }
  }, [settings]);

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
    if (ticketNumber && ticket) {
      const trackingUrl = `${settings.siteBaseUrl || window.location.origin}/ariza-sorgulama?no=${ticketNumber}`;
      QRCode.toDataURL(trackingUrl, { 
        margin: 1, 
        width: 150,
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error("QR Code generation error:", err));
    }
  }, [ticketNumber, ticket, settings.siteBaseUrl]);

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
    }, 500);
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
    onarimda: "Onarımda",
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
    onarimda: "bg-indigo-50 text-indigo-700 border-indigo-200",
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
    <svg className="h-8 w-36 text-black" viewBox="0 0 100 20" fill="currentColor">
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

  // Helper to format monospace columns matching exact 42 characters width
  const formatMonoRow = (col1: string, col2: string, col3: string) => {
    const c1 = (col1 || '').substring(0, 19).padEnd(19, ' ');
    const c2 = (col2 || '').substring(0, 6).padStart(6, ' ');
    const c3 = (col3 || '').substring(0, 17).padStart(17, ' ');
    return c1 + c2 + c3;
  };

  // --- BİLEŞEN: POS (80mm) Termal Fiş Nüshası ---
  const PosReceipt = ({ copyType }: { copyType: "FİRMA" | "MÜŞTERİ" }) => (
    <div className="pos-receipt mx-auto bg-white text-black leading-tight w-[80mm] p-2 print:p-0 print:w-full print:text-black" style={{
      fontFamily: posConfig.fontFamily || "'DejaVu Sans Mono', Monaco, Consolas, 'Courier New', monospace",
      fontSize: `${posConfig.fontSize || 10}pt`,
      paddingTop: `${posConfig.marginTop || 5}px`,
      paddingBottom: `${posConfig.marginBottom || 5}px`,
      paddingLeft: `${posConfig.marginLeft || 5}px`,
      paddingRight: `${posConfig.marginRight || 5}px`
    }}>
      
      {/* Üst Kısım: Sol QR Kod, Sağ Başlık & Bilgiler */}
      <div className="flex items-center gap-3 border-b border-dashed border-black pb-2 mb-2">
        {posConfig.showQrCode && qrCodeDataUrl && (
          <div className="shrink-0">
            <img src={qrCodeDataUrl} alt="Takip QR" className="w-18 h-18 border border-black p-0.5" />
          </div>
        )}
        <div className="flex-1 min-w-0 text-left">
          <div className="font-bold text-[10pt] uppercase tracking-tight">{posConfig.headerTitle || settings.siteTitle || "KERİM BİLGİSAYAR"}</div>
          <div className="text-[7.5pt] leading-tight mb-1 font-semibold text-black">{posConfig.headerSub || "TEKNİK SERVİS FİŞİ"}</div>
          <div className="text-[8.5pt] font-semibold">{posConfig.headerInfo || settings.contactPhone}</div>
          <div className="font-bold text-[8.5pt] bg-black text-white px-2 py-0.5 mt-1 inline-block uppercase">{copyType} NÜSHASI</div>
        </div>
      </div>

      {/* Servis Fişi Numarası & Tarih */}
      <div className="flex justify-between items-center mb-2 pb-1 border-b border-dashed border-black">
        <div>
          <div className="text-[10pt] font-bold">SERVİS TAKİP FİŞİ</div>
          <div className="text-[8.5pt] font-semibold">{new Date(ticket.createdAt).toLocaleString("tr-TR")}</div>
        </div>
        <div className="text-right">
          <div className="text-[12.5pt] font-bold tracking-tight">{ticketNumber}</div>
        </div>
      </div>

      {/* Müşteri & Cihaz Bilgileri */}
      <div className="space-y-0.5 text-[9.5pt] border-b border-dashed border-black pb-2 mb-2 text-left">
        <div className="flex justify-between">
          <span className="font-bold">Müşteri:</span>
          <span className="font-semibold">{ticket.customerName}</span>
        </div>
        {ticket.companyName && (
          <div className="flex justify-between">
            <span className="font-bold">Firma:</span>
            <span className="font-semibold">{ticket.companyName}</span>
          </div>
        )}
        {ticket.taxId && (
          <div className="flex justify-between">
            <span className="font-bold">Vergi:</span>
            <span className="font-semibold">{ticket.taxOffice} / {ticket.taxId}</span>
          </div>
        )}
        {ticket.customerPhone && (
          <div className="flex justify-between">
            <span className="font-bold">Tel:</span>
            <span className="font-semibold">{ticket.customerPhone}</span>
          </div>
        )}
        {ticket.customerAddress && (
          <div className="flex justify-between">
            <span className="font-bold">Adres:</span>
            <span className="font-semibold text-[8.5pt] text-right truncate max-w-[210px]">{ticket.customerAddress}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="font-bold">Cihaz:</span>
          <span className="font-semibold">{ticket.deviceType || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Model:</span>
          <span className="font-semibold">{ticket.brandModel || [ticket.deviceBrand, ticket.deviceModel].filter(Boolean).join(' ') || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Seri No:</span>
          <span className="font-semibold font-mono">{ticket.deviceSerial || ticket.serialNumber || '—'}</span>
        </div>
        {ticket.imei && (
          <div className="flex justify-between">
            <span className="font-bold">IMEI:</span>
            <span className="font-semibold font-mono">{ticket.imei}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="font-bold">Durum:</span>
          <span className="font-bold">{statusMap[ticket.rawStatus] || ticket.status}</span>
        </div>
      </div>

      {/* Erişim / Kilit Bilgileri */}
      {(ticket.pinPassword || ticket.patternLock) && (
        <div className="border-b border-dashed border-black pb-2 mb-2 text-[9.5pt] text-left">
          <span className="font-bold">🔐 Erişim Bilgileri:</span>
          {ticket.pinPassword && (
            <div className="flex justify-between text-[9pt]">
              <span>Cihaz Şifresi / PIN:</span>
              <span className="font-mono font-bold">{ticket.pinPassword}</span>
            </div>
          )}
          {ticket.patternLock && (
            <div className="flex justify-between text-[9pt]">
              <span>Desen Kilidi:</span>
              <span className="font-mono font-bold">{ticket.patternLock}</span>
            </div>
          )}
        </div>
      )}

      {/* Emanetler */}
      {ticket.accessories && (
        <div className="border-b border-dashed border-black pb-2 mb-2 text-[9.5pt] text-left">
          <span className="font-bold">Emanet Alınanlar:</span>
          <p className="font-semibold mt-0.5 text-[9pt] leading-tight text-black">{ticket.accessories}</p>
        </div>
      )}

      {/* Şikayet / Açıklama */}
      <div className="mb-2 border-b border-dashed border-black pb-2 text-[9.5pt] text-left">
        <p className="font-bold mb-0.5">Şikayet / Açıklama:</p>
        <p className="font-semibold text-[9pt] whitespace-pre-wrap leading-tight text-black" dangerouslySetInnerHTML={{ __html: ticket.issueDescription || ticket.description || "Şikayet belirtilmemiş." }}></p>
      </div>

      {/* Masraf & İşlem Dökümü */}
      <div className="mb-2 border border-black p-2 bg-white text-[9.5pt] text-left">
        <p className="font-bold mb-1 uppercase tracking-wider text-[9.5pt] border-b border-black pb-1">💵 MASRAF & İŞLEM DÖKÜMÜ</p>
        <pre className="font-mono text-[9pt] leading-normal whitespace-pre bg-transparent p-0 m-0 border-0 text-black" style={{ fontFamily: "'DejaVu Sans Mono', Monaco, Consolas, 'Courier New', monospace" }}>
          {formatMonoRow("ÜRÜN / İŞLEM", "ADET", "TUTAR")}
          {"\n"}
          {"------------------------------------------"}
          {"\n"}
          {ticket.parts && ticket.parts.length > 0 ? (
            ticket.parts.map((p: any) => formatMonoRow(p.name || p.stockItemName, p.quantity.toString(), parseFloat(p.totalPrice).toFixed(2) + " TL")).join("\n")
          ) : (
            "  (Kullanılan yedek parça kaydı bulunmuyor.)\n"
          )}
          {parseFloat(ticket.laborCost) > 0 && (
            "\n" + formatMonoRow("İşçilik Ücreti", "1", parseFloat(ticket.laborCost).toFixed(2) + " TL")
          )}
          {"\n"}
          {"------------------------------------------"}
          {"\n"}
          {"TOPLAM".padEnd(28, ' ')}
          {grandTotal.toFixed(2).padStart(11, ' ')} TL
        </pre>
      </div>

      {/* Teknisyen Görüşü */}
      {ticket.technicianNotes && (
        <div className="border-b border-dashed border-black pb-2 mb-2 text-[9.5pt] text-left">
          <span className="font-bold block">Teknisyen Görüşü / Raporu:</span>
          <p className="font-semibold text-[9pt] text-black italic leading-tight mt-0.5" dangerouslySetInnerHTML={{ __html: ticket.technicianNotes }}></p>
        </div>
      )}

      {/* Yasal Onay Metinleri */}
      <div className="mb-2 text-[7.5pt] text-left text-black font-semibold leading-tight space-y-0.5">
        <p>{ticket.kvkkConsentAt ? "☑" : "☐"} KVKK aydınlatma metni onayı</p>
        <p>{ticket.dataLossConsentAt ? "☑" : "☐"} Veri kaybı riski bilgilendirmesi</p>
        <p>{ticket.accessInfoConsentAt ? "☑" : "☐"} Cihaz erişim bilgisi kullanım onayı</p>
        <p>{ticket.expertiseFeeConsentAt ? "☑" : "☐"} Ekspertiz ücreti bilgilendirmesi</p>
      </div>

      {/* İmzalar */}
      {posConfig.showSignature && (
        <div className="mt-4 text-center border-b border-dashed border-black pb-4 font-mono text-[9.5pt]">
          <div className="grid grid-cols-2 gap-4 font-bold">
            <div>
              <p>Müşteri</p>
              <p className="mt-8 border-t border-black pt-1 font-normal text-[8.5pt]">İmza / Tarih</p>
            </div>
            <div>
              <p>{posConfig.signatureText || "Yetkili Servis"}</p>
              <p className="mt-8 border-t border-black pt-1 font-normal text-[8.5pt]">İmza / Kaşe</p>
            </div>
          </div>
        </div>
      )}

      {/* Alt Bilgilendirme - Sola Yaslı */}
      <div className="mt-2 text-left text-[8pt] leading-normal font-semibold space-y-1">
        <p className="text-[8.5pt] text-black font-semibold whitespace-pre-line">{posConfig.footerText || "Bizi tercih ettiğiniz için teşekkür ederiz."}</p>
        {posConfig.showQrCode && (
          <p className="text-[7.5pt] text-black font-semibold border-t border-dotted border-black pt-1 mt-1">
            * Cihaz durumunu sol üstteki QR kod ile anlık sorgulayabilirsiniz.
          </p>
        )}
      </div>
      {/* Otomatik Bıçak Kesme Boşluğu (Thermal Cutting Margins) */}
      <div className="pt-24 border-t border-transparent">
        <div className="text-center font-mono text-[7pt] font-semibold text-black">--- FİŞ SONU / KESİM NOKTASI ---</div>
      </div>
    </div>
  );

  // --- BİLEŞEN: A5 Form Nüshası (A4 Kağıdı 2'ye Bölen A5 Formatı) ---
  const A5Form = ({ copyType }: { copyType: "MÜŞTERİ NÜSHASI" | "FİRMA NÜSHASI" }) => (
    <div className="bg-white text-black font-sans w-full p-3.5 box-border flex flex-col justify-between h-[135mm] border border-gray-900 rounded-xl print:rounded-none" style={{
      fontFamily: a4Config.fontFamily || "Inter, sans-serif",
      fontSize: `${a4Config.fontSize || 10.5}pt`,
      paddingTop: `${a4Config.marginTop || 12}px`,
      paddingBottom: `${a4Config.marginBottom || 12}px`,
      paddingLeft: `${a4Config.marginLeft || 14}px`,
      paddingRight: `${a4Config.marginRight || 14}px`
    }}>
      <div>
        {/* Header Block */}
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-2 mb-2">
          <div className="flex gap-3 items-center">
            {a4Config.showLogo && (
              <div className="bg-black text-white h-9 px-3 flex items-center justify-center font-black text-sm tracking-tighter rounded-lg">
                KB
              </div>
            )}
            <div>
              <h1 className="text-xs font-black tracking-tight uppercase leading-none mb-0.5">
                {a4Config.headerTitle || settings.siteTitle || "KERİM BİLGİSAYAR"}
              </h1>
              <p className="text-[8.5px] text-gray-500 leading-tight max-w-[280px] font-medium">{a4Config.headerSub || "Teknik Servis & Onarım Kabul Formu"}</p>
              <p className="text-[8.5px] text-gray-700 font-bold mt-0.5">{a4Config.headerInfo || settings.contactPhone}</p>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-0.5">SERVIS KABUL FORMU</h2>
            <div className="text-[8px] font-bold bg-gray-100 px-2 py-0.5 rounded inline-block text-gray-600 mb-1">{copyType}</div>
            <div className="flex flex-col items-end gap-0.5">
              <BarcodeSVG />
              <p className="text-[8.5px] font-bold font-mono tracking-widest leading-none mt-0.5">{ticketNumber}</p>
            </div>
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          {/* Customer Card */}
          <div className="border border-gray-200 rounded-xl p-2.5 bg-gray-50/50 print:bg-white print:border-gray-400 print:rounded-none">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 border-b pb-0.5">Müşteri Bilgileri</h3>
            <table className="w-full text-[10px] leading-relaxed">
              <tbody>
                {ticket.companyName && (
                  <tr>
                    <td className="text-gray-500 font-medium w-16 py-0.5">Firma:</td>
                    <td className="font-bold text-gray-900 py-0.5">{ticket.companyName}</td>
                  </tr>
                )}
                <tr>
                  <td className="text-gray-500 font-medium w-16 py-0.5">Müşteri:</td>
                  <td className="font-bold text-gray-900 py-0.5">{ticket.customerName}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 font-medium py-0.5">Telefon:</td>
                  <td className="font-semibold text-gray-800 py-0.5">{ticket.customerPhone}</td>
                </tr>
                {ticket.customerEmail && (
                  <tr>
                    <td className="text-gray-500 font-medium py-0.5">E-posta:</td>
                    <td className="text-gray-700 py-0.5 truncate max-w-[140px]">{ticket.customerEmail}</td>
                  </tr>
                )}
                {ticket.customerAddress && (
                  <tr>
                    <td className="text-gray-500 font-medium py-0.5">Adres:</td>
                    <td className="text-gray-600 py-0.5 leading-snug text-[8.5px] truncate max-w-[140px]">{ticket.customerAddress}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Device Card */}
          <div className="border border-gray-200 rounded-xl p-2.5 bg-gray-50/50 print:bg-white print:border-gray-400 print:rounded-none flex justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 border-b pb-0.5">Cihaz Bilgileri</h3>
              <table className="w-full text-[10px] leading-relaxed">
                <tbody>
                  <tr>
                    <td className="text-gray-500 font-medium w-16 py-0.5">Cihaz:</td>
                    <td className="font-bold text-gray-900 py-0.5">{ticket.deviceType || '—'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 font-medium py-0.5">Model:</td>
                    <td className="font-semibold text-gray-800 py-0.5">{ticket.brandModel || [ticket.deviceBrand, ticket.deviceModel].filter(Boolean).join(' ') || '—'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 font-medium py-0.5">Seri No:</td>
                    <td className="font-mono font-semibold text-gray-700 py-0.5">{ticket.deviceSerial || ticket.serialNumber || '—'}</td>
                  </tr>
                  {ticket.imei && (
                    <tr>
                      <td className="text-gray-500 font-medium py-0.5">IMEI:</td>
                      <td className="font-mono font-semibold text-gray-700 py-0.5">{ticket.imei}</td>
                    </tr>
                  )}
                  {ticket.pinPassword && (
                    <tr>
                      <td className="text-gray-500 font-medium py-0.5">PIN / Şifre:</td>
                      <td className="font-mono font-bold text-amber-700 py-0.5">🔑 {ticket.pinPassword}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-gray-500 font-medium py-0.5">Durum:</td>
                    <td className="font-bold text-gray-900 py-0.5">{statusMap[ticket.rawStatus] || ticket.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {a4Config.showPatternLock && ticket.patternLock && (
              <div className="flex flex-col items-center shrink-0 border-l border-gray-200 pl-2">
                <span className="text-[8px] font-bold text-gray-400 uppercase mb-1">Desen</span>
                <PatternLockPicker
                  value={ticket.patternLock}
                  onChange={() => {}}
                  size={76}
                  readOnly
                />
              </div>
            )}
          </div>
        </div>

        {ticket.accessories && (
          <div className="border border-gray-200 rounded-xl p-2 bg-amber-50/20 print:bg-white print:border-gray-400 print:rounded-none mb-2 text-[10px] leading-tight">
            <span className="font-bold text-gray-700">Emanetler:</span> {ticket.accessories}
          </div>
        )}

        {/* Issue Description block */}
        <div className="border border-gray-200 rounded-xl p-2.5 mb-2 print:border-gray-400 print:rounded-none">
          <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 border-b pb-0.5">Müşteri Şikayeti / Açıklama</h3>
          <p className="text-[10px] text-gray-800 leading-normal whitespace-pre-wrap min-h-[30px]" dangerouslySetInnerHTML={{ __html: ticket.issueDescription || "Açıklama belirtilmemiş." }}></p>
        </div>

        {/* Masraflar ve İşlemler Listesi */}
        <div className="border border-gray-200 rounded-xl p-2.5 mb-2 bg-slate-50/30 print:bg-white print:border-gray-400 print:rounded-none">
          <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 border-b pb-0.5">Yapılan İşlemler & Masraf Dökümü</h3>
          <div className="text-[10px] space-y-0.5">
            {ticket.parts && ticket.parts.length > 0 ? (
              ticket.parts.map((p: any) => (
                <div key={p.id} className="flex justify-between text-gray-700">
                  <span>{p.name} (x{p.quantity})</span>
                  <span className="font-bold text-gray-900">₺{parseFloat(p.totalPrice).toLocaleString("tr-TR")}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-450 italic text-[9.5px]">Kullanılan yedek parça veya işlem kaydı bulunmuyor.</div>
            )}
            {parseFloat(ticket.laborCost) > 0 && (
              <div className="flex justify-between text-gray-700 border-t border-dashed pt-0.5 mt-0.5 font-bold">
                <span>İşçilik Ücreti</span>
                <span className="font-bold text-gray-900">₺{parseFloat(ticket.laborCost).toLocaleString("tr-TR")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cost & QR tracking */}
        <div className="flex justify-between items-center gap-3">
          {a4Config.showQrCode && qrCodeDataUrl ? (
            <div className="flex items-center gap-2.5 border border-gray-100 rounded-xl p-1.5 bg-gray-50/30 print:bg-white print:border-gray-400 print:rounded-none">
              <img src={qrCodeDataUrl} alt="Takip QR" className="w-12 h-12" />
              <div>
                <p className="text-[8.5px] font-bold text-gray-800 leading-tight">Cihaz Durumunu Cepten Sorgulayın</p>
                <p className="text-[7.5px] text-gray-500 leading-tight">Kameranızla taratarak anlık izleyebilirsiniz.</p>
              </div>
            </div>
          ) : (
            <div className="text-[8px] text-gray-400">QR Kod Gizli</div>
          )}

          {grandTotal > 0 ? (
            <div className="border border-gray-950 rounded-xl px-3 py-1.5 text-right bg-gray-950 text-white min-w-[120px]">
              <p className="text-[8px] uppercase tracking-wider font-bold opacity-70">Toplam Tutar</p>
              <p className="text-sm font-black">₺{grandTotal.toLocaleString("tr-TR")}</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl px-3 py-1.5 text-center text-gray-400 font-bold text-[9px] bg-gray-50">
              Ücretsiz Tespit / Servis Bedeli Bekleniyor
            </div>
          )}
        </div>
      </div>

      {/* Yasal Onay Metinleri (KVKK / Erişim Bilgisi / Ekspertiz Ücreti) */}
      <div className="mt-2 pt-1 border-t border-gray-100 text-[7.5px] text-gray-500 leading-tight space-y-0.5">
        <p>{ticket.kvkkConsentAt ? "☑" : "☐"} Müşteri, kişisel verilerinin KVKK kapsamında işlenmesine dair aydınlatma metnini okuduğunu ve onayladığını beyan eder.</p>
        <p>{ticket.dataLossConsentAt ? "☑" : "☐"} Müşteri, onarım sürecinde veri kaybı yaşanabileceği konusunda bilgilendirilmiştir.</p>
        <p>{ticket.accessInfoConsentAt ? "☑" : "☐"} Müşteri, cihaz erişim bilgilerinin (PIN/desen/hesap şifresi) yalnızca onarım amacıyla kullanılacağı konusunda bilgilendirilmiştir.</p>
        <p>{ticket.expertiseFeeConsentAt ? "☑" : "☐"} Müşteri, teklifi reddetmesi halinde ekspertiz ücreti tahakkuk edebileceği konusunda bilgilendirilmiştir.</p>
      </div>

      {/* Signature block */}
      <div className="mt-2 pt-1 border-t border-gray-100">
        {a4Config.showSignature && (
          <div className="grid grid-cols-2 gap-2 text-center text-[9px]">
            <div>
              <p className="font-bold text-gray-600 mb-1">Müşteri (Teslim Eden)</p>
              {ticket.customerSignature ? (
                <img src={ticket.customerSignature} alt="Müşteri İmzası" className="h-8 mx-auto my-0.5 object-contain" />
              ) : (
                <div className="h-6" />
              )}
              <p className="text-gray-400 text-[8px]">İmza / Tarih</p>
            </div>
            <div>
              <p className="font-bold text-gray-600 mb-1">{a4Config.signatureText || "Yetkili Servis (Teslim Alan)"}</p>
              <div className="h-6" />
              <p className="text-gray-400 text-[8px]">İmza / Kaşe</p>
            </div>
          </div>
        )}
        <div className="text-[7.5px] text-gray-400 text-center mt-2 border-t pt-1">
          {a4Config.footerText || "90 gün teslim alınmayan cihazlardan firmamız sorumlu değildir."}
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
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-green-700">Termal Fiş Yazıcısı</h3>
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

      {/* PRINT LAYOUT: A4 Double Copy (2 Bölünmüş A5 Nüsha) */}
      <div className={`print-container-a4 ${printMode === "a4" ? "block" : "hidden"} print:block mx-auto max-w-4xl bg-white w-full shadow-lg print:shadow-none p-6 print:p-0`}>
        {printMode === "a4" && (
          <div className="w-full flex flex-col justify-between" style={{ height: '282mm', boxSizing: 'border-box' }}>
            {/* Top Copy */}
            <A5Form copyType="FİRMA NÜSHASI" />
            
            {/* Cut Line */}
            <div className="w-full border-t-2 border-dashed border-black my-1 flex items-center justify-center relative" style={{ height: '8mm' }}>
              <span className="absolute bg-white px-4 text-[9px] text-gray-700 tracking-widest uppercase font-bold print:text-black">
                ✂ KESİM ÇİZGİSİ (A4 SAYFAYI 2'YE BÖLÜNÜZ) ✂
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
          <div className="flex flex-col">
            <div className="pos-receipt-page">
              <PosReceipt copyType="FİRMA" />
            </div>
            <div className="pos-receipt-page">
              <PosReceipt copyType="MÜŞTERİ" />
            </div>
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
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          ::-webkit-scrollbar { display: none; }

          ${printMode === "a4" ? `
            @page { size: A4 portrait; margin: 0; }
            .print-container-pos { display: none !important; }
            .print-container-a4 {
              display: block !important;
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 auto !important;
              padding: 6mm 10mm !important;
              box-sizing: border-box !important;
            }
            .print-container-a4 *, .print-container-a4 {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          ` : `
            @page { size: 80mm auto; margin: 0; }
            .print-container-a4 { display: none !important; }
            .print-container-pos { display: block !important; width: 80mm; margin: 0 !important; padding: 0 !important; }
            .pos-receipt-page {
              width: 80mm !important;
              margin: 0 !important;
              padding: 4px !important;
              page-break-after: always;
              break-after: page;
              box-sizing: border-box;
            }
            .pos-receipt-page:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }
            .pos-receipt { width: 100% !important; margin: 0 !important; padding: 0 !important; }
            .pos-receipt, .pos-receipt * {
              font-weight: 600 !important;
              -webkit-font-smoothing: antialiased;
              text-rendering: optimizeLegibility;
              background-image: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .pos-receipt b, .pos-receipt strong, .pos-receipt .font-bold {
              font-weight: 800 !important;
            }
          `}
        }
      `}</style>
    </div>
  );
}
