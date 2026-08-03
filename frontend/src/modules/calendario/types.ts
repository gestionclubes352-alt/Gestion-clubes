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
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'Entrenamiento' | 'Sesión' | 'Partido' | 'Otro' | 'Actividad';
  date: Date;
  time: string;
  team?: string;
  clubId?: string;
  location?: string;
  notes?: string;
  videoUrl?: string;
  docUrl?: string;
  staffRoles?: string;
  // Campos específicos de partido
  competition?: string;
  jornada?: string;
  sessionNumber?: number;
  localTeam?: string;
  visitorTeam?: string;
  opponent?: string;
  score?: string;
  status?: 'Finished' | 'Upcoming';
  tasks?: SessionTask[];
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
  team: string;
  competition: string;
  jornada: string;
  sessionNumber: string;
  localTeam: string;
  visitorTeam: string;
  score: string;
  notes: string;
  videoUrl: string;
  docUrl: string;
}

export const EVENT_COLORS: Record<EventType, string> = {
  Entrenamiento: 'bg-emerald-500',
  Partido: 'bg-red-500',
  Otro: 'bg-gray-500',
  Actividad: 'bg-amber-500'
};
