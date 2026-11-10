import React, { useMemo, useState } from 'react';
import type { Player } from '../types';
import { calculatePlayerAge } from '../utils/tileConfig';
import { encuadreStyle, getFotoEncuadre } from '../utils/fotoEncuadre';
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
  /** Oculta la cabecera (cuando el modal ya la muestra en su título) */
  hideHeader?: boolean;
  player: Player;
  /** Foto actual (incluye la previsualización aún sin guardar) */
  photoUrl?: string | null;
  matchStats: { partidosJugados: number; minutos: number; titular: number; goles: number };
  /** Partidos del jugador, más recientes primero */
  matchLog?: PlayerMatchLogRow[];
  /** Partidos del jugador agrupados por equipo */
  matchesByTeam?: { team: string; convocado: number; jugados: number; titular: number; minutos: number; goles: number }[];
  /** Total de partidos con acta del equipo */
  teamMatches?: number;
  /** Goles recibidos con el jugador en campo */
  golesRecibidos?: number;
  /** Asistencia a entrenamientos: sesiones registradas, ausencias y motivos */
  attendance?: {
    total: number;
    attended: number;
    absences: number;
    reasons: Record<string, number>;
    /** Desglose por tipo de sesión y por equipo */
    byScope?: { label: string; total: number; attended: number; absences: number }[];
    byTeam?: { team: string; total: number; attended: number; absences: number }[];
  };
}

const pct = (a: number, t: number) => (t > 0 ? Math.round((a / t) * 100) : 0);

