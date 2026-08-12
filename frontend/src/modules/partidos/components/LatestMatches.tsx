import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes/types';
import { getTeamConfig } from '@shared/services/dataService';
import PlayerStatsSummary from './PlayerStatsSummary';
import SearchableSelect from '@shared/components/SearchableSelect';
import { compareEquipoNames } from '@shared/components/EquipoSelect';

const getMyClubIdsForCompetition = (competition: string, competitionTeams: CompetitionTeam[]): Set<string> => {
  const ids = new Set<string>();
  competitionTeams
    .filter(team => isSameCompetition(team.competicion, competition) && team.clubId)
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
    .filter(team => isSameCompetition(team.competicion, competition))
    .forEach(team => {
      if (team.nombreEnFed) names.add(normalizeTeamKey(team.nombreEnFed));
      if (team.nombre) names.add(normalizeTeamKey(team.nombre));
      if (team.equipo) names.add(normalizeTeamKey(team.equipo));
    });
  return names;
};

const isMyTeam = (name: string, myTeamNames: Set<string> | undefined): boolean => {
  if (!myTeamNames || myTeamNames.size === 0) return false;
  return myTeamNames.has(normalizeTeamKey(name));
};

const normalizeTeamKey = (value: string | undefined) =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const containsTeamWords = (value: string | undefined, teamValue: string | undefined) => {
  const source = normalizeTeamKey(value);
  const target = normalizeTeamKey(teamValue);
  if (!source || !target) return false;
  return target.split(' ').every(word => source.includes(word));
};

const isSameCompetition = (teamCompetition: string | undefined, matchCompetition: string | undefined) => {
  if (!teamCompetition || !matchCompetition) return false;
  return normalizeTeamKey(teamCompetition) === normalizeTeamKey(matchCompetition);
};

const internalNameOfTeam = (team: CompetitionTeam) => (team.equipo || team.nombre || '').trim();

const isLikelyInternalTeamName = (value: string | undefined) => {
  const normalized = normalizeTeamKey(value);
  return /^(primer equipo|filial|senior|juvenil|cadete|infantil|alevin|benjamin|prebenjamin)(\s+[a-z0-9]+)?$/.test(normalized);
};

const dateKeyOf = (date: string | undefined) => String(date || '').slice(0, 10);

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
  ownClubId?: string | number;
  onSelectPlayer?: (playerId: string) => void;
}

