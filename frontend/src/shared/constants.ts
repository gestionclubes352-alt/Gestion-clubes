/**
 * @fileoverview Constantes y datos iniciales de la aplicación
 * @description Este archivo mantiene compatibilidad con los componentes existentes.
 */

import type { Player } from '@modules/plantilla';
import type { StaffMember } from '@modules/staff';
import type { Campograma } from '@modules/entrenamientos';
import type { Match } from '@modules/partidos';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes';

// ============================================================================
// DATOS DE DEMOSTRACIÓN (Los datos reales usan localStorage / Firestore)
// ============================================================================

/**
 * Lista vacía de miembros - Los datos reales usan localStorage
 */
export const SQUAD: Player[] = [];

/**
 * Lista vacía de staff - Los datos reales usan localStorage
 */
export const STAFF: StaffMember[] = [];

/**
 * Lista vacía de campogramas - Los datos reales usan localStorage
 */
export const CAMPOGRAMAS: Campograma[] = [];

/**
 * Equipos de la Tercera RFEF Grupo IV (País Vasco) — Temporada 2025-2026
 * Sirve como fallback cuando Gemini AI no puede obtener datos en tiempo real.
 */
export const INITIAL_COMPETITION_TEAMS: CompetitionTeam[] = [
  { id: 1, nombre: 'AÑORGA K.K.E', estadio: 'Por definir', localidad: 'Donostia' },
  { id: 2, nombre: 'ARETXABALETA, U.D.', estadio: 'Por definir', localidad: 'Aretxabaleta' },
  { id: 3, nombre: 'AURRERA DE VITORIA, CD "A"', estadio: 'Por definir', localidad: 'Vitoria-Gasteiz' },
  { id: 4, nombre: 'CULTURAL DPVA. DURANGO, S.', estadio: 'Por definir', localidad: 'Durango' },
  { id: 5, nombre: 'DEPORTIVO ALAVES "C"', estadio: 'Por definir', localidad: 'Vitoria-Gasteiz' },
  { id: 6, nombre: 'DERIO, C.D.', estadio: 'Por definir', localidad: 'Derio' },
  { id: 7, nombre: 'DEUSTO, S.D.', estadio: 'Por definir', localidad: 'Bilbao' },
  { id: 8, nombre: 'EIBAR SAD, S.D. "C"', estadio: 'Por definir', localidad: 'Eibar' },
  { id: 9, nombre: 'LAGUN ONAK, C.D.', estadio: 'Por definir', localidad: 'Azpeitia' },
  { id: 10, nombre: 'LEIOA, S.D.', estadio: 'Por definir', localidad: 'Leioa' },
  { id: 11, nombre: 'PASAIA KIROL ELKARTEA', estadio: 'Por definir', localidad: 'Pasaia' },
  { id: 12, nombre: 'PORTUGALETE, C.', estadio: 'Por definir', localidad: 'Portugalete' },
  { id: 13, nombre: 'REAL SOCIEDAD DE FUTBOL "C"', estadio: 'Por definir', localidad: 'Donostia' },
  { id: 14, nombre: 'SAN IGNACIO C.D. "A"', estadio: 'Por definir', localidad: 'Bilbao' },
  { id: 15, nombre: 'SANTURTZI, C.D.', estadio: 'Por definir', localidad: 'Santurtzi' },
  { id: 16, nombre: 'TOURING, C.D.', estadio: 'Por definir', localidad: 'Errenteria' },
  { id: 17, nombre: 'ZAMUDIO, S.D. "A"', estadio: 'Por definir', localidad: 'Zamudio' },
  { id: 18, nombre: 'ZARAUTZ K.E.', estadio: 'Por definir', localidad: 'Zarautz' },
];

/**
 * Lista vacía de partidos - Los datos reales usan localStorage
 */
export const MATCHES: Match[] = [];

/**
 * Club único de Escuela Huesca en el catálogo de Clubes.
 */
export const HUESCA_CLUBES: Club[] = [
  { id: 'huesca-sd', nombre: 'HUESCA-S.D.', localidad: 'Huesca' },
];

/**
 * Equipo propio de Escuela Huesca → Juvenil A, vinculado al club HUESCA-S.D.
 */
export const HUESCA_JUVENIL_COMPETITION_TEAMS: CompetitionTeam[] = [
  { id: 'hj-13', clubId: 'huesca-sd', nombre: 'HUESCA-S.D.', estadio: 'Por definir', localidad: 'Huesca', equipo: 'Juvenil A' },
];

/**
 * Equipo propio de Escuela Huesca → Cadete A, vinculado al club HUESCA-S.D.
 */
export const HUESCA_CADETE_COMPETITION_TEAMS: CompetitionTeam[] = [
  { id: 'hc-2', clubId: 'huesca-sd', nombre: 'HUESCA-S.D.', estadio: 'Por definir', localidad: 'Huesca', equipo: 'Cadete A' },
];
