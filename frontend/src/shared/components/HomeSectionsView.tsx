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
  items: Array<{ labelKey?: string; label?: string; icon: string; route: string; menuId: string }>;
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
      { labelKey: 'sidebar.actionPaintingLabel', icon: 'fa-paintbrush', route: '/pintado-acciones', menuId: 'PINTADO DE ACCIONES' },
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
    key: 'residencia',
    titleKey: 'sidebar.residencia',
    icon: 'fa-house-user',
    color: 'from-amber-500 to-amber-700',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-100',
    items: [
      { labelKey: 'sidebar.residenciaPlayersLabel', icon: 'fa-people-roof', route: '/residencia/jugadores', menuId: 'RESI_JUGADORES' },
      { labelKey: 'sidebar.residenciaRoomsLabel', icon: 'fa-bed', route: '/residencia/habitaciones', menuId: 'RESI_HABITACIONES' },
      { labelKey: 'sidebar.residenciaMealsLabel', icon: 'fa-utensils', route: '/residencia/comidas', menuId: 'RESI_COMIDAS' },
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
      { labelKey: 'sidebar.competitionsLabel', icon: 'fa-ranking-star', route: '/competiciones', menuId: 'COMPETICIONES' },
      { label: 'Localidades', icon: 'fa-map-pin', route: '/instalaciones', menuId: 'LOCALIDADES' },
      { label: 'Instalaciones y Campos', icon: 'fa-fence', route: '/instalaciones', menuId: 'INSTALACIONES' },
    ],
  },
];

const HomeSectionsView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isVisible, isSectionVisible } = useMenuVisibility();

  return (
    <div className="min-h-full w-full px-4 pt-4 pb-24 md:px-6 md:pt-5 lg:px-8 lg:pt-6 2xl:px-10 2xl:pt-6 3xl:px-12 3xl:pt-6">
      <div className="mb-5 md:mb-6 lg:mb-7">
        <p className="mt-2 text-sm md:text-base lg:text-lg 2xl:text-lg 3xl:text-xl font-bold text-slate-400 uppercase tracking-[0.2em]">
          {t('sidebar.homeLabel', 'Inicio rápido')}
        </p>
      </div>

      {/* Grid responsivo adaptado a todos los tamaños */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-4.5 lg:gap-5 2xl:gap-6 3xl:gap-7">
        {HOME_SECTIONS.filter(section => isSectionVisible(section.key)).map(section => {
          const visibleItems = section.items.filter(item => isVisible(item.menuId));
          if (visibleItems.length === 0) return null;

          return (
            <div
              key={section.key}
              className={`rounded-2xl border ${section.borderColor} bg-slate-900/70 p-4 md:p-5 lg:p-5 2xl:p-6 3xl:p-7 shadow-sm hover:shadow-lg transition-all backdrop-blur-sm flex flex-col`}
            >
              <div className="flex items-center gap-2.5 mb-3.5 md:mb-4">
                <div className={`w-10 h-10 md:w-11 md:h-11 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11 3xl:w-12 3xl:h-12 rounded-lg md:rounded-xl bg-gradient-to-br ${section.color} text-white flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <i className={`fa-solid ${section.icon} text-xs md:text-sm lg:text-xs 2xl:text-sm 3xl:text-base`}></i>
                </div>
                <h3 className={`text-xs md:text-sm lg:text-sm 2xl:text-base 3xl:text-lg font-black uppercase tracking-widest ${section.textColor} line-clamp-2`}>
                  {t(section.titleKey)}
                </h3>
              </div>

              <div className="space-y-1.5 md:space-y-1.5 lg:space-y-2 2xl:space-y-2 3xl:space-y-2.5 flex-1">
                {visibleItems.map(item => (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    className="w-full flex items-center gap-2.5 px-3 md:px-3.5 lg:px-4 2xl:px-4 py-2 md:py-2 lg:py-2.5 2xl:py-2.5 3xl:py-3 rounded-lg md:rounded-xl text-left bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <i className={`fa-solid ${item.icon} text-xs md:text-xs lg:text-xs 2xl:text-sm 3xl:text-base ${section.textColor} opacity-90 group-hover:opacity-100 flex-shrink-0`}></i>
                    <span className="text-xs md:text-sm lg:text-sm 2xl:text-base 3xl:text-lg font-semibold text-white/90 group-hover:text-white truncate">
                      {item.label || t(item.labelKey!)}
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
