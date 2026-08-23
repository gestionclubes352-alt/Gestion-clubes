import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AttendanceStatus, CalendarEvent, SessionTask } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes/types';
import type { Player } from '@modules/plantilla';
import { db, localidadesService, instalacionesCamposService } from '@shared/services/dataService';
import type { Localidad, InstalacionCampo } from '@shared/services/dataService';
import type { TrainingTask } from '@modules/repositorio-tareas';
import NewEventModal from './NewEventModal';
import SessionTasksPanel from './SessionTasksPanel';
import SessionAttendancePanel from './SessionAttendancePanel';
import SessionAttendanceSummary from './SessionAttendanceSummary';
import { getAttendanceSessionScope, isSelectiveAttendanceSession, normalizeAttendanceForEvent } from '../utils/attendance';
import SearchableSelect from '@shared/components/SearchableSelect';
import MultiSelectFilter from '@shared/components/MultiSelectFilter';
import { getFederationTeamLogo, normalizeFederationTeamName } from '@modules/competicion/data/teamLogos';
// Carga diferida: el informe de partido es la vista más pesada de la app y solo
// se abre al pinchar un partido, así que no debe viajar en el bundle inicial.
const MatchReportView = React.lazy(() => import('@modules/partidos/components/MatchReportView'));

interface CalendarViewProps {
  events: CalendarEvent[];
  squad?: Player[];
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  competitionTeams?: CompetitionTeam[];
  clubes?: Club[];
  ownClubId?: string;
}

const getDefaultTrainingEvent = (events: CalendarEvent[]): CalendarEvent | null => {
  const trainings = events
    .filter(e => e.type === 'Entrenamiento' || e.type === 'Sesión')
    .sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return da.getTime() - db.getTime();
    });
  return trainings[0] ?? null;
};

