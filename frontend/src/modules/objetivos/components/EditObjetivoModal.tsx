import React, { useState, useEffect } from 'react';
import type { Jugador, Equipo } from '@shared/services/dataService';
import type { ObjetivoIndividualFormData } from '../types';
import { TIPOS_OBJETIVO, ESTADOS_OBJETIVO } from '../types';

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
}> = ({ isOpen, objetivo, jugadores, equipos, jugadorNombreFijo, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<ObjetivoIndividualFormData>({
    equipo_id: '',
    jugador_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    tipo: 'deportivo',
    estado: 'verde',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (objetivo) {
      setFormData(objetivo);
    } else {
      setFormData({
        equipo_id: '',
        jugador_id: '',
        fecha: new Date().toISOString().slice(0, 10),
        tipo: 'deportivo',
        estado: 'verde',
      });
    }
    setError(null);
  }, [objetivo, isOpen]);

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
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
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

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-bullseye"></i>
            {formData.id ? 'EDITAR OBJETIVO' : 'NUEVO OBJETIVO'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</label>
            <div className="flex items-center gap-4">
              {ESTADOS_OBJETIVO.map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, estado: value }))}
                  title={label}
                  className="flex items-center gap-2 group"
                >
                  <span
                    className="w-8 h-8 rounded-full border-2 block transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: formData.estado === value ? '#1e293b' : 'transparent',
                      boxShadow: formData.estado === value ? `0 0 0 3px ${color}33` : 'none',
                      opacity: formData.estado === value ? 1 : 0.45,
                    }}
                  />
                  <span className={`text-xs font-bold ${formData.estado === value ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
                </button>
              ))}
            </div>
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

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Plan de acción</label>
            <textarea
              name="plan_accion"
              value={formData.plan_accion ?? ''}
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

export default EditObjetivoModal;
