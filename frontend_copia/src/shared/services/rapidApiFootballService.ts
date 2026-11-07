/**
 * @fileoverview Servicio para integración con Free API Live Football Data de RapidAPI
 * @description Obtiene datos de fútbol en vivo y los convierte a tipos de SportManagement
 */

import {
  DEFAULT_RAPIDAPI_CONFIG,
  PRECONFIGURED_LEAGUES
} from './types/rapidApiTypes';

import type {
  RapidApiResponse,
  RapidApiLeague,
  RapidApiTeam,
  RapidApiPlayer,
  RapidApiMatch,
  RapidApiStanding,
  RapidApiStandingsGroup,
  RapidApiSquadGroup,
  RapidApiConfig,
  MappedCompetitionTeam,
  MappedPlayer,
  MappedMatch
} from './types/rapidApiTypes';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const getConfig = (): RapidApiConfig => {
  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY || '';
  const host = import.meta.env.VITE_RAPIDAPI_HOST || DEFAULT_RAPIDAPI_CONFIG.host!;

  return {
    apiKey,
    host,
    baseUrl: `https://${host}`,
    timeout: DEFAULT_RAPIDAPI_CONFIG.timeout
  };
};

// ============================================================================
// CLIENTE HTTP
// ============================================================================

class RapidApiClient {
  private config: RapidApiConfig;
  private abortController: AbortController | null = null;

  constructor() {
    this.config = getConfig();
  }

  private getHeaders(): HeadersInit {
    return {
      'x-rapidapi-key': this.config.apiKey,
      'x-rapidapi-host': this.config.host,
      'Content-Type': 'application/json'
    };
  }

  async fetch<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    // Cancelar petición anterior si existe
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const url = new URL(`${this.config.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.abortController.signal
      });

      // Manejar respuestas de error HTTP
      if (!response.ok) {
        const errorBody = await response.text();

        // Detectar error de cuota excedida
        if (response.status === 429 || errorBody.includes('exceeded') || errorBody.includes('quota')) {
          throw new Error('QUOTA_EXCEEDED: Has excedido el límite mensual de la API gratuita. Actualiza tu plan en RapidAPI.');
        }

        throw new Error(`RapidAPI Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Verificar si la API devuelve status "failed"
      if (data && typeof data === 'object' && 'status' in data) {
        const apiStatus = (data as { status?: string; message?: string }).status;
        const apiMessage = (data as { status?: string; message?: string }).message;

        if (apiStatus === 'failed') {
          throw new Error(`API_NO_DATA: ${apiMessage || 'No hay datos disponibles para esta solicitud'}`);
        }
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Petición cancelada');
      }

      // Detectar error de cuota en el mensaje
      if (error instanceof Error && (error.message.includes('exceeded') || error.message.includes('quota'))) {
        throw new Error('QUOTA_EXCEEDED: Has excedido el límite mensual de la API gratuita. Actualiza tu plan en RapidAPI.');
      }

      throw error;
    }
  }

  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

class RapidApiFootballService {
  private client: RapidApiClient;

  constructor() {
    this.client = new RapidApiClient();
  }

