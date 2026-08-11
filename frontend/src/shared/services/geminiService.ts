import { GoogleGenAI } from "@google/genai";
import { APP_CONFIG } from "../../config";

type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  role: Role;
  content: string;
  timestamp: Date;
}

type ChatContext = {
  players?: Array<Record<string, unknown>>;
  staff?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  teams?: Array<Record<string, unknown>>;
};

// Inicializar cliente de Gemini
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
let genAI: GoogleGenAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

// ============================================================================
// ANÁLISIS DE JUGADORES
// ============================================================================

const summarizePlayers = (players: Array<Record<string, unknown>>): string => {
  if (!players?.length) return "No tengo jugadores registrados en la base de datos.";
  const list = players.map(p => {
    const dorsal = (p["dorsal"] != null && p["dorsal"] !== "" && p["dorsal"] !== 0) ? `[${p["dorsal"]}]` : "[S/N]";
    const name = String(p["nombre"] ?? "Jugador");
    const pos = p["posicion"] ? ` (${p["posicion"]})` : "";
    return `${dorsal} ${name}${pos}`;
  });
  return `📋 Plantilla completa (${players.length} jugadores):\n${list.join("\n")}`;
};

const getPlayersByPosition = (players: Array<Record<string, unknown>>, position: string): string => {
  const filtered = players.filter(p => 
    normalize(String(p["posicion"] ?? "")).includes(normalize(position)) ||
    normalize(String(p["posicionJuego"] ?? "")).includes(normalize(position))
  );
  if (!filtered.length) return `No tengo jugadores en la posición "${position}".`;
  const list = filtered.map(p => {
    const d = (p["dorsal"] != null && p["dorsal"] !== "" && p["dorsal"] !== 0) ? String(p["dorsal"]) : "S/N";
    return `[${d}] ${p["nombre"]}`;
  });
  return `⚽ ${filtered.length} jugador(es) en posición ${position}:\n${list.join("\n")}`;
};

const getPlayerDetails = (players: Array<Record<string, unknown>>, searchName: string): string => {
  const normalizedSearch = normalize(searchName);
  const player = players.find(p => normalize(String(p["nombre"] ?? "")).includes(normalizedSearch));
  if (!player) return `No encontré ningún jugador con el nombre "${searchName}".`;
  
  const details: string[] = [];
  details.push(`👤 ${player["nombre"]}`);
  if (player["dorsal"]) details.push(`   Dorsal: ${player["dorsal"]}`);
  if (player["posicion"]) details.push(`   Posición: ${player["posicion"]}`);
  if (player["posicionJuego"]) details.push(`   Posición específica: ${player["posicionJuego"]}`);
  if (player["perfil"]) details.push(`   Perfil: ${player["perfil"] === 'D' ? 'Diestro' : player["perfil"] === 'I' ? 'Zurdo' : player["perfil"]}`);
  if (player["fechaNacimiento"]) {
    const birth = toDate(player["fechaNacimiento"]);
    if (birth) {
      const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      details.push(`   Fecha nacimiento: ${birth.toLocaleDateString("es-ES")}`);
      details.push(`   Edad: ${age} años`);
    }
  }
  if (player["equipo"]) details.push(`   Equipo: ${player["equipo"]}`);
  if (player["club"]) details.push(`   Club: ${player["club"]}`);
  
  return details.join("\n");
};

const getPlayersStats = (players: Array<Record<string, unknown>>): string => {
  if (!players.length) return "No hay jugadores para analizar.";
  
  const positions: Record<string, number> = {};
  let totalAge = 0;
  let ageCount = 0;
  
  players.forEach(p => {
    const pos = String(p["posicion"] ?? "Sin posición");
    positions[pos] = (positions[pos] || 0) + 1;
    
    const birth = toDate(p["fechaNacimiento"]);
    if (birth) {
      const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      totalAge += age;
      ageCount++;
    }
  });
  
  const positionStats = Object.entries(positions)
    .map(([pos, count]) => `   ${pos}: ${count}`)
    .join("\n");
  
  const avgAge = ageCount > 0 ? (totalAge / ageCount).toFixed(1) : "N/A";
  
  return `📊 Estadísticas de plantilla:\n   Total jugadores: ${players.length}\n   Edad media: ${avgAge} años\n\n   Por posición:\n${positionStats}`;
};

