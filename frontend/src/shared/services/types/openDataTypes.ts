/**
 * @fileoverview Tipos para datos de fútbol abiertos (StatsBomb Open Data + OpenFootball)
 * @description Sin API key, sin registro. 100% datos públicos desde GitHub.
 *
 * Fuentes:
 *  - StatsBomb Open Data: https://github.com/statsbomb/open-data
 *    → Eventos detallados (pases, tiros con xG, presión, etc.), alineaciones, partidos
 *  - OpenFootball JSON:   https://github.com/openfootball/football.json
 *    → Resultados de ligas principales en formato simple
 */

// ============================================================================
// STATSBOMB — COMPETICIONES
// ============================================================================

export interface SBCompetition {
  competition_id: number;
  season_id: number;
  country_name: string;
  competition_name: string;
  competition_gender: 'male' | 'female';
  competition_youth: boolean;
  competition_international: boolean;
  season_name: string;
  match_updated: string;
  match_updated_360: string | null;
  match_available_360: string | null;
  match_available: string;
}

// ============================================================================
// STATSBOMB — PARTIDOS
// ============================================================================

export interface SBTeamInfo {
  home_team_id?: number;
  away_team_id?: number;
  home_team_name?: string;
  away_team_name?: string;
  home_team_gender?: string;
  away_team_gender?: string;
  home_team_group?: string | null;
  away_team_group?: string | null;
  country: { id: number; name: string };
  managers?: SBManager[];
}

export interface SBManager {
  id: number;
  name: string;
  nickname: string | null;
  dob: string;
  country: { id: number; name: string };
}

export interface SBMatch {
  match_id: number;
  match_date: string;
  kick_off: string;
  competition: {
    competition_id: number;
    country_name: string;
    competition_name: string;
  };
  season: {
    season_id: number;
    season_name: string;
  };
  home_team: SBTeamInfo;
  away_team: SBTeamInfo;
  home_score: number;
  away_score: number;
  match_status: string;
  match_status_360: string;
  last_updated: string;
  last_updated_360: string;
  metadata: {
    data_version: string;
    shot_fidelity_version: string;
    xy_fidelity_version: string;
  };
  match_week: number;
  competition_stage: { id: number; name: string };
  stadium?: {
    id: number;
    name: string;
    country: { id: number; name: string };
  };
  referee?: {
    id: number;
    name: string;
    country: { id: number; name: string };
  };
}

// ============================================================================
// STATSBOMB — EVENTOS (Pases, Tiros, Presión, etc.)
// ============================================================================

export interface SBEvent {
  id: string;
  index: number;
  period: number;
  timestamp: string;
  minute: number;
  second: number;
  type: { id: number; name: string };
  possession: number;
  possession_team: { id: number; name: string };
  play_pattern: { id: number; name: string };
  team: { id: number; name: string };
  player?: { id: number; name: string };
  position?: { id: number; name: string };
  location?: [number, number];
  duration?: number;
  related_events?: string[];
  // Datos específicos por tipo de evento
  shot?: SBShot;
  pass?: SBPass;
  carry?: SBCarry;
  dribble?: SBDribble;
  duel?: SBDuel;
  foul_committed?: SBFoul;
  foul_won?: SBFoul;
  goalkeeper?: SBGoalkeeper;
  interception?: { outcome: { id: number; name: string } };
  clearance?: { body_part?: { id: number; name: string } };
  ball_recovery?: { recovery_failure?: boolean };
  block?: { deflection?: boolean; offensive?: boolean };
  substitution?: {
    replacement: { id: number; name: string };
    outcome: { id: number; name: string };
  };
  tactics?: {
    formation: number;
    lineup: SBTacticsPlayer[];
  };
}

export interface SBShot {
  statsbomb_xg: number;
  end_location: [number, number] | [number, number, number];
  technique: { id: number; name: string };
  body_part: { id: number; name: string };
  type: { id: number; name: string };
  outcome: { id: number; name: string };
  first_time?: boolean;
  freeze_frame?: SBFreezeFrame[];
}

export interface SBFreezeFrame {
  location: [number, number];
  player: { id: number; name: string };
  position: { id: number; name: string };
  teammate: boolean;
}

