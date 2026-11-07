import React from 'react';

export interface SerieTendencia {
  key: string;
  label: string;
  color: string;
  valores: Array<number | null>;
}

const ALTO = 220;
const ANCHO = 1400;
const PAD = 28;

/** Gráfico de líneas 0-10 sin dependencias externas: eje Y fijo, varias series con huecos (spanGaps). */
const TendenciaChart: React.FC<{ dias: string[]; series: SerieTendencia[] }> = ({ dias, series }) => {
  const n = dias.length;
  const x = (i: number) => (n <= 1 ? PAD : PAD + (i * (ANCHO - 2 * PAD)) / (n - 1));
  const y = (v: number) => ALTO - PAD - ((v / 10) * (ALTO - 2 * PAD));

  const puntosSerie = (valores: Array<number | null>) => {
    const puntos: Array<{ x: number; y: number }> = [];
    valores.forEach((v, i) => {
      if (v !== null && v !== undefined) puntos.push({ x: x(i), y: y(v) });
    });
    return puntos;
  };

  const formatearFecha = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO + 24}`} className="w-full min-w-[900px]" style={{ maxHeight: 380 }}>
        {[0, 2.5, 5, 7.5, 10].map((v) => (
          <g key={v}>
            <line x1={PAD} x2={ANCHO - PAD} y1={y(v)} y2={y(v)} stroke="#e2e5eb" strokeWidth={1} />
            <text x={2} y={y(v) + 3} fontSize={9} fill="#9ca3af">{v}</text>
          </g>
        ))}

        {series.map((s) => {
          const puntos = puntosSerie(s.valores);
          if (puntos.length === 0) return null;
          const path = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={2} />
              {puntos.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color} />
              ))}
            </g>
          );
        })}

        {dias.map((d, i) => (
          i % Math.max(1, Math.ceil(n / 8)) === 0 && (
            <text key={d} x={x(i)} y={ALTO + 16} fontSize={9} fill="#9ca3af" textAnchor="middle">
              {formatearFecha(d)}
            </text>
          )
        ))}
      </svg>

      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TendenciaChart;
