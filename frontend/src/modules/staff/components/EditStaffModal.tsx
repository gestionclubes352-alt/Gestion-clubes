import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Personal } from '@shared/services/dataService';
import { ROLES_TECNICOS } from '@modules/usuarios';
import { uploadStaffPhoto } from '../../../shared/services/staffPhotoService';

interface EditStaffModalProps {
  staff: Personal;
  isNew?: boolean;
  clubId?: string;
  equipos?: Array<{ id: string; nombre: string }>;
  onClose: () => void;
  onSave: (staff: Personal) => Promise<void>;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const EditStaffModal: React.FC<EditStaffModalProps> = ({ staff, isNew, clubId, equipos = [], onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Personal>({ ...staff });
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(staff.foto_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    let fotoUrl = formData.foto_url;
    if (photoFile && clubId) {
      try {
        const staffId = formData.id ? String(formData.id) : String(Date.now());
        fotoUrl = await uploadStaffPhoto(photoFile, staffId, clubId);
      } catch (err) {
        console.warn('No se pudo subir la foto:', err);
        if (photoPreview && photoPreview.startsWith('data:image/')) {
          fotoUrl = photoPreview;
        }
      }
    } else if (photoFile && !clubId) {
      if (photoPreview && photoPreview.startsWith('data:image/')) {
        fotoUrl = photoPreview;
      }
    }

    const dataToSave = {
      ...formData,
      foto_url: fotoUrl || formData.foto_url,
    };
    setIsSaving(true);
    try {
      await onSave(dataToSave);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90dvh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">
              {isNew ? 'Nuevo personal' : 'Editar personal'}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {isNew ? 'Añade nuevo miembro del personal' : 'Actualiza información del personal'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-5 sm:p-8 space-y-6 max-h-[70dvh] overflow-y-auto flex-1">
          {/* Foto de perfil */}
          <div className="flex flex-col items-center">
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Foto</label>
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full border-[3px] border-dashed border-[#a73741] flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-all group overflow-hidden"
              >
                {photoPreview ? (
                  <img loading="lazy" decoding="async" src={photoPreview} alt="Preview" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400">
                    {getInitials(formData.nombre || '?')}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#a73741] rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white hover:bg-[#7a1f2a] transition-colors"
              >
                <i className="fa-solid fa-camera text-[10px]"></i>
              </button>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Nombre y apellido</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="Ej: Juan García López"
            />
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Cargo</label>
            <select
              value={formData.cargo || ''}
              onChange={(e) => setFormData({...formData, cargo: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
            >
              <option value="">Seleccionar cargo...</option>
              {ROLES_TECNICOS.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Teléfono</label>
            <input
              type="tel"
              value={formData.telefono || ''}
              onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="Ej: +34 612 345 678"
            />
          </div>

          {/* DNI */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">DNI</label>
            <input
              type="text"
              value={(formData as any).dni || ''}
              onChange={(e) => setFormData({...(formData as any), dni: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="Ej: 12345678X"
            />
          </div>

          {/* Correo */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Correo</label>
            <input
              type="email"
              value={(formData as any).email || ''}
              onChange={(e) => setFormData({...(formData as any), email: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="Ej: ejemplo@correo.com"
            />
          </div>

          {/* Equipos */}
          {equipos.length > 0 && (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Equipos</label>
              <div className="space-y-2">
                {equipos.map(eq => (
                  <label key={eq.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={((formData as any).equipo_ids || []).includes(eq.id)}
                      onChange={(e) => {
                        const current = ((formData as any).equipo_ids || []) as string[];
                        if (e.target.checked) {
                          setFormData({...(formData as any), equipo_ids: [...current, eq.id]});
                        } else {
                          setFormData({...(formData as any), equipo_ids: current.filter(id => id !== eq.id)});
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-[var(--accent)] cursor-pointer"
                    />
                    <span className="text-sm font-bold text-slate-700">{eq.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-3 sm:gap-4">
          <button
            disabled={isSaving}
            onClick={onClose}
            className="flex-1 py-3.5 border border-slate-200 rounded-xl font-black text-slate-500 bg-white hover:bg-slate-50 transition-colors uppercase text-[10px] tracking-widest"
          >
            Cancelar
          </button>
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="flex-[2] py-3.5 bg-[var(--accent)] text-white rounded-xl font-black hover:bg-[var(--accent-dark)] transition-all shadow-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
          >
            {isSaving ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className={`fa-solid ${isNew ? 'fa-user-plus' : 'fa-user-check'}`}></i>}
            {isNew ? 'Crear personal' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditStaffModal;
