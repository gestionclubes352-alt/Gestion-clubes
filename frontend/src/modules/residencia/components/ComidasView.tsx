import React, { useState, useEffect, useMemo } from 'react';
import type { ResidenciaComida } from '@shared/services/dataService';
import { residenciaComidasService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import type { ResidenciaComidaFormData } from '../types';

const TURNOS = ['Desayuno', 'Comida', 'Merienda', 'Cena'];

const EditComidaModal: React.FC<{
  comida?: ResidenciaComidaFormData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResidenciaComidaFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}> = ({ comida, isOpen, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<ResidenciaComidaFormData>({ fecha: '', turno: 'Comida' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(comida ? { ...comida } : { fecha: '', turno: 'Comida' });
    setError(null);
  }, [comida, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.fecha) {
      setError('La fecha es obligatoria');
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
    if (!comida?.id || !onDelete) return;
    if (window.confirm('¿Eliminar esta comida?')) {
      try {
        setLoading(true);
        await onDelete(comida.id);
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
            <i className="fa-solid fa-utensils"></i>
            {comida?.id ? 'EDITAR COMIDA' : 'NUEVA COMIDA'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha *</label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Turno *</label>
              <select
                name="turno"
                value={formData.turno}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              >
                {TURNOS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Menú</label>
            <textarea
              name="menu"
              value={formData.menu ?? ''}
              onChange={handleChange}
              rows={3}
              placeholder="Ej: Pasta, pollo asado, fruta"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Notas</label>
            <textarea
              name="notas"
              value={formData.notas ?? ''}
              onChange={handleChange}
              rows={2}
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
          {comida?.id && onDelete && (
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

const ComidasView: React.FC = () => {
  const { perfil } = useAuth();
  const [comidas, setComidas] = useState<ResidenciaComida[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ResidenciaComidaFormData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await residenciaComidasService.list();
      setComidas(data || []);
    } catch (err) {
      console.error('Error loading comidas:', err);
      setError('Error al cargar las comidas');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q ? comidas : comidas.filter(c =>
      (c.menu || '').toLowerCase().includes(q) || c.turno.toLowerCase().includes(q) || c.fecha.includes(q)
    );
    return [...list].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [comidas, search]);

  const handleSave = async (data: ResidenciaComidaFormData) => {
    if (data.id) {
      await residenciaComidasService.update(data.id, {
        fecha: data.fecha,
        turno: data.turno,
        menu: data.menu,
        notas: data.notas,
      } as any);
    } else {
      await residenciaComidasService.create({
        club_id: perfil?.club_id,
        fecha: data.fecha,
        turno: data.turno,
        menu: data.menu,
        notas: data.notas,
      } as any);
    }
    await loadData();
    setEditing(null);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    await residenciaComidasService.remove(id);
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
          COMIDAS
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
            placeholder="Buscar por menú, turno o fecha..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg whitespace-nowrap"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          Nueva Comida
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <i className="fa-solid fa-utensils text-4xl text-slate-300 mb-4 block"></i>
            <p className="font-semibold">No hay comidas planificadas</p>
            <p className="text-sm text-slate-400 mt-1">Añade la primera comida para empezar</p>
          </div>
        ) : (
          filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setEditing(c as ResidenciaComidaFormData)}
              className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[var(--accent)] hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-[var(--accent)] uppercase tracking-tighter">{c.fecha}</h3>
                    <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[9px] font-black uppercase">{c.turno}</span>
                  </div>
                  {c.menu && <p className="text-sm text-slate-600 mt-2">{c.menu}</p>}
                </div>
                <i className="fa-solid fa-chevron-right text-slate-300"></i>
              </div>
            </div>
          ))
        )}
      </div>

      <EditComidaModal
        comida={editing}
        isOpen={editing !== null || isCreating}
        onClose={() => { setEditing(null); setIsCreating(false); }}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ComidasView;
