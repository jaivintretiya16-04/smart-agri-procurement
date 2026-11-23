import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../i18n/en.json';
import hi from '../i18n/hi.json';

const LanguageContext = createContext();

const translations = { en, hi };

export const centerTranslations = {
  'Lucknow Central Krishi Mandi Samiti': {
    name_hi: 'लखनऊ केंद्रीय कृषि मंडी समिति',
    address_hi: 'सीतापुर रोड, रिंग रोड के पास, लखनऊ',
  },
  'Bakshi Ka Talab Government Procurement Depot': {
    name_hi: 'बक्शी का तालाब सरकारी खरीद डिपो',
    address_hi: 'मुख्य एनएच-24, बक्शी का तालाब, लखनऊ',
  },
  'Mohanlalganj State Grain Procurement Mandi': {
    name_hi: 'मोहनलालगंज राज्य अन्न खरीद मंडी',
    address_hi: 'जेल रोड जंक्शन, मोहनलालगंज, लखनऊ',
  },
  'Kisan Agro Logistics Hub': {
    name_hi: 'किसान एग्रो लॉजिस्टिक्स हब',
    address_hi: 'फैजाबाद रोड, चिनहट, लखनऊ',
  },
  'Avadh Farmers Modern Warehouse & Mandi': {
    name_hi: 'अवध किसान आधुनिक गोदाम एवं मंडी',
    address_hi: 'हरदोई रोड, मलिहाबाद, लखनऊ',
  },
  'Pragati Kisan Private Procurement Center': {
    name_hi: 'प्रगति किसान निजी खरीद केंद्र',
    address_hi: 'रायबरेली रोड, मोहनलालगंज, लखनऊ',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('agri_lang') || 'en';
  });

  const setLanguage = (lang) => {
    if (['en', 'hi'].includes(lang)) {
      setLanguageState(lang);
      localStorage.setItem('agri_lang', lang);
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const localizeCenterName = (name) => {
    if (language === 'hi' && name && centerTranslations[name]) {
      return centerTranslations[name].name_hi;
    }
    return name;
  };

  const localizeCenterAddress = (name, fallbackAddress) => {
    if (language === 'hi' && name && centerTranslations[name]) {
      return centerTranslations[name].address_hi;
    }
    return fallbackAddress;
  };

  // Translation lookup with dot-notation
  const t = (path) => {
    const keys = path.split('.');
    let current = translations[language] || translations.en;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English
        let fallback = translations.en;
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return path; // Return raw key if not found
          }
        }
        return fallback;
      }
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, localizeCenterName, localizeCenterAddress }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
