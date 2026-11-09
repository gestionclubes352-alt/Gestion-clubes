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


/** Minutos jugados por cada jugador en partidos (actas federativas). */
const PlayerMinutesCard: React.FC = () => {
  const [data, setData] = useState<{ name: string; min: number }[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const totals = await fetchMatchTotals();
        const ids = Array.from(totals.keys());
        if (ids.length === 0) { if (!cancelled) setData([]); return; }
        const { data: players, error } = await supabase.from('plantillas').select('id, nombre').in('id', ids);
        if (error) throw error;
        const rows = (players ?? [])
          .map((p: any) => ({ name: String(p.nombre ?? '—'), min: totals.get(String(p.id))?.min ?? 0 }))
          .filter(r => r.min > 0)
          .sort((a, b) => b.min - a.min);
        if (!cancelled) setData(rows);
      } catch (err) {
        console.error('No se pudieron cargar los minutos de los jugadores', err);
        if (!cancelled) setData([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const max = Math.max(1, ...(data ?? []).map(d => d.min));
  return (
    <Card title="Minutos de los jugadores" subtitle="Minutos jugados en partidos">
      {data === null ? (
        <p className="text-[11px] text-slate-400">Cargando…</p>
      ) : data.length === 0 ? (
        <p className="text-[11px] text-slate-400">Sin minutos registrados</p>
      ) : (
        <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto pr-1">
          {data.map(d => (
            <div key={d.name} className="grid grid-cols-[110px_1fr_36px] items-center gap-2" title={d.name}>
              <span className="truncate text-[10px] font-medium text-slate-500">{d.name}</span>
              <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
                <div className="h-full rounded-sm bg-violet-500" style={{ width: `${(d.min / max) * 100}%` }} />
              </div>
              <span className="text-right text-[10px] font-bold tabular-nums text-slate-600">{d.min.toLocaleString('es')}'</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

/** Gráficas laterales de la clasificación: minutos de jugadores, diferencia de goles y reparto G/E/P. */
const StandingsCharts: React.FC<StandingsChartsProps> = ({ rows, isOwn }) => {
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
    <div className="flex min-w-0 flex-col gap-4">
      <PlayerMinutesCard />

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
    </div>
  );
};

export default StandingsCharts;
