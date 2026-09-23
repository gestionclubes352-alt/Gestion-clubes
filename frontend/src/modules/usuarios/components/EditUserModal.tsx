import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '../types';
import { uploadStaffPhoto } from '../../../shared/services/staffPhotoService';
import SearchableSelect from '@shared/components/SearchableSelect';
import type { EquipoInterno } from '../../equiposInternos/types';

interface EditUserModalProps {
  user: User;
  isNew?: boolean;
  clubId?: string;
  equipos?: EquipoInterno[];
  isAdmin?: boolean;
  onClose: () => void;
  onSave: (user: User, password?: string, sendEmail?: boolean) => Promise<void>;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const EditUserModal: React.FC<EditUserModalProps> = ({ user, isNew, clubId, equipos, isAdmin, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<User>({ ...user });
  const isPlayerRole = formData.rol === 'Jugador';
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user.fotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = new Uint32Array(12);
    crypto.getRandomValues(bytes);
    const generated = Array.from(bytes, (n) => chars[n % chars.length]).join('');
    setPassword(generated);
    setShowPassword(true);
  };

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
    if (isPlayerRole && !formData.equipoId) {
      alert(t('editUser.teamRequired'));
      return;
    }

    let fotoUrl = formData.fotoUrl;
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
      // Sin clubId, usar base64 como fallback
      if (photoPreview && photoPreview.startsWith('data:image/')) {
        fotoUrl = photoPreview;
      }
    }

    const dataToSave = {
      ...formData,
      fotoUrl: fotoUrl || formData.fotoUrl,
    };
    setIsSaving(true);
    try {
      await onSave(dataToSave, password || undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPassword = async () => {
    if (!password || !formData.email) return;
    if (isPlayerRole && !formData.equipoId) {
      alert(t('editUser.teamRequired'));
      return;
    }
    setIsSendingEmail(true);
    try {
      await onSave({ ...formData }, password, true);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90dvh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">{t('editUser.manageAccess')}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('editUser.userPermissions')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-5 sm:p-8 space-y-6 max-h-[70dvh] overflow-y-auto flex-1">
          {/* Foto de perfil */}
          <div className="flex flex-col items-center">
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">{t('editUser.profilePhoto')}</label>
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

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">{t('editUser.fullName')}</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 uppercase"
              placeholder={t('editUser.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">{t('editUser.accessEmail')}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none"
              placeholder={t('editUser.emailPlaceholder')}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{isNew ? t('editUser.password') : t('editUser.passwordEditLabel')}</label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest hover:underline"
              >
                {t('editUser.generatePassword')}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
                placeholder={isNew ? t('editUser.passwordPlaceholder') : t('editUser.passwordKeepPlaceholder')}
                autoComplete="new-password"
              />
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? t('editUser.hidePassword') : t('editUser.showPassword')}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                </button>
              )}
            </div>
            {!isNew && (
              <p className="text-[10px] text-slate-400 mt-1.5">{t('editUser.passwordSecurityNote')}</p>
            )}
            {password && !isNew && (
              <button
                type="button"
                disabled={isSendingEmail || isSaving}
                onClick={handleSendPassword}
                className="mt-3 w-full py-2.5 border border-[var(--accent)] text-[var(--accent)] rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--accent)] hover:text-white transition-all disabled:opacity-50"
              >
                {isSendingEmail ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                {isSendingEmail ? t('editUser.sendingPassword') : t('editUser.sendPassword')}
              </button>
            )}
          </div>

          {isAdmin && (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">{t('editUser.remember')}</label>
              <input
                type="text"
                value={formData.recordar || ''}
                onChange={(e) => setFormData({...formData, recordar: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
                placeholder={t('editUser.rememberPlaceholder')}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">{t('editUser.systemRole')}</label>
              <SearchableSelect
                value={formData.rol}
                onChange={(e) => setFormData({...formData, rol: e.target.value as User['rol']})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 appearance-none"
              >
                <option value="Responsable">{t('editUser.roleResponsable')}</option>
                <option value="Administrador">{t('editUser.roleAdmin')}</option>
                <option value="Tecnico">{t('editUser.roleTechnician')}</option>
                <option value="Jugador">{t('editUser.rolePlayer')}</option>
              </SearchableSelect>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">{t('common.status')}</label>
              <SearchableSelect
                value={formData.estado}
                onChange={(e) => setFormData({...formData, estado: e.target.value as User['estado']})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 appearance-none"
              >
                <option value="Activo">{t('common.active')}</option>
                <option value="Inactivo">{t('common.inactive')}</option>
              </SearchableSelect>
            </div>
          </div>

          {isPlayerRole && (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">{t('editUser.linkedTeam')}</label>
              <SearchableSelect
                value={formData.equipoId || ''}
                onChange={(e) => {
                  const equipoId = e.target.value;
                  setFormData(prev => ({ ...prev, equipoId }));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 appearance-none"
              >
                <option value="">{t('editUser.selectTeam')}</option>
                {(equipos || []).map(eq => (
                  <option key={eq.id} value={String(eq.id)}>
                    {eq.nombre}{eq.equipo ? ` (${eq.equipo})` : ''}
                  </option>
                ))}
              </SearchableSelect>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-3 sm:gap-4">
          <button
            disabled={isSaving}
            onClick={onClose}
            className="flex-1 py-3.5 border border-slate-200 rounded-xl font-black text-slate-500 bg-white hover:bg-slate-50 transition-colors uppercase text-[10px] tracking-widest"
          >
            {t('common.cancel')}
          </button>
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="flex-[2] py-3.5 bg-[var(--accent)] text-white rounded-xl font-black hover:bg-[var(--accent-dark)] transition-all shadow-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
          >
            {isSaving ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className={`fa-solid ${isNew ? 'fa-user-plus' : 'fa-user-check'}`}></i>}
            {isNew ? t('editUser.createUser') : t('editUser.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
