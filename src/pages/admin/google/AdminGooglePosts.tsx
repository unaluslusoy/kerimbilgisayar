import { useState, useEffect } from 'react';
import { adminRequest } from '../../../lib/api';
import {
  PlusCircle, Megaphone, Trash2, Edit2, Loader2, X, AlertTriangle,
  ExternalLink, RefreshCw, Calendar, Tag
} from 'lucide-react';

const POST_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Haber / Güncelleme',
  OFFER: 'Teklif / İndirim',
  EVENT: 'Etkinlik',
};

const CTA_LABELS: Record<string, string> = {
  ACTION_TYPE_UNSPECIFIED: 'Buton Yok',
  BOOK: 'Rezervasyon Yap',
  ORDER: 'Sipariş Ver',
  SHOP: 'Satın Al',
  LEARN_MORE: 'Daha Fazla Bilgi',
  SIGN_UP: 'Kaydol',
  CALL: 'Şimdi Ara',
};

interface Post {
  name: string;
  topicType: string;
  summary: string;
  createTime: string;
  callToAction?: { actionType: string; url?: string };
  event?: { title?: string; schedule?: { startDate?: any; endDate?: any; startTime?: any; endTime?: any } };
  offer?: { couponCode?: string; redeemOnlineUrl?: string; termsConditions?: string };
}

const emptyForm = () => ({
  topicType: 'STANDARD',
  summary: '',
  callToAction: 'ACTION_TYPE_UNSPECIFIED',
  actionUrl: '',
  // EVENT fields
  eventTitle: '',
  eventStartDate: '',
  eventEndDate: '',
  eventStartTime: '',
  eventEndTime: '',
  // OFFER fields
  couponCode: '',
  redeemUrl: '',
  terms: '',
});

