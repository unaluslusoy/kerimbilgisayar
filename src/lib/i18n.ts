import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

const fallbackResources = {
  tr: {
    translation: {
      'common.loading': 'Yukleniyor...',
      'common.error': 'Bir hata olustu',
      'common.submit': 'Gonder',
    },
  },
  en: {
    translation: {
      'common.loading': 'Loading...',
      'common.error': 'An error occurred',
      'common.submit': 'Submit',
    },
  },
};

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: fallbackResources,
    partialBundledLanguages: true,
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en', 'de', 'fr', 'es'],
    maxRetries: 1,
    retryTimeout: 250,
    backend: {
      loadPath: '/api/public/translations/{{lng}}',
    },
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    }
  });

export default i18n;
