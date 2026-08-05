import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { APP_CONFIG } from '../../config';
import { useTeam } from '@context/TeamContext';
import { useMenuVisibility } from '@shared/hooks/useMenuVisibility';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  userRole?: string;
}

interface SidebarItemProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick, collapsed }) => (
  <div 
    onClick={onClick}
    className={`
      group relative flex items-center cursor-pointer transition-all duration-200
      ${collapsed ? 'justify-center px-0 py-3 mx-2 rounded-xl' : 'gap-3 px-4 py-2.5 mx-3 rounded-lg'}
      ${active 
        ? 'bg-[var(--sidebar-active-bg)] text-white'
        : 'text-[var(--sidebar-text)] hover:text-white hover:bg-[var(--sidebar-hover-bg)]'
      }
    `}
  >
    <div className={`
      flex items-center justify-center transition-all duration-200
      ${collapsed ? 'w-10 h-10 rounded-xl' : 'w-8 h-8 rounded-lg'}
      ${active 
        ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30' 
        : 'bg-white/10 text-[var(--sidebar-text)] group-hover:bg-white/15 group-hover:text-white'
      }
    `}>
      <i className={`fa-solid ${icon} ${collapsed ? 'text-base' : 'text-xs'}`}></i>
    </div>
    
    {!collapsed && (
      <span className={`text-sm font-semibold tracking-wider uppercase transition-all ${active ? 'font-bold text-white' : ''}`}>
        {label}
      </span>
    )}
    
    {/* Active indicator bar */}
    {active && !collapsed && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[var(--accent)] rounded-r-full"></div>
    )}
    
    {/* Tooltip para modo colapsado */}
    {collapsed && (
      <div className="
        absolute left-full ml-3 px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg
        opacity-0 invisible group-hover:opacity-100 group-hover:visible
        transition-all duration-200 whitespace-nowrap z-50 shadow-xl
        pointer-events-none
      ">
        {label}
        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
      </div>
    )}
  </div>
);

interface SidebarSectionProps {
  title: string;
  sectionKey: string;
  children: React.ReactNode;
  collapsed?: boolean;
  defaultOpen?: boolean;
  hasActiveChild?: boolean;
  expandedSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ 
  title, sectionKey, children, collapsed, hasActiveChild,
  expandedSections, onToggleSection
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  const isExpanded = expandedSections[sectionKey] ?? true;

