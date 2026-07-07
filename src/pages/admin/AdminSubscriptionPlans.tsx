import { useEffect, useState } from 'react';
import { CheckCircle, PackagePlus, Plus, X } from 'lucide-react';
import { createSubscriptionPlan, fetchSubscriptionPlans, updateSubscriptionPlan } from '../../lib/api';

const inputCls = 'w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary';

const emptyPlan = { name: '', description: '', price: '', billingCycle: 'monthly', features: '', isActive: true };

export default function AdminSubscriptionPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyPlan);

  const load = async () => {
    try { setPlans(await fetchSubscriptionPlans()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPlan);
    setShowModal(true);
  };

  const openEdit = (plan: any) => {
    setEditing(plan);
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price || '',
      billingCycle: plan.billingCycle || 'monthly',
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      isActive: plan.isActive !== false,
    });
    setShowModal(true);
  };

  const savePlan = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing) await updateSubscriptionPlan(editing.id, form);
      else await createSubscriptionPlan(form);
      setShowModal(false);
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const togglePlan = async (plan: any) => {
    try {
      await updateSubscriptionPlan(plan.id, { isActive: !plan.isActive });
      await load();
    } catch (e: any) { alert('Hata: ' + e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Abonelik Hizmet Paketleri</h1>
          <p className="text-sm text-gray-500 mt-1">Bakım anlaşması, kurumsal destek ve abonelik paketlerini müşterilere atanabilir şekilde yönetin.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-theme shadow-sm">
          <PackagePlus className="w-4 h-4 mr-2" /> Yeni Paket
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400 bg-white rounded-theme border border-gray-200">
              <PackagePlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Henüz abonelik paketi yok</p>
            </div>
          ) : plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-theme border border-gray-200 shadow-sm p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{plan.billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'} paket</p>
                </div>
                <span className={`px-2 py-1 text-[11px] font-bold rounded-full ${plan.isActive ? 'bg-blue-100 text-secondary' : 'bg-gray-100 text-gray-500'}`}>{plan.isActive ? 'Aktif' : 'Pasif'}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-3">{Number(plan.price).toLocaleString('tr-TR')} TL</div>
              <p className="text-sm text-gray-500 min-h-10 mb-4">{plan.description}</p>
              <div className="space-y-2 flex-1 mb-5">
                {(Array.isArray(plan.features) ? plan.features : []).slice(0, 6).map((feature: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-600"><CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> {feature}</div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openEdit(plan)} className="py-2 rounded-theme bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold">Düzenle</button>
                <button onClick={() => togglePlan(plan)} className="py-2 rounded-theme bg-blue-50 hover:bg-blue-100 text-primary text-xs font-semibold">{plan.isActive ? 'Pasif Yap' : 'Aktif Yap'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-theme shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Paket Düzenle' : 'Yeni Paket'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-theme"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Paket adı *" />
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} rows={3} placeholder="Kısa açıklama" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="Fiyat" />
                <select value={form.billingCycle} onChange={e => setForm({ ...form, billingCycle: e.target.value })} className={inputCls}>
                  <option value="monthly">Aylık</option>
                  <option value="yearly">Yıllık</option>
                </select>
              </div>
              <textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} className={`${inputCls} resize-none`} rows={6} placeholder={'Özellikleri satır satır yazın\nÖrn: Aylık bakım ziyareti\nÖncelikli destek'} />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Aktif paket
              </label>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-theme font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={savePlan} disabled={saving || !form.name} className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-theme font-semibold disabled:opacity-50 flex items-center justify-center">
                <Plus className="w-4 h-4 mr-2" /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}