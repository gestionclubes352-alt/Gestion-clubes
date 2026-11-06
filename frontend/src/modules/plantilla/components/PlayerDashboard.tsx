import React from 'react';
import type { Player } from '../types';
import { calculatePlayerAge } from '../utils/tileConfig';

interface PlayerDashboardProps {
  player: Player;
  /** Foto actual (incluye la previsualización aún sin guardar) */
  photoUrl?: string | null;
  matchStats: { partidosJugados: number; minutos: number; titular: number; goles: number };
  attendance: { total: number; attended: number };
}

const isImageUrl = (value?: string | null): value is string =>
  typeof value === 'string' && /^(https?:\/\/|data:image\/|\/)/i.test(value);

const ESTADO_STYLE: Record<string, string> = {
  APTO: 'bg-emerald-100 text-emerald-700',
  LESIONADO: 'bg-red-100 text-red-700',
  OTRO: 'bg-amber-100 text-amber-700',
};

/** Contenedor estándar de un widget del dashboard. */
export const DashboardWidget: React.FC<{ title: string; icon?: string; className?: string; children: React.ReactNode }> = ({
  title,
  icon,
  className = '',
  children,
}) => (
  <section className={`bg-slate-50 border border-slate-200 rounded-2xl p-4 ${className}`}>
    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
      {icon && <i className={`fa-solid ${icon} mr-2`}></i>}
      {title}
    </h4>
    {children}
  </section>
);

const Kpi: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
    <div className="text-2xl sm:text-3xl font-black text-[var(--accent)] tabular-nums leading-none">{value}</div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</div>
    {hint && <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>}
  </div>
);

const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ player, photoUrl, matchStats, attendance }) => {
  const age = calculatePlayerAge(player.fechaNacimiento);
  const attendancePct = attendance.total > 0 ? Math.round((attendance.attended / attendance.total) * 100) : null;
  const estado = player.estado || 'APTO';
  const subtitle = [player.posicion, player.otraDemarcacion, player.equipo].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera del jugador */}
      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="w-20 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center">
          {isImageUrl(photoUrl) ? (
            <img src={photoUrl} alt={player.nombre} className="w-full h-full object-cover object-[50%_20%]" />
          ) : (
            <i className="fa-solid fa-user text-slate-400 text-2xl"></i>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase truncate">{player.nombre || '—'}</h3>
            {player.dorsal !== undefined && player.dorsal !== null && (
              <span className="bg-slate-900 text-white text-xs font-black rounded-md px-2 py-0.5 tabular-nums">#{player.dorsal}</span>
            )}
            <span className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 ${ESTADO_STYLE[estado] || ESTADO_STYLE.OTRO}`}>
              {estado}
            </span>
          </div>
          {player.apodo && <p className="text-sm font-black text-[var(--accent)] uppercase">{player.apodo}</p>}
          {subtitle && <p className="text-xs text-slate-500 font-semibold mt-1">{subtitle}</p>}
          <p className="text-[11px] text-slate-400 mt-1">
            {[age !== undefined ? `${age} años` : null, player.club].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Indicadores principales */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Kpi label="Partidos" value={matchStats.partidosJugados} />
        <Kpi label="Minutos" value={matchStats.minutos} />
        <Kpi label="Titular" value={matchStats.titular} />
        <Kpi label="Goles" value={matchStats.goles} />
        <Kpi
          label="Asistencia"
          value={attendancePct === null ? '–' : `${attendancePct}%`}
          hint={attendance.total > 0 ? `${attendance.attended}/${attendance.total} sesiones` : undefined}
        />
      </div>

      {/* Zona de widgets: aquí se irán añadiendo datos y gráficas */}
      <DashboardWidget title="Más widgets" icon="fa-chart-simple">
        <p className="text-xs text-slate-400">Pendiente de definir: indica qué datos y gráficas quieres ver en este dashboard.</p>
      </DashboardWidget>
    </div>
  );
};

export default PlayerDashboard;
