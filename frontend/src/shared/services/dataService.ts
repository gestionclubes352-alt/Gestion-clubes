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
}

export interface Jugador { // tabla `plantillas`
  id: string;
  equipo_id: string;
  foto_url: string;
  dorsal: number;
  nombre: string;
  posicion: 'Portero' | 'Defensa' | 'Medio' | 'Delantero';
  posicion_juego?: string;
  perfil?: 'D' | 'I';
  fecha_nacimiento?: string;
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

export interface PizarraTactica {
  id: string;
  equipo_id: string;
  nombre: string;
  formacion: string;
  posiciones: unknown[];
  partido_id?: string | null;
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
export const pizarrasService = createTableService<PizarraTactica>('pizarras_tacticas');
export const tareasService = createTableService<Tarea>('tareas');

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
  get(): Promise<T[]>;
  upsert(item: T): Promise<T>;
  delete(id: string | number): Promise<void>;
  clearAll(): Promise<void>;
}

function createLegacyStub<T = any>(): LegacyStore<T> {
  return {
    async get() { return []; },
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
  events: createLegacyStub(),
  task_templates: createLegacyStub(),
  exercises: createLegacyStub(),
  match_reports: createLegacyStub(),
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
