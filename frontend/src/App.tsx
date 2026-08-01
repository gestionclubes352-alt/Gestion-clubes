
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';

// Auth
import { useAuth } from '@context/AuthContext';
import { useTeamFilter } from '@context/TeamFilterContext';
import { LoginPage } from '@modules/auth';

// Shared
import Sidebar from '@shared/components/Sidebar';
import { Header, BottomNav, HomeSectionsView } from '@shared/components';
import { db, setActiveTeamId, clubesService } from '@shared/services/dataService';
import { HUESCA_CADETE_A_PLAYERS, HUESCA_JUVENIL_A_PLAYERS } from './data/demo';
import { INITIAL_COMPETITION_TEAMS, HUESCA_CLUBES } from '@shared/constants';

// Modules - Plantilla
import { PlayerTable, EditPlayerModal } from '@modules/plantilla';
import type { Player } from '@modules/plantilla';

// Modules - Staff
import { StaffTable } from '@modules/staff';

// Modules - Usuarios
import { UserTable, EditUserModal } from '@modules/usuarios';
import type { User } from '@modules/usuarios';
import { setUserRole } from '@shared/services/roleService';
import { authService } from '@shared/services/authService';

// Modules - Competicion
import { CompetitionTable, LeagueTable } from '@modules/competicion';
import type { CompetitionTeam } from '@modules/competicion';

// Modules - Clubes
import { ClubesTable } from '@modules/clubes';
import type { Club } from '@modules/clubes';

// Modules - Entrenamientos
import { CampogramaGrid, NewCampogramaModal, ExerciseDesigner } from '@modules/entrenamientos';
import type { Campograma } from '@modules/entrenamientos';

// Modules - Repositorio de Tareas
import { TaskRepositoryView } from '@modules/repositorio-tareas';

// Modules - Tactica
import { TacticalBoard, PizarraTactica, getInitialPositions, remapPlayersToFormation } from '@modules/tactica';
import type { TacticalPosition } from '@modules/tactica';

// Modules - Partidos
import { LatestMatches, MatchReportView } from '@modules/partidos';
import type { Match } from '@modules/partidos';

// Modules - Calendario
import { CalendarView, NewEventModal, GestionCalendarView } from '@modules/calendario';
import type { CalendarEvent } from '@modules/calendario';

// Modules - Videoteca
import { Videoteca } from '@modules/videoteca';

// Modules - Medical
import { InjuriesView, MedicalHistoryView, MedicalCheckupsView, RehabilitationView, FitnessView } from '@modules/medical';

// Modules - Settings
import { SettingsPage } from '@modules/settings';

// Modules - AI Mode
import { AIModeView } from '@modules/ai-mode';



// Mapeo de rutas a secciones para el Sidebar
const ROUTE_TO_SECTION: Record<string, string> = {
  '/plantillas': 'PLANTILLAS',
  '/staff': 'PERSONAL',
  '/clubes': 'CLUBES',
  '/equipos': 'EQUIPOS',
  '/campograma': 'CAMPOGRAMA',
  '/disenador': 'DISEÑADOR',
  '/pizarra': 'PIZARRA TÁCTICA',
  '/calendario': 'CALENDARIO',
  '/sesiones': 'SESIONES',
  '/partidos': 'PARTIDOS',
  '/videoteca': 'VIDEOTECA',
  '/competicion': 'COMPETICIÓN',
  '/lesiones': 'LESIONES',
  '/historial-medico': 'HISTORIAL MÉDICO',
  '/reconocimientos': 'RECONOCIMIENTOS',
  '/rehabilitacion': 'REHABILITACIÓN',
  '/rendimiento-fisico': 'RENDIMIENTO FÍSICO',
  '/usuarios': 'USUARIOS',
  '/repositorio-tareas': 'REPOSITORIO DE TAREAS',
  '/settings': 'CONFIGURACIÓN',
  '/settings/datasources': 'FUENTE DE DATOS'
};

const SECTION_TO_ROUTE: Record<string, string> = {
  'PLANTILLAS': '/plantillas',
  'PERSONAL': '/staff',
  'CLUBES': '/clubes',
  'EQUIPOS': '/equipos',
  'CAMPOGRAMA': '/campograma',
  'DISEÑADOR': '/disenador',
  'PIZARRA TÁCTICA': '/pizarra',
  'CALENDARIO': '/calendario',
  'SESIONES': '/sesiones',
  'PARTIDOS': '/partidos',
  'VIDEOTECA': '/videoteca',
  'COMPETICIÓN': '/competicion',
  'LESIONES': '/lesiones',
  'HISTORIAL MÉDICO': '/historial-medico',
  'RECONOCIMIENTOS': '/reconocimientos',
  'REHABILITACIÓN': '/rehabilitacion',
  'RENDIMIENTO FÍSICO': '/rendimiento-fisico',
  'REPOSITORIO DE TAREAS': '/repositorio-tareas',
  'USUARIOS': '/usuarios',
  'CONFIGURACIÓN': '/settings',
  'FUENTE DE DATOS': '/settings#datasources'
};

