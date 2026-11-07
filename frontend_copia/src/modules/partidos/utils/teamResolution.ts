// Utilidades compartidas para resolver el "equipo interno" (p.ej. "Juvenil A") y el
// tipo de competición (LIGA/COPA/AMISTOSO/...) de un partido, usadas tanto en el
// Historial de Partidos como en la Videoteca para que ambos filtren de forma idéntica.
import type { Match } from '../types';
import type { CompetitionTeam } from '@modules/competicion';

export const ALL_FILTER = 'ALL';

export const normalizeTeamKey = (value: string | undefined) =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');

export const containsTeamWords = (value: string | undefined, teamValue: string | undefined) => {
  const source = normalizeTeamKey(value);
  const target = normalizeTeamKey(teamValue);
  if (!source || !target) return false;
  return target.split(' ').every(word => source.includes(word));
};

export const isSameCompetition = (teamCompetition: string | undefined, matchCompetition: string | undefined) => {
  if (!teamCompetition || !matchCompetition) return false;
  return normalizeTeamKey(teamCompetition) === normalizeTeamKey(matchCompetition);
};

export const internalNameOfTeam = (team: CompetitionTeam) => (team.equipo || team.nombre || '').trim();

export const isLikelyInternalTeamName = (value: string | undefined) => {
  const normalized = normalizeTeamKey(value);
  return /^(primer equipo|filial|senior|juvenil|cadete|infantil|alevin|benjamin|prebenjamin)(\s+[a-z0-9]+)?$/.test(normalized);
};

export const getCompetitionType = (competition: string | undefined): string => {
  if (!competition) return '-';
  const normalized = competition.trim().toUpperCase();
  if (normalized.includes('LIGA')) return 'LIGA';
  if (normalized.includes('COPA')) return 'COPA';
  if (normalized.includes('AMISTOSO')) return 'AMISTOSO';
  if (normalized.includes('TORNEO')) return 'TORNEO';
  if (normalized.includes('CAMPEONATO')) return 'CAMPEONATO';
  const firstWord = normalized.split(/[\s,]+/)[0];
  return firstWord || '-';
};

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

// El equipo "propio" de un partido es el que coincide con nuestros equipos en esa competición.
export const ownTeamNameOf = (match: Match, competitionTeams: CompetitionTeam[]): string => {
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

export const buildInternalNameByFedName = (ownCompetitionTeams: CompetitionTeam[]): Map<string, string> => {
  const map = new Map<string, string>();
  ownCompetitionTeams.forEach((team) => {
    const canonical = (team.equipo || team.nombre || '').trim();
    if (!canonical) return;
    map.set(normalizeTeamKey(canonical), canonical);
    const fedName = normalizeTeamKey(team.nombreEnFed);
    if (fedName) map.set(fedName, canonical);
  });
  return map;
};

const normalizeInternalCandidate = (
  candidate: string | undefined,
  internalNameByFedName: Map<string, string>
): string | undefined => {
  const key = normalizeTeamKey(candidate);
  if (!key) return undefined;
  return internalNameByFedName.get(key) || (isLikelyInternalTeamName(candidate) ? candidate?.trim() : undefined);
};

const findInternalNameForCandidate = (
  match: Match,
  candidate: string | undefined,
  ownCompetitionTeams: CompetitionTeam[],
  internalNameByFedName: Map<string, string>
): string | undefined => {
  const normalizedInternal = normalizeInternalCandidate(candidate, internalNameByFedName);
  if (normalizedInternal) return normalizedInternal;

  const key = normalizeTeamKey(candidate);
  if (!key) return undefined;

  const sameCompetitionTeams = ownCompetitionTeams.filter((team) => isSameCompetition(team.competicion, match.competition));
  const pools = sameCompetitionTeams.length > 0 ? [sameCompetitionTeams, ownCompetitionTeams] : [ownCompetitionTeams];

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

const findInternalNameByCompetitionContext = (
  match: Match,
  ownCompetitionTeams: CompetitionTeam[]
): string | undefined => {
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

/**
 * Resuelve el nombre de "equipo interno" (p.ej. "Juvenil A") de un partido, cruzando
 * nombreInterno/team/localTeam/visitorTeam con el catálogo de equipos propios de la competición.
 */
export const resolveEquipoInterno = (
  match: Match,
  ownCompetitionTeams: CompetitionTeam[],
  internalNameByFedName: Map<string, string>
): string => {
  const own = ownCompetitionTeams.length > 0 ? ownTeamNameOf(match, ownCompetitionTeams) : '';
  const candidates = [match.nombreInterno, match.team, match.localTeam, match.visitorTeam, own];
  for (const candidate of candidates) {
    const mapped = findInternalNameForCandidate(match, candidate, ownCompetitionTeams, internalNameByFedName);
    if (mapped) return mapped;
  }
  const byCompetitionContext = findInternalNameByCompetitionContext(match, ownCompetitionTeams);
  if (byCompetitionContext) return byCompetitionContext;
  return (
    normalizeInternalCandidate(match.nombreInterno, internalNameByFedName) ||
    normalizeInternalCandidate(match.team, internalNameByFedName) ||
    own ||
    match.nombreInterno ||
    match.team ||
    ''
  );
};
