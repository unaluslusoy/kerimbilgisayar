import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchSettings } from '../lib/api';

type SettingsType = Record<string, string>;

interface SettingsContextType {
  settings: SettingsType;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({ settings: {}, loading: true });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsType>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings()
      .then(res => {
        setSettings(res);
        if (res.site_title) {
          document.title = res.site_title;
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