  // --------------------------------------------------------------------------
  // VERIFICACIÓN
  // --------------------------------------------------------------------------

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  async testConnection(): Promise<boolean> {
    try {
      // Intentar obtener ligas como prueba
      await this.getLeagues();
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // LIGAS
  // --------------------------------------------------------------------------

  /**
   * Obtiene las ligas populares
   * GET /football-popular-leagues
   */
  async getLeagues(): Promise<RapidApiLeague[]> {
    const response = await this.client.fetch<RapidApiResponse<{ popular: RapidApiLeague[] }>>('/football-popular-leagues');
    return response.response?.popular || [];
  }

  async getLeagueById(leagueId: number): Promise<RapidApiLeague | null> {
    const leagues = await this.getLeagues();
    return leagues.find(l => l.id === leagueId) || null;
  }

  // --------------------------------------------------------------------------
  // EQUIPOS
  // --------------------------------------------------------------------------

  /** Cache local de equipos por liga para reducir consumo de cuota */
  private teamCache = new Map<number, { teams: RapidApiTeam[]; timestamp: number }>();
  private readonly CACHE_TTL = 1000 * 60 * 60 * 24; // 24 horas

  /**
   * Obtiene todos los equipos de una liga
   * GET /football-get-list-all-team?leagueid=X
   * Incluye logo FotMob CDN auto-generado
   */
  async getTeamsByLeague(leagueId: number, _seasonId?: number): Promise<RapidApiTeam[]> {
    // Comprobar cache
    const cached = this.teamCache.get(leagueId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.teams;
    }

    const response = await this.client.fetch<RapidApiResponse<{ list: RapidApiTeam[] }>>(
      '/football-get-list-all-team',
      { leagueid: leagueId }
    );
    const rawTeams = response.response?.list || [];

    // Enriquecer con logo FotMob CDN si falta
    const teams = rawTeams.map(t => ({
      ...t,
      logo: t.logo || `https://images.fotmob.com/image_resources/logo/teamlogo/${t.id}.png`,
    }));

    // Guardar en cache
    this.teamCache.set(leagueId, { teams, timestamp: Date.now() });
    return teams;
  }

  async getTeamDetails(teamId: number): Promise<RapidApiTeam | null> {
    const response = await this.client.fetch<RapidApiResponse<RapidApiTeam>>(
      '/football-get-team',
      { teamid: teamId }
    );
    return response.data || null;
  }

  // --------------------------------------------------------------------------
  // JUGADORES
  // --------------------------------------------------------------------------

  /**
   * Obtiene la lista de jugadores de un equipo (agrupados por posición)
   * GET /football-get-list-player?teamid=X
   * La respuesta tiene estructura: response.list.squad = [{title, members}, ...]
   */
  async getPlayersByTeam(teamId: number): Promise<RapidApiPlayer[]> {
    interface SquadResponse {
      squad: RapidApiSquadGroup[];
    }

    const response = await this.client.fetch<RapidApiResponse<{ list: SquadResponse }>>(
      '/football-get-list-player',
      { teamid: teamId }
    );

    // Aplanar todos los grupos de jugadores en un solo array
    const squadGroups = response.response?.list?.squad || [];
    const allPlayers: RapidApiPlayer[] = [];

    for (const group of squadGroups) {
      // Excluir el entrenador (coach)
      if (group.title !== 'coach' && group.members) {
        // Añadir la posición basada en el grupo
        const positionCategory = this.mapGroupToPosition(group.title);
        const playersWithPosition = group.members.map(player => ({
          ...player,
          positionCategory
        }));
        allPlayers.push(...playersWithPosition);
      }
    }

    return allPlayers;
  }

  /**
   * Obtiene el entrenador de un equipo
   */
  async getCoach(teamId: number): Promise<RapidApiPlayer | null> {
    interface SquadResponse {
      squad: RapidApiSquadGroup[];
    }

    const response = await this.client.fetch<RapidApiResponse<{ list: SquadResponse }>>(
      '/football-get-list-player',
      { teamid: teamId }
    );

    const squadGroups = response.response?.list?.squad || [];
    const coachGroup = squadGroups.find(g => g.title === 'coach');
    return coachGroup?.members?.[0] || null;
  }

  private mapGroupToPosition(title: string): 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward' | undefined {
    const mapping: Record<string, 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'> = {
      'keepers': 'Goalkeeper',
      'defenders': 'Defender',
      'midfielders': 'Midfielder',
      'attackers': 'Forward'
    };
    return mapping[title];
  }

  /**
   * Obtiene detalles de un jugador
   * GET /football-get-player-detail?playerid=X
   */
  async getPlayerDetails(playerId: number): Promise<RapidApiPlayer | null> {
    const response = await this.client.fetch<RapidApiResponse<RapidApiPlayer>>(
      '/football-get-player-detail',
      { playerid: playerId }
    );
    return response.response || null;
  }

