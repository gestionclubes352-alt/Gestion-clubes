import React from 'react';
import type { DesignerItem } from '@modules/entrenamientos/types';
import type { FieldStructure } from '../types';
import SlalomPoleIcon from '@shared/components/SlalomPoleIcon';
import SoccerBallIcon from '@shared/components/SoccerBallIcon';

interface DesignerPreviewProps {
  items: DesignerItem[];
  /** Estructura de campo con la que se guardó la tarea (por defecto 'libre', sin líneas de campo) */
  fieldStructure?: FieldStructure;
  is3D?: boolean;
  className?: string;
}

const FIELD_BACKGROUND = {
  backgroundColor: '#315b31',
  backgroundImage: [
    'radial-gradient(circle at 50% 48%, rgba(117, 166, 99, 0.20) 0%, rgba(80, 121, 73, 0.12) 42%, rgba(18, 30, 18, 0.34) 100%)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.020) 0 56px, rgba(0, 0, 0, 0.045) 56px 112px)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.010) 0 2px, transparent 2px 128px)',
  ].join(', '),
  backgroundBlendMode: 'soft-light, multiply, normal',
} as const;

const PITCH_3D_ROTATION_DEG = 40;
const PLAYER_3D_BILLBOARD_TRANSFORM = `rotateX(-${PITCH_3D_ROTATION_DEG}deg)`;

const DesignerPreview: React.FC<DesignerPreviewProps> = ({ items, fieldStructure = 'libre', is3D = false, className = '' }) => {
  const sortedItems = [...(items || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const isHalfField = fieldStructure === 'ataque' || fieldStructure === 'defensa';

  return (
    <div
      className={`relative w-full bg-green-800 rounded-lg overflow-hidden border-4 border-white/10 ${className}`}
      style={{
        ...FIELD_BACKGROUND,
        aspectRatio: isHalfField ? '68 / 52.5' : '105 / 68',
      }}
    >
      {/* Líneas del campo (réplica exacta del trazado real del diseñador; 'libre' no dibuja líneas) */}
      {fieldStructure !== 'libre' && (
        <svg
          className="absolute pointer-events-none"
          style={{ top: '4%', left: '4%', width: '92%', height: '92%', overflow: 'visible' }}
          viewBox={
            fieldStructure === 'ataque' ? '0 0 68 52.5'
            : fieldStructure === 'defensa' ? '0 52.5 68 52.5'
            : '0 0 105 68'
          }
          preserveAspectRatio="none"
        >
          <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.45">
            {fieldStructure === 'campo-total' ? (
              <>
                {/* Borde exterior */}
                <rect x="0" y="0" width="105" height="68" />
                {/* Línea central */}
                <line x1="52.5" y1="0" x2="52.5" y2="68" />
                {/* Círculo y punto central */}
                <circle cx="52.5" cy="34" r="9.15" />
                <circle cx="52.5" cy="34" r="0.3" fill="rgba(255,255,255,0.55)" stroke="none" />
                {/* Área grande y pequeña, izquierda */}
                <rect x="0" y="13.84" width="16.5" height="40.32" />
                <rect x="0" y="24.84" width="5.5" height="18.32" />
                <circle cx="11" cy="34" r="0.3" fill="rgba(255,255,255,0.55)" stroke="none" />
                <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" />
                <rect x="-2" y="30.34" width="2" height="7.32" strokeWidth="0.6" />
                {/* Área grande y pequeña, derecha */}
                <rect x="88.5" y="13.84" width="16.5" height="40.32" />
                <rect x="99.5" y="24.84" width="5.5" height="18.32" />
                <circle cx="94" cy="34" r="0.3" fill="rgba(255,255,255,0.55)" stroke="none" />
                <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" />
                <rect x="105" y="30.34" width="2" height="7.32" strokeWidth="0.6" />
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
                <circle cx="34" cy="52.5" r="1.1" fill="rgba(255,255,255,0.55)" stroke="none" />
                <rect x="13.84" y="0" width="40.32" height="16.5" />
                <rect x="24.84" y="0" width="18.32" height="5.5" />
                <circle cx="34" cy="11" r="0.3" fill="rgba(255,255,255,0.55)" stroke="none" />
                <path d="M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5" />
                <rect x="30.34" y="-2" width="7.32" height="2" strokeWidth="0.6" />
                <rect x="13.84" y="88.5" width="40.32" height="16.5" />
                <rect x="24.84" y="99.5" width="18.32" height="5.5" />
                <circle cx="34" cy="94" r="0.3" fill="rgba(255,255,255,0.55)" stroke="none" />
                <path d="M 26.69 88.5 A 9.15 9.15 0 0 1 41.31 88.5" />
                <rect x="30.34" y="105" width="7.32" height="2" strokeWidth="0.6" />
                <path d="M 0 1 A 1 1 0 0 1 1 0" />
                <path d="M 67 0 A 1 1 0 0 1 68 1" />
                <path d="M 1 105 A 1 1 0 0 1 0 104" />
                <path d="M 68 104 A 1 1 0 0 1 67 105" />
              </>
            )}
          </g>
        </svg>
      )}

      {/* Elementos del ejercicio */}
      {sortedItems.map((item) => {
        const x = (item.x / 100) * 100 + '%';
        const y = (item.y / 100) * 100 + '%';
        const isPlayer = item.type.startsWith('player-');
        const isCone = item.type === 'cone';

        if (item.type === 'zone') {
          const width = `${item.width || 15}%`;
          const height = `${item.height || 15}%`;
          return (
            <div
              key={item.id}
              className="absolute border-2 border-dashed border-white/50"
              style={{
                left: x,
                top: y,
                width,
                height,
              }}
            />
          );
        }

        if (item.type === 'goal') {
          const width = `${item.width || 16}%`;
          const height = `${item.height || 8}%`;
          return (
            <div
              key={item.id}
              className="absolute border-2 border-white"
              style={{
                left: x,
                top: y,
                width,
                height,
                transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
              }}
            />
          );
        }

        if (isPlayer) {
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                width: '5%',
                transform: `translate(-50%, -50%) scale(${item.scale || 1})`,
                transformStyle: 'preserve-3d',
                aspectRatio: '1 / 1',
              }}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-full border-[1.5px] border-white"
                style={{
                  backgroundColor: item.color || '#ffffff',
                  transform: is3D ? PLAYER_3D_BILLBOARD_TRANSFORM : undefined,
                  transformStyle: 'preserve-3d',
                }}
              >
                <span className="text-[6px] font-black text-white leading-none">
                  {item.type.replace('player-', '')}
                </span>
              </div>
            </div>
          );
        }

        if (isCone) {
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${item.scale || 1})`,
                width: '4%',
                height: 'auto',
              }}
            >
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px]" style={{ borderBottomColor: item.color }}></div>
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
                fontSize: `${Math.max(8, (item.fontSize || 16) * 0.75)}px`,
                transform: 'translate(-50%, -50%)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
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
              style={{
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <SoccerBallIcon size={12} />
            </div>
          );
        }

        if (item.type === 'slalom') {
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${item.scale || 1})`,
              }}
            >
              <SlalomPoleIcon size={12} />
            </div>
          );
        }

        if (item.type === 'ladder' || item.type === 'fence') {
          return (
            <div
              key={item.id}
              className="absolute rounded-sm"
              style={{
                left: x,
                top: y,
                width: '8px',
                height: '8px',
                backgroundColor: item.color || '#e2e8f0',
                transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
              }}
            />
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
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
    </div>
  );
};

export default DesignerPreview;
