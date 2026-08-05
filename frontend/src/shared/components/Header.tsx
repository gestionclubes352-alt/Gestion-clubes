/**
 * @fileoverview Header con menú de perfil y acceso a configuración
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataSource, DataSourceType } from '@context/index';
import { useAuth } from '@context/AuthContext';
import { useTeam } from '@context/TeamContext';
import { useTeamFilter } from '@context/TeamFilterContext';
import { useTheme } from '@context/ThemeContext';
import LanguageSelector from './LanguageSelector';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  isAIMode?: boolean;
  onToggleAIMode?: () => void;
  onLogout?: () => void;
  teamOptions?: string[];
}

const DATA_SOURCE_ICONS: Record<DataSourceType, string> = {
  database: 'fa-database',
  'google-sheets': 'fa-table',
  csv: 'fa-file-csv',
};

const DATA_SOURCE_COLORS: Record<DataSourceType, { bg: string; text: string; border: string; activeBg: string }> = {
  database: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    activeBg: 'bg-blue-100 dark:bg-blue-900/40'
  },
  'google-sheets': {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    activeBg: 'bg-green-100 dark:bg-green-900/40'
  },
  csv: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    activeBg: 'bg-emerald-100 dark:bg-emerald-900/40'
  },
};

const normalizeTeamLabel = (team: string) =>
  team
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton = true, isAIMode = false, onToggleAIMode, onLogout, teamOptions = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { activeSource, sources, setActiveSource } = useDataSource();
  const { user, perfil } = useAuth();
  const { selectedTeam } = useTeam();
  const { selectedTeams, toggleTeam, clearSelectedTeams, setSelectedTeams } = useTeamFilter();
  const { isDark, toggle } = useTheme();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false);
  const [isTeamFilterOpen, setIsTeamFilterOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dataSourceRef = useRef<HTMLDivElement>(null);
  const teamFilterRef = useRef<HTMLDivElement>(null);

  const DATA_SOURCE_LABELS: Record<DataSourceType, string> = {
    database: t('header.database'),
    'google-sheets': t('header.googleSheets'),
    csv: t('header.csv'),
  };

  const DATA_SOURCE_DESCS: Record<DataSourceType, string> = {
    database: t('header.databaseDesc'),
    'google-sheets': t('header.googleSheetsDesc'),
    csv: t('header.csvDesc'),
  };

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (dataSourceRef.current && !dataSourceRef.current.contains(event.target as Node)) {
        setIsDataSourceOpen(false);
      }
      if (teamFilterRef.current && !teamFilterRef.current.contains(event.target as Node)) {
        setIsTeamFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSourceInfo = sources.find(s => s.id === activeSource);
  const activeColors = DATA_SOURCE_COLORS[activeSource];

  const clubLogo = selectedTeam?.logoUrl || '/logos/escuela-huesca.png';
  const clubName = 'HUESCA';
  const isHomeActive = location.pathname === '/';
  const isCalendarActive = location.pathname.startsWith('/calendario');
  const sortedTeamOptions = Array.from(
    teamOptions.reduce((map, team) => {
      const rawTeam = team.trim();
      if (!rawTeam) return map;
      const key = normalizeTeamLabel(rawTeam);
      if (!map.has(key)) {
        map.set(key, rawTeam);
      }
      return map;
    }, new Map<string, string>()).values()
  ).sort((a, b) => a.localeCompare(b, 'es'));
  const hasTeamOptions = sortedTeamOptions.length > 1;
  const activeTeamLabel = selectedTeams.length === 0
    ? t('playerTable.allTeams', 'Todos los equipos')
    : selectedTeams.length === 1
      ? selectedTeams[0]
      : `${selectedTeams[0]} +${selectedTeams.length - 1}`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[var(--surface-0)]/95 backdrop-blur-xl border-b border-slate-200 dark:border-[var(--border-soft)] px-3 md:px-4 lg:px-8 py-2 md:py-3 flex items-center justify-between shadow-sm transition-colors duration-300">
      {/* Lado izquierdo - Botón menú móvil */}
      <div className="flex items-center gap-2 md:gap-4">
                {/* Botón de vista completa - solo desktop */}
                <button
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      document.documentElement.requestFullscreen();
                    }
                  }}
                  className="hidden md:flex w-10 h-10 items-center justify-center text-slate-600 dark:text-slate-300 hover:text-sport-primary hover:bg-slate-100 dark:hover:bg-[var(--surface-2)] rounded-xl transition-all"
                  title="Vista completa"
                >
                  <i className="fa-solid fa-expand text-xl"></i>
                </button>
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-sport-primary hover:bg-slate-100 dark:hover:bg-[var(--surface-2)] rounded-xl transition-all"
          >
            <i className="fa-solid fa-bars text-xl"></i>
          </button>
        )}

        {/* Marca separada de la navegación */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[var(--surface-1)] border border-slate-200 dark:border-[var(--border-soft)] hover:bg-slate-100 dark:hover:bg-[var(--surface-2)] transition-all"
          title="HOME"
          aria-label="HOME"
        >
          <img
            src={clubLogo}
            alt={clubName}
            className="w-8 h-8 md:w-9 md:h-9 object-contain drop-shadow-sm"
          />
          <span className="text-sm md:text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight uppercase">
            {clubName}
          </span>
        </button>

        <div className="flex items-center gap-3 md:gap-4 ml-2 md:ml-4">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border transition-all ${
              isHomeActive
                ? 'bg-[var(--accent)] text-white border-transparent shadow-lg shadow-[var(--accent)]/20'
                : 'bg-slate-50 dark:bg-[var(--surface-1)] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[var(--border-soft)] hover:border-[var(--accent)]/40 hover:bg-slate-100 dark:hover:bg-[var(--surface-2)]'
            }`}
            title="HOME"
            aria-label="HOME"
          >
            <i className="fa-solid fa-house text-sm"></i>
            <span className="text-sm font-bold tracking-tight">HOME</span>
          </button>

          <button
            onClick={() => navigate('/calendario')}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border transition-all ${
              isCalendarActive
                ? 'bg-[var(--accent)] text-white border-transparent shadow-lg shadow-[var(--accent)]/20'
                : 'bg-slate-50 dark:bg-[var(--surface-1)] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[var(--border-soft)] hover:border-[var(--accent)]/40 hover:bg-slate-100 dark:hover:bg-[var(--surface-2)]'
            }`}
            title="calendario"
            aria-label="calendario"
          >
            <i className="fa-solid fa-calendar-days text-sm"></i>
            <span className="text-sm font-bold tracking-tight">calendario</span>
          </button>
        </div>
      </div>

      {/* Lado derecho - AI Mode toggle + Toggle tema + Perfil */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {hasTeamOptions && (
          <div className="relative" ref={teamFilterRef}>
            <button
              onClick={() => setIsTeamFilterOpen(prev => !prev)}
              className={`flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-xl border transition-all duration-300 ${
                selectedTeams.length > 0
                  ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'
                  : 'bg-slate-50 dark:bg-[var(--surface-1)] border-slate-200 dark:border-[var(--border-soft)] text-slate-600 dark:text-slate-200 hover:border-[var(--accent)]/40'
              }`}
              title={t('header.teamFilter', 'Filtrar por equipo')}
            >
              <i className="fa-solid fa-layer-group text-sm"></i>
              <div className="hidden lg:flex flex-col items-start leading-none">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {t('header.teamFilter', 'Equipos')}
                </span>
                <span className="text-[10px] font-bold truncate max-w-[140px]">
                  {activeTeamLabel}
                </span>
              </div>
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black ${
                selectedTeams.length > 0 ? 'bg-[var(--accent)] text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {selectedTeams.length}
              </span>
              <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${isTeamFilterOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isTeamFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-[min(92vw,320px)] rounded-2xl border border-slate-200 dark:border-[var(--border-soft)] bg-white dark:bg-[var(--surface-1)] shadow-2xl overflow-hidden z-50 animate-fade-in">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-[var(--border-soft)] bg-slate-50/80 dark:bg-[var(--surface-2)]">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                      {t('header.teamFilter', 'Equipos')}
                    </p>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                      {selectedTeams.length > 0
                        ? t('header.selectedTeamsCount', { count: selectedTeams.length, defaultValue: `${selectedTeams.length} seleccionados` })
                        : t('playerTable.allTeams', 'Todos los equipos')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      clearSelectedTeams();
                      setIsTeamFilterOpen(false);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[var(--accent)] transition-colors"
                  >
                    {t('playerTable.clear', 'Limpiar')}
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto p-2">
                  <button
                    onClick={() => setSelectedTeams([])}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      selectedTeams.length === 0
                        ? 'bg-[var(--accent)] text-white'
                        : 'hover:bg-slate-50 dark:hover:bg-[var(--surface-2)] text-slate-600 dark:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-widest">{t('playerTable.allTeams', 'Todos los equipos')}</span>
                    {selectedTeams.length === 0 && <i className="fa-solid fa-check text-xs"></i>}
                  </button>

                  <div className="my-2 h-px bg-slate-100 dark:bg-[var(--border-soft)]"></div>

                  {sortedTeamOptions.map(team => {
                    const checked = selectedTeams.includes(team);
                    return (
                      <label
                        key={team}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          checked
                            ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'hover:bg-slate-50 dark:hover:bg-[var(--surface-2)] text-slate-600 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTeam(team)}
                          className="h-4 w-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <span className="flex-1 text-xs font-semibold">{team}</span>
                        {checked && <i className="fa-solid fa-check text-[10px]"></i>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Mode Toggle */}
        {onToggleAIMode && (
          <button
            onClick={onToggleAIMode}
            className={`relative flex items-center gap-1.5 md:gap-2.5 px-2 md:px-3 py-1.5 md:py-2 rounded-xl transition-all duration-300 border ${
              isAIMode
                ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] border-transparent shadow-lg shadow-[var(--accent)]/20'
                : 'bg-slate-50 dark:bg-[var(--surface-1)] border-slate-200 dark:border-[var(--border-soft)] hover:border-[var(--accent)]/40 hover:shadow-md'
            }`}
            title={isAIMode ? t('header.exitAIMode') : t('header.enterAIMode')}
          >
            <i className={`fa-solid fa-brain text-sm transition-all duration-300 ${
              isAIMode ? 'text-white' : 'text-slate-400 dark:text-slate-500'
            }`}></i>
            <span className={`text-[10px] font-black uppercase tracking-wider transition-all duration-300 hidden md:inline ${
              isAIMode ? 'text-white' : 'text-slate-500 dark:text-slate-400'
            }`}>
              AI Mode
            </span>
            {/* Toggle indicator */}
            <div className={`w-8 h-4 rounded-full p-0.5 transition-all duration-300 hidden sm:block ${
              isAIMode ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-600'
            }`}>
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isAIMode
                  ? 'translate-x-4 bg-white'
                  : 'translate-x-0 bg-white dark:bg-slate-400'
              }`}></div>
            </div>
          </button>
        )}

        {/* Selector de idioma - oculto en móvil, visible en md+ */}
        <div className="hidden md:block">
          <LanguageSelector />
        </div>

        {/* Toggle Dark/Light Mode - compacto en móvil */}
        <button
          onClick={toggle}
          className="hidden sm:block relative w-14 h-8 rounded-full p-1 transition-all duration-300 ease-in-out border border-slate-200 dark:border-[var(--border-soft)]"
          style={{
            backgroundColor: isDark ? 'var(--surface-2)' : '#e2e8f0'
          }}
          aria-label={isDark ? t('header.lightMode') : t('header.darkMode')}
          title={isDark ? t('header.lightMode') : t('header.darkMode')}
        >
          {/* Track icons */}
          <div className="absolute inset-0 flex items-center justify-between px-1.5">
            <i className={`fa-solid fa-sun text-[10px] transition-opacity duration-300 ${isDark ? 'opacity-30 text-slate-400' : 'opacity-0'}`}></i>
            <i className={`fa-solid fa-moon text-[10px] transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-30 text-slate-400'}`}></i>
          </div>
          {/* Sliding ball */}
          <div 
            className={`w-6 h-6 rounded-full shadow-md flex items-center justify-center transition-all duration-300 ease-in-out ${
              isDark 
                ? 'translate-x-6 bg-slate-700' 
                : 'translate-x-0 bg-white'
            }`}
          >
            <i className={`fa-solid ${isDark ? 'fa-moon text-yellow-300' : 'fa-sun text-amber-500'} text-xs`}></i>
          </div>
        </button>

        {/* Toggle Dark/Light Mode - versión compacta solo móvil */}
        <button
          onClick={toggle}
          className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-[var(--border-soft)] transition-all"
          style={{ backgroundColor: isDark ? 'var(--surface-2)' : '#e2e8f0' }}
          aria-label={isDark ? t('header.lightMode') : t('header.darkMode')}
        >
          <i className={`fa-solid ${isDark ? 'fa-moon text-yellow-300' : 'fa-sun text-amber-500'} text-sm`}></i>
        </button>

        {/* Perfil */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-1.5 md:gap-3 px-1.5 md:px-3 py-1.5 md:py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[var(--surface-1)] transition-all border border-transparent hover:border-slate-200 dark:hover:border-[var(--border-soft)]"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] rounded-full flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-user text-white text-xs md:text-sm"></i>
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{perfil?.nombre || 'Usuario'}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{selectedTeam?.shortName || perfil?.rol || 'Demo'}</span>
            </div>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform hidden sm:block ${isProfileMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>

        {/* Menú desplegable */}
        {isProfileMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[var(--surface-1)] rounded-2xl shadow-2xl border border-slate-200 dark:border-[var(--border-soft)] overflow-hidden animate-fade-in z-50">
            {/* Info usuario */}
            <div className="p-4 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-user text-xl"></i>
                </div>
                <div>
                  <p className="font-bold">{perfil?.nombre || 'Usuario Demo'}</p>
                  <p className="text-xs opacity-80">{user?.email || 'demo@sportmanagement.app'}</p>
                </div>
              </div>
            </div>

            {/* Opciones del menú */}
            <div className="p-2">
              <button
                onClick={() => {
                  navigate('/settings');
                  setIsProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[var(--surface-2)] hover:text-[var(--accent)] transition-all"
              >
                <i className="fa-solid fa-gear w-5 text-center"></i>
                <span className="text-sm font-semibold">{t('header.settings')}</span>
              </button>

              <button
                onClick={() => {
                  navigate('/settings#datasources');
                  setIsProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[var(--surface-2)] hover:text-[var(--accent)] transition-all"
              >
                <i className="fa-solid fa-database w-5 text-center"></i>
                <span className="text-sm font-semibold">{t('settings.dataSource')}</span>
              </button>

              <button
                onClick={() => {
                  navigate('/usuarios');
                  setIsProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[var(--surface-2)] hover:text-[var(--accent)] transition-all"
              >
                <i className="fa-solid fa-user-gear w-5 text-center"></i>
                <span className="text-sm font-semibold">{t('sidebar.usersLabel')}</span>
              </button>

              <hr className="my-2 border-slate-200 dark:border-[var(--border-soft)]" />

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onLogout?.();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
              >
                <i className="fa-solid fa-right-from-bracket w-5 text-center"></i>
                <span className="text-sm font-semibold">{t('header.logout')}</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  );
};

export default Header;