export interface SBPass {
  recipient?: { id: number; name: string };
  length: number;
  angle: number;
  height: { id: number; name: string };
  end_location: [number, number];
  type?: { id: number; name: string };
  body_part?: { id: number; name: string };
  outcome?: { id: number; name: string };
  cross?: boolean;
  switch?: boolean;
  through_ball?: boolean;
  goal_assist?: boolean;
  shot_assist?: boolean;
  cut_back?: boolean;
}

export interface SBCarry {
  end_location: [number, number];
}

export interface SBDribble {
  outcome: { id: number; name: string };
  overrun?: boolean;
  nutmeg?: boolean;
}

export interface SBDuel {
  type: { id: number; name: string };
  outcome: { id: number; name: string };
}

export interface SBFoul {
  card?: { id: number; name: string };
  penalty?: boolean;
  advantage?: boolean;
  offensive?: boolean;
}

export interface SBGoalkeeper {
  type: { id: number; name: string };
  outcome?: { id: number; name: string };
  technique?: { id: number; name: string };
  body_part?: { id: number; name: string };
  position?: { id: number; name: string };
}

export interface SBTacticsPlayer {
  player: { id: number; name: string };
  position: { id: number; name: string };
  jersey_number: number;
}

// ============================================================================
// STATSBOMB — ALINEACIONES
// ============================================================================

export interface SBLineup {
  team_id: number;
  team_name: string;
  lineup: SBLineupPlayer[];
}

export interface SBLineupPlayer {
  player_id: number;
  player_name: string;
  player_nickname: string | null;
  jersey_number: number;
  country: { id: number; name: string };
  positions: SBPlayerPosition[];
  cards?: SBPlayerCard[];
}

export interface SBPlayerPosition {
  position_id: number;
  position: string;
  from: string;
  to: string | null;
  from_period: number;
  to_period: number | null;
  start_reason: string;
  end_reason: string;
}

export interface SBPlayerCard {
  time: string;
  card_type: string;
  reason: string;
  period: number;
}

// ============================================================================
// ESTADÍSTICAS CALCULADAS POR EQUIPO
// ============================================================================

export interface TeamMatchStats {
  teamId: number;
  teamName: string;
  goals: number;
  xG: number;
  shots: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  shotsBlocked: number;
  passes: number;
  passesCompleted: number;
  passAccuracy: number;
  crosses: number;
  throughBalls: number;
  switches: number;
  progressiveCarries: number;
  dribbles: number;
  dribblesSuccessful: number;
  duels: number;
  duelsWon: number;
  pressures: number;
  interceptions: number;
  clearances: number;
  ballRecoveries: number;
  foulsCommitted: number;
  foulsWon: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  freeKicks: number;
  penalties: number;
  formation: number | null;
}

export interface MatchAdvancedStats {
  matchId: number;
  date: string;
  competition: string;
  season: string;
  stadium?: string;
  referee?: string;
  homeTeam: TeamMatchStats;
  awayTeam: TeamMatchStats;
}

// ============================================================================
// OPENFOOTBALL — RESULTADOS SIMPLES
// ============================================================================

export interface OFMatch {
  round: string;
  date: string;
  team1: string;
  team2: string;
  score: {
    ft: [number, number];
    ht?: [number, number];
    et?: [number, number];
    pen?: [number, number];
  };
}

export interface OFSeason {
  name: string;
  matches: OFMatch[];
}

// ============================================================================
// CATÁLOGO DE COMPETICIONES DISPONIBLES
// ============================================================================

/** Competición preconfigurada con datos StatsBomb abiertos */
export interface OpenDataLeague {
  id: string;
  name: string;
  country: string;
  source: 'statsbomb' | 'openfootball' | 'both';
  statsbomb?: { competitionId: number; seasons: { id: number; name: string }[] };
  openfootball?: { path: string; seasons: string[] };
}

/** Configuración de las fuentes de datos abiertos */
export interface OpenDataConfig {
  statsbombBaseUrl: string;
  openfootballBaseUrl: string;
  cacheTimeMs: number;
}

/** Configuración por defecto */
export const DEFAULT_OPEN_DATA_CONFIG: OpenDataConfig = {
  statsbombBaseUrl: 'https://raw.githubusercontent.com/statsbomb/open-data/master/data',
  openfootballBaseUrl: 'https://raw.githubusercontent.com/openfootball/football.json/master',
  cacheTimeMs: 30 * 60 * 1000, // 30 min de caché
};

