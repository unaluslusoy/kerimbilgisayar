import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.replace('#', ''));
      let attempts = 0;

      const scrollToElement = () => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };

      // Try immediately
      if (!scrollToElement()) {
        // If not found, poll for dynamic content rendering
        const interval = setInterval(() => {
          attempts += 1;
          const found = scrollToElement();
          if (found || attempts >= 15) {
            clearInterval(interval);
          }
        }, 150);

        return () => clearInterval(interval);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

