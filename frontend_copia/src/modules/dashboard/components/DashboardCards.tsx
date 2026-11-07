import React from 'react';
import { useTranslation } from 'react-i18next';
import { LeagueTable } from '@modules/competicion';
import type { CompetitionTeam } from '@modules/competicion';

interface DashboardCardsProps {
  competitionTeams?: CompetitionTeam[];
}

const DashboardCards: React.FC<DashboardCardsProps> = ({ competitionTeams }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col animate-fade-in max-w-[1600px] mx-auto pb-20">

      <div className="flex flex-col gap-4 md:gap-6 px-1">
        <div className="flex items-center gap-3 px-1">
            <div className="w-1.5 h-5 md:h-6 bg-[var(--accent)] rounded-full"></div>
            <h3 className="text-sport-primary font-black text-lg md:text-xl uppercase tracking-tighter">{t('competition.standings')}</h3>
        </div>
        <LeagueTable teams={competitionTeams} />
      </div>
    </div>
  );
};

export default DashboardCards;

