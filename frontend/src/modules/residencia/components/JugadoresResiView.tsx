import React, { useState, useEffect, useMemo } from 'react';
import type { ResidenciaJugador, ResidenciaHabitacion, Jugador, Equipo } from '@shared/services/dataService';
import { residenciaJugadoresService, residenciaHabitacionesService, plantillasService, equiposService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import type { ResidenciaJugadorFormData } from '../types';
import QrComedorModal from './QrComedorModal';

const calcularAnyos = (fechaNacimiento?: string): number | null => {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let anyos = hoy.getFullYear() - nacimiento.getFullYear();
  const mesDia = hoy.getMonth() - nacimiento.getMonth() || hoy.getDate() - nacimiento.getDate();
  if (mesDia < 0) anyos--;
  return anyos;
};

const EditJugadorResiModal: React.FC<{
  jugador: Jugador | null;
  registro?: ResidenciaJugadorFormData | null;
  isOpen: boolean;
  habitaciones: ResidenciaHabitacion[];
  equipoNombre?: string;
  onClose: () => void;
  onSave: (data: ResidenciaJugadorFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}> = ({ jugador, registro, isOpen, habitaciones, equipoNombre, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<ResidenciaJugadorFormData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(registro ? { ...registro } : { jugador_id: jugador?.id ? String(jugador.id) : undefined });
    setError(null);
  }, [registro, jugador, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
    if (!registro?.id || !onDelete) return;
    if (window.confirm('¿Quitar la habitación/notas asignadas a este residente?')) {
      try {
        setLoading(true);
        await onDelete(registro.id);
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-user"></i>
            {jugador?.nombre || 'RESIDENTE'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipo</label>
              <p className="text-sm font-bold text-slate-700">{equipoNombre || '—'}</p>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">F. Nacimiento</label>
              <p className="text-sm font-bold text-slate-700">{jugador?.fecha_nacimiento || '—'}</p>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Año</label>
              <p className="text-sm font-bold text-slate-700">{calcularAnyos(jugador?.fecha_nacimiento) ?? '—'}</p>
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Habitación</label>
            <select
              name="habitacion_id"
              value={formData.habitacion_id ?? ''}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">Sin asignar</option>
              {habitaciones.map(h => (
                <option key={h.id} value={h.id}>{h.nombre}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha entrada</label>
              <input
                type="date"
                name="fecha_entrada"
                value={formData.fecha_entrada ?? ''}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha salida</label>
              <input
                type="date"
                name="fecha_salida"
                value={formData.fecha_salida ?? ''}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Notas</label>
            <textarea
              name="notas"
              value={formData.notas ?? ''}
              onChange={handleChange}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-between">
          {registro?.id && onDelete && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-red-200 text-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
            >
              <i className="fa-solid fa-trash-can mr-1"></i>
              QUITAR ASIGNACIÓN
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

const JugadoresResiView: React.FC = () => {
  const { perfil } = useAuth();
  const [registros, setRegistros] = useState<ResidenciaJugador[]>([]);
  const [habitaciones, setHabitaciones] = useState<ResidenciaHabitacion[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingJugador, setEditingJugador] = useState<Jugador | null>(null);
  const [qrJugador, setQrJugador] = useState<Jugador | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // La plantilla es la fuente de la verdad de quién es residente (campo `residencia`).
      const jugadoresData = await plantillasService.list();
      const residentes = (jugadoresData || []).filter(j => j.residencia === true);
      setJugadores(residentes);

      try {
        const equiposData = await equiposService.list();
        setEquipos(equiposData || []);
      } catch (err) {
        console.error('Error loading equipos:', err);
        setEquipos([]);
      }

      // Habitaciones/registros de residencia son un módulo aparte y opcional: si sus
      // tablas todavía no existen (migración no aplicada) no debe romper la pantalla.
      try {
        const [registrosData, habitacionesData] = await Promise.all([
          residenciaJugadoresService.list(),
          residenciaHabitacionesService.list(),
        ]);
        setRegistros(registrosData || []);
        setHabitaciones(habitacionesData || []);
      } catch (err) {
        console.error('Error loading residencia_jugadores/residencia_habitaciones:', err);
        setRegistros([]);
        setHabitaciones([]);
      }
    } catch (err) {
      console.error('Error loading jugadores resi:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const getRegistro = (jugadorId: string) => registros.find(r => r.jugador_id === jugadorId) || null;
  const getHabitacionNombre = (id?: string | null) => habitaciones.find(h => h.id === id)?.nombre || 'Sin asignar';
  const getEquipoNombre = (id?: string | null) => equipos.find(e => e.id === id)?.nombre || '—';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q ? jugadores : jugadores.filter(j =>
      j.nombre.toLowerCase().includes(q) ||
      getHabitacionNombre(getRegistro(j.id)?.habitacion_id).toLowerCase().includes(q)
    );
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [jugadores, registros, habitaciones, search]);

  const handleSave = async (data: ResidenciaJugadorFormData) => {
    if (data.id) {
      await residenciaJugadoresService.update(data.id, {
        habitacion_id: data.habitacion_id || null,
        fecha_entrada: data.fecha_entrada || null,
        fecha_salida: data.fecha_salida || null,
        notas: data.notas,
      } as any);
    } else {
      await residenciaJugadoresService.create({
        club_id: perfil?.club_id,
        jugador_id: data.jugador_id,
        habitacion_id: data.habitacion_id || null,
        fecha_entrada: data.fecha_entrada || null,
        fecha_salida: data.fecha_salida || null,
        notas: data.notas,
      } as any);
    }
    await loadData();
    setEditingJugador(null);
  };

  const handleDelete = async (id: string) => {
    await residenciaJugadoresService.remove(id);
    await loadData();
    setEditingJugador(null);
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
          JUGADORES RESIDENTES
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
            placeholder="Buscar jugador o habitación..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <i className="fa-solid fa-user text-4xl text-slate-300 mb-4 block"></i>
          <p className="font-semibold">No hay jugadores marcados como residentes</p>
          <p className="text-sm text-slate-400 mt-1">Marca "Residencia: Sí" en la ficha del jugador (módulo Plantillas) para que aparezca aquí</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[2fr_1.2fr_1fr_0.6fr_1.2fr_1.4fr_0.6fr] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jugador</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipo</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">F. Nacimiento</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Edad</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Habitación</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entrada — Salida</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comedor</span>
            </div>
            {filtered.map(j => {
              const registro = getRegistro(j.id);
              return (
                <div
                  key={j.id}
                  onClick={() => setEditingJugador(j)}
                  className="grid grid-cols-[2fr_1.2fr_1fr_0.6fr_1.2fr_1.4fr_0.6fr] gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-all cursor-pointer items-center"
                >
                  <span className="font-black text-[var(--accent)] uppercase tracking-tighter truncate">{j.nombre}</span>
                  <span className="text-sm text-slate-600 truncate">{getEquipoNombre(j.equipo_id)}</span>
                  <span className="text-sm text-slate-600">{j.fecha_nacimiento || '—'}</span>
                  <span className="text-sm text-slate-600">{calcularAnyos(j.fecha_nacimiento) ?? '—'}</span>
                  <span className="text-sm text-slate-600 flex items-center gap-2 truncate">
                    <i className="fa-solid fa-bed text-slate-400"></i>
                    {getHabitacionNombre(registro?.habitacion_id)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {registro?.fecha_entrada || registro?.fecha_salida
                      ? `${registro?.fecha_entrada || '?'} — ${registro?.fecha_salida || 'actualidad'}`
                      : '—'}
                  </span>
                  <span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setQrJugador(j); }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
                      title="QR comedor"
                    >
                      <i className="fa-solid fa-qrcode"></i>
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <EditJugadorResiModal
        jugador={editingJugador}
        registro={editingJugador ? (getRegistro(editingJugador.id) as ResidenciaJugadorFormData | null) : null}
        isOpen={editingJugador !== null}
        habitaciones={habitaciones}
        equipoNombre={editingJugador ? getEquipoNombre(editingJugador.equipo_id) : undefined}
        onClose={() => setEditingJugador(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {qrJugador && (
        <QrComedorModal
          jugadorId={qrJugador.id ? String(qrJugador.id) : null}
          jugadorNombre={qrJugador.nombre}
          onClose={() => setQrJugador(null)}
        />
      )}
    </div>
  );
};

export default JugadoresResiView;
