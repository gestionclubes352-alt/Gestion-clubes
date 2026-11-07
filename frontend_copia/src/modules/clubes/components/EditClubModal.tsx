import React, { useState, useRef } from 'react';
import { Club } from '../types';
import { uploadClubLogo } from '../../../shared/services/photoService';

interface EditClubModalProps {
  club: Club;
  clubId?: string;
  isNew?: boolean;
  onClose: () => void;
  onSave: (club: Club) => Promise<void>;
}

const EditClubModal: React.FC<EditClubModalProps> = ({ club, clubId, isNew, onClose, onSave }) => {
  const [formData, setFormData] = useState<Club>({ ...club });
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(club.logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) return;
    setIsSaving(true);
    try {
      let logoUrl = formData.logoUrl || '';

      if (logoFile && clubId) {
        try {
          const clubEntityId = formData.id ? String(formData.id) : String(Date.now());
          const UPLOAD_TIMEOUT_MS = 8000;
          logoUrl = await Promise.race([
            uploadClubLogo(logoFile, clubEntityId, clubId),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Tiempo de espera agotado al subir el escudo')), UPLOAD_TIMEOUT_MS)
            ),
          ]);
        } catch (err) {
          console.warn('No se pudo subir el escudo:', err);
          if (logoPreview && logoPreview.startsWith('data:image/')) {
            logoUrl = logoPreview;
          }
        }
      } else if (logoFile && !clubId) {
        if (logoPreview && logoPreview.startsWith('data:image/')) {
          logoUrl = logoPreview;
        }
      } else if (!logoPreview) {
        logoUrl = '';
      }

      await onSave({ ...formData, logoUrl });
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
            <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">{isNew ? 'Nuevo Club' : 'Editar Club'}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{isNew ? 'Añadir club' : 'Datos del club'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-8 space-y-6 max-h-[70dvh] overflow-y-auto flex-1">
          {/* Escudo */}
          <div className="flex flex-col items-center">
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">
              Escudo del Club
            </label>
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
                className="w-28 h-28 rounded-2xl border-[3px] border-dashed border-[#a73741] flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-all group overflow-hidden"
              >
                {logoPreview ? (
                  <img loading="lazy" decoding="async"
                    src={logoPreview}
                    alt="Escudo"
                    className="w-full h-full object-contain p-2 group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-300 group-hover:text-slate-400 transition-colors">
                    <i className="fa-solid fa-shield-halved text-3xl"></i>
                    <span className="text-[8px] font-black uppercase tracking-widest">Añadir</span>
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
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white hover:bg-red-600 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-[8px]"></i>
                </button>
              )}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
              Nombre del Club *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 uppercase"
              placeholder="Ej: DERIO, C.D."
            />
          </div>

          {/* Localidad */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
              Localidad
            </label>
            <input
              type="text"
              value={formData.localidad || ''}
              onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
              placeholder="Ej: Derio"
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
            disabled={isSaving || !formData.nombre.trim()}
            onClick={handleSave}
            className="flex-[2] py-3.5 bg-[var(--accent)] text-white rounded-xl font-black hover:bg-[var(--accent-dark)] transition-all shadow-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <i className="fa-solid fa-spinner animate-spin"></i>
            ) : (
              <i className="fa-solid fa-shield-halved"></i>
            )}
            Guardar Club
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditClubModal;
