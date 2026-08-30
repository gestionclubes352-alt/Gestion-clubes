import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import type { Jugador, RpeRespuesta, WellnessRespuesta } from '@shared/services/dataService';
import { plantillasService, equiposService, rpeRespuestasService, wellnessRespuestasService } from '@shared/services';
import { conZScoresPorTendencia, colorHeat } from '../zscore';
import { nombreMostrable, type FilaMediciones } from '../types';
import TendenciaChart, { type SerieTendencia } from './TendenciaChart';

interface ColumnaTabla {
  key: keyof FilaMediciones;
  label: string;
  tipo: 'texto' | 'heat' | 'badge' | 'nota';
  invertido?: boolean;
}

const COLUMNAS_TABLA: ColumnaTabla[] = [
  { key: 'nombre', label: 'Jugador', tipo: 'texto' },
  { key: 'wellness', label: 'Wellness', tipo: 'heat', invertido: false },
  { key: 'sueno', label: 'Sueño', tipo: 'heat', invertido: false },
  { key: 'musc', label: 'Cansancio Musc.', tipo: 'heat', invertido: true },
  { key: 'aerob', label: 'Cansancio Aeróbico', tipo: 'heat', invertido: true },
  { key: 'rpe', label: 'RPE', tipo: 'heat', invertido: true },
  { key: 'animo', label: 'Ánimo', tipo: 'heat', invertido: false },
  { key: 'motivacion', label: 'Motivación', tipo: 'heat', invertido: false },
  { key: 'molestia', label: 'Molestia', tipo: 'badge' },
  { key: 'comentarios', label: 'Comentarios', tipo: 'nota' },
];

const METRICAS: Record<string, { label: string; color: string; fuente: 'rpe' | 'wellness' }> = {
  rpe: { label: 'RPE', color: '#e24b4a', fuente: 'rpe' },
  animo: { label: 'Ánimo', color: '#378add', fuente: 'rpe' },
  motivacion: { label: 'Motivación', color: '#3b6d11', fuente: 'rpe' },
  sueno: { label: 'Sueño', color: '#8b5cf6', fuente: 'wellness' },
  musc: { label: 'Cansancio musc.', color: '#ba7517', fuente: 'wellness' },
  aerob: { label: 'Cansancio aeróbico', color: '#0891b2', fuente: 'wellness' },
};

const formatearFecha = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const celda = (valor: number | null | undefined, decimales = 0) =>
  valor === null || valor === undefined ? '—' : valor.toFixed(decimales);

function construirWellnessCompuesto(respuestas: WellnessRespuesta[]) {
  const conCompuesto = respuestas.map((w) => {
    const invertidos = [w.musc, w.aerob].filter((v): v is number => v !== null && v !== undefined).map((v) => 11 - v);
    const positivos = [w.sueno, ...invertidos].filter((v): v is number => v !== null && v !== undefined);
    const wellness = positivos.length ? positivos.reduce((a, b) => a + b, 0) / positivos.length : null;
    return { ...w, wellness };
  });

  return conZScoresPorTendencia(conCompuesto as any, [['wellness' as any, 'z_wellness']]);
}

