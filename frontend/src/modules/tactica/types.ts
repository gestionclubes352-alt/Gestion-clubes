// Tipos específicos del módulo Táctica

export interface TacticalPosition {
  id: string;
  x: number;
  y: number;
  label: string;
  playerIds?: Array<string | number>;
}

export interface Formation {
  name: string;
  positions: TacticalPosition[];
}

export type FormationName = '1-3-4-3' | '1-4-3-3' | '1-4-4-2' | '1-4-2-3-1' | '1-5-3-2';

export const FORMATIONS: Record<FormationName, TacticalPosition[]> = {
  '1-3-4-3': [
    { id: 'GK', x: 50, y: 92, label: 'POR' },
    { id: 'CD1', x: 75, y: 76, label: 'DFC' },
    { id: 'CD2', x: 50, y: 76, label: 'DFC' },
    { id: 'CD3', x: 25, y: 76, label: 'DFC' },
    { id: 'MD', x: 82, y: 48, label: 'MD' },
    { id: 'MC1', x: 62, y: 52, label: 'MC' },
    { id: 'MC2', x: 38, y: 52, label: 'MC' },
    { id: 'MI', x: 18, y: 48, label: 'MI' },
    { id: 'ED', x: 78, y: 20, label: 'ED' },
    { id: 'DC', x: 50, y: 15, label: 'DC' },
    { id: 'EI', x: 22, y: 20, label: 'EI' },
  ],
  '1-4-3-3': [
    { id: 'GK', x: 50, y: 92, label: 'POR' },
    { id: 'LD', x: 85, y: 68, label: 'LD' },
    { id: 'CD1', x: 68, y: 76, label: 'DFC' },
    { id: 'CD2', x: 32, y: 76, label: 'DFC' },
    { id: 'LI', x: 15, y: 68, label: 'LI' },
    { id: 'MC', x: 50, y: 52, label: 'MC' },
    { id: 'MCO1', x: 82, y: 44, label: 'MCO' },
    { id: 'MCO2', x: 18, y: 44, label: 'MCO' },
    { id: 'ED', x: 78, y: 20, label: 'ED' },
    { id: 'DC', x: 50, y: 15, label: 'DC' },
    { id: 'EI', x: 22, y: 20, label: 'EI' },
  ],
  '1-4-4-2': [
    { id: 'GK', x: 50, y: 92, label: 'POR' },
    { id: 'LD', x: 85, y: 68, label: 'LD' },
    { id: 'CD1', x: 68, y: 76, label: 'DFC' },
    { id: 'CD2', x: 32, y: 76, label: 'DFC' },
    { id: 'LI', x: 15, y: 68, label: 'LI' },
    { id: 'MD', x: 82, y: 48, label: 'MD' },
    { id: 'MC1', x: 62, y: 52, label: 'MC' },
    { id: 'MC2', x: 38, y: 52, label: 'MC' },
    { id: 'MI', x: 18, y: 48, label: 'MI' },
    { id: 'DC1', x: 68, y: 20, label: 'DC' },
    { id: 'DC2', x: 32, y: 20, label: 'DC' },
  ],
  '1-4-2-3-1': [
    { id: 'GK', x: 50, y: 92, label: 'POR' },
    { id: 'LD', x: 85, y: 68, label: 'LD' },
    { id: 'CD1', x: 68, y: 76, label: 'DFC' },
    { id: 'CD2', x: 32, y: 76, label: 'DFC' },
    { id: 'LI', x: 15, y: 68, label: 'LI' },
    { id: 'MCD1', x: 65, y: 56, label: 'MCD' },
    { id: 'MCD2', x: 35, y: 56, label: 'MCD' },
    { id: 'MD', x: 80, y: 40, label: 'MD' },
    { id: 'MCO', x: 50, y: 44, label: 'MCO' },
    { id: 'MI', x: 20, y: 40, label: 'MI' },
    { id: 'DC', x: 50, y: 15, label: 'DC' },
  ],
  '1-5-3-2': [
    { id: 'GK', x: 50, y: 92, label: 'POR' },
    { id: 'CAD', x: 85, y: 60, label: 'CAD' },
    { id: 'CD1', x: 75, y: 76, label: 'DFC' },
    { id: 'CD2', x: 50, y: 76, label: 'DFC' },
    { id: 'CD3', x: 25, y: 76, label: 'DFC' },
    { id: 'CAI', x: 15, y: 60, label: 'CAI' },
    { id: 'MC1', x: 72, y: 48, label: 'MC' },
    { id: 'MC2', x: 50, y: 48, label: 'MC' },
    { id: 'MC3', x: 28, y: 48, label: 'MC' },
    { id: 'DC1', x: 65, y: 18, label: 'DC' },
    { id: 'DC2', x: 35, y: 18, label: 'DC' },
  ]
};

export interface TacticalArrow {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  strokeWidth?: number;
}

// Funciones de utilidad para formaciones
export const getInitialPositions = (formation: string): TacticalPosition[] => {
  return FORMATIONS[formation as FormationName] || FORMATIONS['1-4-3-3'];
};

export const remapPlayersToFormation = (
  prevPositions: TacticalPosition[],
  nextPositions: TacticalPosition[],
  maxPerPos = 2
): TacticalPosition[] => {
  const playerQueue = prevPositions.flatMap(pos => pos.playerIds || []);
  let idx = 0;
  return nextPositions.map(pos => {
    const playerIds = playerQueue.slice(idx, idx + maxPerPos);
    idx += maxPerPos;
    return { ...pos, playerIds };
  });
};

// Tipos para herramientas de dibujo
export type DrawingToolType =
  | 'arrow' | 'arrowStraight' | 'pen'
  | 'text' | 'callout'
  | 'rectangle' | 'ellipse' | 'zone' | 'triangleZone'
  | 'connector' | 'focus' | 'spotlight' | 'line' | 'tshape'
  | 'move' | 'select';

export type FocusStyle = 'abierto' | 'estrecho' | 'cilindrico';
export type SpotlightStyle = 'filled' | 'outline' | 'beams';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingShape {
  id: string;
  type: DrawingToolType;
  stroke: string;
  fill?: string;
  lineWidth: number;
  opacity: number;
  fontSize?: number;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: Point[];
  text?: string;
  focusStyle?: FocusStyle;
  spotlightStyle?: SpotlightStyle;
  rotation?: number;
  dashed?: boolean;
}

export interface DrawingState {
  tool: DrawingToolType | null;
  isDrawing: boolean;
  currentShape: DrawingShape | null;
  selectedShapeId: string | null;
  focusStyle: FocusStyle;
  spotlightStyle: SpotlightStyle;
  stroke: string;
  fill: string;
  lineWidth: number;
  opacity: number;
  fontSize: number;
  dashed: boolean;
  pendingConnectorPlayerId: string | null;
}
