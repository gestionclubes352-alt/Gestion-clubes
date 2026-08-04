/**
 * @fileoverview Servicio de IA Enriquecida v2
 * - Historial conversacional con memoria
 * - Datos propios del equipo (base de datos, CSV, MCP)
 * - Búsqueda web via Gemini con Google Search grounding
 * - Detección inteligente de intención
 */

import { GoogleGenAI } from "@google/genai";
import { APP_CONFIG } from "../../config";

// ============================================================================
// TIPOS
// ============================================================================

export type DataSourceOrigin = 'database' | 'api' | 'csv' | 'web' | 'football-api' | 'mixed';

export interface EnrichedResponse {
  content: string;
  sources: DataSourceOrigin[];
  searchResults?: WebSearchResult[];
  confidence: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export interface WebSearchResult {
  title: string;
  snippet: string;
  url?: string;
}

export interface AIContext {
  players?: Array<Record<string, unknown>>;
  staff?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  teams?: Array<Record<string, unknown>>;
  injuries?: Array<Record<string, unknown>>;
  medicalRecords?: Array<Record<string, unknown>>;
  medicalCheckups?: Array<Record<string, unknown>>;
  rehabPrograms?: Array<Record<string, unknown>>;
  fitnessProfiles?: Array<Record<string, unknown>>;
  matchReports?: Array<Record<string, unknown>>;
  campogramas?: Array<Record<string, unknown>>;
  activeDataSource?: 'database' | 'google-sheets' | 'csv';
}

export interface ConversationMessage {
  role: 'user' | 'model';
  text: string;
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
let genAI: GoogleGenAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

// ============================================================================
// HISTORIAL CONVERSACIONAL (en memoria)
// ============================================================================

let conversationHistory: ConversationMessage[] = [];
const MAX_HISTORY = 20;

function addToHistory(role: 'user' | 'model', text: string): void {
  conversationHistory.push({ role, text });
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY);
  }
}

function clearHistory(): void {
  conversationHistory = [];
}

function getHistory(): ConversationMessage[] {
  return [...conversationHistory];
}

// ============================================================================
// DETECCIÓN DE INTENCIÓN MEJORADA
// ============================================================================

type IntentCategory = 'local-players' | 'local-staff' | 'local-events' | 'local-teams' | 'local-tactics' | 'local-medical' | 'local-general' | 'external-football' | 'external-general' | 'mixed';

interface IntentAnalysis {
  category: IntentCategory;
  needsLocalData: boolean;
  needsExternalData: boolean;
  needsWebSearch: boolean;
  searchTerms?: string;
}

