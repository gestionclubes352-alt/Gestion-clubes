import React, { useEffect, useState } from 'react';
import { supabase } from '@shared/services/supabaseClient';
import { fetchMatchTotals } from '../../plantilla/utils/matchTotals';

export interface StandingsChartRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

interface StandingsChartsProps {
  rows: StandingsChartRow[];
  isOwn: (team: string) => boolean;
  /** 'players': estadísticas de jugadores (columna lateral). 'teams': gráficas por equipo (bajo la tabla). */
  part?: 'players' | 'teams';
}

const OWN = '#9f1239';
const NEUTRAL = '#94a3b8';
const GOOD = '#10b981';
const BAD = '#f87171';
const DRAW = '#fbbf24';

const Card: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">{title}</p>
    {subtitle && <p className="mb-3 text-[10px] font-semibold text-slate-400">{subtitle}</p>}
    {children}
  </div>
);

const shortName = (name: string) => {
  const clean = name.replace(/[-.,]?\s*(S\.A\.D\.|C\.D\.|U\.D\.|C\.F\.|S\.D\.)/gi, '').replace(/\s+/g, ' ').trim();
  return clean.length > 16 ? `${clean.slice(0, 15)}…` : clean;
};


type PlayerRow = { name: string; goles: number; tit: number; min: number };

/** Goles, titularidades y minutos de cada jugador en partidos (actas federativas). */
const PlayerStatsCards: React.FC<{ show: Array<'goles' | 'tit' | 'min'> }> = ({ show }) => {
  const [data, setData] = useState<PlayerRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const totals = await fetchMatchTotals();
        const ids = Array.from(totals.keys());
        if (ids.length === 0) { if (!cancelled) setData([]); return; }
        const { data: players, error } = await supabase.from('plantillas').select('id, nombre').in('id', ids);
        if (error) throw error;
        const rows = (players ?? []).map((p: any) => {
          const t = totals.get(String(p.id));
          return { name: String(p.nombre ?? '—'), goles: t?.goles ?? 0, tit: t?.tit ?? 0, min: t?.min ?? 0 };
        });
        if (!cancelled) setData(rows);
      } catch (err) {
        console.error('No se pudieron cargar las estadísticas de los jugadores', err);
        if (!cancelled) setData([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const renderCard = (title: string, subtitle: string, key: 'goles' | 'tit' | 'min', barClass: string, suffix = '') => {
    const rows = (data ?? []).filter(r => r[key] > 0).sort((a, b) => b[key] - a[key]);
    const max = Math.max(1, ...rows.map(r => r[key]));
    return (
      <Card title={title} subtitle={subtitle}>
        {data === null ? (
          <p className="text-[11px] text-slate-400">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-[11px] text-slate-400">Sin datos registrados</p>
        ) : (
          <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto pr-1">
            {rows.map(d => (
              <div key={d.name} className="grid grid-cols-[110px_1fr_36px] items-center gap-2" title={d.name}>
                <span className="truncate text-[10px] font-medium text-slate-500">{d.name}</span>
                <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
                  <div className={`h-full rounded-sm ${barClass}`} style={{ width: `${(d[key] / max) * 100}%` }} />
                </div>
                <span className="text-right text-[10px] font-bold tabular-nums text-slate-600">{d[key].toLocaleString('es')}{suffix}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <>
      {show.includes('goles') && renderCard('Goles de los jugadores', 'Goles marcados en partidos', 'goles', 'bg-emerald-500')}
      {show.includes('tit') && renderCard('Titularidades', 'Partidos como titular', 'tit', 'bg-blue-500')}
      {show.includes('min') && renderCard('Minutos de los jugadores', 'Minutos jugados en partidos', 'min', 'bg-violet-500', "'")}
    </>
  );
};

/** Gráficas laterales de la clasificación: minutos de jugadores, diferencia de goles y reparto G/E/P. */
const StandingsCharts: React.FC<StandingsChartsProps> = ({ rows, isOwn, part = 'players' }) => {
  if (part === 'players') return <div className="flex min-w-0 flex-col gap-4"><PlayerStatsCards show={['goles', 'min']} /></div>;
  const played = rows.filter(r => r.played > 0);
  if (played.length === 0) return null;

  // --- Diferencia de goles ---
  const diffs = [...played]
    .map(r => ({ team: r.team, dg: r.goalsFor - r.goalsAgainst, own: isOwn(r.team) }))
    .sort((a, b) => b.dg - a.dg);
  const maxAbs = Math.max(1, ...diffs.map(d => Math.abs(d.dg)));

  // --- Reparto G/E/P ---
  const byPoints = [...played].sort((a, b) => b.points - a.points);

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-2">
      <Card title="Diferencia de goles" subtitle="Ordenado de mayor a menor">
        <div className="flex flex-col gap-1">
          {diffs.map(d => (
            <div key={d.team} className="grid grid-cols-[96px_1fr_28px] items-center gap-2" title={d.team}>
              <span className={`truncate text-[10px] ${d.own ? 'font-black text-[#9f1239]' : 'font-medium text-slate-500'}`}>{shortName(d.team)}</span>
              <div className="relative h-3">
                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200" />
                <div
                  className="absolute inset-y-0 rounded-sm"
                  style={{
                    background: d.own ? OWN : d.dg >= 0 ? GOOD : BAD,
                    width: `${(Math.abs(d.dg) / maxAbs) * 50}%`,
                    left: d.dg >= 0 ? '50%' : `${50 - (Math.abs(d.dg) / maxAbs) * 50}%`,
                  }}
                />
              </div>
              <span className="text-right text-[10px] font-bold tabular-nums text-slate-600">{d.dg > 0 ? `+${d.dg}` : d.dg}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Victorias, empates y derrotas" subtitle="Reparto de resultados por equipo">
        <div className="flex flex-col gap-1">
          {byPoints.map(r => (
            <div key={r.team} className="grid grid-cols-[96px_1fr] items-center gap-2" title={`${r.team}: ${r.won}G ${r.drawn}E ${r.lost}P`}>
              <span className={`truncate text-[10px] ${isOwn(r.team) ? 'font-black text-[#9f1239]' : 'font-medium text-slate-500'}`}>{shortName(r.team)}</span>
              <div className="flex h-3 overflow-hidden rounded-sm bg-slate-100">
                <div style={{ width: `${(r.won / r.played) * 100}%`, background: GOOD }} />
                <div style={{ width: `${(r.drawn / r.played) * 100}%`, background: DRAW }} />
                <div style={{ width: `${(r.lost / r.played) * 100}%`, background: BAD }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: GOOD }} />Ganados</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: DRAW }} />Empates</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: BAD }} />Perdidos</span>
        </div>
      </Card>

      <div className="min-w-0 md:col-span-2"><PlayerStatsCards show={['tit']} /></div>
    </div>
  );
};

export default StandingsCharts;
