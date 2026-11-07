/**
 * @fileoverview Barra de navegación inferior para móvil.
 * Muestra las secciones principales con acceso rápido.
 * Solo visible en pantallas < lg (1024px).
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMenuVisibility } from '@shared/hooks/useMenuVisibility';

interface BottomNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userRole?: string;
}

/** Items principales que aparecen fijos en la bottom nav */
const PRIMARY_ITEMS = [
  { id: 'CALENDARIO', icon: 'fa-calendar', labelKey: 'sidebar.calendarLabel' },
  { id: 'PLANTILLAS', icon: 'fa-users', labelKey: 'sidebar.squadsLabel' },
  { id: 'PARTIDOS', icon: 'fa-futbol', labelKey: 'sidebar.matchesLabel' },
];

/** Items del menú expandido "Más" */
const MORE_SECTIONS = [
  { sectionLabel: 'sidebar.management', items: [
    { id: 'CAMPOGRAMA', icon: 'fa-diagram-project', labelKey: 'sidebar.fieldDiagramLabel' },
    { id: 'PERSONAL', icon: 'fa-user-tie', labelKey: 'sidebar.technicalStaffLabel' },
    { id: 'EQUIPOS', icon: 'fa-trophy', labelKey: 'sidebar.teamsLabel' },
    { id: 'EQUIPOS_INTERNOS', icon: 'fa-users-rectangle', labelKey: 'sidebar.internalTeamsLabel' },
  ]},
  { sectionLabel: 'sidebar.planning', items: [
    { id: 'SESIONES', icon: 'fa-calendar-days', labelKey: 'sidebar.sessionsLabel' },
    { id: 'COMPETICIÓN', icon: 'fa-ranking-star', labelKey: 'sidebar.competitionLabel' },
  ]},
  { sectionLabel: 'sidebar.medical', items: [
    { id: 'LESIONES', icon: 'fa-band-aid', labelKey: 'sidebar.injuriesLabel' },
    { id: 'HISTORIAL MÉDICO', icon: 'fa-file-medical', labelKey: 'sidebar.medicalHistoryLabel' },
    { id: 'RECONOCIMIENTOS', icon: 'fa-stethoscope', labelKey: 'sidebar.checkupsLabel' },
    { id: 'REHABILITACIÓN', icon: 'fa-heart-pulse', labelKey: 'sidebar.rehabilitationLabel' },
    { id: 'RENDIMIENTO FÍSICO', icon: 'fa-dumbbell', labelKey: 'sidebar.fitnessLabel' },
  ]},
  { sectionLabel: 'sidebar.tools', items: [
    { id: 'DISEÑADOR', icon: 'fa-person-running', labelKey: 'sidebar.designerLabel' },
    { id: 'REPOSITORIO DE TAREAS', icon: 'fa-book-open', labelKey: 'sidebar.taskRepositoryLabel' },
    { id: 'PIZARRA TÁCTICA', icon: 'fa-chalkboard-user', labelKey: 'sidebar.tacticalBoardLabel' },
    { id: 'PINTADO DE ACCIONES', icon: 'fa-paintbrush', labelKey: 'sidebar.actionPaintingLabel' },
  ]},
  { sectionLabel: 'sidebar.content', items: [
    { id: 'VIDEOTECA', icon: 'fa-video', labelKey: 'sidebar.videoLibraryLabel' },
  ]},
  { sectionLabel: 'sidebar.admin', items: [
    { id: 'USUARIOS', icon: 'fa-user-gear', labelKey: 'sidebar.usersLabel' },
    { id: 'CONFIGURACIÓN', icon: 'fa-gear', labelKey: 'sidebar.settingsLabel' },
  ]},
];

