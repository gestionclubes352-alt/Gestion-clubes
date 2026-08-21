import React from 'react';
import type { CompetitionTeam } from '../types';
import type { Match } from '../../partidos/types';
import LeagueTable from './LeagueTable';

interface LeagueTableFullPageProps {
  teams?: CompetitionTeam[];
  matches?: Match[];
  clubId?: string;
  clubName?: string;
}

const LeagueTableFullPage: React.FC<LeagueTableFullPageProps> = ({
  teams = [],
  matches = [],
  clubId,
  clubName,
}) => {
  return (
    <div className="min-h-full w-full px-4 pt-4 pb-24 md:px-6 md:pt-5 lg:px-8 lg:pt-6 2xl:px-10 2xl:pt-6 3xl:px-12 3xl:pt-6">
      <LeagueTable
        teams={teams}
        matches={matches}
        clubId={clubId}
        clubName={clubName}
      />
    </div>
  );
};

export default LeagueTableFullPage;
