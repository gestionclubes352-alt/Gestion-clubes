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

export type FormationName = '4-3-3' | '4-4-2' | '4-2-3-1' | '5-3-2';

export const FORMATIONS: Record<FormationName, TacticalPosition[]> = {
  '4-3-3': [
    { id: 'GK', x: 50, y: 92, label: 'POR' },
    { id: 'LD', x: 80, y: 72, label: 'LD' },
    { id: 'CD1', x: 66, y: 72, label: 'DFC' },
    { id: 'CD2', x: 34, y: 72, label: 'DFC' },
    { id: 'LI', x: 20, y: 72, label: 'LI' },
    { id: 'MC', x: 50, y: 62, label: 'MC' },
    { id: 'MCO1', x: 75, y: 52, label: 'MCO' },
    { id: 'MCO2', x: 25, y: 52, label: 'MCO' },
    { id: 'ED', x: 75, y: 30, label: 'ED' },
    { id: 'DC', x: 50, y: 22, label: 'DC' },
    { id: 'EI', x: 25, y: 30, label: 'EI' },
  ],
  '4-4-2': [
    { id: 'GK', x: 50, y: 92, label: 'POR' },
    { id: 'LD', x: 80, y: 72, label: 'LD' },
    { id: 'CD1', x: 66, y: 72, label: 'DFC' },
    { id: 'CD2', x: 34, y: 72, label: 'DFC' },
    { id: 'LI', x: 20, y: 72, label: 'LI' },
    { id: 'MD', x: 75, y: 48, label: 'MD' },
    { id: 'MC1', x: 60, y: 55, label: 'MC' },
    { id: 'MC2', x: 40, y: 55, label: 'MC' },
    { id: 'MI', x: 25, y: 48, label: 'MI' },
    { id: 'DC1', x: 65, y: 25, label: 'DC' },
    { id: 'DC2', x: 35, y: 25, label: 'DC' },
  ],
  '4-2-3-1': [
    { id: 'GK', x: 50, y: 92, label: 'POR' },
    { id: 'LD', x: 80, y: 72, label: 'LD' },
    { id: 'CD1', x: 66, y: 72, label: 'DFC' },
    { id: 'CD2', x: 34, y: 72, label: 'DFC' },
    { id: 'LI', x: 20, y: 72, label: 'LI' },
    { id: 'MCD1', x: 62, y: 58, label: 'MCD' },
    { id: 'MCD2', x: 38, y: 58, label: 'MCD' },
    { id: 'MD', x: 75, y: 40, label: 'MD' },
    { id: 'MCO', x: 50, y: 44, label: 'MCO' },
    { id: 'MI', x: 25, y: 40, label: 'MI' },
    { id: 'DC', x: 50, y: 22, label: 'DC' },
  ],
  '5-3-2': [
    { id: 'GK', x: 50, y: 92, label: 'POR' },
    { id: 'CAD', x: 80, y: 65, label: 'CAD' },
    { id: 'CD1', x: 75, y: 82, label: 'DFC' },
    { id: 'CD2', x: 50, y: 85, label: 'DFC' },
    { id: 'CD3', x: 25, y: 82, label: 'DFC' },
    { id: 'CAI', x: 20, y: 65, label: 'CAI' },
    { id: 'MC1', x: 65, y: 52, label: 'MC' },
    { id: 'MC2', x: 50, y: 56, label: 'MC' },
    { id: 'MC3', x: 35, y: 52, label: 'MC' },
    { id: 'DC1', x: 65, y: 25, label: 'DC' },
    { id: 'DC2', x: 35, y: 25, label: 'DC' },
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
  return FORMATIONS[formation as FormationName] || FORMATIONS['4-3-3'];
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
