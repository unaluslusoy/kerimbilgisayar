import { useEffect, useState, useMemo } from 'react';
import Breadcrumb from '../../components/Breadcrumb';
import { HelpCircle, ChevronDown, Search, X } from 'lucide-react';
import { fetchFAQ } from '../../lib/api';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../lib/usePageTitle';

export default function FAQ() {
  usePageTitle('Sıkça Sorulan Sorular');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFAQ()
      .then(res => {
        setCategories(res && res.length > 0 ? res : []);
      })
      .catch(err => {
        console.error(err);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleItem = (id: number) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter categories and questions based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        questions: (cat.questions || []).filter(
          (qu: any) =>
            qu.question?.toLowerCase().includes(q) ||
            qu.answer?.toLowerCase().includes(q)
        )
      }))
      .filter(cat => cat.questions.length > 0);
  }, [categories, searchQuery]);

  // Auto-open all items when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allIds: Record<number, boolean> = {};
      filteredCategories.forEach(cat => {
        (cat.questions || []).forEach((q: any) => { allIds[q.id] = true; });
      });
      setOpenItems(allIds);
    }
  }, [searchQuery, filteredCategories]);

  const totalQuestions = filteredCategories.reduce((acc, cat) => acc + (cat.questions?.length || 0), 0);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb className="mb-6" items={[{ label: 'Anasayfa', href: '/' }, { label: 'Sıkça Sorulan Sorular' }]} />
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Sıkça Sorulan Sorular
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            Teknoloji danışmanlığı, SLA standartlarımız, entegrasyon süreçlerimiz ve kurumsal işleyişimiz hakkında detaylı bilgiler.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Search */}
        <div className="mb-10">
          <div className="relative bg-white rounded-theme border border-gray-200 shadow-sm flex items-center">
            <Search className="w-5 h-5 text-gray-400 ml-4 shrink-0" />
            <input
              type="text"
              placeholder="Soruları ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-4 bg-transparent border-none focus:outline-none text-gray-900 placeholder:text-gray-400 font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mr-4 text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-500 mt-3 ml-1">
              {totalQuestions > 0
                ? <><strong>{totalQuestions}</strong> soru bulundu</>
                : 'Arama kriterlerinize uygun soru bulunamadı.'
              }
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-theme border border-gray-200 overflow-hidden">
                <div className="skeleton h-16 w-full"></div>
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-theme border border-dashed border-gray-200">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {searchQuery ? 'Soru Bulunamadı' : 'Henüz Soru Eklenmemiş'}
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? `"${searchQuery}" için sonuç bulunamadı. Farklı bir arama deneyin.`
                : 'Henüz S.S.S içeriği eklenmemiş.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {filteredCategories.map((cat, idx) => (
              <div key={cat.id || idx}>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-primary/20 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  {cat.name}
                </h2>
                <div className="space-y-3">
                  {cat.questions && cat.questions.map((q: any) => (
                    <div
                      key={q.id}
                      className="bg-white border border-gray-200 rounded-theme overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <button
                        onClick={() => toggleItem(q.id)}
                        className="w-full text-left px-6 py-5 flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset group"
                        aria-expanded={!!openItems[q.id]}
                      >
                        <span className="font-semibold text-gray-900 pr-8 group-hover:text-primary transition-colors">{q.question}</span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 transition-all duration-300 ${openItems[q.id] ? 'rotate-180 text-primary' : 'text-gray-400'}`}
                        />
                      </button>
                      {/* Smooth accordion with max-height transition */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          openItems[q.id] ? 'max-h-[500px]' : 'max-h-0'
                        }`}
                      >
                        <div className="px-6 pb-5 border-t border-gray-100">
                          <div
                            className="text-gray-600 leading-relaxed pt-4 prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: q.answer }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!cat.questions || cat.questions.length === 0) && (
                    <p className="text-gray-500 italic pl-2">Bu kategoride henüz soru bulunmamaktadır.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {!loading && (
          <div className="mt-16 bg-primary rounded-3xl p-10 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">Aradığınız Yanıtı Bulamadınız mı?</h2>
            <p className="text-white/80 mb-6 max-w-md mx-auto">
              Sorularınıza daha özel yanıtlar almak için teknik danışmanlarımızla doğrudan iletişime geçin. Size yardımcı olmaktan memnuniyet duyacağız.
            </p>
            <Link
              to="/iletisim"
              className="inline-flex bg-white text-primary font-bold px-8 py-3 rounded-theme hover:bg-gray-50 transition-colors shadow-lg"
            >
              İletişime Geçin
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
