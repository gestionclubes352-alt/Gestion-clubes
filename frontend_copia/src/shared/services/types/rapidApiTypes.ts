/**
 * @fileoverview Tipos de datos de la Free API Live Football Data de RapidAPI
 * @description Tipado completo para respuestas de la API de fútbol en vivo
 * @see https://rapidapi.com/sportcontentapi/api/free-api-live-football-data
 */

// ============================================================================
// TIPOS BASE DE RESPUESTA API
// ============================================================================

export interface RapidApiResponse<T> {
  status?: boolean;
  data?: T;
  response?: T;
  message?: string;
  errors?: string[];
}

// ============================================================================
// LIGAS / COMPETICIONES
// ============================================================================

export interface RapidApiLeague {
  id: number;
  name: string;
  localizedName?: string;
  ccode?: string;  // Country code (ESP, ENG, etc.)
  logo?: string;
  // Legacy fields for backwards compatibility
  slug?: string;
  country?: {
    name: string;
    code: string;
    flag?: string;
  };
  season?: {
    id: number;
    year: string;
    start: string;
    end: string;
    current: boolean;
  };
}

export interface RapidApiSeason {
  id: number;
  year: string;
  start: string;
  end: string;
  current: boolean;
}

// ============================================================================
// EQUIPOS
// ============================================================================

export interface RapidApiTeam {
  id: number;
  name: string;
  shortName?: string;
  logo?: string;
  // Datos de clasificación (incluidos en la API)
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  pts?: number;
  idx?: number; // Posición en clasificación
  scoresStr?: string; // "74-18"
  goalConDiff?: number;
  qualColor?: string;
  deduction?: number | null;
  ongoing?: boolean | null;
  // Legacy fields
  slug?: string;
  venue?: {
    id: number;
    name: string;
    city: string;
    capacity?: number;
  };
  manager?: {
    id: number;
    name: string;
    nationality?: string;
  };
  country?: {
    name: string;
    code: string;
  };
}

// ============================================================================
// JUGADORES
// ============================================================================

export interface RapidApiPlayerRole {
  key: string; // 'keeper_long', 'defender_long', etc.
  fallback: string; // 'Keeper', 'Defender', etc.
}

export interface RapidApiInjury {
  id: number;
  expectedReturn: string;
}

export interface RapidApiPlayer {
  id: number;
  name: string;
  shirtNumber?: number;
  ccode?: string; // Country code
  cname?: string; // Country name
  role?: RapidApiPlayerRole;
  positionId?: number;
  positionIds?: string; // "34,32" para múltiples posiciones
  positionIdsDesc?: string; // "CB,RB"
  height?: number;
  age?: number;
  dateOfBirth?: string;
  transferValue?: number;
  injured?: boolean;
  injury?: RapidApiInjury | null;
  // Estadísticas de temporada
  rating?: number;
  goals?: number;
  penalties?: number;
  assists?: number;
  rcards?: number; // Red cards
  ycards?: number; // Yellow cards
  excludeFromRanking?: boolean;
  // Legacy fields for backwards compatibility
  firstName?: string;
  lastName?: string;
  displayName?: string;
  shortName?: string;
  position?: string;
  positionCategory?: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  jerseyNumber?: number;
  nationality?: string;
  photo?: string;
  weight?: string;
  preferredFoot?: 'Left' | 'Right' | 'Both';
  team?: {
    id: number;
    name: string;
  };
  statistics?: RapidApiPlayerStats;
}

/** Grupo de jugadores por posición (formato de API) */
export interface RapidApiSquadGroup {
  title: 'coach' | 'keepers' | 'defenders' | 'midfielders' | 'attackers';
  members: RapidApiPlayer[];
}

export interface RapidApiPlayerStats {
  appearances?: number;
  minutes?: number;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
  rating?: number;
  passAccuracy?: number;
  tackles?: number;
  interceptions?: number;
  saves?: number; // Para porteros
  cleanSheets?: number; // Para porteros
}

