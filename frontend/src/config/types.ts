/**
 * @fileoverview Tipos para el sistema de configuración genérico
 * @description Define las interfaces para organizaciones, miembros, eventos y theming
 */

// ============================================================================
// ORGANIZACIÓN
// ============================================================================

export type OrganizationType = 
  | 'sports-club' 
  | 'company' 
  | 'school' 
  | 'association' 
  | 'generic';

export type SportType = 
  | 'football' 
  | 'basketball' 
  | 'handball' 
  | 'volleyball'
  | 'hockey'
  | 'rugby'
  | 'other';

export interface OrganizationConfig {
  /** Identificador único de la organización */
  id: string;
  /** Nombre completo */
  name: string;
  /** Nombre corto para UI compacta */
  shortName: string;
  /** Tipo de organización */
  type: OrganizationType;
  /** Tipo de deporte (solo si type es 'sports-club') */
  sportType?: SportType;
  /** Temporada actual */
  season?: string;
  /** URL del logo */
  logo?: string;
  /** Año de fundación */
  founded?: string;
  /** Ubicación */
  location?: string;
  /** Descripción breve */
  description?: string;
  /** Sitio web */
  website?: string;
}

// ============================================================================
// MIEMBROS (Jugadores, Staff, Empleados, etc.)
// ============================================================================

export type MemberType = 
  | 'player' 
  | 'staff' 
  | 'employee' 
  | 'student' 
  | 'volunteer'
  | 'coach'
  | 'director';

export interface MemberRole {
  /** ID único del rol */
  id: string;
  /** Etiqueta visible */
  label: string;
  /** Icono FontAwesome */
  icon: string;
  /** Categoría del rol para agrupación */
  category?: string;
  /** Color asociado */
  color?: string;
}

export interface MemberSubRole {
  /** ID único */
  id: string;
  /** Etiqueta visible */
  label: string;
  /** ID del rol padre */
  parentRoleId: string;
  /** Perfil (D=Derecha, I=Izquierda, etc.) */
  profile?: 'D' | 'I' | 'C' | 'N/A';
}

export interface Member {
  /** ID único */
  id: number;
  /** Tipo de miembro */
  type: MemberType;
  /** URL de foto */
  photoUrl?: string;
  /** Nombre completo */
  name: string;
  /** Apodo o nombre corto */
  nickname?: string;
  /** ID del rol principal */
  roleId: string;
  /** ID del sub-rol */
  subRoleId?: string;
  /** Número (dorsal, ID empleado, etc.) */
  number?: number;
  /** Fecha de nacimiento */
  birthDate?: string;
  /** Información de contacto */
  contact?: {
    phone?: string;
    email?: string;
  };
  /** Grupo/equipo al que pertenece */
  groupId?: string;
  /** Competición en la que participa */
  competitionId?: string;
  /** Campos personalizados específicos del dominio */
  customFields?: Record<string, unknown>;
  /** Estado activo/inactivo */
  isActive?: boolean;
}

// ============================================================================
// EVENTOS
// ============================================================================

export interface EventTypeConfig {
  /** ID único del tipo de evento */
  id: string;
  /** Etiqueta visible */
  label: string;
  /** Icono FontAwesome */
  icon: string;
  /** Color del texto */
  color: string;
  /** Color de fondo */
  bgColor: string;
  /** Descripción */
  description?: string;
  /** Campos requeridos para este tipo */
  requiredFields?: string[];
  /** Si permite asistencia */
  hasAttendance?: boolean;
  /** Si permite puntuación/resultado */
  hasScore?: boolean;
}

export interface CalendarEventGeneric {
  /** ID único */
  id: string;
  /** ID del tipo de evento */
  typeId: string;
  /** Título */
  title: string;
  /** Fecha */
  date: Date;
  /** Hora */
  time: string;
  /** Grupo/equipo relacionado */
  groupId?: string;
  /** Ubicación */
  location?: string;
  /** Notas */
  notes?: string;
  /** URL de video */
  videoUrl?: string;
  /** URL de documento */
  docUrl?: string;
  /** Roles del staff asignados */
  staffRoles?: string;
  /** Campos específicos del tipo de evento */
  typeSpecificFields?: Record<string, unknown>;
}

// ============================================================================
// GRUPOS / EQUIPOS / DEPARTAMENTOS
// ============================================================================

export interface Group {
  /** ID único */
  id: string;
  /** Nombre */
  name: string;
  /** Tipo de grupo */
  type: 'team' | 'department' | 'class' | 'division' | 'other';
  /** Ubicación/sede */
  location?: string;
  /** Logo o imagen */
  logoUrl?: string;
  /** Campos personalizados */
  customFields?: Record<string, unknown>;
}

// ============================================================================
// FORMACIONES / ESTRUCTURAS
// ============================================================================

export interface PositionConfig {
  /** ID único de la posición */
  id: string;
  /** Coordenada X (0-100) */
  x: number;
  /** Coordenada Y (0-100) */
  y: number;
  /** Etiqueta corta */
  label: string;
  /** Nombre completo de la posición */
  fullName?: string;
}

export interface FormationConfig {
  /** ID único (ej: '4-3-3') */
  id: string;
  /** Nombre descriptivo */
  name: string;
  /** Posiciones predefinidas */
  positions: PositionConfig[];
  /** Para qué deporte aplica */
  sportType?: SportType;
}

// ============================================================================
// THEMING
// ============================================================================

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}

export interface ThemeConfig {
  /** Colores del tema */
  colors: ThemeColors;
  /** Fuentes */
  fonts: {
    display: string;
    body: string;
  };
  /** Radio de bordes */
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Modo oscuro habilitado */
  darkMode?: boolean;
}

// ============================================================================
// MÓDULOS
// ============================================================================

export interface ModuleConfig {
  /** Si el módulo está habilitado */
  enabled: boolean;
  /** Etiqueta personalizada para el sidebar */
  label?: string;
  /** Icono personalizado */
  icon?: string;
}

export interface ModulesConfig {
  dashboard: ModuleConfig;
  members: ModuleConfig;
  staff: ModuleConfig;
  groups: ModuleConfig;
  calendar: ModuleConfig;
  tacticalBoard: ModuleConfig;
  exerciseDesigner: ModuleConfig;
  videoLibrary: ModuleConfig;
  standings: ModuleConfig;
  users: ModuleConfig;
  reports: ModuleConfig;
  whiteboard: ModuleConfig;
}

// ============================================================================
// CONTENIDO / LABELS
// ============================================================================

export interface ContentLabels {
  /** Etiquetas del sidebar */
  sidebar: {
    home: string;
    externalData: string;
    sportsArea: string;
    administration: string;
    collaboration: string;
  };
  /** Etiquetas de módulos */
  modules: {
    members: string;
    staff: string;
    groups: string;
    calendar: string;
    matches: string;
    sessions: string;
  };
  /** Etiquetas de acciones */
  actions: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    export: string;
    import: string;
    search: string;
    filter: string;
  };
  /** Marketing/Hero */
  marketing?: {
    tagline?: string;
    description?: string;
    ctaLabel?: string;
    secondaryCtaLabel?: string;
  };
}

// ============================================================================
// CONFIGURACIÓN COMPLETA
// ============================================================================

export interface AppConfig {
  organization: OrganizationConfig;
  theme: ThemeConfig;
  modules: ModulesConfig;
  labels: ContentLabels;
  memberRoles: MemberRole[];
  memberSubRoles: MemberSubRole[];
  eventTypes: EventTypeConfig[];
  formations?: FormationConfig[];
}
