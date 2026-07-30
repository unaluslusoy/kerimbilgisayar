import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Barcode, ShoppingCart, User, Plus, X, Trash2,
  CreditCard, Banknote, Landmark, FileText, CheckCircle, Printer, RefreshCw, ChevronRight, Layers, Eye,
  LayoutDashboard, Wrench, Users, LogOut, Image as ImageIcon, Clock, AlertTriangle, Maximize2, Minimize2, Menu, Star
} from 'lucide-react';
import { useFullscreen } from '../../hooks/useFullscreen';
import { Link } from 'react-router-dom';
import { mediaUrl } from '../../lib/media';
import { 
  fetchAdminStock, fetchAdminCustomers, createAdminCustomer,
  createAdminSale, fetchAdminSales, fetchAdminSaleDetails,
  fetchSettings, createOdealPaymentLink, updateStockItem
} from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { playAddSound, playErrorSound } from '../../lib/sound';

export default function AdminPos() {
  const toast = useToast();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [stock, setStock] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [paymentType, setPaymentType] = useState<'nakit' | 'kredi_karti' | 'havale' | 'cari'>('nakit');
  const [cashGiven, setCashGiven] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');

  // Modals
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', taxOffice: '', taxId: '', address: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [completingSale, setCompletingSale] = useState(false);
  const [completedSaleDetails, setCompletedSaleDetails] = useState<any | null>(null);

  // Bekletilen Satışlar (Park Sale) — aynı anda birden fazla müşteriye hizmet verebilmek için
  const [heldSales, setHeldSales] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('pos_held_sales');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);

  // Scanner State
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Detail Modal
  const [detailSale, setDetailSale] = useState<any | null>(null);
  const detailPrintRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<any | null>(null);
  const [now, setNow] = useState(new Date());

  const loadData = async () => {
    try {
      const [stockData, custData, salesData, settingsData] = await Promise.all([
        fetchAdminStock(),
        fetchAdminCustomers(),
        fetchAdminSales(),
        fetchSettings().catch(() => null)
      ]);
      setStock(stockData.filter((i: any) => i.isActive && i.currentStock > 0));
      setCustomersList(custData);
      setSalesHistory(salesData);
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-focus barcode input
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
    // POS sayfasından çıkıldığında tam ekran modunda kalınmasın
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Header'daki canlı tarih/saat göstergesi
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    // Find in stock
    const item = stock.find(i => i.barcode === barcode || i.sku === barcode);
    if (item) {
      addToCart(item);
    } else {
      playErrorSound();
      toast.warning(`Barkod/SKU bulunamadı: ${barcode}`);
    }
    setBarcodeInput('');
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  };

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity >= item.currentStock) {
        playErrorSound();
        toast.warning(`Mevcut stok sınırına ulaşıldı: ${item.currentStock} adet.`);
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    playAddSound();
  };

  const updateCartQty = (itemId: number, qty: number) => {
    const item = stock.find(i => i.id === itemId);
    if (!item) return;

    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    if (qty > item.currentStock) {
      playErrorSound();
      toast.warning(`Mevcut stok sınırına ulaşıldı: ${item.currentStock} adet.`);
      return;
    }
    setCart(cart.map(c => c.id === itemId ? { ...c, quantity: qty } : c));
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(c => c.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountAmount('0');
    setNotes('');
  };

  const persistHeldSales = (list: any[]) => {
    setHeldSales(list);
    try { localStorage.setItem('pos_held_sales', JSON.stringify(list)); } catch {}
  };

  const holdCurrentSale = () => {
    if (cart.length === 0) return;
    const held = {
      id: Date.now(),
      heldAt: new Date().toISOString(),
      cart,
      selectedCustomer,
      discountAmount,
      notes,
      paymentType,
      label: selectedCustomer ? getCustomerDisplayName(selectedCustomer) : `${cart.length} kalem`,
    };
    persistHeldSales([held, ...heldSales]);
    clearCart();
    playAddSound();
    toast.success('Sepet bekletildi. Yeni müşteriye devam edebilirsiniz.');
  };

  const resumeHeldSale = (id: number) => {
    const held = heldSales.find(h => h.id === id);
    if (!held) return;
    let remaining = heldSales.filter(h => h.id !== id);
    // Sepette zaten ürün varsa veri kaybetmemek için onu da otomatik bekletmeye alıyoruz
    if (cart.length > 0) {
      const currentHeld = {
        id: Date.now(),
        heldAt: new Date().toISOString(),
        cart, selectedCustomer, discountAmount, notes, paymentType,
        label: selectedCustomer ? getCustomerDisplayName(selectedCustomer) : `${cart.length} kalem`,
      };
      remaining = [currentHeld, ...remaining];
      toast.info('Mevcut sepetiniz otomatik olarak bekletildi.');
    }
    setCart(held.cart);
    setSelectedCustomer(held.selectedCustomer);
    setDiscountAmount(held.discountAmount);
    setNotes(held.notes);
    setPaymentType(held.paymentType);
    persistHeldSales(remaining);
    setShowHeldSales(false);
  };

  const [pendingDiscardId, setPendingDiscardId] = useState<number | null>(null);
  const discardHeldSale = (id: number) => {
    if (pendingDiscardId !== id) {
      setPendingDiscardId(id);
      setTimeout(() => setPendingDiscardId(prev => prev === id ? null : prev), 3000);
      return;
    }
    persistHeldSales(heldSales.filter(h => h.id !== id));
    setPendingDiscardId(null);
  };

  // Calculations
  const subtotal = cart.reduce((s, c) => s + (parseFloat(c.sellingPrice || '0') * c.quantity), 0);
  const discount = parseFloat(discountAmount) || 0;
  const total = Math.max(0, subtotal - discount);
  const vat = cart.reduce((s, c) => {
    const price = parseFloat(c.sellingPrice || '0');
    const rate = parseInt(c.vatRate || '20');
    const itemSubtotal = price * c.quantity;
    return s + (itemSubtotal * (rate / (100 + rate)));
  }, 0);

  const getCustomerDisplayName = (c: any) => {
    if (!c) return '';
    if (c.firstName || c.lastName) {
      return `${c.firstName || ''} ${c.lastName || ''}`.trim();
    }
    return c.name || 'İsimsiz Müşteri';
  };

  const handleCreateCustomer = async () => {
    if (!newCust.name) return;
    setSavingCustomer(true);
    try {
      const parts = newCust.name.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      const res = await createAdminCustomer({
        firstName,
        lastName,
        phone: newCust.phone,
        email: newCust.email,
        taxOffice: newCust.taxOffice,
        taxId: newCust.taxId,
        address: newCust.address
      });
      setShowAddCustModal(false);
      setNewCust({ name: '', phone: '', email: '', taxOffice: '', taxId: '', address: '' });
      await loadData();
      // Select newly created customer
      if (res.customerId) {
        const fullCust = customersList.find(c => c.id === res.customerId) || { id: res.customerId, firstName, lastName };
        setSelectedCustomer(fullCust);
      } else {
        // Fallback search
        const updated = await fetchAdminCustomers();
        setCustomersList(updated);
        const created = updated.find((c: any) => `${c.firstName || ''} ${c.lastName || ''}`.trim() === `${firstName} ${lastName}`.trim());
        if (created) setSelectedCustomer(created);
      }
      toast.success('Müşteri başarıyla eklendi.');
    } catch (e: any) {
      toast.error('Müşteri ekleme hatası: ' + e.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (paymentType === 'cari' && !selectedCustomer) {
      toast.warning('Cari satış (veresiye) yapabilmek için lütfen bir müşteri seçin.');
      return;
    }

    setCompletingSale(true);
    try {
      if (paymentType === 'odeal') {
        try {
          const odealRes = await createOdealPaymentLink({
            amount: total,
            title: 'Kerim Bilgisayar POS Satışı',
            description: `${cart.length} kalem, ${cart.reduce((s, c) => s + c.quantity, 0)} adet`,
            customerPhone: selectedCustomer?.phone,
            customerEmail: selectedCustomer?.email,
          });
          if (odealRes.paymentUrl) {
            if (selectedCustomer?.phone) {
              const waPhone = selectedCustomer.phone.replace(/\D/g, '').startsWith('0')
                ? '90' + selectedCustomer.phone.replace(/\D/g, '').substring(1)
                : selectedCustomer.phone.replace(/\D/g, '').startsWith('90')
                ? selectedCustomer.phone.replace(/\D/g, '')
                : '90' + selectedCustomer.phone.replace(/\D/g, '');
              const waMsg = encodeURIComponent(`Sayın Müşterimiz, ₺${total.toLocaleString('tr-TR')} tutarındaki ödemeniz için Ödeal güvenli ödeme bağlantınız: ${odealRes.paymentUrl}`);
              window.open(`https://wa.me/${waPhone}?text=${waMsg}`, '_blank');
            } else {
              await navigator.clipboard.writeText(odealRes.paymentUrl);
              toast.success('Ödeal ödeme linki panoya kopyalandı.');
            }
          }
        } catch (odealErr: any) {
          toast.error('Ödeal linki oluşturulamadı: ' + odealErr.message);
          setCompletingSale(false);
          return;
        }
      }

      const saleData = {
        customerId: selectedCustomer?.id || null,
        paymentType,
        discountAmount: discount.toFixed(2),
        notes: notes || null,
        items: cart.map(c => ({
          stockItemId: c.id,
          quantity: c.quantity,
          unitPrice: (parseFloat(c.sellingPrice) || 0).toFixed(2),
          vatRate: c.vatRate
        }))
      };

      const res = await createAdminSale(saleData);
      if (res.success) {
        // Fetch full sale details for print receipt
        const fullDetails = await fetchAdminSaleDetails(res.saleId);
        setCompletedSaleDetails(fullDetails);
        clearCart();
        await loadData();
        toast.success('Satış başarıyla tamamlandı!');
      }
    } catch (e: any) {
      toast.error('Satış tamamlama hatası: ' + e.message);
    } finally {
      setCompletingSale(false);
    }
  };

  // Klavye kısayolları: F2 barkod alanına odaklan, F9 satışı tamamla
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'pos') return;
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0 && !completingSale) handleCompleteSale();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, cart, completingSale, handleCompleteSale]);

  const handlePrintThermal = (details: any) => {
    let template: any = {};
    try {
      if (settings?.print_ticket_pos_sale_template) {
        template = JSON.parse(settings.print_ticket_pos_sale_template);
      }
    } catch (e) {
      console.error('Fiş şablonu ayarları okunamadı', e);
    }
    const headerTitle = template.headerTitle || 'KERİM BİLGİSAYAR';
    const headerSub = template.headerSub || 'Teknik Servis & Bilişim Hizmetleri';
    const headerInfo = template.headerInfo || 'Tel: 0543 456 78 90';
    const footerText = template.footerText || 'Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz.';
    const fontSize = template.fontSize || 12;
    const fontFamily = template.fontFamily || "'Courier New', Courier, monospace";
    const marginTop = template.marginTop ?? 5;
    const marginBottom = template.marginBottom ?? 5;
    const marginLeft = template.marginLeft ?? 5;
    const marginRight = template.marginRight ?? 5;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      const dateStr = new Date(details.sale.createdAt).toLocaleString('tr-TR');
      let itemsHtml = '';
      details.items.forEach((item: any) => {
        const itemTotal = parseFloat(item.totalPrice).toFixed(2);
        itemsHtml += `
          <tr>
            <td style="padding: 3px 0;">${item.productName}<br/><span style="font-size: 10px; color:#555;">${item.quantity} x ₺${parseFloat(item.unitPrice).toFixed(2)}</span></td>
            <td style="text-align: right; vertical-align: top; padding: 3px 0;">₺${itemTotal}</td>
          </tr>
        `;
      });

      doc.write(`
        <html>
          <head>
            <title>Bilgi Fişi - ${details.sale.receiptNumber}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              * { box-sizing: border-box; }
              body { margin: 0; padding: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px; font-family: ${fontFamily}; font-size: ${fontSize}px; color: #000; width: 80mm; }
              .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
              .title { font-size: 1.15em; font-weight: bold; margin-bottom: 2px; }
              .sub-title { font-size: 0.85em; color: #333; }
              .meta { font-size: 0.9em; margin-bottom: 8px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
              .table th { border-bottom: 1px solid #000; text-align: left; padding: 3px 0; font-size: 0.9em; }
              .totals { border-top: 1px dashed #000; padding-top: 5px; font-size: 0.9em; }
              .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
              .grand-total { font-size: 1.05em; font-weight: bold; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
              .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 8px; font-size: 0.8em; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">${headerTitle}</div>
              <div class="sub-title">${headerSub}</div>
              <div class="sub-title">${headerInfo}</div>
            </div>
            <div class="meta">
              <div><b>Fiş No:</b> ${details.sale.receiptNumber}</div>
              <div><b>Tarih:</b> ${dateStr}</div>
              <div><b>Müşteri:</b> ${details.sale.customerName || 'Perakende Müşteri'}</div>
              <div><b>Kasa:</b> ${details.sale.salespersonName}</div>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Ürün Açıklaması</th>
                  <th style="text-align: right;">Tutar</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="totals">
              <div class="total-row"><span>Ara Toplam (KDV Dahil):</span> <span>₺${(parseFloat(details.sale.totalAmount) + parseFloat(details.sale.discountAmount)).toFixed(2)}</span></div>
              <div class="total-row"><span>KDV Tutarı:</span> <span>₺${parseFloat(details.sale.taxAmount).toFixed(2)}</span></div>
              ${parseFloat(details.sale.discountAmount) > 0 ? `<div class="total-row"><span>İndirim:</span> <span>-₺${parseFloat(details.sale.discountAmount).toFixed(2)}</span></div>` : ''}
              <div class="total-row grand-total"><span>GENEL TOPLAM:</span> <span>₺${parseFloat(details.sale.totalAmount).toFixed(2)}</span></div>
            </div>
            <div class="footer">
              <div style="font-weight: bold;">Ödeme: ${details.sale.paymentType.toUpperCase().replace('_', ' ')}</div>
              <div style="margin-top: 5px;">${footerText}</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.frameElement.remove(); }, 100);
              }
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  const toggleQuickSale = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextValue = !item.isQuickSale;
    setStock(prev => prev.map(i => i.id === item.id ? { ...i, isQuickSale: nextValue } : i));
    try {
      await updateStockItem(item.id, { isQuickSale: nextValue });
    } catch (e: any) {
      setStock(prev => prev.map(i => i.id === item.id ? { ...i, isQuickSale: !nextValue } : i));
      toast.error('Hızlı satış işaretlemesi güncellenemedi: ' + e.message);
    }
  };

  const [detailLoading, setDetailLoading] = useState(false);
  const showSaleDetails = async (saleId: number) => {
    setDetailLoading(true);
    try {
      const details = await fetchAdminSaleDetails(saleId);
      setDetailSale(details);
    } catch (e: any) {
      toast.error('Satış detayları çekilemedi: ' + e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const productCategories = Array.from(
    new Map<number, string>(
      stock.filter(i => i.categoryId && i.categoryName).map((i): [number, string] => [i.categoryId, i.categoryName])
    ).entries()
  ).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const filteredStock = stock.filter(item => {
    const matchSearch = !productSearch ||
      item.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.brand?.toLowerCase().includes(productSearch.toLowerCase());
    const matchCategory = !categoryFilter || String(item.categoryId) === categoryFilter;
    return matchSearch && matchCategory;
  });

  const quickSaleItems = stock.filter(item => item.isQuickSale);

  const filteredCustomers = customersList.filter(cust => {
    const fullName = `${cust.firstName || ''} ${cust.lastName || ''}`.toLowerCase();
    return !customerSearch ||
      fullName.includes(customerSearch.toLowerCase()) ||
      cust.phone?.includes(customerSearch) ||
      cust.email?.toLowerCase().includes(customerSearch.toLowerCase());
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-100 flex flex-col select-none overflow-hidden animate-in fade-in duration-200"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Standalone Application Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-2.5 flex items-center justify-between shadow-lg border-b border-slate-950/60 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Kompakt Logo */}
          <div className="flex items-center gap-2 shrink-0 pr-3 mr-1 border-r border-slate-700/60">
            <div className="w-8 h-8 bg-white rounded-xl shadow-md flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-slate-950/5">
              {settings?.logoUrl || settings?.siteLogo ? (
                <img
                  src={mediaUrl(settings.logoUrl || settings.siteLogo)}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <ShoppingCart className="w-4 h-4 text-primary" />
              )}
            </div>
            <span className="text-sm font-extrabold tracking-tight text-white whitespace-nowrap">Kerim Bilgisayar</span>
            <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 uppercase tracking-wide">POS</span>
          </div>

          {/* Canlı Tarih / Saat */}
          <div className="hidden md:flex flex-col items-center px-3 py-1 bg-slate-950/40 rounded-xl border border-slate-700/70 shrink-0">
            <span className="text-sm font-mono font-black text-white leading-none tabular-nums">
              {now.toLocaleTimeString('tr-TR')}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">
              {now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' })}
            </span>
          </div>

          {/* Hızlı Gezinme Menüsü — tam ekranda dikkat dağıtmaması için gizlenir */}
          {!isFullscreen && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowNavMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/40 hover:bg-slate-700/60 border border-slate-700/70 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <Menu className="w-4 h-4" /> Menü
              </button>
              {showNavMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowNavMenu(false)} />
                  <div className="absolute top-full left-0 mt-1.5 bg-slate-900 border border-slate-700/70 rounded-xl shadow-2xl z-40 min-w-[180px] overflow-hidden">
                    <Link to="/admin" onClick={() => setShowNavMenu(false)} className="px-3.5 py-2.5 hover:bg-slate-700/60 text-xs font-bold transition-all text-slate-300 hover:text-white flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link to="/admin/servis" onClick={() => setShowNavMenu(false)} className="px-3.5 py-2.5 hover:bg-slate-700/60 text-xs font-bold transition-all text-slate-300 hover:text-white flex items-center gap-2">
                      <Wrench className="w-4 h-4" /> Servis Kayıtları
                    </Link>
                    <Link to="/admin/stok" onClick={() => setShowNavMenu(false)} className="px-3.5 py-2.5 hover:bg-slate-700/60 text-xs font-bold transition-all text-slate-300 hover:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Stok Yönetimi
                    </Link>
                    <Link to="/admin/musteriler" onClick={() => setShowNavMenu(false)} className="px-3.5 py-2.5 hover:bg-slate-700/60 text-xs font-bold transition-all text-slate-300 hover:text-white flex items-center gap-2">
                      <Users className="w-4 h-4" /> Müşteriler
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Active Tab, Fullscreen Toggle & Exit Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-950/40 p-1 rounded-xl border border-slate-700/70">
            <button
              onClick={() => { setActiveTab('pos'); loadData(); }}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${activeTab === 'pos' ? 'bg-primary text-white shadow' : 'text-slate-300 hover:text-white'}`}
            >
              Satış Ekranı
            </button>
            <button
              onClick={() => { setActiveTab('history'); loadData(); }}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${activeTab === 'history' ? 'bg-primary text-white shadow' : 'text-slate-300 hover:text-white'}`}
            >
              Geçmiş Satışlar
            </button>
          </div>

          <button
            type="button"
            onClick={() => toggleFullscreen()}
            title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
            className="p-2 bg-slate-950/40 hover:bg-slate-700/60 border border-slate-700/70 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <Link
            to="/admin"
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-md shadow-red-900/30 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Kapat / Çıkış
          </Link>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* LEFT: SHOPPING CART & BILLING */}
          <div className="w-full lg:w-[420px] bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col min-h-0 shrink-0">
            {/* Cart Title */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <span className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </span>
                Alışveriş Sepeti
                {cart.length > 0 && (
                  <span className="bg-primary text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {cart.reduce((s, c) => s + c.quantity, 0)}
                  </span>
                )}
              </span>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="text-xs text-red-500 font-semibold hover:text-red-700 disabled:opacity-40 cursor-pointer flex items-center gap-1 py-2 px-2 -m-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Temizle
              </button>
            </div>

            {/* Barkod Okutma / Manuel Giriş — Enter'a basınca veya barkod okutulunca otomatik sepete eklenir */}
            <form onSubmit={handleBarcodeSubmit} className="mb-3 shrink-0">
              <div className="relative">
                <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Barkodu taratın veya yazıp Enter'a basın... (F2)"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-primary/5 border-2 border-primary/30 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
            </form>

            {/* Sepeti Beklet / Bekleyen Satışlar */}
            <div className="flex items-center gap-2 mb-3 shrink-0 relative">
              <button
                type="button"
                onClick={holdCurrentSale}
                disabled={cart.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" /> Sepeti Beklet
              </button>
              <button
                type="button"
                onClick={() => setShowHeldSales(v => !v)}
                disabled={heldSales.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer relative"
              >
                <Layers className="w-3.5 h-3.5" /> Bekleyenler
                {heldSales.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                    {heldSales.length}
                  </span>
                )}
              </button>

              {showHeldSales && heldSales.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto">
                  {heldSales.map(h => (
                    <div key={h.id} className="flex items-center justify-between gap-2 p-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate">{h.label}</p>
                        <p className="text-[10px] text-gray-400">{new Date(h.heldAt).toLocaleTimeString('tr-TR')} · {h.cart.length} kalem</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => resumeHeldSale(h.id)}
                        className="text-[10px] font-bold text-white bg-primary hover:bg-secondary px-2 py-1 rounded-lg cursor-pointer shrink-0"
                      >
                        Devam Et
                      </button>
                      <button
                        type="button"
                        onClick={() => discardHeldSale(h.id)}
                        title={pendingDiscardId === h.id ? 'Onaylamak için tekrar tıklayın' : 'Sil'}
                        className={`p-2.5 rounded-lg cursor-pointer shrink-0 transition-colors ${pendingDiscardId === h.id ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart items list */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 divide-y">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center text-gray-400 gap-3">
                  <ShoppingCart className="w-10 h-10 text-gray-300" />
                  <p className="text-xs font-semibold">Sepete henüz ürün eklemediniz.</p>
                </div>
              ) : cart.map(c => {
                const rowTotal = parseFloat(c.sellingPrice || '0') * c.quantity;
                return (
                  <div key={c.id} className="py-3 flex justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-gray-800 truncate" title={c.name}>{c.name}</h4>
                      <p className="text-xxs text-gray-400 mt-0.5">₺{parseFloat(c.sellingPrice).toLocaleString('tr-TR')} / {c.unit || 'adet'}</p>

                      {/* Quantity adjuster */}
                      <div className="flex items-center gap-1 mt-2 bg-gray-50 border border-gray-200 rounded-full p-0.5 w-fit">
                        <button
                          onClick={() => updateCartQty(c.id, c.quantity - 1)}
                          className="w-10 h-10 bg-white hover:bg-primary hover:text-white shadow-sm rounded-full text-base font-bold flex items-center justify-center cursor-pointer transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-xs font-extrabold text-gray-900">{c.quantity}</span>
                        <button
                          onClick={() => updateCartQty(c.id, c.quantity + 1)}
                          className="w-10 h-10 bg-white hover:bg-primary hover:text-white shadow-sm rounded-full text-base font-bold flex items-center justify-center cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeFromCart(c.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg p-2.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-extrabold text-sm text-gray-900">
                        ₺{rowTotal.toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Customer select / Quick Customer Add */}
            <div className="mt-4 border-t pt-4 space-y-3 shrink-0">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <User className="w-4 h-4 text-primary" /> Müşteri Seçimi
                </label>
                <button 
                  onClick={() => setShowAddCustModal(true)}
                  className="text-xxs text-primary font-bold hover:text-secondary flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Hızlı Ekle
                </button>
              </div>

              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-2.5 rounded-xl">
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-900">{getCustomerDisplayName(selectedCustomer)}</p>
                    <p className="text-xxs text-gray-500">{selectedCustomer.phone || 'Telefon yok'}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1 hover:bg-red-50 rounded-lg text-red-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Müşteri adı veya telefon ile arayın..."
                    value={customerSearch}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setShowCustDropdown(true);
                    }}
                    onFocus={() => setShowCustDropdown(true)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
                  />
                  {showCustDropdown && customerSearch.trim() && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border rounded-xl shadow-2xl max-h-48 overflow-y-auto z-10">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-gray-400">Sonuç bulunamadı</div>
                      ) : (
                        filteredCustomers.map(cust => (
                          <div
                            key={cust.id}
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setCustomerSearch('');
                              setShowCustDropdown(false);
                            }}
                            className="p-2.5 hover:bg-gray-50 cursor-pointer text-xs font-semibold text-gray-700 flex justify-between border-b"
                          >
                            <span>{getCustomerDisplayName(cust)}</span>
                            <span className="text-gray-400 font-normal">{cust.phone || '—'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Calculations & Discounts */}
            <div className="mt-4 border-t pt-4 space-y-3 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-semibold w-24">Ek İndirim (₺)</span>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  className="flex-1 border rounded-lg px-2 py-1 text-xs font-bold outline-none text-right focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Ödeme Tipi</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { type: 'nakit', label: 'Nakit', icon: Banknote, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                    { type: 'kredi_karti', label: 'K. Kartı', icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                    { type: 'odeal', label: 'Ödeal POS', icon: CreditCard, color: 'text-purple-600 bg-purple-50 border-purple-200' },
                    { type: 'havale', label: 'Havale', icon: Landmark, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                    { type: 'cari', label: 'Cari', icon: FileText, color: 'text-red-600 bg-red-50 border-red-200' },
                  ].map(p => {
                    const Icon = p.icon;
                    const isSelected = paymentType === p.type;
                    return (
                      <button
                        key={p.type}
                        onClick={() => setPaymentType(p.type as any)}
                        className={`relative border p-2 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isSelected ? `${p.color} ring-2 ring-offset-1 ring-primary shadow-sm` : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
                            <CheckCircle className="w-3 h-3" />
                          </span>
                        )}
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-bold">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nakit Para Üstü Hesaplayıcı */}
              {paymentType === 'nakit' && (
                <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Alınan Nakit (₺)</span>
                    <div className="flex gap-1">
                      {[100, 200, 500, 1000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCashGiven(String(val))}
                          className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          ₺{val}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCashGiven(total.toFixed(2))}
                        className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Tam
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Alınan miktar..."
                      value={cashGiven}
                      onChange={e => setCashGiven(e.target.value)}
                      className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {parseFloat(cashGiven) > 0 && (
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase block">Para Üstü</span>
                        <span className={`text-sm font-extrabold ${parseFloat(cashGiven) >= total ? 'text-emerald-700' : 'text-red-500'}`}>
                          ₺{Math.max(0, parseFloat(cashGiven) - total).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Satış notu / not defteri..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xxs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Totals Summary */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500 font-semibold">
                  <span>Ara Toplam</span>
                  <span>₺{subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 font-semibold">
                  <span>KDV Payı</span>
                  <span>₺{vat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-semibold">
                    <span>İndirim</span>
                    <span>-₺{discount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-dashed border-gray-300 pt-2 mt-1.5 font-extrabold text-gray-900">
                  <span className="text-sm">Ödenecek Tutar</span>
                  <span className="text-2xl text-primary">₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* POS SUBMIT BUTTON */}
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || completingSale}
                className="w-full py-3.5 bg-primary hover:bg-secondary active:scale-[0.98] text-white font-extrabold text-sm rounded-xl disabled:opacity-40 disabled:active:scale-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
              >
                {completingSale ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Satış Tamamlanıyor...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Satışı Tamamla & Yazdır <span className="text-[10px] font-normal opacity-70">(F9)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: PRODUCTS LIST & BARCODE SCANNER */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col min-h-0">
            {/* Hızlı Satış Butonları */}
            {quickSaleItems.length > 0 && (
              <div className="flex gap-2 mb-3 shrink-0 overflow-x-auto pb-1">
                {quickSaleItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addToCart(item)}
                    disabled={item.currentStock <= 0}
                    className="shrink-0 flex flex-col items-start gap-0.5 min-w-[120px] px-3.5 py-3 bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200 rounded-xl text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="flex items-center gap-1 text-[9px] font-extrabold text-amber-600 uppercase">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Hızlı Satış
                    </span>
                    <span className="text-xs font-bold text-gray-900 line-clamp-1">{item.name}</span>
                    <span className="text-[11px] font-extrabold text-primary">₺{parseFloat(item.sellingPrice || '0').toLocaleString('tr-TR')}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Product search box */}
            <div className="relative mb-2.5 shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ürün adı, SKU veya marka ile ara..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            {/* Category filter chips */}
            {productCategories.length > 0 && (
              <div className="flex gap-1.5 mb-3 shrink-0 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('')}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${!categoryFilter ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Tümü
                </button>
                {productCategories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(String(cat.id))}
                    className={`px-3 py-2 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${categoryFilter === String(cat.id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Grid of stock items */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-xs text-gray-500 font-medium">Stoklar yükleniyor...</span>
                </div>
              ) : filteredStock.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-xs font-semibold">
                  Satışa uygun ürün bulunamadı.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
                  {filteredStock.map(item => {
                    const isLowStock = item.currentStock <= (item.minStockLevel || 0);
                    return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`border rounded-lg p-1.5 bg-white flex flex-col justify-between gap-1 cursor-pointer hover:shadow-md active:scale-95 transition-all duration-100 text-left hover:scale-[1.02] ${isLowStock ? 'border-amber-300 hover:border-amber-500' : 'border-gray-200 hover:border-primary'}`}
                    >
                      <div className="space-y-1">
                        <div className="relative aspect-square w-full rounded-md overflow-hidden bg-slate-50 border border-gray-100 flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <img src={mediaUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                          )}
                          {isLowStock && (
                            <span className="absolute top-0.5 right-0.5 bg-amber-500 text-white rounded-full p-0.5" title="Kritik stok">
                              <AlertTriangle className="w-2.5 h-2.5" />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => toggleQuickSale(item, e)}
                            title={item.isQuickSale ? 'Hızlı satıştan kaldır' : 'Hızlı satışa ekle'}
                            className={`absolute top-0.5 left-0.5 rounded-full p-1 transition-colors cursor-pointer ${item.isQuickSale ? 'bg-amber-500 text-white' : 'bg-white/80 text-gray-400 hover:text-amber-500'}`}
                          >
                            <Star className={`w-3 h-3 ${item.isQuickSale ? 'fill-white' : ''}`} />
                          </button>
                        </div>
                        <h3 className="font-bold text-gray-900 text-[10px] line-clamp-2 min-h-[24px] leading-tight">{item.name}</h3>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-100 pt-1">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.currentStock}
                        </span>
                        <span className="text-[11px] font-extrabold text-primary">
                          ₺{parseFloat(item.sellingPrice || '0').toLocaleString('tr-TR')}
                        </span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* SALES HISTORY TAB */
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col min-h-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/70 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Fiş Numarası</th>
                  <th className="px-5 py-3.5 font-semibold">Müşteri</th>
                  <th className="px-5 py-3.5 font-semibold">Kasiyer / Satıcı</th>
                  <th className="px-5 py-3.5 font-semibold">Ödeme Tipi</th>
                  <th className="px-5 py-3.5 font-semibold">İndirim</th>
                  <th className="px-5 py-3.5 font-semibold">Toplam Tutar</th>
                  <th className="px-5 py-3.5 font-semibold">Tarih</th>
                  <th className="px-5 py-3.5 font-semibold text-center w-28">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {salesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400 font-medium">
                      Kayıtlı satış bulunamadı.
                    </td>
                  </tr>
                ) : salesHistory.map(sale => {
                  const dateStr = new Date(sale.createdAt).toLocaleString('tr-TR');
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-gray-800">{sale.receiptNumber}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{sale.customerName || 'Perakende Müşteri'}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">{sale.salespersonName}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          sale.paymentType === 'nakit' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          sale.paymentType === 'kredi_karti' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          sale.paymentType === 'havale' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {sale.paymentType.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-red-600">₺{parseFloat(sale.discountAmount || '0').toLocaleString('tr-TR')}</td>
                      <td className="px-5 py-3.5 font-extrabold text-gray-900">₺{parseFloat(sale.totalAmount).toLocaleString('tr-TR')}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{dateStr}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => showSaleDetails(sale.id)}
                            className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                            title="İncele"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const details = await fetchAdminSaleDetails(sale.id);
                              handlePrintThermal(details);
                            }}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Fiş Yazdır"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900">Hızlı Müşteri Ekle</h2>
              <button onClick={() => setShowAddCustModal(false)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Müşteri Ad Soyad / Ünvan *</label>
                <input
                  type="text"
                  value={newCust.name}
                  onChange={e => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Örn: Ahmet Yılmaz"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Telefon</label>
                  <input
                    type="text"
                    value={newCust.phone}
                    onChange={e => setNewCust({ ...newCust, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="05..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">E-posta</label>
                  <input
                    type="email"
                    value={newCust.email}
                    onChange={e => setNewCust({ ...newCust, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="ahmet@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={newCust.taxOffice}
                    onChange={e => setNewCust({ ...newCust, taxOffice: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vergi No / TC</label>
                  <input
                    type="text"
                    value={newCust.taxId}
                    onChange={e => setNewCust({ ...newCust, taxId: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Adres</label>
                <textarea
                  value={newCust.address}
                  onChange={e => setNewCust({ ...newCust, address: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowAddCustModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-50 transition-colors cursor-pointer">İptal</button>
              <button
                onClick={handleCreateCustomer}
                disabled={savingCustomer || !newCust.name}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center transition-all cursor-pointer"
              >
                {savingCustomer && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                Müşteriyi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALE COMPLETE SUCCESS MODAL & RECEIPT PREVIEW */}
      {completedSaleDetails && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-emerald-500" /> Satış Başarıyla Tamamlandı
              </h2>
              <button onClick={() => setCompletedSaleDetails(null)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-800">Fiş No: {completedSaleDetails.sale.receiptNumber}</p>
                <p className="text-xl font-extrabold text-primary">₺{parseFloat(completedSaleDetails.sale.totalAmount).toLocaleString('tr-TR')}</p>
              </div>

              {/* Info text */}
              <p className="text-xs text-gray-500">
                Ödeme tipi <b>{completedSaleDetails.sale.paymentType.toUpperCase().replace('_', ' ')}</b> olarak kaydedildi.
                Termal bilgi fişi yazdırmak için aşağıdaki butonu kullanabilirsiniz.
              </p>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button 
                onClick={() => setCompletedSaleDetails(null)} 
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Kapat
              </button>
              <button 
                onClick={() => handlePrintThermal(completedSaleDetails)}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-semibold flex items-center justify-center transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" /> Fiş Yazdır
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL SALE HISTORY VIEW MODAL */}
      {detailSale && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900">Satış Detayları</h2>
              <button onClick={() => setDetailSale(null)} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs border-b pb-3 text-left">
                <div>
                  <span className="text-gray-400">Fiş Numarası</span>
                  <p className="font-bold text-gray-800">{detailSale.sale.receiptNumber}</p>
                </div>
                <div>
                  <span className="text-gray-400">Tarih / Saat</span>
                  <p className="font-bold text-gray-800">{new Date(detailSale.sale.createdAt).toLocaleString('tr-TR')}</p>
                </div>
                <div>
                  <span className="text-gray-400">Müşteri</span>
                  <p className="font-bold text-gray-800">{detailSale.sale.customerName || 'Perakende Müşteri'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Kasiyer</span>
                  <p className="font-bold text-gray-800">{detailSale.sale.salespersonName}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 text-left">
                <span className="text-xs font-bold text-gray-500 uppercase">Satılan Ürünler</span>
                <div className="border rounded-xl divide-y overflow-hidden">
                  {detailSale.items.map((item: any) => (
                    <div key={item.id} className="p-3 bg-gray-50/40 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-gray-800">{item.productName}</p>
                        <p className="text-xxs text-gray-400 font-mono mt-0.5">SKU: {item.sku} {item.serialNumber && `| Seri No: ${item.serialNumber}`}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₺{parseFloat(item.totalPrice).toLocaleString('tr-TR')}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.quantity} adet x ₺{parseFloat(item.unitPrice).toLocaleString('tr-TR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial summary */}
              <div className="bg-gray-50 p-3 rounded-xl border space-y-2 text-left">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Ara Toplam</span>
                  <span>₺{(parseFloat(detailSale.sale.totalAmount) + parseFloat(detailSale.sale.discountAmount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>KDV (Dahil)</span>
                  <span>₺{parseFloat(detailSale.sale.taxAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                {parseFloat(detailSale.sale.discountAmount) > 0 && (
                  <div className="flex justify-between text-xs text-red-600">
                    <span>İndirim</span>
                    <span>-₺{parseFloat(detailSale.sale.discountAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t pt-2 font-extrabold text-sm text-gray-900">
                  <span>Ödenen Toplam</span>
                  <span className="text-primary text-base">₺{parseFloat(detailSale.sale.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setDetailSale(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors cursor-pointer">Kapat</button>
              <button 
                onClick={() => handlePrintThermal(detailSale)}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-semibold flex items-center justify-center transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" /> Fiş Yazdır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
