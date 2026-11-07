import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const TEAM_FILTER_STORAGE_KEY = 'sport_management_selected_teams';

interface TeamFilterContextType {
  selectedTeams: string[];
  setSelectedTeams: (teams: string[]) => void;
  toggleTeam: (team: string) => void;
  clearSelectedTeams: () => void;
}

const TeamFilterContext = createContext<TeamFilterContextType | undefined>(undefined);

const normalizeTeam = (team: string) => team.trim().toLowerCase();

export const TeamFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTeams, setSelectedTeamsState] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEAM_FILTER_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setSelectedTeamsState(parsed.filter((team): team is string => typeof team === 'string' && team.trim().length > 0));
      }
    } catch {
      // Ignore invalid persisted state
    }
  }, []);

  const setSelectedTeams = useCallback((teams: string[]) => {
    const uniqueTeams = Array.from(
      teams.reduce((map, team) => {
        const rawTeam = team.trim();
        if (!rawTeam) return map;
        const key = normalizeTeam(rawTeam);
        if (!map.has(key)) {
          map.set(key, rawTeam);
        }
        return map;
      }, new Map<string, string>()).values()
    );
    setSelectedTeamsState(uniqueTeams);
    localStorage.setItem(TEAM_FILTER_STORAGE_KEY, JSON.stringify(uniqueTeams));
  }, []);

  const toggleTeam = useCallback((team: string) => {
    setSelectedTeamsState(prev => {
      const normalized = normalizeTeam(team);
      const exists = prev.some(item => normalizeTeam(item) === normalized);
      const next = exists
        ? prev.filter(item => normalizeTeam(item) !== normalized)
        : [...prev, team.trim()];
      localStorage.setItem(TEAM_FILTER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearSelectedTeams = useCallback(() => {
    setSelectedTeamsState([]);
    localStorage.removeItem(TEAM_FILTER_STORAGE_KEY);
  }, []);

  const value = useMemo<TeamFilterContextType>(() => ({
    selectedTeams,
    setSelectedTeams,
    toggleTeam,
    clearSelectedTeams,
  }), [selectedTeams, setSelectedTeams, toggleTeam, clearSelectedTeams]);

  return (
    <TeamFilterContext.Provider value={value}>
      {children}
    </TeamFilterContext.Provider>
  );
};

export const useTeamFilter = (): TeamFilterContextType => {
  const context = useContext(TeamFilterContext);
  if (!context) {
    throw new Error('useTeamFilter debe usarse dentro de un TeamFilterProvider');
  }
  return context;
};

export default TeamFilterContext;
