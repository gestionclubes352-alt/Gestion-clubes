// Barrel export para el módulo Competición

// Componentes
export { default as CompetitionTable } from './components/CompetitionTable';
export { default as EditTeamModal } from './components/EditTeamModal';
export { default as LeagueTable } from './components/LeagueTable';
export { default as LeagueTableFullPage } from './components/LeagueTableFullPage';
export { default as CompetitionsConfigView } from './components/CompetitionsConfigView';
export { default as CompetitionCalendarModal } from './components/CompetitionCalendarModal';
export { default as MatchModal } from './components/MatchModal';
export { default as CompetitionTeamsSelector } from './components/CompetitionTeamsSelector';
export type { MatchFormData } from './components/MatchModal';

// Servicios
export { competicionService } from './services/competicionService';
export { competicionEquiposService } from './services/competicionEquiposService';
export type { EquipoRef } from './services/competicionEquiposService';

// Hooks
export { useGeminiStandings } from './hooks';
export type { UseGeminiStandingsOptions, UseGeminiStandingsReturn } from './hooks';

// Types
export * from './types';