/** Gráfica circular del % de asistencia. */
const AttendanceDonut: React.FC<{ value: number }> = ({ value }) => {
  const r = 38;
  const c = 2 * Math.PI * r;
  const color = value >= 85 ? '#059669' : value >= 70 ? '#f59e0b' : '#dc2626';
  return (
    <svg viewBox="0 0 100 100" className="w-10 h-10 shrink-0" role="img" aria-label={`Asistencia ${value}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 50 50)"
      />
      <text x="50" y="56" textAnchor="middle" className="fill-slate-800" style={{ fontSize: 20, fontWeight: 900 }}>{value}%</text>
    </svg>
  );
};

interface DonutSlice { label: string; value: number; color: string }

/** Donut genérico por segmentos con total en el centro. */
const SegmentDonut: React.FC<{ slices: DonutSlice[]; centerLabel: string; ariaLabel: string }> = ({ slices, centerLabel, ariaLabel }) => {
  const r = 38;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="w-10 h-10 shrink-0" role="img" aria-label={ariaLabel}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      {total > 0 && slices.filter(s => s.value > 0).map(s => {
        const len = (s.value / total) * c;
        const el = (
          <circle
            key={s.label} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="12"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)"
          />
        );
        offset += len;
        return el;
      })}
      <text x="50" y="57" textAnchor="middle" className="fill-slate-800" style={{ fontSize: 22, fontWeight: 900 }}>{centerLabel}</text>
    </svg>
  );
};

const ChartLegend: React.FC<{ items: DonutSlice[] }> = ({ items }) => (
  <ul className="flex flex-col gap-0.5 min-w-0">
    {items.map(i => (
      <li key={i.label} className="flex items-center gap-2 text-xs text-slate-600">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: i.color }} />
        <span className="font-semibold truncate">{i.label}</span>
        <span className="font-black text-slate-800 tabular-nums ml-auto pl-2">{i.value}</span>
      </li>
    ))}
  </ul>
);

const ROLE_COLORS = { tit: '#c8102e', sup: '#0ea5e9', banq: '#94a3b8', none: '#e2e8f0' };

/** Minutos jugados en cada partido (cronológico), coloreado por rol. */
const MinutesBars: React.FC<{ rows: PlayerMatchLogRow[] }> = ({ rows: rawRows }) => {
  const jornadaNum = (m: PlayerMatchLogRow, i: number) => {
    const n = parseInt(String(m.jornada ?? '').replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : i + 1;
  };
  const rows = [...rawRows]
    .map((m, i) => ({ m, n: jornadaNum(m, i) }))
    .sort((a, b) => a.n - b.n)
    .map((x) => x.m);
  const W = 300;
  const H = 130;
  const base = H - 16;
  const gap = 4;
  const bw = Math.max(6, Math.min(28, (W - gap * (rows.length - 1)) / rows.length));
  const totalW = rows.length * bw + (rows.length - 1) * gap;
  const x0 = Math.max(0, (W - totalW) / 2);
  const y90 = base - (base - 14);
  const pts = rows.map((m, i) => {
    const min = Math.max(0, Math.min(90, m.minutos || 0));
    return { x: x0 + i * (bw + gap) + bw / 2, y: base - (min / 90) * (base - 14) };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" role="img" aria-label="Minutos jugados por jornada">
      <line x1="0" x2={W} y1={base} y2={base} stroke="#cbd5e1" strokeWidth="1" />
      <line x1="0" x2={W} y1={y90} y2={y90} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
      <text x={W} y={y90 - 3} textAnchor="end" style={{ fontSize: 8 }} className="fill-slate-400">90'</text>
      {rows.length > 1 && <path d={path} fill="none" stroke="#c8102e" strokeWidth="1.5" strokeLinejoin="round" />}
      {rows.map((m, i) => {
        const { x, y } = pts[i];
        const role = m.titular ? 'tit' : m.minutos > 0 ? 'sup' : 'banq';
        return (
          <g key={m.fed_match_id}>
            <title>{`${formatBirthDate(m.fecha) ?? m.fecha} · ${m.rival || ''} · ${m.minutos}'`}</title>
            <circle cx={x} cy={y} r="3.5" fill={ROLE_COLORS[role]} stroke="#fff" strokeWidth="1" />
            <text x={x} y={y - 7} textAnchor="middle" style={{ fontSize: 8, fontWeight: 700 }} className="fill-slate-600">{m.minutos || 0}</text>
            <text x={x} y={H - 4} textAnchor="middle" style={{ fontSize: 8 }} className="fill-slate-400">
              {m.jornada ? String(m.jornada).replace(/\D/g, '') || i + 1 : i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const BreakdownBar: React.FC<{ label: string; total: number; attended: number; absences: number }> = ({ label, total, attended, absences }) => {
  const p = pct(attended, total);
  return (
    <li className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-700 truncate">{label}</span>
        <span className="font-black text-slate-800 tabular-nums">{p}% <span className="font-medium text-slate-400">({attended}/{total}{absences > 0 ? ` · ${absences} aus.` : ''})</span></span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p}%` }} />
      </div>
    </li>
  );
};

/** Foto por defecto cuando el jugador no tiene foto (archivo en frontend/public). */
const DEFAULT_PLAYER_PHOTO = '/jugador-default.png';

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
}) => {
  const [open, setOpen] = useState(true);
  return (
    <section className={`bg-slate-50 border border-slate-200 rounded-2xl p-2 ${className}`}>
      <h4 className={`text-[10px] font-black text-slate-400 uppercase tracking-widest ${open ? 'mb-1' : ''}`}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          title={open ? 'Ocultar contenido' : 'Mostrar contenido'}
          className="w-full flex items-center justify-between gap-2 uppercase tracking-widest font-black hover:text-slate-600"
        >
          <span>
            {icon && <i className={`fa-solid ${icon} mr-2`}></i>}
            {title}
          </span>
          <i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
        </button>
      </h4>
      {open && children}
    </section>
  );
};

/** Agrupa varios widgets bajo una cabecera común (Entrenamientos / Partidos). */
export const DashboardGroup: React.FC<{ title: string; icon?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, action, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <section className="border border-slate-300 rounded-2xl overflow-hidden bg-white">
      <h3 className="bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest px-3 py-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          title={open ? 'Ocultar sección' : 'Mostrar sección'}
          className="flex-1 flex items-center gap-2 text-left uppercase tracking-widest font-black hover:text-slate-300"
        >
          <span>
            {icon && <i className={`fa-solid ${icon} mr-2`}></i>}
            {title}
          </span>
          <i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} ml-auto`}></i>
        </button>
        {action}
      </h3>
      {open && <div className="flex flex-col gap-1.5 p-1.5">{children}</div>}
    </section>
  );
};

const Kpi: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: 'blue' }> = ({ label, value, hint, tone }) => (
  <div className="bg-white border border-slate-200 rounded-xl px-1 py-0.5 text-center">
    <div className={`text-xs font-black tabular-nums leading-none ${tone === 'blue' ? 'text-blue-600' : 'text-[var(--accent)]'}`}>{value}</div>
    <div className="text-[7px] font-black text-slate-500 uppercase tracking-tight mt-0.5 truncate">{label}</div>
    {hint && <div className="text-[8px] text-slate-400">{hint}</div>}
  </div>
);

const MiniStat: React.FC<{ label: string; value: React.ReactNode; tone?: 'amber' | 'red' }> = ({ label, value, tone }) => (
  <div className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-center">
    <div className={`text-sm font-black tabular-nums leading-none ${tone === 'amber' ? 'text-amber-500' : tone === 'red' ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
    <div className="text-[8px] font-black text-slate-400 uppercase tracking-wide mt-1">{label}</div>
  </div>
);

/** Cabecera compacta del jugador: foto, nombre, dorsal, estado y datos básicos. */
export const PlayerHeader: React.FC<{ player: Player; photoUrl?: string | null; extra?: React.ReactNode }> = ({ player, photoUrl, extra }) => {
  const age = calculatePlayerAge(player.fechaNacimiento);
  const estado = player.estado || 'APTO';
  const subtitle = [player.posicion, player.otraDemarcacion, player.equipo].filter(Boolean).join(' · ');
  const info = [formatBirthDate(player.fechaNacimiento), age !== undefined ? `${age} años` : null, player.club].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center">
        <img
          src={isImageUrl(photoUrl) ? photoUrl : DEFAULT_PLAYER_PHOTO}
          alt={player.nombre}
          style={encuadreStyle(getFotoEncuadre(player))}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase truncate">{player.nombre || '—'}</h3>
          {player.dorsal !== undefined && player.dorsal !== null && (
            <span className="bg-slate-900 text-white text-xs font-black rounded-md px-2 py-0.5 tabular-nums">#{player.dorsal}</span>
          )}
          <span className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-0.5 ${ESTADO_STYLE[estado] || ESTADO_STYLE.OTRO}`}>{estado}</span>
          {extra}
          {player.apodo && <span className="text-sm font-black text-[var(--accent)] uppercase">{player.apodo}</span>}
        </div>
        <p className="text-[11px] text-slate-500 font-medium truncate">{[subtitle, info].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
  );
};

const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ hideHeader, player, photoUrl, matchStats, matchLog = [], matchesByTeam = [], teamMatches, golesRecibidos = 0, attendance }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
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
  const chart = useMemo(() => {
    const tit = matchLog.filter(m => m.titular).length;
    const sup = matchLog.filter(m => !m.titular && m.minutos > 0).length;
    const banq = matchLog.length - tit - sup;
    const noConv = Math.max(0, (teamMatches || 0) - matchLog.length);
    return { tit, sup, banq, noConv, chrono: [...matchLog].reverse() };
  }, [matchLog, teamMatches]);
  const convocadoPct = teamMatches && teamMatches > 0 ? Math.min(100, Math.round((totals.convocado / teamMatches) * 100)) : null;

  return (
    <div className="flex flex-col gap-1.5">
      {!hideHeader && <PlayerHeader player={player} photoUrl={photoUrl} />}

      {/* ===== GRUPO: ENTRENAMIENTOS ===== */}
      <DashboardGroup title="Entrenamientos" icon="fa-clipboard-check">
      {/* Entrenamientos: sesiones, ausencias y motivos */}
      <DashboardWidget title="Asistencia" icon="fa-clipboard-check">
        {!attendance || attendance.total === 0 ? (
          <p className="text-xs text-slate-400 text-center">Sin sesiones de entrenamiento registradas</p>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <div className="grid grid-cols-3 gap-1.5 flex-1">
                <MiniStat label="Sesiones" value={attendance.total} />
                <MiniStat label="Asistidas" value={attendance.attended} />
                <MiniStat label="Ausencias" value={attendance.absences} tone="red" />
              </div>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1.5 py-0.5" title="% asistencia">
                <AttendanceDonut value={pct(attendance.attended, attendance.total)} />
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdown(v => !v)}
                aria-expanded={showBreakdown}
                title={showBreakdown ? 'Ocultar desglose' : 'Ver desglose de entrenamientos'}
                className="self-stretch flex items-center justify-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100"
              >
                <i className={`fa-solid ${showBreakdown ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                <span className="hidden sm:inline">Desglose</span>
              </button>
            </div>
            {showBreakdown && (
              <div className="mt-3 flex flex-col gap-4">
                {attendance.byScope && attendance.byScope.some(s => s.attended > 0) && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Por tipo de sesión</p>
                    <ul className="flex flex-col gap-1.5">
                      {attendance.byScope.filter(s => s.attended > 0).map(s => <BreakdownBar key={s.label} {...s} />)}
                    </ul>
                  </div>
                )}
                {attendance.byTeam && attendance.byTeam.some(t => t.attended > 0) && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Por equipo</p>
                    <ul className="flex flex-col gap-1.5">
                      {attendance.byTeam.filter(t => t.attended > 0).map(t => <BreakdownBar key={t.team} label={t.team} total={t.total} attended={t.attended} absences={t.absences} />)}
                    </ul>
                  </div>
                )}
                {attendance.absences > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivos de ausencia</p>
                    <ul className="flex flex-col gap-1.5">
                      {Object.entries(attendance.reasons)
                        .sort((a, b) => b[1] - a[1])
                        .map(([reason, count]) => (
                          <li key={reason} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                            <span className="font-semibold text-slate-700">{reason}</span>
                            <span className="font-black text-red-600 tabular-nums">{count}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DashboardWidget>
      </DashboardGroup>

      {/* ===== GRUPO: PARTIDOS ===== */}
      <DashboardGroup title="Partidos" icon="fa-futbol">
      {/* Indicadores principales */}
      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2 text-emerald-600" title="Partidos del equipo">PE</th>
              <th className="px-3 py-2" title="Partidos jugados"><i className="fa-solid fa-shirt text-[9px] mr-1"></i>PJ</th>
              <th className="px-3 py-2" title="Titularidades"><i className="fa-solid fa-star text-[9px] mr-1"></i>Tit.</th>
              <th className="px-3 py-2" title="% de partidos del equipo como titular">% Tit.</th>
              <th className="px-3 py-2 text-emerald-600" title="Minutos del equipo (partidos del equipo × 90)"><i className="fa-solid fa-clock text-[9px] mr-1"></i>MIN E</th>
              <th className="px-3 py-2" title="Minutos jugados"><i className="fa-solid fa-stopwatch text-[9px] mr-1"></i>MINJ</th>
              <th className="px-3 py-2" title="% de minutos jugados sobre los del equipo">% Min.</th>
              <th className="px-3 py-2" title="Goles marcados"><span className="mr-1">⚽</span>Goles</th>
              <th className="px-3 py-2" title="Goles recibidos con el jugador en campo"><i className="fa-solid fa-hand text-[9px] mr-1"></i>GC</th>
              <th className="px-3 py-2" title="Tarjetas amarillas"><span className="inline-block w-2 h-3 rounded-[2px] bg-yellow-400"></span></th>
              <th className="px-3 py-2" title="Tarjetas rojas"><span className="inline-block w-2 h-3 rounded-[2px] bg-red-600"></span></th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-xs tabular-nums text-slate-600">
              <td className="px-3 py-2 text-emerald-600 font-semibold">{teamMatches && teamMatches > 0 ? teamMatches : '—'}</td>
              <td className="px-3 py-2">{matchStats.partidosJugados}</td>
              <td className="px-3 py-2">{matchStats.titular}</td>
              <td className="px-3 py-2">{teamMatches && teamMatches > 0 ? `${Math.min(100, pct(matchStats.titular, teamMatches))}%` : '—'}</td>
              <td className="px-3 py-2 text-emerald-600 font-semibold">{teamMatches && teamMatches > 0 ? teamMatches * 90 : '—'}</td>
              <td className="px-3 py-2">{matchStats.minutos}</td>
              <td className="px-3 py-2">{totals.pctMinutos === null ? '—' : `${Math.min(100, totals.pctMinutos)}%`}</td>
              <td className="px-3 py-2">{matchStats.goles}</td>
              <td className="px-3 py-2">{golesRecibidos}</td>
              <td className="px-3 py-2">{totals.amarillas > 0 ? <span className="inline-flex items-center gap-1 font-semibold text-slate-700"><span className="inline-block w-2 h-3 rounded-[2px] bg-yellow-400"></span>{totals.amarillas}</span> : <span className="text-slate-300">0</span>}</td>
              <td className="px-3 py-2">{totals.rojas > 0 ? <span className="inline-flex items-center gap-1 font-semibold text-slate-700"><span className="inline-block w-2 h-3 rounded-[2px] bg-red-600"></span>{totals.rojas}</span> : <span className="text-slate-300">0</span>}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Partidos por equipo (solo si hay más de un equipo; si no, ya está en los KPIs) */}
      {matchesByTeam.length > 1 && (
        <DashboardWidget title="Partidos por equipo" icon="fa-people-group">
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table className="w-full text-[10px] [&_th]:!px-2 [&_th]:!py-0.5 [&_td]:!px-2 [&_td]:!py-0.5" style={{ fontSize: 10 }}>
              <thead>
                <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">
                  <th>Equipo</th>
                  <th className="text-right">Conv.</th>
                  <th className="text-right">Jugados</th>
                  <th className="text-right">Titular</th>
                  <th className="text-right">Min</th>
                  <th className="text-right">Goles</th>
                </tr>
              </thead>
              <tbody>
                {matchesByTeam.map(t => (
                  <tr key={t.team} className="border-t border-slate-100 tabular-nums">
                    <td className="font-semibold text-slate-700">{t.team}</td>
                    <td className="text-right">{t.convocado}</td>
                    <td className="text-right font-black text-slate-800">{t.jugados}</td>
                    <td className="text-right">{t.titular}</td>
                    <td className="text-right">{t.minutos}</td>
                    <td className="text-right">{t.goles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardWidget>
      )}

      {/* Gráficas: partidos, minutos y titularidades */}
      {matchLog.length > 0 && (
        <DashboardWidget title="Gráficas de partidos" icon="fa-chart-simple">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
            <div className="bg-white border border-slate-200 rounded-xl p-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Partidos</p>
              <div className="flex items-center gap-3">
                <SegmentDonut
                  ariaLabel="Distribución de partidos"
                  centerLabel={String(matchStats.partidosJugados)}
                  slices={[
                    { label: 'Jugados', value: chart.tit + chart.sup, color: ROLE_COLORS.tit },
                    { label: 'Sin jugar', value: chart.banq, color: ROLE_COLORS.banq },
                    { label: 'No convocado', value: chart.noConv, color: ROLE_COLORS.none },
                  ]}
                />
                <ChartLegend items={[
                  { label: 'Jugados', value: chart.tit + chart.sup, color: ROLE_COLORS.tit },
                  { label: 'Sin jugar', value: chart.banq, color: ROLE_COLORS.banq },
                  { label: 'No convocado', value: chart.noConv, color: ROLE_COLORS.none },
                ]} />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Titularidades</p>
              <div className="flex items-center gap-3">
                <SegmentDonut
                  ariaLabel="Titular, suplente y sin jugar"
                  centerLabel={String(chart.tit)}
                  slices={[
                    { label: 'Titular', value: chart.tit, color: ROLE_COLORS.tit },
                    { label: 'Suplente', value: chart.sup, color: ROLE_COLORS.sup },
                    { label: 'Sin jugar', value: chart.banq, color: ROLE_COLORS.banq },
                  ]}
                />
                <ChartLegend items={[
                  { label: 'Titular', value: chart.tit, color: ROLE_COLORS.tit },
                  { label: 'Suplente', value: chart.sup, color: ROLE_COLORS.sup },
                  { label: 'Sin jugar', value: chart.banq, color: ROLE_COLORS.banq },
                ]} />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Minutos por jornada
              </p>
              <MinutesBars rows={chart.chrono} />
            </div>
          </div>
        </DashboardWidget>
      )}

      {/* Participación acumulada en partidos */}
      <DashboardWidget title="Participación en partidos" icon="fa-futbol">
        {matchLog.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">Sin partidos registrados</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] [&_th]:!px-1 [&_th]:!py-0.5 [&_td]:!px-1 [&_td]:!py-0.5" style={{ fontSize: 10 }}>
                <thead>
                  <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">
                    <th className="py-0.5 pr-2">Fecha</th>
                    <th className="py-0.5 pr-2">Jor.</th>
                    <th className="py-0.5 pr-2">Rival</th>
                    <th className="py-0.5 pr-2 text-center">Rol</th>
                    <th className="py-0.5 pr-2 text-right">Min</th>
                    <th className="py-0.5 pr-2 text-right"><span className="inline-flex items-center gap-1"><BallIcon className="w-3 h-3" />Goles</span></th>
                    <th className="py-0.5 text-right">Tarj.</th>
                  </tr>
                </thead>
                <tbody>
                  {[...matchLog].sort((a, b) => {
                    const ja = parseInt(String(a.jornada ?? '').replace(/\D/g, ''), 10);
                    const jb = parseInt(String(b.jornada ?? '').replace(/\D/g, ''), 10);
                    if (!isNaN(ja) && !isNaN(jb) && ja !== jb) return ja - jb;
                    return String(a.fecha).localeCompare(String(b.fecha));
                  }).map(m => (
                    <tr key={m.fed_match_id} className="border-t border-slate-200 text-slate-700">
                      <td className="py-0.5 pr-2 tabular-nums whitespace-nowrap">{formatBirthDate(m.fecha) ?? m.fecha}</td>
                      <td className="py-0.5 pr-2">{m.jornada || '–'}</td>
                      <td className="py-0.5 pr-2 font-semibold">
                        <span className="text-slate-400 mr-1">{m.es_local === null ? '' : m.es_local ? 'vs' : '@'}</span>
                        {m.rival || '–'}
                      </td>
                      <td className="py-0.5 pr-2 text-center">
                        <span className={`text-[8px] font-black rounded px-1 py-0.5 ${m.titular ? 'bg-emerald-100 text-emerald-700' : m.minutos > 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'}`}>
                          {m.titular ? 'TIT' : m.minutos > 0 ? 'SUP' : 'BANQ'}
                        </span>
                      </td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">{m.minutos}</td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">{m.goles > 0 ? <GoalIcons count={m.goles} /> : '–'}</td>
                      <td className="py-0.5 text-right whitespace-nowrap">
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
      </DashboardGroup>
    </div>
  );
};

export default PlayerDashboard;
