import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '../../../shared/components/DataTable';
import type { DataTableAction } from '../../../shared/components/DataTable';
import { useIsMobile } from '@shared/hooks/useIsMobile';
import { compareEquipoNames } from '@shared/components/EquipoSelect';
import { Player } from '../types';

interface PlayerTableProps {
  squad: Player[];
  /** Todos los jugadores (todos los clubes), sin el filtro de equipo de la cabecera — usado por la pestaña "Equipos Rivales". */
  allSquad?: Player[];
  onEdit: (player: Player) => void;
  onSave: (player: Player) => Promise<void>;
  onDelete?: (id: number | string) => void;
  clubId?: string;
  onBulkPhotoUpload?: () => void;
  onRemoveBackgrounds?: () => void;
}

const columnHelper = createColumnHelper<Player>();

const formatDate = (dateStr?: string, locale: string = 'es') => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale);
};

const defaultPositionOrder = ['Portero', 'Defensa', 'Medio', 'Delantero'];
const huescaPositionOrder = ['Portero', 'Lateral', 'Central', 'Pivote', 'Media punta', 'Interior', 'Extremo', 'Delantero'];
const positionStyles: Record<string, { chip: string; border: string; text: string; icon: string; bg: string }> = {
  Portero: { chip: 'bg-teal-700 text-white border-teal-800', border: 'border-teal-400', text: 'text-teal-600', icon: 'fa-user-shield', bg: 'bg-teal-50/50' },
  Defensa: { chip: 'bg-emerald-700 text-white border-emerald-800', border: 'border-emerald-400', text: 'text-emerald-600', icon: 'fa-shield-halved', bg: 'bg-emerald-50/50' },
  Lateral: { chip: 'bg-emerald-700 text-white border-emerald-800', border: 'border-emerald-400', text: 'text-emerald-600', icon: 'fa-shield-halved', bg: 'bg-emerald-50/50' },
  Central: { chip: 'bg-emerald-800 text-white border-emerald-900', border: 'border-emerald-500', text: 'text-emerald-700', icon: 'fa-shield', bg: 'bg-emerald-50/50' },
  Medio: { chip: 'bg-[#2e6da4] text-white border-[#265d8e]', border: 'border-blue-400', text: 'text-blue-600', icon: 'fa-route', bg: 'bg-blue-50/50' },
  Pivote: { chip: 'bg-[#2e6da4] text-white border-[#265d8e]', border: 'border-blue-400', text: 'text-blue-600', icon: 'fa-route', bg: 'bg-blue-50/50' },
  'Media punta': { chip: 'bg-indigo-600 text-white border-indigo-700', border: 'border-indigo-400', text: 'text-indigo-600', icon: 'fa-diamond', bg: 'bg-indigo-50/50' },
  Interior: { chip: 'bg-sky-600 text-white border-sky-700', border: 'border-sky-400', text: 'text-sky-600', icon: 'fa-arrows-left-right', bg: 'bg-sky-50/50' },
  Extremo: { chip: 'bg-orange-600 text-white border-orange-700', border: 'border-orange-400', text: 'text-orange-600', icon: 'fa-bolt', bg: 'bg-orange-50/50' },
  Delantero: { chip: 'bg-[#c8102e] text-white border-[#a00d25]', border: 'border-red-400', text: 'text-red-600', icon: 'fa-futbol', bg: 'bg-red-50/50' },
  Otros: { chip: 'bg-slate-600 text-white border-slate-700', border: 'border-slate-400', text: 'text-slate-600', icon: 'fa-user', bg: 'bg-slate-50/50' },
};

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const isImageUrl = (value: string): boolean =>
  /^(https?:\/\/|data:image\/|\/)/i.test(value);