export default function AdminGooglePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [form, setForm] = useState(emptyForm());

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await adminRequest('/api/admin/plugins/google-business/posts');
      setPosts(data || []);
      setErrorMsg('');
    } catch (error: any) { setErrorMsg(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const openCreate = () => { setEditingPost(null); setForm(emptyForm()); setIsModalOpen(true); };

  const openEdit = (post: Post) => {
    setEditingPost(post);
    setForm({
      topicType: post.topicType || 'STANDARD',
      summary: post.summary || '',
      callToAction: post.callToAction?.actionType || 'ACTION_TYPE_UNSPECIFIED',
      actionUrl: post.callToAction?.url || '',
      eventTitle: post.event?.title || '',
      eventStartDate: post.event?.schedule?.startDate
        ? `${post.event.schedule.startDate.year}-${String(post.event.schedule.startDate.month).padStart(2,'0')}-${String(post.event.schedule.startDate.day).padStart(2,'0')}` : '',
      eventEndDate: post.event?.schedule?.endDate
        ? `${post.event.schedule.endDate.year}-${String(post.event.schedule.endDate.month).padStart(2,'0')}-${String(post.event.schedule.endDate.day).padStart(2,'0')}` : '',
      eventStartTime: post.event?.schedule?.startTime
        ? `${String(post.event.schedule.startTime.hours).padStart(2,'0')}:${String(post.event.schedule.startTime.minutes || 0).padStart(2,'0')}` : '',
      eventEndTime: post.event?.schedule?.endTime
        ? `${String(post.event.schedule.endTime.hours).padStart(2,'0')}:${String(post.event.schedule.endTime.minutes || 0).padStart(2,'0')}` : '',
      couponCode: post.offer?.couponCode || '',
      redeemUrl: post.offer?.redeemOnlineUrl || '',
      terms: post.offer?.termsConditions || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingPost(null); };

  const parseDate = (str: string) => {
    if (!str) return undefined;
    const [year, month, day] = str.split('-').map(Number);
    return { year, month, day };
  };

  const parseTime = (str: string) => {
    if (!str) return undefined;
    const [hours, minutes] = str.split(':').map(Number);
    return { hours, minutes: minutes || 0 };
  };

  const buildBody = () => {
    const base: any = {
      topicType: form.topicType,
      languageCode: 'tr',
      summary: form.summary,
      callToAction: form.callToAction !== 'ACTION_TYPE_UNSPECIFIED'
        ? { actionType: form.callToAction, url: form.actionUrl || undefined }
        : undefined,
    };
    if (form.topicType === 'EVENT') {
      base.event = {
        title: form.eventTitle,
        schedule: {
          startDate: parseDate(form.eventStartDate),
          endDate: parseDate(form.eventEndDate),
          ...(form.eventStartTime && { startTime: parseTime(form.eventStartTime) }),
          ...(form.eventEndTime && { endTime: parseTime(form.eventEndTime) }),
        },
      };
    }
    if (form.topicType === 'OFFER') {
      base.offer = {
        ...(form.couponCode && { couponCode: form.couponCode }),
        ...(form.redeemUrl && { redeemOnlineUrl: form.redeemUrl }),
        ...(form.terms && { termsConditions: form.terms }),
      };
    }
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = buildBody();
      if (editingPost) {
        await adminRequest('/api/admin/plugins/google-business/posts', {
          method: 'PATCH',
          body: JSON.stringify({ postName: editingPost.name, ...body }),
        });
      } else {
        await adminRequest('/api/admin/plugins/google-business/posts', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      closeModal();
      fetchPosts();
    } catch (e: any) { alert('Hata: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deletingPost) return;
    setSaving(true);
    try {
      await adminRequest('/api/admin/plugins/google-business/posts', {
        method: 'DELETE',
        body: JSON.stringify({ postName: deletingPost.name }),
      });
      setDeletingPost(null);
      fetchPosts();
    } catch (e: any) { alert('Silinemedi: ' + e.message); }
    finally { setSaving(false); }
  };

  const f = form;
  const setF = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  if (errorMsg) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-red-100">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Google Hesabınız Bağlı Değil</h2>
      <p className="text-gray-500 mb-6 text-center max-w-md">{errorMsg}</p>
      <a href="/admin/eklentiler" className="px-5 py-2.5 bg-primary text-white font-medium rounded-theme hover:bg-secondary">Eklentiler Sayfasına Git</a>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary" /> Google Yayınları (Posts)</h1>
          <p className="text-sm text-gray-500 mt-1">Google arama ve haritalarda görünecek yayın ve teklifler.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPosts} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-theme hover:bg-secondary">
            <PlusCircle className="w-5 h-5" /> Yeni Yayın
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex justify-center items-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Henüz yayın bulunmuyor</h3>
            <p className="text-gray-500 mb-4">İlk yayınınızı oluşturun, Google aramalarında öne çıkın.</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-theme hover:bg-secondary">
              <PlusCircle className="w-4 h-4" /> Yayın Oluştur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div key={post.name} className="border border-gray-100 rounded-xl p-5 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    post.topicType === 'EVENT' ? 'text-purple-700 bg-purple-50' :
                    post.topicType === 'OFFER' ? 'text-green-700 bg-green-50' :
                    'text-primary bg-primary/10'
                  }`}>{POST_TYPE_LABELS[post.topicType] || post.topicType}</span>
                  <span className="text-xs text-gray-400">{new Date(post.createTime).toLocaleDateString('tr-TR')}</span>
                </div>

                {/* EVENT info */}
                {post.event?.title && (
                  <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-lg mb-2 w-fit">
                    <Calendar className="w-3 h-3" /> {post.event.title}
                  </div>
                )}
                {/* OFFER info */}
                {post.offer?.couponCode && (
                  <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg mb-2 w-fit">
                    <Tag className="w-3 h-3" /> {post.offer.couponCode}
                  </div>
                )}

                <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 flex-1 mb-4">{post.summary}</p>

                {post.callToAction && post.callToAction.actionType !== 'ACTION_TYPE_UNSPECIFIED' && (
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                      {CTA_LABELS[post.callToAction.actionType] || post.callToAction.actionType}
                      {post.callToAction.url && <a href={post.callToAction.url} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a>}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 border-t border-gray-50 pt-3 mt-auto">
                  <button onClick={() => openEdit(post)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <Edit2 className="w-3.5 h-3.5" /> Düzenle
                  </button>
                  <button onClick={() => setDeletingPost(post)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                    <Trash2 className="w-3.5 h-3.5" /> Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editingPost ? 'Yayını Düzenle' : 'Yeni Google Yayını'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-4">
                {/* Yayın Türü */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yayın Türü</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: 'STANDARD', label: 'Haber', icon: '📢', color: 'border-primary bg-primary/5 text-primary' },
                      { v: 'EVENT', label: 'Etkinlik', icon: '📅', color: 'border-purple-500 bg-purple-50 text-purple-700' },
                      { v: 'OFFER', label: 'Teklif', icon: '🏷️', color: 'border-green-500 bg-green-50 text-green-700' },
                    ].map(({ v, label, icon, color }) => (
                      <button
                        key={v} type="button"
                        onClick={() => setF({ topicType: v })}
                        className={`flex flex-col items-center p-3 rounded-xl border-2 text-sm font-medium transition-all ${f.topicType === v ? color : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                        <span className="text-xl mb-1">{icon}</span> {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* İçerik */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İçerik Metni</label>
                  <textarea
                    value={f.summary} onChange={(e) => setF({ summary: e.target.value })}
                    rows={4} maxLength={1500} required
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                    placeholder="Müşterilerinize bir şeyler söyleyin..."
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{f.summary.length} / 1500</p>
                </div>

                {/* EVENT alanları */}
                {f.topicType === 'EVENT' && (
                  <div className="bg-purple-50 rounded-xl p-4 space-y-3 border border-purple-100">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Etkinlik Bilgileri</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Etkinlik Başlığı</label>
                      <input type="text" value={f.eventTitle} onChange={(e) => setF({ eventTitle: e.target.value })}
                        className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                        placeholder="Etkinlik adı..." required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Başlangıç Tarihi</label>
                        <input type="date" value={f.eventStartDate} onChange={(e) => setF({ eventStartDate: e.target.value })}
                          className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bitiş Tarihi</label>
                        <input type="date" value={f.eventEndDate} onChange={(e) => setF({ eventEndDate: e.target.value })}
                          className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Başlangıç Saati</label>
                        <input type="time" value={f.eventStartTime} onChange={(e) => setF({ eventStartTime: e.target.value })}
                          className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bitiş Saati</label>
                        <input type="time" value={f.eventEndTime} onChange={(e) => setF({ eventEndTime: e.target.value })}
                          className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* OFFER alanları */}
                {f.topicType === 'OFFER' && (
                  <div className="bg-green-50 rounded-xl p-4 space-y-3 border border-green-100">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Teklif Detayları</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kupon Kodu</label>
                      <input type="text" value={f.couponCode} onChange={(e) => setF({ couponCode: e.target.value })}
                        className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"
                        placeholder="ör: SAVE20, INDIRIM50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Online Kullanım URL</label>
                      <input type="url" value={f.redeemUrl} onChange={(e) => setF({ redeemUrl: e.target.value })}
                        className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"
                        placeholder="https://..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Şartlar ve Koşullar</label>
                      <textarea value={f.terms} onChange={(e) => setF({ terms: e.target.value })} rows={2}
                        className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none resize-none"
                        placeholder="Teklifin geçerlilik şartları..." />
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Eylem Butonu</label>
                    <select value={f.callToAction} onChange={(e) => setF({ callToAction: e.target.value })}
                      className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                      {Object.entries(CTA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  {f.callToAction !== 'ACTION_TYPE_UNSPECIFIED' && f.callToAction !== 'CALL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Buton URL</label>
                      <input type="url" value={f.actionUrl} onChange={(e) => setF({ actionUrl: e.target.value })}
                        className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                        placeholder="https://..." required />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">İptal</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary rounded-theme hover:bg-secondary disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingPost ? 'Güncelle' : 'Yayınla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Yayını sil?</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{deletingPost.summary}</p>
                <p className="text-xs text-red-500 mt-2">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingPost(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">İptal</button>
              <button onClick={handleDelete} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-theme hover:bg-red-700 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
