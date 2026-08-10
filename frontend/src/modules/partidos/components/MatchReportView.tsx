// Force Vercel redeploy - v2
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Player } from '@modules/plantilla';
import type { TacticalPosition } from '@modules/tactica';
import { getInitialPositions } from '@modules/tactica';
import type { CalendarEvent } from '@modules/calendario';
import type { CompetitionTeam } from '@modules/competicion';
import { competicionService } from '@modules/competicion';
import type { AbpItem, MatchReport, VideoEvent, MatchSubstitution, MatchFormationChange, MatchGoal, MatchCard } from '../types';
import { db, equiposService, clubesService, plantillasService } from '@shared/services/dataService';
import type { Equipo, Jugador, Club, Competicion } from '@shared/services/dataService';
import { TacticalBoard } from '@modules/tactica';
import ActaPartidoView from './ActaPartidoView';
import EquipoSelect from '@shared/components/EquipoSelect';
import PlayerStatsCharts from './PlayerStatsCharts';
import SystemMinutesCharts from './SystemMinutesCharts';
import { uploadVideoToYouTube, validateVideoFile, formatFileSize, type YouTubeUploadProgress } from '@shared/services/youtubeUploadService';
import { uploadMatchReportFile } from '@shared/services/photoService';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

type AbpSection =
  | 'abpOffCorners' | 'abpOffLateralFouls' | 'abpDefCorners' | 'abpDefLateralFouls' | 'abpDefFrontalFouls'
  | 'rivalAbpOffCorners' | 'rivalAbpOffLateralFouls' | 'rivalAbpDefCorners' | 'rivalAbpDefLateralFouls' | 'rivalAbpDefFrontalFouls';

const newAbpItem = (): AbpItem => ({ id: crypto.randomUUID(), text: '', image: '', video: '' });

// Separa posiciones que caen muy cerca entre sí (p.ej. tras sustituciones o
// cambios de sistema mal ajustados) para que no se dibujen círculos superpuestos.
// La distancia se normaliza según el aspect ratio del contenedor del campo:
// un mismo % de diferencia vertical y horizontal no ocupa los mismos píxeles
// reales cuando el campo no es cuadrado (p.ej. aspect-video 16:9).
const resolveFieldCollisions = <T extends { x: number; y: number }>(
  items: T[],
  aspectRatio: number,
  threshold = 6,
  spread = 8,
): T[] => {
  const clusters: T[][] = [];
  items.forEach(item => {
    const cluster = clusters.find(c =>
      c.some(other => Math.hypot(other.x - item.x, (other.y - item.y) / aspectRatio) < threshold)
    );
    if (cluster) cluster.push(item);
    else clusters.push([item]);
  });

  return clusters.flatMap(cluster => {
    if (cluster.length === 1) return cluster;
    return cluster.map((item, i) => ({
      ...item,
      x: Math.min(96, Math.max(4, item.x + (i - (cluster.length - 1) / 2) * spread)),
    }));
  });
};

interface MatchReportViewProps {
  match: CalendarEvent;
  onBack: () => void;
  /** Id de mi club (currentTeam.id) — cualquier otro equipo se trata como rival. */
  ownClubId?: string;
  competitionTeams?: CompetitionTeam[];
  onSave?: (event: CalendarEvent) => void;
  onDelete?: (id: string | number) => void;
}

const timeToSeconds = (time: string): number => {
  if (!time || !time.includes(':')) return parseInt(time) * 60 || 0;
  const [min, sec] = time.split(':').map(Number);
  return (min * 60) + (sec || 0);
};

const formatSeconds = (totalSeconds: number): string => {
  const min = Math.floor(totalSeconds / 60);
  const sec = Math.floor(totalSeconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const formatHMS = (totalSeconds: number): string => {
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  const sec = Math.floor(totalSeconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const isBlockedEmbed = (url: string) => {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('veo.co');
  } catch {
    return url.includes('veo.co');
  }
};

const getEmbedUrl = (url: string, startSeconds?: number) => {
  if (!url) return '';
  let videoId = '';
  let hash = '';
  let baseUrl = '';

  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    videoId = ytMatch[1];
    baseUrl = `https://www.youtube.com/embed/${videoId}`;
  } else {
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (vimeoMatch) {
        videoId = vimeoMatch[1];
        hash = vimeoMatch[2];
        baseUrl = `https://player.vimeo.com/video/${videoId}`;
        if (hash) {
          baseUrl += `?h=${hash}`;
        }
    } else {
        return url;
    }
  }

  const origin = window.location.origin;
  const params: string[] = [
    'autoplay=1',
    'enablejsapi=1',
    'api=1',
    `origin=${origin}`
  ];
  
  if (startSeconds !== undefined) {
    if (baseUrl.includes('youtube')) params.push(`start=${startSeconds}`);
    if (baseUrl.includes('vimeo')) params.push(`t=${startSeconds}s`);
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params.join('&')}`;
};

const getDocEmbedUrl = (url: string) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('docs.google.com')) return url;

    const presentationMatch = parsed.pathname.match(/\/presentation\/d\/([\w-]+)/);
    if (presentationMatch) {
      return `https://docs.google.com/presentation/d/${presentationMatch[1]}/embed`;
    }

    const documentMatch = parsed.pathname.match(/\/document\/d\/([\w-]+)/);
    if (documentMatch) {
      return `https://docs.google.com/document/d/${documentMatch[1]}/preview`;
    }

    const spreadsheetMatch = parsed.pathname.match(/\/spreadsheets\/d\/([\w-]+)/);
    if (spreadsheetMatch) {
      return `https://docs.google.com/spreadsheets/d/${spreadsheetMatch[1]}/preview`;
    }

    return url;
  } catch {
    return url;
  }
};

const autoResizeTextarea = (element: HTMLTextAreaElement) => {
  element.style.height = 'auto';
  element.style.height = element.scrollHeight + 'px';
};