const AnalisisMedicionesView: React.FC = () => {
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const esJugador = perfil?.rol === 'Jugador';
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [rpeData, setRpeData] = useState<Array<RpeRespuesta & Record<string, number | null>>>([]);
  const [wellnessData, setWellnessData] = useState<Array<WellnessRespuesta & Record<string, number | null>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [jugadorSel, setJugadorSel] = useState<string | null>(null);
  const [metricas, setMetricas] = useState<Set<string>>(new Set(['rpe', 'animo', 'motivacion']));
  const [orden, setOrden] = useState<{ col: keyof FilaMediciones; dir: 'asc' | 'desc' }>({ col: 'nombre', dir: 'asc' });
  const [filaEditando, setFilaEditando] = useState<FilaMediciones | null>(null);
  const [edicion, setEdicion] = useState<Record<string, number | string | undefined>>({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  const cargarDatos = async (esPrimeraCarga: boolean) => {
    try {
      if (esPrimeraCarga) setLoading(true);
      setError(null);
      const [equipos, rpeRaw, wellnessRaw] = await Promise.all([
        equiposService.list(perfil?.club_id ? { club_id: perfil.club_id } : undefined),
        rpeRespuestasService.list(),
        wellnessRespuestasService.list(),
      ]);
      const primerEquipo = (equipos || []).find((e) => e.nombre?.trim().toLowerCase() === 'primer equipo');
      const jugadoresPrimerEquipo = primerEquipo
        ? await plantillasService.list({ equipo_id: primerEquipo.id })
        : [];
      const jugadoresTodos = jugadoresPrimerEquipo?.length ? jugadoresPrimerEquipo : await plantillasService.list();
      const jugadoresData = esJugador
        ? (jugadoresTodos || []).filter((j) => j.id === perfil?.jugador_id)
        : jugadoresTodos;
      setJugadores(jugadoresData || []);

      const rpeFiltrado = esJugador ? (rpeRaw || []).filter((r) => r.jugador_id === perfil?.jugador_id) : (rpeRaw || []);
      const wellnessFiltrado = esJugador ? (wellnessRaw || []).filter((w) => w.jugador_id === perfil?.jugador_id) : (wellnessRaw || []);

      const rpeConZ = conZScoresPorTendencia(rpeFiltrado, [
        ['rpe' as any, 'z_rpe'],
        ['animo' as any, 'z_animo'],
        ['motivacion' as any, 'z_motivacion'],
      ]);
      setRpeData(rpeConZ as any);

      const wellnessConZ = construirWellnessCompuesto(wellnessFiltrado);
      const wellnessConTodosZ = conZScoresPorTendencia(wellnessConZ as any, [
        ['sueno' as any, 'z_sueno'],
        ['musc' as any, 'z_musc'],
        ['aerob' as any, 'z_aerob'],
      ]);
      setWellnessData(wellnessConTodosZ as any);

      if (esPrimeraCarga) {
        const dias = Array.from(new Set([
          ...rpeFiltrado.map((r) => r.fecha),
          ...wellnessFiltrado.map((w) => w.fecha),
        ])).sort().reverse();
        setFecha(dias[0] || null);
        setJugadorSel((jugadoresData || [])[0]?.id || null);
      }
    } catch (err) {
      console.error('Error cargando mediciones:', err);
      setError('Error al cargar los datos de mediciones');
    } finally {
      if (esPrimeraCarga) setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos(true);
  }, [esJugador, perfil?.jugador_id, perfil?.club_id]);

  const abrirEdicion = (fila: FilaMediciones) => {
    setFilaEditando(fila);
    setEdicion({
      rpe: fila.rpe ?? undefined,
      animo: fila.animo ?? undefined,
      motivacion: fila.motivacion ?? undefined,
      sueno: fila.sueno ?? undefined,
      musc: fila.musc ?? undefined,
      aerob: fila.aerob ?? undefined,
    });
  };

  const guardarEdicion = async () => {
    if (!filaEditando) return;
    setGuardandoEdicion(true);
    try {
      if (filaEditando.rpe_id) {
        await rpeRespuestasService.update(filaEditando.rpe_id, {
          rpe: edicion.rpe === undefined ? null : Number(edicion.rpe),
          animo: edicion.animo === undefined ? null : Number(edicion.animo),
          motivacion: edicion.motivacion === undefined ? null : Number(edicion.motivacion),
        } as any);
      }
      if (filaEditando.wellness_id) {
        await wellnessRespuestasService.update(filaEditando.wellness_id, {
          sueno: edicion.sueno === undefined ? null : Number(edicion.sueno),
          musc: edicion.musc === undefined ? null : Number(edicion.musc),
          aerob: edicion.aerob === undefined ? null : Number(edicion.aerob),
        } as any);
      }
      setFilaEditando(null);
      await cargarDatos(false);
    } catch (err) {
      console.error('Error editando registro:', err);
      setError(err instanceof Error ? err.message : 'Error al editar el registro');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const borrarFila = async (fila: FilaMediciones) => {
    if (!window.confirm(`¿Borrar el registro de ${fila.nombre} del ${fecha ? formatearFecha(fecha) : ''}?`)) return;
    setBorrandoId(fila.jugador_id);
    try {
      if (fila.rpe_id) await rpeRespuestasService.remove(fila.rpe_id);
      if (fila.wellness_id) await wellnessRespuestasService.remove(fila.wellness_id);
      await cargarDatos(false);
    } catch (err) {
      console.error('Error borrando registro:', err);
      setError(err instanceof Error ? err.message : 'Error al borrar el registro');
    } finally {
      setBorrandoId(null);
    }
  };

  const nombrePorId = useMemo(() => {
    const m = new Map<string, string>();
    jugadores.forEach((j) => m.set(j.id, nombreMostrable(j)));
    return m;
  }, [jugadores]);

  const jugadoresOrdenados = useMemo(
    () => [...jugadores].sort((a, b) => nombreMostrable(a).localeCompare(nombreMostrable(b), 'es')),
    [jugadores]
  );

  const dias = useMemo(() => {
    const set = new Set<string>();
    rpeData.forEach((r) => set.add(r.fecha));
    wellnessData.forEach((w) => set.add(w.fecha));
    return Array.from(set).sort().reverse();
  }, [rpeData, wellnessData]);

  const ultimaPorJugador = <T extends { jugador_id: string; fecha: string; created_at?: string }>(
    respuestas: T[],
    fechaSel: string | null
  ) => {
    const mapa = new Map<string, T>();
    respuestas
      .filter((r) => r.fecha === fechaSel)
      .forEach((r) => {
        const previa = mapa.get(r.jugador_id);
        if (!previa || (r.created_at || '') > (previa.created_at || '')) mapa.set(r.jugador_id, r);
      });
    return mapa;
  };

  const filas = useMemo<FilaMediciones[]>(() => {
    const rpeMapa = ultimaPorJugador(rpeData, fecha);
    const wellnessMapa = ultimaPorJugador(wellnessData, fecha);
    const idsJugadores = new Set([...rpeMapa.keys(), ...wellnessMapa.keys()]);

    const construidas = Array.from(idsJugadores).map((jid) => {
      const r = rpeMapa.get(jid);
      const w = wellnessMapa.get(jid);
      const molestia = r?.molestia || w?.molestias || w?.zona_cargada || null;
      const partesComentario: string[] = [];
      if (r?.molestia) partesComentario.push(`RPE: ${r.molestia}`);
      const wellnessTexto = [w?.zona_cargada, w?.molestias].filter(Boolean) as string[];
      const wellnessUnico = [...new Set(wellnessTexto)];
      if (wellnessUnico.length) partesComentario.push(`Wellness: ${wellnessUnico.join(' / ')}`);
      if (w?.comentario) partesComentario.push(w.comentario);

      return {
        jugador_id: jid,
        rpe_id: r?.id ?? null,
        wellness_id: w?.id ?? null,
        nombre: nombrePorId.get(jid) || '(desconocido)',
        wellness: (w as any)?.wellness ?? null,
        sueno: w?.sueno ?? null,
        musc: w?.musc ?? null,
        aerob: w?.aerob ?? null,
        rpe: r?.rpe ?? null,
        animo: r?.animo ?? null,
        motivacion: r?.motivacion ?? null,
        molestia,
        comentarios: partesComentario.length ? partesComentario.join(' · ') : null,
        z_wellness: (w as any)?.z_wellness ?? null,
        z_sueno: w?.z_sueno ?? null,
        z_musc: w?.z_musc ?? null,
        z_aerob: w?.z_aerob ?? null,
        z_rpe: r?.z_rpe ?? null,
        z_animo: r?.z_animo ?? null,
        z_motivacion: r?.z_motivacion ?? null,
      } as FilaMediciones;
    });

    construidas.sort((a, b) => {
      const va = a[orden.col];
      const vb = b[orden.col];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string' && typeof vb === 'string') {
        return orden.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return orden.dir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    return construidas;
  }, [rpeData, wellnessData, fecha, nombrePorId, orden]);

  const faltantes = useMemo(() => {
    if (!fecha) return { rpe: [] as string[], wellness: [] as string[] };
    const rpeHoy = new Set(rpeData.filter((r) => r.fecha === fecha).map((r) => r.jugador_id));
    const wellnessHoy = new Set(wellnessData.filter((w) => w.fecha === fecha).map((w) => w.jugador_id));
    return {
      rpe: jugadores.filter((j) => !rpeHoy.has(j.id)).map((j) => nombreMostrable(j)),
      wellness: jugadores.filter((j) => !wellnessHoy.has(j.id)).map((j) => nombreMostrable(j)),
    };
  }, [rpeData, wellnessData, jugadores, fecha]);

  const seriesChart = useMemo<SerieTendencia[]>(() => {
    if (!jugadorSel) return [];
    const rpePorDia = new Map(rpeData.filter((r) => r.jugador_id === jugadorSel).map((r) => [r.fecha, r]));
    const wellnessPorDia = new Map(wellnessData.filter((w) => w.jugador_id === jugadorSel).map((w) => [w.fecha, w]));
    const diasAsc = [...dias].sort();

    return Array.from(metricas).map((key) => {
      const def = METRICAS[key];
      const fuente = def.fuente === 'rpe' ? rpePorDia : wellnessPorDia;
      return {
        key,
        label: def.label,
        color: def.color,
        valores: diasAsc.map((d) => {
          const fila = fuente.get(d) as any;
          return fila?.[key] ?? null;
        }),
      };
    });
  }, [jugadorSel, metricas, rpeData, wellnessData, dias]);

  const diasAsc = useMemo(() => [...dias].sort(), [dias]);

  const toggleMetrica = (key: string) => {
    setMetricas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleOrden = (col: keyof FilaMediciones) => {
    setOrden((prev) => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  };

  const celdaColumna = (col: ColumnaTabla, fila: FilaMediciones) => {
    const valor = fila[col.key];
    if (col.tipo === 'texto') {
      return <td key={col.key} className="font-black text-[var(--accent)] uppercase tracking-tight text-left px-3 py-2">{valor as string}</td>;
    }
    if (col.tipo === 'badge') {
      return (
        <td key={col.key} className="text-center px-3 py-2" title={(valor as string) || undefined}>
          {valor ? '🔴' : '🟢'}
        </td>
      );
    }
    if (col.tipo === 'nota') {
      return (
        <td key={col.key} className="text-xs text-slate-500 italic px-3 py-2 max-w-[220px] truncate" title={(valor as string) || undefined}>
          {(valor as string) || '—'}
        </td>
      );
    }
    const z = fila[`z_${col.key}` as keyof FilaMediciones] as number | null;
    const bg = colorHeat(z, !!col.invertido);
    return (
      <td key={col.key} className="text-center px-3 py-2 font-semibold" style={{ background: bg }} title={z !== null && z !== undefined ? `Z: ${z.toFixed(2)}` : undefined}>
        {celda(valor as number | null)}
      </td>
    );
  };

  const filaEquipo = () => {
    const media = (key: keyof FilaMediciones) => {
      const valores = filas.map((f) => f[key]).filter((v): v is number => typeof v === 'number');
      return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
    };
    return (
      <tr className="font-bold bg-slate-50 border-b-2 border-slate-200">
        {COLUMNAS_TABLA.map((col) => {
          if (col.tipo === 'texto') return <td key={col.key} className="px-3 py-2 text-left">EQUIPO</td>;
          if (col.tipo === 'badge' || col.tipo === 'nota') return <td key={col.key} className="px-3 py-2 text-center">—</td>;
          const valor = media(col.key);
          return <td key={col.key} className="px-3 py-2 text-center">{valor === null ? '—' : valor.toFixed(1)}</td>;
        })}
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <i className="fa-solid fa-spinner animate-spin text-4xl text-[var(--accent)]"></i>
          <p className="text-slate-600 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          MEDICIONES · RPE &amp; WELLNESS
        </h2>
        <button
          onClick={() => navigate('/mediciones/registro')}
          className="bg-[var(--accent)] text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2.5 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all whitespace-nowrap"
        >
          <i className="fa-solid fa-clipboard-list"></i> Rellenar formulario
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>{error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {dias.map((d) => (
          <button
            key={d}
            onClick={() => setFecha(d)}
            className={`flex-none px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
              d === fecha ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}
          >
            {formatearFecha(d)}
          </button>
        ))}
        {dias.length === 0 && <p className="text-sm text-slate-400 italic">Sin respuestas registradas todavía</p>}
      </div>

      {fecha && !esJugador && (
        <div className="flex flex-wrap gap-3">
          <div className={`flex-1 min-w-[220px] rounded-2xl border p-3 text-sm ${faltantes.rpe.length === 0 ? 'bg-[var(--accent)]/10 border-transparent text-[var(--accent)]' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <strong className="block text-[11px] uppercase tracking-widest opacity-80 mb-1.5">Sin RPE hoy</strong>
            <span className="font-medium text-slate-700">{faltantes.rpe.length === 0 ? 'Todos han respondido ✓' : faltantes.rpe.join(', ')}</span>
          </div>
          <div className={`flex-1 min-w-[220px] rounded-2xl border p-3 text-sm ${faltantes.wellness.length === 0 ? 'bg-[var(--accent)]/10 border-transparent text-[var(--accent)]' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <strong className="block text-[11px] uppercase tracking-widest opacity-80 mb-1.5">Sin Wellness hoy</strong>
            <span className="font-medium text-slate-700">{faltantes.wellness.length === 0 ? 'Todos han respondido ✓' : faltantes.wellness.join(', ')}</span>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-black text-[var(--text-strong)] mb-3">
          Respuestas del {fecha ? formatearFecha(fecha) : '—'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200">
                {COLUMNAS_TABLA.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleOrden(col.key)}
                    className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none whitespace-nowrap"
                  >
                    {col.label}{' '}
                    <span className={orden.col === col.key ? 'text-[var(--accent)]' : 'opacity-40'}>
                      {orden.col === col.key ? (orden.dir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  </th>
                ))}
                {!esJugador && (
                  <th className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr><td colSpan={COLUMNAS_TABLA.length + (esJugador ? 0 : 1)} className="text-center py-8 text-slate-400 italic">Sin respuestas ese día</td></tr>
              ) : (
                <>
                  {filaEquipo()}
                  {filas.map((fila) => (
                    <tr
                      key={fila.jugador_id}
                      onClick={() => setJugadorSel(fila.jugador_id)}
                      className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${fila.jugador_id === jugadorSel ? 'bg-[var(--accent)]/5' : ''}`}
                    >
                      {COLUMNAS_TABLA.map((col) => celdaColumna(col, fila))}
                      {!esJugador && (
                        <td className="px-3 py-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => abrirEdicion(fila)}
                              title="Editar registro"
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button
                              onClick={() => borrarFila(fila)}
                              disabled={borrandoId === fila.jugador_id}
                              title="Borrar registro"
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-50"
                            >
                              {borrandoId === fila.jugador_id ? (
                                <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                              ) : (
                                <i className="fa-solid fa-trash text-xs"></i>
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
          El color compara a cada jugador con <strong>su tendencia reciente</strong> (sus últimas ~10 respuestas), no con el equipo ni con todo su histórico.
          En RPE y cansancio, más bajo de lo habitual en él es mejor (verde). En ánimo, sueño, motivación y wellness, más alto de lo habitual en él es mejor (verde).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-black text-[var(--text-strong)] mb-3">Tendencia por jugador</h3>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {!esJugador && (
            <select
              value={jugadorSel ?? ''}
              onChange={(e) => setJugadorSel(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold"
            >
              {jugadoresOrdenados.map((j) => (
                <option key={j.id} value={j.id}>{nombreMostrable(j)}</option>
              ))}
            </select>
          )}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(METRICAS).map(([key, def]) => {
              const activa = metricas.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleMetrica(key)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all"
                  style={activa ? { background: def.color, borderColor: def.color, color: '#fff' } : { borderColor: '#e2e5eb', color: '#6b7280' }}
                >
                  {def.label}
                </button>
              );
            })}
          </div>
        </div>
        <TendenciaChart dias={diasAsc} series={seriesChart} />
      </div>

      {filaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFilaEditando(null)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[var(--text-strong)] uppercase tracking-tighter">
                Editar registro · {filaEditando.nombre}
              </h3>
              <button onClick={() => setFilaEditando(null)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {filaEditando.rpe_id && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RPE del entrenamiento</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['rpe', 'animo', 'motivacion'] as const).map((campo) => (
                    <div key={campo}>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">{campo}</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={edicion[campo] ?? ''}
                        onChange={(e) => setEdicion((prev) => ({ ...prev, [campo]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold text-center focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filaEditando.wellness_id && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wellness diario</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['sueno', 'musc', 'aerob'] as const).map((campo) => (
                    <div key={campo}>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">{campo}</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={edicion[campo] ?? ''}
                        onChange={(e) => setEdicion((prev) => ({ ...prev, [campo]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold text-center focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!filaEditando.rpe_id && !filaEditando.wellness_id && (
              <p className="text-sm text-slate-400 italic">Sin registro editable para este jugador.</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setFilaEditando(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={guardandoEdicion}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all disabled:opacity-50"
              >
                {guardandoEdicion ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalisisMedicionesView;
