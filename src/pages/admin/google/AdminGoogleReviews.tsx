import { useState, useEffect } from 'react';
import { adminRequest } from '../../../lib/api';
import { MessageSquareQuote, Star, Loader2, Send, Clock, Reply } from 'lucide-react';

export default function AdminGoogleReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Reply states
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchReviews = async () => {
    try {
      const data = await adminRequest('/api/admin/plugins/google-business/reviews');
      setReviews(data || []);
      setErrorMsg('');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleReply = async (reviewName: string) => {
    if (!replyText.trim()) return;
    
    setSendingReply(true);
    try {
      await adminRequest('/api/admin/plugins/google-business/reviews/reply', {
        method: 'PUT',
        body: JSON.stringify({ reviewName, comment: replyText })
      });
      
      setReplyingTo(null);
      setReplyText('');
      fetchReviews(); // Refresh to show the new reply
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setSendingReply(false);
    }
  };

  const renderStars = (rating: string) => {
    const starCount = rating === 'FIVE' ? 5 : rating === 'FOUR' ? 4 : rating === 'THREE' ? 3 : rating === 'TWO' ? 2 : 1;
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < starCount ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'}`} />
        ))}
      </div>
    );
  };

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-red-100">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Google Hesabınız Bağlı Değil</h2>
        <p className="text-gray-500 mb-6 max-w-md text-center">{errorMsg}</p>
        <a href="/admin/eklentiler" className="px-5 py-2.5 bg-primary text-white font-medium rounded-theme hover:bg-secondary transition-colors">
          Eklentiler Sayfasına Git
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquareQuote className="w-6 h-6 text-primary" />
            Google Yorumları
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Google Haritalar üzerinden yapılan müşteri yorumlarını görün ve anında yanıtlayın.
          </p>
        </div>
        <div className="px-4 py-2 bg-white border border-gray-200 rounded-theme shadow-sm text-sm font-medium text-gray-700">
          Toplam Yorum: {reviews.length}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquareQuote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz yorum bulunmuyor</h3>
            <p className="text-gray-500">Müşterilerinizden gelen yeni yorumlar burada listelenecektir.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review: any) => (
              <div key={review.name} className="border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={review.reviewer.profilePhotoUrl || 'https://via.placeholder.com/48'} 
                      alt={review.reviewer.displayName} 
                      className="w-12 h-12 rounded-full object-cover border border-gray-100"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">{review.reviewer.displayName}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        {renderStars(review.starRating)}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(review.createTime).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  {review.comment || <span className="text-gray-400 italic">Yazılı yorum bırakılmamış.</span>}
                </p>

                {/* İşletme Sahibi Yanıtı (Varsa) */}
                {review.reviewReply ? (
                  <div className="bg-gray-50 rounded-lg p-4 ml-8 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Reply className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm text-gray-900">İşletme Yanıtınız</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(review.reviewReply.updateTime).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{review.reviewReply.comment}</p>
                    
                    <button 
                      onClick={() => {
                        setReplyingTo(review.name);
                        setReplyText(review.reviewReply.comment);
                      }}
                      className="text-xs text-primary font-medium mt-3 hover:underline"
                    >
                      Yanıtı Düzenle
                    </button>
                  </div>
                ) : (
                  <div className="ml-8 mt-2">
                    {replyingTo === review.name ? (
                      <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                        <textarea 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none mb-3"
                          placeholder="Müşteriye açık yanıtınızı yazın..."
                          autoFocus
                        ></textarea>
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setReplyingTo(null)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-theme hover:bg-gray-50"
                          >
                            İptal
                          </button>
                          <button 
                            onClick={() => handleReply(review.name)}
                            disabled={sendingReply || !replyText.trim()}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-theme hover:bg-secondary disabled:opacity-50"
                          >
                            {sendingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Yanıtı Gönder
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setReplyingTo(review.name);
                          setReplyText('');
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-secondary transition-colors"
                      >
                        <Reply className="w-4 h-4" />
                        Yanıtla
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
