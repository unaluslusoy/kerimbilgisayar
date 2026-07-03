import { useState, useEffect } from 'react';
import { User, Shield, Edit2, UserPlus, Search, X, CheckCircle, XCircle } from 'lucide-react';
import { fetchAdminUsers, createAdminUser, updateAdminUser } from '../../lib/api';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Süper Admin',
  tenant_admin: 'Yönetici',
  staff: 'Personel',
  technician: 'Teknisyen',
  customer: 'Müşteri',
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-red-100 text-red-700',
  tenant_admin: 'bg-purple-100 text-purple-700',
  staff: 'bg-blue-100 text-blue-700',
  technician: 'bg-blue-100 text-secondary',
  customer: 'bg-gray-100 text-gray-600',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', phone: '', roleType: 'staff', password: 'admin123' });

  const load = async () => {
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    !search ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const handleCreate = async () => {
    if (!newUser.firstName || !newUser.email) return;
    setSaving(true);
    try {
      await createAdminUser(newUser);
      setShowModal(false);
      setNewUser({ firstName: '', lastName: '', email: '', phone: '', roleType: 'staff', password: 'admin123' });
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (id: number, current: boolean) => {
    try {
      await updateAdminUser(id, { isActive: !current });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !current } : u));
    } catch (e: any) { alert('Hata: ' + e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kullanıcı ve Rol Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem erişimine sahip personelleri ve yetkilerini yönetin.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm transition-colors">
          <UserPlus className="w-4 h-4 mr-2" /> Yeni Kullanıcı
        </button>
      </div>

      <div className="bg-white p-4 rounded-theme border border-gray-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="İsim, e-posta veya telefon..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-theme text-sm focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kullanıcı</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Son Giriş</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400 font-medium">Kullanıcı bulunamadı</td></tr>
                ) : filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-secondary font-bold text-sm shrink-0">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          {user.phone && <div className="text-xs text-gray-400">{user.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${ROLE_COLORS[user.roleType] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[user.roleType] || user.roleType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user.isActive ? 'text-primary' : 'text-gray-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                        {user.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('tr-TR') : 'Hiç giriş yapmadı'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleActive(user.id, user.isActive)}
                        className={`text-xs px-3 py-1.5 rounded-theme font-medium transition-colors ${user.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-50 text-primary hover:bg-blue-100'}`}
                      >
                        {user.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Yeni Kullanıcı</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                  <input type="text" value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="Ahmet" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                  <input type="text" value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="Yılmaz" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Posta *</label>
                <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="ahmet@kerimbilgisayar.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="text" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select value={newUser.roleType} onChange={e => setNewUser({ ...newUser, roleType: e.target.value })}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary">
                    <option value="staff">Personel</option>
                    <option value="technician">Teknisyen</option>
                    <option value="tenant_admin">Yönetici</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary" placeholder="admin123" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={handleCreate} disabled={saving || !newUser.firstName || !newUser.email}
                className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
