/**
 * @fileoverview Servicio de actas de partidos usando Gemini con Google Search grounding.
 * Busca resultados y actas de La Liga (y otras competiciones) directamente en internet.
 */

import { GoogleGenAI } from "@google/genai";

// ============================================================================
// TIPOS
// ============================================================================

export interface GeminiMatchResult {
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  date: string;
  time?: string;
  stadium?: string;
  referee?: string;
  played: boolean;
}

export interface GeminiMatchActa {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  date: string;
  referee: string;
  stadium?: string;
  goals: { minute: string; player: string; team: 'home' | 'away' }[];
  cards: { minute: string; player: string; type: 'yellow' | 'red'; team: string }[];
  homeLineup: { dorsal: number | null; name: string }[];
  awayLineup: { dorsal: number | null; name: string }[];
  subs: { minute: string; playerIn: string; playerOut: string; team: string }[];
}

export interface GeminiJornadaResult {
  competition: string;
  season: string;
  jornada: number;
  matches: GeminiMatchResult[];
  fetchedAt: string;
}

// ============================================================================
// TEMPORADAS
// ============================================================================

export interface Season {
  label: string;
  yearStart: number;
}

export const SEASONS: Season[] = [
  { label: '2025-2026', yearStart: 2025 },
  { label: '2024-2025', yearStart: 2024 },
  { label: '2023-2024', yearStart: 2023 },
  { label: '2022-2023', yearStart: 2022 },
];

export function getCurrentSeason(): Season {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const targetYear = month >= 7 ? year : year - 1;
  return SEASONS.find(s => s.yearStart === targetYear) || SEASONS[0];
}

export function estimateCurrentJornada(season: Season): number {
  const seasonStart = new Date(season.yearStart, 7, 15); // Aug 15
  const now = new Date();
  const weeks = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(38, weeks));
}

// ============================================================================
// SERVICIO
// ============================================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
let genAI: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

// Cache simple para evitar repetir peticiones
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, ts: Date.now() });
}

/**
 * Llama a Gemini con Google Search grounding para obtener datos de fútbol.
 */
async function askGemini(prompt: string, maxTokens = 4096): Promise<string> {
  if (!genAI) throw new Error('Gemini API key no configurada');

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: maxTokens,
      temperature: 0.1,
      tools: [{ googleSearch: {} }],
    }
  });

  let text = '';
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if ((part as any).text) text += (part as any).text;
    }
  } else if (response.text) {
    text = response.text;
  }

  return text.trim();
}

/**
 * Extrae JSON de una respuesta que puede tener markdown code blocks.
 */
function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Try to find raw JSON array or object
  const jsonStart = text.indexOf('[') !== -1 ? text.indexOf('[') : text.indexOf('{');
  const jsonEnd = text.lastIndexOf(']') !== -1 ? text.lastIndexOf(']') + 1 : text.lastIndexOf('}') + 1;
  if (jsonStart >= 0 && jsonEnd > jsonStart) return text.substring(jsonStart, jsonEnd);
  return text;
}

// ============================================================================
// API PÚBLICA
// ============================================================================

/**
 * Obtener resultados de una jornada completa.
 */
export async function fetchJornada(
  season: Season,
  jornada: number,
  competition = 'La Liga Primera División'
): Promise<GeminiJornadaResult> {
  const cacheKey = `jornada:${season.label}:${jornada}`;
  const cached = getCached<GeminiJornadaResult>(cacheKey);
  if (cached) return cached;

  const prompt = `Dame los resultados de la Jornada ${jornada} de ${competition} temporada ${season.label} en España.
Para cada partido incluye: equipo local, equipo visitante, goles local (null si no se ha jugado), goles visitante (null si no se ha jugado), fecha (YYYY-MM-DD), hora (HH:MM o ""), estadio, arbitro, y si ya se ha jugado (true/false).
Responde SOLO con un JSON array. Cada elemento: {home, away, homeGoals, awayGoals, date, time, stadium, referee, played}.
SOLO JSON, sin texto adicional.`;

  const raw = await askGemini(prompt);
  const json = extractJSON(raw);
  const matches: GeminiMatchResult[] = JSON.parse(json);

  const result: GeminiJornadaResult = {
    competition,
    season: season.label,
    jornada,
    matches,
    fetchedAt: new Date().toISOString(),
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Obtener acta detallada de un partido.
 */
export async function fetchActa(
  home: string,
  away: string,
  jornada: number,
  season: Season,
  competition = 'La Liga Primera División'
): Promise<GeminiMatchActa> {
  const cacheKey = `acta:${season.label}:${jornada}:${home}:${away}`;
  const cached = getCached<GeminiMatchActa>(cacheKey);
  if (cached) return cached;

  const prompt = `Dame el ACTA COMPLETA del partido ${home} vs ${away} de la Jornada ${jornada} de ${competition} temporada ${season.label} en España.
Incluye: alineaciones titulares de ambos equipos (dorsal y nombre), goleadores con minuto, tarjetas amarillas y rojas con minuto, sustituciones con minuto, estadio y arbitro.
Responde SOLO JSON con esta estructura exacta:
{
  "home": "${home}",
  "away": "${away}",
  "homeGoals": 0,
  "awayGoals": 0,
  "date": "YYYY-MM-DD",
  "referee": "",
  "stadium": "",
  "goals": [{"minute": "", "player": "", "team": "home o away"}],
  "cards": [{"minute": "", "player": "", "type": "yellow o red", "team": "home o away"}],
  "homeLineup": [{"dorsal": 0, "name": ""}],
  "awayLineup": [{"dorsal": 0, "name": ""}],
  "subs": [{"minute": "", "playerIn": "", "playerOut": "", "team": "home o away"}]
}
SOLO JSON, sin texto adicional.`;

  const raw = await askGemini(prompt, 8192);
  const json = extractJSON(raw);
  const acta: GeminiMatchActa = JSON.parse(json);

  setCache(cacheKey, acta);
  return acta;
}

/**
 * Verificar si Gemini está disponible.
 */
export function isAvailable(): boolean {
  return genAI !== null;
}
