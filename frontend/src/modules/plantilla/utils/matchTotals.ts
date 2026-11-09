import { supabase } from '@shared/services/supabaseClient';

/** Acumulado de partidos de un jugador (actas de la Federación). */
export interface MatchTotals { pj: number; tit: number; min: number; goles: number; gc: number; am: number; ro: number }

export const EMPTY_TOTALS: MatchTotals = { pj: 0, tit: 0, min: 0, goles: 0, gc: 0, am: 0, ro: 0 };
const PAGE_SIZE = 1000; // límite de filas por petición de Supabase

/** Carga y agrega `estadisticas_partido_jugador` por jugador (paginado: hay más de 1000 filas). */
export const fetchMatchTotals = async (): Promise<Map<string, MatchTotals>> => {
  const totals = new Map<string, MatchTotals>();
  // `goles_recibidos` llega con una migración posterior: si aún no existe, seguimos sin ella
  // para no perder PJ/TIT/MIN/GOLES.
  let columns = 'jugador_id, titular, minutos, goles, goles_recibidos, amarillas, rojas';
  for (let from = 0; ; from += PAGE_SIZE) {
    let { data, error } = await supabase
      .from('estadisticas_partido_jugador')
      .select(columns)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error && columns.includes('goles_recibidos')) {
      console.warn('Falta la columna goles_recibidos (migración 20261109120000); se omite', error.message);
      columns = 'jugador_id, titular, minutos, goles, amarillas, rojas';
      ({ data, error } = await supabase
        .from('estadisticas_partido_jugador')
        .select(columns)
        .order('id')
        .range(from, from + PAGE_SIZE - 1));
    }
    if (error) throw error;
    for (const r of (data ?? []) as any[]) {
      if (!r.titular && !(r.minutos > 0)) continue; // convocado sin jugar: no cuenta como partido
      const t = totals.get(r.jugador_id) ?? { ...EMPTY_TOTALS };
      t.pj += 1;
      t.tit += r.titular ? 1 : 0;
      t.min += r.minutos ?? 0;
      t.goles += r.goles ?? 0;
      t.gc += r.goles_recibidos ?? 0;
      t.am += r.amarillas ?? 0;
      t.ro += r.rojas ?? 0;
      totals.set(r.jugador_id, t);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return totals;
};
