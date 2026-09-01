import React from 'react';
import anatomiaFrontal from '../../../assets/cuerpo-humano-frontal_1048-5345.avif';

interface BodyDiagramProps {
  bodyPart?: string;
  side?: 'IZQUIERDO' | 'DERECHO';
}

// Zonas que se ven mejor desde atrás (espalda, lumbar, gemelos, etc.)
// Como solo disponemos de la imagen frontal, para estas zonas se muestra
// la vista frontal igualmente pero indicando "Vista posterior" en el texto.
const BACK_PARTS = new Set([
  'ESPALDA', 'LUMBAR', 'GLÚTEO', 'ISQUIOTIBIAL', 'GEMELO', 'SÓLEO',
  'TENDÓN_AQUILES', 'CERVICAL',
]);

// Partes que existen a ambos lados del cuerpo (par bilateral)
const BILATERAL_PARTS = new Set([
  'HOMBRO', 'BRAZO', 'CODO', 'ANTEBRAZO', 'MUÑECA', 'MANO',
  'GLÚTEO', 'INGLE', 'ADUCTOR', 'MUSLO', 'CUÁDRICEPS', 'ISQUIOTIBIAL',
  'RODILLA', 'LIGAMENTO_CRUZADO', 'MENISCO', 'RÓTULA',
  'GEMELO', 'SÓLEO', 'TENDÓN_AQUILES', 'TOBILLO', 'PIE', 'FASCIA_PLANTAR',
]);

type EllipseZone = { cx: number; cy: number; rx: number; ry: number };

// Coordenadas (cx, cy, rx, ry) en % sobre la imagen (0-100), calibradas
// sobre la foto de anatomía frontal con los brazos extendidos en cruz.
// Nota: en vista frontal, el lado DERECHO del jugador se dibuja a la
// IZQUIERDA de la imagen (como en un espejo), y viceversa.
const ZONES: Record<string, EllipseZone | { left: EllipseZone; right: EllipseZone }> = {
  CABEZA: { cx: 50, cy: 11, rx: 8, ry: 8 },
  CUELLO: { cx: 50, cy: 18, rx: 4, ry: 3 },
  HOMBRO: {
    left: { cx: 28, cy: 21, rx: 6, ry: 4 },
    right: { cx: 72, cy: 21, rx: 6, ry: 4 },
  },
  'CLAVÍCULA': { cx: 50, cy: 17, rx: 12, ry: 3 },
  COSTILLAS: { cx: 50, cy: 27, rx: 12, ry: 9 },
  ESPALDA: { cx: 50, cy: 27, rx: 12, ry: 9 },
  ABDOMEN: { cx: 50, cy: 37, rx: 9, ry: 7 },
  PUBIS: { cx: 50, cy: 46, rx: 6, ry: 3 },
  BRAZO: {
    left: { cx: 17, cy: 27, rx: 8, ry: 5 },
    right: { cx: 83, cy: 27, rx: 8, ry: 5 },
  },
  CODO: {
    left: { cx: 11, cy: 33, rx: 3, ry: 3 },
    right: { cx: 89, cy: 33, rx: 3, ry: 3 },
  },
  ANTEBRAZO: {
    left: { cx: 5, cy: 38, rx: 8, ry: 5 },
    right: { cx: 95, cy: 38, rx: 8, ry: 5 },
  },
  'MUÑECA': {
    left: { cx: 2, cy: 44, rx: 2.5, ry: 2.5 },
    right: { cx: 98, cy: 44, rx: 2.5, ry: 2.5 },
  },
  MANO: {
    left: { cx: 1, cy: 48, rx: 4, ry: 5 },
    right: { cx: 99, cy: 48, rx: 4, ry: 5 },
  },
  CADERA: { cx: 50, cy: 47, rx: 11, ry: 4 },
  'GLÚTEO': {
    left: { cx: 43, cy: 47, rx: 6, ry: 4 },
    right: { cx: 57, cy: 47, rx: 6, ry: 4 },
  },
  INGLE: {
    left: { cx: 45, cy: 49, rx: 4, ry: 2.5 },
    right: { cx: 55, cy: 49, rx: 4, ry: 2.5 },
  },
  ADUCTOR: {
    left: { cx: 45, cy: 54, rx: 4, ry: 6 },
    right: { cx: 55, cy: 54, rx: 4, ry: 6 },
  },
  MUSLO: {
    left: { cx: 41, cy: 56, rx: 6, ry: 10 },
    right: { cx: 59, cy: 56, rx: 6, ry: 10 },
  },
  'CUÁDRICEPS': {
    left: { cx: 41, cy: 56, rx: 6, ry: 10 },
    right: { cx: 59, cy: 56, rx: 6, ry: 10 },
  },
  ISQUIOTIBIAL: {
    left: { cx: 41, cy: 56, rx: 6, ry: 10 },
    right: { cx: 59, cy: 56, rx: 6, ry: 10 },
  },
  RODILLA: {
    left: { cx: 41, cy: 68, rx: 5, ry: 3 },
    right: { cx: 59, cy: 68, rx: 5, ry: 3 },
  },
  LIGAMENTO_CRUZADO: {
    left: { cx: 41, cy: 68, rx: 5, ry: 3 },
    right: { cx: 59, cy: 68, rx: 5, ry: 3 },
  },
  MENISCO: {
    left: { cx: 41, cy: 68, rx: 5, ry: 3 },
    right: { cx: 59, cy: 68, rx: 5, ry: 3 },
  },
  'RÓTULA': {
    left: { cx: 41, cy: 68, rx: 4, ry: 3 },
    right: { cx: 59, cy: 68, rx: 4, ry: 3 },
  },
  GEMELO: {
    left: { cx: 41, cy: 78, rx: 5, ry: 8 },
    right: { cx: 59, cy: 78, rx: 5, ry: 8 },
  },
  'SÓLEO': {
    left: { cx: 41, cy: 78, rx: 5, ry: 8 },
    right: { cx: 59, cy: 78, rx: 5, ry: 8 },
  },
  TENDÓN_AQUILES: {
    left: { cx: 41, cy: 89, rx: 3, ry: 3 },
    right: { cx: 59, cy: 89, rx: 3, ry: 3 },
  },
  TOBILLO: {
    left: { cx: 41, cy: 91, rx: 3.5, ry: 2.5 },
    right: { cx: 59, cy: 91, rx: 3.5, ry: 2.5 },
  },
  PIE: {
    left: { cx: 40, cy: 96, rx: 6, ry: 3 },
    right: { cx: 60, cy: 96, rx: 6, ry: 3 },
  },
  FASCIA_PLANTAR: {
    left: { cx: 40, cy: 96, rx: 6, ry: 3 },
    right: { cx: 60, cy: 96, rx: 6, ry: 3 },
  },
  CERVICAL: { cx: 50, cy: 18, rx: 4, ry: 3 },
};

