import React from 'react';

const FIELD_BACKGROUND = {
  backgroundColor: '#2d7a34',
  backgroundImage: [
    'radial-gradient(circle at 50% 48%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 42%, rgba(0, 0, 0, 0.10) 100%)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 0 56px, rgba(0, 0, 0, 0.08) 56px 112px)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0 2px, transparent 2px 128px)',
  ].join(', '),
  backgroundBlendMode: 'soft-light, multiply, normal',
} as const;

interface SoccerFieldProps {
  className?: string;
  children?: React.ReactNode;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const SoccerField = React.forwardRef<HTMLDivElement, SoccerFieldProps>(
  ({ className = '', children, onPointerDown, onClick }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative h-full min-h-[420px] md:min-h-[620px] overflow-hidden rounded-[14px] border border-slate-200 shadow-sm dark:border-white/10 ${className}`}
        style={FIELD_BACKGROUND}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        {/* Field lines SVG */}
        <svg
          className="absolute inset-0 h-full w-full opacity-95 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g fill="none" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="0.16">
            {/* Outer rectangle */}
            <rect x="2.6" y="2.6" width="94.8" height="94.8" rx="1.6" />
            {/* Center line */}
            <line x1="2.6" y1="50" x2="97.4" y2="50" />
            {/* Center circle */}
            <circle cx="50" cy="50" r="11.5" />
            {/* Center spot */}
            <circle cx="50" cy="50" r="0.38" fill="#ffffff" stroke="none" />
            {/* Top spot */}
            <circle cx="50" cy="12" r="0.38" fill="#ffffff" stroke="none" />
            {/* Bottom spot */}
            <circle cx="50" cy="88" r="0.38" fill="#ffffff" stroke="none" />
            {/* Top goal area */}
            <rect x="37" y="2.6" width="26" height="11.5" />
            {/* Top penalty area */}
            <rect x="27" y="2.6" width="46" height="20.5" />
            {/* Bottom goal area */}
            <rect x="37" y="85.9" width="26" height="11.5" />
            {/* Bottom penalty area */}
            <rect x="27" y="76.9" width="46" height="20.5" />
          </g>
        </svg>

        {/* Content layer */}
        {children}
      </div>
    );
  }
);

SoccerField.displayName = 'SoccerField';

export default SoccerField;
