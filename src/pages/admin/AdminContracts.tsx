import { useEffect, useState } from 'react';
import { FileSignature, Plus, Search, X, Edit2, Trash2, Calendar, AlertTriangle, CheckCircle, Clock, Ban } from 'lucide-react';
import { fetchAdminContracts, createAdminContract, updateAdminContract, deleteAdminContract } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  aktif: { label: 'Aktif', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pasif: { label: 'Pasif', color: 'bg-gray-100 text-gray-600', icon: Ban },
  iptal: { label: 'İptal', color: 'bg-red-100 text-red-600', icon: Ban },
  bekliyor: { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700', icon: Clock },
};

const inputCls = 'w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none';

const emptyForm = {
  title: '',
  companyId: '',
  startDate: '',
  endDate: '',
  status: 'bekliyor',
  slaDetails: '',
  monthlyFee: '',
};

export default function AdminContracts() {
  usePageTitle('Bakım Sözleşmeleri');

  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await fetchAdminContracts();
      setContracts(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = contracts.filter(c => {
    const text = `${c.title} ${c.companyName || ''}`.toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (contract: any) => {
    setEditing(contract);
    setForm({
      title: contract.title || '',
      companyId: contract.companyId || '',
      startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
      endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
      status: contract.status || 'bekliyor',
      slaDetails: contract.slaDetails || '',
      monthlyFee: contract.monthlyFee || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Sözleşme başlığı zorunludur');
    if (!form.startDate || !form.endDate) return alert('Başlangıç ve bitiş tarihi zorunludur');
    setSaving(true);
    try {
      const payload = {
        ...form,
        companyId: form.companyId ? Number(form.companyId) : null,
        monthlyFee: form.monthlyFee || null,
      };
      if (editing) {
        await updateAdminContract(editing.id, payload);
      } else {
        await createAdminContract(payload);
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
    if (!confirm('Bu sözleşmeyi silmek istediğinize emin misiniz?')) return;
    try {
      await deleteAdminContract(id);
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';
  const formatMoney = (val: any) => {
    const n = parseFloat(val);
    return isNaN(n) ? '—' : `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  // Sözleşme bitiş uyarıları
  const now = new Date();
  const expiringContracts = contracts.filter(c => {
    if (c.status !== 'aktif') return false;
    const end = new Date(c.endDate);
    const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });

  const activeCount = contracts.filter(c => c.status === 'aktif').length;
  const totalMonthly = contracts
    .filter(c => c.status === 'aktif')
    .reduce((s, c) => s + (parseFloat(c.monthlyFee) || 0), 0);

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
            <FileSignature className="w-6 h-6 text-primary" />
            Bakım Sözleşmeleri
          </h1>
          <p className="text-sm text-gray-500 mt-1">Bakım ve destek sözleşmelerini yönetin.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme transition-colors">
          <Plus className="w-4 h-4" /> Yeni Sözleşme
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Toplam Sözleşme</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{contracts.length}</p>
        </div>
        <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Aktif</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Aylık Gelir</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatMoney(totalMonthly)}</p>
        </div>
        <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Süresi Yaklaşan</p>
          <p className={`text-2xl font-bold mt-1 ${expiringContracts.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {expiringContracts.length}
          </p>
        </div>
      </div>

      {/* Expiring Warning */}
      {expiringContracts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-theme p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Süresi Yaklaşan Sözleşmeler ({expiringContracts.length})</p>
            <ul className="mt-1 space-y-0.5">
              {expiringContracts.map(c => (
                <li key={c.id} className="text-xs text-orange-700">
                  <strong>{c.title}</strong> — {c.companyName || 'Firma belirtilmemiş'} — Bitiş: {formatDate(c.endDate)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Sözleşme başlığı veya firma ile ara..."
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

      {/* Table */}
      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Henüz bakım sözleşmesi bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Başlık</th>
                  <th className="px-4 py-3 font-semibold">Firma</th>
                  <th className="px-4 py-3 font-semibold">Başlangıç</th>
                  <th className="px-4 py-3 font-semibold">Bitiş</th>
                  <th className="px-4 py-3 font-semibold text-right">Aylık Ücret</th>
                  <th className="px-4 py-3 font-semibold">Durum</th>
                  <th className="px-4 py-3 font-semibold text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c: any) => {
                  const st = STATUS_MAP[c.status] || STATUS_MAP.bekliyor;
                  const endDate = new Date(c.endDate);
                  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpiring = c.status === 'aktif' && daysLeft >= 0 && daysLeft <= 30;
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors ${isExpiring ? 'bg-orange-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{c.title}</p>
                        {c.slaDetails && <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">{c.slaDetails}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{c.companyName || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatDate(c.startDate)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{formatDate(c.endDate)}</span>
                        {isExpiring && (
                          <span className="ml-1.5 text-[10px] text-orange-600 font-semibold">({daysLeft} gün kaldı)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">{formatMoney(c.monthlyFee)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors" title="Düzenle">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Sil">
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Sözleşmeyi Düzenle' : 'Yeni Bakım Sözleşmesi'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sözleşme Başlığı *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Yıllık bakım sözleşmesi" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Firma ID (opsiyonel)</label>
                <input type="number" value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} className={inputCls} placeholder="Firma ID" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Başlangıç Tarihi *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bitiş Tarihi *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Aylık Ücret (₺)</label>
                  <input type="number" step="0.01" value={form.monthlyFee} onChange={e => setForm({ ...form, monthlyFee: e.target.value })} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SLA Detayları</label>
                <textarea rows={3} value={form.slaDetails} onChange={e => setForm({ ...form, slaDetails: e.target.value })} className={inputCls} placeholder="Destek saatleri, yanıt süreleri, kapsam vb." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-theme hover:bg-gray-50 transition-colors">İptal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Sözleşme Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
