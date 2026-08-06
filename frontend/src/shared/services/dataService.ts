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
      // Cast a `any`: el cliente de Supabase no está tipado con el schema de la BD,
      // por lo que `insert`/`update` no pueden validar T genérico contra sus overloads.
      const { data, error } = await supabase.from(tableName).insert(item as any).select().single();
      if (error) throw error;
      return data as T;
    },

    async update(id: string | number, item: Partial<T>) {
      const { data, error } = await supabase.from(tableName).update(item as any).eq('id', id).select().single();
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
  equipo_ids?: string[];
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
  numero_partes: number;
  minutos_por_parte: number;
  total_minutos: number;
  created_at?: string;
  updated_at?: string;
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
  local_team_club_id?: string | null;
  visitor_team_club_id?: string | null;
  opponent?: string | null;
  score?: string | null;
  status?: string | null;
  tasks?: unknown[] | null;
  attendance?: Record<string, string> | null;
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

interface StoredAbpItem {
  id: string;
  text?: string;
  image?: string;
  video?: string;
}

/** Reconstruye una lista de ABP a partir de las columnas fijas heredadas (fallback si aún no se ha aplicado el backfill de la migración 022). */
function legacyAbpFallback(entries: Array<{ text?: string; image?: string; video?: string }>): StoredAbpItem[] {
  return entries
    .filter(e => (e.text || '').trim() || (e.image || '').trim() || (e.video || '').trim())
    .map(e => ({ id: crypto.randomUUID(), text: e.text || '', image: e.image || '', video: e.video || '' }));
}

/** Tabla `match_reports`: análisis táctico y eventos de partidos. */
interface StoredMatchReport {
  id: string;
  general_notes: string;
  video_url: string;

  // Informe Rival
  rival_video_url: string;
  rival_doc_url: string;
  rival_con_balon_text: string;
  rival_con_balon_video: string;
  rival_con_balon_doc: string;
  rival_con_balon_images?: string[];
  rival_sin_balon_text: string;
  rival_sin_balon_video: string;
  rival_sin_balon_doc: string;
  rival_sin_balon_images?: string[];
  rival_abp_text: string;
  rival_abp_video: string;
  rival_abp_doc: string;
  rival_abp_images?: string[];
  rival_abp_off_corners?: StoredAbpItem[];
  rival_abp_off_lateral_fouls?: StoredAbpItem[];
  rival_abp_def_corners?: StoredAbpItem[];
  rival_abp_def_lateral_fouls?: StoredAbpItem[];
  rival_abp_def_frontal_fouls?: StoredAbpItem[];

  // Plan de Partido
  plan_video_url: string;
  plan_doc_url: string;
  plan_con_balon_text: string;
  plan_con_balon_video: string;
  plan_con_balon_doc: string;
  plan_con_balon_images?: string[];
  plan_sin_balon_text: string;
  plan_sin_balon_video: string;
  plan_sin_balon_doc: string;
  plan_sin_balon_images?: string[];
  plan_abp_text: string;
  plan_abp_video: string;
  plan_abp_doc: string;
  plan_abp_images?: string[];
  plan_abp_off_corners?: StoredAbpItem[];
  plan_abp_off_lateral_fouls?: StoredAbpItem[];
  plan_abp_def_corners?: StoredAbpItem[];
  plan_abp_def_lateral_fouls?: StoredAbpItem[];
  plan_abp_def_frontal_fouls?: StoredAbpItem[];

  // Pestaña ABP dedicada
  abp_off_corners?: StoredAbpItem[];
  abp_off_lateral_fouls?: StoredAbpItem[];
  abp_def_corners?: StoredAbpItem[];
  abp_def_lateral_fouls?: StoredAbpItem[];
  abp_def_frontal_fouls?: StoredAbpItem[];
  // Columnas heredadas (campos fijos de ABP, antes de la migración a listas
  // extensibles). Se leen solo como fallback si las columnas JSONB de arriba
  // todavía no se han rellenado en esta fila.
  abp_off_corner_text?: string;
  abp_off_corner2_text?: string;
  abp_off_corner3_text?: string;
  abp_off_corner4_text?: string;
  abp_off_lateral_text?: string;
  abp_off_lateral2_text?: string;
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
  substitutions?: unknown[];
  match_goals?: unknown[];
  match_cards?: unknown[];
  tactical_changes?: unknown[];
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

          rivalVideoUrl: row.rival_video_url,
          rivalDocUrl: row.rival_doc_url,
          rivalConBalonText: row.rival_con_balon_text,
          rivalConBalonVideo: row.rival_con_balon_video,
          rivalConBalonDoc: row.rival_con_balon_doc,
          rivalConBalonImages: row.rival_con_balon_images,
          rivalSinBalonText: row.rival_sin_balon_text,
          rivalSinBalonVideo: row.rival_sin_balon_video,
          rivalSinBalonDoc: row.rival_sin_balon_doc,
          rivalSinBalonImages: row.rival_sin_balon_images,
          rivalAbpText: row.rival_abp_text,
          rivalAbpVideo: row.rival_abp_video,
          rivalAbpDoc: row.rival_abp_doc,
          rivalAbpImages: row.rival_abp_images,
          rivalAbpOffCorners: row.rival_abp_off_corners || [],
          rivalAbpOffLateralFouls: row.rival_abp_off_lateral_fouls || [],
          rivalAbpDefCorners: row.rival_abp_def_corners || [],
          rivalAbpDefLateralFouls: row.rival_abp_def_lateral_fouls || [],
          rivalAbpDefFrontalFouls: row.rival_abp_def_frontal_fouls || [],

          planVideoUrl: row.plan_video_url,
          planDocUrl: row.plan_doc_url,
          planConBalonText: row.plan_con_balon_text,
          planConBalonVideo: row.plan_con_balon_video,
          planConBalonDoc: row.plan_con_balon_doc,
          planConBalonImages: row.plan_con_balon_images,
          planSinBalonText: row.plan_sin_balon_text,
          planSinBalonVideo: row.plan_sin_balon_video,
          planSinBalonDoc: row.plan_sin_balon_doc,
          planSinBalonImages: row.plan_sin_balon_images,
          planAbpText: row.plan_abp_text,
          planAbpVideo: row.plan_abp_video,
          planAbpDoc: row.plan_abp_doc,
          planAbpImages: row.plan_abp_images,
          planAbpOffCorners: row.plan_abp_off_corners || [],
          planAbpOffLateralFouls: row.plan_abp_off_lateral_fouls || [],
          planAbpDefCorners: row.plan_abp_def_corners || [],
          planAbpDefLateralFouls: row.plan_abp_def_lateral_fouls || [],
          planAbpDefFrontalFouls: row.plan_abp_def_frontal_fouls || [],

          abpOffCorners: (row.abp_off_corners && row.abp_off_corners.length > 0)
            ? row.abp_off_corners
            : legacyAbpFallback([
                { text: row.abp_off_corner_text, image: row.abp_off_corner_image, video: row.abp_off_corner_video },
                { text: row.abp_off_corner2_text, image: row.abp_off_corner2_image, video: row.abp_off_corner2_video },
                { text: row.abp_off_corner3_text, image: row.abp_off_corner3_image, video: row.abp_off_corner3_video },
                { text: row.abp_off_corner4_text, image: row.abp_off_corner4_image, video: row.abp_off_corner4_video },
              ]),
          abpOffLateralFouls: (row.abp_off_lateral_fouls && row.abp_off_lateral_fouls.length > 0)
            ? row.abp_off_lateral_fouls
            : legacyAbpFallback([
                { text: row.abp_off_lateral_text, image: row.abp_off_lateral_image, video: row.abp_off_lateral_video },
                { text: row.abp_off_lateral2_text, image: row.abp_off_lateral2_image, video: row.abp_off_lateral2_video },
              ]),
          abpDefCorners: (row.abp_def_corners && row.abp_def_corners.length > 0)
            ? row.abp_def_corners
            : legacyAbpFallback([
                { text: row.abp_def_corner1_text, image: row.abp_def_corner1_image, video: row.abp_def_corner1_video },
                { text: row.abp_def_corner2_text, image: row.abp_def_corner2_image, video: row.abp_def_corner2_video },
              ]),
          abpDefLateralFouls: (row.abp_def_lateral_fouls && row.abp_def_lateral_fouls.length > 0)
            ? row.abp_def_lateral_fouls
            : legacyAbpFallback([
                { text: row.abp_def_lateral_text, image: row.abp_def_lateral_image, video: row.abp_def_lateral_video },
              ]),
          abpDefFrontalFouls: (row.abp_def_frontal_fouls && row.abp_def_frontal_fouls.length > 0)
            ? row.abp_def_frontal_fouls
            : legacyAbpFallback([
                { text: row.abp_def_frontal_text, image: row.abp_def_frontal_image, video: row.abp_def_frontal_video },
              ]),
          formation: row.formation,
          lineupPositions: row.lineup_positions,
          substituteIds: row.substitute_ids,
          notConvocadoIds: row.not_convocado_ids,
          notConvocadoReasons: row.not_convocado_reasons,
          videoEvents: row.video_events,
          substitutions: row.substitutions || [],
          matchGoals: row.match_goals || [],
          matchCards: row.match_cards || [],
          tacticalChanges: row.tactical_changes || [],
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

        rival_video_url: item.rivalVideoUrl || '',
        rival_doc_url: item.rivalDocUrl || '',
        rival_con_balon_text: item.rivalConBalonText || '',
        rival_con_balon_video: item.rivalConBalonVideo || '',
        rival_con_balon_doc: item.rivalConBalonDoc || '',
        rival_con_balon_images: item.rivalConBalonImages || [],
        rival_sin_balon_text: item.rivalSinBalonText || '',
        rival_sin_balon_video: item.rivalSinBalonVideo || '',
        rival_sin_balon_doc: item.rivalSinBalonDoc || '',
        rival_sin_balon_images: item.rivalSinBalonImages || [],
        rival_abp_text: item.rivalAbpText || '',
        rival_abp_video: item.rivalAbpVideo || '',
        rival_abp_doc: item.rivalAbpDoc || '',
        rival_abp_images: item.rivalAbpImages || [],
        rival_abp_off_corners: item.rivalAbpOffCorners || [],
        rival_abp_off_lateral_fouls: item.rivalAbpOffLateralFouls || [],
        rival_abp_def_corners: item.rivalAbpDefCorners || [],
        rival_abp_def_lateral_fouls: item.rivalAbpDefLateralFouls || [],
        rival_abp_def_frontal_fouls: item.rivalAbpDefFrontalFouls || [],

        plan_video_url: item.planVideoUrl || '',
        plan_doc_url: item.planDocUrl || '',
        plan_con_balon_text: item.planConBalonText || '',
        plan_con_balon_video: item.planConBalonVideo || '',
        plan_con_balon_doc: item.planConBalonDoc || '',
        plan_con_balon_images: item.planConBalonImages || [],
        plan_sin_balon_text: item.planSinBalonText || '',
        plan_sin_balon_video: item.planSinBalonVideo || '',
        plan_sin_balon_doc: item.planSinBalonDoc || '',
        plan_sin_balon_images: item.planSinBalonImages || [],
        plan_abp_text: item.planAbpText || '',
        plan_abp_video: item.planAbpVideo || '',
        plan_abp_doc: item.planAbpDoc || '',
        plan_abp_images: item.planAbpImages || [],
        plan_abp_off_corners: item.planAbpOffCorners || [],
        plan_abp_off_lateral_fouls: item.planAbpOffLateralFouls || [],
        plan_abp_def_corners: item.planAbpDefCorners || [],
        plan_abp_def_lateral_fouls: item.planAbpDefLateralFouls || [],
        plan_abp_def_frontal_fouls: item.planAbpDefFrontalFouls || [],

        abp_off_corners: item.abpOffCorners || [],
        abp_off_lateral_fouls: item.abpOffLateralFouls || [],
        abp_def_corners: item.abpDefCorners || [],
        abp_def_lateral_fouls: item.abpDefLateralFouls || [],
        abp_def_frontal_fouls: item.abpDefFrontalFouls || [],
        formation: item.formation || '4-3-3',
        lineup_positions: item.lineupPositions || [],
        substitute_ids: item.substituteIds || [],
        not_convocado_ids: item.notConvocadoIds || [],
        not_convocado_reasons: item.notConvocadoReasons || {},
        video_events: item.videoEvents || [],
        substitutions: item.substitutions || [],
        match_goals: item.matchGoals || [],
        match_cards: item.matchCards || [],
        tactical_changes: item.tacticalChanges || [],
        first_half_start: item.firstHalfStart || '',
        first_half_end: item.firstHalfEnd || '',
        second_half_start: item.secondHalfStart || '',
        second_half_end: item.secondHalfEnd || '',
        referee_name: item.refereeName,
        referee_description: item.refereeDescription,
      };
      const { error } = await supabase.from('match_reports').upsert(stored).select();
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
  fitness_profiles: createLegacyStub(),
  medical_checkups: createLegacyStub(),
  medical_records: createLegacyStub(),
  rehab_programs: createLegacyStub(),
};

export function setActiveTeamId(_teamId: string): void { /* pendiente de migrar */ }
export function getActiveTeamId(): string | null { return null; }

export interface LegacyTeamConfig {
  leagueId?: string | number;
  leagueName?: string;
  teamId?: string | number;
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
