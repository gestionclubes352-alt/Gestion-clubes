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
  player: Player;
  /** Foto actual (incluye la previsualización aún sin guardar) */
  photoUrl?: string | null;
  matchStats: { partidosJugados: number; minutos: number; titular: number; goles: number };
  /** Partidos del jugador, más recientes primero */
  matchLog?: PlayerMatchLogRow[];
  /** Total de partidos con acta del equipo */
  teamMatches?: number;
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
    <svg viewBox="0 0 100 100" className="w-16 h-16 shrink-0" role="img" aria-label={`Asistencia ${value}%`}>
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
    <svg viewBox="0 0 100 100" className="w-16 h-16 shrink-0" role="img" aria-label={ariaLabel}>
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
const MinutesBars: React.FC<{ rows: PlayerMatchLogRow[] }> = ({ rows }) => {
  const W = 300;
  const H = 110;
  const base = H - 16;
  const gap = 4;
  const bw = Math.max(6, Math.min(28, (W - gap * (rows.length - 1)) / rows.length));
  const totalW = rows.length * bw + (rows.length - 1) * gap;
  const x0 = Math.max(0, (W - totalW) / 2);
  const y90 = base - 0.9 * (base - 14) / 0.9;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" role="img" aria-label="Minutos jugados por partido">
      <line x1="0" x2={W} y1={base} y2={base} stroke="#cbd5e1" strokeWidth="1" />
      <line x1="0" x2={W} y1={y90} y2={y90} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
      <text x={W} y={y90 - 3} textAnchor="end" style={{ fontSize: 8 }} className="fill-slate-400">90'</text>
      {rows.map((m, i) => {
        const min = Math.max(0, Math.min(90, m.minutos || 0));
        const h = (min / 90) * (base - 14);
        const x = x0 + i * (bw + gap);
        const role = m.titular ? 'tit' : m.minutos > 0 ? 'sup' : 'banq';
        return (
          <g key={m.fed_match_id}>
            <title>{`${formatBirthDate(m.fecha) ?? m.fecha} · ${m.rival || ''} · ${m.minutos}'${m.goles > 0 ? ` · ${m.goles} gol(es)` : ''}`}</title>
            <rect x={x} y={base - Math.max(h, 2)} width={bw} height={Math.max(h, 2)} rx="2" fill={ROLE_COLORS[role]} />
            {m.goles > 0 && <circle cx={x + bw / 2} cy={base - h - 6} r="3" fill="#0f172a" />}
            <text x={x + bw / 2} y={H - 4} textAnchor="middle" style={{ fontSize: 7 }} className="fill-slate-400">
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
}) => (
  <section className={`bg-slate-50 border border-slate-200 rounded-2xl p-2.5 ${className}`}>
    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
      {icon && <i className={`fa-solid ${icon} mr-2`}></i>}
      {title}
    </h4>
    {children}
  </section>
);

const Kpi: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white border border-slate-200 rounded-2xl px-2 py-1.5 text-center">
    <div className="text-sm font-black text-[var(--accent)] tabular-nums leading-none">{value}</div>
    <div className="text-[8px] font-black text-slate-500 uppercase tracking-wide mt-1">{label}</div>
    {hint && <div className="text-[8px] text-slate-400 mt-0.5">{hint}</div>}
  </div>
);

const MiniStat: React.FC<{ label: string; value: React.ReactNode; tone?: 'amber' | 'red' }> = ({ label, value, tone }) => (
  <div className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-center">
    <div className={`text-sm font-black tabular-nums leading-none ${tone === 'amber' ? 'text-amber-500' : tone === 'red' ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
    <div className="text-[8px] font-black text-slate-400 uppercase tracking-wide mt-1">{label}</div>
  </div>
);

const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ player, photoUrl, matchStats, matchLog = [], teamMatches, attendance }) => {
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
  const age = calculatePlayerAge(player.fechaNacimiento);
  const convocadoPct = teamMatches && teamMatches > 0 ? Math.min(100, Math.round((totals.convocado / teamMatches) * 100)) : null;
  const estado = player.estado || 'APTO';
  const subtitle = [player.posicion, player.otraDemarcacion, player.equipo].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-2">
      {/* Cabecera del jugador */}
      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
        <div className="w-14 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center">
          <img
            src={isImageUrl(photoUrl) ? photoUrl : DEFAULT_PLAYER_PHOTO}
            alt={player.nombre}
            style={encuadreStyle(getFotoEncuadre(player))}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-black text-slate-800 uppercase truncate">{player.nombre || '—'}</h3>
            {player.dorsal !== undefined && player.dorsal !== null && (
              <span className="bg-slate-900 text-white text-sm font-black rounded-md px-2.5 py-0.5 tabular-nums">#{player.dorsal}</span>
            )}
            <span className={`text-xs font-black uppercase tracking-widest rounded-full px-3 py-1 ${ESTADO_STYLE[estado] || ESTADO_STYLE.OTRO}`}>
              {estado}
            </span>
          </div>
          {player.apodo && <p className="text-base font-black text-[var(--accent)] uppercase mt-0.5">{player.apodo}</p>}
          {subtitle && <p className="text-sm text-slate-600 font-semibold mt-0.5">{subtitle}</p>}
          <p className="text-xs text-slate-500 font-medium mt-0.5">
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Kpi label="Partidos" value={matchStats.partidosJugados} />
        <Kpi label="Minutos" value={matchStats.minutos} />
        <Kpi label="Titular" value={matchStats.titular} />
        <Kpi label="Goles" value={matchStats.goles} />
        <Kpi
          label="Convocatorias"
          value={convocadoPct === null ? '–' : `${convocadoPct}%`}
          hint={teamMatches && teamMatches > 0 ? `${totals.convocado}/${teamMatches} partidos` : undefined}
        />
      </div>

      {/* Entrenamientos: sesiones, ausencias y motivos */}
      <DashboardWidget title="Entrenamientos" icon="fa-clipboard-check">
        {!attendance || attendance.total === 0 ? (
          <p className="text-xs text-slate-400 text-center">Sin sesiones de entrenamiento registradas</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Sesiones" value={attendance.total} />
              <MiniStat label="Asistidas" value={attendance.attended} />
              <MiniStat label="Ausencias" value={attendance.absences} tone="red" />
            </div>
            <div className="mt-2 flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-3">
              <AttendanceDonut value={pct(attendance.attended, attendance.total)} />
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">% asistencia a sesiones</p>
                <p className="text-xs text-slate-500 mt-1">{attendance.attended} de {attendance.total} sesiones asistidas</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBreakdown(v => !v)}
              aria-expanded={showBreakdown}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100"
            >
              <i className={`fa-solid ${showBreakdown ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              {showBreakdown ? 'Ocultar desglose' : 'Ver desglose de entrenamientos'}
            </button>
            {showBreakdown && (
              <div className="mt-3 flex flex-col gap-4">
                {attendance.byScope && attendance.byScope.some(s => s.total > 0) && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Por tipo de sesión</p>
                    <ul className="flex flex-col gap-1.5">
                      {attendance.byScope.filter(s => s.total > 0).map(s => <BreakdownBar key={s.label} {...s} />)}
                    </ul>
                  </div>
                )}
                {attendance.byTeam && attendance.byTeam.some(t => t.total > 0) && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Por equipo</p>
                    <ul className="flex flex-col gap-1.5">
                      {attendance.byTeam.filter(t => t.total > 0).map(t => <BreakdownBar key={t.team} label={t.team} total={t.total} attended={t.attended} absences={t.absences} />)}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {attendance.absences > 0 && (
              <div className="mt-4">
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
          </>
        )}
      </DashboardWidget>

      {/* Gráficas: partidos, minutos y titularidades */}
      {matchLog.length > 0 && (
        <DashboardWidget title="Gráficas de partidos" icon="fa-chart-simple">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl p-2">
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
                Minutos por partido <span className="text-slate-300 normal-case tracking-normal">· ● gol</span>
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
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
              <MiniStat label="Convocado" value={`${totals.convocado}${teamMatches ? `/${teamMatches}` : ''}`} />
              <MiniStat label="Suplente" value={totals.suplente} />
              <MiniStat label="Min/partido" value={totals.minPorPartido} />
              <MiniStat label="% minutos" value={totals.pctMinutos === null ? '–' : `${totals.pctMinutos}%`} />
              <MiniStat label="Amarillas" value={totals.amarillas} tone="amber" />
              <MiniStat label="Rojas" value={totals.rojas} tone="red" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
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
    </div>
  );
};

export default PlayerDashboard;