// ============================================================================
// ANÁLISIS DE STAFF
// ============================================================================

const summarizeStaff = (staff: Array<Record<string, unknown>>): string => {
  if (!staff?.length) return "No tengo personal registrado.";
  const list = staff.map(s => {
    const role = s["rol"] ? ` - ${s["rol"]}` : "";
    const name = String(s["nombre"] ?? "Técnico");
    return `${name}${role}`;
  });
  return `👔 Personal (${staff.length} miembros):\n${list.join("\n")}`;
};

const getStaffByRole = (staff: Array<Record<string, unknown>>, role: string): string => {
  const filtered = staff.filter(s => 
    normalize(String(s["rol"] ?? "")).includes(normalize(role))
  );
  if (!filtered.length) return `No tengo personal con el rol "${role}".`;
  const list = filtered.map(s => `${s["nombre"]} - ${s["rol"]}`);
  return `👔 ${filtered.length} miembro(s) con rol "${role}":\n${list.join("\n")}`;
};

const getStaffDetails = (staff: Array<Record<string, unknown>>, searchName: string): string => {
  const normalizedSearch = normalize(searchName);
  const member = staff.find(s => normalize(String(s["nombre"] ?? "")).includes(normalizedSearch));
  if (!member) return `No encontré ningún miembro del staff con el nombre "${searchName}".`;
  
  const details: string[] = [];
  details.push(`👤 ${member["nombre"]}`);
  if (member["rol"]) details.push(`   Rol: ${member["rol"]}`);
  if (member["email"]) details.push(`   Email: ${member["email"]}`);
  if (member["telefono"]) details.push(`   Teléfono: ${member["telefono"]}`);
  if (member["año"]) details.push(`   Año: ${member["año"]}`);
  
  return details.join("\n");
};

// ============================================================================
// ANÁLISIS DE EVENTOS Y PARTIDOS
// ============================================================================

const summarizeEvents = (events: Array<Record<string, unknown>>): string => {
  if (!events?.length) return "No tengo eventos en el calendario.";
  
  const byType: Record<string, number> = {};
  events.forEach(e => {
    const type = String(e["type"] ?? "Otro");
    byType[type] = (byType[type] || 0) + 1;
  });
  
  const summary = Object.entries(byType)
    .map(([type, count]) => `   ${type}: ${count}`)
    .join("\n");
  
  return `📅 Calendario (${events.length} eventos):\n${summary}`;
};

const getNextEvents = (events: Array<Record<string, unknown>>, count = 5): string => {
  if (!events?.length) return "No tengo eventos programados.";
  
  const now = new Date();
  const upcoming = events
    .map(e => ({ ...e, dateObj: toDate(e["date"]) }))
    .filter(e => e.dateObj && e.dateObj >= now)
    .sort((a, b) => (a.dateObj?.getTime() ?? 0) - (b.dateObj?.getTime() ?? 0))
    .slice(0, count);
  
  if (!upcoming.length) return "No tengo eventos próximos.";
  
  const list = upcoming.map(e => {
    const dateStr = e.dateObj?.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" });
    const time = e["time"] ? ` a las ${e["time"]}` : "";
    return `📌 ${dateStr}${time}: ${e["title"] || e["type"]}`;
  });
  
  return `📅 Próximos ${upcoming.length} eventos:\n${list.join("\n")}`;
};

