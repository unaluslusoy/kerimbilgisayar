import React from 'react';
import { useState, useEffect } from 'react';
import { User, Lock, Mail, Phone, CheckCircle } from 'lucide-react';
import { fetchAdminProfile, updateAdminProfile } from '../../lib/api';

export default function AdminProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAdminProfile();
        setProfile(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== passwordConfirm) {
      alert('Şifreler eşleşmiyor!');
      return;
    }

    setSaving(true);
    setSuccessMsg('');
    try {
      const updates: any = { firstName, lastName, email, phone };
      if (password) updates.password = password;
      await updateAdminProfile(updates);
      setSuccessMsg('Profiliniz başarıyla güncellendi.');
      setPassword('');
      setPasswordConfirm('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Profilim</h1>
        <p className="text-sm text-gray-500 mt-1">Kişisel bilgilerinizi ve şifrenizi güncelleyin.</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-800 rounded-theme flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-theme border border-gray-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center border-b pb-2">
              <User className="w-5 h-5 mr-2 text-primary" /> Kişisel Bilgiler
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adınız</label>
                <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border border-gray-300 rounded-theme px-4 py-2.5 focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soyadınız</label>
                <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border border-gray-300 rounded-theme px-4 py-2.5 focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center border-b pb-2">
              <Mail className="w-5 h-5 mr-2 text-primary" /> İletişim Bilgileri
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta Adresi</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-theme px-4 py-2.5 focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Phone className="w-4 h-4 mr-1 text-gray-400" /> Telefon Numarası
                </label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-theme px-4 py-2.5 focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center border-b pb-2">
              <Lock className="w-5 h-5 mr-2 text-primary" /> Şifre Değiştir
            </h2>
            <p className="text-sm text-gray-500">Şifrenizi değiştirmek istemiyorsanız bu alanları boş bırakın.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-theme px-4 py-2.5 focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre (Tekrar)</label>
                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className="w-full border border-gray-300 rounded-theme px-4 py-2.5 focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-secondary text-white rounded-theme font-medium shadow-sm transition-colors">
              {saving ? 'Kaydediliyor...' : 'Profili Güncelle'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
