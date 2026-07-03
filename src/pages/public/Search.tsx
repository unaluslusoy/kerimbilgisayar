import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, FileText, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { usePageTitle } from '../../lib/usePageTitle';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  usePageTitle(`"${query}" için arama sonuçları`);

  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<{
    services: any[];
    blog: any[];
    pages: any[];
  }>({ services: [], blog: [], pages: [] });

  useEffect(() => {
    if (!query) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`/api/public/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        setResults(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [query]);

  const totalResults = (results.services?.length || 0) + (results.blog?.length || 0) + (results.pages?.length || 0);

  return (
    <div className="min-h-screen bg-gray-50 pt-[140px] pb-24">
      <div className="max-w-4xl mx-auto px-6 sm:px-10 lg:px-16">
        
        {/* Search Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Arama Sonuçları</h1>
          <form className="relative flex items-center" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const q = formData.get('q') as string;
            if(q) setSearchParams({ q });
          }}>
            <SearchIcon className="absolute left-4 text-gray-400 w-6 h-6" />
            <input 
              name="q"
              defaultValue={query}
              type="text" 
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-32 text-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
              placeholder="Site içinde tekrar arayın..."
            />
            <button type="submit" className="absolute right-2 px-6 py-2 bg-primary text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
              Ara
            </button>
          </form>
          {query && !isLoading && (
            <p className="text-gray-500 mt-4 font-medium">
              "{query}" için toplam {totalResults} sonuç bulundu.
            </p>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary"></div>
          </div>
        ) : totalResults === 0 && query ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sonuç bulunamadı</h3>
            <p className="text-gray-500">Aradığınız kriterlere uygun içerik sitemizde bulunmamaktadır. Lütfen farklı kelimelerle tekrar deneyin.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Services */}
            {results.services && results.services.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Layers className="w-6 h-6 text-primary" /> Çözümlerimiz & Hizmetler
                </h2>
                <div className="grid gap-4">
                  {results.services.map(item => (
                    <Link to={`/hizmetler/${item.slug}`} key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">{item.title}</h3>
                        <p className="text-gray-600 mt-1 line-clamp-1">{item.shortDesc}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Blog Posts */}
            {results.blog && results.blog.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-primary" /> Blog & Medya
                </h2>
                <div className="grid gap-4">
                  {results.blog.map(item => (
                    <Link to={`/blog/${item.slug}`} key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">{item.title}</h3>
                        <p className="text-gray-600 mt-1 line-clamp-1">{item.shortDesc}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pages */}
            {results.pages && results.pages.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-primary" /> Kurumsal Sayfalar
                </h2>
                <div className="grid gap-4">
                  {results.pages.map(item => (
                    <Link to={`/${item.slug}`} key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">{item.title}</h3>
                        <p className="text-gray-600 mt-1 line-clamp-1">{item.shortDesc?.replace(/<[^>]+>/g, '').substring(0, 100)}...</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
