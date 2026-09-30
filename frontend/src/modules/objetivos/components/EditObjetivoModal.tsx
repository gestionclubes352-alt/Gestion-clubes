import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Jugador, Equipo } from '@shared/services/dataService';
import type { ObjetivoIndividualFormData, AccionObjetivo, TipoAccionObjetivo, EstadoObjetivoIndividual } from '../types';
import { TIPOS_OBJETIVO, ESTADOS_OBJETIVO, TIPOS_ACCION } from '../types';
import { removeObjetivoDocumento } from '@shared/services/objetivoDocumentoService';
import DocumentoAdjuntoField from './DocumentoAdjuntoField';
import VideoYouTubeField from './VideoYouTubeField';

/** Estado actual: el de la última evaluación (por fecha; a igual fecha, la añadida después) o, si no hay, el inicial. */
const calcularEstadoActual = (data: ObjetivoIndividualFormData): EstadoObjetivoIndividual => {
  const ultima = (data.acciones ?? [])
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.categoria === 'evaluacion' && a.estado)
    .sort((x, y) => (x.a.fecha || '').localeCompare(y.a.fecha || '') || x.i - y.i)
    .pop();
  return ultima?.a.estado ?? data.estado_inicial ?? data.estado;
};

const EditObjetivoModal: React.FC<{
  isOpen: boolean;
  objetivo: ObjetivoIndividualFormData | null;
  jugadores: Jugador[];
  equipos: Pick<Equipo, 'id' | 'nombre'>[];
  /** Nombre del jugador a mostrar en vez del select, cuando el jugador ya viene fijado (p.ej. desde su ficha). */
  jugadorNombreFijo?: string;
  onClose: () => void;
  onSave: (data: ObjetivoIndividualFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  /** Qué parte del historial destacar al abrir (p. ej. al pulsar el nº de acciones/evaluaciones en la tabla). */
  enfoque?: 'acciones' | 'evaluaciones';
  /** Id de una acción/evaluación concreta a destacar (p. ej. al pulsarla en el calendario). */
  accionDestacadaId?: string;
}> = ({ isOpen, objetivo, jugadores, equipos, jugadorNombreFijo, onClose, onSave, onDelete, enfoque, accionDestacadaId }) => {
  const destacada = (id: string, categoria: 'acciones' | 'evaluaciones') =>
    accionDestacadaId ? id === accionDestacadaId : enfoque === categoria;
  const historialRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<ObjetivoIndividualFormData>({
    equipo_id: '',
    jugador_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    tipo: 'deportivo',
    estado: 'verde',
    estado_inicial: 'verde',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subidasVideo, setSubidasVideo] = useState(0);
  const handleVideoBusy = useCallback((busy: boolean) => setSubidasVideo(n => Math.max(0, n + (busy ? 1 : -1))), []);

  useEffect(() => {
    if (objetivo) {
      // Objetivos anteriores a las evaluaciones: su estado guardado es el inicial.
      setFormData({ ...objetivo, estado_inicial: objetivo.estado_inicial ?? objetivo.estado });
    } else {
      setFormData({
        equipo_id: '',
        jugador_id: '',
        fecha: new Date().toISOString().slice(0, 10),
        tipo: 'deportivo',
        estado: 'verde',
        estado_inicial: 'verde',
      });
    }
    setError(null);
  }, [objetivo, isOpen]);

  // Lleva la vista al primer elemento destacado (tras renderizar el formulario con el objetivo cargado).
  useEffect(() => {
    if (!isOpen || (!enfoque && !accionDestacadaId)) return;
    const t = window.setTimeout(() => {
      historialRef.current
        ?.querySelector('[data-destacado="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [isOpen, enfoque, accionDestacadaId, objetivo]);

  const jugadoresDelEquipo = formData.equipo_id
    ? jugadores.filter(j => String(j.equipo_id) === String(formData.equipo_id))
    : jugadores;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'equipo_id') {
      setFormData(prev => ({ ...prev, equipo_id: value, jugador_id: '' }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const addAccion = () => {
    const nueva: AccionObjetivo = {
      id: nuevoId(),
      fecha: new Date().toISOString().slice(0, 10),
      categoria: 'accion',
      tipo: 'reunion',
      detalle: '',
    };
    setFormData(prev => ({ ...prev, acciones: [...(prev.acciones ?? []), nueva] }));
  };

  const addEvaluacion = () => {
    const nueva: AccionObjetivo = {
      id: nuevoId(),
      fecha: new Date().toISOString().slice(0, 10),
      categoria: 'evaluacion',
      estado: 'verde',
      detalle: '',
    };
    setFormData(prev => ({ ...prev, acciones: [...(prev.acciones ?? []), nueva] }));
  };

  const updateAccion = (id: string, patch: Partial<AccionObjetivo>) => {
    setFormData(prev => ({
      ...prev,
      acciones: (prev.acciones ?? []).map(a => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const removeAccion = (id: string) => {
    const doc = (formData.acciones ?? []).find(a => a.id === id)?.documento;
    if (doc) removeObjetivoDocumento(doc.path).catch(() => {});
    setFormData(prev => ({ ...prev, acciones: (prev.acciones ?? []).filter(a => a.id !== id) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!jugadorNombreFijo && (!formData.equipo_id || !formData.jugador_id)) {
      setError('Selecciona equipo y jugador.');
      return;
    }
    if (!formData.fecha) {
      setError('La fecha es obligatoria.');
      return;
    }

    try {
      setLoading(true);
      await onSave({ ...formData, estado: calcularEstadoActual(formData) });
      onClose();
    } catch (err) {
      console.error('Error al guardar objetivo', err);
      const msg = (err as { message?: string } | null)?.message;
      setError(msg || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id || !onDelete) return;
    if (window.confirm('¿Eliminar este objetivo individual?')) {
      try {
        setLoading(true);
        await onDelete(formData.id);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  // Acciones y evaluaciones comparten lista, ordenadas por fecha (estable: a igual fecha, por orden de alta).
  const historial = (formData.acciones ?? [])
    .map((a, i) => ({ a, i }))
    .sort((x, y) => (x.a.fecha || '').localeCompare(y.a.fecha || '') || x.i - y.i)
    .map(({ a }) => a);
  const estadoActual = calcularEstadoActual(formData);
  // Solo se elige a mano al crear el objetivo (y mientras no haya evaluaciones); después lo marca la última evaluación.
  const estadoActualEditable = !formData.id && !(formData.acciones ?? []).some(a => a.categoria === 'evaluacion');
  // Numeración independiente: ACCIÓN 1, 2… y EVALUACIÓN 1, 2…
  const numeros: Record<string, number> = {};
  let nAcc = 0;
  let nEval = 0;
  historial.forEach(a => {
    numeros[a.id] = a.categoria === 'evaluacion' ? ++nEval : ++nAcc;
  });
  // Evolución: estado inicial y después el de cada evaluación (ya ordenadas por fecha).
  const infoEstado = (v: EstadoObjetivoIndividual) => ESTADOS_OBJETIVO.find(e => e.value === v);
  const evolucion: { etiqueta: string; color: string; fecha?: string }[] = [];
  const estadoInicial = formData.estado_inicial ?? formData.estado;
  if (estadoInicial && infoEstado(estadoInicial)) {
    evolucion.push({ etiqueta: `Inicial: ${infoEstado(estadoInicial)!.label}`, color: infoEstado(estadoInicial)!.color, fecha: formData.fecha });
  }
  historial.forEach(a => {
    const e = a.categoria === 'evaluacion' && a.estado ? infoEstado(a.estado) : undefined;
    if (e) evolucion.push({ etiqueta: `Eval. ${numeros[a.id]}: ${e.label}`, color: e.color, fecha: a.fecha });
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-bullseye"></i>
            {formData.id ? 'EDITAR OBJETIVO' : 'NUEVO OBJETIVO'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto flex-1">
          <div className="space-y-4">
          {jugadorNombreFijo ? (
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Jugador</label>
              <p className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-100 rounded-xl">{jugadorNombreFijo}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Equipo</label>
                <select
                  name="equipo_id"
                  value={formData.equipo_id}
                  onChange={handleChange}
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Selecciona...</option>
                  {equipos.map(eq => (
                    <option key={eq.id} value={String(eq.id)}>{eq.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Jugador</label>
                <select
                  name="jugador_id"
                  value={formData.jugador_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.equipo_id}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
                >
                  <option value="">Selecciona...</option>
                  {jugadoresDelEquipo.map(j => (
                    <option key={j.id} value={String(j.id)}>{j.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha</label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de objetivo</label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              >
                {TIPOS_OBJETIVO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado actual</label>
            <div
              className="flex items-center gap-4"
              title={estadoActualEditable ? 'Al crear el objetivo, este estado también queda como estado inicial' : 'Se calcula a partir de la última evaluación'}
            >
              {ESTADOS_OBJETIVO.map(({ value, label, color }) => {
                const sel = estadoActual === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!estadoActualEditable}
                    onClick={() => setFormData(prev => ({ ...prev, estado: value, estado_inicial: value }))}
                    title={label}
                    className={`flex items-center gap-2 ${estadoActualEditable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span
                      className="w-8 h-8 rounded-full border-2 block transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor: sel ? '#1e293b' : 'transparent',
                        boxShadow: sel ? `0 0 0 3px ${color}33` : 'none',
                        opacity: sel ? 1 : 0.45,
                      }}
                    />
                    <span className={`text-xs font-bold ${sel ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Objetivo</label>
            <input
              type="text"
              name="nombre_objetivo"
              value={formData.nombre_objetivo ?? ''}
              onChange={handleChange}
              maxLength={150}
              placeholder="Nombre del objetivo"
              className="w-full border-2 border-amber-300 bg-amber-50 rounded-xl px-4 py-3 text-base font-black text-amber-800 uppercase tracking-tight focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Detalle</label>
            <textarea
              name="detalle"
              value={formData.detalle ?? ''}
              onChange={handleChange}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Resumen de evolución</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {evolucion.length === 0 ? (
                <span className="text-xs font-semibold text-slate-400">Sin estado todavía</span>
              ) : evolucion.map((paso, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <i className="fa-solid fa-arrow-right text-[10px] text-slate-300"></i>}
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-600"
                    title={paso.fecha}
                  >
                    <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: paso.color }} />
                    {paso.etiqueta}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
              <span><i className="fa-solid fa-list-check text-[var(--accent)] mr-1"></i>{nAcc} {nAcc === 1 ? 'acción' : 'acciones'}</span>
              <span><i className="fa-solid fa-clipboard-check text-indigo-600 mr-1"></i>{nEval} {nEval === 1 ? 'evaluación' : 'evaluaciones'}</span>
            </div>
          </div>
          </div>

          <div ref={historialRef}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones y evaluaciones</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addAccion}
                  className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all"
                >
                  <i className="fa-solid fa-plus mr-1"></i>
                  Añadir acción
                </button>
                <button
                  type="button"
                  onClick={addEvaluacion}
                  className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <i className="fa-solid fa-plus mr-1"></i>
                  Añadir evaluación
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="border border-slate-300 rounded-xl p-3 space-y-3 bg-white">
                <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                  ESTADO INICIAL <span className="text-slate-400 font-bold normal-case tracking-normal">· {formData.fecha || '—'}</span>
                </p>
                <div className="flex items-center gap-4">
                  {ESTADOS_OBJETIVO.map(({ value, label, color }) => {
                    const sel = (formData.estado_inicial ?? formData.estado) === value;
                    return (
                      <div
                        key={value}
                        title="El estado inicial se fija al crear el objetivo y no se puede cambiar"
                        className="flex items-center gap-2 cursor-default"
                      >
                        <span
                          className="w-7 h-7 rounded-full border-2 block transition-all"
                          style={{
                            backgroundColor: color,
                            borderColor: sel ? '#1e293b' : 'transparent',
                            boxShadow: sel ? `0 0 0 3px ${color}33` : 'none',
                            opacity: sel ? 1 : 0.45,
                          }}
                        />
                        <span className={`text-xs font-bold ${sel ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            {historial.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold">Sin acciones ni evaluaciones todavía.</p>
            ) : (
              <div className="space-y-3">
                {historial.map(a => a.categoria === 'evaluacion' ? (
                  <div
                    key={a.id}
                    data-destacado={destacada(a.id, 'evaluaciones')}
                    className={`rounded-xl p-3 space-y-3 transition-shadow ${
                      destacada(a.id, 'evaluaciones')
                        ? 'border-2 border-[var(--accent)] bg-[var(--accent)]/5 shadow-md'
                        : 'border border-indigo-200 border-l-4 border-l-indigo-500 bg-indigo-50/40'
                    }`}
                  >
                    <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest shadow-sm">
                      <i className="fa-solid fa-clipboard-check"></i>
                      EVALUACIÓN {numeros[a.id]}
                    </p>
                    <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha</label>
                        <input
                          type="date"
                          value={a.fecha}
                          onChange={e => updateAccion(a.id, { fecha: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--accent)] bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAccion(a.id)}
                        title="Quitar evaluación"
                        className="w-9 h-9 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</label>
                      <div className="flex items-center gap-4">
                        {ESTADOS_OBJETIVO.map(({ value, label, color }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => updateAccion(a.id, { estado: value })}
                            title={label}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="w-7 h-7 rounded-full border-2 block transition-all"
                              style={{
                                backgroundColor: color,
                                borderColor: a.estado === value ? '#1e293b' : 'transparent',
                                boxShadow: a.estado === value ? `0 0 0 3px ${color}33` : 'none',
                                opacity: a.estado === value ? 1 : 0.45,
                              }}
                            />
                            <span className={`text-xs font-bold ${a.estado === value ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Comentario</label>
                      <textarea
                        value={a.detalle ?? ''}
                        onChange={e => updateAccion(a.id, { detalle: e.target.value })}
                        rows={2}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--accent)] bg-white"
                      />
                    </div>
                    <DocumentoAdjuntoField documento={a.documento} onChange={doc => updateAccion(a.id, { documento: doc })} />
                    <VideoYouTubeField
                      videoUrl={a.video_url}
                      titulo={`Objetivo individual - Evaluación ${numeros[a.id]} (${a.fecha})`}
                      onChange={url => updateAccion(a.id, { video_url: url })}
                      onBusyChange={handleVideoBusy}
                    />
                  </div>
                ) : (
                  <div
                    key={a.id}
                    data-destacado={destacada(a.id, 'acciones')}
                    className={`rounded-xl p-3 space-y-3 transition-shadow ${
                      destacada(a.id, 'acciones')
                        ? 'border-2 border-[var(--accent)] bg-[var(--accent)]/5 shadow-md'
                        : 'border border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <p className="text-[11px] font-black text-[var(--accent)] uppercase tracking-widest">ACCIÓN {numeros[a.id]}</p>
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha</label>
                        <input
                          type="date"
                          value={a.fecha}
                          onChange={e => updateAccion(a.id, { fecha: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--accent)] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de acción</label>
                        <select
                          value={a.tipo ?? 'reunion'}
                          onChange={e => updateAccion(a.id, { tipo: e.target.value as TipoAccionObjetivo })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--accent)] bg-white"
                        >
                          {TIPOS_ACCION.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAccion(a.id)}
                        title="Quitar acción"
                        className="w-9 h-9 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Detalle</label>
                      <textarea
                        value={a.detalle ?? ''}
                        onChange={e => updateAccion(a.id, { detalle: e.target.value })}
                        rows={2}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--accent)] bg-white"
                      />
                    </div>
                    <DocumentoAdjuntoField documento={a.documento} onChange={doc => updateAccion(a.id, { documento: doc })} />
                    <VideoYouTubeField
                      videoUrl={a.video_url}
                      titulo={`Objetivo individual - Acción ${numeros[a.id]} (${a.fecha})`}
                      onChange={url => updateAccion(a.id, { video_url: url })}
                      onBusyChange={handleVideoBusy}
                    />
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

        </form>

        {error && (
          <div className="mx-6 mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold shrink-0">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>
            {error}
          </div>
        )}

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-between shrink-0">
          {formData.id && onDelete && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-red-200 text-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
            >
              <i className="fa-solid fa-trash-can mr-1"></i>
              ELIMINAR
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || subidasVideo > 0}
              title={subidasVideo > 0 ? 'Espera a que termine la subida del vídeo' : undefined}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              {loading ? 'GUARDANDO...' : 'GUARDAR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditObjetivoModal;
