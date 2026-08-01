// Tipos específicos del módulo Área Médica

export type InjurySeverity = 'LEVE' | 'MODERADA' | 'GRAVE';
export type InjuryStatus = 'ACTIVA' | 'EN_REHABILITACIÓN' | 'RECUPERADO';
export type BodyPart = 'CABEZA' | 'HOMBRO' | 'BRAZO' | 'MANO' | 'ESPALDA' | 'CADERA' | 'MUSLO' | 'RODILLA' | 'TOBILLO' | 'PIE' | 'INGLE' | 'ISQUIOTIBIAL' | 'GEMELO' | 'CUÁDRICEPS' | 'ADUCTOR' | 'OTRO';

export interface Injury {
  id: string;
  playerId: string;
  playerName: string;
  type: string;
  bodyPart: BodyPart;
  side?: 'IZQUIERDO' | 'DERECHO';
  severity: InjurySeverity;
  status: InjuryStatus;
  dateOccurred: string;
  estimatedReturn?: string;
  actualReturn?: string;
  mechanism?: string;
  notes?: string;
}

export type CheckupStatus = 'PENDIENTE' | 'COMPLETADO' | 'VENCIDO';
export type CheckupType = 'PRETEMPORADA' | 'PERIÓDICO' | 'POST_LESIÓN' | 'RETORNO';

export interface MedicalCheckup {
  id: string;
  playerId: string;
  playerName: string;
  type: CheckupType;
  status: CheckupStatus;
  scheduledDate: string;
  completedDate?: string;
  doctor?: string;
  result?: string;
  notes?: string;
}

export type RehabPhase = 'FASE_1' | 'FASE_2' | 'FASE_3' | 'ALTA';

export interface RehabProgram {
  id: string;
  playerId: string;
  playerName: string;
  injuryId: string;
  phase: RehabPhase;
  progressPercent: number;
  startDate: string;
  estimatedEndDate?: string;
  exercises: string[];
  physiotherapistNotes?: string;
}

export interface FitnessTest {
  id: string;
  playerId: string;
  playerName: string;
  date: string;
  type: string;
  value: number;
  unit: string;
  notes?: string;
}

export interface MedicalRecord {
  id: string;
  playerId: string;
  playerName: string;
  bloodType?: string;
  allergies: string[];
  medications: string[];
  previousInjuries: Injury[];
  notes?: string;
}
