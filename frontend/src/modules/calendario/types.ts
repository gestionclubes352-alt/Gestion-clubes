// Tipos específicos del módulo Calendario

import type { TaskCategory, SessionPhase, FieldStructure } from '@modules/repositorio-tareas';
import type { DesignerItem } from '@modules/entrenamientos/types';

export interface SessionTask {
  id: string;
  /** id de la tarea en el Repositorio de Tareas, si se añadió desde ahí */
  linkedTaskId?: string;
  title: string;
  category?: TaskCategory;
  sessionPhase?: SessionPhase;
  durationMinutes?: number;
  description?: string;
  /** URL/path de imagen o diagrama asociado, copiada de la tarea del repositorio (fallback si no hay designerSnapshot) */
  thumbnail?: string;
  /** Snapshot del diseño táctico, copiado de la tarea del repositorio, para renderizar el dibujo en vivo */
  designerSnapshot?: DesignerItem[];
  /** Estructura de campo activa al guardar el snapshot, copiada de la tarea del repositorio */
  fieldStructure?: FieldStructure;
  numberOfSeries?: number;
  timePerSeries?: number;
  restBetweenSeries?: number;
  technicalRoles?: string;
}

export type AttendanceStatus = 'Si' | 'Lesión' | 'Vacaciones' | 'Descanso' | 'No justificada' | 'Otro' | 'Otro Equipo';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'Entrenamiento' | 'Sesión' | 'Partido' | 'Otro' | 'Actividad';
  date: Date;
  time: string;
  team?: string;
  clubId?: string;
  location?: string;
  localidad_id?: string;
  instalacion_campo_id?: string;
  notes?: string;
  videoUrl?: string;
  docUrl?: string;
  staffRoles?: string;
  // Campos específicos de partido
  competition?: string;
  competicion_tipo?: string;
  jornada?: string;
  sessionNumber?: number;
  localTeam?: string;
  visitorTeam?: string;
  /** Club al que pertenece localTeam/visitorTeam, para distinguir equipos homónimos de clubes distintos */
  localTeamClubId?: string;
  visitorTeamClubId?: string;
  opponent?: string;
  score?: string;
  status?: 'Finished' | 'Upcoming';
  nombreInterno?: string;
  tasks?: SessionTask[];
  /** Asistencia de la plantilla a esta sesión, indexada por id de jugador */
  attendance?: Record<string, AttendanceStatus>;
}

export type EventType = CalendarEvent['type'];

export interface CalendarFilters {
  month: number;
  year: number;
  eventType: EventType | 'TODOS';
}

export interface EventFormData {
  title: string;
  date: string;
  time: string;
  location: string;
  localidad_id?: string;
  instalacion_campo_id?: string;
  team: string;
  competition: string;
  competicion_tipo: string;
  jornada: string;
  sessionNumber: string;
  localTeam: string;
  visitorTeam: string;
  localTeamClubId: string;
  visitorTeamClubId: string;
  score: string;
  notes: string;
  videoUrl: string;
  docUrl: string;
  nombreInterno: string;
}

export const EVENT_COLORS: Record<EventType, string> = {
  Entrenamiento: 'bg-emerald-500',
  Sesión: 'bg-emerald-500',
  Partido: 'bg-red-500',
  Otro: 'bg-gray-500',
  Actividad: 'bg-amber-500'
};
