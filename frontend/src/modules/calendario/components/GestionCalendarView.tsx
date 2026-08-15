import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes/types';
import type { Player } from '@modules/plantilla';
import type { MatchReport } from '@modules/partidos/types';
import SearchableSelect from '@shared/components/SearchableSelect';
import { compareEquipoNames } from '@shared/components/EquipoSelect';
import { db, localidadesService, instalacionesCamposService } from '@shared/services/dataService';
import type { Localidad, InstalacionCampo } from '@shared/services/dataService';
import { getPlayerSessionAttendance, hasRecordedAttendance, isSelectiveAttendanceSession } from '../utils/attendance';
import { getFederationTeamLogo, normalizeFederationTeamName } from '@modules/competicion/data/teamLogos';

interface GestionCalendarViewProps {
  events: CalendarEvent[];
  onCreateEvent?: (date?: Date) => void;
  onClickEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (id: string | number) => void;
  onSaveEvent?: (event: CalendarEvent) => void;
  competitionTeams?: CompetitionTeam[];
  clubes?: Club[];
  players?: Player[];
  ownClubId?: string;
}

const EVENT_BADGE_COLORS: Record<string, string> = {
  Entrenamiento: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Partido: 'bg-red-100 text-red-700 border-red-200',
  Reunión: 'bg-purple-100 text-purple-700 border-purple-200',
  Otro: 'bg-gray-100 text-gray-700 border-gray-200',
  Descanso: 'bg-green-100 text-green-700 border-green-200',
  Actividad: 'bg-amber-100 text-amber-700 border-amber-200',
};

const EVENT_THICK_COLORS: Record<string, string> = {
  Entrenamiento: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-400',
  Partido: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-400',
  Reunión: 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-400',
  Otro: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-400',
  Descanso: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-400',
  Actividad: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-400',
};

const EVENT_DELETE_HOVER_COLORS: Record<string, { color: string; hoverBg: string }> = {
  Entrenamiento: { color: 'rgb(52, 211, 153)', hoverBg: 'rgb(16, 185, 129)' },
  Partido: { color: 'rgb(248, 113, 113)', hoverBg: 'rgb(239, 68, 68)' },
  Reunión: { color: 'rgb(192, 132, 252)', hoverBg: 'rgb(147, 51, 234)' },
  Otro: { color: 'rgb(156, 163, 175)', hoverBg: 'rgb(107, 114, 128)' },
  Descanso: { color: 'rgb(74, 222, 128)', hoverBg: 'rgb(34, 197, 94)' },
  Actividad: { color: 'rgb(251, 191, 36)', hoverBg: 'rgb(217, 119, 6)' },
};

const EVENT_DOT_COLORS: Record<string, string> = {
  Entrenamiento: 'bg-emerald-500',
  Partido: 'bg-red-500',
  Reunión: 'bg-purple-500',
  Otro: 'bg-gray-500',
  Descanso: 'bg-green-500',
  Actividad: 'bg-amber-500',
};

