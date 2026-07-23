import { useEffect, useState } from 'react';
import { Building2, CheckCircle, CreditCard, Plus, RefreshCw, Search, UserPlus, X, FileText, Send } from 'lucide-react';
import { assignCustomerSubscription, createAdminCustomer, fetchAdminCustomers, fetchSubscriptionPlans, migrateCustomerUsers, updateAdminCustomer } from '../../lib/api';

const inputCls = 'w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary';

const emptyCustomer = {
  customerType: 'bireysel',
  firstName: '', lastName: '', email: '', phone: '', password: 'musteri123',
  companyName: '', taxId: '', taxOffice: '', address: '', sector: '', accountCode: '', balance: '0.00', creditLimit: '0.00', notes: '', isActive: true,
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [statementCustomer, setStatementCustomer] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyCustomer);
  const [assignment, setAssignment] = useState({ customerId: 0, planId: '', status: 'active', currentPeriodEnd: '' });

  const load = async () => {
    try {
      const [customerData, planData] = await Promise.all([fetchAdminCustomers(), fetchSubscriptionPlans()]);
      setCustomers(customerData);
      setPlans(planData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(customer => {
    const text = `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone} ${customer.companyName} ${customer.accountCode}`.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCustomer);
    setShowModal(true);
  };

  const openEdit = (customer: any) => {
    setEditing(customer);
    setForm({
      customerType: customer.companyName ? 'kurumsal' : 'bireysel',
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      password: '',
      companyName: customer.companyName || '',
      taxId: customer.taxId || '',
      taxOffice: customer.taxOffice || '',
      address: customer.address || '',
      sector: customer.sector || '',
      accountCode: customer.accountCode || '',
      balance: customer.balance || '0.00',
      creditLimit: customer.creditLimit || '0.00',
      notes: customer.notes || '',
      isActive: customer.isActive !== false,
    });
    setShowModal(true);
  };

  const saveCustomer = async () => {
    if (form.customerType === 'kurumsal' && !form.companyName) {
      alert('Lütfen firma ünvanını girin.');
      return;
    }
    if (!form.firstName || !form.email) return;
    
    const submitData = { ...form };
    if (form.customerType === 'bireysel') {
      submitData.companyName = '';
      submitData.taxId = '';
      submitData.taxOffice = '';
      submitData.sector = '';
    }

    setSaving(true);
    try {
      if (editing) await updateAdminCustomer(editing.id, submitData);
      else await createAdminCustomer(submitData);
      setShowModal(false);
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const saveAssignment = async () => {
    if (!assignment.customerId || !assignment.planId) return;
    setSaving(true);
    try {
      await assignCustomerSubscription(assignment.customerId, assignment);
      setAssignment({ customerId: 0, planId: '', status: 'active', currentPeriodEnd: '' });
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleMigrateCustomers = async () => {
    setMigrating(true);
    try {
      const result = await migrateCustomerUsers();
      alert(`${result.migrated || 0} eski müşteri kaydı yeni cari tabloya taşındı.`);
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setMigrating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Müşteriler</h1>
          <p className="text-sm text-gray-500 mt-1">Müşteri kullanıcılarını, cari bilgilerini ve abonelik paketlerini yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleMigrateCustomers} disabled={migrating} className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-theme border border-gray-200 shadow-sm disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 mr-2 ${migrating ? 'animate-spin' : ''}`} /> Eski Müşterileri Taşı
          </button>
          <button onClick={openCreate} className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm">
            <UserPlus className="w-4 h-4 mr-2" /> Yeni Müşteri
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Müşteri, firma, e-posta veya telefon..." className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-theme text-sm focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Müşteri</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cari / Firma</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Bakiye</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paket</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400 font-medium">Müşteri bulunamadı</td></tr>
                  ) : filtered.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-sm text-gray-900">{customer.firstName} {customer.lastName}</div>
                        <div className="text-xs text-gray-500">{customer.email}</div>
                        {customer.phone && <div className="text-xs text-gray-400">{customer.phone}</div>}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2 font-medium text-gray-800"><Building2 className="w-4 h-4 text-gray-400" /> {customer.companyName || 'Bireysel'}</div>
                        <div className="text-xs text-gray-400 mt-1">{customer.accountCode || 'Cari kod yok'} • {customer.taxId || customer.taxOffice ? `${customer.taxOffice || ''} ${customer.taxId || ''}` : customer.sector || 'Cari bilgi bekliyor'}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div className="font-semibold text-gray-900">{Number(customer.balance || 0).toLocaleString('tr-TR')} TL</div>
                        <div className="text-xs text-gray-400">Limit: {Number(customer.creditLimit || 0).toLocaleString('tr-TR')} TL</div>
                      </td>
                      <td className="px-5 py-4">
                        {customer.planName ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-blue-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> {customer.planName}</span>
                            <div className="text-xs text-gray-400 mt-1">{customer.currentPeriodEnd ? new Date(customer.currentPeriodEnd).toLocaleDateString('tr-TR') : 'Süresiz'}</div>
                          </div>
                        ) : <span className="text-xs text-gray-400">Paket tanımlı değil</span>}
                      </td>
                      <td className="px-5 py-4 text-right space-x-1.5">
                        <button onClick={() => setStatementCustomer(customer)} className="text-xs px-2.5 py-1.5 rounded-theme bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium inline-flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Ekstre
                        </button>
                        <button onClick={() => setAssignment({ customerId: customer.id, planId: customer.planId || '', status: customer.subscriptionStatus || 'active', currentPeriodEnd: customer.currentPeriodEnd ? String(customer.currentPeriodEnd).slice(0, 10) : '' })} className="text-xs px-2.5 py-1.5 rounded-theme bg-blue-50 text-primary hover:bg-blue-100 font-medium">Paket Ata</button>
                        <button onClick={() => openEdit(customer)} className="text-xs px-2.5 py-1.5 rounded-theme bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium">Düzenle</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-theme border border-gray-200 shadow-sm p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-gray-900">Abonelik Atama</h2>
          </div>
          <div className="space-y-3">
            <select value={assignment.customerId} onChange={e => setAssignment({ ...assignment, customerId: Number(e.target.value) })} className={inputCls}>
              <option value={0}>Müşteri seçin</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>)}
            </select>
            <select value={assignment.planId} onChange={e => setAssignment({ ...assignment, planId: e.target.value })} className={inputCls}>
              <option value="">Paket seçin</option>
              {plans.filter(plan => plan.isActive !== false).map(plan => <option key={plan.id} value={plan.id}>{plan.name} - {Number(plan.price).toLocaleString('tr-TR')} TL / {plan.billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'}{Number(plan.discountRate || 0) > 0 ? ` - %${Number(plan.discountRate)} avantaj` : ''}</option>)}
            </select>
            <select value={assignment.status} onChange={e => setAssignment({ ...assignment, status: e.target.value })} className={inputCls}>
              <option value="active">Aktif</option>
              <option value="trial">Deneme</option>
              <option value="past_due">Ödeme Bekliyor</option>
              <option value="canceled">İptal</option>
            </select>
            <input type="date" value={assignment.currentPeriodEnd} onChange={e => setAssignment({ ...assignment, currentPeriodEnd: e.target.value })} className={inputCls} />
            <button onClick={saveAssignment} disabled={saving || !assignment.customerId || !assignment.planId} className="w-full bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50">Paketi Kaydet</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            {/* Müşteri Türü Seçimi */}
            <div className="px-6 pt-4">
              <label className="block text-xs font-semibold text-gray-505 mb-2">Müşteri Türü</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, customerType: 'bireysel' })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-theme border transition-all ${
                    form.customerType === 'bireysel'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Bireysel Müşteri
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, customerType: 'kurumsal' })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-theme border transition-all ${
                    form.customerType === 'kurumsal'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Kurumsal Müşteri
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.customerType === 'kurumsal' && (
                <div className="md:col-span-2 animate-in fade-in duration-200">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Firma / Cari Ünvanı *</label>
                  <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} className={inputCls} placeholder="Firma Ünvanı" required />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {form.customerType === 'kurumsal' ? 'Yetkili Adı *' : 'Ad *'}
                </label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className={inputCls} placeholder="Ad" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {form.customerType === 'kurumsal' ? 'Yetkili Soyadı' : 'Soyad'}
                </label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className={inputCls} placeholder="Soyad" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-posta adresi *</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="E-posta" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon Numarası</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="Telefon" />
              </div>
              {!editing && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Müşteri Giriş Şifresi</label>
                  <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="Şifre" />
                </div>
              )}
              
              {form.customerType === 'kurumsal' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi Dairesi</label>
                    <input value={form.taxOffice} onChange={e => setForm({ ...form, taxOffice: e.target.value })} className={inputCls} placeholder="Vergi dairesi" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi / TCKN</label>
                    <input value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} className={inputCls} placeholder="Vergi / TCKN" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sektör</label>
                    <input value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} className={inputCls} placeholder="Sektör" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cari Kod</label>
                    <input value={form.accountCode} onChange={e => setForm({ ...form, accountCode: e.target.value })} className={inputCls} placeholder="Cari kod" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cari Bakiye</label>
                    <input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} className={inputCls} placeholder="Cari bakiye" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Kredi Limiti</label>
                    <input type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} className={inputCls} placeholder="Kredi limiti" />
                  </div>
                </>
              )}
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Adres</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={`${inputCls} resize-none`} rows={2} placeholder="Adres" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cari Anlaşma Notları</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={`${inputCls} resize-none`} rows={2} placeholder="Cari not / anlaşma bilgisi" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveCustomer} disabled={saving || !form.firstName || !form.email} className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center">
                <Plus className="w-4 h-4 mr-2" /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cari Ekstre Modalı */}
      {statementCustomer && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setStatementCustomer(null)}>
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-gray-900">
                  Cari Ekstre — {statementCustomer.companyName || `${statementCustomer.firstName} ${statementCustomer.lastName}`}
                </h3>
              </div>
              <button onClick={() => setStatementCustomer(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-theme border border-gray-200">
                <div>
                  <p className="text-xs text-gray-400">Güncel Bakiye</p>
                  <p className="text-xl font-bold text-gray-900">{Number(statementCustomer.balance || 0).toLocaleString('tr-TR')} TL</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Kredi Limiti</p>
                  <p className="text-xl font-bold text-emerald-600">{Number(statementCustomer.creditLimit || 0).toLocaleString('tr-TR')} TL</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Telefon</p>
                  <p className="text-sm font-semibold text-gray-800">{statementCustomer.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">E-Posta</p>
                  <p className="text-sm font-semibold text-gray-800">{statementCustomer.email || '—'}</p>
                </div>
              </div>

              {statementCustomer.phone && (
                <a
                  href={`https://wa.me/${statementCustomer.phone.replace(/\D/g, '').startsWith('0') ? '90' + statementCustomer.phone.replace(/\D/g, '').substring(1) : statementCustomer.phone.replace(/\D/g, '').startsWith('90') ? statementCustomer.phone.replace(/\D/g, '') : '90' + statementCustomer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Sayın ${statementCustomer.companyName || statementCustomer.firstName}, güncel cari hesap bakiyeniz: ${Number(statementCustomer.balance || 0).toLocaleString('tr-TR')} TL'dir.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-semibold text-xs rounded-theme flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4 text-green-600" /> WhatsApp İle Ekstre Hatırlatması Gönder
                </a>
              )}

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">Cari Anlaşma Notları:</p>
                <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-theme border border-gray-200">
                  {statementCustomer.notes || 'Bu müşteriye ait özel bir cari not bulunmamaktadır.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setStatementCustomer(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-theme">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}