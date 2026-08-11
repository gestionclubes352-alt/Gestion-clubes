import React, { useState } from 'react';
import { EquipoInterno } from '../types';
import SearchableSelect from '@shared/components/SearchableSelect';

interface EditEquipoInternoModalProps {
  equipo: EquipoInterno;
  isNew?: boolean;
  onClose: () => void;
  onSave: (equipo: EquipoInterno) => Promise<void>;
}

const ETAPAS = ['Senior', 'Juvenil', 'Cadete', 'Infantil', 'Alevín', 'Benjamín', 'Prebenjamín'];

const EditEquipoInternoModal: React.FC<EditEquipoInternoModalProps> = ({ equipo, isNew, onClose, onSave }) => {
  const [formData, setFormData] = useState<EquipoInterno>({ ...equipo });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.nombre?.trim()) return;
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar. Reintenta.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">
              {isNew ? 'Nuevo Equipo Interno' : 'Editar Equipo Interno'}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Datos del equipo de mi club</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-8 space-y-6 max-h-[70dvh] overflow-y-auto flex-1">
          {/* Nombre del Equipo */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
              Nombre del Equipo *
            </label>
            <input
              type="text"
              value={formData.nombre || ''}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="Ej: Juvenil A"
            />
          </div>

          {/* Etapa y Equipo Interno */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
                Etapa
              </label>
              <SearchableSelect
                value={formData.etapa || ''}
                onChange={(e) => setFormData({ ...formData, etapa: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              >
                <option value="">-- Sin etapa --</option>
                {ETAPAS.map(etapa => (
                  <option key={etapa} value={etapa}>{etapa}</option>
                ))}
              </SearchableSelect>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
                Equipo Interno
              </label>
              <input
                type="text"
                value={formData.equipo || ''}
                onChange={(e) => setFormData({ ...formData, equipo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
                placeholder="Ej: A, B, C..."
              />
            </div>
          </div>

          {/* Equipo Fed */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
              Nombre en Federación
            </label>
            <input
              type="text"
              value={formData.nombreEnFed || ''}
              onChange={(e) => setFormData({ ...formData, nombreEnFed: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="Ej: IPC LA ESCUELA"
            />
          </div>

          {/* Escudo */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
              Escudo (URL)
            </label>
            <input
              type="text"
              value={formData.logoUrl || ''}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="https://..."
            />
          </div>

          {/* Estadio y Localidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
                Estadio / Campo
              </label>
              <input
                type="text"
                value={formData.estadio || ''}
                onChange={(e) => setFormData({ ...formData, estadio: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
                Localidad
              </label>
              <input
                type="text"
                value={formData.localidad || ''}
                onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              />
            </div>
          </div>

          {/* Enlace */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
              Enlace (federación / competición)
            </label>
            <input
              type="text"
              value={formData.enlace || ''}
              onChange={(e) => setFormData({ ...formData, enlace: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-3 sm:gap-4">
          <button
            disabled={isSaving}
            onClick={onClose}
            className="flex-1 py-3.5 border border-slate-200 rounded-xl font-black text-slate-500 bg-white hover:bg-slate-50 transition-colors uppercase text-[10px] tracking-widest"
          >
            Cancelar
          </button>
          <button
            disabled={isSaving || !formData.nombre?.trim()}
            onClick={handleSave}
            className="flex-[2] py-3.5 bg-[var(--accent)] text-white rounded-xl font-black hover:bg-[var(--accent-dark)] transition-all shadow-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <i className="fa-solid fa-spinner animate-spin"></i>
            ) : (
              <i className="fa-solid fa-shield"></i>
            )}
            Guardar Equipo
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditEquipoInternoModal;
