import React, { useMemo, useState } from 'react';
import type { ResidenciaHabitacion, ResidenciaJugador, Jugador } from '@shared/services/dataService';

interface AsignacionHabitacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitaciones: ResidenciaHabitacion[];
  registros: ResidenciaJugador[];
  jugadoresResidentes: Jugador[];
  onAsignar: (jugadorId: string, habitacionId: string, numeroHabitacion: 1 | 2 | 3) => Promise<void>;
  onQuitar: (registroId: string) => Promise<void>;
}

const JugadorChip: React.FC<{
  jugador: Jugador;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onRemove?: () => void;
  dragging?: boolean;
}> = ({ jugador, draggable, onDragStart, onDragEnd, onRemove, dragging }) => (
  <div
    draggable={draggable}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all ${
      draggable ? 'cursor-grab active:cursor-grabbing bg-white border-slate-200 hover:border-[var(--accent)] hover:shadow-sm' : 'bg-slate-50 border-slate-100'
    } ${dragging ? 'opacity-30' : 'opacity-100'}`}
  >
    {jugador.foto_url ? (
      <img src={jugador.foto_url} alt={jugador.nombre} className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0" />
    ) : (
      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
        <i className="fa-solid fa-user text-slate-400 text-[10px]"></i>
      </div>
    )}
    <span className="text-sm font-bold text-slate-700 truncate flex-1">{jugador.nombre}</span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        title="Quitar de la habitación"
        className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    )}
  </div>
);

const AsignacionHabitacionesModal: React.FC<AsignacionHabitacionesModalProps> = ({
  isOpen,
  onClose,
  habitaciones,
  registros,
  jugadoresResidentes,
  onAsignar,
  onQuitar,
}) => {
  const [search, setSearch] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [busySlot, setBusySlot] = useState<string | null>(null);

  const registroPorJugador = useMemo(() => {
    const map = new Map<string, ResidenciaJugador>();
    registros.forEach(r => {
      if (!r.fecha_salida && r.habitacion_id) map.set(String(r.jugador_id), r);
    });
    return map;
  }, [registros]);

  const jugadoresSinAsignar = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jugadoresResidentes
      .filter(j => !registroPorJugador.has(String(j.id)))
      .filter(j => !q || j.nombre.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [jugadoresResidentes, registroPorJugador, search]);

  const habitacionesOrdenadas = useMemo(
    () => [...habitaciones].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [habitaciones]
  );

  const getOcupante = (habitacionId: string, numero: 1 | 2 | 3) => {
    const registro = registros.find(r => r.habitacion_id === habitacionId && r.numero_habitacion === numero && !r.fecha_salida);
    if (!registro) return null;
    const jugador = jugadoresResidentes.find(j => String(j.id) === String(registro.jugador_id));
    return jugador ? { registro, jugador } : null;
  };

  const totalAsignados = registroPorJugador.size;
  const totalResidentes = jugadoresResidentes.length;

  const asignarAlSlot = async (jugadorId: string, habitacionId: string, numero: 1 | 2 | 3) => {
    const claveSlot = `${habitacionId}-${numero}`;
    setBusySlot(claveSlot);
    try {
      await onAsignar(jugadorId, habitacionId, numero);
    } finally {
      setBusySlot(null);
      setDragOverSlot(null);
      setDraggingId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, habitacionId: string, numero: 1 | 2 | 3) => {
    e.preventDefault();
    const jugadorId = e.dataTransfer.getData('text/plain') || draggingId;
    setDragOverSlot(null);
    if (!jugadorId) return;
    const ocupante = getOcupante(habitacionId, numero);
    if (ocupante) return;
    await asignarAlSlot(jugadorId, habitacionId, numero);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
          <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-shuffle"></i>
            ASIGNACIÓN DE HABITACIONES
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-400">
              {totalAsignados} / {totalResidentes} asignados
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <div className="lg:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 p-4 flex flex-col gap-3 bg-slate-50/50 max-h-64 lg:max-h-none overflow-hidden">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-users text-[var(--accent)]"></i>
              Sin asignar ({jugadoresSinAsignar.length})
            </h4>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar jugador..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {jugadoresSinAsignar.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  {search ? 'Sin resultados' : 'Todos los residentes están asignados'}
                </p>
              ) : (
                jugadoresSinAsignar.map(j => (
                  <JugadorChip
                    key={j.id}
                    jugador={j}
                    draggable
                    dragging={draggingId === String(j.id)}
                    onDragStart={() => setDraggingId(String(j.id))}
                    onDragEnd={() => setDraggingId(null)}
                  />
                ))
              )}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              <i className="fa-solid fa-hand-pointer mr-1"></i>
              Arrastra un jugador hasta un hueco de habitación
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {habitacionesOrdenadas.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <i className="fa-solid fa-bed text-4xl text-slate-300 mb-4 block"></i>
                <p className="font-semibold">No hay apartamentos registrados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {habitacionesOrdenadas.map(h => (
                  <div key={h.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-black text-[var(--accent)] uppercase tracking-tighter">{h.nombre}</h4>
                      {h.planta && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{h.planta}</span>}
                    </div>
                    <div className="p-3 space-y-2">
                      {([1, 2, 3] as const).map(numero => {
                        const claveSlot = `${h.id}-${numero}`;
                        const ocupante = getOcupante(h.id, numero);
                        const isDragOver = dragOverSlot === claveSlot;
                        const isBusy = busySlot === claveSlot;
                        return (
                          <div
                            key={numero}
                            onDragOver={e => {
                              if (ocupante) return;
                              e.preventDefault();
                              setDragOverSlot(claveSlot);
                            }}
                            onDragLeave={() => setDragOverSlot(prev => (prev === claveSlot ? null : prev))}
                            onDrop={e => handleDrop(e, h.id, numero)}
                            className={`rounded-xl border-2 border-dashed p-2 transition-all ${
                              isDragOver ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-transparent'
                            }`}
                          >
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Habitación {numero}</p>
                            {isBusy ? (
                              <div className="flex items-center justify-center py-3">
                                <i className="fa-solid fa-spinner animate-spin text-[var(--accent)]"></i>
                              </div>
                            ) : ocupante ? (
                              <JugadorChip jugador={ocupante.jugador} onRemove={() => onQuitar(ocupante.registro.id)} />
                            ) : (
                              <div className="flex items-center justify-center py-3 rounded-xl border border-slate-100 bg-slate-50/50">
                                <span className="text-xs text-slate-400 italic">
                                  {draggingId ? 'Suelta aquí' : 'Vacío'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsignacionHabitacionesModal;
