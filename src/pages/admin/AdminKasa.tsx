import React, { useState, useEffect } from 'react';
import {
  Wallet, Banknote, CreditCard, Landmark, FileText, TrendingDown, TrendingUp,
  Plus, X, Lock, CheckCircle2, RefreshCw, History, AlertTriangle, Search
} from 'lucide-react';
import { usePageTitle } from '../../lib/usePageTitle';
import {
  fetchKasaSummary, createKasaTahsilat, createKasaMasraf, closeKasaDay, fetchKasaClosures,
  fetchAdminCustomers
} from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const EXPENSE_CATEGORIES: Record<string, string> = {
  ofis: 'Ofis Harcaması',
  yol: 'Yol / Akaryakıt',
  yemek: 'Yemek / Mutfak',
  kargo: 'Kargo Gönderi',
  donanim: 'Donanım / Yedek Parça',
  diger: 'Diğer Giderler',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  nakit: 'Nakit',
  kredi_karti: 'Kredi Kartı',
  havale: 'Havale/EFT',
};

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function getCustomerDisplayName(c: any) {
  if (!c) return '';
  if (c.firstName || c.lastName) return `${c.firstName || ''} ${c.lastName || ''}`.trim();
  return c.name || 'İsimsiz Müşteri';
}

export default function AdminKasa() {
  usePageTitle('Kasa');
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [closures, setClosures] = useState<any[]>([]);

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [showTahsilatModal, setShowTahsilatModal] = useState(false);
  const [showMasrafModal, setShowMasrafModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tahsilatForm, setTahsilatForm] = useState({ customerId: '', customerSearch: '', amount: '', paymentMethod: 'nakit', description: '' });
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [masrafForm, setMasrafForm] = useState({ title: '', amount: '', category: 'ofis', paymentMethod: 'nakit', description: '' });
  const [closeForm, setCloseForm] = useState({ openingBalance: '', countedCash: '', notes: '' });

  const loadSummary = async (d: string) => {
    setLoading(true);
    try {
      const data = await fetchKasaSummary(d);
      setSummary(data);
      setCloseForm(f => ({ ...f, openingBalance: f.openingBalance || String(data.suggestedOpening.toFixed(2)) }));
    } catch (e: any) {
      toast.error('Kasa özeti alınamadı: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClosures = async () => {
    try {
      const data = await fetchKasaClosures();
      setClosures(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSummary(date);
  }, [date]);

  useEffect(() => {
    loadClosures();
    fetchAdminCustomers().then(setCustomersList).catch(() => {});
  }, []);

  const filteredCustomers = customersList.filter(cust => {
    const fullName = getCustomerDisplayName(cust).toLowerCase();
    return tahsilatForm.customerSearch && (
      fullName.includes(tahsilatForm.customerSearch.toLowerCase()) ||
      cust.phone?.includes(tahsilatForm.customerSearch)
    );
  });

  const selectedTahsilatCustomer = customersList.find(c => String(c.id || c.userId) === tahsilatForm.customerId);

  const handleTahsilatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tahsilatForm.customerId || !tahsilatForm.amount || parseFloat(tahsilatForm.amount) <= 0) {
      toast.warning('Müşteri ve geçerli bir tutar seçmelisiniz.');
      return;
    }
    setSaving(true);
    try {
      await createKasaTahsilat({
        customerId: parseInt(tahsilatForm.customerId),
        amount: tahsilatForm.amount,
        paymentMethod: tahsilatForm.paymentMethod,
        description: tahsilatForm.description,
      });
      toast.success('Tahsilat kaydedildi.');
      setShowTahsilatModal(false);
      setTahsilatForm({ customerId: '', customerSearch: '', amount: '', paymentMethod: 'nakit', description: '' });
      loadSummary(date);
    } catch (e: any) {
      toast.error('Tahsilat kaydedilemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMasrafSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masrafForm.title || !masrafForm.amount || parseFloat(masrafForm.amount) <= 0) {
      toast.warning('Masraf adı ve geçerli bir tutar girmelisiniz.');
      return;
    }
    setSaving(true);
    try {
      await createKasaMasraf(masrafForm);
      toast.success('Masraf kaydedildi.');
      setShowMasrafModal(false);
      setMasrafForm({ title: '', amount: '', category: 'ofis', paymentMethod: 'nakit', description: '' });
      loadSummary(date);
    } catch (e: any) {
      toast.error('Masraf kaydedilemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const expectedForClose = summary
    ? (parseFloat(closeForm.openingBalance) || 0) + summary.sales.cash + summary.tahsilat.cash - summary.expenses.cash
    : 0;
  const variance = (parseFloat(closeForm.countedCash) || 0) - expectedForClose;

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await closeKasaDay({
        date,
        openingBalance: closeForm.openingBalance || '0',
        countedCash: closeForm.countedCash || '0',
        notes: closeForm.notes,
      });
      toast.success('Gün sonu kapatıldı.');
      setShowCloseModal(false);
      loadSummary(date);
      loadClosures();
    } catch (e: any) {
      toast.error('Gün sonu kapatılamadı: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-primary" /> Kasa Modülü
          </h1>
          <p className="text-sm text-gray-500">Günlük nakit akışını, tahsilatları ve masrafları tek noktadan yönetin.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => setShowTahsilatModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tahsilat Al
          </button>
          <button
            onClick={() => setShowMasrafModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Masraf Ekle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" /> Nakit Satış
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">₺{summary.sales.cash.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Nakit Tahsilat
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-1">₺{summary.tahsilat.cash.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Nakit Masraf
              </p>
              <p className="text-2xl font-black text-red-600 mt-1">₺{summary.expenses.cash.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 shadow-sm">
              <p className="text-xs text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Beklenen Kasa Tutarı
              </p>
              <p className="text-2xl font-black text-primary mt-1">₺{summary.expectedCash.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Diğer Ödeme Tipleri Bilgi Satırı */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-4 text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Kredi Kartı Satış: <b className="text-gray-800">₺{summary.sales.card.toLocaleString('tr-TR')}</b></span>
            <span className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" /> Havale Satış: <b className="text-gray-800">₺{summary.sales.transfer.toLocaleString('tr-TR')}</b></span>
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Cari Satış: <b className="text-gray-800">₺{summary.sales.cari.toLocaleString('tr-TR')}</b></span>
            <span className="flex items-center gap-1.5">Diğer Tahsilat (Kart/Havale): <b className="text-gray-800">₺{summary.tahsilat.other.toLocaleString('tr-TR')}</b></span>
            <span className="flex items-center gap-1.5">Diğer Masraf (Kart/Havale): <b className="text-gray-800">₺{summary.expenses.other.toLocaleString('tr-TR')}</b></span>
          </div>

          {/* Gün Sonu Kapanış Durumu */}
          <div className={`rounded-3xl p-5 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${summary.isClosed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-3">
              {summary.isClosed ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-black ${summary.isClosed ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {summary.isClosed ? `${date} tarihli kasa kapatıldı.` : `${date} tarihli kasa henüz kapatılmadı.`}
                </p>
                {summary.isClosed && summary.closure && (
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Sayılan: ₺{parseFloat(summary.closure.countedCash).toLocaleString('tr-TR')} · Fark: <b className={parseFloat(summary.closure.variance) === 0 ? '' : parseFloat(summary.closure.variance) > 0 ? 'text-emerald-700' : 'text-red-600'}>₺{parseFloat(summary.closure.variance).toLocaleString('tr-TR')}</b>
                  </p>
                )}
              </div>
            </div>
            {!summary.isClosed && (
              <button
                onClick={() => setShowCloseModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer shrink-0"
              >
                <Lock className="w-4 h-4" /> Gün Sonu Kapat
              </button>
            )}
          </div>
        </>
      )}

      {/* Gün Sonu Geçmişi */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-black text-gray-900">Gün Sonu Kapanış Geçmişi</h3>
        </div>
        <div className="overflow-x-auto">
          {closures.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Henüz kapatılmış bir gün bulunmuyor.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-gray-500">
                  <th className="p-4">Tarih</th>
                  <th className="p-4 text-right">Açılış</th>
                  <th className="p-4 text-right">Beklenen</th>
                  <th className="p-4 text-right">Sayılan</th>
                  <th className="p-4 text-right">Fark</th>
                  <th className="p-4">Kapatan</th>
                  <th className="p-4">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-gray-700">
                {closures.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{new Date(c.closureDate).toLocaleDateString('tr-TR')}</td>
                    <td className="p-4 text-right">₺{parseFloat(c.openingBalance).toLocaleString('tr-TR')}</td>
                    <td className="p-4 text-right">₺{parseFloat(c.expectedCash).toLocaleString('tr-TR')}</td>
                    <td className="p-4 text-right font-bold">₺{parseFloat(c.countedCash).toLocaleString('tr-TR')}</td>
                    <td className={`p-4 text-right font-bold ${parseFloat(c.variance) === 0 ? 'text-gray-500' : parseFloat(c.variance) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₺{parseFloat(c.variance).toLocaleString('tr-TR')}
                    </td>
                    <td className="p-4 text-gray-500">{c.closedByName?.trim() || '—'}</td>
                    <td className="p-4 text-gray-400 max-w-xs truncate">{c.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* TAHSİLAT MODAL */}
      {showTahsilatModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-black text-gray-900">Tahsilat Al</h2>
              <button onClick={() => setShowTahsilatModal(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleTahsilatSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Müşteri</label>
                {selectedTahsilatCustomer ? (
                  <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-2.5 rounded-xl">
                    <span className="text-sm font-bold text-gray-900">{getCustomerDisplayName(selectedTahsilatCustomer)}</span>
                    <button type="button" onClick={() => setTahsilatForm(f => ({ ...f, customerId: '' }))} className="p-1 hover:bg-red-50 rounded-lg text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Müşteri adı veya telefon ile arayın..."
                      value={tahsilatForm.customerSearch}
                      onChange={e => { setTahsilatForm(f => ({ ...f, customerSearch: e.target.value })); setShowCustDropdown(true); }}
                      onFocus={() => setShowCustDropdown(true)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    {showCustDropdown && tahsilatForm.customerSearch.trim() && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-2xl max-h-48 overflow-y-auto z-10">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-3 text-center text-xs text-gray-400">Sonuç bulunamadı</div>
                        ) : filteredCustomers.map(cust => (
                          <div
                            key={cust.id || cust.userId}
                            onClick={() => {
                              setTahsilatForm(f => ({ ...f, customerId: String(cust.id || cust.userId), customerSearch: '' }));
                              setShowCustDropdown(false);
                            }}
                            className="p-2.5 hover:bg-gray-50 cursor-pointer text-xs font-semibold text-gray-700 flex justify-between border-b"
                          >
                            <span>{getCustomerDisplayName(cust)}</span>
                            <span className="text-gray-400 font-normal">{cust.phone || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tutar (₺)</label>
                  <input
                    type="number" step="0.01"
                    value={tahsilatForm.amount}
                    onChange={e => setTahsilatForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-bold"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ödeme Yöntemi</label>
                  <select
                    value={tahsilatForm.paymentMethod}
                    onChange={e => setTahsilatForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Açıklama</label>
                <input
                  type="text"
                  value={tahsilatForm.description}
                  onChange={e => setTahsilatForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Örn: Havale ile tahsilat"
                />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowTahsilatModal(false)} className="flex-1 border border-slate-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50">
                  {saving ? 'Kaydediliyor...' : 'Tahsilatı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASRAF MODAL */}
      {showMasrafModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-black text-gray-900">Masraf Ekle</h2>
              <button onClick={() => setShowMasrafModal(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleMasrafSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Masraf Adı / Firma</label>
                <input
                  type="text"
                  value={masrafForm.title}
                  onChange={e => setMasrafForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Örn: Shell Akaryakıt"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tutar (₺)</label>
                  <input
                    type="number" step="0.01"
                    value={masrafForm.amount}
                    onChange={e => setMasrafForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-bold"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                  <select
                    value={masrafForm.category}
                    onChange={e => setMasrafForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(EXPENSE_CATEGORIES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ödeme Yöntemi</label>
                <select
                  value={masrafForm.paymentMethod}
                  onChange={e => setMasrafForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  value={masrafForm.description}
                  onChange={e => setMasrafForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowMasrafModal(false)} className="flex-1 border border-slate-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50">
                  {saving ? 'Kaydediliyor...' : 'Masrafı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GÜN SONU KAPAT MODAL */}
      {showCloseModal && summary && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-1.5"><Lock className="w-4 h-4" /> Gün Sonu Kapat — {date}</h2>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCloseSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Açılış Bakiyesi (₺)</label>
                <input
                  type="number" step="0.01"
                  value={closeForm.openingBalance}
                  onChange={e => setCloseForm(f => ({ ...f, openingBalance: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-bold"
                />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5 text-gray-600">
                <div className="flex justify-between"><span>Nakit Satış</span><span className="font-bold text-gray-900">₺{summary.sales.cash.toLocaleString('tr-TR')}</span></div>
                <div className="flex justify-between"><span>Nakit Tahsilat</span><span className="font-bold text-gray-900">₺{summary.tahsilat.cash.toLocaleString('tr-TR')}</span></div>
                <div className="flex justify-between"><span>Nakit Masraf</span><span className="font-bold text-red-600">-₺{summary.expenses.cash.toLocaleString('tr-TR')}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-black text-gray-900"><span>Beklenen Kasa Tutarı</span><span>₺{expectedForClose.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sayılan Nakit (₺)</label>
                <input
                  type="number" step="0.01"
                  value={closeForm.countedCash}
                  onChange={e => setCloseForm(f => ({ ...f, countedCash: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-bold"
                  placeholder="Kasada fiziksel olarak saydığınız tutar"
                  required
                />
              </div>
              {closeForm.countedCash && (
                <div className={`text-xs font-bold p-2.5 rounded-xl ${variance === 0 ? 'bg-gray-50 text-gray-600' : variance > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  Fark: ₺{variance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {variance !== 0 && (variance > 0 ? '(Kasa fazla)' : '(Kasa eksik)')}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Not</label>
                <textarea
                  rows={2}
                  value={closeForm.notes}
                  onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Fark açıklaması vb."
                />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowCloseModal(false)} className="flex-1 border border-slate-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50">
                  {saving ? 'Kapatılıyor...' : 'Kasa Gün Sonunu Kapat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
