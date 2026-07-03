import { useState, useEffect } from 'react';
import { X, Cookie, Settings, Check } from 'lucide-react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Small delay to ensure it only shows after initial render
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie-consent', 'all');
    setIsVisible(false);
  };

  const savePreferences = () => {
    localStorage.setItem('cookie-consent', 'custom');
    localStorage.setItem('cookie-analytics', analytics.toString());
    localStorage.setItem('cookie-marketing', marketing.toString());
    setIsVisible(false);
  };

  const rejectAll = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="max-w-5xl mx-auto bg-gray-900 text-white rounded-theme shadow-2xl border border-gray-800 p-6">
        {!showPreferences ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-gray-800 p-3 rounded-full shrink-0">
                <Cookie className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Çerez Tercihleri</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                  Kullanıcı deneyiminizi optimize etmek, web sitesi trafiğini analiz etmek ve sosyal medya özelliklerini sunmak amacıyla çerezler kullanmaktayız. Kişisel verileriniz, 6698 sayılı KVKK kapsamında Aydınlatma Metni standartlarına uygun şekilde işlenmektedir. Çerez Ayarlarından tercihlerinizi özelleştirebilirsiniz.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-3 w-full md:w-auto flex-wrap justify-end">
              <button 
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2 rounded-theme text-sm font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors flex items-center"
              >
                <Settings className="w-4 h-4 mr-2" /> Düzenle
              </button>
              <button 
                onClick={rejectAll}
                className="px-4 py-2 rounded-theme text-sm font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Reddet
              </button>
              <button 
                onClick={acceptAll}
                className="px-5 py-2 rounded-theme text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-lg shadow-green-900/20"
              >
                Tümünü Kabul Et
              </button>
            </div>
            <button 
              onClick={() => setIsVisible(false)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl flex items-center">
                <Settings className="w-5 h-5 mr-2 text-green-400" /> Çerez Tercihlerini Yönet
              </h3>
              <button onClick={() => setShowPreferences(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-theme border border-gray-700">
                <div>
                  <h4 className="font-semibold text-white mb-1">Zorunlu Çerezler</h4>
                  <p className="text-sm text-gray-400">Sitenin temel işlevleri için gereklidir ve kapatılamaz.</p>
                </div>
                <div className="w-12 h-6 bg-green-600 rounded-full relative opacity-50 cursor-not-allowed">
                  <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-theme border border-gray-700">
                <div>
                  <h4 className="font-semibold text-white mb-1">Analitik Çerezler</h4>
                  <p className="text-sm text-gray-400">Site kullanımını analiz etmemize ve deneyimi geliştirmemize yardımcı olur.</p>
                </div>
                <button 
                  onClick={() => setAnalytics(!analytics)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${analytics ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${analytics ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-theme border border-gray-700">
                <div>
                  <h4 className="font-semibold text-white mb-1">Pazarlama Çerezleri</h4>
                  <p className="text-sm text-gray-400">Size daha uygun kampanyalar ve reklamlar sunmamızı sağlar.</p>
                </div>
                <button 
                  onClick={() => setMarketing(!marketing)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${marketing ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${marketing ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button 
                onClick={acceptAll}
                className="px-5 py-2.5 rounded-theme text-sm font-semibold text-gray-300 hover:text-white transition-colors"
              >
                Tümünü Kabul Et
              </button>
              <button 
                onClick={savePreferences}
                className="px-5 py-2.5 rounded-theme text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-lg shadow-green-900/20"
              >
                Tercihleri Kaydet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
