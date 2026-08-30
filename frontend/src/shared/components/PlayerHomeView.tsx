import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PLAYER_HOME_ITEMS: Array<{ labelKey: string; icon: string; route: string; color: string }> = [
  { labelKey: 'sidebar.myDataLabel', icon: 'fa-users', route: '/plantillas', color: 'from-blue-500 to-blue-700' },
  { labelKey: 'sidebar.mediciones', icon: 'fa-face-smile', route: '/mediciones/registro', color: 'from-rose-500 to-rose-700' },
  { labelKey: 'sidebar.videoLibraryLabel', icon: 'fa-video', route: '/videoteca', color: 'from-purple-500 to-purple-700' },
  { labelKey: 'sidebar.competitionLabel', icon: 'fa-ranking-star', route: '/competicion', color: 'from-emerald-500 to-emerald-700' },
  { labelKey: 'sidebar.calendarLabel', icon: 'fa-calendar-days', route: '/calendario', color: 'from-amber-500 to-amber-700' },
];

const PlayerHomeView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-full w-full px-3 pt-4 pb-28 sm:px-4 sm:pb-24 md:px-6 md:pt-5 lg:px-8 lg:pt-6">
      <div className="mb-4 sm:mb-5 md:mb-6 lg:mb-7">
        <p className="mt-2 text-xs sm:text-sm md:text-base lg:text-lg font-bold text-slate-400 uppercase tracking-[0.2em]">
          {t('sidebar.homeLabel', 'Inicio rápido')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-4.5 lg:gap-5">
        {PLAYER_HOME_ITEMS.map(item => (
          <button
            key={item.route}
            onClick={() => navigate(item.route)}
            className="flex items-center gap-3.5 rounded-2xl border border-slate-200/10 bg-slate-900/70 p-4 sm:p-5 shadow-sm hover:shadow-lg transition-all backdrop-blur-sm text-left group min-h-[72px]"
          >
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-sm flex-shrink-0`}>
              <i className={`fa-solid ${item.icon} text-base`}></i>
            </div>
            <span className="text-sm sm:text-base font-black uppercase tracking-widest text-white/90 group-hover:text-white truncate">
              {t(item.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlayerHomeView;
