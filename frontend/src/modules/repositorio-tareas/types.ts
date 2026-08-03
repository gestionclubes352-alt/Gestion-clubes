/**
 * @fileoverview Tipos del módulo Repositorio de Tareas
 * @description Estructura para almacenar y categorizar tareas/ejercicios de entrenamiento
 */

/** Categoría principal de la tarea */
export type TaskCategory =
  | 'Juego'
  | 'Posesión'
  | 'Finalización'
  | 'Rondo'
  | 'Calentamiento'
  | 'Recuperación'
  | 'Físico'
  | 'Técnico'
  | 'Táctico'
  | 'Otro';

/** Nivel de intensidad */
export type TaskIntensity = 'Baja' | 'Media' | 'Alta' | 'Muy Alta';

/** Estructura de campo usada al diseñar la tarea (determina qué líneas de campo se dibujan) */
export type FieldStructure = 'campo-total' | 'ataque' | 'defensa' | 'libre';

/** Fase de la sesión donde encaja la tarea */
export type SessionPhase = 'Calentamiento' | 'Parte Principal' | 'Vuelta a la Calma';

/** Material necesario para la tarea */
export interface TaskMaterial {
  name: string;
  quantity: number;
}

/**
 * Interfaz principal de una tarea almacenada en el repositorio.
 * Pensada para ser reutilizable y compartida entre sesiones.
 */
export interface TrainingTask {
  id: string;
  /** Nombre descriptivo de la tarea */
  name: string;
  /** Categoría principal */
  category: TaskCategory;
  /** URL/path de imagen o diagrama asociado */
  thumbnail?: string;
  /** Snapshot del diseño (si fue creada con el diseñador) */
  designerSnapshot?: any[];
  /** Estructura de campo activa al guardar el snapshot (por defecto 'campo-total' si no se especifica) */
  fieldStructure?: FieldStructure;
  /** Fecha de creación (ISO) */
  createdAt: string;
  /** Fecha de última edición (ISO) */
  updatedAt: string;
}

/** Todas las categorías disponibles */
export const TASK_CATEGORIES: TaskCategory[] = [
  'Juego',
  'Posesión',
  'Finalización',
  'Rondo',
  'Calentamiento',
  'Recuperación',
  'Físico',
  'Técnico',
  'Táctico',
  'Otro',
];

/** Niveles de intensidad */
export const TASK_INTENSITIES: TaskIntensity[] = ['Baja', 'Media', 'Alta', 'Muy Alta'];

/** Fases de sesión */
export const SESSION_PHASES: SessionPhase[] = ['Calentamiento', 'Parte Principal', 'Vuelta a la Calma'];

/** Iconos por categoría */
export const CATEGORY_ICONS: Record<TaskCategory, string> = {
  'Juego': 'fa-gamepad',
  'Posesión': 'fa-arrows-spin',
  'Finalización': 'fa-bullseye',
  'Rondo': 'fa-circle-nodes',
  'Calentamiento': 'fa-fire',
  'Recuperación': 'fa-bed',
  'Físico': 'fa-dumbbell',
  'Técnico': 'fa-shoe-prints',
  'Táctico': 'fa-chess',
  'Otro': 'fa-ellipsis',
};

/** Colores por categoría (tailwind classes) */
export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  'Juego': 'bg-emerald-500',
  'Posesión': 'bg-blue-500',
  'Finalización': 'bg-red-500',
  'Rondo': 'bg-violet-500',
  'Calentamiento': 'bg-orange-500',
  'Recuperación': 'bg-cyan-500',
  'Físico': 'bg-amber-600',
  'Técnico': 'bg-pink-500',
  'Táctico': 'bg-indigo-500',
  'Otro': 'bg-slate-500',
};

/** Colores por intensidad */
export const INTENSITY_COLORS: Record<TaskIntensity, string> = {
  'Baja': 'bg-green-100 text-green-700 border-green-200',
  'Media': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Alta': 'bg-orange-100 text-orange-700 border-orange-200',
  'Muy Alta': 'bg-red-100 text-red-700 border-red-200',
};

export const getDesignerItemAnimationClass = (animation?: string) => {
  switch (animation) {
    case 'pulse':
      return 'animate-pulse';
    case 'bounce':
      return 'animate-bounce';
    default:
      return '';
  }
};
