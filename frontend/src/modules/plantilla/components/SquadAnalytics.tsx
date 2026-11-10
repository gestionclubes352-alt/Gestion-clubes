import React, { useEffect, useMemo, useState } from 'react';
import { CardIcon, StatCount } from '@shared/components/MatchIcons';
import type { Player } from '../types';
import { fetchMatchTotals, EMPTY_TOTALS, type MatchTotals } from '../utils/matchTotals';
import FullscreenChart from '@shared/components/FullscreenChart';
import { objetivosIndividualesService, type ObjetivoIndividual } from '@shared/services/dataService';
import { TIPOS_OBJETIVO } from '../../objetivos/types';
import { eventosCalendarioService } from '@shared/services/dataService';
import type { ActaPartido } from '@shared/services/rfefActasService';
import { norm } from '../../competicion/components/CompetitionExtraPanels';
import ActaMatchSheet from '../../partidos/components/ActaMatchSheet';

interface SquadAnalyticsProps {
  squad: Player[];
  mode: 'graficas' | 'dashboard';
  /** Clasificación del equipo, mostrada en el dashboard junto a la plantilla. */
  classification?: (onEquipoChange: (equipo: string) => void) => React.ReactNode;
}

const currentYear = new Date().getFullYear();

const ageOf = (p: Player): number | null => {
  if (p.fechaNacimiento) {
    const d = new Date(p.fechaNacimiento);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age -= 1;
      return age;
    }
  }
  if (p.anioNacimiento) return currentYear - p.anioNacimiento;
  return null;
};

// Orden de categorías de mayor a menor (Primer equipo primero, Prebenjamín último)
const TEAM_LEVELS = ['primer equipo', 'senior', 'juvenil', 'cadete', 'infantil', 'alevin', 'benjamin', 'prebenjamin'];
const teamLevel = (equipo: string): number => {
  const n = equipo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // 'prebenjamin' contiene 'benjamin': se comprueba de más específico a menos
  const idx = [...TEAM_LEVELS].reverse().findIndex(l => n.includes(l));
  return idx === -1 ? TEAM_LEVELS.length : TEAM_LEVELS.length - 1 - idx;
};