function analyzeIntent(query: string, context: AIContext): IntentAnalysis {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Patrones locales
  const localPlayerPatterns = /plantilla|jugadores?|dorsal|portero|defensa|centrocampista|delantero|extremo|medio|lateral|sub-?\d+|juvenil|cadete|alevin|posicion|nuestr[oa]s?\s+jugador/;
  const localStaffPatterns = /staff|cuerpo tecnico|entrenador|mister|preparador|fisio|medico|delegado|coordinador|segundo entrenador/;
  const localEventPatterns = /calendario|agenda|entrenamient|proximo partido|cuando jugamos|jornada|sesion/;
  const localTeamPatterns = /rivales|equipos de la|competicion.*equipo|nuestr[oa] (liga|grupo|division)/;
  const localTacticPatterns = /tactica|formacion|alineacion|esquema|sistema|campograma|once|onze/;
  const localMedicalPatterns = /lesion|lesionado|baja|medic|doctor|reconocimiento|rehabilitaci|rehab|fisioterapia|fisioterapeuta|recuperaci|alta medica|historial medico|ficha medica|alergia|medicaci|grupo sanguineo|peso|altura|grasa corporal|vo2|test fisico|rendimiento fisico|fitness|condicion fisica|disponibilidad|disponibles|no disponible|sobrecarga|rotura|esguince|contusion/;

  // Patrones que indican contexto LOCAL del equipo (clasificación propia, grupo, etc.)
  const localLeagueContextPatterns = /mi (liga|grupo|division|clasificacion)|nuestr[oa] (liga|grupo|clasificacion|division)|como vamos|en que puesto|posicion.*(grupo|liga)|grupo.*(puesto|posicion|clasificacion)|clasificacion.*(mi|nuestr)|como va mi equipo/;

  // Patrones externos
  const externalFootballPatterns = /fichaje|transfer|mercado|valor de mercado|la liga|premier|champions|europa league|bundesliga|serie a|ligue 1|mundial|seleccion|balon de oro|golden boy|the best|clasificacion|estadisticas oficiales|sofascore|whoscored|fbref|transfermarkt/;
  const externalPersonPatterns = /messi|ronaldo|mbappe|haaland|vinicius|bellingham|pedri|gavi|lamine|yamal|real madrid|barcelona|atletico|athletic|betis|sevilla|bayern|psg|manchester|liverpool|chelsea|arsenal|juventus|milan|inter|napoli|dortmund/;
  const newsPatterns = /noticias|novedades|actualidad|ultima hora|rumores|rumore|lesion de|lesionado|baja de|que ha pasado|que paso|ultimo|reciente/;
  const webSearchPatterns = /busca|investiga|averigua|que sabes de|informacion sobre|datos actuales|en internet|en la web|actualizado/;

  // Preguntas genéricas locales
  const localGenericPatterns = /cuantos|lista de|resumen|informe|analisis del equipo|como estamos|estado del equipo|rendimiento|que tengo|que tenemos/;

  const hasLocal = localPlayerPatterns.test(q) || localStaffPatterns.test(q) || localEventPatterns.test(q) || localTeamPatterns.test(q) || localTacticPatterns.test(q) || localMedicalPatterns.test(q) || localGenericPatterns.test(q);
  const hasExternal = externalFootballPatterns.test(q) || externalPersonPatterns.test(q);
  const hasNews = newsPatterns.test(q);
  const hasWebSearch = webSearchPatterns.test(q);

  let category: IntentCategory = 'local-general';
  if (hasExternal && hasLocal) {
    // Si hay indicios de contexto local fuerte ("mi liga", "nuestro grupo"), priorizar local
    if (localLeagueContextPatterns.test(q)) {
      category = 'local-teams';
    } else {
      category = 'mixed';
    }
  } else if (hasExternal || hasNews) {
    // Si pregunta por clasificación pero con contexto local, mantener como local
    if (localLeagueContextPatterns.test(q)) {
      category = 'local-teams';
    } else {
      category = 'external-football';
    }
  } else if (localPlayerPatterns.test(q)) {
    category = 'local-players';
  } else if (localStaffPatterns.test(q)) {
    category = 'local-staff';
  } else if (localEventPatterns.test(q)) {
    category = 'local-events';
  } else if (localTeamPatterns.test(q)) {
    category = 'local-teams';
  } else if (localMedicalPatterns.test(q)) {
    category = 'local-medical';
  } else if (localTacticPatterns.test(q)) {
    category = 'local-tactics';
  } else if (hasWebSearch) {
    category = 'external-general';
  }

  const needsLocalData = category.startsWith('local') || category === 'mixed';
  const needsExternalData = category.startsWith('external') || category === 'mixed';
  const needsWebSearchFinal = hasNews || hasWebSearch || needsExternalData;

  return {
    category,
    needsLocalData,
    needsExternalData,
    needsWebSearch: needsWebSearchFinal,
    searchTerms: needsWebSearchFinal ? query.replace(/[¿?¡!]/g, '').trim() + ' fútbol 2025 2026' : undefined,
  };
}

// ============================================================================
// FORMATEO DE DATOS LOCALES (compacto)
// ============================================================================

