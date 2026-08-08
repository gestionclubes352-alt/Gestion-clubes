import React, { useState, useEffect, useMemo } from 'react';
import type { Competicion } from '@/shared/services/dataService';
import type { Club } from '@modules/clubes/types';
import type { CompetitionTeam } from '../types';
import { clubesService } from '@shared/services';
import { competicionEquiposService, type EquipoRef } from '../services/competicionEquiposService';

interface CompetitionTeamsSelectorProps {
  competicion: Competicion;
  allTeams: CompetitionTeam[];
  /** Equipos (propios y externos) ya guardados para esta competición */
  initialTeams?: EquipoRef[];
  onTeamsSelected: (teams: EquipoRef[]) => void;
}

const ownKey = (id: string) => `own:${id}`;
const externalKey = (name: string) => `ext:${name.trim().toLowerCase()}`;

const CompetitionTeamsSelector: React.FC<CompetitionTeamsSelectorProps> = ({
  competicion,
  allTeams,
  initialTeams = [],
  onTeamsSelected,
}) => {
  const [selectedOwnIds, setSelectedOwnIds] = useState<Set<string>>(
    () => new Set(initialTeams.filter(t => t.equipoId).map(t => t.equipoId as string))
  );
  const [externalTeams, setExternalTeams] = useState<string[]>(
    () => initialTeams.filter(t => t.nombreExterno).map(t => t.nombreExterno as string)
  );
  const [newExternalName, setNewExternalName] = useState('');
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState('');
  const [selectedExternalToAdd, setSelectedExternalToAdd] = useState('');
  const [knownExternalNames, setKnownExternalNames] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
    const loadKnownExternalNames = async () => {
      try {
        const names = await competicionEquiposService.getAllExternalTeamNames();
        setKnownExternalNames(names);
      } catch (err) {
        console.error('Error loading known external teams:', err);
      }
    };
    loadKnownExternalNames();
  }, []);

  const clubNameById = useMemo(() => new Map(clubs.map(c => [String(c.id), c.nombre])), [clubs]);

  const teamById = useMemo(() => new Map(allTeams.map(t => [String(t.id), t])), [allTeams]);

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

  // Rivales ya usados en otras competiciones, que aún no están en esta
  const availableExternalNames = useMemo(() => {
    const alreadyAdded = new Set(externalTeams.map(t => t.toLowerCase()));
    return knownExternalNames.filter(name => !alreadyAdded.has(name.toLowerCase()));
  }, [knownExternalNames, externalTeams]);

  const emitChange = (ownIds: Set<string>, external: string[]) => {
    const teams: EquipoRef[] = [
      ...Array.from(ownIds).map(equipoId => ({ equipoId })),
      ...external.map(nombreExterno => ({ nombreExterno })),
    ];
    onTeamsSelected(teams);
  };

  const filteredExternalTeams = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return externalTeams.filter(name => name.toLowerCase().includes(term));
  }, [externalTeams, searchTerm]);

  const handleToggleOwnTeam = (teamId: string) => {
    const newSelected = new Set(selectedOwnIds);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedOwnIds(newSelected);
    emitChange(newSelected, externalTeams);
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
    emitChange(newSelected, externalTeams);
  };

  const handleAddExternalTeam = () => {
    const name = newExternalName.trim();
    if (!name) return;
    if (externalTeams.some(t => t.toLowerCase() === name.toLowerCase())) {
      setNewExternalName('');
      return;
    }
    const updated = [...externalTeams, name];
    setExternalTeams(updated);
    setNewExternalName('');
    emitChange(selectedOwnIds, updated);
    // Si es un rival nuevo, lo añadimos también al catálogo reutilizable local
    setKnownExternalNames(prev => (prev.some(n => n.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name].sort((a, b) => a.localeCompare(b, 'es'))));
  };

  const handleSelectExternalFromDropdown = (name: string) => {
    if (!name || externalTeams.some(t => t.toLowerCase() === name.toLowerCase())) {
      setSelectedExternalToAdd('');
      return;
    }
    const updated = [...externalTeams, name];
    setExternalTeams(updated);
    setSelectedExternalToAdd('');
    emitChange(selectedOwnIds, updated);
  };

  const handleRemoveExternalTeam = (name: string) => {
    const updated = externalTeams.filter(t => t !== name);
    setExternalTeams(updated);
    emitChange(selectedOwnIds, updated);
  };

  const handleClearAll = () => {
    setSelectedOwnIds(new Set());
    setExternalTeams([]);
    onTeamsSelected([]);
  };

  const totalSelected = selectedOwnIds.size + externalTeams.length;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">
          Equipos que participan en {competicion.nombre}
        </h4>
        <p className="text-[10px] text-slate-500">
          Selecciona tus equipos y/o añade rivales externos (p.ej. amistosos). Aparecerán en el selector al crear partidos.
        </p>
      </div>

      {/* Añadir equipo externo: desplegable de rivales ya usados */}
      {availableExternalNames.length > 0 && (
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            <i className="fa-solid fa-earth-americas mr-1"></i>Añadir rival ya usado
          </label>
          <select
            value={selectedExternalToAdd}
            onChange={(e) => handleSelectExternalFromDropdown(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
          >
            <option value="">Selecciona un rival...</option>
            {availableExternalNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Añadir equipo externo: escribir uno nuevo */}
      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
          <i className="fa-solid fa-user-plus mr-1"></i>Añadir rival nuevo
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: San Lorenzo"
            value={newExternalName}
            onChange={(e) => setNewExternalName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddExternalTeam();
              }
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={handleAddExternalTeam}
            disabled={!newExternalName.trim()}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all disabled:opacity-40"
          >
            <i className="fa-solid fa-plus"></i> Añadir
          </button>
        </div>
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

      {/* Buscador (filtra equipos externos) */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar equipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
        />
        <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
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

      {/* Lista de equipos externos ya añadidos */}
      {filteredExternalTeams.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
            <i className="fa-solid fa-earth-americas mr-1"></i>Equipos externos
          </div>
          <div className="space-y-1.5 border border-slate-200 rounded-xl p-3 bg-amber-50/50">
            {filteredExternalTeams.map(name => (
              <div key={externalKey(name)} className="flex items-center justify-between p-2 rounded-lg bg-white">
                <span className="text-sm font-semibold text-slate-700">{name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveExternalTeam(name)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Quitar equipo"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))}
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
            ? 'Selecciona o añade al menos un equipo para esta competición'
            : `${totalSelected} equipo${totalSelected !== 1 ? 's' : ''} seleccionado${totalSelected !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  );
};

export default CompetitionTeamsSelector;
