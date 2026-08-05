
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';

// Auth
import { useAuth } from '@context/AuthContext';
import { useTeamFilter } from '@context/TeamFilterContext';
import { useTheme } from '@context/ThemeContext';
import { LoginPage } from '@modules/auth';

// Shared
import Sidebar from '@shared/components/Sidebar';
import { Header, BottomNav, HomeSectionsView } from '@shared/components';
import { db, setActiveTeamId, clubesService, usuariosService, equiposService, plantillasService, eventosCalendarioService, personalService } from '@shared/services/dataService';
import type { Usuario, Club as DbClub, Equipo, Jugador, EventoCalendario, Personal } from '@shared/services/dataService';
import { HUESCA_CADETE_A_PLAYERS, HUESCA_JUVENIL_A_PLAYERS } from './data/demo';
import { INITIAL_COMPETITION_TEAMS, HUESCA_CLUBES } from '@shared/constants';

// Modules - Plantilla
import { PlayerTable, EditPlayerModal, BulkPhotoUpload } from '@modules/plantilla';
import type { Player } from '@modules/plantilla';

// Modules - Staff
import { StaffTable, EditStaffModal } from '@modules/staff';
import type { StaffMember } from '@modules/staff';

// Modules - Usuarios
import { UserTable, EditUserModal } from '@modules/usuarios';
import type { User } from '@modules/usuarios';
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
import type { CalendarEvent, EventType } from '@modules/calendario';

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
    const { isDark } = useTheme();
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
  const [clubLoadError, setClubLoadError] = useState<string | null>(null);
  const [clubRetryToken, setClubRetryToken] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!perfil?.club_id) {
      setCurrentTeam(null);
      setClubLoadError('no-club');
      return;
    }
    setClubLoadError(null);
    clubesService.getById(perfil.club_id)
      .then(club => { if (!cancelled) { setCurrentTeam({ id: club.id, name: club.nombre }); setClubLoadError(null); } })
      .catch(err => {
        console.error('[App] Error cargando club activo:', err);
        if (!cancelled) { setCurrentTeam(null); setClubLoadError('fetch-error'); }
      });
    return () => { cancelled = true; };
  }, [perfil?.club_id, clubRetryToken]);

  // Resetear el estado y recargar datos al cambiar de club
  useEffect(() => {
    if (currentTeam) {
      setSquadList([]);
      setUsersList([]);
      setPersonalList([]);
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
  const [showBulkPhotoUpload, setShowBulkPhotoUpload] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Personal | null>(null);
  const [isNewStaff, setIsNewStaff] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<EventType | null>(null);
  const [showNewCampModal, setShowNewCampModal] = useState(false);
  const [activeCampograma, setActiveCampograma] = useState<Campograma | null>(null);

  const [squadList, setSquadList] = useState<Player[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);
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
        localTeamClubId: e.localTeamClubId,
        visitorTeamClubId: e.visitorTeamClubId,
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

  const eventRowToCalendarEvent = (row: EventoCalendario): CalendarEvent => ({
    id: row.id,
    clubId: row.club_id || undefined,
    title: row.title,
    type: row.type,
    date: new Date(row.date),
    time: row.time || '',
    team: row.team || undefined,
    location: row.location || undefined,
    notes: row.notes || undefined,
    videoUrl: row.video_url || undefined,
    docUrl: row.doc_url || undefined,
    staffRoles: row.staff_roles || undefined,
    competition: row.competition || undefined,
    jornada: row.jornada || undefined,
    sessionNumber: row.session_number ?? undefined,
    localTeam: row.local_team || undefined,
    visitorTeam: row.visitor_team || undefined,
    localTeamClubId: row.local_team_club_id || undefined,
    visitorTeamClubId: row.visitor_team_club_id || undefined,
    opponent: row.opponent || undefined,
    score: row.score || undefined,
    status: row.status as CalendarEvent['status'] | undefined,
    tasks: (row.tasks as CalendarEvent['tasks']) || [],
  });

  const calendarEventToRow = (event: CalendarEvent): EventoCalendario => ({
    id: event.id,
    club_id: event.clubId || null,
    title: event.title,
    type: event.type,
    date: event.date instanceof Date ? event.date.toISOString() : event.date,
    time: event.time || null,
    team: event.team || null,
    location: event.location || null,
    notes: event.notes || null,
    video_url: event.videoUrl || null,
    doc_url: event.docUrl || null,
    staff_roles: event.staffRoles || null,
    competition: event.competition || null,
    jornada: event.jornada || null,
    session_number: event.sessionNumber ?? null,
    local_team: event.localTeam || null,
    visitor_team: event.visitorTeam || null,
    local_team_club_id: event.localTeamClubId || null,
    visitor_team_club_id: event.visitorTeamClubId || null,
    opponent: event.opponent || null,
    score: event.score || null,
    status: event.status || null,
    tasks: event.tasks || [],
  });

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
      const [pRes, cRes, uRes, eRes, ctRes, persRes, clRes] = await Promise.all([
        plantillasService.list(),
        db.campogramas.get(),
        usuariosService.list(),
        eventosCalendarioService.list(),
        equiposService.list(),
        personalService.list(),
        clubesService.list(),
      ]);

      // Lookups (equipo_id -> equipo, club_id -> club) para derivar nombres en jugadores
      const equiposById = new Map((ctRes || []).map((e: Equipo) => [String(e.id), e]));
      const clubesByIdForSquad = new Map((clRes || []).map((c: DbClub) => [String(c.id), c]));

      // Usar datos Huesca como fallback solo para escuela-huesca
      const squadFallback = currentTeam?.id === 'escuela-huesca'
        ? [...HUESCA_CADETE_A_PLAYERS, ...HUESCA_JUVENIL_A_PLAYERS]
        : [];
      const mappedSquad: Player[] = (pRes || []).map((p: Jugador): Player => {
        const equipoRow = equiposById.get(String(p.equipo_id));
        const clubRow = equipoRow ? clubesByIdForSquad.get(String(equipoRow.club_id)) : undefined;
        return {
          id: p.id,
          fotoUrl: p.foto_url || '',
          competicion: equipoRow?.competicion || '',
          club: clubRow?.nombre || '',
          equipo: equipoRow?.sub_equipo || equipoRow?.nombre || '',
          dorsal: p.dorsal ?? 0,
          nombre: p.nombre,
          apodo: p.apodo,
          posicion: p.posicion,
          posicionJuego: p.posicion_juego || '',
          perfil: (p.perfil || 'D') as Player['perfil'],
          descripcion: p.descripcion,
          ataque: p.ataque,
          defensa: p.defensa,
          persona: p.persona,
          observaciones: p.observaciones,
          fechaNacimiento: p.fecha_nacimiento,
          partidosJugados: p.partidos_jugados,
          minutos: p.minutos,
          titular: p.titular,
          goles: p.goles,
          ratingTecnica: p.rating_tecnica,
          ratingTactica: p.rating_tactica,
          ratingCondicional: p.rating_condicional,
          ratingPsicologico: p.rating_psicologico,
          ratingHumano: p.rating_humano,
          estado: p.estado,
          etapa: p.etapa,
          enlace: p.enlace,
          nombrePila: p.nombre_pila,
          primerApellido: p.primer_apellido,
          segundoApellido: p.segundo_apellido,
          dni: p.dni,
          telefono: p.telefono,
          correo: p.correo,
          temporada: p.temporada,
          clubId: equipoRow?.club_id,
          equipoId: p.equipo_id,
          nombreCompleto: p.nombre_completo,
          anioNacimiento: p.anio_nacimiento,
          nombreTutor: p.nombre_tutor,
          correoTutor: p.correo_tutor,
          telefonoTutor: p.telefono_tutor,
        };
      });
      setSquadList(mergeWithConstants(mappedSquad, squadFallback, []));
      setCampogramasList(cRes.data || []);

      // Eventos solo desde la BD (cada club tiene sus propios eventos aislados)
      setEventsList((eRes || []).map(eventRowToCalendarEvent));

      // Usuarios desde Supabase (acceso al sistema)
      const users: User[] = (uRes || []).map((u: Usuario): User => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        estado: u.estado,
        departamento: u.rol === 'Tecnico' ? 'Personal' : 'Directiva',
        clubId: u.club_id ?? undefined,
      }));

      setUsersList(users);

      // Cargar personal desde la tabla `personal`
      setPersonalList((persRes as Personal[]) || []);

      // Equipos desde Supabase, con fallback para CD Derio
      const ctFallback = currentTeam?.id === 'cd-derio'
        ? [...INITIAL_COMPETITION_TEAMS]
        : [];
      const mappedTeams: CompetitionTeam[] = (ctRes || []).map((e: Equipo): CompetitionTeam => ({
        id: e.id,
        clubId: e.club_id,
        nombre: e.nombre,
        estadio: e.estadio || '',
        localidad: e.localidad || '',
        logoUrl: e.logo_url || undefined,
        equipo: e.sub_equipo,
        etapa: e.categoria,
        competicion: e.competicion,
        enlace: e.enlace,
      }));
      setCompetitionTeams(mergeWithConstants(mappedTeams, ctFallback, []));

      // Clubes desde Supabase, con fallback para Escuela Huesca
      const clFallback = currentTeam?.id === 'escuela-huesca' ? [...HUESCA_CLUBES] : [];
      const mappedClubes: Club[] = (clRes || []).map((c: DbClub): Club => ({
        id: c.id,
        nombre: c.nombre,
        logoUrl: c.escudo_url || undefined,
        localidad: c.ciudad,
      }));
      setClubesList(mergeWithConstants(mappedClubes, clFallback, []));

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
    setEventsList(prev => {
      const exists = prev.find(e => String(e.id) === eventId);
      if (exists) return prev.map(e => String(e.id) === eventId ? eventWithClub : e);
      return [eventWithClub, ...prev];
    });

    setEditingEvent(null);
    setShowNewModal(false);
    setShowStatus("Guardando...");

    try {
      await eventosCalendarioService.upsert(calendarEventToRow(eventWithClub));
      setShowStatus("Guardado correctamente");
    } catch (err) {
      console.error("Error guardando evento:", err);
      setShowStatus("Error al sincronizar");
    }
    setTimeout(() => setShowStatus(null), 2000);
  };

  const handleSaveEventAndViewReport = async (event: CalendarEvent) => {
    await handleSaveEvent(event);
    if (event.type === 'Partido') {
      navigate(`/partidos/${event.id}`);
    }
  };

  const handleCalendarEventClick = (event: CalendarEvent) => {
    if (event.type === 'Entrenamiento' || event.type === 'Sesión') {
      navigate('/sesiones', { state: { openEventId: event.id } });
    } else if (event.type === 'Partido') {
      handleViewMatchReport(String(event.id));
    } else {
      setEditingEvent(event);
    }
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
    try {
      await eventosCalendarioService.remove(idStr);
    } catch (err) {
      console.error("Error eliminando evento:", err);
    }
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

  // Equipos del propio club (p.ej. para asignar personal): excluye equipos rivales de otros clubes.
  const ownClubCompetitionTeams = useMemo(
    () => competitionTeams
      .filter(team => String(team.clubId ?? '') === String(currentTeam?.id ?? ''))
      .map(team => ({ id: String(team.id), nombre: team.equipo ? `${team.nombre} - ${team.equipo}` : team.nombre })),
    [competitionTeams, currentTeam?.id]
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
        localTeamClubId: e.localTeamClubId,
        visitorTeamClubId: e.visitorTeamClubId,
        time: e.time,
        location: e.location
      } as Match));
  }, [filteredEventsList]);

  // Componente wrapper para Match Report con params
  const MatchReportWrapper = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const match = filteredEventsList.find(e => String(e.id) === matchId);
    if (!match) return <div className="p-20 text-center">{t('app.matchNotFound')}</div>;
    return (
      <MatchReportView
        match={match}
        onBack={() => navigate('/partidos')}
        ownClubId={currentTeam?.id || ''}
        competitionTeams={competitionTeams}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    );
  };

  // Componente de carga
  const LoadingScreen = () => (
    <div className="flex flex-col h-full items-center justify-center py-40 gap-4">
      <i className="fa-solid fa-spinner fa-spin text-5xl text-sport-primary"></i>
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('app.initSystem')}</span>
    </div>
  );

  // Pantalla de error cuando no se puede resolver el club activo (evita spinner infinito)
  const ClubErrorScreen = () => (
    <div className="flex flex-col h-full items-center justify-center py-40 gap-4 text-center px-4">
      <i className="fa-solid fa-triangle-exclamation text-5xl text-amber-500"></i>
      <span className="text-sm font-bold text-slate-300 max-w-md">
        {clubLoadError === 'no-club'
          ? 'Tu usuario no tiene ningún club asignado. Contacta con un administrador.'
          : 'No se ha podido cargar el club activo. Comprueba tu conexión e inténtalo de nuevo.'}
      </span>
      <button
        onClick={() => setClubRetryToken(prev => prev + 1)}
        className="px-4 py-2 rounded-xl bg-sport-primary text-white text-xs font-black uppercase tracking-widest"
      >
        Reintentar
      </button>
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
    <div className={`flex min-h-screen w-full overflow-hidden ${isDark ? 'bg-[var(--surface-0)]' : 'bg-white'}`}>
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
      <main className={`flex-1 min-w-0 flex flex-col min-h-screen overflow-hidden ${isDark ? 'bg-[var(--surface-0)]' : 'bg-white'} transition-all duration-300 ${!hideShellHeader ? 'pt-[72px] md:pt-[80px]' : ''}`}>
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
          {clubLoadError ? <ClubErrorScreen /> : isLoading ? <LoadingScreen /> : (
            <Routes>
              <Route path="/" element={<HomeSectionsView />} />
              <Route path="/plantillas" element={
                <PlayerTable squad={filteredSquadList} allSquad={squadList} clubId={currentTeam?.id || ''} onEdit={setEditingPlayer} onSave={async p => { const toSave = canonicalizePlayer({ ...p, club: p.club || currentTeam?.name || '', clubId: p.clubId || currentTeam?.id || '' }); await db.players.upsert(toSave); setSquadList(prev => { const idx = prev.findIndex(pl => String(pl.id) === String(toSave.id)); if (idx >= 0) return prev.map(pl => String(pl.id) === String(toSave.id) ? toSave : pl); return [toSave, ...prev]; }); }} onDelete={async id => { try { await plantillasService.remove(id); await fetchData(); } catch (e) { alert(e instanceof Error ? e.message : 'Error al eliminar el jugador'); } }} onBulkPhotoUpload={() => setShowBulkPhotoUpload(true)} />
              } />
              <Route path="/staff" element={
                <StaffTable
                  staff={personalList}
                  onEdit={staff => { setIsNewStaff(false); setEditingStaff(staff); }}
                  onDelete={async id => { try { await personalService.remove(id); await fetchData(); } catch (e) { alert(e instanceof Error ? e.message : 'Error al eliminar'); } }}
                  onCreate={() => { const newStaff: Personal = { id: crypto.randomUUID(), nombre: '', cargo: '', club_id: currentTeam?.id || '', telefono: undefined, dni: undefined, foto_url: undefined }; setIsNewStaff(true); setEditingStaff(newStaff); }}
                  clubes={clubesList}
                  userClubId={perfil?.club_id || currentTeam?.id || ''}
                  userRole={userRole}
                />
              } />
              <Route path="/clubes" element={
                <ClubesTable
                  clubes={clubesList}
                  clubId={currentTeam?.id || ''}
                  onEdit={async c => {
                    const exists = clubesList.some(existing => String(existing.id) === String(c.id));
                    const payload = { nombre: c.nombre, escudo_url: c.logoUrl || '', ciudad: c.localidad || undefined };
                    try {
                      if (exists) await clubesService.update(c.id, payload);
                      else await clubesService.create(payload);
                      await fetchData();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : 'Error al guardar el club');
                    }
                  }}
                  onDelete={async id => {
                    try { await clubesService.remove(id); await fetchData(); }
                    catch (e) { alert(e instanceof Error ? e.message : 'Error al eliminar el club'); }
                  }}
                />
              } />
              <Route path="/equipos" element={
                <CompetitionTable
                  teams={filteredCompetitionTeams}
                  clubes={clubesList}
                  clubId={currentTeam?.id || ''}
                  onEdit={async t => {
                    const exists = competitionTeams.some(existing => String(existing.id) === String(t.id));
                    const payload = {
                      club_id: t.clubId ? String(t.clubId) : undefined,
                      nombre: t.nombre,
                      categoria: t.etapa || undefined,
                      competicion: t.competicion || undefined,
                      logo_url: t.logoUrl || '',
                      sub_equipo: t.equipo || undefined,
                      estadio: t.estadio || '',
                      localidad: t.localidad || '',
                      enlace: t.enlace || undefined,
                    };
                    try {
                      if (exists) await equiposService.update(t.id, payload);
                      else await equiposService.create(payload);
                      await fetchData();
                    } catch (e) {
                      const message = (e as { message?: string } | null)?.message;
                      alert(message || 'Error al guardar el equipo');
                    }
                  }}
                  onDelete={async id => {
                    try { await equiposService.remove(id); await fetchData(); }
                    catch (e) { alert(e instanceof Error ? e.message : 'Error al eliminar el equipo'); }
                  }}
                />
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
                      notConvocadoIds={[]}
                      onAssignPlayer={handleAssignPlayer}
                      onRemovePlayer={handleRemovePlayer}
                      onChangeFormation={handleChangeFormation}
                      onToggleConvocado={() => {}}
                      onPlayerSelect={(player) => setEditingPlayer(player)}
                      showStarterBadge={false}
                      showConvocadoControl={false}
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
              <Route path="/disenador" element={<ExerciseDesigner squad={filteredSquadList} />} />
              <Route path="/pizarra" element={<PizarraTactica ownClubId={currentTeam?.id || ''} />} />
              <Route path="/sesiones" element={
                <CalendarView events={filteredEventsList} squad={filteredSquadList} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent} onEditEvent={setEditingEvent} competitionTeams={competitionTeams} ownClubId={currentTeam?.id} />
              } />
              <Route path="/calendario" element={
                <GestionCalendarView events={filteredEventsList} onCreateEvent={() => setShowNewModal(true)} onClickEvent={handleCalendarEventClick} onDeleteEvent={handleDeleteEvent} />
              } />
              <Route path="/partidos" element={
                <LatestMatches
                  matches={filteredMatchesList}
                  onSave={async () => { }}
                  onDelete={handleDeleteEvent}
                  onEdit={(m) => handleViewMatchReport(String(m.id))}
                  onClickMatch={(m) => handleViewMatchReport(String(m.id))}
                  onCreate={() => {
                    setModalDefaultType('Partido');
                    setShowNewModal(true);
                  }}
                  competitionTeams={competitionTeams}
                  clubes={clubesList}
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
                ? <UserTable
                    users={usersList}
                    clubes={clubesList}
                    onEdit={setEditingUser}
                    onDelete={async id => { try { await usuariosService.remove(id); await fetchData(); } catch (e) { alert(e instanceof Error ? e.message : 'Error al eliminar'); } }}
                    onCreate={() => { setIsNewUser(true); setEditingUser({ id: crypto.randomUUID(), nombre: '', email: '', rol: 'Tecnico', estado: 'Activo', departamento: 'Personal' } as User); }}
                    onApprove={async (user, rol) => { try { await usuariosService.update(user.id, { rol, estado: 'Activo' }); await fetchData(); } catch (e) { alert(e instanceof Error ? e.message : 'Error al aprobar'); } }}
                    onReject={async (user) => { try { await usuariosService.update(user.id, { estado: 'Inactivo' }); await fetchData(); } catch (e) { alert(e instanceof Error ? e.message : 'Error al rechazar'); } }}
                    onRefresh={fetchData}
                  />
                : <Navigate to="/" replace />
              } />
              <Route path="/settings" element={userRole === 'Responsable' ? <SettingsPage /> : <Navigate to="/" replace />} />
              <Route path="*" element={<div className="p-20 text-center uppercase font-black text-slate-300">{t('app.pageNotFound')}</div>} />
            </Routes>
          )}
        </div>
        )}
      </main>
      {editingPlayer && <EditPlayerModal
        player={editingPlayer}
        clubId={currentTeam?.id || ''}
        equipos={competitionTeams}
        onClose={() => setEditingPlayer(null)}
        onSave={async (p, originalId) => {
          const toSave = canonicalizePlayer({ ...p, club: p.club || currentTeam?.name || '', clubId: currentTeam?.id || '', competicion: p.competicion || '' }, originalId);
          if (!toSave.equipoId) { alert('Selecciona un equipo antes de guardar.'); return; }
          const payload = {
            equipo_id: String(toSave.equipoId),
            foto_url: toSave.fotoUrl || '',
            dorsal: toSave.dorsal,
            nombre: toSave.nombre,
            posicion: toSave.posicion as Jugador['posicion'],
            posicion_juego: toSave.posicionJuego || undefined,
            perfil: toSave.perfil as Jugador['perfil'],
            fecha_nacimiento: toSave.fechaNacimiento || undefined,
            apodo: toSave.apodo,
            estado: toSave.estado,
            otra_demarcacion: toSave.otraDemarcacion,
            otra_posicion: toSave.otraPosicion,
            descripcion: toSave.descripcion,
            ataque: toSave.ataque,
            defensa: toSave.defensa,
            persona: toSave.persona,
            observaciones: toSave.observaciones,
            rating_tecnica: toSave.ratingTecnica,
            rating_tactica: toSave.ratingTactica,
            rating_condicional: toSave.ratingCondicional,
            rating_psicologico: toSave.ratingPsicologico,
            rating_humano: toSave.ratingHumano,
            partidos_jugados: toSave.partidosJugados,
            minutos: toSave.minutos,
            titular: toSave.titular,
            goles: toSave.goles,
            dni: toSave.dni,
            telefono: toSave.telefono,
            correo: toSave.correo,
            nombre_pila: toSave.nombrePila,
            primer_apellido: toSave.primerApellido,
            segundo_apellido: toSave.segundoApellido,
            nombre_completo: toSave.nombreCompleto,
            anio_nacimiento: toSave.anioNacimiento,
            etapa: toSave.etapa,
            enlace: toSave.enlace,
            temporada: toSave.temporada,
            nombre_tutor: toSave.nombreTutor,
            correo_tutor: toSave.correoTutor,
            telefono_tutor: toSave.telefonoTutor,
          };
          try {
            const exists = squadList.some(existing => String(existing.id) === String(originalId));
            if (exists) await plantillasService.update(String(originalId), payload);
            else await plantillasService.create(payload);
            await fetchData();
            setEditingPlayer(null);
          } catch (e) {
            alert(e instanceof Error ? e.message : 'Error al guardar el jugador');
          }
        }}
      />}
      {showBulkPhotoUpload && <BulkPhotoUpload
        squad={squadList}
        clubId={currentTeam?.id || ''}
        onClose={() => setShowBulkPhotoUpload(false)}
        onUploaded={async (playerId, fotoUrl) => {
          await plantillasService.update(String(playerId), { foto_url: fotoUrl });
          setSquadList(prev => prev.map(pl => String(pl.id) === String(playerId) ? { ...pl, fotoUrl } : pl));
        }}
      />}
      {editingUser && <EditUserModal user={editingUser} isNew={isNewUser} clubId={currentTeam?.id || ''} onClose={() => { setEditingUser(null); setIsNewUser(false); }} onSave={async (u, password) => {
        if (isNewUser) {
          try {
            const result = await authService.createAuthUser(u.email, password || '', u.nombre, {
              rol: u.rol as 'Administrador' | 'Responsable' | 'Tecnico',
              estado: u.estado as 'Activo' | 'Inactivo' | 'Pendiente',
              clubId: u.clubId || currentTeam?.id || null,
            });
            if (!result.success) {
              alert(result.error || 'No se pudo crear el usuario.');
              return;
            }
            await fetchData();
            setEditingUser(null); setIsNewUser(false);
          } catch (e) {
            alert(e instanceof Error ? e.message : 'Error al crear el usuario');
          }
          return;
        }
        try {
          await usuariosService.update(u.id, {
            nombre: u.nombre,
            email: u.email,
            rol: u.rol as Usuario['rol'],
            estado: u.estado as Usuario['estado'],
            club_id: u.clubId || currentTeam?.id || null,
          });
          if (password) {
            const pwResult = await authService.setUserPassword(String(u.id), password);
            if (!pwResult.success) {
              alert(pwResult.error || 'No se pudo actualizar la contraseña.');
              return;
            }
          }
          await fetchData();
          setEditingUser(null); setIsNewUser(false);
        } catch (e) {
          alert(e instanceof Error ? e.message : 'Error al guardar el usuario');
        }
      }} />}
      {editingStaff && <EditStaffModal staff={editingStaff} isNew={isNewStaff} clubId={currentTeam?.id || ''} equipos={ownClubCompetitionTeams} onClose={() => { setEditingStaff(null); setIsNewStaff(false); }} onSave={async (s) => {
        try {
          if (isNewStaff) {
            await personalService.create({
              nombre: s.nombre,
              cargo: s.cargo || '',
              telefono: s.telefono || undefined,
              dni: s.dni || undefined,
              email: (s as any).email || undefined,
              equipo_id: (s as any).equipo_id || undefined,
              foto_url: s.foto_url || undefined,
              club_id: s.club_id || currentTeam?.id || '',
            });
          } else {
            await personalService.update(s.id, {
              nombre: s.nombre,
              cargo: s.cargo || '',
              telefono: s.telefono || undefined,
              dni: s.dni || undefined,
              email: (s as any).email || undefined,
              equipo_id: (s as any).equipo_id || undefined,
              foto_url: s.foto_url || undefined,
            });
          }
          await fetchData();
          setEditingStaff(null);
          setIsNewStaff(false);
        } catch (e) {
          alert(e instanceof Error ? e.message : 'Error al guardar el personal');
        }
      }} />}
      {editingEvent && <NewEventModal editEvent={editingEvent} onClose={() => setEditingEvent(null)} onSave={handleSaveEventAndViewReport} onDelete={handleDeleteEvent} competitionTeams={competitionTeams} ownClubId={currentTeam?.id} />}
      {showNewModal && <NewEventModal initialDate={new Date()} defaultType={modalDefaultType} onClose={() => { setShowNewModal(false); setModalDefaultType(null); }} onSave={handleSaveEventAndViewReport} competitionTeams={competitionTeams} ownClubId={currentTeam?.id} />}
      {showNewCampModal && <NewCampogramaModal onClose={() => setShowNewCampModal(false)} clubName={currentTeam?.name || ''} equipos={[...new Set(competitionTeams.map(t => t.equipo || t.nombre).filter(Boolean))]} onCreate={async d => { const newCamp: Campograma = { id: crypto.randomUUID(), ...d, jugadoresCount: 0, positions: getInitialPositions(d.formacion), club: currentTeam?.name || '', clubId: currentTeam?.id || '' }; await db.campogramas.upsert(newCamp); await fetchData(); setActiveCampograma(newCamp); setShowNewCampModal(false); }} />}
      {showStatus && <div className="fixed left-1/2 -translate-x-1/2 bg-sport-primary text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest shadow-2xl z-1000 border border-red-400/30 animate-fade-in text-center bottom-24 lg:bottom-10">{showStatus}</div>}

    </div>
  );
};

export default App;



