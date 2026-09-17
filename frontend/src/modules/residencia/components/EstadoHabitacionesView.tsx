import React, { useState, useEffect, useMemo } from 'react';
import type { ResidenciaHabitacion, ResidenciaJugador, Jugador } from '@shared/services/dataService';
import { residenciaHabitacionesService, residenciaJugadoresService, plantillasService } from '@shared/services';

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

type EstadoHabitacion = 'verde' | 'naranja' | 'rojo';
type EstadoZona = 'buenas_condiciones' | 'desordenado' | 'sucio';

const Semaforo: React.FC<{
  value: string;
  opciones: { value: string; label: string; color: string }[];
  activeValue: string;
}> = ({ opciones, activeValue }) => (
  <div className="flex items-center gap-3">
    {opciones.map(({ value: v, label, color }) => (
      <span
        key={v}
        title={label}
        className="w-7 h-7 rounded-full border-2 transition-all"
        style={{
          backgroundColor: color,
          borderColor: activeValue === v ? '#1e293b' : 'transparent',
          boxShadow: activeValue === v ? `0 0 0 3px ${color}33` : 'none',
          opacity: activeValue === v ? 1 : 0.35,
        }}
      />
    ))}
  </div>
);

const LeyendaSemaforo: React.FC<{ opciones: { value: string; label: string; color: string }[] }> = ({ opciones }) => (
  <div className="flex items-center gap-3 flex-wrap">
    {opciones.map(({ value, label, color }) => (
      <span key={value} className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        {label}
      </span>
    ))}
  </div>
);

const EstadoHabitacionesView: React.FC = () => {
  const [habitaciones, setHabitaciones] = useState<ResidenciaHabitacion[]>([]);
  const [registros, setRegistros] = useState<ResidenciaJugador[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [habitacionesData, registrosData, jugadoresData] = await Promise.all([
        residenciaHabitacionesService.list(),
        residenciaJugadoresService.list(),
        plantillasService.list(),
      ]);
      setHabitaciones(habitacionesData || []);
      setRegistros(registrosData || []);
      setJugadores(jugadoresData || []);
    } catch (err) {
      console.error('Error loading estado habitaciones:', err);
      setError('Error al cargar el estado de las habitaciones');
    } finally {
      setLoading(false);
    }
  };

  const getResidentes = (habitacionId: string) => {
    return registros
      .filter(r => r.habitacion_id === habitacionId && !r.fecha_salida)
      .map(r => {
        const jugador = jugadores.find(j => String(j.id) === String(r.jugador_id));
        return jugador?.nombre ? { registro: r, jugador } : null;
      })
      .filter((x): x is { registro: ResidenciaJugador; jugador: Jugador } => !!x);
  };

  const getResidentePorNumero = (habitacionId: string, numero: 1 | 2 | 3) => {
    const residentes = getResidentes(habitacionId);
    return residentes.find(r => r.registro.numero_habitacion === numero) ?? null;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = habitaciones.filter(h => !q || h.nombre.toLowerCase().includes(q) || (h.planta || '').toLowerCase().includes(q));
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [habitaciones, search]);

  const handleHabitacionEstadoChange = async (habitacion: ResidenciaHabitacion, estado: EstadoHabitacion) => {
    setHabitaciones(prev => prev.map(h => (h.id === habitacion.id ? { ...h, estado } : h)));
    await residenciaHabitacionesService.update(habitacion.id, { estado } as any);
  };

  const handleZonaComunEstadoChange = async (habitacion: ResidenciaHabitacion, zona_comun_estado: EstadoZona) => {
    setHabitaciones(prev => prev.map(h => (h.id === habitacion.id ? { ...h, zona_comun_estado } : h)));
    await residenciaHabitacionesService.update(habitacion.id, { zona_comun_estado } as any);
  };

  const handleResidenteEstadoChange = async (registroId: string, estado: EstadoHabitacion) => {
    setRegistros(prev => prev.map(r => (r.id === registroId ? { ...r, estado } : r)));
    await residenciaJugadoresService.update(registroId, { estado } as any);
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
          ESTADO DE HABITACIONES
        </h2>
        <div className="flex-1 flex justify-end" />
      </div>

      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar habitación..."
          className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <i className="fa-solid fa-bed text-4xl text-slate-300 mb-4 block"></i>
          <p className="font-semibold">No hay habitaciones registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(h => {
            const residentes = getResidentes(h.id);
            return (
              <div key={h.id} className="p-5 bg-white rounded-2xl border border-slate-200 space-y-5">
                <h3 className="font-black text-[var(--accent)] uppercase tracking-tighter text-lg">{h.nombre}</h3>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-bed text-[var(--accent)]"></i>
                    Estado habitación
                  </h4>
                  <Semaforo
                    value="estado"
                    opciones={ESTADOS_HABITACION}
                    activeValue={h.estado ?? 'verde'}
                  />
                  <LeyendaSemaforo opciones={ESTADOS_HABITACION} />
                  <select
                    value={h.estado ?? 'verde'}
                    onChange={e => handleHabitacionEstadoChange(h, e.target.value as EstadoHabitacion)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[var(--accent)]"
                  >
                    {ESTADOS_HABITACION.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-couch text-[var(--accent)]"></i>
                    Zona común
                  </h4>
                  <Semaforo
                    value="zona_comun_estado"
                    opciones={ESTADOS_ZONA_COMUN}
                    activeValue={h.zona_comun_estado ?? 'buenas_condiciones'}
                  />
                  <LeyendaSemaforo opciones={ESTADOS_ZONA_COMUN} />
                  <select
                    value={h.zona_comun_estado ?? 'buenas_condiciones'}
                    onChange={e => handleZonaComunEstadoChange(h, e.target.value as EstadoZona)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[var(--accent)]"
                  >
                    {ESTADOS_ZONA_COMUN.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-user text-[var(--accent)]"></i>
                    Habitaciones de residentes
                  </h4>
                  <LeyendaSemaforo opciones={ESTADOS_HABITACION} />
                  {([1, 2, 3] as const).map(numero => {
                    const item = getResidentePorNumero(h.id, numero);
                    return (
                      <div key={numero} className="p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Habitación {numero}</span>
                          {item ? (
                            <div className="flex items-center gap-2">
                              {item.jugador.foto_url ? (
                                <img src={item.jugador.foto_url} alt={item.jugador.nombre} className="w-6 h-6 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                  <i className="fa-solid fa-user text-slate-400 text-[9px]"></i>
                                </div>
                              )}
                              <span className="text-sm font-semibold text-slate-600">{item.jugador.nombre}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sin residente</span>
                          )}
                        </div>
                        <Semaforo
                          value="estado"
                          opciones={ESTADOS_HABITACION}
                          activeValue={item?.registro.estado ?? 'verde'}
                        />
                        <select
                          value={item?.registro.estado ?? 'verde'}
                          onChange={e => item && handleResidenteEstadoChange(item.registro.id, e.target.value as EstadoHabitacion)}
                          disabled={!item}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        >
                          {ESTADOS_HABITACION.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EstadoHabitacionesView;
