/**
 * @fileoverview Preset de configuración para Empresa
 * @description Configuración completa optimizada para gestión empresarial
 */

import type {
  AppConfig,
  ThemeConfig,
  ModulesConfig,
  ContentLabels,
  MemberRole,
  EventTypeConfig,
} from '../types';

// ============================================================================
// TEMA EMPRESA
// ============================================================================

const companyTheme: ThemeConfig = {
  colors: {
    primary: '#c8102e',      // Accent Red
    primaryLight: '#FF7A7F', // Accent Hover
    primaryDark: '#e54449',  // Accent Dark
    secondary: '#1a1a1a',    // Dark
    accent: '#c8102e',       // Accent
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#c8102e',
    background: '#f8fafc',
    surface: '#ffffff',
    textPrimary: '#1a1a1a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
  },
  fonts: {
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  borderRadius: 'lg',
  darkMode: false,
};

// ============================================================================
// MÓDULOS EMPRESA
// ============================================================================

const companyModules: ModulesConfig = {
  dashboard: { enabled: true, label: 'Dashboard', icon: 'fa-chart-line' },
  members: { enabled: true, label: 'Empleados', icon: 'fa-users' },
  staff: { enabled: true, label: 'Directivos', icon: 'fa-user-tie' },
  groups: { enabled: true, label: 'Departamentos', icon: 'fa-sitemap' },
  calendar: { enabled: true, label: 'Agenda', icon: 'fa-calendar-days' },
  tacticalBoard: { enabled: false, label: 'Organigrama', icon: 'fa-diagram-project' },
  exerciseDesigner: { enabled: false, label: 'Diseñador', icon: 'fa-pen-ruler' },
  videoLibrary: { enabled: true, label: 'Formación', icon: 'fa-graduation-cap' },
  standings: { enabled: false, label: 'KPIs', icon: 'fa-chart-bar' },
  users: { enabled: true, label: 'Usuarios', icon: 'fa-user-gear' },
  reports: { enabled: true, label: 'Informes', icon: 'fa-file-lines' },
  whiteboard: { enabled: false, label: 'Whiteboard', icon: 'fa-chalkboard' },
};

// ============================================================================
// ETIQUETAS EMPRESA
// ============================================================================

const companyLabels: ContentLabels = {
  sidebar: {
    home: 'Dashboard',
    externalData: 'Recursos Humanos',
    sportsArea: 'Operaciones',
    administration: 'Administración',
    collaboration: 'Colaboración',
  },
  modules: {
    members: 'Empleados',
    staff: 'Directivos',
    groups: 'Departamentos',
    calendar: 'Agenda',
    matches: 'Reuniones',
    sessions: 'Formaciones',
  },
  actions: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Añadir',
    export: 'Exportar',
    import: 'Importar',
    search: 'Buscar empleado',
    filter: 'Filtrar',
  },
  marketing: {
    tagline: 'Gestión inteligente de equipos',
    description: 'Plataforma integral para la gestión de recursos humanos y operaciones empresariales.',
    ctaLabel: 'Acceder',
    secondaryCtaLabel: 'Ver agenda',
  },
};

// ============================================================================
// ROLES DE EMPLEADOS
// ============================================================================

const companyMemberRoles: MemberRole[] = [
  { id: 'ceo', label: 'CEO', icon: 'fa-crown', category: 'executive' },
  { id: 'director', label: 'Director', icon: 'fa-user-tie', category: 'management' },
  { id: 'manager', label: 'Manager', icon: 'fa-briefcase', category: 'management' },
  { id: 'lead', label: 'Team Lead', icon: 'fa-user-group', category: 'lead' },
  { id: 'senior', label: 'Senior', icon: 'fa-star', category: 'employee' },
  { id: 'mid', label: 'Mid-Level', icon: 'fa-user', category: 'employee' },
  { id: 'junior', label: 'Junior', icon: 'fa-seedling', category: 'employee' },
  { id: 'intern', label: 'Becario', icon: 'fa-graduation-cap', category: 'intern' },
];

// ============================================================================
// TIPOS DE EVENTO EMPRESA
// ============================================================================

const companyEventTypes: EventTypeConfig[] = [
  {
    id: 'meeting',
    label: 'Reunión',
    icon: 'fa-users',
    color: 'text-[var(--accent)]',
    bgColor: 'bg-red-50',
    hasAttendance: true,
    hasScore: false,
    requiredFields: [],
  },
  {
    id: 'presentation',
    label: 'Presentación',
    icon: 'fa-presentation-screen',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    hasAttendance: true,
    hasScore: false,
  },
  {
    id: 'training',
    label: 'Formación',
    icon: 'fa-graduation-cap',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    hasAttendance: true,
    hasScore: false,
  },
  {
    id: 'deadline',
    label: 'Deadline',
    icon: 'fa-clock',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    hasAttendance: false,
    hasScore: false,
  },
  {
    id: 'review',
    label: 'Review',
    icon: 'fa-comments',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    hasAttendance: true,
    hasScore: false,
  },
  {
    id: 'holiday',
    label: 'Festivo',
    icon: 'fa-umbrella-beach',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    hasAttendance: false,
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
// CONFIGURACIÓN COMPLETA EMPRESA
// ============================================================================

export const createCompanyConfig = (
  organizationOverrides?: Partial<AppConfig['organization']>
): AppConfig => ({
  organization: {
    id: 'company',
    name: 'Mi Empresa',
    shortName: 'EMP',
    type: 'company',
    ...organizationOverrides,
  },
  theme: companyTheme,
  modules: companyModules,
  labels: companyLabels,
  memberRoles: companyMemberRoles,
  memberSubRoles: [],
  eventTypes: companyEventTypes,
  formations: [],
});

export default createCompanyConfig;