  // Auto-expand when a child becomes active
  useEffect(() => {
    if (hasActiveChild && !isExpanded) {
      onToggleSection(sectionKey);
    }
  }, [hasActiveChild]);

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, isExpanded]);

  if (collapsed) {
    return (
      <div className="mb-1">
        <div className="h-px bg-white/10 mx-4 my-2"></div>
        <div className="space-y-0.5">{children}</div>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => onToggleSection(sectionKey)}
        className="w-full flex items-center justify-between px-6 py-2 group cursor-pointer"
      >
        <span className="text-xs font-bold text-[var(--sidebar-text-muted)] uppercase tracking-[0.2em] group-hover:text-white/60 transition-colors">
          {title}
        </span>
        <i className={`
          fa-solid fa-chevron-down text-[8px] text-white/20 
          group-hover:text-white/40
          transition-all duration-200
          ${isExpanded ? 'rotate-0' : '-rotate-90'}
        `}></i>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-250 ease-out"
        style={{ 
          maxHeight: isExpanded ? `${contentHeight}px` : '0px',
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div className="space-y-0.5">{children}</div>
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
  isOpen,
  onClose,
  isCollapsed: externalCollapsed,
  onToggleCollapse: externalToggle,
  userRole = 'Tecnico'
}) => {
  const { t } = useTranslation();
  const { selectedTeam } = useTeam();
  const { isVisible, isSectionVisible } = useMenuVisibility();



  // Estado interno si no se provee externo
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  // Secciones expandidas/colapsadas
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar-sections');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [key]: !(prev[key] ?? true) };
      localStorage.setItem('sidebar-sections', JSON.stringify(next));
      return next;
    });
  };
  
  const isCollapsed = externalCollapsed ?? internalCollapsed;
  const toggleCollapse = externalToggle ?? (() => setInternalCollapsed(!internalCollapsed));

  // Guardar preferencia en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null && externalCollapsed === undefined) {
      setInternalCollapsed(saved === 'true');
    }
  }, [externalCollapsed]);

  useEffect(() => {
    if (externalCollapsed === undefined) {
      localStorage.setItem('sidebar-collapsed', String(internalCollapsed));
    }
  }, [internalCollapsed, externalCollapsed]);

  const handleItemClick = (section: string) => {
    onSectionChange(section);
    if (onClose) onClose();
  };

  const copyAppUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-70 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        ${isCollapsed ? 'w-[72px]' : 'w-[280px]'}
        bg-[var(--sidebar-bg)] h-screen flex flex-col fixed left-0 top-0 
        overflow-hidden z-80 transition-all duration-300 ease-out
        border-r border-white/5
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header / Logo */}
        <div 
          onClick={() => handleItemClick('CALENDARIO')} 
          className={`
            flex items-center border-b border-white/10
            cursor-pointer group transition-all duration-300
            ${isCollapsed ? 'p-4 justify-center h-18' : 'px-5 py-5 gap-3 h-20'}
          `}
        >
          {/* Logo icon - Team logo if selected, otherwise project branding */}
          {selectedTeam?.logoUrl ? (
            <div className={`
              shrink-0 rounded-xl flex items-center justify-center
              overflow-hidden transition-all duration-300
              group-hover:scale-105
              ${isCollapsed ? 'w-11 h-11' : 'w-11 h-11'}
            `}>
              <img 
                src={selectedTeam.logoUrl} 
                alt={`${selectedTeam.name} escudo`} 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className={`
              shrink-0 bg-[var(--accent)] rounded-xl
              flex items-center justify-center shadow-lg shadow-[var(--accent)]/20
              group-hover:shadow-xl group-hover:shadow-[var(--accent)]/30 transition-all duration-300
              group-hover:scale-105
              ${isCollapsed ? 'w-11 h-11' : 'w-11 h-11'}
            `}>
              <i className="fa-solid fa-futbol text-white text-lg"></i>
            </div>
          )}
          
          {/* Logo text */}
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xl font-black text-white tracking-tight">
                {selectedTeam ? selectedTeam.shortName : APP_CONFIG.organization.shortName}
              </span>
              <span className="text-xs font-medium text-[var(--sidebar-text-muted)] tracking-wider uppercase">
                {selectedTeam ? selectedTeam.competition : (APP_CONFIG.organization.description ?? t('sidebar.sportsManagement'))}
              </span>
            </div>
          )}

          {/* Botón cerrar móvil */}
          {isOpen && !isCollapsed && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClose?.(); }} 
              className="ml-auto lg:hidden w-8 h-8 bg-white/10 rounded-lg text-white/70 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-hide">


          {isSectionVisible('management') && (
          <SidebarSection title={t('sidebar.management')} sectionKey="management" collapsed={isCollapsed} hasActiveChild={['PLANTILLAS', 'PERSONAL', 'CLUBES', 'EQUIPOS', 'CAMPOGRAMA'].includes(activeSection)} expandedSections={expandedSections} onToggleSection={toggleSection}>
            {isVisible('PLANTILLAS') && <SidebarItem icon="fa-users" label={t('sidebar.squadsLabel')} active={activeSection === 'PLANTILLAS'} onClick={() => handleItemClick('PLANTILLAS')} collapsed={isCollapsed} />}
            {isVisible('CAMPOGRAMA') && <SidebarItem icon="fa-diagram-project" label={t('sidebar.fieldDiagramLabel')} active={activeSection === 'CAMPOGRAMA'} onClick={() => handleItemClick('CAMPOGRAMA')} collapsed={isCollapsed} />}
            {isVisible('PERSONAL') && <SidebarItem icon="fa-user-tie" label={t('sidebar.technicalStaffLabel')} active={activeSection === 'PERSONAL'} onClick={() => handleItemClick('PERSONAL')} collapsed={isCollapsed} />}
            {isVisible('CLUBES') && <SidebarItem icon="fa-shield-halved" label={t('sidebar.clubsLabel')} active={activeSection === 'CLUBES'} onClick={() => handleItemClick('CLUBES')} collapsed={isCollapsed} />}
            {isVisible('EQUIPOS') && <SidebarItem icon="fa-trophy" label={t('sidebar.teamsLabel')} active={activeSection === 'EQUIPOS'} onClick={() => handleItemClick('EQUIPOS')} collapsed={isCollapsed} />}
          </SidebarSection>
          )}

          {isSectionVisible('planning') && (
          <SidebarSection title={t('sidebar.sportsAreaLabel')} sectionKey="planning" collapsed={isCollapsed} hasActiveChild={['DISEÑADOR', 'PIZARRA TÁCTICA', 'SESIONES', 'COMPETICIÓN', 'COMPETICIONES', 'PARTIDOS', 'VIDEOTECA', 'REPOSITORIO DE TAREAS'].includes(activeSection)} expandedSections={expandedSections} onToggleSection={toggleSection}>
            {isVisible('PIZARRA TÁCTICA') && <SidebarItem icon="fa-chalkboard-user" label={t('sidebar.tacticalBoardLabel')} active={activeSection === 'PIZARRA TÁCTICA'} onClick={() => handleItemClick('PIZARRA TÁCTICA')} collapsed={isCollapsed} />}
            {isVisible('DISEÑADOR') && <SidebarItem icon="fa-person-running" label={t('sidebar.designerLabel')} active={activeSection === 'DISEÑADOR'} onClick={() => handleItemClick('DISEÑADOR')} collapsed={isCollapsed} />}
            {isVisible('REPOSITORIO DE TAREAS') && <SidebarItem icon="fa-book-open" label={t('sidebar.taskRepositoryLabel')} active={activeSection === 'REPOSITORIO DE TAREAS'} onClick={() => handleItemClick('REPOSITORIO DE TAREAS')} collapsed={isCollapsed} />}
            {isVisible('SESIONES') && <SidebarItem icon="fa-calendar-days" label={t('sidebar.sessionsLabel')} active={activeSection === 'SESIONES'} onClick={() => handleItemClick('SESIONES')} collapsed={isCollapsed} />}
            {isVisible('COMPETICIÓN') && <SidebarItem icon="fa-ranking-star" label={t('sidebar.competitionLabel')} active={activeSection === 'COMPETICIÓN'} onClick={() => handleItemClick('COMPETICIÓN')} collapsed={isCollapsed} />}
            {isVisible('COMPETICIONES') && <SidebarItem icon="fa-trophy" label={t('sidebar.competitionsLabel')} active={activeSection === 'COMPETICIONES'} onClick={() => handleItemClick('COMPETICIONES')} collapsed={isCollapsed} />}
            {isVisible('PARTIDOS') && <SidebarItem icon="fa-futbol" label={t('sidebar.matchesLabel')} active={activeSection === 'PARTIDOS'} onClick={() => handleItemClick('PARTIDOS')} collapsed={isCollapsed} />}
            {isVisible('VIDEOTECA') && <SidebarItem icon="fa-video" label={t('sidebar.videoLibraryLabel')} active={activeSection === 'VIDEOTECA'} onClick={() => handleItemClick('VIDEOTECA')} collapsed={isCollapsed} />}
          </SidebarSection>
          )}

          {isSectionVisible('medical') && (
          <SidebarSection title={t('sidebar.medical')} sectionKey="medical" collapsed={isCollapsed} hasActiveChild={['LESIONES', 'HISTORIAL MÉDICO', 'RECONOCIMIENTOS', 'REHABILITACIÓN', 'RENDIMIENTO FÍSICO'].includes(activeSection)} expandedSections={expandedSections} onToggleSection={toggleSection}>
            {isVisible('LESIONES') && <SidebarItem icon="fa-band-aid" label={t('sidebar.injuriesLabel')} active={activeSection === 'LESIONES'} onClick={() => handleItemClick('LESIONES')} collapsed={isCollapsed} />}
            {isVisible('HISTORIAL MÉDICO') && <SidebarItem icon="fa-file-medical" label={t('sidebar.medicalHistoryLabel')} active={activeSection === 'HISTORIAL MÉDICO'} onClick={() => handleItemClick('HISTORIAL MÉDICO')} collapsed={isCollapsed} />}
            {isVisible('RECONOCIMIENTOS') && <SidebarItem icon="fa-stethoscope" label={t('sidebar.checkupsLabel')} active={activeSection === 'RECONOCIMIENTOS'} onClick={() => handleItemClick('RECONOCIMIENTOS')} collapsed={isCollapsed} />}
            {isVisible('REHABILITACIÓN') && <SidebarItem icon="fa-heart-pulse" label={t('sidebar.rehabilitationLabel')} active={activeSection === 'REHABILITACIÓN'} onClick={() => handleItemClick('REHABILITACIÓN')} collapsed={isCollapsed} />}
            {isVisible('RENDIMIENTO FÍSICO') && <SidebarItem icon="fa-dumbbell" label={t('sidebar.fitnessLabel')} active={activeSection === 'RENDIMIENTO FÍSICO'} onClick={() => handleItemClick('RENDIMIENTO FÍSICO')} collapsed={isCollapsed} />}
          </SidebarSection>
          )}

          {isSectionVisible('admin') && userRole !== 'Tecnico' && (
          <SidebarSection title={t('sidebar.admin')} sectionKey="admin" collapsed={isCollapsed} hasActiveChild={['USUARIOS', 'CONFIGURACIÓN', 'FUENTE DE DATOS'].includes(activeSection)} expandedSections={expandedSections} onToggleSection={toggleSection}>
            {isVisible('USUARIOS') && <SidebarItem icon="fa-user-gear" label={t('sidebar.usersLabel')} active={activeSection === 'USUARIOS'} onClick={() => handleItemClick('USUARIOS')} collapsed={isCollapsed} />}
            {isVisible('CONFIGURACIÓN') && userRole === 'Responsable' && <SidebarItem icon="fa-gear" label={t('sidebar.settingsLabel')} active={activeSection === 'CONFIGURACIÓN'} onClick={() => handleItemClick('CONFIGURACIÓN')} collapsed={isCollapsed} />}
            <SidebarItem icon="fa-database" label={t('header.dataSource')} active={activeSection === 'FUENTE DE DATOS'} onClick={() => handleItemClick('FUENTE DE DATOS')} collapsed={isCollapsed} />
          </SidebarSection>
          )}
        </nav>

        {/* Footer */}
        <div className={`
          border-t border-white/10 bg-[var(--sidebar-bg-dark)]
          ${isCollapsed ? 'p-3' : 'p-4'}
        `}>
          {/* Estado de conexión */}
          <div className={`
            flex items-center mb-3
            ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}
          `}>
            <div className={`
              w-2.5 h-2.5 rounded-full shrink-0
              bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]
            `}></div>
            {!isCollapsed && (
              <span className="text-xs font-medium text-[var(--sidebar-text-muted)]">
                {t('common.localMode')}
              </span>
            )}
          </div>

          {/* Botón copiar URL */}
          {!isCollapsed && (
            <button 
              onClick={copyAppUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-3
                bg-white/5 border border-white/10 
                rounded-xl text-[var(--sidebar-text)] text-sm font-medium
                hover:border-[var(--accent)] hover:text-white transition-all duration-200
                hover:bg-white/10"
            >
              <i className="fa-solid fa-link text-xs"></i>
              {t('common.copyUrl')}
            </button>
          )}

          {/* Botón collapse/expand */}
          <button 
            onClick={toggleCollapse}
            className={`
              hidden lg:flex items-center justify-center w-full
              py-2.5 rounded-xl transition-all duration-200
              bg-white/5 border border-white/10
              text-[var(--sidebar-text-muted)] hover:text-white hover:border-white/20
              hover:bg-white/10
              ${isCollapsed ? 'px-0' : 'gap-2'}
            `}
          >
            <i className={`fa-solid ${isCollapsed ? 'fa-angles-right' : 'fa-angles-left'} text-sm`}></i>
            {!isCollapsed && <span className="text-sm font-medium">{t('sidebar.collapse')}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
