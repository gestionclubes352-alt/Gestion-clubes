import React, { useState, useEffect, useMemo } from 'react';
import type { Competicion, Equipo, EquipoRival } from '@/shared/services/dataService';
import { equiposRivalesService, equiposService } from '@shared/services';
import type { Club } from '@modules/clubes/types';
import type { CompetitionTeam } from '../types';
import { clubesService } from '@shared/services';
import type { EquipoRef } from '../services/competicionEquiposService';
import SearchableSelect from '@shared/components/SearchableSelect';

const UNASSIGNED_CLUB_KEY = '__unassigned_club__';

// NOTA: el catálogo de "equipos rivales" está deprecado para esta pantalla — ya no se pueden
// añadir equipos nuevos por ese camino, solo equipos ya dados de alta en el sistema. Se mantiene
// la lectura/eliminación de rivales ya guardados en competiciones antiguas por compatibilidad.

interface CompetitionTeamsSelectorProps {
  competicion: Competicion;
  allTeams: CompetitionTeam[];
  /** Club propio del usuario, para agrupar sus equipos como "Equipo interno" */
  ownClubId?: string;
  /** Equipos (propios y rivales de catálogo) ya guardados para esta competición */
  initialTeams?: EquipoRef[];
  onTeamsSelected: (teams: EquipoRef[]) => void;
}

