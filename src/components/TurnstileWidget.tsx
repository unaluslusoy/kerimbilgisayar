import { useEffect, useRef } from 'react';

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

export default function TurnstileWidget({ siteKey, enabled, onVerify }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const hasBypassedRef = useRef(false);

  useEffect(() => {
    if ((import.meta as any).env.DEV) {
      if (!hasBypassedRef.current) {
        hasBypassedRef.current = true;
        onVerify('dev-dummy-token');
      }
      return;
    }

    if (!enabled || !siteKey || !containerRef.current) return;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    if (existingScript) {
      renderWidget();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [enabled, onVerify, siteKey]);

  if ((import.meta as any).env.DEV) return null;
  if (!enabled || !siteKey) return null;

  return <div ref={containerRef} className="cf-turnstile" data-sitekey={siteKey} />;
}
