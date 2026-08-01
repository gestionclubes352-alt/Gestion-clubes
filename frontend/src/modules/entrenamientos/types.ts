// Tipos específicos del módulo Entrenamientos (Campogramas y diseñador)

import type { TacticalPosition } from '@modules/tactica';

export type DesignerItemAnimation = 'none' | 'pulse' | 'bounce';

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
  animation?: DesignerItemAnimation;
}

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
