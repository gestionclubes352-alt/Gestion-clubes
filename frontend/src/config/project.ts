/**
 * @fileoverview Configuración central del proyecto
 * @description Personaliza aquí branding, preset y menús visibles por defecto
 */

import type { AppConfig, ModulesConfig } from './types';

export type ProjectPreset = 'generic' | 'football-club' | 'company';

export interface ProjectConfig {
  preset: ProjectPreset;
  organizationOverrides: Partial<AppConfig['organization']>;
  moduleOverrides?: Partial<ModulesConfig>;
  defaultVisibleMenuIds: string[];
  /** Secciones del sidebar visibles por defecto (claves: general, management, planning, medical, tools, content, admin) */
  defaultVisibleSections: string[];
}

/**
 * =====================================================================
 * CONFIGURACIÓN ÚNICA DEL PROYECTO
 * =====================================================================
 *
 * - Cambia `preset` para base funcional.
 * - Cambia `organizationOverrides` para nombre/identidad general.
 * - Cambia `moduleOverrides` para activar/desactivar módulos.
 * - Cambia `defaultVisibleMenuIds` para los menús visibles al primer arranque.
 * - Cambia `defaultVisibleSections` para las secciones del sidebar visibles.
 */
export const PROJECT_CONFIG: ProjectConfig = {
  preset: 'generic',
  organizationOverrides: {
    id: 'sport-management',
    name: 'Sport Management',
    shortName: 'SMT',
    type: 'sports-club',
    description: 'Sports Management Platform',
  },
  moduleOverrides: {
    dashboard: { enabled: true },
    members: { enabled: true },
    staff: { enabled: true },
    groups: { enabled: true },
    calendar: { enabled: true },
    tacticalBoard: { enabled: false },
    exerciseDesigner: { enabled: false },
    videoLibrary: { enabled: true },
    standings: { enabled: false },
    users: { enabled: true },
    reports: { enabled: false },
    whiteboard: { enabled: true },
  },
  defaultVisibleMenuIds: [
    'INICIO',
    'CALENDARIO',
    'PLANTILLAS',
    'PERSONAL',
    'CLUBES',
    'EQUIPOS',
    'EQUIPOS_INTERNOS',
    'LOCALIDADES',
    'INSTALACIONES',
    'SESIONES',
    'PARTIDOS',
    'COMPETICIÓN',
    'LESIONES',
    'HISTORIAL MÉDICO',
    'RECONOCIMIENTOS',
    'REHABILITACIÓN',
    'RENDIMIENTO FÍSICO',
    'CAMPOGRAMA',
    'DISEÑADOR',
    'PIZARRA TÁCTICA',
    'REPOSITORIO DE TAREAS',
    'VIDEOTECA',
    'CONFIGURACIÓN',
  ],
  defaultVisibleSections: [
    'general',
    'management',
    'planning',
    'medical',
    'tools',
    'content',
    'admin',
  ],
};

export const DEFAULT_VISIBLE_MENU_SET = new Set(PROJECT_CONFIG.defaultVisibleMenuIds);
export const DEFAULT_VISIBLE_SECTIONS_SET = new Set(PROJECT_CONFIG.defaultVisibleSections);