const normalizeTeamName = (value: string) => value.trim().toLowerCase();
const EXCLUDED_TEAM_FILTER_OPTIONS = new Set(['escuela huesca']);
const matchesSelectedTeams = (teamName: string | undefined, selectedTeams: string[]) => {
  if (!selectedTeams.length) return true;
  if (!teamName) return false;
  const normalized = normalizeTeamName(teamName);
  return selectedTeams.some(team => normalizeTeamName(team) === normalized);
};

const App: React.FC = () => {
  const { t } = useTranslation();
  const { user, perfil, loading: authLoading, perfilLoading, signOut, refreshPerfil } = useAuth();

  // Gate de autenticación: sin sesión → LoginPage; sesión sin perfil activo → pantalla de espera.
  if (authLoading || (user && perfilLoading)) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-slate-950">
        <i className="fa-solid fa-spinner fa-spin text-5xl text-sport-primary"></i>
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('app.loading')}</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!perfil || perfil.estado !== 'Activo') {
    return <PendingApprovalScreen userName={perfil?.nombre || ''} userEmail={user.email || ''} onLogout={() => signOut()} onRefresh={refreshPerfil} />;
  }

  return <MainLayout onLogout={() => signOut()} teamName="" />;
};

// ============================================================================
// PANTALLA DE APROBACIÓN PENDIENTE
// ============================================================================
const PendingApprovalScreen: React.FC<{ userName: string; userEmail: string; onLogout: () => void; onRefresh: () => Promise<void> }> = ({ userName, userEmail, onLogout, onRefresh }) => {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = React.useState(false);
  const [checkMessage, setCheckMessage] = React.useState<string | null>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setCheckMessage(null);
    try {
      await onRefresh();
      // Si después del refresh sigue mostrándose esta pantalla, significa que sigue pendiente
      setCheckMessage(t('pending.stillPending'));
    } catch {
      setCheckMessage(t('pending.verifyError'));
    }
    setIsChecking(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt={t('app.name')} className="h-12 w-auto max-w-full mx-auto mb-4 brightness-0 invert" />
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 border border-slate-700/50 p-8 text-center">
          <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-amber-500/20">
            <i className="fa-solid fa-hourglass-half text-4xl text-amber-400"></i>
          </div>

          <h1 className="text-xl font-black text-slate-100 uppercase tracking-tight mb-2">
            {t('pending.title')}
          </h1>

          <p className="text-sm text-slate-400 mb-6">
            {t('pending.greeting')} <span className="font-bold text-slate-200">{userName}</span>, {t('pending.accountCreatedOk')}
            {t('pending.adminApproval')}
          </p>

          <div className="bg-slate-700/50 rounded-2xl p-4 mb-6 border border-slate-600/50 space-y-2">
            <div className="flex items-center justify-center gap-3 text-sm text-slate-300">
              <i className="fa-solid fa-envelope text-slate-500"></i>
              <span className="font-bold">{userEmail}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="font-bold uppercase tracking-widest">{t('pending.statusPending')}</span>
            </div>
          </div>

          {checkMessage && (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800/50 rounded-xl">
              <span className="text-xs font-bold text-blue-300">{checkMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="w-full py-3.5 rounded-2xl bg-sport-primary text-white font-black text-[11px] uppercase tracking-[0.2em] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl"
            >
              {isChecking ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> {t('pending.verifying')}</>
              ) : (
                <><i className="fa-solid fa-rotate"></i> {t('pending.checkStatus')}</>
              )}
            </button>

            <button
              onClick={onLogout}
              className="w-full py-3 rounded-2xl border-2 border-slate-600 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-700/50 transition-all"
            >
              <i className="fa-solid fa-right-from-bracket mr-2"></i>
              {t('header.logout')}
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em]">
          {t('app.version')}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// LAYOUT PRINCIPAL (contenido original de App, ahora protegido)
// ============================================================================

interface MainLayoutProps {
  onLogout: () => void;
  teamName: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout, teamName }) => {
    const { t } = useTranslation();
    const { perfil } = useAuth();
    const { selectedTeams, setSelectedTeams } = useTeamFilter();
    const userRole = perfil?.rol ?? 'Tecnico';
    // Pantalla completa
    const [isFullscreen, setIsFullscreen] = useState(false);
    useEffect(() => {
      const onChange = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', onChange);
      return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);
    const handleFullscreen = () => {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        elem.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    };
  const navigate = useNavigate();
  const location = useLocation();

  // Club activo: se resuelve directamente desde perfil.club_id (tabla `usuarios`),
  // ya no desde un catálogo estático de equipos demo.
  const [currentTeam, setCurrentTeam] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!perfil?.club_id) { setCurrentTeam(null); return; }
    clubesService.getById(perfil.club_id)
      .then(club => { if (!cancelled) setCurrentTeam({ id: club.id, name: club.nombre }); })
      .catch(err => { console.error('[App] Error cargando club activo:', err); if (!cancelled) setCurrentTeam(null); });
    return () => { cancelled = true; };
  }, [perfil?.club_id]);

  // Resetear el estado y recargar datos al cambiar de club
  useEffect(() => {
    if (currentTeam) {
      setSquadList([]);
      setUsersList([]);
      setCompetitionTeams([]);
      setClubesList([]);
      setCampogramasList([]);
      setEventsList([]);
      setActiveCampograma(null);
      setIsLoading(true);
      fetchData();
    }
  }, [currentTeam?.id]);

  // Derivar la sección activa de la URL
  const activeSection = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'INICIO';
    // Buscar coincidencia exacta primero
    if (ROUTE_TO_SECTION[path]) return ROUTE_TO_SECTION[path];
    // Buscar por prefijo (para rutas como /partidos/:id)
    const baseRoute = Object.keys(ROUTE_TO_SECTION).find(route => 
      route !== '/' && path.startsWith(route)
    );
    return baseRoute ? ROUTE_TO_SECTION[baseRoute] : 'CALENDARIO';
  }, [location.pathname]);

  const handleSectionChange = (section: string) => {
    if (section === 'INICIO') {
      navigate('/');
      return;
    }
    const route = SECTION_TO_ROUTE[section];
    if (route) navigate(route);
  };

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<string | undefined>(undefined);
  const [showNewCampModal, setShowNewCampModal] = useState(false);
  const [activeCampograma, setActiveCampograma] = useState<Campograma | null>(null);

  const [squadList, setSquadList] = useState<Player[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [clubesList, setClubesList] = useState<Club[]>([]);
  const [campogramasList, setCampogramasList] = useState<Campograma[]>([]);
  const [eventsList, setEventsList] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [showStatus, setShowStatus] = useState<string | null>(null);

  const teamFilterOptions = useMemo(() => {
    const values = [
      ...squadList.map(player => player.equipo),
      ...usersList.map(user => (user as any).equipo),
      ...competitionTeams.map(team => team.equipo),
      ...campogramasList.map(campograma => campograma.equipo),
      ...eventsList.map(event => event.team),
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map(value => value.trim())
      .filter(value => !EXCLUDED_TEAM_FILTER_OPTIONS.has(normalizeTeamName(value)));
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'es'));
  }, [squadList, usersList, competitionTeams, campogramasList, eventsList]);

  useEffect(() => {
    if (selectedTeams.length === 0) return;
    const allowed = new Set(teamFilterOptions.map(normalizeTeamName));
    const next = selectedTeams.filter(team => allowed.has(normalizeTeamName(team)));
    if (next.length !== selectedTeams.length) {
      setSelectedTeams(next);
    }
  }, [selectedTeams, setSelectedTeams, teamFilterOptions]);

  useEffect(() => {
    if (!activeCampograma) return;
    if (matchesSelectedTeams(activeCampograma.equipo, selectedTeams)) return;
    setActiveCampograma(null);
  }, [activeCampograma, selectedTeams]);

  const legacyMatchesList = useMemo(() => {
    return eventsList
      .filter(e => e.type === 'Partido')
      .map(e => ({
        id: e.id,
        competition: e.competition || 'Tercera Federaci�n',
        date: e.date instanceof Date ? e.date.toISOString() : String(e.date),
        opponent: e.opponent || 'Rival',
        status: e.status || 'Upcoming',
        score: e.score,
        jornada: e.jornada,
        localTeam: e.localTeam,
        visitorTeam: e.visitorTeam,
        time: e.time,
        location: e.location
      } as Match));
  }, [eventsList]);

  // FUNCI�N CR�TICA: Hidrata los datos para que las fechas sean objetos Date
  const hydrateData = (data: any[]) => {
    return data.map(item => {
      if (item.date) {
        return { ...item, date: new Date(item.date) };
      }
      return item;
    });
  };

  const normalizePlayerId = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');
  const canonicalizePlayer = (player: Player, fallbackId?: string | number): Player => {
    const dni = normalizePlayerId(String(player.dni || ''));
    const baseId = fallbackId !== undefined && fallbackId !== null && String(fallbackId).trim() !== ''
      ? String(fallbackId)
      : String(player.id ?? '');
    return {
      ...player,
      id: dni || baseId,
      dni: dni || undefined,
    };
  };

  const mergeWithConstants = (dbData: any[] = [], constantData: any[] = [], deletedIds: string[] = []) => {
    const map = new Map();
    constantData.forEach(item => {
      const idStr = String(item.id);
      if (!deletedIds.includes(idStr)) map.set(idStr, item);
    });
    dbData.forEach(item => {
      const idStr = String(item.id);
      if (!deletedIds.includes(idStr)) map.set(idStr, item);
    });
    return Array.from(map.values()).sort((a, b) => {
      const idA = String(a.id);
      const idB = String(b.id);
      const numA = Number(idA);
      const numB = Number(idB);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numB - numA;
      return idB.localeCompare(idA);
    });
  };

  const fetchData = async (forceSync = false) => {
    if (forceSync) setIsSyncing(true);

    try {
      const [pRes, cRes, uRes, eRes, ctRes, sRes, clRes] = await Promise.all([
        db.players.get(),
        db.campogramas.get(),
        db.users.get(),
        db.events.get(),
        db.competition_teams.get(),
        db.staff.get(),
        db.clubes.get(),
      ]);

      // Usar datos Huesca como fallback solo para escuela-huesca
      const squadFallback = currentTeam?.id === 'escuela-huesca'
        ? [...HUESCA_CADETE_A_PLAYERS, ...HUESCA_JUVENIL_A_PLAYERS]
        : [];
      const mergedSquad = mergeWithConstants(pRes.data, squadFallback, pRes.deletedIds);
      setSquadList(mergedSquad);

      // Sincronizar jugadores fallback que no existen en Firestore
      if (squadFallback.length > 0) {
        const dbIds = new Set((pRes.data || []).map((p: any) => String(p.id)));
        const missingPlayers = squadFallback.filter(p => !dbIds.has(String(p.id)) && !pRes.deletedIds.includes(String(p.id)));
        if (missingPlayers.length > 0) {
          console.log(`[sync] Sincronizando ${missingPlayers.length} jugadores fallback a Firestore...`);
          await Promise.all(missingPlayers.map(p => db.players.upsert(p)));
        }
      }
      setCampogramasList(cRes.data || []);

      // Eventos solo desde la BD (cada club tiene sus propios eventos aislados)
      setEventsList(hydrateData(eRes.data || []));

      // Migrar staff de Firestore a usuarios (una sola vez)
      let users = uRes.data || [];
      const staffMembers = sRes.data || [];
      if (staffMembers.length > 0) {
        const userNames = new Set(users.map((u: User) => u.nombre.toUpperCase().trim()));
        const newUsers: User[] = [];
        for (const s of staffMembers) {
          if (!userNames.has(String(s.nombre || '').toUpperCase().trim())) {
            const newUser: User = {
              id: crypto.randomUUID(),
              nombre: s.nombre || '',
              email: s.email || '',
              rol: 'Tecnico',
              estado: 'Activo',
              departamento: 'Personal',
              rolTecnico: String(s.rol || '').toUpperCase(),
              telefono: s.telefono || '',
              clubId: currentTeam?.id || '',
            };
            newUsers.push(newUser);
          }
        }
        if (newUsers.length > 0) {
          for (const u of newUsers) {
            await db.users.upsert(u);
          }
          users = [...users, ...newUsers];
          console.log(`[migration] Migrados ${newUsers.length} miembros de staff como usuarios`);
        }
        // Limpiar colección staff tras migrar para evitar re-migración al borrar usuarios
        for (const s of staffMembers) {
          await db.staff.delete(s.id);
        }
        console.log(`[migration] Limpiados ${staffMembers.length} registros de staff tras migración`);
      }

      setUsersList(users);
      // Equipos de competición desde la BD (aislados por club)
      const ctFallback = currentTeam?.id === 'cd-derio'
        ? [...INITIAL_COMPETITION_TEAMS]
        : [];
      setCompetitionTeams(mergeWithConstants(ctRes.data, ctFallback, ctRes.deletedIds));

      // Sincronizar equipos de competición fallback que no existen en Firestore
      if (ctFallback.length > 0) {
        const ctDbIds = new Set((ctRes.data || []).map((t: any) => String(t.id)));
        const missingTeams = ctFallback.filter(t => !ctDbIds.has(String(t.id)));
        if (missingTeams.length > 0) {
          console.log(`[sync] Sincronizando ${missingTeams.length} equipos de competición fallback a Firestore...`);
          await Promise.all(missingTeams.map(t => db.competition_teams.upsert(t)));
        }
      }

      // Clubes desde la BD (aislados por club), con fallback para Escuela Huesca
      const clFallback = currentTeam?.id === 'escuela-huesca' ? [...HUESCA_CLUBES] : [];
      setClubesList(mergeWithConstants(clRes.data, clFallback, clRes.deletedIds));

      // Sincronizar clubes fallback que no existen en Firestore
      if (clFallback.length > 0) {
        const clDbIds = new Set((clRes.data || []).map((c: any) => String(c.id)));
        const missingClubes = clFallback.filter(c => !clDbIds.has(String(c.id)));
        if (missingClubes.length > 0) {
          console.log(`[sync] Sincronizando ${missingClubes.length} clubes fallback a Firestore...`);
          await Promise.all(missingClubes.map(c => db.clubes.upsert(c)));
        }
      }

      if (forceSync) {
        setShowStatus("Sincronizaci�n completa");
        setTimeout(() => setShowStatus(null), 2500);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setShowStatus("Error de conexi�n");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Cargar datos cuando el equipo esté establecido
  // (Ya gestionado en el useEffect unificado de arriba)

  const handleSaveEvent = async (event: CalendarEvent) => {
    const eventId = String(event.id);
    // Estampar siempre el club activo para garantizar aislamiento por equipo
    const eventWithClub: CalendarEvent = {
      ...event,
      team: event.team || currentTeam?.name || '',
      clubId: currentTeam?.id || event.clubId || '',
    };
    const eventToSave = { ...eventWithClub, date: eventWithClub.date instanceof Date ? eventWithClub.date.toISOString() : eventWithClub.date };

    setEventsList(prev => {
      const exists = prev.find(e => String(e.id) === eventId);
      if (exists) return prev.map(e => String(e.id) === eventId ? eventWithClub : e);
      return [eventWithClub, ...prev];
    });

    setEditingEvent(null);
    setShowNewModal(false);
    setShowStatus("Guardando...");

    try {
      await db.events.upsert(eventToSave);
      setShowStatus("Guardado correctamente");
    } catch (err) {
      setShowStatus("Error al sincronizar");
    }
    setTimeout(() => setShowStatus(null), 2000);
  };

  const handleAssignPlayer = async (posId: string, playerId: string | number) => {
    if (!activeCampograma) return;
    const updatedPositions = (activeCampograma.positions || []).map(pos => {
      if (pos.id === posId) {
        const playerIds = pos.playerIds || [];
        if (playerIds.includes(playerId)) return pos;
        return { ...pos, playerIds: [...playerIds, playerId].slice(-3) };
      }
      return pos;
    });
    const updatedCamp = { ...activeCampograma, positions: updatedPositions, jugadoresCount: updatedPositions.reduce((acc, pos) => acc + (pos.playerIds?.length || 0), 0) };
    setActiveCampograma(updatedCamp);
    setCampogramasList(prev => prev.map(c => c.id === updatedCamp.id ? updatedCamp : c));
    await db.campogramas.upsert(updatedCamp);
  };

  const handleRemovePlayer = async (posId: string, playerId: string | number) => {
    if (!activeCampograma) return;
    const updatedPositions = (activeCampograma.positions || []).map(pos => {
      if (pos.id === posId) return { ...pos, playerIds: (pos.playerIds || []).filter(id => id !== playerId) };
      return pos;
    });
    const updatedCamp = { ...activeCampograma, positions: updatedPositions, jugadoresCount: updatedPositions.reduce((acc, pos) => acc + (pos.playerIds?.length || 0), 0) };
    setActiveCampograma(updatedCamp);
    setCampogramasList(prev => prev.map(c => c.id === updatedCamp.id ? updatedCamp : c));
    await db.campogramas.upsert(updatedCamp);
  };

  const handleChangeFormation = async (newForm: string) => {
    if (!activeCampograma) return;
    const nextPositions = getInitialPositions(newForm);
    const remapped = remapPlayersToFormation(activeCampograma.positions || [], nextPositions, 3);
    const updatedCamp = { ...activeCampograma, formacion: newForm, positions: remapped };
    setActiveCampograma(updatedCamp);
    setCampogramasList(prev => prev.map(c => c.id === updatedCamp.id ? updatedCamp : c));
    await db.campogramas.upsert(updatedCamp);
  };

  const handleDeleteEvent = async (id: string | number) => {
    const idStr = String(id);
    if (!window.confirm("�Eliminar definitivamente?")) return;
    setEventsList(prev => prev.filter(e => String(e.id) !== idStr));
    await db.events.delete(idStr);
  };

  const handleGlobalSave = async () => {
    setIsSyncing(true);
    setShowStatus("Sincronizando...");
    try {
      await fetchData(true);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setShowStatus(null), 2000);
    }
  };

  const handleViewMatchReport = (matchId: string) => {
    navigate(`/partidos/${matchId}`);
  };

  const filteredSquadList = useMemo(
    () => squadList.filter(player => matchesSelectedTeams(player.equipo, selectedTeams)),
    [squadList, selectedTeams]
  );

  const filteredUsersList = useMemo(
    () => usersList.filter(user => matchesSelectedTeams((user as any).equipo, selectedTeams)),
    [usersList, selectedTeams]
  );

  const filteredCompetitionTeams = useMemo(
    () => competitionTeams.filter(team => matchesSelectedTeams(team.equipo, selectedTeams)),
    [competitionTeams, selectedTeams]
  );

  const filteredCampogramasList = useMemo(
    () => campogramasList.filter(campograma => matchesSelectedTeams(campograma.equipo, selectedTeams)),
    [campogramasList, selectedTeams]
  );

  const filteredEventsList = useMemo(
    () => eventsList.filter(event => matchesSelectedTeams(event.team, selectedTeams)),
    [eventsList, selectedTeams]
  );

  const filteredMatchesList = useMemo(() => {
    return filteredEventsList
      .filter(e => e.type === 'Partido')
      .map(e => ({
        id: e.id,
        competition: e.competition || 'Tercera Federaciï¿½n',
        date: e.date instanceof Date ? e.date.toISOString() : String(e.date),
        opponent: e.opponent || 'Rival',
        status: e.status || 'Upcoming',
        score: e.score,
        jornada: e.jornada,
        localTeam: e.localTeam,
        visitorTeam: e.visitorTeam,
        time: e.time,
        location: e.location
      } as Match));
  }, [filteredEventsList]);

  // Componente wrapper para Match Report con params
  const MatchReportWrapper = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const match = filteredEventsList.find(e => String(e.id) === matchId);
    if (!match) return <div className="p-20 text-center">{t('app.matchNotFound')}</div>;
    return <MatchReportView match={match} onBack={() => navigate('/partidos')} />;
  };

  // Componente de carga
  const LoadingScreen = () => (
    <div className="flex flex-col h-full items-center justify-center py-40 gap-4">
      <i className="fa-solid fa-spinner fa-spin text-5xl text-sport-primary"></i>
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('app.initSystem')}</span>
    </div>
  );

  // Determinar qué partes del shell global ocultar según la vista
  const isMatchReportView = location.pathname.match(/^\/partidos\/[^/]+$/);
  const isSettingsView = location.pathname.startsWith('/settings');
  const isPizarraView = location.pathname === '/pizarra';
  const hideShellSidebar = isMatchReportView || isSettingsView || isPizarraView;
  const hideShellHeader = isMatchReportView || isSettingsView;

  // Margen dinámico según estado del sidebar
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-white">
      {/* Botón pantalla completa, visible en toda la aplicación */}
      <button
        onClick={handleFullscreen}
        className="fixed top-4 right-4 z-50 bg-white border border-slate-200 shadow-md rounded-full p-2 hover:bg-slate-100 transition"
        title={isFullscreen ? t('app.exitFullscreen') : t('app.fullscreen')}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13H5v4m0 0v-4m0 4h4m6-6h4V5m0 0v4m0-4h-4" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9V5h4m0 0v4m0-4h-4m-6 6v4H5m0 0v-4m0 4h4" /></svg>
        )}
      </button>
      <main className={`flex-1 min-w-0 flex flex-col min-h-screen overflow-hidden bg-white transition-all duration-300 ${!hideShellHeader ? 'pt-[72px] md:pt-[80px]' : ''}`}>
        {!hideShellHeader && (
          <Header
            onMenuClick={() => setIsSidebarOpen(true)}
            showMenuButton={!isAIMode}
            isAIMode={isAIMode}
            onToggleAIMode={() => setIsAIMode(!isAIMode)}
            onLogout={onLogout}
            teamOptions={teamFilterOptions}
          />
        )}
        {isAIMode ? (
          <AIModeView
            context={{
              players: filteredSquadList,
              staff: filteredUsersList.filter(u => u.departamento === 'Personal') as any[],
              events: filteredEventsList,
              teams: filteredCompetitionTeams,
              injuries: [] as any[],
              medicalRecords: [] as any[],
              medicalCheckups: [] as any[],
              rehabPrograms: [] as any[],
              fitnessProfiles: [] as any[],
              campogramas: filteredCampogramasList as any[],
            }}
          />
        ) : (
        <div className={`flex-1 min-h-0 overflow-y-auto w-full ${!hideShellSidebar ? 'px-4 pt-3 pb-24 md:px-6 md:pt-4 md:pb-8 lg:px-12 lg:pt-6 lg:pb-10' : ''} scrollbar-hide`}>
          {isLoading ? <LoadingScreen /> : (
            <Routes>
              <Route path="/" element={<HomeSectionsView />} />
              <Route path="/plantillas" element={
                <PlayerTable squad={filteredSquadList} clubId={currentTeam?.id || ''} onEdit={setEditingPlayer} onSave={async p => { const toSave = canonicalizePlayer({ ...p, club: p.club || currentTeam?.name || '', clubId: currentTeam?.id || '' }); await db.players.upsert(toSave); setSquadList(prev => { const idx = prev.findIndex(pl => String(pl.id) === String(toSave.id)); if (idx >= 0) return prev.map(pl => String(pl.id) === String(toSave.id) ? toSave : pl); return [toSave, ...prev]; }); }} onDelete={async id => { await db.players.delete(id); setSquadList(prev => prev.filter(p => String(p.id) !== String(id))); }} />
              } />
              <Route path="/staff" element={
                <StaffTable staff={filteredUsersList.filter(u => u.departamento === 'Personal')} onEdit={setEditingUser} onDelete={async id => { await db.users.delete(id); await fetchData(); }} onCreate={() => { setIsNewUser(true); setEditingUser({ id: crypto.randomUUID(), nombre: '', email: '', rol: 'Tecnico', estado: 'Activo', departamento: 'Personal', clubId: currentTeam?.id || '' } as User); }} userClubId={perfil?.club_id || currentTeam?.id || ''} userRole={userRole} />
              } />
              <Route path="/clubes" element={
                <ClubesTable clubes={clubesList} clubId={currentTeam?.id || ''} onEdit={async c => { await db.clubes.upsert(c); await fetchData(); }} onDelete={async id => { await db.clubes.delete(id); await fetchData(); }} />
              } />
              <Route path="/equipos" element={
                <CompetitionTable teams={filteredCompetitionTeams} clubes={clubesList} clubId={currentTeam?.id || ''} onEdit={async t => { await db.competition_teams.upsert(t); await fetchData(); }} onDelete={async id => { await db.competition_teams.delete(id); await fetchData(); }} />
              } />
              <Route path="/campograma" element={
                activeCampograma ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setActiveCampograma(null)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-sport-primary transition-all"><i className="fa-solid fa-arrow-left"></i></button>
                        <div><h3 className="text-xl md:text-2xl font-black text-sport-primary uppercase tracking-tighter leading-none">{activeCampograma.nombre}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{activeCampograma.equipo} - {activeCampograma.formacion}</p></div>
                      </div>
                    </div>
                    <TacticalBoard
                      formacion={activeCampograma.formacion}
                      positions={activeCampograma.positions || []}
                      squad={squadList}
                      onAssignPlayer={handleAssignPlayer}
                      onRemovePlayer={handleRemovePlayer}
                      onChangeFormation={handleChangeFormation}
                      onPlayerSelect={(player) => setEditingPlayer(player)}
                    />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <h3 className="text-3xl font-black text-sport-primary uppercase tracking-tighter">{t('app.campogramas')}</h3>
                      <button onClick={() => setShowNewCampModal(true)} className="w-full md:w-auto bg-sport-primary text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl"><i className="fa-solid fa-plus text-lg"></i> {t('app.new')}</button>
                    </div>
                    <CampogramaGrid campogramas={filteredCampogramasList.filter(c => !currentTeam || c.clubId === currentTeam.id || (!c.clubId && c.club === currentTeam.name))} onSelect={setActiveCampograma} onDelete={async id => { await db.campogramas.delete(id); await fetchData(); }} />
                  </div>
                )
              } />
              <Route path="/disenador" element={<ExerciseDesigner />} />
              <Route path="/pizarra" element={<PizarraTactica />} />
              <Route path="/sesiones" element={
                <CalendarView events={filteredEventsList} squad={filteredSquadList} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent} onEditEvent={setEditingEvent} competitionTeams={filteredCompetitionTeams} />
              } />
              <Route path="/calendario" element={
                <GestionCalendarView events={filteredEventsList} squad={filteredSquadList} onCreateEvent={() => setShowNewModal(true)} onClickEvent={setEditingEvent} onDeleteEvent={handleDeleteEvent} onSaveEvent={handleSaveEvent} />
              } />
              <Route path="/partidos" element={
                <LatestMatches
                  matches={filteredMatchesList}
                  onSave={async () => { }}
                  onDelete={handleDeleteEvent}
                  onEdit={(m) => setEditingEvent(filteredEventsList.find(e => String(e.id) === String(m.id)) || null)}
                  onClickMatch={(m) => handleViewMatchReport(String(m.id))}
                  onCreate={() => {
                    setModalDefaultType('Partido');
                    setShowNewModal(true);
                  }}
                />
              } />
              <Route path="/partidos/:matchId" element={<MatchReportWrapper />} />
              <Route path="/videoteca" element={<Videoteca />} />
              <Route path="/competicion" element={
                <LeagueTable teams={filteredCompetitionTeams} />
              } />
              <Route path="/lesiones" element={<InjuriesView />} />
              <Route path="/historial-medico" element={<MedicalHistoryView />} />
              <Route path="/reconocimientos" element={<MedicalCheckupsView />} />
              <Route path="/rehabilitacion" element={<RehabilitationView />} />
              <Route path="/rendimiento-fisico" element={<FitnessView />} />
              <Route path="/repositorio-tareas" element={<TaskRepositoryView />} />
              <Route path="/usuarios" element={userRole !== 'Tecnico'
                ? <UserTable users={usersList} clubId={currentTeam?.id} onEdit={setEditingUser} onDelete={async id => { await db.users.delete(id); await fetchData(); }} onCreate={() => { setIsNewUser(true); setEditingUser({ id: crypto.randomUUID(), nombre: '', email: '', rol: 'Tecnico', estado: 'Activo', departamento: 'Personal' } as User); }} />
                : <Navigate to="/" replace />
              } />
              <Route path="/settings" element={userRole === 'Responsable' ? <SettingsPage /> : <Navigate to="/" replace />} />
              <Route path="*" element={<div className="p-20 text-center uppercase font-black text-slate-300">{t('app.pageNotFound')}</div>} />
            </Routes>
          )}
        </div>
        )}
      </main>
      {editingPlayer && <EditPlayerModal player={editingPlayer} clubId={currentTeam?.id || ''} availableTeams={Array.from(new Set(squadList.map(p => p.equipo).filter(Boolean))).sort()} onClose={() => setEditingPlayer(null)} onSave={async (p, originalId) => { const toSave = canonicalizePlayer({ ...p, club: p.club || currentTeam?.name || '', clubId: currentTeam?.id || '', competicion: p.competicion || currentTeam?.competition || '' }, originalId); if (originalId !== undefined && String(originalId) !== String(toSave.id)) { await db.players.delete(originalId); } await db.players.upsert(toSave); setSquadList(prev => { const filtered = originalId !== undefined && String(originalId) !== String(toSave.id) ? prev.filter(pl => String(pl.id) !== String(originalId)) : prev; const idx = filtered.findIndex(pl => String(pl.id) === String(toSave.id)); if (idx >= 0) return filtered.map(pl => String(pl.id) === String(toSave.id) ? toSave : pl); return [toSave, ...filtered]; }); }} />}
      {editingUser && <EditUserModal user={editingUser} isNew={isNewUser} clubId={currentTeam?.id || ''} onClose={() => { setEditingUser(null); setIsNewUser(false); }} onSave={async (u, password) => {
        if (isNewUser && password) {
          const result = await authService.createAuthUser(u.email, password, u.nombre);
          if (!result.success) { alert(result.error || 'Error al crear cuenta'); return; }
        }
        const userToSave = { ...u, clubId: u.clubId || currentTeam?.id || '' };
        await db.users.upsert(userToSave);
        try { await setUserRole({ email: userToSave.email }, userToSave.rol, userToSave.clubId || currentTeam?.id); } catch (e) { console.warn('[App] No se pudo sincronizar Custom Claim:', e); }
        await fetchData(); setEditingUser(null); setIsNewUser(false);
      }} />}
      {editingEvent && <NewEventModal editEvent={editingEvent} onClose={() => setEditingEvent(null)} onSave={handleSaveEvent} onDelete={handleDeleteEvent} competitionTeams={competitionTeams} />}
      {showNewModal && <NewEventModal initialDate={new Date()} onClose={() => { setShowNewModal(false); setModalDefaultType(undefined); }} onSave={handleSaveEvent} competitionTeams={competitionTeams} />}
      {showNewCampModal && <NewCampogramaModal onClose={() => setShowNewCampModal(false)} clubName={currentTeam?.name || ''} equipos={[...new Set(squadList.map(p => p.equipo).filter(Boolean))]} onCreate={async d => { const newCamp: Campograma = { id: crypto.randomUUID(), ...d, jugadoresCount: 0, positions: getInitialPositions(d.formacion), club: currentTeam?.name || '', clubId: currentTeam?.id || '' }; await db.campogramas.upsert(newCamp); await fetchData(); setActiveCampograma(newCamp); setShowNewCampModal(false); }} />}
      {showStatus && <div className="fixed left-1/2 -translate-x-1/2 bg-sport-primary text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest shadow-2xl z-1000 border border-red-400/30 animate-fade-in text-center bottom-24 lg:bottom-10">{showStatus}</div>}

    </div>
  );
};

export default App;