const getNextMatch = (events: Array<Record<string, unknown>>): string => {
  if (!events?.length) return "No tengo partidos programados.";
  
  const matches = events.filter(e => e["type"] === "Partido").map(e => ({
    date: toDate(e["date"]),
    opponent: String(e["opponent"] ?? e["visitorTeam"] ?? e["localTeam"] ?? "Rival"),
    competition: String(e["competition"] ?? ""),
    time: String(e["time"] ?? ""),
    location: String(e["location"] ?? ""),
    status: String(e["status"] ?? "Upcoming"),
    jornada: e["jornada"]
  }));

  if (!matches.length) return "No tengo partidos programados.";

  const now = new Date();
  const sorted = matches.sort((a, b) => {
    const da = a.date?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const db = b.date?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  const upcoming = sorted.find(m => (m.date?.getTime() ?? 0) >= now.getTime()) ?? sorted[0];
  const dateLabel = upcoming.date ? upcoming.date.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" }) : "Fecha por confirmar";
  const timeLabel = upcoming.time ? ` a las ${upcoming.time}` : "";
  const comp = upcoming.competition ? ` (${upcoming.competition})` : "";
  const place = upcoming.location ? `\n   📍 ${upcoming.location}` : "";
  const jornada = upcoming.jornada ? `\n   Jornada: ${upcoming.jornada}` : "";
  
  return `⚽ Próximo partido:\n   vs ${upcoming.opponent}${comp}\n   📅 ${dateLabel}${timeLabel}${place}${jornada}\n   Estado: ${upcoming.status}`;
};

const getAllMatches = (events: Array<Record<string, unknown>>): string => {
  const matches = events.filter(e => e["type"] === "Partido");
  if (!matches.length) return "No tengo partidos registrados.";
  
  const sorted = matches
    .map(e => ({ ...e, dateObj: toDate(e["date"]) }))
    .sort((a, b) => (a.dateObj?.getTime() ?? 0) - (b.dateObj?.getTime() ?? 0));
  
  const list = sorted.map(m => {
    const date = m.dateObj?.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) ?? "TBD";
    const opponent = m["opponent"] ?? m["visitorTeam"] ?? m["localTeam"] ?? "Rival";
    const score = m["score"] ? ` (${m["score"]})` : "";
    return `${date}: vs ${opponent}${score}`;
  });
  
  return `⚽ Todos los partidos (${matches.length}):\n${list.join("\n")}`;
};

// ============================================================================
// ANÁLISIS DE EQUIPOS
// ============================================================================

const summarizeTeams = (teams: Array<Record<string, unknown>>): string => {
  if (!teams?.length) return "No tengo equipos de la competición registrados.";
  const list = teams.map(t => {
    const name = String(t["nombre"] ?? "Equipo");
    const locality = t["localidad"] ? ` (${t["localidad"]})` : "";
    return `${name}${locality}`;
  });
  return `🏆 Equipos de la competición (${teams.length}):\n${list.join("\n")}`;
};

// ============================================================================
// MOTOR DE INTENCIÓN
// ============================================================================

interface IntentPattern {
  keywords: string[];
  handler: (context: ChatContext, query: string) => string;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Jugadores específicos
  { 
    keywords: ["quien es", "informacion de", "datos de", "perfil de", "dime sobre"],
    handler: (ctx, q) => {
      const match = q.match(/(?:quien es|informacion de|datos de|perfil de|dime sobre)\s+(.+)/i);
      if (match) return getPlayerDetails(ctx.players ?? [], match[1]);
      return summarizePlayers(ctx.players ?? []);
    }
  },
  // Posiciones
  { 
    keywords: ["portero", "defensa", "central", "lateral", "medio", "mediocampista", "delantero", "extremo"],
    handler: (ctx, q) => {
      const positions = ["portero", "defensa", "central", "lateral", "medio", "mediocampista", "delantero", "extremo"];
      const found = positions.find(p => q.includes(p));
      if (found) return getPlayersByPosition(ctx.players ?? [], found);
      return summarizePlayers(ctx.players ?? []);
    }
  },
  // Estadísticas plantilla
  { 
    keywords: ["estadisticas", "stats", "edad media", "analisis plantilla", "resumen plantilla"],
    handler: (ctx) => getPlayersStats(ctx.players ?? [])
  },
  // Lista jugadores
  { 
    keywords: ["jugadores", "plantilla", "lista jugadores", "todos los jugadores"],
    handler: (ctx) => summarizePlayers(ctx.players ?? [])
  },
  // Cuántos jugadores
  { 
    keywords: ["cuantos jugadores", "numero de jugadores", "total jugadores"],
    handler: (ctx) => `Tengo ${ctx.players?.length ?? 0} jugadores en plantilla.`
  },
  // Staff específico
  { 
    keywords: ["entrenador", "tecnico", "preparador", "fisio", "medico", "delegado"],
    handler: (ctx, q) => {
      const roles = ["entrenador", "tecnico", "preparador", "fisio", "medico", "delegado"];
      const found = roles.find(r => q.includes(r));
      if (found) return getStaffByRole(ctx.staff ?? [], found);
      return summarizeStaff(ctx.staff ?? []);
    }
  },
  // Staff completo
  { 
    keywords: ["staff", "cuerpo tecnico", "tecnicos"],
    handler: (ctx) => summarizeStaff(ctx.staff ?? [])
  },
  // Próximo partido
  { 
    keywords: ["proximo partido", "siguiente partido", "cuando jugamos", "rival"],
    handler: (ctx) => getNextMatch(ctx.events ?? [])
  },
  // Todos los partidos
  { 
    keywords: ["partidos", "todos los partidos", "calendario partidos"],
    handler: (ctx) => getAllMatches(ctx.events ?? [])
  },
  // Próximos eventos
  { 
    keywords: ["proximos eventos", "agenda", "que hay programado", "calendario"],
    handler: (ctx) => getNextEvents(ctx.events ?? [])
  },
  // Resumen eventos
  { 
    keywords: ["eventos", "actividades", "entrenamientos"],
    handler: (ctx) => summarizeEvents(ctx.events ?? [])
  },
  // Equipos competición
  { 
    keywords: ["equipos", "rivales", "competicion", "liga"],
    handler: (ctx) => summarizeTeams(ctx.teams ?? [])
  },
  // Ayuda
  { 
    keywords: ["ayuda", "que puedes hacer", "comandos", "opciones"],
    handler: () => `🤖 Puedo ayudarte con:

📋 PLANTILLA
• "¿Cuántos jugadores hay?"
• "Lista de jugadores"
• "¿Quién es [nombre]?"
• "Porteros" / "Defensas" / "Delanteros"
• "Estadísticas de plantilla"

👔 STAFF
• "Personal"
• "¿Quién es el entrenador?"

⚽ PARTIDOS
• "Próximo partido"
• "Todos los partidos"
• "¿Cuándo jugamos?"

📅 CALENDARIO
• "Próximos eventos"
• "Calendario"

🏆 COMPETICIÓN
• "Equipos de la liga"
• "Rivales"`
  }
];

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

const buildSystemPrompt = (ctx: ChatContext): string => {
  const org = APP_CONFIG?.organization?.name ?? "el equipo";
  
  let dataContext = `Eres un asistente de fútbol para ${org}. Debes responder de forma concisa, útil y en español.\n\n`;
  dataContext += "DATOS DISPONIBLES:\n";
  
  if (ctx.players?.length) {
    dataContext += `\n📋 PLANTILLA (${ctx.players.length} jugadores):\n`;
    ctx.players.forEach(p => {
      const dorsal = (p["dorsal"] != null && p["dorsal"] !== "" && p["dorsal"] !== 0) ? `[${p["dorsal"]}]` : "[S/N]";
      const pos = p["posicion"] ? ` - ${p["posicion"]}` : "";
      const posJuego = p["posicionJuego"] ? ` (${p["posicionJuego"]})` : "";
      const perfil = p["perfil"] ? `, perfil: ${p["perfil"] === 'D' ? 'Diestro' : p["perfil"] === 'I' ? 'Zurdo' : p["perfil"]}` : "";
      dataContext += `  ${dorsal} ${p["nombre"]}${pos}${posJuego}${perfil}\n`;
    });
  } else {
    dataContext += "\n⚠️ Sin jugadores en plantilla\n";
  }
  
  if (ctx.staff?.length) {
    dataContext += `\n👔 PERSONAL (${ctx.staff.length} miembros):\n`;
    ctx.staff.forEach(s => {
      const rol = s["rol"] ? ` - ${s["rol"]}` : "";
      dataContext += `  ${s["nombre"]}${rol}\n`;
    });
  }
  
  if (ctx.events?.length) {
    dataContext += `\n📅 CALENDARIO (${ctx.events.length} eventos):\n`;
    const upcoming = ctx.events
      .filter(e => {
        const d = new Date(e["date"] as string);
        return d >= new Date();
      })
      .slice(0, 10);
    upcoming.forEach(e => {
      const date = new Date(e["date"] as string).toLocaleDateString("es-ES");
      const type = e["type"] ?? "Evento";
      const title = e["title"] ?? "";
      dataContext += `  ${date}: ${type}${title ? ` - ${title}` : ""}\n`;
    });
  }
  
  if (ctx.teams?.length) {
    dataContext += `\n🏆 EQUIPOS COMPETICIÓN (${ctx.teams.length}):\n`;
    ctx.teams.slice(0, 20).forEach(t => {
      dataContext += `  ${t["nombre"]}\n`;
    });
  }
  
  dataContext += "\nINSTRUCCIONES:\n";
  dataContext += "- Responde preguntas sobre jugadores, partidos, calendario, staff y equipos\n";
  dataContext += "- Usa emojis para hacer las respuestas más visuales\n";
  dataContext += "- Sé breve pero completo\n";
  dataContext += "- Si no tienes datos suficientes, indícalo claramente\n";
  
  return dataContext;
};

export class GeminiService {
  static async askAssistant(prompt: string, context?: ChatContext): Promise<string> {
    const text = prompt?.trim() ?? "";
    if (!text) return "Necesito una pregunta para ayudarte.";

    const ctx: ChatContext = {
      players: context?.players ?? [],
      staff: context?.staff ?? [],
      events: context?.events ?? [],
      teams: context?.teams ?? []
    };

    // Si hay API key de Gemini, usar la IA real
    if (genAI) {
      try {
        const systemPrompt = buildSystemPrompt(ctx);
        
        const response = await genAI.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\nPregunta del usuario: " + text }] }
          ],
          config: {
            maxOutputTokens: 1024,
            temperature: 0.7
          }
        });

        const responseText = response.text?.trim();
        if (responseText) {
          return responseText;
        }
      } catch (error) {
        console.error("Error al llamar a Gemini API:", error);
        // Fallback al sistema de reglas si falla la API
      }
    }

    // Fallback: sistema basado en reglas (sin API key o error)
    const intent = normalize(text);

    // Buscar patrón de intención
    for (const pattern of INTENT_PATTERNS) {
      for (const keyword of pattern.keywords) {
        if (intent.includes(normalize(keyword))) {
          return pattern.handler(ctx, text);
        }
      }
    }

    // Respuesta por defecto con resumen general
    const org = APP_CONFIG?.organization?.name ?? "el equipo";
    const apiWarning = !genAI ? "\n\n⚠️ Modo limitado: Configura VITE_GEMINI_API_KEY para respuestas con IA avanzada." : "";
    const parts = [
      `🤖 Soy el asistente de ${org}.`,
      "",
      "📊 Resumen de datos disponibles:",
      ctx.players?.length ? `   📋 ${ctx.players.length} jugadores en plantilla` : "   ⚠️ Sin jugadores cargados",
      ctx.staff?.length ? `   👔 ${ctx.staff.length} miembros en personal` : "   ⚠️ Sin staff cargado",
      ctx.events?.length ? `   📅 ${ctx.events.length} eventos en calendario` : "   ⚠️ Sin eventos programados",
      ctx.teams?.length ? `   🏆 ${ctx.teams.length} equipos en competición` : "",
      "",
      "💡 Escribe 'ayuda' para ver qué puedo hacer." + apiWarning
    ].filter(Boolean);

    return parts.join("\n");
  }

  // ===========================================================================
  // CLASIFICACIÓN DE LIGA EN TIEMPO REAL VÍA GEMINI
  // ===========================================================================

  /** Resultado estructurado de la clasificación */
  static readonly STANDINGS_CACHE_KEY = 'gemini_standings_v2_';

  /**
   * Pide a Gemini la clasificación actual de una liga para un equipo concreto.
   * Devuelve un array de standings parseados en formato JSON.
   * Cachea en sessionStorage para evitar llamadas repetidas.
   */
  static async getLeagueStandings(
    teamName: string,
    competition: string,
    options?: { forceRefresh?: boolean; season?: string }
  ): Promise<GeminiStandingsResult> {
    const season = options?.season ?? '2026-2027';
    const cacheKey = `${GeminiService.STANDINGS_CACHE_KEY}${competition}_${season}`;

    // Comprobar cache (sessionStorage)
    if (!options?.forceRefresh) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as GeminiStandingsCacheEntry;
          // Cache válida durante 2 horas
          if (Date.now() - parsed.timestamp < 2 * 60 * 60 * 1000) {
            return { standings: parsed.standings, source: 'cache', teamName, sources: parsed.sources };
          }
        }
      } catch { /* ignore */ }
    }

    if (!genAI) {
      return { standings: [], source: 'error', error: 'No hay API key de Gemini configurada', teamName };
    }

    // =====================================================================
    // PASO 1: Buscar datos REALES con Google Search grounding
    // =====================================================================
    const searchPrompt = `I need the COMPLETE and CURRENT standings table for "${competition}" (Spain), season ${season}.

The team "${teamName}" plays in this competition. If the competition has groups (like "Tercera Federación" or "Tercera RFEF"), find the EXACT GROUP where "${teamName}" plays and return ONLY that group's full standings.

IMPORTANT: Search specifically on these websites for the most accurate data:
- besoccer.com (clasificación ${competition})
- sofascore.com (${competition} standings)
- siguetuliga.com (${competition} clasificación)
- resultados.rfef.es (Tercera Federación)

For EVERY team in the group, provide the EXACT current statistics:
- Position (pos)
- Team name
- Matches played (PJ)
- Wins (PG)
- Draws (PE)
- Losses (PP)
- Goals for (GF)
- Goals against (GC)
- Goal difference (DG)
- Points (PTS)
- Last 5 match results (form/racha: W=win, D=draw, L=loss)

Return ALL teams with their real numbers. Do NOT estimate or make up data — only use actual statistics from the search results.

Search queries to use:
- clasificación ${competition} ${teamName} ${season}
- ${competition} grupo ${teamName} jornada clasificación
- besoccer tercera rfef grupo clasificación ${season}`;


    try {
      // Paso 1: Búsqueda real con Google Search
      console.log(`[Gemini Search] Buscando clasificación real de "${competition}"...`);
      const searchResponse = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
        config: {
          maxOutputTokens: 8192,
          temperature: 0.1,
          tools: [{ googleSearch: {} }],
        },
      });

      // Extraer texto de la respuesta (puede tener varias parts)
      let searchText = '';
      const parts = searchResponse.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if ((part as any).text) searchText += (part as any).text;
        }
      }
      if (!searchText) {
        searchText = searchResponse.text?.trim() ?? '';
      }

      console.log('[Gemini Search] Datos crudos recibidos:', searchText.substring(0, 200) + '...');
      
      // Extraer URLs de las fuentes de grounding
      const sources: GeminiStandingSource[] = [];
      try {
        const candidates = searchResponse.candidates;
        if (candidates?.[0]?.groundingMetadata) {
          const gm = candidates[0].groundingMetadata as any;
          if (gm.groundingChunks) {
            for (const chunk of gm.groundingChunks) {
              if (chunk.web) {
                sources.push({ title: chunk.web.title ?? '', uri: chunk.web.uri ?? '' });
              }
            }
          }
          if (gm.webSearchQueries) {
            console.log('[Gemini Search] Queries usadas:', gm.webSearchQueries);
          }
        }
      } catch { /* metadatos no disponibles */ }

      if (!searchText || searchText.length < 50) {
        return { standings: [], source: 'error', error: 'Google Search no devolvió datos suficientes', teamName };
      }

      // =====================================================================
      // PASO 2: Convertir tabla a JSON estructurado (sin search, solo parsing)
      // =====================================================================
      const parsePrompt = `Convierte los siguientes datos de clasificación de fútbol a un JSON array válido.

DATOS DE ENTRADA:
${searchText}

INSTRUCCIONES ESTRICTAS:
- Devuelve SOLO un JSON array válido, sin markdown, sin backticks, sin texto adicional.
- Incluye TODOS los equipos del grupo, no omitas ninguno.
- Cada equipo debe ser un objeto con esta estructura exacta:
  {"pos":1,"team":"Nombre Equipo","played":20,"won":16,"drawn":2,"lost":2,"goalsFor":45,"goalsAgainst":15,"points":50,"form":["W","W","D","L","W"]}
- "form" debe ser los últimos 5 resultados reales si están disponibles. Si no los tienes exactos, estímalos según la racha del equipo (W=victoria, D=empate, L=derrota).
- Mantén el orden por posición (1º primero).
- Si algún dato numérico falta, usa 0.
- Responde ÚNICAMENTE con el JSON array, nada más.`;

      const parseResponse = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: parsePrompt }] }],
        config: {
          maxOutputTokens: 8192,
          temperature: 0,
        },
      });

      const raw = parseResponse.text?.trim() ?? '';
      
      // Limpiar posible markdown wrapping (puede venir como ```json\n...\n```)
      let cleaned = raw;
      // Quitar bloque markdown completo
      const jsonBlockMatch = raw.match(/```json?\s*\n?([\s\S]*?)\n?\s*```/i);
      if (jsonBlockMatch) {
        cleaned = jsonBlockMatch[1].trim();
      } else {
        // Intentar limpieza simple
        cleaned = raw
          .replace(/^```json?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
      }
      
      // Si aún empieza con texto antes del array, buscar el array
      if (!cleaned.startsWith('[')) {
        const arrayStart = cleaned.indexOf('[');
        if (arrayStart !== -1) {
          cleaned = cleaned.substring(arrayStart);
        }
      }

      const parsed = JSON.parse(cleaned) as GeminiStandingRow[];

      // Validar estructura mínima
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.warn('[Gemini Search] JSON parseado pero vacío. Raw:', raw.substring(0, 300));
        return { standings: [], source: 'error', error: 'Gemini devolvió datos vacíos', teamName };
      }

      console.log(`[Gemini Search] ✓ ${parsed.length} equipos parseados correctamente`);

      // Normalizar y validar cada fila
      const standings: GeminiStandingRow[] = parsed.map((row, i) => ({
        pos: row.pos ?? i + 1,
        team: String(row.team ?? ''),
        played: Number(row.played ?? 0),
        won: Number(row.won ?? 0),
        drawn: Number(row.drawn ?? 0),
        lost: Number(row.lost ?? 0),
        goalsFor: Number(row.goalsFor ?? 0),
        goalsAgainst: Number(row.goalsAgainst ?? 0),
        points: Number(row.points ?? 0),
        form: Array.isArray(row.form) ? row.form.slice(0, 5) as ('W' | 'D' | 'L')[] : [],
      }));

      // Guardar en cache
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          standings,
          timestamp: Date.now(),
          competition,
          season,
          sources,
        } as GeminiStandingsCacheEntry));
      } catch { /* sessionStorage lleno, ignorar */ }

      return { standings, source: 'gemini', teamName, sources };
    } catch (error) {
      console.error('[Gemini Search] Error obteniendo clasificación:', error);
      // Si fue error de JSON parse, mostrar lo que se recibió para debug
      if (error instanceof SyntaxError) {
        console.warn('[Gemini Search] El paso 2 no devolvió JSON válido. Revisa el prompt o la respuesta del search.');
      }
      return {
        standings: [],
        source: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido',
        teamName,
      };
    }
  }
}

/** Fila de clasificación devuelta por Gemini */
export interface GeminiStandingRow {
  pos: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

/** Fuente de grounding de Google Search */
export interface GeminiStandingSource {
  title: string;
  uri: string;
}

/** Resultado completo de la petición de standings */
export interface GeminiStandingsResult {
  standings: GeminiStandingRow[];
  source: 'gemini' | 'cache' | 'error';
  error?: string;
  teamName: string;
  sources?: GeminiStandingSource[];
}

/** Entrada de cache en sessionStorage */
interface GeminiStandingsCacheEntry {
  standings: GeminiStandingRow[];
  timestamp: number;
  competition: string;
  season: string;
  sources?: GeminiStandingSource[];
}

export default GeminiService;