const BottomNav: React.FC<BottomNavProps> = ({ activeSection, onSectionChange, userRole = 'Tecnico' }) => {
  const { t } = useTranslation();
  const { isVisible, isSectionVisible } = useMenuVisibility();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Verificar si la sección activa está entre los items secundarios (para resaltar "Más")
  const primaryIds = PRIMARY_ITEMS.map(i => i.id);
  const isSecondaryActive = !primaryIds.includes(activeSection) && activeSection !== '';

  const handleNavClick = (id: string) => {
    onSectionChange(id);
    setIsMoreOpen(false);
  };

  // Filtrar secciones según visibilidad y rol
  const filteredMoreSections = MORE_SECTIONS
    .filter(section => {
      const sectionKey = section.sectionLabel.replace('sidebar.', '');
      if (!isSectionVisible(sectionKey)) return false;
      if (sectionKey === 'tools' && userRole === 'Tecnico') return false;
      if (sectionKey === 'admin' && userRole === 'Tecnico') return false;
      return true;
    })
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!isVisible(item.id)) return false;
        if (item.id === 'CONFIGURACIÓN' && userRole !== 'Responsable') return false;
        return true;
      }),
    }))
    .filter(section => section.items.length > 0);

  return (
    <>
      {/* Overlay cuando "Más" está abierto */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      {/* Panel expandido de "Más" */}
      {isMoreOpen && (
        <div className="fixed bottom-[4.5rem] left-0 right-0 z-[95] lg:hidden animate-slide-up">
          <div className="mx-3 mb-2 bg-white dark:bg-[var(--surface-1)] rounded-2xl shadow-2xl border border-slate-200 dark:border-[var(--border-soft)] max-h-[60dvh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-[var(--surface-1)] px-5 pt-4 pb-2 border-b border-slate-100 dark:border-[var(--border-soft)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {t('sidebar.navigation', 'Navegación')}
                </span>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-[var(--surface-2)] text-slate-400 hover:text-slate-600"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            </div>

            {/* Secciones */}
            <div className="p-3 space-y-1">
              {filteredMoreSections.map((section) => (
                <div key={section.sectionLabel}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 pt-3 pb-1.5">
                    {t(section.sectionLabel)}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {section.items.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all ${
                            isActive
                              ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[var(--surface-2)]'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isActive
                              ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30'
                              : 'bg-slate-100 dark:bg-[var(--surface-2)] text-slate-400'
                          }`}>
                            <i className={`fa-solid ${item.icon} text-sm`}></i>
                          </div>
                          <span className="text-[10px] font-bold leading-tight text-center line-clamp-2">
                            {t(item.labelKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barra de navegación inferior */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
        {/* Safe area background para notch/home indicator */}
        <div className="bg-white/95 dark:bg-[var(--surface-0)]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[var(--border-soft)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-stretch justify-around px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
            {PRIMARY_ITEMS.filter(item => isVisible(item.id)).map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex-1 min-w-0 min-h-[56px] flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-200 ${
                    isActive ? 'text-[var(--accent)]' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div className={`relative w-10 h-7 flex items-center justify-center rounded-full transition-all duration-200 ${
                    isActive ? 'bg-[var(--accent)]/10 scale-110' : ''
                  }`}>
                    <i className={`fa-solid ${item.icon} ${isActive ? 'text-base' : 'text-sm'} transition-all`}></i>
                  </div>
                  <span className={`text-[10px] font-bold leading-none truncate max-w-full px-0.5 ${isActive ? 'font-black' : 'font-semibold'}`}>
                    {t(item.id === 'PLANTILLAS' && userRole === 'Jugador' ? 'sidebar.myDataLabel' : item.labelKey)}
                  </span>
                </button>
              );
            })}

            {/* Botón "Más" */}
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`flex-1 min-w-0 min-h-[56px] flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-200 ${
                isMoreOpen || isSecondaryActive ? 'text-[var(--accent)]' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className={`relative w-10 h-7 flex items-center justify-center rounded-full transition-all duration-200 ${
                isMoreOpen || isSecondaryActive ? 'bg-[var(--accent)]/10 scale-110' : ''
              }`}>
                <i className={`fa-solid ${isMoreOpen ? 'fa-xmark' : 'fa-ellipsis'} text-sm transition-all`}></i>
              </div>
              <span className={`text-[10px] font-bold leading-none truncate max-w-full px-0.5 ${isMoreOpen || isSecondaryActive ? 'font-black' : 'font-semibold'}`}>
                {t('sidebar.more', 'Más')}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
