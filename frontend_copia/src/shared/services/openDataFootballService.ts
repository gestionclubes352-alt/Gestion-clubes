/**
 * @fileoverview Servicio de datos de fútbol abiertos — SIN API KEY, SIN REGISTRO
 * @description Obtiene estadísticas avanzadas reales directamente de GitHub:
 *
 *   1. StatsBomb Open Data → xG, eventos detallados, alineaciones, partidos
 *      https://github.com/statsbomb/open-data
 *
 *   2. OpenFootball JSON  → resultados de ligas actuales en formato simple
 *      https://github.com/openfootball/football.json
 *
 * Todo se sirve desde raw.githubusercontent.com, sin límites de cuota
 * más allá de los de GitHub (60 req/h sin token, ~5000 req/h con token personal).
 */

import {
  DEFAULT_OPEN_DATA_CONFIG,
  OPEN_DATA_LEAGUES,
} from './types/openDataTypes';

import type {
  SBCompetition,
  SBMatch,
  SBEvent,
  SBLineup,
  SBShot,
  SBPass,
  TeamMatchStats,
  MatchAdvancedStats,
  OFSeason,
  OFMatch,
  OpenDataLeague,
  OpenDataConfig,
} from './types/openDataTypes';

// ============================================================================
// CACHÉ EN MEMORIA
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// CLIENTE HTTP GENÉRICO (fetch desde GitHub)
// ============================================================================

class OpenDataClient {
  private config: OpenDataConfig;

  constructor(config: Partial<OpenDataConfig> = {}) {
    this.config = { ...DEFAULT_OPEN_DATA_CONFIG, ...config };
  }

