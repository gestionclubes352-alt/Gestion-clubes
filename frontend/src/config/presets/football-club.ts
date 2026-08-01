/**
 * @fileoverview Preset de configuración para Club de Fútbol
 * @description Configuración completa optimizada para clubs de fútbol
 */

import type {
  AppConfig,
  ThemeConfig,
  ModulesConfig,
  ContentLabels,
  MemberRole,
  MemberSubRole,
  EventTypeConfig,
} from '../types';
import { FOOTBALL_FORMATIONS } from '../defaults';

// ============================================================================
// TEMA CLUB DE FÚTBOL
// ============================================================================

const footballTheme: ThemeConfig = {
  colors: {
    primary: '#c8102e',      // Grana (Athletic)
    primaryLight: '#d4213d',
    primaryDark: '#a00d25',
    secondary: '#2e6da4',    // Azul medio
    accent: '#c8102e',       // Grana
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    background: '#f8fafc',
    surface: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
  },
  fonts: {
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  borderRadius: 'xl',
  darkMode: false,
};

// ============================================================================
// MÓDULOS CLUB DE FÚTBOL
// ============================================================================

const footballModules: ModulesConfig = {
  dashboard: { enabled: true, label: 'Inicio', icon: 'fa-house' },
  members: { enabled: true, label: 'Plantilla', icon: 'fa-users' },
  staff: { enabled: true, label: 'Personal', icon: 'fa-user-tie' },
  groups: { enabled: true, label: 'Equipos', icon: 'fa-trophy' },
  calendar: { enabled: true, label: 'Sesiones', icon: 'fa-calendar-check' },
  tacticalBoard: { enabled: true, label: 'Campograma', icon: 'fa-diagram-project' },
  exerciseDesigner: { enabled: true, label: 'Diseñador', icon: 'fa-person-running' },
  videoLibrary: { enabled: true, label: 'Videoteca', icon: 'fa-video' },
  standings: { enabled: true, label: 'Clasificación', icon: 'fa-ranking-star' },
  users: { enabled: true, label: 'Usuarios', icon: 'fa-user-gear' },
  reports: { enabled: true, label: 'Informes', icon: 'fa-file-lines' },
  whiteboard: { enabled: true, label: 'Pizarra Táctica', icon: 'fa-chalkboard-user' },
};

// ============================================================================
// ETIQUETAS CLUB DE FÚTBOL
// ============================================================================

const footballLabels: ContentLabels = {
  sidebar: {
    home: 'Inicio',
    externalData: 'Datos Externos',
    sportsArea: 'Área Deportiva',
    administration: 'Administración',
    collaboration: 'Colaboración',
  },
  modules: {
    members: 'Plantilla',
    staff: 'Personal',
    groups: 'Equipos',
    calendar: 'Calendario',
    matches: 'Partidos',
    sessions: 'Entrenamientos',
  },
  actions: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Añadir',
    export: 'Exportar',
    import: 'Importar',
    search: 'Buscar jugador',
    filter: 'Filtrar',
  },
  marketing: {
    tagline: 'Pasión desde siempre',
    description: 'Software integral de gestión deportiva para clubes de fútbol profesionales y amateur.',
    ctaLabel: 'Acceder',
    secondaryCtaLabel: 'Ver partidos',
  },
};

// ============================================================================
// ROLES DE JUGADORES
// ============================================================================

const footballMemberRoles: MemberRole[] = [
  { id: 'portero', label: 'Portero', icon: 'fa-hand', category: 'player', color: '#f59e0b' },
  { id: 'defensa', label: 'Defensa', icon: 'fa-shield', category: 'player', color: '#3b82f6' },
  { id: 'medio', label: 'Centrocampista', icon: 'fa-arrows-left-right', category: 'player', color: '#10b981' },
  { id: 'delantero', label: 'Delantero', icon: 'fa-futbol', category: 'player', color: '#ef4444' },
];

