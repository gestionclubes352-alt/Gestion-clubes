/**
 * @fileoverview Tabla de usuarios unificada con Firebase Auth.
 *
 * Firebase Auth es la fuente de verdad para:
 *   - Quién puede iniciar sesión
 *   - Rol del sistema (Custom Claims: role)
 *   - Estado de aprobación (Custom Claims: approved)
 *   - Último acceso
 *
 * Los datos locales (db.users) proporcionan información de perfil
 * complementaria: departamento, rolTecnico, teléfono, foto.
 *
 * La tabla fusiona ambas fuentes y muestra una vista coherente.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '../../../shared/components/DataTable';
import type { DataTableAction } from '../../../shared/components/DataTable';
import { User } from '../types';
import { listAllUsers, listClubUsers, approveUser as approveUserApi } from '../../../shared/services/roleService';
import type { ClubUser } from '../../../shared/services/roleService';
import { DEV_EMAILS } from '../../../shared/services';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { AVAILABLE_TEAMS } from '../../auth/types';

interface UserTableProps {
  /** Datos de perfil locales (departamento, rolTecnico, etc.) */
  users: User[];
  onEdit: (user: User) => void;
  onDelete?: (id: number | string) => void;
  onCreate?: () => void;
  /** Club activo — si se proporciona, solo muestra usuarios de ese club */
  clubId?: string;
}

const columnHelper = createColumnHelper<User>();

// ── Badge helpers ──────────────────────────────────────────

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    'Activo': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Pendiente': 'bg-amber-50 text-amber-600 border-amber-200',
    'Inactivo': 'bg-slate-50 text-slate-500 border-slate-200',
    'Sin cuenta': 'bg-blue-50 text-blue-500 border-blue-200',
  };
  return map[status] || map['Inactivo'];
};

const getStatusDot = (status: string) => {
  const map: Record<string, string> = {
    'Activo': 'bg-emerald-500',
    'Pendiente': 'bg-amber-500 animate-pulse',
    'Inactivo': 'bg-slate-400',
    'Sin cuenta': 'bg-blue-400',
  };
  return map[status] || 'bg-slate-400';
};

const getRoleBadge = (role: string) => {
  const colors: Record<string, string> = {
    'Responsable': 'bg-violet-50 text-violet-600 border-violet-200',
    'Administrador': 'bg-teal-50 text-teal-600 border-teal-200',
    'Tecnico': 'bg-amber-50 text-amber-600 border-amber-200',
    'Pendiente': 'bg-orange-50 text-orange-600 border-orange-200',
  };
  return colors[role] || colors['Tecnico'];
};

const getDeptBadge = (dept: string) => {
  const colors: Record<string, string> = {
    'Personal': 'bg-blue-50 text-blue-600 border-blue-200',
    'Directiva': 'bg-purple-50 text-purple-600 border-purple-200',
    'Dirección Deportiva': 'bg-orange-50 text-orange-600 border-orange-200',
  };
  return colors[dept] || 'bg-slate-50 text-slate-500 border-slate-200';
};

/** Mapa de equipos por id para lookup rápido */
const teamsById = new Map(AVAILABLE_TEAMS.map(t => [t.id, t]));

// ── Componente ─────────────────────────────────────────────

