// Tipos específicos del módulo Partidos

import { TacticalPosition } from '../tactica/types';

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
  time?: string;
  location?: string;
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

export interface MatchReport {
  id: string;
  generalNotes: string;
  videoUrl: string;
  docUrl: string;
  conBalonText: string;
  conBalonVideo: string;
  conBalonDoc: string;
  sinBalonText: string;
  sinBalonVideo: string;
  sinBalonDoc: string;
  abpText: string;
  abpVideo: string;
  abpDoc: string;
  abpOffCornerText?: string;
  abpOffLateralText?: string;
  abpOffFrontalText?: string;
  abpDefCorner1Text?: string;
  abpDefCorner2Text?: string;
  abpDefFrontalText?: string;
  abpOffCornerImage?: string;
  abpOffLateralImage?: string;
  abpOffFrontalImage?: string;
  abpDefCorner1Image?: string;
  abpDefCorner2Image?: string;
  abpDefFrontalImage?: string;
  abpOffCornerVideo?: string;
  abpOffLateralVideo?: string;
  abpOffFrontalVideo?: string;
  abpDefCorner1Video?: string;
  abpDefCorner2Video?: string;
  abpDefFrontalVideo?: string;
  formation?: string;
  lineupPositions?: TacticalPosition[];
  substituteIds?: Array<string | number>;
  videoEvents?: VideoEvent[];
  firstHalfStart?: string;
  firstHalfEnd?: string;
  secondHalfStart?: string;
  secondHalfEnd?: string;

  refereeName?: string;
  refereeDescription?: string;
}
