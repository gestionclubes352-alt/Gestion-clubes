/**
 * @fileoverview Servicio de acceso a datos sobre las tablas de Supabase.
 * Cada helper es un CRUD delgado sobre una tabla concreta.
 * Sustituye al antiguo shared/services/dataService.ts (localStorage + Firestore).
 */

import { supabase } from './supabaseClient';

function createTableService<T extends { id: string | number }>(tableName: string) {
  return {
    async list(filters?: Record<string, unknown>) {
      let query = supabase.from(tableName).select('*');
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value as string | number | boolean);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },

    async getById(id: string | number) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return data as T;
    },

    async create(item: Partial<T>) {
      const { data, error } = await supabase.from(tableName).insert(item).select().single();
      if (error) throw error;
      return data as T;
    },

    async update(id: string | number, item: Partial<T>) {
      const { data, error } = await supabase.from(tableName).update(item).eq('id', id).select().single();
      if (error) throw error;
      return data as T;
    },

    async remove(id: string | number) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },

    async upsert(item: Partial<T> & { id: string | number }) {
      const { data, error } = await supabase.from(tableName).upsert(item).select().single();
      if (error) throw error;
      return data as T;
    },
  };
}

// ── Tipos básicos (amplíalos según necesites en cada módulo) ──────────────
export interface Club {
  id: string;
  nombre: string;
  escudo_url: string;
  ciudad?: string;
  fundacion?: number;
}

export interface Equipo {
  id: string;
  club_id: string;
  nombre: string;
  categoria?: string;
  competicion?: string;
  temporada: string;
  logo_url?: string;
  sub_equipo?: string;
  estadio?: string;
  localidad?: string;
  enlace?: string;
}

export interface Jugador { // tabla `plantillas`
  id: string;
  equipo_id: string;
  foto_url: string;
  dorsal: number;
  nombre: string;
  posicion: 'Portero' | 'Defensa' | 'Medio' | 'Delantero';
  posicion_juego?: string;
  perfil?: 'D' | 'I' | 'A';
  fecha_nacimiento?: string;
  apodo?: string;
  estado?: 'APTO' | 'LESIONADO' | 'OTRO';
  otra_demarcacion?: string;
  otra_posicion?: string;
  descripcion?: string;
  ataque?: string;
  defensa?: string;
  persona?: string;
  observaciones?: string;
  rating_tecnica?: number;
  rating_tactica?: number;
  rating_condicional?: number;
  rating_psicologico?: number;
  rating_humano?: number;
  partidos_jugados?: number;
  minutos?: number;
  titular?: number;
  goles?: number;
  dni?: string;
  telefono?: string;
  correo?: string;
  nombre_pila?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  nombre_completo?: string;
  anio_nacimiento?: number;
  etapa?: string;
  enlace?: string;
  temporada?: string;
  nombre_tutor?: string;
  correo_tutor?: string;
  telefono_tutor?: string;
}

export interface Personal {
  id: string;
  club_id: string;
  equipo_id?: string | null;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  rol: string;
  telefono?: string;
  email?: string;
}

export interface Usuario {
  id: string;
  club_id: string | null;
  nombre: string;
  email: string;
  rol: 'Administrador' | 'Responsable' | 'Tecnico';
  estado: 'Activo' | 'Inactivo' | 'Pendiente';
}

export interface Competicion {
  id: string;
  nombre: string;
  tipo: 'Liga' | 'Copa' | 'Amistoso' | 'Torneo';
  categoria?: string;
  temporada: string;
}

export interface Partido {
  id: string;
  competicion_id: string;
  equipo_local_id?: string | null;
  equipo_visitante_id?: string | null;
  rival_nombre?: string | null;
  jornada?: string;
  fecha: string;
  hora?: string;
  lugar?: string;
  marcador?: string;
  estado: 'Programado' | 'Finalizado' | 'Aplazado' | 'Suspendido';
}

export interface Sesion {
  id: string;
  equipo_id: string;
  titulo: string;
  tipo: 'Entrenamiento' | 'Reunión' | 'Descanso' | 'Actividad' | 'Otro';
  fecha: string;
  hora?: string;
  lugar?: string;
  notas?: string;
}

/** Fila de la tabla `eventos_calendario` (persistencia real del módulo Calendario). */
export interface EventoCalendario {
  id: string;
  club_id?: string | null;
  title: string;
  type: 'Entrenamiento' | 'Sesión' | 'Partido' | 'Otro' | 'Actividad';
  date: string;
  time?: string | null;
  team?: string | null;
  location?: string | null;
  notes?: string | null;
  video_url?: string | null;
  doc_url?: string | null;
  staff_roles?: string | null;
  competition?: string | null;
  jornada?: string | null;
  session_number?: number | null;
  local_team?: string | null;
  visitor_team?: string | null;
  opponent?: string | null;
  score?: string | null;
  status?: string | null;
  tasks?: unknown[] | null;
}

