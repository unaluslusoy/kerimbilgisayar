import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Tag, Search, TrendingUp, X, Clock } from 'lucide-react';
import { fetchBlogPosts } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';
import { mediaUrl } from '../../lib/media';

const POPULAR_TAGS = [
  "Bilişim Teknolojileri", "Kurumsal SLA Desteği", "Ağ Entegrasyonu",
  "Veri Kurtarma ve Analiz", "KVKK/GDPR Uyum", "Kurumsal E-Ticaret Yazılımı",
  "CCTV Kamera Çözümleri", "Ruijie Switch", "Hikvision Partner"
];

export default function BlogList() {
  usePageTitle('Blog & Teknoloji Rehberi');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchBlogPosts()
      .then(res => setPosts(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Unique categories from posts
  const categories = useMemo(() => {
    const cats = posts.map(p => p.category).filter(Boolean);
    return Array.from(new Set(cats)) as string[];
  }, [posts]);

  // Filtered posts based on search, active tag, and category
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activeCategory) {
      result = result.filter(p => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }
    if (activeTag) {
      const tag = activeTag.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(tag) ||
        p.excerpt?.toLowerCase().includes(tag) ||
        p.category?.toLowerCase().includes(tag) ||
        p.content?.toLowerCase().includes(tag)
      );
    }
    return result;
  }, [posts, searchQuery, activeTag, activeCategory]);

  const handleTagClick = (tag: string) => {
    setActiveTag(prev => prev === tag ? null : tag);
    setSearchQuery('');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTag(null);
    setActiveCategory(null);
  };

  const hasFilters = searchQuery.trim() || activeTag || activeCategory;

  const getReadTime = (text: string) => {
    if (!text) return '3 dk okuma';
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200) || 3;
    return `${minutes} dk okuma`;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2 font-medium">
            <Link to="/" className="hover:text-primary transition-colors">Anasayfa</Link>
            <span>&gt;</span>
            <span className="text-gray-900">Medya & Blog</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Teknoloji &amp; Bilişim Güncesi
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            Kurumsal ağ mimarisi, siber güvenlik stratejileri, bulut çözümleri ve sektörel dijital dönüşüm analizleri.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content Area */}
          <div className="lg:w-3/4">
            {/* Category Filter Bar */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    !activeCategory ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Tümü ({posts.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      activeCategory === cat ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat} ({posts.filter(p => p.category === cat).length})
                  </button>
                ))}
              </div>
            )}
            {/* Active filter indicator */}
            {hasFilters && (
              <div className="mb-6 flex items-center gap-3 text-sm text-gray-600 bg-white border border-gray-200 rounded-theme px-4 py-3">
                <Search className="w-4 h-4 text-primary" />
                {searchQuery && <span>Arama: <strong>"{searchQuery}"</strong></span>}
                {activeTag && <span>Etiket: <strong>#{activeTag}</strong></span>}
                <span className="text-gray-400">— {filteredPosts.length} sonuç</span>
                <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-sm">
                  <X className="w-4 h-4" /> Temizle
                </button>
              </div>
            )}

            {loading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-theme border border-gray-200 overflow-hidden flex flex-col md:flex-row h-48">
                    <div className="md:w-2/5 skeleton"></div>
                    <div className="p-6 flex-1 space-y-3">
                      <div className="skeleton h-4 w-1/4 rounded"></div>
                      <div className="skeleton h-6 w-3/4 rounded"></div>
                      <div className="skeleton h-4 w-full rounded"></div>
                      <div className="skeleton h-4 w-2/3 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-theme border border-dashed border-gray-200">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {hasFilters ? 'Sonuç Bulunamadı' : 'Henüz Blog Yazısı Yok'}
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  {hasFilters
                    ? 'Arama kriterlerinize uygun blog yazısı bulunamadı. Farklı bir arama deneyin.'
                    : 'Henüz blog yazısı bulunmamaktadır. Yakında içerikler eklenecek.'
                  }
                </p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-4 text-primary hover:text-secondary font-semibold transition-colors">
                    Tüm yazıları göster
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {filteredPosts.map((post) => (
                  <article key={post.id} className="bg-white rounded-theme shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all group flex flex-col md:flex-row">
                    <div className="md:w-2/5 shrink-0 overflow-hidden relative h-56 md:h-auto">
                      <img
                        src={mediaUrl(post.imageUrl) || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80'}
                        alt={post.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        {post.category || 'Rehber'}
                      </div>
                    </div>
                    <div className="p-6 md:w-3/5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center text-xs text-gray-500 space-x-4 mb-3 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {getReadTime(post.content || post.excerpt || '')}
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-primary transition-colors">
                          <Link to={`/blog/${post.slug}`} className="focus:outline-none">
                            {post.title}
                          </Link>
                        </h2>
                        <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                      </div>
                      <div className="flex items-center font-semibold text-primary text-sm gap-1">
                        <Link to={`/blog/${post.slug}`}>Devamını Oku</Link>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-1/4">
            <div className="sticky top-28 space-y-8">
              {/* Search Widget */}
              <div className="bg-white p-6 rounded-theme shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" /> Arama Yap
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Blogda ara..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setActiveTag(null); }}
                    className="w-full pl-4 pr-10 py-3 rounded-theme border border-gray-200 focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50 focus:bg-white transition-colors outline-none"
                  />
                  {searchQuery ? (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  ) : (
                    <Search className="absolute right-3 top-3 w-5 h-5 text-gray-300" />
                  )}
                </div>
              </div>

              {/* Tags Widget */}
              <div className="bg-white p-6 rounded-theme shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" /> Popüler Etiketler
                </h3>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTagClick(tag)}
                      className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-theme cursor-pointer transition-colors border ${
                        activeTag === tag
                          ? 'bg-primary text-white border-primary'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-primary hover:bg-primary/5 hover:border-primary/30'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA Widget */}
              <div className="bg-primary p-6 rounded-theme shadow-md text-white">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-white/70" /> SLA &amp; Kurumsal IT Desteği
                </h3>
                <p className="text-white/80 text-sm leading-relaxed mb-6">
                  Proaktif altyapı yönetimi, 7/24 SLA destek hizmetleri ve periyodik sistem denetimleri için uzman mühendislerimizle iletişime geçin.
                </p>
                <Link to="/iletisim" className="block text-center w-full bg-white text-primary font-bold py-3 rounded-theme hover:bg-gray-50 transition-colors">
                  Hemen Bize Ulaşın
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
