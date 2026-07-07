import { useState, useEffect } from 'react';
import { adminRequest } from '../../../lib/api';
import { PlusCircle, Megaphone, Calendar, Tag, Trash2, Edit2, Loader2, Image as ImageIcon } from 'lucide-react';

export default function AdminGooglePosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Post states
  const [postType, setPostType] = useState('STANDARD'); // STANDARD, EVENT, OFFER
  const [summary, setSummary] = useState('');
  const [callToAction, setCallToAction] = useState('ACTION_TYPE_UNSPECIFIED');
  const [actionUrl, setActionUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const fetchPosts = async () => {
    try {
      const data = await adminRequest('/api/admin/plugins/google-business/posts');
      setPosts(data || []);
      setErrorMsg('');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const postBody = {
        topicType: postType,
        languageCode: 'tr',
        summary,
        callToAction: callToAction !== 'ACTION_TYPE_UNSPECIFIED' ? {
          actionType: callToAction,
          url: actionUrl
        } : undefined
      };
      
      await adminRequest('/api/admin/plugins/google-business/posts', {
        method: 'POST',
        body: JSON.stringify(postBody)
      });
      
      setIsModalOpen(false);
      fetchPosts();
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setLoading(false);
    }
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
            <Megaphone className="w-6 h-6 text-primary" />
            Google Yayınları (Posts)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Google arama sonuçlarında ve haritalarda görünecek yayınlar ve teklifler oluşturun.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-theme hover:bg-secondary transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          Yeni Yayın Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz yayın bulunmuyor</h3>
            <p className="text-gray-500">Müşterilerinizi yeniliklerden haberdar etmek için ilk yayınınızı oluşturun.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: any, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                      {post.topicType}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(post.createTime).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3 mb-4">{post.summary}</p>
                  
                  {post.callToAction && (
                    <a href={post.callToAction.url} target="_blank" rel="noreferrer" className="block text-center w-full py-2 bg-gray-50 text-primary font-medium text-sm rounded-theme hover:bg-gray-100">
                      {post.callToAction.actionType}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Yeni Google Yayını</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yayın Türü</label>
                  <select 
                    value={postType} 
                    onChange={(e) => setPostType(e.target.value)}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="STANDARD">Haber / Güncelleme (Standart)</option>
                    <option value="OFFER">Teklif / İndirim</option>
                    <option value="EVENT">Etkinlik</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İçerik Metni</label>
                  <textarea 
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Müşterilerinize işletmenizle ilgili yeni bir şeyler söyleyin..."
                    required
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">Maksimum 1500 karakter.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buton Türü (İsteğe Bağlı)</label>
                    <select 
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="ACTION_TYPE_UNSPECIFIED">Buton Yok</option>
                      <option value="BOOK">Rezervasyon Yap</option>
                      <option value="ORDER">Sipariş Ver</option>
                      <option value="SHOP">Satın Al</option>
                      <option value="LEARN_MORE">Daha Fazla Bilgi</option>
                      <option value="SIGN_UP">Kaydol</option>
                      <option value="CALL">Şimdi Ara</option>
                    </select>
                  </div>
                  {callToAction !== 'ACTION_TYPE_UNSPECIFIED' && callToAction !== 'CALL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Buton URL'si</label>
                      <input 
                        type="url"
                        value={actionUrl}
                        onChange={(e) => setActionUrl(e.target.value)}
                        className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                        placeholder="https://..."
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 flex justify-end gap-3 border-t border-gray-100 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-theme hover:bg-gray-50"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-theme hover:bg-secondary disabled:opacity-50"
                >
                  {loading ? 'Yayınlanıyor...' : 'Yayınla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
