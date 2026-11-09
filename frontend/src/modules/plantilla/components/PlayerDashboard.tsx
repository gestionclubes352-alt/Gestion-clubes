import React, { useMemo } from 'react';
import type { Player } from '../types';
import { calculatePlayerAge } from '../utils/tileConfig';
import { BallIcon, CardIcon, GoalIcons } from '@shared/components/MatchIcons';

/** Participación del jugador en un partido (fila de actas federativas). */
export interface PlayerMatchLogRow {
  fed_match_id: number;
  fecha: string;
  jornada: string | null;
  rival: string | null;
  es_local: boolean | null;
  titular: boolean;
  minutos: number;
  goles: number;
  amarillas: number;
  rojas: number;
}

interface PlayerDashboardProps {
  player: Player;
  /** Foto actual (incluye la previsualización aún sin guardar) */
  photoUrl?: string | null;
  matchStats: { partidosJugados: number; minutos: number; titular: number; goles: number };
  /** Partidos del jugador, más recientes primero */
  matchLog?: PlayerMatchLogRow[];
  /** Total de partidos con acta del equipo */
  teamMatches?: number;
  attendance: { total: number; attended: number };
}

const isImageUrl = (value?: string | null): value is string =>
  typeof value === 'string' && /^(https?:\/\/|data:image\/|\/)/i.test(value);

/** Formatea una fecha (YYYY-MM-DD o ISO) como DD/MM/YYYY. */
const formatBirthDate = (value?: string | null): string | null => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
};

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
  <div className="bg-white border border-slate-200 rounded-2xl px-3 py-4 text-center">
    <div className="text-xl sm:text-2xl font-black text-[var(--accent)] tabular-nums leading-none">{value}</div>
    <div className="text-xs font-black text-slate-500 uppercase tracking-widest mt-2">{label}</div>
    {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
  </div>
);

const MiniStat: React.FC<{ label: string; value: React.ReactNode; tone?: 'amber' | 'red' }> = ({ label, value, tone }) => (
  <div className="bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-center">
    <div className={`text-lg font-black tabular-nums leading-none ${tone === 'amber' ? 'text-amber-500' : tone === 'red' ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{label}</div>
  </div>
);

const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ player, photoUrl, matchStats, matchLog = [], teamMatches, attendance }) => {
  const totals = useMemo(() => {
    const played = matchLog.filter(m => m.titular || m.minutos > 0);
    const minutos = played.reduce((s, m) => s + (m.minutos || 0), 0);
    const posibles = (teamMatches || 0) * 90;
    return {
      convocado: matchLog.length,
      suplente: played.filter(m => !m.titular).length,
      minPorPartido: played.length > 0 ? Math.round(minutos / played.length) : 0,
      pctMinutos: posibles > 0 ? Math.round((minutos / posibles) * 100) : null,
      amarillas: matchLog.reduce((s, m) => s + (m.amarillas || 0), 0),
      rojas: matchLog.reduce((s, m) => s + (m.rojas || 0), 0),
    };
  }, [matchLog, teamMatches]);
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
              <span className="bg-slate-900 text-white text-sm font-black rounded-md px-2.5 py-0.5 tabular-nums">#{player.dorsal}</span>
            )}
            <span className={`text-xs font-black uppercase tracking-widest rounded-full px-3 py-1 ${ESTADO_STYLE[estado] || ESTADO_STYLE.OTRO}`}>
              {estado}
            </span>
          </div>
          {player.apodo && <p className="text-base font-black text-[var(--accent)] uppercase mt-0.5">{player.apodo}</p>}
          {subtitle && <p className="text-base text-slate-600 font-semibold mt-1.5">{subtitle}</p>}
          <p className="text-sm text-slate-500 font-medium mt-1">
            {[
              formatBirthDate(player.fechaNacimiento),
              age !== undefined ? `${age} años` : null,
              player.club,
            ]
              .filter(Boolean)
              .join(' · ')}
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

      {/* Participación acumulada en partidos */}
      <DashboardWidget title="Participación en partidos" icon="fa-futbol">
        {matchLog.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">Sin partidos registrados</p>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              <MiniStat label="Convocado" value={`${totals.convocado}${teamMatches ? `/${teamMatches}` : ''}`} />
              <MiniStat label="Suplente" value={totals.suplente} />
              <MiniStat label="Min/partido" value={totals.minPorPartido} />
              <MiniStat label="% minutos" value={totals.pctMinutos === null ? '–' : `${totals.pctMinutos}%`} />
              <MiniStat label="Amarillas" value={totals.amarillas} tone="amber" />
              <MiniStat label="Rojas" value={totals.rojas} tone="red" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                    <th className="py-1.5 pr-2">Fecha</th>
                    <th className="py-1.5 pr-2">Jor.</th>
                    <th className="py-1.5 pr-2">Rival</th>
                    <th className="py-1.5 pr-2 text-center">Rol</th>
                    <th className="py-1.5 pr-2 text-right">Min</th>
                    <th className="py-1.5 pr-2 text-right"><span className="inline-flex items-center gap-1"><BallIcon className="w-3 h-3" />Goles</span></th>
                    <th className="py-1.5 text-right">Tarj.</th>
                  </tr>
                </thead>
                <tbody>
                  {matchLog.map(m => (
                    <tr key={m.fed_match_id} className="border-t border-slate-200 text-slate-700">
                      <td className="py-1.5 pr-2 tabular-nums whitespace-nowrap">{formatBirthDate(m.fecha) ?? m.fecha}</td>
                      <td className="py-1.5 pr-2">{m.jornada || '–'}</td>
                      <td className="py-1.5 pr-2 font-semibold">
                        <span className="text-slate-400 mr-1">{m.es_local === null ? '' : m.es_local ? 'vs' : '@'}</span>
                        {m.rival || '–'}
                      </td>
                      <td className="py-1.5 pr-2 text-center">
                        <span className={`text-[10px] font-black rounded px-1.5 py-0.5 ${m.titular ? 'bg-emerald-100 text-emerald-700' : m.minutos > 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'}`}>
                          {m.titular ? 'TIT' : m.minutos > 0 ? 'SUP' : 'BANQ'}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{m.minutos}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{m.goles > 0 ? <GoalIcons count={m.goles} /> : '–'}</td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        {m.amarillas > 0 && <CardIcon kind="yellow" className="w-2.5 h-3.5 mr-0.5" />}
                        {m.rojas > 0 && <CardIcon kind="red" className="w-2.5 h-3.5" />}
                        {m.amarillas === 0 && m.rojas === 0 && '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashboardWidget>
    </div>
  );
};

export default PlayerDashboard;
