import React, { useState } from 'react';
import { CompetitionTeam } from '../types';
import { Club } from '../../clubes/types';

interface EditTeamModalProps {
  team: CompetitionTeam;
  clubes: Club[];
  isNew?: boolean;
  onClose: () => void;
  onSave: (team: CompetitionTeam) => Promise<void>;
}

const EditTeamModal: React.FC<EditTeamModalProps> = ({ team, clubes, isNew, onClose, onSave }) => {
  const [formData, setFormData] = useState<CompetitionTeam>({ ...team });
  const [isSaving, setIsSaving] = useState(false);

  const handleClubChange = (selectedClubId: string) => {
    const club = clubes.find(c => String(c.id) === selectedClubId);
    if (!club) return;
    setFormData(prev => ({ ...prev, clubId: club.id, nombre: club.nombre, logoUrl: club.logoUrl || '' }));
  };

  const handleSave = async () => {
    if (!formData.clubId) return;
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
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">{isNew ? 'Nuevo Equipo' : 'Editar Equipo'}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{isNew ? 'Añadir equipo rival' : 'Datos del equipo rival'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto flex-1">
          {/* Club */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
              Club *
            </label>
            {clubes.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <i className="fa-solid fa-circle-info"></i>
                No hay clubes creados. Crea un club primero en la sección Clubes.
              </div>
            ) : (
              <select
                value={formData.clubId ? String(formData.clubId) : ''}
                onChange={(e) => handleClubChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 uppercase"
              >
                <option value="">-- Selecciona un club --</option>
                {clubes.map(c => (
                  <option key={String(c.id)} value={String(c.id)}>{c.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Etapa y Equipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
                Etapa
              </label>
              <select
                value={formData.etapa || ''}
                onChange={(e) => setFormData({ ...formData, etapa: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              >
                <option value="">-- Sin etapa --</option>
                <option value="Senior">Senior</option>
                <option value="Juvenil">Juvenil</option>
                <option value="Cadete">Cadete</option>
                <option value="Infantil">Infantil</option>
                <option value="Alevín">Alevín</option>
                <option value="Benjamín">Benjamín</option>
                <option value="Prebenjamín">Prebenjamín</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
                Equipo
              </label>
              <input
                type="text"
                value={formData.equipo || ''}
                onChange={(e) => setFormData({ ...formData, equipo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
                placeholder="Ej: Primer equipo, Filial, Juvenil A"
              />
            </div>
          </div>

          {/* Competición */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
              Competición
            </label>
            <input
              type="text"
              value={formData.competicion || ''}
              onChange={(e) => setFormData({ ...formData, competicion: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="Ej: Liga nacional juvenil, División honor cadete"
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
            disabled={isSaving || !formData.clubId}
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

export default EditTeamModal;
