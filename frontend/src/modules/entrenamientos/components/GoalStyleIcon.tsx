import type { FC } from 'react';
import type { GoalStyle } from '../types';
import GoalFrame3D from './GoalFrame3D';

interface GoalStyleIconProps {
  style: GoalStyle;
  className?: string;
  isFlipped?: boolean;
  /** Miniatura pequeña (selector de variantes): usa un dibujo simplificado en vez del marco 3D real, que no se aprecia bien a tamaño reducido. */
  thumbnail?: boolean;
}

/** Marco clásico: mismo trazo que usaba el diseñador antes de existir variantes (3 lados, sin base). */
const ClasicaFrame: FC<{ className?: string }> = ({ className }) => (
  <div className={`border-[4px] border-white border-b-0 shadow-2xl group-hover:border-[#ffd700] transition-colors ${className || ''}`} />
);

/** Marco con esquinas biseladas en V invertida en vez de ángulo recto. */
const BiseladaFrame: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 60" preserveAspectRatio="none" className={className}>
    <polyline
      points="0,60 0,32 30,0 70,0 100,32 100,60"
      fill="none"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className="transition-colors group-hover:stroke-[#ffd700]"
    />
  </svg>
);

/** Miniatura simplificada de la variante con red/perspectiva, para el selector (el marco 3D real no se aprecia a tamaño reducido). */
const Red3DThumbnail: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 60" preserveAspectRatio="none" className={className}>
    <polygon points="15,55 15,10 85,10 85,55" fill="none" stroke="white" strokeWidth="5" vectorEffect="non-scaling-stroke" />
    <polygon points="0,58 15,10 85,10 100,58" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    <line x1="0" y1="58" x2="15" y2="55" stroke="rgba(255,255,255,0.55)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    <line x1="100" y1="58" x2="85" y2="55" stroke="rgba(255,255,255,0.55)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
  </svg>
);

const GoalStyleIcon: FC<GoalStyleIconProps> = ({ style, className, isFlipped, thumbnail }) => {
  if (style === 'red3d') {
    return thumbnail
      ? <Red3DThumbnail className={className} />
      : <GoalFrame3D className={className} isFlipped={isFlipped} compact />;
  }
  if (style === 'biselada') {
    return <BiseladaFrame className={className} />;
  }
  return <ClasicaFrame className={className} />;
};

export default GoalStyleIcon;
