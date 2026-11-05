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
const NET_MESH =
  'repeating-linear-gradient(0deg, rgba(255,255,255,0.55) 0 1px, transparent 1px 5px), ' +
  'repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0 1px, transparent 1px 5px)';

const ClasicaFrame: FC<{ className?: string; thumbnail?: boolean }> = ({ className, thumbnail }) => {
  if (thumbnail) {
    return <div className={`border-[4px] border-current border-b-0 group-hover:border-[#ffd700] transition-colors ${className || ''}`} />;
  }
  return (
    <div className={`relative ${className || ''}`}>
      {/* Red: se extiende por detrás del larguero (hacia fuera del campo), algo más estrecha al fondo */}
      <div
        className="absolute bottom-full left-0 h-[70%] w-full"
        style={{
          backgroundImage: NET_MESH,
          backgroundColor: 'rgba(255,255,255,0.12)',
          clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)',
        }}
      />
      <div className="absolute inset-0 border-[4px] border-white shadow-2xl border-b-0 group-hover:border-[#ffd700] transition-colors" />
    </div>
  );
};

/** Marco con esquinas biseladas en V invertida en vez de ángulo recto. */
const BiseladaFrame: FC<{ className?: string; thumbnail?: boolean }> = ({ className, thumbnail }) => (
  <svg viewBox="0 0 100 60" preserveAspectRatio="none" className={className}>
    <polyline
      points="0,60 0,32 30,0 70,0 100,32 100,60"
      fill="none"
      stroke={thumbnail ? 'currentColor' : 'white'}
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
    <polygon points="15,55 15,10 85,10 85,55" fill="none" stroke="currentColor" strokeWidth="5" vectorEffect="non-scaling-stroke" />
    <polygon points="0,58 15,10 85,10 100,58" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    <line x1="0" y1="58" x2="15" y2="55" stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    <line x1="100" y1="58" x2="85" y2="55" stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" vectorEffect="non-scaling-stroke" />
  </svg>
);

const GoalStyleIcon: FC<GoalStyleIconProps> = ({ style, className, isFlipped, thumbnail }) => {
  if (style === 'red3d') {
    return thumbnail
      ? <Red3DThumbnail className={className} />
      : <GoalFrame3D className={className} isFlipped={isFlipped} compact />;
  }
  if (style === 'biselada') {
    return <BiseladaFrame className={className} thumbnail={thumbnail} />;
  }
  return <ClasicaFrame className={className} thumbnail={thumbnail} />;
};

export default GoalStyleIcon;