const footballMemberSubRoles: MemberSubRole[] = [
  // Porteros
  { id: 'portero', label: 'Portero', parentRoleId: 'portero', profile: 'N/A' },
  // Defensas
  { id: 'central-d', label: 'Central Derecho', parentRoleId: 'defensa', profile: 'D' },
  { id: 'central-i', label: 'Central Izquierdo', parentRoleId: 'defensa', profile: 'I' },
  { id: 'lateral-d', label: 'Lateral Derecho', parentRoleId: 'defensa', profile: 'D' },
  { id: 'lateral-i', label: 'Lateral Izquierdo', parentRoleId: 'defensa', profile: 'I' },
  { id: 'carrilero-d', label: 'Carrilero Derecho', parentRoleId: 'defensa', profile: 'D' },
  { id: 'carrilero-i', label: 'Carrilero Izquierdo', parentRoleId: 'defensa', profile: 'I' },
  // Centrocampistas
  { id: 'mediocentro', label: 'Mediocentro', parentRoleId: 'medio', profile: 'C' },
  { id: 'mediapunta', label: 'Mediapunta', parentRoleId: 'medio', profile: 'C' },
  { id: 'pivote', label: 'Pivote Defensivo', parentRoleId: 'medio', profile: 'C' },
  { id: 'interior-d', label: 'Interior Derecho', parentRoleId: 'medio', profile: 'D' },
  { id: 'interior-i', label: 'Interior Izquierdo', parentRoleId: 'medio', profile: 'I' },
  // Delanteros
  { id: 'delantero-centro', label: 'Delantero Centro', parentRoleId: 'delantero', profile: 'C' },
  { id: 'extremo-d', label: 'Extremo Derecho', parentRoleId: 'delantero', profile: 'D' },
  { id: 'extremo-i', label: 'Extremo Izquierdo', parentRoleId: 'delantero', profile: 'I' },
  { id: 'segundo-punta', label: 'Segundo Punta', parentRoleId: 'delantero', profile: 'C' },
];

// ============================================================================
// TIPOS DE EVENTO FÚTBOL
// ============================================================================

const footballEventTypes: EventTypeConfig[] = [
  {
    id: 'match',
    label: 'Partido',
    icon: 'fa-futbol',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    hasAttendance: true,
    hasScore: true,
    requiredFields: [],
  },
  {
    id: 'training',
    label: 'Entrenamiento',
    icon: 'fa-person-running',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    hasAttendance: true,
    hasScore: false,
  },
  {
    id: 'meeting',
    label: 'Reunión',
    icon: 'fa-users',
    color: 'text-[var(--accent)]',
    bgColor: 'bg-red-50',
    hasAttendance: true,
    hasScore: false,
  },
  {
    id: 'rest',
    label: 'Descanso',
    icon: 'fa-bed',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    hasAttendance: false,
    hasScore: false,
  },
  {
    id: 'activity',
    label: 'Actividad',
    icon: 'fa-flag',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hasAttendance: true,
    hasScore: false,
  },
  {
    id: 'other',
    label: 'Otro',
    icon: 'fa-calendar',
    color: 'text-slate-400',
    bgColor: 'bg-slate-50',
    hasAttendance: false,
    hasScore: false,
  },
];

// ============================================================================
// CONFIGURACIÓN COMPLETA CLUB DE FÚTBOL
// ============================================================================

export const createFootballClubConfig = (
  organizationOverrides?: Partial<AppConfig['organization']>
): AppConfig => ({
  organization: {
    id: 'football-club',
    name: 'Club de Fútbol',
    shortName: 'FC',
    type: 'sports-club',
    sportType: 'football',
    season: '2025-26',
    ...organizationOverrides,
  },
  theme: footballTheme,
  modules: footballModules,
  labels: footballLabels,
  memberRoles: footballMemberRoles,
  memberSubRoles: footballMemberSubRoles,
  eventTypes: footballEventTypes,
  formations: FOOTBALL_FORMATIONS,
});

export default createFootballClubConfig;
