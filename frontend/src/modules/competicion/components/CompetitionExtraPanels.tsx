import React, { useEffect, useMemo, useRef, useState } from 'react';
import { eventosCalendarioService } from '@shared/services/dataService';
import type { ActaPartido } from '@shared/services/rfefActasService';
import type { Match } from '../../partidos/types';
import ActaMatchSheet from '../../partidos/components/ActaMatchSheet';
import { CardIcon } from '@shared/components/MatchIcons';

/** Equipos internos del club (Primer Equipo, Juvenil A, Cadete B…): se resaltan en granate. */
const isInternalTeam = (name?: string): boolean => {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  return /^(primerequipo|filial|juvenil[a-d]|cadete[a-d]|infantil[a-d]|alevin[a-d])$/.test(n);
};

export const norm = (v?: string | null) =>
  (v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Orden de equipos: Primer Equipo, Juveniles, Cadetes, Infantiles, Alevines, resto. */
export const teamRank = (...names: Array<string | null | undefined>) => {
  const rankOne = (v?: string | null) => {
    const n = (v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const letter = (n.match(/\b([a-z])\b\s*$/)?.[1] ?? 'a').charCodeAt(0) - 97;
    if (/primer\s*equipo/.test(n)) return 0;
    if (/juvenil/.test(n)) return 10 + letter;
    if (/cadete/.test(n)) return 20 + letter;
    if (/infantil/.test(n)) return 30 + letter;
    if (/alevin/.test(n)) return 40 + letter;
    return 100;
  };
  return Math.min(...names.map(rankOne));
};

const fmtDate =(iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ───────────────────────── Horarios ─────────────────────────

interface HorariosPanelProps {
  matches: Match[];
  equipo: string;
}

/** Próximos partidos con fecha, hora y campo. */
const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const weekKey = (d: Date) => {
  const m = mondayOf(d);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
};
const weekLabel = (key: string) => {
  // key = lunes de la semana; se muestra el fin de semana (sáb–dom)
  const s = new Date(`${key}T00:00:00`);
  s.setDate(s.getDate() + 5);
  const e = new Date(s);
  e.setDate(e.getDate() + 1);
  const f = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  return `${f(s)} – ${f(e)}`;
};

export const HorariosPanel: React.FC<HorariosPanelProps> = ({ matches, equipo }) => {
  const [week, setWeek] = useState<string>('ALL');
  const allRows = useMemo(() => {
    // Los partidos del calendario federativo (readonly) vienen sin hora/campo; los partidos
    // cargados a mano sí los tienen pero con otro formato de jornada ("J8") y nombres.
    // Se fusionan por equipo interno + día + nº de jornada: se completan hora/campo y se evita el duplicado.
    const keyOf = (m: Match) =>
      `${norm(m.nombreInterno || m.team)}|${String(m.date || '').slice(0, 10)}|${String(m.jornada ?? '').replace(/\D/g, '')}`;
    const manualByKey = new Map<string, Match>();
    matches.forEach(m => {
      if (!m.readonly && (m.time || m.location)) manualByKey.set(keyOf(m), m);
    });
    const usedKeys = new Set<string>();
    const merged: Match[] = matches.map(m => {
      if (!m.readonly) return m;
      const key = keyOf(m);
      const manual = manualByKey.get(key);
      if (!manual) return m;
      usedKeys.add(key);
      return { ...m, time: m.time || manual.time, location: m.location || manual.location };
    }).filter(m => m.readonly || !usedKeys.has(keyOf(m)));

    return merged
      .filter(m => equipo === 'TODOS' || [m.team, m.nombreInterno, m.localTeam, m.visitorTeam].some(t => norm(t) === norm(equipo)))
      .sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
        || teamRank(a.nombreInterno, a.team, a.localTeam, a.visitorTeam) - teamRank(b.nombreInterno, b.team, b.localTeam, b.visitorTeam));
  }, [matches, equipo]);

  const weeks = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach(m => { const d = new Date(m.date); if (!isNaN(d.getTime())) set.add(weekKey(d)); });
    return Array.from(set).sort();
  }, [allRows]);

  const weekIdx = weeks.indexOf(week);

  // Semana actual; si no tiene partidos, la siguiente con partidos (o la última).
  const currentWeek = useMemo(() => {
    if (weeks.length === 0) return null;
    const k = weekKey(new Date());
    return weeks.find(w => w >= k) ?? weeks[weeks.length - 1];
  }, [weeks]);

  // Al abrir (y si la semana elegida deja de existir al cambiar de equipo) ir a la semana actual.
  const autoSet = useRef(false);
  useEffect(() => {
    if (!currentWeek) return;
    if (!autoSet.current || (week !== 'ALL' && !weeks.includes(week))) {
      autoSet.current = true;
      setWeek(currentWeek);
    }
  }, [currentWeek, weeks, week]);

  const rows = useMemo(
    () => (week === 'ALL' ? allRows : allRows.filter(m => { const d = new Date(m.date); return !isNaN(d.getTime()) && weekKey(d) === week; })),
    [allRows, week],
  );

  if (allRows.length === 0) {
    return <p className="py-10 text-center text-sm font-semibold text-slate-400">No hay partidos próximos programados</p>;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400" htmlFor="horarios-week">Fin de semana</label>
        <select
          id="horarios-week"
          value={week}
          onChange={e => setWeek(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700"
        >
          <option value="ALL">Todas</option>
          {weeks.map(w => <option key={w} value={w}>{weekLabel(w)}</option>)}
        </select>
        <button
          type="button"
          onClick={() => weekIdx > 0 && setWeek(weeks[weekIdx - 1])}
          disabled={weekIdx <= 0}
          aria-label="Semana anterior"
          title="Semana anterior"
          style={{ padding: 0, minHeight: 0 }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button
          type="button"
          onClick={() => weekIdx < weeks.length - 1 && setWeek(weeks[weekIdx + 1])}
          disabled={weekIdx >= weeks.length - 1}
          aria-label="Semana siguiente"
          title="Semana siguiente"
          style={{ padding: 0, minHeight: 0 }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <button
          type="button"
          onClick={() => currentWeek && setWeek(currentWeek)}
          disabled={!currentWeek || week === currentWeek}
          style={{ minHeight: 0 }}
          className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-100 disabled:cursor-default disabled:opacity-60"
        >
          Esta semana
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-2 py-2">Hora</th>
              <th className="px-2 py-2">Jor.</th>
              <th className="px-2 py-2">Partido</th>
              <th className="px-2 py-2">Campo</th>
              <th className="px-4 py-2">Competición</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const d = new Date(m.date);
              const wk = isNaN(d.getTime()) ? '' : weekKey(d);
              const pd = i > 0 ? new Date(rows[i - 1].date) : null;
              const prevWk = pd && !isNaN(pd.getTime()) ? weekKey(pd) : null;
              const showHeader = i === 0 || wk !== prevWk;
              return (
              <React.Fragment key={m.id}>
              {showHeader && wk && (
                <tr className="border-t border-slate-200 bg-slate-100">
                  <td colSpan={6} className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Fin de semana {weekLabel(wk)}
                  </td>
                </tr>
              )}
              <tr className="border-t border-slate-100">
                <td className="px-4 py-2 font-bold capitalize text-slate-700">{fmtDate(m.date)}</td>
                <td className="px-2 py-2 tabular-nums">{m.time || 'Pendiente'}</td>
                <td className="px-2 py-2 tabular-nums">{m.jornada || '—'}</td>
                <td className="px-2 py-2 font-semibold text-slate-700">
                  <span className={isInternalTeam(m.localTeam || m.opponent) ? 'font-black text-[#9f1239]' : ''}>{m.localTeam || m.opponent}</span>{' '}
                  <span className="text-slate-400">vs</span>{' '}
                  <span className={isInternalTeam(m.visitorTeam) ? 'font-black text-[#9f1239]' : ''}>{m.visitorTeam || ''}</span>
                </td>
                <td className="px-2 py-2 text-slate-500">{m.location || 'Pendiente'}</td>
                <td className="px-4 py-2 text-slate-500">{m.competition}</td>
              </tr>
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// ───────────────────── Actas y Sanciones ─────────────────────

export interface ActaRow {
  id: string;
  date: string;
  team: string;
  competition: string;
  jornada: string;
  acta: ActaPartido;
}

type Side = 'home' | 'away';

interface ActasDataProps {
  clubId?: string;
  equipo: string;
}

/** Carga las actas federativas (eventos_calendario.acta_fed) del club, filtradas por equipo. */
export const useActas = (clubId: string | undefined, equipo: string) => {
  const [rows, setRows] = useState<ActaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    eventosCalendarioService
      .list({ club_id: clubId, type: 'Partido' }, 'id,date,team,nombre_interno,competition,jornada,acta_fed')
      .then(data => {
        if (cancelled) return;
        const mapped = data
          .filter(r => r.acta_fed)
          .map(r => ({
            id: r.id,
            date: r.date,
            team: r.nombre_interno || r.team || '',
            competition: r.competition || '',
            jornada: r.jornada || '',
            acta: r.acta_fed as ActaPartido,
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRows(mapped);
      })
      .catch(e => !cancelled && setError(e instanceof Error ? e.message : 'No se pudieron cargar las actas'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [clubId]);

  const filtered = useMemo(
    () => (equipo === 'TODOS' ? rows : rows.filter(r => norm(r.team) === norm(equipo)
      || norm(r.acta.homeTeam.name) === norm(equipo) || norm(r.acta.awayTeam.name) === norm(equipo))),
    [rows, equipo]
  );
  return { rows: filtered, loading, error };
};

export const ownSideOf = (row: ActaRow): Side | null => {
  const t = norm(row.team);
  if (!t) return null;
  if (norm(row.acta.homeTeam.name) === t) return 'home';
  if (norm(row.acta.awayTeam.name) === t) return 'away';
  return null;
};

const StateMsg: React.FC<{ loading: boolean; error: string | null; empty: boolean; emptyText: string }> = ({ loading, error, empty, emptyText }) => {
  if (loading) return <p className="py-10 text-center text-sm font-semibold text-slate-400"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Cargando actas…</p>;
  if (error) return <p className="py-10 text-center text-sm font-semibold text-red-500">{error}</p>;
  if (empty) return <p className="py-10 text-center text-sm font-semibold text-slate-400">{emptyText}</p>;
  return null;
};

export const ActasPanel: React.FC<ActasDataProps> = ({ clubId, equipo }) => {
  const { rows, loading, error } = useActas(clubId, equipo);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rows.find(r => r.id === openId) ?? null;

  if (open) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:border-slate-400"
        >
          <i className="fa-solid fa-arrow-left"></i>Volver a actas
        </button>
        <ActaMatchSheet acta={open.acta} ownSide={ownSideOf(open)} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StateMsg loading={loading} error={error} empty={rows.length === 0} emptyText="No hay actas disponibles para este equipo" />
      <div className="grid gap-2">
        {rows.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => setOpenId(r.id)}
            className="grid items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 md:grid-cols-[110px_60px_minmax(0,1fr)_80px_minmax(0,1fr)]"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{r.acta.date || fmtDate(r.date)}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{r.jornada}</span>
            <span className={`truncate text-right text-sm ${ownSideOf(r) === 'home' ? 'font-black text-[#9f1239]' : 'font-semibold text-slate-700'}`}>{r.acta.homeTeam.name}</span>
            <span className="rounded-md bg-slate-800 px-2 py-1 text-center text-sm font-black tabular-nums text-white">{r.acta.score}</span>
            <span className={`truncate text-sm ${ownSideOf(r) === 'away' ? 'font-black text-[#9f1239]' : 'font-semibold text-slate-700'}`}>{r.acta.awayTeam.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

interface SancionRow {
  player: string;
  team: string;
  yellows: number;
  doubleYellows: number;
  reds: number;
}

export const SancionesPanel: React.FC<ActasDataProps> = ({ clubId, equipo }) => {
  const { rows, loading, error } = useActas(clubId, equipo);
  const [onlyOwn, setOnlyOwn] = useState(true);

  const sanciones = useMemo(() => {
    const map = new Map<string, SancionRow>();
    rows.forEach(r => {
      const own = ownSideOf(r);
      (['home', 'away'] as Side[]).forEach(side => {
        if (onlyOwn && side !== own) return;
        const team = side === 'home' ? r.acta.homeTeam : r.acta.awayTeam;
        team.cards.forEach(c => {
          const key = `${team.name}|${c.player}`;
          const row = map.get(key) ?? { player: c.player, team: team.name, yellows: 0, doubleYellows: 0, reds: 0 };
          if (c.type === 'yellow') row.yellows += 1;
          else if (c.type === 'second-yellow') row.doubleYellows += 1;
          else row.reds += 1;
          map.set(key, row);
        });
      });
    });
    return [...map.values()].sort(
      (a, b) => b.reds + b.doubleYellows - (a.reds + a.doubleYellows) || b.yellows - a.yellows || a.player.localeCompare(b.player, 'es')
    );
  }, [rows, onlyOwn]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Tarjetas según las actas · {rows.length} partidos
        </p>
        <div className="flex gap-2">
          {[{ v: true, l: 'Mi equipo' }, { v: false, l: 'Todos' }].map(o => (
            <button
              key={o.l}
              type="button"
              onClick={() => setOnlyOwn(o.v)}
              className={`h-8 rounded-lg px-3 text-[10px] font-black uppercase tracking-widest ${onlyOwn === o.v ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>
      <StateMsg loading={loading} error={error} empty={!loading && sanciones.length === 0} emptyText="No hay tarjetas registradas" />
      {sanciones.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-auto text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-2">Jugador</th>
                  <th className="px-3 py-2">Equipo</th>
                  <th className="px-3 py-2 text-center"><span className="inline-flex items-center gap-1"><CardIcon kind="yellow" className="w-2 h-3" />Amarillas</span></th>
                  <th className="px-3 py-2 text-center"><span className="inline-flex items-center gap-1"><CardIcon kind="yellow" className="w-2 h-3" /><CardIcon kind="red" className="w-2 h-3" />Doble amarilla</span></th>
                  <th className="px-4 py-2 text-center"><span className="inline-flex items-center gap-1"><CardIcon kind="red" className="w-2 h-3" />Rojas</span></th>
                </tr>
              </thead>
              <tbody>
                {sanciones.map(s => (
                  <tr key={`${s.team}|${s.player}`} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-bold text-slate-700">{s.player}</td>
                    <td className="px-3 py-2 text-slate-500">{s.team}</td>
                    <td className="px-3 py-2 text-center tabular-nums"><span className="rounded bg-yellow-100 px-2 py-0.5 font-black text-yellow-700">{s.yellows}</span></td>
                    <td className="px-3 py-2 text-center tabular-nums">{s.doubleYellows || '—'}</td>
                    <td className="px-4 py-2 text-center tabular-nums">{s.reds ? <span className="rounded bg-red-100 px-2 py-0.5 font-black text-red-700">{s.reds}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
