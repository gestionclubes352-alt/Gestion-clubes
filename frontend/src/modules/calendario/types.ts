// Tipos específicos del módulo Calendario

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