const normalizeTeamLabel = (team: string) =>
  team
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const PlayerTable: React.FC<PlayerTableProps> = ({ squad, allSquad, onEdit, onSave, onDelete, clubId, onBulkPhotoUpload, onRemoveBackgrounds }) => {
  const { t, i18n } = useTranslation();
  const { isMobile } = useIsMobile();
  const isHuesca = clubId === 'escuela-huesca';
  const positionOrder = isHuesca ? huescaPositionOrder : defaultPositionOrder;
  const [activeTab, setActiveTab] = useState<'mis' | 'rivales'>('mis');
  const [filterPosition, setFilterPosition] = useState('TODOS');
  const [filterClub, setFilterClub] = useState('TODOS');
  const [filterTeam, setFilterTeam] = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(isMobile ? 'cards' : 'table');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Sin clubId propio no hay nada que distinguir: todo cuenta como "propio" (fallback demo/legacy)
  const isOwnPlayer = (p: Player) => !p.clubId || String(p.clubId) === String(clubId);

  const baseSquad = useMemo(() => {
    if (activeTab === 'rivales') return (allSquad ?? squad).filter(p => !isOwnPlayer(p));
    return squad.filter(isOwnPlayer);
  }, [squad, allSquad, activeTab, clubId]);

  // Equipos únicos disponibles (dentro de la pestaña activa)
  const availableTeams = useMemo(() => {
    const teamMap = new Map<string, string>();
    baseSquad.forEach(player => {
      const rawTeam = player.equipo?.trim();
      if (!rawTeam) return;
      const key = normalizeTeamLabel(rawTeam);
      if (!teamMap.has(key)) {
        teamMap.set(key, rawTeam);
      }
    });
    return Array.from(teamMap.values()).sort(compareEquipoNames);
  }, [baseSquad]);

  // Clubes únicos disponibles (dentro de la pestaña activa) — útil sobre todo en "Equipos Rivales",
  // donde pueden mezclarse jugadores de varios clubes distintos
  const availableClubs = useMemo(() => {
    const clubMap = new Map<string, string>();
    baseSquad.forEach(player => {
      const rawClub = player.club?.trim();
      if (!rawClub) return;
      const key = normalizeTeamLabel(rawClub);
      if (!clubMap.has(key)) {
        clubMap.set(key, rawClub);
      }
    });
    return Array.from(clubMap.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }, [baseSquad]);

  const filteredSquad = useMemo(() => {
    return baseSquad.filter(p => {
      const posMatch = filterPosition === 'TODOS' || p.posicion === filterPosition;
      const clubMatch = filterClub === 'TODOS' || normalizeTeamLabel(p.club || '') === normalizeTeamLabel(filterClub);
      const teamMatch = filterTeam === 'TODOS' || normalizeTeamLabel(p.equipo || '') === normalizeTeamLabel(filterTeam);
      const statusMatch = filterStatus === 'TODOS' || (filterStatus === 'APTO' ? p.estado === 'APTO' : p.estado !== 'APTO');
      return posMatch && clubMatch && teamMatch && statusMatch;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [baseSquad, filterPosition, filterClub, filterTeam, filterStatus]);

  const groupedPlayers = useMemo(() => {
    const groups = positionOrder.reduce((acc, pos) => {
      const players = filteredSquad.filter(p => p.posicion === pos)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      if (players.length > 0) acc.push({ pos, players });
      return acc;
    }, [] as { pos: string; players: Player[] }[]);
    const others = filteredSquad.filter(p => !positionOrder.includes(p.posicion))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (others.length > 0) groups.push({ pos: 'Otros', players: others });
    return groups;
  }, [filteredSquad]);

  const openNewPlayerCard = () => {
    // En la pestaña "Jugadores Rivales" no se preasigna el club propio: el usuario debe
    // elegir explícitamente el club y equipo rival al que pertenece el jugador.
    const isNewRival = activeTab === 'rivales';
    onEdit({
      id: crypto.randomUUID(), nombre: '', apodo: '', dorsal: undefined, posicion: isHuesca ? 'Central' : 'Defensa',
      posicionJuego: '', perfil: 'D', competicion: '', dni: '',
      club: '', equipo: '', fotoUrl: '', equipoId: '', clubId: isNewRival ? '' : clubId,
    });
  };

  const switchTab = (tab: 'mis' | 'rivales') => {
    setActiveTab(tab);
    setFilterClub('TODOS');
    if (tab === 'rivales') setFilterTeam('TODOS');
    setFilterStatus('TODOS');
  };

  const isLoading = baseSquad.length === 0 && filterPosition === 'TODOS';

  const textCell = (val: string | number | undefined | null) =>
    val != null && val !== '' ? <span className="text-slate-600 text-xs whitespace-nowrap">{val}</span> : <span className="text-slate-300">—</span>;

  const columns = useMemo(() => {
    const allColumns = [
      // 1. Dorsal
      columnHelper.accessor('dorsal', {
        header: t('playerTable.dorsal', 'Dorsal'),
        size: 70,
        cell: info => (
          <span className="bg-slate-900 text-white font-semibold px-2 py-0.5 rounded-md text-[11px] min-w-7 inline-block text-center tabular-nums">
            {info.getValue()}
          </span>
        ),
      }),
      // 2. Foto
      columnHelper.display({
        id: 'foto',
        header: t('playerTable.photo', 'Foto'),
        size: 56,
        cell: ({ row }) => {
          const player = row.original;
          const posStyle = positionStyles[player.posicion] || positionStyles.Otros;
          return (
            <div className={`w-9 h-9 rounded-xl overflow-hidden border-2 ${posStyle.border} bg-slate-50 flex items-center justify-center text-slate-600 font-semibold text-xs`}>
              {isImageUrl(player.fotoUrl) ? (
                <img loading="lazy" decoding="async" src={player.fotoUrl} className="w-full h-full object-cover" />
              ) : (
                <span>{getInitials(player.nombre)}</span>
              )}
            </div>
          );
        },
        enableSorting: false,
      }),
      // 3. Nombre
      columnHelper.accessor('nombre', {
        header: t('playerTable.name', 'Nombre'),
        size: 180,
        cell: info => <span className="text-slate-800 font-semibold text-sm whitespace-nowrap">{info.getValue()}</span>,
      }),
      // 4. Apodo
      columnHelper.accessor('apodo', {
        header: t('playerTable.nickname'),
        size: 120,
        cell: info => {
          const val = info.getValue();
          if (!val) return <span className="text-slate-300">—</span>;
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 whitespace-nowrap">
              {val}
            </span>
          );
        },
      }),
      // 5. Posición
      columnHelper.accessor('posicion', {
        header: isHuesca ? t('editPlayer.demarcation', 'Demarcación') : t('common.position'),
        size: 130,
        cell: info => {
          const pos = info.getValue();
          const style = positionStyles[pos] || positionStyles.Otros;
          return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border w-fit whitespace-nowrap ${style.chip}`}>
              <i className={`fa-solid ${style.icon} text-[9px]`}></i>
              {pos}
            </span>
          );
        },
      }),
      // 6. Posición de juego
      columnHelper.accessor('posicionJuego', {
        header: t('playerTable.tacticalRole', 'Pos. Juego'),
        size: 140,
        cell: info => {
          const val = info.getValue();
          return val ? <span className="text-slate-500 text-xs whitespace-nowrap">{val}</span> : <span className="text-slate-300">—</span>;
        },
      }),
      // 7. Perfil
      columnHelper.accessor('perfil', {
        header: t('playerTable.profile'),
        size: 70,
        cell: info => (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            {info.getValue()}
          </span>
        ),
      }),
      // 8. Fecha de nacimiento
      columnHelper.accessor('fechaNacimiento', {
        header: t('playerTable.birthDate', 'F. Nacimiento'),
        size: 120,
        cell: info => textCell(info.getValue()),
      }),
      // 9. Club
      columnHelper.accessor('club', {
        header: t('playerTable.club', 'Club'),
        size: 130,
        cell: info => textCell(info.getValue()),
      }),
      // 11. Equipo
      columnHelper.accessor('equipo', {
        header: t('playerTable.team'),
        size: 130,
        cell: info => textCell(info.getValue()),
      }),
      // 12. Estado
      columnHelper.accessor('estado', {
        header: t('playerTable.status', 'Estado'),
        size: 100,
        cell: info => {
          const val = info.getValue();
          if (!val) return <span className="text-slate-300">—</span>;
          const color = val === 'LESIONADO' ? 'bg-red-100 text-red-700 border-red-200' : val === 'OTRO' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
          return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border whitespace-nowrap ${color}`}>{val}</span>;
        },
      }),
      // 17. Campos extendidos (Huesca)
      columnHelper.accessor('etapa', {
        header: t('playerTable.stage', 'Etapa'),
        size: 100,
        cell: info => textCell(info.getValue()),
      }),
      columnHelper.accessor('telefono', {
        header: t('playerTable.phone', 'Teléfono'),
        size: 110,
        cell: info => textCell(info.getValue()),
      }),
      columnHelper.accessor('correo', {
        header: t('playerTable.email', 'Correo'),
        size: 180,
        cell: info => textCell(info.getValue()),
      }),
    ];
    return allColumns;
  }, [t, isHuesca]);

  const actions = useMemo<DataTableAction<Player>[]>(() => {
    const acts: DataTableAction<Player>[] = [
      {
        icon: 'fa-regular fa-pen-to-square',
        label: t('playerTable.editCard'),
        onClick: (player) => onEdit(player),
      },
    ];
    if (onDelete) {
      acts.push({
        icon: 'fa-regular fa-trash-can',
        label: t('common.delete'),
        onClick: (player) => onDelete(player.id),
        danger: true,
      });
    }
    return acts;
  }, [onEdit, onDelete]);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* PAGE TITLE */}
      <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
        {activeTab === 'rivales' ? 'Jugadores Rivales' : 'Mis Plantillas'}
      </h2>

      {/* PESTAÑAS MIS PLANTILLAS / EQUIPOS RIVALES */}
      <div className="hidden sm:flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => switchTab('mis')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'mis'
              ? 'bg-[var(--accent)] text-white shadow'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <i className="fa-solid fa-shield-halved text-[10px]"></i>
          Mis Plantillas
        </button>
        <button
          onClick={() => switchTab('rivales')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'rivales'
              ? 'bg-[#1976d2] text-white shadow'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <i className="fa-solid fa-user-secret text-[10px]"></i>
          Jugadores Rivales
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="sticky top-0 z-30 bg-[var(--surface-0)]/90 backdrop-blur-xl border border-[var(--border-soft)] shadow-sm rounded-2xl p-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="hidden sm:contents">
            {['TODOS', ...positionOrder].map((pos) => (
              <button
                key={pos}
                onClick={() => setFilterPosition(pos)}
                className={`px-3 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider border transition-all ${
                  filterPosition === pos
                    ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--border-soft)] hover:text-[var(--text)] hover:border-[var(--surface-3)]'
                }`}
              >
                {pos === 'TODOS' ? t('playerTable.all') : pos}
              </button>
            ))}
            {filterPosition !== 'TODOS' && (
              <button
                onClick={() => setFilterPosition('TODOS')}
                className="px-3 py-2 rounded-xl text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
              >
                {t('playerTable.clear')}
              </button>
            )}

            {/* Separador */}
            <div className="w-px h-6 bg-[var(--border-soft)] mx-1 hidden lg:block"></div>

            {/* Filtro de estado (APTO/NO APTO) */}
            {['TODOS', 'APTO', 'NO APTO'].map((status) => (
              <button
                key={`status-${status}`}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider border transition-all ${
                  filterStatus === status
                    ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--border-soft)] hover:text-[var(--text)] hover:border-[var(--surface-3)]'
                }`}
              >
                {status === 'TODOS' ? t('playerTable.all') : status}
              </button>
            ))}
            {filterStatus !== 'TODOS' && (
              <button
                onClick={() => setFilterStatus('TODOS')}
                className="px-3 py-2 rounded-xl text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
              >
                {t('playerTable.clear')}
              </button>
            )}

            {/* Separador */}
            {availableClubs.length > 1 && (
              <div className="w-px h-6 bg-[var(--border-soft)] mx-1 hidden lg:block"></div>
            )}

            {/* Filtro de clubes - Select */}
            {availableClubs.length > 1 && (
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="px-3 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider border border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--surface-3)] transition-all appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.2em 1.2em',
                  paddingRight: '1.8rem',
                }}
              >
                {['TODOS', ...availableClubs].map((club) => (
                  <option key={`club-${club}`} value={club}>
                    {club === 'TODOS' ? 'Todos los clubes' : club}
                  </option>
                ))}
              </select>
            )}

            {/* Separador */}
            {availableTeams.length > 1 && (
              <div className="w-px h-6 bg-[var(--border-soft)] mx-1 hidden lg:block"></div>
            )}
            </div>

            {/* Filtro de equipos - Select */}
            {availableTeams.length > 1 && (
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="px-3 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider border border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--surface-3)] transition-all appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.2em 1.2em',
                  paddingRight: '1.8rem',
                }}
              >
                {['TODOS', ...availableTeams].map((team) => (
                  <option key={`team-${team}`} value={team}>
                    {team === 'TODOS' ? t('playerTable.allTeams', 'Todos los equipos') : team}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* STATS CARD COMPACTA */}
          <div className="flex items-center gap-2 bg-gradient-to-br from-[var(--surface-0)] to-[var(--surface-1)] border border-[var(--border-soft)] rounded-xl px-3.5 py-2 shrink-0">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white shadow-lg">
              <i className="fa-solid fa-users text-xs"></i>
            </div>
            <div>
              <p className="text-[9px] font-medium text-[var(--text-muted)] uppercase tracking-wider leading-none">
                {activeTab === 'rivales' ? 'Rivales' : 'Registros'}
              </p>
              <p className="text-lg font-black text-[var(--text-strong)] leading-none">
                {filteredSquad.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--surface-2)] p-1 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'table' ? 'bg-[var(--surface-0)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              title={t('playerTable.tableView')}
            >
              <i className="fa-solid fa-table text-sm"></i>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'cards' ? 'bg-[var(--surface-0)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              title={t('playerTable.cardsView')}
            >
              <i className="fa-solid fa-grip text-sm"></i>
            </button>
          </div>
          {onBulkPhotoUpload && (
            <button
              onClick={onBulkPhotoUpload}
              className="inline-flex items-center gap-2 bg-[var(--surface-0)] border border-[var(--border-soft)] hover:border-[var(--surface-3)] text-[var(--text)] px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
            >
              <i className="fa-solid fa-images text-[10px]"></i>
              {t('bulkPhotoUpload.button')}
            </button>
          )}
          <button
            onClick={openNewPlayerCard}
            className={`inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] ${
              activeTab === 'rivales'
                ? 'bg-[#1976d2] hover:bg-[#1565c0] shadow-[#1976d2]/30'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-dark)] shadow-[var(--accent)]/30'
            }`}
          >
            <i className="fa-solid fa-plus text-[10px]"></i>
            {activeTab === 'rivales' ? 'Nuevo Jugador Rival' : t('players.addPlayer')}
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <DataTable<Player>
          data={filteredSquad}
          columns={columns}
          actions={actions}
          searchable
          searchPlaceholder={t('playerTable.searchPlaceholder')}
          sortable
          paginated
          pageSize={30}
          pageSizeOptions={[30, 50, 100]}
          exportable
          exportFilename="plantilla"
          loading={isLoading}
          skeletonRows={6}
          emptyMessage={activeTab === 'rivales' ? 'Todavía no hay jugadores rivales dados de alta.' : t('playerTable.noPlayersFound')}
          emptyIcon={activeTab === 'rivales' ? 'fa-solid fa-user-secret' : 'fa-solid fa-futbol'}
          onRowClick={(player) => onEdit(player)}
        />
      )}

      {/* CARDS VIEW — Agrupado por demarcación, tarjetas compactas */}
      {viewMode === 'cards' && (
        <div className="flex flex-col gap-4">
          {groupedPlayers.map((group) => {
            const style = positionStyles[group.pos] || positionStyles.Otros;
            const isCollapsed = collapsedGroups[group.pos];
            return (
              <div key={group.pos}>
                {/* Cabecera de grupo */}
                <button
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.pos]: !prev[group.pos] }))}
                  className="w-full flex items-center gap-2.5 mb-3"
                >
                  <div className={`w-1 h-4 rounded-full ${style.text.replace('text-', 'bg-')}`}></div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${style.text}`}>
                    {group.pos}s
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">({group.players.length})</span>
                  <div className="flex-1 h-px bg-[var(--border-soft)]"></div>
                  <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'} text-[9px] text-slate-400`}></i>
                </button>

                {!isCollapsed && (
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5">
                    {group.players.map((player) => {
                      const posStyle = positionStyles[player.posicion] || positionStyles.Otros;
                      const hasPhoto = isImageUrl(player.fotoUrl);
                      const hasTransparentPhoto = /^data:image\/png|\.png(\?|$)/i.test(player.fotoUrl || '');
                      const estadoColor = player.estado === 'LESIONADO' ? 'bg-red-500' : player.estado === 'OTRO' ? 'bg-amber-500' : 'bg-emerald-500';

                      return (
                        <div
                          key={player.id}
                          className="group relative bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:border-[var(--surface-3)] transition-all duration-300 cursor-pointer hover:scale-[1.05] aspect-[4/5] flex flex-col"
                          onClick={() => onEdit(player)}
                        >
                          {/* Imagen o iniciales - ocupa todo el espacio disponible */}
                          {hasPhoto ? (
                            <div className={`flex-1 overflow-hidden ${hasTransparentPhoto ? 'bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-2)]' : ''}`}>
                              <img loading="lazy" decoding="async"
                                src={player.fotoUrl}
                                alt={player.nombre}
                                className={`w-full h-full group-hover:scale-110 transition-transform duration-500 ${hasTransparentPhoto ? 'object-contain object-bottom' : 'object-cover object-[50%_20%]'}`}
                              />
                            </div>
                          ) : (
                            <div className="flex-1 bg-[var(--surface-1)] flex items-center justify-center">
                              <span className="text-3xl font-black text-[var(--surface-3)] select-none">{getInitials(player.nombre)}</span>
                            </div>
                          )}

                          {/* Dorsal + estado */}
                          <div className="absolute top-1.5 right-1.5 flex flex-col items-center gap-1">
                            <div className="bg-slate-900 text-white w-6 h-6 rounded-md flex items-center justify-center font-black text-[11px] shadow-lg tabular-nums leading-none">
                              {player.dorsal}
                            </div>
                            <div className={`w-1.5 h-1.5 rounded-full ${estadoColor} ring-2 ring-white/80`}></div>
                          </div>

                          {/* Info inferior - mínima y compacta */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent p-1.5">
                            <h3 className="text-[10px] font-bold text-white uppercase leading-tight truncate">{player.nombre}</h3>
                            {player.posicionJuego && (
                              <p className="text-[8px] text-slate-300 uppercase leading-tight truncate">{player.posicionJuego}</p>
                            )}
                            {player.fechaNacimiento && (
                              <p className="text-[8px] text-slate-400 leading-tight truncate">{formatDate(player.fechaNacimiento, i18n.language)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {!isLoading && groupedPlayers.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-soft)] flex items-center justify-center mx-auto mb-3">
                <i className={`fa-solid ${activeTab === 'rivales' ? 'fa-user-secret' : 'fa-futbol'} text-xl text-[var(--text-muted)]`}></i>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {activeTab === 'rivales' ? 'Todavía no hay jugadores rivales dados de alta.' : t('playerTable.noPlayersFoundShort')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] p-4 rounded-2xl flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--surface-1)] rounded-lg flex items-center justify-center border border-[var(--border-soft)] shrink-0">
            <i className="fa-solid fa-database text-sm text-[var(--text-muted)]"></i>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-medium">
            {filteredSquad.length} {t('playerTable.playersCount')}{filterPosition !== 'TODOS' ? ` · ${filterPosition}` : ''}{filterClub !== 'TODOS' ? ` · ${filterClub}` : ''}{filterTeam !== 'TODOS' ? ` · ${filterTeam}` : ''}{filterStatus !== 'TODOS' ? ` · ${filterStatus}` : ''}
          </p>
        </div>
        <button
          onClick={openNewPlayerCard}
          className="w-full sm:w-auto justify-center inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
        >
          <i className="fa-solid fa-plus text-[10px]"></i>
          {activeTab === 'rivales' ? 'Nuevo Jugador Rival' : t('playerTable.newPlayer')}
        </button>
      </div>
    </div>
  );
};

export default PlayerTable;
