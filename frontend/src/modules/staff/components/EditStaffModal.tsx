import React, { useState, useRef } from 'react';
import { uploadStaffPhoto } from '../../../shared/services/staffPhotoService';
import EquipoSelect from '../../../shared/components/EquipoSelect';
import type { StaffMember } from '../types';

interface EditStaffModalProps {
  member: StaffMember;
  clubId: string;
  onClose: () => void;
  onSave: (member: StaffMember) => Promise<void>;
}

const EditStaffModal: React.FC<EditStaffModalProps> = ({ member, clubId, onClose, onSave }) => {
  const [formData, setFormData] = useState<StaffMember>({ ...member });
  const [preview, setPreview] = useState<string | null>(member.fotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File|null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (field: keyof StaffMember, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getInitials = () => {
    const n = formData.nombre || '';
    const a = formData.primerApellido || '';
    return `${n.charAt(0)}${a.charAt(0)}`.toUpperCase() || '?';
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-110 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in text-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="p-5 flex justify-between items-center border-b border-slate-50">
          <h3 className="text-[var(--accent)] font-bold text-lg uppercase tracking-tighter">Editar Personal</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="px-8 pb-8 pt-6">
          <div className="flex flex-col items-center mb-8">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">FOTO</span>
            <div className="relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
              <div 
                onClick={triggerFileInput}
                className="w-32 h-32 rounded-full border-[3px] border-dashed border-[#a73741] flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-all group overflow-hidden"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-full h-full bg-red-100 flex items-center justify-center text-4xl font-black text-[#a73741]">
                    {getInitials()}
                  </div>
                )}
              </div>
              <button 
                onClick={triggerFileInput}
                className="absolute bottom-1 right-1 w-9 h-9 bg-[#a73741] rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white hover:bg-[#7a1f2a] transition-colors"
              >
                <i className="fa-solid fa-arrow-up-from-bracket text-xs"></i>
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">NOMBRE *</label>
                <input 
                  type="text" 
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">PRIMER APELLIDO *</label>
                <input 
                  type="text" 
                  value={formData.primerApellido}
                  onChange={(e) => handleChange('primerApellido', e.target.value)}
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">SEGUNDO APELLIDO</label>
                <input 
                  type="text" 
                  value={formData.segundoApellido || ''}
                  onChange={(e) => handleChange('segundoApellido', e.target.value)}
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">DNI</label>
                <input 
                  type="text" 
                  value={formData.dni || ''}
                  onChange={(e) => handleChange('dni', e.target.value)}
                  placeholder="12345678A"
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">FECHA DE NACIMIENTO</label>
                <input 
                  type="date" 
                  value={formData.fechaNacimiento || ''}
                  onChange={(e) => handleChange('fechaNacimiento', e.target.value)}
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">ROL *</label>
                <input 
                  type="text" 
                  value={formData.rol}
                  onChange={(e) => handleChange('rol', e.target.value)}
                  placeholder="Ej: Entrenador, Fisioterapeuta..."
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">EQUIPO</label>
                <EquipoSelect
                  value={formData.equipo || ''}
                  onChange={(val) => handleChange('equipo', val)}
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">ETAPA</label>
                <input 
                  type="text" 
                  value={formData.etapa || ''}
                  onChange={(e) => handleChange('etapa', e.target.value)}
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">COMPETICIÓN</label>
                <input 
                  type="text" 
                  value={formData.competicion || ''}
                  onChange={(e) => handleChange('competicion', e.target.value)}
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">TELÉFONO</label>
                <input 
                  type="text" 
                  value={formData.telefono || ''}
                  placeholder="+34 600..."
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">CORREO</label>
                <input 
                  type="email" 
                  value={formData.email || ''}
                  placeholder="email@ejemplo.com"
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 border border-slate-100 rounded-xl font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest order-2 sm:order-1"
          >
            Cancelar
          </button>
          <button 
            onClick={async () => {
              let fotoUrl = formData.fotoUrl || '';
              if (photoFile) {
                try {
                  const staffId = formData.id ? String(formData.id) : String(Date.now());
                  fotoUrl = await uploadStaffPhoto(photoFile, staffId, clubId);
                } catch (uploadErr) {
                  console.warn('No se pudo subir la foto:', uploadErr);
                  if (preview && preview.startsWith('data:image/')) {
                    fotoUrl = preview;
                  }
                }
              }
              const updatedMember = { ...formData, fotoUrl: fotoUrl || '' };
              try {
                await onSave(updatedMember);
                onClose();
              } catch (e) {
                console.error('Error saving staff:', e);
                alert('Error al guardar. Reintenta.');
              }
            }}
            className="flex-2 py-3.5 bg-[var(--accent)] text-white rounded-xl font-bold hover:bg-[var(--accent-dark)] transition-all shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            <i className="fa-solid fa-floppy-disk"></i>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditStaffModal;
