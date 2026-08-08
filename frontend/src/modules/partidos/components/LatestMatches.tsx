import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes/types';
import { getTeamConfig } from '@shared/services/dataService';
import PlayerStatsSummary from './PlayerStatsSummary';

const getMyClubIdsForCompetition = (competition: string, competitionTeams: CompetitionTeam[]): Set<string> => {
  const ids = new Set<string>();
  competitionTeams
    .filter(team => team.competicion === competition && team.clubId)
    .forEach(team => {
      if (team.clubId) ids.add(String(team.clubId));
    });
  return ids;
};

const getMyTeamNamesForCompetition = (competition: string, competitionTeams: CompetitionTeam[]): Set<string> => {
  const names = new Set<string>();
  // Agregar nombres conocidos del equipo (hardcoded como fallback)
  names.add('ipc la escuela');
  names.add('juvenil a');

  competitionTeams
    .filter(team => team.competicion === competition)
    .forEach(team => {
      if (team.nombreEnFed) names.add(team.nombreEnFed.toLowerCase());
      if (team.nombre) names.add(team.nombre.toLowerCase());
      if (team.equipo) names.add(team.equipo.toLowerCase());
    });
  return names;
};

const isMyTeam = (name: string, myTeamNames: Set<string> | undefined): boolean => {
  if (!myTeamNames || myTeamNames.size === 0) return false;
  return myTeamNames.has(name.toLowerCase());
};

// El equipo "propio" de un partido es el que coincide con nuestros equipos en esa competición.
const ownTeamNameOf = (match: Match, competitionTeams: CompetitionTeam[]): string => {
  const local = match.localTeam || '';
  const visitor = match.visitorTeam || '';

  // Primero, intentar identificar por clubId (más confiable)
  const myClubIds = getMyClubIdsForCompetition(match.competition, competitionTeams);
  if (myClubIds.size > 0) {
    if (match.localTeamClubId && myClubIds.has(String(match.localTeamClubId))) return local;
    if (match.visitorTeamClubId && myClubIds.has(String(match.visitorTeamClubId))) return visitor;
  }

  // Fallback: identificar por nombre
  const myTeams = getMyTeamNamesForCompetition(match.competition, competitionTeams);
  if (isMyTeam(local, myTeams)) return local;
  if (isMyTeam(visitor, myTeams)) return visitor;
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
    matches.forEach((m) => { const name = ownTeamNameOf(m, competitionTeams); if (name) names.add(name); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matches, competitionTeams]);

  const matchesByTeam = useMemo(
    () => (teamFilter === ALL_FILTER ? matches : matches.filter((m) => ownTeamNameOf(m, competitionTeams) === teamFilter)),
    [matches, teamFilter, competitionTeams]
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

  const groupedMatches = useMemo(() => {
    const groups = new Map<string, Match[]>();
    filteredMatches.forEach((match) => {
      const key = `${match.competition}|${match.jornada}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(match);
    });
    return Array.from(groups.entries()).map(([key, matches]) => {
      const [competition, jornada] = key.split('|');
      return { competition, jornada, matches: matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
    }).sort((a, b) => {
      if (a.competition !== b.competition) return a.competition.localeCompare(b.competition, 'es');
      const numA = parseInt(a.jornada) || 0;
      const numB = parseInt(b.jornada) || 0;
      return numA - numB;
    });
  }, [filteredMatches]);

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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCompetitionFilter(ALL_FILTER)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                competitionFilter === ALL_FILTER
                  ? 'bg-sport-primary text-white border-sport-primary shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-sport-primary/40'
              }`}
            >
              {t('playerStatsSummary.allCompetitions')}
            </button>
            {competitionOptions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCompetitionFilter(name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                  competitionFilter === name
                    ? 'bg-sport-primary text-white border-sport-primary shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-sport-primary/40'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {groupedMatches.map(({ competition, jornada, matches }) => (
          <div key={`${competition}|${jornada}`} className="space-y-4">
            <div className="bg-gradient-to-r from-sport-primary/10 to-transparent p-3 md:p-4 rounded-lg border-l-4 border-sport-primary">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Competición</p>
                  <p className="text-xs font-black text-slate-800 uppercase">{competition}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Jornada</p>
                  <p className="text-xs font-black text-sport-primary uppercase">{jornada}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fecha</p>
                  <p className="text-xs font-black text-slate-800">
                    {matches.length > 0 ? new Date(matches[0].date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {matches.map((match) => {
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
              className="bg-white p-1.5 md:p-2 rounded-lg shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col gap-1 group relative overflow-hidden cursor-pointer hover:border-red-200"
            >
              <div className="flex items-center justify-center gap-1">
                {match.nombreInterno && (
                  <span className="px-2 py-0.5 rounded-md text-[5px] font-black uppercase tracking-wider bg-blue-50 text-blue-600">
                    {match.nombreInterno}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-end">
                <span className={`px-1 py-0.5 rounded-md text-[5px] font-black uppercase tracking-wider shrink-0 ${
                  match.status === 'Finished' ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600 animate-pulse'
                }`}>
                  {match.status}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 min-h-16">
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">LOCAL</p>
                  {localLogo && (
                    <img src={localLogo} alt={localClubLabel} className="h-5 w-5 object-contain mb-0.5" />
                  )}
                  {localClubLabel && (
                    <p className="text-[5px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 leading-tight truncate w-full">
                      {localClubLabel}
                    </p>
                  )}
                  <p className={`font-black text-xs md:text-sm uppercase leading-tight truncate w-full ${isMyTeam(local) ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                    {local}
                  </p>
                </div>

                <div className="flex flex-col items-center shrink-0 gap-0.5">
                  <p className="text-red-600 font-black text-sm md:text-base">
                    {match.time || '—'}
                  </p>
                  {match.status === 'Finished' ? (
                    <div className="bg-[var(--accent)] text-white font-black text-[10px] px-1.5 py-0.5 rounded-md shadow-lg shadow-[var(--accent)]/20">
                      {match.score}
                    </div>
                  ) : (
                    <div className="bg-red-50 text-red-600 font-black text-[8px] px-1.5 py-0.5 rounded-md border border-red-200">
                      VS
                    </div>
                  )}
                  {match.location && (
                    <p className="text-[5px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-16 text-center">
                      {match.location}
                    </p>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">VISITANTES</p>
                  {visitorLogo && (
                    <img src={visitorLogo} alt={visitorClubLabel} className="h-5 w-5 object-contain mb-0.5" />
                  )}
                  {visitorClubLabel && (
                    <p className="text-[5px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 leading-tight truncate w-full">
                      {visitorClubLabel}
                    </p>
                  )}
                  <p className={`font-black text-xs md:text-sm uppercase leading-tight truncate w-full ${isMyTeam(visitor) ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                    {visitor}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-0.5 border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit && onEdit(match);
                  }}
                  className="w-5 h-5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-md transition-all flex items-center justify-center shadow-sm text-[8px]"
                  title={t('matchesList.editViaEvents')}
                >
                  <i className="fa-regular fa-pen-to-square text-[8px]"></i>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(String(match.id));
                  }}
                  className="w-5 h-5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-md transition-all flex items-center justify-center shadow-sm text-[8px]"
                  title={t('matchesList.deleteEvent')}
                >
                  <i className="fa-regular fa-trash-can text-[8px]"></i>
                </button>
              </div>
            </div>
          );
        })}
            </div>
          </div>
        ))}

        {groupedMatches.length === 0 && (
          <div className="py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-40">
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
