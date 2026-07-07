import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchSettings, checkApiHealth } from '../lib/api';

type SettingsType = Record<string, string>;

interface SettingsContextType {
  settings: SettingsType;
  loading: boolean;
  apiReady: boolean;
  apiChecked: boolean;
}

const SettingsContext = createContext<SettingsContextType>({ settings: {}, loading: true, apiReady: false, apiChecked: false });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsType>({});
  const [loading, setLoading] = useState(true);
  const [apiReady, setApiReady] = useState(false);
  const [apiChecked, setApiChecked] = useState(false);

  useEffect(() => {
    // Önce API sağlık kontrolü yap
    checkApiHealth()
      .then(isHealthy => {
        setApiReady(isHealthy);
        setApiChecked(true);

        if (!isHealthy) {
          setLoading(false);
          return;
        }

        // API sağlıklıysa ayarları yükle
        return fetchSettings()
          .then(res => {
            setSettings(res);
            if (res.site_title) {
              document.title = res.site_title;
            }
          })
          .catch(err => console.error(err))
          .finally(() => setLoading(false));
      })
      .catch(() => {
        setApiReady(false);
        setApiChecked(true);
        setLoading(false);
      });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, apiReady, apiChecked }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
