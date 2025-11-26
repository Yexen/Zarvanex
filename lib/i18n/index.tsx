'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Supported languages
export type Language = 'en' | 'fa' | 'fr';

export interface Translations {
  [key: string]: string | Translations;
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | null>(null);

// Import translations
import en from '@/locales/en.json';
import fa from '@/locales/fa.json';
import fr from '@/locales/fr.json';

const translations: Record<Language, Translations> = { en, fa, fr };

// Get nested value from object using dot notation
function getNestedValue(obj: Translations, path: string): string | undefined {
  const keys = path.split('.');
  let current: Translations | string = obj;

  for (const key of keys) {
    if (typeof current === 'string') return undefined;
    if (current[key] === undefined) return undefined;
    current = current[key] as Translations | string;
  }

  return typeof current === 'string' ? current : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('app-language') as Language;
    if (saved && ['en', 'fa', 'fr'].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  // Update document direction and lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';

    // Add/remove RTL class for styling
    if (language === 'fa') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = getNestedValue(translations[language], key);

    // Fallback to English if not found
    if (!text) {
      text = getNestedValue(translations.en, key);
    }

    // Return key if still not found
    if (!text) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }

    // Replace parameters like {name} with actual values
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text!.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return text;
  };

  const dir = language === 'fa' ? 'rtl' : 'ltr';

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// For components that can't use hooks
export function getLanguageDirection(lang: Language): 'ltr' | 'rtl' {
  return lang === 'fa' ? 'rtl' : 'ltr';
}