const UserTable: React.FC<UserTableProps> = ({ users: localUsers, onEdit, onDelete, onCreate, clubId }) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [firebaseUsers, setFirebaseUsers] = useState<ClubUser[]>([]);
  const [loadingFB, setLoadingFB] = useState(true);
  const [fbAvailable, setFbAvailable] = useState(true);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [approveRole, setApproveRole] = useState<Record<string, string>>({});

  // Determinar si el usuario actual es desarrollador (ve todos los usuarios)
  const isDevUser = currentUser?.email ? DEV_EMAILS.includes(currentUser.email.toLowerCase()) : false;

  // ── Cargar usuarios de Firebase Auth ───────────────────

  const loadFirebaseUsers = useCallback(async () => {
    setLoadingFB(true);
    try {
      // Devs ven todos los usuarios; usuarios normales ven solo los de su club
      let all: ClubUser[];
      if (isDevUser || !clubId) {
        all = await listAllUsers();
      } else {
        all = await listClubUsers(clubId);
      }
      setFirebaseUsers(all);
      setFbAvailable(all.length > 0);
    } catch {
      setFbAvailable(false);
    }
    setLoadingFB(false);
  }, [clubId, isDevUser]);

  // Cargar al montar + recargar cuando cambian datos locales (tras editar/crear/eliminar)
  // localUsers es un nuevo array reference tras cada fetchData() en App.tsx
  useEffect(() => {
    loadFirebaseUsers();
  }, [localUsers]);

  // ── Fusionar Firebase Auth + datos locales ─────────────

  const pendingUsers = useMemo(() =>
    firebaseUsers.filter(u => !u.approved || u.role === 'Pendiente'),
    [firebaseUsers]
  );

  const mergedUsers: User[] = useMemo(() => {
    // Sin conexión a Firebase → mostrar solo datos locales (fallback)
    if (!fbAvailable || firebaseUsers.length === 0) return localUsers;

    const localByEmail = new Map<string, User>();
    for (const u of localUsers) {
      if (u.email) localByEmail.set(u.email.toLowerCase().trim(), u);
    }

    // Firebase Auth → fuente primaria (solo usuarios aprobados)
    const fromFB: User[] = firebaseUsers
      .filter(fu => fu.approved && fu.role !== 'Pendiente')
      .map(fu => {
        const key = fu.email.toLowerCase().trim();
        const local = localByEmail.get(key);
        if (local) localByEmail.delete(key); // Marcar como emparejado

        return {
          id: local?.id || fu.uid,
          firebaseUid: fu.uid,
          nombre: fu.displayName || local?.nombre || fu.email.split('@')[0],
          email: fu.email,
          rol: fu.role as User['rol'],
          estado: (fu.disabled ? 'Inactivo' : 'Activo') as User['estado'],
          departamento: local?.departamento || 'Personal' as User['departamento'],
          rolTecnico: local?.rolTecnico,
          telefono: local?.telefono,
          fotoUrl: local?.fotoUrl,
          clubId: fu.clubId || local?.clubId,
          ultimoAcceso: fu.lastSignIn
            ? new Date(fu.lastSignIn).toLocaleDateString('es-ES')
            : undefined,
        };
      });

    // Usuarios locales sin cuenta Firebase (staff importado)
    const localOnly: User[] = Array.from(localByEmail.values()).map(u => ({
      ...u,
      estado: 'Sin cuenta' as User['estado'],
    }));

    return [...fromFB, ...localOnly];
  }, [firebaseUsers, localUsers, fbAvailable]);

  // ── Aprobar / Rechazar ─────────────────────────────────

  const handleApprove = async (user: ClubUser) => {
    const role = approveRole[user.uid] || 'Tecnico';
    setApprovingUid(user.uid);
    try {
      const result = await approveUserApi(user.uid, true, role);
      if (result.success) {
        await loadFirebaseUsers();
      } else {
        alert(result.error || t('userTable.approveError'));
      }
    } catch {
      alert(t('userTable.approveError'));
    }
    setApprovingUid(null);
  };

  const handleReject = async (user: ClubUser) => {
    if (!window.confirm(t('userTable.rejectConfirm', { email: user.email }))) return;
    setApprovingUid(user.uid);
    try {
      const result = await approveUserApi(user.uid, false);
      if (result.success) {
        await loadFirebaseUsers();
      } else {
        alert(result.error || t('userTable.rejectError'));
      }
    } catch {
      alert(t('userTable.rejectError'));
    }
    setApprovingUid(null);
  };

  // ── Columnas de la tabla ───────────────────────────────

  const columns = useMemo(() => {
    const statusLabels: Record<string, string> = {
      'Activo': t('common.active'),
      'Pendiente': t('userTable.statusPending'),
      'Inactivo': t('common.inactive'),
      'Sin cuenta': t('userTable.noAccount'),
    };
    const roleLabels: Record<string, string> = {
      'Responsable': t('userTable.roleResponsable'),
      'Administrador': t('users.admin'),
      'Tecnico': t('userTable.roleTechnician'),
      'Pendiente': t('userTable.rolePending'),
    };
    return [
    columnHelper.accessor('nombre', {
      header: t('userTable.user'),
      cell: info => {
        const user = info.row.original;
        const hasFirebase = !!user.firebaseUid;
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              {user.fotoUrl ? (
                <img src={user.fotoUrl} alt={user.nombre} className="w-9 h-9 rounded-lg object-cover border border-slate-200" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-sm border border-slate-200">
                  {info.getValue().charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${hasFirebase ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <i className={`fa-solid ${hasFirebase ? 'fa-check' : 'fa-minus'} text-white text-[6px]`}></i>
              </div>
            </div>
            <div>
              <span className="font-semibold text-slate-800">{info.getValue()}</span>
              {!hasFirebase && (
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{t('userTable.noAccount')}</p>
              )}
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('email', {
      header: t('common.email'),
      cell: info => <span className="text-slate-500">{info.getValue()}</span>,
    }),
    columnHelper.accessor('departamento', {
      header: t('userTable.department'),
      cell: info => {
        const dept = info.getValue();
        const row = info.row.original;
        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border w-fit ${getDeptBadge(dept)}`}>
              {dept || t('userTable.unassigned')}
            </span>
            {dept === 'Personal' && row.rolTecnico && (
              <span className="text-[10px] text-slate-400 font-bold">{row.rolTecnico}</span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('rol', {
      header: t('users.role'),
      cell: info => {
        const hasFirebase = !!info.row.original.firebaseUid;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${getRoleBadge(info.getValue())}`}>
              {roleLabels[info.getValue()] || info.getValue()}
            </span>
            {hasFirebase && (
              <span title={t('userTable.firebaseSynced')} className="text-emerald-400 text-[8px]">
                <i className="fa-solid fa-shield-halved"></i>
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('clubId', {
      header: 'Club',
      cell: info => {
        const row = info.row.original;
        const isAdmin = row.rol === 'Administrador' || row.rol === 'Responsable';

        // Admins/Responsables tienen acceso a todos los clubs
        if (isAdmin) {
          return (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {AVAILABLE_TEAMS.slice(0, 3).map(team => (
                  team.logoUrl ? (
                    <img key={team.id} src={team.logoUrl} alt={team.shortName} className="w-5 h-5 rounded-full object-contain border-2 border-slate-800 bg-white" />
                  ) : (
                    <div key={team.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black text-white border-2 border-slate-800" style={{ backgroundColor: team.colors.primary }}>
                      {team.shortName.charAt(0)}
                    </div>
                  )
                ))}
              </div>
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Todos</span>
            </div>
          );
        }

        const cid = info.getValue();
        const team = cid ? teamsById.get(cid) : undefined;
        if (!team) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border bg-slate-50 text-slate-400 border-slate-200">
              <i className="fa-solid fa-minus text-[8px]"></i>
              {t('userTable.unassigned')}
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.shortName} className="w-6 h-6 rounded object-contain" />
            ) : (
              <div className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: team.colors.primary }}>
                {team.shortName.charAt(0)}
              </div>
            )}
            <span className="text-xs font-bold text-slate-700">{team.shortName}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('estado', {
      header: t('common.status'),
      cell: info => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${getStatusBadge(info.getValue())}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(info.getValue())}`}></span>
          {statusLabels[info.getValue()] || info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('ultimoAcceso', {
      header: t('users.lastLogin'),
      cell: info => <span className="text-slate-400 text-xs">{info.getValue() || t('userTable.never')}</span>,
    }),
  ];
  }, [t]);

  const actions = useMemo<DataTableAction<User>[]>(() => {
    const acts: DataTableAction<User>[] = [
      {
        icon: 'fa-regular fa-pen-to-square',
        label: t('common.edit'),
        onClick: (user) => onEdit(user),
      },
    ];
    if (onDelete) {
      acts.push({
        icon: 'fa-regular fa-trash-can',
        label: t('common.delete'),
        onClick: (user) => onDelete(user.id),
        danger: true,
      });
    }
    return acts;
  }, [onEdit, onDelete, t]);

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* PAGE TITLE */}
      <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
        {t('users.title')}
      </h2>

      {/* ═══ Banner: sin conexión a Firebase ═══ */}
      {!fbAvailable && !loadingFB && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <i className="fa-solid fa-triangle-exclamation text-blue-400 text-lg"></i>
          <div className="flex-1">
            <p className="text-xs font-black text-blue-700 uppercase tracking-tight">
              {t('userTable.localMode')}
            </p>
            <p className="text-[10px] text-blue-500">
              {t('userTable.firebaseConnectionError')}
            </p>
          </div>
          <button
            onClick={loadFirebaseUsers}
            className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-200 transition-all"
          >
            <i className="fa-solid fa-rotate mr-1"></i> {t('userTable.retry')}
          </button>
        </div>
      )}

      {/* ═══ Sección: Solicitudes Pendientes ═══ */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50/50 border-2 border-amber-200 rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-user-clock text-amber-600"></i>
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">
                {t('userTable.pendingRequests')}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {t('userTable.usersAwaitingApproval', { count: pendingUsers.length })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingUsers.map(pu => (
              <div key={pu.uid} className="bg-white rounded-xl border border-amber-100 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {(pu.displayName || pu.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">
                      {pu.displayName || t('userTable.noName')}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{pu.email}</p>
                    {pu.createdAt && (
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        {t('userTable.registered')}: {new Date(pu.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={approveRole[pu.uid] || 'Tecnico'}
                    onChange={(e) => setApproveRole(prev => ({ ...prev, [pu.uid]: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black text-slate-700 uppercase appearance-none flex-1 sm:flex-initial sm:w-32"
                  >
                    <option value="Tecnico">{t('userTable.roleTechnician')}</option>
                    <option value="Administrador">{t('users.admin')}</option>
                    <option value="Responsable">{t('userTable.roleResponsable')}</option>
                  </select>

                  <button
                    onClick={() => handleApprove(pu)}
                    disabled={approvingUid === pu.uid}
                    className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {approvingUid === pu.uid ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <><i className="fa-solid fa-check"></i> {t('userTable.approve')}</>
                    )}
                  </button>

                  <button
                    onClick={() => handleReject(pu)}
                    disabled={approvingUid === pu.uid}
                    className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loadingFB && firebaseUsers.length === 0 && (
        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-center gap-3">
          <i className="fa-solid fa-spinner fa-spin text-slate-400"></i>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('userTable.syncingFirebase')}</span>
        </div>
      )}

      {/* ═══ Header: estado de sincronización + acciones ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {fbAvailable && !loadingFB && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
              <i className="fa-solid fa-shield-halved text-emerald-500 text-[10px]"></i>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                {t('userTable.firebaseSynced')}
              </span>
            </div>
          )}
          <button
            onClick={loadFirebaseUsers}
            disabled={loadingFB}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2"
            title={t('userTable.reloadFirebaseUsers')}
          >
            <i className={`fa-solid fa-arrows-rotate text-sm ${loadingFB ? 'fa-spin' : ''}`}></i>
          </button>
        </div>

        {onCreate && (
          <button
            onClick={onCreate}
            className="bg-[var(--accent)] text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-[var(--accent-dark)] transition-all"
          >
            <i className="fa-solid fa-user-plus text-sm"></i>
            {t('users.addUser')}
          </button>
        )}
      </div>

      {/* ═══ Tabla principal (Firebase Auth + locales fusionados) ═══ */}
      <DataTable<User>
        data={mergedUsers}
        columns={columns}
        actions={actions}
        searchable
        searchPlaceholder={t('userTable.searchPlaceholder')}
        sortable
        paginated
        pageSize={10}
        exportable
        exportFilename="usuarios"
        emptyMessage={t('userTable.noUsersFound')}
        emptyIcon="fa-solid fa-users"
      />
    </div>
  );
};

export default UserTable;