const CalendarView: React.FC<CalendarViewProps> = ({ events, squad = [], onSaveEvent, onDeleteEvent, onEditEvent, competitionTeams, clubes = [], ownClubId }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNewModal, setShowNewModal] = useState(false);
  const [defaultEventType, setDefaultEventType] = useState<'Sesión' | 'Partido' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [mainTab, setMainTab] = useState<'sesiones' | 'datosSesiones'>('sesiones');
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [sessionTypeFilter, setSessionTypeFilter] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activeTraining, setActiveTraining] = useState<CalendarEvent | null>(null);
  const [activeMatch, setActiveMatch] = useState<CalendarEvent | null>(null);
  const [detailTab, setDetailTab] = useState<'datos' | 'sesion' | 'asistencias'>('datos');
  const [rolesText, setRolesText] = useState('');
  const [notesText, setNotesText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [sessionTasks, setSessionTasks] = useState<SessionTask[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  // Evita que el tab vuelva a "Datos" cuando reabrimos la sesión tras crear una tarea en el diseñador
  const skipDatosResetRef = useRef(false);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [localidadId, setLocalidadId] = useState<string[]>([]);
  const [instalacionId, setInstalacionId] = useState<string[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [instalacionesCampos, setInstalacionesCampos] = useState<InstalacionCampo[]>([]);
  const [editingSessionEvent, setEditingSessionEvent] = useState<CalendarEvent | null>(null);
  const [playerVestColors, setPlayerVestColors] = useState<Record<string | number, { rojo: boolean; azul: boolean; verde: boolean }>>({});
  const [rosterExternalTeamFilter, setRosterExternalTeamFilter] = useState<string[]>([]);
  const [rosterExternalSearch, setRosterExternalSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [locs, insts] = await Promise.all([localidadesService.list(), instalacionesCamposService.list()]);
        setLocalidades(locs || []);
        setInstalacionesCampos(insts || []);
      } catch (err) {
        console.error('Error al cargar localidades e instalaciones:', err);
      }
    })();
  }, []);

  const resolveEventLocationLabel = (ev: CalendarEvent): string | null => {
    const localidad = localidades.find(l => l.id === ev.localidad_id);
    const instalacion = instalacionesCampos.find(i => i.id === ev.instalacion_campo_id);
    const instalacionPrincipal = instalacion?.parent_instalacion_id
      ? instalacionesCampos.find(i => i.id === instalacion.parent_instalacion_id)
      : instalacion;
    const parts = [
      instalacionPrincipal?.nombre,
      instalacion?.parent_instalacion_id ? instalacion.nombre : undefined,
      localidad?.nombre,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const resolveEventInstalacionCampo = (ev: CalendarEvent): { instalacion: string | null; campo: string | null } => {
    const instalacion = instalacionesCampos.find(i => i.id === ev.instalacion_campo_id);
    const instalacionPrincipal = instalacion?.parent_instalacion_id
      ? instalacionesCampos.find(i => i.id === instalacion.parent_instalacion_id)
      : instalacion;
    return {
      instalacion: instalacionPrincipal?.nombre || null,
      campo: instalacion?.parent_instalacion_id ? instalacion.nombre : null,
    };
  };

  const monthNames = t('calendarView.months', { returnObjects: true }) as string[];
  const dayNamesLong = t('calendarView.daysLong', { returnObjects: true }) as string[];
  const orderedDayNamesLong = useMemo(() => [...dayNamesLong.slice(1), dayNamesLong[0]], [dayNamesLong]);

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (vimeoMatch) {
      const id = vimeoMatch[1];
      const hash = vimeoMatch[2];
      return hash ? `https://player.vimeo.com/video/${id}?h=${hash}` : `https://player.vimeo.com/video/${id}`;
    }
    return url;
  };

  const availableTeams = useMemo(() => {
    const teams = new Set<string>();
    competitionTeams
      ?.filter(team => String(team.clubId ?? '') === String(ownClubId ?? ''))
      .forEach(team => {
        const name = (team.equipo || team.nombre || '').trim();
        if (name) teams.add(name);
      });
    return Array.from(teams).sort((a, b) => a.localeCompare(b));
  }, [competitionTeams, ownClubId]);

  const internalTeamNames = useMemo(
    () => new Set(availableTeams.map(team => team.trim().toLowerCase())),
    [availableTeams]
  );

  const clubLogoById = useMemo(() => new Map(clubes.map((club) => [String(club.id), club.logoUrl])), [clubes]);
  const clubNameById = useMemo(() => new Map(clubes.map((club) => [String(club.id), club.nombre])), [clubes]);

  const clubNameByTeamName = useMemo(() => {
    const map = new Map<string, string>();
    const register = (name?: string | null, clubName?: string) => {
      if (!name || !clubName) return;
      map.set(normalizeFederationTeamName(name), clubName);
    };

    competitionTeams?.forEach(team => {
      const clubName = team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined;
      register(team.nombre, clubName);
      register(team.nombreEnFed, clubName);
      register(team.equipo, clubName);
    });

    return map;
  }, [competitionTeams, clubNameById]);

  const clubLogoByTeamName = useMemo(() => {
    const map = new Map<string, string>();
    const register = (name?: string | null, logoUrl?: string) => {
      if (!name || !logoUrl) return;
      map.set(normalizeFederationTeamName(name), logoUrl);
    };

    clubes.forEach(club => {
      register(club.nombre, club.logoUrl || getFederationTeamLogo(club.nombre));
    });
    competitionTeams?.forEach(team => {
      const logoUrl = team.clubId != null
        ? clubLogoById.get(String(team.clubId))
        : undefined;
      register(team.nombre, logoUrl);
      register(team.nombreEnFed, logoUrl);
    });

    return map;
  }, [clubes, competitionTeams, clubLogoById]);

  const resolveTeamLogo = (teamName?: string | null, clubId?: string | null): string | undefined => {
    if (clubId) {
      const clubLogo = clubLogoById.get(String(clubId));
      if (clubLogo) return clubLogo;
    }
    if (!teamName) return undefined;
    return clubLogoByTeamName.get(normalizeFederationTeamName(teamName));
  };

  const findCompetitionTeamForSide = (teamName?: string | null, clubId?: string | null): CompetitionTeam | undefined => {
    const teams = competitionTeams ?? [];
    const key = teamName ? normalizeFederationTeamName(teamName) : '';
    const matchesName = (team: CompetitionTeam) =>
      [team.equipo, team.nombreEnFed, team.nombre].some(value => value && normalizeFederationTeamName(value) === key);

    if (clubId) {
      const teamsByClub = teams.filter(team => String(team.clubId ?? '') === String(clubId));
      const exact = teamsByClub.find(matchesName) || (teamsByClub.length === 1 ? teamsByClub[0] : undefined);
      if (exact) return exact;
    }

    return teams.find(matchesName);
  };

  const resolveMatchSideDisplay = (name: string, clubId?: string) => {
    const team = findCompetitionTeamForSide(name, clubId);
    const clubName =
      (clubId && clubNameById.get(String(clubId))) ||
      clubNameByTeamName.get(normalizeFederationTeamName(name)) ||
      team?.nombre ||
      name;
    const federationName =
      team?.nombreEnFed && normalizeFederationTeamName(team.nombreEnFed) !== normalizeFederationTeamName(clubName)
        ? team.nombreEnFed
        : '';
    const teamName = team?.equipo || team?.etapa || federationName || name;

    return { clubName, teamName };
  };

  const MatchTeamMini: React.FC<{ name: string; clubId?: string }> = ({ name, clubId }) => {
    const logoUrl = resolveTeamLogo(name, clubId);
    const { clubName, teamName } = resolveMatchSideDisplay(name, clubId);
    return (
      <span className="flex min-w-0 flex-col items-center text-center">
        <span className="mb-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/80 shadow-sm ring-1 ring-black/5">
          {logoUrl ? (
            <img loading="lazy" decoding="async" src={logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <i className="fa-solid fa-shield-halved text-[8px] opacity-40"></i>
          )}
        </span>
        <span className="block w-full truncate text-[7px] font-bold uppercase leading-none opacity-60">{clubName}</span>
        <span className="block w-full truncate text-[8px] font-black uppercase leading-tight">{teamName}</span>
      </span>
    );
  };

  const sessionDefaultLabel = t('calendarView.sessionDefault');
  const getSessionTypeLabel = (event: CalendarEvent) => (event.title || event.type || sessionDefaultLabel).trim();
  const getSelectiveSessionPlayerNames = (event: CalendarEvent) => {
    if (!isSelectiveAttendanceSession(event)) return [];

    const attendedIds = new Set(
      Object.entries(event.attendance || {})
        .filter(([, status]) => status === 'Si')
        .map(([playerId]) => String(playerId))
    );

    return squad
      .filter(player => attendedIds.has(String(player.id)))
      .map(player => player.apodo || player.nombre)
      .filter(Boolean);
  };

  const availableSessionTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(e => {
      if ((e.type === 'Entrenamiento' || e.type === 'Sesión') && e.type) {
        types.add(getSessionTypeLabel(e));
      }
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [events, sessionDefaultLabel]);

  const filteredEvents = useMemo(() => {
    const dateFrom = filterDateFrom ? new Date(filterDateFrom) : null;
    const dateTo = filterDateTo ? new Date(filterDateTo) : null;

    return events
      .filter(e => e.type === 'Entrenamiento' || e.type === 'Sesión')
      .filter(e => {
        if (teamFilter.length > 0) return !!e.team && teamFilter.includes(e.team);
        if (availableTeams.length === 0) return true;
        return !!e.team && internalTeamNames.has(e.team.trim().toLowerCase());
      })
      .filter(e => sessionTypeFilter.length === 0 || sessionTypeFilter.includes(getSessionTypeLabel(e)))
      .filter(e => localidadId.length === 0 || (!!e.localidad_id && localidadId.includes(e.localidad_id)))
      .filter(e => instalacionId.length === 0 || (!!e.instalacion_campo_id && instalacionId.includes(e.instalacion_campo_id)))
      .filter(e => {
        const eventDate = e.date instanceof Date ? e.date : new Date(e.date);
        if (monthFilter.length > 0 && !monthFilter.includes(String(eventDate.getMonth()))) return false;
        if (!dateFrom && !dateTo) return true;
        if (dateFrom && eventDate < dateFrom) return false;
        if (dateTo) {
          const dateToEnd = new Date(dateTo);
          dateToEnd.setHours(23, 59, 59, 999);
          if (eventDate > dateToEnd) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        return da.getTime() - db.getTime();
      });
  }, [events, teamFilter, availableTeams, internalTeamNames, sessionTypeFilter, sessionDefaultLabel, monthFilter, filterDateFrom, filterDateTo, localidadId, instalacionId]);

  useEffect(() => {
    const state = location.state as { openEventId?: string; newTaskId?: string; editSessionTaskId?: string } | null;
    const openEventId = state?.openEventId;
    const newTaskId = state?.newTaskId;
    const editSessionTaskId = state?.editSessionTaskId;
    if (!openEventId && !newTaskId) return;

    const applyIncomingState = async () => {
      let target = openEventId ? events.find(e => String(e.id) === String(openEventId)) : activeTraining;
      if (!target) return;

      if (newTaskId) {
        try {
          const { data } = await db.task_templates.get();
          const newTask = (data as TrainingTask[])?.find(t => t.id === newTaskId);
          if (newTask) {
            const existingTask = editSessionTaskId
              ? (target.tasks || []).find(t => t.id === editSessionTaskId)
              : undefined;

            if (existingTask) {
              // Veníamos de editar el dibujo de una tarea ya presente en la sesión: actualizamos su snapshot in situ
              const updatedTask: SessionTask = {
                ...existingTask,
                title: newTask.name,
                category: newTask.category,
                thumbnail: newTask.thumbnail,
                designerSnapshot: newTask.designerSnapshot,
                fieldStructure: newTask.fieldStructure,
              };
              target = {
                ...target,
                tasks: (target.tasks || []).map(t => (t.id === editSessionTaskId ? updatedTask : t)),
              };
            } else {
              const sessionTask: SessionTask = {
                id: `rt-${newTask.id}-${Date.now()}`,
                linkedTaskId: newTask.id,
                title: newTask.name,
                category: newTask.category,
                sessionPhase: 'Parte Principal',
                durationMinutes: 15,
                thumbnail: newTask.thumbnail,
                designerSnapshot: newTask.designerSnapshot,
                fieldStructure: newTask.fieldStructure,
              };
              target = { ...target, tasks: [...(target.tasks || []), sessionTask] };
            }
            // Persistir de inmediato: si el usuario navega fuera sin pulsar "Guardar",
            // los cambios del diseñador no deben perderse.
            onSaveEvent(target);
          }
        } catch (err) {
          console.error('Error al cargar la tarea creada:', err);
        }
      }

      if (newTaskId) {
        skipDatosResetRef.current = true;
      }
      setActiveTraining(target);
      if (newTaskId) {
        setDetailTab('sesion');
      }
    };

    applyIncomingState();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, events, location.pathname, navigate, onSaveEvent]);

  useEffect(() => {
    if (!activeTraining) return;
    if (skipDatosResetRef.current) {
      skipDatosResetRef.current = false;
    } else {
      setDetailTab('datos');
    }
    setRolesText(activeTraining.staffRoles || '');
    setNotesText(activeTraining.notes || '');
    setVideoUrl(activeTraining.videoUrl || '');
    setDocUrl(activeTraining.docUrl || '');
    setSessionTasks(activeTraining.tasks || []);
    setAttendance(activeTraining.attendance || {});
  }, [activeTraining]);

  const handleSaveSession = () => {
    if (!activeTraining) return;
    const playerVestColorsArray = Object.entries(playerVestColors).map(([playerId, colors]) => ({
      playerId: isNaN(Number(playerId)) ? playerId : Number(playerId),
      ...colors,
    }));
    onSaveEvent({
      ...activeTraining,
      notes: notesText,
      videoUrl,
      docUrl,
      staffRoles: rolesText,
      tasks: sessionTasks,
      attendance: normalizeAttendanceForEvent(activeTraining, attendance),
      playerVestColors: playerVestColorsArray.length > 0 ? playerVestColorsArray : undefined
    });
  };

  const formatLongDate = (date: Date) => {
    return `${dayNamesLong[date.getDay()]}, ${date.getDate()} de ${monthNames[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'Partido') {
      setActiveMatch(event);
    } else {
      setActiveTraining(event);
      // Cargar colores de petos de la sesión
      if (event.playerVestColors) {
        const colorsMap: Record<string | number, { rojo: boolean; azul: boolean; verde: boolean }> = {};
        event.playerVestColors.forEach((pvc) => {
          colorsMap[pvc.playerId] = { rojo: pvc.rojo, azul: pvc.azul, verde: pvc.verde };
        });
        setPlayerVestColors(colorsMap);
      } else {
        setPlayerVestColors({});
      }
    }
  };

  const generateUUID = (): string => {
    // Usar crypto.randomUUID si está disponible (navegadores modernos)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback: generar un UUID v4 manualmente
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const duplicateEvent = (event: CalendarEvent, newDate: Date): CalendarEvent => {
    try {
      console.log('Duplicando evento:', event);
      console.log('Nueva fecha:', newDate);

      const duplicated: CalendarEvent = {
        id: generateUUID(),
        title: event.title || 'Sin título',
        type: event.type,
        date: newDate,
        time: event.time || '',
        team: event.team,
        clubId: event.clubId,
        location: event.location,
        notes: event.notes,
        videoUrl: event.videoUrl,
        docUrl: event.docUrl,
        staffRoles: event.staffRoles,
        competition: event.competition,
        jornada: event.jornada,
        sessionNumber: event.sessionNumber,
        localTeam: event.localTeam,
        visitorTeam: event.visitorTeam,
        localTeamClubId: event.localTeamClubId,
        visitorTeamClubId: event.visitorTeamClubId,
        opponent: event.opponent,
        score: event.score,
        status: event.status,
        tasks: [],
        attendance: {}
      };

      console.log('Evento duplicado:', duplicated);
      return duplicated;
    } catch (err) {
      console.error('Error al duplicar evento:', err, event);
      throw new Error(`No se pudo duplicar el evento correctamente: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.preventDefault?.();
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify(event));
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDropEvent = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedEvent) {
      const newEvent = duplicateEvent(draggedEvent, date);
      onSaveEvent(newEvent);
      setDraggedEvent(null);
      setDragOverDate(null);
    }
  };

  // --- CALENDARIO MENSUAL ---
  const getMonthMatrix = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const matrix = [];
    let week = [];
    let day = new Date(firstDay);
    // Rellenar días previos al primer día del mes (semana empieza en lunes)
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < leadingBlanks; i++) {
      week.push(null);
    }
    while (day <= lastDay) {
      week.push(new Date(day));
      if (week.length === 7) {
        matrix.push(week);
        week = [];
      }
      day = new Date(day);
      day.setDate(day.getDate() + 1);
    }
    // Rellenar días restantes de la última semana
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      matrix.push(week);
    }
    return matrix;
  };

  const eventsByDay = useMemo(() => {
    const map = {} as Record<string, CalendarEvent[]>;
    filteredEvents.forEach(ev => {
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // --- FIN CALENDARIO MENSUAL ---

  if (activeMatch) {
    return (
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-sport-primary"></i>
        </div>
      }>
        <MatchReportView
          match={activeMatch}
          onBack={() => setActiveMatch(null)}
          ownClubId={ownClubId}
          competitionTeams={competitionTeams}
          onSave={(event) => { onSaveEvent(event); setActiveMatch(event); }}
          onDelete={(id) => { onDeleteEvent(String(id)); setActiveMatch(null); }}
        />
      </React.Suspense>
    );
  }

  if (activeTraining) {
    const sessionDate = activeTraining.date instanceof Date ? activeTraining.date : new Date(activeTraining.date);
    const sessionPlayers = activeTraining.team ? squad.filter(p => !p.equipo || p.equipo === activeTraining.team) : squad;
    const selectiveAttendance = isSelectiveAttendanceSession(activeTraining);
    const attendanceScope = getAttendanceSessionScope(activeTraining);
    const externalSessionPlayers = activeTraining.team
      ? squad.filter(p => p.equipo && p.equipo !== activeTraining.team)
      : [];
    const allowExternalPlayers = attendanceScope === 'team' || attendanceScope === 'group';
    // Jugadores propios de la sesión (asisten salvo que se marque lo contrario) + externos añadidos explícitamente a la convocatoria
    const vestEligiblePlayers = [
      ...sessionPlayers,
      ...externalSessionPlayers.filter(p => attendance[String(p.id)] === 'Si'),
    ];

    const rosterPositionColors: Record<string, { badge: string; bg: string; border: string; icon: string }> = {
      Portero: { badge: 'bg-red-400', bg: 'bg-red-50', border: 'border-red-100', icon: 'GK' },
      Defensa: { badge: 'bg-emerald-500', bg: 'bg-white', border: 'border-slate-100', icon: 'DF' },
      Centrocampista: { badge: 'bg-blue-500', bg: 'bg-white', border: 'border-slate-100', icon: 'MF' },
      Delantero: { badge: 'bg-red-500', bg: 'bg-white', border: 'border-slate-100', icon: 'ST' },
    };
    const getRosterPositionGroup = (player: Player) => {
      const pos = (player.posicionJuego || player.posicion || '').toLowerCase();
      if (pos.includes('portero') || pos.includes('por') || pos === 'gk') return 'Portero';
      if (pos.includes('defensa') || pos.includes('central') || pos.includes('lateral') || pos.includes('df') || pos === 'dfc') return 'Defensa';
      if (pos.includes('centrocampista') || pos.includes('medio') || pos.includes('mf') || pos === 'mc' || pos.includes('mco') || pos.includes('mcd') || pos.includes('pivote') || pos.includes('mediapunta')) return 'Centrocampista';
      return 'Delantero';
    };
    const rosterPlayers = [...sessionPlayers].sort((a, b) => (a.dorsal ?? 0) - (b.dorsal ?? 0));
    const getRosterStatus = (player: Player) => {
      const playerId = String(player.id);
      return selectiveAttendance ? (attendance[playerId] || '') : (attendance[playerId] || 'Si');
    };
    const attendingRosterPlayers = rosterPlayers.filter(p => getRosterStatus(p) === 'Si');
    const notCalledRosterPlayers = rosterPlayers.filter(p => getRosterStatus(p) !== 'Si');
    const groupedRoster = ['Portero', 'Defensa', 'Centrocampista', 'Delantero']
      .map(group => [group, attendingRosterPlayers.filter(p => getRosterPositionGroup(p) === group)] as const)
      .filter(([, players]) => players.length > 0);

    const rosterAvailableExternalPlayers = externalSessionPlayers.filter(p => !attendance[String(p.id)]);
    const rosterExternalTeams = Array.from(new Set(rosterAvailableExternalPlayers.map(p => p.equipo).filter(Boolean) as string[])).sort();
    const rosterFilteredExternalPlayers = rosterAvailableExternalPlayers.filter(p => {
      if (rosterExternalTeamFilter.length > 0 && !rosterExternalTeamFilter.includes(p.equipo || '')) return false;
      const query = rosterExternalSearch.trim().toLowerCase();
      if (query && !p.nombre.toLowerCase().includes(query)) return false;
      return true;
    });

    return (
      <div className="animate-fade-in space-y-3 h-full flex flex-col relative pb-10">
        <div className="space-y-2">
          <div className="flex justify-center">
            <button onClick={handleSaveSession} className="bg-[#1a4f9c] hover:bg-[#143e7b] text-white px-6 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
              <i className="fa-solid fa-floppy-disk"></i> {t('common.save')}
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setActiveTraining(null)} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-sport-primary shadow-sm flex items-center gap-2 text-xs">
              <i className="fa-solid fa-arrow-left"></i> {t('calendarView.back')}
            </button>
            <div>
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setDetailTab('datos')}
                  className={`px-3 py-1 rounded-lg font-black text-xs uppercase tracking-tight transition-all ${
                    detailTab === 'datos' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-[var(--accent)]'
                  }`}
                >
                  {t('calendarView.tabData')}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('sesion')}
                  className={`px-3 py-1 rounded-lg font-black text-xs uppercase tracking-tight transition-all ${
                    detailTab === 'sesion' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-[var(--accent)]'
                  }`}
                >
                  {t('calendarView.tabSession')}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('asistencias')}
                  className={`px-3 py-1 rounded-lg font-black text-xs uppercase tracking-tight transition-all ${
                    detailTab === 'asistencias' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-[var(--accent)]'
                  }`}
                >
                  {t('calendarView.tabAttendance')}
                </button>
              </div>
              {detailTab !== 'sesion' && (
                <p className="text-slate-400 text-xs font-bold mt-1">{formatLongDate(sessionDate)} • {activeTraining.time}</p>
              )}
            </div>
          </div>
        </div>

        {detailTab === 'sesion' && (
          <SessionTasksPanel
            tasks={sessionTasks}
            onChange={setSessionTasks}
            eventId={activeTraining.id}
            date={sessionDate}
            team={activeTraining.team}
            sessionNumber={activeTraining.sessionNumber}
            squad={vestEligiblePlayers}
            attendance={attendance}
          />
        )}

        {detailTab === 'asistencias' && (
          <SessionAttendancePanel
            players={sessionPlayers}
            additionalPlayers={allowExternalPlayers ? externalSessionPlayers : []}
            attendance={attendance}
            onChange={setAttendance}
            selectiveAttendance={selectiveAttendance}
            hideExternalPlayers={mainTab === 'datosSesiones'}
          />
        )}

        {detailTab === 'datos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[var(--accent)] font-black text-lg">{t('calendarView.information')}</h4>
                <button
                  type="button"
                  onClick={() => {
                    console.log('[EDITAR BUTTON] Clicked, activeTraining:', activeTraining);
                    setEditingSessionEvent(activeTraining);
                  }}
                  className="text-[10px] font-black text-slate-400 hover:text-[var(--accent)] uppercase tracking-widest flex items-center gap-1"
                >
                  <i className="fa-solid fa-pen"></i> {t('common.edit', 'Editar')}
                </button>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[var(--accent)]"><i className="fa-solid fa-calendar-day"></i></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.date')}</p>
                    <p className="font-black text-black">{sessionDate.toLocaleDateString(i18n.language)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[var(--accent)]"><i className="fa-solid fa-clock"></i></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.time')}</p>
                    <p className="font-black text-black">{activeTraining.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[var(--accent)]"><i className="fa-solid fa-location-dot"></i></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.location')}</p>
                    <p className="font-black text-black">{resolveEventLocationLabel(activeTraining) || activeTraining.location || t('calendarView.notDefined')}</p>
                  </div>
                </div>
                {activeTraining.team && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[var(--accent)]"><i className="fa-solid fa-shield-halved"></i></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('newEvent.team')}</p>
                      <p className="font-black text-black">{activeTraining.team}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h4 className="text-[var(--accent)] font-black text-lg">{t('calendarView.resources')}</h4>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.video')}</label>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={t('calendarView.videoUrl')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
                />
                {videoUrl && (
                  <div className="aspect-video rounded-xl overflow-hidden border border-slate-100">
                    <iframe
                      title="video"
                      src={getVideoEmbedUrl(videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    ></iframe>
                  </div>
                )}
                {videoUrl && (
                  <a
                    className="text-[11px] font-black text-[var(--accent)] underline"
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('calendarView.openVideoNewTab')}
                  </a>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.pdf')}</label>
                <input
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder={t('calendarView.docUrl')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
                />
                {docUrl && (
                  <div className="aspect-4/3 rounded-xl overflow-hidden border border-slate-100">
                    <iframe title="pdf" src={docUrl} className="w-full h-full"></iframe>
                  </div>
                )}
                {docUrl && (
                  <a
                    className="text-[11px] font-black text-[var(--accent)] underline"
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('calendarView.openPdfNewTab')}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-user-group text-[var(--accent)]"></i>
              <h4 className="text-[var(--accent)] font-black text-lg">({rosterPlayers.length})</h4>
            </div>
            {rosterPlayers.length === 0 ? (
              <div className="text-center text-slate-400 text-sm font-black uppercase tracking-widest py-10">{t('calendarView.noPlayers')}</div>
            ) : (
              <div className="space-y-2">
                {groupedRoster.map(([group, players]) => {
                  const colors = rosterPositionColors[group];
                  return (
                    <div key={group} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`${colors.badge} text-white text-[10px] font-black px-2.5 py-1 rounded-lg`}>{colors.icon}</div>
                        <h5 className="text-slate-500 font-black text-[11px] uppercase tracking-widest">{group}</h5>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                        {players.map((player) => {
                          const playerId = String(player.id);
                          const status = getRosterStatus(player);
                          return (
                            <div key={player.id} className={`flex items-center justify-between gap-2 ${colors.bg} rounded-lg px-2.5 py-1 border ${colors.border}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`${colors.badge} text-white w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-black text-[10px]`}>
                                  {player.dorsal ?? player.nombre.charAt(0)}
                                </div>
                                <p className="text-[11px] font-black text-black truncate">{player.nombre}</p>
                              </div>
                              <SearchableSelect
                                value={status}
                                onChange={(e) => {
                                  const nextStatus = e.target.value as AttendanceStatus | '';
                                  setAttendance(prev => {
                                    const next = { ...prev };
                                    if (nextStatus) {
                                      next[playerId] = nextStatus;
                                    } else {
                                      delete next[playerId];
                                    }
                                    return next;
                                  });
                                }}
                                className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white text-[10px] font-black shrink-0"
                              >
                                {selectiveAttendance && <option value="">{t('calendarView.notCounted')}</option>}
                                <option value="Si">{t('calendarView.attendYes')}</option>
                                {!selectiveAttendance && (
                                  <>
                                    <option value="Lesión">{t('calendarView.attendInjury')}</option>
                                    <option value="Vacaciones">{t('calendarView.attendVacation')}</option>
                                    <option value="Descanso">{t('calendarView.attendRest')}</option>
                                    <option value="No justificada">{t('calendarView.attendUnjustified')}</option>
                                    <option value="Otro">{t('calendarView.other')}</option>
                                  </>
                                )}
                              </SearchableSelect>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {notCalledRosterPlayers.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-user-xmark text-red-400"></i>
                      <h5 className="text-red-500 font-black text-[11px] uppercase tracking-widest">{t('calendarView.notCalledUp')}</h5>
                      <span className="ml-auto text-[10px] font-black text-red-400">{notCalledRosterPlayers.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                      {notCalledRosterPlayers.map((player) => {
                        const playerId = String(player.id);
                        const status = getRosterStatus(player);
                        return (
                          <div key={player.id} className="flex items-center justify-between gap-2 bg-red-50 rounded-lg px-2.5 py-1 border border-red-100">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="bg-red-400 text-white w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-black text-[10px]">
                                {player.dorsal ?? player.nombre.charAt(0)}
                              </div>
                              <p className="text-[11px] font-black text-black truncate">{player.nombre}</p>
                            </div>
                            <SearchableSelect
                              value={status}
                              onChange={(e) => {
                                const nextStatus = e.target.value as AttendanceStatus | '';
                                setAttendance(prev => {
                                  const next = { ...prev };
                                  if (nextStatus) {
                                    next[playerId] = nextStatus;
                                  } else {
                                    delete next[playerId];
                                  }
                                  return next;
                                });
                              }}
                              className="px-2 py-1.5 rounded-lg border border-red-200 text-red-700 bg-white text-[10px] font-black shrink-0"
                            >
                              {selectiveAttendance && <option value="">{t('calendarView.notCounted')}</option>}
                              <option value="Si">{t('calendarView.attendYes')}</option>
                              {!selectiveAttendance && (
                                <>
                                  <option value="Lesión">{t('calendarView.attendInjury')}</option>
                                  <option value="Vacaciones">{t('calendarView.attendVacation')}</option>
                                  <option value="Descanso">{t('calendarView.attendRest')}</option>
                                  <option value="No justificada">{t('calendarView.attendUnjustified')}</option>
                                  <option value="Otro">{t('calendarView.other')}</option>
                                </>
                              )}
                            </SearchableSelect>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {allowExternalPlayers && rosterAvailableExternalPlayers.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-user-plus text-slate-400"></i>
                      <h5 className="text-slate-500 font-black text-[11px] uppercase tracking-widest">{t('calendarView.externalPlayers')}</h5>
                      <span className="ml-auto text-[10px] font-black text-slate-400">{rosterFilteredExternalPlayers.length}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <MultiSelectFilter
                        value={rosterExternalTeamFilter}
                        onChange={setRosterExternalTeamFilter}
                        allLabel={t('calendarView.filterAllTeams')}
                        options={rosterExternalTeams.map((team) => ({ value: team, label: team }))}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black sm:w-56"
                      />
                      <div className="relative flex-1">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <input
                          type="text"
                          value={rosterExternalSearch}
                          onChange={(e) => setRosterExternalSearch(e.target.value)}
                          placeholder={t('calendarView.searchPlayerPlaceholder')}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold placeholder:text-slate-300 focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </div>
                    {rosterFilteredExternalPlayers.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs font-bold py-3">{t('calendarView.noExternalPlayersFound')}</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {rosterFilteredExternalPlayers.map((player) => (
                          <div key={player.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 shrink-0 rounded-full bg-slate-300 text-white flex items-center justify-center font-black text-[10px]">
                                {player.dorsal ?? player.nombre.charAt(0)}
                              </div>
                              <p className="text-[11px] font-black text-slate-700 truncate">{player.nombre}{player.equipo ? ` (${player.equipo})` : ''}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttendance(prev => ({ ...prev, [String(player.id)]: 'Si' }))}
                              className="px-2 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-black hover:bg-emerald-100 shrink-0"
                            >
                              {t('calendarView.addPlayer')}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

      {editingSessionEvent && (
        <NewEventModal
          editEvent={editingSessionEvent}
          onClose={() => setEditingSessionEvent(null)}
          onSave={(updatedEvent) => {
            onSaveEvent(updatedEvent);
            if (activeTraining && activeTraining.id === updatedEvent.id) {
              setActiveTraining(updatedEvent);
            }
            setEditingSessionEvent(null);
          }}
          onDelete={(id) => {
            onDeleteEvent(String(id));
            setEditingSessionEvent(null);
            if (activeTraining && String(activeTraining.id) === String(id)) {
              setActiveTraining(null);
            }
          }}
          competitionTeams={competitionTeams}
          ownClubId={ownClubId}
        />
      )}
      </div>
    );
  }

  return (
    <div className={`animate-fade-in space-y-8 flex flex-col relative pb-10 ${fullscreen ? 'fixed inset-0 z-50 bg-white h-screen w-screen p-6 overflow-auto' : 'h-full'}` }>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <MultiSelectFilter
            value={teamFilter}
            onChange={setTeamFilter}
            allLabel={t('calendarView.filterAllTeams')}
            options={availableTeams.map((team) => ({ value: team, label: team }))}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          <MultiSelectFilter
            value={sessionTypeFilter}
            onChange={setSessionTypeFilter}
            allLabel={t('calendarView.filterAllSessionTypes', 'Todos los tipos')}
            options={availableSessionTypes.map((type) => ({ value: type, label: type }))}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          <MultiSelectFilter
            value={monthFilter}
            onChange={(next) => {
              setMonthFilter(next);
              if (next.length === 1) {
                setCurrentMonth(prev => new Date(prev.getFullYear(), Number(next[0]), 1));
              }
            }}
            allLabel={t('calendarView.filterAllMonths', 'Todos los meses')}
            options={monthNames.map((name, index) => ({ value: String(index), label: name }))}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          <MultiSelectFilter
            value={localidadId}
            onChange={setLocalidadId}
            allLabel="Todas las localidades"
            options={localidades.map((loc) => ({ value: loc.id, label: loc.nombre }))}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          <MultiSelectFilter
            value={instalacionId}
            onChange={setInstalacionId}
            allLabel="Todos los campos"
            options={instalacionesCampos.map((ic) => ({ value: ic.id, label: ic.nombre }))}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.dateFrom', 'Desde')}:</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.dateTo', 'Hasta')}:</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            {(sessionTypeFilter.length > 0 || monthFilter.length > 0 || filterDateFrom || filterDateTo) && (
              <button
                type="button"
                onClick={() => {
                  setSessionTypeFilter([]);
                  setMonthFilter([]);
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="px-3 py-2 text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest"
              >
                × {t('calendarView.clearFilter', 'Limpiar')}
              </button>
            )}
          </div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setMainTab('sesiones')}
              className={`px-4 py-2 rounded-lg font-black text-sm uppercase tracking-tight transition-all ${
                mainTab === 'sesiones' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-[var(--accent)]'
              }`}
            >
              {t('calendarView.sessionsTitle')}
            </button>
            <button
              type="button"
              onClick={() => setMainTab('datosSesiones')}
              className={`px-4 py-2 rounded-lg font-black text-sm uppercase tracking-tight transition-all ${
                mainTab === 'datosSesiones' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-[var(--accent)]'
              }`}
            >
              {t('calendarView.sessionDataTitle')}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {mainTab === 'sesiones' && (
            <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  viewMode === 'table'
                    ? 'bg-[var(--accent)] text-white shadow-md'
                    : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
                }`}
                aria-label={t('calendarView.viewTable')}
                title={t('calendarView.viewTable')}
              >
                <i className="fa-solid fa-table"></i>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-[var(--accent)] text-white shadow-md'
                    : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
                }`}
                aria-label={t('calendarView.viewCalendar')}
                title={t('calendarView.viewCalendar')}
              >
                <i className="fa-solid fa-calendar-days"></i>
              </button>
            </div>
          )}
          <button onClick={() => { setDefaultEventType('Sesión'); setSelectedDate(new Date()); setShowNewModal(true); }} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-200">
            <i className="fa-solid fa-plus"></i> {t('calendarView.newSessionButton')}
          </button>
        </div>
      </div>

      {mainTab === 'datosSesiones' && (
        <SessionAttendanceSummary
          events={filteredEvents}
          players={squad}
          filterDateFrom={filterDateFrom}
          filterDateTo={filterDateTo}
          onFilterDateFromChange={setFilterDateFrom}
          onFilterDateToChange={setFilterDateTo}
        />
      )}

      {mainTab === 'sesiones' && viewMode === 'table' && (
        <div className="w-full">
          <div className="bg-white rounded-4xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-4 md:px-10 py-4 md:py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h4 className="text-[var(--accent)] font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-person-running"></i> {t('calendarView.sessionsTitle')}
              </h4>
              <span className="text-xs font-black text-slate-400">{filteredEvents.length} {t('calendarView.sessionsCount')}</span>
            </div>
            {filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-bold text-sm">{t('calendarView.noSessionsFound')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colDate')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colTime')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colTeam')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colSessionType')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colSession')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colInstalacion', 'Instalación')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colCampo', 'Campo')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colPlayers', 'Jugadores')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">{t('calendarView.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredEvents.map((ev) => {
                      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
                      const selectivePlayerNames = getSelectiveSessionPlayerNames(ev);
                      const { instalacion, campo } = resolveEventInstalacionCampo(ev);
                      return (
                        <tr key={ev.id} className="hover:bg-slate-50 transition group">
                          <td className="px-6 py-4 cursor-pointer" onClick={() => handleEventClick(ev)}>
                            <p className="font-black text-slate-700 text-xs">
                              {d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500 cursor-pointer whitespace-nowrap" onClick={() => handleEventClick(ev)}>
                            {ev.time || t('calendarView.noTime')}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500 cursor-pointer whitespace-nowrap" onClick={() => handleEventClick(ev)}>
                            {ev.team || '—'}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500 cursor-pointer whitespace-nowrap" onClick={() => handleEventClick(ev)}>
                            {ev.type || '—'}
                          </td>
                          <td className="px-6 py-4 cursor-pointer" onClick={() => handleEventClick(ev)}>
                            <p className="font-black text-[var(--accent)] text-xs group-hover:underline">
                              {ev.title || t('calendarView.sessionDefault')}
                              {ev.sessionNumber ? ` — ${t('calendarView.sessionNumber')} ${ev.sessionNumber}` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500 cursor-pointer whitespace-nowrap" onClick={() => handleEventClick(ev)}>
                            {instalacion || '—'}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500 cursor-pointer whitespace-nowrap" onClick={() => handleEventClick(ev)}>
                            {campo || '—'}
                          </td>
                          <td className="px-6 py-4 cursor-pointer max-w-xs" onClick={() => handleEventClick(ev)}>
                            {selectivePlayerNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selectivePlayerNames.map((name, index) => (
                                  <span key={`${name}-${index}`} className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-black text-slate-600">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEventClick(ev)}
                                className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all"
                                title={t('calendarView.session')}
                              >
                                <i className="fa-solid fa-chevron-right text-sm"></i>
                              </button>
                              <button
                                onClick={() => onDeleteEvent(String(ev.id))}
                                className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all"
                                title={t('common.delete')}
                              >
                                <i className="fa-solid fa-trash-can text-sm"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {mainTab === 'sesiones' && viewMode === 'calendar' && (
      <div className="flex-1 w-full">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl min-h-125 flex flex-col overflow-hidden">
          <div className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center justify-between gap-3 mb-4">
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all shadow-sm">
                <i className="fa-solid fa-chevron-left text-sm"></i>
              </button>
              <div className="text-center">
                <h4 className="text-[var(--accent)] font-black text-lg md:text-2xl uppercase tracking-wider">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.25em] mt-1">
                  {t('calendarView.monthlyCalendar')}
                </p>
              </div>
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all shadow-sm">
                <i className="fa-solid fa-chevron-right text-sm"></i>
              </button>
            </div>
          </div>
          <div className="flex-1 p-3 md:p-6 overflow-y-auto">
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
              {orderedDayNamesLong.map(day => (
                <div key={day} className="text-[9px] md:text-xs font-black text-slate-400 uppercase text-center py-1 md:py-2">{day.slice(0,3)}</div>
              ))}
            </div>
            {getMonthMatrix(currentMonth).map((week, i) => (
              <div key={i} className="grid grid-cols-7 gap-1 md:gap-2 mb-1.5 md:mb-2">
                {week.map((date, j) => (
                  <div
                    key={j}
                    className={`min-h-24 md:min-h-32 lg:min-h-40 rounded-xl border border-slate-100 bg-slate-50 p-1 flex flex-col relative transition-all ${
                      date && date.getMonth() === currentMonth.getMonth() ? '' : 'opacity-30'
                    } ${dragOverDate && date && date.getTime() === dragOverDate.getTime() ? 'bg-blue-100 border-blue-400 shadow-lg' : ''}`}
                    onDragOver={(e) => date && handleDragOver(e, date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => date && handleDropEvent(e, date)}
                  >
                    {date && date.getMonth() === currentMonth.getMonth() && (
                      <button
                        className="absolute top-1 left-1 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-[14px] shadow-md z-10"
                        style={{ fontSize: '16px' }}
                        onClick={() => { setDefaultEventType('Sesión'); setSelectedDate(date); setShowNewModal(true); }}
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    )}
                    <div className="text-[11px] font-black text-[var(--accent)] text-right pr-1">{date ? date.getDate() : ''}</div>
                    <div className="flex-1 flex flex-col gap-1">
                      {date && eventsByDay[`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`]?.map(ev => (
                        <div
                          key={ev.id}
                          className={`rounded px-1 py-1 text-[11px] font-bold cursor-pointer flex flex-col gap-0.5 group/ev transition-all opacity-100 hover:shadow-md border-2 ${
                            ev.type === 'Partido' ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-400' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-400'
                          }`}
                        >
                          {ev.type === 'Partido' ? (
                            <div className="flex flex-col gap-0.5 p-0.5 w-full" onClick={() => handleEventClick(ev)}>
                              <div className="text-[9px] font-bold leading-tight">{ev.time}</div>
                              {(ev.localTeam && ev.visitorTeam) ? (
                                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 text-[8px] font-semibold leading-tight">
                                  <MatchTeamMini name={ev.localTeam} clubId={ev.localTeamClubId} />
                                  <span className="text-red-700 font-black">VS</span>
                                  <MatchTeamMini name={ev.visitorTeam} clubId={ev.visitorTeamClubId} />
                                </div>
                              ) : (
                                <div className="text-[8px] font-semibold leading-tight truncate">
                                  {ev.title || ev.opponent || 'Partido'}
                                </div>
                              )}
                              {ev.score && (
                                <div className="text-[7px] font-bold text-red-700 text-center">
                                  {ev.score}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5">
                              <div
                                draggable="true"
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = 'copy';
                                  e.dataTransfer.setData('text/plain', JSON.stringify(ev));
                                  setDraggedEvent(ev);
                                }}
                                onDragEnd={() => {
                                  setDraggedEvent(null);
                                  setDragOverDate(null);
                                }}
                                className="cursor-grab active:cursor-grabbing flex-shrink-0"
                                title={t('calendarView.dragToDuplicate')}
                              >
                                <i className="fa-solid fa-grip-vertical text-[10px] opacity-70 hover:opacity-100"></i>
                              </div>
                              <span className="truncate leading-tight flex-1" onClick={() => handleEventClick(ev)}>
                                {`${ev.time}${ev.team ? ` - ${ev.team}` : ''}`}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteEvent(String(ev.id)); }}
                            className="flex sm:hidden sm:group-hover/ev:flex w-3.5 h-3.5 items-center justify-center rounded-full flex-shrink-0 transition-all"
                            style={{
                              color: ev.type === 'Partido' ? 'rgb(248, 113, 113)' : 'rgb(52, 211, 153)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = ev.type === 'Partido' ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title={t('common.delete')}
                          >
                            <i className="fa-solid fa-xmark" style={{ fontSize: '8px' }}></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* LISTADO DE SESIONES */}
      {mainTab === 'sesiones' && viewMode === 'calendar' && filteredEvents.length > 0 && (
        <div className="w-full">
          <div className="bg-white rounded-4xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-4 md:px-10 py-4 md:py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h4 className="text-[var(--accent)] font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-person-running"></i> {t('calendarView.sessionsTitle')}
              </h4>
              <span className="text-xs font-black text-slate-400">{filteredEvents.length} {t('calendarView.sessionsCount')}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredEvents.map((ev) => {
                const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
                return (
                  <div
                    key={ev.id}
                    className="w-full flex items-center gap-4 px-4 md:px-10 py-3 md:py-4 hover:bg-slate-50 transition text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex flex-col items-center justify-center flex-shrink-0 shadow cursor-pointer" onClick={() => handleEventClick(ev)}>
                      <span className="text-[10px] font-black uppercase leading-none">{monthNames[d.getMonth()].slice(0, 3)}</span>
                      <span className="text-lg font-black leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEventClick(ev)}>
                        <p className="font-black text-[var(--accent)] text-base md:text-lg truncate group-hover:underline leading-tight">
                          {ev.title || t('calendarView.sessionDefault')}
                          {ev.sessionNumber ? ` — ${t('calendarView.sessionNumber')} ${ev.sessionNumber}` : ''}
                        </p>
                      <p className="text-sm text-slate-400 font-bold">
                        {d.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {ev.time}{ev.team ? ` - ${ev.team}` : ''}
                        {ev.location ? ` • ${ev.location}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingSessionEvent(ev)}
                      className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0"
                      title={t('common.edit', 'Editar')}
                    >
                      <i className="fa-solid fa-pen text-sm"></i>
                    </button>
                    <button
                      onClick={() => onDeleteEvent(String(ev.id))}
                      className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0"
                      title={t('common.delete')}
                    >
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                    <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-[var(--accent)] transition cursor-pointer" onClick={() => handleEventClick(ev)}></i>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewEventModal
          initialDate={selectedDate}
          defaultType={defaultEventType}
          onClose={() => { setShowNewModal(false); setDefaultEventType(null); }}
          onSave={(newEvent) => {
            onSaveEvent(newEvent);
            if (newEvent.type === 'Partido') {
              setActiveMatch(newEvent);
            }
          }}
          competitionTeams={competitionTeams}
          ownClubId={ownClubId}
        />
      )}
    </div>
  );
};

export default CalendarView;
