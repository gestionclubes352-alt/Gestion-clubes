import React, { useEffect, useMemo, useState } from 'react';
import type { RpeRespuesta, WellnessRespuesta } from '@shared/services/dataService';
import { rpeRespuestasService, wellnessRespuestasService } from '@shared/services';
import { conZScoresPorTendencia, colorHeat } from '@modules/mediciones/zscore';
import TendenciaChart, { type SerieTendencia } from '@modules/mediciones/components/TendenciaChart';

interface PlayerMedicionesSectionProps {
  playerId: string;
}

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

const celda = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : valor.toFixed(0);

const PlayerMedicionesSection: React.FC<PlayerMedicionesSectionProps> = ({ playerId }) => {
  const [rpeData, setRpeData] = useState<Array<RpeRespuesta & Record<string, number | null>>>([]);
  const [wellnessData, setWellnessData] = useState<Array<WellnessRespuesta & Record<string, number | null>>>([]);
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<Set<string>>(new Set(['rpe', 'animo', 'motivacion']));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [rpeRaw, wellnessRaw] = await Promise.all([
          rpeRespuestasService.list(),
          wellnessRespuestasService.list(),
        ]);
        if (cancelled) return;

        const rpeFiltrado = (rpeRaw || []).filter((r) => r.jugador_id === playerId);
        const wellnessFiltrado = (wellnessRaw || []).filter((w) => w.jugador_id === playerId);

        const rpeConZ = conZScoresPorTendencia(rpeFiltrado, [
          ['rpe' as any, 'z_rpe'],
          ['animo' as any, 'z_animo'],
          ['motivacion' as any, 'z_motivacion'],
        ]);
        setRpeData(rpeConZ as any);

        const wellnessConZ = conZScoresPorTendencia(wellnessFiltrado, [
          ['sueno' as any, 'z_sueno'],
          ['musc' as any, 'z_musc'],
          ['aerob' as any, 'z_aerob'],
        ]);
        setWellnessData(wellnessConZ as any);
      } catch (err) {
        console.error('No se pudieron cargar las mediciones del jugador', err);
        if (!cancelled) {
          setRpeData([]);
          setWellnessData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  const dias = useMemo(() => {
    const set = new Set<string>();
    rpeData.forEach((r) => set.add(r.fecha));
    wellnessData.forEach((w) => set.add(w.fecha));
    return Array.from(set).sort();
  }, [rpeData, wellnessData]);

  const ultimoRpe = rpeData.length
    ? [...rpeData].sort((a, b) => (a.fecha + (a.created_at || '')).localeCompare(b.fecha + (b.created_at || '')))[rpeData.length - 1]
    : null;
  const ultimoWellness = wellnessData.length
    ? [...wellnessData].sort((a, b) => (a.fecha + (a.created_at || '')).localeCompare(b.fecha + (b.created_at || '')))[wellnessData.length - 1]
    : null;
  const ultimaFecha = [ultimoRpe?.fecha, ultimoWellness?.fecha].filter(Boolean).sort().reverse()[0] || null;

  const seriesChart = useMemo<SerieTendencia[]>(() => {
    const rpePorDia = new Map(rpeData.map((r) => [r.fecha, r]));
    const wellnessPorDia = new Map(wellnessData.map((w) => [w.fecha, w]));

    return Array.from(metricas).map((key) => {
      const def = METRICAS[key];
      const fuente = def.fuente === 'rpe' ? rpePorDia : wellnessPorDia;
      return {
        key,
        label: def.label,
        color: def.color,
        valores: dias.map((d) => {
          const fila = fuente.get(d) as any;
          return fila?.[key] ?? null;
        }),
      };
    });
  }, [metricas, rpeData, wellnessData, dias]);

  const toggleMetrica = (key: string) => {
    setMetricas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const resumenCeldas = [
    { key: 'rpe', label: 'RPE', valor: ultimoRpe?.rpe, z: (ultimoRpe as any)?.z_rpe, invertido: true },
    { key: 'animo', label: 'Ánimo', valor: ultimoRpe?.animo, z: (ultimoRpe as any)?.z_animo, invertido: false },
    { key: 'motivacion', label: 'Motivación', valor: ultimoRpe?.motivacion, z: (ultimoRpe as any)?.z_motivacion, invertido: false },
    { key: 'sueno', label: 'Sueño', valor: ultimoWellness?.sueno, z: (ultimoWellness as any)?.z_sueno, invertido: false },
    { key: 'musc', label: 'Cansancio Musc.', valor: ultimoWellness?.musc, z: (ultimoWellness as any)?.z_musc, invertido: true },
    { key: 'aerob', label: 'Cansancio Aeróbico', valor: ultimoWellness?.aerob, z: (ultimoWellness as any)?.z_aerob, invertido: true },
  ];

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
        <p className="text-xs font-bold text-slate-400 text-center py-2">Cargando mediciones...</p>
      </div>
    );
  }

  if (!ultimoRpe && !ultimoWellness) {
    return null;
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <i className="fa-solid fa-heart-pulse mr-2"></i>
          Mediciones · RPE &amp; Wellness
        </span>
        {ultimaFecha && (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Última respuesta: {formatearFecha(ultimaFecha)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {resumenCeldas.map((c) => (
          <div key={c.key}>
            <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest truncate">{c.label}</label>
            <div
              className="w-full rounded-lg px-2 py-1.5 text-sm font-black text-center"
              style={{ background: colorHeat(c.z ?? null, c.invertido) }}
              title={c.z !== null && c.z !== undefined ? `Z: ${Number(c.z).toFixed(2)}` : undefined}
            >
              {celda(c.valor)}
            </div>
          </div>
        ))}
      </div>

      {dias.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(METRICAS).map(([key, def]) => {
              const activa = metricas.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMetrica(key)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all"
                  style={activa ? { background: def.color, borderColor: def.color, color: '#fff' } : { borderColor: '#e2e5eb', color: '#6b7280' }}
                >
                  {def.label}
                </button>
              );
            })}
          </div>
          <TendenciaChart dias={dias} series={seriesChart} />
        </>
      )}
    </div>
  );
};

export default PlayerMedicionesSection;
