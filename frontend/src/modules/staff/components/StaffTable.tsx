import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '../../../shared/components/DataTable';
import type { DataTableAction } from '../../../shared/components/DataTable';
import type { Club } from '@modules/clubes';
import type { StaffMember } from '../types';
import type { Personal } from '@shared/services/dataService';
import StaffDetailModal from './StaffDetailModal';

interface StaffTableProps {
  staff: Personal[];
  onEdit: (member: Personal) => void;
  onDelete?: (id: string | number) => Promise<void>;
  onCreate?: () => void;
  /** Clubes dados de alta en el sistema */
  clubes: Club[];
  /** Club del usuario autenticado */
  userClubId?: string;
  /** Rol del usuario autenticado */
  userRole?: string;
}

const columnHelper = createColumnHelper<Personal>();

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const StaffTable: React.FC<StaffTableProps> = ({ staff, onEdit, onDelete, onCreate, clubes, userClubId, userRole }) => {
  const { t } = useTranslation();
  const isAdmin = userRole === 'Administrador' || userRole === 'Responsable';

  // Filtro de equipo: muestra solo EF HUESCA
  const [clubFilter, setClubFilter] = useState<string>(userClubId || '');

  // Detectar el ID de EF HUESCA
  const efHuescaId = useMemo(() => {
    const club = clubes.find(c => c.nombre?.includes('HUESCA'));
    return club ? String(club.id) : '';
  }, [clubes]);

  // Miembro seleccionado para la vista de detalle
  const [viewingStaff, setViewingStaff] = useState<Personal | null>(null);

  const teamsById = useMemo(() => new Map(clubes.map(c => [String(c.id), c])), [clubes]);

  const filteredStaff = useMemo(() => {
    if (clubFilter === 'all') return staff;
    return staff.filter(s => s.club_id === clubFilter);
  }, [staff, clubFilter]);

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'foto',
      header: t('staffTable.photo'),
      size: 56,
      cell: ({ row }) => {
        const member = row.original;
        const hasImage = member.foto_url && /^(https?:\/\/|data:image\/|\/)/i.test(member.foto_url);
        const initials = getInitials(member.nombre);
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-semibold text-sm border border-slate-100 overflow-hidden">
            {hasImage ? (
              <img src={member.foto_url} alt={member.nombre} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        );
      },
      enableSorting: false,
    }),
    columnHelper.accessor('nombre', {
      header: t('staffTable.fullName'),
      cell: info => <span className="font-semibold text-slate-800">{info.getValue()}</span>,
    }),
    columnHelper.accessor('cargo', {
      header: t('staffTable.role'),
      cell: info => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
          {info.getValue() || t('staffTable.noRole')}
        </span>
      ),
    }),
    columnHelper.accessor('telefono', {
      header: t('staffTable.phone'),
      cell: info => <span className="text-slate-400 tabular-nums">{info.getValue() || '-'}</span>,
    }),
    columnHelper.display({
      id: 'equipo',
      header: t('staffTable.team', 'Equipo'),
      cell: ({ row }) => {
        const member = row.original;
        if (!member.equipo_ids || member.equipo_ids.length === 0) return <span className="text-slate-400">-</span>;
        return (
          <span className="text-slate-600 text-sm">{member.equipo_ids.length} equipo(s)</span>
        );
      },
    }),
    columnHelper.accessor('email', {
      header: t('staffTable.email', 'Correo'),
      cell: info => <span className="text-slate-600 text-sm">{info.getValue() || '-'}</span>,
    }),
  ], []);

  const actions = useMemo<DataTableAction<Personal>[]>(() => [
    {
      icon: 'fa-regular fa-eye',
      label: t('staffTable.viewDetail'),
      onClick: (member) => setViewingStaff(member),
    },
    {
      icon: 'fa-regular fa-pen-to-square',
      label: t('common.edit'),
      onClick: (member) => onEdit(member),
    },
    ...(onDelete ? [{
      icon: 'fa-regular fa-trash-can',
      label: t('common.delete'),
      onClick: (member: Personal) => {
        if (window.confirm(t('staffTable.deleteConfirm', { name: member.nombre }))) {
          onDelete(member.id);
        }
      },
      danger: true,
    }] : []),
  ], [onEdit, onDelete]);

  return (
    <div className="space-y-6">
      {/* PAGE TITLE */}
      <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
        {t('sidebar.technicalStaffLabel', 'Personal')}
      </h2>

      {/* Filtro de equipo + Botón crear */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Selector de equipo */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo:</span>
          <div className="relative">
            <select
              value={clubFilter}
              onChange={e => setClubFilter(e.target.value)}
              disabled={!isAdmin}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 appearance-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {clubes.map(club => (
                <option key={club.id} value={String(club.id)}>{club.nombre}</option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]"></i>
          </div>
          {/* Badge con logo del club seleccionado */}
          {clubFilter !== 'all' && (() => {
            const selTeam = teamsById.get(clubFilter);
            return selTeam?.logoUrl ? (
              <img src={selTeam.logoUrl} alt={selTeam.nombre} className="w-6 h-6 rounded object-contain" />
            ) : null;
          })()}
        </div>

        {onCreate && (
          <button
            onClick={onCreate}
            className="bg-[var(--accent)] text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-[var(--accent-dark)] transition-all"
          >
            <i className="fa-solid fa-user-plus text-sm"></i>
            {t('staffTable.addPersonal')}
          </button>
        )}
      </div>

      <DataTable<Personal>
        data={filteredStaff}
        columns={columns}
        actions={actions}
        onRowClick={(member) => setViewingStaff(member)}
        searchable
        searchPlaceholder={t('staffTable.searchPlaceholder')}
        sortable
        paginated
        pageSize={15}
        pageSizeOptions={[15, 25, 50, 100]}
        exportable
        exportFilename="staff"
        emptyMessage={t('staffTable.noStaffFound')}
        emptyIcon="fa-solid fa-users"
      />

      {viewingStaff && (
        <StaffDetailModal
          staff={viewingStaff}
          clubName={teamsById.get(String(viewingStaff.club_id))?.nombre}
          onClose={() => setViewingStaff(null)}
          onEdit={(member) => { setViewingStaff(null); onEdit(member); }}
          onDelete={onDelete ? (id) => {
            if (window.confirm(t('staffTable.deleteConfirm', { name: viewingStaff.nombre }))) {
              setViewingStaff(null);
              onDelete(id);
            }
          } : undefined}
        />
      )}
    </div>
  );
};

export default StaffTable;
