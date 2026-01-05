import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'intl-pluralrules';

import { resources } from './resources';

const STORAGE_KEY = 'user-language';

// Language detection function
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      // 1. Check user preference from AsyncStorage
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedLanguage) {
        console.log('🌐 i18n: Using saved language preference:', savedLanguage);
        callback(savedLanguage);
        return;
      }

      // 2. Use device system language
      const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
      const supportedLanguages = Object.keys(resources);
      
      if (supportedLanguages.includes(deviceLanguage)) {
        console.log('🌐 i18n: Using device language:', deviceLanguage);
        callback(deviceLanguage);
      } else {
        console.log('🌐 i18n: Device language not supported, fallback to English');
        callback('en');
      }
    } catch (error) {
      console.error('🌐 i18n: Error detecting language, fallback to English:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, language);
      console.log('🌐 i18n: Language preference saved:', language);
    } catch (error) {
      console.error('🌐 i18n: Error saving language preference:', error);
    }
  }
};

const initI18n = async () => {
  await i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources,
      fallbackLng: 'en',
      debug: __DEV__,
      interpolation: {
        escapeValue: false, // React Native already does escaping
      },
      react: {
        useSuspense: false, // Disable suspense for React Native
      }
    });
};

// Initialize i18n immediately
initI18n();

// Export helper function for manual language change
export const changeLanguage = async (language: string) => {
  try {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem(STORAGE_KEY, language);
    console.log('🌐 i18n: Language changed to:', language);
  } catch (error) {
    console.error('🌐 i18n: Error changing language:', error);
  }
};

// Export supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  tr: 'Türkçe',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  zh: '中文',
  ja: '日本語',
  pl: 'Polski',
  ru: 'Русский',
  pt: 'Português',
  ar: 'العربية',
  ko: '한국어',
  nl: 'Nederlands',
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  cs: 'Čeština'
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

export default i18n;