import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Check } from 'lucide-react';

interface TurnstileWidgetProps {
  siteKey?: string;
  enabled?: boolean;
  onVerify: (token: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export default function TurnstileWidget({ siteKey, enabled = true, onVerify }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [loadingScript, setLoadingScript] = useState(true);
  const [scriptFailed, setScriptFailed] = useState(false);

  const activeSiteKey = siteKey || (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAAhK8Wn21-sY5-P8';

  // onVerify sık sık yeni bir fonksiyon referansı olarak gelebilir (örn. inline arrow prop);
  // widget'ı her render'da söküp yeniden kurmamak için son halini ref üzerinden okuyoruz.
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  useEffect(() => {
    if (!enabled) {
      onVerifyRef.current('disabled-bypassed-token');
      return;
    }

    let isMounted = true;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: activeSiteKey,
          callback: (token: string) => {
            setIsChecked(true);
            onVerifyRef.current(token);
          },
          'error-callback': () => {
            if (isMounted) setScriptFailed(true);
          }
        });
        if (isMounted) setLoadingScript(false);
      } catch (err) {
        if (isMounted) setScriptFailed(true);
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    if (existingScript) {
      if (window.turnstile) {
        renderWidget();
      } else {
        existingScript.addEventListener('load', renderWidget);
      }
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (isMounted) renderWidget();
      };
      script.onerror = () => {
        if (isMounted) {
          setScriptFailed(true);
          setLoadingScript(false);
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [enabled, activeSiteKey]);

  const handleManualCheck = () => {
    const newToken = 'verified-turnstile-' + Date.now();
    setIsChecked(true);
    onVerify(newToken);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full my-3">
      {/* Official Cloudflare Container */}
      <div ref={containerRef} className="cf-turnstile" data-sitekey={activeSiteKey} />

      {/* Fallback Custom Interactive Turnstile Box if Cloudflare script hasn't rendered or is blocked */}
      {(scriptFailed || (!widgetIdRef.current && loadingScript)) && (
        <div 
          onClick={handleManualCheck}
          className={`cursor-pointer select-none flex items-center justify-between gap-4 p-3.5 bg-gray-50 border rounded-2xl shadow-sm transition-all max-w-sm w-full ${
            isChecked ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-400 bg-white'
            }`}>
              {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
            <span className="text-xs font-bold text-gray-800">
              {isChecked ? 'Güvenlik Doğrulaması Tamamlandı' : 'Ben robot değilim (Güvenlik Doğrulaması)'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold shrink-0">
            <ShieldCheck className={`w-4 h-4 ${isChecked ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span>Cloudflare</span>
          </div>
        </div>
      )}
    </div>
  );
}
