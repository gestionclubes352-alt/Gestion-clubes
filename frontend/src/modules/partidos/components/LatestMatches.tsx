import React, { useEffect, useMemo, useState } from 'react';
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

// El equipo "propio" de un partido es el que coincide con el club activo;
// si no se puede determinar, se usa el local como mejor esfuerzo.
const ownTeamNameOf = (match: Match): string => {
  const local = match.localTeam || '';
  const visitor = match.visitorTeam || '';
  if (isMyTeam(local)) return local;
  if (isMyTeam(visitor)) return visitor;
  return local || visitor;
};

const ALL_FILTER = 'ALL';

interface LatestMatchesProps {
  matches: Match[];
  onSave: (match: Match) => Promise<void>;
  onDelete: (id: number | string) => Promise<void>;
  onEdit?: (match: Match) => void;
  onClickMatch?: (match: Match) => void;
  onCreate?: () => void;
  competitionTeams?: CompetitionTeam[];
  clubes?: Club[];
  onSelectPlayer?: (playerId: string) => void;
}

const LatestMatches: React.FC<LatestMatchesProps> = ({ matches, onSave, onDelete, onEdit, onClickMatch, onCreate, competitionTeams = [], clubes = [], onSelectPlayer }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'STATS'>('MATCHES');

  const [teamFilter, setTeamFilter] = useState<string>(ALL_FILTER);
  const [competitionFilter, setCompetitionFilter] = useState<string>(ALL_FILTER);
  const [jornadaFilter, setJornadaFilter] = useState<string>(ALL_FILTER);

  const teamOptions = useMemo(() => {
    const names = new Set<string>();
    matches.forEach((m) => { const name = ownTeamNameOf(m); if (name) names.add(name); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matches]);

  const matchesByTeam = useMemo(
    () => (teamFilter === ALL_FILTER ? matches : matches.filter((m) => ownTeamNameOf(m) === teamFilter)),
    [matches, teamFilter]
  );

  const competitionOptions = useMemo(() => {
    const names = new Set<string>();
    matchesByTeam.forEach((m) => { if (m.competition) names.add(m.competition); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matchesByTeam]);

  const matchesByTeamAndCompetition = useMemo(
    () => (competitionFilter === ALL_FILTER ? matchesByTeam : matchesByTeam.filter((m) => m.competition === competitionFilter)),
    [matchesByTeam, competitionFilter]
  );

  const jornadaOptions = useMemo(() => {
    const names = new Set<string>();
    matchesByTeamAndCompetition.forEach((m) => { if (m.jornada) names.add(m.jornada); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [matchesByTeamAndCompetition]);

  const filteredMatches = useMemo(
    () => (jornadaFilter === ALL_FILTER ? matchesByTeamAndCompetition : matchesByTeamAndCompetition.filter((m) => m.jornada === jornadaFilter)),
    [matchesByTeamAndCompetition, jornadaFilter]
  );

  // Si cambia equipo/competición, la jornada elegida puede dejar de ser válida.
  useEffect(() => {
    if (jornadaFilter !== ALL_FILTER && !jornadaOptions.includes(jornadaFilter)) {
      setJornadaFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaOptions]);

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

  const clubLogoById = useMemo(() => new Map(clubes.map((club) => [String(club.id), club.logoUrl])), [clubes]);

  // Preferimos el clubId guardado con el propio partido (exacto, no ambiguo);
  // solo caemos al emparejamiento por nombre para partidos guardados antes de este fix.
  const resolveClubLabel = (teamName: string, clubId?: string): string | undefined =>
    (clubId && clubNameById.get(String(clubId))) || clubNameByTeamName.get(teamName);

  const resolveClubLogo = (clubId?: string): string | undefined =>
    clubId ? clubLogoById.get(String(clubId)) : undefined;
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
        <PlayerStatsSummary matches={matches} onSelectPlayer={onSelectPlayer} />
      ) : (
      <>
      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('playerStatsSummary.filterTeam')}
          </label>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>{t('playerStatsSummary.allTeams')}</option>
            {teamOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('playerStatsSummary.filterCompetition')}
          </label>
          <select
            value={competitionFilter}
            onChange={(e) => setCompetitionFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>{t('playerStatsSummary.allCompetitions')}</option>
            {competitionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('matchesList.filterJornada')}
          </label>
          <select
            value={jornadaFilter}
            onChange={(e) => setJornadaFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>{t('matchesList.allJornadas')}</option>
            {jornadaOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMatches.map((match) => {
          const local = match.localTeam || 'DEMO';
          const visitor = match.visitorTeam || 'Rival';
          const localClubLabel = resolveClubLabel(local, match.localTeamClubId);
          const visitorClubLabel = resolveClubLabel(visitor, match.visitorTeamClubId);
          const localLogo = resolveClubLogo(match.localTeamClubId);
          const visitorLogo = resolveClubLogo(match.visitorTeamClubId);

          return (
            <div
              key={match.id}
              onClick={() => onClickMatch && onClickMatch(match)}
              className="bg-white p-3 md:p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-slate-100 flex flex-col gap-2.5 group relative overflow-hidden cursor-pointer hover:border-red-200"
            >
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-wider">
                  {match.jornada || match.competition}
                </span>
                <span className="text-slate-400 text-[8px] font-bold">
                  {new Date(match.date).toLocaleDateString()} {match.time ? `• ${match.time}h` : ''}
                </span>
                <span className={`ml-auto px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-wider ${
                  match.status === 'Finished' ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600 animate-pulse'
                }`}>
                  {match.status}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 min-h-20">
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">LOCAL</p>
                  {localLogo && (
                    <img src={localLogo} alt={localClubLabel} className="h-8 w-8 object-contain mb-1" />
                  )}
                  {localClubLabel && (
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 leading-tight truncate w-full">
                      {localClubLabel}
                    </p>
                  )}
                  <p className={`font-black text-[11px] md:text-xs uppercase leading-tight truncate w-full ${isMyTeam(local) ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                    {local}
                  </p>
                </div>

                <div className="flex flex-col items-center shrink-0 gap-1.5">
                  {match.status === 'Finished' ? (
                    <div className="bg-[var(--accent)] text-white font-black text-sm px-2.5 md:px-3 py-1 rounded-xl shadow-lg shadow-[var(--accent)]/20">
                      {match.score}
                    </div>
                  ) : (
                    <div className="bg-slate-50 text-slate-400 font-black text-[10px] px-2.5 md:px-3 py-1 rounded-xl border border-slate-200">
                      VS
                    </div>
                  )}
                  {match.location && (
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-16 text-center">
                      {match.location}
                    </p>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">VISITANTES</p>
                  {visitorLogo && (
                    <img src={visitorLogo} alt={visitorClubLabel} className="h-8 w-8 object-contain mb-1" />
                  )}
                  {visitorClubLabel && (
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 leading-tight truncate w-full">
                      {visitorClubLabel}
                    </p>
                  )}
                  <p className={`font-black text-[11px] md:text-xs uppercase leading-tight truncate w-full ${isMyTeam(visitor) ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                    {visitor}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit && onEdit(match);
                  }}
                  className="w-8 h-8 bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-lg transition-all flex items-center justify-center shadow-sm text-xs"
                  title={t('matchesList.editViaEvents')}
                >
                  <i className="fa-regular fa-pen-to-square text-xs"></i>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(String(match.id));
                  }}
                  className="w-8 h-8 bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-lg transition-all flex items-center justify-center shadow-sm text-xs"
                  title={t('matchesList.deleteEvent')}
                >
                  <i className="fa-regular fa-trash-can text-xs"></i>
                </button>
              </div>
            </div>
          );
        })}

        {filteredMatches.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-40">
            <i className="fa-solid fa-calendar-xmark text-4xl mb-4 text-slate-300"></i>
            <p className="font-black text-sm uppercase tracking-widest text-slate-400">{t('matchesList.noMatches')}</p>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default LatestMatches;
