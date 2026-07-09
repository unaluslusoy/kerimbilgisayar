import React, { useState, useEffect } from 'react';
import { Save, Plus, Globe, Loader2 } from 'lucide-react';

interface Language {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

interface Translation {
  id: number;
  langCode: string;
  key: string;
  value: string;
}

export default function LanguageSettings() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for edits
  const [editTranslations, setEditTranslations] = useState<Record<string, Record<string, string>>>({});
  
  // Extract unique keys across all translations
  const allKeys: string[] = Array.from(new Set(translations.map(t => t.key))).sort() as string[];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [langsRes, transRes] = await Promise.all([
        fetch('/api/admin/languages'),
        fetch('/api/admin/translations')
      ]);
      const langs = await langsRes.json();
      const trans = await transRes.json();
      
      setLanguages(langs);
      setTranslations(trans);
      
      // Build edit state: { langCode: { key: value } }
      const editState: Record<string, Record<string, string>> = {};
      langs.forEach((l: Language) => {
        editState[l.code] = {};
      });
      trans.forEach((t: Translation) => {
        if (!editState[t.langCode]) editState[t.langCode] = {};
        editState[t.langCode][t.key] = t.value || '';
      });
      setEditTranslations(editState);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslationChange = (langCode: string, key: string, value: string) => {
    setEditTranslations(prev => ({
      ...prev,
      [langCode]: {
        ...prev[langCode],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Save translations for each language
      for (const lang of languages) {
        const langData = editTranslations[lang.code] || {};
        await fetch('/api/admin/translations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ langCode: lang.code, translations: langData })
        });
      }
      alert('Çeviriler başarıyla kaydedildi.');
    } catch (err: any) {
      alert('Kaydedilirken hata oluştu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddKey = () => {
    const newKey = prompt('Yeni eklenecek çeviri anahtarı (Örn: common.welcome):');
    if (newKey && newKey.trim() !== '') {
      const key = newKey.trim();
      if (!allKeys.includes(key)) {
         setTranslations([...translations, { id: Date.now(), langCode: languages[0]?.code || 'tr', key, value: '' }]);
      }
    }
  };

  const handleAddLanguage = async () => {
    const code = prompt('Yeni dil kodu (Örn: en):');
    const name = prompt('Dil adı (Örn: English):');
    
    if (code && name) {
      try {
        await fetch('/api/admin/languages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, name, isDefault: false, isActive: true })
        });
        fetchData();
      } catch (err) {
        alert('Hata oluştu');
      }
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dil ve Çeviri Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Sistemdeki tüm statik metinleri ve uyarı mesajlarını buradan farklı diller için yönetebilirsiniz.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAddLanguage} className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-theme text-gray-700 hover:bg-gray-50">
            <Globe className="w-4 h-4 mr-2" />
            Yeni Dil Ekle
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center px-4 py-2 bg-primary text-white rounded-theme hover:bg-secondary">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>

      <div className="bg-white rounded-theme shadow-sm border border-gray-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Çeviri Tablosu</h2>
          <button onClick={handleAddKey} className="text-sm flex items-center text-primary font-medium hover:text-secondary">
            <Plus className="w-4 h-4 mr-1" />
            Yeni Çeviri Anahtarı (Key) Ekle
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold w-1/4">Anahtar (Key)</th>
                {languages.map(lang => (
                  <th key={lang.code} className="px-6 py-4 font-semibold">
                    <div className="flex items-center">
                      <span className="uppercase bg-gray-200 px-2 py-1 rounded text-[10px] mr-2">{lang.code}</span>
                      {lang.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allKeys.length === 0 ? (
                <tr>
                  <td colSpan={languages.length + 1} className="px-6 py-8 text-center text-gray-500">
                    Henüz hiç çeviri anahtarı eklenmemiş. Yukarıdaki butondan ekleyebilirsiniz.
                  </td>
                </tr>
              ) : (
                allKeys.map((key) => (
                  <tr key={key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{key}</td>
                    {languages.map(lang => (
                      <td key={`${lang.code}-${key}`} className="px-6 py-3">
                        <textarea
                          className="w-full border border-gray-200 rounded p-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-shadow resize-y"
                          rows={1}
                          value={editTranslations[lang.code]?.[key] || ''}
                          onChange={(e) => handleTranslationChange(lang.code, key, e.target.value)}
                          placeholder={`${lang.name} karşılığı...`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
