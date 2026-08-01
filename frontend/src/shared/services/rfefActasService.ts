/**
 * @fileoverview Servicio para obtener actas de partidos de la RFEF
 * @description Scraping del portal de resultados de la RFEF para extraer
 *              actas completas de partidos: alineaciones, goles, cambios,
 *              tarjetas e incidencias.
 *
 * URL jornada: https://resultados.rfef.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=XXXX&CodGrupo=XXXX&CodTemporada=XX&CodJornada=XX
 * URL acta:    https://resultados.rfef.es/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=XXXX&cod_acta=XXXX
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface RfefCompetitionConfig {
  codPrimaria: string;
  codCompeticion: string;
  codGrupo: string;
  codTemporada: string;
}

export interface RfefJornadaMatch {
  codActa: string;
  localTeam: string;
  visitorTeam: string;
  localLogo: string;
  visitorLogo: string;
  score: string | null;
  date: string;
  time: string;
  stadium: string;
  referee: string;
  hasActa: boolean;
  actaUrl: string;
}

export interface RfefJornadaResult {
  competitionName: string;
  jornada: number;
  totalJornadas: number;
  matches: RfefJornadaMatch[];
  fetchedAt: string;
}

export interface ActaPlayer {
  dorsal: number;
  name: string;
}

export interface ActaGoal {
  minute: string;
  player: string;
  homeScore: number;
  awayScore: number;
}

export interface ActaSubstitution {
  minute: string;
  playerIn: string;
  playerOut: string;
}

export interface ActaCard {
  type: 'yellow' | 'red' | 'second-yellow';
  player: string;
  minute?: string;
}

export interface ActaTeamData {
  name: string;
  logoUrl: string;
  starters: ActaPlayer[];
  substitutes: ActaPlayer[];
  substitutions: ActaSubstitution[];
  cards: ActaCard[];
  coach: string;
}

export interface ActaPartido {
  codActa: string;
  competition: string;
  jornada: string;
  date: string;
  time: string;
  stadium: string;
  city: string;
  homeTeam: ActaTeamData;
  awayTeam: ActaTeamData;
  score: string;
  homeScore: number;
  awayScore: number;
  goals: ActaGoal[];
  referees: string[];
  incidents: string[];
  fetchedAt: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** En desarrollo usamos proxy de Vite para evitar CORS */
const RFEF_BASE = import.meta.env.DEV
  ? '/api/rfef/pnfg/NPcd'
  : 'https://resultados.rfef.es/pnfg/NPcd';

const RFEF_IMG_BASE = 'https://rfef.filesnovanet.es';

/** Clave de localStorage para la configuración de competición */
const STORAGE_KEY = 'sport_management_rfef_competition';

/** Temporadas disponibles con sus códigos RFEF */
export interface RfefSeason {
  codTemporada: string;
  label: string;
  yearStart: number;
}

export const RFEF_SEASONS: RfefSeason[] = [
  { codTemporada: '21', label: '2025-2026', yearStart: 2025 },
  { codTemporada: '20', label: '2024-2025', yearStart: 2024 },
  { codTemporada: '19', label: '2023-2024', yearStart: 2023 },
  { codTemporada: '18', label: '2022-2023', yearStart: 2022 },
];

/**
 * Devuelve la temporada actual basándose en la fecha.
 * (ago-dic = temporada actual, ene-jul = temporada anterior)
 */
export function getCurrentSeason(): RfefSeason {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const targetYear = month >= 7 ? year : year - 1; // agosto+ = nueva temporada
  return RFEF_SEASONS.find(s => s.yearStart === targetYear) || RFEF_SEASONS[0];
}

/** Configuración por defecto (La Liga Primera División 2025-2026) */
const DEFAULT_CONFIG: RfefCompetitionConfig = {
  codPrimaria: '1000120',
  codCompeticion: '23289291',
  codGrupo: '23289292',
  codTemporada: '21',
};

// ============================================================================
// PERSISTENCIA DE CONFIGURACIÓN
// ============================================================================

/**
 * Guarda la configuración de competición RFEF en localStorage.
 */