// ============================================================================
// PARTIDOS / FIXTURES
// ============================================================================

export interface RapidApiMatch {
  id: number;
  status: RapidApiMatchStatus;
  startTimestamp: number;
  slug?: string;
  round?: {
    round: number;
    name?: string;
  };
  homeTeam: RapidApiTeam;
  awayTeam: RapidApiTeam;
  homeScore?: RapidApiScore;
  awayScore?: RapidApiScore;
  venue?: {
    id: number;
    name: string;
    city: string;
  };
  referee?: {
    name: string;
    nationality?: string;
  };
  league: {
    id: number;
    name: string;
    logo?: string;
  };
  season?: {
    id: number;
    year: string;
  };
}

export interface RapidApiScore {
  current?: number;
  display?: number;
  period1?: number;
  period2?: number;
  normaltime?: number;
  overtime?: number;
  penalties?: number;
}

export type RapidApiMatchStatus =
  | 'notstarted'
  | 'inprogress'
  | '1st_half'
  | '2nd_half'
  | 'halftime'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'suspended'
  | 'awaiting_penalties'
  | 'penalties';

// ============================================================================
// CLASIFICACIÓN / STANDINGS
// ============================================================================

export interface RapidApiStanding {
  position: number;
  team: RapidApiTeam;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string; // "WWDLW"
  promotionType?: 'promotion' | 'relegation' | 'playoff' | null;
}

export interface RapidApiStandingsGroup {
  name: string;
  rows: RapidApiStanding[];
}

// ============================================================================
// LIGAS PRECONFIGURADAS
// ============================================================================

export const PRECONFIGURED_LEAGUES = {
  LA_LIGA: {
    id: 8, // ID típico de La Liga en esta API
    name: 'La Liga',
    country: 'Spain',
    slug: 'laliga'
  },
  SEGUNDA_DIVISION: {
    id: 9,
    name: 'Segunda División',
    country: 'Spain',
    slug: 'segunda-division'
  },
  PREMIER_LEAGUE: {
    id: 17,
    name: 'Premier League',
    country: 'England',
    slug: 'premier-league'
  },
  CHAMPIONS_LEAGUE: {
    id: 7,
    name: 'UEFA Champions League',
    country: 'Europe',
    slug: 'champions-league'
  }
} as const;

// ============================================================================
// CONFIGURACIÓN API
// ============================================================================

export interface RapidApiConfig {
  apiKey: string;
  host: string;
  baseUrl: string;
  timeout?: number;
}

export const DEFAULT_RAPIDAPI_CONFIG: Partial<RapidApiConfig> = {
  host: 'free-api-live-football-data.p.rapidapi.com',
  baseUrl: 'https://free-api-live-football-data.p.rapidapi.com',
  timeout: 10000
};

// ============================================================================
// TIPOS DE CONVERSIÓN (API -> SportManagement)
// ============================================================================

export interface MappedCompetitionTeam {
  id: number;
  nombre: string;
  estadio: string;
  localidad: string;
  logoUrl?: string;
}

export interface MappedPlayer {
  id: number;
  fotoUrl: string;
  competicion: string;
  club: string;
  equipo: string;
  dorsal: number;
  nombre: string;
  posicion: string;
  posicionJuego: string;
  perfil: 'D' | 'I';
  fechaNacimiento?: string;
  nacionalidad?: string;
  altura?: string;
  edad?: number;
  valorMercado?: number;
  lesionado?: boolean;
  partidosJugados?: number;
  minutos?: number;
  goles?: number;
  asistencias?: number;
  tarjetasAmarillas?: number;
  tarjetasRojas?: number;
  rating?: number;
}

export interface MappedMatch {
  id: number | string;
  competition: string;
  date: string;
  opponent: string;
  status: 'Finished' | 'Upcoming';
  score?: string;
  jornada?: string;
  localTeam?: string;
  visitorTeam?: string;
  time?: string;
  location?: string;
}
