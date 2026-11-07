/**
 * @fileoverview Adaptador MCP para Free API Live Football Data
 * @description Capa de abstracción que permite usar datos de fútbol tanto
 * vía MCP (Model Context Protocol) como vía HTTP directo
 * 
 * Configuración MCP (settings.json o mcp.json):
 * {
 *   "mcpServers": {
 *     "RapidAPI Hub - Free API Live Football Data": {
 *       "command": "npx",
 *       "args": [
 *         "mcp-remote",
 *         "https://mcp.rapidapi.com",
 *         "--header", "x-api-host: free-api-live-football-data.p.rapidapi.com",
 *         "--header", "x-api-key: YOUR_API_KEY"
 *       ]
 *     }
 *   }
 * }
 */

import {
  rapidApiFootballService,
  PRECONFIGURED_LEAGUES,
  type RapidApiLeague,
  type RapidApiTeam,
  type RapidApiMatch,
  type MappedCompetitionTeam,
  type MappedPlayer,
  type MappedMatch
} from './rapidApiFootballService';

// ============================================================================
// TIPOS PARA MCP
// ============================================================================

export type DataSourceMode = 'http' | 'mcp' | 'auto';

export interface MCPFootballConfig {
  mode: DataSourceMode;
  preferredLeagueId: number;
  cacheEnabled: boolean;
  cacheTTL: number; // milisegundos
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// CACHÉ EN MEMORIA
// ============================================================================

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// ADAPTADOR MCP
// ============================================================================

class MCPFootballAdapter {
  private config: MCPFootballConfig;
  private cache: SimpleCache;
  private mcpAvailable: boolean | null = null;

  constructor() {
    this.config = {
      mode: 'auto',
      preferredLeagueId: PRECONFIGURED_LEAGUES.LA_LIGA.id,
      cacheEnabled: true,
      cacheTTL: 5 * 60 * 1000 // 5 minutos
    };
    this.cache = new SimpleCache();
  }

  // --------------------------------------------------------------------------
  // CONFIGURACIÓN
  // --------------------------------------------------------------------------

  setConfig(config: Partial<MCPFootballConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MCPFootballConfig {
    return { ...this.config };
  }

  setPreferredLeague(leagueId: number): void {
    this.config.preferredLeagueId = leagueId;
    this.cache.clear(); // Limpiar caché al cambiar de liga
  }

  /**
   * Resetea el estado de disponibilidad para forzar una nueva verificación
   */
  resetAvailability(): void {
    this.mcpAvailable = null;
    this.cache.clear();
  }

  // --------------------------------------------------------------------------
  // DETECCIÓN MCP
  // --------------------------------------------------------------------------

  /**
   * Detecta si MCP está disponible
   * En un entorno real, esto verificaría si el servidor MCP está corriendo
   * @param forceCheck - Si es true, ignora el caché y vuelve a verificar
   */
  async checkMCPAvailability(forceCheck = false): Promise<boolean> {
    if (!forceCheck && this.mcpAvailable !== null) {
      return this.mcpAvailable;
    }

    try {
      // En un entorno con MCP, esto llamaría a las herramientas MCP
      // Por ahora, verificamos si la API HTTP está configurada y funciona
      this.mcpAvailable = rapidApiFootballService.isConfigured();

      if (this.mcpAvailable) {
        this.mcpAvailable = await rapidApiFootballService.testConnection();
      }
    } catch {
      this.mcpAvailable = false;
    }

    return this.mcpAvailable;
  }

  async getActiveMode(): Promise<'http' | 'mcp' | 'unavailable'> {
    if (this.config.mode === 'mcp') {
      // Modo MCP forzado - verificar disponibilidad
      const available = await this.checkMCPAvailability();
      return available ? 'mcp' : 'unavailable';
    }

    if (this.config.mode === 'http') {
      // Modo HTTP forzado
      return rapidApiFootballService.isConfigured() ? 'http' : 'unavailable';
    }

    // Modo auto: preferir MCP si está disponible
    const mcpAvailable = await this.checkMCPAvailability();
    if (mcpAvailable) return 'mcp';

    return rapidApiFootballService.isConfigured() ? 'http' : 'unavailable';
  }

  // --------------------------------------------------------------------------
  // MÉTODOS DE DATOS CON CACHÉ
  // --------------------------------------------------------------------------

  private async fetchWithCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    const data = await fetcher();

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, data, this.config.cacheTTL);
    }

