import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Club } from '../types';
import EditClubModal from './EditClubModal';

interface ClubesTableProps {
  clubes: Club[];
  clubId?: string;
  onEdit?: (club: Club) => void | Promise<void>;
  onDelete?: (id: number | string) => void;
}

const ClubesTable: React.FC<ClubesTableProps> = ({ clubes, clubId, onEdit, onDelete }) => {
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const filteredClubes = useMemo(() => {
    const q = search.trim().toLowerCase();

    // Separar MI CLUB del resto
    const myClub = clubId ? clubes.find(c => String(c.id) === String(clubId)) : null;
    const otherClubes = clubes.filter(c => !myClub || String(c.id) !== String(clubId));

    // Ordenar el resto alfabéticamente
    const sortedOthers = otherClubes.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // MI CLUB primero, luego los demás
    const sorted = myClub ? [myClub, ...sortedOthers] : sortedOthers;

    if (!q) return sorted;
    return sorted.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.localidad || '').toLowerCase().includes(q)
    );
  }, [clubes, search, clubId]);

  return (
    <>
      {/* PAGE TITLE */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1" />
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          {t('sidebar.clubsLabel', 'Clubes')}
        </h2>
        <div className="flex-1 flex justify-end">
          {onEdit && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              Nuevo Club
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar club, localidad..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      {/* AVISO: sin clubes todavía */}
      {clubes.length === 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
          <i className="fa-solid fa-circle-info"></i>
          <span className="text-xs font-bold">
            Aún no hay clubes creados. Crea un club antes de dar de alta un equipo en la sección Equipos.
          </span>
        </div>
      )}

      {/* GRID DE CLUBES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClubes.length === 0 && clubes.length > 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-300">
            <i className="fa-solid fa-shield-halved text-4xl mb-3"></i>
            <span className="text-sm font-bold uppercase tracking-widest">Sin resultados</span>
          </div>
        )}

        {filteredClubes.map((club) => {
          const isMyClub = clubId && String(club.id) === String(clubId);
          return (
            <div
              key={String(club.id)}
              className={`rounded-2xl border p-4 flex items-center gap-3 transition-all relative ${
                isMyClub
                  ? 'border-[var(--accent)] bg-gradient-to-br from-[var(--accent)]/5 to-white shadow-md hover:shadow-lg'
                  : 'border-slate-200 bg-white shadow-sm hover:shadow-md'
              }`}
            >
              {isMyClub && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--accent)] text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                  MI CLUB
                </div>
              )}
              <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {club.logoUrl ? (
                  <img loading="lazy" decoding="async" src={club.logoUrl} alt={club.nombre} className="max-w-full max-h-full object-contain" />
                ) : (
                  <i className="fa-solid fa-shield-halved text-slate-300"></i>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-black uppercase tracking-tight truncate ${
                  isMyClub ? 'text-[var(--accent)]' : 'text-slate-800'
                }`}>
                  {club.nombre}
                </div>
                <div className="text-xs text-slate-400 truncate">{club.localidad || '—'}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onEdit && (
                  <button
                    onClick={() => setEditingClub(club)}
                    className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-[var(--accent)] hover:text-white text-slate-500 flex items-center justify-center transition-all"
                    title="Editar"
                  >
                    <i className="fa-regular fa-pen-to-square text-[11px]"></i>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(club.id)}
                    className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-red-500 hover:text-white text-slate-500 flex items-center justify-center transition-all"
                    title="Eliminar"
                  >
                    <i className="fa-regular fa-trash-can text-[11px]"></i>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modales */}
      {editingClub && onEdit && (
        <EditClubModal
          club={editingClub}
          clubId={clubId}
          onClose={() => setEditingClub(null)}
          onSave={async (updated) => {
            await onEdit(updated);
            setEditingClub(null);
          }}
        />
      )}
      {isCreating && onEdit && (
        <EditClubModal
          club={{ id: Date.now(), nombre: '' }}
          clubId={clubId}
          isNew
          onClose={() => setIsCreating(false)}
          onSave={async (created) => {
            await onEdit(created);
            setIsCreating(false);
          }}
        />
      )}
    </>
  );
};

export default ClubesTable;
