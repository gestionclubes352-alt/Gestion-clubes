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
  equipo_id?: string;
  nombre: string;
  cargo: string;
  telefono?: string;
  dni?: string;
  email?: string;
  foto_url?: string;
  created_at?: string;
  updated_at?: string;
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

/**
 * Tabla `task_templates` (repositorio de tareas / plantillas de ejercicios):
 * el objeto completo (TrainingTask) se guarda como JSONB en la columna
 * `payload` — ver 016_task_templates_y_fix_rls_exercises.sql.
 */
function createJsonPayloadStore<T extends { id: string } = any>(tableName: string): LegacyStore<T> {
  return {
    async get() {
      const { data, error } = await supabase.from(tableName).select('payload');
      if (error) throw error;
      return { data: (data ?? []).map((row: { payload: T }) => row.payload) };
    },
    async upsert(item: T) {
      const { error } = await supabase.from(tableName).upsert({ id: item.id, payload: item });
      if (error) throw error;
      return item;
    },
    async delete(id: string | number) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
    async clearAll() {
      const { error } = await supabase.from(tableName).delete().neq('id', '');
      if (error) throw error;
    },
  };
}

interface StoredCampograma {
  id: string;
  nombre: string;
  club: string;
  equipo: string;
  jugadoresCount: number;
  formacion: string;
  positions: unknown[];
}

/** Tabla `campogramas` (001_schema.sql): columnas propias, sin payload JSONB. */
function createCampogramasStore(): LegacyStore<any> {
  return {
    async get() {
      const { data, error } = await supabase
        .from('campogramas')
        .select('id, nombre, club, equipo, jugadores_count, formacion, positions');
      if (error) throw error;
      return {
        data: (data ?? []).map((row: { id: string; nombre: string; club: string; equipo: string; jugadores_count: number; formacion: string; positions: unknown[] }) => ({
          id: row.id,
          nombre: row.nombre,
          club: row.club,
          equipo: row.equipo,
          jugadoresCount: row.jugadores_count,
          formacion: row.formacion,
          positions: row.positions,
        })),
      };
    },
    async upsert(item: StoredCampograma) {
      const { error } = await supabase.from('campogramas').upsert({
        id: item.id,
        nombre: item.nombre,
        club: item.club,
        equipo: item.equipo,
        jugadores_count: item.jugadoresCount,
        formacion: item.formacion,
        positions: item.positions,
      });
      if (error) throw error;
      return item;
    },
    async delete(id: string | number) {
      const { error } = await supabase.from('campogramas').delete().eq('id', id);
      if (error) throw error;
    },
    async clearAll() {
      const { error } = await supabase.from('campogramas').delete().neq('id', '');
      if (error) throw error;
    },
  };
}

interface StoredExercise {
  id: string;
  title: string;
  frames: unknown;
  lastModified: string;
}

/** Tabla `exercises` (001_schema.sql): columnas propias, sin payload JSONB. */
function createExercisesStore(): LegacyStore<any> {
  return {
    async get() {
      const { data, error } = await supabase.from('exercises').select('id, title, frames, last_modified');
      if (error) throw error;
      return {
        data: (data ?? []).map((row: { id: string; title: string; frames: unknown; last_modified: string }) => ({
          id: row.id,
          title: row.title,
          frames: row.frames,
          lastModified: row.last_modified,
        })),
      };
    },
    async upsert(item: StoredExercise) {
      const { error } = await supabase.from('exercises').upsert({
        id: item.id,
        title: item.title,
        frames: item.frames,
        last_modified: item.lastModified,
      });
      if (error) throw error;
      return item;
    },
    async delete(id: string | number) {
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) throw error;
    },
    async clearAll() {
      const { error } = await supabase.from('exercises').delete().neq('id', '');
      if (error) throw error;
    },
  };
}

