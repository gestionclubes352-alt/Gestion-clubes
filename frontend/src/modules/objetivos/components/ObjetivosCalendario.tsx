import React, { useMemo, useState } from 'react';
import type { ObjetivoIndividual } from '@shared/services/dataService';
import { ESTADOS_OBJETIVO, TIPOS_ACCION, TIPOS_OBJETIVO } from '../types';

interface ObjetivosCalendarioProps {
  objetivos: ObjetivoIndividual[];
  getJugadorNombre: (id: string) => string;
  getEquipoNombre: (id: string) => string;
  onSelect: (objetivo: ObjetivoIndividual, accionId?: string) => void;
}

type EventoKind = 'objetivo' | 'accion' | 'evaluacion';

interface Evento {
  key: string;
  kind: EventoKind;
  fecha: string;
  color: string;
  titulo: string;
  subtitulo: string;
  objetivo: ObjetivoIndividual;
  accionId?: string;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_VISIBLES = 3;

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const PALETA_JUGADORES = [
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#a855f7', '#0ea5e9',
];
const colorJugador = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETA_JUGADORES[h % PALETA_JUGADORES.length];
};
const estadoLabel = (estado?: string) => ESTADOS_OBJETIVO.find(e => e.value === estado)?.label || '';
const tipoObjetivoLabel = (tipo: string) => TIPOS_OBJETIVO.find(t => t.value === tipo)?.label || tipo;
const tipoAccionLabel = (tipo?: string) => TIPOS_ACCION.find(t => t.value === tipo)?.label || 'Reunión';

const KIND_ICON: Record<EventoKind, string> = {
  objetivo: 'fa-bullseye',
  accion: 'fa-handshake',
  evaluacion: 'fa-clipboard-check',
};

const KIND_LABEL: Record<EventoKind, string> = {
  objetivo: 'Objetivo',
  accion: 'Acción',
  evaluacion: 'Evaluación',
};

