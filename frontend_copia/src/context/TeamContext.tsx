/**
 * @fileoverview Contexto de equipo seleccionado
 * @description Gestiona el equipo activo del usuario en la sesión.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Team } from '../modules/auth/types';
import { AVAILABLE_TEAMS } from '../modules/auth/types';

const TEAM_STORAGE_KEY = 'sport_management_selected_team';

interface TeamContextType {
  /** Equipo seleccionado actualmente */
  selectedTeam: Team | null;
  /** Lista de equipos disponibles */
  availableTeams: Team[];
  /** Seleccionar un equipo (por id) */
  selectTeam: (teamId: string) => void;
  /** Limpiar selección (volver a login) */
  clearTeam: () => void;
  /** Si hay un equipo seleccionado */
  hasTeam: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Restaurar equipo guardado
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEAM_STORAGE_KEY);
      if (saved) {
        const teamId = JSON.parse(saved);
        const team = AVAILABLE_TEAMS.find(t => t.id === teamId);
        if (team) setSelectedTeam(team);
      }
    } catch {
      // ignorar errores de parsing
    }
  }, []);

  const selectTeam = useCallback((teamId: string) => {
    const team = AVAILABLE_TEAMS.find(t => t.id === teamId);
    if (team) {
      setSelectedTeam(team);
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamId));
    }
  }, []);

  const clearTeam = useCallback(() => {
    setSelectedTeam(null);
    localStorage.removeItem(TEAM_STORAGE_KEY);
  }, []);

  const value: TeamContextType = {
    selectedTeam,
    availableTeams: AVAILABLE_TEAMS,
    selectTeam,
    clearTeam,
    hasTeam: !!selectedTeam,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam debe usarse dentro de un TeamProvider');
  }
  return context;
};

export default TeamContext;