const LatestMatches: React.FC<LatestMatchesProps> = ({ matches, onSave, onDelete, onEdit, onClickMatch, onCreate, competitionTeams = [], clubes = [], ownClubId, onSelectPlayer }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'STATS'>('MATCHES');

  const [competitionFilter, setCompetitionFilter] = useState<string>(ALL_FILTER);
  const [jornadaFilter, setJornadaFilter] = useState<string>(ALL_FILTER);
  const [equipoInternoFilter, setEquipoInternoFilter] = useState<string>(ALL_FILTER);

  // Solo nuestros propios equipos (por clubId), no los rivales del catálogo de la competición.
  const ownCompetitionTeams = useMemo(
    () => (ownClubId ? competitionTeams.filter((team) => String(team.clubId) === String(ownClubId)) : []),
    [competitionTeams, ownClubId]
  );

  // Mapa nombreEnFed -> nombre interno canónico (p.ej. "juvenil a" de la federación -> "Juvenil A"),
  // para poder resolver el equipo interno de partidos de liga que no tienen nombreInterno rellenado a mano.
  // Se calcula primero porque lo usa resolveEquipoInterno.
  const internalNameByFedName = useMemo(() => {
    const map = new Map<string, string>();
    ownCompetitionTeams.forEach((team) => {
      const canonical = (team.equipo || team.nombre || '').trim();
      if (!canonical) return;
      map.set(normalizeTeamKey(canonical), canonical);
      const fedName = normalizeTeamKey(team.nombreEnFed);
      if (fedName) map.set(fedName, canonical);
    });
    return map;
  }, [ownCompetitionTeams]);

  // Equipo Interno es el filtro raíz: se calcula a partir de TODOS los matches y los equipos propios
  const equipoInternoOptions = useMemo(() => {
    const names = new Map<string, string>();
    const addName = (name?: string) => {
      const value = name?.trim();
      const key = normalizeTeamKey(value);
      if (value && key && !names.has(key)) names.set(key, value);
    };

    ownCompetitionTeams.forEach((team) => addName(internalNameOfTeam(team)));
    matches.forEach((m) => {
      addName(isLikelyInternalTeamName(m.nombreInterno) ? m.nombreInterno : undefined);
      addName(isLikelyInternalTeamName(m.team) ? m.team : undefined);
    });
    return Array.from(names.values()).sort(compareEquipoNames);
  }, [ownCompetitionTeams, matches]);

  // Filtrar por Equipo Interno (filtro primario)
  const matchesByEquipoInterno = useMemo(
    () => (equipoInternoFilter === ALL_FILTER ? matches : matches.filter((m) => resolveEquipoInterno(m) === equipoInternoFilter)),
    [matches, equipoInternoFilter, competitionTeams, ownCompetitionTeams, internalNameByFedName]
  );

  // Competición depende de Equipo Interno
  const competitionOptions = useMemo(() => {
    const names = new Set<string>();
    matchesByEquipoInterno.forEach((m) => { if (m.competition) names.add(m.competition); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matchesByEquipoInterno]);

  // Filtrar por Competición (filtro secundario, depende de equipoInterno)
  const matchesByEquipoInternoAndCompetition = useMemo(
    () => (competitionFilter === ALL_FILTER ? matchesByEquipoInterno : matchesByEquipoInterno.filter((m) => m.competition === competitionFilter)),
    [matchesByEquipoInterno, competitionFilter]
  );

  const normalizeInternalCandidate = (candidate?: string): string | undefined => {
    const key = normalizeTeamKey(candidate);
    if (!key) return undefined;
    return internalNameByFedName.get(key) || (isLikelyInternalTeamName(candidate) ? candidate?.trim() : undefined);
  };

  const findInternalNameForCandidate = (match: Match, candidate?: string): string | undefined => {
    const normalizedInternal = normalizeInternalCandidate(candidate);
    if (normalizedInternal) return normalizedInternal;

    const key = normalizeTeamKey(candidate);
    if (!key) return undefined;

    const competitionTeams = ownCompetitionTeams.filter((team) => isSameCompetition(team.competicion, match.competition));
    const pools = competitionTeams.length > 0 ? [competitionTeams, ownCompetitionTeams] : [ownCompetitionTeams];

    for (const pool of pools) {
      const byInternalOrFed = pool.find((team) =>
        [team.equipo, team.nombreEnFed].map(normalizeTeamKey).includes(key)
      );
      if (byInternalOrFed) return internalNameOfTeam(byInternalOrFed);

      const byClubName = pool.filter((team) => normalizeTeamKey(team.nombre) === key);
      if (byClubName.length === 1) return internalNameOfTeam(byClubName[0]);
    }

    return internalNameByFedName.get(key);
  };

  const findInternalNameByCompetitionContext = (match: Match): string | undefined => {
    const candidates = [match.nombreInterno, match.team, match.localTeam, match.visitorTeam];
    const clubIds = [match.localTeamClubId, match.visitorTeamClubId].filter(Boolean).map(String);

    const matchesSide = (team: CompetitionTeam) => {
      const aliases = [team.equipo, team.nombreEnFed, team.nombre].map(normalizeTeamKey).filter(Boolean);
      const candidateMatch = candidates.some(candidate => aliases.includes(normalizeTeamKey(candidate)));
      const clubIdMatch = team.clubId != null && clubIds.includes(String(team.clubId));
      return candidateMatch || clubIdMatch;
    };

    const contextualMatches = ownCompetitionTeams.filter((team) => {
      if (!matchesSide(team)) return false;

      const internal = internalNameOfTeam(team);
      const etapa = team.etapa || internal.split(' ')[0];
      const competitionMatches =
        isSameCompetition(team.competicion, match.competition) ||
        containsTeamWords(match.competition, internal) ||
        containsTeamWords(match.competition, etapa);

      return competitionMatches;
    });

    const uniqueInternalNames = Array.from(new Set(contextualMatches.map(internalNameOfTeam).filter(Boolean)));
    return uniqueInternalNames.length === 1 ? uniqueInternalNames[0] : undefined;
  };

  const resolveEquipoInterno = (match: Match): string => {
    const own = ownCompetitionTeams.length > 0 ? ownTeamNameOf(match, ownCompetitionTeams) : '';
    const candidates = [match.nombreInterno, match.team, match.localTeam, match.visitorTeam, own];
    for (const candidate of candidates) {
      const mapped = findInternalNameForCandidate(match, candidate);
      if (mapped) return mapped;
    }
    const byCompetitionContext = findInternalNameByCompetitionContext(match);
    if (byCompetitionContext) return byCompetitionContext;
    return normalizeInternalCandidate(match.nombreInterno) || normalizeInternalCandidate(match.team) || own || match.nombreInterno || match.team || '';
  };

  // Jornada depende de Equipo Interno y Competición
  const jornadaOptions = useMemo(() => {
    const names = new Set<string>();
    matchesByEquipoInternoAndCompetition.forEach((m) => { if (m.jornada) names.add(m.jornada); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [matchesByEquipoInternoAndCompetition]);

  // Filtro final: aplicar filtro de Jornada
  const filteredMatches = useMemo(
    () => (jornadaFilter === ALL_FILTER ? matchesByEquipoInternoAndCompetition : matchesByEquipoInternoAndCompetition.filter((m) => m.jornada === jornadaFilter)),
    [matchesByEquipoInternoAndCompetition, jornadaFilter]
  );

  // Si cambia Equipo Interno, la competición elegida puede dejar de ser válida
  useEffect(() => {
    if (competitionFilter !== ALL_FILTER && !competitionOptions.includes(competitionFilter)) {
      setCompetitionFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionOptions]);

  // Si cambian Equipo Interno o Competición, la jornada elegida puede dejar de ser válida
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

  const findCompetitionTeamForSide = (match: Match, teamName: string, clubId?: string): CompetitionTeam | undefined => {
    const key = normalizeTeamKey(teamName);
    const sameCompetitionTeams = competitionTeams.filter((team) => isSameCompetition(team.competicion, match.competition));
    const pools = sameCompetitionTeams.length > 0 ? [sameCompetitionTeams, competitionTeams] : [competitionTeams];
    const matchesName = (team: CompetitionTeam) =>
      [team.equipo, team.nombreEnFed, team.nombre].some((value) => normalizeTeamKey(value) === key);

    for (const pool of pools) {
      if (clubId) {
        const teamsByClub = pool.filter((team) => String(team.clubId ?? '') === String(clubId));
        const exact = teamsByClub.find(matchesName) || (teamsByClub.length === 1 ? teamsByClub[0] : undefined);
        if (exact) return exact;
      }

      const byName = pool.find(matchesName);
      if (byName) return byName;
    }

    return undefined;
  };

  const sideDisplayOf = (match: Match, sideName: string, clubId?: string) => {
    const competitionTeam = findCompetitionTeamForSide(match, sideName, clubId);
    const clubName = resolveClubLabel(sideName, clubId) || competitionTeam?.nombre || sideName;
    const sideIsOwn =
      (!!ownClubId && !!clubId && String(clubId) === String(ownClubId)) ||
      (ownCompetitionTeams.length > 0 && normalizeTeamKey(ownTeamNameOf(match, ownCompetitionTeams)) === normalizeTeamKey(sideName));
    const federationName =
      competitionTeam?.nombreEnFed && normalizeTeamKey(competitionTeam.nombreEnFed) !== normalizeTeamKey(clubName)
        ? competitionTeam.nombreEnFed
        : undefined;
    const teamName = (sideIsOwn ? resolveEquipoInterno(match) : '') || competitionTeam?.equipo || competitionTeam?.etapa || federationName || sideName;

    return {
      clubName,
      teamName,
      logo: resolveClubLogo(clubId) || competitionTeam?.logoUrl,
      isOwn: sideIsOwn,
    };
  };

  const groupedMatches = useMemo(() => {
    const groups = new Map<string, Match[]>();
    filteredMatches.forEach((match) => {
      const jornada = match.jornada || '-';
      const key = `${match.competition}|${jornada}|${dateKeyOf(match.date)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(match);
    });
    return Array.from(groups.entries()).map(([key, matches]) => {
      const [competition, jornada] = key.split('|');
      return { groupKey: key, competition, jornada, matches: matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
    }).sort((a, b) => {
      if (a.competition !== b.competition) return a.competition.localeCompare(b.competition, 'es');
      const numA = parseInt(a.jornada) || 0;
      const numB = parseInt(b.jornada) || 0;
      if (numA !== numB) return numA - numB;
      return new Date(a.matches[0]?.date || '').getTime() - new Date(b.matches[0]?.date || '').getTime();
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
      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Equipo Interno
          </label>
          <SearchableSelect
            value={equipoInternoFilter}
            onChange={(e) => setEquipoInternoFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>Todos los equipos</option>
            {equipoInternoOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('playerStatsSummary.filterCompetition')}
          </label>
          <SearchableSelect
            value={competitionFilter}
            onChange={(e) => setCompetitionFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>{t('playerStatsSummary.allCompetitions')}</option>
            {competitionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('matchesList.filterJornada')}
          </label>
          <SearchableSelect
            value={jornadaFilter}
            onChange={(e) => setJornadaFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>{t('matchesList.allJornadas')}</option>
            {jornadaOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </SearchableSelect>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {groupedMatches.map(({ groupKey, competition, jornada, matches }) => (
          <div key={groupKey} className="space-y-4">
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
                  <div className="flex flex-wrap gap-1 text-xs font-black text-slate-800">
                    {matches.length > 0 ? new Date(matches[0].date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {matches.map((match) => {
          const local = match.localTeam || 'DEMO';
          const visitor = match.visitorTeam || 'Rival';
          const localDisplay = sideDisplayOf(match, local, match.localTeamClubId);
          const visitorDisplay = sideDisplayOf(match, visitor, match.visitorTeamClubId);
          const isReadOnly = match.readonly;

          return (
            <div
              key={match.id}
              onClick={() => !isReadOnly && onClickMatch && onClickMatch(match)}
              className={`bg-white p-1.5 md:p-2 rounded-lg shadow-sm transition-all border border-slate-100 flex flex-col gap-1 group relative overflow-hidden ${isReadOnly ? '' : 'hover:shadow-md cursor-pointer hover:border-red-200'}`}
            >
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
                  {localDisplay.logo && (
                    <img loading="lazy" decoding="async" src={localDisplay.logo} alt={localDisplay.clubName} className="h-5 w-5 object-contain mb-0.5" />
                  )}
                  <p className="text-[5px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 leading-tight truncate w-full">
                    {localDisplay.clubName}
                  </p>
                  <p className={`font-black text-xs md:text-sm uppercase leading-tight truncate w-full ${localDisplay.isOwn ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                    {localDisplay.teamName}
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
                  {visitorDisplay.logo && (
                    <img loading="lazy" decoding="async" src={visitorDisplay.logo} alt={visitorDisplay.clubName} className="h-5 w-5 object-contain mb-0.5" />
                  )}
                  <p className="text-[5px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 leading-tight truncate w-full">
                    {visitorDisplay.clubName}
                  </p>
                  <p className={`font-black text-xs md:text-sm uppercase leading-tight truncate w-full ${visitorDisplay.isOwn ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                    {visitorDisplay.teamName}
                  </p>
                </div>
              </div>

              {!isReadOnly && (
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
              )}
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
