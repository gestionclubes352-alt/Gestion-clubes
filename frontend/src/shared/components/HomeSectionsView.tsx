import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMenuVisibility } from '@shared/hooks/useMenuVisibility';

type HomeSection = {
  key: string;
  titleKey: string;
  icon: string;
  color: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  items: Array<{ labelKey: string; icon: string; route: string; menuId: string }>;
};

const HOME_SECTIONS: HomeSection[] = [
  {
    key: 'management',
    titleKey: 'sidebar.management',
    icon: 'fa-folder-open',
    color: 'from-blue-500 to-blue-700',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-100',
    items: [
      { labelKey: 'sidebar.squadsLabel', icon: 'fa-users', route: '/plantillas', menuId: 'PLANTILLAS' },
      { labelKey: 'sidebar.fieldDiagramLabel', icon: 'fa-diagram-project', route: '/campograma', menuId: 'CAMPOGRAMA' },
      { labelKey: 'sidebar.technicalStaffLabel', icon: 'fa-user-tie', route: '/staff', menuId: 'PERSONAL' },
    ],
  },
  {
    key: 'planning',
    titleKey: 'sidebar.sportsAreaLabel',
    icon: 'fa-calendar-check',
    color: 'from-emerald-500 to-emerald-700',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-100',
    items: [
      { labelKey: 'sidebar.tacticalBoardLabel', icon: 'fa-chalkboard-user', route: '/pizarra', menuId: 'PIZARRA TÁCTICA' },
      { labelKey: 'sidebar.taskRepositoryLabel', icon: 'fa-book-open', route: '/repositorio-tareas', menuId: 'REPOSITORIO DE TAREAS' },
      { labelKey: 'sidebar.sessionsLabel', icon: 'fa-calendar-days', route: '/sesiones', menuId: 'SESIONES' },
      { labelKey: 'sidebar.competitionLabel', icon: 'fa-ranking-star', route: '/competicion', menuId: 'COMPETICIÓN' },
      { labelKey: 'sidebar.matchesLabel', icon: 'fa-futbol', route: '/partidos', menuId: 'PARTIDOS' },
      { labelKey: 'sidebar.videoLibraryLabel', icon: 'fa-video', route: '/videoteca', menuId: 'VIDEOTECA' },
    ],
  },
  {
    key: 'medical',
    titleKey: 'sidebar.medical',
    icon: 'fa-heart-pulse',
    color: 'from-rose-500 to-rose-700',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-100',
    items: [
      { labelKey: 'sidebar.injuriesLabel', icon: 'fa-band-aid', route: '/lesiones', menuId: 'LESIONES' },
      { labelKey: 'sidebar.medicalHistoryLabel', icon: 'fa-file-medical', route: '/historial-medico', menuId: 'HISTORIAL MÉDICO' },
      { labelKey: 'sidebar.checkupsLabel', icon: 'fa-stethoscope', route: '/reconocimientos', menuId: 'RECONOCIMIENTOS' },
      { labelKey: 'sidebar.rehabilitationLabel', icon: 'fa-heart-pulse', route: '/rehabilitacion', menuId: 'REHABILITACIÓN' },
      { labelKey: 'sidebar.fitnessLabel', icon: 'fa-dumbbell', route: '/rendimiento-fisico', menuId: 'RENDIMIENTO FÍSICO' },
    ],
  },
  {
    key: 'admin',
    titleKey: 'sidebar.admin',
    icon: 'fa-gear',
    color: 'from-slate-500 to-slate-700',
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-100',
    items: [
      { labelKey: 'sidebar.clubsLabel', icon: 'fa-shield-halved', route: '/clubes', menuId: 'CLUBES' },
      { labelKey: 'sidebar.teamsLabel', icon: 'fa-trophy', route: '/equipos', menuId: 'EQUIPOS' },
      { labelKey: 'sidebar.internalTeamsLabel', icon: 'fa-users-rectangle', route: '/equipos-internos', menuId: 'EQUIPOS_INTERNOS' },
      { labelKey: 'sidebar.usersLabel', icon: 'fa-user-gear', route: '/usuarios', menuId: 'USUARIOS' },
      { labelKey: 'sidebar.competitionsLabel', icon: 'fa-trophy', route: '/competiciones', menuId: 'COMPETICIONES' },
      { labelKey: 'sidebar.settingsLabel', icon: 'fa-gear', route: '/settings', menuId: 'CONFIGURACIÓN' },
    ],
  },
];

const HomeSectionsView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isVisible, isSectionVisible } = useMenuVisibility();

  return (
    <div className="min-h-full w-full px-4 pt-4 pb-24 md:px-6 md:pt-6 lg:px-12 lg:pt-8">
      <div className="mb-8">
        <p className="mt-2 text-base md:text-lg font-bold text-slate-400 uppercase tracking-[0.2em]">
          {t('sidebar.homeLabel', 'Inicio rápido')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {HOME_SECTIONS.filter(section => isSectionVisible(section.key)).map(section => {
          const visibleItems = section.items.filter(item => isVisible(item.menuId));
          if (visibleItems.length === 0) return null;

          return (
            <div
              key={section.key}
              className={`rounded-3xl border ${section.borderColor} bg-slate-900/70 p-6 md:p-7 shadow-sm hover:shadow-xl transition-all backdrop-blur-sm`}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${section.color} text-white flex items-center justify-center shadow-sm`}>
                  <i className={`fa-solid ${section.icon}`}></i>
                </div>
                <h3 className={`text-base md:text-lg font-black uppercase tracking-widest ${section.textColor}`}>
                  {t(section.titleKey)}
                </h3>
              </div>

              <div className="space-y-2">
                {visibleItems.map(item => (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <i className={`fa-solid ${item.icon} text-sm ${section.textColor} opacity-90 group-hover:opacity-100`}></i>
                    <span className="text-base md:text-lg font-bold text-white/90 group-hover:text-white truncate">
                      {t(item.labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomeSectionsView;
