import React, { useState, useEffect } from 'react';
import Breadcrumb from '../../components/Breadcrumb';
import { FileText, Cookie, Shield, Copyright, UserCheck, AlertCircle, Mail, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchPage } from '../../lib/api';
import { usePageTitle } from '../../lib/usePageTitle';

export default function LegalPage({ type }: { type: 'kvkk' | 'cookies' | 'security' | 'copyright' | 'privacy' | 'personalData' | 'mailTerms' | 'terms' | 'disclosure' }) {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fallbacks
  const contentMap: Record<string, {title: string, icon: any, slug: string}> = {
    'kvkk': {
      title: 'KVKK Aydınlatma Metni',
      icon: FileText,
      slug: 'kvkk',
    },
    'cookies': {
       title: 'Çerez (Cookie) Politikası',
       icon: Cookie,
       slug: 'cerez-politikasi',
    },
    'security': {
       title: 'Sistem ve Veri Güvenliği Politikası',
       icon: Shield,
       slug: 'sistem-guvenligi'
    },
    'copyright': {
       title: 'Telif Hakkı',
       icon: Copyright,
       slug: 'telif-hakki'
    },
    'privacy': {
       title: 'Gizlilik Politikaları',
       icon: Shield,
       slug: 'gizlilik-politikalari'
    },
    'personalData': {
       title: 'Kişisel Veriler',
       icon: UserCheck,
       slug: 'kisisel-veriler'
    },
    'mailTerms': {
       title: 'E-Posta Hukuki Hüküm ve Şartlar',
       icon: Mail,
       slug: 'posta-hukuki-hukum-ve-sartlar'
    },
    'terms': {
       title: 'Kullanım Koşulları',
       icon: AlertCircle,
       slug: 'kullanim-kosullari'
    },
    'disclosure': {
       title: 'Aydınlatma Metni',
       icon: HelpCircle,
       slug: 'aydinlatma-metni'
    }
  };

  const currentSettings = contentMap[type];
  const Icon = currentSettings.icon;
  usePageTitle(currentSettings.title);

  useEffect(() => {
    fetchPage(currentSettings.slug)
      .then(res => setPageData(res))
      .catch(() => setPageData(null)) // fallback to null if missing
      .finally(() => setLoading(false));
  }, [type]);

  if (loading) return <div className="py-20 text-center">Yükleniyor...</div>;

  return (
    <div className="bg-gray-50 min-h-screen flex-1 flex flex-col">
      {/* Page Header */}
      <div className="bg-white pt-[140px] pb-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb className="mb-6" items={[{ label: 'Anasayfa', href: '/' }, { label: currentSettings.title }]} />
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            {currentSettings.title}
          </h1>
        </div>
      </div>

      <div className="py-16 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-theme shadow-sm border border-gray-200 p-6 sticky top-28">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-4 border-b border-gray-100">Kurumsal Bilgiler</h3>
            <ul className="space-y-2">
              {Object.entries(contentMap).map(([key, item]) => {
                const ItemIcon = item.icon;
                const isActive = type === key;
                return (
                  <li key={key}>
                    <a href={`/${item.slug}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-theme transition-colors text-sm font-medium ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}>
                      <ItemIcon className="w-4 h-4" />
                      {item.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Content */}
        <div className="lg:w-3/4">
          <div className="bg-white rounded-theme shadow-sm border border-gray-200 p-8 md:p-12">
              <div className="flex items-center mb-8 border-b border-gray-200 pb-6">
                  <div className="bg-primary/10 p-3 rounded-theme mr-4">
                      <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">{pageData?.title || currentSettings.title}</h1>
              </div>
              <div className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600">
                 {pageData?.content ? (
                   <div dangerouslySetInnerHTML={{ __html: pageData.content }} />
                 ) : (
                   <p>İçerik henüz eklenmedi.</p>
                 )}
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}
