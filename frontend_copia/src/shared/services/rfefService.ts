/**
 * @fileoverview Servicio para importar datos de equipos desde la RFEF / BeSoccer
 * @description Parsea widgets de BeSoccer (usados por la RFEF) para extraer
 *              plantilla de jugadores, datos del equipo y estadísticas.
 * 
 * URL de entrada: https://rfef.es/es/competiciones/{competicion}/equipo/{competitionId}/{teamId}
 * Widget real:    https://widgets.besoccerapps.com/scripts/widgets?type=team_info&competition={competitionId}&team={teamId}&style=rfef
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface RfefTeamInfo {
  id: number;
  name: string;
  logoUrl: string;
  competitionId: number;
  competitionName: string;
}

export interface RfefPlayer {
  id: number;
  name: string;
  dorsal: number;
  age: number;
  nationality: string;
  photoUrl: string;
  position: RfefPosition;
  positionLabel: string;
  goals: number;
  yellowCards: number;
  redCards: number;
}

export type RfefPosition = 'Porteros' | 'Defensas' | 'Medios' | 'Delanteros';

export interface RfefParseResult {
  team: RfefTeamInfo;
  players: RfefPlayer[];
  groups: { position: RfefPosition; players: RfefPlayer[] }[];
  totalPlayers: number;
  fetchedAt: string;
}

export interface RfefUrlParts {
  competitionId: number;
  teamId: number;
  competitionSlug: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** En desarrollo usamos proxy de Vite para evitar CORS; en producción, URL directa */
const BESOCCER_WIDGET_BASE = import.meta.env.DEV
  ? '/api/besoccer/scripts/widgets'
  : 'https://widgets.besoccerapps.com/scripts/widgets';
const RFEF_TEAM_LOGO_BASE = 'https://cdn.resfu.com/img_data/equipos';
const RFEF_PLAYER_PHOTO_BASE = 'https://cdn.resfu.com/img_data/players/medium';

/** Mapeo de bi-position-N a nombre de posición */
const POSITION_MAP: Record<string, RfefPosition> = {
  '1': 'Porteros',
  '2': 'Defensas',
  '3': 'Medios',
  '4': 'Delanteros',
};

/** Mapeo de posición RFEF a posición interna de la app */
const POSITION_TO_APP: Record<RfefPosition, string> = {
  'Porteros': 'Portero',
  'Defensas': 'Defensa',
  'Medios': 'Medio',
  'Delanteros': 'Delantero',
};

/** Mapeo de slug de competición a nombre legible */
const COMPETITION_NAMES: Record<string, string> = {
  'tercera-federacion': 'Tercera Federación',
  'segunda-federacion': 'Segunda Federación',
  'primera-federacion': 'Primera Federación',
  'primera-division': 'Primera División',
  'primera-rfef': 'Primera RFEF',
  'segunda-rfef': 'Segunda RFEF',
  'copa-de-sm-el-rey': 'Copa del Rey',
  'liga-hypermotion': 'Liga Hypermotion',
  'laliga': 'LaLiga',
};

// ============================================================================
// PARSER DE URLs
// ============================================================================

/**
 * Extrae IDs de competición y equipo de una URL de la RFEF.
 * Soporta formatos:
 *   - https://rfef.es/es/competiciones/{slug}/equipo/{competitionId}/{teamId}
 *   - IDs directos (competitionId, teamId)
 */
