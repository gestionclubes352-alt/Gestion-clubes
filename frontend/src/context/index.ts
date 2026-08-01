/**
 * @fileoverview Índice de contextos de la aplicación
 */

// Contexto de Autenticación
export { AuthProvider, useAuth } from './AuthContext';

// Contexto de Fuentes de Datos
export { DataSourceProvider, useDataSource } from './DataSourceContext';
export type { DataSourceType, DataSourceOption } from './DataSourceContext';

// Contexto de Equipo seleccionado
export { TeamProvider, useTeam } from './TeamContext';
export type { default as TeamContext } from './TeamContext';

// Contexto de filtro por equipo
export { TeamFilterProvider, useTeamFilter } from './TeamFilterContext';
export type { default as TeamFilterContext } from './TeamFilterContext';