// Paleta de colores por equipo: cada equipo distinto recibe un color estable,
// asignado por hash del nombre, para diferenciar visualmente sus eventos en el calendario.
const TEAM_COLOR_PALETTE: { thick: string; badge: string; dot: string; delColor: string; delHover: string }[] = [
  { thick: 'bg-sky-100 text-sky-800 hover:bg-sky-200 border-sky-400', badge: 'bg-sky-100 text-sky-700 border-sky-200', dot: 'bg-sky-500', delColor: 'rgb(56,189,248)', delHover: 'rgb(2,132,199)' },
  { thick: 'bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-400', badge: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500', delColor: 'rgb(167,139,250)', delHover: 'rgb(124,58,237)' },
  { thick: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-400', badge: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', delColor: 'rgb(251,146,60)', delHover: 'rgb(234,88,12)' },
  { thick: 'bg-teal-100 text-teal-800 hover:bg-teal-200 border-teal-400', badge: 'bg-teal-100 text-teal-700 border-teal-200', dot: 'bg-teal-500', delColor: 'rgb(45,212,191)', delHover: 'rgb(13,148,136)' },
  { thick: 'bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-400', badge: 'bg-pink-100 text-pink-700 border-pink-200', dot: 'bg-pink-500', delColor: 'rgb(244,114,182)', delHover: 'rgb(219,39,119)' },
  { thick: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-400', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', delColor: 'rgb(129,140,248)', delHover: 'rgb(79,70,229)' },
  { thick: 'bg-lime-100 text-lime-800 hover:bg-lime-200 border-lime-400', badge: 'bg-lime-100 text-lime-700 border-lime-200', dot: 'bg-lime-500', delColor: 'rgb(163,230,53)', delHover: 'rgb(101,163,13)' },
  { thick: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-cyan-400', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500', delColor: 'rgb(34,211,238)', delHover: 'rgb(8,145,178)' },
  { thick: 'bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200 border-fuchsia-400', badge: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', dot: 'bg-fuchsia-500', delColor: 'rgb(232,121,249)', delHover: 'rgb(192,38,211)' },
  { thick: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-400', badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', delColor: 'rgb(251,191,36)', delHover: 'rgb(217,119,6)' },
];

const hashTeamKey = (key: string): number => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getTeamColor = (teamKey: string | undefined) => {
  if (!teamKey) return null;
  return TEAM_COLOR_PALETTE[hashTeamKey(teamKey) % TEAM_COLOR_PALETTE.length];
};

const formatEventLabel = (time?: string, team?: string, fallbackTime = '--:--') => {
  const hour = time || fallbackTime;
  return team ? `${hour} - ${team}` : hour;
};

const getEventActivity = (event: CalendarEvent): string => {
  if (event.type === 'Partido') {
    return (event.competition || '').trim();
  }

  if (event.type === 'Sesión' || event.type === 'Entrenamiento') {
    return (event.title || '').trim();
  }

  return '';
};

const normalizeTeamKey = (value?: string | number | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

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

const GestionCalendarView: React.FC<GestionCalendarViewProps> = ({ events, onCreateEvent, onClickEvent, onDeleteEvent, onSaveEvent, competitionTeams = [], clubes = [], players = [], ownClubId }) => {
  const { t, i18n } = useTranslation();
  const monthNames = t('calendarView.months', { returnObjects: true }) as string[];
  const dayNames = t('calendarView.daysAbbr', { returnObjects: true }) as string[];
  const orderedDayNames = useMemo(() => [...dayNames.slice(1), dayNames[0]], [dayNames]);

  const clubNameById = useMemo(() => new Map(clubes.map((club) => [String(club.id), club.nombre])), [clubes]);
  const clubLogoById = useMemo(() => new Map(clubes.map((club) => [String(club.id), club.logoUrl])), [clubes]);
  const clubLogoByTeamName = useMemo(() => {
    const map = new Map<string, string>();
    const register = (name?: string | null, logoUrl?: string) => {
      if (!name || !logoUrl) return;
      map.set(normalizeFederationTeamName(name), logoUrl);
    };

    clubes.forEach((club) => {
      register(club.nombre, club.logoUrl || getFederationTeamLogo(club.nombre));
    });
    competitionTeams.forEach((team) => {
      const logoUrl = team.clubId != null
        ? clubLogoById.get(String(team.clubId))
        : undefined;
      register(team.nombre, logoUrl);
      register(team.nombreEnFed, logoUrl);
    });

    return map;
  }, [clubes, competitionTeams, clubLogoById]);
  const clubNameByTeamName = useMemo(() => {
    const map = new Map<string, string>();
    competitionTeams.forEach((team) => {
      const teamName = team.equipo || team.nombre;
      const clubName = team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined;
      if (teamName && clubName && !map.has(teamName)) map.set(teamName, clubName);
    });
    return map;
  }, [competitionTeams, clubNameById]);
  const resolveClubLabel = (teamName: string, clubId?: string): string | undefined =>
    (clubId && clubNameById.get(String(clubId))) || clubNameByTeamName.get(teamName);
  const resolveClubLogo = (clubId?: string): string | undefined =>
    clubId ? clubLogoById.get(String(clubId)) : undefined;
  const resolveTeamLogo = (clubId?: string, ...teamNames: Array<string | undefined>): string | undefined => {
    const clubLogo = resolveClubLogo(clubId);
    if (clubLogo) return clubLogo;

    for (const teamName of teamNames) {
      if (!teamName) continue;
      const normalizedName = normalizeFederationTeamName(teamName);
      const logoUrl = clubLogoByTeamName.get(normalizedName);
      if (logoUrl) return logoUrl;
    }

    return undefined;
  };
  const internalNameByFedName = useMemo(() => {
    const map = new Map<string, string>();
    competitionTeams.forEach((team) => {
      const fedName = team.nombreEnFed?.trim().toLowerCase();
      const internalName = (team.equipo || team.nombre || '').trim();
      if (fedName && internalName) map.set(fedName, internalName);
    });
    return map;
  }, [competitionTeams]);
  const resolveTeamDisplayName = (teamName?: string): string => {
    if (!teamName) return '';
    return internalNameByFedName.get(teamName.trim().toLowerCase()) || teamName;
  };

  const findCompetitionTeamForSide = (teamName?: string, clubId?: string): CompetitionTeam | undefined => {
    const key = normalizeTeamKey(teamName);
    const matchesName = (team: CompetitionTeam) =>
      [team.equipo, team.nombreEnFed, team.nombre].some(value => normalizeTeamKey(value) === key);

    if (clubId) {
      const teamsByClub = competitionTeams.filter(team => String(team.clubId ?? '') === String(clubId));
      const exact = teamsByClub.find(matchesName) || (teamsByClub.length === 1 ? teamsByClub[0] : undefined);
      if (exact) return exact;
    }

    return competitionTeams.find(matchesName);
  };

  const resolveMatchSideDisplay = (event: CalendarEvent, teamName?: string, clubId?: string) => {
    const team = findCompetitionTeamForSide(teamName, clubId);
    const rawName = teamName || '';
    const clubName =
      (clubId && clubNameById.get(String(clubId))) ||
      resolveClubLabel(rawName, clubId) ||
      team?.nombre ||
      rawName;
    const isOwnSide = !!ownClubId && !!clubId && String(clubId) === String(ownClubId);
    const federationName =
      team?.nombreEnFed && normalizeTeamKey(team.nombreEnFed) !== normalizeTeamKey(clubName)
        ? team.nombreEnFed
        : '';
    const teamDisplayName =
      (isOwnSide ? resolveTeamDisplayName(event.nombreInterno || event.team) : '') ||
      team?.equipo ||
      team?.etapa ||
      federationName ||
      resolveTeamDisplayName(rawName) ||
      rawName;

    return { clubName, teamName: teamDisplayName };
  };
  // Equipos propios del club: `competitionTeams` incluye también equipos rivales
  // dados de alta para programar amistosos, así que hay que filtrar por clubId
  // para quedarnos solo con los que son realmente del propio club.
  const internalCompetitionTeams = useMemo(
    () => competitionTeams.filter((team) => String(team.clubId ?? '') === String(ownClubId ?? '')),
    [competitionTeams, ownClubId]
  );
  // Nombres de los equipos propios del club (los que aparecen en Competición), para
  // detectar cuál de los dos lados de un partido es "nuestro" equipo sin importar si juega en casa o fuera.
  // Mapa nombre normalizado -> nombre canónico, para que un mismo equipo interno
  // siempre reciba la misma clave de color sin importar de qué campo del evento
  // (team, nombreInterno, localTeam o visitorTeam) ni con qué mayúsculas/espacios venga.
  const internalTeamCanonicalByName = useMemo(() => {
    const map = new Map<string, string>();
    internalCompetitionTeams.forEach((team) => {
      const canonical = (team.equipo || team.nombre || '').trim();
      if (canonical) map.set(canonical.toLowerCase(), canonical);
    });
    return map;
  }, [internalCompetitionTeams]);
  const getEventTeamKey = (ev: CalendarEvent): string | undefined => {
    if (ev.type === 'Partido') {
      const candidates = [
        ev.team,
        ev.nombreInterno,
        resolveTeamDisplayName(ev.localTeam),
        resolveTeamDisplayName(ev.visitorTeam),
      ];
      for (const candidate of candidates) {
        const canonical = candidate && internalTeamCanonicalByName.get(candidate.trim().toLowerCase());
        if (canonical) return canonical;
      }
      return resolveTeamDisplayName(ev.localTeam) || ev.localTeam || ev.team || undefined;
    }
    const canonical = ev.team && internalTeamCanonicalByName.get(ev.team.trim().toLowerCase());
    return canonical || ev.team;
  };

  const teamAliasesByCompetitionTeamId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    internalCompetitionTeams.forEach(team => {
      const aliases = [team.id, team.equipo, team.nombre, team.nombreEnFed]
        .map(normalizeTeamKey)
        .filter(Boolean);
      map.set(String(team.id), new Set(aliases));
    });
    return map;
  }, [internalCompetitionTeams]);

  const getPlayerTeamAliases = (player: Player) => {
    const aliases = [player.equipoId, player.equipo, player.club]
      .map(normalizeTeamKey)
      .filter(Boolean);

    if (player.equipoId) {
      const teamAliases = teamAliasesByCompetitionTeamId.get(String(player.equipoId));
      if (teamAliases) aliases.push(...teamAliases);
    }

    return new Set(aliases);
  };

  const getEventTeamAliases = (event: CalendarEvent) => {
    const aliases = [
      event.team,
      event.nombreInterno,
      event.localTeam,
      event.visitorTeam,
      getEventTeamKey(event),
      resolveTeamDisplayName(event.team),
      resolveTeamDisplayName(event.localTeam),
      resolveTeamDisplayName(event.visitorTeam),
    ]
      .map(normalizeTeamKey)
      .filter(Boolean);

    return new Set(aliases);
  };

  const playerMatchesEventTeam = (event: CalendarEvent, player: Player) => {
    const playerTeamAliases = getPlayerTeamAliases(player);
    if (playerTeamAliases.size === 0) return true;

    const eventTeamAliases = getEventTeamAliases(event);
    if (eventTeamAliases.size === 0) return true;

    return Array.from(playerTeamAliases).some(alias => eventTeamAliases.has(alias));
  };

  const samePlayerId = (a: string | number | undefined, b: string | number | undefined) =>
    a !== undefined && b !== undefined && String(a) === String(b);

  const reportHasParticipationData = (report: MatchReport) =>
    (report.lineupPositions || []).some(pos => (pos.playerIds || []).length > 0) ||
    (report.substitutions || []).some(sub => sub.playerInId !== undefined || sub.playerOutId !== undefined) ||
    (report.matchGoals || []).some(goal => goal.playerId !== undefined) ||
    (report.matchCards || []).some(card => card.playerId !== undefined) ||
    (report.videoEvents || []).some(videoEvent => videoEvent.playerId !== undefined);

  const playerParticipatesInMatchReport = (report: MatchReport, playerId: string | number) => {
    if ((report.notConvocadoIds || []).some(id => samePlayerId(id, playerId))) return false;

    return (
      (report.lineupPositions || []).some(pos => (pos.playerIds || []).some(id => samePlayerId(id, playerId))) ||
      (report.substitutions || []).some(sub => samePlayerId(sub.playerInId, playerId) || samePlayerId(sub.playerOutId, playerId)) ||
      (report.matchGoals || []).some(goal => samePlayerId(goal.playerId, playerId)) ||
      (report.matchCards || []).some(card => samePlayerId(card.playerId, playerId)) ||
      (report.videoEvents || []).some(videoEvent => samePlayerId(videoEvent.playerId, playerId))
    );
  };

  const [matchReports, setMatchReports] = useState<MatchReport[]>([]);
  const [matchReportsLoaded, setMatchReportsLoaded] = useState(false);
  const matchReportById = useMemo(
    () => new Map(matchReports.map(report => [String(report.id), report])),
    [matchReports]
  );

  const playerParticipatesInEvent = (event: CalendarEvent, player: Player) => {
    if (event.type === 'Partido') {
      const report = matchReportById.get(String(event.id));
      if (report) {
        if ((report.notConvocadoIds || []).some(id => samePlayerId(id, player.id))) return false;
        if (reportHasParticipationData(report)) return playerParticipatesInMatchReport(report, player.id);
      }
      return playerMatchesEventTeam(event, player);
    }

    if (hasRecordedAttendance(event)) {
      const attendance = getPlayerSessionAttendance(event, player.id);
      if (attendance.status !== undefined || isSelectiveAttendanceSession(event)) {
        return attendance.counted && attendance.attended;
      }
    }

    if (isSelectiveAttendanceSession(event)) {
      return false;
    }

    return playerMatchesEventTeam(event, player);
  };
  const [activeView, setActiveView] = useState<'annual' | 'monthly' | 'weekly' | 'schedule'>('monthly');
  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date();
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [localidadId, setLocalidadId] = useState<string>('all');
  const [instalacionPrincipalId, setInstalacionPrincipalId] = useState<string>('all');
  const [instalacionId, setInstalacionId] = useState<string>('all');
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [instalaciones, setInstalaciones] = useState<InstalacionCampo[]>([]);

  const instalacionesPrincipales = useMemo(
    () => instalaciones.filter(i => !i.parent_instalacion_id && (localidadId === 'all' || i.localidad_id === localidadId)),
    [instalaciones, localidadId]
  );
  const camposDisponibles = useMemo(
    () => instalaciones.filter(i => !!i.parent_instalacion_id && (instalacionPrincipalId === 'all' || i.parent_instalacion_id === instalacionPrincipalId)),
    [instalaciones, instalacionPrincipalId]
  );
  const campoParentMap = useMemo(
    () => new Map(instalaciones.filter(i => i.parent_instalacion_id).map(i => [i.id, i.parent_instalacion_id as string])),
    [instalaciones]
  );

  useEffect(() => {
    if (instalacionPrincipalId !== 'all' && instalacionId !== 'all' && campoParentMap.get(instalacionId) !== instalacionPrincipalId) {
      setInstalacionId('all');
    }
  }, [instalacionPrincipalId, instalacionId, campoParentMap]);

  useEffect(() => {
    (async () => {
      try {
        const locs = await localidadesService.list();
        const insts = await instalacionesCamposService.list();
        if (locs) setLocalidades(locs as Localidad[]);
        if (insts) setInstalaciones(insts as InstalacionCampo[]);
      } catch (err) {
        console.error('Error al cargar localidades e instalaciones:', err);
      }
    })();
  }, []);

  const availableTeams = useMemo(() => {
    const teams = new Set<string>();
    internalCompetitionTeams.forEach(team => {
      const name = (team.equipo || team.nombre || '').trim();
      if (name) teams.add(name);
    });
    return Array.from(teams).sort(compareEquipoNames);
  }, [internalCompetitionTeams]);

  const availablePlayers = useMemo(() => {
    const selectedTeamKey = normalizeTeamKey(teamFilter);
    const selectedTeamIds = new Set<string>();
    const selectedTeamNames = new Set<string>();

    if (teamFilter !== 'all') {
      selectedTeamNames.add(selectedTeamKey);
      internalCompetitionTeams.forEach(team => {
        const teamNames = [team.equipo, team.nombre, team.nombreEnFed]
          .map(normalizeTeamKey)
          .filter(Boolean);

        if (teamNames.includes(selectedTeamKey)) {
          selectedTeamIds.add(String(team.id));
          teamNames.forEach(name => selectedTeamNames.add(name));
        }
      });
    }

    return [...players]
      .filter(player => player.nombre || player.apodo)
      .filter(player => {
        if (teamFilter === 'all') return true;

        const playerTeamId = player.equipoId ? String(player.equipoId) : '';
        if (playerTeamId && selectedTeamIds.has(playerTeamId)) return true;

        const playerTeamKey = normalizeTeamKey(player.equipo);
        return Boolean(playerTeamKey && selectedTeamNames.has(playerTeamKey));
      })
      .sort((a, b) => (a.apodo || a.nombre).localeCompare(b.apodo || b.nombre));
  }, [players, teamFilter, internalCompetitionTeams]);

  useEffect(() => {
    if (playerFilter === 'all') return;
    if (!availablePlayers.some(player => String(player.id) === playerFilter)) {
      setPlayerFilter('all');
    }
  }, [availablePlayers, playerFilter]);

  useEffect(() => {
    if (teamFilter !== 'all' && !availableTeams.includes(teamFilter)) {
      setTeamFilter('all');
    }
  }, [availableTeams, teamFilter]);

  useEffect(() => {
    if (playerFilter === 'all' || matchReportsLoaded) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await db.match_reports.get();
        if (!cancelled) setMatchReports((data as MatchReport[]) || []);
      } catch (err) {
        console.error('No se pudieron cargar los informes de partido para el filtro de jugador', err);
        if (!cancelled) setMatchReports([]);
      } finally {
        if (!cancelled) setMatchReportsLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [playerFilter, matchReportsLoaded]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(ev => { if (ev.type) types.add(ev.type); });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const availableActivities = useMemo(() => {
    if (typeFilter !== 'Partido' && typeFilter !== 'Sesión' && typeFilter !== 'Entrenamiento') {
      return [];
    }

    const activities = new Set<string>();
    events.forEach(ev => {
      if (ev.type !== typeFilter) return;
      const activity = getEventActivity(ev);
      if (activity) activities.add(activity);
    });

    return Array.from(activities).sort((a, b) => a.localeCompare(b));
  }, [events, typeFilter]);

  useEffect(() => {
    if (activityFilter === 'all') return;
    if (!availableActivities.includes(activityFilter)) {
      setActivityFilter('all');
    }
  }, [activityFilter, availableActivities]);

  const filteredEvents = useMemo(() => {
    const dateFrom = filterDateFrom ? new Date(filterDateFrom) : null;
    const dateTo = filterDateTo ? new Date(filterDateTo) : null;

    return events.filter(ev => {
      if (typeFilter !== 'all' && ev.type !== typeFilter) return false;
      if (activityFilter !== 'all' && getEventActivity(ev) !== activityFilter) return false;
      if (localidadId !== 'all' && ev.localidad_id !== localidadId) return false;
      if (instalacionPrincipalId !== 'all') {
        const matchesPrincipal = ev.instalacion_campo_id === instalacionPrincipalId
          || (ev.instalacion_campo_id ? campoParentMap.get(ev.instalacion_campo_id) === instalacionPrincipalId : false);
        if (!matchesPrincipal) return false;
      }
      if (instalacionId !== 'all' && ev.instalacion_campo_id !== instalacionId) return false;
      if (teamFilter !== 'all') {
        if (getEventTeamKey(ev) !== teamFilter) return false;
      }
      if (playerFilter !== 'all') {
        const selectedPlayer = players.find(player => String(player.id) === playerFilter);
        if (!selectedPlayer || !playerParticipatesInEvent(ev, selectedPlayer)) return false;
      }
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
      if (monthFilter !== 'all' && d.getMonth() !== Number(monthFilter)) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo) {
        const dateToEnd = new Date(dateTo);
        dateToEnd.setHours(23, 59, 59, 999);
        if (d > dateToEnd) return false;
      }
      return true;
    });
  }, [events, teamFilter, playerFilter, typeFilter, activityFilter, monthFilter, filterDateFrom, filterDateTo, players, teamAliasesByCompetitionTeamId, internalTeamCanonicalByName, matchReportById, localidadId, instalacionPrincipalId, instalacionId, campoParentMap]);

  const teamColorLegend = useMemo(() => {
    const keys = new Set<string>();
    filteredEvents.forEach(ev => {
      const key = getEventTeamKey(ev);
      if (key) keys.add(key);
    });
    return Array.from(keys)
      .sort((a, b) => a.localeCompare(b))
      .map(key => ({ key, color: getTeamColor(key)! }));
  }, [filteredEvents, competitionTeams]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach(ev => {
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [filteredEvents]);

  const getMonthMatrix = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const matrix: (Date | null)[][] = [];
    let week: (Date | null)[] = [];
    const day = new Date(firstDay);

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
      day.setDate(day.getDate() + 1);
    }

    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      matrix.push(week);
    }

    return matrix;
  };

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const weekStart = useMemo(() => {
    const base = new Date(currentMonth);
    const start = new Date(base);
    start.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return start;
  }, [currentMonth]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    return d;
  }), [weekStart]);

  const eventsByMonth = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    filteredEvents.forEach(ev => {
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
      const key = d.getMonth();
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [filteredEvents]);

  const scheduleDays = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + index);
      return d;
    });
    return days;
  }, [weekStart]);

  const scheduleHours = useMemo(
    () => Array.from({ length: 14 }, (_, index) => 9 + index),
    []
  );

  const parseEventTime = (time?: string) => {
    if (!time) return null;
    const match = String(time).match(/^(\d{1,2})(?::(\d{2}))?/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2] || '0');
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return { hour, minute };
  };

  const renderScheduleGrid = () => {
    const scheduleEvents = scheduleDays.map(date => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      return { date, events: eventsByDay[key] || [] };
    });

    return (
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <div className="min-w-[980px]">
          <div
            className="grid gap-px rounded-2xl overflow-hidden border border-slate-200 bg-slate-200"
            style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}
          >
            <div className="bg-white px-3 py-3"></div>
            {scheduleEvents.map(({ date }) => (
              <div key={date.toISOString()} className="bg-white px-3 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {dayNames[date.getDay()]}
                </p>
                <p className={`text-sm font-black ${isToday(date) ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                  {date.getDate()}
                </p>
              </div>
            ))}

            {scheduleHours.map(hour => (
              <React.Fragment key={hour}>
                <div className="bg-white px-2 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {scheduleEvents.map(({ date, events: dayEvents }) => {
                  const hourEvents = dayEvents.filter(ev => {
                    const parsed = parseEventTime(ev.time);
                    return parsed && parsed.hour === hour;
                  });
                  const compact = hourEvents.length > 1;

                  return (
                    <div
                      key={`${date.toISOString()}-${hour}`}
                      className={`min-h-12 bg-white p-1.5 ${isToday(date) ? 'bg-red-50' : ''}`}
                    >
                      <div className={hourEvents.length > 0 ? 'flex flex-row gap-1 items-stretch' : 'space-y-1'}>
                        {hourEvents.map(ev => {
                          const teamColor = getTeamColor(getEventTeamKey(ev));
                          const isMatch = ev.type === 'Partido';
                          const displayLocalTeam = resolveTeamDisplayName(ev.localTeam);
                          const displayVisitorTeam = resolveTeamDisplayName(ev.visitorTeam);
                          const localDisplay = resolveMatchSideDisplay(ev, ev.localTeam, ev.localTeamClubId);
                          const visitorDisplay = resolveMatchSideDisplay(ev, ev.visitorTeam, ev.visitorTeamClubId);
                          const localLogo = resolveTeamLogo(ev.localTeamClubId, ev.localTeam, displayLocalTeam);
                          const visitorLogo = resolveTeamLogo(ev.visitorTeamClubId, ev.visitorTeam, displayVisitorTeam);

                          return (
                            <div
                              key={ev.id}
                              onClick={() => {
                                setSelectedEvent(ev);
                                onClickEvent?.(ev);
                              }}
                              className={`flex-1 min-w-0 rounded-lg px-1.5 py-1.5 text-[10px] font-bold cursor-pointer transition-all hover:shadow-md border-2 ${teamColor?.thick || EVENT_THICK_COLORS[ev.type] || EVENT_THICK_COLORS.Otro} ${isMatch ? 'flex flex-col gap-1' : ''}`}
                              title={isMatch
                                ? `${ev.time || ''} ${displayLocalTeam || ''} vs ${displayVisitorTeam || ev.opponent || ''}`
                                : `${formatEventLabel(ev.time, ev.team)} - ${ev.title}`}
                            >
                              {isMatch ? (
                                compact ? (
                                  <div className="flex flex-col items-center gap-0.5 w-full text-center">
                                    <span className="text-[10px] font-black leading-none">{ev.time || '--:--'}</span>
                                    {(ev.localTeam && ev.visitorTeam) ? (
                                      <span className="text-[9px] font-semibold leading-tight line-clamp-2 w-full">
                                        {localDisplay.teamName} <span className="opacity-60">vs</span> {visitorDisplay.teamName}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-semibold leading-tight line-clamp-2 w-full">
                                        {ev.title || ev.opponent || 'Partido'}
                                      </span>
                                    )}
                                    {ev.score && (
                                      <span className="text-[9px] font-black text-white bg-red-700 rounded px-1 leading-tight">
                                        {ev.score}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <span className="flex items-center gap-1 min-w-0 bg-white/60 rounded px-1.5 py-0.5 w-fit">
                                      <i className="fa-solid fa-clock text-[9px] opacity-70 flex-shrink-0"></i>
                                      <span className="text-[11px] font-black leading-none">{ev.time || '--:--'}</span>
                                    </span>
                                    {(ev.localTeam && ev.visitorTeam) ? (
                                      <div className="flex items-center gap-1">
                                        <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                                          {localLogo ? (
                                            <img loading="lazy" decoding="async" src={localLogo} alt="" className="h-6 w-6 object-contain flex-shrink-0 mb-0.5 rounded-full bg-white shadow-sm ring-1 ring-black/5" />
                                          ) : (
                                            <div className="h-6 w-6 rounded-full bg-white/70 flex items-center justify-center mb-0.5 flex-shrink-0">
                                              <i className="fa-solid fa-shield-halved text-[9px] opacity-40"></i>
                                            </div>
                                          )}
                                          <span className="block text-[8px] font-bold uppercase tracking-wide opacity-60 truncate w-full leading-none mb-0.5">{localDisplay.clubName}</span>
                                          <span className="block truncate w-full text-[10px] leading-tight">{localDisplay.teamName}</span>
                                        </div>
                                        <span className="flex-shrink-0 bg-red-600 text-white text-[9px] font-black leading-none px-1.5 py-1 rounded-full shadow-sm">VS</span>
                                        <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                                          {visitorLogo ? (
                                            <img loading="lazy" decoding="async" src={visitorLogo} alt="" className="h-6 w-6 object-contain flex-shrink-0 mb-0.5 rounded-full bg-white shadow-sm ring-1 ring-black/5" />
                                          ) : (
                                            <div className="h-6 w-6 rounded-full bg-white/70 flex items-center justify-center mb-0.5 flex-shrink-0">
                                              <i className="fa-solid fa-shield-halved text-[9px] opacity-40"></i>
                                            </div>
                                          )}
                                          <span className="block text-[8px] font-bold uppercase tracking-wide opacity-60 truncate w-full leading-none mb-0.5">{visitorDisplay.clubName}</span>
                                          <span className="block truncate w-full text-[10px] leading-tight">{visitorDisplay.teamName}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] font-semibold leading-tight truncate block">
                                        {ev.title || ev.opponent || 'Partido'}
                                      </span>
                                    )}
                                    {ev.score && (
                                      <div className="text-[10px] font-black text-white bg-red-700 rounded-md py-0.5 text-center">
                                        {ev.score}
                                      </div>
                                    )}
                                  </>
                                )
                              ) : (
                                compact ? (
                                  <div className="flex flex-col items-center gap-0.5 w-full text-center">
                                    <span className="text-[10px] font-black leading-none">{ev.time || '--:--'}</span>
                                    {ev.team && (
                                      <span className="text-[9px] font-semibold leading-tight line-clamp-1 w-full">{ev.team}</span>
                                    )}
                                    {ev.title && (
                                      <span className="text-[9px] leading-tight line-clamp-2 w-full opacity-90">{ev.title}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="truncate leading-tight block">
                                    {formatEventLabel(ev.time, ev.team)} {ev.title}
                                  </span>
                                )
                              )}
                            </div>
                          );
                        })}
                        {hourEvents.length === 0 && onCreateEvent && hour === 9 && (
                          <button
                            onClick={() => onCreateEvent(date)}
                            className="w-full rounded-lg border border-dashed border-slate-300 text-[10px] font-bold text-slate-500 py-2 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                          >
                            + {t('calendarView.newEventButton')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyGrid = () => (
    <div className="flex-1 p-3 md:p-6 overflow-y-auto">
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
        {orderedDayNames.map(day => (
          <div key={day} className="text-[9px] md:text-xs font-black text-slate-400 uppercase text-center py-1 md:py-2">{day.slice(0,3)}</div>
        ))}
      </div>

      {getMonthMatrix(currentMonth).map((week, i) => (
        <div key={i} className="grid grid-cols-7 gap-1 md:gap-2 mb-1.5 md:mb-2">
          {week.map((date, j) => {
            const inMonth = date && date.getMonth() === currentMonth.getMonth();
            const dayKey = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : '';
            const dayEvents = dayKey ? (eventsByDay[dayKey] || []) : [];

            return (
              <div
                key={j}
                className={`min-h-12 md:min-h-16 rounded-xl border border-slate-100 bg-slate-50 p-1 flex flex-col relative transition-all ${
                  !inMonth ? 'opacity-30' : ''
                } ${dragOverDate && date && date.getTime() === dragOverDate.getTime() ? 'bg-blue-100 border-blue-400 shadow-lg' : ''}`}
                onDragOver={(e) => {
                  if (!date || draggedEvent?.type === 'Partido') return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  setDragOverDate(date);
                }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedEvent && draggedEvent.type !== 'Partido' && date) {
                    const newEvent = { ...draggedEvent, id: generateUUID(), date };
                    onSaveEvent?.(newEvent);
                    setDraggedEvent(null);
                    setDragOverDate(null);
                  }
                }}
              >
                {inMonth && onCreateEvent && (
                  <button
                    className="absolute top-1 left-1 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-[14px] shadow-md z-10"
                    style={{ fontSize: '16px' }}
                    onClick={(e) => { e.stopPropagation(); onCreateEvent(date ?? undefined); }}
                    title={t('calendarView.newEvent')}
                  >
                    <i className="fa-solid fa-plus"></i>
                  </button>
                )}
                <div className="text-[11px] font-black text-[var(--accent)] text-right pr-1">{date ? date.getDate() : ''}</div>
                <div className="flex-1 flex flex-col gap-1">
                  {dayEvents.map(ev => {
                    const teamColor = getTeamColor(getEventTeamKey(ev));
                    const deleteColors = teamColor
                      ? { color: teamColor.delColor, hoverBg: teamColor.delHover }
                      : (EVENT_DELETE_HOVER_COLORS[ev.type] || EVENT_DELETE_HOVER_COLORS.Otro);
                    const isMatch = ev.type === 'Partido';
                    const displayLocalTeam = resolveTeamDisplayName(ev.localTeam);
                    const displayVisitorTeam = resolveTeamDisplayName(ev.visitorTeam);
                    const localDisplay = resolveMatchSideDisplay(ev, ev.localTeam, ev.localTeamClubId);
                    const visitorDisplay = resolveMatchSideDisplay(ev, ev.visitorTeam, ev.visitorTeamClubId);
                    const localLogo = resolveTeamLogo(ev.localTeamClubId, ev.localTeam, displayLocalTeam);
                    const visitorLogo = resolveTeamLogo(ev.visitorTeamClubId, ev.visitorTeam, displayVisitorTeam);
                    return (
                      <div
                        key={ev.id}
                        draggable={!isMatch}
                        className={`rounded-lg px-1.5 py-1.5 text-[11px] font-bold cursor-pointer group/ev transition-all opacity-100 hover:shadow-md border-2 ${teamColor?.thick || EVENT_THICK_COLORS[ev.type] || EVENT_THICK_COLORS.Otro} ${isMatch ? 'flex flex-col gap-1' : 'flex items-center gap-0.5'}`}
                        title={isMatch
                          ? `${ev.time || ''} ${displayLocalTeam || ''} vs ${displayVisitorTeam || ev.opponent || ''}`
                          : `${formatEventLabel(ev.time, ev.team)} - ${ev.title}`}
                        onDragStart={(e) => {
                          if (isMatch) {
                            e.preventDefault();
                            return;
                          }
                          e.dataTransfer!.effectAllowed = 'copy';
                          e.dataTransfer!.setData('text/plain', JSON.stringify(ev));
                          setDraggedEvent(ev);
                        }}
                        onDragEnd={() => {
                          setDraggedEvent(null);
                          setDragOverDate(null);
                        }}
                      >
                        {isMatch ? (
                          <div
                            className="flex flex-col gap-1 w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                              onClickEvent?.(ev);
                            }}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="flex items-center gap-1 min-w-0 bg-white/60 rounded px-1.5 py-1">
                                <i className="fa-solid fa-clock text-[10px] opacity-70 flex-shrink-0"></i>
                                <span className="text-xs font-black leading-none">{ev.time || '--:--'}</span>
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteEvent?.(ev.id);
                                }}
                                className="hidden sm:group-hover/ev:flex w-3.5 h-3.5 items-center justify-center rounded-full flex-shrink-0 transition-all"
                                style={{ color: deleteColors.color }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = deleteColors.hoverBg}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                title={t('common.delete')}
                              >
                                <i className="fa-solid fa-xmark" style={{ fontSize: '8px' }}></i>
                              </button>
                            </div>
                            {(ev.localTeam && ev.visitorTeam) ? (
                              <div className="flex items-center gap-1">
                                <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                                  {localLogo ? (
                                    <img loading="lazy" decoding="async" src={localLogo} alt="" className="h-7 w-7 object-contain flex-shrink-0 mb-0.5 rounded-full bg-white shadow-sm ring-1 ring-black/5" />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-white/70 flex items-center justify-center mb-0.5 flex-shrink-0">
                                      <i className="fa-solid fa-shield-halved text-[10px] opacity-40"></i>
                                    </div>
                                  )}
                                  <span className="block text-[9px] font-bold uppercase tracking-wide opacity-60 truncate w-full leading-none mb-0.5">{localDisplay.clubName}</span>
                                  <span className="block truncate w-full text-xs leading-tight">{localDisplay.teamName}</span>
                                </div>
                                <span className="flex-shrink-0 bg-red-600 text-white text-[10px] font-black leading-none px-2 py-1.5 rounded-full shadow-sm">VS</span>
                                <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                                  {visitorLogo ? (
                                    <img loading="lazy" decoding="async" src={visitorLogo} alt="" className="h-7 w-7 object-contain flex-shrink-0 mb-0.5 rounded-full bg-white shadow-sm ring-1 ring-black/5" />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-white/70 flex items-center justify-center mb-0.5 flex-shrink-0">
                                      <i className="fa-solid fa-shield-halved text-[10px] opacity-40"></i>
                                    </div>
                                  )}
                                  <span className="block text-[9px] font-bold uppercase tracking-wide opacity-60 truncate w-full leading-none mb-0.5">{visitorDisplay.clubName}</span>
                                  <span className="block truncate w-full text-xs leading-tight">{visitorDisplay.teamName}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold leading-tight truncate block">
                                {ev.title || ev.opponent || 'Partido'}
                              </span>
                            )}
                            {ev.score && (
                              <div className="text-[11px] font-black text-white bg-red-700 rounded-md py-0.5 text-center">
                                {ev.score}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <i className="fa-solid fa-grip-vertical text-[10px] opacity-70 hover:opacity-100 flex-shrink-0"></i>
                            <span
                              className="truncate leading-tight flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(ev);
                                onClickEvent?.(ev);
                              }}
                            >
                              {formatEventLabel(ev.time, ev.team)} {ev.title}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEvent?.(ev.id);
                              }}
                              className="flex sm:hidden sm:group-hover/ev:flex w-3.5 h-3.5 items-center justify-center rounded-full flex-shrink-0 transition-all"
                              style={{ color: deleteColors.color }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = deleteColors.hoverBg}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              title={t('common.delete')}
                            >
                              <i className="fa-solid fa-xmark" style={{ fontSize: '8px' }}></i>
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const weeklyTeamRows = useMemo(() => {
    const keys = new Set<string>();
    filteredEvents.forEach(ev => {
      const key = getEventTeamKey(ev);
      keys.add(key || t('calendarView.noTeam', 'Sin equipo'));
    });
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [filteredEvents, t]);

  const renderWeeklyGrid = () => {
    const weekEvents = weekDays.map(date => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      return { date, events: eventsByDay[key] || [] };
    });
    const noTeamLabel = t('calendarView.noTeam', 'Sin equipo');

    return (
      <div className="flex-1 p-3 md:p-6 overflow-auto">
        <div className="min-w-[980px]">
          <div
            className="grid gap-px rounded-2xl overflow-hidden border border-slate-200 bg-slate-200"
            style={{ gridTemplateColumns: '160px repeat(7, minmax(0, 1fr))' }}
          >
            <div className="bg-slate-50/60 px-3 py-3 flex items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('calendarView.team', 'Equipo')}
              </span>
            </div>
            {weekEvents.map(({ date }) => {
              const isTodayDate = isToday(date);
              return (
                <div key={date.toISOString()} className="bg-slate-50/60 px-3 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {dayNames[date.getDay()]}
                  </p>
                  <p className={`text-sm font-black ${isTodayDate ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}

            {weeklyTeamRows.length === 0 ? (
              <div className="bg-white px-4 py-8 text-center text-sm font-medium text-slate-400" style={{ gridColumn: '1 / -1' }}>
                {t('calendarView.noEvents', 'Sin eventos')}
              </div>
            ) : weeklyTeamRows.map(team => {
              const teamColor = team !== noTeamLabel ? getTeamColor(team) : null;
              return (
                <React.Fragment key={team}>
                  <div className="bg-white px-3 py-3 flex items-center gap-2 min-w-0">
                    {teamColor && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${teamColor.dot}`}></span>}
                    <span className="text-xs font-black text-slate-700 truncate">{team}</span>
                  </div>
                  {weekEvents.map(({ date, events: dayEvents }) => {
                    const cellEvents = dayEvents.filter(ev => (getEventTeamKey(ev) || noTeamLabel) === team);
                    return (
                      <div
                        key={`${team}-${date.toISOString()}`}
                        className={`min-h-14 bg-white p-1.5 ${isToday(date) ? 'bg-red-50' : ''}`}
                      >
                        <div className="space-y-1">
                          {cellEvents.map(ev => {
                            const evTeamColor = getTeamColor(getEventTeamKey(ev));
                            const isMatch = ev.type === 'Partido';
                            const displayLocalTeam = resolveTeamDisplayName(ev.localTeam);
                            const displayVisitorTeam = resolveTeamDisplayName(ev.visitorTeam);
                            return (
                              <div
                                key={ev.id}
                                onClick={() => {
                                  setSelectedEvent(ev);
                                  onClickEvent?.(ev);
                                }}
                                className={`rounded-lg px-2 py-1 text-[10px] font-bold border cursor-pointer ${evTeamColor?.badge || EVENT_BADGE_COLORS[ev.type] || EVENT_BADGE_COLORS.Otro}`}
                                title={isMatch
                                  ? `${ev.time || ''} ${displayLocalTeam || ''} vs ${displayVisitorTeam || ev.opponent || ''}`
                                  : `${formatEventLabel(ev.time, ev.team)} - ${ev.title}`}
                              >
                                <span className="font-black">{ev.time || '--:--'}</span>
                                {isMatch ? (
                                  (displayLocalTeam && displayVisitorTeam) ? (
                                    <div className="truncate leading-tight">
                                      {displayLocalTeam} <span className="opacity-60">vs</span> {displayVisitorTeam}
                                    </div>
                                  ) : (
                                    <span className="truncate"> {ev.title || ev.opponent || 'Partido'}</span>
                                  )
                                ) : (
                                  <span className="truncate"> {ev.title}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const annualEvents = useMemo(() => {
    return filteredEvents
      .filter(ev => {
        const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
        return d.getFullYear() === currentMonth.getFullYear();
      })
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        const diff = da.getTime() - db.getTime();
        if (diff !== 0) return diff;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [filteredEvents, currentMonth]);

  const renderAnnualGrid = () => (
    <div className="flex-1 p-3 md:p-6 overflow-y-auto">
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/60 border-b border-slate-100">
              <th className="px-4 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('common.date', 'Día')}
              </th>
              <th className="px-4 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('common.time', 'Hora')}
              </th>
              <th className="px-4 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('calendarView.team', 'Equipo')}
              </th>
              <th className="px-4 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('calendarView.type', 'Tipo')}
              </th>
              <th className="px-4 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('calendarView.activity', 'Actividad')}
              </th>
              <th className="px-4 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('common.location', 'Lugar')}
              </th>
              <th className="px-4 md:px-6 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {annualEvents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 md:px-6 py-8 text-center text-sm font-medium text-slate-400">
                  {t('calendarView.noEvents', 'Sin eventos')}
                </td>
              </tr>
            )}
            {annualEvents.map(ev => {
              const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
              const isMatch = ev.type === 'Partido';
              const displayLocalTeam = resolveTeamDisplayName(ev.localTeam);
              const displayVisitorTeam = resolveTeamDisplayName(ev.visitorTeam);
              const teamKey = getEventTeamKey(ev);
              const activityLabel = isMatch
                ? (displayLocalTeam && displayVisitorTeam
                    ? `${displayLocalTeam} vs ${displayVisitorTeam}`
                    : (ev.title || ev.opponent || 'Partido'))
                : ev.title;
              const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
              return (
                <tr
                  key={ev.id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    onClickEvent?.(ev);
                  }}
                  className={`cursor-pointer border-b border-slate-50 last:border-b-0 transition-colors hover:bg-slate-50 ${
                    isCurrentMonth ? 'bg-red-50/20' : ''
                  }`}
                >
                  <td className="px-4 md:px-6 py-3.5 whitespace-nowrap">
                    <span className={`text-sm font-black ${isToday(d) ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                      {d.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-3.5 whitespace-nowrap">
                    <span className="text-sm font-bold text-slate-500">{ev.time || '--:--'}</span>
                  </td>
                  <td className="px-4 md:px-6 py-3.5 whitespace-nowrap">
                    {teamKey && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <span className={`w-2 h-2 rounded-full ${getTeamColor(teamKey)?.dot || EVENT_DOT_COLORS[ev.type] || EVENT_DOT_COLORS.Otro}`}></span>
                        {teamKey}
                      </span>
                    )}
                  </td>
                  <td className="px-4 md:px-6 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${EVENT_BADGE_COLORS[ev.type] || EVENT_BADGE_COLORS.Otro}`}>
                      {ev.type}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-3.5">
                    <span className="text-sm font-bold text-slate-700">{activityLabel}</span>
                  </td>
                  <td className="px-4 md:px-6 py-3.5">
                    <span className="text-sm text-slate-500">{ev.location || '-'}</span>
                  </td>
                  <td className="px-4 md:px-6 py-3.5 text-right">
                    {onDeleteEvent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEvent(ev.id);
                        }}
                        className="w-6 h-6 inline-flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title={t('common.delete')}
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in flex h-full min-h-[calc(100vh-110px)] flex-col gap-4 pb-6">
      {/* GESTION CALENDAR VIEW - VERSION 2.0 WITH FILTERS */}
      <div className="sticky top-0 z-30 flex items-center gap-3 -mx-2 px-3 py-1 flex-wrap bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 border-b border-slate-200/70 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <SearchableSelect
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          >
            <option value="all">{t('calendarView.filterAllTeams', 'Todos los equipos')}</option>
            {availableTeams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </SearchableSelect>
          <SearchableSelect
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          >
            <option value="all">{t('calendarView.filterAllPlayers', 'Jugadores')}</option>
            {availablePlayers.map(player => (
              <option key={player.id} value={String(player.id)}>
                {player.dorsal ? `${player.dorsal} - ` : ''}{player.apodo || player.nombre}
              </option>
            ))}
          </SearchableSelect>
          <SearchableSelect
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setActivityFilter('all');
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          >
            <option value="all">{t('calendarView.filterAllEvents', 'Todos los eventos')}</option>
            {availableTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </SearchableSelect>
          <SearchableSelect
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            disabled={availableActivities.length === 0}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="all">
              {availableActivities.length === 0
                ? t('calendarView.filterSelectEventType', 'Actividad')
                : t('calendarView.filterAllActivities', 'Todas las actividades')}
            </option>
            {availableActivities.map(activity => (
              <option key={activity} value={activity}>{activity}</option>
            ))}
          </SearchableSelect>
          <SearchableSelect
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          >
            <option value="all">{t('calendarView.filterAllMonths', 'Todos los meses')}</option>
            {monthNames.map((name, index) => (
              <option key={name} value={String(index)}>{name}</option>
            ))}
          </SearchableSelect>
          <SearchableSelect
            value={localidadId}
            onChange={(e) => setLocalidadId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          >
            <option value="all">Todas las localidades</option>
            {localidades.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.nombre}</option>
            ))}
          </SearchableSelect>
          <SearchableSelect
            value={instalacionPrincipalId}
            onChange={(e) => setInstalacionPrincipalId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          >
            <option value="all">Todas las instalaciones</option>
            {instalacionesPrincipales.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.nombre}</option>
            ))}
          </SearchableSelect>
          <SearchableSelect
            value={instalacionId}
            onChange={(e) => setInstalacionId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          >
            <option value="all">Todos los campos</option>
            {camposDisponibles.map(campo => (
              <option key={campo.id} value={campo.id}>{campo.nombre}</option>
            ))}
          </SearchableSelect>
          <div className="flex items-center gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.dateFrom', 'Desde')}:</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.dateTo', 'Hasta')}:</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            {(filterDateFrom || filterDateTo || localidadId !== 'all' || instalacionPrincipalId !== 'all' || instalacionId !== 'all') && (
              <button
                type="button"
                onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setLocalidadId('all'); setInstalacionPrincipalId('all'); setInstalacionId('all'); }}
                className="px-2 py-1 text-[9px] font-black text-red-600 hover:text-red-700 uppercase"
              >
                ✕ {t('calendarView.clearFilter', 'Limpiar')}
              </button>
            )}
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm ml-auto">
          <button
            type="button"
            onClick={() => setActiveView('monthly')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all ${
              activeView === 'monthly'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
            }`}
            aria-label="Vista mensual"
            title="Vista mensual"
          >
            <i className="fa-solid fa-calendar-days"></i>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('annual')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all ${
              activeView === 'annual'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
            }`}
            aria-label="Vista anual"
            title="Vista anual"
          >
            <i className="fa-solid fa-calendar"></i>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('weekly')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all ${
              activeView === 'weekly'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
            }`}
            aria-label="Vista semanal"
            title="Vista semanal"
          >
            <i className="fa-solid fa-calendar-week"></i>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('schedule')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all ${
              activeView === 'schedule'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
            }`}
            aria-label="Vista horaria"
            title="Vista horaria"
          >
            <i className="fa-solid fa-clock"></i>
          </button>
        </div>
      </div>


      <div className="flex-1 w-full">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl min-h-[75dvh] flex flex-col overflow-hidden">
          <div className="px-4 md:px-6 py-2 md:py-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                if (activeView === 'annual') {
                  setCurrentMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
                } else if (activeView === 'schedule') {
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
                } else {
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                }
              }}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all shadow-sm"
              aria-label="Anterior"
            >
              <i className="fa-solid fa-chevron-left text-sm"></i>
            </button>
            <div className="text-center">
              <h4 className="text-[var(--accent)] font-black text-base md:text-lg uppercase tracking-wider">
                {activeView === 'annual'
                  ? String(currentMonth.getFullYear())
                  : `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}
              </h4>
              <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.25em] mt-0.5">
                {activeView === 'annual'
                  ? 'Vista anual'
                  : activeView === 'weekly'
                    ? 'Vista semanal'
                    : activeView === 'schedule'
                      ? 'Vista horaria'
                    : 'Vista mensual'}
              </p>
            </div>
            <button
              onClick={() => {
                if (activeView === 'annual') {
                  setCurrentMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
                } else if (activeView === 'schedule') {
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
                } else {
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                }
              }}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all shadow-sm"
              aria-label="Siguiente"
            >
              <i className="fa-solid fa-chevron-right text-sm"></i>
            </button>
          </div>

          {activeView === 'annual' && renderAnnualGrid()}
          {activeView === 'monthly' && renderMonthlyGrid()}
          {activeView === 'weekly' && renderWeeklyGrid()}
          {activeView === 'schedule' && renderScheduleGrid()}
        </div>
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${EVENT_DOT_COLORS[selectedEvent.type] || EVENT_DOT_COLORS.Otro}`}></span>
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${EVENT_BADGE_COLORS[selectedEvent.type] || EVENT_BADGE_COLORS.Otro}`}>
                  {selectedEvent.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onDeleteEvent && (
                  <button
                    onClick={() => {
                      onDeleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-400 transition-all hover:border-red-500 hover:bg-red-500 hover:text-white"
                    title={t('calendarView.deleteEvent')}
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                )}
                <button onClick={() => setSelectedEvent(null)} className="text-slate-400 transition-colors hover:text-slate-600">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tight">{selectedEvent.title}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <i className="fa-solid fa-calendar-day text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.date')}</p>
                    <p className="text-sm font-bold text-slate-700">
                      {(selectedEvent.date instanceof Date ? selectedEvent.date : new Date(selectedEvent.date)).toLocaleDateString(i18n.language, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <i className="fa-solid fa-clock text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.time')}</p>
                    <p className="text-sm font-bold text-slate-700">{selectedEvent.time || t('calendarView.noTime')}</p>
                  </div>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <i className="fa-solid fa-location-dot text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.location')}</p>
                      <p className="text-sm font-bold text-slate-700">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.type === 'Partido' && selectedEvent.opponent && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <i className="fa-solid fa-futbol text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.opponent')}</p>
                      <p className="text-sm font-bold text-slate-700">{selectedEvent.opponent}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.notes && (
                  <div className="mt-2 rounded-xl bg-slate-50 p-4">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.notes')}</p>
                    <p className="text-sm text-slate-600">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestionCalendarView;
