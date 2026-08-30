// Cliente de Supabase
export { supabase, isSupabaseConfigured } from './supabaseClient';

// Servicios de datos por tabla (Supabase)
export {
  clubesService,
  equiposService,
  plantillasService,
  personalService,
  usuariosService,
  competicionesService,
  partidosService,
  sesionesService,
  pizarrasService,
  tareasService,
  equiposRivalesService,
  localidadesService,
  instalacionesCamposService,
  residenciaHabitacionesService,
  residenciaJugadoresService,
  residenciaComidasService,
  residenciaComedorTokensService,
  residenciaComedorAccesosService,
  rpeRespuestasService,
  wellnessRespuestasService,
} from './dataService';
export type {
  Club, Equipo, Jugador, Personal, Usuario,
  Competicion, Partido, Sesion, PizarraTactica, Tarea,
  EquipoRival, Localidad, InstalacionCampo,
  ResidenciaHabitacion, ResidenciaJugador, ResidenciaComida,
  ResidenciaComedorToken, ResidenciaComedorAcceso,
  RpeRespuesta, WellnessRespuesta,
} from './dataService';

// Shim temporal de compatibilidad (Fase 1 de la migración, ver dataService.ts)
export { db, setActiveTeamId, getActiveTeamId, setTeamConfig, getTeamConfig } from './dataService';
export type { LegacyTeamConfig } from './dataService';

// Autenticación: el login real vive en @context/AuthContext (Supabase Auth).
// Este re-export es solo compatibilidad temporal (ver authService.ts).
export { authService, DEV_EMAILS } from './authService';
export type { UserRole, AuthUser } from './authService';

// Conversaciones IA (interino en localStorage — ver aiConversationService.ts)
export { aiConversationService } from './aiConversationService';
export type { ConversationMeta, StoredMessage } from './aiConversationService';

// RapidAPI Football (no depende de Firebase)
export { rapidApiFootballService, PRECONFIGURED_LEAGUES } from './rapidApiFootballService';
export type {
  RapidApiLeague, RapidApiTeam, RapidApiPlayer, RapidApiMatch,
  RapidApiStanding, MappedCompetitionTeam, MappedPlayer, MappedMatch,
} from './rapidApiFootballService';

// Import service (CSV) — no depende de Firebase, se mantiene
export {
  parseCSV,
  importPlayers,
  importStaff,
  importEvents,
  importTeams,
  importData,
  generateTemplateCSV,
  downloadCSV,
  CSV_TEMPLATES
} from './importService';
export type { ImportResult, CSVParseResult, ImportableTable } from './importService';

// Google Sheets service — no depende de Firebase, se mantiene
export { googleSheetsService, extractSpreadsheetId } from './googleSheetsService';
export type { GoogleSheetConfig, SheetPreview, SheetImportResult } from './googleSheetsService';

// Gemini AI service — no depende de Firebase, se mantiene
export { GeminiService } from './geminiService';
export type { ChatMessage } from './geminiService';

// Enriched AI service v2 — revisar si usa Firestore internamente antes de confiar en él
export { EnrichedAIService } from './enrichedAIService';
export type { EnrichedResponse, WebSearchResult, AIContext, DataSourceOrigin, ConversationMessage } from './enrichedAIService';

// Open Data Football service (StatsBomb + OpenFootball) — no depende de Firebase
export {
  openDataFootballService,
  OPEN_DATA_LEAGUES
} from './openDataFootballService';
export type {
  OpenDataLeague,
  SBCompetition,
  SBMatch,
  SBEvent,
  SBLineup,
  SBShot,
  SBPass,
  TeamMatchStats,
  MatchAdvancedStats,
  OFSeason,
  OFMatch
} from './openDataFootballService';
