import React, { useState, useEffect } from 'react';
import type { InstalacionCampoFormData } from '../types';
import type { Localidad, Club } from '@shared/services/dataService';

interface EditInstalacionModalProps {
  instalacion?: InstalacionCampoFormData | null;
  localidades: Localidad[];
  clubes: Club[];
  camposExistentes?: Array<{ id: string; nombre: string; tipo?: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (instalacion: InstalacionCampoFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onCreateLocalidad?: (nombre: string) => Promise<Localidad>;
}

const EditInstalacionModal: React.FC<EditInstalacionModalProps> = ({
  instalacion,
  localidades,
  clubes,
  camposExistentes = [],
  isOpen,
  onClose,
  onSave,
  onDelete,
  onCreateLocalidad,
}) => {
  const [formData, setFormData] = useState<InstalacionCampoFormData>({
    nombre: '',
    tipo: '',
    descripcion: '',
    clubes_ids: [],
  });
  const [showAddLocalidadInput, setShowAddLocalidadInput] = useState(false);
  const [newLocalidadNombre, setNewLocalidadNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubSearchTerm, setClubSearchTerm] = useState('');
  const [localidadSearchTerm, setLocalidadSearchTerm] = useState('');

  const isField = Boolean((instalacion as any)?.parent_instalacion_id);

  useEffect(() => {
    if (instalacion) {
      setFormData({
        id: instalacion.id,
        localidad_id: instalacion.localidad_id,
        nombre: instalacion.nombre || '',
        tipo: instalacion.tipo || '',
        descripcion: instalacion.descripcion || '',
        clubes_ids: instalacion.clubes_ids || [],
      });
    } else {
      setFormData({
        nombre: '',
        tipo: '',
        descripcion: '',
        clubes_ids: [],
      });
    }
    setError(null);
    setClubSearchTerm('');
    setLocalidadSearchTerm('');
  }, [instalacion, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClubToggle = (clubId: string) => {
    setFormData(prev => {
      const current = prev.clubes_ids || [];
      const next = current.includes(clubId)
        ? current.filter(id => id !== clubId)
        : [...current, clubId];
      return { ...prev, clubes_ids: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isField && !formData.localidad_id) {
      setError('Debes seleccionar una localidad');
      return;
    }

    if (!formData.nombre.trim()) {
      setError('Debes ingresar un nombre');
      return;
    }

    try {
      setLoading(true);

      // Si es un campo, preservar parent_instalacion_id
      if (isField) {
        await onSave({
          ...formData,
          parent_instalacion_id: (instalacion as any).parent_instalacion_id,
        } as any);
      } else {
        // El tipo de hierba es una propiedad del campo, no de la instalación
        await onSave({ ...formData, tipo: undefined });
      }

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

  const handleCreateLocalidad = async () => {
    if (!newLocalidadNombre.trim()) {
      setError('Ingresa el nombre de la localidad');
      return;
    }

    if (!onCreateLocalidad) return;

    try {
      setLoading(true);
      const nuevaLocalidad = await onCreateLocalidad(newLocalidadNombre);
      setFormData(prev => ({ ...prev, localidad_id: nuevaLocalidad.id }));
      setShowAddLocalidadInput(false);
      setNewLocalidadNombre('');
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear la localidad';
      setError(msg);
      console.error('Error creating localidad:', err);
    } finally {
      setLoading(false);
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
          {isField && !instalacion?.id && camposExistentes.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-list mr-2 text-slate-400"></i>
                  Campos existentes
                </p>
                <div className="space-y-2">
                  {camposExistentes.map(campo => (
                    <div key={campo.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-700 text-sm">{campo.nombre}</p>
                      </div>
                      {campo.tipo && (
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-[9px] font-black ml-2">
                          {campo.tipo}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-px bg-slate-200"></div>
            </div>
          )}

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Nombre de la instalación *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: San Mamés, Lezama..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Localidad *
            </label>
            {showAddLocalidadInput ? (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newLocalidadNombre}
                  onChange={e => setNewLocalidadNombre(e.target.value)}
                  placeholder="Nombre de la localidad..."
                  onKeyPress={e => e.key === 'Enter' && handleCreateLocalidad()}
                  autoFocus
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={handleCreateLocalidad}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl bg-[var(--accent)] text-white font-black text-[11px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg whitespace-nowrap disabled:opacity-50"
                >
                  <i className="fa-solid fa-check text-sm"></i>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLocalidadInput(false);
                    setNewLocalidadNombre('');
                  }}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all whitespace-nowrap"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Buscar localidad..."
                    value={localidadSearchTerm}
                    onChange={e => setLocalidadSearchTerm(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddLocalidadInput(true)}
                    title="Crear nueva localidad"
                    className="px-4 py-3 rounded-xl bg-[var(--accent)] text-white font-black text-[11px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg flex items-center gap-1 whitespace-nowrap"
                  >
                    <i className="fa-solid fa-plus text-sm"></i>
                    <span>Nueva</span>
                  </button>
                </div>
                <select
                  name="localidad_id"
                  value={formData.localidad_id || ''}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--accent)] appearance-none bg-white"
                >
                  <option value="">Selecciona localidad</option>
                  {localidades
                    .filter(loc =>
                      loc.nombre.toLowerCase().includes(localidadSearchTerm.toLowerCase()) ||
                      (loc.provincia || '').toLowerCase().includes(localidadSearchTerm.toLowerCase())
                    )
                    .map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.nombre} {loc.provincia ? `(${loc.provincia})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Clubes *
            </label>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Buscar club..."
                value={clubSearchTerm}
                onChange={e => setClubSearchTerm(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="w-full border border-slate-200 rounded-xl px-2 py-2 max-h-[180px] overflow-y-auto bg-white space-y-1">
              {clubes
                .filter(club =>
                  club.nombre.toLowerCase().includes(clubSearchTerm.toLowerCase())
                )
                .map(club => {
                  const checked = (formData.clubes_ids || []).includes(club.id);
                  return (
                    <label
                      key={club.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleClubToggle(club.id)}
                        className="w-4 h-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span className="text-sm font-bold text-slate-700">{club.nombre}</span>
                    </label>
                  );
                })}
            </div>
            <p className="text-[9px] text-slate-400 mt-1">
              {clubSearchTerm ? `Selecciona uno o varios clubes (${clubes.filter(c => c.nombre.toLowerCase().includes(clubSearchTerm.toLowerCase())).length} encontrados)` : 'Selecciona uno o varios clubes'}
            </p>
          </div>

          {isField && (
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Tipo de hierba
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
          )}

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Descripción o notas..."
              rows={2}
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
