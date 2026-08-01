/**
 * @fileoverview Wizard para configurar el equipo desde RapidAPI Football
 * @description Flujo: Liga → Equipo → Preview Jugadores → Importar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  rapidApiFootballService,
  type RapidApiLeague,
  type RapidApiTeam,
  type RapidApiPlayer
} from '@shared/services';
import { rfefService } from '@shared/services/rfefService';
import type { RfefParseResult } from '@shared/services/rfefService';
import { db, setTeamConfig } from '@shared/services/dataService';
import type { StaffMember, CompetitionTeam } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

type WizardStep = 'league' | 'team' | 'preview' | 'importing' | 'done';

interface SquadGroup {
  title: string;
  members: RapidApiPlayer[];
}

interface ImportProgress {
  players: number;
  staff: number;
  teams: number;
  total: number;
}

// ============================================================================
// EQUIPOS DESTACADOS (acceso directo sin RapidAPI)
// ============================================================================

interface FeaturedTeam {
  name: string;
  logoUrl: string;
  rfefUrl: string;
  localidad: string;
  competicion: string;
}

const FEATURED_TEAMS: FeaturedTeam[] = [
  {
    name: 'CD Derio',
    logoUrl: '/logos/cd-derio.png',
    rfefUrl: 'https://rfef.es/es/competiciones/tercera-federacion/equipo/2470/9460',
    localidad: 'Derio',
    competicion: 'Tercera Federación',
  },
  {
    name: 'Portugalete',
    logoUrl: '/logos/portugalete.png',
    rfefUrl: 'https://rfef.es/es/competiciones/tercera-federacion/equipo/2470/2005',
    localidad: 'Portugalete',
    competicion: 'Tercera Federación',
  },
  {
    name: 'SD Leioa',
    logoUrl: '/logos/leioa.png',
    rfefUrl: 'https://rfef.es/es/competiciones/tercera-federacion/equipo/2470/1539',
    localidad: 'Leioa',
    competicion: 'Tercera Federación',
  },
  {
    name: 'Athletic Club',
    logoUrl: '/logos/athletic-club.png',
    rfefUrl: 'https://rfef.es/es/competiciones/primera-division/equipo/1/347',
    localidad: 'Bilbao',
    competicion: 'Primera División',
  },
];

// Helper: convertir jugador RFEF a formato RapidApiPlayer para el preview
const rfefPlayerToRapidApi = (p: import('@shared/services/rfefService').RfefPlayer, result: RfefParseResult): RapidApiPlayer => {
  const categoryMap: Record<string, string> = {
    'Porteros': 'Goalkeeper',
    'Defensas': 'Defender',
    'Medios': 'Midfielder',
    'Delanteros': 'Forward',
  };
  return {
    id: p.id,
    name: p.name,
    shirtNumber: p.dorsal,
    positionCategory: categoryMap[p.position] || 'Midfielder',
    positionIdsDesc: p.positionLabel,
    ccode: p.nationality,
    dateOfBirth: '',
    cname: result.team.name,
  } as RapidApiPlayer;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

// Helper para formatear mensajes de error de la API
const formatApiError = (error: unknown, context: string): string => {
  if (!(error instanceof Error)) {
    return `Error al ${context}`;
  }
  
  const msg = error.message;
  
  // Error de cuota excedida
  if (msg.includes('QUOTA_EXCEEDED')) {
    return '⚠️ Has excedido el límite mensual de la API gratuita. El plan gratuito tiene un límite de peticiones por mes. Espera al próximo mes o actualiza tu plan en RapidAPI.';
  }
  
  // Error de datos no disponibles
  if (msg.includes('API_NO_DATA')) {
    return `⚠️ Esta liga no tiene datos disponibles en la API gratuita. Prueba con otra liga (Premier League suele funcionar).`;
  }
  
  // Error de red
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
    return 'Error de conexión. Verifica tu conexión a internet.';
  }
  
  return `Error al ${context}: ${msg}`;
};

export const TeamSetupWizard: React.FC = () => {
  // Estado del wizard
  const [step, setStep] = useState<WizardStep>('league');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos de la API
  const [leagues, setLeagues] = useState<RapidApiLeague[]>([]);
  const [teams, setTeams] = useState<RapidApiTeam[]>([]);
  const [squad, setSquad] = useState<SquadGroup[]>([]);
  const [coach, setCoach] = useState<RapidApiPlayer | null>(null);

  // Búsqueda / filtrado
  const [leagueSearch, setLeagueSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');

  // Selecciones del usuario
  const [selectedLeague, setSelectedLeague] = useState<RapidApiLeague | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<RapidApiTeam | null>(null);

  // RFEF featured team flow
  const [rfefData, setRfefData] = useState<RfefParseResult | null>(null);
  const [selectedFeatured, setSelectedFeatured] = useState<FeaturedTeam | null>(null);

  // Progreso de importación
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    players: 0, staff: 0, teams: 0, total: 0
  });

  // --------------------------------------------------------------------------
  // PASO 1: Cargar ligas
  // --------------------------------------------------------------------------
  useEffect(() => {
    const loadLeagues = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await rapidApiFootballService.getLeagues();
        setLeagues(data);
      } catch (err) {
        setError(formatApiError(err, 'cargar ligas'));
      } finally {
        setIsLoading(false);
      }
    };
    loadLeagues();
  }, []);

  // --------------------------------------------------------------------------
  // ACCESO RÁPIDO: Seleccionar equipo destacado (vía RFEF)
  // --------------------------------------------------------------------------
  const handleSelectFeatured = useCallback(async (featured: FeaturedTeam) => {
    setSelectedFeatured(featured);
    setSelectedLeague(null);
    setSelectedTeam(null);
    setIsLoading(true);
    setError(null);

    try {
      const result = await rfefService.fetchTeamData(featured.rfefUrl);
      setRfefData(result);

      // Crear pseudo-squad groups para el preview
      const groups: SquadGroup[] = [
        { title: 'Porteros', members: result.players.filter(p => p.position === 'Porteros').map(p => rfefPlayerToRapidApi(p, result)) },
        { title: 'Defensas', members: result.players.filter(p => p.position === 'Defensas').map(p => rfefPlayerToRapidApi(p, result)) },
        { title: 'Mediocampistas', members: result.players.filter(p => p.position === 'Medios').map(p => rfefPlayerToRapidApi(p, result)) },
        { title: 'Delanteros', members: result.players.filter(p => p.position === 'Delanteros').map(p => rfefPlayerToRapidApi(p, result)) },
      ].filter(g => g.members.length > 0);

      setSquad(groups);
      setCoach(null);
      setTeams([]);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener datos del equipo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // PASO 2: Cargar equipos de la liga seleccionada
  // --------------------------------------------------------------------------
  const handleSelectLeague = useCallback(async (league: RapidApiLeague) => {
    setSelectedLeague(league);
    setSelectedTeam(null);
    setSquad([]);
    setCoach(null);
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await rapidApiFootballService.getTeamsByLeague(league.id);
      
      // Si no hay equipos, mostrar mensaje de advertencia
      if (data.length === 0) {
        setError('⚠️ No hay equipos disponibles para esta liga. Los datos de equipos pueden tardar en actualizarse en la API.');
        setIsLoading(false);
        return;
      }
      
      setTeams(data);
      setTeamSearch('');
      setStep('team');
    } catch (err) {
      setError(formatApiError(err, 'cargar equipos'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // PASO 3: Cargar jugadores del equipo seleccionado
  // --------------------------------------------------------------------------
  const handleSelectTeam = useCallback(async (team: RapidApiTeam) => {
    setSelectedTeam(team);
    setIsLoading(true);
    setError(null);
    
    try {
      // Obtener el squad completo usando el servicio
      const players = await rapidApiFootballService.getPlayersByTeam(team.id);
      
      // Agrupar jugadores por posición
      const groups: SquadGroup[] = [
        { title: 'Porteros', members: players.filter(p => p.positionCategory === 'Goalkeeper') },
        { title: 'Defensas', members: players.filter(p => p.positionCategory === 'Defender') },
        { title: 'Mediocampistas', members: players.filter(p => p.positionCategory === 'Midfielder') },
        { title: 'Delanteros', members: players.filter(p => p.positionCategory === 'Forward') },
      ].filter(g => g.members.length > 0);
      
      setSquad(groups);
      
      // Obtener entrenador
      const coachData = await rapidApiFootballService.getCoach(team.id);
      setCoach(coachData);
      
      setStep('preview');
    } catch (err) {
      setError(formatApiError(err, 'cargar jugadores'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // PASO 4: Importar datos a la aplicación
  // --------------------------------------------------------------------------
  const handleImport = useCallback(async () => {
    // Si viene de un equipo destacado (RFEF), usar flujo RFEF
    if (selectedFeatured && rfefData) {
      await handleImportRfef();
      return;
    }
    if (!selectedLeague || !selectedTeam) return;
    
    setStep('importing');
    setError(null);
    
    const allPlayers = squad.flatMap(g => g.members);
    const totalItems = allPlayers.length + (coach ? 1 : 0) + teams.length;
    
    setImportProgress({ players: 0, staff: 0, teams: 0, total: totalItems });
    
    try {
      // 0. Limpiar datos anteriores para evitar mezclas con otras importaciones
      await db.players.clearAll();
      await db.competition_teams.clearAll();
      await db.staff.clearAll();

      // 1. Importar jugadores
      // Solo enviamos los campos que existen en la tabla de Supabase
      const positionMap: Record<string, string> = {
        'Goalkeeper': 'Portero',
        'Defender': 'Defensa',
        'Midfielder': 'Medio',
        'Forward': 'Delantero'
      };
      
      for (let i = 0; i < allPlayers.length; i++) {
        const apiPlayer = allPlayers[i];
        
        // Crear objeto solo con campos que existen en Supabase
        const playerForDb = {
          id: apiPlayer.id,
          nombre: apiPlayer.name,
          dorsal: apiPlayer.shirtNumber || 0,
          posicion: positionMap[apiPlayer.positionCategory || ''] || 'Medio',
          posicionJuego: apiPlayer.positionIdsDesc || '',
          perfil: 'D' as const,
          fechaNacimiento: apiPlayer.dateOfBirth || undefined,
          competicion: selectedLeague.name,
          club: selectedTeam.name,
          equipo: selectedTeam.shortName || selectedTeam.name,
          fotoUrl: `https://images.fotmob.com/image_resources/playerimages/${apiPlayer.id}.png`,
        };
        
        await db.players.upsert(playerForDb);
        setImportProgress(prev => ({ ...prev, players: i + 1 }));
      }
      
      // 2. Importar entrenador
      if (coach) {
        const staffMember: StaffMember = {
          id: coach.id,
          nombre: coach.name,
          primerApellido: '',
          rol: 'Entrenador Principal',
        };
        
        await db.staff.upsert(staffMember);
        setImportProgress(prev => ({ ...prev, staff: 1 }));
      }
      
      // 3. Importar equipos de la liga (para clasificación)
      for (let i = 0; i < teams.length; i++) {
        const apiTeam = teams[i];
        
        const compTeam: CompetitionTeam = {
          id: apiTeam.id,
          nombre: apiTeam.name,
          estadio: apiTeam.venue?.name || 'Por definir',
          localidad: apiTeam.venue?.city || apiTeam.country?.name || selectedLeague.ccode || 'INT',
          logoUrl: apiTeam.logo || `https://images.fotmob.com/image_resources/logo/teamlogo/${apiTeam.id}.png`,
        };
        
        await db.competition_teams.upsert(compTeam);
        setImportProgress(prev => ({ ...prev, teams: i + 1 }));
      }
      
      // 4. Guardar configuración (per-team)
      const teamLogo = selectedTeam.logo || `https://images.fotmob.com/image_resources/logo/teamlogo/${selectedTeam.id}.png`;
      setTeamConfig({
        leagueId: selectedLeague.id,
        leagueName: selectedLeague.name,
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        teamShortName: selectedTeam.shortName || selectedTeam.name,
        teamLogo,
        setupComplete: true,
        importedAt: new Date().toISOString()
      });
      
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error durante la importación');
      setStep('preview');
    }
  }, [selectedLeague, selectedTeam, squad, coach, teams, selectedFeatured, rfefData]);

  // --------------------------------------------------------------------------
  // IMPORTAR DESDE RFEF (equipos destacados)
  // --------------------------------------------------------------------------
  const handleImportRfef = useCallback(async () => {
    if (!rfefData || !selectedFeatured) return;

    setStep('importing');
    setError(null);

    const totalItems = rfefData.players.length;
    setImportProgress({ players: 0, staff: 0, teams: 0, total: totalItems });

    const positionMap: Record<string, string> = {
      'Porteros': 'Portero',
      'Defensas': 'Defensa',
      'Medios': 'Medio',
      'Delanteros': 'Delantero',
    };

    try {
      // 0. Limpiar jugadores y staff anteriores (pero NO competition_teams,
      //    ya que la RFEF solo devuelve datos de 1 equipo y borraría los rivales)
      await db.players.clearAll();
      await db.staff.clearAll();

      // 1. Importar jugadores
      for (let i = 0; i < rfefData.players.length; i++) {
        const p = rfefData.players[i];
        const playerForDb = {
          id: p.id,
          nombre: p.name,
          dorsal: p.dorsal,
          posicion: positionMap[p.position] || 'Medio',
          posicionJuego: p.positionLabel,
          perfil: 'D' as const,
          competicion: rfefData.team.competitionName,
          club: rfefData.team.name,
          equipo: rfefData.team.name,
          fotoUrl: p.photoUrl,
        };
        await db.players.upsert(playerForDb);
        setImportProgress(prev => ({ ...prev, players: i + 1 }));
      }

      // 2. Importar equipo como CompetitionTeam
      const compTeam: CompetitionTeam = {
        id: rfefData.team.id,
        nombre: rfefData.team.name,
        estadio: 'Por definir',
        localidad: selectedFeatured.localidad,
        logoUrl: selectedFeatured.logoUrl,
      };
      await db.competition_teams.upsert(compTeam);
      setImportProgress(prev => ({ ...prev, teams: 1 }));

      // 3. Guardar configuración (per-team)
      setTeamConfig({
        leagueId: rfefData.team.competitionId,
        leagueName: rfefData.team.competitionName,
        teamId: rfefData.team.id,
        teamName: rfefData.team.name,
        teamShortName: rfefData.team.name,
        teamLogo: selectedFeatured.logoUrl,
        setupComplete: true,
        importSource: 'federation',
        importedAt: new Date().toISOString(),
      });

      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error durante la importación');
      setStep('preview');
    }
  }, [rfefData, selectedFeatured]);

  // --------------------------------------------------------------------------
  // NAVEGACIÓN
  // --------------------------------------------------------------------------
  const handleBack = () => {
    if (step === 'team') {
      setStep('league');
      setSelectedLeague(null);
      setTeams([]);
      setTeamSearch('');
    } else if (step === 'preview') {
      setStep('team');
      setSelectedTeam(null);
      setSquad([]);
      setCoach(null);
    }
  };

  const handleRestart = () => {
    setStep('league');
    setSelectedLeague(null);
    setSelectedTeam(null);
    setSelectedFeatured(null);
    setRfefData(null);
    setTeams([]);
    setSquad([]);
    setCoach(null);
    setLeagueSearch('');
    setTeamSearch('');
    setImportProgress({ players: 0, staff: 0, teams: 0, total: 0 });
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <i className="fa-solid fa-futbol text-3xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black">Importar desde RapidAPI</h3>
            <p className="text-white/80 text-sm">
              Configura tu equipo con datos reales de fútbol
            </p>
          </div>
        </div>
        
        {/* Steps indicator */}
        <div className="mt-6 flex items-center gap-2">
          <StepIndicator number={1} label="Liga" active={step === 'league'} completed={!!selectedLeague} />
          <div className="flex-1 h-0.5 bg-white/20"></div>
          <StepIndicator number={2} label="Equipo" active={step === 'team'} completed={!!selectedTeam} />
          <div className="flex-1 h-0.5 bg-white/20"></div>
          <StepIndicator number={3} label="Preview" active={step === 'preview'} completed={step === 'importing' || step === 'done'} />
          <div className="flex-1 h-0.5 bg-white/20"></div>
          <StepIndicator number={4} label="Importar" active={step === 'importing' || step === 'done'} completed={step === 'done'} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full"></div>
          <span className="ml-3 text-slate-600">Cargando...</span>
        </div>
      )}

      {/* EQUIPOS DESTACADOS — Acceso rápido */}
      {step === 'league' && !isLoading && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-2">
            <i className="fa-solid fa-star mr-2 text-amber-500"></i>
            Acceso rápido — Equipos destacados
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            <i className="fa-solid fa-bolt mr-1 text-amber-400"></i>
            Importa directamente desde la RFEF sin necesidad de API key
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {FEATURED_TEAMS.map(ft => (
              <button
                key={ft.rfefUrl}
                onClick={() => handleSelectFeatured(ft)}
                className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 hover:border-amber-500 hover:bg-amber-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <img src={ft.logoUrl} alt={ft.name} className="w-10 h-10 object-contain" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-700 group-hover:text-amber-600 truncate">
                      {ft.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{ft.competicion}</div>
                    <div className="text-[10px] text-slate-400">{ft.localidad}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400 font-medium">o elige desde RapidAPI</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <h4 className="font-bold text-slate-700 mb-2">
            <i className="fa-solid fa-trophy mr-2 text-amber-500"></i>
            Selecciona una Liga
            <span className="ml-2 text-sm font-normal text-slate-400">({leagues.length} ligas)</span>
          </h4>

          {/* Buscador de ligas */}
          <div className="relative mb-4">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              value={leagueSearch}
              onChange={e => setLeagueSearch(e.target.value)}
              placeholder="Buscar liga..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto">
            {leagues
              .filter(l => !leagueSearch || l.name.toLowerCase().includes(leagueSearch.toLowerCase()) || (l.ccode || '').toLowerCase().includes(leagueSearch.toLowerCase()))
              .map(league => (
                <button
                  key={league.id}
                  onClick={() => handleSelectLeague(league)}
                  className="p-4 rounded-xl border-2 border-slate-200 hover:border-[var(--accent)] hover:bg-red-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    {league.logo && (
                      <img src={league.logo} alt="" className="w-10 h-10 object-contain" />
                    )}
                    <div>
                      <div className="font-bold text-sm text-slate-700 group-hover:text-[var(--accent)]">
                        {league.name}
                      </div>
                      <div className="text-xs text-slate-500">{league.ccode}</div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* PASO 2: Seleccionar Equipo */}
      {step === 'team' && !isLoading && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-700">
              <i className="fa-solid fa-shield mr-2 text-blue-500"></i>
              Selecciona tu Equipo
              {selectedLeague && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  en {selectedLeague.name} — {teams.length} equipos
                </span>
              )}
            </h4>
            <button
              onClick={handleBack}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              <i className="fa-solid fa-arrow-left mr-1"></i>
              Volver
            </button>
          </div>

          {/* Buscador de equipos */}
          <div className="relative mb-4">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
              placeholder="Buscar equipo..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {teams
              .filter(t => !teamSearch || t.name.toLowerCase().includes(teamSearch.toLowerCase()) || (t.shortName || '').toLowerCase().includes(teamSearch.toLowerCase()))
              .sort((a, b) => (a.idx ?? 999) - (b.idx ?? 999))
              .map(team => {
                const logoUrl = team.logo || `https://images.fotmob.com/image_resources/logo/teamlogo/${team.id}.png`;
                const hasStandings = team.pts !== undefined || team.played !== undefined;
                return (
                  <button
                    key={team.id}
                    onClick={() => handleSelectTeam(team)}
                    className="p-4 rounded-xl border-2 border-slate-200 hover:border-[var(--accent)] hover:bg-red-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={logoUrl}
                        alt={team.name}
                        className="w-11 h-11 object-contain flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(team.shortName || team.name)}&background=FF5A5F&color=fff&size=44&bold=true`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-700 group-hover:text-[var(--accent)] truncate">
                          {team.name}
                        </div>
                        {hasStandings ? (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {team.idx !== undefined && <span className="font-semibold">{team.idx}º</span>}
                            {team.pts !== undefined && <span> · {team.pts} pts</span>}
                            {team.played !== undefined && (
                              <span className="text-slate-400 ml-1">
                                ({team.wins ?? 0}V {team.draws ?? 0}E {team.losses ?? 0}D)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">{team.shortName || selectedLeague?.ccode || ''}</div>
                        )}
                        {team.scoresStr && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            <i className="fa-solid fa-futbol mr-1"></i>
                            Goles: {team.scoresStr}
                            {team.goalConDiff !== undefined && (
                              <span className={team.goalConDiff >= 0 ? 'text-green-500 ml-1' : 'text-red-500 ml-1'}>
                                ({team.goalConDiff >= 0 ? '+' : ''}{team.goalConDiff})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* PASO 3: Preview de Jugadores */}
      {step === 'preview' && !isLoading && (
        <div className="space-y-4">
          {/* Info del equipo */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {(selectedFeatured?.logoUrl || selectedTeam?.logo) && (
                  <img src={selectedFeatured?.logoUrl || selectedTeam?.logo} alt="" className="w-16 h-16 object-contain" />
                )}
                <div>
                  <h4 className="font-bold text-xl text-slate-700">{selectedFeatured?.name || selectedTeam?.name}</h4>
                  <p className="text-sm text-slate-500">{selectedFeatured?.competicion || selectedLeague?.name}</p>
                </div>
              </div>
              <button
                onClick={handleBack}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                <i className="fa-solid fa-arrow-left mr-1"></i>
                Volver
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-[var(--accent)]">
                  {squad.reduce((sum, g) => sum + g.members.length, 0)}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Jugadores</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-amber-500">
                  {coach ? 1 : 0}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Entrenador</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-blue-500">
                  {teams.length}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Equipos liga</div>
              </div>
            </div>
          </div>

          {/* Entrenador */}
          {coach && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <h5 className="font-bold text-slate-700 mb-3">
                <i className="fa-solid fa-user-tie mr-2 text-amber-500"></i>
                Entrenador
              </h5>
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-lg">
                  {coach.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-700">{coach.name}</div>
                  <div className="text-xs text-slate-500">{coach.cname}</div>
                </div>
              </div>
            </div>
          )}

          {/* Jugadores por posición */}
          {squad.map(group => (
            <div key={group.title} className="p-4 bg-white rounded-2xl border border-slate-200">
              <h5 className="font-bold text-slate-700 mb-3">
                <i className={`fa-solid ${getPositionIcon(group.title)} mr-2 ${getPositionColor(group.title)}`}></i>
                {group.title}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({group.members.length})
                </span>
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {group.members.map(player => (
                  <div key={player.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <img 
                      src={`https://images.fotmob.com/image_resources/playerimages/${player.id}.png`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover bg-slate-200"
                      onError={(e) => { e.currentTarget.src = 'https://i.pravatar.cc/32?u=' + player.id; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs text-slate-700 truncate">{player.name}</div>
                      <div className="text-[10px] text-slate-400">
                        #{player.shirtNumber || '?'} · {player.ccode || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Botón de importar */}
          <button
            onClick={handleImport}
            className="w-full p-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] hover:shadow-lg text-white font-bold rounded-2xl transition-all"
          >
            <i className="fa-solid fa-download mr-2"></i>
            Importar todo a la aplicación
          </button>
        </div>
      )}

      {/* PASO 4: Importando */}
      {step === 'importing' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-4 text-center">
            <i className="fa-solid fa-spinner fa-spin mr-2 text-[var(--accent)]"></i>
            Importando datos...
          </h4>
          
          <div className="space-y-4">
            <ProgressBar 
              label="Jugadores" 
              current={importProgress.players} 
              total={squad.reduce((sum, g) => sum + g.members.length, 0)} 
            />
            <ProgressBar 
              label="Personal" 
              current={importProgress.staff} 
              total={coach ? 1 : 0} 
            />
            <ProgressBar 
              label="Equipos de la liga" 
              current={importProgress.teams} 
              total={teams.length} 
            />
          </div>
        </div>
      )}

      {/* PASO 5: Completado */}
      {step === 'done' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-check text-4xl text-green-500"></i>
          </div>
          <h4 className="font-bold text-xl text-slate-700 mb-2">¡Importación completada!</h4>
          <p className="text-slate-500 mb-6">
            Se han importado {importProgress.players} jugadores, {importProgress.staff} staff y {importProgress.teams} equipos.
          </p>
          
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="px-6 py-2 border-2 border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
            >
              <i className="fa-solid fa-rotate mr-2"></i>
              Importar otro equipo
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-dark)] font-medium"
            >
              <i className="fa-solid fa-home mr-2"></i>
              Ir al Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const StepIndicator: React.FC<{ number: number; label: string; active: boolean; completed: boolean }> = ({
  number, label, active, completed
}) => (
  <div className="flex flex-col items-center">
    <div className={`
      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
      ${completed ? 'bg-green-400 text-white' : active ? 'bg-white text-[var(--accent)]' : 'bg-white/20 text-white/60'}
    `}>
      {completed ? <i className="fa-solid fa-check text-xs"></i> : number}
    </div>
    <span className={`text-[10px] mt-1 ${active ? 'text-white' : 'text-white/60'}`}>{label}</span>
  </div>
);

const ProgressBar: React.FC<{ label: string; current: number; total: number }> = ({
  label, current, total
}) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-400">{current}/{total}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const getPositionIcon = (title: string): string => {
  const icons: Record<string, string> = {
    'Porteros': 'fa-user-shield',
    'Defensas': 'fa-shield-halved',
    'Mediocampistas': 'fa-route',
    'Delanteros': 'fa-futbol'
  };
  return icons[title] || 'fa-user';
};

const getPositionColor = (title: string): string => {
  const colors: Record<string, string> = {
    'Porteros': 'text-cyan-500',
    'Defensas': 'text-red-500',
    'Mediocampistas': 'text-emerald-500',
    'Delanteros': 'text-amber-500'
  };
  return colors[title] || 'text-slate-500';
};

export default TeamSetupWizard;
