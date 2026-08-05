/**
 * @fileoverview Página principal de configuración
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DataSourceSettings from './DataSourceSettings';
import MenuVisibilitySettings from './MenuVisibilitySettings';
import RolesPermissionsSettings from './RolesPermissionsSettings';
import { CompetitionsConfigView } from '@modules/competicion';
import { AVAILABLE_LANGUAGES, changeLanguage, type LanguageCode } from '../../../locales';

type SettingsTab = 'general' | 'datasources' | 'menus' | 'roles' | 'appearance' | 'notifications' | 'competiciones';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: string;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'general', label: 'General', icon: 'fa-sliders', description: 'settingsTabs.generalDesc' },
  { id: 'datasources', label: 'Data Sources', icon: 'fa-database', description: 'settingsTabs.datasourcesDesc' },
  { id: 'menus', label: 'Menus', icon: 'fa-bars', description: 'settingsTabs.menusDesc' },
  { id: 'roles', label: 'Roles y Permisos', icon: 'fa-shield-halved', description: 'settingsTabs.rolesDesc' },
  { id: 'competiciones', label: 'Competiciones', icon: 'fa-trophy', description: 'settingsTabs.competitionsDesc' },
  { id: 'appearance', label: 'Appearance', icon: 'fa-palette', description: 'settingsTabs.appearanceDesc' },
  { id: 'notifications', label: 'Notifications', icon: 'fa-bell', description: 'settingsTabs.notificationsDesc' }
];

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Detectar hash en URL para navegar a sección específica
  useEffect(() => {
    const hash = location.hash.replace('#', '') as SettingsTab;
    if (hash && TABS.find(t => t.id === hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    navigate(`/settings#${tab}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-[var(--accent)] transition-all shadow-sm"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-800">{t('settings.title')}</h1>
              <p className="text-slate-500 mt-1">{t('settings.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar de tabs */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-2">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
                    ${activeTab === tab.id
                      ? 'bg-red-50 text-[var(--accent)] border border-red-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }
                  `}
                >
                  <i className={`fa-solid ${tab.icon} w-5 text-center ${activeTab === tab.id ? 'text-[var(--accent)]' : 'text-slate-400'}`}></i>
                  <div>
                    <span className="font-semibold block">{t(`settingsTabs.${tab.id}`)}</span>
                    <span className="text-xs text-slate-400">{t(tab.description)}</span>
                  </div>
                </button>
              ))}
            </div>
          </nav>

          {/* Contenido */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-6">
                    <h3 className="text-2xl font-black text-slate-800 mb-2">{t('settingsGeneral.title')}</h3>
                    <p className="text-slate-500">{t('settingsGeneral.description')}</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {t('settingsGeneral.orgName')}
                      </label>
                      <input
                        type="text"
                        defaultValue="Mi Club"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {t('settingsGeneral.currentSeason')}
                      </label>
                      <input
                        type="text"
                        defaultValue="2025-2026"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        {t('settings.language')}
                      </label>
                      <div className="flex gap-2">
                        {AVAILABLE_LANGUAGES.map(lang => {
                          const isActive = (i18n.language?.split('-')[0] || 'es') === lang.code;
                          return (
                            <button
                              key={lang.code}
                              onClick={() => changeLanguage(lang.code)}
                              className={`
                                px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2
                                ${isActive
                                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-[var(--accent)]/40'
                                }
                              `}
                            >
                              {lang.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'datasources' && <DataSourceSettings />}

              {activeTab === 'menus' && <MenuVisibilitySettings />}

              {activeTab === 'roles' && <RolesPermissionsSettings />}

              {activeTab === 'competiciones' && <CompetitionsConfigView />}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-6">
                    <h3 className="text-2xl font-black text-slate-800 mb-2">{t('settings.appearance')}</h3>
                    <p className="text-slate-500">{t('settingsAppearance.description')}</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        {t('settingsAppearance.theme')}
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        {['light', 'dark', 'system'].map(theme => (
                          <button
                            key={theme}
                            className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-[var(--accent)] bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                            <i className={`fa-solid ${theme === 'light' ? 'fa-sun' : theme === 'dark' ? 'fa-moon' : 'fa-desktop'} text-xl mb-2 ${theme === 'light' ? 'text-[var(--accent)]' : 'text-slate-400'}`}></i>
                            <p className="text-sm font-semibold capitalize">{t(`settingsAppearance.${theme}`)}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        {t('settingsAppearance.primaryColor')}
                      </label>
                      <div className="flex gap-3">
                        {['#c8102e', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B'].map(color => (
                          <button
                            key={color}
                            style={{ backgroundColor: color }}
                            className={`w-10 h-10 rounded-xl ${color === '#c8102e' ? 'ring-2 ring-offset-2 ring-[var(--accent)]' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-6">
                    <h3 className="text-2xl font-black text-slate-800 mb-2">{t('settings.notifications')}</h3>
                    <p className="text-slate-500">{t('settingsNotifications.description')}</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { labelKey: 'settingsNotifications.matchReminders', descKey: 'settingsNotifications.matchRemindersDesc', enabled: true },
                      { labelKey: 'settingsNotifications.newEvents', descKey: 'settingsNotifications.newEventsDesc', enabled: true },
                      { labelKey: 'settingsNotifications.systemUpdates', descKey: 'settingsNotifications.systemUpdatesDesc', enabled: false }
                    ].map((notif, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-slate-700">{t(notif.labelKey)}</p>
                          <p className="text-sm text-slate-500">{t(notif.descKey)}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked={notif.enabled} className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
