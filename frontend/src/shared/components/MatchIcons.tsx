import React from 'react';

/**
 * Iconos de eventos de partido reutilizables (actas, tablas de estadísticas, etc.).
 * Solo SVG/CSS inline: sin dependencias ni HTML dinámico.
 */

export const BallIcon: React.FC<{ className?: string; title?: string }> = ({ className = 'w-3.5 h-3.5', title = 'Gol' }) => (
  <svg viewBox="0 0 24 24" className={`inline-block align-middle ${className}`} role="img" aria-label={title}>
    <title>{title}</title>
    <circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" />
    <polygon points="12,7.2 16.2,10.2 14.6,15.1 9.4,15.1 7.8,10.2" fill="#1f2937" />
    <path d="M12 7.2V2M16.2 10.2l5-1.6M14.6 15.1l3.2 4.2M9.4 15.1l-3.2 4.2M7.8 10.2l-5-1.6" stroke="#1f2937" strokeWidth="1.3" fill="none" />
  </svg>
);

export type CardKind = 'yellow' | 'red';

export const CardIcon: React.FC<{ kind: CardKind; className?: string; title?: string }> = ({ kind, className = 'w-2.5 h-3.5', title }) => {
  const label = title ?? (kind === 'yellow' ? 'Tarjeta amarilla' : 'Tarjeta roja');
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-block align-middle rounded-[2px] shadow-sm ${kind === 'yellow' ? 'bg-yellow-400' : 'bg-red-600'} ${className}`}
    />
  );
};

export const SubInIcon: React.FC<{ className?: string; title?: string }> = ({ className = 'w-3 h-3', title = 'Entra' }) => (
  <svg viewBox="0 0 24 24" className={`inline-block align-middle text-emerald-600 ${className}`} role="img" aria-label={title}>
    <title>{title}</title>
    <path d="M12 20V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SubOutIcon: React.FC<{ className?: string; title?: string }> = ({ className = 'w-3 h-3', title = 'Sale' }) => (
  <svg viewBox="0 0 24 24" className={`inline-block align-middle text-red-500 ${className}`} role="img" aria-label={title}>
    <title>{title}</title>
    <path d="M12 4v15M5.5 12.5L12 19l6.5-6.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Fila de iconos repetidos n veces (balón x2, etc.). */
export const GoalIcons: React.FC<{ count: number; className?: string }> = ({ count, className }) => (
  <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
    {Array.from({ length: Math.max(0, count) }).map((_, i) => <BallIcon key={i} className={className} />)}
  </span>
);

export const CardIcons: React.FC<{ yellow?: number; red?: number }> = ({ yellow = 0, red = 0 }) => (
  <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
    {Array.from({ length: Math.max(0, yellow) }).map((_, i) => <CardIcon key={`y${i}`} kind="yellow" />)}
    {Array.from({ length: Math.max(0, red) }).map((_, i) => <CardIcon key={`r${i}`} kind="red" />)}
  </span>
);

/** Icono + recuento (para tablas agregadas): ⚽ 3 / 🟨 2 / 🟥 1. Con 0 muestra un guion tenue. */
export const StatCount: React.FC<{ kind: 'goal' | CardKind; count: number }> = ({ kind, count }) => {
  if (!count) return <span className="text-slate-300">0</span>;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      {kind === 'goal' ? <BallIcon className="w-3 h-3" /> : <CardIcon kind={kind} className="w-2 h-3" />}
      {count}
    </span>
  );
};

/** ↑ minuto de entrada / ↓ minuto de salida. */
export const SubChange: React.FC<{ inMin?: number; outMin?: number }> = ({ inMin, outMin }) => (
  <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs tabular-nums">
    {inMin !== undefined && inMin > 0 && (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold"><SubInIcon />{inMin}'</span>
    )}
    {outMin !== undefined && (
      <span className="inline-flex items-center gap-0.5 text-red-500 font-bold"><SubOutIcon />{outMin}'</span>
    )}
  </span>
);
