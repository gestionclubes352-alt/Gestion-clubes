import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Personal } from '@shared/services/dataService';

interface StaffDetailModalProps {
  staff: Personal;
  clubName?: string;
  onClose: () => void;
  onEdit?: (staff: Personal) => void;
  onDelete?: (id: string | number) => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const DetailRow: React.FC<{ icon: string; label: string; value?: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-b-0">
    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
      <i className={`${icon} text-xs`}></i>
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-800 truncate">{value || '-'}</p>
    </div>
  </div>
);

const StaffDetailModal: React.FC<StaffDetailModalProps> = ({ staff, clubName, onClose, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const hasImage = staff.foto_url && /^(https?:\/\/|data:image\/|\/)/i.test(staff.foto_url);

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xl border border-slate-200 overflow-hidden shrink-0">
            {hasImage ? (
              <img loading="lazy" decoding="async" src={staff.foto_url} alt={staff.nombre} className="w-full h-full object-cover" />
            ) : (
              <span>{getInitials(staff.nombre)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter truncate">
              {staff.nombre}
            </h3>
            <span className="inline-flex items-center px-2.5 py-1 mt-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              {staff.cargo || t('staffTable.noRole')}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-5 sm:p-8 max-h-[60dvh] overflow-y-auto flex-1">
          <DetailRow icon="fa-solid fa-phone" label={t('staffTable.phone')} value={staff.telefono} />
          <DetailRow icon="fa-solid fa-id-card" label={t('staffTable.dni')} value={staff.dni} />
          <DetailRow icon="fa-solid fa-envelope" label={t('staffTable.email')} value={staff.email} />
          <DetailRow icon="fa-solid fa-shield" label={t('staffTable.club')} value={clubName} />
        </div>

        <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-3 sm:gap-4">
          {onDelete && (
            <button
              onClick={() => onDelete(staff.id)}
              className="w-14 flex items-center justify-center border border-red-200 rounded-xl text-red-500 bg-white hover:bg-red-50 transition-colors"
              title={t('common.delete')}
            >
              <i className="fa-regular fa-trash-can"></i>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3.5 border border-slate-200 rounded-xl font-black text-slate-500 bg-white hover:bg-slate-50 transition-colors uppercase text-[10px] tracking-widest"
          >
            {t('common.close')}
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(staff)}
              className="flex-[2] py-3.5 bg-[var(--accent)] text-white rounded-xl font-black hover:bg-[var(--accent-dark)] transition-all shadow-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
            >
              <i className="fa-regular fa-pen-to-square"></i>
              {t('common.edit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDetailModal;
