import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes/types';
import { getTeamConfig } from '@shared/services/dataService';
import PlayerStatsSummary from './PlayerStatsSummary';

const getMyTeamName = (): string => {
  try { return getTeamConfig()?.teamName || ''; } catch { return ''; }
};

const isMyTeam = (name: string): boolean => {
  const my = getMyTeamName();
  if (!my) return false;
  return name.toLowerCase().includes(my.toLowerCase());
};

interface LatestMatchesProps {
  matches: Match[];
  onSave: (match: Match) => Promise<void>;
  onDelete: (id: number | string) => Promise<void>;
  onEdit?: (match: Match) => void;
  onClickMatch?: (match: Match) => void;
  onCreate?: () => void;
  competitionTeams?: CompetitionTeam[];
  clubes?: Club[];
}

const LatestMatches: React.FC<LatestMatchesProps> = ({ matches, onSave, onDelete, onEdit, onClickMatch, onCreate, competitionTeams = [], clubes = [] }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'STATS'>('MATCHES');

  const clubNameById = useMemo(() => new Map(clubes.map((club) => [String(club.id), club.nombre])), [clubes]);

  // Fallback por nombre para partidos antiguos guardados sin clubId por equipo: si dos
  // clubes tienen un equipo homónimo (p.ej. "Juvenil A"), esto solo puede acertar uno de los dos.
  const clubNameByTeamName = useMemo(() => {
    const map = new Map<string, string>();
    competitionTeams.forEach((team) => {
      const teamName = team.equipo || team.nombre;
      const clubName = team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined;
      if (teamName && clubName && !map.has(teamName)) map.set(teamName, clubName);
    });
    return map;
  }, [competitionTeams, clubNameById]);

  // Preferimos el clubId guardado con el propio partido (exacto, no ambiguo);
  // solo caemos al emparejamiento por nombre para partidos guardados antes de este fix.
  const resolveClubLabel = (teamName: string, clubId?: string): string | undefined =>
    (clubId && clubNameById.get(String(clubId))) || clubNameByTeamName.get(teamName);
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">{t('matchesList.matchHistory')}</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('matchesList.matchHistoryDesc')}</p>
        </div>
        <button
          onClick={onCreate}
          className="bg-sport-primary hover:bg-sport-primary-dark text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl"
        >
          <i className="fa-solid fa-plus"></i>
          {t('matchesList.newMatch')}
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('MATCHES')}
          className={`px-6 py-3 flex items-center gap-2 transition-all border-b-[3px] whitespace-nowrap ${activeTab === 'MATCHES' ? 'border-sport-primary text-sport-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-calendar-days text-[10px]"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">{t('matchesList.tabMatches')}</span>
        </button>
        <button
          onClick={() => setActiveTab('STATS')}
          className={`px-6 py-3 flex items-center gap-2 transition-all border-b-[3px] whitespace-nowrap ${activeTab === 'STATS' ? 'border-sport-primary text-sport-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-table text-[10px]"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">{t('matchesList.tabStats')}</span>
        </button>
      </div>

      {activeTab === 'STATS' ? (
        <PlayerStatsSummary matches={matches} />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map((match) => {
          const local = match.localTeam || 'DEMO';
          const visitor = match.visitorTeam || 'Rival';
          const localClubLabel = resolveClubLabel(local, match.localTeamClubId);
          const visitorClubLabel = resolveClubLabel(visitor, match.visitorTeamClubId);

          return (
            <div 
              key={match.id} 
              onClick={() => onClickMatch && onClickMatch(match)}
              className="bg-white p-4 md:p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 group relative overflow-hidden cursor-pointer hover:border-red-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {match.jornada || match.competition}
                  </span>
                  <span className="text-slate-300 text-[10px] font-bold">
                    {new Date(match.date).toLocaleDateString()} {match.time ? `• ${match.time}h` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:gap-6">
                  <div className="text-center min-w-0 flex-1 md:flex-none md:min-w-[100px]">
                    {localClubLabel && (
                      <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                        {localClubLabel}
                      </p>
                    )}
                    <p className={`font-black text-sm md:text-lg uppercase leading-none mb-1 truncate ${isMyTeam(local) ? 'text-[var(--accent)]' : 'text-slate-600'}`}>
                      {local}
                    </p>
                    <p className="text-[8px] font-black text-black tracking-[0.3em] uppercase">{t('matchesList.home')}</p>
                  </div>

                  <div className="flex flex-col items-center shrink-0">
                    {match.status === 'Finished' ? (
                      <div className="bg-[var(--accent)] text-white font-black text-base md:text-2xl px-3 md:px-6 py-2 rounded-2xl shadow-lg shadow-[var(--accent)]/20">
                        {match.score}
                      </div>
                    ) : (
                      <div className="bg-slate-50 text-slate-400 font-black px-3 md:px-6 py-2 rounded-2xl border border-slate-100">
                        VS
                      </div>
                    )}
                  </div>

                  <div className="text-center min-w-0 flex-1 md:flex-none md:min-w-[100px]">
                    {visitorClubLabel && (
                      <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                        {visitorClubLabel}
                      </p>
                    )}
                    <p className={`font-black text-sm md:text-lg uppercase leading-none mb-1 truncate ${isMyTeam(visitor) ? 'text-[var(--accent)]' : 'text-slate-600'}`}>
                      {visitor}
                    </p>
                    <p className="text-[8px] font-black text-black tracking-[0.3em] uppercase">{t('matchesList.away')}</p>
                  </div>
                </div>
              </div>

              <div className="md:ml-8 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 relative z-10">
                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                  match.status === 'Finished' ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600 animate-pulse'
                }`}>
                  {match.status}
                </span>
                <div className="flex gap-2">
                   <button 
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit && onEdit(match);
                    }}
                    className="w-10 h-10 bg-white border border-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-all flex items-center justify-center shadow-sm"
                    title={t('matchesList.editViaEvents')}
                   >
                     <i className="fa-regular fa-pen-to-square text-sm"></i>
                   </button>
                   <button 
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(String(match.id));
                    }}
                    className="w-10 h-10 bg-white border border-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-all flex items-center justify-center shadow-sm"
                    title={t('matchesList.deleteEvent')}
                   >
                     <i className="fa-regular fa-trash-can text-sm"></i>
                   </button>
                </div>
              </div>
            </div>
          );
        })}

        {matches.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-40">
            <i className="fa-solid fa-calendar-xmark text-4xl mb-4 text-slate-300"></i>
            <p className="font-black text-sm uppercase tracking-widest text-slate-400">{t('matchesList.noMatches')}</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default LatestMatches;
