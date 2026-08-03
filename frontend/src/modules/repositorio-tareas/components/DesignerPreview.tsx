import React from 'react';
import type { DesignerItem } from '@modules/entrenamientos/types';
import SlalomPoleIcon from '@shared/components/SlalomPoleIcon';
import SoccerBallIcon from '@shared/components/SoccerBallIcon';

interface DesignerPreviewProps {
  items: DesignerItem[];
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

const DesignerPreview: React.FC<DesignerPreviewProps> = ({ items, className = '' }) => {
  const sortedItems = [...(items || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  return (
    <div
      className={`relative w-full bg-green-800 rounded-lg overflow-hidden border-4 border-white/10 ${className}`}
      style={{
        ...FIELD_BACKGROUND,
        aspectRatio: '105 / 68',
      }}
    >
      {/* Líneas del campo */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Borde exterior */}
        <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />

        {/* Línea central vertical */}
        <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,255,255,0.4)" strokeWidth="0.2" />

        {/* Círculo central */}
        <circle cx="50" cy="50" r="9" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.2" />

        {/* Punto central */}
        <circle cx="50" cy="50" r="0.5" fill="rgba(255,255,255,0.6)" />

        {/* Áreas de portería */}
        <rect x="5" y="30" width="10" height="40" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.2" />
        <rect x="85" y="30" width="10" height="40" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.2" />
      </svg>

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
                transform: 'translate(-50%, -50%)',
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
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        }

        if (isPlayer || isCone) {
          const radius = isPlayer ? '6px' : '4px';
          return (
            <div
              key={item.id}
              className="absolute rounded-full border border-white/90 flex items-center justify-center"
              style={{
                left: x,
                top: y,
                width: radius,
                height: radius,
                backgroundColor: item.color || '#ffffff',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {isPlayer && (
                <span className="text-[8px] font-black text-black leading-none">
                  {item.type.replace('player-', '')}
                </span>
              )}
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
                transform: 'translate(-50%, -50%)',
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
                transform: 'translate(-50%, -50%)',
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
