import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Barcode, ShoppingCart, User, Plus, X, Trash2, 
  CreditCard, Banknote, Landmark, FileText, CheckCircle, Printer, RefreshCw, ChevronRight, Layers, Eye,
  LayoutDashboard, Wrench, Users, LogOut, Image as ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { mediaUrl } from '../../lib/media';
import { 
  fetchAdminStock, fetchAdminCustomers, createAdminCustomer, 
  createAdminSale, fetchAdminSales, fetchAdminSaleDetails,
  fetchSettings
} from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function AdminPos() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [stock, setStock] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [paymentType, setPaymentType] = useState<'nakit' | 'kredi_karti' | 'havale' | 'cari'>('nakit');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');

  // Modals
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', taxOffice: '', taxId: '', address: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [completingSale, setCompletingSale] = useState(false);
  const [completedSaleDetails, setCompletedSaleDetails] = useState<any | null>(null);

  // Scanner State
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Detail Modal
  const [detailSale, setDetailSale] = useState<any | null>(null);
  const detailPrintRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<any | null>(null);

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
      toast.warning(`Barkod/SKU bulunamadı: ${barcode}`);
    }
    setBarcodeInput('');
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  };

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity >= item.currentStock) {
        toast.warning(`Mevcut stok sınırına ulaşıldı: ${item.currentStock} adet.`);
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateCartQty = (itemId: number, qty: number) => {
    const item = stock.find(i => i.id === itemId);
    if (!item) return;

    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    if (qty > item.currentStock) {
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

  const handlePrintThermal = (details: any) => {
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
              body { margin: 0; padding: 5px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; width: 80mm; }
              .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
              .title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
              .sub-title { font-size: 10px; color: #333; }
              .meta { font-size: 11px; margin-bottom: 8px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
              .table th { border-bottom: 1px solid #000; text-align: left; padding: 3px 0; font-size: 11px; }
              .totals { border-top: 1px dashed #000; padding-top: 5px; font-size: 11px; }
              .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
              .grand-total { font-size: 13px; font-weight: bold; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
              .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 8px; font-size: 10px; }
              @media print {
                body { width: 100%; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">KERİM BİLGİSAYAR</div>
              <div class="sub-title">Teknik Servis & Bilişim Hizmetleri</div>
              <div class="sub-title">Tel: 0543 456 78 90</div>
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
              <div style="margin-top: 5px;">Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz.</div>
              <div>Teknik Servis Programı</div>
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

  const filteredStock = stock.filter(item => {
    return !productSearch ||
      item.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.brand?.toLowerCase().includes(productSearch.toLowerCase());
  });

  const filteredCustomers = customersList.filter(cust => {
    const fullName = `${cust.firstName || ''} ${cust.lastName || ''}`.toLowerCase();
    return !customerSearch ||
      fullName.includes(customerSearch.toLowerCase()) ||
      cust.phone?.includes(customerSearch) ||
      cust.email?.toLowerCase().includes(customerSearch.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      {/* Standalone Application Bar */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-md border-b border-slate-950 shrink-0">
        <div className="flex items-center gap-3">
          {settings?.logoUrl || settings?.siteLogo ? (
            <div className="bg-white p-1 rounded-xl border border-slate-750 flex items-center justify-center">
              <img 
                src={mediaUrl(settings.logoUrl || settings.siteLogo)} 
                alt="Logo" 
                className="h-8 max-w-[120px] object-contain" 
              />
            </div>
          ) : (
            <div className="p-2 bg-primary/20 rounded-xl text-primary-light border border-primary/30">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-white">
              Kerim Bilgisayar <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded font-mono font-bold">POS v1.4</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-semibold">Hızlı Satış & Kasa İşlemleri</p>
          </div>
        </div>

        {/* Short-cut Quick Navigation Links */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <Link to="/admin" className="px-3 py-1.5 hover:bg-slate-750 rounded-lg text-[10px] font-bold transition-all text-slate-300 hover:text-white flex items-center gap-1">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/admin/servis" className="px-3 py-1.5 hover:bg-slate-750 rounded-lg text-[10px] font-bold transition-all text-slate-300 hover:text-white flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5" /> Servis Kayıtları
          </Link>
          <Link to="/admin/stok" className="px-3 py-1.5 hover:bg-slate-750 rounded-lg text-[10px] font-bold transition-all text-slate-300 hover:text-white flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Stok Yönetimi
          </Link>
          <Link to="/admin/musteriler" className="px-3 py-1.5 hover:bg-slate-750 rounded-lg text-[10px] font-bold transition-all text-slate-300 hover:text-white flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Müşteriler
          </Link>
        </div>

        {/* Active Tab and Exit Button */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
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

          <Link 
            to="/admin" 
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-md shadow-red-900/30 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Kapat / Çıkış
          </Link>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* LEFT: PRODUCTS LIST & BARCODE SCANNER */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col min-h-0">
            {/* Barcode scan box */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-3 mb-4 shrink-0">
              <div className="relative flex-1">
                <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Barkodu taratın veya manuel girip Enter'a basın..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <button 
                type="submit"
                className="bg-primary hover:bg-secondary text-white px-5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                Bul ve Ekle
              </button>
            </form>

            {/* Product search box */}
            <div className="relative mb-4 shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ürün adı, SKU veya marka ile ara..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

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
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredStock.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="border border-gray-200 hover:border-primary rounded-xl p-3 bg-white flex flex-col justify-between gap-2.5 cursor-pointer hover:shadow-md transition-all text-left hover:scale-[1.01]"
                    >
                      <div className="space-y-1.5">
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-50 border border-gray-100 flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <img src={mediaUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        <div className="text-xxs font-mono text-gray-400 flex items-center gap-0.5">
                          <Barcode className="w-3 h-3" /> {item.barcode || '—'}
                        </div>
                        <h3 className="font-bold text-gray-900 text-xs line-clamp-2 min-h-[32px] leading-tight">{item.name}</h3>
                        <p className="text-xxs text-gray-500">{item.brand || 'Markasız'} {item.model}</p>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                        <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded">
                          Stok: {item.currentStock}
                        </span>
                        <span className="text-sm font-extrabold text-primary">
                          ₺{parseFloat(item.sellingPrice || '0').toLocaleString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: SHOPPING CART & BILLING */}
          <div className="w-full lg:w-[420px] bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col min-h-0 shrink-0">
            {/* Cart Title */}
            <div className="flex items-center justify-between border-b pb-3 mb-4 shrink-0">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <ShoppingCart className="w-5 h-5 text-primary" /> Alışveriş Sepeti ({cart.reduce((s,c)=>s+c.quantity, 0)})
              </span>
              <button 
                onClick={clearCart}
                disabled={cart.length === 0}
                className="text-xs text-red-500 font-semibold hover:text-red-700 disabled:opacity-40 cursor-pointer"
              >
                Temizle
              </button>
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
                      <div className="flex items-center gap-1.5 mt-2">
                        <button 
                          onClick={() => updateCartQty(c.id, c.quantity - 1)}
                          className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-gray-800">{c.quantity}</span>
                        <button 
                          onClick={() => updateCartQty(c.id, c.quantity + 1)}
                          className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button 
                        onClick={() => removeFromCart(c.id)}
                        className="text-gray-400 hover:text-red-500 rounded p-1 transition-colors cursor-pointer"
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
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { type: 'nakit', label: 'Nakit', icon: Banknote, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                    { type: 'kredi_karti', label: 'K. Kartı', icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                    { type: 'havale', label: 'Havale', icon: Landmark, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                    { type: 'cari', label: 'Cari', icon: FileText, color: 'text-red-600 bg-red-50 border-red-200' },
                  ].map(p => {
                    const Icon = p.icon;
                    const isSelected = paymentType === p.type;
                    return (
                      <button
                        key={p.type}
                        onClick={() => setPaymentType(p.type as any)}
                        className={`border p-2 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isSelected ? `${p.color} ring-2 ring-offset-1 ring-primary` : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-bold">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

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
              <div className="bg-gray-50 p-3 rounded-xl border space-y-2">
                <div className="flex justify-between text-xs text-gray-500 font-semibold">
                  <span>Ara Toplam</span>
                  <span>₺{subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 font-semibold">
                  <span>KDV Dahil</span>
                  <span>KDV Payı: ₺{vat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-semibold">
                    <span>İndirim</span>
                    <span>-₺{discount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-gray-200 pt-2 font-extrabold text-gray-900">
                  <span className="text-sm">Ödenecek Tutar</span>
                  <span className="text-xl text-primary">₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* POS SUBMIT BUTTON */}
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || completingSale}
                className="w-full py-3 bg-primary hover:bg-secondary text-white font-extrabold text-sm rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {completingSale ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Satış Tamamlanıyor...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Satışı Tamamla & Yazdır
                  </>
                )}
              </button>
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
