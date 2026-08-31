// Tipos específicos del módulo Entrenamientos (Campogramas y diseñador)

import type { TacticalPosition } from '@modules/tactica';

export type DesignerItemAnimation = 'none' | 'pulse' | 'bounce';

export type GoalStyle = 'clasica' | 'biselada' | 'red3d';

export interface Campograma {
  id: number | string;
  nombre: string;
  club: string;
  equipo: string;
  clubId?: string;
  jugadoresCount: number;
  formacion: string;
  positions?: TacticalPosition[];
}

export interface DesignerItem {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  scale: number;
  locked: boolean;
  zIndex: number;
  color?: string;
  icon?: string;
  text?: string;
  fontSize?: number;
  animation?: DesignerItemAnimation;
  /** Id del jugador real de la plantilla, cuando el elemento representa un jugador de plantilla (no un dorsal genérico) */
  playerId?: string | number;
  /** Nombre a mostrar del jugador de plantilla (apodo si existe, si no nombre) */
  playerName?: string;
  /** Dorsal del jugador de plantilla */
  playerDorsal?: number;
  /** Foto del jugador de plantilla, copiada en el momento de colocarlo en el diseñador */
  playerPhoto?: string;
  /** Punto de inicio de una flecha */
  arrowStart?: { x: number; y: number };
  /** Punto final de una flecha */
  arrowEnd?: { x: number; y: number };
  /** Grosor del trazo de la flecha */
  strokeWidth?: number;
  /** Estilo visual de la portería (solo aplica a type === 'goal'). Sin definir = 'clasica' (tareas guardadas antes de esta opción). */
  goalStyle?: GoalStyle;
}

export const GOAL_STYLES: Array<{ value: GoalStyle; label: string }> = [
  { value: 'clasica', label: 'Clásica' },
  { value: 'biselada', label: 'Biselada' },
  { value: 'red3d', label: 'Red 3D' },
];

export const DESIGNER_ITEM_ANIMATIONS: Array<{
  value: DesignerItemAnimation;
  label: string;
  helper: string;
  className: string;
}> = [
  { value: 'none', label: 'Sin', helper: 'Estático', className: '' },
  { value: 'pulse', label: 'Pulso', helper: 'Atenúa', className: 'animate-pulse' },
  { value: 'bounce', label: 'Rebote', helper: 'Mueve', className: 'animate-bounce' },
];

export const getDesignerItemAnimationClass = (animation?: DesignerItemAnimation) =>
  DESIGNER_ITEM_ANIMATIONS.find(option => option.value === (animation ?? 'none'))?.className ?? '';

export interface Exercise {
  id: string;
  title: string;
  frames: DesignerItem[][];
  lastModified: string;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  description: string;
  items: DesignerItem[];
  thumbnail?: string;
}
