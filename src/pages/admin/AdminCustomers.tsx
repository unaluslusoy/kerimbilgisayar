import { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  X,
  FileText,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  Laptop,
  AlertTriangle,
  Printer,
  Download,
  Users,
  TrendingUp,
  AlertCircle,
  UserCheck,
  Trash2,
  MapPin,
  Shield,
  CreditCard as PayIcon,
  FileSignature,
  Award,
} from 'lucide-react';
import { openWhatsApp, formatWaPhone } from '../../lib/utils';
import {
  assignCustomerSubscription,
  createAdminCustomer,
  fetchAdminCustomers,
  fetchSubscriptionPlans,
  migrateCustomerUsers,
  updateAdminCustomer,
  fetchCustomerLedger,
  addCustomerLedgerEntry,
  deleteAdminCustomer,
  deleteCustomerLedgerEntry,
  createOdealPaymentLink,
} from '../../lib/api';

const inputCls = 'w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary';

const emptyCustomer = {
  customerType: 'bireysel',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: 'musteri123',
  companyName: '',
  taxId: '',
  taxOffice: '',
  address: '',
  sector: '',
  accountCode: '',
  balance: '0.00',
  creditLimit: '0.00',
  notes: '',
  isActive: true,
};

const statusLabels: Record<string, { label: string; color: string }> = {
  yeni: { label: 'Yeni Kayıt', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  isleme_alindi: { label: 'İşleme Alındı', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  parca_bekliyor: { label: 'Parça Bekliyor', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  dis_servis: { label: 'Dış Serviste', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  musteri_onayi_bekliyor: { label: 'Onay Bekliyor', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  onarimda: { label: 'Onarımda', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  cozuldu: { label: 'Çözüldü / Hazır', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  teslim_edildi: { label: 'Teslim Edildi', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  iade: { label: 'İade Edildi', color: 'bg-red-50 text-red-700 border-red-200' },
  iptal: { label: 'İptal', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'contracted' | 'debtors' | 'cleared' | 'corporate' | 'individual'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  // Sözleşme Modalı State
  const [contractModalCustomer, setContractModalCustomer] = useState<any | null>(null);

  // Cari Ekstre & Detay Modalı State
  const [statementCustomer, setStatementCustomer] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'ledger' | 'repairs' | 'warranties'>('ledger');
  const [ledgerData, setLedgerData] = useState<{ customer: any; transactions: any[]; repairs?: any[]; warranties?: any[]; summary: any } | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [newTransaction, setNewTransaction] = useState({ type: 'alacak', amount: '', description: '' });
  const [addingTransaction, setAddingTransaction] = useState(false);

  const [form, setForm] = useState<any>(emptyCustomer);
  const [assignment, setAssignment] = useState({ customerId: 0, planId: '', status: 'active', currentPeriodEnd: '' });

  const load = async () => {
    try {
      const [customerData, planData] = await Promise.all([fetchAdminCustomers(), fetchSubscriptionPlans()]);
      setCustomers(customerData);
      setPlans(planData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadLedger = async (customerId: number) => {
    setLedgerLoading(true);
    try {
      const res = await fetchCustomerLedger(customerId);
      setLedgerData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLedgerLoading(false);
    }
  };

  const openStatement = (customer: any, initialTab: 'ledger' | 'repairs' | 'warranties' = 'ledger') => {
    setStatementCustomer(customer);
    setActiveModalTab(initialTab);
    setLedgerData(null);
    setNewTransaction({ type: 'alacak', amount: '', description: '' });
    loadLedger(customer.id);
  };

  const openContractModal = (customer: any) => {
    setContractModalCustomer(customer);
    setAssignment({
      customerId: customer.id,
      planId: customer.planId ? String(customer.planId) : '',
      status: customer.subscriptionStatus || 'active',
      currentPeriodEnd: customer.currentPeriodEnd ? new Date(customer.currentPeriodEnd).toISOString().split('T')[0] : '',
    });
  };

  const handleAddLedgerEntry = async () => {
    if (!statementCustomer || !newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      alert('Lütfen geçerli bir tutar girin.');
      return;
    }
    setAddingTransaction(true);
    try {
      await addCustomerLedgerEntry(statementCustomer.id, newTransaction);
      setNewTransaction({ type: 'alacak', amount: '', description: '' });
      await loadLedger(statementCustomer.id);
      await load();
    } catch (e: any) {
      alert('İşlem başarısız: ' + e.message);
    } finally {
      setAddingTransaction(false);
    }
  };

  const handleDeleteLedgerEntry = async (rawId: number) => {
    if (!statementCustomer || !rawId) return;
    if (!window.confirm('Bu hatalı cari hareketi silmek istediğinize emin misiniz? Cari bakiye otomatik olarak düzeltilecektir.')) {
      return;
    }
    try {
      await deleteCustomerLedgerEntry(statementCustomer.id, rawId);
      await loadLedger(statementCustomer.id);
      await load();
    } catch (e: any) {
      alert('Silme başarısız: ' + e.message);
    }
  };

  const handleDeleteCustomer = async (customer: any) => {
    const custName = customer.companyName || `${customer.firstName} ${customer.lastName}`;
    if (!window.confirm(`"${custName}" isimli müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }
    try {
      await deleteAdminCustomer(customer.id);
      await load();
    } catch (e: any) {
      alert('Müşteri silinirken hata: ' + e.message);
    }
  };

  const handleCreatePaymentLink = async (customer: any) => {
    const bal = Number(customer.balance || 0);
    if (bal <= 0) {
      alert('Bu müşterinin borcu bulunmamaktadır.');
      return;
    }
    try {
      const res = await createOdealPaymentLink({
        amount: bal,
        buyerName: customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        buyerPhone: customer.phone,
        buyerEmail: customer.email,
        relatedType: 'manual',
      });
      const url = res.paymentLink || (res as any).paymentUrl;
      if (url) {
        if (customer.phone) {
          openWhatsApp(customer.phone, `Sayın Müşterimiz, ₺${bal.toLocaleString('tr-TR')} tutarındaki cari bakiye borcunuz için Ödeal ile kredi kartıyla güvenli ödeme bağlantınız: ${url}`);
        }
        navigator.clipboard.writeText(url);
        alert(`Ödeal Ödeme Linki (₺${bal.toLocaleString('tr-TR')}) panoya kopyalandı:\n${url}`);
      } else {
        alert('Ödeal ödeme linki alınamadı.');
      }
    } catch (e: any) {
      alert('Ödeme linki hatası: ' + e.message);
    }
  };

  // Export Customer List to CSV
  const handleExportCSV = () => {
    if (!customers.length) return;
    const headers = ['Musteri Ad Soyad', 'E-posta', 'Telefon', 'Firma Unvani', 'Cari Kod', 'Bakiye (TL)', 'Kredi Limiti (TL)', 'Sozlesme / Bakim Anlasmasi'];
    const rows = filtered.map(c => [
      `"${c.firstName} ${c.lastName}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.companyName || 'Bireysel'}"`,
      `"${c.accountCode || ''}"`,
      `"${Number(c.balance || 0).toFixed(2)}"`,
      `"${Number(c.creditLimit || 0).toFixed(2)}"`,
      `"${c.planName ? `Anlaşmalı (${c.planName})` : 'Anlaşma Yok'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `musteri_listesi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregated Stats
  const totalReceivables = customers.reduce((sum, c) => sum + (Number(c.balance || 0) > 0 ? Number(c.balance) : 0), 0);
  const debtorCount = customers.filter(c => Number(c.balance || 0) > 0).length;
  const corporateCount = customers.filter(c => !!c.companyName).length;
  const contractedCount = customers.filter(c => !!c.planName).length;

  const filtered = customers.filter(customer => {
    const text = `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone} ${customer.companyName} ${customer.accountCode}`.toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (filterTab === 'contracted') return !!customer.planName;
    if (filterTab === 'debtors') return Number(customer.balance || 0) > 0;
    if (filterTab === 'cleared') return Number(customer.balance || 0) <= 0;
    if (filterTab === 'corporate') return !!customer.companyName;
    if (filterTab === 'individual') return !customer.companyName;

    return true;
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
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async () => {
    if (!assignment.customerId || !assignment.planId) return;
    setSaving(true);
    try {
      await assignCustomerSubscription(assignment.customerId, assignment);
      setContractModalCustomer(null);
      setAssignment({ customerId: 0, planId: '', status: 'active', currentPeriodEnd: '' });
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMigrateCustomers = async () => {
    setMigrating(true);
    try {
      const result = await migrateCustomerUsers();
      alert(`${result.migrated || 0} eski müşteri kaydı yeni cari tabloya taşındı.`);
      await load();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Müşteriler & Cari / Garanti Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Müşteri hesaplarını, cari bakiye hareketlerini, bakım sözleşmelerini ve cihaz tamirlerini yönetin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-theme border border-gray-200 shadow-sm transition"
          >
            <Download className="w-4 h-4 mr-1.5 text-gray-500" /> Excel / CSV Aktar
          </button>
          <button
            onClick={handleMigrateCustomers}
            disabled={migrating}
            className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-theme border border-gray-200 shadow-sm disabled:opacity-60 transition"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${migrating ? 'animate-spin' : ''}`} /> Eski Müşterileri Taşı
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm transition"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Yeni Müşteri Ekle
          </button>
        </div>
      </div>

      {/* Top Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Toplam Müşteri</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{customers.length}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {corporateCount} Kurumsal • {customers.length - corporateCount} Bireysel
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-primary rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Toplam Cari Alacak</p>
            <h3 className="text-2xl font-black text-red-600 mt-1">
              {totalReceivables.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Piyasa Alacak Bakiyesi</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Borçlu Müşteri Sayısı</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{debtorCount} Müşteri</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Ödeme / Tahsilat Bekleyen</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sözleşmeli / Bakım Anlaşmalı</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{contractedCount} Müşteri</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Aktif Bakım Sözleşmesi Var</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Customer Table Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Müşteri, firma, e-posta veya telefon..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-theme text-sm focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tümü ({customers.length})
            </button>
            <button
              onClick={() => setFilterTab('contracted')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTab === 'contracted' ? 'bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bakım Anlaşmalı ({contractedCount})
            </button>
            <button
              onClick={() => setFilterTab('debtors')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTab === 'debtors' ? 'bg-red-50 text-red-700 font-bold shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Borçlular ({debtorCount})
            </button>
            <button
              onClick={() => setFilterTab('cleared')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTab === 'cleared' ? 'bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sıfır / Alacaklı
            </button>
            <button
              onClick={() => setFilterTab('corporate')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTab === 'corporate' ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kurumsal ({corporateCount})
            </button>
            <button
              onClick={() => setFilterTab('individual')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTab === 'individual' ? 'bg-gray-200 text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bireysel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Müşteri</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cari / Firma</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Bakiye & Risk</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-400 font-medium">
                      Müşteri bulunamadı
                    </td>
                  </tr>
                ) : (
                  filtered.map(customer => {
                    const bal = Number(customer.balance || 0);
                    const limit = Number(customer.creditLimit || 0);
                    const isHighRisk = limit > 0 && bal >= limit;

                    return (
                      <tr key={customer.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                            {customer.firstName} {customer.lastName}
                            {customer.address && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-primary transition"
                                title="Google Maps Yol Tarifi Al"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{customer.email}</div>
                          {customer.phone && <div className="text-xs text-gray-400">{customer.phone}</div>}
                          {customer.planName ? (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <Award className="w-3 h-3 text-emerald-600" /> Bakım Anlaşmalı ({customer.planName})
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1">
                              <span className="text-[10px] text-gray-400">Anlaşma Yok</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2 font-medium text-gray-800">
                            <Building2 className="w-4 h-4 text-gray-400" /> {customer.companyName || 'Bireysel'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {customer.accountCode || 'Cari kod yok'} •{' '}
                            {customer.taxId || customer.taxOffice
                              ? `${customer.taxOffice || ''} ${customer.taxId || ''}`
                              : customer.sector || 'Bireysel Hesap'}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          <div className={`font-bold ${bal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {bal.toLocaleString('tr-TR')} TL
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-gray-400">Limit: {limit.toLocaleString('tr-TR')} TL</span>
                            {isHighRisk && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                <Shield className="w-3 h-3" /> Riskli
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right space-x-1">
                          <button
                            onClick={() => openContractModal(customer)}
                            className={`text-xs px-2.5 py-1.5 rounded-theme font-medium inline-flex items-center gap-1 transition ${
                              customer.planName
                                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title="Bakım Anlaşması / Sözleşme Yönetimi"
                          >
                            <FileSignature className="w-3.5 h-3.5" /> {customer.planName ? 'Sözleşmeli' : 'Sözleşme Ekle'}
                          </button>

                          {bal > 0 && (
                            <button
                              onClick={() => handleCreatePaymentLink(customer)}
                              className="text-xs px-2 py-1.5 rounded-theme bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium inline-flex items-center gap-1 transition"
                              title="Kredi Kartı Ödeme Linki Üret"
                            >
                              <PayIcon className="w-3.5 h-3.5" /> Ödeme Linki
                            </button>
                          )}
                          <button
                            onClick={() => openStatement(customer, 'ledger')}
                            className="text-xs px-2.5 py-1.5 rounded-theme bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium inline-flex items-center gap-1 transition"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ekstre
                          </button>
                          <button
                            onClick={() => openStatement(customer, 'repairs')}
                            className="text-xs px-2.5 py-1.5 rounded-theme bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium inline-flex items-center gap-1 transition"
                          >
                            <Wrench className="w-3.5 h-3.5" /> Tamirler
                          </button>
                          <button
                            onClick={() => openEdit(customer)}
                            className="text-xs px-2.5 py-1.5 rounded-theme bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-xs p-1.5 rounded-theme text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Müşteriyi Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract / Bakım Anlaşması Modal */}
      {contractModalCustomer && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setContractModalCustomer(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-gray-900">
                  Bakım Anlaşması & Sözleşme — {contractModalCustomer.companyName || `${contractModalCustomer.firstName} ${contractModalCustomer.lastName}`}
                </h3>
              </div>
              <button onClick={() => setContractModalCustomer(null)} className="p-1 hover:bg-gray-200 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bakım Anlaşma Paketi Seçin *</label>
                <select
                  value={assignment.planId}
                  onChange={e => setAssignment({ ...assignment, planId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Anlaşma Yok / Paket Seçin...</option>
                  {plans
                    .filter(plan => plan.isActive !== false)
                    .map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {Number(plan.price).toLocaleString('tr-TR')} TL /{' '}
                        {plan.billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sözleşme Durumu</label>
                <select
                  value={assignment.status}
                  onChange={e => setAssignment({ ...assignment, status: e.target.value })}
                  className={inputCls}
                >
                  <option value="active">🟢 Aktif Anlaşmalı</option>
                  <option value="trial">🟡 Deneme Süresi</option>
                  <option value="past_due">🔴 Ödeme Bekliyor</option>
                  <option value="canceled">⚪ İptal Edildi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sözleşme Bitiş Tarihi</label>
                <input
                  type="date"
                  value={assignment.currentPeriodEnd}
                  onChange={e => setAssignment({ ...assignment, currentPeriodEnd: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setContractModalCustomer(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-100 transition"
              >
                İptal
              </button>
              <button
                onClick={saveAssignment}
                disabled={saving || !assignment.planId}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center gap-1 transition"
              >
                {saving ? 'Kaydediliyor...' : 'Sözleşmeyi Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Müşteri Bilgilerini Düzenle' : 'Yeni Müşteri Oluştur'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Customer Type Selector */}
            <div className="px-6 pt-4">
              <label className="block text-xs font-semibold text-gray-500 mb-2">Müşteri Türü</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, customerType: 'bireysel' })}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-theme border transition-all ${
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
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-theme border transition-all ${
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
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Firma / Cari Ünvanı *</label>
                  <input
                    value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    className={inputCls}
                    placeholder="Firma Ticari Ünvanı"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {form.customerType === 'kurumsal' ? 'Yetkili Adı *' : 'Ad *'}
                </label>
                <input
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className={inputCls}
                  placeholder="Ad"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {form.customerType === 'kurumsal' ? 'Yetkili Soyadı' : 'Soyad'}
                </label>
                <input
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className={inputCls}
                  placeholder="Soyad"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-posta adresi *</label>
                <input
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="E-posta"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon Numarası</label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                  placeholder="Telefon"
                />
              </div>
              {!editing && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Müşteri Giriş Şifresi</label>
                  <input
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className={inputCls}
                    placeholder="Şifre"
                  />
                </div>
              )}

              {form.customerType === 'kurumsal' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi Dairesi</label>
                    <input
                      value={form.taxOffice}
                      onChange={e => setForm({ ...form, taxOffice: e.target.value })}
                      className={inputCls}
                      placeholder="Vergi Dairesi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi / TCKN</label>
                    <input
                      value={form.taxId}
                      onChange={e => setForm({ ...form, taxId: e.target.value })}
                      className={inputCls}
                      placeholder="Vergi No / TCKN"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sektör</label>
                    <input
                      value={form.sector}
                      onChange={e => setForm({ ...form, sector: e.target.value })}
                      className={inputCls}
                      placeholder="Faaliyet Sektörü"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cari Kod</label>
                    <input
                      value={form.accountCode}
                      onChange={e => setForm({ ...form, accountCode: e.target.value })}
                      className={inputCls}
                      placeholder="Örn: MUS-001"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cari Başlangıç Bakiyesi (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={e => setForm({ ...form, balance: e.target.value })}
                  className={inputCls}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Kredi Limiti (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.creditLimit}
                  onChange={e => setForm({ ...form, creditLimit: e.target.value })}
                  className={inputCls}
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Adres</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Açık Adres"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cari Notlar & Anlaşma Detayları</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Özel anlaşma koşulları, iskonto veya cari notlar"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50 transition"
              >
                İptal
              </button>
              <button
                onClick={saveCustomer}
                disabled={saving || !form.firstName || !form.email}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center transition"
              >
                {saving ? (
                  'Kaydediliyor...'
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Full Detail / Statement / Repairs / Warranty Modal */}
      {statementCustomer && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setStatementCustomer(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Müşteri Detayı — {statementCustomer.companyName || `${statementCustomer.firstName} ${statementCustomer.lastName}`}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {statementCustomer.accountCode || 'Cari No Belirtilmemiş'} • {statementCustomer.email} • {statementCustomer.phone || 'Telefon Yok'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(`/print/customer-statement/${statementCustomer.id}`, '_blank')}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cari Ekstre PDF / Yazdır
                  </button>
                  <button
                    onClick={() => setStatementCustomer(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="flex border-b border-gray-200 gap-2">
                <button
                  onClick={() => setActiveModalTab('ledger')}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                    activeModalTab === 'ledger'
                      ? 'border-emerald-600 text-emerald-700 bg-white shadow-sm rounded-t-lg'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Cari Ekstre & Bakiyeler
                </button>
                <button
                  onClick={() => setActiveModalTab('repairs')}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                    activeModalTab === 'repairs'
                      ? 'border-amber-600 text-amber-700 bg-white shadow-sm rounded-t-lg'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Wrench className="w-4 h-4" /> Cihaz Tamir Geçmişi ({ledgerData?.repairs?.length || 0})
                </button>
                <button
                  onClick={() => setActiveModalTab('warranties')}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                    activeModalTab === 'warranties'
                      ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm rounded-t-lg'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Ürün Garanti Takibi ({ledgerData?.warranties?.length || 0})
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* TAB 1: CARİ EKSTRE & BAKIYELER */}
              {activeModalTab === 'ledger' && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 font-medium">Güncel Bakiye</p>
                      <p
                        className={`text-2xl font-black mt-1 ${
                          Number(ledgerData?.summary?.balance || statementCustomer.balance || 0) > 0
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {Number(ledgerData?.summary?.balance || statementCustomer.balance || 0).toLocaleString('tr-TR')} TL
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {Number(ledgerData?.summary?.balance || statementCustomer.balance || 0) > 0
                          ? 'Müşteri Borçlu'
                          : 'Alacaklı / Sıfır Bakiye'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 font-medium">Kredi Limiti</p>
                      <p className="text-2xl font-black text-gray-800 mt-1">
                        {Number(statementCustomer.creditLimit || 0).toLocaleString('tr-TR')} TL
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Tanımlı Kredi Limiti</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 font-medium">Toplam Borç İşlemleri</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">
                        {Number(ledgerData?.summary?.totalDebit || 0).toLocaleString('tr-TR')} TL
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Servis / Satış / Borç</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500 font-medium">Toplam Tahsilat / Ödeme</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {Number(ledgerData?.summary?.totalCredit || 0).toLocaleString('tr-TR')} TL
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Yapılan Tahsilatlar</p>
                    </div>
                  </div>

                  {/* Add Transaction Form */}
                  <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200/80">
                    <div className="flex items-center gap-2 mb-3">
                      <PlusCircle className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                        Yeni Cari Hareket Ekle (Tahsilat / Borçlandırma)
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <select
                          value={newTransaction.type}
                          onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value })}
                          className={inputCls}
                        >
                          <option value="alacak">Tahsilat / Ödeme Al (Alacak)</option>
                          <option value="borc">Borçlandırma Ekle (Borç)</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Tutar (TL)"
                          value={newTransaction.amount}
                          onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Açıklama (Örn: Havale ile tahsilat)"
                          value={newTransaction.description}
                          onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <button
                          onClick={handleAddLedgerEntry}
                          disabled={addingTransaction || !newTransaction.amount}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-theme text-sm disabled:opacity-50 transition"
                        >
                          {addingTransaction ? 'Ekleniyor...' : 'Hareket Ekle'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action bar: WhatsApp Reminder */}
                  {statementCustomer.phone && (
                    <a
                      href={`https://wa.me/${formatWaPhone(statementCustomer.phone)}?text=${encodeURIComponent(
                        `Sayın ${statementCustomer.companyName || statementCustomer.firstName}, güncel cari hesap bakiyeniz: ${Number(
                          ledgerData?.summary?.balance || statementCustomer.balance || 0
                        ).toLocaleString('tr-TR')} TL'dir.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-theme flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Send className="w-4 h-4 text-white" /> WhatsApp İle Bakiye Hatırlatması Gönder
                    </a>
                  )}

                  {/* Ledger Transactions Table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Cari Hareket Geçmişi</h4>
                      <span className="text-xs text-gray-500 font-medium">
                        {ledgerData?.transactions?.length || 0} Hareket Kaydı
                      </span>
                    </div>

                    {ledgerLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                      </div>
                    ) : !ledgerData?.transactions || ledgerData.transactions.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-sm">
                        Bu müşteriye ait cari hareket kaydı bulunmamaktadır.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-100/70">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tarih</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tür</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Açıklama</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-red-600">Borç (TL)</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-600">Alacak (TL)</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-800">Yürüyen Bakiye</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">İşlem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {ledgerData.transactions.map((tx: any) => (
                              <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                  {new Date(tx.date).toLocaleDateString('tr-TR')}{' '}
                                  {new Date(tx.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                  {tx.debit > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                                      <ArrowUpRight className="w-3 h-3" /> Borç
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                                      <ArrowDownLeft className="w-3 h-3" /> Alacak
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-800 font-medium max-w-xs truncate">
                                  {tx.description}
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-semibold text-red-600 whitespace-nowrap">
                                  {tx.debit > 0 ? `${tx.debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '—'}
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-600 whitespace-nowrap">
                                  {tx.credit > 0 ? `${tx.credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '—'}
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-bold text-gray-900 whitespace-nowrap">
                                  {Number(tx.runningBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  {tx.source === 'manuel' ? (
                                    <button
                                      onClick={() => handleDeleteLedgerEntry(tx.rawId)}
                                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                      title="Hatalı Kaydı Sil"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 2: CİHAZ TAMİR GEÇMİŞİ */}
              {activeModalTab === 'repairs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-6 h-6 text-amber-700" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Müşterinin Servis ve Cihaz Tamir Geçmişi</h4>
                        <p className="text-xs text-amber-700">
                          Müşteriye ait tüm servis kayıtları, tamir ücretleri ve garanti durumları.
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/admin/servis?userId=${statementCustomer.id}`}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      Yeni Servis Kaydı Aç <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {ledgerLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
                    </div>
                  ) : !ledgerData?.repairs || ledgerData.repairs.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
                      <Laptop className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      Bu müşteriye ait verilmiş bir cihaz tamir / servis kaydı bulunmamaktadır.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Servis No</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cihaz / Arıza Konusu</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Durum</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Garanti Durumu</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Servis Tutarı</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Tarih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {ledgerData.repairs.map((r: any) => {
                            const st = statusLabels[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-700' };
                            return (
                              <tr key={r.id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3 text-xs font-bold text-primary whitespace-nowrap">
                                  #{r.ticketNumber}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-900 font-medium">
                                  <div>{r.subject}</div>
                                  {r.accessories && <div className="text-[11px] text-gray-400 mt-0.5">Aksesuar: {r.accessories}</div>}
                                </td>
                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.color}`}>
                                    {st.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                  {r.isUnderWarranty ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <ShieldCheck className="w-3.5 h-3.5" /> Garanti Kapsamında
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                      <ShieldAlert className="w-3.5 h-3.5 text-gray-400" /> Ücretli Onarım
                                    </span>
                                  )}
                                  {r.warrantyNote && (
                                    <div className="text-[11px] text-gray-400 mt-0.5 italic">{r.warrantyNote}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-bold text-gray-900 whitespace-nowrap">
                                  {Number(r.cost || 0).toLocaleString('tr-TR')} TL
                                </td>
                                <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">
                                  {new Date(r.createdAt).toLocaleDateString('tr-TR')}
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

              {/* TAB 3: ÜRÜN & PARÇA GARANTİ TAKİBİ */}
              {activeModalTab === 'warranties' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-indigo-700" />
                      <div>
                        <h4 className="text-sm font-bold text-indigo-900">Müşterinin Ürün ve Yedek Parça Garanti Durumu</h4>
                        <p className="text-xs text-indigo-700">
                          Müşteriye takılan yedek parçaların, satılan ürünlerin garanti süreleri ve sayaç takibi.
                        </p>
                      </div>
                    </div>
                  </div>

                  {ledgerLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  ) : !ledgerData?.warranties || ledgerData.warranties.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
                      <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      Bu müşteriye ait kayıtlı garantili ürün veya yedek parça bulunmamaktadır.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Ürün / Parça Adı</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Marka</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Montaj / Satış Tarihi</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Garanti Süresi</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Bitiş Tarihi</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Garanti Durumu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {ledgerData.warranties.map((w: any) => (
                            <tr key={w.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 text-xs font-bold text-gray-900">
                                {w.partName || 'Tanımsız Parça'}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                                {w.brand || '—'}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {new Date(w.installDate).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-700 font-semibold">
                                {w.warrantyMonths} Ay
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {new Date(w.warrantyEndDate).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="px-4 py-3 text-right text-xs whitespace-nowrap">
                                {w.isExpired ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                    <AlertTriangle className="w-3 h-3" /> Garanti Bitti
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Clock className="w-3 h-3" /> {w.remainingDays} Gün Kaldı
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Agreement / Anlaşma Notları Footer */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-1">Cari Anlaşma & Özel Notlar:</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap">
                  {statementCustomer.notes || 'Bu müşteriye ait özel bir cari anlaşma notu belirtilmemiştir.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setStatementCustomer(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-theme transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}