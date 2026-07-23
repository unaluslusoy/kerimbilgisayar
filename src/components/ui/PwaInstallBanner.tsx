import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed
      const dismissed = localStorage.getItem('pwa_banner_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="p-2.5 bg-blue-600 rounded-xl text-white shrink-0 shadow-md">
          <Smartphone className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="font-extrabold text-sm text-white leading-tight">Uygulamayı Cihazınıza Yükleyin</h4>
          <p className="text-xs text-slate-300 mt-1 leading-snug">
            Kerim Bilgisayar uygulamasını masaüstünüze veya telefonunuza yükleyerek tek tıkla hızlıca erişin.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Şimdi Yükle
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-slate-400 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
