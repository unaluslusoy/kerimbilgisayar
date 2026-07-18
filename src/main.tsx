import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import './lib/i18n';

// Global error listener for broken images
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (e) => {
      if (e.target && (e.target as HTMLElement).tagName === 'IMG') {
        const img = e.target as HTMLImageElement;
        if (!img.src.includes('/assets/images/default-placeholder.svg')) {
          img.src = '/assets/images/default-placeholder.svg';
        }
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);
