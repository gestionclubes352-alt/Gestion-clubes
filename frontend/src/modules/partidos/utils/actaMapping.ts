import type { ActaPartido, ActaTeamData, RfefJornadaMatch } from '@shared/services/rfefActasService';
import type { TacticalPosition } from '@modules/tactica';
import type { MatchReport, MatchSubstitution, MatchGoal, MatchCard } from '../types';

/** Subconjunto mínimo de jugador necesario para emparejar con el acta. */
export interface SquadPlayer {
  id: string | number;
  nombre: string;
  apodo?: string;
  dorsal?: number;
  /** Equipo (categoría) al que pertenece el jugador; permite limitar los no convocados al equipo del partido. */
  equipoId?: string | number;
}

export type ActaSide = 'home' | 'away';

export interface ActaApplySummary {
  starters: number;
  bench: number;
  notConvocado: number;
  substitutions: number;
  goalsFor: number;
  goalsAgainst: number;
  cards: number;
  /** Nombres del acta que no se han podido emparejar con la plantilla */
  unmatched: string[];
}

const normalize = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const tokens = (v: string): string[] =>
  normalize(v).replace(/[^a-zñ\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);

const sameName = (a: string, b: string) => {
  const na = normalize(a).trim();
  const nb = normalize(b).trim();
  return !!na && !!nb && (na === nb || na.includes(nb) || nb.includes(na));
};

const parseMinute = (m?: string): number => {
  const n = parseInt(String(m ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Empareja un nombre del acta (p.ej. "GARCIA LOPEZ, JUAN") con un jugador de la plantilla. */
export function matchPlayer<T extends SquadPlayer>(
  actaName: string,
  dorsal: number | undefined,
  squad: T[],
  used?: Set<string>
): T | null {
  const actaTokens = tokens(actaName);
  if (actaTokens.length === 0) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const p of squad) {
    if (used?.has(String(p.id))) continue;
    const pTokens = new Set(tokens(`${p.nombre} ${p.apodo || ''}`));
    const shared = actaTokens.filter(t => pTokens.has(t)).length;
    const dorsalMatch = dorsal !== undefined && p.dorsal !== undefined && Number(p.dorsal) === dorsal;
    if (!(shared >= 2 || (shared >= 1 && dorsalMatch))) continue;
    const score = shared * 2 + (dorsalMatch ? 2 : 0);
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return best;
}

/** Elige el partido de la jornada a partir del rival (el equipo propio puede llamarse distinto en el acta). */
export function findJornadaMatch(
  matches: RfefJornadaMatch[],
  localTeam?: string,
  visitorTeam?: string
): RfefJornadaMatch | null {
  const names = [localTeam, visitorTeam].filter((n): n is string => !!n);
  const scored = matches
    .filter(m => m.hasActa && m.codActa)
    .map(m => ({
      m,
      hits: names.filter(n => sameName(n, m.localTeam) || sameName(n, m.visitorTeam)).length,
    }))
    .filter(x => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  if (scored.length === 0) return null;
  // Si hay ambigüedad real (varios con los mismos aciertos) no adivinamos
  if (scored.length > 1 && scored[0].hits === scored[1].hits) return null;
  return scored[0].m;
}

const squadHits = (team: ActaTeamData, squad: SquadPlayer[]) =>
  [...team.starters, ...team.substitutes].filter(p => matchPlayer(p.name, p.dorsal, squad)).length;

/** Detecta de qué lado del acta juega nuestro equipo según cuántos jugadores de la plantilla aparecen. */
export function detectOwnSide(acta: ActaPartido, squad: SquadPlayer[]): ActaSide | null {
  const home = squadHits(acta.homeTeam, squad);
  const away = squadHits(acta.awayTeam, squad);
  if (home === away) return null;
  return home > away ? 'home' : 'away';
}

/**
 * Traduce el acta al informe: convocados, titulares (por orden de dorsal sobre la formación base),
 * suplentes, cambios, goles y tarjetas del equipo propio.
 * Devuelve error si el emparejamiento es demasiado pobre para no machacar datos existentes.
 */
export function applyActaToReport(
  acta: ActaPartido,
  side: ActaSide,
  squad: SquadPlayer[],
  report: MatchReport,
  basePositions: TacticalPosition[],
  ownTeamId?: string | number
): { next: MatchReport; summary: ActaApplySummary } | { error: string } {
  const own = side === 'home' ? acta.homeTeam : acta.awayTeam;
  const unmatched = new Set<string>();
  const used = new Set<string>();

  const starters = [...own.starters].sort((a, b) => a.dorsal - b.dorsal);
  const starterMatches = starters.map(s => {
    const p = matchPlayer(s.name, s.dorsal, squad, used);
    if (p) used.add(String(p.id)); else unmatched.add(s.name);
    return p;
  });
  const startersMatched = starterMatches.filter(Boolean).length;
  if (startersMatched < 7) {
    return { error: `Solo se han podido emparejar ${startersMatched} titulares con la plantilla. Revisa nombres/dorsales de la plantilla.` };
  }

  const benchPlayers = own.substitutes.flatMap(s => {
    const p = matchPlayer(s.name, s.dorsal, squad, used);
    if (p) { used.add(String(p.id)); return [p]; }
    unmatched.add(s.name);
    return [];
  });

  const lineupPositions: TacticalPosition[] = basePositions.map((pos, i) => {
    const p = starterMatches[i];
    return { ...pos, playerIds: p ? [p.id] : [] };
  });

  const convocadoIds = new Set(used);
  // No convocados: solo jugadores del equipo del partido (la plantilla trae también otras categorías del club)
  const notConvocadoIds = squad
    .filter(p => ownTeamId === undefined || p.equipoId === undefined || String(p.equipoId) === String(ownTeamId))
    .filter(p => !convocadoIds.has(String(p.id)))
    .map(p => p.id);
  const keptReasons = Object.fromEntries(
    Object.entries(report.notConvocadoReasons || {}).filter(([id]) => notConvocadoIds.some(n => String(n) === id))
  );

  const lookup = (name: string): SquadPlayer | null => {
    const found = matchPlayer(name, undefined, squad);
    if (!found) unmatched.add(name);
    return found;
  };

  const substitutions: MatchSubstitution[] = own.substitutions.flatMap(s => {
    const pOut = lookup(s.playerOut);
    const pIn = lookup(s.playerIn);
    if (!pOut || !pIn) return [];
    return [{ id: crypto.randomUUID(), minute: parseMinute(s.minute), playerOutId: pOut.id, playerInId: pIn.id }];
  }).sort((a, b) => a.minute - b.minute);

  // El acta solo trae el marcador progresivo: el equipo que marca es el que incrementa su cuenta.
  let prevHome = 0;
  let prevAway = 0;
  const matchGoals: MatchGoal[] = acta.goals.map(g => {
    const homeScored = g.homeScore > prevHome;
    const awayScored = g.awayScore > prevAway;
    prevHome = Math.max(prevHome, g.homeScore);
    prevAway = Math.max(prevAway, g.awayScore);
    let scorerSide: ActaSide | null = homeScored && !awayScored ? 'home' : awayScored && !homeScored ? 'away' : null;
    const scorer = matchPlayer(g.player, undefined, squad);
    if (!scorerSide) scorerSide = scorer ? side : (side === 'home' ? 'away' : 'home');
    const favor = scorerSide === side;
    if (favor && !scorer) unmatched.add(g.player);
    return {
      id: crypto.randomUUID(),
      minute: parseMinute(g.minute),
      side: favor ? 'FAVOR' as const : 'CONTRA' as const,
      playerId: favor ? scorer?.id : undefined,
    };
  }).sort((a, b) => a.minute - b.minute);

  // Las tarjetas del acta no indican equipo de forma fiable: se atribuyen por coincidencia con la plantilla.
  const seenCards = new Set<string>();
  const matchCards: MatchCard[] = [...acta.homeTeam.cards, ...acta.awayTeam.cards].flatMap(c => {
    const p = matchPlayer(c.player, undefined, squad);
    if (!p) return [];
    const type = c.type === 'yellow' ? 'AMARILLA' as const : 'ROJA' as const;
    const key = `${p.id}-${type}`;
    if (seenCards.has(key)) return [];
    seenCards.add(key);
    return [{ id: crypto.randomUUID(), minute: parseMinute(c.minute), type, playerId: p.id }];
  });

  const next: MatchReport = {
    ...report,
    lineupPositions,
    substituteIds: benchPlayers.map(p => p.id),
    notConvocadoIds,
    notConvocadoReasons: keptReasons,
    substitutions,
    matchGoals,
    matchCards,
  };

  return {
    next,
    summary: {
      starters: startersMatched,
      bench: benchPlayers.length,
      notConvocado: notConvocadoIds.length,
      substitutions: substitutions.length,
      goalsFor: matchGoals.filter(g => g.side === 'FAVOR').length,
      goalsAgainst: matchGoals.filter(g => g.side === 'CONTRA').length,
      cards: matchCards.length,
      unmatched: [...unmatched],
    },
  };
}