    return data;
  }

  // --------------------------------------------------------------------------
  // LIGAS
  // --------------------------------------------------------------------------

  async getLeagues(): Promise<RapidApiLeague[]> {
    return this.fetchWithCache('leagues', () =>
      rapidApiFootballService.getLeagues()
    );
  }

  getPreferredLeague(): { id: number; name: string } {
    const league = Object.values(PRECONFIGURED_LEAGUES).find(
      l => l.id === this.config.preferredLeagueId
    );
    return league || PRECONFIGURED_LEAGUES.LA_LIGA;
  }

  // --------------------------------------------------------------------------
  // EQUIPOS
  // --------------------------------------------------------------------------

  async getTeams(leagueId?: number): Promise<MappedCompetitionTeam[]> {
    const targetLeague = leagueId || this.config.preferredLeagueId;
    const cacheKey = `teams_${targetLeague}`;

    return this.fetchWithCache(cacheKey, async () => {
      const teams = await rapidApiFootballService.getTeamsByLeague(targetLeague);
      return teams.map(t => rapidApiFootballService.mapTeamToCompetitionTeam(t));
    });
  }

  async getTeamDetails(teamId: number): Promise<RapidApiTeam | null> {
    const cacheKey = `team_${teamId}`;
    return this.fetchWithCache(cacheKey, () =>
      rapidApiFootballService.getTeamDetails(teamId)
    );
  }

  // --------------------------------------------------------------------------
  // JUGADORES
  // --------------------------------------------------------------------------

  async getSquad(teamId: number): Promise<MappedPlayer[]> {
    const cacheKey = `squad_${teamId}`;

    return this.fetchWithCache(cacheKey, async () => {
      const team = await this.getTeamDetails(teamId);
      const league = this.getPreferredLeague();

      return rapidApiFootballService.getTeamSquad(
        teamId,
        league.name,
        team?.name || 'Equipo'
      );
    });
  }

  // --------------------------------------------------------------------------
  // PARTIDOS
  // --------------------------------------------------------------------------

  async getMatches(leagueId?: number): Promise<MappedMatch[]> {
    const targetLeague = leagueId || this.config.preferredLeagueId;
    const cacheKey = `matches_${targetLeague}`;

    return this.fetchWithCache(cacheKey, async () => {
      const matches = await rapidApiFootballService.getMatchesByLeague(targetLeague);
      return matches.map(m => rapidApiFootballService.mapMatchToSportManagement(m));
    });
  }

  async getTeamMatches(teamId: number): Promise<MappedMatch[]> {
    const cacheKey = `team_matches_${teamId}`;

    return this.fetchWithCache(cacheKey, async () => {
      const matches = await rapidApiFootballService.getMatchesByTeam(teamId);
      return matches.map(m => rapidApiFootballService.mapMatchToSportManagement(m));
    });
  }

  async getLiveMatches(leagueId?: number): Promise<MappedMatch[]> {
    // No cachear partidos en vivo
    const matches = await rapidApiFootballService.getLiveMatches(
      leagueId || this.config.preferredLeagueId
    );
    return matches.map(m => rapidApiFootballService.mapMatchToSportManagement(m));
  }

  // --------------------------------------------------------------------------
  // CLASIFICACIÓN
  // --------------------------------------------------------------------------

  async getStandings(leagueId?: number): Promise<ReturnType<typeof rapidApiFootballService.mapStandingToTableRow>[]> {
    const targetLeague = leagueId || this.config.preferredLeagueId;
    const cacheKey = `standings_${targetLeague}`;

    return this.fetchWithCache(cacheKey, async () => {
      const standings = await rapidApiFootballService.getStandings(targetLeague);
      const mainGroup = standings[0];
      if (!mainGroup) return [];

      return mainGroup.rows.map(s => rapidApiFootballService.mapStandingToTableRow(s));
    });
  }

  // --------------------------------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------------------------------

  clearCache(): void {
    this.cache.clear();
  }

  resetMCPStatus(): void {
    this.mcpAvailable = null;
  }

  cancelPendingRequests(): void {
    rapidApiFootballService.cancelPendingRequests();
  }
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

export const mcpFootballAdapter = new MCPFootballAdapter();