/** Tabla `match_reports`: análisis táctico y eventos de partidos. */
interface StoredMatchReport {
  id: string;
  general_notes: string;
  video_url: string;
  doc_url: string;
  con_balon_text: string;
  con_balon_video: string;
  con_balon_doc: string;
  sin_balon_text: string;
  sin_balon_video: string;
  sin_balon_doc: string;
  abp_text: string;
  abp_video: string;
  abp_doc: string;
  abp_off_corner_text?: string;
  abp_off_corner2_text?: string;
  abp_off_corner3_text?: string;
  abp_off_corner4_text?: string;
  abp_off_lateral_text?: string;
  abp_off_lateral2_text?: string;
  abp_off_frontal_text?: string;
  abp_def_corner1_text?: string;
  abp_def_corner2_text?: string;
  abp_def_lateral_text?: string;
  abp_def_frontal_text?: string;
  abp_off_corner_image?: string;
  abp_off_corner2_image?: string;
  abp_off_corner3_image?: string;
  abp_off_corner4_image?: string;
  abp_off_lateral_image?: string;
  abp_off_lateral2_image?: string;
  abp_off_frontal_image?: string;
  abp_def_corner1_image?: string;
  abp_def_corner2_image?: string;
  abp_def_lateral_image?: string;
  abp_def_frontal_image?: string;
  abp_off_corner_video?: string;
  abp_off_corner2_video?: string;
  abp_off_corner3_video?: string;
  abp_off_corner4_video?: string;
  abp_off_lateral_video?: string;
  abp_off_lateral2_video?: string;
  abp_off_frontal_video?: string;
  abp_def_corner1_video?: string;
  abp_def_corner2_video?: string;
  abp_def_lateral_video?: string;
  abp_def_frontal_video?: string;
  formation: string;
  lineup_positions: unknown[];
  substitute_ids: Array<string | number>;
  not_convocado_ids: Array<string | number>;
  not_convocado_reasons?: Record<string, string>;
  video_events: unknown[];
  first_half_start: string;
  first_half_end: string;
  second_half_start: string;
  second_half_end: string;
  referee_name?: string;
  referee_description?: string;
  created_at?: string;
  updated_at?: string;
}

