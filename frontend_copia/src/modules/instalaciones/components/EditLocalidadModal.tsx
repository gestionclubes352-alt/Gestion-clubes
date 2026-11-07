import React, { useState, useEffect } from 'react';
import type { LocalidadFormData } from '../types';
import { localidadesService } from '@shared/services';

interface EditLocalidadModalProps {
  localidad?: LocalidadFormData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (localidad: LocalidadFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const EditLocalidadModal: React.FC<EditLocalidadModalProps> = ({
  localidad,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<LocalidadFormData>({
    nombre: '',
    provincia: '',
    pais: 'España',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localidad) {
      setFormData({
        id: localidad.id,
        nombre: localidad.nombre || '',
        provincia: localidad.provincia || '',
        pais: localidad.pais || 'España',
      });
    } else {
      setFormData({
        nombre: '',
        provincia: '',
        pais: 'España',
      });
    }
    setError(null);
  }, [localidad, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim()) {
      setError('El nombre de la localidad es obligatorio');
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving localidad (full):', err);
      const errorDetails = err instanceof Error ? err.message : JSON.stringify(err);
      const msg = `Error al guardar: ${errorDetails}`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!localidad?.id || !onDelete) return;

    if (window.confirm('¿Estás seguro de que deseas eliminar esta localidad?')) {
      try {
        setLoading(true);
        await onDelete(localidad.id);
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al eliminar la localidad';
        setError(msg);
        console.error('Error deleting localidad:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-map-pin"></i>
            {localidad?.id ? 'EDITAR LOCALIDAD' : 'NUEVA LOCALIDAD'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Nombre de Localidad *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Bilbao, Derio..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Provincia
            </label>
            <input
              type="text"
              name="provincia"
              value={formData.provincia}
              onChange={handleChange}
              placeholder="Ej: Bizkaia"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              País
            </label>
            <input
              type="text"
              name="pais"
              value={formData.pais}
              onChange={handleChange}
              placeholder="España"
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

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-between">
          {localidad?.id && onDelete && (
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

export default EditLocalidadModal;
