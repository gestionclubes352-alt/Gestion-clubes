// Tipos específicos del módulo Equipos Rivales (scouting)

export type { EquipoRival as RivalTeam, JugadorRival as RivalPlayer } from '@shared/services/dataService';

export const RIVAL_POSITIONS = ['Portero', 'Defensa', 'Medio', 'Delantero'] as const;