function formatLocalDataCompact(context: AIContext): string {
  const parts: string[] = [];

  if (context.players?.length) {
    parts.push(`\n## PLANTILLA (${context.players.length} jugadores)`);
    const table = context.players.map(p => {
      const rawDorsal = p["dorsal"];
      const dorsal = (rawDorsal != null && rawDorsal !== "" && rawDorsal !== 0) ? String(rawDorsal) : "S/N";
      const nombre = p["nombre"] ?? "?";
      const pos = p["posicion"] ?? "-";
      const posJuego = p["posicionJuego"] ?? "";
      const perfil = p["perfil"] === 'D' ? 'Diestro' : p["perfil"] === 'I' ? 'Zurdo' : (p["perfil"] || "-");
      const edad = p["fechaNacimiento"] ? (() => {
        const birth = new Date(p["fechaNacimiento"] as string);
        return isNaN(birth.getTime()) ? "-" : String(Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
      })() : "-";
      const equipo = p["equipo"] ?? "";
      return `[${dorsal}] ${nombre} | ${pos} ${posJuego ? `(${posJuego})` : ""} | ${perfil} | ${edad}a${equipo ? ` | ${equipo}` : ""}`;
    });
    parts.push(table.join("\n"));
  }

  if (context.staff?.length) {
    parts.push(`\n## PERSONAL (${context.staff.length})`);
    context.staff.forEach(s => {
      parts.push(`- ${s["nombre"]} → ${s["rol"] ?? "Sin rol"}${s["email"] ? ` (${s["email"]})` : ""}`);
    });
  }

  if (context.events?.length) {
    const now = new Date();
    const upcoming = context.events
      .filter(e => {
        const d = new Date(e["date"] as string);
        return !isNaN(d.getTime()) && d >= now;
      })
      .sort((a, b) => new Date(a["date"] as string).getTime() - new Date(b["date"] as string).getTime())
      .slice(0, 15);

    const past = context.events
      .filter(e => {
        const d = new Date(e["date"] as string);
        return !isNaN(d.getTime()) && d < now;
      })
      .sort((a, b) => new Date(b["date"] as string).getTime() - new Date(a["date"] as string).getTime())
      .slice(0, 10);

    if (upcoming.length) {
      parts.push(`\n## PRÓXIMOS EVENTOS (${upcoming.length} de ${context.events.length} total)`);
      upcoming.forEach(e => {
        const d = new Date(e["date"] as string);
        const dateStr = d.toLocaleDateString("es-ES", { weekday: 'short', day: '2-digit', month: 'short' });
        const time = e["time"] ?? "";
        const type = e["type"] ?? "Evento";
        const title = e["title"] ?? "";
        const opponent = e["opponent"] ? ` vs ${e["opponent"]}` : "";
        parts.push(`- ${dateStr} ${time}: [${type}] ${title}${opponent}`);
      });
    }

    if (past.length) {
      parts.push(`\n## ÚLTIMOS RESULTADOS (${past.length})`);
      past.forEach(e => {
        const d = new Date(e["date"] as string);
        const dateStr = d.toLocaleDateString("es-ES", { day: '2-digit', month: 'short' });
        const score = e["score"] ?? "";
        const opponent = e["opponent"] ?? e["visitorTeam"] ?? e["localTeam"] ?? "";
        if (e["type"] === "Partido" && opponent) {
          parts.push(`- ${dateStr}: vs ${opponent} ${score}`);
        }
      });
    }
  }

  if (context.teams?.length) {
    parts.push(`\n## EQUIPOS EN COMPETICIÓN (${context.teams.length})`);
    context.teams.forEach(t => {
      const loc = t["localidad"] ? ` (${t["localidad"]})` : "";
      parts.push(`- ${t["nombre"]}${loc}`);
    });
  }

  // ── DATOS MÉDICOS ──
  if (context.injuries?.length) {
    parts.push(`\n## 🏥 LESIONES (${context.injuries.length})`);
    context.injuries.forEach(inj => {
      const status = inj["status"] === 'ACTIVA' ? '🔴 Activa' : inj["status"] === 'EN_REHABILITACIÓN' ? '🔵 Rehabilitación' : '🟢 Recuperado';
      const severity = inj["severity"] ?? '-';
      const bodyPart = inj["bodyPart"] ?? '-';
      const side = inj["side"] ? ` (${inj["side"]})` : '';
      const estReturn = inj["estimatedReturn"] ? ` → Vuelta est.: ${new Date(inj["estimatedReturn"] as string).toLocaleDateString("es-ES", { day: '2-digit', month: 'short' })}` : '';
      parts.push(`- ${inj["playerName"]} | ${inj["type"]} en ${bodyPart}${side} | ${severity} | ${status}${estReturn}`);
      if (inj["notes"]) parts.push(`  Notas: ${inj["notes"]}`);
    });
  }

  if (context.medicalRecords?.length) {
    parts.push(`\n## 📋 HISTORIAL MÉDICO (${context.medicalRecords.length} fichas)`);
    context.medicalRecords.forEach(r => {
      const blood = r["bloodType"] ? `Grupo: ${r["bloodType"]}` : '';
      const allergies = (r["allergies"] as string[])?.length ? `Alergias: ${(r["allergies"] as string[]).join(', ')}` : '';
      const meds = (r["medications"] as string[])?.length ? `Medicación: ${(r["medications"] as string[]).join(', ')}` : '';
      const notes = r["notes"] ? `Notas: ${r["notes"]}` : '';
      const details = [blood, allergies, meds, notes].filter(Boolean).join(' | ');
      parts.push(`- ${r["playerName"]}: ${details || 'Sin datos relevantes'}`);
    });
  }

  if (context.medicalCheckups?.length) {
    parts.push(`\n## 🩺 RECONOCIMIENTOS MÉDICOS (${context.medicalCheckups.length})`);
    context.medicalCheckups.forEach(c => {
      const statusIcon = c["status"] === 'COMPLETADO' ? '✅' : c["status"] === 'VENCIDO' ? '⚠️' : '⏳';
      const date = new Date(c["scheduledDate"] as string).toLocaleDateString("es-ES", { day: '2-digit', month: 'short' });
      parts.push(`- ${statusIcon} ${c["playerName"]} | ${c["type"]} | ${date} | ${c["status"]}${c["doctor"] ? ` | ${c["doctor"]}` : ''}${c["result"] ? ` → ${c["result"]}` : ''}`);
    });
  }

  if (context.rehabPrograms?.length) {
    parts.push(`\n## 💪 REHABILITACIÓN (${context.rehabPrograms.length} programas activos)`);
    context.rehabPrograms.forEach(rh => {
      const phase = String(rh["phase"] ?? 'FASE_1').replace('_', ' ');
      const progress = rh["progressPercent"] ?? 0;
      parts.push(`- ${rh["playerName"]} | ${phase} | Progreso: ${progress}%`);
      if ((rh["exercises"] as string[])?.length) {
        parts.push(`  Ejercicios: ${(rh["exercises"] as string[]).join(', ')}`);
      }
      if (rh["physiotherapistNotes"]) parts.push(`  Fisio: ${rh["physiotherapistNotes"]}`);
    });
  }

  if (context.fitnessProfiles?.length) {
    parts.push(`\n## 🏋️ RENDIMIENTO FÍSICO (${context.fitnessProfiles.length} perfiles)`);
    context.fitnessProfiles.forEach(fp => {
      const weight = fp["weight"] ? `${fp["weight"]}kg` : '';
      const height = fp["height"] ? `${fp["height"]}cm` : '';
      const fat = fp["bodyFat"] ? `Grasa: ${fp["bodyFat"]}%` : '';
      const vo2 = fp["vo2max"] ? `VO2max: ${fp["vo2max"]}` : '';
      const details = [weight, height, fat, vo2].filter(Boolean).join(' | ');
      parts.push(`- ${fp["playerName"]}: ${details}`);
      const tests = fp["tests"] as Array<Record<string, unknown>> | undefined;
      if (tests?.length) {
        tests.forEach(t => {
          parts.push(`  → ${t["type"]}: ${t["value"]}${t["unit"]}${t["notes"] ? ` (${t["notes"]})` : ''}`);
        });
      }
    });
  }

  // ── DATOS TÁCTICOS / INFORMES ──
  if (context.matchReports?.length) {
    parts.push(`\n## 📊 INFORMES DE PARTIDO (${context.matchReports.length})`);
    context.matchReports.forEach(mr => {
      const formation = mr["formation"] ? `Formación: ${mr["formation"]}` : '';
      const notes = mr["generalNotes"] ? `Notas: ${String(mr["generalNotes"]).substring(0, 150)}` : '';
      const rivalConBalon = mr["rivalConBalonText"] ? `Rival con balón: ${String(mr["rivalConBalonText"]).substring(0, 100)}` : '';
      const rivalSinBalon = mr["rivalSinBalonText"] ? `Rival sin balón: ${String(mr["rivalSinBalonText"]).substring(0, 100)}` : '';
      const planConBalon = mr["planConBalonText"] ? `Plan con balón: ${String(mr["planConBalonText"]).substring(0, 100)}` : '';
      const planSinBalon = mr["planSinBalonText"] ? `Plan sin balón: ${String(mr["planSinBalonText"]).substring(0, 100)}` : '';
      parts.push(`- Partido ${mr["id"]}: ${[formation, notes, rivalConBalon, rivalSinBalon, planConBalon, planSinBalon].filter(Boolean).join(' | ')}`);
    });
  }

  if (context.campogramas?.length) {
    parts.push(`\n## ⚽ CAMPOGRAMAS (${context.campogramas.length})`);
    context.campogramas.forEach(c => {
      parts.push(`- ${c["nombre"]} | Formación: ${c["formacion"] ?? '-'} | Jugadores: ${c["jugadoresCount"] ?? '-'}`);
    });
  }

  return parts.length > 0 ? parts.join("\n") : "\n⚠️ No hay datos cargados en el sistema.";
}

// ============================================================================
// OBTENCIÓN DE DATOS EXTERNOS (Cloud Functions)
// ============================================================================

// ============================================================================
// PROMPT DEL SISTEMA
// ============================================================================

function buildSystemPrompt(context: AIContext, intent: IntentAnalysis): string {
  const org = APP_CONFIG?.organization?.name ?? "Sport Management";
  const sourceLabel = context.activeDataSource === 'google-sheets' ? 'Google Sheets'
    : context.activeDataSource === 'csv' ? 'Archivos CSV importados'
      : 'Base de Datos';

  const hasPlayers = (context.players?.length ?? 0) > 0;
  const hasStaff = (context.staff?.length ?? 0) > 0;
  const hasEvents = (context.events?.length ?? 0) > 0;
  const hasTeams = (context.teams?.length ?? 0) > 0;
  const hasInjuries = (context.injuries?.length ?? 0) > 0;
  const hasMedicalRecords = (context.medicalRecords?.length ?? 0) > 0;
  const hasCheckups = (context.medicalCheckups?.length ?? 0) > 0;
  const hasRehab = (context.rehabPrograms?.length ?? 0) > 0;
  const hasFitness = (context.fitnessProfiles?.length ?? 0) > 0;
  const hasMatchReports = (context.matchReports?.length ?? 0) > 0;
  const hasCampogramas = (context.campogramas?.length ?? 0) > 0;
  const hasMedical = hasInjuries || hasMedicalRecords || hasCheckups || hasRehab || hasFitness;

  return `Eres un asistente de inteligencia deportiva de élite para **${org}**.
Funcionas como un analista deportivo experto con acceso a todos los datos del club. Piensa como un Director Deportivo con IA: analítico, estratégico y proactivo.

## TU IDENTIDAD
- Nombre: Asistente ${org}
- Nivel: Analista deportivo senior con experiencia en LaLiga, categorías inferiores y fútbol base
- Especialidades: Análisis de plantilla, scouting, táctica, gestión deportiva, medicina deportiva, rendimiento físico
- Idioma: SIEMPRE español, natural y profesional

## PERSONALIDAD
- Eres proactivo: no solo respondas, **analiza, detecta patrones y ofrece insights que el usuario no ha pedido pero necesita saber**
- Cuando el usuario pregunte algo simple, da la respuesta Y añade un insight adicional útil
- Usa un tono profesional pero cercano, como un colega experto del club
- Si detectas un dato preocupante (lesiones acumuladas, falta de recambio en una posición, etc.) **avisa proactivamente**

## FUENTE DE DATOS ACTIVA
📂 ${sourceLabel}
${hasPlayers ? `✅ ${context.players!.length} jugadores cargados` : '❌ Sin jugadores'}
${hasStaff ? `✅ ${context.staff!.length} miembros de staff` : '❌ Sin staff'}
${hasEvents ? `✅ ${context.events!.length} eventos en calendario` : '❌ Sin eventos'}
${hasTeams ? `✅ ${context.teams!.length} equipos en competición` : '❌ Sin equipos'}
${hasInjuries ? `✅ ${context.injuries!.length} lesiones registradas` : '❌ Sin lesiones'}
${hasMedicalRecords ? `✅ ${context.medicalRecords!.length} fichas médicas` : ''}
${hasCheckups ? `✅ ${context.medicalCheckups!.length} reconocimientos médicos` : ''}
${hasRehab ? `✅ ${context.rehabPrograms!.length} programas de rehabilitación` : ''}
${hasFitness ? `✅ ${context.fitnessProfiles!.length} perfiles de rendimiento físico` : ''}
${hasMatchReports ? `✅ ${context.matchReports!.length} informes de partido` : ''}
${hasCampogramas ? `✅ ${context.campogramas!.length} campogramas tácticos` : ''}

## INSTRUCCIONES DE RESPUESTA
1. **Markdown rico**: usa negritas, tablas, listas, encabezados. Haz las respuestas visualmente atractivas y fáciles de leer
2. **Datos específicos siempre**: nombres propios, dorsales, fechas exactas, porcentajes calculados
3. **Análisis profundo**: no listes datos, **analiza**: tendencias, riesgos, oportunidades, comparativas
4. **Recomendaciones accionables**: cuando analices algo, sugiere acciones concretas
5. **Cruza datos**: combina información de distintas fuentes para dar respuestas más ricas (ej: lesiones + plantilla = disponibilidad real)
6. Si NO tienes datos para responder, dilo claramente, explica qué datos necesitarías y ofrece alternativas
7. Usa emojis con moderación para mejorar legibilidad (⚽📊👤📅🏆🏥💪🔴🟢🟡)
8. Fecha actual: ${new Date().toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
9. **NUNCA mezcles datos del equipo local con datos externos**. Si el usuario pregunta por "su" equipo, usa SOLO los datos locales
10. **DATOS MÉDICOS**: Cruza datos de lesiones con plantilla para informar disponibilidad. Alerta si detectas riesgo de recaída o acumulación de lesiones en una posición
11. **Para preguntas de búsqueda web**: cita fuentes cuando sea posible, distingue claramente datos verificados de rumores

## CAPACIDADES ANALÍTICAS AVANZADAS
- 📊 **Análisis de plantilla**: distribución por posiciones, pirámide de edades, detección de gaps, balance diestros/zurdos
- 📅 **Gestión de calendario**: densidad de partidos, detección de semanas sobrecargadas, plan de rotaciones
- ⚽ **Análisis táctico**: sugerir formaciones óptimas según jugadores disponibles, detectar combinaciones con contexto lateral
- 🏆 **Competición**: análisis de rivales, fortalezas/debilidades comparativas
- 🏥 **Inteligencia médica**: predicción de riesgo de lesiones, patrones de recaída, disponibilidad real vs teórica
- 💪 **Rendimiento físico**: comparativas de VO2max, evolución de métricas, benchmarking
- 📋 **Informes tácticos**: tendencias de juego, patterns ofensivos/defensivos
- 🌐 **Fútbol mundial**: noticias, fichajes, clasificaciones, análisis del mercado
${intent.needsExternalData ? '\n🌐 BÚSQUEDA EXTERNA ACTIVADA - Combina datos locales con información de internet' : ''}
${intent.needsLocalData && !hasPlayers && !hasStaff && !hasEvents && !hasMedical ? '\n⚠️ No hay datos locales cargados. Invita al usuario a importar datos.' : ''}
`;
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

export class EnrichedAIService {
  /**
   * Procesa una consulta con IA enriquecida, historial y múltiples fuentes.
   * Soporta streaming opcional.
   */
  static async query(
    prompt: string,
    context?: AIContext,
    onChunk?: (partialText: string) => void
  ): Promise<EnrichedResponse> {
    const text = prompt?.trim() ?? "";
    if (!text) {
      return {
        content: "Necesito una pregunta para ayudarte. Puedes preguntar sobre tu plantilla, calendario, staff, o cualquier dato de fútbol.",
        sources: [],
        confidence: 'low',
        timestamp: new Date()
      };
    }

    const ctx: AIContext = {
      players: context?.players ?? [],
      staff: context?.staff ?? [],
      events: context?.events ?? [],
      teams: context?.teams ?? [],
      injuries: context?.injuries ?? [],
      medicalRecords: context?.medicalRecords ?? [],
      medicalCheckups: context?.medicalCheckups ?? [],
      rehabPrograms: context?.rehabPrograms ?? [],
      fitnessProfiles: context?.fitnessProfiles ?? [],
      matchReports: context?.matchReports ?? [],
      campogramas: context?.campogramas ?? [],
      activeDataSource: context?.activeDataSource ?? 'database'
    };

    const intent = analyzeIntent(text, ctx);
    const sources: DataSourceOrigin[] = [];

    if (ctx.players?.length || ctx.staff?.length || ctx.events?.length || ctx.teams?.length || ctx.injuries?.length || ctx.medicalRecords?.length || ctx.fitnessProfiles?.length) {
      const localSource = ctx.activeDataSource === 'google-sheets' ? 'api' : ctx.activeDataSource === 'csv' ? 'csv' : 'database';
      sources.push(localSource as DataSourceOrigin);
    }

    addToHistory('user', text);

    if (!genAI) {
      const fallback = this.fallbackResponse(text, ctx, intent);
      addToHistory('model', fallback);
      return {
        content: fallback,
        sources,
        confidence: 'medium',
        timestamp: new Date()
      };
    }

    try {
      // 1. Sistema + datos locales
      const systemPrompt = buildSystemPrompt(ctx, intent);
      const localData = formatLocalDataCompact(ctx);

      // 2. Construir contexto completo
      let fullContext = systemPrompt;
      if (intent.needsLocalData || !intent.needsExternalData) {
        fullContext += "\n\n## DATOS DEL EQUIPO (FUENTE LOCAL - DATOS PROPIOS DEL CLUB)\n" + localData;
        fullContext += "\n\n⚠️ IMPORTANTE: Los datos anteriores son EXCLUSIVAMENTE del equipo del usuario.";
      }

      // 4. Historial conversacional
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      contents.push({
        role: "user",
        parts: [{ text: fullContext + "\n\n---\nResponde a la conversación del usuario:" }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Entendido. Soy el asistente de Sport Management, tengo los datos del equipo y estoy listo para ayudar." }]
      });

      // Historial previo
      const history = getHistory();
      const prevHistory = history.slice(0, -1);
      for (const msg of prevHistory.slice(-10)) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }

      // Mensaje actual
      contents.push({
        role: "user",
        parts: [{ text }]
      });

      // 5. Config
      const config: Record<string, unknown> = {
        maxOutputTokens: 4096,
        temperature: 0.7,
      };

      // 6. Búsqueda web con Gemini (Google Search grounding)
      let webSearchContext = "";
      if (intent.needsWebSearch) {
        try {
          const searchResponse = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
              role: "user",
              parts: [{ text: `Busca información actualizada y reciente sobre: ${intent.searchTerms || text}. Responde con un resumen factual y conciso.` }]
            }],
            config: {
              maxOutputTokens: 1024,
              temperature: 0.3,
              tools: [{ googleSearch: {} }],
            }
          });

          const searchText = searchResponse.text?.trim();
          if (searchText) {
            webSearchContext = searchText;
            sources.push('web');
          }
        } catch (e) {
          console.warn("[AI] Web search failed:", e);
        }
      }

      if (webSearchContext) {
        contents.splice(-1, 0, {
          role: "user",
          parts: [{ text: `[Información de búsqueda web reciente]:\n${webSearchContext}\n\nIncorpora esta información si es relevante.` }]
        });
        contents.splice(-1, 0, {
          role: "model",
          parts: [{ text: "Perfecto, incorporo los datos de la búsqueda web." }]
        });
      }

      // 7. Llamada principal con streaming
      if (onChunk) {
        const stream = await genAI.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents,
          config
        });

        let fullText = '';
        for await (const chunk of stream) {
          const piece = chunk.text ?? '';
          fullText += piece;
          onChunk(fullText);
        }

        const responseText = fullText.trim();
        if (responseText) {
          addToHistory('model', responseText);
          return {
            content: responseText,
            sources: [...new Set(sources)],
            confidence: sources.length > 1 ? 'high' : sources.length === 1 ? 'medium' : 'low',
            timestamp: new Date()
          };
        }
      } else {
        const response = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config
        });

        const responseText = response.text?.trim();

        if (responseText) {
          addToHistory('model', responseText);
          return {
            content: responseText,
            sources: [...new Set(sources)],
            confidence: sources.length > 1 ? 'high' : sources.length === 1 ? 'medium' : 'low',
            timestamp: new Date()
          };
        }
      }
    } catch (error) {
      console.error("[EnrichedAIService] Error:", error);
    }

    const fallback = this.fallbackResponse(text, ctx, intent);
    addToHistory('model', fallback);
    return {
      content: fallback,
      sources,
      confidence: 'low',
      timestamp: new Date()
    };
  }

  /**
   * Respuesta fallback sin API
   */
  private static fallbackResponse(text: string, ctx: AIContext, intent: IntentAnalysis): string {
    const q = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (q.match(/jugador|plantilla/)) {
      if (!ctx.players?.length) return "⚠️ No hay jugadores cargados. Importa datos desde CSV, Base de Datos o API.";
      const list = ctx.players.map(p => {
        const d = (p["dorsal"] != null && p["dorsal"] !== "" && p["dorsal"] !== 0) ? String(p["dorsal"]) : "S/N";
        return `[${d}] ${p["nombre"]} (${p["posicion"] ?? "Sin posición"})`;
      });
      return `📋 **Plantilla** (${ctx.players.length} jugadores):\n${list.join("\n")}`;
    }

    if (q.match(/lesion|lesionado|baja|medic/)) {
      if (!ctx.injuries?.length) return "⚠️ No hay datos de lesiones cargados.";
      const active = ctx.injuries.filter(i => i["status"] === 'ACTIVA' || i["status"] === 'EN_REHABILITACIÓN');
      if (!active.length) return "✅ No hay lesiones activas en el equipo.";
      const list = active.map(i => `- ${i["playerName"]}: ${i["type"]} en ${i["bodyPart"]} (${i["status"] === 'ACTIVA' ? '🔴 Activa' : '🔵 Rehabilitación'})`);
      return `🏥 **Lesiones activas** (${active.length}):\n${list.join("\n")}`;
    }

    if (q.match(/rehabilitaci|rehab|recuperaci/)) {
      if (!ctx.rehabPrograms?.length) return "⚠️ No hay programas de rehabilitación activos.";
      const list = ctx.rehabPrograms.map(r => `- ${r["playerName"]}: ${r["phase"]} (${r["progressPercent"]}%)`);
      return `💪 **Rehabilitación** (${ctx.rehabPrograms.length}):\n${list.join("\n")}`;
    }

    if (q.match(/reconocimiento|test fisico|rendimiento fisico|fitness/)) {
      if (!ctx.fitnessProfiles?.length) return "⚠️ No hay datos de rendimiento físico.";
      const list = ctx.fitnessProfiles.map(f => `- ${f["playerName"]}: ${f["weight"]}kg, ${f["height"]}cm, VO2max: ${f["vo2max"]}`);
      return `🏋️ **Rendimiento Físico** (${ctx.fitnessProfiles.length}):\n${list.join("\n")}`;
    }

    if (q.match(/staff|tecnico|entrenador/)) {
      if (!ctx.staff?.length) return "⚠️ No hay staff registrado.";
      const list = ctx.staff.map(s => `- ${s["nombre"]} → ${s["rol"] ?? "Sin rol"}`);
      return `👔 **Personal** (${ctx.staff.length}):\n${list.join("\n")}`;
    }

    if (q.match(/partido|calendario|cuando/)) {
      const matches = ctx.events?.filter(e => e["type"] === "Partido") ?? [];
      if (!matches.length) return "⚠️ No hay partidos programados.";
      const now = new Date();
      const upcoming = matches
        .filter(m => new Date(m["date"] as string) >= now)
        .sort((a, b) => new Date(a["date"] as string).getTime() - new Date(b["date"] as string).getTime())
        .slice(0, 5);
      if (!upcoming.length) return "No hay partidos próximos programados.";
      const list = upcoming.map(m => {
        const date = new Date(m["date"] as string).toLocaleDateString("es-ES");
        return `📅 ${date}: vs ${m["opponent"] ?? m["visitorTeam"] ?? "Rival"}`;
      });
      return `⚽ **Próximos partidos:**\n${list.join("\n")}`;
    }

    if (intent.needsWebSearch || intent.needsExternalData) {
      return `🌐 Esta pregunta requiere búsqueda en internet.\n\n⚠️ Configura **VITE_GEMINI_API_KEY** en .env.local para habilitar IA.`;
    }

    const parts: string[] = [
      `🤖 **Asistente Sport Management**`,
      "",
      "📊 **Datos disponibles:**",
      ctx.players?.length ? `✅ ${ctx.players.length} jugadores` : "❌ Sin jugadores",
      ctx.staff?.length ? `✅ ${ctx.staff.length} staff` : "❌ Sin staff",
      ctx.events?.length ? `✅ ${ctx.events.length} eventos` : "❌ Sin eventos",
      ctx.teams?.length ? `✅ ${ctx.teams.length} equipos` : "",
      ctx.injuries?.length ? `✅ ${ctx.injuries.length} lesiones registradas` : "",
      ctx.medicalRecords?.length ? `✅ ${ctx.medicalRecords.length} fichas médicas` : "",
      ctx.fitnessProfiles?.length ? `✅ ${ctx.fitnessProfiles.length} perfiles físicos` : "",
      ctx.rehabPrograms?.length ? `✅ ${ctx.rehabPrograms.length} programas rehabilitación` : "",
      ctx.matchReports?.length ? `✅ ${ctx.matchReports.length} informes de partido` : "",
      "",
      "💡 **Pregúntame sobre:**",
      "- Plantilla, jugadores, posiciones, edades",
      "- Calendario, partidos, entrenamientos",
      "- Personal y staff",
      "- 🏥 Lesiones, bajas, disponibilidad de jugadores",
      "- 💪 Rehabilitación y estado físico",
      "- 📋 Historial médico, reconocimientos",
      "- 🏋️ Tests físicos, VO2max, rendimiento",
      "- Noticias y datos actualizados de fútbol",
      "- Fichajes, clasificaciones, análisis táctico",
    ].filter(Boolean);

    return parts.join("\n");
  }

  static clearConversation(): void {
    clearHistory();
  }

  static isAvailable(): boolean {
    return genAI !== null;
  }

  static getCapabilities(): { ai: boolean; webSearch: boolean; localData: boolean; footballApi: boolean } {
    return {
      ai: genAI !== null,
      webSearch: genAI !== null,
      localData: true,
      footballApi: false,
    };
  }
}

export default EnrichedAIService;