const CompetitionTeamsSelector: React.FC<CompetitionTeamsSelectorProps> = ({
  competicion,
  allTeams,
  ownClubId,
  initialTeams = [],
  onTeamsSelected,
}) => {
  const [selectedOwnIds, setSelectedOwnIds] = useState<Set<string>>(
    () => new Set(initialTeams.filter(t => t.equipoId).map(t => t.equipoId as string))
  );
  const [selectedRivalIds, setSelectedRivalIds] = useState<Set<string>>(
    () => new Set(initialTeams.filter(t => t.equipoRivalId).map(t => t.equipoRivalId as string))
  );
  const [selectedClubToAdd, setSelectedClubToAdd] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState('');
  const [rivalCatalog, setRivalCatalog] = useState<EquipoRival[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [extraTeams, setExtraTeams] = useState<CompetitionTeam[]>([]);
  const [newClubName, setNewClubName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  useEffect(() => {
    const loadClubs = async () => {
      try {
        const data = await clubesService.list();
        setClubs((data as Club[]) || []);
      } catch (err) {
        console.error('Error loading clubs:', err);
      }
    };
    loadClubs();
  }, []);

  useEffect(() => {
    const loadRivalCatalog = async () => {
      try {
        const data = await equiposRivalesService.list();
        setRivalCatalog((data as EquipoRival[]) || []);
      } catch (err) {
        console.error('Error loading rival catalog:', err);
      }
    };
    loadRivalCatalog();
  }, []);

  const clubNameById = useMemo(() => new Map(clubs.map(c => [String(c.id), c.nombre])), [clubs]);

  const allTeamsWithExtras = useMemo(() => {
    const existingIds = new Set(allTeams.map(t => String(t.id)));
    return [...allTeams, ...extraTeams.filter(t => !existingIds.has(String(t.id)))];
  }, [allTeams, extraTeams]);

  const teamById = useMemo(() => new Map(allTeamsWithExtras.map(t => [String(t.id), t])), [allTeamsWithExtras]);
  const rivalById = useMemo(() => new Map(rivalCatalog.map(r => [String(r.id), r])), [rivalCatalog]);

  const availableOwnTeamsByClub = useMemo(() => {
    const grouped = new Map<string, CompetitionTeam[]>();
    allTeamsWithExtras.forEach(team => {
      if (selectedOwnIds.has(String(team.id))) return;
      const clubKey = team.clubId != null && String(team.clubId) ? String(team.clubId) : UNASSIGNED_CLUB_KEY;
      if (!grouped.has(clubKey)) grouped.set(clubKey, []);
      grouped.get(clubKey)!.push(team);
    });
    // El club propio ("Equipo interno") siempre en primer lugar
    const ownClubIdStr = ownClubId ? String(ownClubId) : '';
    const entries = Array.from(grouped.entries());
    entries.sort((a, b) => {
      if (a[0] === ownClubIdStr) return -1;
      if (b[0] === ownClubIdStr) return 1;
      return 0;
    });
    return entries;
  }, [allTeamsWithExtras, selectedOwnIds, ownClubId]);

  const getClubLabel = (clubKey: string) => {
    if (clubKey === UNASSIGNED_CLUB_KEY) return 'Sin club';
    const clubName = clubNameById.get(clubKey);
    if (ownClubId && clubKey === String(ownClubId)) return clubName ? `${clubName} (equipo interno)` : 'Equipo interno';
    return clubName || 'Otro club';
  };

  const availableClubOptions = useMemo(
    () => availableOwnTeamsByClub.map(([clubKey, teams]) => ({
      clubKey,
      label: getClubLabel(clubKey),
      count: teams.length,
    })),
    [availableOwnTeamsByClub, clubNameById, ownClubId]
  );

  const selectedClubTeams = useMemo(
    () => availableOwnTeamsByClub.find(([clubKey]) => clubKey === selectedClubToAdd)?.[1] || [],
    [availableOwnTeamsByClub, selectedClubToAdd]
  );

  const dedupedSelectedClubTeams = useMemo(() => {
    const seenNames = new Set<string>();
    return selectedClubTeams.filter(team => {
      const displayName = `${team.equipo || team.nombre}${team.etapa ? ` (${team.etapa})` : ''}`;
      if (seenNames.has(displayName)) return false;
      seenNames.add(displayName);
      return true;
    });
  }, [selectedClubTeams]);

  useEffect(() => {
    if (!selectedClubToAdd) return;
    const clubStillAvailable = availableOwnTeamsByClub.some(([clubKey, teams]) => clubKey === selectedClubToAdd && teams.length > 0);
    if (!clubStillAvailable) {
      setSelectedClubToAdd('');
      setSelectedToAdd('');
    }
  }, [availableOwnTeamsByClub, selectedClubToAdd]);

  const emitChange = (ownIds: Set<string>, rivalIds: Set<string>) => {
    const teams: EquipoRef[] = [
      ...Array.from(ownIds).map(equipoId => ({ equipoId })),
      ...Array.from(rivalIds).map(equipoRivalId => ({ equipoRivalId })),
    ];
    onTeamsSelected(teams);
  };

  const handleToggleOwnTeam = (teamId: string) => {
    const newSelected = new Set(selectedOwnIds);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedOwnIds(newSelected);
    emitChange(newSelected, selectedRivalIds);
  };

  const handleSelectFromUnifiedDropdown = (value: string) => {
    setSelectedToAdd('');
    if (!value || !value.startsWith('team:')) return;
    const teamId = value.slice('team:'.length);
    if (!teamId || selectedOwnIds.has(teamId)) return;
    const newSelected = new Set(selectedOwnIds);
    newSelected.add(teamId);
    setSelectedOwnIds(newSelected);
    emitChange(newSelected, selectedRivalIds);
  };

  const handleToggleRival = (rivalId: string) => {
    const newSelected = new Set(selectedRivalIds);
    if (newSelected.has(rivalId)) {
      newSelected.delete(rivalId);
    } else {
      newSelected.add(rivalId);
    }
    setSelectedRivalIds(newSelected);
    emitChange(selectedOwnIds, newSelected);
  };

  const handleCreateClubAndTeam = async () => {
    const clubName = newClubName.trim();
    const teamName = newTeamName.trim();
    if (!clubName || !teamName) return;
    setCreateTeamError(null);
    setCreatingTeam(true);
    try {
      let club = clubs.find(c => c.nombre.trim().toLowerCase() === clubName.toLowerCase());
      if (!club) {
        club = await clubesService.create({ nombre: clubName });
        setClubs(prev => [...prev, club as Club]);
      }
      const createdEquipo = await equiposService.create({ club_id: club.id, nombre: teamName } as Partial<Equipo>);
      const newTeam: CompetitionTeam = {
        id: createdEquipo.id,
        clubId: createdEquipo.club_id,
        nombre: createdEquipo.nombre,
        estadio: createdEquipo.estadio || '',
        localidad: createdEquipo.localidad || '',
        logoUrl: createdEquipo.logo_url || undefined,
        equipo: createdEquipo.sub_equipo,
        nombreEnFed: createdEquipo.nombre_en_fed,
        etapa: createdEquipo.categoria,
        competicion: createdEquipo.competicion,
        enlace: createdEquipo.enlace,
      };
      setExtraTeams(prev => [...prev, newTeam]);
      const newSelected = new Set(selectedOwnIds);
      newSelected.add(String(newTeam.id));
      setSelectedOwnIds(newSelected);
      emitChange(newSelected, selectedRivalIds);
      setNewClubName('');
      setNewTeamName('');
    } catch (err) {
      console.error('Error creating club/team:', err);
      setCreateTeamError(err instanceof Error ? err.message : 'Error al dar de alta el club/equipo');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleClearAll = () => {
    setSelectedOwnIds(new Set());
    setSelectedRivalIds(new Set());
    setSelectedClubToAdd('');
    setSelectedToAdd('');
    onTeamsSelected([]);
  };

  const totalSelected = selectedOwnIds.size + selectedRivalIds.size;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">
          Equipos que participan en {competicion.nombre}
        </h4>
        <p className="text-[10px] text-slate-500">
          Añade tu equipo y el resto de equipos ya dados de alta en el sistema que van a competir. Aparecerán en el selector al crear partidos.
        </p>
      </div>

      {/* Alta desde el sistema: primero club y despues equipos de ese club */}
      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
          <i className="fa-solid fa-plus mr-1"></i>Añadir equipo
        </label>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SearchableSelect
            value={selectedClubToAdd}
            onChange={(e) => {
              setSelectedClubToAdd(e.target.value);
              setSelectedToAdd('');
            }}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
          >
            <option value="">Selecciona un club...</option>
            {availableClubOptions.map(({ clubKey, label, count }) => (
              <option key={clubKey} value={clubKey}>
                {label} ({count})
              </option>
            ))}
          </SearchableSelect>

          <SearchableSelect
            value={selectedToAdd}
            onChange={(e) => handleSelectFromUnifiedDropdown(e.target.value)}
            disabled={!selectedClubToAdd || dedupedSelectedClubTeams.length === 0}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">
              {selectedClubToAdd ? 'Selecciona un equipo...' : 'Primero selecciona un club...'}
            </option>
            {selectedClubToAdd && (
              <optgroup label={getClubLabel(selectedClubToAdd)}>
                {dedupedSelectedClubTeams.map(team => (
                  <option key={team.id} value={`team:${team.id}`}>
                    {team.equipo || team.nombre}{team.etapa ? ` (${team.etapa})` : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </SearchableSelect>
        </div>
      </div>

      {/* Dar de alta un club y equipo nuevos en el sistema */}
      <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
          <i className="fa-solid fa-plus mr-1"></i>¿El equipo no existe todavía? Dalo de alta
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Club (ej: San Lorenzo)"
            value={newClubName}
            onChange={(e) => setNewClubName(e.target.value)}
            disabled={creatingTeam}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Equipo (ej: Juvenil A)"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateClubAndTeam();
              }
            }}
            disabled={creatingTeam}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleCreateClubAndTeam}
            disabled={!newClubName.trim() || !newTeamName.trim() || creatingTeam}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all disabled:opacity-40 whitespace-nowrap"
          >
            <i className="fa-solid fa-floppy-disk"></i> {creatingTeam ? 'Guardando...' : 'Dar de alta'}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Se da de alta el club (si no existe ya) y el equipo en el sistema, y se añade automáticamente a esta competición.
        </p>
        {createTeamError && (
          <p className="text-[10px] text-red-600 font-semibold mt-2">
            <i className="fa-solid fa-circle-exclamation mr-1"></i>{createTeamError}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClearAll}
          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
        >
          Limpiar todo
        </button>
      </div>

      {/* Lista unificada de equipos seleccionados */}
      <div className="space-y-2">
        <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
          <i className="fa-solid fa-shield-halved mr-1"></i>Equipos seleccionados
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
          {totalSelected === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <i className="fa-solid fa-users text-2xl mb-2"></i>
              <p className="text-xs font-semibold">Ningún equipo seleccionado todavía</p>
            </div>
          ) : (
            <>
              {Array.from(selectedOwnIds).map(teamId => {
                const team = teamById.get(teamId);
                return (
                  <div key={`team-${teamId}`} className="flex items-center justify-between p-2 rounded-lg bg-white">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        {team ? (team.equipo || team.nombre) : teamId}
                      </span>
                      {team?.etapa && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {team.etapa}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleOwnTeam(teamId)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Quitar equipo"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                );
              })}
              {Array.from(selectedRivalIds).map(rivalId => {
                const rival = rivalById.get(rivalId);
                return (
                  <div key={`rival-${rivalId}`} className="flex items-center justify-between p-2 rounded-lg bg-white">
                    <span className="text-sm font-semibold text-slate-700">{rival?.nombre || rivalId}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleRival(rivalId)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Quitar equipo"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-xs font-semibold text-blue-700">
          <i className="fa-solid fa-circle-info mr-1.5"></i>
          {totalSelected === 0
            ? 'Selecciona al menos un equipo para esta competición'
            : `${totalSelected} equipo${totalSelected !== 1 ? 's' : ''} seleccionado${totalSelected !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  );
};

export default CompetitionTeamsSelector;
