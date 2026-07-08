import { useEffect, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumb';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin, Clock, List } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchBlogPost, fetchBlogPosts } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import { mediaUrl } from '../../lib/media';

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [others, setOthers] = useState<any[]>([]);

  usePageTitle(post?.title || '');

  useEffect(() => {
    if(!slug) return;
    setLoading(true);
    fetchBlogPost(slug)
      .then(res => setPost(res))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
      
    // Fetch others
    fetchBlogPosts().then(res => setOthers(res.filter((p: any) => p.slug !== slug)));
  }, [slug]);

  const getReadTime = (text: string) => {
    if (!text) return '3 dk okuma';
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200) || 3;
    return `${minutes} dk okuma`;
  };

  const toc = post?.content 
    ? (post.content.match(/^###?\s+(.+)$/gm) || []).map((h: string) => h.replace(/^###?\s+/, ''))
    : [];

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = encodeURIComponent(post?.title || '');
    if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?url=${url}&text=${title}`, '_blank');
    if (platform === 'linkedin') window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`, '_blank');
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      alert('Bağlantı kopyalandı!'); // using alert for quick feedback as requested in previous guidelines when UI is not strictly needed, but let's use a nice subtle way if possible.
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex flex-col justify-center items-center">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-500 font-medium">Makale yükleniyor, lütfen bekleyiniz...</p>
    </div>;
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">İçerik Bulunamadı</h1>
        <p className="text-gray-600 mb-6">Aradığınız blog yazısı mevcut değil veya yayından kaldırılmış olabilir.</p>
        <Link to="/blog" className="bg-primary text-white px-6 py-2 rounded-theme font-medium hover:bg-secondary transition">
          Blog'a Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb className="mb-6" items={[{ label: 'Anasayfa', href: '/' }, { label: 'Medya & Blog', href: '/blog' }, { label: post.title }]} />
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center text-sm text-gray-500 gap-4 font-medium mb-4">
            <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-gray-700">
              {post.category || 'Haber'}
            </span>
            <span className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> {new Date(post.createdAt).toLocaleDateString()}</span>
            <span className="flex items-center"><User className="w-4 h-4 mr-2" /> Admin</span>
            <span className="flex items-center"><Clock className="w-4 h-4 mr-2" /> {getReadTime(post.content || post.excerpt)}</span>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-16 flex flex-col md:flex-row gap-12">
        <div className="md:w-3/4 prose prose-lg prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-primary hover:prose-a:text-secondary prose-img:rounded-theme text-justify leading-relaxed">
          <img
            src={mediaUrl(post.imageUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b', 1000)}
            alt={post.title}
            className="w-full rounded-3xl object-cover aspect-video mb-10 shadow-lg border border-gray-100"
            loading="lazy"
          />
          {post.content && post.content.length > 50 ? (
            <ReactMarkdown>{post.content}</ReactMarkdown>
          ) : (
            <>
              <p className="lead font-medium text-gray-700">{post.content}</p>
              <p>Modern iş dünyasında, işletmelerin bilişim teknolojileri (BT) altyapılarını güncel, ölçeklenebilir ve güvenli tutmaları sürdürülebilir başarı için kritik bir zorunluluktur. Teknolojik yenilikleri yakından takip etmek, operasyonel verimliliği artırmanın yanı sıra siber tehditlere karşı da en üst düzeyde koruma kalkanı oluşturur.</p>
              <h3>Neden Profesyonel BT Yönetimi ve SLA Desteği Önemli?</h3>
              <p>Birçok organizasyon temel BT gereksinimlerini kendi bünyesinde çözmeye çalışsa da; sunucu entegrasyonları, hibrit bulut geçişleri, siber güvenlik mimarisi ve felaket kurtarma senaryoları gibi süreçler derin bir uzmanlık gerektirir. Profesyonel bir BT çözüm ortağı ile çalışmanın avantajları şunlardır:</p>
              <ul>
                <li>Sistem kesintilerini (downtime) sıfıra yakın seviyelere indirir ve iş sürekliliğini korur.</li>
                <li>Yedekli ve proaktif altyapı yönetimi sayesinde beklenmedik arıza maliyetlerini engeller.</li>
                <li>KVKK, GDPR ve diğer uluslararası veri güvenliği regülasyonlarına tam uyumluluk sağlar.</li>
              </ul>
              <p>Kerim Bilgisayar olarak, global teknoloji liderleriyle (Microsoft, Google, Hikvision, Ruijie) yürüttüğümüz stratejik ortaklıklar sayesinde, organizasyonunuza en uygun BT yol haritasını çiziyoruz. Potansiyel sistem hatalarını sorun oluşmadan önce tespit eden proaktif bakım anlaşmalarımız (SLA) ile ana faaliyet alanınıza odaklanmanız için güvenli bir zemin hazırlıyoruz.</p>
            </>
          )}
        </div>

        {/* Sidebar Sharing & Categories */}
        <aside className="md:w-1/4 pt-2">
          <div className="sticky top-24">
            <h4 className="font-bold text-gray-900 mb-4 text-sm tracking-wider uppercase border-b border-gray-100 pb-2">Paylaş</h4>
            <div className="flex space-x-3 mb-10">
              <button onClick={() => handleShare('linkedin')} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-primary hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <Linkedin className="w-4 h-4" />
              </button>
              <button onClick={() => handleShare('twitter')} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-400 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <Twitter className="w-4 h-4" />
              </button>
              <button onClick={() => handleShare('facebook')} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-800 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <Facebook className="w-4 h-4" />
              </button>
              <button onClick={() => handleShare('copy')} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-100 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
            
            {toc.length > 0 && (
              <div className="mb-10 bg-white border border-gray-100 rounded-theme p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 text-sm tracking-wider uppercase flex items-center gap-2"><List className="w-4 h-4 text-primary" /> İçindekiler</h4>
                <ul className="space-y-3 text-sm">
                  {toc.map((heading: string, idx: number) => (
                    <li key={idx}>
                      <span className="text-gray-600 font-medium">{heading}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <h4 className="font-bold text-gray-900 mb-4 text-sm tracking-wider uppercase border-b border-gray-100 pb-2">Diğer Yazılar</h4>
            <ul className="space-y-3 text-sm">
              {others.slice(0, 3).map((p: any) => (
                 <li key={p.id}>
                    <Link to={`/blog/${p.slug}`} className="text-gray-600 hover:text-primary font-medium transition-colors hover:translate-x-1 inline-block transform duration-200 truncate w-full">
                      {p.title}
                    </Link>
                 </li>
              ))}
            </ul>
             <div className="mt-12 bg-green-50 p-6 rounded-theme border border-green-100">
                <h4 className="font-bold text-gray-900 mb-3">Uzman Danışmanlığı</h4>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">Makaledeki konular veya kurumsal altyapı projeleriniz hakkında teknik danışmanlarımızdan destek almak için hemen iletişime geçin.</p>
                <Link to="/iletisim" className="block text-center w-full bg-green-600 text-white font-semibold py-2.5 rounded-theme hover:bg-green-700 transition-colors">Stratejik Destek Alın</Link>
             </div>
          </div>
        </aside>
      </article>

      {/* Footer Call to Action */}
      <div className="bg-gray-50 border-t border-gray-200 py-16">
         <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">BT Altyapınızı Kurumsal Düzeyde Modernize Edin</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
               Makalede paylaştığımız teknolojik standartları işletmenizde hayata geçirmek için bizimle irtibata geçin. Entegre bilişim çözümleri ve SLA destek planlarımızla yanınızdayız.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
               <Link to="/hizmetler" className="bg-white border border-gray-300 text-gray-800 font-bold py-3.5 px-8 rounded-theme shadow-sm hover:bg-gray-50 transition-colors">Çözümlerimizi İnceleyin</Link>
               <Link to="/randevu" className="bg-green-600 text-white font-bold py-3.5 px-8 rounded-theme shadow-md hover:bg-green-700 transition-colors">Talep / Randevu Oluşturun</Link>
            </div>
         </div>
      </div>
    </div>
  );
}
