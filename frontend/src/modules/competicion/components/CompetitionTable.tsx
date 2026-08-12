import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompetitionTeam } from '../types';
import { Club } from '../../clubes/types';
import EditTeamModal from './EditTeamModal';
import SearchableSelect from '@shared/components/SearchableSelect';
import { getTeamConfig } from '@shared/services/dataService';
import { getFederationTeamLogo } from '../data/teamLogos';

interface CompetitionTableProps {
  teams: CompetitionTeam[];
  clubes: Club[];
  /** Id de mi club (currentTeam.id) — cualquier otro club/equipo se trata como rival. */
  clubId?: string;
  onEdit?: (team: CompetitionTeam) => void | Promise<void>;
  onDelete?: (id: number) => void;
}

/** Agrupa las entradas por nombre de club */
interface ClubGroup {
  nombre: string;
  logoUrl?: string;
  equipos: CompetitionTeam[];
  isOwn: boolean;
}

/** Orden de categorías: Primer equipo, Filial, Juvenil, Cadete, Infantil, Alevín (A-D dentro de cada una) */
const CATEGORY_ORDER = ['primer equipo', 'filial', 'juvenil', 'cadete', 'infantil', 'alevin'];

const getTeamOrderRank = (team: CompetitionTeam): number => {
  const raw = `${team.equipo || ''} ${team.nombre || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    if (raw.includes(CATEGORY_ORDER[i])) {
      const letterMatch = raw.match(/\b([a-d])\b/);
      const letterRank = letterMatch ? letterMatch[1].charCodeAt(0) - 97 : 0;
      return i * 10 + letterRank;
    }
  }
  return 999;
};

const CompetitionTable: React.FC<CompetitionTableProps> = ({ teams, clubes, clubId, onEdit, onDelete }) => {
  const [editingTeam, setEditingTeam] = useState<CompetitionTeam | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');
  const [clubFilter, setClubFilter] = useState('Todos');
  const [equipoInternoFilter, setEquipoInternoFilter] = useState('Todos');
  const [activeTab, setActiveTab] = useState<'todos' | 'equipos' | 'rivales'>('todos');
  const [editingEquipoId, setEditingEquipoId] = useState<string | null>(null);
  const [editingEquipoValue, setEditingEquipoValue] = useState<string>('');

  const myTeamName = useMemo(() => {
    try { return getTeamConfig()?.teamName || ''; } catch { return ''; }
  }, []);
  const isMyTeam = (name: string) => myTeamName && name.toLowerCase().includes(myTeamName.toLowerCase());

  const clubById = useMemo(() => new Map(clubes.map(c => [String(c.id), c])), [clubes]);

  // Agrupa equipos por CLUB (vía clubId); marca cada grupo como propio o rival según clubId.
  // Si un equipo no tiene clubId o no hay club dado de alta con ese id, se agrupa por su propio
  // nombre como fallback (para no perder equipos "sueltos" de datos antiguos).
  const groups = useMemo<ClubGroup[]>(() => {
    const map = new Map<string, ClubGroup>();
    teams.forEach(t => {
      const club = t.clubId != null ? clubById.get(String(t.clubId)) : undefined;
      const key = club ? String(club.id) : `__sin_club__${t.nombre.trim().toUpperCase()}`;
      const displayNombre = club ? club.nombre : t.nombre;
      const displayLogo = club?.logoUrl || t.logoUrl || getFederationTeamLogo(t.nombreEnFed) || getFederationTeamLogo(t.nombre);
      if (!map.has(key)) {
        map.set(key, { nombre: displayNombre, logoUrl: displayLogo, equipos: [], isOwn: !!clubId && String(t.clubId) === String(clubId) });
      }
      map.get(key)!.equipos.push(t);
      if (clubId && String(t.clubId) === String(clubId)) map.get(key)!.isOwn = true;
      // Actualiza el logo del grupo si el equipo tiene uno y el grupo todavía no
      if (displayLogo && !map.get(key)!.logoUrl) {
        map.get(key)!.logoUrl = displayLogo;
      }
    });
    const groupsArray = Array.from(map.values());
    groupsArray.forEach(g => {
      g.equipos.sort((a, b) => getTeamOrderRank(a) - getTeamOrderRank(b));
    });
    return groupsArray.sort((a, b) => {
      // Club propio siempre primero
      if (a.isOwn && !b.isOwn) return -1;
      if (!a.isOwn && b.isOwn) return 1;
      // Luego ordenar alfabéticamente (con normalización para evitar problemas con tildes/espacios)
      const nameA = (a.nombre || '').trim().toUpperCase();
      const nameB = (b.nombre || '').trim().toUpperCase();
      return nameA.localeCompare(nameB, 'es-ES');
    });
  }, [teams, clubId, clubById]);

  const tabGroups = useMemo(() => {
    if (activeTab === 'todos') return groups;
    return groups.filter(g => (activeTab === 'rivales' ? !g.isOwn : g.isOwn));
  }, [groups, activeTab]);

  // Filtrado por búsqueda
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const bySearch = !q
      ? tabGroups
      : tabGroups
          .map(g => ({
            ...g,
            equipos: g.equipos.filter(e =>
              e.nombre.toLowerCase().includes(q) ||
              (e.etapa || '').toLowerCase().includes(q) ||
              (e.equipo || '').toLowerCase().includes(q) ||
              (e.nombreEnFed || '').toLowerCase().includes(q) ||
              (e.competicion || '').toLowerCase().includes(q)
            ),
          }))
          .filter(g => g.equipos.length > 0 || g.nombre.toLowerCase().includes(q));

    const byClub = clubFilter === 'Todos' ? bySearch : bySearch.filter(g => g.nombre === clubFilter);

    if (equipoInternoFilter === 'Todos') return byClub;
    return byClub
      .map(g => ({ ...g, equipos: g.equipos.filter(e => (e.equipo || '—') === equipoInternoFilter) }))
      .filter(g => g.equipos.length > 0);
  }, [tabGroups, search, clubFilter, equipoInternoFilter]);

  // Clubs disponibles para el filtro (basados en los grupos de la pestaña activa, sin filtrar por búsqueda)
  const availableClubs = useMemo(() => {
    const clubs = tabGroups.map(g => g.nombre);
    return clubs.sort((a, b) => a.localeCompare(b));
  }, [tabGroups]);

  // Equipos internos disponibles para el filtro (sub-equipo, ej: Juvenil A, Cadete A)
  const availableEquiposInternos = useMemo(() => {
    const set = new Set<string>();
    tabGroups.forEach(g => g.equipos.forEach(e => set.add(e.equipo || '—')));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tabGroups]);

  const toggleClub = (nombre: string) => {
    setExpandedClubs(prev => {
      const next = new Set(prev);
      if (next.has(nombre)) next.delete(nombre);
      else next.add(nombre);
      return next;
    });
  };

  const expandAll = () => setExpandedClubs(new Set(filteredGroups.map(g => g.nombre)));
  const collapseAll = () => setExpandedClubs(new Set());

  const { t } = useTranslation();

  return (
    <>
      {/* PAGE TITLE */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1" />
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          {activeTab === 'rivales' ? t('sidebar.rivalTeamsLabel') : t('sidebar.teamsLabel', 'Equipos')}
        </h2>
        <div className="flex-1 flex justify-end">
          {onEdit && (
            <button
              onClick={() => {
                if (clubes.length === 0) {
                  alert('Primero debes crear un club en la sección Clubes.');
                  return;
                }
                setIsCreating(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-lg"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              {activeTab === 'rivales' ? 'Nuevo Equipo Rival' : 'Nuevo Equipo'}
            </button>
          )}
        </div>
      </div>

      {/* AVISO: sin clubes todavía */}
      {clubes.length === 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
          <i className="fa-solid fa-circle-info"></i>
          <span className="text-xs font-bold">
            Aún no hay clubes creados. Ve a la sección Clubes para dar de alta uno antes de crear equipos.
          </span>
        </div>
      )}

      {/* PESTAÑAS MIS EQUIPOS / RIVALES */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => { setActiveTab('todos'); setClubFilter('Todos'); }}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'todos'
              ? 'bg-slate-800 text-white shadow'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => { setActiveTab('equipos'); setClubFilter('Todos'); }}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'equipos'
              ? 'bg-[var(--accent)] text-white shadow'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <i className="fa-solid fa-shield-halved text-[10px]"></i>
          Mis Equipos
        </button>
        <button
          onClick={() => { setActiveTab('rivales'); setClubFilter('Todos'); }}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'rivales'
              ? 'bg-[#1976d2] text-white shadow'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <i className="fa-solid fa-user-secret text-[10px]"></i>
          {t('sidebar.rivalTeamsLabel')}
        </button>
      </div>

      {/* FILTRO CLUB (dentro de la pestaña activa) */}
      {availableClubs.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 flex-shrink-0">
            {activeTab === 'rivales' ? 'Equipo Rival:' : 'Club:'}
          </label>
          <select
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all hover:border-slate-300"
          >
            <option value="Todos">Todos los {activeTab === 'rivales' ? 'equipos rivales' : 'clubes'}</option>
            {availableClubs.map(nombre => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* FILTRO EQUIPO INTERNO (sub-equipo, ej: Juvenil A, Cadete A) */}
      {availableEquiposInternos.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[var(--accent)]/5 to-transparent border border-[var(--accent)]/20">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-black text-[var(--accent)] uppercase tracking-widest pr-2">
              <i className="fa-solid fa-layer-group text-sm"></i>
              Equipo Interno:
            </span>
            <button
              onClick={() => setEquipoInternoFilter('Todos')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                equipoInternoFilter === 'Todos'
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todos
            </button>
            {availableEquiposInternos.map(equipo => (
              <button
                key={equipo}
                onClick={() => setEquipoInternoFilter(equipo === equipoInternoFilter ? 'Todos' : equipo)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                  equipoInternoFilter === equipo
                    ? 'bg-[var(--accent)] text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {equipo}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BARRA DE BÚSQUEDA + CONTROLES */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={expandAll}
          className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-all"
          title="Expandir todos"
        >
          <i className="fa-solid fa-chevron-down mr-1"></i>Expandir
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-all"
          title="Colapsar todos"
        >
          <i className="fa-solid fa-chevron-up mr-1"></i>Colapsar
        </button>
        <div className="flex-1 min-w-[200px]">
          <SearchableSelect
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          >
            <option value="">-- Buscar club, etapa, equipo --</option>
            {filteredGroups.length > 0 && filteredGroups.map((group) => (
              <optgroup key={group.nombre} label={group.nombre}>
                {group.equipos.map(team => (
                  <option key={team.id} value={team.nombre}>
                    {team.equipo || team.nombre}{team.etapa ? ` (${team.etapa})` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </SearchableSelect>
        </div>
      </div>

      {/* TABLA AGRUPADA */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
       <div className="overflow-x-auto">
        <div className="min-w-fit">
        {/* Cabecera */}
        <div className="grid text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-200"
          style={{ gridTemplateColumns: '48px 220px 110px 140px 220px 110px 90px', columnGap: '16px', justifyContent: 'start' }}
        >
          <div className="px-3 py-3"></div>
          <div className="px-3 py-3">Club / Equipo</div>
          <div className="px-3 py-3">Etapa</div>
          <div className="px-3 py-3">Equipo Interno</div>
          <div className="px-3 py-3">Nombre en Fed.</div>
          <div className="px-3 py-3">Enlace</div>
          <div className="px-3 py-3 text-right">Acciones</div>
        </div>

        {filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <i className="fa-solid fa-shield text-4xl mb-3"></i>
            <span className="text-sm font-bold uppercase tracking-widest">Sin resultados</span>
          </div>
        )}

        {filteredGroups.map((group) => {
          const isExpanded = expandedClubs.has(group.nombre);
          const highlight = group.isOwn || isMyTeam(group.nombre);
          return (
            <div key={group.nombre} className="border-b border-slate-100 last:border-b-0">
              {/* FILA CLUB (cabecera del grupo) */}
              <button
                type="button"
                onClick={() => toggleClub(group.nombre)}
                className={`w-full grid items-center text-left transition-colors hover:bg-slate-50 ${highlight ? 'bg-[var(--accent)]/5' : 'bg-white'}`}
                style={{ gridTemplateColumns: '48px 220px 110px 140px 220px 110px 90px', columnGap: '16px', justifyContent: 'start' }}
              >
                {/* Logo */}
                <div className="px-3 py-3 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {group.logoUrl ? (
                      <img loading="lazy" decoding="async" src={group.logoUrl} alt={group.nombre} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <i className="fa-solid fa-shield text-slate-300 text-xs"></i>
                    )}
                  </div>
                </div>
                {/* Nombre club */}
                <div className="px-3 py-3 flex items-center gap-2">
                  <i className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-200 text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}></i>
                  <span className={`text-sm font-black uppercase tracking-tight ${highlight ? 'text-[var(--accent)]' : 'text-slate-800'}`}>
                    {group.nombre}
                  </span>
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                    {group.equipos.length} {group.equipos.length === 1 ? 'equipo' : 'equipos'}
                  </span>
                </div>
                {/* Columnas vacías en la fila del club */}
                <div /><div /><div /><div /><div />
              </button>

              {/* SUB-FILAS EQUIPOS */}
              {isExpanded && group.equipos.map((eq) => (
                <div
                  key={String(eq.id)}
                  className={`grid items-center border-t border-slate-100 hover:bg-slate-100/60 transition-colors ${highlight ? 'bg-[var(--accent)]/5' : 'bg-slate-50/60'}`}
                  style={{ gridTemplateColumns: '48px 220px 110px 140px 220px 110px 90px', columnGap: '16px', justifyContent: 'start' }}
                >
                  {/* Indent visual */}
                  <div className="px-3 py-2.5 flex items-center justify-center">
                    <div className={`w-1 h-1 rounded-full ml-3 ${highlight ? 'bg-[var(--accent)]' : 'bg-slate-300'}`}></div>
                  </div>
                  {/* Equipo nombre (indentado) */}
                  <div className="px-3 py-2.5 pl-8">
                    <span className={`text-xs font-semibold ${highlight ? 'text-[var(--accent)]' : 'text-slate-600'}`}>{eq.nombre}</span>
                  </div>
                  {/* Etapa */}
                  <div className="px-3 py-2.5">
                    {eq.etapa ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-black uppercase tracking-wide">
                        {eq.etapa}
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </div>
                  {/* Equipo - Editable */}
                  <div className="px-3 py-2.5">
                    {editingEquipoId === String(eq.id) ? (
                      <input
                        type="text"
                        value={editingEquipoValue}
                        onChange={(e) => setEditingEquipoValue(e.target.value)}
                        onBlur={() => {
                          if (editingEquipoValue.trim() && onEdit) {
                            onEdit({ ...eq, equipo: editingEquipoValue.trim() });
                          }
                          setEditingEquipoId(null);
                          setEditingEquipoValue('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && onEdit) {
                            onEdit({ ...eq, equipo: editingEquipoValue.trim() });
                            setEditingEquipoId(null);
                            setEditingEquipoValue('');
                          }
                          if (e.key === 'Escape') {
                            setEditingEquipoId(null);
                            setEditingEquipoValue('');
                          }
                        }}
                        autoFocus
                        className="w-full px-2 py-1 text-xs font-bold rounded border border-[var(--accent)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingEquipoId(String(eq.id));
                          setEditingEquipoValue(eq.equipo || eq.nombre || '');
                        }}
                        className="text-xs font-bold text-slate-700 cursor-pointer hover:text-[var(--accent)] transition-colors"
                        title="Click para editar"
                      >
                        {eq.equipo || eq.nombre || <span className="text-slate-300">—</span>}
                      </span>
                    )}
                  </div>
                  {/* Nombre en Fed */}
                  <div className="px-3 py-2.5">
                    <span className="text-xs text-slate-600">{eq.nombreEnFed || <span className="text-slate-300">—</span>}</span>
                  </div>
                  {/* Enlace */}
                  <div className="px-3 py-2.5">
                    {eq.enlace
                      ? <a href={eq.enlace} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline text-[10px] font-bold truncate max-w-[180px] block" title={eq.enlace}>
                          <i className="fa-solid fa-arrow-up-right-from-square mr-1 text-[9px]"></i>Ver enlace
                        </a>
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </div>
                  {/* Acciones */}
                  <div className="px-3 py-2.5 flex items-center justify-end gap-2">
                    {onEdit && (
                      <button
                        onClick={() => setEditingTeam(eq)}
                        className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-[var(--accent)] hover:text-white text-slate-500 flex items-center justify-center transition-all"
                        title="Editar"
                      >
                        <i className="fa-regular fa-pen-to-square text-[11px]"></i>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(eq.id)}
                        className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-red-500 hover:text-white text-slate-500 flex items-center justify-center transition-all"
                        title="Eliminar"
                      >
                        <i className="fa-regular fa-trash-can text-[11px]"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        </div>
       </div>
      </div>

      {/* Modales */}
      {editingTeam && onEdit && (
        <EditTeamModal
          team={editingTeam}
          clubes={clubes}
          existingTeams={teams}
          onClose={() => setEditingTeam(null)}
          onSave={async (updated) => {
            await onEdit(updated);
            setEditingTeam(null);
          }}
        />
      )}
      {isCreating && onEdit && (
        <EditTeamModal
          team={{ id: Date.now(), nombre: '' }}
          clubes={clubes}
          existingTeams={teams}
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

export default CompetitionTable;