export function saveCompetitionConfig(config: RfefCompetitionConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

/**
 * Carga la configuración de competición RFEF desde localStorage.
 * Si no hay guardada, devuelve la configuración por defecto.
 */
export function loadCompetitionConfig(): RfefCompetitionConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as RfefCompetitionConfig;
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

/**
 * Devuelve la configuración por defecto de competición.
 */
export function getDefaultCompetitionConfig(): RfefCompetitionConfig {
  return { ...DEFAULT_CONFIG };
}

// ============================================================================
// PARSER DE URLs
// ============================================================================

/**
 * Extrae la configuración de competición y jornada de una URL de jornada RFEF.
 */
export function parseJornadaUrl(url: string): { config: RfefCompetitionConfig; jornada: number } | null {
  const pattern = /cod_primaria=([^&]+).*?CodCompeticion=([^&]+).*?CodGrupo=([^&]+).*?CodTemporada=([^&]+).*?CodJornada=(\d+)/i;
  const match = url.match(pattern);
  if (match) {
    return {
      config: {
        codPrimaria: match[1],
        codCompeticion: match[2],
        codGrupo: match[3],
        codTemporada: match[4],
      },
      jornada: parseInt(match[5], 10),
    };
  }
  return null;
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

class RfefActasService {
  /**
   * Realiza un fetch con decodificación ISO-8859-15.
   * Cada llamada tiene su propio AbortController para no cancelar otras peticiones.
   */
  private async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: { 'Accept': 'text/html' },
    });

    if (!response.ok) {
      throw new Error(`Error RFEF: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    // La web RFEF usa ISO-8859-15
    const decoder = new TextDecoder('iso-8859-15');
    return decoder.decode(buffer);
  }

  // ==========================================================================
  // JORNADA - Lista de partidos
  // ==========================================================================

  /**
   * Construye la URL proxy de la página de jornada.
   */
  private getJornadaUrl(config: RfefCompetitionConfig, jornada: number): string {
    const params = new URLSearchParams({
      cod_primaria: config.codPrimaria,
      CodCompeticion: config.codCompeticion,
      CodGrupo: config.codGrupo,
      CodTemporada: config.codTemporada,
      CodJornada: String(jornada),
    });
    return `${RFEF_BASE}/NFG_CmpJornada?${params.toString()}`;
  }

  /**
   * Obtiene la lista de partidos de una jornada.
   */
  async fetchJornada(config: RfefCompetitionConfig, jornada: number): Promise<RfefJornadaResult> {
    const url = this.getJornadaUrl(config, jornada);
    const html = await this.fetchHtml(url);
    return this.parseJornadaHtml(html, jornada);
  }

  /**
   * Parsea el HTML de la página de jornada para extraer partidos.
   */
  private parseJornadaHtml(html: string, jornada: number): RfefJornadaResult {
    const matches: RfefJornadaMatch[] = [];

    // Extraer nombre de la competición
    const compNameMatch = html.match(/Campeonato[^<]*|Liga[^<]*División/i);
    const competitionName = compNameMatch ? compNameMatch[0].trim() : 'Competición';

    // Detectar total de jornadas del navegador (buscar el máximo en IrA(N))
    const jornadaRefs = [...html.matchAll(/IrA\((\d+)\)/g)].map(m => parseInt(m[1], 10));
    const totalJornadas = jornadaRefs.length > 0 ? Math.max(...jornadaRefs) : jornada;

    // Cada partido está en un <table> dentro de un <tr><td>
    // Patrón: equipo local + resultado + equipo visitante
    const matchPattern = /escudo_widgetL[^>]*>\s*<img\s+src="([^"]*)"[^>]*>[\s\S]*?font_widgetL[^>]*>\s*(?:&nbsp;\s*)?([^<]+)[\s\S]*?(?:<a[^>]*NFG_CmpPartido[^>]*CodActa=(\d+)[^>]*>|<a[^#][^>]*NFG_CmpPrevio[^>]*CodActa=(\d+)[^>]*>|<strong>[\s\S]*?<\/strong>)[\s\S]*?font_widgetV[^>]*>\s*([^<]+)[\s\S]*?escudo_widgetV[^>]*>\s*<img\s+src="([^"]*)"[^>]*>/g;

    // Enfoque más robusto: dividir por filas de tabla
    const tableRows = html.split(/<tr><td>\s*<table width="100%">/);

    for (const row of tableRows) {
      if (!row.includes('font_widgetL') || !row.includes('font_widgetV')) continue;

      // Equipo local
      const localLogo = row.match(/escudo_widgetL[\s\S]*?<img\s+src="([^"]*)"/)
      const localName = row.match(/font_widgetL[^>]*>\s*(?:&nbsp;\s*)?([^<]+)/);

      // Equipo visitante
      const visitorName = row.match(/font_widgetV[^>]*>\s*([^<]+)/);
      const visitorLogo = row.match(/escudo_widgetV[\s\S]*?<img\s+src="([^"]*)"/)

      if (!localName || !visitorName) continue;

      // Acta (partido jugado)
      const actaMatch = row.match(/NFG_CmpPartido[^"]*CodActa=(\d+)/);
      // Previo (partido no jugado aún)
      const previoMatch = row.match(/NFG_CmpPrevio[^"]*CodActa=(\d+)/);
      const codActa = actaMatch?.[1] || previoMatch?.[1] || '';

      // Resultado - buscar score con ntype usando content:"X"
      const scoreDigits = [...row.matchAll(/content:"(\d+)"/g)].map(m => m[1]);
      const hasScore = actaMatch !== null && scoreDigits.length >= 2;
      const score = hasScore ? `${scoreDigits[0]} - ${scoreDigits[1]}` : null;

      // Fecha y hora
      const dateMatch = row.match(/class=horario[^>]*>\s*(\d{2}-\d{2}-\d{4})/);
      const timeMatch = row.match(/class=horario[^>]*>\s*(\d{2}:\d{2})/);

      // Estadio
      const stadiumMatch = row.match(/font_widgetL[^<]*<br><span[^>]*>\s*([^<]+)\s*-\s*(?:Hierba|Césped)/);
      // Árbitro
      const refMatch = row.match(/rbitro:\s*<\/strong>\s*(?:&nbsp;)?([^<]+)/);

      matches.push({
        codActa,
        localTeam: localName[1].trim(),
        visitorTeam: visitorName[1].trim(),
        localLogo: localLogo?.[1] || '',
        visitorLogo: visitorLogo?.[1] || '',
        score,
        date: dateMatch?.[1] || '',
        time: timeMatch?.[1] || '',
        stadium: stadiumMatch?.[1]?.trim() || '',
        referee: refMatch?.[1]?.trim() || '',
        hasActa: actaMatch !== null,
        actaUrl: actaMatch
          ? `${RFEF_BASE}/NFG_CmpPartido?cod_primaria=${codActa ? '1000120' : ''}&CodActa=${codActa}&cod_acta=${codActa}`
          : '',
      });
    }

    return {
      competitionName,
      jornada,
      totalJornadas,
      matches,
      fetchedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // ACTA - Detalle de partido
  // ==========================================================================

  /**
   * Construye la URL proxy de la página del acta.
   */
  private getActaUrl(codPrimaria: string, codActa: string): string {
    const params = new URLSearchParams({
      cod_primaria: codPrimaria,
      CodActa: codActa,
      cod_acta: codActa,
    });
    return `${RFEF_BASE}/NFG_CmpPartido?${params.toString()}`;
  }

  /**
   * Obtiene el detalle de un acta de partido.
   */
  async fetchActa(codPrimaria: string, codActa: string): Promise<ActaPartido> {
    const url = this.getActaUrl(codPrimaria, codActa);
    const html = await this.fetchHtml(url);
    return this.parseActaHtml(html, codActa);
  }

  /**
   * Parsea el HTML del acta del partido.
   */
  private parseActaHtml(html: string, codActa: string): ActaPartido {
    // --- Equipos ---
    const teamNames = [...html.matchAll(/escudos_nuevos\/\d+_50x50\.png"[\s\S]*?<\/div>[\s\S]*?<\/div>/g)];
    // Los nombres de equipo están en el header principal (primer bloque con nombres grandes)
    const headerTeams = html.match(/<h2[^>]*>[\s\S]*?<\/h2>[\s\S]*?<h2/);

    // Approach: la página tiene dos bloques principales de equipo
    // Buscar nombre directamente del title area  
    const teamLogos = [...html.matchAll(/escudos_nuevos\/(\d+)_50x50\.png/g)].map(m => m[1]);
    const homeLogoId = teamLogos[0] || '';
    const awayLogoId = teamLogos[1] || '';

    // Score
    const scoreContent = [...html.matchAll(/content:"(\d+)"/g)].map(m => parseInt(m[1], 10));
    const homeScore = scoreContent[0] ?? 0;
    const awayScore = scoreContent[1] ?? 0;

    // Competición
    const compMatch = html.match(/Primera Divisi[oó]n|Segunda Divisi[oó]n|Liga Regular|Campeonato[^<(]*/i);
    const competition = compMatch ? compMatch[0].trim() : '';

    // Jornada
    const jornadaMatch = html.match(/Jornada\s+(\d+)/i);
    const jornada = jornadaMatch ? `Jornada ${jornadaMatch[1]}` : '';

    // Fecha y hora
    const dateTimeMatch = html.match(/(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})/);
    const date = dateTimeMatch?.[1] || '';
    const time = dateTimeMatch?.[2] || '';

    // Estadio y Ciudad
    const stadiumMatch = html.match(/Estadio:\s*([^<\n]+)/i) || html.match(/class="[^"]*"[^>]*>[\s\S]*?(Estadio[^<]*)</);
    // La ciudad aparece como "Ciudad: Barcelona"
    const cityMatch = html.match(/Ciudad:\s*([^<\n]+)/i) || html.match(/class="[^"]*ciudad[^"]*"[^>]*>([^<]+)/i);
    const stadium = stadiumMatch?.[1]?.trim() || '';
    const city = cityMatch?.[1]?.trim() || '';

    // --- Goles ---
    const goals: ActaGoal[] = [];
    // Patrón: "X - Y | (min') Jugador" in the Goles table
    const golesSection = html.match(/Goles[\s\S]*?<\/table>/i);
    if (golesSection) {
      const goalRows = [...golesSection[0].matchAll(/<tr[^>]*>[\s\S]*?(\d+)\s*-\s*(\d+)[\s\S]*?\((\d+)'\)\s*([^<]+)/g)];
      for (const gr of goalRows) {
        goals.push({
          homeScore: parseInt(gr[1], 10),
          awayScore: parseInt(gr[2], 10),
          minute: gr[3] + "'",
          player: gr[4].trim(),
        });
      }
    }

    // --- Árbitros ---
    const referees: string[] = [];
    // Los árbitros están en <h5> tags después de "Árbitros"
    const refereeSection = html.match(/rbitros?[\s\S]*?(?=Incidencias|Goles|Estadio)/i);
    if (refereeSection) {
      const refNames = [...refereeSection[0].matchAll(/<h5[^>]*>[\s\S]*?>\s*\n?\s*([A-ZÁÉÍÓÚÜÑa-záéíóúüñ][^<\n]+[a-záéíóúüñA-ZÁÉÍÓÚÜÑ])\s*</g)];
      for (const rn of refNames) {
        const name = rn[1].trim();
        if (name.length > 3 && !name.includes('class=') && !name.includes('src=')) {
          referees.push(name);
        }
      }
    }

    // --- Equipos: nombres del header ---
    // El primer nombre en el bloque superior es el local, el segundo el visitante
    // Usamos el patrón de la tabla de alineaciones que tiene título de equipo
    const teamNameBlocks = [...html.matchAll(/(?:font_widgetL|<strong[^>]*>|<b>)\s*([A-ZÁÉÍÓÚÜÑa-z][^<]{3,50}(?:CF|FC|Club|UD|CD|SD|RCD|RC|CA|AD|Real|Athletic|Atlético|Deportivo|Villarreal|Sevilla|Valencia|Betis|Celta|Mallorca|Espanyol|Osasuna|Rayo|Getafe|Girona|Alavés|Levante|Elche|Oviedo)[^<]*)/g)];

    // Approach alternativo: buscar en el bloque de alineaciones
    // La página divide en dos secciones de equipo: la primera es local, la segunda visitante
    const allTeamHeaders = [...html.matchAll(/<div[^>]*class="[^"]*widget[^"]*"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/g)];

    // Mejor acercamiento: extraer de las imágenes de escudos que están junto al nombre
    const teamInfoBlocks = [...html.matchAll(/escudos_nuevos\/\d+_50x50\.png"[^>]*>\s*<\/div>\s*<div[^>]*>\s*([^<]+)/g)];

    // Nombre de equipos: están en el wrapper del header, cerca de las imágenes de escudo
    // Buscamos texto significativo después de las imágenes de escudo
    let homeTeamName = '';
    let awayTeamName = '';

    // Los nombres aparecen después de la imagen del escudo en el header
    const headerBlock = html.substring(0, Math.min(15000, html.length));
    const teamNamesInHeader = [...headerBlock.matchAll(/escudos_nuevos\/(\d+)_50x50[\s\S]*?(?:<[^>]*>)*\s*([A-ZÁÉÍÓÚa-záéíóú][A-ZÁÉÍÓÚÜÑa-záéíóúüñ\s.]+(?:de\s)?[A-ZÁÉÍÓÚÜÑa-záéíóúüñ\s.]*)/g)];

    // Mejor: usar el schema.org SportsTeam o el bloque de título principal
    const sportsTeamNames = [...html.matchAll(/class="[^"]*titulo[^"]*"[^>]*>([^<]+)/g)].map(m => m[1].trim()).filter(n => n.length > 2);

    // Finalmente, buscar los nombres simples del header text (son los más fiables)
    const h2Names = [...html.matchAll(/<div[^>]*>\s*<strong>\s*([^<]+?)\s*<\/strong>\s*<\/div>/g)].map(m => m[1].trim()).filter(n => n.length > 3);

    // Los nombres de equipo se pueden extraer del bloque CSS/layout
    // Están en: <div class=font_widgetL> equipo local </div>  y <div class=font_widgetV> equipo visitante </div>
    const localNameMatch = headerBlock.match(/font_widgetL[^>]*>\s*(?:&nbsp;\s*)?([^<]+)/);
    const visitorNameMatch = headerBlock.match(/font_widgetV[^>]*>\s*([^<]+)/);

    // Si no encontramos con font_widget, usar pattern alternativo
    if (localNameMatch) homeTeamName = localNameMatch[1].trim();
    if (visitorNameMatch) awayTeamName = visitorNameMatch[1].trim();

    // Fallback: buscar los nombres en texto grande cerca de los escudos
    if (!homeTeamName || !awayTeamName) {
      // Intentar con strong tags en el header
      const strongNames = [...headerBlock.matchAll(/<strong[^>]*>([^<]{4,40})<\/strong>/g)]
        .map(m => m[1].trim())
        .filter(n => !n.includes('rbitro') && !n.includes('Jornada') && n.length > 3);
      if (!homeTeamName && strongNames.length > 0) homeTeamName = strongNames[0];
      if (!awayTeamName && strongNames.length > 1) awayTeamName = strongNames[1];
    }

    // --- Alineaciones ---
    // La página tiene dos grandes bloques de equipo, cada uno con Titulares y Suplentes
    const parsePlayerTable = (block: string): ActaPlayer[] => {
      const players: ActaPlayer[] = [];
      // Patrón: | dorsal | | nombre |
      const rows = [...block.matchAll(/<tr[^>]*>\s*<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<td[^>]*>\s*([^<]+)\s*<\/td>\s*<\/tr>/g)];
      for (const r of rows) {
        players.push({
          dorsal: parseInt(r[1], 10),
          name: r[2].trim(),
        });
      }
      return players;
    };

    // Dividir HTML en secciones de equipo
    // Buscar bloques de Titulares - hay 4 (2 equipos × local/visitante)
    const titularSections = html.split(/Titulares/);
    const suplenteSections = html.split(/Suplentes/);
    const sustitucionSections = html.split(/Sustituciones/);

    const homeStarters = titularSections.length > 1 ? parsePlayerTable(titularSections[1].substring(0, 3000)) : [];
    const homeSubstitutes = suplenteSections.length > 1 ? parsePlayerTable(suplenteSections[1].substring(0, 3000)) : [];
    const awayStarters = titularSections.length > 2 ? parsePlayerTable(titularSections[2].substring(0, 3000)) : [];
    const awaySubstitutes = suplenteSections.length > 2 ? parsePlayerTable(suplenteSections[2].substring(0, 3000)) : [];

    // --- Sustituciones ---
    const parseSubstitutions = (block: string): ActaSubstitution[] => {
      const subs: ActaSubstitution[] = [];
      // Patrón: playerIn entra por playerOut (min')
      // En la tabla: primera fila = jugador que entra, segunda fila = (min') jugador que sale
      const subPairs = [...block.matchAll(/<tr[^>]*>\s*<td[^>]*>\s*\d+\s*<\/td>\s*<td[^>]*>\s*([^<]+)\s*<\/td>[\s\S]*?<tr[^>]*>\s*<td[^>]*>\s*\d+\s*<\/td>\s*<td[^>]*>\s*\((\d+)'\)\s*([^<]+)\s*<\/td>/g)];
      for (const sp of subPairs) {
        subs.push({
          playerIn: sp[1].trim(),
          minute: sp[2] + "'",
          playerOut: sp[3].trim(),
        });
      }
      return subs;
    };

    const homeSubs = sustitucionSections.length > 1 ? parseSubstitutions(sustitucionSections[1].substring(0, 5000)) : [];
    const awaySubs = sustitucionSections.length > 2 ? parseSubstitutions(sustitucionSections[2].substring(0, 5000)) : [];

    // --- Tarjetas ---
    const parseCards = (block: string): ActaCard[] => {
      const cards: ActaCard[] = [];
      // AMONESTACIONES section
      const yellowSection = block.match(/AMONESTACIONES[\s\S]*?(?=EXPULSIONES|OTRAS|$)/i);
      if (yellowSection && !yellowSection[0].includes('Ninguna')) {
        const yellowPlayers = [...yellowSection[0].matchAll(/([A-ZÁÉÍÓÚÜÑa-záéíóúüñ][^<,]+[a-záéíóúüñA-Z])/g)];
        for (const yp of yellowPlayers) {
          const name = yp[1].trim();
          if (name.length > 3 && name !== 'AMONESTACIONES' && name !== 'Ninguna') {
            cards.push({ type: 'yellow', player: name });
          }
        }
      }
      // EXPULSIONES section
      const redSection = block.match(/EXPULSIONES[\s\S]*?(?=OTRAS|$)/i);
      if (redSection && !redSection[0].includes('Ninguna')) {
        const redPlayers = [...redSection[0].matchAll(/([A-ZÁÉÍÓÚÜÑa-záéíóúüñ][^<,]+[a-záéíóúüñA-Z])/g)];
        for (const rp of redPlayers) {
          const name = rp[1].trim();
          if (name.length > 3 && name !== 'EXPULSIONES' && name !== 'Ninguna') {
            cards.push({ type: 'red', player: name });
          }
        }
      }
      return cards;
    };

    // Las incidencias están al final del HTML
    const incidenciasSection = html.substring(html.lastIndexOf('INCIDENCIAS'));
    const incidenciaParts = incidenciasSection.split(/AMONESTACIONES|EXPULSIONES|OTRAS INCIDENCIAS/i);
    const homeCards = parseCards(incidenciasSection.substring(0, Math.floor(incidenciasSection.length / 2)));
    const awayCards = parseCards(incidenciasSection.substring(Math.floor(incidenciasSection.length / 2)));

    // Entrenador
    const coaches = [...html.matchAll(/Entrenador:[\s\S]*?(?:<[^>]*>)+\s*\n?\s*([A-ZÁÉÍÓÚÜÑa-záéíóúüñ][^<\n]+)/g)].map(m => m[1].trim());
    const homeCoach = coaches[0] || '';
    const awayCoach = coaches[1] || '';

    // Incidencias generales
    const incidents: string[] = [];
    const otherIncMatch = html.match(/OTRAS INCIDENCIAS[\s\S]*?(?=<\/table>|$)/i);
    if (otherIncMatch && !otherIncMatch[0].includes('Ninguna')) {
      const incText = otherIncMatch[0].replace(/<[^>]+>/g, ' ').trim();
      if (incText.length > 25) incidents.push(incText);
    }

    // Extraer nombres de equipo del stadio block como fallback
    const stadiumBlock = html.match(/Estadio:[\s\S]*?Ciudad/i);

    return {
      codActa,
      competition,
      jornada,
      date,
      time,
      stadium,
      city,
      homeTeam: {
        name: homeTeamName,
        logoUrl: homeLogoId ? `https://resultados.rfef.es/pnfg/pimg/Equipos/escudos_nuevos/${homeLogoId}_50x50.png` : '',
        starters: homeStarters,
        substitutes: homeSubstitutes,
        substitutions: homeSubs,
        cards: homeCards,
        coach: homeCoach,
      },
      awayTeam: {
        name: awayTeamName,
        logoUrl: awayLogoId ? `https://resultados.rfef.es/pnfg/pimg/Equipos/escudos_nuevos/${awayLogoId}_50x50.png` : '',
        starters: awayStarters,
        substitutes: awaySubstitutes,
        substitutions: awaySubs,
        cards: awayCards,
        coach: awayCoach,
      },
      score: `${homeScore} - ${awayScore}`,
      homeScore,
      awayScore,
      goals,
      referees,
      incidents,
      fetchedAt: new Date().toISOString(),
    };
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

export const rfefActasService = new RfefActasService();
