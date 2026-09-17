import React, { useState, useEffect, useMemo } from 'react';
import type { ResidenciaHabitacion, ResidenciaJugador, Jugador } from '@shared/services/dataService';
import { residenciaHabitacionesService, residenciaJugadoresService, plantillasService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import type { ResidenciaHabitacionFormData } from '../types';

const INCIDENCIAS_BASE = ['Falta de agua', 'No funciona la luz'];

const ESTADOS_HABITACION: { value: 'verde' | 'naranja' | 'rojo'; label: string; color: string }[] = [
  { value: 'verde', label: 'Verde', color: '#22c55e' },
  { value: 'naranja', label: 'Naranja', color: '#f97316' },
  { value: 'rojo', label: 'Rojo', color: '#ef4444' },
];

const ESTADOS_ZONA_COMUN: { value: 'buenas_condiciones' | 'desordenado' | 'sucio'; label: string; color: string }[] = [
  { value: 'buenas_condiciones', label: 'Buenas condiciones', color: '#22c55e' },
  { value: 'desordenado', label: 'Desordenado', color: '#f97316' },
  { value: 'sucio', label: 'Sucio', color: '#ef4444' },
];

const EditHabitacionModal: React.FC<{
  habitacion?: ResidenciaHabitacionFormData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResidenciaHabitacionFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  residentes?: { registro: ResidenciaJugador; jugador: Jugador }[];
  jugadoresDisponibles?: Jugador[];
  onUpdateResidente?: (registroId: string, cambios: Partial<Pick<ResidenciaJugador, 'estado' | 'condicion'>>) => Promise<void>;
  onAsignarResidente?: (jugadorId: string, numeroHabitacion: 1 | 2 | 3) => Promise<void>;
  onQuitarResidente?: (registroId: string) => Promise<void>;
}> = ({ habitacion, isOpen, onClose, onSave, onDelete, residentes = [], jugadoresDisponibles = [], onUpdateResidente, onAsignarResidente, onQuitarResidente }) => {
  const [formData, setFormData] = useState<ResidenciaHabitacionFormData>({ nombre: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incidenciasOpciones, setIncidenciasOpciones] = useState<string[]>(INCIDENCIAS_BASE);
  const [addingIncidencia, setAddingIncidencia] = useState(false);
  const [nuevaIncidencia, setNuevaIncidencia] = useState('');
  const [seleccionNueva, setSeleccionNueva] = useState<Record<1 | 2 | 3, string>>({ 1: '', 2: '', 3: '' });

  useEffect(() => {
    setFormData(habitacion ? { ...habitacion } : { nombre: '', estado: 'verde' });
    setError(null);
    setAddingIncidencia(false);
    setNuevaIncidencia('');
    setIncidenciasOpciones(prev => {
      const actual = habitacion?.incidencia;
      if (actual && !prev.includes(actual)) {
        return [...prev, actual];
      }
      return prev;
    });
  }, [habitacion, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'capacidad' ? (value ? Number(value) : undefined) : value }));
  };

  const handleIncidenciaSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === '__nueva__') {
      setAddingIncidencia(true);
      return;
    }
    setFormData(prev => ({ ...prev, incidencia: value }));
  };

  const handleAddIncidencia = () => {
    const valor = nuevaIncidencia.trim();
    if (!valor) return;
    setIncidenciasOpciones(prev => (prev.includes(valor) ? prev : [...prev, valor]));
    setFormData(prev => ({ ...prev, incidencia: valor }));
    setNuevaIncidencia('');
    setAddingIncidencia(false);
  };

  const handleEstadoChange = (estado: 'verde' | 'naranja' | 'rojo') => {
    setFormData(prev => ({ ...prev, estado }));
  };

  const handleZonaComunEstadoChange = (zona_comun_estado: 'buenas_condiciones' | 'desordenado' | 'sucio') => {
    setFormData(prev => ({ ...prev, zona_comun_estado }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.nombre.trim()) {
      setError('El nombre de la habitación es obligatorio');
      return;
    }
    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!habitacion?.id || !onDelete) return;
    if (window.confirm('¿Eliminar esta habitación?')) {
      try {
        setLoading(true);
        await onDelete(habitacion.id);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
          <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-bed"></i>
            {habitacion?.id ? 'EDITAR HABITACIÓN' : 'NUEVA HABITACIÓN'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Habitación 101"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Capacidad</label>
                <input
                  type="number"
                  min={1}
                  name="capacidad"
                  value={formData.capacidad ?? ''}
                  onChange={handleChange}
                  placeholder="Ej: 2"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Planta</label>
              <input
                type="text"
                name="planta"
                value={formData.planta ?? ''}
                onChange={handleChange}
                placeholder="Ej: Planta 1"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Notas</label>
              <textarea
                name="notas"
                value={formData.notas ?? ''}
                onChange={handleChange}
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {habitacion?.id && (
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Residentes</label>
                <div className="flex flex-col gap-3">
                  {([1, 2, 3] as const).map(numero => {
                    const ocupantes = residentes.filter(r => r.registro.numero_habitacion === numero);
                    const disponibles = jugadoresDisponibles.filter(
                      j => !residentes.some(r => String(r.jugador.id) === String(j.id))
                    );
                    return (
                      <div key={numero} className="p-3 rounded-xl border border-slate-200 space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Habitación {numero}</p>

                        {ocupantes.map(({ registro, jugador: j }) => (
                          <div key={j.id} className="p-2 rounded-lg bg-slate-50 space-y-2">
                            <div className="flex items-center gap-2">
                              {j.foto_url ? (
                                <img
                                  src={j.foto_url}
                                  alt={j.nombre}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                  <i className="fa-solid fa-user text-slate-400 text-[10px]"></i>
                                </div>
                              )}
                              <span className="text-sm font-semibold text-slate-600 flex-1">{j.nombre}</span>
                              {onQuitarResidente && (
                                <button
                                  type="button"
                                  onClick={() => onQuitarResidente(registro.id)}
                                  title="Quitar de la habitación"
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-3 pl-1">
                              {ESTADOS_HABITACION.map(({ value, label, color }) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => onUpdateResidente?.(registro.id, { estado: value })}
                                  title={label}
                                  className="group"
                                >
                                  <span
                                    className="w-6 h-6 rounded-full border-2 transition-all block"
                                    style={{
                                      backgroundColor: color,
                                      borderColor: (registro.estado ?? 'verde') === value ? '#1e293b' : 'transparent',
                                      boxShadow: (registro.estado ?? 'verde') === value ? `0 0 0 2px ${color}33` : 'none',
                                      opacity: (registro.estado ?? 'verde') === value ? 1 : 0.45,
                                    }}
                                  />
                                </button>
                              ))}
                            </div>

                            <select
                              value={registro.condicion ?? 'buenas_condiciones'}
                              onChange={e => onUpdateResidente?.(registro.id, { condicion: e.target.value as 'buenas_condiciones' | 'desordenado' | 'sucio' })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[var(--accent)]"
                            >
                              {ESTADOS_ZONA_COMUN.map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                        ))}

                        {ocupantes.length === 0 && (
                          <p className="text-xs text-slate-400 italic">Sin residente</p>
                        )}

                        {ocupantes.length < 3 && disponibles.length > 0 && onAsignarResidente && (
                          <div className="flex gap-2">
                            <select
                              value={seleccionNueva[numero]}
                              onChange={e => setSeleccionNueva(prev => ({ ...prev, [numero]: e.target.value }))}
                              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[var(--accent)]"
                            >
                              <option value="">Añadir jugador...</option>
                              {disponibles.map(j => (
                                <option key={j.id} value={String(j.id)}>{j.nombre}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!seleccionNueva[numero]}
                              onClick={async () => {
                                const jugadorId = seleccionNueva[numero];
                                if (!jugadorId) return;
                                await onAsignarResidente(jugadorId, numero);
                                setSeleccionNueva(prev => ({ ...prev, [numero]: '' }));
                              }}
                              className="px-3 py-2 rounded-xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all disabled:opacity-40"
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-3">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-[var(--accent)]"></i>
                Estado apartamento
              </h4>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</label>
                <div className="flex items-center gap-4">
                  {ESTADOS_HABITACION.map(({ value, label, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleEstadoChange(value)}
                      title={label}
                      className="group"
                    >
                      <span
                        className="w-9 h-9 rounded-full border-2 transition-all block"
                        style={{
                          backgroundColor: color,
                          borderColor: (formData.estado ?? 'verde') === value ? '#1e293b' : 'transparent',
                          boxShadow: (formData.estado ?? 'verde') === value ? `0 0 0 3px ${color}33` : 'none',
                          opacity: (formData.estado ?? 'verde') === value ? 1 : 0.45,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de incidencia</label>
                {addingIncidencia ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevaIncidencia}
                      onChange={e => setNuevaIncidencia(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddIncidencia(); } }}
                      placeholder="Ej: Cortina rota"
                      autoFocus
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={handleAddIncidencia}
                      className="px-3 py-2 rounded-xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all"
                    >
                      <i className="fa-solid fa-check"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingIncidencia(false); setNuevaIncidencia(''); }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.incidencia ?? ''}
                    onChange={handleIncidenciaSelect}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Sin incidencia</option>
                    {incidenciasOpciones.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                    <option value="__nueva__">+ Añadir incidencia...</option>
                  </select>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-couch text-[var(--accent)]"></i>
                Zona común
              </h4>

              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</label>
              <div className="flex items-center gap-4">
                {ESTADOS_ZONA_COMUN.map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleZonaComunEstadoChange(value)}
                    title={label}
                    className="group"
                  >
                    <span
                      className="w-9 h-9 rounded-full border-2 transition-all block"
                      style={{
                        backgroundColor: color,
                        borderColor: (formData.zona_comun_estado ?? 'buenas_condiciones') === value ? '#1e293b' : 'transparent',
                        boxShadow: (formData.zona_comun_estado ?? 'buenas_condiciones') === value ? `0 0 0 3px ${color}33` : 'none',
                        opacity: (formData.zona_comun_estado ?? 'buenas_condiciones') === value ? 1 : 0.45,
                      }}
                    />
                  </button>
                ))}
              </div>
              <select
                value={formData.zona_comun_estado ?? 'buenas_condiciones'}
                onChange={e => handleZonaComunEstadoChange(e.target.value as 'buenas_condiciones' | 'desordenado' | 'sucio')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              >
                {ESTADOS_ZONA_COMUN.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                <i className="fa-solid fa-circle-exclamation mr-2"></i>
                {error}
              </div>
            )}
          </div>
        </form>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-between flex-shrink-0">
          {habitacion?.id && onDelete && (
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
              disabled={loading}
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

const HabitacionesView: React.FC = () => {
  const { perfil } = useAuth();
  const [habitaciones, setHabitaciones] = useState<ResidenciaHabitacion[]>([]);
  const [registros, setRegistros] = useState<ResidenciaJugador[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [plantaFiltro, setPlantaFiltro] = useState('');
  const [habitacionFiltro, setHabitacionFiltro] = useState('');
  const [editing, setEditing] = useState<ResidenciaHabitacionFormData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await residenciaHabitacionesService.list();
      setHabitaciones(data || []);

      try {
        const [registrosData, jugadoresData] = await Promise.all([
          residenciaJugadoresService.list(),
          plantillasService.list(),
        ]);
        setRegistros(registrosData || []);
        setJugadores(jugadoresData || []);
      } catch (err) {
        console.error('Error loading residentes:', err);
        setRegistros([]);
        setJugadores([]);
      }
    } catch (err) {
      console.error('Error loading habitaciones:', err);
      setError('Error al cargar las habitaciones');
    } finally {
      setLoading(false);
    }
  };

  const getResidentes = (habitacionId: string) => {
    const activos = registros.filter(r => r.habitacion_id === habitacionId && !r.fecha_salida);
    return activos
      .map(r => {
        const jugador = jugadores.find(j => String(j.id) === String(r.jugador_id));
        return jugador?.nombre ? { registro: r, jugador } : null;
      })
      .filter((x): x is { registro: ResidenciaJugador; jugador: Jugador } => !!x);
  };

  const handleUpdateResidente = async (registroId: string, cambios: Partial<Pick<ResidenciaJugador, 'estado' | 'condicion'>>) => {
    await residenciaJugadoresService.update(registroId, cambios as any);
    await loadData();
  };

  const jugadoresResidentes = useMemo(() => jugadores.filter(j => j.residencia === true), [jugadores]);

  const jugadoresSinApartamento = useMemo(() => {
    const idsAsignados = new Set(registros.filter(r => r.habitacion_id && !r.fecha_salida).map(r => String(r.jugador_id)));
    return jugadoresResidentes.filter(j => !idsAsignados.has(String(j.id)));
  }, [jugadoresResidentes, registros]);

  const handleAsignarResidente = async (jugadorId: string, numeroHabitacion: 1 | 2 | 3, habitacionId: string) => {
    const registroExistente = registros.find(r => String(r.jugador_id) === String(jugadorId));
    if (registroExistente) {
      await residenciaJugadoresService.update(registroExistente.id, {
        habitacion_id: habitacionId,
        numero_habitacion: numeroHabitacion,
      } as any);
    } else {
      await residenciaJugadoresService.create({
        club_id: perfil?.club_id,
        jugador_id: jugadorId,
        habitacion_id: habitacionId,
        numero_habitacion: numeroHabitacion,
      } as any);
    }
    await loadData();
  };

  const handleQuitarResidente = async (registroId: string) => {
    await residenciaJugadoresService.update(registroId, { habitacion_id: null, numero_habitacion: null } as any);
    await loadData();
  };

  const plantasDisponibles = useMemo(() => {
    const plantas = new Set(habitaciones.map(h => h.planta).filter((p): p is string => !!p));
    return Array.from(plantas).sort((a, b) => a.localeCompare(b, 'es'));
  }, [habitaciones]);

  const habitacionesDisponibles = useMemo(() => {
    return [...habitaciones].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [habitaciones]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = habitaciones.filter(h => {
      const matchesSearch = !q || h.nombre.toLowerCase().includes(q) || (h.planta || '').toLowerCase().includes(q);
      const matchesPlanta = !plantaFiltro || h.planta === plantaFiltro;
      const matchesHabitacion = !habitacionFiltro || h.id === habitacionFiltro;
      return matchesSearch && matchesPlanta && matchesHabitacion;
    });
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [habitaciones, search, plantaFiltro, habitacionFiltro]);

  const handleSave = async (data: ResidenciaHabitacionFormData) => {
    if (data.id) {
      await residenciaHabitacionesService.update(data.id, {
        nombre: data.nombre,
        capacidad: data.capacidad,
        planta: data.planta,
        notas: data.notas,
        incidencia: data.incidencia || null,
        estado: data.estado ?? 'verde',
        zona_comun_estado: data.zona_comun_estado ?? 'buenas_condiciones',
      } as any);
    } else {
      await residenciaHabitacionesService.create({
        club_id: perfil?.club_id,
        nombre: data.nombre,
        capacidad: data.capacidad,
        planta: data.planta,
        notas: data.notas,
        incidencia: data.incidencia || null,
        estado: data.estado ?? 'verde',
        zona_comun_estado: data.zona_comun_estado ?? 'buenas_condiciones',
      } as any);
    }
    await loadData();
    setEditing(null);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    await residenciaHabitacionesService.remove(id);
    await loadData();
    setEditing(null);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1" />
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          HABITACIONES
        </h2>
        <div className="flex-1 flex justify-end" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar habitación..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg whitespace-nowrap"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Nueva Habitación
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={plantaFiltro}
          onChange={e => setPlantaFiltro(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        >
          <option value="">Todas las plantas</option>
          {plantasDisponibles.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={habitacionFiltro}
          onChange={e => setHabitacionFiltro(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        >
          <option value="">Todas las habitaciones</option>
          {habitacionesDisponibles.map(h => (
            <option key={h.id} value={h.id}>{h.nombre}</option>
          ))}
        </select>
        {(plantaFiltro || habitacionFiltro) && (
          <button
            onClick={() => { setPlantaFiltro(''); setHabitacionFiltro(''); }}
            className="text-xs font-black text-slate-400 hover:text-[var(--accent)] uppercase tracking-widest transition-colors"
          >
            <i className="fa-solid fa-xmark mr-1"></i>
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <i className="fa-solid fa-bed text-4xl text-slate-300 mb-4 block"></i>
            <p className="font-semibold">No hay habitaciones registradas</p>
            <p className="text-sm text-slate-400 mt-1">Crea la primera habitación para empezar</p>
          </div>
        ) : (
          filtered.map(h => {
            const residentes = getResidentes(h.id);
            const estadoInfo = ESTADOS_HABITACION.find(e => e.value === (h.estado ?? 'verde')) ?? ESTADOS_HABITACION[0];
            const zonaInfo = ESTADOS_ZONA_COMUN.find(e => e.value === (h.zona_comun_estado ?? 'buenas_condiciones')) ?? ESTADOS_ZONA_COMUN[0];
            return (
              <div
                key={h.id}
                onClick={() => setEditing(h as ResidenciaHabitacionFormData)}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[var(--accent)] hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[var(--accent)] uppercase tracking-tighter">{h.nombre}</h3>
                  {h.incidencia && (
                    <p
                      className="text-xs mt-1 font-semibold"
                      style={{ color: estadoInfo.color }}
                    >
                      <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                      {h.incidencia}
                    </p>
                  )}
                  {residentes.length > 0 ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {residentes.map(({ jugador: j }) => (
                        <div key={j.id} className="flex items-center gap-2">
                          {j.foto_url ? (
                            <img
                              src={j.foto_url}
                              alt={j.nombre}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                              <i className="fa-solid fa-user text-slate-400 text-[10px]"></i>
                            </div>
                          )}
                          <span className="text-sm text-slate-600">{j.nombre}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1 italic">
                      <i className="fa-solid fa-user mr-2 text-slate-300"></i>
                      Sin residentes
                    </p>
                  )}
                  {h.capacidad != null && (
                    <p className="text-xs text-slate-400 mt-1">
                      <i className="fa-solid fa-users mr-1"></i>
                      Capacidad: {h.capacidad}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                    style={{ backgroundColor: `${estadoInfo.color}22`, color: estadoInfo.color }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: estadoInfo.color }} />
                    {estadoInfo.label}
                  </span>
                  <span
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                    style={{ backgroundColor: `${zonaInfo.color}22`, color: zonaInfo.color }}
                  >
                    <i className="fa-solid fa-couch text-[8px]"></i>
                    {zonaInfo.label}
                  </span>
                  <i className="fa-solid fa-chevron-right text-slate-300 mt-1"></i>
                </div>
              </div>
            );
          })
        )}
      </div>

      <EditHabitacionModal
        habitacion={editing}
        isOpen={editing !== null || isCreating}
        onClose={() => { setEditing(null); setIsCreating(false); }}
        onSave={handleSave}
        onDelete={handleDelete}
        residentes={editing?.id ? getResidentes(editing.id) : []}
        jugadoresDisponibles={jugadoresSinApartamento}
        onUpdateResidente={handleUpdateResidente}
        onAsignarResidente={editing?.id ? (jugadorId, numero) => handleAsignarResidente(jugadorId, numero, editing.id!) : undefined}
        onQuitarResidente={handleQuitarResidente}
      />
    </div>
  );
};

export default HabitacionesView;
