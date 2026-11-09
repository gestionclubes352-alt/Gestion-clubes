import React, { useEffect, useMemo, useState } from 'react';
import { eventosCalendarioService } from '@shared/services/dataService';
import type { ActaPartido } from '@shared/services/rfefActasService';
import type { Match } from '../../partidos/types';
import ActaMatchSheet from '../../partidos/components/ActaMatchSheet';
import { CardIcon } from '@shared/components/MatchIcons';

const norm = (v?: string | null) =>
  (v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const fmtDate = (iso?: string | null) => {
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
export const HorariosPanel: React.FC<HorariosPanelProps> = ({ matches, equipo }) => {
  const rows = useMemo(() => {
    const now = Date.now() - 24 * 3600 * 1000;
    return matches
      .filter(m => m.status === 'Upcoming' || new Date(m.date).getTime() >= now)
      .filter(m => equipo === 'TODOS' || [m.team, m.nombreInterno, m.localTeam, m.visitorTeam].some(t => norm(t) === norm(equipo)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [matches, equipo]);

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm font-semibold text-slate-400">No hay partidos próximos programados</p>;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
            {rows.map(m => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-bold capitalize text-slate-700">{fmtDate(m.date)}</td>
                <td className="px-2 py-2 tabular-nums">{m.time || 'Pendiente'}</td>
                <td className="px-2 py-2 tabular-nums">{m.jornada || '—'}</td>
                <td className="px-2 py-2 font-semibold text-slate-700">{m.localTeam || m.opponent} <span className="text-slate-400">vs</span> {m.visitorTeam || ''}</td>
                <td className="px-2 py-2 text-slate-500">{m.location || 'Pendiente'}</td>
                <td className="px-4 py-2 text-slate-500">{m.competition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// ───────────────────── Actas y Sanciones ─────────────────────

interface ActaRow {
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
const useActas = (clubId: string | undefined, equipo: string) => {
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

const ownSideOf = (row: ActaRow): Side | null => {
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
            <span className="truncate text-right text-sm font-semibold text-slate-700">{r.acta.homeTeam.name}</span>
            <span className="rounded-md bg-slate-800 px-2 py-1 text-center text-sm font-black tabular-nums text-white">{r.acta.score}</span>
            <span className="truncate text-sm font-semibold text-slate-700">{r.acta.awayTeam.name}</span>
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
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-2">Jugador</th>
                  <th className="px-2 py-2">Equipo</th>
                  <th className="px-2 py-2 text-center"><span className="inline-flex items-center gap-1"><CardIcon kind="yellow" className="w-2 h-3" />Amarillas</span></th>
                  <th className="px-2 py-2 text-center"><span className="inline-flex items-center gap-1"><CardIcon kind="yellow" className="w-2 h-3" /><CardIcon kind="red" className="w-2 h-3" />Doble amarilla</span></th>
                  <th className="px-4 py-2 text-center"><span className="inline-flex items-center gap-1"><CardIcon kind="red" className="w-2 h-3" />Rojas</span></th>
                </tr>
              </thead>
              <tbody>
                {sanciones.map(s => (
                  <tr key={`${s.team}|${s.player}`} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-bold text-slate-700">{s.player}</td>
                    <td className="px-2 py-2 text-slate-500">{s.team}</td>
                    <td className="px-2 py-2 text-center tabular-nums"><span className="rounded bg-yellow-100 px-2 py-0.5 font-black text-yellow-700">{s.yellows}</span></td>
                    <td className="px-2 py-2 text-center tabular-nums">{s.doubleYellows || '—'}</td>
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
