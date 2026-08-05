/**
 * @fileoverview Valores por defecto para la configuración
 * @description Proporciona defaults sensatos para todas las configuraciones
 */

import type {
  ThemeConfig,
  ModulesConfig,
  ContentLabels,
  MemberRole,
  MemberSubRole,
  EventTypeConfig,
  FormationConfig,
} from './types';

// ============================================================================
// TEMA POR DEFECTO
// ============================================================================

export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    primary: '#c8102e',      // Grana
    primaryLight: '#d4213d', // Grana claro
    primaryDark: '#a00d25',  // Grana oscuro
    secondary: '#2e6da4',    // Azul medio
    accent: '#c8102e',       // Grana
    success: '#22c55e',      // Green-500
    warning: '#f59e0b',      // Amber-500
    danger: '#ef4444',       // Red-500
    info: '#3b82f6',         // Blue-500
    background: '#f8fafc',   // Slate-50
    surface: '#ffffff',
    textPrimary: '#1a1a1a',  // Dark
    textSecondary: '#64748b', // Slate-500
    border: '#e2e8f0',       // Slate-200
  },
  fonts: {
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  borderRadius: 'lg',
  darkMode: false,
};

// ============================================================================
// MÓDULOS POR DEFECTO
// ============================================================================

export const DEFAULT_MODULES: ModulesConfig = {
  dashboard: { enabled: true, label: 'Inicio', icon: 'fa-house' },
  members: { enabled: true, label: 'Miembros', icon: 'fa-users' },
  staff: { enabled: true, label: 'Staff', icon: 'fa-user-tie' },
  groups: { enabled: true, label: 'Grupos', icon: 'fa-sitemap' },
  calendar: { enabled: true, label: 'Calendario', icon: 'fa-calendar-days' },
  tacticalBoard: { enabled: false, label: 'Pizarra', icon: 'fa-chalkboard' },
  exerciseDesigner: { enabled: false, label: 'Diseñador', icon: 'fa-pen-ruler' },
  videoLibrary: { enabled: true, label: 'Videos', icon: 'fa-video' },
  standings: { enabled: false, label: 'Clasificación', icon: 'fa-trophy' },
  users: { enabled: true, label: 'Usuarios', icon: 'fa-user-gear' },
  reports: { enabled: false, label: 'Informes', icon: 'fa-file-lines' },
  whiteboard: { enabled: false, label: 'Pizarra Táctica', icon: 'fa-chalkboard-user' },
};

// ============================================================================
// ETIQUETAS POR DEFECTO
// ============================================================================

export const DEFAULT_LABELS: ContentLabels = {
  sidebar: {
    home: 'Inicio',
    externalData: 'Datos',
    sportsArea: 'Área Principal',
    administration: 'Administración',
    collaboration: 'Colaboración',
  },
  modules: {
    members: 'Miembros',
    staff: 'Staff',
    groups: 'Grupos',
    calendar: 'Calendario',
    matches: 'Eventos',
    sessions: 'Sesiones',
  },
  actions: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Añadir',
    export: 'Exportar',
    import: 'Importar',
    search: 'Buscar',
    filter: 'Filtrar',
  },
  marketing: {
    tagline: 'Bienvenido',
    description: 'Tu plataforma de gestión integral',
    ctaLabel: 'Comenzar',
    secondaryCtaLabel: 'Más información',
  },
};

// ============================================================================
// ROLES DE MIEMBRO GENÉRICOS
// ============================================================================

export const DEFAULT_MEMBER_ROLES: MemberRole[] = [
  { id: 'admin', label: 'Administrador', icon: 'fa-user-shield', category: 'staff' },
  { id: 'manager', label: 'Manager', icon: 'fa-user-tie', category: 'staff' },
  { id: 'member', label: 'Miembro', icon: 'fa-user', category: 'member' },
  { id: 'external', label: 'Externo', icon: 'fa-user-plus', category: 'external' },
];

// ============================================================================
// TIPOS DE EVENTO GENÉRICOS
// ============================================================================

export const DEFAULT_EVENT_TYPES: EventTypeConfig[] = [
  {
    id: 'meeting',
    label: 'Reunión',
    icon: 'fa-users',
    color: 'text-[var(--accent)]',
    bgColor: 'bg-red-50',
    hasAttendance: true,
  },
  {
    id: 'task',
    label: 'Tarea',
    icon: 'fa-clipboard-check',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    hasAttendance: false,
  },
  {
    id: 'event',
    label: 'Evento',
    icon: 'fa-calendar-star',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hasAttendance: true,
  },
  {
    id: 'reminder',
    label: 'Recordatorio',
    icon: 'fa-bell',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    hasAttendance: false,
  },
  {
    id: 'rest',
    label: 'Descanso',
    icon: 'fa-bed',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    hasAttendance: false,
  },
];

// ============================================================================
// FORMACIONES DE FÚTBOL (PRESET DEPORTIVO)
// ============================================================================

