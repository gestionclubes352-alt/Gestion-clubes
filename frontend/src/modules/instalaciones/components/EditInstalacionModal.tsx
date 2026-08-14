import React, { useState, useEffect } from 'react';
import type { InstalacionCampoFormData } from '../types';
import type { Localidad } from '@shared/services/dataService';

interface EditInstalacionModalProps {
  instalacion?: InstalacionCampoFormData | null;
  localidades: Localidad[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (instalacion: InstalacionCampoFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const EditInstalacionModal: React.FC<EditInstalacionModalProps> = ({
  instalacion,
  localidades,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<InstalacionCampoFormData>({
    nombre: '',
    tipo: '',
    capacidad: undefined,
    descripcion: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (instalacion) {
      setFormData({
        id: instalacion.id,
        localidad_id: instalacion.localidad_id,
        nombre: instalacion.nombre || '',
        tipo: instalacion.tipo || '',
        capacidad: instalacion.capacidad || undefined,
        descripcion: instalacion.descripcion || '',
      });
    } else {
      setFormData({
        nombre: '',
        tipo: '',
        capacidad: undefined,
        descripcion: '',
      });
    }
    setError(null);
  }, [instalacion, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'capacidad') {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value, 10) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim()) {
      setError('El nombre de la instalación es obligatorio');
      return;
    }

    if (!formData.localidad_id) {
      setError('Debes seleccionar una localidad');
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la instalación';
      setError(msg);
      console.error('Error saving instalacion:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!instalacion?.id || !onDelete) return;

    if (window.confirm('¿Estás seguro de que deseas eliminar esta instalación?')) {
      try {
        setLoading(true);
        await onDelete(instalacion.id);
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al eliminar la instalación';
        setError(msg);
        console.error('Error deleting instalacion:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
          <h3 className="text-[var(--accent)] font-black text-lg uppercase tracking-tighter flex items-center gap-2">
            <i className="fa-solid fa-fence"></i>
            {instalacion?.id ? 'EDITAR INSTALACIÓN' : 'NUEVA INSTALACIÓN'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Localidad *
            </label>
            <select
              name="localidad_id"
              value={formData.localidad_id || ''}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--accent)] appearance-none bg-white"
            >
              <option value="">Selecciona localidad</option>
              {localidades.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.nombre} {loc.provincia ? `(${loc.provincia})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: San Mamés, Lezama, Campo 1..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Tipo
            </label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--accent)] appearance-none bg-white"
            >
              <option value="">Selecciona tipo</option>
              <option value="Natural">Natural</option>
              <option value="Artificial">Artificial</option>
              <option value="Indoor">Indoor</option>
              <option value="Sintético">Sintético</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Capacidad (personas)
            </label>
            <input
              type="number"
              name="capacidad"
              value={formData.capacidad || ''}
              onChange={handleChange}
              placeholder="Ej: 5000"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Descripción o notas..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)] resize-none"
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
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-between sticky bottom-0">
          {instalacion?.id && onDelete && (
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

export default EditInstalacionModal;