  /** Fetch genérico con caché en memoria */
  async fetch<T>(url: string): Promise<T> {
    const cached = getCached<T>(url, this.config.cacheTimeMs);
    if (cached) return cached;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenData fetch error: ${response.status} ${response.statusText} — ${url}`);
    }

    const data: T = await response.json();
    setCache(url, data);
    return data;
  }

  // ==========================================================================
  // STATSBOMB
  // ==========================================================================

  /** Lista todas las competiciones disponibles en StatsBomb Open Data */
  async getCompetitions(): Promise<SBCompetition[]> {
    const url = `${this.config.statsbombBaseUrl}/competitions.json`;
    return this.fetch<SBCompetition[]>(url);
  }

  /** Lista partidos de una competición/temporada */
  async getMatches(competitionId: number, seasonId: number): Promise<SBMatch[]> {
    const url = `${this.config.statsbombBaseUrl}/matches/${competitionId}/${seasonId}.json`;
    return this.fetch<SBMatch[]>(url);
  }

  /** Obtiene todos los eventos de un partido (pases, tiros, presión, etc.) */
  async getEvents(matchId: number): Promise<SBEvent[]> {
    const url = `${this.config.statsbombBaseUrl}/events/${matchId}.json`;
    return this.fetch<SBEvent[]>(url);
  }

  /** Obtiene las alineaciones de un partido */
  async getLineups(matchId: number): Promise<SBLineup[]> {
    const url = `${this.config.statsbombBaseUrl}/lineups/${matchId}.json`;
    return this.fetch<SBLineup[]>(url);
  }

  // ==========================================================================
  // OPENFOOTBALL
  // ==========================================================================

  /** Obtiene resultados de una temporada desde OpenFootball */
  async getSeasonResults(path: string): Promise<OFSeason> {
    const url = `${this.config.openfootballBaseUrl}/${path}`;
    return this.fetch<OFSeason>(url);
  }

  // ==========================================================================
  // ESTADÍSTICAS AVANZADAS CALCULADAS
  // ==========================================================================

  /**
   * Calcula estadísticas avanzadas completas para un partido:
   * xG, tiros, pases, presión, duelos, etc. por equipo.
   */
  async getMatchAdvancedStats(matchId: number): Promise<MatchAdvancedStats> {
    const [events, matches] = await Promise.all([
      this.getEvents(matchId),
      // Buscamos los datos del match en caché o devolvemos undefined
      this.findMatchInfo(matchId),
    ]);

    const matchInfo = matches;
    const homeTeamId = matchInfo?.home_team?.home_team_id ?? 0;
    const awayTeamId = matchInfo?.away_team?.away_team_id ?? 0;
    const homeTeamName = matchInfo?.home_team?.home_team_name ?? 'Home';
    const awayTeamName = matchInfo?.away_team?.away_team_name ?? 'Away';

    const homeStats = this.calculateTeamStats(events, homeTeamId, homeTeamName);
    const awayStats = this.calculateTeamStats(events, awayTeamId, awayTeamName);

    // Enriquecer con goles del match
    if (matchInfo) {
      homeStats.goals = matchInfo.home_score;
      awayStats.goals = matchInfo.away_score;
    }

    return {
      matchId,
      date: matchInfo?.match_date ?? '',
      competition: matchInfo?.competition?.competition_name ?? '',
      season: matchInfo?.season?.season_name ?? '',
      stadium: matchInfo?.stadium?.name,
      referee: matchInfo?.referee?.name,
      homeTeam: homeStats,
      awayTeam: awayStats,
    };
  }

  /**
   * Calcula estadísticas agregadas de un equipo en una temporada completa.
   * Devuelve el acumulado + promedio por partido.
   */
  async getTeamSeasonStats(
    competitionId: number,
    seasonId: number,
    teamName: string,
  ): Promise<{
    team: string;
    matchesPlayed: number;
    totals: TeamMatchStats;
    averages: Partial<TeamMatchStats>;
    matchDetails: MatchAdvancedStats[];
  }> {
    // 1. Obtener todos los partidos de la temporada
    const allMatches = await this.getMatches(competitionId, seasonId);

    // 2. Filtrar partidos del equipo
    const teamMatches = allMatches.filter(
      (m) =>
        m.home_team.home_team_name === teamName ||
        m.away_team.away_team_name === teamName,
    );

    if (teamMatches.length === 0) {
      throw new Error(`No se encontraron partidos para "${teamName}" en esta temporada.`);
    }

    // 3. Obtener stats avanzadas de CADA partido (de forma paralela con límite)
    const matchStats: MatchAdvancedStats[] = [];
    const batchSize = 5; // Limitar peticiones paralelas

    for (let i = 0; i < teamMatches.length; i += batchSize) {
      const batch = teamMatches.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((m) => this.getMatchAdvancedStats(m.match_id)),
      );
      matchStats.push(...batchResults);
    }

    // 4. Agregar totales
    const totals = this.aggregateStats(matchStats, teamName);
    const count = teamMatches.length;

    // 5. Calcular promedios
    const averages: Partial<TeamMatchStats> = {
      xG: round2(totals.xG / count),
      shots: round2(totals.shots / count),
      shotsOnTarget: round2(totals.shotsOnTarget / count),
      passes: round2(totals.passes / count),
      passesCompleted: round2(totals.passesCompleted / count),
      passAccuracy: round2(totals.passAccuracy),
      pressures: round2(totals.pressures / count),
      duels: round2(totals.duels / count),
      duelsWon: round2(totals.duelsWon / count),
      interceptions: round2(totals.interceptions / count),
      foulsCommitted: round2(totals.foulsCommitted / count),
      dribbles: round2(totals.dribbles / count),
      dribblesSuccessful: round2(totals.dribblesSuccessful / count),
    };

    return {
      team: teamName,
      matchesPlayed: count,
      totals,
      averages,
      matchDetails: matchStats,
    };
  }

  // ==========================================================================
  // UTILIDADES DE CÁLCULO
  // ==========================================================================

  /** Calcula estadísticas de un equipo en un partido a partir de eventos */
  private calculateTeamStats(events: SBEvent[], teamId: number, teamName: string): TeamMatchStats {
    const teamEvents = events.filter((e) => e.team?.id === teamId);

    // Tiros
    const shots = teamEvents.filter((e) => e.type.name === 'Shot');
    const shotsOnTarget = shots.filter(
      (e) => e.shot?.outcome?.name === 'Goal' || e.shot?.outcome?.name === 'Saved',
    );
    const shotsOffTarget = shots.filter(
      (e) => e.shot?.outcome?.name === 'Off T' || e.shot?.outcome?.name === 'Wayward',
    );
    const shotsBlocked = shots.filter((e) => e.shot?.outcome?.name === 'Blocked');
    const goals = shots.filter((e) => e.shot?.outcome?.name === 'Goal');
    const xG = shots.reduce((sum, e) => sum + (e.shot?.statsbomb_xg ?? 0), 0);

    // Pases
    const passes = teamEvents.filter((e) => e.type.name === 'Pass');
    const passesCompleted = passes.filter((e) => !e.pass?.outcome); // Sin outcome = completado
    const crosses = passes.filter((e) => e.pass?.cross);
    const throughBalls = passes.filter((e) => e.pass?.through_ball);
    const switches = passes.filter((e) => e.pass?.switch);
    const corners = passes.filter(
      (e) => e.pass?.type?.name === 'Corner',
    );
    const freeKicks = passes.filter(
      (e) => e.pass?.type?.name === 'Free Kick',
    );

    // Conducciones progresivas (avance > 10m hacia portería)
    const carries = teamEvents.filter((e) => e.type.name === 'Carry');
    const progressiveCarries = carries.filter((e) => {
      if (!e.location || !e.carry?.end_location) return false;
      const startX = e.location[0];
      const endX = e.carry.end_location[0];
      return endX - startX > 10; // Avance significativo hacia portería
    });

    // Regates
    const dribbles = teamEvents.filter((e) => e.type.name === 'Dribble');
    const dribblesSuccessful = dribbles.filter(
      (e) => e.dribble?.outcome?.name === 'Complete',
    );

    // Duelos
    const duels = teamEvents.filter((e) => e.type.name === 'Duel');
    const duelsWon = duels.filter(
      (e) => e.duel?.outcome?.name === 'Won' || e.duel?.outcome?.name === 'Success',
    );

    // Presión
    const pressures = teamEvents.filter((e) => e.type.name === 'Pressure');

    // Recuperaciones / Intercepciones / Despejes
    const interceptions = teamEvents.filter((e) => e.type.name === 'Interception');
    const clearances = teamEvents.filter((e) => e.type.name === 'Clearance');
    const ballRecoveries = teamEvents.filter((e) => e.type.name === 'Ball Recovery');

    // Faltas / Tarjetas
    const foulsCommitted = teamEvents.filter((e) => e.type.name === 'Foul Committed');
    const foulsWon = teamEvents.filter((e) => e.type.name === 'Foul Won');
    const yellowCards = foulsCommitted.filter(
      (e) => e.foul_committed?.card?.name === 'Yellow Card',
    );
    const redCards = foulsCommitted.filter(
      (e) =>
        e.foul_committed?.card?.name === 'Red Card' ||
        e.foul_committed?.card?.name === 'Second Yellow',
    );

    // Penaltis
    const penalties = shots.filter((e) => e.shot?.type?.name === 'Penalty');

    // Formación (del primer evento de táctica)
    const tacticsEvent = events.find(
      (e) => e.type.name === 'Starting XI' && e.team?.id === teamId,
    );
    const formation = tacticsEvent?.tactics?.formation ?? null;

    const totalPasses = passes.length;
    const totalCompleted = passesCompleted.length;

    return {
      teamId,
      teamName,
      goals: goals.length,
      xG: round2(xG),
      shots: shots.length,
      shotsOnTarget: shotsOnTarget.length,
      shotsOffTarget: shotsOffTarget.length,
      shotsBlocked: shotsBlocked.length,
      passes: totalPasses,
      passesCompleted: totalCompleted,
      passAccuracy: totalPasses > 0 ? round2((totalCompleted / totalPasses) * 100) : 0,
      crosses: crosses.length,
      throughBalls: throughBalls.length,
      switches: switches.length,
      progressiveCarries: progressiveCarries.length,
      dribbles: dribbles.length,
      dribblesSuccessful: dribblesSuccessful.length,
      duels: duels.length,
      duelsWon: duelsWon.length,
      pressures: pressures.length,
      interceptions: interceptions.length,
      clearances: clearances.length,
      ballRecoveries: ballRecoveries.length,
      foulsCommitted: foulsCommitted.length,
      foulsWon: foulsWon.length,
      yellowCards: yellowCards.length,
      redCards: redCards.length,
      corners: corners.length,
      freeKicks: freeKicks.length,
      penalties: penalties.length,
      formation,
    };
  }

  /** Agrega estadísticas de múltiples partidos */
  private aggregateStats(matchStats: MatchAdvancedStats[], teamName: string): TeamMatchStats {
    const totals: TeamMatchStats = {
      teamId: 0,
      teamName,
      goals: 0,
      xG: 0,
      shots: 0,
      shotsOnTarget: 0,
      shotsOffTarget: 0,
      shotsBlocked: 0,
      passes: 0,
      passesCompleted: 0,
      passAccuracy: 0,
      crosses: 0,
      throughBalls: 0,
      switches: 0,
      progressiveCarries: 0,
      dribbles: 0,
      dribblesSuccessful: 0,
      duels: 0,
      duelsWon: 0,
      pressures: 0,
      interceptions: 0,
      clearances: 0,
      ballRecoveries: 0,
      foulsCommitted: 0,
      foulsWon: 0,
      yellowCards: 0,
      redCards: 0,
      corners: 0,
      freeKicks: 0,
      penalties: 0,
      formation: null,
    };

    for (const match of matchStats) {
      const stats =
        match.homeTeam.teamName === teamName ? match.homeTeam : match.awayTeam;
      totals.teamId = stats.teamId;
      totals.goals += stats.goals;
      totals.xG += stats.xG;
      totals.shots += stats.shots;
      totals.shotsOnTarget += stats.shotsOnTarget;
      totals.shotsOffTarget += stats.shotsOffTarget;
      totals.shotsBlocked += stats.shotsBlocked;
      totals.passes += stats.passes;
      totals.passesCompleted += stats.passesCompleted;
      totals.crosses += stats.crosses;
      totals.throughBalls += stats.throughBalls;
      totals.switches += stats.switches;
      totals.progressiveCarries += stats.progressiveCarries;
      totals.dribbles += stats.dribbles;
      totals.dribblesSuccessful += stats.dribblesSuccessful;
      totals.duels += stats.duels;
      totals.duelsWon += stats.duelsWon;
      totals.pressures += stats.pressures;
      totals.interceptions += stats.interceptions;
      totals.clearances += stats.clearances;
      totals.ballRecoveries += stats.ballRecoveries;
      totals.foulsCommitted += stats.foulsCommitted;
      totals.foulsWon += stats.foulsWon;
      totals.yellowCards += stats.yellowCards;
      totals.redCards += stats.redCards;
      totals.corners += stats.corners;
      totals.freeKicks += stats.freeKicks;
      totals.penalties += stats.penalties;
    }

    totals.xG = round2(totals.xG);
    totals.passAccuracy =
      totals.passes > 0 ? round2((totals.passesCompleted / totals.passes) * 100) : 0;

    return totals;
  }

  /** Busca la info de un match en la caché (para enriquecer stats) */
  private async findMatchInfo(matchId: number): Promise<SBMatch | undefined> {
    // Buscar en caché primero
    for (const [key, entry] of cache.entries()) {
      if (key.includes('/matches/') && Array.isArray(entry.data)) {
        const match = (entry.data as SBMatch[]).find((m) => m.match_id === matchId);
        if (match) return match;
      }
    }
    return undefined;
  }

  // ==========================================================================
  // UTILIDADES PÚBLICAS
  // ==========================================================================

  /** Devuelve las ligas preconfiguradas */
  getAvailableLeagues(): OpenDataLeague[] {
    return [...OPEN_DATA_LEAGUES];
  }

  /** Busca un equipo en todos los partidos de una temporada */
  async searchTeam(
    competitionId: number,
    seasonId: number,
    query: string,
  ): Promise<string[]> {
    const matches = await this.getMatches(competitionId, seasonId);
    const teams = new Set<string>();

    for (const m of matches) {
      if (m.home_team.home_team_name) teams.add(m.home_team.home_team_name);
      if (m.away_team.away_team_name) teams.add(m.away_team.away_team_name);
    }

    const lowerQuery = query.toLowerCase();
    return Array.from(teams)
      .filter((t) => t.toLowerCase().includes(lowerQuery))
      .sort();
  }

  /** Obtiene los goleadores de una temporada con xG */
  async getTopScorers(
    competitionId: number,
    seasonId: number,
    limit = 20,
  ): Promise<
    {
      player: string;
      team: string;
      goals: number;
      xG: number;
      shots: number;
      minutesPerGoal: number;
    }[]
  > {
    const matches = await this.getMatches(competitionId, seasonId);
    const playerMap = new Map<
      string,
      { player: string; team: string; goals: number; xG: number; shots: number; minutes: number }
    >();

    // Procesar partidos en lotes
    const batchSize = 5;
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);
      const eventsArr = await Promise.all(
        batch.map((m) => this.getEvents(m.match_id)),
      );

      for (const events of eventsArr) {
        const shotEvents = events.filter(
          (e) => e.type.name === 'Shot' && e.player,
        );

        for (const shot of shotEvents) {
          const key = `${shot.player!.id}`;
          const existing = playerMap.get(key) ?? {
            player: shot.player!.name,
            team: shot.team.name,
            goals: 0,
            xG: 0,
            shots: 0,
            minutes: 0,
          };

          existing.shots++;
          existing.xG += shot.shot?.statsbomb_xg ?? 0;
          if (shot.shot?.outcome?.name === 'Goal') {
            existing.goals++;
          }

          playerMap.set(key, existing);
        }
      }
    }

    return Array.from(playerMap.values())
      .map((p) => ({
        ...p,
        xG: round2(p.xG),
        minutesPerGoal: p.goals > 0 ? Math.round(90 * (p.shots / p.goals)) : 0,
      }))
      .sort((a, b) => b.goals - a.goals || b.xG - a.xG)
      .slice(0, limit);
  }

  /** Limpia toda la caché */
  clearCache(): void {
    cache.clear();
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================================
// SINGLETON EXPORTADO
// ============================================================================

/** Instancia singleton del servicio de datos abiertos */
export const openDataFootballService = new OpenDataClient();

export {
  OPEN_DATA_LEAGUES,
  type OpenDataLeague,
  type OpenDataConfig,
  type SBCompetition,
  type SBMatch,
  type SBEvent,
  type SBLineup,
  type SBShot,
  type SBPass,
  type TeamMatchStats,
  type MatchAdvancedStats,
  type OFSeason,
  type OFMatch,
};
