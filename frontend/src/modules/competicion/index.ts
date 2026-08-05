// Barrel export para el módulo Competición

// Componentes
export { default as CompetitionTable } from './components/CompetitionTable';
export { default as EditTeamModal } from './components/EditTeamModal';
export { default as LeagueTable } from './components/LeagueTable';
export { default as CompetitionsConfigView } from './components/CompetitionsConfigView';

// Hooks
export { useGeminiStandings } from './hooks';
export type { UseGeminiStandingsOptions, UseGeminiStandingsReturn } from './hooks';

// Types
export * from './types';
