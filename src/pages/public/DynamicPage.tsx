import { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { fetchPublicPage } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  usePageTitle(page?.metaTitle || page?.title || '');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchPublicPage(slug)
      .then(data => {
        setPage(data);
        document.title = data.metaTitle || data.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && data.metaDescription) {
          metaDesc.setAttribute('content', data.metaDescription);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-lg text-gray-600">Aradığınız sayfa bulunamadı veya yayından kaldırılmış.</p>
        <a href="/" className="mt-6 inline-flex items-center text-primary hover:text-secondary font-semibold">
          Anasayfaya Dön
        </a>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex-1 flex flex-col">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2 font-medium">
            <Link to="/" className="hover:text-primary transition-colors">Anasayfa</Link>
            <span>&gt;</span>
            <span className="text-gray-900">{page.title}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            {page.title}
          </h1>
          {page.metaDescription && (
             <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
               {page.metaDescription}
             </p>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div 
          className="prose prose-primary prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content || '' }}
        />
      </div>
    </div>
  );
}