/**
 * Ligas preconfiguradas con datos StatsBomb abiertos.
 * Incluye las temporadas más relevantes disponibles gratuitamente.
 */
export const OPEN_DATA_LEAGUES: OpenDataLeague[] = [
  {
    id: 'la-liga',
    name: 'La Liga',
    country: 'Spain',
    source: 'both',
    statsbomb: {
      competitionId: 11,
      seasons: [
        { id: 90, name: '2020/2021' },
        { id: 42, name: '2019/2020' },
        { id: 4, name: '2018/2019' },
        { id: 1, name: '2017/2018' },
        { id: 2, name: '2016/2017' },
        { id: 27, name: '2015/2016' },
        { id: 26, name: '2014/2015' },
        { id: 25, name: '2013/2014' },
        { id: 24, name: '2012/2013' },
        { id: 23, name: '2011/2012' },
      ],
    },
    openfootball: {
      path: '2024-25/es.1.json',
      seasons: ['2024-25', '2023-24', '2022-23', '2021-22', '2020-21'],
    },
  },
  {
    id: 'premier-league',
    name: 'Premier League',
    country: 'England',
    source: 'both',
    statsbomb: {
      competitionId: 2,
      seasons: [
        { id: 27, name: '2015/2016' },
        { id: 44, name: '2003/2004' },
      ],
    },
    openfootball: {
      path: '2024-25/en.1.json',
      seasons: ['2024-25', '2023-24', '2022-23', '2021-22', '2020-21'],
    },
  },
  {
    id: 'champions-league',
    name: 'Champions League',
    country: 'Europe',
    source: 'statsbomb',
    statsbomb: {
      competitionId: 16,
      seasons: [
        { id: 4, name: '2018/2019' },
        { id: 1, name: '2017/2018' },
        { id: 2, name: '2016/2017' },
        { id: 27, name: '2015/2016' },
        { id: 26, name: '2014/2015' },
        { id: 25, name: '2013/2014' },
        { id: 24, name: '2012/2013' },
        { id: 23, name: '2011/2012' },
      ],
    },
  },
  {
    id: 'world-cup',
    name: 'FIFA World Cup',
    country: 'International',
    source: 'statsbomb',
    statsbomb: {
      competitionId: 43,
      seasons: [
        { id: 106, name: '2022' },
        { id: 3, name: '2018' },
      ],
    },
  },
  {
    id: 'euro',
    name: 'UEFA Euro',
    country: 'Europe',
    source: 'statsbomb',
    statsbomb: {
      competitionId: 55,
      seasons: [
        { id: 282, name: '2024' },
        { id: 43, name: '2020' },
      ],
    },
  },
  {
    id: 'bundesliga',
    name: '1. Bundesliga',
    country: 'Germany',
    source: 'both',
    statsbomb: {
      competitionId: 9,
      seasons: [
        { id: 281, name: '2023/2024' },
        { id: 27, name: '2015/2016' },
      ],
    },
    openfootball: {
      path: '2024-25/de.1.json',
      seasons: ['2024-25', '2023-24', '2022-23'],
    },
  },
  {
    id: 'serie-a',
    name: 'Serie A',
    country: 'Italy',
    source: 'both',
    statsbomb: {
      competitionId: 12,
      seasons: [
        { id: 27, name: '2015/2016' },
      ],
    },
    openfootball: {
      path: '2024-25/it.1.json',
      seasons: ['2024-25', '2023-24', '2022-23'],
    },
  },
  {
    id: 'ligue-1',
    name: 'Ligue 1',
    country: 'France',
    source: 'both',
    statsbomb: {
      competitionId: 7,
      seasons: [
        { id: 235, name: '2022/2023' },
        { id: 108, name: '2021/2022' },
        { id: 27, name: '2015/2016' },
      ],
    },
    openfootball: {
      path: '2024-25/fr.1.json',
      seasons: ['2024-25', '2023-24', '2022-23'],
    },
  },
  {
    id: 'copa-america',
    name: 'Copa América',
    country: 'South America',
    source: 'statsbomb',
    statsbomb: {
      competitionId: 223,
      seasons: [
        { id: 282, name: '2024' },
      ],
    },
  },
];
