import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@shared/services/supabaseClient';
import { fetchMatchTotals } from '../../plantilla/utils/matchTotals';

interface JugadorRow { id: string; jugador: string; equipo: string; pj: number; tit: number; min: number; goles: number; gc: number }

type SortKey = 'jugador' | 'equipo' | 'pj' | 'tit' | 'min' | 'goles' | 'gc';

const norm = (v?: string | null) =>
  (v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const COLUMNS: Array<{ key: SortKey; label: string; title?: string; numeric?: boolean }> = [
  { key: 'jugador', label: 'Jugador' },
  { key: 'equipo', label: 'Equipo' },
  { key: 'pj', label: 'PJ', title: 'Partidos jugados', numeric: true },
  { key: 'tit', label: 'Titular', title: 'Partidos como titular', numeric: true },
  { key: 'min', label: 'Min', title: 'Minutos jugados', numeric: true },
  { key: 'goles', label: 'Goles', numeric: true },
  { key: 'gc', label: 'GC', title: 'Goles recibidos', numeric: true },
];

/** Jugadores del club con sus estadísticas acumuladas en partidos (actas federativas). */
const JugadoresPanel: React.FC<{ equipo: string }> = ({ equipo }) => {
  const [rows, setRows] = useState<JugadorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'min', dir: -1 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const totals = await fetchMatchTotals();
        const ids = Array.from(totals.keys());
        if (ids.length === 0) { if (!cancelled) setRows([]); return; }
        const [{ data: players, error: pErr }, { data: equipos, error: eErr }] = await Promise.all([
          supabase.from('plantillas').select('id, nombre, equipo_id').in('id', ids),
          supabase.from('equipos').select('id, nombre, sub_equipo'),
        ]);
        if (pErr) throw pErr;
        if (eErr) throw eErr;
        const equipoById = new Map((equipos ?? []).map((e: any) => [String(e.id), String(e.sub_equipo || e.nombre || '')]));
        const mapped = (players ?? []).map((p: any) => {
          const t = totals.get(String(p.id));
          return {
            id: String(p.id),
            jugador: String(p.nombre ?? '—'),
            equipo: equipoById.get(String(p.equipo_id)) ?? '',
            pj: t?.pj ?? 0,
            tit: t?.tit ?? 0,
            min: t?.min ?? 0,
            goles: t?.goles ?? 0,
            gc: t?.gc ?? 0,
          };
        });
        if (!cancelled) setRows(mapped);
      } catch (e) {
        console.error('No se pudieron cargar las estadísticas de jugadores', e);
        if (!cancelled) { setError('No se pudieron cargar los jugadores'); setRows([]); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    const filtered = (rows ?? []).filter(r => equipo === 'TODOS' || !equipo || norm(r.equipo) === norm(equipo));
    return [...filtered].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
      return c * sort.dir || a.jugador.localeCompare(b.jugador, 'es');
    });
  }, [rows, equipo, sort]);

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'jugador' || key === 'equipo' ? 1 : -1 }));

  if (rows === null) {
    return <p className="py-10 text-center text-sm font-semibold text-slate-400"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Cargando jugadores…</p>;
  }
  if (error) return <p className="py-10 text-center text-sm font-semibold text-red-500">{error}</p>;
  if (visible.length === 0) {
    return <p className="py-10 text-center text-sm font-semibold text-slate-400">No hay estadísticas de jugadores para este equipo</p>;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs [&_td]:!text-xs [&_th]:!text-[10px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-3 py-2 w-8">#</th>
              {COLUMNS.map(c => (
                <th key={c.key} title={c.title} className={`px-3 py-2 ${c.numeric ? 'text-center' : ''}`}>
                  <button type="button" onClick={() => toggleSort(c.key)} className="font-black uppercase tracking-widest hover:text-slate-700">
                    {c.label}
                    {sort.key === c.key && <i className={`fa-solid fa-caret-${sort.dir === 1 ? 'up' : 'down'} ml-1`}></i>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                <td className="px-3 py-1.5 text-xs font-medium text-slate-700 lowercase first-letter:uppercase [word-spacing:0]"><span className="capitalize">{r.jugador.toLowerCase()}</span></td>
                <td className="px-3 py-1.5 text-xs font-medium text-slate-500">{r.equipo || '—'}</td>
                <td className="px-3 py-1.5 text-center text-xs font-medium text-slate-500 tabular-nums">{r.pj}</td>
                <td className="px-3 py-1.5 text-center text-xs font-medium text-slate-500 tabular-nums">{r.tit}</td>
                <td className="px-3 py-1.5 text-center text-xs font-medium text-slate-500 tabular-nums">{r.min.toLocaleString('es')}'</td>
                <td className="px-3 py-1.5 text-center text-xs tabular-nums font-semibold text-emerald-600">{r.goles}</td>
                <td className="px-3 py-1.5 text-center text-xs tabular-nums font-semibold text-red-500">{r.gc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default JugadoresPanel;
