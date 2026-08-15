// Tipos específicos del módulo Videoteca

export interface VideoItem {
  id: number | string;
  title: string;
  category: 'PARTIDO' | 'ENTRENAMIENTO' | 'TACTICA';
  duration: string;
  date: string;
  thumbnail: string;
  vimeoUrl?: string;
}

export type DetectionType = 'GOL' | 'OCASION' | 'CORNER';

export interface DetectionEvent {
  id: string;
  minute: string;
  startAt?: string;
  type: DetectionType;
  note: string;
  confidence: number;
  actions: string[];
}

export interface VideoClip {
  id: string;
  eventId: string;
  videoId: string | number;
  eventType: DetectionType;
  eventTime: string;
  clipStartTime: string;
  clipEndTime: string;
  clipStartSeconds: number;
  clipEndSeconds: number;
  note: string;
  capturedAt: string;
}

export interface VideoFilters {
  searchTerm: string;
  category: string;
  tags: string[];
}
