import React, { useState, useEffect } from 'react';
import { fetchAdminDealers, createAdminDealer, updateAdminDealer, deleteAdminDealer, fetchDealerUsers, createDealerUser } from '../../lib/api';
import { Building2, Plus, X, Search, Phone, Mail, FileText, Settings, UserPlus, CreditCard, Shield, RefreshCw, Trash2, Edit2, Key, Users } from 'lucide-react';
import { usePageTitle } from '../../lib/usePageTitle';

export default function AdminDealers() {
  usePageTitle('Bayi Yönetimi');

  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);

  // Users representative list
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [dealerUsers, setDealerUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    taxOffice: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    sector: '',
    dealerRiskLimit: '',
    dealerDueDays: 0,
    dealerDiscountRate: '0.00',
    dealerPriceListNote: '',
  });

  useEffect(() => {
    loadDealers();
  }, []);

  const loadDealers = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminDealers();
      setDealers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      taxId: '',
      taxOffice: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      sector: '',
      dealerRiskLimit: '',
      dealerDueDays: 0,
      dealerDiscountRate: '0.00',
      dealerPriceListNote: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (dealer: any) => {
    setSelectedDealer(dealer);
    setFormData({
      name: dealer.name || '',
      taxId: dealer.taxId || '',
      taxOffice: dealer.taxOffice || '',
      address: dealer.address || '',
      phone: dealer.phone || '',
      email: dealer.email || '',
      website: dealer.website || '',
      sector: dealer.sector || '',
      dealerRiskLimit: dealer.dealerRiskLimit ? dealer.dealerRiskLimit.toString() : '',
      dealerDueDays: dealer.dealerDueDays || 0,
      dealerDiscountRate: dealer.dealerDiscountRate ? dealer.dealerDiscountRate.toString() : '0.00',
      dealerPriceListNote: dealer.dealerPriceListNote || '',
    });
    setShowEditModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminDealer(formData);
      setShowAddModal(false);
      loadDealers();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealer) return;
    try {
      await updateAdminDealer(selectedDealer.id, formData);
      setShowEditModal(false);
      loadDealers();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu bayiyi silmek istediğinize emin misiniz? Bayi ile ilişkili tüm yetkili temsilci girişleri kaldırılacaktır.')) return;
    try {
      await deleteAdminDealer(id);
      loadDealers();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  // Manage representatives
  const handleOpenUsers = async (dealer: any) => {
    setSelectedDealer(dealer);
    setShowUsersModal(true);
    setLoadingUsers(true);
    setNewUser({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    });
    try {
      const data = await fetchDealerUsers(dealer.id);
      setDealerUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealer) return;
    try {
      await createDealerUser(selectedDealer.id, newUser);
      // Reload users list
      const data = await fetchDealerUsers(selectedDealer.id);
      setDealerUsers(data || []);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
      });
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const filteredDealers = dealers.filter(d =>
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-150/80 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-950 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Bayi (Dealer) Yönetim Modülü
          </h2>
          <p className="text-xs text-gray-450 mt-1">
            Aracı bayileri, limit, vade ve bayi çalışanlarının giriş hesaplarını yönetin.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-secondary text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Yeni Bayi Ekle
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-150/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Toplam Bayi</p>
            <p className="text-2xl font-black text-gray-950">{dealers.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-150/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Ortalama Risk Vadesi</p>
            <p className="text-2xl font-black text-gray-950">
              {dealers.length ? Math.round(dealers.reduce((sum, d) => sum + (d.dealerDueDays || 0), 0) / dealers.length) : 0} Gün
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-150/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Ortalama İndirim Oranı</p>
            <p className="text-2xl font-black text-gray-950">
              %{dealers.length ? (dealers.reduce((sum, d) => sum + parseFloat(d.dealerDiscountRate || '0'), 0) / dealers.length).toFixed(1) : '0.0'}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-3xl border border-gray-150/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Bayi adı, e-posta veya telefon ile ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Bayi Unvanı</th>
                <th className="px-6 py-4">Vergi Bilgileri</th>
                <th className="px-6 py-4">İletişim</th>
                <th className="px-6 py-4">Risk Limiti</th>
                <th className="px-6 py-4">Vade (Gün)</th>
                <th className="px-6 py-4">İndirim Oranı</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Bayi listesi yükleniyor...
                  </td>
                </tr>
              ) : filteredDealers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-450 italic">
                    Aranan kriterlere uygun bayi kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredDealers.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-extrabold text-gray-950">{d.name}</p>
                      {d.sector && <p className="text-[10px] text-gray-400">{d.sector}</p>}
                    </td>
                    <td className="px-6 py-4">
                      {d.taxId ? (
                        <p>{d.taxOffice} / {d.taxId}</p>
                      ) : (
                        <p className="text-gray-400 italic">Girilmemiş</p>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-0.5 text-gray-500">
                      <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {d.phone || '—'}</p>
                      <p className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {d.email || '—'}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {d.dealerRiskLimit ? `₺${parseFloat(d.dealerRiskLimit).toLocaleString("tr-TR")}` : 'Limitsiz'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                        {d.dealerDueDays || 0} Gün
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      %{d.dealerDiscountRate || '0.00'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenUsers(d)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors flex items-center gap-1"
                          title="Temsilciler"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Yetkililer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(d)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modals */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={showAddModal ? handleCreate : handleUpdate}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
              <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> {showAddModal ? 'Yeni Bayi Kaydı' : 'Bayi Detaylarını Düzenle'}
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="p-1 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Bayi Unvanı *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Bayi Şirket Adı"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sektör / Faaliyet Alanı</label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={e => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Örn: Bilişim, Telekom"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={formData.taxOffice}
                    onChange={e => setFormData({ ...formData, taxOffice: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Vergi Numarası</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">E-Posta</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Web Sitesi</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Adres Bilgisi</label>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bayi Risk Limiti (₺)</label>
                  <input
                    type="number"
                    value={formData.dealerRiskLimit}
                    onChange={e => setFormData({ ...formData, dealerRiskLimit: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary bg-white outline-none"
                    placeholder="Limitsiz için boş bırakın"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Ödeme Vadesi (Gün)</label>
                  <input
                    type="number"
                    value={formData.dealerDueDays}
                    onChange={e => setFormData({ ...formData, dealerDueDays: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Özel İndirim Oranı (%)</label>
                  <input
                    type="text"
                    value={formData.dealerDiscountRate}
                    onChange={e => setFormData({ ...formData, dealerDiscountRate: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fiyat Listesi Notları / Özel Koşullar</label>
                <textarea
                  value={formData.dealerPriceListNote}
                  onChange={e => setFormData({ ...formData, dealerPriceListNote: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none resize-none"
                  placeholder="Bayiye tanımlanan özel fiyatlandırma şartları veya anlaşmalar..."
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-150 bg-slate-50/50">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors text-xs"
              >
                İptal
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-bold transition-colors shadow-md shadow-primary/20 text-xs"
              >
                {showAddModal ? 'Bayi Ekle' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dealer Users modal */}
      {showUsersModal && selectedDealer && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider">
                  {selectedDealer.name} — Bayi Temsilcileri
                </h3>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Yönetici paneli giriş hesapları oluşturun ve yönetin.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUsersModal(false)}
                className="p-1 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Left Side: Representatives List */}
              <div className="p-6 flex flex-col h-[400px]">
                <h4 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">Kayıtlı Bayi Yetkilileri ({dealerUsers.length})</h4>
                
                <div className="flex-1 overflow-y-auto space-y-2.5">
                  {loadingUsers ? (
                    <div className="py-12 text-center text-gray-400 text-xs">Yükleniyor...</div>
                  ) : dealerUsers.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 italic text-xs">Henüz yetkili hesabı eklenmemiş.</div>
                  ) : (
                    dealerUsers.map(u => (
                      <div key={u.id} className="p-3 border border-gray-200 rounded-xl bg-slate-50/50 flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] text-gray-500">{u.email}</p>
                          {u.phone && <p className="text-[10px] text-gray-500">Tel: {u.phone}</p>}
                        </div>
                        <span className="text-[9px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                          Active
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side: Add User Form */}
              <div className="p-6 bg-slate-50/50 h-[400px] flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-primary" /> Yeni Yetkili Giriş Hesabı Ekle
                  </h4>

                  <form onSubmit={handleCreateUser} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Adı *</label>
                        <input
                          type="text"
                          required
                          value={newUser.firstName}
                          onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Soyadı *</label>
                        <input
                          type="text"
                          required
                          value={newUser.lastName}
                          onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">E-Posta (Giriş E-postası) *</label>
                      <input
                        type="email"
                        required
                        value={newUser.email}
                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Telefon</label>
                        <input
                          type="text"
                          value={newUser.phone}
                          onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Giriş Şifresi *</label>
                        <input
                          type="password"
                          required
                          value={newUser.password}
                          onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                          placeholder="En az 6 karakter"
                          minLength={6}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full bg-primary hover:bg-secondary text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-md shadow-primary/10 flex items-center justify-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" /> Giriş Hesabı Oluştur
                      </button>
                    </div>
                  </form>
                </div>

                <div className="mt-4 text-[10px] text-gray-400 bg-amber-50 border border-amber-100 p-2 rounded-lg leading-relaxed flex gap-1.5 items-start">
                  <span className="font-extrabold text-amber-600 shrink-0">⚠️ NOT:</span>
                  <span>Bayi yetkilisi oluşturulduğunda rol tipi otomatik <strong>dealer_user</strong> olur ve bu yetkililer sadece kendilerine ait servis geçmişlerini ve bayi özel fiyatlarını görebilir.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
