import type { FC } from 'react';
import type { GoalStyle } from '../types';
import GoalFrame3D from './GoalFrame3D';

interface GoalStyleIconProps {
  style: GoalStyle;
  className?: string;
  isFlipped?: boolean;
}

/** Marco clásico: mismo trazo que usaba el diseñador antes de existir variantes (3 lados, sin base). */
const ClasicaFrame: FC<{ className?: string }> = ({ className }) => (
  <div className={`border-[4px] border-white border-b-0 shadow-2xl group-hover:border-[#ffd700] transition-colors ${className || ''}`} />
);

/** Marco con esquinas biseladas en V invertida en vez de ángulo recto. */
const BiseladaFrame: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 60" preserveAspectRatio="none" className={className}>
    <polyline
      points="0,60 0,10 15,0 85,0 100,10 100,60"
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

const GoalStyleIcon: FC<GoalStyleIconProps> = ({ style, className, isFlipped }) => {
  if (style === 'red3d') {
    return <GoalFrame3D className={className} isFlipped={isFlipped} compact />;
  }
  if (style === 'biselada') {
    return <BiseladaFrame className={className} />;
  }
  return <ClasicaFrame className={className} />;
};

export default GoalStyleIcon;
