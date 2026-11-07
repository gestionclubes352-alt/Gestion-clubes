import type { Jugador } from '@shared/services/dataService';

/** Nombre + primer apellido del jugador (tabla `plantillas`), con fallback a `nombre` si faltan. */
export function nombreMostrable(j: Pick<Jugador, 'nombre' | 'nombre_pila' | 'primer_apellido'>): string {
  const pila = (j.nombre_pila || '').trim();
  const apellido = (j.primer_apellido || '').trim();
  if (pila && apellido) return `${pila} ${apellido}`;
  return j.nombre;
}

export interface RpeFormData {
  jugador_id: string;
  fecha: string;
  rpe?: number;
  animo?: number;
  motivacion?: number;
  molestia?: string;
}

export interface WellnessFormData {
  jugador_id: string;
  fecha: string;
  sueno?: number;
  musc?: number;
  aerob?: number;
  zona_cargada?: string;
  molestias?: string;
  comentario?: string;
}

/** Fila de la tabla de análisis: combina RPE + Wellness de un jugador en un día, con z-scores de tendencia. */
export interface FilaMediciones {
  jugador_id: string;
  rpe_id: string | number | null;
  wellness_id: string | number | null;
  nombre: string;
  wellness: number | null;
  sueno: number | null;
  musc: number | null;
  aerob: number | null;
  rpe: number | null;
  animo: number | null;
  motivacion: number | null;
  molestia: string | null;
  comentarios: string | null;
  z_wellness: number | null;
  z_sueno: number | null;
  z_musc: number | null;
  z_aerob: number | null;
  z_rpe: number | null;
  z_animo: number | null;
  z_motivacion: number | null;
}
