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
}

const columnHelper = createColumnHelper<Player>();

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

const PlayerTable: React.FC<PlayerTableProps> = ({ squad, allSquad, onEdit, onSave, onDelete, clubId, onBulkPhotoUpload }) => {
  const { t } = useTranslation();
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
    onEdit({
      id: crypto.randomUUID(), nombre: '', apodo: '', dorsal: undefined, posicion: isHuesca ? 'Central' : 'Defensa',
      posicionJuego: '', perfil: 'D', competicion: '', dni: '',
      club: '', equipo: '', fotoUrl: '', equipoId: '', clubId: clubId,
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

  const columns = useMemo(() => [
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
    // 13. Partidos jugados
    columnHelper.accessor('partidosJugados', {
      header: t('playerTable.matchesPlayed', 'PJ'),
      size: 60,
      cell: info => textCell(info.getValue()),
    }),
    // 14. Minutos
    columnHelper.accessor('minutos', {
      header: t('playerTable.minutes', 'Min'),
      size: 60,
      cell: info => textCell(info.getValue()),
    }),
    // 15. Titular
    columnHelper.accessor('titular', {
      header: t('playerTable.starter', 'Titular'),
      size: 70,
      cell: info => textCell(info.getValue()),
    }),
    // 16. Goles
    columnHelper.accessor('goles', {
      header: t('playerTable.goals', 'Goles'),
      size: 70,
      cell: info => textCell(info.getValue()),
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
  ], []);

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

            {/* Filtro de clubes */}
            {availableClubs.length > 1 && (
              <>
                {['TODOS', ...availableClubs].map((club) => (
                  <button
                    key={`club-${club}`}
                    onClick={() => setFilterClub(club)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider border transition-all ${
                      filterClub === club
                        ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                        : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--border-soft)] hover:text-[var(--text)] hover:border-[var(--surface-3)]'
                    }`}
                  >
                    <i className="fa-solid fa-shield-halved text-[9px] mr-1"></i>
                    {club === 'TODOS' ? 'Todos los clubes' : club}
                  </button>
                ))}
                {filterClub !== 'TODOS' && (
                  <button
                    onClick={() => setFilterClub('TODOS')}
                    className="px-3 py-2 rounded-xl text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-[9px]"></i>
                  </button>
                )}
              </>
            )}

            {/* Separador */}
            {availableTeams.length > 1 && activeTab === 'mis' && (
              <div className="w-px h-6 bg-[var(--border-soft)] mx-1 hidden lg:block"></div>
            )}
            </div>

            {/* Filtro de equipos (solo en pestaña "mis") */}
            {availableTeams.length > 1 && activeTab === 'mis' && (
              <>
                {['TODOS', ...availableTeams].map((team) => (
                  <button
                    key={`team-${team}`}
                    onClick={() => setFilterTeam(team)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider border transition-all ${
                      filterTeam === team
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--border-soft)] hover:text-[var(--text)] hover:border-[var(--surface-3)]'
                    }`}
                  >
                    {team === 'TODOS' ? t('playerTable.allTeams', 'Todos los equipos') : team}
                  </button>
                ))}
                {filterTeam !== 'TODOS' && (
                  <button
                    onClick={() => setFilterTeam('TODOS')}
                    className="px-3 py-2 rounded-xl text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-[9px]"></i>
                  </button>
                )}
              </>
            )}
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                    {group.players.map((player) => {
                      const posStyle = positionStyles[player.posicion] || positionStyles.Otros;
                      const hasPhoto = isImageUrl(player.fotoUrl);
                      const estadoColor = player.estado === 'LESIONADO' ? 'bg-red-500' : player.estado === 'OTRO' ? 'bg-amber-500' : 'bg-emerald-500';

                      return (
                        <div
                          key={player.id}
                          className="group relative bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:border-[var(--surface-3)] transition-all duration-300 cursor-pointer hover:scale-[1.05] h-56 flex flex-col"
                          onClick={() => onEdit(player)}
                        >
                          {/* Imagen o iniciales - ocupa todo el espacio disponible */}
                          {hasPhoto ? (
                            <img loading="lazy" decoding="async"
                              src={player.fotoUrl}
                              alt={player.nombre}
                              className="flex-1 w-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="flex-1 bg-[var(--surface-1)] flex items-center justify-center">
                              <span className="text-5xl font-black text-[var(--surface-3)] select-none">{getInitials(player.nombre)}</span>
                            </div>
                          )}

                          {/* Dorsal + estado */}
                          <div className="absolute top-2 right-2 flex flex-col items-center gap-1">
                            <div className="bg-slate-900 text-white w-8 h-8 rounded-md flex items-center justify-center font-black text-sm shadow-lg tabular-nums leading-none">
                              {player.dorsal}
                            </div>
                            <div className={`w-2 h-2 rounded-full ${estadoColor} ring-2 ring-white/80`}></div>
                          </div>

                          {/* Info inferior - mínima y compacta */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent p-2">
                            <h3 className="text-xs font-bold text-white uppercase leading-tight truncate">{player.nombre}</h3>
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
