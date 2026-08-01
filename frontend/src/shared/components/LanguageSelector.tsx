/**
 * @fileoverview Selector de idioma — botones inline simples (ES · EN · EU)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AVAILABLE_LANGUAGES, changeLanguage, type LanguageCode } from '../../locales';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const current = (i18n.language?.split('-')[0] || 'es') as LanguageCode;

  return (
    <div className="flex items-center rounded-lg border border-slate-200 dark:border-[var(--border-soft)] overflow-hidden">
      {AVAILABLE_LANGUAGES.map(lang => {
        const isActive = current === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`
              px-2.5 py-1.5 text-xs font-bold tracking-wide transition-colors
              ${isActive
                ? 'bg-[var(--accent)] text-white'
                : 'bg-white dark:bg-[var(--surface-1)] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[var(--surface-2)]'
              }
            `}
            title={lang.name}
          >
            {lang.shortCode}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSelector;