// Normaliza nombres de equipo para compararlos de forma tolerante (espacios, mayúsculas, tildes)
const normalizeTeamName = (v?: string) =>
  (v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Busca en `teams` el primero cuyo nombre coincida exactamente con algún `wantedNames`,
// y si ninguno coincide exactamente, el primero que lo contenga (o esté contenido en él)
function findTeamByName<T>(teams: T[], wantedNames: string[], getName: (t: T) => string): T | null {
  const wanted = wantedNames.filter(Boolean);
  if (wanted.length === 0) return null;
  const exact = teams.find(t => wanted.includes(normalizeTeamName(getName(t))));
  if (exact) return exact;
  const partial = teams.find(t => {
    const name = normalizeTeamName(getName(t));
    return !!name && wanted.some(w => name.includes(w) || w.includes(name));
  });
  return partial || null;
}

const MatchReportView: React.FC<MatchReportViewProps> = ({ match, onBack, ownClubId, competitionTeams = [], onSave, onDelete }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('DATOS GENERALES');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [squad, setSquad] = useState<Player[]>([]);

  // Formulario "Añadir cambio" en la pestaña Eventos
  const [subForm, setSubForm] = useState({ minute: '', playerOutId: '', playerInId: '' });
  // Edición inline de una sustitución existente (tarjetas "Sistema tras cada cambio")
  const [editingSubstitutionId, setEditingSubstitutionId] = useState<string | null>(null);
  const [substitutionEditForm, setSubstitutionEditForm] = useState({ minute: '', playerOutId: '', playerInId: '' });

  // Datos generales del partido (fecha, hora, club rival, competición, equipos, resultado)
  const [clubs, setClubs] = useState<Club[]>([]);
  const [competitions, setCompetitions] = useState<Competicion[]>([]);
  const [dgSaved, setDgSaved] = useState(false);
  const toDateInputValue = (d: Date | string) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString()).slice(0, 10);
  const [dgForm, setDgForm] = useState({
    date: toDateInputValue(match.date),
    time: match.time || '18:00',
    competition: match.competition || '',
    location: match.location || '',
    jornada: match.jornada || '',
    localTeam: match.localTeam || '',
    visitorTeam: match.visitorTeam || '',
    localTeamClubId: match.localTeamClubId || '',
    visitorTeamClubId: match.visitorTeamClubId || '',
    score: match.score || '',
    nombreInterno: match.nombreInterno || '',
  });

  useEffect(() => {
    setDgForm({
      date: toDateInputValue(match.date),
      time: match.time || '18:00',
      competition: match.competition || '',
      location: match.location || '',
      jornada: match.jornada || '',
      localTeam: match.localTeam || '',
      visitorTeam: match.visitorTeam || '',
      localTeamClubId: match.localTeamClubId || '',
      visitorTeamClubId: match.visitorTeamClubId || '',
      score: match.score || '',
      nombreInterno: match.nombreInterno || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  const clubNameById = useMemo(() => new Map(clubs.map(c => [String(c.id), c.nombre])), [clubs]);
  // Fallback por nombre para partidos antiguos guardados sin clubId por equipo: si dos
  // clubes tienen un equipo homónimo (p.ej. "Juvenil A"), esto solo puede acertar uno de los dos.
  const clubNameByTeamName = useMemo(() => {
    const map = new Map<string, string>();
    competitionTeams.forEach(team => {
      const teamName = team.equipo || team.nombre;
      const clubName = team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined;
      if (teamName && clubName && !map.has(teamName)) map.set(teamName, clubName);
    });
    return map;
  }, [competitionTeams, clubNameById]);
  const resolveClubLabel = (teamName: string, clubId?: string): string | undefined =>
    (clubId && clubNameById.get(String(clubId))) || clubNameByTeamName.get(teamName);
  const localClubLabel = resolveClubLabel(match.localTeam, match.localTeamClubId);
  const visitorClubLabel = resolveClubLabel(match.visitorTeam, match.visitorTeamClubId);
  const teamOptions = useMemo(
    () => competitionTeams
      .map(team => ({
        value: team.equipo || team.nombre || '',
        club: team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined,
        clubId: team.clubId != null ? String(team.clubId) : undefined,
      }))
      .filter(option => option.value.trim().length > 0),
    [competitionTeams, clubNameById]
  );

  const handleSaveDatosGenerales = () => {
    if (!onSave) return;
    onSave({
      ...match,
      date: new Date(dgForm.date),
      time: dgForm.time,
      competition: dgForm.competition || undefined,
      location: dgForm.location || undefined,
      jornada: dgForm.jornada || undefined,
      localTeam: dgForm.localTeam || undefined,
      visitorTeam: dgForm.visitorTeam || undefined,
      localTeamClubId: dgForm.localTeamClubId || undefined,
      visitorTeamClubId: dgForm.visitorTeamClubId || undefined,
      score: dgForm.score || undefined,
      nombreInterno: dgForm.nombreInterno || undefined,
    });
    setDgSaved(true);
    setTimeout(() => setDgSaved(false), 2000);
  };

  const handleDeleteMatch = () => {
    if (!onDelete) return;
    onDelete(match.id);
    onBack();
  };
  
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isLinked, setIsLinked] = useState(false);
  const [isManualPlay, setIsManualPlay] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pollInterval = useRef<any>(null);
  const manualTicker = useRef<any>(null);
  const stopTimeoutRef = useRef<any>(null);

  const [fullscreenAbpVideo, setFullscreenAbpVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!fullscreenAbpVideo) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenAbpVideo(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreenAbpVideo]);

  const [currentNote, setCurrentNote] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [playerFilter, setPlayerFilter] = useState<string | number | 'ALL'>('ALL');
  const [showMatchTimes, setShowMatchTimes] = useState(true);
  const [sharedStartSec, setSharedStartSec] = useState<number | null>(null);
  const sharedStartRef = useRef<number | null>(null);
  
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ minute: string; note: string; playerId: string | number | ''; goalSide: 'FAVOR' | 'CONTRA' | '' }>({ minute: '', note: '', playerId: '', goalSide: '' });
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | number | ''>('');
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalSideSelection, setGoalSideSelection] = useState<'FAVOR' | 'CONTRA' | ''>('');
  const [goalPlayerSelection, setGoalPlayerSelection] = useState<string | number | ''>('');
  const [isDuelDialogOpen, setIsDuelDialogOpen] = useState(false);
  const [duelPlayerSelection, setDuelPlayerSelection] = useState<string | number | ''>('');
  const [abpPreviewImage, setAbpPreviewImage] = useState<string | null>(null);
  const [pitchDiagramPreview, setPitchDiagramPreview] = useState<{ label: string; positions: TacticalPosition[]; highlightIds?: Array<string | number> } | null>(null);
  const resumenExportRef = useRef<HTMLDivElement>(null);
  const [isExportingResumenPdf, setIsExportingResumenPdf] = useState(false);

  // Estado para el flujo interactivo de eventos
  const [selectedPlayerForEvent, setSelectedPlayerForEvent] = useState<Player | null>(null);
  const [eventActionMenu, setEventActionMenu] = useState<{ type: 'GOL' | 'CAMBIO' | 'TARJETA_AMARILLA' | 'TARJETA_ROJA' | null; minute: string; playerInId?: string }>({ type: null, minute: '' });
  const [isWindowPanelOpen, setIsWindowPanelOpen] = useState(false);
  const [windowPanelMinute, setWindowPanelMinute] = useState('');
  const [windowPanelOriginalFormation, setWindowPanelOriginalFormation] = useState('');

  const [expandedMediaBlock, setExpandedMediaBlock] = useState<string | null>(null);
  const [closedMediaBlocks, setClosedMediaBlocks] = useState<Set<string>>(new Set());
  const [collapsedPlanBlocks, setCollapsedPlanBlocks] = useState<Set<string>>(new Set());
  const [collapsedRivalBlocks, setCollapsedRivalBlocks] = useState<Set<string>>(new Set());
  const [expandedAbpCard, setExpandedAbpCard] = useState<{ section: AbpSection; id: string; label: string } | null>(null);
  const [expandedFormation, setExpandedFormation] = useState<{ type: 'initial' | 'window'; id?: string } | null>(null);

  // Ficha del jugador (modal embebido)
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<Player | null>(null);

  // Plantilla rival (scouting) para el Informe de Rival
  const [rivalTeams, setRivalTeams] = useState<(Equipo & { clubNombre?: string })[]>([]);
  const [selectedRivalTeamId, setSelectedRivalTeamId] = useState('');
  const [rivalRoster, setRivalRoster] = useState<Jugador[]>([]);

  // Equipos propios (mismo club) para resolver la plantilla real del equipo que juega el partido
  const [ownTeams, setOwnTeams] = useState<Equipo[]>([]);
  const [ownEquipoId, setOwnEquipoId] = useState('');

  const samePlayerId = (a?: string | number, b?: string | number) => String(a) === String(b);

  // YouTube upload state
  const [ytUploadProgress, setYtUploadProgress] = useState<YouTubeUploadProgress | null>(null);
  const [ytSelectedFile, setYtSelectedFile] = useState<File | null>(null);
  const [ytTargetField, setYtTargetField] = useState<'videoUrl' | 'planVideoUrl'>('videoUrl');
  const ytAbortRef = useRef<AbortController | null>(null);
  const ytFileInputRef = useRef<HTMLInputElement>(null);
  const ytPlanFileInputRef = useRef<HTMLInputElement>(null);

  const [report, setReport] = useState<MatchReport>({
    id: match.id,
    generalNotes: '',
    videoUrl: '',

    rivalVideoUrl: '',
    rivalDocUrl: '',
    rivalConBalonText: '',
    rivalConBalonVideo: '',
    rivalConBalonDoc: '',
    rivalConBalonImages: [],
    rivalSinBalonText: '',
    rivalSinBalonVideo: '',
    rivalSinBalonDoc: '',
    rivalSinBalonImages: [],
    rivalAbpText: '',
    rivalAbpVideo: '',
    rivalAbpDoc: '',
    rivalAbpImages: [],
    rivalAbpOffCorners: [newAbpItem(), newAbpItem(), newAbpItem(), newAbpItem()],
    rivalAbpOffLateralFouls: [newAbpItem(), newAbpItem()],
    rivalAbpDefCorners: [newAbpItem()],
    rivalAbpDefLateralFouls: [newAbpItem()],
    rivalAbpDefFrontalFouls: [newAbpItem()],

    planVideoUrl: '',
    planDocUrl: '',
    planConBalonText: '',
    planConBalonVideo: '',
    planConBalonDoc: '',
    planConBalonImages: [],
    planSinBalonText: '',
    planSinBalonVideo: '',
    planSinBalonDoc: '',
    planSinBalonImages: [],

    abpOffCorners: [newAbpItem(), newAbpItem(), newAbpItem(), newAbpItem()],
    abpOffLateralFouls: [newAbpItem(), newAbpItem()],
    abpDefCorners: [newAbpItem()],
    abpDefLateralFouls: [newAbpItem()],
    abpDefFrontalFouls: [newAbpItem()],
    formation: '4-3-3',
    lineupPositions: [],
    substituteIds: [],
    notConvocadoIds: [],
    videoEvents: [],
    substitutions: [],
    matchGoals: [],
    matchCards: [],
    firstHalfStart: '',
    firstHalfEnd: '',
    secondHalfStart: '',
    secondHalfEnd: ''
  });

  const filteredEvents = useMemo(() => {
    const events = report.videoEvents || [];
    const byType = eventFilter === 'ALL' ? events : events.filter(e => e.type === eventFilter);
    if (playerFilter === 'ALL') return byType;
    return byType.filter(e => samePlayerId(e.playerId, playerFilter));
  }, [report.videoEvents, eventFilter, playerFilter]);

  const activeLineupPlayers = useMemo(() => {
    const positions = report.lineupPositions || [];
    const ids = positions
      .flatMap(pos => pos.playerIds || [])
      .filter(Boolean);
    const uniqueIds = Array.from(new Set(ids.map(String)));
    return uniqueIds.map(id => squad.find(p => samePlayerId(p.id, id))).filter(Boolean) as Player[];
  }, [report.lineupPositions, squad]);

  const startingXIEntries = useMemo(() => {
    const positions = report.lineupPositions || [];
    return positions
      .flatMap(pos => (pos.playerIds || []).map(playerId => ({ position: pos, playerId })))
      .map(({ position, playerId }) => ({ position, player: squad.find(p => samePlayerId(p.id, playerId)) }))
      .filter((entry): entry is { position: TacticalPosition; player: Player } => !!entry.player);
  }, [report.lineupPositions, squad]);

  const onPitchPlayers = useMemo(() => {
    let ids: Array<string | number> = activeLineupPlayers.map(p => p.id);
    const subs = [...(report.substitutions || [])].sort((a, b) => a.minute - b.minute);
    subs.forEach(sub => {
      if (sub.playerOutId !== undefined) ids = ids.filter(id => !samePlayerId(id, sub.playerOutId));
      if (sub.playerInId !== undefined && !ids.some(id => samePlayerId(id, sub.playerInId))) ids = [...ids, sub.playerInId as string | number];
    });
    return ids.map(id => squad.find(p => samePlayerId(p.id, id))).filter(Boolean) as Player[];
  }, [activeLineupPlayers, report.substitutions, squad]);

  // Línea de tiempo combinada de sustituciones y cambios de sistema/formación,
  // cada una generando su propia foto del campo en "Sistema tras cada cambio".
  const substitutionSnapshots = useMemo(() => {
    const basePositions = report.lineupPositions && report.lineupPositions.length > 0
      ? report.lineupPositions
      : getInitialPositions(report.formation || '4-3-3');
    let current = basePositions.map(pos => ({ ...pos, playerIds: [...(pos.playerIds || [])] }));

    const subEntries = (report.substitutions || []).map(sub => ({ id: sub.id, minute: sub.minute, kind: 'sub' as const, sub }));
    const formationEntries = (report.formationChanges || []).map(change => ({ id: change.id, minute: change.minute, kind: 'formation' as const, change }));
    const merged = [...subEntries, ...formationEntries].sort((a, b) => a.minute - b.minute);

    return merged.map(entry => {
      if (entry.kind === 'formation') {
        current = entry.change.positions.map(pos => ({ ...pos, playerIds: [...(pos.playerIds || [])] }));
        return { id: entry.id, minute: entry.minute, kind: 'formation' as const, change: entry.change, positions: current, sub: undefined };
      }
      current = current.map(pos => {
        const ids = pos.playerIds || [];
        if (entry.sub.playerOutId !== undefined && ids.some(id => samePlayerId(id, entry.sub.playerOutId))) {
          return { ...pos, playerIds: ids.map(id => samePlayerId(id, entry.sub.playerOutId) ? (entry.sub.playerInId as string | number) : id) };
        }
        return pos;
      });
      return { id: entry.id, minute: entry.minute, kind: 'sub' as const, sub: entry.sub, positions: current, change: undefined };
    });
  }, [report.lineupPositions, report.formation, report.substitutions, report.formationChanges]);

  const currentLineupPositions = useMemo(() => {
    if (substitutionSnapshots.length > 0) {
      return substitutionSnapshots[substitutionSnapshots.length - 1].positions;
    }
    return report.lineupPositions && report.lineupPositions.length > 0
      ? report.lineupPositions
      : getInitialPositions(report.formation || '4-3-3');
  }, [substitutionSnapshots, report.lineupPositions, report.formation]);

  // Coordenadas de cada jugador en el campo, separando a quienes caen en
  // posiciones iguales o muy próximas (p.ej. tras sustituciones o cambios de
  // sistema mal ajustados) para que no se dibujen dos círculos superpuestos.
  const resolvedOnPitchPositions = useMemo(() => {
    const raw = onPitchPlayers
      .map(player => {
        const startPos = currentLineupPositions.find(pos => (pos.playerIds || []).some(id => samePlayerId(id, player.id)));
        return startPos ? { player, x: startPos.x ?? 50, y: startPos.y ?? 50 } : null;
      })
      .filter((entry): entry is { player: Player; x: number; y: number } => entry !== null);

    // Campo grande: contenedor con aspect-video (16/9).
    return resolveFieldCollisions(raw, 16 / 9);
  }, [onPitchPlayers, currentLineupPositions]);

  // Agrupa los eventos de substitutionSnapshots por minuto: todo lo que ocurre
  // en la misma "ventana" (varias sustituciones y/o un cambio de sistema
  // registrados juntos) se consolida en una única foto del campo + un
  // resumen de texto, en vez de una imagen por cada evento individual.
  const windowSnapshots = useMemo(() => {
    const order: number[] = [];
    const groups = new Map<number, typeof substitutionSnapshots>();
    substitutionSnapshots.forEach(entry => {
      if (!groups.has(entry.minute)) {
        order.push(entry.minute);
        groups.set(entry.minute, []);
      }
      groups.get(entry.minute)!.push(entry);
    });

    return order.map(minute => {
      const entries = groups.get(minute)!;
      const subs = entries.filter(e => e.kind === 'sub').map(e => e.sub!);
      const formationChange = entries.filter(e => e.kind === 'formation').map(e => e.change!).pop();
      const positions = entries[entries.length - 1].positions;
      const incomingIds = subs.map(s => s.playerInId).filter((id): id is string | number => id !== undefined);
      return { id: `window-${minute}`, minute, positions, subs, formationChange, incomingIds };
    });
  }, [substitutionSnapshots]);

  const renderWindowSummary = (win: (typeof windowSnapshots)[number]) => (
    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 text-center leading-relaxed">
      <span className="block text-[var(--text-strong)]">{win.minute}'</span>
      {win.formationChange && (
        <span className="block text-[var(--accent)]">{t('tactics.formation')} {win.formationChange.formation}</span>
      )}
      {win.subs.map(sub => (
        <span key={sub.id} className="block">
          <span className="text-emerald-500">{t('matchReport.matchEvents.playerInLabel')} {getPlayerLabel(sub.playerInId)}</span>
          {' / '}
          <span className="text-red-500">{t('matchReport.matchEvents.playerOutLabel')} {getPlayerLabel(sub.playerOutId)}</span>
        </span>
      ))}
    </p>
  );

  const handleDeleteWindow = (win: (typeof windowSnapshots)[number]) => {
    if (!confirm(t('matchReport.matchEvents.confirmDeleteWindow'))) return;
    const next = {
      ...report,
      substitutions: (report.substitutions || []).filter(s => s.minute !== win.minute),
      formationChanges: (report.formationChanges || []).filter(c => c.minute !== win.minute),
    };
    setReport(next);
    persistReport(next);
  };

  const renderPitchDiagram = (
    positionsList: TacticalPosition[],
    highlightInIds?: Array<string | number> | string | number,
    scale: number = 1,
    large: boolean = false,
  ) => {
    const baseWidth = 224;
    const baseHeight = 336;
    const dorsalClass = 'w-4 h-4 text-[7px]';
    const nameClass = large ? 'text-[7px]' : 'text-[6px]';
    const goalBadgeClass = 'w-2 h-2';
    const goalIconClass = 'text-[4px]';
    const cardBadgeClass = 'w-1.5 h-2';
    const content = (
      <div className="relative rounded-2xl overflow-hidden border-4 border-white/10 shadow-lg" style={{ backgroundColor: '#1e8449', width: `${baseWidth}px`, height: `${baseHeight}px` }}>
        <div className="absolute inset-0 pointer-events-none opacity-70">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <g fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.5">
              <rect x="3" y="3" width="94" height="94" />
              <line x1="3" y1="50" x2="97" y2="50" />
              <circle cx="50" cy="50" r="10" />
            </g>
          </svg>
        </div>
        {resolveFieldCollisions(
          positionsList
            .filter(pos => (pos.playerIds || []).length > 0)
            .map(pos => ({ pos, x: pos.x, y: pos.y })),
          baseWidth / baseHeight,
        ).map(({ pos, x, y }) => {
          const player = squad.find(p => samePlayerId(p.id, (pos.playerIds || [])[0]));
          if (!player) return null;
          const highlightList = highlightInIds === undefined ? [] : Array.isArray(highlightInIds) ? highlightInIds : [highlightInIds];
          const isIncoming = highlightList.some(id => samePlayerId(player.id, id));
          const key = String(player.id);
          const goals = goalsByPlayer.get(key) ?? 0;
          const cards = cardsByPlayer.get(key);
          return (
            <div key={pos.id} className="absolute flex flex-col items-center gap-0" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
              <div className="relative">
                <span className={`${dorsalClass} rounded-full flex items-center justify-center font-black shadow shrink-0 ${isIncoming ? 'bg-emerald-500 text-white ring-1 ring-white' : 'bg-white text-[#1e8449]'}`}>{player.dorsal ?? '-'}</span>
                {(goals > 0 || cards?.amarillas || cards?.rojas) && (
                  <div className="absolute -top-0.5 -right-0.5 flex items-center gap-0">
                    {goals > 0 && (
                      <span className={`${goalBadgeClass} rounded-full bg-emerald-500 flex items-center justify-center shadow`} title={t('matchReport.matchEvents.goals')}>
                        <i className={`fa-solid fa-futbol text-white ${goalIconClass}`}></i>
                      </span>
                    )}
                    {cards?.rojas ? (
                      <span className={`${cardBadgeClass} rounded-[1px] bg-red-600 shadow shrink-0`}></span>
                    ) : cards?.amarillas ? (
                      <span className={`${cardBadgeClass} rounded-[1px] bg-amber-500 shadow shrink-0`}></span>
                    ) : null}
                  </div>
                )}
              </div>
              <span className={`text-white ${nameClass} font-bold leading-none text-center whitespace-nowrap drop-shadow-sm`}>{player.apodo || player.nombre}</span>
            </div>
          );
        })}
      </div>
    );

    if (scale === 1) {
      return <div className="mx-auto" style={{ width: `${baseWidth}px` }}>{content}</div>;
    }

    return (
      <div className="mx-auto" style={{ width: `${baseWidth * scale}px`, height: `${baseHeight * scale}px` }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>{content}</div>
      </div>
    );
  };

  const renderEditablePitchDiagram = (positionsList: TacticalPosition[], onDropPlayer: (positionId: string, playerId: string | number) => void) => (
    <div className="relative mx-auto rounded-2xl overflow-hidden border-4 border-white/10 shadow-lg" style={{ backgroundColor: '#1e8449', width: '224px', height: '336px' }}>
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <g fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.5">
            <rect x="3" y="3" width="94" height="94" />
            <line x1="3" y1="50" x2="97" y2="50" />
            <circle cx="50" cy="50" r="10" />
          </g>
        </svg>
      </div>
      {resolveFieldCollisions(positionsList.map(pos => ({ pos, x: pos.x, y: pos.y })), 224 / 336).map(({ pos, x, y }) => {
        const playerId = (pos.playerIds || [])[0];
        const player = playerId !== undefined ? squad.find(p => samePlayerId(p.id, playerId)) : undefined;

        return (
          <div
            key={pos.id}
            className="absolute flex flex-col items-center gap-0"
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              if (draggedPlayerId !== null) {
                onDropPlayer(pos.id, draggedPlayerId);
                setDraggedPlayerId(null);
              }
            }}
          >
            {player ? (
              <div
                draggable
                onDragStart={() => setDraggedPlayerId(player.id)}
                onDragEnd={() => setDraggedPlayerId(null)}
                className="cursor-grab active:cursor-grabbing"
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shadow shrink-0 bg-white text-[#1e8449] border-2 border-emerald-400">
                  {player.dorsal ?? '-'}
                </span>
                <span className="block text-white text-[6px] font-bold leading-none text-center whitespace-nowrap drop-shadow-sm mt-0.5">{player.apodo || player.nombre}</span>
              </div>
            ) : (
              <span className="w-6 h-6 rounded-full border-2 border-dashed border-white/60 flex items-center justify-center text-[6px] font-black text-white/70 shrink-0">
                {pos.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  const benchPlayers = useMemo(() => {
    const notConvocado = report.notConvocadoIds || [];
    const onPitchIds = onPitchPlayers.map(p => p.id);
    const alreadySubbedOffIds = (report.substitutions || [])
      .map(sub => sub.playerOutId)
      .filter((id): id is string | number => id !== undefined);
    return squad.filter(p =>
      !notConvocado.some(id => samePlayerId(id, p.id)) &&
      !onPitchIds.some(id => samePlayerId(id, p.id)) &&
      !alreadySubbedOffIds.some(id => samePlayerId(id, p.id))
    );
  }, [squad, report.notConvocadoIds, onPitchPlayers, report.substitutions]);

  const convocadoPlayers = useMemo(() => {
    const notConvocado = report.notConvocadoIds || [];
    return squad.filter(p => !notConvocado.some(id => samePlayerId(id, p.id)));
  }, [squad, report.notConvocadoIds]);

  // A diferencia de benchPlayers (solo quienes siguen disponibles en el banquillo),
  // esta lista incluye también a los suplentes que ya han entrado, para poder
  // seguir mostrando sus minutos jugados, goles y tarjetas en el panel de eventos.
  const allSubstitutePlayers = useMemo(() => {
    const startingIds = new Set(startingXIEntries.map(({ player }) => String(player.id)));
    return convocadoPlayers
      .filter(p => !startingIds.has(String(p.id)))
      .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  }, [convocadoPlayers, startingXIEntries]);

  // Si todavía no se ha definido el once inicial en la pestaña Alineación,
  // no hay forma de distinguir quién está en el campo o en el banquillo:
  // se ofrece toda la plantilla convocada para no bloquear el registro de cambios.
  const playerOutOptions = activeLineupPlayers.length > 0 ? onPitchPlayers : convocadoPlayers;
  const playerInOptions = activeLineupPlayers.length > 0 ? benchPlayers : convocadoPlayers;

  const MATCH_DURATION_MINUTES = 90;

  // Intervalo [start, end] jugado por cada jugador: un titular juega desde el
  // minuto 0 hasta que le cambian o le expulsan (roja), lo que ocurra antes; un
  // suplente juega desde que entra hasta el final (o su roja).
  const playerIntervalsMap = useMemo(() => {
    const map = new Map<string, { start: number; end: number }>();
    const subs = report.substitutions || [];
    const redCardMinuteByPlayer = new Map<string, number>();
    (report.matchCards || []).filter(c => c.type === 'ROJA' && c.playerId !== undefined).forEach(c => {
      const key = String(c.playerId);
      const existing = redCardMinuteByPlayer.get(key);
      if (existing === undefined || c.minute < existing) redCardMinuteByPlayer.set(key, c.minute);
    });

    startingXIEntries.forEach(({ player }) => {
      const key = String(player.id);
      const subOff = subs.find(s => samePlayerId(s.playerOutId, player.id));
      let end = subOff ? subOff.minute : MATCH_DURATION_MINUTES;
      const red = redCardMinuteByPlayer.get(key);
      if (red !== undefined && red < end) end = red;
      map.set(key, { start: 0, end: Math.max(0, end) });
    });

    subs.forEach(sub => {
      if (sub.playerInId === undefined) return;
      const key = String(sub.playerInId);
      if (map.has(key)) return;
      // Si este suplente es a su vez sustituido más tarde (doble cambio), su
      // intervalo termina en ese momento y no en el minuto 90.
      const subOff = subs.find(s => samePlayerId(s.playerOutId, sub.playerInId) && s.minute > sub.minute);
      let end = subOff ? subOff.minute : MATCH_DURATION_MINUTES;
      const red = redCardMinuteByPlayer.get(key);
      if (red !== undefined && red < end) end = red;
      map.set(key, { start: sub.minute, end: Math.max(sub.minute, end) });
    });

    return map;
  }, [startingXIEntries, report.substitutions, report.matchCards]);

  // Minutos jugados por jugador (apartado Resumen): duración del intervalo anterior.
  const playerMinutesMap = useMemo(() => {
    const map = new Map<string, number>();
    playerIntervalsMap.forEach((interval, key) => map.set(key, Math.min(Math.max(0, interval.end - interval.start), MATCH_DURATION_MINUTES)));
    return map;
  }, [playerIntervalsMap]);

  // Ventanas de sistema/formación durante el partido: desde el sistema inicial
  // hasta el primer cambio de sistema, y así sucesivamente hasta el final.
  const formationWindows = useMemo(() => {
    const changes = [...(report.formationChanges || [])].sort((a, b) => a.minute - b.minute);
    const marks = [{ minute: 0, formation: report.formation || '4-3-3' }, ...changes.map(c => ({ minute: c.minute, formation: c.formation }))];
    return marks
      .map((mark, i) => ({
        formation: mark.formation,
        start: mark.minute,
        end: i + 1 < marks.length ? marks[i + 1].minute : MATCH_DURATION_MINUTES
      }))
      .filter(w => w.end > w.start);
  }, [report.formation, report.formationChanges]);

  // Minutos jugados por sistema (apartados Gráficas y Datos Partido): a nivel
  // colectivo (cuánto tiempo estuvo el equipo en cada sistema) y a nivel
  // individual (cuántos de esos minutos jugó cada jugador convocado).
  const systemMinutesStats = useMemo(() => {
    const collective = new Map<string, number>();
    const individual = new Map<string, Map<string, number>>();

    formationWindows.forEach(win => {
      collective.set(win.formation, (collective.get(win.formation) ?? 0) + (win.end - win.start));
      playerIntervalsMap.forEach((interval, playerId) => {
        const overlap = Math.min(interval.end, win.end) - Math.max(interval.start, win.start);
        if (overlap <= 0) return;
        if (!individual.has(win.formation)) individual.set(win.formation, new Map());
        const byPlayer = individual.get(win.formation)!;
        byPlayer.set(playerId, (byPlayer.get(playerId) ?? 0) + overlap);
      });
    });

    return { collective, individual };
  }, [formationWindows, playerIntervalsMap]);

  const goalsByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    (report.matchGoals || []).filter(g => g.side === 'FAVOR' && g.playerId !== undefined).forEach(g => {
      const key = String(g.playerId);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [report.matchGoals]);

  const goalsConcededByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    (report.matchGoals || []).filter(g => g.side === 'CONTRA' && g.playerId !== undefined).forEach(g => {
      const key = String(g.playerId);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [report.matchGoals]);

  const cardsByPlayer = useMemo(() => {
    const map = new Map<string, { amarillas: number; rojas: number }>();
    (report.matchCards || []).forEach(c => {
      if (c.playerId === undefined) return;
      const key = String(c.playerId);
      const entry = map.get(key) || { amarillas: 0, rojas: 0 };
      if (c.type === 'AMARILLA') entry.amarillas += 1; else entry.rojas += 1;
      map.set(key, entry);
    });
    return map;
  }, [report.matchCards]);

  // Minuto de entrada/salida por cambio (apartado Resumen): permite pintar los
  // iconos de sustitución junto a cada jugador del once inicial y de convocados.
  const subOutMinuteByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    (report.substitutions || []).forEach(s => {
      if (s.playerOutId === undefined) return;
      map.set(String(s.playerOutId), s.minute);
    });
    return map;
  }, [report.substitutions]);

  const subInMinuteByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    (report.substitutions || []).forEach(s => {
      if (s.playerInId === undefined) return;
      map.set(String(s.playerInId), s.minute);
    });
    return map;
  }, [report.substitutions]);

  // Jugador con el que se produce el cambio: para el que sale, quién entra en su lugar; y viceversa.
  const subPartnerByOutPlayer = useMemo(() => {
    const map = new Map<string, Player | undefined>();
    (report.substitutions || []).forEach(s => {
      if (s.playerOutId === undefined) return;
      map.set(String(s.playerOutId), s.playerInId !== undefined ? squad.find(p => samePlayerId(p.id, s.playerInId)) : undefined);
    });
    return map;
  }, [report.substitutions, squad]);

  const subPartnerByInPlayer = useMemo(() => {
    const map = new Map<string, Player | undefined>();
    (report.substitutions || []).forEach(s => {
      if (s.playerInId === undefined) return;
      map.set(String(s.playerInId), s.playerOutId !== undefined ? squad.find(p => samePlayerId(p.id, s.playerOutId)) : undefined);
    });
    return map;
  }, [report.substitutions, squad]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: reportsData } = await db.match_reports.get(match.id);
        const existing = reportsData?.find((r: any) => String(r.id) === String(match.id));
        if (existing) {
            const formation = existing.formation || '4-3-3';
            const positions = existing.lineupPositions && existing.lineupPositions.length > 0 
                ? existing.lineupPositions 
                : getInitialPositions(formation);
            
            setReport({ ...report, ...existing, formation, lineupPositions: positions });
        } else {
             setReport(prev => ({ ...prev, lineupPositions: getInitialPositions('4-3-3') }));
        }
      } catch (e) {}
    };
    loadData();
  }, [match.id]);

  useEffect(() => {
    (async () => {
      try {
        const [equiposRows, clubesRows] = await Promise.all([equiposService.list(), clubesService.list()]);
        setClubs(clubesRows as Club[]);
        const clubesById = new Map(clubesRows.map(c => [String(c.id), c.nombre]));
        const rivals = equiposRows
          .filter(e => !ownClubId || String(e.club_id) !== String(ownClubId))
          .map(e => ({ ...e, clubNombre: clubesById.get(String(e.club_id)) }))
          .sort((a, b) => (a.clubNombre || a.nombre).localeCompare(b.clubNombre || b.nombre, 'es'));
        setRivalTeams(rivals);
        const own = equiposRows.filter(e => ownClubId && String(e.club_id) === String(ownClubId));
        setOwnTeams(own);
      } catch (err) {
        console.error('No se pudieron cargar los equipos rivales', err);
      }
    })();
  }, [ownClubId]);

  useEffect(() => {
    const loadCompetitions = async () => {
      try {
        const data = await competicionService.listCompeticiones();
        setCompetitions(data || []);
      } catch (err) {
        console.error('Error loading competitions:', err);
      }
    };
    loadCompetitions();
  }, []);

  // El club rival se deduce de qué lado (local/visitante) no es nuestro propio club,
  // usando el clubId guardado junto a cada equipo (evita confundir equipos homónimos
  // de clubes distintos, p.ej. "Juvenil A" en dos clubes).
  const rivalSideClubId = useMemo(() => {
    const localIsOwn = !!ownClubId && String(match.localTeamClubId || '') === String(ownClubId);
    const visitorIsOwn = !!ownClubId && String(match.visitorTeamClubId || '') === String(ownClubId);
    if (match.visitorTeamClubId && !visitorIsOwn) return match.visitorTeamClubId;
    if (match.localTeamClubId && !localIsOwn) return match.localTeamClubId;
    return undefined;
  }, [match.localTeamClubId, match.visitorTeamClubId, ownClubId]);

  const rivalClubTeams = useMemo(
    () => (rivalSideClubId ? rivalTeams.filter(rt => String(rt.club_id) === String(rivalSideClubId)) : []),
    [rivalTeams, rivalSideClubId]
  );

  useEffect(() => {
    const wantedNames = [normalizeTeamName(match.visitorTeam), normalizeTeamName(match.localTeam)].filter(Boolean);
    // Con clubId resuelto: buscar solo dentro de los equipos de ese club.
    // Dato legado sin clubId: buscar por nombre entre todos los equipos rivales.
    const pool = rivalClubTeams.length > 0 ? rivalClubTeams : rivalTeams;
    if (pool.length === 0) return;
    const byName = findTeamByName(pool, wantedNames, rt => rt.sub_equipo || rt.nombre);
    const target = byName || (rivalClubTeams.length === 1 ? rivalClubTeams[0] : null);
    if (target && target.id !== selectedRivalTeamId) setSelectedRivalTeamId(target.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rivalClubTeams, rivalTeams, match.visitorTeam, match.localTeam]);

  useEffect(() => {
    if (!selectedRivalTeamId) { setRivalRoster([]); return; }
    (async () => {
      try {
        const rows = await plantillasService.list({ equipo_id: selectedRivalTeamId });
        setRivalRoster(rows.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)));
      } catch (err) {
        console.error('No se pudo cargar la plantilla rival', err);
      }
    })();
  }, [selectedRivalTeamId]);

  // Resuelve el equipo propio (categoría) que disputa este partido comparando por nombre
  useEffect(() => {
    if (ownEquipoId || ownTeams.length === 0) return;
    const opponentNorm = normalizeTeamName(match.opponent || '');
    const ownNameCandidates = [match.team, match.localTeam, match.visitorTeam]
      .filter((v): v is string => !!v && normalizeTeamName(v) !== opponentNorm);
    const found = findTeamByName(ownTeams, ownNameCandidates.map(normalizeTeamName), t => t.sub_equipo || t.nombre);
    if (found) { setOwnEquipoId(found.id); return; }
    // Si solo hay un equipo propio dado de alta, usarlo por defecto
    if (ownTeams.length === 1) setOwnEquipoId(ownTeams[0].id);
  }, [ownTeams, match.team, match.localTeam, match.visitorTeam, match.opponent, ownEquipoId]);

  // Carga la plantilla real del equipo propio (Supabase) para la pestaña Alineación
  useEffect(() => {
    if (!ownEquipoId) return;
    (async () => {
      try {
        const rows = await plantillasService.list({ equipo_id: ownEquipoId });
        const mapped: Player[] = rows.map((p): Player => ({
          id: p.id,
          fotoUrl: p.foto_url || '',
          competicion: '',
          club: '',
          equipo: '',
          dorsal: p.dorsal ?? 0,
          nombre: p.nombre,
          apodo: p.apodo,
          posicion: p.posicion,
          posicionJuego: p.posicion_juego || '',
          perfil: (p.perfil || 'D') as Player['perfil'],
          estado: p.estado,
        }));
        if (mapped.length > 0) setSquad(mapped.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)));
      } catch (err) {
        console.error('No se pudo cargar la plantilla propia', err);
      }
    })();
  }, [ownEquipoId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let data: any = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { return; }
      }
      const minStart = sharedStartRef.current;
      if (event.origin.includes('youtube.com')) {
        if (data.event === 'infoDelivery' && data.info && data.info.currentTime !== undefined) {
          const nextSec = Math.floor(data.info.currentTime);
          if (minStart !== null && nextSec < minStart - 1) {
            playVideoAt(minStart);
            return;
          }
          setCurrentTimeSec(minStart !== null ? Math.max(nextSec, minStart) : nextSec);
          setIsLinked(true);
          setIsManualPlay(false);
        }
      }
      if (event.origin.includes('vimeo.com')) {
        if (data.event === 'timeupdate' || data.method === 'getCurrentTime') {
          const seconds = data.data?.seconds || data.value;
          if (seconds !== undefined) {
            const nextSec = Math.floor(seconds);
            if (minStart !== null && nextSec < minStart - 1) {
              playVideoAt(minStart);
              return;
            }
            setCurrentTimeSec(minStart !== null ? Math.max(nextSec, minStart) : nextSec);
            setIsLinked(true);
            setIsManualPlay(false);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    pollInterval.current = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: 'getCurrentTime' }), '*');
      }
    }, 1000);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [report.videoUrl]);

  useEffect(() => {
    if (isManualPlay) {
      manualTicker.current = setInterval(() => { setCurrentTimeSec(prev => prev + 1); }, 1000);
    } else if (manualTicker.current) {
      clearInterval(manualTicker.current);
    }
    return () => { if (manualTicker.current) clearInterval(manualTicker.current); };
  }, [isManualPlay]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('t');
    if (t) {
        const seconds = parseInt(t);
        if(!isNaN(seconds)) {
            sharedStartRef.current = seconds;
            setSharedStartSec(seconds);
            setCurrentTimeSec(seconds);
            setTimeout(() => playVideoAt(seconds), 2000);
        }
    }
  }, []);

  const pauseVideo = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*');
      setIsManualPlay(false);
    }
  };

  const playVideoAt = (seconds: number) => {
    if (!report.videoUrl) {
      alert(t('matchReport.alerts.noVideoLinked'));
      return;
    }
    const minStart = sharedStartRef.current;
    const safeSeconds = minStart !== null ? Math.max(seconds, minStart) : seconds;
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [safeSeconds, true]
      }), '*');
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: []
        }), '*');
      }, 100);
      
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        method: 'setCurrentTime',
        value: safeSeconds
      }), '*');
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        method: 'play'
      }), '*');

      setCurrentTimeSec(safeSeconds);
    } else {
        alert(t('matchReport.alerts.playerNotReady'));
    }
  };

  const handleAddEvent = (type: VideoEvent['type'], options?: { goalSide?: 'FAVOR' | 'CONTRA'; playerId?: string | number; duelOutcome?: 'GANADO' | 'PERDIDO' }) => {
    const eventTime = Math.max(0, currentTimeSec - 5);
    const resolvedPlayerId = options?.playerId ?? (selectedPlayerId === '' ? undefined : selectedPlayerId);
    const newEvent: VideoEvent = {
      id: Math.random().toString(36).substr(2, 9),
      minute: formatSeconds(eventTime),
      type: type,
      note: currentNote,
      playerId: resolvedPlayerId,
      goalSide: options?.goalSide,
      duelOutcome: options?.duelOutcome,
      timestamp: Date.now()
    };
    
    const nextEvents = [...(report.videoEvents || []), newEvent].sort((a, b) => timeToSeconds(a.minute) - timeToSeconds(b.minute));
    const next = { ...report, videoEvents: nextEvents };
    setReport(next);
    persistReport(next);
    setCurrentNote('');

    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = setTimeout(() => {
      pauseVideo();
    }, 5000);
  };

  const persistReport = async (updatedReport: MatchReport) => {
    try {
      await db.match_reports.upsert(updatedReport);
      setSaveError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('[match-report-autosave]', errorMsg, err);
      setSaveError(errorMsg);
    }
  };

  // ── Eventos de partido: sustituciones y goles ───────────
  const addSubstitution = () => {
    if (!subForm.minute || !subForm.playerOutId || !subForm.playerInId) return;
    const item: MatchSubstitution = {
      id: crypto.randomUUID(),
      minute: Number(subForm.minute),
      playerOutId: subForm.playerOutId,
      playerInId: subForm.playerInId,
    };
    const next = { ...report, substitutions: [...(report.substitutions || []), item].sort((a, b) => a.minute - b.minute) };
    setReport(next);
    persistReport(next);
    setSubForm({ minute: '', playerOutId: '', playerInId: '' });
  };

  const removeSubstitution = (id: string) => {
    if (!confirm(t('matchReport.matchEvents.confirmDeleteSubstitution'))) return;
    const next = { ...report, substitutions: (report.substitutions || []).filter(s => s.id !== id) };
    setReport(next);
    persistReport(next);
    if (editingSubstitutionId === id) {
      setEditingSubstitutionId(null);
    }
  };

  const startEditSubstitution = (sub: MatchSubstitution) => {
    setEditingSubstitutionId(sub.id);
    setSubstitutionEditForm({
      minute: String(sub.minute ?? ''),
      playerOutId: sub.playerOutId !== undefined ? String(sub.playerOutId) : '',
      playerInId: sub.playerInId !== undefined ? String(sub.playerInId) : '',
    });
  };

  const cancelEditSubstitution = () => {
    setEditingSubstitutionId(null);
    setSubstitutionEditForm({ minute: '', playerOutId: '', playerInId: '' });
  };

  const saveEditSubstitution = () => {
    if (!editingSubstitutionId || !substitutionEditForm.minute || !substitutionEditForm.playerOutId || !substitutionEditForm.playerInId) return;
    const next = {
      ...report,
      substitutions: (report.substitutions || [])
        .map(s => s.id === editingSubstitutionId
          ? { ...s, minute: Number(substitutionEditForm.minute), playerOutId: substitutionEditForm.playerOutId, playerInId: substitutionEditForm.playerInId }
          : s)
        .sort((a, b) => a.minute - b.minute),
    };
    setReport(next);
    persistReport(next);
    cancelEditSubstitution();
  };

  const handlePlayerClickForEvent = (player: Player) => {
    setSelectedPlayerForEvent(player);
    setEventActionMenu({ type: null, minute: '' });
  };

  const handleEventActionSelect = (actionType: 'GOL' | 'CAMBIO' | 'TARJETA_AMARILLA' | 'TARJETA_ROJA') => {
    setEventActionMenu({ type: actionType, minute: '' });
  };

  const handleConfirmEvent = () => {
    if (!selectedPlayerForEvent || !eventActionMenu.type || !eventActionMenu.minute) return;
    if (eventActionMenu.type === 'CAMBIO' && !eventActionMenu.playerInId) return;

    const minute = Number(eventActionMenu.minute);

    switch (eventActionMenu.type) {
      case 'GOL': {
        const isGoalkeeper = selectedPlayerForEvent.posicion === 'Portero';
        const item: MatchGoal = {
          id: crypto.randomUUID(),
          minute,
          side: isGoalkeeper ? 'CONTRA' : 'FAVOR',
          playerId: selectedPlayerForEvent.id,
        };
        const next = { ...report, matchGoals: [...(report.matchGoals || []), item].sort((a, b) => a.minute - b.minute) };
        setReport(next);
        persistReport(next);
        break;
      }
      case 'CAMBIO': {
        const item: MatchSubstitution = {
          id: crypto.randomUUID(),
          minute,
          playerOutId: selectedPlayerForEvent.id,
          playerInId: eventActionMenu.playerInId!,
        };
        const next = { ...report, substitutions: [...(report.substitutions || []), item].sort((a, b) => a.minute - b.minute) };
        setReport(next);
        persistReport(next);
        break;
      }
      case 'TARJETA_AMARILLA': {
        const item: MatchCard = {
          id: crypto.randomUUID(),
          minute,
          type: 'AMARILLA',
          playerId: selectedPlayerForEvent.id,
        };
        const next = { ...report, matchCards: [...(report.matchCards || []), item].sort((a, b) => a.minute - b.minute) };
        setReport(next);
        persistReport(next);
        break;
      }
      case 'TARJETA_ROJA': {
        const item: MatchCard = {
          id: crypto.randomUUID(),
          minute,
          type: 'ROJA',
          playerId: selectedPlayerForEvent.id,
        };
        const next = { ...report, matchCards: [...(report.matchCards || []), item].sort((a, b) => a.minute - b.minute) };
        setReport(next);
        persistReport(next);
        break;
      }
    }

    setSelectedPlayerForEvent(null);
    setEventActionMenu({ type: null, minute: '' });
  };

  const handleOpenWindowPanel = (minute: string) => {
    setWindowPanelMinute(minute);
    setWindowPanelOriginalFormation(report.formation || '4-3-3');
    setIsWindowPanelOpen(true);
    setSelectedPlayerForEvent(null);
    setEventActionMenu({ type: null, minute: '' });
  };

  const handleConfirmWindowSubstitution = (playerOutId: string | number, playerInId: string | number) => {
    if (!windowPanelMinute) return;
    const minute = Number(windowPanelMinute);
    const item: MatchSubstitution = {
      id: crypto.randomUUID(),
      minute,
      playerOutId,
      playerInId,
    };
    const next = { ...report, substitutions: [...(report.substitutions || []), item].sort((a, b) => a.minute - b.minute) };
    setReport(next);
    persistReport(next);
  };

  const renderWindowPanel = () => {
    if (!isWindowPanelOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsWindowPanelOpen(false)}>
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full my-auto p-8 space-y-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-4">
            <h3 className="text-lg font-black text-[var(--text-strong)] uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-window-maximize text-[var(--accent)]"></i>{t('matchReport.matchEvents.window')}
            </h3>
            <button
              onClick={() => setIsWindowPanelOpen(false)}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--surface-1)] rounded-lg transition-all"
              title="Cerrar (Esc)"
            >
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Campo de Fútbol */}
            <div className="lg:col-span-2 flex flex-col justify-center items-center">
              <label className="text-xs font-black text-[var(--text-muted)] uppercase mb-3 tracking-widest text-center">{t('tactics.formation')}</label>
              <div className="w-full flex justify-center" style={{ paddingBottom: '260px' }}>
                <div style={{ transform: 'scale(1.75)', transformOrigin: 'top' }}>
                  {renderEditablePitchDiagram(
                    tempLineupPositions && tempLineupPositions.length > 0
                      ? tempLineupPositions
                      : (report.lineupPositions && report.lineupPositions.length > 0
                          ? report.lineupPositions
                          : getInitialPositions(report.formation || '4-3-3')),
                    handlePitchDrop
                  )}
                </div>
              </div>
            </div>

            {/* Controles */}
            <div className="lg:col-span-3 space-y-6 overflow-y-auto max-h-[600px]">
              {/* Cambiar Sistema */}
              <div>
                <label className="block text-xs font-black text-[var(--text-muted)] uppercase mb-3 tracking-widest">{t('tactics.formation')}</label>
                <div className="flex gap-2 flex-wrap">
                  {['4-3-3', '4-4-2', '4-2-3-1', '5-3-2'].map(f => (
                    <button
                      key={f}
                      onClick={() => handleChangeFormation(f)}
                      className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        report.formation === f
                          ? 'bg-[var(--accent)] text-white shadow-lg'
                          : 'bg-[var(--surface-1)] text-[var(--text-strong)] hover:bg-[var(--border-soft)]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minuto */}
              <div>
                <label className="block text-xs font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.matchEvents.minute')}</label>
                <input
                  type="number"
                  min={0}
                  max={130}
                  value={windowPanelMinute}
                  onChange={e => setWindowPanelMinute(e.target.value)}
                  placeholder="45"
                  className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Recolocar Jugadores */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-strong)] mb-3">Recolocar Jugadores</h4>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mb-3">Arrastra un jugador al campo para ubicarlo</p>
                <div className="flex flex-wrap gap-3">
                  {onPitchPlayers.map(p => {
                    const currentPositions = tempLineupPositions || (report.lineupPositions && report.lineupPositions.length > 0 ? report.lineupPositions : getInitialPositions(report.formation || '4-3-3'));
                    const assignedPos = currentPositions.find(pos => (pos.playerIds || []).some(id => samePlayerId(id, p.id)));
                    const isValidPhoto = p.fotoUrl && p.fotoUrl.length > 1;
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDraggedPlayerId(p.id)}
                        onDragEnd={() => setDraggedPlayerId(null)}
                        className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-14"
                        title={p.apodo || p.nombre}
                      >
                        <div className={`relative w-10 h-10 rounded-full overflow-hidden shadow-md border-[3px] ${assignedPos ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-300'} flex items-center justify-center bg-white`}>
                          {isValidPhoto ? (
                            <img loading="lazy" decoding="async" src={p.fotoUrl} alt={p.apodo || p.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <span className={`text-xs font-black ${assignedPos ? 'text-amber-600' : 'text-[#1e8449]'}`}>{p.dorsal ?? '-'}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-[var(--text-strong)] text-center truncate w-full">{p.apodo || p.nombre}</span>
                        {assignedPos && (
                          <span className="text-[8px] font-black text-amber-600 uppercase">{assignedPos.label}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sustituciones */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-strong)] mb-3">{t('matchReport.matchEvents.substitutions')}</h4>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mb-3">Arrastra un suplente al campo para sustituir (indica el minuto arriba)</p>
                <div className="flex flex-wrap gap-3">
                  {benchPlayers.length === 0 ? (
                    <p className="text-xs font-bold text-[var(--text-muted)]">{t('matchReport.generalData.noBenchYet')}</p>
                  ) : (
                    benchPlayers.map(p => {
                      const isValidPhoto = p.fotoUrl && p.fotoUrl.length > 1;
                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={() => setDraggedPlayerId(p.id)}
                          onDragEnd={() => setDraggedPlayerId(null)}
                          className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-14"
                          title={p.apodo || p.nombre}
                        >
                          <div className="relative w-10 h-10 rounded-full overflow-hidden shadow border-2 border-slate-300 flex items-center justify-center bg-white">
                            {isValidPhoto ? (
                              <img loading="lazy" decoding="async" src={p.fotoUrl} alt={p.apodo || p.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-black text-slate-500">{p.dorsal ?? '-'}</span>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-[var(--text-strong)] text-center truncate w-full">{p.apodo || p.nombre}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 border-t border-[var(--border-soft)] pt-6">
            <button
              onClick={() => {
                setIsWindowPanelOpen(false);
                setTempLineupPositions(null);
              }}
              className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-200 dark:bg-slate-800 text-[var(--text-strong)] hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => {
                const formationChanged = (report.formation || '4-3-3') !== windowPanelOriginalFormation;
                if (formationChanged && !windowPanelMinute) {
                  alert('Introduce el minuto del cambio de sistema antes de confirmar.');
                  return;
                }
                // No se sobrescribe report.lineupPositions aquí: es el once inicial
                // y debe permanecer inmutable. Las sustituciones ya se persisten al
                // arrastrar (handleDropSubstitution) y los cambios de sistema quedan
                // registrados en formationChanges con su propia foto de posiciones;
                // sobrescribir lineupPositions hacía que jugadores que entraron como
                // suplentes sustituyeran a los titulares reales en el once inicial.
                if (formationChanged && tempLineupPositions) {
                  const change: MatchFormationChange = {
                    id: crypto.randomUUID(),
                    minute: Number(windowPanelMinute),
                    formation: report.formation || '4-3-3',
                    positions: tempLineupPositions,
                  };
                  const next = { ...report, formationChanges: [...(report.formationChanges || []), change] };
                  setReport(next);
                  persistReport(next);
                }
                setIsWindowPanelOpen(false);
                setTempLineupPositions(null);
                setWindowPanelMinute('');
              }}
              className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] transition-all"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInteractiveFieldForEvents = () => {
    if (activeLineupPlayers.length === 0) {
      return <p className="text-xs font-bold text-[var(--text-muted)] text-center py-8">{t('matchReport.matchEvents.noStartingXI')}</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 11 Inicial - Izquierda */}
        <div className="space-y-2 max-h-[700px] overflow-y-auto">
          <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-strong)] mb-2 sticky top-0 bg-white dark:bg-[#0f0f0f] py-1">{t('matchReport.matchEvents.startingXI')}</h4>
          <div className="space-y-0.5">
            {activeLineupPlayers.map(player => {
              const key = String(player.id);
              const minutes = playerMinutesMap.get(key) ?? 0;
              const goals = goalsByPlayer.get(key) ?? 0;
              const cards = cardsByPlayer.get(key);
              const subOutMinute = subOutMinuteByPlayer.get(key);
              return (
                <div key={player.id} className="flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-2 py-1.5 transition-all">
                  <span className="w-6 h-6 rounded-full bg-sport-primary text-white flex items-center justify-center text-[11px] font-black shrink-0">{player.dorsal ?? '-'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black text-[var(--text-strong)] truncate">{player.apodo || player.nombre}</p>
                  </div>
                  {goals > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-black shrink-0 text-[10px]" title={t('matchReport.matchEvents.goals')}>
                      <i className="fa-solid fa-futbol"></i>{goals > 1 ? `x${goals}` : ''}
                    </span>
                  )}
                  {cards?.amarillas && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg font-black shrink-0 text-[10px]" title={`${cards.amarillas} ${t('matchReport.matchEvents.yellowCard')}`}>
                      <i className="fa-solid fa-square"></i>{cards.amarillas > 1 ? `x${cards.amarillas}` : ''}
                    </span>
                  )}
                  {cards?.rojas && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg font-black shrink-0 text-[10px]" title={`${cards.rojas} ${t('matchReport.matchEvents.redCard')}`}>
                      <i className="fa-solid fa-square"></i>{cards.rojas > 1 ? `x${cards.rojas}` : ''}
                    </span>
                  )}
                  {subOutMinute !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg font-black shrink-0 text-[10px]" title={`${t('matchReport.matchEvents.substitutions')} ${subOutMinute}'`}>
                      <i className="fa-solid fa-arrow-right-from-bracket"></i>{subOutMinute}'
                    </span>
                  )}
                  <span className="text-[var(--text-muted)] font-bold w-7 text-right shrink-0 text-[10px]">{minutes}'</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campo Interactivo - Centro */}
        <div className="flex justify-center flex-col h-fit">
          {/* Botón Sistema y Posiciones */}
          <button
            onClick={() => {
              const current = report.lineupPositions && report.lineupPositions.length > 0
                ? report.lineupPositions
                : getInitialPositions(report.formation || '4-3-3');
              setTempLineupPositions(current);
              setWindowPanelOriginalFormation(report.formation || '4-3-3');
              setIsWindowPanelOpen(true);
            }}
            className="mb-3 px-4 py-2 bg-sport-primary hover:bg-sport-primary-dark text-white rounded-lg font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all self-center"
          >
            <i className="fa-solid fa-sliders"></i>Sistema y Posiciones
          </button>

          <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border-4 border-white/10 shadow-lg" style={{ backgroundColor: '#1e8449' }}>
        <div className="absolute inset-0 pointer-events-none opacity-70">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <g fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.5">
              <rect x="3" y="3" width="94" height="94" />
              <line x1="3" y1="50" x2="97" y2="50" />
              <circle cx="50" cy="50" r="10" />
            </g>
          </svg>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          {resolvedOnPitchPositions.map(({ player, x, y }) => {
            const isSelected = selectedPlayerForEvent?.id === player.id;
            const goals = goalsByPlayer.get(String(player.id)) ?? 0;
            const conceded = goalsConcededByPlayer.get(String(player.id)) ?? 0;
            const cards = cardsByPlayer.get(String(player.id));

            return (
              <div
                key={player.id}
                className="absolute flex flex-col items-center gap-1 cursor-pointer group transition-all"
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="relative">
                  <button
                    onClick={() => handlePlayerClickForEvent(player)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-black shadow-lg transition-all ${
                      isSelected
                        ? 'bg-yellow-400 text-[#1e8449] ring-2 ring-white scale-125'
                        : 'bg-white text-[#1e8449] hover:scale-110 group-hover:shadow-xl'
                    }`}
                  >
                    {player.dorsal ?? '-'}
                  </button>
                  {(goals > 0 || conceded > 0 || cards?.amarillas || cards?.rojas) && (
                    <div className="absolute -top-1 -right-1 flex items-center gap-0.5">
                      {goals > 0 && (
                        <span className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center shadow" title={t('matchReport.matchEvents.goals')}>
                          <i className="fa-solid fa-futbol text-white text-[6px]"></i>
                        </span>
                      )}
                      {conceded > 0 && (
                        <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center shadow" title={t('matchReport.matchEvents.goalConceded')}>
                          <i className="fa-solid fa-futbol text-white text-[6px]"></i>
                        </span>
                      )}
                      {cards?.rojas ? (
                        <span className="w-2.5 h-3.5 rounded-[2px] bg-red-600 shadow shrink-0"></span>
                      ) : cards?.amarillas ? (
                        <span className="w-2.5 h-3.5 rounded-[2px] bg-amber-500 shadow shrink-0"></span>
                      ) : null}
                    </div>
                  )}
                </div>
                <span className="text-white text-[11px] font-bold leading-none text-center whitespace-nowrap drop-shadow-sm">{player.apodo || player.nombre}</span>
              </div>
            );
          })}
        </div>

        {/* Popup con 4 iconos de acciones */}
        {selectedPlayerForEvent && !eventActionMenu.type && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl max-w-sm w-11/12 space-y-4 relative">
              <button
                onClick={() => {
                  setSelectedPlayerForEvent(null);
                  setEventActionMenu({ type: null, minute: '' });
                }}
                className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--surface-1)] rounded-lg transition-all"
                title="Cerrar"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
              <div className="text-center">
                <h4 className="text-sm font-black text-[var(--text-strong)]">{selectedPlayerForEvent.dorsal} {selectedPlayerForEvent.nombre}</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">{t('matchReport.matchEvents.selectAction')}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleEventActionSelect('GOL')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    selectedPlayerForEvent.posicion === 'Portero'
                      ? 'bg-red-600/20 text-red-600 hover:bg-red-600/40'
                      : 'bg-emerald-600/20 text-emerald-600 hover:bg-emerald-600/40'
                  }`}
                >
                  <i className="fa-solid fa-futbol text-lg"></i>
                  {selectedPlayerForEvent.posicion === 'Portero' ? t('matchReport.matchEvents.goalConceded') : t('matchReport.events.goal')}
                </button>

                <button
                  onClick={() => {
                    setEventActionMenu({ type: 'CAMBIO', minute: '' });
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-purple-600/20 text-purple-600 hover:bg-purple-600/40"
                >
                  <i className="fa-solid fa-arrows-left-right text-lg"></i>
                  Cambio
                </button>

                <button
                  onClick={() => handleEventActionSelect('TARJETA_AMARILLA')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-amber-500/20 text-amber-600 hover:bg-amber-500/40"
                >
                  <i className="fa-solid fa-square text-lg"></i>
                  {t('matchReport.matchEvents.yellowCard')}
                </button>

                <button
                  onClick={() => handleEventActionSelect('TARJETA_ROJA')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-red-600/20 text-red-600 hover:bg-red-600/40"
                >
                  <i className="fa-solid fa-square text-lg"></i>
                  {t('matchReport.matchEvents.redCard')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel de CAMBIO - Selector de suplente y minuto */}
        {selectedPlayerForEvent && eventActionMenu.type === 'CAMBIO' && (
          <div className="absolute inset-0 flex items-end justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl w-full max-w-2xl space-y-4">
              <div className="text-center">
                <h4 className="text-sm font-black text-[var(--text-strong)]">Sale: {selectedPlayerForEvent.dorsal} {selectedPlayerForEvent.nombre}</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">Selecciona el suplente que entra</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.matchEvents.playerIn')}</label>
                  <select
                    value={eventActionMenu.playerInId || ''}
                    onChange={e => setEventActionMenu({ ...eventActionMenu, playerInId: e.target.value })}
                    className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]"
                    autoFocus
                  >
                    <option value="">{t('matchReport.matchEvents.selectPlayer')}</option>
                    {benchPlayers.map(p => <option key={p.id} value={p.id}>{p.dorsal} {p.apodo || p.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.matchEvents.minute')}</label>
                  <input
                    type="number"
                    min={0}
                    max={130}
                    value={eventActionMenu.minute}
                    onChange={e => setEventActionMenu({ ...eventActionMenu, minute: e.target.value })}
                    placeholder="45"
                    className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedPlayerForEvent(null);
                      setEventActionMenu({ type: null, minute: '' });
                    }}
                    className="flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-200 dark:bg-slate-800 text-[var(--text-strong)] hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleConfirmEvent}
                    disabled={!eventActionMenu.playerInId || !eventActionMenu.minute}
                    className="flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-widest bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Popup para acciones GOL, AMARILLA, ROJA */}
        {selectedPlayerForEvent && eventActionMenu.type && eventActionMenu.type !== 'CAMBIO' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl max-w-sm w-11/12 space-y-4">
              <div className="text-center">
                <h4 className="text-sm font-black text-[var(--text-strong)]">{selectedPlayerForEvent.dorsal} {selectedPlayerForEvent.nombre}</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">{t('matchReport.matchEvents.minute')}</p>
              </div>

              <div>
                <input
                  type="number"
                  min={0}
                  max={130}
                  value={eventActionMenu.minute}
                  onChange={e => setEventActionMenu({ ...eventActionMenu, minute: e.target.value })}
                  placeholder="45"
                  className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedPlayerForEvent(null);
                    setEventActionMenu({ type: null, minute: '' });
                  }}
                  className="flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-200 dark:bg-slate-800 text-[var(--text-strong)] hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmEvent}
                  disabled={!eventActionMenu.minute}
                  className="flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-widest bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}

            {/* Panel VENTANA */}
            {renderWindowPanel()}
          </div>
        </div>

        {/* Suplentes - Derecha */}
        <div className="space-y-2 max-h-[700px] overflow-y-auto">
          <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-strong)] mb-2 sticky top-0 bg-white dark:bg-[#0f0f0f] py-1">Suplentes</h4>
          <div className="space-y-0.5">
            {allSubstitutePlayers.length === 0 ? (
              <p className="text-[13px] font-bold text-[var(--text-muted)] text-center py-2">{t('matchReport.generalData.noBenchYet')}</p>
            ) : (
              allSubstitutePlayers.map(player => {
                const key = String(player.id);
                const minutes = playerMinutesMap.get(key);
                const played = minutes !== undefined;
                const goals = goalsByPlayer.get(key) ?? 0;
                const cards = cardsByPlayer.get(key);
                const subInMinute = subInMinuteByPlayer.get(key);
                return (
                  <div key={player.id} className={`flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-2 py-1.5 transition-all ${played ? '' : 'opacity-50'}`}>
                    <span className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-[11px] font-black shrink-0">{player.dorsal ?? '-'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-black text-[var(--text-strong)] truncate">{player.apodo || player.nombre}</p>
                    </div>
                    {goals > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-black shrink-0 text-[10px]" title={t('matchReport.matchEvents.goals')}>
                        <i className="fa-solid fa-futbol"></i>{goals > 1 ? `x${goals}` : ''}
                      </span>
                    )}
                    {cards?.amarillas && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg font-black shrink-0 text-[10px]" title={`${cards.amarillas} ${t('matchReport.matchEvents.yellowCard')}`}>
                        <i className="fa-solid fa-square"></i>{cards.amarillas > 1 ? `x${cards.amarillas}` : ''}
                      </span>
                    )}
                    {cards?.rojas && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg font-black shrink-0 text-[10px]" title={`${cards.rojas} ${t('matchReport.matchEvents.redCard')}`}>
                        <i className="fa-solid fa-square"></i>{cards.rojas > 1 ? `x${cards.rojas}` : ''}
                      </span>
                    )}
                    {subInMinute !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-black shrink-0 text-[10px]" title={`${t('matchReport.matchEvents.substitutions')} ${subInMinute}'`}>
                        <i className="fa-solid fa-arrow-right-to-bracket"></i>{subInMinute}'
                      </span>
                    )}
                    <span className="text-[var(--text-muted)] font-bold w-7 text-right shrink-0 text-[10px]">{played ? `${minutes}'` : '-'}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (activeLineupPlayers.length !== 11) {
      alert(t('matchReport.alerts.lineupMustHave11Players') || `No se puede guardar la alineación. Deben estar los 11 jugadores (actualmente hay ${activeLineupPlayers.length})`);
      return;
    }
    setIsSaving(true);
    try {
      await db.match_reports.upsert(report);
      alert(t('matchReport.alerts.reportSaved'));
    } catch (err) {
      console.error('[match-report-save]', err);
      alert(t('matchReport.alerts.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const setHalfTime = (field: keyof MatchReport, seconds: number) => {
    const value = formatSeconds(Math.max(0, seconds));
    const next = { ...report, [field]: value };
    setReport(next);
    persistReport(next);
  };

  const handleShareEvent = async (ev: VideoEvent) => {
    const seconds = timeToSeconds(ev.minute);
    const baseUrl = window.location.href.split('?')[0];
    const shareUrl = `${baseUrl}?matchId=${match.id}&t=${seconds}`;
    
    try {
        await navigator.clipboard.writeText(shareUrl);
        alert(`${t('matchReport.alerts.linkCopied')}\n\n${shareUrl}`);
    } catch (err) {
        prompt(t('matchReport.alerts.copyManually'), shareUrl);
    }
  };

  const startEditing = (ev: VideoEvent) => {
    setEditingEventId(ev.id);
    setEditForm({
      minute: ev.minute,
      note: ev.note,
      playerId: ev.playerId ?? '',
      goalSide: ev.goalSide ?? ''
    });
  };

  const saveEditing = () => {
    if (!editingEventId) return;

    const updatedEvents = (report.videoEvents || []).map(ev => {
      if (ev.id === editingEventId) {
        return { 
          ...ev, 
          minute: editForm.minute, 
          note: editForm.note, 
          playerId: editForm.playerId === '' ? undefined : Number(editForm.playerId),
          goalSide: ev.type === 'GOL' ? (editForm.goalSide === '' ? undefined : editForm.goalSide) : undefined,
          duelOutcome: ev.type === 'DUELO' ? ev.duelOutcome : undefined
        };
      }
      return ev;
    }).sort((a, b) => timeToSeconds(a.minute) - timeToSeconds(b.minute));

    const next = { ...report, videoEvents: updatedEvents };
    setReport(next);
    persistReport(next);
    setEditingEventId(null);
  };

  const cancelEditing = () => {
    setEditingEventId(null);
    setEditForm({ minute: '', note: '', playerId: '', goalSide: '' });
  };

  const calculateMatchTime = useMemo(() => {
    if (currentTimeSec === 0) return null;
    if (report.firstHalfStart && report.firstHalfEnd) {
        const start = timeToSeconds(report.firstHalfStart);
        const end = timeToSeconds(report.firstHalfEnd);
        if (currentTimeSec >= start && currentTimeSec <= end) {
            const elapsed = currentTimeSec - start;
            return { part: t('matchReport.matchTimes.firstHalf'), full: `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}` };
        }
    }
    if (report.secondHalfStart && report.secondHalfEnd) {
        const start = timeToSeconds(report.secondHalfStart);
        const end = timeToSeconds(report.secondHalfEnd);
        if (currentTimeSec >= start && currentTimeSec <= end) {
            const elapsed = currentTimeSec - start;
            const matchMin = 45 + Math.floor(elapsed / 60);
            return { part: t('matchReport.matchTimes.secondHalf'), full: `${matchMin}:${(elapsed % 60).toString().padStart(2, '0')}` };
        }
    }
    return null;
  }, [currentTimeSec, report, t]);

  const eventButtons = [
    { id: 'GOL', label: t('matchReport.events.goal'), bg: 'bg-red-600', icon: 'fa-futbol' },
    { id: 'OCASION', label: t('matchReport.events.chance'), bg: 'bg-red-600', icon: 'fa-bullseye' },
    { id: 'DUELO', label: t('matchReport.events.duel'), bg: 'bg-amber-500', icon: 'fa-people-arrows' },
    { id: 'NOTA', label: t('matchReport.events.note'), bg: 'bg-slate-500', icon: 'fa-comment' },
  ];

  const eventTypeLabels: Record<string, string> = {
    'GOL': t('matchReport.events.goal'),
    'OCASION': t('matchReport.events.chance'),
    'DUELO': t('matchReport.events.duel'),
    'NOTA': t('matchReport.events.note'),
  };

  const goalSideLabels: Record<string, string> = {
    'FAVOR': t('matchReport.events.inFavor'),
    'CONTRA': t('matchReport.events.against'),
  };

  const duelOutcomeLabels: Record<string, string> = {
    'GANADO': t('matchReport.events.won'),
    'PERDIDO': t('matchReport.events.lost'),
  };

  const getPlayerLabel = (playerId?: string | number) => {
    if (!playerId) return t('matchReport.events.noPlayer');
    const player = squad.find(p => samePlayerId(p.id, playerId));
    if (!player) return t('matchReport.events.playerNum', { id: playerId });
    const dorsal = player.dorsal ? `${player.dorsal} ` : '';
    return `${dorsal}${player.apodo || player.nombre}`;
  };

  const getAbpList = (section: AbpSection): AbpItem[] => (report[section] as AbpItem[] | undefined) || [];

  const setAbpList = (section: AbpSection, list: AbpItem[], persist: boolean) => {
    const next = { ...report, [section]: list };
    setReport(next);
    if (persist) persistReport(next);
  };

  const updateAbpItemField = (section: AbpSection, id: string, field: 'text' | 'video', value: string, persist = false) => {
    setAbpList(section, getAbpList(section).map(it => (it.id === id ? { ...it, [field]: value } : it)), persist);
  };

  const addAbpItem = (section: AbpSection) => {
    setAbpList(section, [...getAbpList(section), newAbpItem()], true);
  };

  const removeAbpItem = (section: AbpSection, id: string) => {
    setAbpList(section, getAbpList(section).filter(it => it.id !== id), true);
    setExpandedAbpCard(prev => (prev && prev.section === section && prev.id === id ? null : prev));
  };

  const handleAbpImageUpload = async (section: AbpSection, id: string, file?: File) => {
    if (!file) return;
    try {
      const url = await uploadMatchReportFile(file, match.id);
      setAbpList(section, getAbpList(section).map(it => (it.id === id ? { ...it, image: url } : it)), true);
    } catch (err) {
      console.error('[match-report-upload]', err);
      alert(t('matchReport.alerts.saveError'));
    }
  };

  const handleBlockImagesUpload = (field: keyof MatchReport, files: FileList | null) => {
    if (!files || files.length === 0) return;
    Promise.all(Array.from(files).map(file => uploadMatchReportFile(file, match.id)))
      .then(newImages => {
        const existing = ((report as any)[field] as string[] | undefined) || [];
        const next = { ...report, [field]: [...existing, ...newImages] };
        setReport(next);
        persistReport(next);
      })
      .catch(err => {
        console.error('[match-report-upload]', err);
        alert(t('matchReport.alerts.saveError'));
      });
  };

  const handleRemoveBlockImage = (field: keyof MatchReport, index: number) => {
    const existing = ((report as any)[field] as string[] | undefined) || [];
    const next = { ...report, [field]: existing.filter((_, i) => i !== index) };
    setReport(next);
    persistReport(next);
  };

  const renderBlockImages = (field: keyof MatchReport) => {
    const images = ((report as any)[field] as string[] | undefined) || [];
    return (
      <div>
        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">{t('matchReport.images')}</label>
        <div className="flex flex-wrap gap-2">
          {images.map((src, index) => (
            <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--border-soft)] group">
              <img loading="lazy" decoding="async"
                src={src}
                alt=""
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setAbpPreviewImage(src)}
              />
              <button
                type="button"
                onClick={() => handleRemoveBlockImage(field, index)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                title={t('common.delete')}
              >
                <i className="fa-solid fa-xmark text-[8px]"></i>
              </button>
            </div>
          ))}
          <label className="w-16 h-16 rounded-lg border border-dashed border-[var(--border-soft)] flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
            <i className="fa-solid fa-plus text-sm"></i>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => { handleBlockImagesUpload(field, e.target.files); e.target.value = ''; }}
              className="hidden"
            />
          </label>
        </div>
      </div>
    );
  };

  const handleAbpVideoUpload = async (section: AbpSection, id: string, file?: File) => {
    if (!file) return;
    try {
      const url = await uploadMatchReportFile(file, match.id);
      setAbpList(section, getAbpList(section).map(it => (it.id === id ? { ...it, video: url } : it)), true);
    } catch (err) {
      console.error('[match-report-upload]', err);
      alert(t('matchReport.alerts.saveError'));
    }
  };

  const isDirectVideoUrl = (url?: string) => {
    if (!url) return false;
    if (url.startsWith('data:video')) return true;
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
  };

  const renderAbpVideoControls = (section: AbpSection, id: string, value?: string) => {
    return (
      <div className="space-y-2">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleAbpVideoUpload(section, id, e.target.files?.[0])}
          className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-3 text-xs text-[var(--text)] focus:outline-none"
        />
        <input
          type="text"
          placeholder={t('matchReport.video.videoUrlPlaceholder')}
          value={value || ''}
          onChange={(e) => updateAbpItemField(section, id, 'video', e.target.value)}
          onBlur={() => persistReport(report)}
          className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-3 text-xs text-[var(--text)] focus:outline-none"
        />
        {value && (
          isDirectVideoUrl(value) ? (
            <div className="relative">
              <video
                src={value}
                controls
                playsInline
                controlsList="nofullscreen"
                className="w-full rounded-2xl border border-[var(--border-soft)] bg-black"
              />
              <button
                type="button"
                onClick={() => setFullscreenAbpVideo(value)}
                title={t('matchReport.video.fullscreen') as string}
                className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all"
              >
                <i className="fa-solid fa-expand text-xs"></i>
              </button>
            </div>
          ) : (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-full bg-slate-900 text-white rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest"
            >
              {t('matchReport.video.openVideo')}
            </a>
          )
        )}
      </div>
    );
  };

  const renderFullscreenAbpVideo = () => {
    if (!fullscreenAbpVideo) return null;
    return (
      <div
        className="fixed inset-0 z-[400] bg-black flex items-center justify-center p-4 animate-fade-in"
        onClick={(e) => { if (e.target === e.currentTarget) setFullscreenAbpVideo(null); }}
      >
        <button
          type="button"
          onClick={() => setFullscreenAbpVideo(null)}
          className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>
        <video
          src={fullscreenAbpVideo}
          controls
          autoPlay
          playsInline
          controlsList="nofullscreen"
          className="max-w-full max-h-full rounded-2xl"
        />
      </div>
    );
  };

  const exportEventsToCsv = () => {
    const events = report.videoEvents || [];
    if (events.length === 0) {
      alert(t('matchReport.alerts.noEventsToExport'));
      return;
    }
    const headers = ['minuto', 'tipo', 'jugador', 'resultado', 'lado_gol', 'nota', 'timestamp'];
    const rows = events.map(ev => {
      const jugador = ev.playerId ? getPlayerLabel(ev.playerId) : '';
      const resultado = ev.type === 'DUELO' ? (ev.duelOutcome || '') : '';
      const ladoGol = ev.type === 'GOL' ? (ev.goalSide || '') : '';
      const nota = (ev.note || '').replace(/"/g, '""');
      return [
        ev.minute || '',
        ev.type || '',
        jugador,
        resultado,
        ladoGol,
        `"${nota}"`,
        ev.timestamp ? new Date(ev.timestamp).toISOString() : ''
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventos_${match.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAssignPlayer = async (posId: string, playerId: string | number) => {
    const updatedPositions = (report.lineupPositions || []).map(pos => {
      if (pos.id === posId) {
        const playerIds = pos.playerIds || [];
        if (playerIds.some(id => samePlayerId(id, playerId))) return pos;
        return { ...pos, playerIds: [...playerIds, playerId].slice(-3) };
      }
      return pos;
    });
    const next = { ...report, lineupPositions: updatedPositions };
    setReport(next);
    persistReport(next);
  };

  const handleRemovePlayer = async (posId: string, playerId: string | number) => {
    const updatedPositions = (report.lineupPositions || []).map(pos => {
      if (pos.id === posId) return { ...pos, playerIds: (pos.playerIds || []).filter(id => !samePlayerId(id, playerId)) };
      return pos;
    });
    const next = { ...report, lineupPositions: updatedPositions };
    setReport(next);
    persistReport(next);
  };

  const [tempLineupPositions, setTempLineupPositions] = useState<TacticalPosition[] | null>(null);
  const [cambioPendingPlayer, setCambioPendingPlayer] = useState<Player | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | number | null>(null);

  const getPositionType = (label?: string): string => {
    const l = (label || '').toUpperCase();
    if (l === 'POR') return 'GK';
    if (l === 'LD' || l === 'LI' || l === 'DFC' || l === 'CAD' || l === 'CAI') return 'DEF';
    if (l === 'MC' || l === 'MCO' || l === 'MCD' || l === 'MD' || l === 'MI') return 'MID';
    if (l === 'DC' || l === 'ED' || l === 'EI') return 'FWD';
    return 'UNK';
  };

  const handleChangeFormation = async (newForm: string) => {
    // Obtener posiciones actuales del campo (después de sustituciones)
    const currentPositions = currentLineupPositions || getInitialPositions(report.formation || '4-3-3');
    const newPositions = getInitialPositions(newForm);

    // Reasignar jugadores actuales a la nueva formación
    const playersByType = new Map<string, (string | number)[]>();
    currentPositions.forEach(pos => {
      if (pos.playerIds && pos.playerIds.length > 0) {
        const type = getPositionType(pos.label);
        if (!playersByType.has(type)) playersByType.set(type, []);
        playersByType.get(type)?.push(...pos.playerIds);
      }
    });

    const usedPlayers = new Set<string>();
    const positionsWithPlayers = newPositions.map(pos => {
      const type = getPositionType(pos.label);
      const playersOfType = playersByType.get(type) || [];
      const availablePlayers = playersOfType.filter(p => !usedPlayers.has(String(p)));

      if (availablePlayers.length > 0) {
        const player = availablePlayers[0];
        usedPlayers.add(String(player));
        return { ...pos, playerIds: [player] };
      }
      return { ...pos, playerIds: [] };
    });

    setTempLineupPositions(positionsWithPlayers);

    // Guardar solo el cambio de formación, SIN modificar lineupPositions (es inmutable)
    const next = { ...report, formation: newForm };
    setReport(next);
  };

  const handleDropSubstitution = (positionId: string, incomingPlayerId: string | number) => {
    const minute = windowPanelMinute || subForm.minute;
    if (!minute) {
      alert('Introduce el minuto de la sustitución antes de arrastrar un suplente al campo.');
      return;
    }
    const base = tempLineupPositions || (report.lineupPositions && report.lineupPositions.length > 0
      ? report.lineupPositions
      : getInitialPositions(report.formation || '4-3-3'));
    const targetPos = base.find(pos => pos.id === positionId);
    const outgoingPlayerId = targetPos?.playerIds?.[0];

    if (outgoingPlayerId !== undefined) {
      const item: MatchSubstitution = {
        id: crypto.randomUUID(),
        minute: Number(minute),
        playerOutId: outgoingPlayerId,
        playerInId: incomingPlayerId,
      };
      const next = { ...report, substitutions: [...(report.substitutions || []), item].sort((a, b) => a.minute - b.minute) };
      setReport(next);
      persistReport(next);
    }

    const updated = base.map(pos => {
      if (pos.id === positionId) return { ...pos, playerIds: [incomingPlayerId] };
      return { ...pos, playerIds: (pos.playerIds || []).filter(id => !samePlayerId(id, incomingPlayerId)) };
    });
    setTempLineupPositions(updated);
  };

  const handlePitchDrop = (positionId: string, playerId: string | number) => {
    const isBenchPlayer = benchPlayers.some(p => samePlayerId(p.id, playerId));
    if (isBenchPlayer) {
      handleDropSubstitution(positionId, playerId);
    } else {
      handleRepositionPlayer(positionId, playerId);
    }
  };

  const handleRepositionPlayer = (positionId: string, playerId: string | number) => {
    const base = tempLineupPositions || (report.lineupPositions && report.lineupPositions.length > 0
      ? report.lineupPositions
      : getInitialPositions(report.formation || '4-3-3'));
    const updated = base.map(pos => {
      if (pos.id === positionId) return { ...pos, playerIds: [String(playerId)] };
      return { ...pos, playerIds: (pos.playerIds || []).filter(id => String(id) !== String(playerId)) };
    });
    setTempLineupPositions(updated);
  };

  const handleToggleConvocado = async (playerId: string | number, convocado: boolean, reason?: string) => {
    const currentNotConvocado = report.notConvocadoIds || [];
    const nextNotConvocado = convocado
      ? currentNotConvocado.filter(id => !samePlayerId(id, playerId))
      : [...currentNotConvocado.filter(id => !samePlayerId(id, playerId)), playerId];
    const nextPositions = convocado
      ? report.lineupPositions
      : (report.lineupPositions || []).map(pos => ({
          ...pos,
          playerIds: (pos.playerIds || []).filter(id => !samePlayerId(id, playerId))
        }));
    const nextReasons = { ...(report.notConvocadoReasons || {}) };
    if (convocado) {
      delete nextReasons[String(playerId)];
    } else {
      nextReasons[String(playerId)] = reason || 'decision_tecnica';
    }
    const next = { ...report, notConvocadoIds: nextNotConvocado, lineupPositions: nextPositions, notConvocadoReasons: nextReasons };
    setReport(next);
    persistReport(next);
  };

  // ── YouTube Upload Handlers ──────────────────────────────
  const handleYtFileSelect = (e: React.ChangeEvent<HTMLInputElement>, field: 'videoUrl' | 'planVideoUrl' = 'videoUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    setYtTargetField(field);
    setYtSelectedFile(file);
    setYtUploadProgress(null);
  };

  const handleYtUpload = async () => {
    if (!ytSelectedFile) return;

    const abort = new AbortController();
    ytAbortRef.current = abort;

    const titlePrefix = ytTargetField === 'planVideoUrl' ? `${t('matchReport.playerUrl')} – ` : '';
    const title = match.localTeam && match.visitorTeam
      ? `${titlePrefix}${match.localTeam} vs ${match.visitorTeam} – ${match.date ? new Date(match.date).toLocaleDateString(i18n.language) : ''}`
      : `${titlePrefix}${t('matchReport.match')} ${match.id} – ${match.date ? new Date(match.date).toLocaleDateString(i18n.language) : ''}`;

    try {
      const uploadedUrl = await uploadVideoToYouTube({
        file: ytSelectedFile,
        title,
        description: `Subido desde IBL – ${match.competition || ''} ${match.jornada ? 'J' + match.jornada : ''}`.trim(),
        onProgress: setYtUploadProgress,
        signal: abort.signal,
      });

      // Guardar la URL en el report
      setReport(prev => ({ ...prev, [ytTargetField]: uploadedUrl }));
      persistReport({ ...report, [ytTargetField]: uploadedUrl });
      setYtSelectedFile(null);
      if (ytFileInputRef.current) ytFileInputRef.current.value = '';
      if (ytPlanFileInputRef.current) ytPlanFileInputRef.current.value = '';
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[youtube-upload]', err);
      }
    }
  };

  const handleYtCancel = () => {
    ytAbortRef.current?.abort();
    setYtUploadProgress(null);
    setYtSelectedFile(null);
    if (ytFileInputRef.current) ytFileInputRef.current.value = '';
    if (ytPlanFileInputRef.current) ytPlanFileInputRef.current.value = '';
  };

  const renderEventos = () => (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-180px)] bg-slate-100 dark:bg-[#121212] overflow-hidden">
      <div className="flex-1 bg-black relative order-1 lg:order-2 flex items-center justify-center border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-white/5">
          {report.videoUrl ? (
            <div className="relative w-full h-full">
                {isBlockedEmbed(report.videoUrl) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-500 dark:text-white/60">
                        <i className="fa-solid fa-ban text-4xl"></i>
                        <p className="text-xs font-black uppercase tracking-widest">{t('matchReport.video.providerBlocked')}</p>
                        <a href={report.videoUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-[var(--text-strong)] text-[10px] font-black uppercase tracking-widest">{t('matchReport.video.openNewTab')}</a>
                    </div>
                ) : (
                    <iframe 
                        ref={iframeRef}
                        key={report.videoUrl} 
                        src={getEmbedUrl(report.videoUrl, sharedStartSec ?? undefined)} 
                        className="w-full h-full" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                )}
                {calculateMatchTime && (
                    <div className="absolute bottom-6 right-6 z-20 animate-fade-in pointer-events-none">
                        <div className="bg-[var(--accent)]/90 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">{calculateMatchTime.part}</span>
                                <span className="text-2xl font-black text-white leading-none font-mono tracking-tighter">{calculateMatchTime.full}'</span>
                            </div>
                            <div className="flex flex-col items-end pl-4 border-l border-white/20">
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">{t('matchReport.matchTimes.realTime')}</span>
                                <span className="text-sm font-black text-white/90 font-mono tracking-tight">{formatHMS(currentTimeSec)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          ) : (
            <div className="w-full max-w-lg p-10 flex flex-col items-center text-center gap-6 animate-fade-in">
                <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-white/20"><i className="fa-solid fa-link-slash text-4xl"></i></div>
                <div><h4 className="text-[var(--text-strong)] font-black uppercase tracking-widest text-lg mb-2">{t('matchReport.video.noVideo')}</h4><p className="text-slate-400 dark:text-white/40 text-[11px] font-medium leading-relaxed">{t('matchReport.video.noVideoDesc')}</p></div>
                <div className="w-full"><input type="text" placeholder={t('matchReport.video.urlPlaceholder')} value={report.videoUrl} onChange={(e) => { const val = e.target.value; setReport({...report, videoUrl: val}); if (val.includes('http')) persistReport({...report, videoUrl: val}); }} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-5 text-[var(--text-strong)] text-sm focus:border-red-500 outline-none text-center font-bold" /></div>

                {/* Separador */}
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 h-px bg-slate-100 dark:bg-white/10"></div>
                  <span className="text-[9px] font-black text-slate-300 dark:text-white/20 uppercase tracking-widest">{t('matchReport.video.orUploadDirectly')}</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-white/10"></div>
                </div>

                {/* YouTube Upload */}
                <div className="w-full space-y-3">
                  <input
                    ref={ytFileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleYtFileSelect}
                    className="hidden"
                  />
                  {!ytSelectedFile && !ytUploadProgress && (
                    <button
                      onClick={() => ytFileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-2xl px-6 py-5 text-red-400 transition-all group"
                    >
                      <i className="fa-brands fa-youtube text-2xl group-hover:scale-110 transition-transform"></i>
                      <div className="text-left">
                        <span className="block text-sm font-black uppercase tracking-widest">{t('matchReport.video.uploadToYoutube')}</span>
                        <span className="block text-[10px] text-slate-400 dark:text-white/30 font-medium">{t('matchReport.video.uploadUnlisted')}</span>
                      </div>
                    </button>
                  )}

                  {ytSelectedFile && !ytUploadProgress && (
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-film text-slate-400 dark:text-white/30"></i>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-strong)] text-xs font-bold truncate">{ytSelectedFile.name}</p>
                          <p className="text-slate-400 dark:text-white/30 text-[10px]">{formatFileSize(ytSelectedFile.size)}</p>
                        </div>
                        <button onClick={handleYtCancel} className="text-slate-300 dark:text-white/20 hover:text-slate-500 dark:hover:text-white/60 text-xs">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                      <button
                        onClick={handleYtUpload}
                        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        <i className="fa-brands fa-youtube mr-2"></i>{t('matchReport.video.uploadToYoutube')}
                      </button>
                    </div>
                  )}

                  {ytUploadProgress && ytUploadProgress.stage !== 'done' && ytUploadProgress.stage !== 'error' && (
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">{ytUploadProgress.message}</span>
                        <button onClick={handleYtCancel} className="text-slate-300 dark:text-white/20 hover:text-red-400 text-[10px] font-bold uppercase">{t('common.cancel')}</button>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-300"
                          style={{ width: `${ytUploadProgress.percent}%` }}
                        ></div>
                      </div>
                      <p className="text-slate-400 dark:text-white/30 text-[10px] text-center">{ytUploadProgress.percent}%</p>
                    </div>
                  )}

                  {ytUploadProgress?.stage === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center space-y-2">
                      <p className="text-red-400 text-xs font-bold"><i className="fa-solid fa-circle-exclamation mr-2"></i>{ytUploadProgress.error}</p>
                      <button onClick={handleYtCancel} className="text-slate-400 dark:text-white/40 hover:text-slate-500 dark:hover:text-white/60 text-[10px] font-bold uppercase">{t('matchReport.video.retry')}</button>
                    </div>
                  )}
                </div>
            </div>
          )}
      </div>

      <div className="w-full lg:w-[420px] flex flex-col bg-white dark:bg-[#0f0f0f] overflow-y-auto lg:overflow-hidden shrink-0 order-2 lg:order-1 border-r border-slate-200 dark:border-white/5 shadow-2xl">
         <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0b0b]">
            <label className="block text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-2"><i className="fa-brands fa-youtube mr-2"></i>{t('matchReport.video.matchUrl')}</label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={report.videoUrl} 
                    onChange={(e) => { const val = e.target.value; setReport({...report, videoUrl: val}); }} 
                    onBlur={() => persistReport(report)}
                    placeholder={t('matchReport.video.pasteLink')}
                    className="flex-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] text-red-400 focus:border-red-500 outline-none font-bold placeholder:text-slate-300 dark:placeholder:text-white/10 font-mono"
                />
                <button
                  onClick={() => ytFileInputRef.current?.click()}
                  title={t('matchReport.video.uploadToYoutubeTitle')}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-red-400 transition-colors shrink-0"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                </button>
            </div>
            {/* Mini progress bar in sidebar */}
            {ytUploadProgress && ytUploadProgress.stage !== 'done' && ytUploadProgress.stage !== 'error' && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: `${ytUploadProgress.percent}%` }}></div>
                </div>
                <p className="text-[8px] text-slate-400 dark:text-white/30 font-bold">{ytUploadProgress.message}</p>
              </div>
            )}
         </div>
         <div className="p-5 border-b border-slate-200 dark:border-white/10 space-y-6">
            <div className="bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 rounded-3xl p-5 space-y-4">
                <button onClick={() => setShowMatchTimes(!showMatchTimes)} className="w-full flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-300 dark:text-white/20 uppercase tracking-[0.3em]">{t('matchReport.matchTimes.title')}</span>
                    <span className="text-[9px] font-black text-slate-400 dark:text-white/30 flex items-center gap-2 uppercase">
                        {showMatchTimes ? t('matchReport.matchTimes.hide') : t('matchReport.matchTimes.show')}
                        <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${showMatchTimes ? '' : '-rotate-90'}`}></i>
                    </span>
                </button>
                {showMatchTimes && (
                <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">{t('matchReport.matchTimes.firstHalfStart')}</span>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={report.firstHalfStart || ''}
                                onChange={(e) => setReport(prev => ({ ...prev, firstHalfStart: e.target.value }))}
                                onBlur={() => persistReport(report)}
                                placeholder="00:00"
                                className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] text-[var(--text-strong)] font-mono focus:border-red-500 outline-none"
                            />
                            <button onClick={() => setHalfTime('firstHalfStart', currentTimeSec)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 text-[9px] font-black">SET</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">{t('matchReport.matchTimes.firstHalfEnd')}</span>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={report.firstHalfEnd || ''}
                                onChange={(e) => setReport(prev => ({ ...prev, firstHalfEnd: e.target.value }))}
                                onBlur={() => persistReport(report)}
                                placeholder="45:00"
                                className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] text-[var(--text-strong)] font-mono focus:border-red-500 outline-none"
                            />
                            <button onClick={() => setHalfTime('firstHalfEnd', currentTimeSec)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 text-[9px] font-black">SET</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">{t('matchReport.matchTimes.secondHalfStart')}</span>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={report.secondHalfStart || ''}
                                onChange={(e) => setReport(prev => ({ ...prev, secondHalfStart: e.target.value }))}
                                onBlur={() => persistReport(report)}
                                placeholder="45:00"
                                className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] text-[var(--text-strong)] font-mono focus:border-red-500 outline-none"
                            />
                            <button onClick={() => setHalfTime('secondHalfStart', currentTimeSec)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 text-[9px] font-black">SET</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">{t('matchReport.matchTimes.secondHalfEnd')}</span>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={report.secondHalfEnd || ''}
                                onChange={(e) => setReport(prev => ({ ...prev, secondHalfEnd: e.target.value }))}
                                onBlur={() => persistReport(report)}
                                placeholder="90:00"
                                className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] text-[var(--text-strong)] font-mono focus:border-red-500 outline-none"
                            />
                            <button onClick={() => setHalfTime('secondHalfEnd', currentTimeSec)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 text-[9px] font-black">SET</button>
                        </div>
                    </div>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-white/30 font-bold leading-relaxed">
                    {t('matchReport.matchTimes.timesHelp')}
                </p>
                </div>
                )}
            </div>

            <div className="space-y-4">
                
                <div className="grid grid-cols-2 gap-3">
                    {eventButtons.map((btn) => (
                        <button
                          key={btn.id}
                          onClick={() => {
                            if (btn.id === 'GOL') { setIsGoalDialogOpen(true); return; }
                            if (btn.id === 'DUELO') { 
                              setDuelPlayerSelection(selectedPlayerId);
                              setIsDuelDialogOpen(true);
                              return;
                            }
                            handleAddEvent(btn.id as any);
                          }}
                          className="flex items-center gap-3 group cursor-pointer bg-slate-100 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 transition-all active:scale-[0.98]"
                        >
                            <div className={`${btn.bg} w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-strong)] shadow-lg`}>
                                <i className={`fa-solid ${btn.icon} text-sm`}></i>
                            </div>
                            <span className="text-[10px] font-black text-slate-600 dark:text-white/70 group-hover:text-[var(--text-strong)] transition-colors uppercase tracking-[0.2em]">{btn.label}</span>
                        </button>
                    ))}
                </div>
            </div>
         </div>
         
         {isGoalDialogOpen && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-sm mx-4 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl">
                    <div className="text-center space-y-2">
                        <div className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.3em]">GOL</div>
                        <h3 className="text-lg font-black text-[var(--text-strong)]">
                          {goalSideSelection === '' ? t('matchReport.goalDialog.favorOrAgainst') : t('matchReport.goalDialog.selectPlayer')}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">
                          {goalSideSelection === '' ? t('matchReport.goalDialog.selectGoalType') : t('matchReport.goalDialog.selectWhoScored')}
                        </p>
                    </div>
                    {goalSideSelection === '' ? (
                      <div className="mt-6 grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setGoalSideSelection('FAVOR')}
                            className="py-4 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest"
                          >
                            {t('matchReport.goalDialog.inFavor')}
                          </button>
                          <button
                            onClick={() => { setIsGoalDialogOpen(false); setGoalSideSelection(''); setGoalPlayerSelection(''); handleAddEvent('GOL', { goalSide: 'CONTRA' }); }}
                            className="py-4 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest"
                          >
                            {t('matchReport.goalDialog.against')}
                          </button>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-3">
                        {(report.lineupPositions || []).length === 0 ? (
                          <div className="text-center text-[10px] text-slate-400 dark:text-white/40">
                            No hay 11 asignado en la alineación.
                          </div>
                        ) : (
                          <div className="relative w-full h-[320px] rounded-2xl bg-[#2d5a3f] border border-white/10 overflow-hidden">
                            <div className="absolute inset-3 border border-white/30 rounded-lg pointer-events-none">
                              <div className="absolute top-1/2 left-0 right-0 border-t border-white/30"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/30 rounded-full"></div>
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-10 border-b border-x border-white/30"></div>
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-10 border-t border-x border-white/30"></div>
                            </div>
                            <div className="absolute inset-0">
                              {(report.lineupPositions || []).map((pos) => {
                                const assignedId = pos.playerIds && pos.playerIds.length > 0 ? pos.playerIds[pos.playerIds.length - 1] : undefined;
                                const player = assignedId ? squad.find(p => samePlayerId(p.id, assignedId)) : undefined;
                                if (!player) return null;
                                const isSelected = samePlayerId(goalPlayerSelection, player.id);
                                return (
                                  <button
                                    key={pos.id}
                                    onClick={() => setGoalPlayerSelection(player.id)}
                                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all ${
                                      isSelected ? 'scale-105' : ''
                                    }`}
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                  >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-[10px] border-[3px] ${
                                      isSelected ? 'bg-[var(--accent)] border-yellow-300 text-white ring-4 ring-yellow-300/40' : 'bg-[var(--accent)] border-white text-white'
                                    }`}>
                                      {player.dorsal}
                                    </div>
                                    <span className="mt-1 text-[7px] font-black uppercase text-white/90 bg-black/80 px-2 py-0.5 rounded">
                                      {player.apodo || player.nombre}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (goalPlayerSelection === '') return;
                            setIsGoalDialogOpen(false);
                            handleAddEvent('GOL', { goalSide: 'FAVOR', playerId: goalPlayerSelection });
                            setGoalSideSelection('');
                            setGoalPlayerSelection('');
                          }}
                          className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${goalPlayerSelection === '' ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30' : 'bg-red-600/90 hover:bg-red-600 text-white'}`}
                        >
                          {t('common.confirm')}
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => { setIsGoalDialogOpen(false); setGoalSideSelection(''); setGoalPlayerSelection(''); }}
                      className="mt-4 w-full py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 font-black text-[9px] uppercase tracking-widest"
                    >
                      {t('common.cancel')}
                    </button>
                </div>
            </div>
         )}

         {isDuelDialogOpen && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-sm mx-4 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl">
                    <div className="text-center space-y-2">
                        <div className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.3em]">DUELO</div>
                        <h3 className="text-lg font-black text-[var(--text-strong)]">{t('matchReport.duelDialog.selectPlayer')}</h3>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">{t('matchReport.duelDialog.selectOutcome')}</p>
                    </div>
                    <div className="mt-6 space-y-3">
                        {(report.lineupPositions || []).length === 0 ? (
                          <div className="text-center text-[10px] text-slate-400 dark:text-white/40">
                            {t('matchReport.duelDialog.noLineup')}
                          </div>
                        ) : (
                          <div className="relative w-full h-[320px] rounded-2xl bg-[#2d5a3f] border border-white/10 overflow-hidden">
                            <div className="absolute inset-3 border border-white/30 rounded-lg pointer-events-none">
                              <div className="absolute top-1/2 left-0 right-0 border-t border-white/30"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/30 rounded-full"></div>
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-10 border-b border-x border-white/30"></div>
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-10 border-t border-x border-white/30"></div>
                            </div>
                            <div className="absolute inset-0">
                              {(report.lineupPositions || []).map((pos) => {
                                const assignedId = pos.playerIds && pos.playerIds.length > 0 ? pos.playerIds[pos.playerIds.length - 1] : undefined;
                                const player = assignedId ? squad.find(p => samePlayerId(p.id, assignedId)) : undefined;
                                if (!player) return null;
                                const isSelected = samePlayerId(duelPlayerSelection, player.id);
                                return (
                                  <button
                                    key={pos.id}
                                    onClick={() => setDuelPlayerSelection(player.id)}
                                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all ${
                                      isSelected ? 'scale-105' : ''
                                    }`}
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                  >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-[10px] border-[3px] ${
                                      isSelected ? 'bg-[var(--accent)] border-yellow-300 text-white ring-4 ring-yellow-300/40' : 'bg-[var(--accent)] border-white text-white'
                                    }`}>
                                      {player.dorsal}
                                    </div>
                                    <span className="mt-1 text-[7px] font-black uppercase text-white/90 bg-black/80 px-2 py-0.5 rounded">
                                      {player.apodo || player.nombre}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              if (duelPlayerSelection === '') return;
                              setIsDuelDialogOpen(false);
                              handleAddEvent('DUELO', { playerId: duelPlayerSelection, duelOutcome: 'GANADO' });
                              setDuelPlayerSelection('');
                            }}
                            className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${duelPlayerSelection === '' ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30' : 'bg-emerald-600/90 hover:bg-emerald-600 text-white'}`}
                          >
                            {t('matchReport.duelDialog.won')}
                          </button>
                          <button
                            onClick={() => {
                              if (duelPlayerSelection === '') return;
                              setIsDuelDialogOpen(false);
                              handleAddEvent('DUELO', { playerId: duelPlayerSelection, duelOutcome: 'PERDIDO' });
                              setDuelPlayerSelection('');
                            }}
                            className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${duelPlayerSelection === '' ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30' : 'bg-red-600/90 hover:bg-red-600 text-white'}`}
                          >
                            {t('matchReport.duelDialog.lost')}
                          </button>
                        </div>
                    </div>
                    <button
                      onClick={() => { setIsDuelDialogOpen(false); setDuelPlayerSelection(''); }}
                      className="mt-4 w-full py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 font-black text-[9px] uppercase tracking-widest"
                    >
                      {t('common.cancel')}
                    </button>
                </div>
            </div>
         )}

         <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a0a0a] space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.3em]">{t('matchReport.events.history')}</span>
                <div className="flex items-center gap-3">
                    <button
                      onClick={exportEventsToCsv}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 hover:text-[var(--text-strong)] hover:bg-slate-100 dark:hover:bg-white/10 text-[9px] font-black uppercase tracking-widest"
                    >
                      {t('matchReport.events.exportCsv')}
                    </button>
                    <span className="text-[9px] font-black text-slate-400 dark:text-white/30">{filteredEvents.length}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">{t('matchReport.events.player')}</span>
                <select
                  value={playerFilter}
                  onChange={(e) => setPlayerFilter(e.target.value === 'ALL' ? 'ALL' : e.target.value)}
                  className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] text-slate-700 dark:text-white/80 outline-none"
                >
                  <option value="ALL" className="text-black">{t('matchReport.events.all')}</option>
                  {squad.map(player => (
                    <option key={player.id} value={player.id} className="text-black">
                      {player.dorsal ? `${player.dorsal} - ` : ''}{player.apodo || player.nombre}
                    </option>
                  ))}
                </select>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {['ALL', ...eventButtons.map(btn => btn.id)].map(f => (
                    <button
                      key={f}
                      onClick={() => setEventFilter(f)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all ${eventFilter === f ? 'bg-white text-black' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 hover:text-slate-500 dark:hover:text-white/60'}`}
                    >
                      {f === 'ALL' ? t('matchReport.events.historyFilter') : (eventTypeLabels[f] || f)}
                    </button>
                ))}
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-[#0a0a0a] min-h-[400px] scrollbar-hide pb-20">
            {filteredEvents.length === 0 ? (
                <div className="py-20 text-center opacity-5"><i className="fa-solid fa-timeline text-6xl mb-4"></i><p className="text-[var(--text-strong)] text-[10px] uppercase font-black tracking-widest">{t('matchReport.events.noEvents')}</p></div>
            ) : (
                filteredEvents.map((ev) => {
                    const isEditing = editingEventId === ev.id;
                    return (
                        <div key={ev.id} className={`p-4 rounded-3xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/5 transition-all group relative z-10 ${isEditing ? 'ring-2 ring-red-500/50 bg-slate-100 dark:bg-[#1a1a1a]' : 'hover:bg-slate-100 dark:hover:bg-[#1a1a1a]'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-black text-red-500 font-mono tracking-tighter">{ev.minute}</span>
                                    <span className="text-[var(--text-strong)] text-[10px] font-black uppercase tracking-widest">{eventTypeLabels[ev.type] || ev.type}</span>
                                    {ev.playerId && (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">
                                            {getPlayerLabel(ev.playerId)}
                                        </span>
                                    )}
                                    {ev.type === 'GOL' && ev.goalSide && (
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${ev.goalSide === 'FAVOR' ? 'text-red-400' : 'text-red-400'}`}>
                                            {goalSideLabels[ev.goalSide || ''] || ev.goalSide}
                                        </span>
                                    )}
                                    {ev.type === 'DUELO' && ev.duelOutcome && (
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${ev.duelOutcome === 'GANADO' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {duelOutcomeLabels[ev.duelOutcome || ''] || ev.duelOutcome}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {!isEditing && (
                                        <>
                                            <button 
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); playVideoAt(timeToSeconds(ev.minute)); }}
                                              className="w-10 h-10 rounded-xl bg-red-600 text-white shadow-lg active:scale-90 transition-all flex items-center justify-center cursor-pointer hover:bg-red-500 z-20"
                                              title={t('matchReport.events.playClip')}
                                            >
                                              <i className="fa-solid fa-play text-[11px]"></i>
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleShareEvent(ev); }}
                                              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-red-400 hover:bg-red-600 hover:text-white shadow-lg flex items-center justify-center transition-all cursor-pointer z-20" 
                                              title={t('matchReport.events.copyEventLink')}
                                            >
                                              <i className="fa-solid fa-share-nodes text-[11px]"></i>
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); startEditing(ev); }}
                                              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 hover:text-[var(--text-strong)] hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer z-20"
                                              title={t('matchReport.events.editTimeNote')}
                                            >
                                              <i className="fa-solid fa-pencil text-[11px]"></i>
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={(e) => { 
                                                e.stopPropagation();
                                                if(confirm(t('matchReport.alerts.deleteEventConfirm'))) {
                                                  const nextEvents = report.videoEvents?.filter(x=>x.id!==ev.id);
                                                  const next = {...report, videoEvents: nextEvents};
                                                  setReport(next); 
                                                  persistReport(next);
                                                } 
                                              }} 
                                              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center cursor-pointer z-20"
                                              title={t('matchReport.events.deleteRecord')}
                                            >
                                              <i className="fa-solid fa-trash text-[11px]"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {isEditing ? (
                                <div className="space-y-3 animate-fade-in pt-3 border-t border-slate-200 dark:border-white/5">
                                    <div className="flex gap-2">
                                        <div className="w-24">
                                            <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">{t('matchReport.editForm.time')}</label>
                                            <input 
                                                type="text" 
                                                value={editForm.minute}
                                                onChange={(e) => setEditForm({...editForm, minute: e.target.value})}
                                                className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-xs text-[var(--text-strong)] font-mono text-center focus:border-red-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">{t('matchReport.editForm.description')}</label>
                                            <input 
                                              type="text" 
                                              autoFocus
                                              value={editForm.note}
                                              onChange={(e) => setEditForm({...editForm, note: e.target.value})} 
                                              className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--text-strong)] outline-none focus:border-red-500" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">{t('matchReport.editForm.player')}</label>
                                        <select
                                          value={editForm.playerId}
                                          onChange={(e) => setEditForm({ ...editForm, playerId: e.target.value === '' ? '' : e.target.value })}
                                          className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--text-strong)] outline-none focus:border-red-500"
                                        >
                                          <option value="" className="text-black">{t('matchReport.editForm.noPlayer')}</option>
                                          {squad.map(player => (
                                            <option key={player.id} value={player.id} className="text-black">
                                              {player.dorsal ? `${player.dorsal} - ` : ''}{player.apodo || player.nombre}
                                            </option>
                                          ))}
                                        </select>
                                    </div>
                                    {report.videoEvents?.find(x => x.id === ev.id)?.type === 'GOL' && (
                                      <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">{t('matchReport.editForm.goalLabel')}</label>
                                        <select
                                          value={editForm.goalSide}
                                          onChange={(e) => setEditForm({ ...editForm, goalSide: e.target.value as any })}
                                          className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--text-strong)] outline-none focus:border-red-500"
                                        >
                                          <option value="" className="text-black">{t('matchReport.editForm.undefined')}</option>
                                          <option value="FAVOR" className="text-black">{t('matchReport.editForm.inFavor')}</option>
                                          <option value="CONTRA" className="text-black">{t('matchReport.editForm.against')}</option>
                                        </select>
                                      </div>
                                    )}
                                    <div className="flex justify-end gap-2">
                                        <button onClick={cancelEditing} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase transition-all">{t('common.cancel')}</button>
                                        <button onClick={saveEditing} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase transition-all">{t('matchReport.editForm.saveChanges')}</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-400 dark:text-white/40 text-[11px] font-medium italic pl-1 truncate">{ev.note || t('matchReport.events.noDescription')}</p>
                            )}
                        </div>
                    );
                })
            )}
         </div>
         <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0f0f]">
            <button onClick={handleSave} className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-2">
                {isSaving ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-check-double"></i>} {t('matchReport.finishAndSave')}
            </button>
         </div>
      </div>
    </div>
  );

  const renderAlineacionTactiva = () => (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-130px)]">
        <div className="flex justify-center px-6 py-2">
             <button onClick={handleSave} className="bg-sport-primary hover:bg-sport-primary-dark text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"><i className="fa-solid fa-floppy-disk"></i> {t('matchReport.saveLineup')}</button>
        </div>
        <TacticalBoard
            formacion={report.formation || '4-3-3'}
            positions={report.lineupPositions && report.lineupPositions.length > 0
                ? report.lineupPositions
                : getInitialPositions(report.formation || '4-3-3')}
            squad={squad}
            notConvocadoIds={report.notConvocadoIds || []}
            notConvocadoReasons={report.notConvocadoReasons || {}}
            onAssignPlayer={handleAssignPlayer}
            onRemovePlayer={handleRemovePlayer}
            onChangeFormation={handleChangeFormation}
            onToggleConvocado={handleToggleConvocado}
            onPlayerSelect={setSelectedPlayerForModal}
        />
    </div>
  );

  const renderEventosPartido = () => {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto space-y-10">
        {/* Nueva sección: Campo interactivo para registrar eventos */}
        <div>
          <h3 className="text-base font-black uppercase tracking-widest text-[var(--text-strong)] mb-4 flex items-center gap-2">
            <i className="fa-solid fa-hand-pointer text-[var(--accent)]"></i>{t('matchReport.matchEvents.quickRegister')}
          </h3>
          <p className="text-sm font-bold text-[var(--text-muted)] mb-4">{t('matchReport.matchEvents.clickPlayerInstruction')}</p>
          {renderInteractiveFieldForEvents()}
        </div>


        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-strong)] mb-4 flex items-center gap-2">
            <i className="fa-solid fa-images text-[var(--accent)]"></i>{t('matchReport.matchEvents.systemAfterSubstitutions')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div
              onClick={() => setExpandedFormation({ type: 'initial' })}
              className="relative group cursor-pointer rounded-lg overflow-hidden transition-all hover:shadow-lg hover:scale-105"
              role="button"
              tabIndex={0}
            >
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 text-center">
                {t('matchReport.generalData.startingXI')} · {report.formation || '4-3-3'}
              </p>
              <div className="relative">
                {renderPitchDiagram(report.lineupPositions && report.lineupPositions.length > 0 ? report.lineupPositions : getInitialPositions(report.formation || '4-3-3'))}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <i className="fa-solid fa-expand text-white text-lg drop-shadow-lg"></i>
                </div>
              </div>
            </div>
            {windowSnapshots.map(win => (
              <div
                key={win.id}
                onClick={() => setExpandedFormation({ type: 'window', id: win.id })}
                className="relative group cursor-pointer rounded-lg overflow-hidden transition-all hover:shadow-lg hover:scale-105"
                role="button"
                tabIndex={0}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWindow(win);
                  }}
                  title={t('common.delete')}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow"
                >
                  <i className="fa-solid fa-trash-can text-[10px]"></i>
                </button>
                {renderWindowSummary(win)}
                <div className="relative">
                  {renderPitchDiagram(win.positions, win.incomingIds)}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <i className="fa-solid fa-expand text-white text-lg drop-shadow-lg"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-strong)] mb-4 flex items-center gap-2">
            <i className="fa-solid fa-right-left text-[var(--accent)]"></i>{t('matchReport.matchEvents.substitutions')}
          </h3>
          <div className="space-y-2 mb-4">
            {(report.substitutions || []).length === 0 ? (
              <p className="text-xs font-bold text-[var(--text-muted)]">{t('matchReport.matchEvents.noSubstitutions')}</p>
            ) : (
              [...(report.substitutions || [])].sort((a, b) => a.minute - b.minute).map(sub => (
                <div key={sub.id} className={`rounded-2xl ${editingSubstitutionId === sub.id ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-[var(--surface-1)] border border-[var(--border-soft)]'} px-4 py-3`}>
                  {editingSubstitutionId === sub.id ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-[var(--text-muted)] uppercase mb-1 tracking-widest">{t('matchReport.matchEvents.minute')}</label>
                          <input type="number" min={0} max={130} value={substitutionEditForm.minute} onChange={e => setSubstitutionEditForm({ ...substitutionEditForm, minute: e.target.value })} className="w-20 bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-[var(--text-muted)] uppercase mb-1 tracking-widest">{t('matchReport.matchEvents.playerOut')}</label>
                          <select value={substitutionEditForm.playerOutId} onChange={e => setSubstitutionEditForm({ ...substitutionEditForm, playerOutId: e.target.value })} className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]">
                            <option value="">{t('matchReport.matchEvents.selectPlayer')}</option>
                            {playerOutOptions.map(p => <option key={p.id} value={p.id}>{p.dorsal} {p.apodo || p.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-[var(--text-muted)] uppercase mb-1 tracking-widest">{t('matchReport.matchEvents.playerIn')}</label>
                          <select value={substitutionEditForm.playerInId} onChange={e => setSubstitutionEditForm({ ...substitutionEditForm, playerInId: e.target.value })} className="bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]">
                            <option value="">{t('matchReport.matchEvents.selectPlayer')}</option>
                            {playerInOptions.map(p => <option key={p.id} value={p.id}>{p.dorsal} {p.apodo || p.nombre}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEditSubstitution} className="bg-sport-primary hover:bg-sport-primary-dark text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"><i className="fa-solid fa-check"></i>{t('common.save')}</button>
                        <button onClick={cancelEditSubstitution} className="bg-[var(--surface-0)] hover:bg-[var(--surface-1)] text-[var(--text-strong)] px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">{t('common.cancel')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-strong)]">
                        <span className="px-2 py-1 rounded-lg bg-sport-primary text-white text-[10px] font-black">{sub.minute}'</span>
                        <span className="flex items-center gap-2"><i className="fa-solid fa-arrow-down text-red-500"></i>{getPlayerLabel(sub.playerOutId)}</span>
                        <span className="flex items-center gap-2"><i className="fa-solid fa-arrow-up text-emerald-500"></i>{getPlayerLabel(sub.playerInId)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEditSubstitution(sub)} title={t('matchReport.events.editTimeNote')} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"><i className="fa-solid fa-pencil text-xs"></i></button>
                        <button onClick={() => removeSubstitution(sub.id)} title={t('common.delete')} className="text-[var(--text-muted)] hover:text-red-500 transition-all"><i className="fa-solid fa-trash-can text-xs"></i></button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    );
  };

  const togglePlanBlockCollapsed = (id: string) => {
    setCollapsedPlanBlocks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleRivalBlockCollapsed = (id: string) => {
    setCollapsedRivalBlocks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const hasMediaBlockContent = (id: string) => {
    const r = report as any;
    const images = r[`${id}Images`] as string[] | undefined;
    return Boolean(r[`${id}Video`] || r[`${id}Doc`] || (images && images.length > 0));
  };

  const isMediaBlockOpen = (id: string) => {
    if (closedMediaBlocks.has(id)) return false;
    return expandedMediaBlock === id || hasMediaBlockContent(id);
  };

  const toggleMediaBlock = (id: string) => {
    if (isMediaBlockOpen(id)) {
      setClosedMediaBlocks(prev => new Set(prev).add(id));
      if (expandedMediaBlock === id) setExpandedMediaBlock(null);
    } else {
      setClosedMediaBlocks(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setExpandedMediaBlock(id);
    }
  };

  const renderPlanPartido = () => (
    <div className="animate-fade-in space-y-8 max-w-5xl mx-auto pb-32">
      <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-8">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
              <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2"><i className="fa-solid fa-sliders text-red-500"></i> {t('matchReport.finalReports')}</div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest">PRO ENGINE v3.0</span>
                <button onClick={handleSave} disabled={isSaving} className="bg-sport-primary hover:bg-sport-primary-dark disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all"><i className="fa-solid fa-floppy-disk"></i> {t('matchReport.savePlan')}</button>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.playerUrl')}</label>
                <div className="flex gap-2">
                  <input type="text" value={report.planVideoUrl} onChange={(e) => handleChange('planVideoUrl', e.target.value)} className="flex-1 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]" placeholder="https://..." />
                  <input
                    ref={ytPlanFileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleYtFileSelect(e, 'planVideoUrl')}
                    className="hidden"
                  />
                  <button
                    onClick={() => ytPlanFileInputRef.current?.click()}
                    title={t('matchReport.video.uploadToYoutubeTitle')}
                    className="px-4 py-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-2xl text-red-400 transition-colors shrink-0"
                  >
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                  </button>
                </div>
                {ytTargetField === 'planVideoUrl' && ytSelectedFile && !ytUploadProgress && (
                  <div className="mt-3 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <i className="fa-solid fa-film text-slate-400 dark:text-white/30"></i>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-strong)] text-xs font-bold truncate">{ytSelectedFile.name}</p>
                        <p className="text-slate-400 dark:text-white/30 text-[10px]">{formatFileSize(ytSelectedFile.size)}</p>
                      </div>
                      <button onClick={handleYtCancel} className="text-slate-300 dark:text-white/20 hover:text-slate-500 dark:hover:text-white/60 text-xs">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                    <button
                      onClick={handleYtUpload}
                      className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                      <i className="fa-brands fa-youtube mr-2"></i>{t('matchReport.video.uploadToYoutube')}
                    </button>
                  </div>
                )}
                {ytTargetField === 'planVideoUrl' && ytUploadProgress && ytUploadProgress.stage !== 'done' && ytUploadProgress.stage !== 'error' && (
                  <div className="mt-3 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">{ytUploadProgress.message}</span>
                      <button onClick={handleYtCancel} className="text-slate-300 dark:text-white/20 hover:text-red-400 text-[10px] font-bold uppercase">{t('common.cancel')}</button>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: `${ytUploadProgress.percent}%` }}></div>
                    </div>
                    <p className="text-slate-400 dark:text-white/30 text-[10px] text-center">{ytUploadProgress.percent}%</p>
                  </div>
                )}
                {ytTargetField === 'planVideoUrl' && ytUploadProgress?.stage === 'error' && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center space-y-2">
                    <p className="text-red-400 text-xs font-bold"><i className="fa-solid fa-circle-exclamation mr-2"></i>{ytUploadProgress.error}</p>
                    <button onClick={handleYtCancel} className="text-slate-400 dark:text-white/40 hover:text-slate-500 dark:hover:text-white/60 text-[10px] font-bold uppercase">{t('matchReport.video.retry')}</button>
                  </div>
                )}
                {report.planVideoUrl && !isBlockedEmbed(report.planVideoUrl) && (
                  <div className="mt-4 aspect-video rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
                  <iframe title="reproductor-plan" src={getEmbedUrl(report.planVideoUrl, sharedStartSec ?? undefined)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  </div>
                )}
                {report.planVideoUrl && (
                  <a className="text-[11px] font-black text-[var(--accent)] underline inline-block mt-2" href={report.planVideoUrl} target="_blank" rel="noreferrer">
                    {t('matchReport.video.openVideoNewTab')}
                  </a>
                )}
             </div>
             <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.tacticalDoc')}</label>
                <input type="text" value={report.planDocUrl} onChange={(e) => handleChange('planDocUrl', e.target.value)} className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]" placeholder="https://..." />
                {report.planDocUrl && (
                  <div className="mt-4 aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
                    <iframe title="documento-plan" src={getDocEmbedUrl(report.planDocUrl)} className="w-full h-full"></iframe>
                  </div>
                )}
                {report.planDocUrl && (
                  <a className="text-[11px] font-black text-[var(--accent)] underline inline-block mt-2" href={report.planDocUrl} target="_blank" rel="noreferrer">
                    {t('matchReport.video.openPdfNewTab')}
                  </a>
                )}
             </div>
          </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[{ id: 'planConBalon', label: t('matchReport.attack'), icon: 'fa-futbol', color: 'text-red-500' }, { id: 'planSinBalon', label: t('matchReport.defense'), icon: 'fa-shield-halved', color: 'text-red-500' }, { id: 'planAbp', label: t('matchReport.transitions'), icon: 'fa-bolt', color: 'text-emerald-500' }].map((block) => (
          <div key={block.id} className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-xl space-y-5 flex flex-col relative group hover:border-[var(--surface-3)] transition-all">
            <div className="flex justify-between items-center">
                <div className={`text-[11px] font-black ${block.color} uppercase tracking-[0.2em] flex items-center gap-2`}><i className={`fa-solid ${block.icon}`}></i> {block.label}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleMediaBlock(block.id)} className="w-8 h-8 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all"><i className={`fa-solid ${isMediaBlockOpen(block.id) ? 'fa-xmark' : 'fa-paperclip'} text-xs`}></i></button>
                  <button
                    onClick={() => togglePlanBlockCollapsed(block.id)}
                    title={collapsedPlanBlocks.has(block.id) ? t('matchReport.showSection') : t('matchReport.hideSection')}
                    className="w-8 h-8 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all"
                  >
                    <i className={`fa-solid ${collapsedPlanBlocks.has(block.id) ? 'fa-chevron-down' : 'fa-chevron-up'} text-xs`}></i>
                  </button>
                </div>
            </div>

            {collapsedPlanBlocks.has(block.id) ? null : (
            <>
            {isMediaBlockOpen(block.id) && (
                <div className="bg-[var(--surface-1)] p-4 rounded-2xl space-y-3 animate-fade-in border border-[var(--border-soft)]">
                    <div>
                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">{t('matchReport.specificVideo')}</label>
                        <input type="text" value={(report as any)[`${block.id}Video`]} onChange={(e) => handleChange(`${block.id}Video` as any, e.target.value)} className="w-full bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text)] focus:outline-none" placeholder={t('matchReport.videoLinkPlaceholder')} />
                        {(report as any)[`${block.id}Video`] && !isBlockedEmbed((report as any)[`${block.id}Video`]) && (
                          <div className="mt-2 aspect-video rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)]">
                            <iframe title={`${block.id}-video-plan`} src={getEmbedUrl((report as any)[`${block.id}Video`])} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                          </div>
                        )}
                        {(report as any)[`${block.id}Video`] && (
                          <a className="text-[10px] font-black text-[var(--accent)] underline inline-block mt-2" href={(report as any)[`${block.id}Video`]} target="_blank" rel="noreferrer">
                            {t('matchReport.video.openVideoNewTab')}
                          </a>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">{t('matchReport.document')}</label>
                        <input type="text" value={(report as any)[`${block.id}Doc`]} onChange={(e) => handleChange(`${block.id}Doc` as any, e.target.value)} className="w-full bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text)] focus:outline-none" placeholder={t('matchReport.pdfLinkPlaceholder')} />
                        {(report as any)[`${block.id}Doc`] && (
                          <div className="mt-2 aspect-[4/3] rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)]">
                            <iframe title={`${block.id}-doc-plan`} src={getDocEmbedUrl((report as any)[`${block.id}Doc`])} className="w-full h-full"></iframe>
                          </div>
                        )}
                        {(report as any)[`${block.id}Doc`] && (
                          <a className="text-[10px] font-black text-[var(--accent)] underline inline-block mt-2" href={(report as any)[`${block.id}Doc`]} target="_blank" rel="noreferrer">
                            {t('matchReport.video.openPdfNewTab')}
                          </a>
                        )}
                    </div>
                    {renderBlockImages(`${block.id}Images` as any)}
                </div>
            )}

            <textarea
              value={(report as any)[`${block.id}Text`]}
              onChange={(e) => {
                handleChange(`${block.id}Text` as any, e.target.value);
                autoResizeTextarea(e.currentTarget);
              }}
              onInput={(e) => autoResizeTextarea(e.currentTarget)}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-3xl px-5 py-5 text-xs text-[var(--text)] focus:outline-none resize-y leading-relaxed min-h-[200px]"
              placeholder={t('matchReport.analysisPlaceholder', { section: block.label.toLowerCase() })}
            ></textarea>
            </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAbpCard = (section: AbpSection, item: AbpItem, label: string) => (
    <div key={item.id} className="bg-[var(--surface-0)] rounded-3xl border border-[var(--border-soft)] shadow-xl p-6 space-y-4 relative group">
      <div className="flex items-center justify-between">
        <div className="text-center flex-1 text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">{label}</div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setExpandedAbpCard({ section, id: item.id, label })}
            className="w-8 h-8 rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all opacity-0 group-hover:opacity-100"
            title="Expandir"
          >
            <i className="fa-solid fa-expand text-xs"></i>
          </button>
          <button
            onClick={() => removeAbpItem(section, item.id)}
            className="w-8 h-8 rounded-lg bg-[var(--surface-1)] hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-[var(--text-muted)] transition-all opacity-0 group-hover:opacity-100"
            title={t('common.delete')}
          >
            <i className="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleAbpImageUpload(section, item.id, e.target.files?.[0])}
        className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-3 text-xs text-[var(--text)] focus:outline-none"
      />
      {item.image && (
        <div className="aspect-video rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
          <img loading="lazy" decoding="async"
            src={item.image}
            alt={label}
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={() => setAbpPreviewImage(item.image || null)}
          />
        </div>
      )}
      {renderAbpVideoControls(section, item.id, item.video)}
      <textarea
        value={item.text || ''}
        onChange={(e) => updateAbpItemField(section, item.id, 'text', e.target.value)}
        className="w-full min-h-30 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-4 text-xs text-[var(--text)] focus:outline-none resize-y"
        placeholder={t('matchReport.abp.playDetail')}
      />
    </div>
  );

  const renderAddAbpCard = (section: AbpSection) => (
    <button
      type="button"
      onClick={() => addAbpItem(section)}
      className="min-h-[220px] rounded-3xl border-2 border-dashed border-[var(--border-soft)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
    >
      <i className="fa-solid fa-plus text-lg"></i>
      <span className="text-[9px] font-black uppercase tracking-widest">{t('matchReport.abp.addPlay')}</span>
    </button>
  );

  const abpLabel = (base: string, idx: number, total: number) => (total > 1 ? `${base} ${idx + 1}` : base);

  const renderABP = () => (
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto pb-32">
      <div className="flex items-center justify-center">
        <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-full">ABP</div>
      </div>

      {/* ── OFENSIVO ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-md">{t('matchReport.abp.offensive')}</div>
        </div>
        {/* Corners */}
        <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.corners')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getAbpList('abpOffCorners').map((item, idx, arr) => renderAbpCard('abpOffCorners', item, abpLabel(t('matchReport.abp.corner'), idx, arr.length)))}
          {renderAddAbpCard('abpOffCorners')}
        </div>
        {/* Faltas Laterales */}
        <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.lateralFouls')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getAbpList('abpOffLateralFouls').map((item, idx, arr) => renderAbpCard('abpOffLateralFouls', item, abpLabel(t('matchReport.abp.lateralFoul'), idx, arr.length)))}
          {renderAddAbpCard('abpOffLateralFouls')}
        </div>
      </div>

      {/* ── DEFENSIVO ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-md">{t('matchReport.abp.defensive')}</div>
        </div>
        <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.corners')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getAbpList('abpDefCorners').map((item, idx, arr) => renderAbpCard('abpDefCorners', item, abpLabel(t('matchReport.abp.corner'), idx, arr.length)))}
          {renderAddAbpCard('abpDefCorners')}
        </div>
        <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.lateralFouls')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getAbpList('abpDefLateralFouls').map((item, idx, arr) => renderAbpCard('abpDefLateralFouls', item, abpLabel(t('matchReport.abp.lateralFoul'), idx, arr.length)))}
          {renderAddAbpCard('abpDefLateralFouls')}
        </div>
        <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.frontalFouls')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getAbpList('abpDefFrontalFouls').map((item, idx, arr) => renderAbpCard('abpDefFrontalFouls', item, abpLabel(t('matchReport.abp.frontalFoul'), idx, arr.length)))}
          {renderAddAbpCard('abpDefFrontalFouls')}
        </div>
      </div>
    </div>
  );

  const renderArbitro = () => (
    <div className="animate-fade-in space-y-8 max-w-5xl mx-auto pb-32">
      <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-8">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
          <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2"><i className="fa-solid fa-gavel text-red-500"></i> {t('matchReport.refereeSection.title')}</div>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.refereeSection.name')}</label>
            <input
              type="text"
              value={report.refereeName || ''}
              onChange={e => handleChange('refereeName', e.target.value)}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]"
              placeholder={t('matchReport.refereeSection.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.refereeSection.description')}</label>
            <textarea
              value={report.refereeDescription || ''}
              onChange={e => handleChange('refereeDescription', e.target.value)}
              className="w-full min-h-[180px] bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none resize-none text-[var(--text)]"
              placeholder={t('matchReport.refereeSection.descriptionPlaceholder')}
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={handleSave} className="bg-sport-primary hover:bg-sport-primary-dark text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"><i className="fa-solid fa-floppy-disk"></i> {t('common.save')}</button>
        </div>
      </div>
    </div>
  );

  const renderInforme = () => (
    <div className="animate-fade-in space-y-8 max-w-5xl mx-auto pb-32">
      <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-8">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
              <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2"><i className="fa-solid fa-sliders text-red-500"></i> {t('matchReport.finalReports')}</div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest">PRO ENGINE v3.0</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.playerUrl')}</label>
                <input type="text" value={report.rivalVideoUrl} onChange={(e) => handleChange('rivalVideoUrl', e.target.value)} className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]" placeholder="https://..." />
                {report.rivalVideoUrl && !isBlockedEmbed(report.rivalVideoUrl) && (
                  <div className="mt-4 aspect-video rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
                    <iframe title="reproductor" src={getEmbedUrl(report.rivalVideoUrl, sharedStartSec ?? undefined)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  </div>
                )}
                {report.rivalVideoUrl && (
                  <a className="text-[11px] font-black text-[var(--accent)] underline inline-block mt-2" href={report.rivalVideoUrl} target="_blank" rel="noreferrer">
                    {t('matchReport.video.openVideoNewTab')}
                  </a>
                )}
             </div>
             <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.tacticalDoc')}</label>
                <input type="text" value={report.rivalDocUrl} onChange={(e) => handleChange('rivalDocUrl', e.target.value)} className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]" placeholder="https://..." />
                {report.rivalDocUrl && (
                  <div className="mt-4 aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
                    <iframe title="documento" src={getDocEmbedUrl(report.rivalDocUrl)} className="w-full h-full"></iframe>
                  </div>
                )}
                {report.rivalDocUrl && (
                  <a className="text-[11px] font-black text-[var(--accent)] underline inline-block mt-2" href={report.rivalDocUrl} target="_blank" rel="noreferrer">
                    {t('matchReport.video.openPdfNewTab')}
                  </a>
                )}
             </div>
          </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[{ id: 'rivalConBalon', label: t('matchReport.attack'), icon: 'fa-futbol', color: 'text-red-500' }, { id: 'rivalSinBalon', label: t('matchReport.defense'), icon: 'fa-shield-halved', color: 'text-red-500' }, { id: 'rivalAbp', label: t('matchReport.transitions'), icon: 'fa-bolt', color: 'text-emerald-500' }].map((block) => (
          <div key={block.id} className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-xl space-y-5 flex flex-col relative group hover:border-[var(--surface-3)] transition-all">
            <div className="flex justify-between items-center">
                <div className={`text-[11px] font-black ${block.color} uppercase tracking-[0.2em] flex items-center gap-2`}><i className={`fa-solid ${block.icon}`}></i> {block.label}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleMediaBlock(block.id)} className="w-8 h-8 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all"><i className={`fa-solid ${isMediaBlockOpen(block.id) ? 'fa-xmark' : 'fa-paperclip'} text-xs`}></i></button>
                  <button
                    onClick={() => toggleRivalBlockCollapsed(block.id)}
                    title={collapsedRivalBlocks.has(block.id) ? t('matchReport.showSection') : t('matchReport.hideSection')}
                    className="w-8 h-8 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all"
                  >
                    <i className={`fa-solid ${collapsedRivalBlocks.has(block.id) ? 'fa-chevron-down' : 'fa-chevron-up'} text-xs`}></i>
                  </button>
                </div>
            </div>
            {collapsedRivalBlocks.has(block.id) ? null : (
            <>
            {isMediaBlockOpen(block.id) && (
                <div className="bg-[var(--surface-1)] p-4 rounded-2xl space-y-3 animate-fade-in border border-[var(--border-soft)]">
                    <div>
                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">{t('matchReport.specificVideo')}</label>
                        <input type="text" value={(report as any)[`${block.id}Video`]} onChange={(e) => handleChange(`${block.id}Video` as any, e.target.value)} className="w-full bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text)] focus:outline-none" placeholder={t('matchReport.videoLinkPlaceholder')} />
                        {(report as any)[`${block.id}Video`] && !isBlockedEmbed((report as any)[`${block.id}Video`]) && (
                          <div className="mt-2 aspect-video rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)]">
                            <iframe title={`${block.id}-video`} src={getEmbedUrl((report as any)[`${block.id}Video`])} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                          </div>
                        )}
                        {(report as any)[`${block.id}Video`] && (
                          <a className="text-[10px] font-black text-[var(--accent)] underline inline-block mt-2" href={(report as any)[`${block.id}Video`]} target="_blank" rel="noreferrer">
                            {t('matchReport.video.openVideoNewTab')}
                          </a>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">{t('matchReport.document')}</label>
                        <input type="text" value={(report as any)[`${block.id}Doc`]} onChange={(e) => handleChange(`${block.id}Doc` as any, e.target.value)} className="w-full bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text)] focus:outline-none" placeholder={t('matchReport.pdfLinkPlaceholder')} />
                        {(report as any)[`${block.id}Doc`] && (
                          <div className="mt-2 aspect-[4/3] rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)]">
                            <iframe title={`${block.id}-doc`} src={getDocEmbedUrl((report as any)[`${block.id}Doc`])} className="w-full h-full"></iframe>
                          </div>
                        )}
                        {(report as any)[`${block.id}Doc`] && (
                          <a className="text-[10px] font-black text-[var(--accent)] underline inline-block mt-2" href={(report as any)[`${block.id}Doc`]} target="_blank" rel="noreferrer">
                            {t('matchReport.video.openPdfNewTab')}
                          </a>
                        )}
                    </div>
                    {renderBlockImages(`${block.id}Images` as any)}
                </div>
            )}
            <textarea
              value={(report as any)[`${block.id}Text`]}
              onChange={(e) => {
                handleChange(`${block.id}Text` as any, e.target.value);
                autoResizeTextarea(e.currentTarget);
              }}
              onInput={(e) => autoResizeTextarea(e.currentTarget)}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-3xl px-5 py-5 text-xs text-[var(--text)] focus:outline-none resize-y leading-relaxed min-h-[200px]"
              placeholder={t('matchReport.analysisPlaceholder', { section: block.label.toLowerCase() })}
            ></textarea>
            </>
            )}
          </div>
        ))}
      </div>

      {/* BLOQUE ABP */}
      <div className="space-y-10 mt-12">
        <div className="flex items-center justify-center">
          <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-full">{t('matchReport.abp.title')}</div>
        </div>

        {/* OFENSIVO */}
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-md">{t('matchReport.abp.offensive')}</div>
          </div>
          <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.corners')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getAbpList('rivalAbpOffCorners').map((item, idx, arr) => renderAbpCard('rivalAbpOffCorners', item, abpLabel(t('matchReport.abp.corner'), idx, arr.length)))}
            {renderAddAbpCard('rivalAbpOffCorners')}
          </div>
          <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.lateralFouls')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getAbpList('rivalAbpOffLateralFouls').map((item, idx, arr) => renderAbpCard('rivalAbpOffLateralFouls', item, abpLabel(t('matchReport.abp.lateralFoul'), idx, arr.length)))}
            {renderAddAbpCard('rivalAbpOffLateralFouls')}
          </div>
        </div>

        {/* DEFENSIVO */}
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-md">{t('matchReport.abp.defensive')}</div>
          </div>
          <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.corners')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getAbpList('rivalAbpDefCorners').map((item, idx, arr) => renderAbpCard('rivalAbpDefCorners', item, abpLabel(t('matchReport.abp.corner'), idx, arr.length)))}
            {renderAddAbpCard('rivalAbpDefCorners')}
          </div>
          <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.lateralFouls')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getAbpList('rivalAbpDefLateralFouls').map((item, idx, arr) => renderAbpCard('rivalAbpDefLateralFouls', item, abpLabel(t('matchReport.abp.lateralFoul'), idx, arr.length)))}
            {renderAddAbpCard('rivalAbpDefLateralFouls')}
          </div>
          <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.frontalFouls')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getAbpList('rivalAbpDefFrontalFouls').map((item, idx, arr) => renderAbpCard('rivalAbpDefFrontalFouls', item, abpLabel(t('matchReport.abp.frontalFoul'), idx, arr.length)))}
            {renderAddAbpCard('rivalAbpDefFrontalFouls')}
          </div>
        </div>
      </div>

      {selectedRivalTeamId && (
        <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-6">
          <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2">
            <i className="fa-solid fa-users text-red-500"></i> {t('sidebar.rivalTeamsLabel')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {rivalRoster.map(player => (
              <div key={player.id} className="flex items-center gap-3 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl p-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)] flex items-center justify-center text-[var(--text-muted)] font-black text-xs shrink-0">
                  {player.foto_url ? (
                    <img loading="lazy" decoding="async" src={player.foto_url} className="w-full h-full object-cover object-top" />
                  ) : (
                    <span>{player.dorsal ?? '—'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-[var(--text-strong)] truncate">{player.nombre}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{player.posicion || '—'}</p>
                </div>
              </div>
            ))}
            {rivalRoster.length === 0 && (
              <p className="col-span-full text-xs text-[var(--text-muted)]">Este equipo todavía no tiene jugadores dados de alta en Plantillas.</p>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50"><button onClick={handleSave} className="bg-sport-primary hover:bg-sport-primary-dark text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all"><i className="fa-solid fa-floppy-disk"></i> {t('matchReport.saveReport')}</button></div>
    </div>
  );

  const renderAbpImagePreview = () => (
    abpPreviewImage ? (
      <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-6">
        <button
          onClick={() => setAbpPreviewImage(null)}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <img loading="lazy" decoding="async"
          src={abpPreviewImage}
          alt="ABP Preview"
          className="max-h-[90dvh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          onClick={() => setAbpPreviewImage(null)}
        />
      </div>
    ) : null
  );

  const renderPitchDiagramPreview = () => (
    pitchDiagramPreview ? (
      <div
        className="fixed inset-0 z-[300] bg-black/80 flex flex-col items-center justify-center p-6 gap-4"
        onClick={() => setPitchDiagramPreview(null)}
      >
        <button
          onClick={() => setPitchDiagramPreview(null)}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <p className="text-white text-sm font-black uppercase tracking-widest text-center">{pitchDiagramPreview.label}</p>
        <div onClick={e => e.stopPropagation()}>
          {renderPitchDiagram(pitchDiagramPreview.positions, pitchDiagramPreview.highlightIds, 2.4, true)}
        </div>
      </div>
    ) : null
  );

  const renderExpandedAbpCard = () => {
    if (!expandedAbpCard) return null;
    const { label, section, id } = expandedAbpCard;
    const item = getAbpList(section).find(it => it.id === id);
    if (!item) return null;

    return (
      <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[var(--surface-0)] rounded-3xl border border-[var(--border-soft)] shadow-2xl w-full max-w-4xl max-h-[90dvh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-soft)] bg-[var(--surface-1)] shrink-0">
            <h2 className="text-lg font-black uppercase tracking-widest text-[var(--text-strong)]">{label}</h2>
            <button
              onClick={() => setExpandedAbpCard(null)}
              className="w-10 h-10 rounded-lg bg-[var(--surface-0)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Image Section */}
            <div className="space-y-3">
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('matchReport.image')}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleAbpImageUpload(section, id, e.target.files?.[0])}
                className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-3 text-xs text-[var(--text)] focus:outline-none cursor-pointer"
              />
              {item.image && (
                <div className="aspect-video rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
                  <img loading="lazy" decoding="async"
                    src={item.image}
                    alt={label}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setAbpPreviewImage(item.image || null)}
                  />
                </div>
              )}
            </div>

            {/* Video Section */}
            <div className="space-y-3">
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('matchReport.video.matchUrl')}</label>
              {renderAbpVideoControls(section, id, item.video)}
            </div>

            {/* Text Section */}
            <div className="space-y-3">
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('matchReport.abp.playDetail')}</label>
              <textarea
                value={item.text || ''}
                onChange={(e) => updateAbpItemField(section, id, 'text', e.target.value, true)}
                className="w-full min-h-[300px] bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-4 text-sm text-[var(--text)] focus:outline-none resize-y leading-relaxed"
                placeholder={t('matchReport.abp.playDetail')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-[var(--border-soft)] bg-[var(--surface-1)] flex justify-end gap-3 shrink-0">
            <button
              onClick={() => setExpandedAbpCard(null)}
              className="px-6 py-3 rounded-xl bg-[var(--surface-0)] hover:bg-[var(--surface-2)] text-[var(--text)] font-black text-[10px] uppercase tracking-widest transition-all"
            >
              {t('common.close')}
            </button>
            <button
              onClick={() => {
                handleSave();
                setExpandedAbpCard(null);
              }}
              className="px-6 py-3 rounded-xl bg-sport-primary hover:bg-sport-primary-dark text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk"></i> {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPostPartido = () => (
    <div className="animate-fade-in max-w-5xl mx-auto pb-32">
      <ActaPartidoView />
    </div>
  );

  const exportResumenToPDF = async () => {
    const node = resumenExportRef.current;
    if (!node) return;
    setIsExportingResumenPdf(true);
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const imgWidth = A4_WIDTH_MM;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [A4_WIDTH_MM, A4_HEIGHT_MM] });
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= A4_HEIGHT_MM;

      while (heightLeft > 0) {
        position -= A4_HEIGHT_MM;
        pdf.addPage([A4_WIDTH_MM, A4_HEIGHT_MM]);
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= A4_HEIGHT_MM;
      }

      const fileName = `Resumen_${(dgForm.localTeam || 'local').replace(/\s+/g, '_')}_vs_${(dgForm.visitorTeam || 'visitante').replace(/\s+/g, '_')}.pdf`;

      const pdfOutput = pdf.output('blob') as Blob | Promise<Blob>;
      const pdfBlob = pdfOutput instanceof Promise ? await pdfOutput : pdfOutput;
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('Error exporting resumen to PDF:', error);
      alert('Error al generar el PDF del resumen');
    } finally {
      setIsExportingResumenPdf(false);
    }
  };

  const renderResumenSection = () => {
    const positions = report.lineupPositions && report.lineupPositions.length > 0
      ? report.lineupPositions
      : getInitialPositions(report.formation || '4-3-3');

    const goals = report.matchGoals || [];
    const favorGoals = goals.filter(g => g.side === 'FAVOR').length;
    const contraGoals = goals.filter(g => g.side === 'CONTRA').length;
    // El lado FAVOR/CONTRA de los goles siempre se refiere a nuestro equipo; hay que
    // mapearlo a local/visitante según qué lado corresponda a nuestro clubId.
    const visitorIsOwn = !!ownClubId && String(dgForm.visitorTeamClubId || '') === String(ownClubId);
    const localScore = visitorIsOwn ? contraGoals : favorGoals;
    const visitorScore = visitorIsOwn ? favorGoals : contraGoals;
    const liveScore = goals.length > 0 ? `${localScore} : ${visitorScore}` : '';

    const startingIds = new Set(startingXIEntries.map(({ player }) => String(player.id)));
    const benchList = convocadoPlayers
      .filter(p => !startingIds.has(String(p.id)))
      .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));

    return (
      <div className="animate-fade-in space-y-8 max-w-6xl mx-auto pb-32">
      <div ref={resumenExportRef} className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-8">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
          <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2">
            <i className="fa-solid fa-chart-simple text-red-500"></i> {t('matchReport.generalData.summary')}
          </div>
          <button
            onClick={exportResumenToPDF}
            disabled={isExportingResumenPdf}
            className="px-4 py-2 rounded-xl bg-sport-primary hover:bg-sport-primary-dark disabled:opacity-60 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
          >
            {isExportingResumenPdf ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
            {isExportingResumenPdf ? t('common.loading') : 'INFORME PDF'}
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-6 py-2">
          <div className="flex-1 text-right">
            {localClubLabel && <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide truncate">{localClubLabel}</p>}
            <p className="text-sm font-black text-[var(--text-strong)] uppercase truncate">{dgForm.localTeam || t('newEvent.homeTeam')}</p>
          </div>
          <div className="px-6 py-3 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-soft)] text-2xl font-black text-[var(--text-strong)] tracking-widest shrink-0">
            {liveScore || dgForm.score || '- : -'}
          </div>
          <div className="flex-1 text-left">
            {visitorClubLabel && <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide truncate">{visitorClubLabel}</p>}
            <p className="text-sm font-black text-[var(--text-strong)] uppercase truncate">{dgForm.visitorTeam || t('newEvent.awayTeam')}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start gap-8">
          <div className="w-full lg:flex-1 lg:max-w-xs order-2 lg:order-1">
            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-list-ol"></i> {t('matchReport.generalData.startingXI')}
            </h4>
            {startingXIEntries.length === 0 ? (
              <p className="text-xs font-bold text-[var(--text-muted)]">{t('matchReport.generalData.noPlayersYet')}</p>
            ) : (
              <div className="rounded-2xl border border-[var(--border-soft)] divide-y divide-[var(--border-soft)]">
                {[...startingXIEntries]
                  .sort((a, b) => (a.player.dorsal ?? 999) - (b.player.dorsal ?? 999))
                  .map(({ player }) => {
                    const key = String(player.id);
                    const minutes = playerMinutesMap.get(key) ?? 0;
                    const goals = goalsByPlayer.get(key) ?? 0;
                    const cards = cardsByPlayer.get(key);
                    const subOutMinute = subOutMinuteByPlayer.get(key);
                    const subPartner = subPartnerByOutPlayer.get(key);
                    return (
                      <div key={player.id} className="flex items-center gap-2 px-3 py-2 text-xs flex-wrap">
                        <span className="w-6 h-6 rounded-full bg-sport-primary text-white flex items-center justify-center text-[9px] font-black shrink-0">{player.dorsal ?? '-'}</span>
                        <span className="flex-1 truncate font-bold text-[var(--text-strong)]">{player.apodo || player.nombre}</span>
                        {subOutMinute !== undefined && subPartner && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-bold shrink-0 text-[8px] max-w-16 truncate" title={t('matchReport.matchEvents.playerInLabel')}>
                            <i className="fa-solid fa-arrow-right-to-bracket text-[7px]"></i>{subPartner.apodo || subPartner.nombre}
                          </span>
                        )}
                        {goals > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-black shrink-0 text-[10px]" title={t('matchReport.matchEvents.goals')}>
                            <i className="fa-solid fa-futbol"></i>{goals > 1 ? `x${goals}` : ''}
                          </span>
                        )}
                        {cards?.amarillas && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg font-black shrink-0 text-[10px]" title={`${cards.amarillas} ${t('matchReport.matchEvents.yellowCard')}`}>
                            <i className="fa-solid fa-square"></i>{cards.amarillas > 1 ? `x${cards.amarillas}` : ''}
                          </span>
                        )}
                        {cards?.rojas && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg font-black shrink-0 text-[10px]" title={`${cards.rojas} ${t('matchReport.matchEvents.redCard')}`}>
                            <i className="fa-solid fa-square"></i>{cards.rojas > 1 ? `x${cards.rojas}` : ''}
                          </span>
                        )}
                        {subOutMinute !== undefined && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg font-black shrink-0 text-[10px]" title={`${t('matchReport.matchEvents.substitutions')} ${subOutMinute}'`}>
                            <i className="fa-solid fa-arrow-right-from-bracket"></i>{subOutMinute}'
                          </span>
                        )}
                        <span className="text-[var(--text-muted)] font-bold w-8 text-right shrink-0">{minutes}'</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="w-full lg:w-auto lg:flex-1 order-1 lg:order-2 flex justify-center">
            <div className="w-full max-w-lg">
              <h4 className="text-base font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2 justify-center">
                <i className="fa-solid fa-border-all"></i> {t('matchReport.generalData.initialSystem')} · {report.formation || '4-3-3'}
              </h4>
              <div
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => setPitchDiagramPreview({ label: `${t('matchReport.generalData.initialSystem')} · ${report.formation || '4-3-3'}`, positions })}
              >
                {renderPitchDiagram(positions, undefined, 1.6, true)}
              </div>
            </div>
          </div>

          <div className="w-full lg:flex-1 lg:max-w-xs order-3">
            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-people-group"></i> {t('matchReport.generalData.calledUp')}
            </h4>
            {benchList.length === 0 ? (
              <p className="text-xs font-bold text-[var(--text-muted)]">{t('matchReport.generalData.noBenchYet')}</p>
            ) : (
              <div className="rounded-2xl border border-[var(--border-soft)] divide-y divide-[var(--border-soft)]">
                {benchList.map(player => {
                  const key = String(player.id);
                  const minutes = playerMinutesMap.get(key);
                  const played = minutes !== undefined;
                  const goals = goalsByPlayer.get(key) ?? 0;
                  const cards = cardsByPlayer.get(key);
                  const subInMinute = subInMinuteByPlayer.get(key);
                  const subPartner = subPartnerByInPlayer.get(key);
                  return (
                    <div key={player.id} className={`flex items-center gap-2 px-3 py-2 text-xs flex-wrap ${played ? '' : 'opacity-50'}`}>
                      <span className="w-6 h-6 rounded-full bg-[var(--surface-2)] text-[var(--text-strong)] flex items-center justify-center text-[9px] font-black shrink-0">{player.dorsal ?? '-'}</span>
                      <span className="flex-1 truncate font-bold text-[var(--text-strong)]">{player.apodo || player.nombre}</span>
                      {subInMinute !== undefined && subPartner && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-md font-bold shrink-0 text-[8px] max-w-16 truncate" title={t('matchReport.matchEvents.playerOutLabel')}>
                          <i className="fa-solid fa-arrow-right-from-bracket text-[7px]"></i>{subPartner.apodo || subPartner.nombre}
                        </span>
                      )}
                      {goals > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-black shrink-0 text-[10px]" title={t('matchReport.matchEvents.goals')}>
                          <i className="fa-solid fa-futbol"></i>{goals > 1 ? `x${goals}` : ''}
                        </span>
                      )}
                      {cards?.amarillas && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg font-black shrink-0 text-[10px]" title={`${cards.amarillas} ${t('matchReport.matchEvents.yellowCard')}`}>
                          <i className="fa-solid fa-square"></i>{cards.amarillas > 1 ? `x${cards.amarillas}` : ''}
                        </span>
                      )}
                      {cards?.rojas && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg font-black shrink-0 text-[10px]" title={`${cards.rojas} ${t('matchReport.matchEvents.redCard')}`}>
                          <i className="fa-solid fa-square"></i>{cards.rojas > 1 ? `x${cards.rojas}` : ''}
                        </span>
                      )}
                      {subInMinute !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-black shrink-0 text-[10px]" title={`${t('matchReport.matchEvents.substitutions')} ${subInMinute}'`}>
                          <i className="fa-solid fa-arrow-right-to-bracket"></i>{subInMinute}'
                        </span>
                      )}
                      <span className="text-[var(--text-muted)] font-bold w-8 text-right shrink-0">{played ? `${minutes}'` : '-'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {windowSnapshots.length > 0 && (
          <div className="border-t border-[var(--border-soft)] pt-6">
            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2 justify-center">
              <i className="fa-solid fa-images"></i> {t('matchReport.matchEvents.systemAfterSubstitutions')}
            </h4>
            <div className="flex flex-wrap justify-center gap-8">
              {windowSnapshots.map(win => (
                <div
                  key={win.id}
                  className="w-56 shrink-0 cursor-pointer transition-transform hover:scale-[1.02]"
                  onClick={() => setPitchDiagramPreview({ label: `${win.minute}' · ${t('matchReport.matchEvents.systemAfterSubstitutions')}`, positions: win.positions, highlightIds: win.incomingIds })}
                >
                  {renderWindowSummary(win)}
                  {renderPitchDiagram(win.positions, win.incomingIds)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    );
  };

  const renderDatosPartidos = () => {
    const startingIds = new Set(startingXIEntries.map(({ player }) => String(player.id)));
    const notConvocadoIds = new Set((report.notConvocadoIds || []).map(String));

    const allRows = squad
      .slice()
      .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999))
      .map(player => {
        const key = String(player.id);
        return {
          player,
          isStarter: startingIds.has(key),
          isNotConvocado: notConvocadoIds.has(key),
          minutes: playerMinutesMap.get(key) ?? 0,
          goals: goalsByPlayer.get(key) ?? 0,
          cards: cardsByPlayer.get(key)
        };
      });

    const starters = allRows.filter(r => r.isStarter);
    const substitutes = allRows.filter(r => !r.isStarter && !r.isNotConvocado);
    const notConvocados = allRows.filter(r => r.isNotConvocado);

    const systemRows = Array.from(systemMinutesStats.collective.entries())
      .map(([formation, minutes]) => ({
        formation,
        minutes,
        players: Array.from(systemMinutesStats.individual.get(formation)?.entries() ?? [])
          .map(([playerId, playerMinutes]) => ({ player: squad.find(p => String(p.id) === playerId), minutes: playerMinutes }))
          .filter((r): r is { player: Player; minutes: number } => !!r.player)
          .sort((a, b) => b.minutes - a.minutes)
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const renderTable = (rows: typeof allRows, title: string, className: string) => (
      <div className="space-y-3">
        <h3 className={`text-sm font-black uppercase tracking-wider px-3 py-2 rounded-lg ${className}`}>
          {title} ({rows.length})
        </h3>
        {rows.length === 0 ? (
          <p className="text-xs font-bold text-[var(--text-muted)] px-3">{t('matchReport.playerStats.noPlayers')}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--surface-1)] text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">
                  <th className="px-3 py-3 text-left">#</th>
                  <th className="px-3 py-3 text-left">{t('matchReport.playerStats.player')}</th>
                  <th className="px-3 py-3 text-center">{t('matchReport.playerStats.minutesPlayed')}</th>
                  <th className="px-3 py-3 text-center">{t('matchReport.playerStats.goals')}</th>
                  <th className="px-3 py-3 text-center">{t('matchReport.playerStats.yellowCards')}</th>
                  <th className="px-3 py-3 text-center">{t('matchReport.playerStats.redCards')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {rows.map(({ player, minutes, goals, cards }) => (
                  <tr key={player.id} className="text-[var(--text-strong)]">
                    <td className="px-3 py-2 font-black">{player.dorsal ?? '-'}</td>
                    <td className="px-3 py-2 font-bold truncate max-w-40">{player.apodo || player.nombre}</td>
                    <td className="px-3 py-2 text-center font-bold">{minutes}'</td>
                    <td className="px-3 py-2 text-center font-bold">{goals}</td>
                    <td className="px-3 py-2 text-center font-bold">{cards?.amarillas ?? 0}</td>
                    <td className="px-3 py-2 text-center font-bold">{cards?.rojas ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );

    return (
      <div className="animate-fade-in space-y-8 max-w-6xl mx-auto pb-32">
        <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
            <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2">
              <i className="fa-solid fa-table text-red-500"></i> {t('matchReport.playerStats.title')}
            </div>
          </div>

          {allRows.length === 0 ? (
            <p className="text-xs font-bold text-[var(--text-muted)]">{t('matchReport.playerStats.noPlayers')}</p>
          ) : (
            <div className="space-y-8">
              {renderTable(starters, 'Titulares', 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400')}
              {renderTable(substitutes, 'Suplentes', 'bg-amber-500/20 text-amber-600 dark:text-amber-400')}
              {renderTable(notConvocados, 'No Convocados', 'bg-slate-500/20 text-slate-600 dark:text-slate-400')}
            </div>
          )}
        </div>

        {systemRows.length > 0 && (
          <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
              <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2">
                <i className="fa-solid fa-diagram-project text-red-500"></i> {t('matchReport.playerStats.systemMinutesTitle')}
              </div>
            </div>
            <div className="space-y-8">
              {systemRows.map(({ formation, minutes, players }) => (
                <div key={formation} className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
                    {formation} — {minutes}' {t('matchReport.playerStats.totalMinutes')}
                  </h3>
                  <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--surface-1)] text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">
                          <th className="px-3 py-3 text-left">#</th>
                          <th className="px-3 py-3 text-left">{t('matchReport.playerStats.player')}</th>
                          <th className="px-3 py-3 text-center">{t('matchReport.playerStats.minutesPlayed')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-soft)]">
                        {players.map(({ player, minutes: playerMinutes }) => (
                          <tr key={player.id} className="text-[var(--text-strong)]">
                            <td className="px-3 py-2 font-black">{player.dorsal ?? '-'}</td>
                            <td className="px-3 py-2 font-bold truncate max-w-40">{player.apodo || player.nombre}</td>
                            <td className="px-3 py-2 text-center font-bold">{playerMinutes}'</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
            <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2">
              <i className="fa-solid fa-users text-blue-500"></i> Minutos por Equipo y Sistema
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                {match.localTeam}
              </h3>
              {systemRows.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--surface-1)] text-[var(--text-muted)] uppercase text-[9px] font-black tracking-widest">
                        <th className="px-3 py-3 text-left">#</th>
                        <th className="px-3 py-3 text-left">{t('matchReport.playerStats.player')}</th>
                        {systemRows.map(({ formation }) => (
                          <th key={formation} className="px-3 py-3 text-center">{formation}</th>
                        ))}
                        <th className="px-3 py-3 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                      {convocadoPlayers.map(player => {
                        const key = String(player.id);
                        return (
                          <tr key={player.id} className="text-[var(--text-strong)]">
                            <td className="px-3 py-2 font-black">{player.dorsal ?? '-'}</td>
                            <td className="px-3 py-2 font-bold truncate max-w-40">{player.apodo || player.nombre}</td>
                            {systemRows.map(({ formation }) => {
                              const playerSystemMinutes = systemMinutesStats.individual.get(formation)?.get(key) ?? 0;
                              return (
                                <td key={formation} className="px-3 py-2 text-center font-bold">
                                  {playerSystemMinutes > 0 ? `${playerSystemMinutes}'` : '-'}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center font-bold">{playerMinutesMap.get(key) ?? 0}'</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs font-bold text-[var(--text-muted)] px-3">No hay sistemas registrados</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGraficas = () => {
    const startingIds = new Set(startingXIEntries.map(({ player }) => String(player.id)));
    const squadById = new Map(squad.map(p => [String(p.id), {
      id: p.id,
      nombre: p.nombre,
      apodo: p.apodo,
      dorsal: p.dorsal,
      posicion: p.posicion
    } as Jugador]));

    const rows = convocadoPlayers.map(player => {
      const key = String(player.id);
      return {
        playerId: key,
        matchesPlayed: (playerMinutesMap.get(key) ?? 0) > 0 ? 1 : 0,
        starterCount: startingIds.has(key) ? 1 : 0,
        minutes: playerMinutesMap.get(key) ?? 0,
        goals: goalsByPlayer.get(key) ?? 0,
        yellowCards: cardsByPlayer.get(key)?.amarillas ?? 0,
        redCards: cardsByPlayer.get(key)?.rojas ?? 0
      };
    });

    return (
      <div className="animate-fade-in space-y-8 max-w-6xl mx-auto pb-32">
        <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
            <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-red-500"></i> {t('matchReport.tabs.charts')}
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-xs font-bold text-[var(--text-muted)]">{t('matchReport.playerStats.noPlayers')}</p>
          ) : (
            <>
              <PlayerStatsCharts rows={rows} squadById={squadById} />
              <div className="pt-6 border-t border-[var(--border-soft)]">
                <SystemMinutesCharts stats={systemMinutesStats} squadById={squadById} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDatosGenerales = () => (
    <div className="animate-fade-in space-y-8 max-w-3xl mx-auto pb-32">
      <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-8">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
          <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-red-500"></i> {t('matchReport.generalData.matchInfo')}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">
              <i className="fa-solid fa-calendar-day mr-2"></i>{t('common.date')}
            </label>
            <input
              type="date"
              value={dgForm.date}
              onChange={(e) => setDgForm({ ...dgForm, date: e.target.value })}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">
              <i className="fa-solid fa-clock mr-2"></i>{t('common.time')}
            </label>
            <input
              type="time"
              value={dgForm.time}
              onChange={(e) => setDgForm({ ...dgForm, time: e.target.value })}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">
            <i className="fa-solid fa-trophy mr-2"></i>{t('newEvent.competition')}
          </label>
          <select
            value={dgForm.competition}
            onChange={(e) => setDgForm({ ...dgForm, competition: e.target.value })}
            className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">{t('newEvent.competition')}</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
            <option value="Amistoso">{t('newEvent.friendly')}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">
              <i className="fa-solid fa-location-dot mr-2"></i>{t('common.location')}
            </label>
            <input
              value={dgForm.location}
              onChange={(e) => setDgForm({ ...dgForm, location: e.target.value })}
              placeholder={t('common.location')}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">
              <i className="fa-solid fa-hashtag mr-2"></i>{t('newEvent.matchday')}
            </label>
            <select
              value={dgForm.jornada}
              onChange={(e) => setDgForm({ ...dgForm, jornada: e.target.value })}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">{t('newEvent.matchday')}</option>
              <option value="-">-</option>
              {Array.from({ length: 38 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">
            <i className="fa-solid fa-tag mr-2"></i>Nombre Interno
          </label>
          <select
            value={dgForm.nombreInterno}
            onChange={(e) => setDgForm({ ...dgForm, nombreInterno: e.target.value })}
            className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-strong)] focus:outline-none focus:border-[var(--accent)] appearance-none cursor-pointer"
          >
            <option value="">Selecciona nombre interno</option>
            <option value="Clásico">Clásico</option>
            <option value="Derbi">Derbi</option>
            <option value="Amistoso">Amistoso</option>
            <option value="Copa">Copa</option>
            <option value="Supercopa">Supercopa</option>
            <option value="Playoff">Playoff</option>
            <option value="Preparación">Preparación</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">
            <i className="fa-solid fa-people-group mr-2"></i>{t('newEvent.teams')}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[9px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">
                <i className="fa-solid fa-shield mr-1"></i>Local
              </label>
              <EquipoSelect
                value={dgForm.localTeam}
                selectedClubId={dgForm.localTeamClubId}
                onChange={(team, clubId) => setDgForm({ ...dgForm, localTeam: team, localTeamClubId: clubId || '' })}
                extraTeams={teamOptions}
                placeholder={t('newEvent.homeTeam')}
                className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-strong)] appearance-none cursor-pointer focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">
                <i className="fa-solid fa-shield mr-1"></i>Visitante
              </label>
              <EquipoSelect
                value={dgForm.visitorTeam}
                selectedClubId={dgForm.visitorTeamClubId}
                onChange={(team, clubId) => setDgForm({ ...dgForm, visitorTeam: team, visitorTeamClubId: clubId || '' })}
                extraTeams={teamOptions}
                placeholder={t('newEvent.awayTeam')}
                className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-strong)] appearance-none cursor-pointer focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--border-soft)]">
          {onDelete ? (
            <button
              onClick={handleDeleteMatch}
              className="px-6 py-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <i className="fa-solid fa-trash-can"></i> {t('matchReport.generalData.deleteMatch')}
            </button>
          ) : <div />}
          <button
            onClick={handleSaveDatosGenerales}
            className="bg-sport-primary hover:bg-sport-primary-dark text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
          >
            <i className={`fa-solid ${dgSaved ? 'fa-check' : 'fa-floppy-disk'}`}></i> {dgSaved ? t('matchReport.generalData.savedMessage') : t('matchReport.generalData.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );

  // Match report tabs - CAMBIOS TÁCTICOS removed (consolidated into ALINEACIÓN and PLAN DE PARTIDO)
  const tabs = [
    { id: 'DATOS GENERALES', label: t('matchReport.tabs.generalData'), icon: 'fa-circle-info' },
    { id: 'INFORME RIVAL', label: t('matchReport.tabs.opponentReport'), icon: 'fa-shield-heart' },
    { id: 'ÁRBITRO', label: t('matchReport.tabs.referee'), icon: 'fa-gavel' },
    { id: 'ALINEACIÓN', label: t('matchReport.tabs.lineup'), icon: 'fa-border-all' },
    { id: 'PLAN DE PARTIDO', label: t('matchReport.tabs.matchPlan'), icon: 'fa-clipboard-list' },
    { id: 'ABP', label: t('matchReport.tabs.abp'), icon: 'fa-flag' },
    { id: 'EVENTOS PARTIDO', label: t('matchReport.tabs.matchEvents'), icon: 'fa-list-check' },
    { id: 'RESUMEN', label: t('matchReport.tabs.summary'), icon: 'fa-chart-simple' },
    { id: 'GRÁFICAS', label: t('matchReport.tabs.charts'), icon: 'fa-chart-line' },
    { id: 'DATOS PARTIDO', label: t('matchReport.tabs.playerStats'), icon: 'fa-table' },
    { id: 'EVENTOS', label: t('matchReport.tabs.events'), icon: 'fa-video' }
  ];

  const handleChange = (field: keyof MatchReport, value: any) => { setReport(prev => ({ ...prev, [field]: value })); };

  return (
    <div className="min-h-screen flex flex-col animate-fade-in bg-[var(--bg)]">
      {renderAbpImagePreview()}
      {renderPitchDiagramPreview()}
      {renderExpandedAbpCard()}
      {renderFullscreenAbpVideo()}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-0)] shadow-sm sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all text-[var(--text)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"><i className="fa-solid fa-chevron-left text-xs"></i></button>
          <div>
            <h1 className="text-xs lg:text-sm font-black uppercase truncate tracking-tight text-[var(--text-strong)]">
              {localClubLabel && <span className="text-[var(--text-muted)] font-bold mr-1">{localClubLabel}</span>}
              {match.localTeam} <span className="text-[var(--text-muted)] mx-1">vs</span> {match.visitorTeam}
              {visitorClubLabel && <span className="text-[var(--text-muted)] font-bold ml-1">{visitorClubLabel}</span>}
            </h1>
            <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{match.jornada || t('matchReport.tacticalAnalysis')}</p>
          </div>
        </div>
      </div>
      <div className="flex overflow-x-auto px-4 gap-2 scrollbar-hide border-b border-[var(--border-soft)] bg-[var(--surface-0)] sticky top-[72px] z-50">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-5 flex items-center gap-3 transition-all border-b-[4px] whitespace-nowrap ${activeTab === tab.id ? 'border-[var(--accent)] text-[var(--text-strong)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}><i className={`fa-solid ${tab.icon} text-[10px]`}></i><span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span></button>
        ))}
      </div>
      <div className={`flex-1 ${activeTab === 'EVENTOS' || activeTab === 'ALINEACIÓN' ? '' : 'p-4 lg:p-12'}`}>{activeTab === 'DATOS GENERALES' ? renderDatosGenerales() : activeTab === 'ALINEACIÓN' ? renderAlineacionTactiva() : activeTab === 'PLAN DE PARTIDO' ? renderPlanPartido() : activeTab === 'ABP' ? renderABP() : activeTab === 'INFORME RIVAL' ? renderInforme() : activeTab === 'ÁRBITRO' ? renderArbitro() : activeTab === 'EVENTOS PARTIDO' ? renderEventosPartido() : activeTab === 'RESUMEN' ? renderResumenSection() : activeTab === 'GRÁFICAS' ? renderGraficas() : activeTab === 'DATOS PARTIDO' ? renderDatosPartidos() : activeTab === 'EVENTOS' ? renderEventos() : null}</div>

      {selectedPlayerForModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in" onClick={() => setSelectedPlayerForModal(null)}>
          <div className="bg-white dark:bg-[var(--surface-0)] rounded-t-3xl w-full max-h-[90dvh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-white dark:bg-[var(--surface-0)]">
              <h2 className="text-lg font-black uppercase tracking-widest text-[var(--text-strong)]">Ficha del Jugador</h2>
              <button
                onClick={() => setSelectedPlayerForModal(null)}
                className="w-8 h-8 rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-2)] flex items-center justify-center transition-all text-[var(--text-muted)]"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Encabezado con foto */}
              <div className="flex gap-6 items-start">
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-[var(--surface-1)] flex items-center justify-center shrink-0">
                  {selectedPlayerForModal.fotoUrl && selectedPlayerForModal.fotoUrl.length > 1 ? (
                    <img loading="lazy" decoding="async" src={selectedPlayerForModal.fotoUrl} alt={selectedPlayerForModal.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-[var(--text-muted)]">{selectedPlayerForModal.nombre.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-2xl font-black">{selectedPlayerForModal.dorsal}</span>
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">{selectedPlayerForModal.posicion}</span>
                  </div>
                  <h3 className="text-xl font-black text-[var(--text-strong)] mb-1">{selectedPlayerForModal.apodo || selectedPlayerForModal.nombre}</h3>
                  <p className="text-sm text-[var(--text-muted)] font-bold">{selectedPlayerForModal.nombre}</p>
                </div>
              </div>

              {/* Información personal */}
              <div className="grid grid-cols-2 gap-4">
                {selectedPlayerForModal.posicionJuego && (
                  <div className="bg-[var(--surface-1)] rounded-xl p-3">
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase mb-1">Posición de Juego</p>
                    <p className="text-sm font-bold text-[var(--text-strong)]">{selectedPlayerForModal.posicionJuego}</p>
                  </div>
                )}
                {selectedPlayerForModal.perfil && (
                  <div className="bg-[var(--surface-1)] rounded-xl p-3">
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase mb-1">Perfil</p>
                    <p className="text-sm font-bold text-[var(--text-strong)]">{selectedPlayerForModal.perfil === 'D' ? 'Diestro' : selectedPlayerForModal.perfil === 'I' ? 'Zurdo' : 'Ambidiestro'}</p>
                  </div>
                )}
                {selectedPlayerForModal.estado && (
                  <div className="bg-[var(--surface-1)] rounded-xl p-3">
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase mb-1">Estado</p>
                    <p className={`text-sm font-bold ${selectedPlayerForModal.estado === 'APTO' ? 'text-green-600' : 'text-red-600'}`}>{selectedPlayerForModal.estado}</p>
                  </div>
                )}
                {selectedPlayerForModal.equipo && (
                  <div className="bg-[var(--surface-1)] rounded-xl p-3">
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase mb-1">Equipo</p>
                    <p className="text-sm font-bold text-[var(--text-strong)]">{selectedPlayerForModal.equipo}</p>
                  </div>
                )}
              </div>

              {/* Ratings */}
              {(selectedPlayerForModal.ratingTecnica || selectedPlayerForModal.ratingTactica || selectedPlayerForModal.ratingCondicional || selectedPlayerForModal.ratingPsicologico || selectedPlayerForModal.ratingHumano) && (
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-strong)] mb-3">Valoraciones</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedPlayerForModal.ratingTecnica && (
                      <div className="bg-[var(--surface-1)] rounded-xl p-3">
                        <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mb-1">Técnica</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[var(--text-strong)]">{selectedPlayerForModal.ratingTecnica}</span>
                          <div className="flex-1 bg-[var(--surface-0)] rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${(selectedPlayerForModal.ratingTecnica / 10) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedPlayerForModal.ratingTactica && (
                      <div className="bg-[var(--surface-1)] rounded-xl p-3">
                        <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mb-1">Táctica</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[var(--text-strong)]">{selectedPlayerForModal.ratingTactica}</span>
                          <div className="flex-1 bg-[var(--surface-0)] rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${(selectedPlayerForModal.ratingTactica / 10) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedPlayerForModal.ratingCondicional && (
                      <div className="bg-[var(--surface-1)] rounded-xl p-3">
                        <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mb-1">Condicional</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[var(--text-strong)]">{selectedPlayerForModal.ratingCondicional}</span>
                          <div className="flex-1 bg-[var(--surface-0)] rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-yellow-500" style={{ width: `${(selectedPlayerForModal.ratingCondicional / 10) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedPlayerForModal.ratingPsicologico && (
                      <div className="bg-[var(--surface-1)] rounded-xl p-3">
                        <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mb-1">Psicológico</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[var(--text-strong)]">{selectedPlayerForModal.ratingPsicologico}</span>
                          <div className="flex-1 bg-[var(--surface-0)] rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${(selectedPlayerForModal.ratingPsicologico / 10) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedPlayerForModal.ratingHumano && (
                      <div className="bg-[var(--surface-1)] rounded-xl p-3">
                        <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mb-1">Humano</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[var(--text-strong)]">{selectedPlayerForModal.ratingHumano}</span>
                          <div className="flex-1 bg-[var(--surface-0)] rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${(selectedPlayerForModal.ratingHumano / 10) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {selectedPlayerForModal.observaciones && (
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-strong)] mb-2">Observaciones</h4>
                  <div className="bg-[var(--surface-1)] rounded-xl p-4 text-sm text-[var(--text)]">
                    {selectedPlayerForModal.observaciones}
                  </div>
                </div>
              )}

              {/* Otros datos */}
              {(selectedPlayerForModal.correo || selectedPlayerForModal.telefono || selectedPlayerForModal.fechaNacimiento) && (
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-strong)] mb-3">Contacto</h4>
                  <div className="space-y-2">
                    {selectedPlayerForModal.fechaNacimiento && (
                      <div className="flex items-center gap-3 text-sm">
                        <i className="fa-solid fa-calendar text-[var(--accent)] w-4"></i>
                        <span className="text-[var(--text)]">{new Date(selectedPlayerForModal.fechaNacimiento).toLocaleDateString('es-ES')}</span>
                      </div>
                    )}
                    {selectedPlayerForModal.telefono && (
                      <div className="flex items-center gap-3 text-sm">
                        <i className="fa-solid fa-phone text-[var(--accent)] w-4"></i>
                        <span className="text-[var(--text)]">{selectedPlayerForModal.telefono}</span>
                      </div>
                    )}
                    {selectedPlayerForModal.correo && (
                      <div className="flex items-center gap-3 text-sm">
                        <i className="fa-solid fa-envelope text-[var(--accent)] w-4"></i>
                        <span className="text-[var(--text)]">{selectedPlayerForModal.correo}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para formaciones ampliadas */}
      {expandedFormation && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--surface-0)] rounded-3xl border border-[var(--border-soft)] shadow-2xl w-full max-w-5xl max-h-[90dvh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-soft)] bg-[var(--surface-1)] shrink-0">
              <h2 className="text-lg font-black uppercase tracking-widest text-[var(--text-strong)]">
                {expandedFormation.type === 'initial'
                  ? `${t('matchReport.generalData.startingXI')} · ${report.formation || '4-3-3'}`
                  : windowSnapshots.find(w => w.id === expandedFormation.id)?.minute
                  ? `${windowSnapshots.find(w => w.id === expandedFormation.id)?.minute}' - ${t('matchReport.matchEvents.systemAfterSubstitutions')}`
                  : 'Formación'}
              </h2>
              <button
                onClick={() => setExpandedFormation(null)}
                className="w-10 h-10 rounded-lg bg-[var(--surface-0)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center gap-6">
              {expandedFormation.type === 'initial' ? (
                <>
                  <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '600px' }}>
                    <div className="w-full max-w-3xl h-full">
                      {renderPitchDiagram(
                        report.lineupPositions && report.lineupPositions.length > 0
                          ? report.lineupPositions
                          : getInitialPositions(report.formation || '4-3-3')
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {windowSnapshots.find(w => w.id === expandedFormation.id) && (
                    <>
                      <div className="w-full">
                        {renderWindowSummary(windowSnapshots.find(w => w.id === expandedFormation.id)!)}
                      </div>
                      <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '600px' }}>
                        <div className="w-full max-w-3xl h-full">
                          {renderPitchDiagram(
                            windowSnapshots.find(w => w.id === expandedFormation.id)!.positions,
                            windowSnapshots.find(w => w.id === expandedFormation.id)!.incomingIds
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-[var(--border-soft)] bg-[var(--surface-1)] flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setExpandedFormation(null)}
                className="px-6 py-3 rounded-xl bg-[var(--surface-0)] hover:bg-[var(--surface-2)] text-[var(--text)] font-black text-[10px] uppercase tracking-widest transition-all"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchReportView;


