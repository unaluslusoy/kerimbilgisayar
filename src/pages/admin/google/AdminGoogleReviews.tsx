import { useState, useEffect, useMemo } from 'react';
import { adminRequest } from '../../../lib/api';
import {
  MessageSquareQuote, Star, Loader2, Send, Clock, Reply, Trash2, Edit2,
  AlertTriangle, RefreshCw, X, CheckCircle, Filter, ChevronDown
} from 'lucide-react';

interface Review {
  name: string;
  starRating: string;
  comment?: string;
  createTime: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  reviewReply?: { comment: string; updateTime: string };
}

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

type FilterType = 'all' | 'replied' | 'unreplied';
type SortType = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function AdminGoogleReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingReplyFor, setDeletingReplyFor] = useState<Review | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await adminRequest('/api/admin/plugins/google-business/reviews');
      setReviews(data || []);
      setErrorMsg('');
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, []);

  const startReply = (review: Review) => {
    setReplyingTo(review.name);
    setReplyText(review.reviewReply?.comment || '');
  };

  const handleSendReply = async (reviewName: string) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await adminRequest('/api/admin/plugins/google-business/reviews/reply', {
        method: 'PUT',
        body: JSON.stringify({ reviewName, comment: replyText }),
      });
      setReplyingTo(null);
      setReplyText('');
      showToast('Yanıt başarıyla gönderildi.');
      fetchReviews();
    } catch (e: any) { showToast('Gönderilemedi: ' + e.message, 'error'); }
    finally { setSending(false); }
  };

  const handleDeleteReply = async () => {
    if (!deletingReplyFor) return;
    setSending(true);
    try {
      await adminRequest('/api/admin/plugins/google-business/reviews/reply', {
        method: 'DELETE',
        body: JSON.stringify({ reviewName: deletingReplyFor.name }),
      });
      setDeletingReplyFor(null);
      showToast('Yanıt silindi.');
      fetchReviews();
    } catch (e: any) { showToast('Silinemedi: ' + e.message, 'error'); }
    finally { setSending(false); }
  };

  const renderStars = (rating: string, size = 'w-4 h-4') => {
    const count = STAR_MAP[rating] || 0;
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`${size} ${i < count ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'}`} />
        ))}
      </div>
    );
  };

  const displayedReviews = useMemo(() => {
    let list = [...reviews];
    if (filter === 'replied') list = list.filter(r => r.reviewReply);
    if (filter === 'unreplied') list = list.filter(r => !r.reviewReply);
    if (ratingFilter !== null) list = list.filter(r => (STAR_MAP[r.starRating] || 0) === ratingFilter);
    list.sort((a, b) => {
      if (sort === 'newest') return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
      if (sort === 'oldest') return new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
      if (sort === 'highest') return (STAR_MAP[b.starRating] || 0) - (STAR_MAP[a.starRating] || 0);
      if (sort === 'lowest') return (STAR_MAP[a.starRating] || 0) - (STAR_MAP[b.starRating] || 0);
      return 0;
    });
    return list;
  }, [reviews, filter, sort, ratingFilter]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (STAR_MAP[r.starRating] || 0), 0) / reviews.length).toFixed(1) : '—';
  const repliedCount = reviews.filter(r => r.reviewReply).length;
  const ratingDist = [5, 4, 3, 2, 1].map(n => ({ n, count: reviews.filter(r => (STAR_MAP[r.starRating] || 0) === n).length }));

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
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><MessageSquareQuote className="w-6 h-6 text-primary" /> Google Yorumları</h1>
          <p className="text-sm text-gray-500 mt-1">Müşteri yorumlarını görün ve anında yanıtlayın.</p>
        </div>
        <button onClick={fetchReviews} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Yenile
        </button>
      </div>

      {!loading && reviews.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Toplam Yorum</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">{avgRating} ★</p>
              <p className="text-xs text-gray-500 mt-0.5">Ortalama Puan</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{repliedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Yanıtlanan</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{reviews.length - repliedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Yanıtsız</p>
            </div>
          </div>

          {/* Rating distribution + filters */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              {/* Rating bars */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Puana Göre:</span>
                <button onClick={() => setRatingFilter(null)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${ratingFilter === null ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Tümü
                </button>
                {ratingDist.map(({ n, count }) => (
                  <button key={n} onClick={() => setRatingFilter(ratingFilter === n ? null : n)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-all ${ratingFilter === n ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {n} <Star className="w-3 h-3 fill-current" /> ({count})
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sırala:</span>
                <div className="relative">
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortType)}
                    className="pl-3 pr-8 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer">
                    <option value="newest">En Yeni</option>
                    <option value="oldest">En Eski</option>
                    <option value="highest">En Yüksek Puan</option>
                    <option value="lowest">En Düşük Puan</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Reply filter tabs */}
            <div className="flex gap-1 mt-3 pt-3 border-t border-gray-50">
              {([['all', 'Tümü'], ['unreplied', 'Yanıtsız'], ['replied', 'Yanıtlandı']] as [FilterType, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${filter === v ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {l}
                  {v === 'unreplied' && reviews.length - repliedCount > 0 && (
                    <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{reviews.length - repliedCount}</span>
                  )}
                </button>
              ))}
              <span className="ml-auto text-xs text-gray-400 self-center">{displayedReviews.length} yorum gösteriliyor</span>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex justify-center items-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquareQuote className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Henüz yorum bulunmuyor</h3>
            <p className="text-gray-500">Yeni yorumlar burada listelenecektir.</p>
          </div>
        ) : displayedReviews.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Bu filtreyle eşleşen yorum yok.</p>
            <button onClick={() => { setFilter('all'); setRatingFilter(null); }} className="mt-3 text-sm text-primary hover:underline">Filtreleri temizle</button>
          </div>
        ) : (
          <div className="space-y-5">
            {displayedReviews.map((review) => (
              <div key={review.name} className="border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={review.reviewer.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.reviewer.displayName)}&background=e5e7eb&color=374151`}
                      alt={review.reviewer.displayName} className="w-11 h-11 rounded-full object-cover border border-gray-100" referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{review.reviewer.displayName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {renderStars(review.starRating)}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(review.createTime).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.reviewReply
                    ? <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Yanıtlandı</span>
                    : <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">Yanıtsız</span>
                  }
                </div>

                {review.comment
                  ? <p className="text-sm text-gray-700 leading-relaxed mb-4 pl-14">{review.comment}</p>
                  : <p className="text-sm text-gray-400 italic mb-4 pl-14">Yazılı yorum bırakılmamış.</p>
                }

                {/* Existing reply */}
                {review.reviewReply && replyingTo !== review.name && (
                  <div className="ml-14 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Reply className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-gray-800">İşletme Yanıtı</span>
                        <span className="text-xs text-gray-400 ml-1">{new Date(review.reviewReply.updateTime).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startReply(review)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-primary px-2 py-1 rounded-lg hover:bg-white transition-colors">
                          <Edit2 className="w-3 h-3" /> Düzenle
                        </button>
                        <button onClick={() => setDeletingReplyFor(review)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3 h-3" /> Sil
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{review.reviewReply.comment}</p>
                  </div>
                )}

                {/* Reply textarea */}
                {replyingTo === review.name ? (
                  <div className="ml-14 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Reply className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-gray-800">{review.reviewReply ? 'Yanıtı Düzenle' : 'Yanıt Yaz'}</span>
                    </div>
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} autoFocus
                      className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none mb-3 resize-none"
                      placeholder="Müşteriye açık yanıtınızı yazın..." />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">
                        <X className="w-3 h-3" /> İptal
                      </button>
                      <button onClick={() => handleSendReply(review.name)} disabled={sending || !replyText.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-theme hover:bg-secondary disabled:opacity-50">
                        {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        {review.reviewReply ? 'Güncelle' : 'Gönder'}
                      </button>
                    </div>
                  </div>
                ) : !review.reviewReply && (
                  <div className="ml-14 mt-1">
                    <button onClick={() => startReply(review)} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-secondary transition-colors">
                      <Reply className="w-4 h-4" /> Yanıtla
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Reply Confirm */}
      {deletingReplyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Yanıtı sil?</h3>
                <p className="text-sm text-gray-500">{deletingReplyFor.reviewer.displayName} yorumuna verdiğiniz yanıt silinecek.</p>
                <p className="text-xs text-red-500 mt-2">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingReplyFor(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-theme hover:bg-gray-50">İptal</button>
              <button onClick={handleDeleteReply} disabled={sending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-theme hover:bg-red-700 disabled:opacity-50">
                {sending && <Loader2 className="w-4 h-4 animate-spin" />} Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
