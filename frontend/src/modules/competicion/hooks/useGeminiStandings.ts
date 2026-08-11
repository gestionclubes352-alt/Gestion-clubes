/**
 * @fileoverview Hook para obtener clasificación real de liga vía Gemini AI
 * @description Gestiona el estado de carga, cache y fallback para standings.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GeminiService } from '@shared/services/geminiService';
import type { GeminiStandingRow, GeminiStandingsResult, GeminiStandingSource } from '@shared/services/geminiService';

export interface UseGeminiStandingsOptions {
  /** Nombre del equipo (ej: "CD Derio") */
  teamName: string;
  /** Nombre de la competición (ej: "Tercera RFEF") */
  competition: string;
  /** Temporada (ej: "2026-2027") */
  season?: string;
  /** Si se habilita la carga automática al montar */
  autoFetch?: boolean;
}

export interface UseGeminiStandingsReturn {
  /** Datos de clasificación */
  standings: GeminiStandingRow[];
  /** Si está cargando datos */
  isLoading: boolean;
  /** Mensaje de error si falló */
  error: string | null;
  /** Fuente de los datos: 'gemini' | 'cache' | 'simulated' | 'error' */
  source: 'gemini' | 'cache' | 'simulated' | 'error' | 'idle';
  /** Refrescar datos (fuerza nueva llamada a Gemini) */
  refresh: () => Promise<void>;
  /** Timestamp de la última actualización */
  lastUpdated: Date | null;
  /** Fuentes de Google Search usadas por Gemini */
  sources: GeminiStandingSource[];
}

/**
 * Hook que obtiene la clasificación real de una liga vía Gemini AI.
 * Cachea en sessionStorage durante 2h para evitar llamadas innecesarias.
 * 
 * @example
 * ```tsx
 * const { standings, isLoading, source, refresh } = useGeminiStandings({
 *   teamName: 'CD Derio',
 *   competition: 'Tercera RFEF',
 * });
 * ```
 */
export const useGeminiStandings = ({
  teamName,
  competition,
  season = '2026-2027',
  autoFetch = true,
}: UseGeminiStandingsOptions): UseGeminiStandingsReturn => {
  const [standings, setStandings] = useState<GeminiStandingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<UseGeminiStandingsReturn['source']>('idle');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sources, setSources] = useState<GeminiStandingSource[]>([]);
  const fetchedRef = useRef(false);

  const fetchStandings = useCallback(async (forceRefresh = false) => {
    if (!teamName || !competition) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: GeminiStandingsResult = await GeminiService.getLeagueStandings(
        teamName,
        competition,
        { forceRefresh, season }
      );

      if (result.source === 'error') {
        setError(result.error ?? 'Error obteniendo clasificación');
        setSource('error');
        setStandings([]);
        setSources([]);
      } else {
        setStandings(result.standings);
        setSource(result.source);
        setLastUpdated(new Date());
        setSources(result.sources ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setSource('error');
    } finally {
      setIsLoading(false);
    }
  }, [teamName, competition, season]);

  // Carga automática al montar (solo una vez por teamName+competition)
  useEffect(() => {
    if (autoFetch && teamName && competition && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchStandings();
    }
  }, [autoFetch, teamName, competition, fetchStandings]);

  // Reset cuando cambia equipo/competición
  useEffect(() => {
    fetchedRef.current = false;
    setStandings([]);
    setSource('idle');
    setError(null);
    setSources([]);
  }, [teamName, competition]);

  const refresh = useCallback(async () => {
    fetchedRef.current = true;
    await fetchStandings(true);
  }, [fetchStandings]);

  return {
    standings,
    isLoading,
    error,
    source,
    refresh,
    lastUpdated,
    sources,
  };
};

export default useGeminiStandings;
