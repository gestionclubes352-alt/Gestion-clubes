import React, { useMemo, useState } from 'react';
import { EquipoInterno } from '../types';
import EditEquipoInternoModal from './EditEquipoInternoModal';

interface EquiposInternosViewProps {
  equipos: EquipoInterno[];
  clubId?: string | number;
  onEdit?: (equipo: EquipoInterno) => void | Promise<void>;
  onDelete?: (id: number | string) => void;
}

const EquiposInternosView: React.FC<EquiposInternosViewProps> = ({ equipos, clubId, onEdit, onDelete }) => {
  const [editingEquipo, setEditingEquipo] = useState<EquipoInterno | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');

  const filteredEquipos = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (!q) return sorted;
    return sorted.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      (e.etapa || '').toLowerCase().includes(q) ||
      (e.equipo || '').toLowerCase().includes(q) ||
      (e.nombreEnFed || '').toLowerCase().includes(q)
    );
  }, [equipos, search]);

  return (
    <>
      {/* PAGE TITLE */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1" />
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          Equipos Internos
        </h2>
        <div className="flex-1 flex justify-end">
          {onEdit && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              Nuevo Equipo
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 font-semibold mb-4 -mt-3 text-center sm:text-left">
        Da de alta y gestiona los equipos propios de tu club (categorías, escudo, campo, federación...).
      </p>

      {/* BÚSQUEDA */}
      <div className="relative mb-6 max-w-md">
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, etapa, equipo interno..."
          className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </div>

      {/* SIN RESULTADOS */}
      {filteredEquipos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-300 rounded-2xl border border-dashed border-slate-200 bg-white">
          <i className="fa-solid fa-shield text-4xl mb-3"></i>
          <span className="text-sm font-bold uppercase tracking-widest">
            {equipos.length === 0 ? 'Aún no hay equipos internos dados de alta' : 'Sin resultados'}
          </span>
        </div>
      )}

      {/* GRID DE TARJETAS */}
      {filteredEquipos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipos.map(equipo => (
            <div key={String(equipo.id)} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {equipo.logoUrl ? (
                    <img loading="lazy" decoding="async" src={equipo.logoUrl} alt={equipo.nombre} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <i className="fa-solid fa-shield text-slate-300 text-lg"></i>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{equipo.nombre}</p>
                  {equipo.nombreEnFed && (
                    <p className="text-[10px] text-slate-400 font-semibold truncate">{equipo.nombreEnFed}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {equipo.etapa && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-black uppercase tracking-wide">
                    {equipo.etapa}
                  </span>
                )}
                {equipo.equipo && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">
                    {equipo.equipo}
                  </span>
                )}
              </div>

              {(equipo.estadio || equipo.localidad) && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <i className="fa-solid fa-location-dot text-slate-300"></i>
                  {[equipo.estadio, equipo.localidad].filter(Boolean).join(' · ')}
                </p>
              )}

              {equipo.enlace && (
                <a href={equipo.enlace} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline text-[11px] font-bold">
                  <i className="fa-solid fa-arrow-up-right-from-square mr-1 text-[10px]"></i>Ver enlace
                </a>
              )}

              <div className="flex items-center justify-end gap-2 mt-auto pt-2 border-t border-slate-100">
                {onEdit && (
                  <button
                    onClick={() => setEditingEquipo(equipo)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[var(--accent)] hover:text-white text-slate-500 flex items-center justify-center transition-all"
                    title="Editar"
                  >
                    <i className="fa-regular fa-pen-to-square text-xs"></i>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(equipo.id)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 flex items-center justify-center transition-all"
                    title="Eliminar"
                  >
                    <i className="fa-regular fa-trash-can text-xs"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {editingEquipo && onEdit && (
        <EditEquipoInternoModal
          equipo={editingEquipo}
          onClose={() => setEditingEquipo(null)}
          onSave={async (updated) => {
            await onEdit(updated);
            setEditingEquipo(null);
          }}
        />
      )}
      {isCreating && onEdit && (
        <EditEquipoInternoModal
          equipo={{ id: Date.now(), nombre: '', clubId }}
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

export default EquiposInternosView;
