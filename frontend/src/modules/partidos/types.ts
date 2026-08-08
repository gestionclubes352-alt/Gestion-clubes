// Tipos específicos del módulo Partidos

import { TacticalPosition } from '../tactica/types';
import { MatchTacticalChange } from '../tactica/types/match-changes';

export interface Match {
  id: string;
  competition: string;
  date: string;
  opponent: string;
  status: 'Finished' | 'Upcoming';
  score?: string;
  jornada?: string;
  localTeam?: string;
  visitorTeam?: string;
  /** Club al que pertenece localTeam/visitorTeam, para distinguir equipos homónimos de clubes distintos */
  localTeamClubId?: string;
  visitorTeamClubId?: string;
  time?: string;
  location?: string;
  nombreInterno?: string;
}

export interface VideoEvent {
  id: string;
  minute: string;
  type: 'GOL' | 'OCASION' | 'DUELO' | 'NOTA';
  note: string;
  playerId?: string | number;
  goalSide?: 'FAVOR' | 'CONTRA';
  duelOutcome?: 'GANADO' | 'PERDIDO';
  timestamp: number;
}

export interface AbpItem {
  id: string;
  text?: string;
  image?: string;
  video?: string;
}

export interface MatchSubstitution {
  id: string;
  minute: number;
  playerOutId?: string | number;
  playerInId?: string | number;
}

export interface MatchFormationChange {
  id: string;
  minute: number;
  formation: string;
  positions: TacticalPosition[];
}

export interface MatchGoal {
  id: string;
  minute: number;
  side: 'FAVOR' | 'CONTRA';
  playerId?: string | number;
}

export interface MatchCard {
  id: string;
  minute: number;
  type: 'AMARILLA' | 'ROJA';
  playerId?: string | number;
}

export interface MatchReport {
  id: string;
  generalNotes: string;

  // Vídeo del partido usado en la pestaña Eventos para etiquetar
  // goles/ocasiones/duelos con marca de tiempo (no se comparte con
  // el vídeo de Informe Rival ni el de Plan de Partido).
  videoUrl: string;

  // Informe Rival (scouting del equipo contrario) — independiente del Plan de Partido
  rivalVideoUrl: string;
  rivalDocUrl: string;
  rivalConBalonText: string;
  rivalConBalonVideo: string;
  rivalConBalonDoc: string;
  rivalConBalonImages?: string[];
  rivalSinBalonText: string;
  rivalSinBalonVideo: string;
  rivalSinBalonDoc: string;
  rivalSinBalonImages?: string[];
  rivalAbpText: string;
  rivalAbpVideo: string;
  rivalAbpDoc: string;
  rivalAbpImages?: string[];
  rivalAbpOffCorners?: AbpItem[];
  rivalAbpOffLateralFouls?: AbpItem[];
  rivalAbpDefCorners?: AbpItem[];
  rivalAbpDefLateralFouls?: AbpItem[];
  rivalAbpDefFrontalFouls?: AbpItem[];

  // Plan de Partido (nuestro plan táctico) — independiente del Informe Rival
  planVideoUrl: string;
  planDocUrl: string;
  planConBalonText: string;
  planConBalonVideo: string;
  planConBalonDoc: string;
  planConBalonImages?: string[];
  planSinBalonText: string;
  planSinBalonVideo: string;
  planSinBalonDoc: string;
  planSinBalonImages?: string[];
  planAbpText: string;
  planAbpVideo: string;
  planAbpDoc: string;
  planAbpImages?: string[];
  planAbpOffCorners?: AbpItem[];
  planAbpOffLateralFouls?: AbpItem[];
  planAbpDefCorners?: AbpItem[];
  planAbpDefLateralFouls?: AbpItem[];
  planAbpDefFrontalFouls?: AbpItem[];

  // Pestaña ABP dedicada (córners/faltas generales del equipo, distinta de las dos anteriores)
  abpOffCorners?: AbpItem[];
  abpOffLateralFouls?: AbpItem[];
  abpDefCorners?: AbpItem[];
  abpDefLateralFouls?: AbpItem[];
  abpDefFrontalFouls?: AbpItem[];
  formation?: string;
  lineupPositions?: TacticalPosition[];
  substituteIds?: Array<string | number>;
  notConvocadoIds?: Array<string | number>;
  notConvocadoReasons?: Record<string, string>;
  videoEvents?: VideoEvent[];
  substitutions?: MatchSubstitution[];
  formationChanges?: MatchFormationChange[];
  matchGoals?: MatchGoal[];
  matchCards?: MatchCard[];
  firstHalfStart?: string;
  firstHalfEnd?: string;
  secondHalfStart?: string;
  secondHalfEnd?: string;

  refereeName?: string;
  refereeDescription?: string;

  // Cambios tácticos durante el partido
  tacticalChanges?: MatchTacticalChange[];
}