export function parseRfefUrl(url: string): RfefUrlParts | null {
  // Patrón para URL completa de la RFEF
  const rfefPattern = /rfef\.es\/(?:es|eu|en)\/competiciones\/([^/]+)\/equipo\/(\d+)\/(\d+)/;
  const match = url.match(rfefPattern);

  if (match) {
    return {
      competitionSlug: match[1],
      competitionId: parseInt(match[2], 10),
      teamId: parseInt(match[3], 10),
    };
  }

  // Patrón para URL del widget de BeSoccer directamente
  const besoccerPattern = /competition=(\d+).*?team=(\d+)/;
  const bMatch = url.match(besoccerPattern);

  if (bMatch) {
    return {
      competitionSlug: 'desconocida',
      competitionId: parseInt(bMatch[1], 10),
      teamId: parseInt(bMatch[2], 10),
    };
  }

  return null;
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

class RfefService {
  private abortController: AbortController | null = null;

  /**
   * Construye la URL del widget de BeSoccer para un equipo.
   */
  private getWidgetUrl(competitionId: number, teamId: number): string {
    const params = new URLSearchParams({
      type: 'team_info',
      competition: String(competitionId),
      team: String(teamId),
      style: 'rfef',
    });
    return `${BESOCCER_WIDGET_BASE}?${params.toString()}`;
  }

  /**
   * Obtiene el HTML del widget de BeSoccer.
   */
  private async fetchWidgetHtml(competitionId: number, teamId: number): Promise<string> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const url = this.getWidgetUrl(competitionId, teamId);

    const response = await fetch(url, {
      signal: this.abortController.signal,
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al acceder al widget de BeSoccer: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Parsea el HTML del widget para extraer datos del equipo y jugadores.
   */
  private parseWidgetHtml(html: string, urlParts: RfefUrlParts): RfefParseResult {
    // 1. Extraer nombre del equipo
    const teamNameMatch = html.match(/SportsTeam[\s\S]*?itemprop="name"[^>]*>([^<]+)/);
    const teamName = teamNameMatch ? teamNameMatch[1].trim() : 'Equipo desconocido';

    // 2. Extraer jugadores usando schema.org Person markup
    const players: RfefPlayer[] = [];
    
    // Buscar cada fila de jugador (empieza con Person y termina antes del siguiente Person o cierre de tabla)
    const playerPattern = /Person">([\s\S]*?)(?=Person"|<\/tbody>|<\/table>)/g;
    let playerMatch: RegExpExecArray | null;

    while ((playerMatch = playerPattern.exec(html)) !== null) {
      const block = playerMatch[1];
      const player = this.parsePlayerBlock(block);
      if (player) {
        players.push(player);
      }
    }

    // 3. Agrupar por posición
    const positionOrder: RfefPosition[] = ['Porteros', 'Defensas', 'Medios', 'Delanteros'];
    const groups = positionOrder
      .map(pos => ({
        position: pos,
        players: players.filter(p => p.position === pos),
      }))
      .filter(g => g.players.length > 0);

    // 4. Competición
    const competitionName = COMPETITION_NAMES[urlParts.competitionSlug] || urlParts.competitionSlug;

    return {
      team: {
        id: urlParts.teamId,
        name: teamName,
        logoUrl: `${RFEF_TEAM_LOGO_BASE}/${urlParts.teamId}.png`,
        competitionId: urlParts.competitionId,
        competitionName,
      },
      players,
      groups,
      totalPlayers: players.length,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Parsea un bloque HTML de un jugador individual.
   */
  private parsePlayerBlock(block: string): RfefPlayer | null {
    try {
      // Posición: bi-position-{N} con title="..."
      const posMatch = block.match(/bi-position-(\d+).*?title="([^"]*)"/);
      const posKey = posMatch ? posMatch[1] : '3';
      const posLabel = posMatch ? posMatch[2] : 'Medios';
      const position = POSITION_MAP[posKey] || (posLabel as RfefPosition) || 'Medios';

      // ID del jugador (del slug /jugador/nombre-{id})
      const idMatch = block.match(/jugador\/[^"]*?-(\d+)/);
      const id = idMatch ? parseInt(idMatch[1], 10) : Math.floor(Math.random() * 100000);

      // Foto
      const photoMatch = block.match(/players\/medium\/(\d+)\.jpg/);
      const photoId = photoMatch ? photoMatch[1] : String(id);
      const photoUrl = `${RFEF_PLAYER_PHOTO_BASE}/${photoId}.jpg`;

      // Nombre
      const nameMatch = block.match(/itemprop="name">([^<]+)/);
      const name = nameMatch ? nameMatch[1].trim() : 'Desconocido';

      if (name === 'Desconocido') return null;

      // Dorsal y Edad (las primeras 2 columnas class="dat")
      const datMatches = block.match(/<td class="dat"[^>]*>([^<]*)<\/td>/g) || [];
      const datValues = datMatches.map(m => {
        const val = m.match(/>([^<]*)<\/td>/);
        return val ? val[1].trim() : '-';
      });

      const dorsal = datValues[0] && datValues[0] !== '-' ? parseInt(datValues[0], 10) : 0;
      const age = datValues[1] && datValues[1] !== '-' ? parseInt(datValues[1], 10) : 0;

      // Estadísticas (goles, amarillas, rojas) = las siguientes columnas "dat"
      const goals = datValues[2] && datValues[2] !== '-' ? parseInt(datValues[2], 10) : 0;
      const yellowCards = datValues[3] && datValues[3] !== '-' ? parseInt(datValues[3], 10) : 0;
      const redCards = datValues[4] && datValues[4] !== '-' ? parseInt(datValues[4], 10) : 0;

      // Nacionalidad
      const natMatch = block.match(/nationality[\s\S]*?content="([A-Z]{2})"/);
      const nationality = natMatch ? natMatch[1] : 'ES';

      return {
        id,
        name,
        dorsal,
        age,
        nationality,
        photoUrl,
        position,
        positionLabel: posLabel,
        goals,
        yellowCards,
        redCards,
      };
    } catch {
      return null;
    }
  }

  /**
   * Método principal: obtiene y parsea todos los datos de un equipo
   * a partir de una URL de la RFEF o IDs directos.
   */
  async fetchTeamData(urlOrIds: string | { competitionId: number; teamId: number }): Promise<RfefParseResult> {
    let urlParts: RfefUrlParts;

    if (typeof urlOrIds === 'string') {
      const parsed = parseRfefUrl(urlOrIds);
      if (!parsed) {
        throw new Error('URL no válida. Usa el formato: https://rfef.es/es/competiciones/.../equipo/{competitionId}/{teamId}');
      }
      urlParts = parsed;
    } else {
      urlParts = {
        competitionId: urlOrIds.competitionId,
        teamId: urlOrIds.teamId,
        competitionSlug: 'desconocida',
      };
    }

    const html = await this.fetchWidgetHtml(urlParts.competitionId, urlParts.teamId);

    if (!html || html.length < 500) {
      throw new Error('No se pudieron obtener datos del equipo. Verifica que la URL sea correcta.');
    }

    const result = this.parseWidgetHtml(html, urlParts);

    if (result.players.length === 0) {
      throw new Error('No se encontraron jugadores en los datos del equipo. Es posible que la plantilla no esté disponible.');
    }

    return result;
  }

  /**
   * Cancela la petición actual si está en curso.
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Convierte posición RFEF al formato interno de la app.
   */
  static mapPosition(position: RfefPosition): string {
    return POSITION_TO_APP[position] || 'Medio';
  }
}

// Instancia singleton
export const rfefService = new RfefService();
export default rfefService;
