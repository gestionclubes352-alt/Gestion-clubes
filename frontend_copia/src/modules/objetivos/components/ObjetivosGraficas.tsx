import React, { useMemo } from 'react';
import type { ObjetivoIndividual } from '@shared/services/dataService';
import { TIPOS_OBJETIVO, ESTADOS_OBJETIVO, TIPOS_ACCION } from '../types';

interface Props {
  objetivos: ObjetivoIndividual[];
  getEquipoNombre: (equipoId: string) => string;
}

const RANGO_ESTADO: Record<string, number> = { verde: 0, naranja: 1, rojo: 2 };

const Card: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
    <div>
      <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 font-semibold mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const Vacio = () => <p className="text-xs text-slate-400 font-semibold">Sin datos todavía.</p>;

/** Barra horizontal simple: un solo tono, extremo redondeado de 4px, valor visible a la derecha. */
const BarraSimple: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => (
  <div className="grid grid-cols-[minmax(6rem,10rem)_1fr_2rem] items-center gap-3" title={`${label}: ${value}`}>
    <span className="text-xs font-bold text-slate-600 truncate">{label}</span>
    <div className="h-2.5 bg-slate-100 rounded-r-[4px] rounded-l-[2px] overflow-hidden">
      <div
        className="h-full bg-[var(--accent)] rounded-r-[4px]"
        style={{ width: `${max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0}%` }}
      />
    </div>
    <span className="text-xs font-black text-slate-700 text-right tabular-nums">{value}</span>
  </div>
);

const KPI: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-2xl font-black text-slate-800 tabular-nums mt-1">{value}</p>
  </div>
);

const ObjetivosGraficas: React.FC<Props> = ({ objetivos, getEquipoNombre }) => {
  const datos = useMemo(() => {
    const porEquipo = new Map<string, { nombre: string; total: number; estados: Record<string, number> }>();
    const porTipo: Record<string, number> = {};
    const porEstado: Record<string, number> = {};
    const accionesPorTipo: Record<string, number> = {};
    let totalAcciones = 0;
    let totalEvaluaciones = 0;
    let mejoran = 0;
    let igual = 0;
    let empeoran = 0;

    for (const o of objetivos) {
      const eq = porEquipo.get(String(o.equipo_id)) ?? {
        nombre: getEquipoNombre(o.equipo_id),
        total: 0,
        estados: {},
      };
      eq.total += 1;
      eq.estados[o.estado] = (eq.estados[o.estado] ?? 0) + 1;
      porEquipo.set(String(o.equipo_id), eq);

      porTipo[o.tipo] = (porTipo[o.tipo] ?? 0) + 1;
      porEstado[o.estado] = (porEstado[o.estado] ?? 0) + 1;

      for (const a of o.acciones ?? []) {
        if (a.categoria === 'evaluacion') {
          totalEvaluaciones += 1;
        } else {
          totalAcciones += 1;
          const t = a.tipo ?? 'reunion';
          accionesPorTipo[t] = (accionesPorTipo[t] ?? 0) + 1;
        }
      }

      const inicial = RANGO_ESTADO[o.estado_inicial ?? o.estado];
      const actual = RANGO_ESTADO[o.estado];
      if (actual < inicial) mejoran += 1;
      else if (actual > inicial) empeoran += 1;
      else igual += 1;
    }

    return {
      equipos: [...porEquipo.values()].sort((a, b) => b.total - a.total),
      porTipo,
      porEstado,
      accionesPorTipo,
      totalAcciones,
      totalEvaluaciones,
      mejoran,
      igual,
      empeoran,
    };
  }, [objetivos, getEquipoNombre]);

  if (objetivos.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <i className="fa-solid fa-chart-simple text-4xl text-slate-300 mb-4 block"></i>
        <p className="font-semibold">No hay objetivos que mostrar con los filtros actuales</p>
      </div>
    );
  }

  const maxTipo = Math.max(0, ...TIPOS_OBJETIVO.map(t => datos.porTipo[t.value] ?? 0));
  const maxEstado = Math.max(0, ...ESTADOS_OBJETIVO.map(e => datos.porEstado[e.value] ?? 0));
  const maxAccion = Math.max(0, ...TIPOS_ACCION.map(t => datos.accionesPorTipo[t.value] ?? 0));
  const maxEquipo = Math.max(1, ...datos.equipos.map(e => e.total));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Objetivos" value={objetivos.length} />
        <KPI label="Acciones" value={datos.totalAcciones} />
        <KPI label="Evaluaciones" value={datos.totalEvaluaciones} />
        <KPI label="En rojo" value={datos.porEstado.rojo ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Objetivos por equipo" subtitle="Reparto por estado actual">
          {datos.equipos.length === 0 ? (
            <Vacio />
          ) : (
            <>
              <div className="space-y-2.5">
                {datos.equipos.map(eq => (
                  <div key={eq.nombre} className="grid grid-cols-[minmax(6rem,10rem)_1fr_2rem] items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 truncate">{eq.nombre}</span>
                    <div className="flex gap-[2px] h-2.5" style={{ width: `${(eq.total / maxEquipo) * 100}%` }}>
                      {ESTADOS_OBJETIVO.map(({ value, label, color }) => {
                        const n = eq.estados[value] ?? 0;
                        if (!n) return null;
                        return (
                          <div
                            key={value}
                            title={`${eq.nombre} · ${label}: ${n}`}
                            className="h-full first:rounded-l-[2px] last:rounded-r-[4px]"
                            style={{ flexGrow: n, backgroundColor: color }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs font-black text-slate-700 text-right tabular-nums">{eq.total}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 pt-1">
                {ESTADOS_OBJETIVO.map(({ value, label, color }) => (
                  <span key={value} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Estado actual" subtitle="Nº de objetivos por estado">
          <div className="space-y-2.5">
            {ESTADOS_OBJETIVO.map(({ value, label, color }) => {
              const n = datos.porEstado[value] ?? 0;
              return (
                <div key={value} className="grid grid-cols-[minmax(6rem,10rem)_1fr_2rem] items-center gap-3" title={`${label}: ${n}`}>
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                  <div className="h-2.5 bg-slate-100 rounded-r-[4px] rounded-l-[2px] overflow-hidden">
                    <div
                      className="h-full rounded-r-[4px]"
                      style={{
                        width: `${maxEstado > 0 ? Math.max((n / maxEstado) * 100, n > 0 ? 2 : 0) : 0}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-700 text-right tabular-nums">{n}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Tipo de objetivo">
          <div className="space-y-2.5">
            {TIPOS_OBJETIVO.map(t => (
              <BarraSimple key={t.value} label={t.label} value={datos.porTipo[t.value] ?? 0} max={maxTipo} />
            ))}
          </div>
        </Card>

        <Card title="Acciones por tipo" subtitle={`${datos.totalAcciones} acciones en total`}>
          {datos.totalAcciones === 0 ? (
            <Vacio />
          ) : (
            <div className="space-y-2.5">
              {TIPOS_ACCION.map(t => (
                <BarraSimple key={t.value} label={t.label} value={datos.accionesPorTipo[t.value] ?? 0} max={maxAccion} />
              ))}
            </div>
          )}
        </Card>

        <Card title="Evolución" subtitle="Estado actual frente al estado inicial">
          <div className="grid grid-cols-3 gap-3">
            <KPI label="Mejoran" value={datos.mejoran} />
            <KPI label="Sin cambio" value={datos.igual} />
            <KPI label="Empeoran" value={datos.empeoran} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ObjetivosGraficas;
