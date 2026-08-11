// Tipos específicos del módulo Competición

export interface CompetitionTeam {
  id: number | string;
  /** Club al que pertenece este equipo. Debe existir previamente en el catálogo de Clubes. */
  clubId?: number | string;
  nombre: string;
  estadio?: string;
  localidad?: string;
  logoUrl?: string;
  /** Sub-equipo al que pertenece (ej: 'Juvenil A', 'Cadete A'). Sin valor = equipo principal. */
  equipo?: string;
  /** Nombre del equipo asignado en federación. */
  nombreEnFed?: string;
  /** Etapa/categoría del equipo (ej: Senior, Juvenil, Cadete, Infantil, Alevín, Benjamín). */
  etapa?: string;
  /** Nombre de la competición en la que participa. */
  competicion?: string;
  /** Temporada de la competicion (ej: '26/27' o '2026/2027'). */
  temporada?: string;
  /** URL del enlace a la competición/federación. */
  enlace?: string;
}

export interface LeagueStanding {
  position: number;
  team: CompetitionTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