const ObjetivosCalendario: React.FC<ObjetivosCalendarioProps> = ({
  objetivos,
  getJugadorNombre,
  getEquipoNombre,
  onSelect,
}) => {
  const hoy = new Date();
  const hoyKey = toKey(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const [cursor, setCursor] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() });
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(hoyKey);
  const [mostrar, setMostrar] = useState<Record<EventoKind, boolean>>({
    objetivo: true,
    accion: true,
    evaluacion: true,
  });

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    const add = (e: Evento) => {
      if (!e.fecha || !mostrar[e.kind]) return;
      const dia = e.fecha.slice(0, 10);
      const lista = mapa.get(dia);
      if (lista) lista.push(e);
      else mapa.set(dia, [e]);
    };

    for (const o of objetivos) {
      const jugador = getJugadorNombre(o.jugador_id);
      const equipo = getEquipoNombre(o.equipo_id);
      const color = colorJugador(o.jugador_id);
      add({
        key: `o-${o.id}`,
        kind: 'objetivo',
        fecha: o.fecha,
        color,
        titulo: jugador,
        subtitulo: `${tipoObjetivoLabel(o.tipo)} · ${equipo}`,
        objetivo: o,
      });
      for (const a of o.acciones ?? []) {
        const esEvaluacion = a.categoria === 'evaluacion';
        add({
          key: `a-${o.id}-${a.id}`,
          kind: esEvaluacion ? 'evaluacion' : 'accion',
          fecha: a.fecha,
          color,
          titulo: jugador,
          subtitulo: esEvaluacion
            ? `Evaluación ${estadoLabel(a.estado).toLowerCase()} · ${equipo}`
            : `${tipoAccionLabel(a.tipo)} · ${equipo}`,
          objetivo: o,
          accionId: a.id,
        });
      }
    }
    return mapa;
  }, [objetivos, mostrar, getJugadorNombre, getEquipoNombre]);

  const celdas = useMemo(() => {
    const { year, month } = cursor;
    const primerDiaSemana = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
    const diasMes = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((primerDiaSemana + diasMes) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const fecha = new Date(year, month, 1 - primerDiaSemana + i);
      return {
        key: toKey(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
        dia: fecha.getDate(),
        delMes: fecha.getMonth() === month,
      };
    });
  }, [cursor]);

  const tituloMes = new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const moverMes = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const irAHoy = () => {
    setCursor({ year: hoy.getFullYear(), month: hoy.getMonth() });
    setDiaSeleccionado(hoyKey);
  };

  const eventosDiaSeleccionado = diaSeleccionado ? eventosPorDia.get(diaSeleccionado) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moverMes(-1)}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Mes anterior"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button
            type="button"
            onClick={() => moverMes(1)}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Mes siguiente"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
          <button
            type="button"
            onClick={irAHoy}
            className="px-3 h-8 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
          >
            Hoy
          </button>
          <h3 className="ml-2 text-lg font-black text-[var(--text-strong)] uppercase tracking-tighter">{tituloMes}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(KIND_LABEL) as EventoKind[]).map(kind => (
            <button
              key={kind}
              type="button"
              onClick={() => setMostrar(prev => ({ ...prev, [kind]: !prev[kind] }))}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
                mostrar[kind]
                  ? 'bg-white border-slate-300 text-slate-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
              }`}
            >
              <i className={`fa-solid ${KIND_ICON[kind]}`}></i>
              {KIND_LABEL[kind]}s
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="px-2 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map(celda => {
            const eventos = eventosPorDia.get(celda.key) ?? [];
            const esHoy = celda.key === hoyKey;
            const seleccionado = celda.key === diaSeleccionado;
            return (
              <div
                key={celda.key}
                role="button"
                tabIndex={0}
                onClick={() => setDiaSeleccionado(celda.key)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDiaSeleccionado(celda.key);
                  }
                }}
                className={`min-h-[96px] p-1.5 border-b border-r border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${
                  celda.delMes ? 'bg-white' : 'bg-slate-50/60'
                } ${seleccionado ? 'ring-2 ring-inset ring-[var(--accent)]/40' : ''}`}
              >
                <div className="flex justify-end mb-1">
                  <span
                    className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      esHoy
                        ? 'bg-[var(--accent)] text-white'
                        : celda.delMes
                          ? 'text-slate-600'
                          : 'text-slate-300'
                    }`}
                  >
                    {celda.dia}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {eventos.slice(0, MAX_VISIBLES).map(ev => (
                    <button
                      key={ev.key}
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelect(ev.objetivo, ev.accionId);
                      }}
                      title={`${KIND_LABEL[ev.kind]} · ${ev.titulo} · ${ev.subtitulo}`}
                      className="w-full flex items-center gap-1 px-1 py-0.5 rounded text-left text-[10px] font-semibold text-slate-700 hover:brightness-95"
                      style={{ backgroundColor: `${ev.color}22`, borderLeft: `3px solid ${ev.color}` }}
                    >
                      <i className={`fa-solid ${KIND_ICON[ev.kind]} text-[10px]`} style={{ color: ev.color }}></i>
                      <span className="truncate">{ev.titulo}</span>
                    </button>
                  ))}
                  {eventos.length > MAX_VISIBLES && (
                    <div className="text-[10px] font-bold text-slate-400 px-1">+{eventos.length - MAX_VISIBLES} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {diaSeleccionado && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            {new Date(`${diaSeleccionado}T12:00:00`).toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h4>
          {eventosDiaSeleccionado.length === 0 ? (
            <p className="text-sm text-slate-400">Sin eventos este día</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {eventosDiaSeleccionado.map(ev => (
                <li key={ev.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(ev.objetivo, ev.accionId)}
                    className="w-full flex items-center gap-3 py-2 text-left hover:bg-slate-50 rounded-lg px-2"
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <span className="font-black text-[var(--accent)] uppercase tracking-tighter truncate">{ev.titulo}</span>
                    <span className="text-sm text-slate-600 truncate">{ev.subtitulo}</span>
                    <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                      <i className={`fa-solid ${KIND_ICON[ev.kind]}`}></i>
                      {KIND_LABEL[ev.kind]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ObjetivosCalendario;
