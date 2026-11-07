// Tipos para cambios tácticos en reportes de partidos

export type MatchTacticalChangeType = 'entrada' | 'salida' | 'cambio_formacion';

export interface MatchTacticalChange {
  id: string;
  matchId: string;
  minute: number;
  type: MatchTacticalChangeType;
  playerInId?: string | number;
  playerInName?: string;
  playerOutId?: string | number;
  playerOutName?: string;
  newFormation?: string;
  description?: string;
  timestamp: number;
  createdAt: string;
  updatedAt: string;
}

export interface MatchTacticalTimeline {
  matchId: string;
  changes: MatchTacticalChange[];
}