export const FOOTBALL_FORMATIONS: FormationConfig[] = [
  {
    id: '4-3-3',
    name: '4-3-3',
    sportType: 'football',
    positions: [
      { id: 'GK', x: 50, y: 92, label: 'POR', fullName: 'Portero' },
      { id: 'LD', x: 92, y: 76, label: 'LD', fullName: 'Lateral Derecho' },
      { id: 'CD1', x: 68, y: 82, label: 'DFC', fullName: 'Defensa Central' },
      { id: 'CD2', x: 32, y: 82, label: 'DFC', fullName: 'Defensa Central' },
      { id: 'LI', x: 8, y: 76, label: 'LI', fullName: 'Lateral Izquierdo' },
      { id: 'MC', x: 50, y: 62, label: 'MC', fullName: 'Mediocentro' },
      { id: 'MCO1', x: 75, y: 52, label: 'MCO', fullName: 'Mediapunta' },
      { id: 'MCO2', x: 25, y: 52, label: 'MCO', fullName: 'Mediapunta' },
      { id: 'ED', x: 92, y: 30, label: 'ED', fullName: 'Extremo Derecho' },
      { id: 'DC', x: 50, y: 22, label: 'DC', fullName: 'Delantero Centro' },
      { id: 'EI', x: 8, y: 30, label: 'EI', fullName: 'Extremo Izquierdo' },
    ],
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    sportType: 'football',
    positions: [
      { id: 'GK', x: 50, y: 92, label: 'POR', fullName: 'Portero' },
      { id: 'LD', x: 92, y: 78, label: 'LD', fullName: 'Lateral Derecho' },
      { id: 'CD1', x: 68, y: 82, label: 'DFC', fullName: 'Defensa Central' },
      { id: 'CD2', x: 32, y: 82, label: 'DFC', fullName: 'Defensa Central' },
      { id: 'LI', x: 8, y: 78, label: 'LI', fullName: 'Lateral Izquierdo' },
      { id: 'MD', x: 92, y: 48, label: 'MD', fullName: 'Mediocampista Derecho' },
      { id: 'MC1', x: 60, y: 55, label: 'MC', fullName: 'Mediocentro' },
      { id: 'MC2', x: 40, y: 55, label: 'MC', fullName: 'Mediocentro' },
      { id: 'MI', x: 8, y: 48, label: 'MI', fullName: 'Mediocampista Izquierdo' },
      { id: 'DC1', x: 65, y: 25, label: 'DC', fullName: 'Delantero Centro' },
      { id: 'DC2', x: 35, y: 25, label: 'DC', fullName: 'Delantero Centro' },
    ],
  },
  {
    id: '4-2-3-1',
    name: '4-2-3-1',
    sportType: 'football',
    positions: [
      { id: 'GK', x: 50, y: 92, label: 'POR', fullName: 'Portero' },
      { id: 'LD', x: 92, y: 78, label: 'LD', fullName: 'Lateral Derecho' },
      { id: 'CD1', x: 68, y: 82, label: 'DFC', fullName: 'Defensa Central' },
      { id: 'CD2', x: 32, y: 82, label: 'DFC', fullName: 'Defensa Central' },
      { id: 'LI', x: 8, y: 78, label: 'LI', fullName: 'Lateral Izquierdo' },
      { id: 'MCD1', x: 62, y: 58, label: 'MCD', fullName: 'Mediocentro Defensivo' },
      { id: 'MCD2', x: 38, y: 58, label: 'MCD', fullName: 'Mediocentro Defensivo' },
      { id: 'MD', x: 92, y: 40, label: 'MD', fullName: 'Extremo Derecho' },
      { id: 'MCO', x: 50, y: 44, label: 'MCO', fullName: 'Mediapunta' },
      { id: 'MI', x: 8, y: 40, label: 'MI', fullName: 'Extremo Izquierdo' },
      { id: 'DC', x: 50, y: 22, label: 'DC', fullName: 'Delantero Centro' },
    ],
  },
  {
    id: '5-3-2',
    name: '5-3-2',
    sportType: 'football',
    positions: [
      { id: 'GK', x: 50, y: 92, label: 'POR', fullName: 'Portero' },
      { id: 'CAD', x: 94, y: 65, label: 'CAD', fullName: 'Carrilero Derecho' },
      { id: 'CD1', x: 75, y: 82, label: 'DFC', fullName: 'Defensa Central' },
      { id: 'CD2', x: 50, y: 85, label: 'DFC', fullName: 'Defensa Central' },
      { id: 'CD3', x: 25, y: 82, label: 'DFC', fullName: 'Defensa Central' },
      { id: 'CAI', x: 6, y: 65, label: 'CAI', fullName: 'Carrilero Izquierdo' },
      { id: 'MC1', x: 65, y: 52, label: 'MC', fullName: 'Mediocentro' },
      { id: 'MC2', x: 50, y: 56, label: 'MC', fullName: 'Mediocentro' },
      { id: 'MC3', x: 35, y: 52, label: 'MC', fullName: 'Mediocentro' },
      { id: 'DC1', x: 65, y: 25, label: 'DC', fullName: 'Delantero Centro' },
      { id: 'DC2', x: 35, y: 25, label: 'DC', fullName: 'Delantero Centro' },
    ],
  },
];
