import { useEffect, useState } from 'react';
import { FileText, Plus, Search, X, Printer, Eye, Edit2, Trash2, ChevronDown, CheckCircle, AlertCircle, Clock, CreditCard } from 'lucide-react';
import { fetchAdminInvoices, createAdminInvoice, updateAdminInvoice, deleteAdminInvoice, createOdealPaymentLink } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  taslak: { label: 'Taslak', color: 'bg-gray-100 text-gray-600', icon: FileText },
  kuyrukta: { label: 'Kuyrukta', color: 'bg-blue-100 text-blue-700', icon: Clock },
  gonderildi: { label: 'Gönderildi', color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle },
  odendi: { label: 'Ödendi', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  iptal: { label: 'İptal', color: 'bg-red-100 text-red-600', icon: AlertCircle },
  gecikmis: { label: 'Gecikmiş', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

const inputCls = 'w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none';

const emptyForm = {
  invoiceNumber: '',
  userId: '',
  companyId: '',
  ticketId: '',
  subtotal: '',
  taxRate: '20',
  discountAmount: '0',
  status: 'taslak',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
  items: [{ description: '', quantity: 1, unitPrice: '', total: '' }],
};

export default function AdminInvoices() {
  usePageTitle('Fatura Yönetimi');

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [showDetail, setShowDetail] = useState<any | null>(null);

  const load = async () => {
    try {
      const data = await fetchAdminInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = invoices.filter(inv => {
    const text = `${inv.invoiceNumber} ${inv.customerName || ''} ${inv.companyName || ''}`.toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    const matchStatus = !statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, items: [{ description: '', quantity: 1, unitPrice: '', total: '' }] });
    setShowModal(true);
  };

  const openEdit = (inv: any) => {
    setEditing(inv);
    setForm({
      invoiceNumber: inv.invoiceNumber || '',
      userId: inv.userId || '',
      companyId: inv.companyId || '',
      ticketId: inv.ticketId || '',
      subtotal: inv.subtotal || '',
      taxRate: inv.taxRate || '20',
      discountAmount: inv.discountAmount || '0',
      status: inv.status || 'taslak',
      issueDate: inv.issueDate ? inv.issueDate.split('T')[0] : '',
      dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : '',
      notes: inv.notes || '',
      items: inv.items?.length ? inv.items : [{ description: '', quantity: 1, unitPrice: '', total: '' }],
    });
    setShowModal(true);
  };

  const addItem = () => {
    setForm((f: any) => ({ ...f, items: [...f.items, { description: '', quantity: 1, unitPrice: '', total: '' }] }));
  };

  const removeItem = (idx: number) => {
    setForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== idx) }));
  };

  const updateItem = (idx: number, key: string, val: any) => {
    setForm((f: any) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: val };
      if (key === 'quantity' || key === 'unitPrice') {
        const qty = parseFloat(items[idx].quantity) || 0;
        const price = parseFloat(items[idx].unitPrice) || 0;
        items[idx].total = (qty * price).toFixed(2);
      }
      return { ...f, items };
    });
  };

  const calcTotals = () => {
    const subtotal = form.items.reduce((sum: number, it: any) => sum + (parseFloat(it.total) || 0), 0);
    const taxRate = parseFloat(form.taxRate) || 0;
    const discount = parseFloat(form.discountAmount) || 0;
    const taxAmount = ((subtotal - discount) * taxRate) / 100;
    const totalAmount = subtotal - discount + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSave = async () => {
    if (!form.invoiceNumber.trim()) return alert('Fatura numarası zorunludur');
    if (!form.issueDate) return alert('Düzenleme tarihi zorunludur');
    setSaving(true);
    try {
      const { subtotal, taxAmount, totalAmount } = calcTotals();
      const payload = {
        ...form,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        userId: form.userId ? Number(form.userId) : null,
        companyId: form.companyId ? Number(form.companyId) : null,
        ticketId: form.ticketId ? Number(form.ticketId) : null,
      };
      if (editing) {
        await updateAdminInvoice(editing.id, payload);
      } else {
        await createAdminInvoice(payload);
      }
      setShowModal(false);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu faturayı silmek istediğinize emin misiniz?')) return;
    try {
      await deleteAdminInvoice(id);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const formatMoney = (val: any) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '₺0,00';
    return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  // Summary KPIs
  const totalAmount = invoices.reduce((s, inv) => s + (parseFloat(inv.totalAmount) || 0), 0);
  const paidAmount = invoices.filter(i => i.status === 'odendi').reduce((s, inv) => s + (parseFloat(inv.totalAmount) || 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'gecikmis').length;
  const draftCount = invoices.filter(i => i.status === 'taslak').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Fatura Yönetimi
          </h1>
          <p className="text-sm text-gray-500 mt-1">Faturaları oluşturun, düzenleyin ve takip edin.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme transition-colors">
          <Plus className="w-4 h-4" /> Yeni Fatura
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Toplam Fatura</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</p>
        </div>
        <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Toplam Tutar</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatMoney(totalAmount)}</p>
        </div>
        <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Ödenen</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatMoney(paidAmount)}</p>
        </div>
        <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Geciken / Taslak</p>
          <p className="text-2xl font-bold mt-1">
            <span className="text-red-600">{overdueCount}</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-gray-400">{draftCount}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Fatura no veya müşteri adı ile ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-theme text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Henüz fatura bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fatura No</th>
                  <th className="px-4 py-3 font-semibold">Müşteri / Firma</th>
                  <th className="px-4 py-3 font-semibold">Düzenlenme</th>
                  <th className="px-4 py-3 font-semibold">Vade</th>
                  <th className="px-4 py-3 font-semibold text-right">Tutar</th>
                  <th className="px-4 py-3 font-semibold">Durum</th>
                  <th className="px-4 py-3 font-semibold text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inv: any) => {
                  const st = STATUS_MAP[inv.status] || STATUS_MAP.taslak;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-gray-600">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-800">{inv.customerName || inv.companyName || '—'}</p>
                        {inv.ticketId && <p className="text-[10px] text-gray-400">Servis #{inv.ticketId}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatDate(inv.issueDate)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">{formatMoney(inv.totalAmount)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setShowDetail(inv)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Detay">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(inv)} className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors" title="Düzenle">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => window.open(`/print/invoice/${inv.id}`, '_blank')} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors" title="Yazdır">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(inv.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Sil">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Fatura #{showDetail.invoiceNumber}</h3>
              <button onClick={() => setShowDetail(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-400 text-xs">Müşteri</p><p className="font-medium">{showDetail.customerName || '—'}</p></div>
                <div><p className="text-gray-400 text-xs">Firma</p><p className="font-medium">{showDetail.companyName || '—'}</p></div>
                <div><p className="text-gray-400 text-xs">Düzenlenme Tarihi</p><p className="font-medium">{formatDate(showDetail.issueDate)}</p></div>
                <div><p className="text-gray-400 text-xs">Vade Tarihi</p><p className="font-medium">{formatDate(showDetail.dueDate)}</p></div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                {showDetail.items?.length > 0 && (
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-400"><th className="text-left pb-2">Açıklama</th><th className="text-right pb-2">Adet</th><th className="text-right pb-2">Fiyat</th><th className="text-right pb-2">Toplam</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {showDetail.items.map((it: any, i: number) => (
                        <tr key={i}><td className="py-1.5">{it.description}</td><td className="text-right">{it.quantity}</td><td className="text-right">{formatMoney(it.unitPrice)}</td><td className="text-right font-medium">{formatMoney(it.total)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="border-t border-gray-200 mt-3 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Ara Toplam</span><span>{formatMoney(showDetail.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">KDV (%{showDetail.taxRate})</span><span>{formatMoney(showDetail.taxAmount)}</span></div>
                  {parseFloat(showDetail.discountAmount) > 0 && (
                    <div className="flex justify-between text-red-600"><span>İndirim</span><span>-{formatMoney(showDetail.discountAmount)}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-2">
                    <span>Genel Toplam</span><span className="text-primary">{formatMoney(showDetail.totalAmount)}</span>
                  </div>
                </div>
              </div>
              {showDetail.notes && <div className="bg-gray-50 rounded-theme p-3 text-xs text-gray-600"><strong>Not:</strong> {showDetail.notes}</div>}
              {showDetail.status !== 'odendi' && (
                <button
                  onClick={async () => {
                    try {
                      const res = await createOdealPaymentLink({
                        amount: showDetail.totalAmount,
                        title: `Fatura #${showDetail.invoiceNumber} Ödemesi`,
                        invoiceId: showDetail.id,
                      });
                      if (res.paymentUrl) {
                        prompt('Ödeal Kredi Kartı Ödeme Bağlantısı:', res.paymentUrl);
                      }
                    } catch (e: any) {
                      alert('Hata: ' + e.message);
                    }
                  }}
                  className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-theme flex items-center justify-center gap-2 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-blue-600" /> Ödeal Kredi Kartı Ödeme Linki Üret
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Faturayı Düzenle' : 'Yeni Fatura'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fatura No *</label>
                  <input value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} className={inputCls} placeholder="FTR-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Düzenlenme Tarihi *</label>
                  <input type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vade Tarihi</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">KDV Oranı (%)</label>
                  <input type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">İndirim (₺)</label>
                  <input type="number" step="0.01" value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Servis Kaydı ID (opsiyonel)</label>
                  <input type="number" value={form.ticketId} onChange={e => setForm({ ...form, ticketId: e.target.value })} className={inputCls} placeholder="Servis kaydından fatura oluştur" />
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">Fatura Kalemleri</label>
                  <button onClick={addItem} className="text-xs text-primary hover:text-secondary font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Kalem Ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        {idx === 0 && <label className="block text-[10px] text-gray-400 mb-0.5">Açıklama</label>}
                        <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} className={inputCls} placeholder="Hizmet/Ürün açıklaması" />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <label className="block text-[10px] text-gray-400 mb-0.5">Adet</label>}
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className={inputCls} />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <label className="block text-[10px] text-gray-400 mb-0.5">Birim Fiyat</label>}
                        <input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} className={inputCls} />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <label className="block text-[10px] text-gray-400 mb-0.5">Toplam</label>}
                        <input value={item.total} readOnly className={`${inputCls} bg-gray-50`} />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Preview */}
              {(() => {
                const { subtotal, taxAmount, totalAmount } = calcTotals();
                return (
                  <div className="bg-gray-50 rounded-theme p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Ara Toplam</span><span>{formatMoney(subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">KDV (%{form.taxRate})</span><span>{formatMoney(taxAmount)}</span></div>
                    {parseFloat(form.discountAmount) > 0 && (
                      <div className="flex justify-between text-red-600"><span>İndirim</span><span>-{formatMoney(form.discountAmount)}</span></div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-1">
                      <span>Genel Toplam</span><span className="text-primary">{formatMoney(totalAmount)}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Not</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="Fatura notu (isteğe bağlı)" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-theme hover:bg-gray-50 transition-colors">İptal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Fatura Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
