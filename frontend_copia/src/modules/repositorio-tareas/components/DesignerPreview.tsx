import React, { useLayoutEffect, useRef, useState } from 'react';
import type { DesignerItem } from '@modules/entrenamientos/types';
import type { FieldStructure } from '../types';
import SlalomPoleIcon from '@shared/components/SlalomPoleIcon';
import SoccerBallIcon from '@shared/components/SoccerBallIcon';
import GoalFrame3D from '@modules/entrenamientos/components/GoalFrame3D';
import GoalStyleIcon from '@modules/entrenamientos/components/GoalStyleIcon';
import { PITCH_REFERENCE_WIDTH } from '@modules/entrenamientos/utils/pitchScale';
import { getArrowControlPoint } from '@modules/entrenamientos/utils/arrowCurve';

interface DesignerPreviewProps {
  items: DesignerItem[];
  /** Estructura de campo con la que se guardó la tarea (por defecto 'libre', sin líneas de campo) */
  fieldStructure?: FieldStructure;
  is3D?: boolean;
  className?: string;
}

const FIELD_BACKGROUND = {
  backgroundColor: '#2f7d4c',
  backgroundImage: 'repeating-linear-gradient(to right, rgba(255, 255, 255, 0.045) 0 10%, rgba(0, 0, 0, 0.05) 10% 20%)',
} as const;

const FIELD_LINE_COLOR = 'rgba(255,255,255,0.9)';

const FENCE_SCALE_DAMPING = 0.15;
const PITCH_3D_ROTATION_DEG = 40;
const PLAYER_3D_BILLBOARD_TRANSFORM = `rotateX(-${PITCH_3D_ROTATION_DEG}deg)`;

