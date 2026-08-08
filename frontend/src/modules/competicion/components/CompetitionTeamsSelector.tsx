import React, { useState, useEffect, useMemo } from 'react';
import type { Competicion, EquipoRival } from '@/shared/services/dataService';
import { equiposRivalesService } from '@shared/services';
import type { Club } from '@modules/clubes/types';
import type { CompetitionTeam } from '../types';
import { clubesService } from '@shared/services';
import type { EquipoRef } from '../services/competicionEquiposService';

interface CompetitionTeamsSelectorProps {
  competicion: Competicion;
  allTeams: CompetitionTeam[];
  /** Equipos (propios y rivales de catálogo) ya guardados para esta competición */
  initialTeams?: EquipoRef[];
  onTeamsSelected: (teams: EquipoRef[]) => void;
}

const CompetitionTeamsSelector: React.FC<CompetitionTeamsSelectorProps> = ({
  competicion,
  allTeams,
  initialTeams = [],
  onTeamsSelected,
}) => {
  const [selectedOwnIds, setSelectedOwnIds] = useState<Set<string>>(
    () => new Set(initialTeams.filter(t => t.equipoId).map(t => t.equipoId as string))
  );
  const [selectedRivalIds, setSelectedRivalIds] = useState<Set<string>>(
    () => new Set(initialTeams.filter(t => t.equipoRivalId).map(t => t.equipoRivalId as string))
  );
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState('');
  const [selectedRivalToAdd, setSelectedRivalToAdd] = useState('');
  const [rivalCatalog, setRivalCatalog] = useState<EquipoRival[]>([]);
  const [newRivalName, setNewRivalName] = useState('');
  const [creatingRival, setCreatingRival] = useState(false);
  const [rivalError, setRivalError] = useState<string | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);

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

  const teamById = useMemo(() => new Map(allTeams.map(t => [String(t.id), t])), [allTeams]);
  const rivalById = useMemo(() => new Map(rivalCatalog.map(r => [String(r.id), r])), [rivalCatalog]);

  const availableOwnTeamsByClub = useMemo(() => {
    const grouped = new Map<string, CompetitionTeam[]>();
    allTeams.forEach(team => {
      if (selectedOwnIds.has(String(team.id))) return;
      const clubId = String(team.clubId || '');
      if (!grouped.has(clubId)) grouped.set(clubId, []);
      grouped.get(clubId)!.push(team);
    });
    return grouped;
  }, [allTeams, selectedOwnIds]);

  const availableRivals = useMemo(
    () => rivalCatalog.filter(r => !selectedRivalIds.has(String(r.id))),
    [rivalCatalog, selectedRivalIds]
  );

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

  const handleSelectTeamFromDropdown = (teamId: string) => {
    if (!teamId || selectedOwnIds.has(teamId)) {
      setSelectedTeamToAdd('');
      return;
    }
    const newSelected = new Set(selectedOwnIds);
    newSelected.add(teamId);
    setSelectedOwnIds(newSelected);
    setSelectedTeamToAdd('');
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

  const handleSelectRivalFromDropdown = (rivalId: string) => {
    if (!rivalId || selectedRivalIds.has(rivalId)) {
      setSelectedRivalToAdd('');
      return;
    }
    const newSelected = new Set(selectedRivalIds);
    newSelected.add(rivalId);
    setSelectedRivalIds(newSelected);
    setSelectedRivalToAdd('');
    emitChange(selectedOwnIds, newSelected);
  };

  const handleCreateRival = async () => {
    const nombre = newRivalName.trim();
    if (!nombre) return;
    setRivalError(null);
    setCreatingRival(true);
    try {
      const created = await equiposRivalesService.create({ nombre });
      setRivalCatalog(prev => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      const newSelected = new Set(selectedRivalIds);
      newSelected.add(String(created.id));
      setSelectedRivalIds(newSelected);
      emitChange(selectedOwnIds, newSelected);
      setNewRivalName('');
    } catch (err) {
      console.error('Error creating rival team:', err);
      setRivalError(err instanceof Error ? err.message : 'Error al dar de alta el equipo rival');
    } finally {
      setCreatingRival(false);
    }
  };

  const handleClearAll = () => {
    setSelectedOwnIds(new Set());
    setSelectedRivalIds(new Set());
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
          Solo se pueden añadir equipos ya dados de alta (propios o del catálogo de rivales). Aparecerán en el selector al crear partidos.
        </p>
      </div>

      {/* Desplegable de equipos propios */}
      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
          <i className="fa-solid fa-users mr-1"></i>Añadir equipo propio
        </label>
        <select
          value={selectedTeamToAdd}
          onChange={(e) => handleSelectTeamFromDropdown(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
        >
          <option value="">
            {availableOwnTeamsByClub.size === 0 ? 'No hay más equipos propios disponibles' : 'Selecciona un equipo...'}
          </option>
          {Array.from(availableOwnTeamsByClub.entries()).map(([clubId, teams]) => (
            <optgroup key={clubId} label={clubNameById.get(clubId) || 'Mi club'}>
              {teams.map(team => (
                <option key={team.id} value={String(team.id)}>
                  {team.equipo || team.nombre}{team.etapa ? ` (${team.etapa})` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Desplegable de rivales del catálogo */}
      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
          <i className="fa-solid fa-earth-americas mr-1"></i>Añadir equipo rival
        </label>
        <select
          value={selectedRivalToAdd}
          onChange={(e) => handleSelectRivalFromDropdown(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
        >
          <option value="">
            {availableRivals.length === 0 ? 'No hay rivales en el catálogo todavía' : 'Selecciona un rival...'}
          </option>
          {availableRivals.map(rival => (
            <option key={rival.id} value={String(rival.id)}>{rival.nombre}</option>
          ))}
        </select>
      </div>

      {/* Dar de alta un rival nuevo en el catálogo */}
      <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
          <i className="fa-solid fa-plus mr-1"></i>¿El rival no existe todavía? Dalo de alta
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: San Lorenzo"
            value={newRivalName}
            onChange={(e) => setNewRivalName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateRival();
              }
            }}
            disabled={creatingRival}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleCreateRival}
            disabled={!newRivalName.trim() || creatingRival}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all disabled:opacity-40"
          >
            <i className="fa-solid fa-floppy-disk"></i> {creatingRival ? 'Guardando...' : 'Dar de alta'}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Se guarda en el catálogo de equipos rivales y se añade automáticamente a esta competición.
        </p>
        {rivalError && (
          <p className="text-[10px] text-red-600 font-semibold mt-2">
            <i className="fa-solid fa-circle-exclamation mr-1"></i>{rivalError}
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

      {/* Lista de rivales seleccionados */}
      {selectedRivalIds.size > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
            <i className="fa-solid fa-earth-americas mr-1"></i>Rivales seleccionados
          </div>
          <div className="space-y-1.5 border border-slate-200 rounded-xl p-3 bg-amber-50/50">
            {Array.from(selectedRivalIds).map(rivalId => {
              const rival = rivalById.get(rivalId);
              return (
                <div key={rivalId} className="flex items-center justify-between p-2 rounded-lg bg-white">
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
          </div>
        </div>
      )}

      {/* Lista de equipos propios seleccionados */}
      <div className="space-y-2">
        <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
          <i className="fa-solid fa-shield-halved mr-1"></i>Equipos propios seleccionados
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
          {selectedOwnIds.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <i className="fa-solid fa-users text-2xl mb-2"></i>
              <p className="text-xs font-semibold">Ningún equipo propio seleccionado</p>
            </div>
          ) : (
            Array.from(selectedOwnIds).map(teamId => {
              const team = teamById.get(teamId);
              return (
                <div key={teamId} className="flex items-center justify-between p-2 rounded-lg bg-white">
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
            })
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