const countBy = <T,>(items: T[], key: (i: T) => string): Array<{ label: string; value: number }> => {
  const map = new Map<string, number>();
  items.forEach(i => {
    const k = key(i) || 'Sin dato';
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

/** Máximo de jugadores permitido por equipo. */
const MAX_JUGADORES_EQUIPO = 40;

const normalizeText = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Nombres repetidos dentro de un equipo (mismo DNI o mismo nombre normalizado). */
const findDuplicates = (players: Player[]): string[] => {
  const seen = new Map<string, Player>();
  const dups = new Set<string>();
  players.forEach(p => {
    const keys = [p.dni ? `dni:${normalizeText(p.dni)}` : '', p.nombre ? `n:${normalizeText(p.nombre)}` : ''].filter(Boolean);
    keys.forEach(k => {
      if (seen.has(k) && seen.get(k) !== p) dups.add(p.nombre || String(p.id));
      else seen.set(k, p);
    });
  });
  return [...dups];
};

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

type BarDatum = { label: string; value: number; pct?: number };

const BarChart: React.FC<{ title: string; icon: string; data: BarDatum[]; color?: string }> = ({
  title, icon, data, color = 'bg-blue-500',
}) => {
  const max = Math.max(1, ...data.map(d => d.value));
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <FullscreenChart as="section" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 pr-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
        <i className={`fa-solid ${icon} text-blue-500`}></i>{title}
      </h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400">Sin datos</p>
      ) : (
        <ul className="grid max-h-72 grid-cols-[max-content_minmax(48px,1fr)_max-content] items-center gap-x-2 gap-y-2 overflow-y-auto pr-1">
          {data.map((d, i) => (
            <li key={`${d.label}-${i}`} className="col-span-3 grid grid-cols-subgrid items-center text-xs">
              <span className="whitespace-nowrap font-semibold text-slate-600" title={d.label}>{d.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${(d.value / max) * 100}%` }} />
              </div>
              <span className="text-right font-black tabular-nums text-slate-700">
                {d.value} <span className="font-semibold text-slate-400">({Math.round(d.pct ?? (d.value / total) * 100)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </FullscreenChart>
  );
};

const Kpi: React.FC<{ label: string; value: string | number; icon: string; tone?: string }> = ({ label, value, icon, tone = 'bg-blue-600' }) => (
  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs text-white ${tone}`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <div className="min-w-0">
      <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-base font-black leading-tight text-slate-800 tabular-nums">{value}</p>
    </div>
  </div>
);

const RANKING_LIMIT = 8;

type SortKey = 'nombre' | 'posicion' | 'pe' | 'pctTit' | 'minE' | 'gc' | 'pj' | 'tit' | 'sup' | 'min' | 'minPj' | 'pct' | 'goles' | 'am' | 'ro';

interface StatsRow {
  id: string;
  nombre: string;
  dorsal?: number | null;
  posicion: string;
  equipo: string;
  pe: number; pctTit: number | null; minE: number; gc: number;
  pj: number; tit: number; sup: number; min: number; minPj: number; pct: number | null;
  goles: number; am: number; ro: number;
}

const COLUMNS: Array<{ key: SortKey; label: string; title: string; align?: 'left'; icon?: string; emoji?: string; card?: 'yellow' | 'red'; team?: boolean }> = [
  { key: 'nombre', label: 'Jugador', title: 'Jugador', align: 'left' },
  { key: 'posicion', label: 'Dem.', title: 'Demarcación', align: 'left' },
  { key: 'pe', label: 'PE', title: 'Partidos del equipo', team: true },
  { key: 'pj', label: 'PC', title: 'Partidos convocado', icon: 'fa-shirt' },
  { key: 'tit', label: 'TIT', title: 'Titularidades', icon: 'fa-star' },
  { key: 'pctTit', label: '% TIT', title: '% de partidos del equipo como titular' },
  { key: 'sup', label: 'SUP', title: 'Entradas como suplente' },
  { key: 'minE', label: 'MIN E', title: 'Minutos del equipo (partidos del equipo × 90)', icon: 'fa-clock', team: true },
  { key: 'min', label: 'MINJ', title: 'Minutos jugados', icon: 'fa-stopwatch' },
  { key: 'minPj', label: 'MIN/PJ', title: 'Minutos por partido jugado' },
  { key: 'pct', label: '% MIN', title: '% de minutos sobre los posibles del equipo' },
  { key: 'goles', label: 'GOLES', title: 'Goles', emoji: '⚽' },
  { key: 'gc', label: 'GC', title: 'Goles recibidos con el jugador en campo', icon: 'fa-hand' },
  { key: 'am', label: '', title: 'Tarjetas amarillas', card: 'yellow' },
  { key: 'ro', label: '', title: 'Tarjetas rojas', card: 'red' },
];

/** Tabla de plantilla con estadísticas de actas, ordenable por cualquier columna (ranking). */
const SquadStatsTable: React.FC<{ squad: Player[]; totals: Map<string, MatchTotals> }> = ({ squad, totals }) => {
  const [sortKey, setSortKey] = useState<SortKey>('min');
  const [desc, setDesc] = useState(true);

  const rows = useMemo<StatsRow[]>(() => {
    const teamMatches = new Map<string, number>();
    squad.forEach(p => {
      const k = p.equipo || 'Sin equipo';
      teamMatches.set(k, Math.max(teamMatches.get(k) ?? 0, (totals.get(String(p.id)) ?? EMPTY_TOTALS).pj));
    });
    return squad.map(p => {
      const t = totals.get(String(p.id)) ?? EMPTY_TOTALS;
      const posibles = (teamMatches.get(p.equipo || 'Sin equipo') ?? 0) * 90;
      return {
        id: String(p.id),
        nombre: p.nombre || '—',
        dorsal: p.dorsal,
        posicion: p.posicion || '',
        equipo: p.equipo || '',
        pe: teamMatches.get(p.equipo || 'Sin equipo') ?? 0,
        pctTit: (teamMatches.get(p.equipo || 'Sin equipo') ?? 0) > 0 ? Math.min(100, Math.round((t.tit / (teamMatches.get(p.equipo || 'Sin equipo') ?? 0)) * 100)) : null,
        minE: posibles, gc: t.gc,
        pj: t.pj, tit: t.tit, sup: t.pj - t.tit, min: t.min,
        minPj: t.pj > 0 ? Math.round(t.min / t.pj) : 0,
        pct: posibles > 0 ? Math.round((t.min / posibles) * 100) : null,
        goles: t.goles, am: t.am, ro: t.ro,
      };
    });
  }, [squad, totals]);

  const sorted = useMemo(() => {
    const dir = desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const va = a[sortKey] ?? -1;
      const vb = b[sortKey] ?? -1;
      const cmp = typeof va === 'string' || typeof vb === 'string'
        ? String(va).localeCompare(String(vb), 'es')
        : (va as number) - (vb as number);
      return cmp * dir || a.nombre.localeCompare(b.nombre, 'es');
    });
  }, [rows, sortKey, desc]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setDesc(d => !d);
    else { setSortKey(key); setDesc(key !== 'nombre' && key !== 'posicion'); }
  };

  const max = (k: 'pj' | 'tit' | 'sup' | 'min' | 'goles') => Math.max(1, ...rows.map(r => r[k]));
  const maxMin = max('min');

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h3 className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <i className="fa-solid fa-ranking-star text-blue-500"></i>Plantilla · ranking de estadísticas
        <span className="ml-auto text-[9px] font-semibold normal-case tracking-normal text-slate-400">Pulsa una columna para ordenar</span>
      </h3>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[900px] text-left text-[10px]!">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="w-8 px-3 py-2 text-right">#</th>
              {COLUMNS.map(c => (
                <th
                  key={c.key}
                  title={c.title}
                  onClick={() => onSort(c.key)}
                  aria-sort={sortKey === c.key ? (desc ? 'descending' : 'ascending') : 'none'}
                  className={`cursor-pointer select-none whitespace-nowrap px-2 py-2 hover:text-slate-700 ${c.align === 'left' ? 'text-left' : 'text-right'} ${sortKey === c.key ? 'text-blue-600' : ''}`}
                >
                  <span className={`inline-flex items-center gap-1 ${c.team ? 'text-emerald-600!' : ''}`}>
                    {c.icon && <i className={`fa-solid ${c.icon} text-[9px]`}></i>}
                    {c.emoji && <span className="text-[11px] leading-none">{c.emoji}</span>}
                    {c.card && <CardIcon kind={c.card} className="w-2 h-3" />}
                    {c.label}
                  </span>
                  {sortKey === c.key && <i className={`fa-solid ${desc ? 'fa-caret-down' : 'fa-caret-up'} ml-1`}></i>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-1 text-right tabular-nums text-slate-400">{i + 1}</td>
                <td className="px-2 py-1 font-bold text-slate-700">
                  {r.dorsal !== undefined && r.dorsal !== null && <span className="mr-1.5 text-slate-400 tabular-nums">{r.dorsal}</span>}
                  {r.nombre}
                </td>
                <td className="px-2 py-1 text-slate-500">{r.posicion || '—'}</td>
                <td className="px-2 py-1 text-right tabular-nums font-semibold text-emerald-600!">{r.pe || '—'}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r.pj}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r.tit}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r.pctTit === null ? '—' : `${r.pctTit}%`}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r.sup}</td>
                <td className="px-2 py-1 text-right tabular-nums font-semibold text-emerald-600!">{r.minE || '—'}</td>
                <td className="px-2 py-1 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-2">
                    <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:block">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${(r.min / maxMin) * 100}%` }} />
                    </div>
                    <span className="font-black text-slate-800">{r.min.toLocaleString('es')}</span>
                  </div>
                </td>
                <td className="px-2 py-1 text-right tabular-nums">{r.minPj || '—'}</td>
                <td className="px-2 py-1 text-right tabular-nums">{r.pct === null ? '—' : `${r.pct}%`}</td>
                <td className="px-2 py-1 text-right tabular-nums"><div className="flex justify-end"><StatCount kind="goal" count={r.goles} /></div></td>
                <td className="px-2 py-1 text-right tabular-nums">{r.gc}</td>
                <td className="px-2 py-1 text-right tabular-nums"><div className="flex justify-end"><StatCount kind="yellow" count={r.am} /></div></td>
                <td className="px-2 py-1 text-right tabular-nums"><div className="flex justify-end"><StatCount kind="red" count={r.ro} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

interface PlayedMatch { id: string; date: string; team: string; jornada: string; acta: ActaPartido }

/** Desglose de partidos jugados (actas federativas) de los equipos mostrados. */
const PlayedMatchesTable: React.FC<{ squad: Player[] }> = ({ squad }) => {
  const [rows, setRows] = useState<PlayedMatch[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    eventosCalendarioService
      .list({ type: 'Partido' }, 'id,date,team,nombre_interno,jornada,acta_fed')
      .then(data => {
        if (cancelled) return;
        setRows((data ?? []).filter((r: any) => r.acta_fed).map((r: any) => ({
          id: r.id, date: r.date, team: r.nombre_interno || r.team || '', jornada: r.jornada || '', acta: r.acta_fed as ActaPartido,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      })
      .catch(err => console.error('No se pudieron cargar los partidos jugados', err));
    return () => { cancelled = true; };
  }, []);

  const teams = useMemo(() => new Set(squad.map(p => norm(p.equipo)).filter(Boolean)), [squad]);
  const matches = useMemo(() => rows.filter(r => teams.size === 0 || teams.has(norm(r.team))), [rows, teams]);

  const view = matches.map(m => {
    const a = m.acta;
    const t = norm(m.team);
    const side: 'home' | 'away' | null = norm(a.homeTeam.name) === t ? 'home' : norm(a.awayTeam.name) === t ? 'away' : null;
    const own = side === 'away' ? a.awayScore : a.homeScore;
    const rival = side === 'away' ? a.homeScore : a.awayScore;
    const result = side === null ? null : own > rival ? 'G' : own === rival ? 'E' : 'P';
    let ph = 0, pa = 0;
    const scorers = (a.goals ?? []).map(g => {
      const gSide = g.homeScore > ph ? 'home' : g.awayScore > pa ? 'away' : null;
      ph = g.homeScore; pa = g.awayScore;
      return { text: `${g.player} ${g.minute}'`, mine: gSide === side };
    }).filter(g => side === null || g.mine).map(g => g.text);
    return { m, result, scorers, side };
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h3 className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <i className="fa-solid fa-flag-checkered text-blue-500"></i>Partidos jugados
        <span className="ml-auto text-[9px] font-semibold normal-case tracking-normal text-slate-400">{view.length} partidos</span>
      </h3>
      {view.length === 0 ? (
        <p className="px-3 py-3 text-[10px] text-slate-400">Sin partidos jugados con acta</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[10px]!">
            <thead className="bg-slate-50 text-[9px] uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-2 py-2">Jor.</th>
                <th className="px-2 py-2">Equipo</th>
                <th className="px-2 py-2 text-right">Local</th>
                <th className="px-2 py-2 text-center">Res.</th>
                <th className="px-2 py-2">Visitante</th>
                <th className="px-2 py-2 text-center">G/E/P</th>
                <th className="px-2 py-2">Goleadores</th>
                <th className="px-2 py-2 text-center">Acta</th>
              </tr>
            </thead>
            <tbody>
              {view.map(({ m, result, scorers, side }) => (
                <React.Fragment key={m.id}>
                <tr className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-1 text-slate-500">{m.acta.date || m.date}</td>
                  <td className="px-2 py-1 text-slate-500">{m.jornada || m.acta.jornada}</td>
                  <td className="px-2 py-1 font-bold text-slate-700">{m.team}</td>
                  <td className="px-2 py-1 text-right text-slate-700">{m.acta.homeTeam.name}</td>
                  <td className="px-2 py-1 text-center"><span className="rounded bg-slate-800 px-1.5 py-0.5 font-black tabular-nums text-white">{m.acta.score}</span></td>
                  <td className="px-2 py-1 text-slate-700">{m.acta.awayTeam.name}</td>
                  <td className={`px-2 py-1 text-center font-black ${result === 'G' ? 'text-emerald-600' : result === 'P' ? 'text-red-600' : 'text-amber-500'}`}>{result ?? '—'}</td>
                  <td className="px-2 py-1 text-slate-500">{scorers.join(', ') || '—'}</td>
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === m.id ? null : m.id)}
                      title={openId === m.id ? 'Ocultar acta' : 'Ver acta'}
                      className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wider transition-colors ${openId === m.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
                    >
                      <i className="fa-solid fa-file-lines mr-1"></i>Acta
                    </button>
                  </td>
                </tr>
                {openId === m.id && (
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td colSpan={9} className="p-3">
                      <ActaMatchSheet acta={m.acta} ownSide={side} />
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const SquadAnalytics: React.FC<SquadAnalyticsProps> = ({ squad: allSquad, mode, classification }) => {
  // Dashboard individual de un equipo (null = todos los equipos de la selección).
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const rawSquad = useMemo(
    () => (teamFilter ? allSquad.filter(p => (p.equipo || 'Sin equipo') === teamFilter) : allSquad),
    [allSquad, teamFilter],
  );
  useEffect(() => {
    if (teamFilter && !allSquad.some(p => (p.equipo || 'Sin equipo') === teamFilter)) setTeamFilter(null);
  }, [allSquad, teamFilter]);

  // Partidos, minutos y goles salen de las actas federativas (estadisticas_partido_jugador).
  const [matchTotals, setMatchTotals] = useState<Map<string, MatchTotals>>(new Map());
  useEffect(() => {
    let cancelled = false;
    fetchMatchTotals()
      .then(m => { if (!cancelled) setMatchTotals(m); })
      .catch(err => console.error('No se pudieron cargar las estadísticas de actas', err));
    return () => { cancelled = true; };
  }, []);

  const [objetivos, setObjetivos] = useState<ObjetivoIndividual[]>([]);
  useEffect(() => {
    let cancelled = false;
    objetivosIndividualesService.list()
      .then(d => { if (!cancelled) setObjetivos(d ?? []); })
      .catch(err => console.error('No se pudieron cargar los objetivos', err));
    return () => { cancelled = true; };
  }, []);

  const squad = useMemo<Player[]>(() => rawSquad.map(p => {
    const t = matchTotals.get(String(p.id)) ?? EMPTY_TOTALS;
    return { ...p, partidosJugados: t.pj, minutos: t.min, goles: t.goles };
  }), [rawSquad, matchTotals]);

  const stats = useMemo(() => {
    const ages = squad.map(ageOf).filter((a): a is number => a !== null);
    const ratingsOf = (k: keyof Player) => squad.map(p => p[k]).filter((v): v is number => typeof v === 'number' && v > 0);
    const byTeam = new Map<string, Player[]>();
    squad.forEach(p => {
      const k = p.equipo || 'Sin equipo';
      byTeam.set(k, [...(byTeam.get(k) ?? []), p]);
    });
    return {
      total: squad.length,
      aptos: squad.filter(p => p.estado === 'APTO').length,
      lesionados: squad.filter(p => p.estado === 'LESIONADO').length,
      residencia: squad.filter(p => p.residencia).length,
      edadMedia: avg(ages),
      goles: squad.reduce((a, p) => a + (p.goles ?? 0), 0),
      minutos: squad.reduce((a, p) => a + (p.minutos ?? 0), 0),
      partidos: squad.reduce((a, p) => a + (p.partidosJugados ?? 0), 0),
      ageBuckets: countBy(squad, p => { const a = ageOf(p); return a === null ? 'Sin dato' : `${a} años`; })
        .sort((a, b) => parseInt(a.label) - parseInt(b.label) || a.label.localeCompare(b.label)),
      byPosition: countBy(squad, p => p.posicion),
      byTeam: countBy(squad, p => p.equipo),
      byEstado: countBy(squad, p => p.estado === 'APTO' ? 'Apto' : p.estado === 'LESIONADO' ? 'Lesionado' : 'Otro'),
      byPerfil: countBy(squad, p => p.perfil === 'D' ? 'Diestro' : p.perfil === 'I' ? 'Zurdo' : p.perfil === 'A' ? 'Ambidiestro' : ''),
      byEtapa: countBy(squad, p => p.etapa || ''),
      byResidencia: countBy(squad, p => (p.residencia ? 'Residencia' : 'No residencia')),
      ratings: [
        { label: 'Técnica', value: avg(ratingsOf('ratingTecnica')) },
        { label: 'Táctica', value: avg(ratingsOf('ratingTactica')) },
        { label: 'Condicional', value: avg(ratingsOf('ratingCondicional')) },
        { label: 'Psicológico', value: avg(ratingsOf('ratingPsicologico')) },
        { label: 'Humano', value: avg(ratingsOf('ratingHumano')) },
      ],
      teams: [...byTeam.entries()]
        .map(([equipo, ps]) => ({
          equipo,
          jugadores: ps.length,
          duplicados: findDuplicates(ps),
          aptos: ps.filter(p => p.estado === 'APTO').length,
          lesionados: ps.filter(p => p.estado === 'LESIONADO').length,
          edad: avg(ps.map(ageOf).filter((a): a is number => a !== null)),
          goles: ps.reduce((a, p) => a + (p.goles ?? 0), 0),
          minutos: ps.reduce((a, p) => a + (p.minutos ?? 0), 0),
        }))
        .sort((a, b) => teamLevel(a.equipo) - teamLevel(b.equipo) || a.equipo.localeCompare(b.equipo, 'es', { numeric: true })),
      topGoles: [...squad].filter(p => (p.goles ?? 0) > 0).sort((a, b) => (b.goles ?? 0) - (a.goles ?? 0)).slice(0, RANKING_LIMIT),
      topMinutos: [...squad].filter(p => (p.minutos ?? 0) > 0).sort((a, b) => (b.minutos ?? 0) - (a.minutos ?? 0)).slice(0, RANKING_LIMIT),
    };
  }, [squad]);

  // Objetivos por equipo (nombre del equipo del jugador) y tipología, con semáforo.
  const objetivosPorEquipo = useMemo(() => {
    const teamOf = new Map(squad.map(p => [String(p.id), p.equipo || 'Sin equipo']));
    const rows = new Map<string, Record<string, { total: number; verde: number; naranja: number; rojo: number }>>();
    objetivos.forEach(o => {
      const team = teamOf.get(String(o.jugador_id));
      if (!team) return;
      const row = rows.get(team) ?? {};
      const cell = row[o.tipo] ?? { total: 0, verde: 0, naranja: 0, rojo: 0 };
      cell.total += 1;
      cell[o.estado] += 1;
      row[o.tipo] = cell;
      rows.set(team, row);
    });
    return [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }));
  }, [objetivos, squad]);

  if (squad.length === 0) {
    return (
      <div className="py-16 text-center">
        <i className="fa-solid fa-users text-3xl text-slate-200"></i>
        <p className="mt-3 text-sm font-semibold text-slate-400">No hay jugadores para mostrar con los filtros actuales</p>
      </div>
    );
  }

  if (mode === 'graficas') {
    // Partidos disputados por cada equipo = máximo de PJ entre sus jugadores (base del %).
    const teamMatches = new Map<string, number>();
    squad.forEach(p => {
      const k = p.equipo || 'Sin equipo';
      const pj = (matchTotals.get(String(p.id)) ?? EMPTY_TOTALS).pj;
      teamMatches.set(k, Math.max(teamMatches.get(k) ?? 0, pj));
    });
    // `base` devuelve el 100% de cada jugador según su equipo (partidos del equipo, o partidos × 90').
    const rank = (pick: (t: MatchTotals) => number, base?: (matches: number) => number) =>
      squad
        .map(p => {
          const value = pick(matchTotals.get(String(p.id)) ?? EMPTY_TOTALS);
          const b = base ? base(teamMatches.get(p.equipo || 'Sin equipo') ?? 0) : 0;
          return { label: p.nombre, value, pct: b > 0 ? (value / b) * 100 : undefined };
        })
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    const sum = (pick: (t: MatchTotals) => number) =>
      squad.reduce((a, p) => a + pick(matchTotals.get(String(p.id)) ?? EMPTY_TOTALS), 0);
    return (
      <div className="space-y-4 px-1 pb-24">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Partidos jugados" value={sum(t => t.pj)} icon="fa-flag-checkered" tone="bg-sky-600" />
        <Kpi label="Titularidades" value={sum(t => t.tit)} icon="fa-shirt" tone="bg-emerald-600" />
        <Kpi label="Minutos" value={sum(t => t.min).toLocaleString('es')} icon="fa-stopwatch" tone="bg-violet-600" />
        <Kpi label="Goles" value={sum(t => t.goles)} icon="fa-futbol" tone="bg-slate-800" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BarChart title="Partidos jugados" icon="fa-flag-checkered" data={rank(t => t.pj, m => m)} color="bg-sky-500" />
        <BarChart title="Titularidades" icon="fa-shirt" data={rank(t => t.tit, m => m)} color="bg-emerald-500" />
        <BarChart title="Minutos jugados" icon="fa-stopwatch" data={rank(t => t.min, m => m * 90)} color="bg-violet-500" />
        <BarChart title="Goles" icon="fa-futbol" data={rank(t => t.goles)} color="bg-slate-700" />
        <BarChart title="Jugadores por demarcación" icon="fa-location-dot" data={stats.byPosition} />
        <BarChart title="Jugadores por equipo" icon="fa-shield" data={stats.byTeam} color="bg-red-500" />
        <BarChart title="Estado" icon="fa-heart-pulse" data={stats.byEstado} color="bg-emerald-500" />
        <BarChart title="Distribución por edad" icon="fa-cake-candles" data={stats.ageBuckets} color="bg-amber-500" />
        <BarChart title="Perfil" icon="fa-shoe-prints" data={stats.byPerfil} color="bg-violet-500" />
        <BarChart title="Etapa" icon="fa-layer-group" data={stats.byEtapa} color="bg-sky-500" />
        <BarChart title="Residencia" icon="fa-bed" data={stats.byResidencia} color="bg-teal-500" />
      </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1 pb-24">
      {teamFilter && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTeamFilter(null)}
            title="Volver a todos los equipos"
            aria-label="Volver a todos los equipos"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <i className="fa-solid fa-arrow-left text-[11px]"></i>Volver
          </button>
          <span className="text-sm font-black text-slate-700">Dashboard · {teamFilter}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Jugadores" value={stats.total} icon="fa-users" />
        <Kpi label="Aptos" value={stats.aptos} icon="fa-circle-check" tone="bg-emerald-600" />
        <Kpi label="Lesionados" value={stats.lesionados} icon="fa-bandage" tone="bg-red-600" />
        <Kpi label="Residencia" value={stats.residencia} icon="fa-bed" tone="bg-teal-600" />
        <Kpi label="Edad media" value={stats.edadMedia ? stats.edadMedia.toFixed(1) : '—'} icon="fa-cake-candles" tone="bg-amber-600" />
        <Kpi label="Goles" value={stats.goles} icon="fa-futbol" tone="bg-slate-800" />
        <Kpi label="Partidos jugados" value={stats.partidos} icon="fa-flag-checkered" tone="bg-sky-600" />
        <Kpi label="Minutos" value={stats.minutos.toLocaleString('es')} icon="fa-stopwatch" tone="bg-violet-600" />
      </div>

      {stats.teams.some(t => t.jugadores > MAX_JUGADORES_EQUIPO) && (
        <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
          <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
          Hay equipos con más de {MAX_JUGADORES_EQUIPO} jugadores: {stats.teams.filter(t => t.jugadores > MAX_JUGADORES_EQUIPO).map(t => `${t.equipo} (+${t.jugadores - MAX_JUGADORES_EQUIPO})`).join(', ')}.
        </div>
      )}

      {classification && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <i className="fa-solid fa-chart-column text-blue-500"></i>Dashboard
          </h3>
          {classification(eq => setTeamFilter(eq === 'TODOS' ? null : eq))}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BarChart title="Demarcaciones" icon="fa-location-dot" data={stats.byPosition} />
        {stats.ratings.some(r => r.value) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <i className="fa-solid fa-star text-blue-500"></i>Valoración media (1-10)
          </h3>
          <ul className="space-y-2">
            {stats.ratings.map(r => (
              <li key={r.label} className="grid grid-cols-[90px_1fr_36px] items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">{r.label}</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (r.value / 10) * 100)}%` }} />
                </div>
                <span className="text-right font-black tabular-nums text-slate-700">{r.value ? r.value.toFixed(1) : '—'}</span>
              </li>
            ))}
          </ul>
        </section>
        )}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <i className="fa-solid fa-trophy text-blue-500"></i>Máximos goleadores
          </h3>
          {stats.topGoles.length === 0 ? <p className="text-xs text-slate-400">Sin goles registrados</p> : (
            <ol className="space-y-1.5 text-xs">
              {stats.topGoles.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-700">{i + 1}. {p.nombre} <span className="text-slate-400">· {p.equipo}</span></span>
                  <span className="font-black tabular-nums">{p.goles}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <i className="fa-solid fa-stopwatch text-blue-500"></i>Más minutos
          </h3>
          {stats.topMinutos.length === 0 ? <p className="text-xs text-slate-400">Sin minutos registrados</p> : (
            <ol className="space-y-1.5 text-xs">
              {stats.topMinutos.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-700">{i + 1}. {p.nombre} <span className="text-slate-400">· {p.equipo}</span></span>
                  <span className="font-black tabular-nums">{(p.minutos ?? 0).toLocaleString('es')}'</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <BarChart title="Estado" icon="fa-heart-pulse" data={stats.byEstado} color="bg-emerald-500" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <i className="fa-solid fa-bullseye text-blue-500"></i>Objetivos por equipo y tipología
          <span className="ml-auto flex items-center gap-2 font-semibold normal-case tracking-normal text-slate-400">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>verde
            <span className="h-2 w-2 rounded-full bg-orange-500"></span>naranja
            <span className="h-2 w-2 rounded-full bg-red-500"></span>rojo
          </span>
        </h3>
        {objetivosPorEquipo.length === 0 ? (
          <p className="px-4 py-3 text-xs text-slate-400">Sin objetivos registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-2">Equipo</th>
                  {TIPOS_OBJETIVO.map(t => <th key={t.value} className="px-2 py-2 text-center">{t.label}</th>)}
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {objetivosPorEquipo.map(([equipo, row]) => {
                  const total = TIPOS_OBJETIVO.reduce((a, t) => a + (row[t.value]?.total ?? 0), 0);
                  return (
                    <tr key={equipo} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-bold text-slate-700">{equipo}</td>
                      {TIPOS_OBJETIVO.map(t => {
                        const c = row[t.value];
                        return (
                          <td key={t.value} className="px-2 py-2 text-center tabular-nums">
                            {c ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-black text-slate-800">{c.total}</span>
                                <span className="text-[10px] font-bold">
                                  <span className="text-green-600">{c.verde}</span>/<span className="text-orange-500">{c.naranja}</span>/<span className="text-red-600">{c.rojo}</span>
                                </span>
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-black tabular-nums text-slate-800">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PlayedMatchesTable squad={squad} />

      <SquadStatsTable squad={squad} totals={matchTotals} />
    </div>
  );
};

export default SquadAnalytics;