const DesignerPreview: React.FC<DesignerPreviewProps> = ({ items, fieldStructure = 'libre', is3D = false, className = '' }) => {
  const sortedItems = [...(items || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const isHalfField = fieldStructure === 'ataque' || fieldStructure === 'defensa';
  const rootRef = useRef<HTMLDivElement>(null);
  const [pitchScale, setPitchScale] = useState(1);
  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const update = () => {
      if (node.offsetWidth > 0) setPitchScale(node.offsetWidth / PITCH_REFERENCE_WIDTH);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`relative w-full bg-green-800 rounded-2xl overflow-hidden ${className}`}
      style={{
        ...FIELD_BACKGROUND,
        aspectRatio: isHalfField ? '68 / 52.5' : '105 / 68',
        containerType: 'inline-size',
      }}
    >
      {/* Líneas del campo (réplica exacta del trazado real del diseñador; 'libre' no dibuja líneas) */}
      {fieldStructure !== 'libre' && (
        <svg
          className="absolute pointer-events-none"
          style={{
            top: fieldStructure === 'ataque' ? '10%' : '4%',
            left: '4%',
            width: '92%',
            height: fieldStructure === 'campo-total' ? '92%' : fieldStructure === 'ataque' ? '76%' : '86%',
            overflow: 'visible',
          }}
          viewBox={
            fieldStructure === 'ataque' ? '0 0 68 52.5'
            : fieldStructure === 'defensa' ? '0 52.5 68 52.5'
            : '0 0 105 68'
          }
          preserveAspectRatio="none"
        >
          <g fill="none" stroke={FIELD_LINE_COLOR} strokeWidth="0.25">
            {fieldStructure === 'campo-total' ? (
              <>
                {/* Borde exterior */}
                <rect x="0" y="0" width="105" height="68" />
                {/* Línea central */}
                <line x1="52.5" y1="0" x2="52.5" y2="68" />
                {/* Círculo y punto central */}
                <circle cx="52.5" cy="34" r="9.15" />
                <circle cx="52.5" cy="34" r="0.3" fill={FIELD_LINE_COLOR} stroke="none" />
                {/* Área grande y pequeña, izquierda */}
                <rect x="0" y="13.84" width="16.5" height="40.32" />
                <rect x="0" y="24.84" width="5.5" height="18.32" />
                <circle cx="11" cy="34" r="0.3" fill={FIELD_LINE_COLOR} stroke="none" />
                <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" />
                <g><g strokeWidth="0.06" opacity="0.55"><line x1="-2" y1="31.25" x2="0" y2="31.25" /><line x1="-2" y1="32.17" x2="0" y2="32.17" /><line x1="-2" y1="33.09" x2="0" y2="33.09" /><line x1="-2" y1="34.00" x2="0" y2="34.00" /><line x1="-2" y1="34.91" x2="0" y2="34.91" /><line x1="-2" y1="35.83" x2="0" y2="35.83" /><line x1="-2" y1="36.74" x2="0" y2="36.74" /><line x1="-1.33" y1="30.34" x2="-1.33" y2="37.66" /><line x1="-0.67" y1="30.34" x2="-0.67" y2="37.66" /></g><path d="M 0 30.34 L -2 30.34 L -2 37.66 L 0 37.66" strokeWidth="0.25" /></g>
                {/* Área grande y pequeña, derecha */}
                <rect x="88.5" y="13.84" width="16.5" height="40.32" />
                <rect x="99.5" y="24.84" width="5.5" height="18.32" />
                <circle cx="94" cy="34" r="0.3" fill={FIELD_LINE_COLOR} stroke="none" />
                <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" />
                <g><g strokeWidth="0.06" opacity="0.55"><line x1="105" y1="31.25" x2="107" y2="31.25" /><line x1="105" y1="32.17" x2="107" y2="32.17" /><line x1="105" y1="33.09" x2="107" y2="33.09" /><line x1="105" y1="34.00" x2="107" y2="34.00" /><line x1="105" y1="34.91" x2="107" y2="34.91" /><line x1="105" y1="35.83" x2="107" y2="35.83" /><line x1="105" y1="36.74" x2="107" y2="36.74" /><line x1="105.67" y1="30.34" x2="105.67" y2="37.66" /><line x1="106.33" y1="30.34" x2="106.33" y2="37.66" /></g><path d="M 105 30.34 L 107 30.34 L 107 37.66 L 105 37.66" strokeWidth="0.25" /></g>
                {/* Arcos de córner */}
                <path d="M 0 1 A 1 1 0 0 1 1 0" />
                <path d="M 104 0 A 1 1 0 0 1 105 1" />
                <path d="M 1 68 A 1 1 0 0 1 0 67" />
                <path d="M 105 67 A 1 1 0 0 1 104 68" />
              </>
            ) : (
              <>
                <rect x="0" y="0" width="68" height="105" />
                <line x1="0" y1="52.5" x2="68" y2="52.5" />
                <circle cx="34" cy="52.5" r="1.1" fill={FIELD_LINE_COLOR} stroke="none" />
                <rect x="13.84" y="0" width="40.32" height="16.5" />
                <rect x="24.84" y="0" width="18.32" height="5.5" />
                <circle cx="34" cy="11" r="0.3" fill={FIELD_LINE_COLOR} stroke="none" />
                <path d="M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5" />
                <g><g strokeWidth="0.06" opacity="0.55"><line x1="31.25" y1="-2" x2="31.25" y2="0" /><line x1="32.17" y1="-2" x2="32.17" y2="0" /><line x1="33.09" y1="-2" x2="33.09" y2="0" /><line x1="34.00" y1="-2" x2="34.00" y2="0" /><line x1="34.91" y1="-2" x2="34.91" y2="0" /><line x1="35.83" y1="-2" x2="35.83" y2="0" /><line x1="36.74" y1="-2" x2="36.74" y2="0" /><line x1="30.34" y1="-1.33" x2="37.66" y2="-1.33" /><line x1="30.34" y1="-0.67" x2="37.66" y2="-0.67" /></g><path d="M 30.34 0 L 30.34 -2 L 37.66 -2 L 37.66 0" strokeWidth="0.25" /></g>
                <rect x="13.84" y="88.5" width="40.32" height="16.5" />
                <rect x="24.84" y="99.5" width="18.32" height="5.5" />
                <circle cx="34" cy="94" r="0.3" fill={FIELD_LINE_COLOR} stroke="none" />
                <path d="M 26.69 88.5 A 9.15 9.15 0 0 1 41.31 88.5" />
                <g><g strokeWidth="0.06" opacity="0.55"><line x1="31.25" y1="105" x2="31.25" y2="107" /><line x1="32.17" y1="105" x2="32.17" y2="107" /><line x1="33.09" y1="105" x2="33.09" y2="107" /><line x1="34.00" y1="105" x2="34.00" y2="107" /><line x1="34.91" y1="105" x2="34.91" y2="107" /><line x1="35.83" y1="105" x2="35.83" y2="107" /><line x1="36.74" y1="105" x2="36.74" y2="107" /><line x1="30.34" y1="105.67" x2="37.66" y2="105.67" /><line x1="30.34" y1="106.33" x2="37.66" y2="106.33" /></g><path d="M 30.34 105 L 30.34 107 L 37.66 107 L 37.66 105" strokeWidth="0.25" /></g>
                <path d="M 0 1 A 1 1 0 0 1 1 0" />
                <path d="M 67 0 A 1 1 0 0 1 68 1" />
                <path d="M 1 105 A 1 1 0 0 1 0 104" />
                <path d="M 68 104 A 1 1 0 0 1 67 105" />
              </>
            )}
          </g>
        </svg>
      )}

      {/* Flechas (rectas/curvas, sólidas/discontinuas) */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <marker id="designer-preview-arrowhead" markerWidth="3" markerHeight="3" refX="1.4" refY="1.5" orient="auto">
            <path d="M0,0 L0,3 L3,1.5 Z" fill="context-stroke" />
          </marker>
        </defs>
        {sortedItems.map((item) => {
          if (!item.type?.startsWith('arrow-') || !item.arrowStart || !item.arrowEnd) return null;
          const isCurved = item.type.includes('curve');
          const strokeW = item.strokeWidth ?? 0.3;
          const control = getArrowControlPoint(item.arrowStart, item.arrowEnd, item.type.includes('-inv-'));
          return isCurved ? (
            <path
              key={item.id}
              d={`M ${item.arrowStart.x} ${item.arrowStart.y} Q ${control.x} ${control.y} ${item.arrowEnd.x} ${item.arrowEnd.y}`}
              stroke={item.color || '#ffffff'}
              strokeWidth={strokeW}
              fill="none"
              strokeDasharray={item.type.includes('dashed') ? '1.5,1.5' : '0'}
              markerEnd="url(#designer-preview-arrowhead)"
              strokeLinecap="round"
            />
          ) : (
            <line
              key={item.id}
              x1={item.arrowStart.x}
              y1={item.arrowStart.y}
              x2={item.arrowEnd.x}
              y2={item.arrowEnd.y}
              stroke={item.color || '#ffffff'}
              strokeWidth={strokeW}
              strokeDasharray={item.type.includes('dashed') ? '1.5,1.5' : '0'}
              markerEnd="url(#designer-preview-arrowhead)"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* Elementos del ejercicio (mismas medidas de referencia que el diseñador, escaladas al ancho del campo) */}
      {sortedItems.map((item) => {
        const x = item.x + '%';
        const y = item.y + '%';
        const isPlayer = item.type.startsWith('player-');
        const scale = (item.type === 'fence' ? 1 + ((item.scale ?? 1) - 1) * FENCE_SCALE_DAMPING : (item.scale ?? 1)) * pitchScale;
        const rotation = item.rotation || 0;
        const centered = 'translate(-50%, -50%)';

        if (item.type?.startsWith('arrow-')) {
          return null;
        }

        if (item.type === 'zone') {
          return (
            <div
              key={item.id}
              className="absolute border-dashed border-white/60 bg-white/20"
              style={{
                left: x,
                top: y,
                width: `${item.width || 15}%`,
                height: `${item.height || 15}%`,
                borderWidth: `${3 * pitchScale}px`,
                transform: `rotate(${rotation}deg) scale(${item.scale ?? 1})`,
              }}
            />
          );
        }

        if (item.type === 'goal') {
          // Mismos tamaños por defecto y escala que el diseñador (ExerciseDesigner)
          const width = `${item.width ?? 11}%`;
          const height = `${item.height ?? 5.5}%`;
          const goalScale = item.scale ?? 1;

          if (is3D) {
            return (
              <div
                key={item.id}
                className="absolute overflow-visible"
                style={{
                  left: x,
                  top: y,
                  width,
                  height,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${goalScale}) translateZ(8px)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <GoalFrame3D compact />
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                width,
                height,
                transform: `${centered} rotate(${rotation}deg) scale(${goalScale})`,
              }}
            >
              <GoalStyleIcon
                style={item.goalStyle ?? 'clasica'}
                isFlipped={item.rotation === 180}
                className="absolute h-full w-full pointer-events-none"
              />
            </div>
          );
        }

        if (isPlayer || item.type === 'coach') {
          const hasPhoto = isPlayer && item.playerId !== undefined && !!item.playerPhoto && item.playerPhoto.length > 1;
          const playerScale = is3D ? pitchScale : scale;
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                width: '40px',
                height: '40px',
                transform: `${centered} rotate(${rotation}deg) scale(${playerScale})`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-full border-solid overflow-hidden font-black text-white"
                style={{
                  backgroundColor: item.color || (item.type === 'coach' ? '#9ca3af' : '#ffffff'),
                  borderColor: item.color || '#ffffff',
                  borderWidth: hasPhoto ? '6px' : '0px',
                  transform: is3D ? PLAYER_3D_BILLBOARD_TRANSFORM : undefined,
                  transformStyle: 'preserve-3d',
                }}
              >
                {item.type === 'coach' ? (
                  <span className="text-[13px] leading-none">E</span>
                ) : hasPhoto ? (
                  <img src={item.playerPhoto} className="w-full h-full object-cover" draggable={false} />
                ) : (
                  <span className="text-[13px] leading-none">
                    {item.playerId !== undefined ? (item.playerDorsal ?? '') : Number(item.type.replace('player-', '')) || ''}
                  </span>
                )}
              </div>
            </div>
          );
        }

        if (item.type === 'cone') {
          return (
            <div
              key={item.id}
              className="absolute flex flex-col items-center"
              style={{ left: x, top: y, transform: `${centered} rotate(${rotation}deg) scale(${scale})` }}
            >
              <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[24px]" style={{ borderBottomColor: item.color }}></div>
              <div className="w-7 h-1 bg-white/40 rounded-full mt-0.5"></div>
            </div>
          );
        }

        if (item.type === 'text') {
          return (
            <div
              key={item.id}
              className="absolute font-black whitespace-nowrap pointer-events-none"
              style={{
                left: x,
                top: y,
                color: item.color || '#ffffff',
                fontSize: `${item.fontSize || 22}px`,
                transform: `${centered} rotate(${rotation}deg) scale(${scale})`,
                textShadow: '0 2px 2px rgba(0,0,0,0.45)',
              }}
            >
              {item.text}
            </div>
          );
        }

        if (item.type === 'ball') {
          return (
            <div
              key={item.id}
              className="absolute"
              style={{ left: x, top: y, transform: `${centered} rotate(${rotation}deg) scale(${scale})` }}
            >
              <SoccerBallIcon size={21} />
            </div>
          );
        }

        if (item.type === 'slalom') {
          return (
            <div
              key={item.id}
              className="absolute"
              style={{ left: x, top: y, transform: `${centered} rotate(${rotation}deg) scale(${scale})` }}
            >
              <SlalomPoleIcon size={42} />
            </div>
          );
        }

        if (item.type === 'ladder') {
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                width: item.width ? `${item.width}%` : 'auto',
                height: item.height ? `${item.height}%` : 'auto',
                transform: `${centered} rotate(${rotation}deg) scale(${scale})`,
              }}
            >
              <svg viewBox="0 0 110 60" className="h-full w-full" preserveAspectRatio="none">
                <rect x="2" y="2" width="106" height="56" rx="4" fill="none" stroke="#fff" strokeWidth="4" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <line key={i} x1={22 + i * 22} y1="2" x2={22 + i * 22} y2="58" stroke="#fff" strokeWidth="4" />
                ))}
              </svg>
            </div>
          );
        }

        if (item.type === 'fence') {
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                width: `${item.width ?? 6}%`,
                height: `${item.height ?? 3.75}%`,
                transform: `${centered} rotate(${rotation}deg) scale(${scale})`,
              }}
            >
              <svg viewBox="0 0 120 80" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
                <rect x="8" y="15" width="104" height="50" rx="4" fill="none" stroke="#fff" strokeWidth="4" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <line key={i} x1={28 + i * 20} y1="15" x2={28 + i * 20} y2="65" stroke="#fff" strokeWidth="3" />
                ))}
              </svg>
            </div>
          );
        }

        // Material genérico
        return (
          <div
            key={item.id}
            className="absolute rounded-full"
            style={{
              left: x,
              top: y,
              width: '3px',
              height: '3px',
              backgroundColor: item.color || '#e2e8f0',
              transform: centered,
            }}
          />
        );
      })}
    </div>
  );
};

export default DesignerPreview;
