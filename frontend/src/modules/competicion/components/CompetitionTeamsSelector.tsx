import React, { useState, useEffect } from 'react';
import type { Competicion } from '@/shared/services/dataService';
import type { CompetitionTeam } from '../types';

interface CompetitionTeamsSelectorProps {
  competicion: Competicion;
  allTeams: CompetitionTeam[];
  onTeamsSelected: (teamIds: string[]) => void;
}

const CompetitionTeamsSelector: React.FC<CompetitionTeamsSelectorProps> = ({
  competicion,
  allTeams,
  onTeamsSelected,
}) => {
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Agrupar equipos por club
  const teamsByClub = React.useMemo(() => {
    const grouped = new Map<string, CompetitionTeam[]>();
    allTeams.forEach(team => {
      const clubId = String(team.clubId || '');
      if (!grouped.has(clubId)) {
        grouped.set(clubId, []);
      }
      grouped.get(clubId)!.push(team);
    });
    return grouped;
  }, [allTeams]);

  // Filtrar equipos por búsqueda
  const filteredTeams = React.useMemo(() => {
    const filtered = new Map<string, CompetitionTeam[]>();
    const term = searchTerm.toLowerCase();

    allTeams.forEach(team => {
      const clubId = String(team.clubId || '');
      const teamName = (team.equipo || team.nombre || '').toLowerCase();
      if (teamName.includes(term)) {
        if (!filtered.has(clubId)) {
          filtered.set(clubId, []);
        }
        filtered.get(clubId)!.push(team);
      }
    });
    return filtered;
  }, [allTeams, searchTerm]);

  const handleToggleTeam = (teamId: string) => {
    const newSelected = new Set(selectedTeamIds);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedTeamIds(newSelected);
    onTeamsSelected(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    const allIds = new Set(allTeams.map(t => String(t.id)));
    setSelectedTeamIds(allIds);
    onTeamsSelected(Array.from(allIds));
  };

  const handleClearAll = () => {
    setSelectedTeamIds(new Set());
    onTeamsSelected([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-3">
          Equipos que participan en {competicion.nombre}
        </h4>
        <p className="text-[10px] text-slate-500 mb-4">
          Selecciona los equipos que participarán en esta competición. Aparecerán en el selector al crear partidos.
        </p>
      </div>

      {/* Buscador */}
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

      {/* Botones de acción rápida */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={handleClearAll}
          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={handleSelectAll}
          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
        >
          Seleccionar todos
        </button>
      </div>

      {/* Lista de equipos agrupados por club */}
      <div className="space-y-4 max-h-80 overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50">
        {filteredTeams.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <i className="fa-solid fa-users text-3xl mb-2"></i>
            <p className="text-sm font-semibold">No hay equipos que coincidan</p>
          </div>
        ) : (
          Array.from(filteredTeams.entries()).map(([clubId, teams]) => (
            <div key={clubId} className="space-y-2">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">
                {teams[0]?.clubId ? `Club ${clubId}` : 'Sin club'}
              </div>
              <div className="space-y-1.5 pl-2">
                {teams.map(team => (
                  <label
                    key={team.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.has(String(team.id))}
                      onChange={() => handleToggleTeam(String(team.id))}
                      className="w-4 h-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      {team.equipo || team.nombre}
                    </span>
                    {team.categoria && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {team.categoria}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resumen */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-xs font-semibold text-blue-700">
          <i className="fa-solid fa-info-circle mr-1.5"></i>
          {selectedTeamIds.size === 0
            ? 'Selecciona al menos un equipo para esta competición'
            : `${selectedTeamIds.size} equipo${selectedTeamIds.size !== 1 ? 's' : ''} seleccionado${selectedTeamIds.size !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  );
};

export default CompetitionTeamsSelector;
