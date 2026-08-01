export interface Player {
  id: number;
  fotoUrl: string;
  competicion: string;
  club: string;
  equipo: string;
  dorsal: number;
  nombre: string;
  apodo?: string;
  posicion: string;
  posicionJuego: string;
  perfil: 'D' | 'I';
  fechaNacimiento?: string;
  partidosJugados?: number;
  minutos?: number;
  titular?: number;
  goles?: number;
  ratingTecnica?: number;
  ratingTactica?: number;
  ratingCondicional?: number;
  ratingPsicologico?: number;
  ratingHumano?: number;
}

export interface StaffMember {
  id: number | string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  fotoUrl?: string;
  dni?: string;
  fechaNacimiento?: string;
  rol: string;
  equipo?: string;
  etapa?: string;
  competicion?: string;
  telefono?: string;
  email?: string;
  club?: string;
}

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'Administrador' | 'Responsable' | 'Tecnico';
  estado: 'Activo' | 'Inactivo';
  ultimoAcceso?: string;
}

export interface CompetitionTeam {
  id: number;
  nombre: string;
  estadio: string;
  localidad: string;
  logoUrl?: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points?: number;
}

export interface TacticalPosition {
  id: string;
  x: number;
  y: number;
  label: string;
  playerIds?: number[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'Entrenamiento' | 'Partido' | 'ReuniÃ³n' | 'Otro' | 'Descanso' | 'Actividad';
  date: Date;
  time: string;
  team?: string;
  location?: string;
  notes?: string;
  videoUrl?: string;
  docUrl?: string;
  staffRoles?: string;
  // Campos especÃ­ficos de partido integrados
  competition?: string;
  jornada?: string;
  localTeam?: string;
  visitorTeam?: string;
  opponent?: string;
  score?: string;
  status?: 'Finished' | 'Upcoming';
}

export interface VideoEvent {
  id: string;
  minute: string;
  type: 'GOL' | 'OCASION' | 'DUELO' | 'NOTA';
  note: string;
  playerId?: number;
  goalSide?: 'FAVOR' | 'CONTRA';
  duelOutcome?: 'GANADO' | 'PERDIDO';
  timestamp: number; // Para ordenar
}

export interface MatchReport {
  id: string; // matchId
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
  abpOffCorner2Text?: string;
  abpOffCorner3Text?: string;
  abpOffCorner4Text?: string;
  abpOffLateralText?: string;
  abpOffLateral2Text?: string;
  abpOffFrontalText?: string;
  abpDefCorner1Text?: string;
  abpDefCorner2Text?: string;
  abpDefLateralText?: string;
  abpDefFrontalText?: string;
  abpOffCornerImage?: string;
  abpOffCorner2Image?: string;
  abpOffCorner3Image?: string;
  abpOffCorner4Image?: string;
  abpOffLateralImage?: string;
  abpOffLateral2Image?: string;
  abpOffFrontalImage?: string;
  abpDefCorner1Image?: string;
  abpDefCorner2Image?: string;
  abpDefLateralImage?: string;
  abpDefFrontalImage?: string;
  abpOffCornerVideo?: string;
  abpOffCorner2Video?: string;
  abpOffCorner3Video?: string;
  abpOffCorner4Video?: string;
  abpOffLateralVideo?: string;
  abpOffLateral2Video?: string;
  abpOffFrontalVideo?: string;
  abpDefCorner1Video?: string;
  abpDefCorner2Video?: string;
  abpDefLateralVideo?: string;
  abpDefFrontalVideo?: string;
  // Nuevos campos para el sistema tÃ¡ctico del partido
  formation?: string;
  lineupPositions?: TacticalPosition[];
  substituteIds?: number[];
  videoEvents?: VideoEvent[];
  // SincronizaciÃ³n de tiempos
  firstHalfStart?: string; // Formato MM:SS del video
  firstHalfEnd?: string;
  secondHalfStart?: string;
  secondHalfEnd?: string;
}

export interface Campograma {
  id: number;
  nombre: string;
  club: string;
  equipo: string;
  jugadoresCount: number;
  formacion: string;
  positions?: TacticalPosition[];
}

export interface DesignerItem {
  id: string;
  type: string;
  x: number;
  y: number;
  color?: string;
  label?: string;
  icon?: string;
  width?: number;
  height?: number;
  rotation: number;
  scale: number;
  locked: boolean;
  zIndex: number;
  animate?: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  frames: DesignerItem[][];
  lastModified: string;
}

export interface Match {
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

export type SidebarSection = 'INICIO' | 'PLANTILLAS' | 'PERSONAL' | 'CAMPOGRAMA' | 'DISEÃ‘ADOR' | 'PIZARRA TÃCTICA' | 'SESIONES' | 'PARTIDOS' | 'VIDEOTECA' | 'USUARIOS' | 'EQUIPOS';

export type HomeTab = 'CLASIFICACIÃ“N' | 'PARTIDOS' | 'PLANTILLA';
