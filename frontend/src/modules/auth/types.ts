/**
 * @fileoverview Tipos para el módulo de autenticación y selección de equipo
 */

/** Equipo disponible para seleccionar en el login */
export interface Team {
  id: string;
  name: string;
  shortName: string;
  competition: string;
  colors: {
    primary: string;
    secondary: string;
  };
  logoUrl?: string;
  /** Indica si el equipo tiene datos cargados o está pendiente */
  hasData: boolean;
  /** Descripción breve para mostrar en la tarjeta */
  description?: string;
}

/** @deprecated Alias de compatibilidad */
export type DemoTeam = Team;

/** Catálogo de equipos disponibles */
export const AVAILABLE_TEAMS: Team[] = [
  {
    id: 'cd-derio',
    name: 'CD Derio',
    shortName: 'Derio',
    competition: 'Tercera Federación - Grupo IV',
    colors: {
      primary: '#1a7a3a',   // Verde
      secondary: '#ffffff', // Blanco
    },
    logoUrl: '/logos/cd-derio.png',
    hasData: true,
    description: 'Plantilla, staff y clasificación',
  },
  {
    id: 'portugalete',
    name: 'Portugalete CF',
    shortName: 'Portu',
    competition: 'Segunda RFEF',
    colors: {
      primary: '#c8102e',   // Rojo
      secondary: '#000000', // Negro
    },
    logoUrl: '/logos/portugalete.png',
    hasData: false,
    description: 'Plantilla, staff y clasificación',
  },
  {
    id: 'escuela-huesca',
    name: 'ESCUELA HUESCA',
    shortName: 'Huesca',
    competition: 'Fútbol Base',
    colors: {
      primary: '#e2231a',   // Rojo
      secondary: '#000000', // Negro
    },
    logoUrl: '/logos/escuela-huesca.png',
    hasData: true,
    description: 'Cadete A y Juvenil A — Plantilla y gestión',
  },
];

/** @deprecated Usa AVAILABLE_TEAMS */
export const DEMO_TEAMS = AVAILABLE_TEAMS;