export interface PizarraTactica {
  id: string;
  equipo_id: string;
  nombre: string;
  formacion: string;
  posiciones: unknown[];
  partido_id?: string | null;
}

export interface EquipoRival {
  id: string;
  club_id?: string | null;
  nombre: string;
  escudo_url?: string;
  competicion?: string;
  temporada?: string;
  notas?: string;
}

export interface JugadorRival {
  id: string;
  equipo_rival_id: string;
  dorsal?: number;
  nombre: string;
  posicion?: string;
  foto_url?: string;
  anio_nacimiento?: number;
}

export interface Tarea {
  id: string;
  club_id: string;
  equipo_id?: string | null;
  titulo: string;
  descripcion?: string;
  asignado_a?: string | null;
  estado: 'Pendiente' | 'En progreso' | 'Completada';
  prioridad: 'Baja' | 'Media' | 'Alta';
  fecha_limite?: string;
}

// ── Servicios por tabla ────────────────────────────────────────────────────
export const clubesService = createTableService<Club>('clubes');
export const equiposService = createTableService<Equipo>('equipos');
export const plantillasService = createTableService<Jugador>('plantillas');
export const personalService = createTableService<Personal>('personal');
export const usuariosService = createTableService<Usuario>('usuarios');
export const competicionesService = createTableService<Competicion>('competiciones');
export const partidosService = createTableService<Partido>('partidos');
export const sesionesService = createTableService<Sesion>('sesiones');
export const eventosCalendarioService = createTableService<EventoCalendario>('eventos_calendario');
export const pizarrasService = createTableService<PizarraTactica>('pizarras_tacticas');
export const tareasService = createTableService<Tarea>('tareas');
export const equiposRivalesService = createTableService<EquipoRival>('equipos_rivales');
export const jugadoresRivalesService = createTableService<JugadorRival>('jugadores_rivales');

// Ejemplo de uso en un componente:
//
// const jugadores = await plantillasService.list({ equipo_id: miEquipoId });
// const nuevoPartido = await partidosService.create({
//   competicion_id, equipo_local_id, rival_nombre: 'CD Rival',
//   fecha: '2026-09-01', estado: 'Programado'
// });

// ── Shim temporal de compatibilidad (Fase 1 de la migración) ──────────────
// El `db` local (Firestore/localStorage) y `setActiveTeamId`/`setTeamConfig`
// ya no existen: varios módulos todavía los importan mientras se reconectan
// uno a uno contra los servicios de Supabase de arriba (ver plan de
// migración). Este shim evita que la app crashee al cargar; cada entidad se
// sustituye por su servicio real en la Fase 2, módulo a módulo.
interface LegacyStore<T = any> {
  get(): Promise<{ data: T[] }>;
  upsert(item: T): Promise<T>;
  delete(id: string | number): Promise<void>;
  clearAll(): Promise<void>;
}

function createLegacyStub<T = any>(): LegacyStore<T> {
  return {
    async get() { return { data: [] }; },
    async upsert(item: T) { return item; },
    async delete() { /* pendiente de migrar */ },
    async clearAll() { /* pendiente de migrar */ },
  };
}

export const db = {
  players: createLegacyStub(),
  staff: createLegacyStub(),
  clubes: createLegacyStub(),
  competition_teams: createLegacyStub(),
  users: createLegacyStub(),
  campogramas: createLegacyStub(),
  task_templates: createLegacyStub(),
  exercises: createLegacyStub(),
  match_reports: createLegacyStub(),
  injuries: createLegacyStub(),
};

export function setActiveTeamId(_teamId: string): void { /* pendiente de migrar */ }
export function getActiveTeamId(): string | null { return null; }

export interface LegacyTeamConfig {
  leagueName?: string;
  teamId?: string;
  teamName?: string;
  teamShortName?: string;
  teamLogo?: string;
  setupComplete?: boolean;
  importSource?: string;
  importedAt?: string;
}

const TEAM_CONFIG_KEY = 'sport_management_team_config';

/** Configuración de equipo: se mantiene en localStorage (no compartida entre usuarios del club). */
export function setTeamConfig(config: LegacyTeamConfig, _teamId?: string): void {
  try {
    localStorage.setItem(TEAM_CONFIG_KEY, JSON.stringify(config));
  } catch { /* almacenamiento no disponible */ }
}

export function getTeamConfig(): LegacyTeamConfig | null {
  try {
    const raw = localStorage.getItem(TEAM_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
