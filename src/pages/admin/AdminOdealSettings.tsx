import React, { useState, useEffect } from 'react';
import { CreditCard, Settings2, CheckCircle2, XCircle, RefreshCw, Copy, ExternalLink, Search, Ban, RotateCcw, Zap, Eye, Link2 } from 'lucide-react';
import { getOdealSettings, updateOdealSettings, testOdealConnection, createOdealPaymentLink, fetchOdealPayments, fetchOdealPaymentDetail, checkOdealPaymentStatus, cancelOdealPayment, refundOdealPayment } from '../../lib/api';

type Tab = 'settings' | 'payments' | 'create';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Oluşturuldu', color: 'bg-gray-500' },
  pending: { label: 'Bekliyor', color: 'bg-yellow-500' },
  processing: { label: 'İşleniyor', color: 'bg-blue-500' },
  succeeded: { label: 'Başarılı', color: 'bg-emerald-500' },
  failed: { label: 'Başarısız', color: 'bg-red-500' },
  cancelled: { label: 'İptal', color: 'bg-orange-500' },
  unknown: { label: 'Belirsiz', color: 'bg-purple-500' },
};

export default function AdminOdealSettings() {
  const [tab, setTab] = useState<Tab>('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  // Settings
  const [settings, setSettings] = useState({
    apiUrl: '',
    apiKey: '',
    secretKey: '',
    callbackUrl: '',
    returnUrl: '',
    enabled: false,
    hasCredentials: false,
  });

  // Payments list
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [detailModal, setDetailModal] = useState(false);

  // Create payment form
  const [createForm, setCreateForm] = useState({
    amount: '',
    installment: '1',
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    buyerCity: '',
    buyerAddress: '',
  });
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState('');

  // Refund modal
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (tab === 'payments') loadPayments();
  }, [tab]);

  async function loadSettings() {
    try {
      const data = await getOdealSettings();
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateOdealSettings(settings);
      await loadSettings();
      setTestResult(null);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testOdealConnection();
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setTesting(false);
    }
  }

  async function loadPayments() {
    setPaymentsLoading(true);
    try {
      const data = await fetchOdealPayments();
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function openDetail(id: number) {
    try {
      const data = await fetchOdealPaymentDetail(id);
      setSelectedPayment(data);
      setDetailModal(true);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  }

  async function handleCheckStatus(id: number) {
    try {
      const result = await checkOdealPaymentStatus(id);
      alert(result.updated ? `Durum güncellendi: ${result.localStatus}` : `Durum değişmedi: ${result.localStatus}`);
      loadPayments();
      if (selectedPayment) openDetail(id);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm('Bu ödemeyi iptal etmek istediğinize emin misiniz?')) return;
    try {
      const result = await cancelOdealPayment(id);
      alert(result.message);
      loadPayments();
      if (selectedPayment) openDetail(id);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  }

  async function handleRefund() {
    if (!selectedPayment || !refundAmount) return;
    setRefunding(true);
    try {
      const result = await refundOdealPayment(selectedPayment.id, parseFloat(refundAmount), refundReason);
      alert(result.message);
      setRefundModal(false);
      setRefundAmount('');
      setRefundReason('');
      loadPayments();
      openDetail(selectedPayment.id);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setRefunding(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreatedLink('');
    try {
      const result = await createOdealPaymentLink({
        amount: parseFloat(createForm.amount),
        installment: parseInt(createForm.installment),
        buyerName: createForm.buyerName || undefined,
        buyerPhone: createForm.buyerPhone || undefined,
        buyerEmail: createForm.buyerEmail || undefined,
        buyerCity: createForm.buyerCity || undefined,
        buyerAddress: createForm.buyerAddress || undefined,
        relatedType: 'manual',
      });
      setCreatedLink(result.paymentLink);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setCreating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-emerald-400" />
            Ödeal Sanal POS
          </h1>
          <p className="text-gray-400 mt-1">Pay by Link ile ödeme alma, işlem sorgulama, iptal ve iade</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${settings.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {settings.enabled ? '● Aktif' : '○ Pasif'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {([
          { id: 'settings' as Tab, label: 'Ayarlar', icon: Settings2 },
          { id: 'payments' as Tab, label: 'İşlemler', icon: CreditCard },
          { id: 'create' as Tab, label: 'Ödeme Linki Oluştur', icon: Link2 },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              tab === t.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">API URL</label>
              <input
                type="url"
                value={settings.apiUrl}
                onChange={e => setSettings({ ...settings, apiUrl: e.target.value })}
                placeholder="https://api-stg.odeal.com"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Stage: https://api-stg.odeal.com</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">API Key</label>
              <input
                type="text"
                value={settings.apiKey}
                onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="API Key"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Secret Key</label>
              <input
                type="password"
                value={settings.secretKey}
                onChange={e => setSettings({ ...settings, secretKey: e.target.value })}
                placeholder="Secret Key"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Callback URL</label>
              <input
                type="url"
                value={settings.callbackUrl}
                onChange={e => setSettings({ ...settings, callbackUrl: e.target.value })}
                placeholder="https://kerimbilgisayar.com/api/odeal/callback"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Return URL</label>
              <input
                type="url"
                value={settings.returnUrl}
                onChange={e => setSettings({ ...settings, returnUrl: e.target.value })}
                placeholder="https://kerimbilgisayar.com/api/odeal/return"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
              <span className="text-sm text-gray-300">Entegrasyon Aktif</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !settings.hasCredentials}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {testing ? 'Test ediliyor...' : 'Bağlantı Testi'}
            </button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              testResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.message}
                </p>
                {testResult.latencyMs && (
                  <p className="text-xs text-gray-500 mt-0.5">Yanıt süresi: {testResult.latencyMs}ms</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Ödeal İşlemleri</h2>
            <button
              onClick={loadPayments}
              disabled={paymentsLoading}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${paymentsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Henüz Ödeal işlemi bulunmuyor</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-gray-700">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">External ID</th>
                    <th className="px-4 py-3 font-medium">Tutar</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Tür</th>
                    <th className="px-4 py-3 font-medium">Tarih</th>
                    <th className="px-4 py-3 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => {
                    const statusInfo = STATUS_LABELS[p.status] || STATUS_LABELS.unknown;
                    return (
                      <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-300">#{p.id}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-gray-400">{p.externalId}</span>
                        </td>
                        <td className="px-4 py-3 text-white font-medium">
                          {parseFloat(p.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white ${statusInfo.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {p.relatedType === 'ticket' ? `Servis #${p.relatedId}` : p.relatedType === 'sale' ? `Satış #${p.relatedId}` : 'Manuel'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openDetail(p.id)} className="p-1.5 hover:bg-gray-600 rounded-md transition-colors" title="Detay">
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button onClick={() => handleCheckStatus(p.id)} className="p-1.5 hover:bg-gray-600 rounded-md transition-colors" title="Durum Sorgula">
                              <Search className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            {p.paymentLink && (
                              <button onClick={() => copyToClipboard(p.paymentLink)} className="p-1.5 hover:bg-gray-600 rounded-md transition-colors" title="Link Kopyala">
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            )}
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
      )}

      {/* Create Tab */}
      {tab === 'create' && (
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-emerald-400" />
            Manuel Ödeme Linki Oluştur
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tutar (TL) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={createForm.amount}
                  onChange={e => setCreateForm({ ...createForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Taksit</label>
                <select
                  value={createForm.installment}
                  onChange={e => setCreateForm({ ...createForm, installment: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="1">Peşin</option>
                  {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n} Taksit</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Müşteri Adı</label>
                <input
                  type="text"
                  value={createForm.buyerName}
                  onChange={e => setCreateForm({ ...createForm, buyerName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Ad Soyad"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={createForm.buyerPhone}
                  onChange={e => setCreateForm({ ...createForm, buyerPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="+905XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">E-posta</label>
                <input
                  type="email"
                  value={createForm.buyerEmail}
                  onChange={e => setCreateForm({ ...createForm, buyerEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="ornek@email.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Şehir</label>
                <input
                  type="text"
                  value={createForm.buyerCity}
                  onChange={e => setCreateForm({ ...createForm, buyerCity: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="İstanbul"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !settings.enabled}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Link2 className="w-4 h-4" />
              {creating ? 'Oluşturuluyor...' : 'Ödeme Linki Oluştur'}
            </button>

            {!settings.enabled && (
              <p className="text-xs text-amber-400">⚠ Ödeal entegrasyonu pasif. Ayarlar sekmesinden aktif edin.</p>
            )}
          </form>

          {createdLink && (
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-sm text-emerald-400 font-medium mb-2">✅ Ödeme Linki Oluşturuldu</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdLink}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(createdLink)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Kopyala
                </button>
                <a
                  href={createdLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Aç
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-2">Bu linki müşterinize göndererek ödeme alabilirsiniz.</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                İşlem Detayı #{selectedPayment.id}
              </h3>
              <button onClick={() => setDetailModal(false)} className="p-2 hover:bg-gray-700 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">External ID:</span>
                  <p className="text-white font-mono text-xs mt-0.5">{selectedPayment.externalId}</p>
                </div>
                <div>
                  <span className="text-gray-500">Ödeal ID:</span>
                  <p className="text-white font-mono text-xs mt-0.5">{selectedPayment.odealTransactionId || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Tutar:</span>
                  <p className="text-white font-semibold text-lg mt-0.5">
                    {parseFloat(selectedPayment.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Durum:</span>
                  <p className="mt-0.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${(STATUS_LABELS[selectedPayment.status] || STATUS_LABELS.unknown).color}`}>
                      {(STATUS_LABELS[selectedPayment.status] || STATUS_LABELS.unknown).label}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Taksit:</span>
                  <p className="text-white mt-0.5">{selectedPayment.installment === 1 ? 'Peşin' : `${selectedPayment.installment} Taksit`}</p>
                </div>
                <div>
                  <span className="text-gray-500">İlişkili:</span>
                  <p className="text-white mt-0.5">
                    {selectedPayment.relatedType === 'ticket' ? `Servis #${selectedPayment.relatedId}` : selectedPayment.relatedType === 'sale' ? `Satış #${selectedPayment.relatedId}` : 'Manuel'}
                  </p>
                </div>
                {selectedPayment.buyerName && (
                  <div>
                    <span className="text-gray-500">Müşteri:</span>
                    <p className="text-white mt-0.5">{selectedPayment.buyerName}</p>
                  </div>
                )}
                {selectedPayment.buyerPhone && (
                  <div>
                    <span className="text-gray-500">Telefon:</span>
                    <p className="text-white mt-0.5">{selectedPayment.buyerPhone}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Oluşturulma:</span>
                  <p className="text-white mt-0.5 text-xs">{selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleString('tr-TR') : '-'}</p>
                </div>
                {selectedPayment.totalRefunded && parseFloat(selectedPayment.totalRefunded) > 0 && (
                  <div>
                    <span className="text-gray-500">İade Edilen:</span>
                    <p className="text-amber-400 font-medium mt-0.5">
                      {parseFloat(selectedPayment.totalRefunded).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </p>
                  </div>
                )}
              </div>

              {selectedPayment.paymentLink && (
                <div>
                  <span className="text-gray-500 text-sm">Ödeme Linki:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="text" readOnly value={selectedPayment.paymentLink} className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-xs font-mono" />
                    <button onClick={() => copyToClipboard(selectedPayment.paymentLink)} className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                      <Copy className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* Refunds */}
              {selectedPayment.refunds && selectedPayment.refunds.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">İade Geçmişi</h4>
                  <div className="space-y-2">
                    {selectedPayment.refunds.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg text-sm">
                        <div>
                          <span className="text-white font-medium">
                            {parseFloat(r.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </span>
                          {r.reason && <span className="text-gray-400 ml-2">— {r.reason}</span>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          r.status === 'succeeded' ? 'bg-emerald-500/20 text-emerald-400' :
                          r.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {r.status === 'succeeded' ? 'Başarılı' : r.status === 'failed' ? 'Başarısız' : 'Bekliyor'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-700">
                <button
                  onClick={() => handleCheckStatus(selectedPayment.id)}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Durum Sorgula
                </button>

                {selectedPayment.status !== 'cancelled' && selectedPayment.status !== 'failed' && selectedPayment.refundStatus === 'none' && (
                  <button
                    onClick={() => handleCancel(selectedPayment.id)}
                    className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    İptal Et
                  </button>
                )}

                {selectedPayment.status === 'succeeded' && selectedPayment.refundStatus !== 'full' && (
                  <button
                    onClick={() => {
                      setRefundAmount('');
                      setRefundReason('');
                      setRefundModal(true);
                    }}
                    className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    İade
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">İade İşlemi</h3>
              <p className="text-sm text-gray-400 mt-1">
                Orijinal tutar: {parseFloat(selectedPayment.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                {parseFloat(selectedPayment.totalRefunded || '0') > 0 && (
                  <> — İade edilen: {parseFloat(selectedPayment.totalRefunded).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</>
                )}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">İade Tutarı (TL) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={parseFloat(selectedPayment.amount) - parseFloat(selectedPayment.totalRefunded || '0')}
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">İade Nedeni</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="İade nedeni"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefund}
                  disabled={refunding || !refundAmount}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {refunding ? 'İşleniyor...' : 'İade Et'}
                </button>
                <button
                  onClick={() => setRefundModal(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
