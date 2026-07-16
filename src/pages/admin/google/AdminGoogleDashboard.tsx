import { useState, useEffect } from 'react';
import { adminRequest } from '../../../lib/api';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Star, MessageSquareQuote, Megaphone, BarChart3,
  Loader2, ArrowRight, CheckCircle, AlertTriangle, Store,
  Search, Users, MousePointerClick, RefreshCw, TrendingUp
} from 'lucide-react';

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export default function AdminGoogleDashboard() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [insightsError, setInsightsError] = useState('');

  const [info, setInfo] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    setErrorMsg('');
    setInsightsError('');
    try {
      const [infoData, reviewsData, postsData, insightsData] = await Promise.allSettled([
        adminRequest('/api/admin/plugins/google-business/info'),
        adminRequest('/api/admin/plugins/google-business/reviews'),
        adminRequest('/api/admin/plugins/google-business/posts'),
        adminRequest('/api/admin/plugins/google-business/insights', { method: 'POST', body: JSON.stringify({ days: 30 }) }),
      ]);
      if (infoData.status === 'fulfilled') {
        if (infoData.value?.error === 'unauthorized') {
          setErrorMsg(infoData.value.message || 'Google Business yetkilendirmesi yapılmamış.');
        } else {
          setInfo(infoData.value);
        }
      } else {
        setErrorMsg((infoData.reason as any)?.message || 'Google Business verileri alınamadı.');
      }
      if (reviewsData.status === 'fulfilled') setReviews(reviewsData.value || []);
      if (postsData.status === 'fulfilled') setPosts(postsData.value || []);
      if (insightsData.status === 'fulfilled') {
        setInsights(insightsData.value?.locationMetrics?.[0]?.metricValues || []);
      } else {
        const msg = (insightsData.reason as any)?.message || '';
        if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('429')) {
          setInsightsError('Google API istek limiti aşıldı, istatistikler geçici olarak gösterilemiyor.');
        } else {
          setInsightsError('İstatistikler yüklenemedi.');
        }
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const getMetric = (name: string) => insights.find((x: any) => x.metric === name)?.totalValue?.value || 0;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + (STAR_MAP[r.starRating] || 0), 0) / reviews.length).toFixed(1) : '—';
  const unreplied = reviews.filter((r: any) => !r.reviewReply).length;
  const totalViews = getMetric('VIEWS_MAPS') + getMetric('VIEWS_SEARCH');
  const totalActions = getMetric('ACTIONS_WEBSITE') + getMetric('ACTIONS_PHONE') + getMetric('ACTIONS_DRIVING_DIRECTIONS');

  if (errorMsg && !loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-orange-100 max-w-md mx-auto mt-10">
      <AlertTriangle className="w-12 h-12 text-orange-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Google Hesabınız Bağlı Değil</h2>
      <p className="text-gray-500 mb-6 text-center text-xs px-6">{errorMsg}</p>
      <Link to="/admin/eklentiler" className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-secondary transition-all shadow-sm text-xs">Eklentiler Sayfasına Git</Link>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" /> Google İşletme Paneli
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {info?.title ? `${info.title} — ` : ''}Son 30 gün genel bakış
          </p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24 bg-white rounded-xl border border-gray-100">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-gray-500">Veriler yükleniyor...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Star, label: 'Ortalama Puan', value: avgRating, sub: `${reviews.length} yorum`, color: 'text-yellow-500', bg: 'bg-yellow-50' },
              { icon: MessageSquareQuote, label: 'Yanıtsız Yorum', value: unreplied, sub: `${reviews.length} toplam`, color: unreplied > 0 ? 'text-orange-600' : 'text-green-600', bg: unreplied > 0 ? 'bg-orange-50' : 'bg-green-50' },
              { icon: Users, label: 'Görüntülenme (30g)', value: totalViews.toLocaleString('tr-TR'), sub: 'Harita + Arama', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: MousePointerClick, label: 'Etkileşim (30g)', value: totalActions.toLocaleString('tr-TR'), sub: 'Web + Telefon + Yol', color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(({ icon: Icon, label, value, sub, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { to: '/admin/google/reviews', icon: MessageSquareQuote, label: 'Yorumları Yönet', color: 'text-primary', badge: unreplied > 0 ? unreplied : null },
              { to: '/admin/google/posts', icon: Megaphone, label: 'Yayınlar', color: 'text-purple-600', badge: posts.length },
              { to: '/admin/google/info', icon: Store, label: 'İşletme Bilgileri', color: 'text-green-600', badge: null },
              { to: '/admin/google/insights', icon: BarChart3, label: 'İstatistikler', color: 'text-orange-600', badge: null },
            ].map(({ to, icon: Icon, label, color, badge }) => (
              <Link key={to} to={to} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:border-primary hover:shadow-md transition-all group">
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {badge !== null && badge !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{badge}</span>
                  )}
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          {/* Son yorumlar + son yayınlar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Son yorumlar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><MessageSquareQuote className="w-4 h-4 text-primary" /> Son Yorumlar</h3>
                <Link to="/admin/google/reviews" className="text-xs text-primary hover:underline flex items-center gap-1">Tümü <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Henüz yorum yok.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 4).map((review: any) => (
                    <div key={review.name} className="flex items-start gap-3">
                      <img src={review.reviewer.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.reviewer.displayName)}&background=e5e7eb&color=374151&size=40`}
                        alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100 shrink-0" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-gray-800 truncate">{review.reviewer.displayName}</span>
                          <div className="flex gap-0.5 shrink-0">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < (STAR_MAP[review.starRating] || 0) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">{review.comment || 'Yazılı yorum yok.'}</p>
                      </div>
                      <div className="shrink-0">
                        {review.reviewReply
                          ? <CheckCircle className="w-4 h-4 text-green-500" />
                          : <AlertTriangle className="w-4 h-4 text-orange-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Son yayınlar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Megaphone className="w-4 h-4 text-purple-600" /> Son Yayınlar</h3>
                <Link to="/admin/google/posts" className="text-xs text-primary hover:underline flex items-center gap-1">Tümü <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {posts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">Henüz yayın yok.</p>
                  <Link to="/admin/google/posts" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary/5">
                    <Megaphone className="w-3.5 h-3.5" /> İlk Yayını Oluştur
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 4).map((post: any) => (
                    <div key={post.name} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                        post.topicType === 'EVENT' ? 'text-purple-700 bg-purple-50' :
                        post.topicType === 'OFFER' ? 'text-green-700 bg-green-50' :
                        'text-primary bg-primary/10'
                      }`}>{post.topicType === 'EVENT' ? '📅' : post.topicType === 'OFFER' ? '🏷️' : '📢'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 line-clamp-2">{post.summary}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(post.createTime).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Insight özet bar */}
          {insightsError ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-orange-800">İstatistikler Yüklenemedi</h4>
                <p className="text-xs text-orange-750 mt-1">{insightsError}</p>
              </div>
            </div>
          ) : insights.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Son 30 Gün Özeti
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: 'VIEWS_MAPS', label: 'Harita Görüntülenme', icon: '🗺️' },
                  { key: 'VIEWS_SEARCH', label: 'Arama Görüntülenme', icon: '🔍' },
                  { key: 'ACTIONS_WEBSITE', label: 'Web Tıklaması', icon: '🌐' },
                  { key: 'ACTIONS_PHONE', label: 'Telefon Tıklaması', icon: '📞' },
                  { key: 'ACTIONS_DRIVING_DIRECTIONS', label: 'Yol Tarifi', icon: '📍' },
                  { key: 'QUERIES_DIRECT', label: 'Doğrudan Arama', icon: '🎯' },
                ].map(({ key, label, icon }) => (
                  <div key={key} className="text-center p-3 rounded-xl bg-gray-50">
                    <div className="text-xl mb-1">{icon}</div>
                    <p className="text-lg font-bold text-gray-900">{getMetric(key).toLocaleString('tr-TR')}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right">
                <Link to="/admin/google/insights" className="text-xs text-primary hover:underline flex items-center gap-1 justify-end">
                  Tüm istatistikler <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