  /**
   * Obtiene el logo/foto de un jugador
   * GET /football-get-player-logo?playerid=X
   */
  async getPlayerLogo(playerId: number): Promise<string | null> {
    try {
      const response = await this.client.fetch<RapidApiResponse<{ url: string }>>(
        '/football-get-player-logo',
        { playerid: playerId }
      );
      return response.response?.url || null;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // PARTIDOS
  // --------------------------------------------------------------------------

  /**
   * NOTA: El endpoint de partidos por liga no está disponible en la API gratuita
   */
  async getMatchesByLeague(_leagueId: number, _seasonId?: number): Promise<RapidApiMatch[]> {
    console.warn('[RapidAPI] Matches by league endpoint no disponible en esta API');
    return [];
  }

  /**
   * NOTA: El endpoint de partidos por equipo no está disponible en la API gratuita
   */
  async getMatchesByTeam(_teamId: number): Promise<RapidApiMatch[]> {
    console.warn('[RapidAPI] Matches by team endpoint no disponible en esta API');
    return [];
  }

  /**
   * NOTA: El endpoint de partidos en vivo no está disponible en la API gratuita
   */
  async getLiveMatches(_leagueId?: number): Promise<RapidApiMatch[]> {
    console.warn('[RapidAPI] Live matches endpoint no disponible en esta API');
    return [];
  }

  async getMatchDetails(matchId: number): Promise<RapidApiMatch | null> {
    const response = await this.client.fetch<RapidApiResponse<RapidApiMatch>>(
      '/football-get-match',
      { matchid: matchId }
    );
    return response.data || null;
  }

  // --------------------------------------------------------------------------
  // CLASIFICACIÓN
  // --------------------------------------------------------------------------

  /**
   * Obtiene la clasificación de una liga
   * NOTA: Este endpoint puede no estar disponible en todas las APIs
   * Se devuelve un array vacío si no está disponible
   */
  async getStandings(_leagueId: number, _seasonId?: number): Promise<RapidApiStandingsGroup[]> {
    // Este endpoint no está disponible en la API gratuita
    // Retornamos un array vacío para evitar errores 404
    console.warn('[RapidAPI] Standings endpoint no disponible en esta API');
    return [];
  }

  // --------------------------------------------------------------------------
  // CONVERSIÓN A TIPOS SPORTMANAGEMENT
  // --------------------------------------------------------------------------

  mapTeamToCompetitionTeam(team: RapidApiTeam): MappedCompetitionTeam {
    return {
      id: team.id,
      nombre: team.name,
      estadio: team.venue?.name || 'Sin estadio',
      localidad: team.venue?.city || team.country?.name || 'Desconocido',
      logoUrl: team.logo
    };
  }

  mapPlayerToSportManagement(
    player: RapidApiPlayer,
    competicion: string,
    club: string
  ): MappedPlayer {
    const positionMap: Record<string, string> = {
      'Goalkeeper': 'Portero',
      'Defender': 'Defensa',
      'Midfielder': 'Medio',
      'Forward': 'Delantero'
    };

    // Determinar posición desde los nuevos campos
    const posCategory = player.positionCategory || player.role?.fallback;
    const positionEs = positionMap[posCategory || ''] || player.position || 'Sin posición';

    return {
      id: player.id,
      fotoUrl: player.photo || `https://i.pravatar.cc/150?u=${player.id}`,
      competicion,
      club,
      equipo: player.team?.name || club,
      dorsal: player.shirtNumber || player.jerseyNumber || 0,
      nombre: player.displayName || player.name,
      posicion: positionEs,
      posicionJuego: player.positionIdsDesc || player.position || 'Sin definir',
      perfil: player.preferredFoot === 'Left' ? 'I' : 'D',
      fechaNacimiento: player.dateOfBirth,
      nacionalidad: player.cname || player.nationality,
      altura: player.height ? `${player.height} cm` : undefined,
      edad: player.age,
      valorMercado: player.transferValue,
      lesionado: player.injured,
      // Estadísticas de la API nueva
      partidosJugados: player.statistics?.appearances,
      minutos: player.statistics?.minutes,
      goles: player.goals ?? player.statistics?.goals,
      asistencias: player.assists ?? player.statistics?.assists,
      tarjetasAmarillas: player.ycards ?? player.statistics?.yellowCards,
      tarjetasRojas: player.rcards ?? player.statistics?.redCards,
      rating: player.rating ?? player.statistics?.rating
    };
  }

  mapMatchToSportManagement(match: RapidApiMatch): MappedMatch {
    const date = new Date(match.startTimestamp * 1000);
    const isFinished = match.status === 'finished';

    return {
      id: match.id,
      competition: match.league.name,
      date: date.toISOString().split('T')[0],
      opponent: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      status: isFinished ? 'Finished' : 'Upcoming',
      score: isFinished
        ? `${match.homeScore?.current ?? 0} - ${match.awayScore?.current ?? 0}`
        : undefined,
      jornada: match.round?.name || `Jornada ${match.round?.round || '?'}`,
      localTeam: match.homeTeam.name,
      visitorTeam: match.awayTeam.name,
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      location: match.venue?.name
    };
  }

  mapStandingToTableRow(standing: RapidApiStanding) {
    return {
      position: standing.position,
      team: standing.team.name,
      teamLogo: standing.team.logo,
      played: standing.played,
      won: standing.wins,
      drawn: standing.draws,
      lost: standing.losses,
      goalsFor: standing.goalsFor,
      goalsAgainst: standing.goalsAgainst,
      goalDifference: standing.goalDifference,
      points: standing.points,
      form: standing.form?.split('') || [],
      promotionType: standing.promotionType
    };
  }

  // --------------------------------------------------------------------------
  // MÉTODOS DE CONVENIENCIA
  // --------------------------------------------------------------------------

  async getLaLigaTeams(): Promise<MappedCompetitionTeam[]> {
    const teams = await this.getTeamsByLeague(PRECONFIGURED_LEAGUES.LA_LIGA.id);
    return teams.map(t => this.mapTeamToCompetitionTeam(t));
  }

  async getLaLigaStandings(): Promise<ReturnType<typeof this.mapStandingToTableRow>[]> {
    const standings = await this.getStandings(PRECONFIGURED_LEAGUES.LA_LIGA.id);
    const mainGroup = standings[0]; // Grupo principal
    if (!mainGroup) return [];

    return mainGroup.rows.map(s => this.mapStandingToTableRow(s));
  }

  async getLaLigaMatches(): Promise<MappedMatch[]> {
    const matches = await this.getMatchesByLeague(PRECONFIGURED_LEAGUES.LA_LIGA.id);
    return matches.map(m => this.mapMatchToSportManagement(m));
  }

  async getTeamSquad(teamId: number, competicion: string, clubName: string): Promise<MappedPlayer[]> {
    const players = await this.getPlayersByTeam(teamId);
    return players.map(p => this.mapPlayerToSportManagement(p, competicion, clubName));
  }

  cancelPendingRequests(): void {
    this.client.cancelRequest();
  }
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

export const rapidApiFootballService = new RapidApiFootballService();

export { PRECONFIGURED_LEAGUES };

export type {
  RapidApiLeague,
  RapidApiTeam,
  RapidApiPlayer,
  RapidApiMatch,
  RapidApiStanding,
  MappedCompetitionTeam,
  MappedPlayer,
  MappedMatch
};
