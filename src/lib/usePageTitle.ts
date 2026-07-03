import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * Hook to set the document title for a page.
 * Automatically appends the site title from settings.
 */
export function usePageTitle(pageTitle: string) {
  const { settings } = useSettings();
  
  useEffect(() => {
    const siteTitle = settings?.site_title || 'Kerim Bilgisayar';
    if (pageTitle) {
      document.title = `${pageTitle} | ${siteTitle}`;
    } else {
      document.title = siteTitle;
    }
    return () => {
      document.title = siteTitle;
    };
  }, [pageTitle, settings?.site_title]);
}