const BodyDiagram: React.FC<BodyDiagramProps> = ({ bodyPart, side }) => {
  if (!bodyPart) return null;
  const zoneDef = ZONES[bodyPart];
  const isBack = BACK_PARTS.has(bodyPart);
  const isBilateral = BILATERAL_PARTS.has(bodyPart) && zoneDef && 'left' in zoneDef;

  // El lado DERECHO del jugador se ve a la izquierda de la imagen (vista en espejo)
  const zones: EllipseZone[] = !zoneDef
    ? []
    : isBilateral
      ? (() => {
          const pair = zoneDef as { left: EllipseZone; right: EllipseZone };
          if (side === 'IZQUIERDO') return [pair.right];
          if (side === 'DERECHO') return [pair.left];
          return [pair.left, pair.right];
        })()
      : [zoneDef as EllipseZone];

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative w-full max-w-md">
        <img src={anatomiaFrontal} alt="Diagrama anatómico del cuerpo humano" className="w-full h-auto select-none mix-blend-multiply dark:mix-blend-normal" draggable={false} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <radialGradient id="injuryGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff5252" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#e11d2e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#e11d2e" stopOpacity="0" />
            </radialGradient>
          </defs>
          {zones.map((z, i) => (
            <g key={i}>
              <ellipse cx={z.cx} cy={z.cy} rx={z.rx + 3} ry={z.ry + 3} fill="url(#injuryGlow)">
                <animate attributeName="opacity" values="0.55;1;0.55" dur="1.6s" repeatCount="indefinite" />
              </ellipse>
              <ellipse
                cx={z.cx}
                cy={z.cy}
                rx={z.rx}
                ry={z.ry}
                fill="#ff2222"
                fillOpacity="0.55"
                stroke="#b00000"
                strokeWidth="0.6"
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default BodyDiagram;
