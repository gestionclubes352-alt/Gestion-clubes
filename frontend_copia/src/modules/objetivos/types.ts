export type TipoObjetivoIndividual = 'deportivo' | 'psicologico' | 'habitos' | 'academico';
export type EstadoObjetivoIndividual = 'verde' | 'naranja' | 'rojo';

export type TipoAccionObjetivo = 'reunion' | 'video' | 'sesion_individual' | 'sesion_colectiva' | 'sesion_grupal';

/**
 * Elemento del historial de un objetivo: una acción o una evaluación.
 * Comparten lista y se ordenan por fecha. Los elementos antiguos sin
 * `categoria` se consideran acciones.
 */
export interface AccionObjetivo {
  id: string;
  fecha: string;
  categoria?: 'accion' | 'evaluacion';
  /** Solo acciones */
  tipo?: TipoAccionObjetivo;
  /** Solo evaluaciones (semáforo) */
  estado?: EstadoObjetivoIndividual;
  /** Detalle de la acción o comentario de la evaluación */
  detalle?: string;
  /** Documento adjunto (bucket privado `objetivos-documentos`) */
  documento?: { nombre: string; path: string; tamano?: number };
  /** Vídeo subido al canal de YouTube del club */
  video_url?: string;
}

export const TIPOS_ACCION: { value: TipoAccionObjetivo; label: string }[] = [
  { value: 'reunion', label: 'Reunión' },
  { value: 'video', label: 'Vídeo' },
  { value: 'sesion_individual', label: 'Sesión individual' },
  { value: 'sesion_colectiva', label: 'Sesión colectiva' },
  { value: 'sesion_grupal', label: 'Sesión grupal' },
];

export interface ObjetivoIndividualFormData {
  id?: string;
  equipo_id: string;
  jugador_id: string;
  fecha: string;
  tipo: TipoObjetivoIndividual;
  /** Estado ACTUAL: el de la última evaluación (por fecha) o, si no hay, el inicial. Se calcula al guardar. */
  estado: EstadoObjetivoIndividual;
  /** Estado con el que nació el objetivo */
  estado_inicial?: EstadoObjetivoIndividual;
  /** Nombre del objetivo asignado */
  nombre_objetivo?: string | null;
  detalle?: string;
  acciones?: AccionObjetivo[];
}

export const TIPOS_OBJETIVO: { value: TipoObjetivoIndividual; label: string }[] = [
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'psicologico', label: 'Psicológico' },
  { value: 'habitos', label: 'Hábitos' },
  { value: 'academico', label: 'Académico' },
];

export const ESTADOS_OBJETIVO: { value: EstadoObjetivoIndividual; label: string; color: string }[] = [
  { value: 'verde', label: 'Verde', color: '#22c55e' },
  { value: 'naranja', label: 'Naranja', color: '#f97316' },
  { value: 'rojo', label: 'Rojo', color: '#ef4444' },
];