function createMatchReportsStore(): LegacyStore<any> {
  return {
    async get() {
      const { data, error } = await supabase.from('match_reports').select('*');
      if (error) throw error;
      return {
        data: (data ?? []).map((row: StoredMatchReport) => ({
          id: row.id,
          generalNotes: row.general_notes,
          videoUrl: row.video_url,
          docUrl: row.doc_url,
          conBalonText: row.con_balon_text,
          conBalonVideo: row.con_balon_video,
          conBalonDoc: row.con_balon_doc,
          sinBalonText: row.sin_balon_text,
          sinBalonVideo: row.sin_balon_video,
          sinBalonDoc: row.sin_balon_doc,
          abpText: row.abp_text,
          abpVideo: row.abp_video,
          abpDoc: row.abp_doc,
          abpOffCornerText: row.abp_off_corner_text,
          abpOffCorner2Text: row.abp_off_corner2_text,
          abpOffCorner3Text: row.abp_off_corner3_text,
          abpOffCorner4Text: row.abp_off_corner4_text,
          abpOffLateralText: row.abp_off_lateral_text,
          abpOffLateral2Text: row.abp_off_lateral2_text,
          abpOffFrontalText: row.abp_off_frontal_text,
          abpDefCorner1Text: row.abp_def_corner1_text,
          abpDefCorner2Text: row.abp_def_corner2_text,
          abpDefLateralText: row.abp_def_lateral_text,
          abpDefFrontalText: row.abp_def_frontal_text,
          abpOffCornerImage: row.abp_off_corner_image,
          abpOffCorner2Image: row.abp_off_corner2_image,
          abpOffCorner3Image: row.abp_off_corner3_image,
          abpOffCorner4Image: row.abp_off_corner4_image,
          abpOffLateralImage: row.abp_off_lateral_image,
          abpOffLateral2Image: row.abp_off_lateral2_image,
          abpOffFrontalImage: row.abp_off_frontal_image,
          abpDefCorner1Image: row.abp_def_corner1_image,
          abpDefCorner2Image: row.abp_def_corner2_image,
          abpDefLateralImage: row.abp_def_lateral_image,
          abpDefFrontalImage: row.abp_def_frontal_image,
          abpOffCornerVideo: row.abp_off_corner_video,
          abpOffCorner2Video: row.abp_off_corner2_video,
          abpOffCorner3Video: row.abp_off_corner3_video,
          abpOffCorner4Video: row.abp_off_corner4_video,
          abpOffLateralVideo: row.abp_off_lateral_video,
          abpOffLateral2Video: row.abp_off_lateral2_video,
          abpOffFrontalVideo: row.abp_off_frontal_video,
          abpDefCorner1Video: row.abp_def_corner1_video,
          abpDefCorner2Video: row.abp_def_corner2_video,
          abpDefLateralVideo: row.abp_def_lateral_video,
          abpDefFrontalVideo: row.abp_def_frontal_video,
          formation: row.formation,
          lineupPositions: row.lineup_positions,
          substituteIds: row.substitute_ids,
          notConvocadoIds: row.not_convocado_ids,
          notConvocadoReasons: row.not_convocado_reasons,
          videoEvents: row.video_events,
          firstHalfStart: row.first_half_start,
          firstHalfEnd: row.first_half_end,
          secondHalfStart: row.second_half_start,
          secondHalfEnd: row.second_half_end,
          refereeName: row.referee_name,
          refereeDescription: row.referee_description,
        })),
      };
    },
    async upsert(item: any) {
      const stored: StoredMatchReport = {
        id: item.id,
        general_notes: item.generalNotes || '',
        video_url: item.videoUrl || '',
        doc_url: item.docUrl || '',
        con_balon_text: item.conBalonText || '',
        con_balon_video: item.conBalonVideo || '',
        con_balon_doc: item.conBalonDoc || '',
        sin_balon_text: item.sinBalonText || '',
        sin_balon_video: item.sinBalonVideo || '',
        sin_balon_doc: item.sinBalonDoc || '',
        abp_text: item.abpText || '',
        abp_video: item.abpVideo || '',
        abp_doc: item.abpDoc || '',
        abp_off_corner_text: item.abpOffCornerText,
        abp_off_corner2_text: item.abpOffCorner2Text,
        abp_off_corner3_text: item.abpOffCorner3Text,
        abp_off_corner4_text: item.abpOffCorner4Text,
        abp_off_lateral_text: item.abpOffLateralText,
        abp_off_lateral2_text: item.abpOffLateral2Text,
        abp_off_frontal_text: item.abpOffFrontalText,
        abp_def_corner1_text: item.abpDefCorner1Text,
        abp_def_corner2_text: item.abpDefCorner2Text,
        abp_def_lateral_text: item.abpDefLateralText,
        abp_def_frontal_text: item.abpDefFrontalText,
        abp_off_corner_image: item.abpOffCornerImage,
        abp_off_corner2_image: item.abpOffCorner2Image,
        abp_off_corner3_image: item.abpOffCorner3Image,
        abp_off_corner4_image: item.abpOffCorner4Image,
        abp_off_lateral_image: item.abpOffLateralImage,
        abp_off_lateral2_image: item.abpOffLateral2Image,
        abp_off_frontal_image: item.abpOffFrontalImage,
        abp_def_corner1_image: item.abpDefCorner1Image,
        abp_def_corner2_image: item.abpDefCorner2Image,
        abp_def_lateral_image: item.abpDefLateralImage,
        abp_def_frontal_image: item.abpDefFrontalImage,
        abp_off_corner_video: item.abpOffCornerVideo,
        abp_off_corner2_video: item.abpOffCorner2Video,
        abp_off_corner3_video: item.abpOffCorner3Video,
        abp_off_corner4_video: item.abpOffCorner4Video,
        abp_off_lateral_video: item.abpOffLateralVideo,
        abp_off_lateral2_video: item.abpOffLateral2Video,
        abp_off_frontal_video: item.abpOffFrontalVideo,
        abp_def_corner1_video: item.abpDefCorner1Video,
        abp_def_corner2_video: item.abpDefCorner2Video,
        abp_def_lateral_video: item.abpDefLateralVideo,
        abp_def_frontal_video: item.abpDefFrontalVideo,
        formation: item.formation || '4-3-3',
        lineup_positions: item.lineupPositions || [],
        substitute_ids: item.substituteIds || [],
        not_convocado_ids: item.notConvocadoIds || [],
        not_convocado_reasons: item.notConvocadoReasons || {},
        video_events: item.videoEvents || [],
        first_half_start: item.firstHalfStart || '',
        first_half_end: item.firstHalfEnd || '',
        second_half_start: item.secondHalfStart || '',
        second_half_end: item.secondHalfEnd || '',
        referee_name: item.refereeName,
        referee_description: item.refereeDescription,
      };
      const { error } = await supabase.from('match_reports').upsert(stored);
      if (error) throw error;
      return item;
    },
    async delete(id: string | number) {
      const { error } = await supabase.from('match_reports').delete().eq('id', id);
      if (error) throw error;
    },
    async clearAll() {
      const { error } = await supabase.from('match_reports').delete().neq('id', '');
      if (error) throw error;
    },
  };
}

export const db = {
  players: createLegacyStub(),
  staff: createLegacyStub(),
  clubes: createLegacyStub(),
  competition_teams: createLegacyStub(),
  users: createLegacyStub(),
  campogramas: createCampogramasStore(),
  task_templates: createJsonPayloadStore('task_templates'),
  exercises: createExercisesStore(),
  match_reports: createMatchReportsStore(),
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
