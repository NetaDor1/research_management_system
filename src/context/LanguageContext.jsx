import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext(null);

const LANGUAGE_STORAGE_KEY = 'rms_language';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === 'he' || savedLanguage === 'en') {
      return savedLanguage;
    }
    return 'he';
  });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  }, [language]);

  const value = useMemo(() => {
    const t = (key, fallback = '') => {
      return translations[language]?.[key] ?? fallback ?? key;
    };

    return {
      language,
      setLanguage,
      t,
      isRTL: language === 'he',
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
