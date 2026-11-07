/**
 * @fileoverview Configuración de internacionalización (i18n)
 * Soporta: Español (por defecto), Inglés y Euskera
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './es.json';
import en from './en.json';
import eu from './eu.json';

// Idiomas disponibles
export const AVAILABLE_LANGUAGES = [
  { code: 'es', name: 'Castellano', shortCode: 'ES' },
  { code: 'en', name: 'English', shortCode: 'EN' }
] as const;

export type LanguageCode = typeof AVAILABLE_LANGUAGES[number]['code'];

// Obtener idioma guardado o usar español por defecto
const getStoredLanguage = (): LanguageCode => {
  const stored = localStorage.getItem('sport_management_language');
  if (stored && AVAILABLE_LANGUAGES.some(lang => lang.code === stored)) {
    return stored as LanguageCode;
  }
  return 'es'; // Español por defecto
};

// Configuración de i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      eu: { translation: eu }
    },
    lng: getStoredLanguage(),
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false // React ya escapa los valores
    },
    react: {
      useSuspense: false
    }
  });

// Función para cambiar idioma y guardar preferencia
export const changeLanguage = async (langCode: LanguageCode): Promise<void> => {
  await i18n.changeLanguage(langCode);
  localStorage.setItem('sport_management_language', langCode);
};

// Función para obtener el idioma actual
export const getCurrentLanguage = (): LanguageCode => {
  return i18n.language as LanguageCode;
};

export default i18n;
