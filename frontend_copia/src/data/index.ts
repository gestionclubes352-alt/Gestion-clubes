/**
 * @fileoverview Datos de ejemplo para la aplicación
 * @description Los datos reales usan localStorage / Firestore.
 */

// Re-exportar constantes desde shared
export { SQUAD, STAFF, CAMPOGRAMAS, INITIAL_COMPETITION_TEAMS, MATCHES } from '../shared/constants';

// Re-exportar datos iniciales
export { 
  DEMO_PLAYERS, 
  DEMO_STAFF, 
  DEMO_COMPETITION_TEAMS,
  DEMO_USERS,
  HUESCA_CADETE_A_PLAYERS,
  HUESCA_JUVENIL_A_PLAYERS,
} from './demo';
export type { DemoUser } from './demo';
