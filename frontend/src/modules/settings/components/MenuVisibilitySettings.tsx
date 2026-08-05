/**
 * @fileoverview Componente de configuración de visibilidad de menús.
 * Permite activar/desactivar cada ítem del sidebar dentro de las secciones habilitadas.
 * La visibilidad de secciones se define en project.ts (configuración de deploy).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  useMenuVisibility,
  ALL_MENU_ITEMS,
  MENU_SECTIONS,
} from '@shared/hooks/useMenuVisibility';

const MenuVisibilitySettings: React.FC = () => {
  const { t } = useTranslation();
  const { isVisible, isSectionVisible, setMenuVisible, setSectionItemsVisible, resetAll } = useMenuVisibility();

  /** Comprobar si todos los ítems de una sección están visibles */
  const isSectionAllVisible = (sectionKey: string): boolean =>
    ALL_MENU_ITEMS
      .filter(m => m.section === sectionKey && !m.locked)
      .every(m => isVisible(m.id));

  /** Comprobar si algún ítem de una sección está visible */
  const isSectionPartialVisible = (sectionKey: string): boolean => {
    const items = ALL_MENU_ITEMS.filter(m => m.section === sectionKey && !m.locked);
    const visibleCount = items.filter(m => isVisible(m.id)).length;
    return visibleCount > 0 && visibleCount < items.length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
              {t('settingsMenus.title')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {t('settingsMenus.description')}
            </p>
          </div>
          <button
            onClick={resetAll}
            className="shrink-0 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 rounded-xl transition-all"
          >
            <i className="fa-solid fa-rotate-left mr-2 text-xs"></i>
            {t('settingsMenus.resetAll')}
          </button>
        </div>
      </div>

      {/* Secciones — solo se muestran las habilitadas en project.ts */}
      <div className="space-y-5">
        {MENU_SECTIONS.filter(section => isSectionVisible(section.key)).map(section => {
          const sectionItems = ALL_MENU_ITEMS.filter(m => m.section === section.key);
          const unlockableItems = sectionItems.filter(m => !m.locked);
          const allVisible = isSectionAllVisible(section.key);
          const partial = isSectionPartialVisible(section.key);

          return (
            <div
              key={section.key}
              className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              {/* Cabecera de sección con toggle global de ítems */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {t(section.labelKey)}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {unlockableItems.filter(m => isVisible(m.id)).length}/{unlockableItems.length}
                  </span>
                </div>

                {unlockableItems.length > 0 && (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allVisible}
                      ref={el => {
                        if (el) el.indeterminate = partial;
                      }}
                      onChange={() => setSectionItemsVisible(section.key, !allVisible)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                  </label>
                )}
              </div>

              {/* Ítems */}
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {sectionItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-5 py-3.5 transition-colors ${
                      item.locked
                        ? 'opacity-50'
                        : isVisible(item.id)
                          ? ''
                          : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isVisible(item.id)
                            ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <i className={`fa-solid ${item.icon} text-sm`}></i>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          isVisible(item.id)
                            ? 'text-slate-700 dark:text-slate-200'
                            : 'text-slate-400 dark:text-slate-500 line-through'
                        }`}
                      >
                        {t(item.labelKey)}
                      </span>
                      {item.locked && (
                        <span className="text-[10px] bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                          <i className="fa-solid fa-lock text-[8px] mr-1"></i>
                          {t('settingsMenus.required')}
                        </span>
                      )}
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVisible(item.id)}
                        disabled={item.locked}
                        onChange={() => setMenuVisible(item.id, !isVisible(item.id))}
                        className="sr-only peer"
                      />
                      <div
                        className={`w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white transition-colors ${
                          item.locked
                            ? 'bg-slate-300 dark:bg-white/20 cursor-not-allowed'
                            : 'bg-slate-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent)]/30 peer-checked:bg-[var(--accent)] cursor-pointer'
                        }`}
                      ></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MenuVisibilitySettings;
