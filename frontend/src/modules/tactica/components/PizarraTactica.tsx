import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { plantillasService, equiposService, clubesService, pizarrasService } from '@shared/services/dataService';
import type { Club, Equipo, PizarraTactica as PizarraTacticaRow } from '@shared/services/dataService';
import type { TacticalArrow } from '../types';
import { useUndoRedo } from '@context/UndoRedoContext';
import SearchableSelect from '@shared/components/SearchableSelect';
import { compareEquipoNames } from '@shared/components/EquipoSelect';
import SoccerBallIcon from '@shared/components/SoccerBallIcon';
import html2canvas from 'html2canvas-pro';
import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from '@shared/utils/ffmpegClient';

const FORMATIONS: Record<string, { x: number; y: number }[]> = {
  '1-3-4-3': [
    { x: 50, y: 92 },
    { x: 75, y: 80 }, { x: 50, y: 80 }, { x: 25, y: 80 },
    { x: 82, y: 68 }, { x: 62, y: 66 }, { x: 38, y: 66 }, { x: 18, y: 68 },
    { x: 78, y: 48 }, { x: 50, y: 45 }, { x: 22, y: 48 },
  ],
  '1-4-4-2': [
    { x: 50, y: 92 },
    { x: 82, y: 80 }, { x: 18, y: 80 }, { x: 38, y: 82 }, { x: 62, y: 82 },
    { x: 50, y: 66 }, { x: 82, y: 68 }, { x: 30, y: 68 }, { x: 18, y: 68 },
    { x: 38, y: 52 }, { x: 62, y: 52 },
  ],
  '1-4-3-3': [
    { x: 50, y: 92 },
    { x: 82, y: 80 }, { x: 18, y: 80 }, { x: 38, y: 82 }, { x: 62, y: 82 },
    { x: 50, y: 66 }, { x: 82, y: 68 }, { x: 30, y: 68 },
    { x: 38, y: 48 }, { x: 62, y: 48 }, { x: 18, y: 68 },
  ],
  '1-4-2-3-1': [
    { x: 50, y: 92 },
    { x: 82, y: 80 }, { x: 18, y: 80 }, { x: 38, y: 82 }, { x: 62, y: 82 },
    { x: 38, y: 73 }, { x: 62, y: 73 },
    { x: 82, y: 60 }, { x: 50, y: 58 }, { x: 20, y: 60 },
    { x: 50, y: 42 },
  ],
  '1-5-3-2': [
    { x: 50, y: 92 },
    { x: 88, y: 80 }, { x: 12, y: 80 }, { x: 30, y: 84 }, { x: 70, y: 84 }, { x: 50, y: 86 },
    { x: 50, y: 66 }, { x: 72, y: 66 }, { x: 28, y: 66 },
    { x: 38, y: 48 }, { x: 62, y: 48 },
  ],
};

const MY_TEAM_COLOR = '#d32f2f';
const RIVAL_TEAM_COLOR = '#1976d2';
const MY_KEEPER_COLOR = '#e91e63';
const RIVAL_KEEPER_COLOR = '#fdd835';
const PANEL_COLORS = ['#d32f2f', '#1976d2', '#ffffff'];
const FRAME_DURATION_MS = 1200;
const PITCH_ASPECT = 105 / 68;
const FIELD_LINE_EDGE_PERCENT = 2.6;
const PITCH_PLAYER_3D_LIFT_PX = 2;
const FIELD_BACKGROUND = {
  backgroundColor: '#2d7a34',
  backgroundImage: [
    'radial-gradient(circle at 50% 48%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 42%, rgba(0, 0, 0, 0.10) 100%)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 0 56px, rgba(0, 0, 0, 0.08) 56px 112px)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0 2px, transparent 2px 128px)',
  ].join(', '),
  backgroundBlendMode: 'soft-light, multiply, normal',
} as const;

interface PitchPlayer {
  id: string;
  number: number;
  team: 'my' | 'rival';
  x: number;
  y: number;
  color: string;
  playerId?: string;
  playerName?: string;
  playerInitials?: string;
  playerDorsal?: number;
  playerFotoUrl?: string;
  rotation?: number;
}

interface Ball {
  x: number;
  y: number;
}

interface SquadPlayer {
  id: string;
  nombre: string;
  apodo?: string;
  dorsal?: number;
  posicion?: string;
  fotoUrl?: string;
}

interface RivalPlayer {
  id: string;
  nombre: string;
  dorsal?: number;
}

type AssignableEntity = { id: string; nombre: string; apodo?: string; dorsal?: number; fotoUrl?: string };

type TeamKey = 'my' | 'rival';

const mapSquadPlayer = (row: {
  id: string;
  nombre: string;
  apodo?: string;
  dorsal?: number;
  posicion?: string;
  foto_url?: string;
}): SquadPlayer => ({
  id: row.id,
  nombre: row.nombre,
  apodo: row.apodo,
  dorsal: row.dorsal,
  posicion: row.posicion,
  fotoUrl: row.foto_url,
});

const sortPlayers = <T extends { nombre: string; dorsal?: number }>(players: T[]) => (
  [...players].sort((a, b) => {
    if (a.dorsal != null && b.dorsal != null && a.dorsal !== b.dorsal) return a.dorsal - b.dorsal;
    if (a.dorsal != null && b.dorsal == null) return -1;
    if (a.dorsal == null && b.dorsal != null) return 1;
    return a.nombre.localeCompare(b.nombre, 'es');
  })
);

interface PizarraTacticaProps {
  /** Id del club propio (currentTeam.id) — cualquier otro equipo/club se trata como rival. */
  ownClubId?: string;
}

const PizarraTactica: React.FC<PizarraTacticaProps> = ({ ownClubId }) => {
  const { pushState, setOnStateRestore } = useUndoRedo();
  const pitchStageRef = useRef<HTMLElement>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const [pitchStageSize, setPitchStageSize] = useState({ width: 0, height: 0 });
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [myTeams, setMyTeams] = useState<(Equipo & { clubNombre?: string })[]>([]);
  const [selectedMyTeamId, setSelectedMyTeamId] = useState('');
  const [isMySquadLoading, setIsMySquadLoading] = useState(false);
  const [rivalPlayers, setRivalPlayers] = useState<RivalPlayer[]>([]);
  const [rivalTeams, setRivalTeams] = useState<(Equipo & { clubNombre?: string })[]>([]);
  const [rivalClubs, setRivalClubs] = useState<Club[]>([]);
  const [selectedRivalClubId, setSelectedRivalClubId] = useState('');
  const [selectedRivalTeamId, setSelectedRivalTeamId] = useState('');
  const [rivalNameInput, setRivalNameInput] = useState('');
  const [rivalDorsalInput, setRivalDorsalInput] = useState('');
  const [assignTab, setAssignTab] = useState<TeamKey>('my');
  const [selectedPitchIds, setSelectedPitchIds] = useState<string[]>([]);
  const [selectedSquadPlayerId, setSelectedSquadPlayerId] = useState<string | null>(null);
  const [selectedRivalPlayerId, setSelectedRivalPlayerId] = useState<string | null>(null);
  const [mobileTeamPanelOpen, setMobileTeamPanelOpen] = useState(false);
  const [mobileAssignPanelOpen, setMobileAssignPanelOpen] = useState(false);
  const [myFormation, setMyFormation] = useState('1-4-4-2');
  const [rivalFormation, setRivalFormation] = useState('1-4-4-2');
  const [showMyTeam, setShowMyTeam] = useState(true);
  const [showRivalTeam, setShowRivalTeam] = useState(true);
  const [showPlayerNumbers, setShowPlayerNumbers] = useState(true);
  const [playerScale, setPlayerScale] = useState(1);
  const [frames, setFrames] = useState<PitchPlayer[][]>([[]]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [is3DView, setIs3DView] = useState(false);
  const [ballFrames, setBallFrames] = useState<Ball[]>([{ x: 50, y: 75 }]);
  const [draggingBall, setDraggingBall] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const frameDurationMs = FRAME_DURATION_MS / playbackSpeed;
  const [myTeamColor, setMyTeamColor] = useState(MY_TEAM_COLOR);
  const [rivalTeamColor, setRivalTeamColor] = useState(RIVAL_TEAM_COLOR);
  const [arrows, setArrows] = useState<TacticalArrow[]>([]);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [arrowColor, setArrowColor] = useState('#ffffff');
  const [drawingMode, setDrawingMode] = useState(false);
  const [draggingArrowId, setDraggingArrowId] = useState<string | null>(null);
  const draggingArrowStart = useRef<{ x: number; y: number } | null>(null);
  const arrowStartPosition = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [dragOutsideField, setDragOutsideField] = useState(false);
  const [showPlayerPhotos, setShowPlayerPhotos] = useState(false);
  const DROP_OUTSIDE_MARGIN_PX = 30;

  const [savedBoards, setSavedBoards] = useState<PizarraTacticaRow[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);

  // Configurar callback para restaurar estado de pizarra táctica
  useEffect(() => {
    setOnStateRestore((state: any) => {
      if (state.frames) setFrames(state.frames);
      if (state.arrows) setArrows(state.arrows);
      if (Array.isArray(state.ballFrames) && state.ballFrames.length) {
        setBallFrames(state.ballFrames);
      } else if (state.ball) {
        setBallFrames((state.frames ?? [[]]).map(() => state.ball));
      }
    });
  }, [setOnStateRestore]);

  // Wrapper para registrar cambios en arrows
  const updateArrows = (updater: TacticalArrow[] | ((prev: TacticalArrow[]) => TacticalArrow[])) => {
    setArrows(prev => {
      const next = typeof updater === 'function' ? (updater as (prev: TacticalArrow[]) => TacticalArrow[])(prev) : updater;

      // Registrar cambio en el historial
      pushState({
        squadList: squad,
        usersList: [],
        personalList: [],
        competitionTeams: [],
        clubesList: [],
        campogramasList: [],
        eventsList: [],
        frames,
        arrows: next,
        ballFrames,
      });

      return next;
    });
  };

  // Wrapper para registrar cambios en la posición del balón del fotograma actual
  const updateBall = (newBall: Ball) => {
    setBallFrames(prev => {
      const next = [...prev];
      next[currentFrameIndex] = newBall;

      // Registrar cambio en el historial
      pushState({
        squadList: squad,
        usersList: [],
        personalList: [],
        competitionTeams: [],
        clubesList: [],
        campogramasList: [],
        eventsList: [],
        frames,
        arrows,
        ballFrames: next,
      });

      return next;
    });
  };

  useEffect(() => {
    if (!selectedArrowId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      updateArrows(prev => prev.filter(arrow => arrow.id !== selectedArrowId));
      setSelectedArrowId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedArrowId]);

  const pitchPlayers = frames[currentFrameIndex] ?? [];
  const ball = ballFrames[currentFrameIndex] ?? { x: 50, y: 75 };
  const updatePitchPlayers = (updater: PitchPlayer[] | ((prev: PitchPlayer[]) => PitchPlayer[])) => {
    setFrames(prev => {
      const next = [...prev];
      const current = next[currentFrameIndex] ?? [];
      next[currentFrameIndex] = typeof updater === 'function' ? (updater as (prev: PitchPlayer[]) => PitchPlayer[])(current) : updater;

      // Registrar cambio en el historial
      pushState({
        squadList: squad,
        usersList: [],
        personalList: [],
        competitionTeams: [],
        clubesList: [],
        campogramasList: [],
        eventsList: [],
        frames: next,
        arrows,
        ballFrames,
      });

      return next;
    });
  };

  const draggingId = useRef<string | null>(null);
  const draggingIds = useRef<string[]>([]);
  const draggingStart = useRef({ x: 0, y: 0 });
  const draggingStartPercent = useRef({ x: 0, y: 0 });
  const draggingOrigin = useRef<{ x: number; y: number } | null>(null);
  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>({});
  const selectionRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const selectionBoxRef = useRef<null | { left: number; top: number; right: number; bottom: number }>(null);
  const suppressNextPitchClickRef = useRef(false);
  const dragged = useRef(false);
  const rafId = useRef<number>(0);
  const ballDraggingStart = useRef<{ x: number; y: number } | null>(null);
  const ballStartPosition = useRef<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<null | { left: number; top: number; right: number; bottom: number }>(null);

  useEffect(() => {
    (async () => {
      try {
        const equiposRows = await equiposService.list();

        const myTeamsFiltered = ownClubId
          ? equiposRows.filter(e => String(e.club_id) === String(ownClubId))
          : [];

        const sortedMyTeams = myTeamsFiltered.sort((a, b) => compareEquipoNames(a.sub_equipo || a.nombre, b.sub_equipo || b.nombre));
        setMyTeams(sortedMyTeams);

        setSelectedMyTeamId(prev => {
          if (prev && sortedMyTeams.some(team => String(team.id) === prev)) return prev;
          return sortedMyTeams.length > 0 ? String(sortedMyTeams[0].id) : '';
        });
      } catch (err) {
        console.error('No se pudieron cargar mis equipos', err);
        setMyTeams([]);
        setSelectedMyTeamId('');
      }
    })();
  }, [ownClubId]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedMyTeamId) {
      setSquad([]);
      setSelectedSquadPlayerId(null);
      return;
    }

    setIsMySquadLoading(true);
    setSquad([]);
    setSelectedSquadPlayerId(null);
    plantillasService.list({ equipo_id: selectedMyTeamId })
      .then(rows => {
        if (cancelled) return;
        setSquad(sortPlayers(rows.map(mapSquadPlayer)));
      })
      .catch(err => {
        if (cancelled) return;
        console.error('No se pudo cargar la plantilla de mi equipo', err);
        setSquad([]);
      })
      .finally(() => {
        if (!cancelled) setIsMySquadLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedMyTeamId]);

  useEffect(() => {
    (async () => {
      try {
        const [equiposRows, clubesRows] = await Promise.all([equiposService.list(), clubesService.list()]);
        const clubesById = new Map(clubesRows.map(c => [String(c.id), c.nombre]));
        const rivals = equiposRows
          .filter(e => !ownClubId || String(e.club_id) !== String(ownClubId))
          .map(e => ({ ...e, clubNombre: clubesById.get(String(e.club_id)) }))
          .sort((a, b) => (a.clubNombre || a.nombre).localeCompare(b.clubNombre || b.nombre, 'es'));
        setRivalTeams(rivals);

        const clubIdsConEquipos = new Set(rivals.map(r => String(r.club_id)));
        const clubs = clubesRows
          .filter(c => clubIdsConEquipos.has(String(c.id)))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        setRivalClubs(clubs);
      } catch (err) {
        console.error('No se pudieron cargar los equipos rivales', err);
      }
    })();
  }, [ownClubId]);

  const rivalTeamsForSelectedClub = useMemo(
    () => rivalTeams.filter(t => String(t.club_id) === selectedRivalClubId),
    [rivalTeams, selectedRivalClubId]
  );

  const handleSelectRivalClub = useCallback((clubId: string) => {
    setSelectedRivalClubId(clubId);
    setSelectedRivalTeamId('');
    setRivalPlayers([]);
  }, []);

  const handleSelectRivalTeam = useCallback(async (equipoId: string) => {
    setSelectedRivalTeamId(equipoId);
    if (!equipoId) return;
    try {
      const rows = await plantillasService.list({ equipo_id: equipoId });
      setRivalPlayers(sortPlayers(rows.map(row => ({ id: row.id, nombre: row.nombre, dorsal: row.dorsal }))));
    } catch (err) {
      console.error('No se pudo cargar la plantilla rival', err);
    }
  }, []);

  const buildTeamPlayers = useCallback((formation: string, team: TeamKey): PitchPlayer[] => {
    const coords = FORMATIONS[formation] || FORMATIONS['1-4-4-2'];
    const baseColor = team === 'my' ? myTeamColor : rivalTeamColor;
    const keeperColor = team === 'my' ? MY_KEEPER_COLOR : RIVAL_KEEPER_COLOR;

    return coords.map((pos, index) => ({
      id: `${team}-${index}`,
      number: index + 1,
      team,
      x: pos.x,
      y: team === 'rival' ? 100 - pos.y : pos.y,
      color: index === 0 ? keeperColor : baseColor,
    }));
  }, [myTeamColor, rivalTeamColor]);

  useEffect(() => {
    const myTeam = buildTeamPlayers(myFormation, 'my');
    const rivalTeam = buildTeamPlayers(rivalFormation, 'rival');
    setFrames([[...myTeam, ...rivalTeam]]);
    setBallFrames([{ x: 50, y: 75 }]);
    setCurrentFrameIndex(0);
  }, [myFormation, rivalFormation, buildTeamPlayers]);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => {
        if (prev >= frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, frameDurationMs);
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, frameDurationMs]);

  useEffect(() => {
    const node = pitchStageRef.current;
    if (!node) return;

    const updateStageSize = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      setPitchStageSize(prev => (
        prev.width === width && prev.height === height ? prev : { width, height }
      ));
    };

    updateStageSize();
    const observer = new ResizeObserver(updateStageSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pitchFrameSize = useMemo(() => {
    if (!pitchStageSize.width || !pitchStageSize.height) return null;

    const horizontalPadding = is3DView ? 34 : 18;
    const verticalPadding = is3DView ? 28 : 18;
    const availableWidth = Math.max(260, pitchStageSize.width - horizontalPadding);
    const availableHeight = Math.max(220, pitchStageSize.height - verticalPadding);

    if (is3DView) {
      const projectedHeightFactor = 0.74;
      const widthForHeight = (availableHeight / projectedHeightFactor) * PITCH_ASPECT;
      const width = Math.min(availableWidth, widthForHeight);
      return {
        width: `${Math.round(width)}px`,
        height: `${Math.round(width / PITCH_ASPECT)}px`,
      };
    }

    const width = Math.min(availableWidth, availableHeight * PITCH_ASPECT);
    return {
      width: `${Math.round(width)}px`,
      height: `${Math.round(width / PITCH_ASPECT)}px`,
    };
  }, [is3DView, pitchStageSize.height, pitchStageSize.width]);

  const rectIntersects = useCallback(
    (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) =>
      !(b.left > a.right || b.right < a.left || b.top > a.bottom || b.bottom < a.top),
    []
  );

  const distanceFromPointToLine = useCallback((px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getArrowAtPoint = useCallback((x: number, y: number): TacticalArrow | null => {
    for (const arrow of arrows) {
      const distance = distanceFromPointToLine(x, y, arrow.x1, arrow.y1, arrow.x2, arrow.y2);
      if (distance < 3) return arrow;
    }
    return null;
  }, [arrows, distanceFromPointToLine]);

  const getPitchPercentPoint = useCallback((clientX: number, clientY: number) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const clampPitchPlayerPosition = useCallback((player: PitchPlayer, x: number, y: number) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    const displaySize = (player.number === 1 ? 36 : 32) * playerScale;
    const fallbackMargin = player.number === 1 ? 3.2 : 2.9;
    const horizontalMargin = rect?.width ? (displaySize / 2 / rect.width) * 100 : fallbackMargin;
    const verticalMargin = rect?.height ? (displaySize / 2 / rect.height) * 100 : fallbackMargin;
    const minX = FIELD_LINE_EDGE_PERCENT + horizontalMargin;
    const maxX = 100 - FIELD_LINE_EDGE_PERCENT - horizontalMargin;
    const minY = FIELD_LINE_EDGE_PERCENT + verticalMargin;
    const maxY = 100 - FIELD_LINE_EDGE_PERCENT - verticalMargin;

    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  }, [playerScale]);

  const getPlayerBounds = useCallback((player: PitchPlayer) => {
    const halfSize = player.number === 1 ? 3.8 : 3.4;
    return {
      left: player.x - halfSize,
      right: player.x + halfSize,
      top: player.y - halfSize,
      bottom: player.y + halfSize,
    };
  }, []);

  const clearPitchSelection = useCallback(() => {
    setSelectedPitchIds([]);
    setSelectedSquadPlayerId(null);
    setSelectedRivalPlayerId(null);
  }, []);

  const selectPitchIds = useCallback((ids: string[]) => {
    setSelectedPitchIds(Array.from(new Set(ids)));
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent, id: string) => {
    if (isPlaying) return;

    if (drawingMode && !is3DView) {
      const start = getPitchPercentPoint(event.clientX, event.clientY);
      if (!start) return;
      event.stopPropagation();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      clearPitchSelection();
      setSelectedArrowId(null);
      setDrawStart(start);
      setIsDrawingArrow(true);
      document.body.style.cursor = 'crosshair';
      document.body.style.userSelect = 'none';
      return;
    }

    const player = pitchPlayers.find(p => p.id === id);
    if (!player || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    draggingId.current = id;
    dragged.current = false;
    draggingStart.current = { x: event.clientX, y: event.clientY };
    draggingStartPercent.current = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
    draggingOrigin.current = { x: player.x, y: player.y };
    const nextSelectedIds = selectedPitchIds.includes(id) && selectedPitchIds.length > 1 ? selectedPitchIds : [id];
    draggingIds.current = nextSelectedIds;
    dragStartPositions.current = Object.fromEntries(
      nextSelectedIds.map(playerId => {
        const currentPlayer = pitchPlayers.find(entry => entry.id === playerId);
        return [playerId, { x: currentPlayer?.x ?? player.x, y: currentPlayer?.y ?? player.y }];
      })
    );

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    setSelectedPitchIds(nextSelectedIds);
  }, [clearPitchSelection, drawingMode, getPitchPercentPoint, isPlaying, is3DView, pitchPlayers, selectedPitchIds]);

  const handlePitchPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId.current || isPlaying || is3DView) return;

    const isClickOnSvgElement = (e.target as any)?.tagName?.toLowerCase() === 'g' ||
                                 (e.target as any)?.tagName?.toLowerCase() === 'line' ||
                                 (e.target as any)?.tagName?.toLowerCase() === 'polygon';

    const start = getPitchPercentPoint(e.clientX, e.clientY);
    if (!start) return;

    const clickedArrow = getArrowAtPoint(start.x, start.y);

    if (isClickOnSvgElement) {
      return;
    }

    if (drawingMode && e.target === e.currentTarget) {
      setDrawStart(start);
      setIsDrawingArrow(true);
      document.body.style.cursor = 'crosshair';
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (e.target !== e.currentTarget) return;

    selectionRef.current = {
      active: true,
      startX: start.x,
      startY: start.y,
      moved: false,
    };
    draggingStart.current = { x: e.clientX, y: e.clientY };
    selectionBoxRef.current = {
      left: start.x,
      top: start.y,
      right: start.x,
      bottom: start.y,
    };
    setSelectionBox(selectionBoxRef.current);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'crosshair';
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [getPitchPercentPoint, isPlaying, is3DView, drawingMode, getArrowAtPoint]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (draggingBall && ballDraggingStart.current && ballStartPosition.current && pitchRef.current) {
        const rect = pitchRef.current.getBoundingClientRect();
        const currentX = ((event.clientX - rect.left) / rect.width) * 100;
        const currentY = ((event.clientY - rect.top) / rect.height) * 100;

        const dx = currentX - ballDraggingStart.current.x;
        const dy = currentY - ballDraggingStart.current.y;

        const newX = Math.min(97, Math.max(3, ballStartPosition.current.x + dx));
        const newY = Math.min(97, Math.max(3, ballStartPosition.current.y + dy));
        updateBall({ x: newX, y: newY });
        return;
      }

      if (draggingArrowId && pitchRef.current && draggingArrowStart.current && arrowStartPosition.current) {
        const rect = pitchRef.current.getBoundingClientRect();
        const currentX = ((event.clientX - rect.left) / rect.width) * 100;
        const currentY = ((event.clientY - rect.top) / rect.height) * 100;

        let dx = currentX - draggingArrowStart.current.x;
        let dy = currentY - draggingArrowStart.current.y;

        const start = arrowStartPosition.current!;
        const minX = Math.min(start.x1, start.x2);
        const maxX = Math.max(start.x1, start.x2);
        const minY = Math.min(start.y1, start.y2);
        const maxY = Math.max(start.y1, start.y2);

        dx = Math.max(3 - minX, Math.min(dx, 97 - maxX));
        dy = Math.max(3 - minY, Math.min(dy, 97 - maxY));

        updateArrows(prev => prev.map(arrow => {
          if (arrow.id !== draggingArrowId) return arrow;
          return {
            ...arrow,
            x1: start.x1 + dx,
            y1: start.y1 + dy,
            x2: start.x2 + dx,
            y2: start.y2 + dy,
          };
        }));
        return;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (isDrawingArrow && drawStart && pitchRef.current) {
        const rect = pitchRef.current.getBoundingClientRect();
        const currentX = ((event.clientX - rect.left) / rect.width) * 100;
        const currentY = ((event.clientY - rect.top) / rect.height) * 100;
        setDrawStart(prev => prev ? { ...prev, x2: currentX, y2: currentY } : null);
        return;
      }

      if (selectionRef.current?.active && pitchRef.current) {
        const rect = pitchRef.current.getBoundingClientRect();
        const currentX = ((event.clientX - rect.left) / rect.width) * 100;
        const currentY = ((event.clientY - rect.top) / rect.height) * 100;
        const dx = event.clientX - draggingStart.current.x;
        const dy = event.clientY - draggingStart.current.y;

        if (!selectionRef.current.moved && (Math.abs(dx) >= 3 || Math.abs(dy) >= 3)) {
          selectionRef.current.moved = true;
        }

        if (!selectionRef.current.moved) return;

        const nextSelectionBox = {
          left: Math.min(selectionRef.current.startX, currentX),
          top: Math.min(selectionRef.current.startY, currentY),
          right: Math.max(selectionRef.current.startX, currentX),
          bottom: Math.max(selectionRef.current.startY, currentY),
        };
        selectionBoxRef.current = nextSelectionBox;
        setSelectionBox(nextSelectionBox);
        return;
      }

      if (!pitchRef.current || !draggingId.current) return;

      if (!dragged.current) {
        const dx = event.clientX - draggingStart.current.x;
        const dy = event.clientY - draggingStart.current.y;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        dragged.current = true;
      }

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (!pitchRef.current || !draggingId.current) return;
        const rect = pitchRef.current.getBoundingClientRect();
        const currentPercent = {
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        };
        const deltaX = currentPercent.x - draggingStartPercent.current.x;
        const deltaY = currentPercent.y - draggingStartPercent.current.y;
        const idsToMove = draggingIds.current.length > 0 ? draggingIds.current : [draggingId.current];
        updatePitchPlayers(prev => prev.map(player => {
          if (!idsToMove.includes(player.id)) return player;
          const start = dragStartPositions.current[player.id];
          if (!start) return player;
          const nextPosition = clampPitchPlayerPosition(player, start.x + deltaX, start.y + deltaY);
          return {
            ...player,
            ...nextPosition,
          };
        }));

        const isOutside =
          event.clientX < rect.left - DROP_OUTSIDE_MARGIN_PX ||
          event.clientX > rect.right + DROP_OUTSIDE_MARGIN_PX ||
          event.clientY < rect.top - DROP_OUTSIDE_MARGIN_PX ||
          event.clientY > rect.bottom + DROP_OUTSIDE_MARGIN_PX;
        setDragOutsideField(prev => (prev === isOutside ? prev : isOutside));
      });
    };

    const onPointerUp = (event: MouseEvent | PointerEvent) => {
      cancelAnimationFrame(rafId.current);

      if (draggingBall) {
        setDraggingBall(false);
        ballDraggingStart.current = null;
        ballStartPosition.current = null;
        document.body.style.cursor = '';
        return;
      }

      if (isDrawingArrow && drawStart) {
        const end = drawStart as any;
        if (end.x2 !== undefined && end.y2 !== undefined) {
          const newArrow: TacticalArrow = {
            id: `arrow-${Date.now()}-${Math.random()}`,
            x1: drawStart.x,
            y1: drawStart.y,
            x2: end.x2,
            y2: end.y2,
            color: arrowColor,
            strokeWidth: 2,
          };
          updateArrows(prev => [...prev, newArrow]);
        }
        setIsDrawingArrow(false);
        setDrawStart(null);
        document.body.style.cursor = '';
        return;
      }

      if (draggingArrowId) {
        setDraggingArrowId(null);
        draggingArrowStart.current = null;
        arrowStartPosition.current = null;
        document.body.style.cursor = '';
        return;
      }

      if (selectionRef.current?.active) {
        const box = selectionBoxRef.current;
        if (selectionRef.current.moved && box) {
          const selected = pitchPlayers
            .filter(player => rectIntersects(box, getPlayerBounds(player)))
            .map(player => player.id);
          selectPitchIds(selected);
          suppressNextPitchClickRef.current = true;
        } else {
          clearPitchSelection();
        }
        selectionRef.current = null;
        selectionBoxRef.current = null;
        setSelectionBox(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        return;
      }

      if (dragged.current) {
        suppressNextPitchClickRef.current = true;

        if (draggingId.current && pitchRef.current) {
          const rect = pitchRef.current.getBoundingClientRect();
          const isOutside =
            event.clientX < rect.left - DROP_OUTSIDE_MARGIN_PX ||
            event.clientX > rect.right + DROP_OUTSIDE_MARGIN_PX ||
            event.clientY < rect.top - DROP_OUTSIDE_MARGIN_PX ||
            event.clientY > rect.bottom + DROP_OUTSIDE_MARGIN_PX;

          if (isOutside) {
            const idsToRemove = draggingIds.current.length > 0 ? draggingIds.current : [draggingId.current];
            updatePitchPlayers(prev => prev.filter(p => !idsToRemove.includes(p.id)));
            setSelectedPitchIds(prev => prev.filter(id => !idsToRemove.includes(id)));
          }
        }
      }
      draggingId.current = null;
      draggingIds.current = [];
      draggingOrigin.current = null;
      dragStartPositions.current = {};
      dragged.current = false;
      setDragOutsideField(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('mouseup', onPointerUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('mouseup', onPointerUp);
    };
  }, [clampPitchPlayerPosition, clearPitchSelection, getPlayerBounds, pitchPlayers, rectIntersects, selectPitchIds, isDrawingArrow, drawStart, arrowColor, draggingArrowId, draggingBall, ball]);

  const groupedSquad = useMemo(() => {
    const buckets: Record<string, SquadPlayer[]> = {
      PORTERO: [],
      DEFENSA: [],
      MEDIO: [],
      DELANTERO: [],
    };

    squad.forEach(player => {
      const pos = (player.posicion || '').toLowerCase();
      if (pos.includes('portero')) buckets.PORTERO.push(player);
      else if (['defensa', 'lateral', 'central'].some(k => pos.includes(k))) buckets.DEFENSA.push(player);
      else if (['medio', 'pivote', 'interior', 'media punta'].some(k => pos.includes(k))) buckets.MEDIO.push(player);
      else buckets.DELANTERO.push(player);
    });

    return Object.entries(buckets).filter(([, players]) => players.length > 0);
  }, [squad]);

  const assignedPlayerIds = useMemo(() => new Set(pitchPlayers.map(player => player.playerId).filter(Boolean) as string[]), [pitchPlayers]);

  const selectedPitchId = selectedPitchIds[0] ?? null;
  const selectedPlayer = selectedPitchId ? pitchPlayers.find(p => p.id === selectedPitchId) : null;

  const assignPlayer = (player: AssignableEntity, pitchId: string = selectedPitchId ?? '') => {
    if (!pitchId) return;
    const displayName = player.apodo || player.nombre;
    const initials = displayName.slice(0, 2).toUpperCase();

    updatePitchPlayers(prev => prev.map(p => (
      p.id === pitchId
        ? { ...p, playerId: player.id, playerName: displayName, playerInitials: initials, playerDorsal: player.dorsal, playerFotoUrl: player.fotoUrl }
        : p
    )));
    setSelectedPitchIds([]);
    setSelectedSquadPlayerId(null);
    setSelectedRivalPlayerId(null);
  };

  const removeAssignment = (pitchId: string) => {
    updatePitchPlayers(prev => prev.map(p => (
      p.id === pitchId ? { ...p, playerId: undefined, playerName: undefined, playerInitials: undefined, playerDorsal: undefined, playerFotoUrl: undefined } : p
    )));
  };

  const addRivalPlayer = () => {
    const nombre = rivalNameInput.trim();
    if (!nombre) return;
    const dorsalValue = rivalDorsalInput.trim();
    const dorsal = dorsalValue ? Number(dorsalValue) : undefined;
    setRivalPlayers(prev => [
      ...prev,
      { id: `rival-manual-${prev.length}-${nombre}-${Math.random().toString(36).slice(2, 7)}`, nombre, dorsal },
    ]);
    setRivalNameInput('');
    setRivalDorsalInput('');
  };

  const removeRivalPlayer = (id: string) => {
    setRivalPlayers(prev => prev.filter(p => p.id !== id));
    updatePitchPlayers(prev => prev.map(p => (
      p.playerId === id ? { ...p, playerId: undefined, playerName: undefined, playerInitials: undefined, playerDorsal: undefined, playerFotoUrl: undefined } : p
    )));
    if (selectedRivalPlayerId === id) setSelectedRivalPlayerId(null);
  };

  const selectedSquadPlayer = selectedSquadPlayerId ? squad.find(p => p.id === selectedSquadPlayerId) : null;
  const selectedMyTeam = selectedMyTeamId ? myTeams.find(team => String(team.id) === selectedMyTeamId) : null;

  useEffect(() => {
    if (!selectedMyTeamId) {
      setSavedBoards([]);
      return;
    }
    setIsLoadingBoards(true);
    let cancelled = false;

    (async () => {
      try {
        const rows = await pizarrasService.list({ equipo_id: selectedMyTeamId });
        if (!cancelled) {
          setSavedBoards([...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('No se pudieron cargar las pizarras guardadas', err);
          setSavedBoards([]);
        }
      } finally {
        if (!cancelled) setIsLoadingBoards(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedMyTeamId]);

  const refreshSavedBoards = useCallback(async () => {
    if (!selectedMyTeamId) {
      setSavedBoards([]);
      return;
    }
    setIsLoadingBoards(true);
    try {
      const rows = await pizarrasService.list({ equipo_id: selectedMyTeamId });
      setSavedBoards([...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    } catch (err) {
      console.error('No se pudieron cargar las pizarras guardadas', err);
      setSavedBoards([]);
    } finally {
      setIsLoadingBoards(false);
    }
  }, [selectedMyTeamId]);

  const handleNewBoard = async () => {
    const nombre = window.prompt('Nombre de la nueva pizarra:')?.trim();
    if (!nombre) return;

    if (!selectedMyTeamId) {
      alert('Selecciona primero "Mi equipo" para poder crear una pizarra.');
      return;
    }

    const newFrames = [[...buildTeamPlayers(myFormation, 'my'), ...buildTeamPlayers(rivalFormation, 'rival')]];
    const newBallFrames = [{ x: 50, y: 75 }];
    const datos = {
      frames: newFrames,
      arrows: [],
      ballFrames: newBallFrames,
      myFormation,
      rivalFormation,
      myTeamColor,
      rivalTeamColor,
      showPlayerNumbers,
      playerScale,
      showFieldLines,
      showMyTeam,
      showRivalTeam,
      selectedRivalClubId,
      selectedRivalTeamId,
      rivalPlayers,
    };

    setIsSavingBoard(true);
    try {
      const created = await pizarrasService.create({
        equipo_id: selectedMyTeamId,
        nombre,
        formacion: myFormation,
        posiciones: [],
        datos,
      });
      setSelectedBoardId(created.id);
      setArrows([]);
      setBallFrames(newBallFrames);
      setSelectedArrowId(null);
      clearPitchSelection();
      setCurrentFrameIndex(0);
      setFrames(newFrames);
      await refreshSavedBoards();
    } catch (err) {
      console.error('No se pudo crear la pizarra', err);
      alert('No se pudo crear la pizarra. Inténtalo de nuevo.');
    } finally {
      setIsSavingBoard(false);
    }
  };

  const handleSaveBoard = async () => {
    if (!selectedMyTeamId) {
      alert('Selecciona primero "Mi equipo" para poder guardar la pizarra.');
      return;
    }
    const currentBoard = selectedBoardId ? savedBoards.find(b => b.id === selectedBoardId) : null;
    const nombre = window.prompt('Nombre de la pizarra:', currentBoard?.nombre ?? '')?.trim();
    if (!nombre) return;

    const datos = {
      frames,
      arrows,
      ballFrames,
      myFormation,
      rivalFormation,
      myTeamColor,
      rivalTeamColor,
      showPlayerNumbers,
      playerScale,
      showFieldLines,
      showMyTeam,
      showRivalTeam,
      selectedRivalClubId,
      selectedRivalTeamId,
      rivalPlayers,
    };

    setIsSavingBoard(true);
    try {
      if (currentBoard && currentBoard.nombre === nombre) {
        const updated = await pizarrasService.update(currentBoard.id, { nombre, formacion: myFormation, datos });
        setSelectedBoardId(updated.id);
      } else {
        const created = await pizarrasService.create({ equipo_id: selectedMyTeamId, nombre, formacion: myFormation, posiciones: [], datos });
        setSelectedBoardId(created.id);
      }
      await refreshSavedBoards();
    } catch (err) {
      console.error('No se pudo guardar la pizarra', err);
      alert('No se pudo guardar la pizarra. Inténtalo de nuevo.');
    } finally {
      setIsSavingBoard(false);
    }
  };

  const handleLoadBoard = (boardId: string) => {
    setSelectedBoardId(boardId);
    if (!boardId) return;
    const board = savedBoards.find(b => b.id === boardId);
    if (!board) return;
    const datos = (board.datos ?? {}) as Record<string, any>;

    if (Array.isArray(datos.frames) && datos.frames.length) setFrames(datos.frames);
    setCurrentFrameIndex(0);
    setArrows(Array.isArray(datos.arrows) ? datos.arrows : []);
    if (Array.isArray(datos.ballFrames) && datos.ballFrames.length) {
      setBallFrames(datos.ballFrames);
    } else {
      const frameCount = Array.isArray(datos.frames) && datos.frames.length ? datos.frames.length : 1;
      const fallbackBall = datos.ball ?? { x: 50, y: 75 };
      setBallFrames(Array.from({ length: frameCount }, () => ({ ...fallbackBall })));
    }
    if (datos.myFormation) setMyFormation(datos.myFormation);
    if (datos.rivalFormation) setRivalFormation(datos.rivalFormation);
    if (datos.myTeamColor) setMyTeamColor(datos.myTeamColor);
    if (datos.rivalTeamColor) setRivalTeamColor(datos.rivalTeamColor);
    if (typeof datos.showPlayerNumbers === 'boolean') setShowPlayerNumbers(datos.showPlayerNumbers);
    if (typeof datos.playerScale === 'number') setPlayerScale(datos.playerScale);
    if (typeof datos.showFieldLines === 'boolean') setShowFieldLines(datos.showFieldLines);
    if (typeof datos.showMyTeam === 'boolean') setShowMyTeam(datos.showMyTeam);
    if (typeof datos.showRivalTeam === 'boolean') setShowRivalTeam(datos.showRivalTeam);
    if (datos.selectedRivalClubId) setSelectedRivalClubId(datos.selectedRivalClubId);
    if (datos.selectedRivalTeamId) setSelectedRivalTeamId(datos.selectedRivalTeamId);
    if (Array.isArray(datos.rivalPlayers)) setRivalPlayers(datos.rivalPlayers);
  };

  const handleDeleteBoard = async () => {
    if (!selectedBoardId) return;
    const board = savedBoards.find(b => b.id === selectedBoardId);
    if (!board) return;
    if (!window.confirm(`¿Eliminar la pizarra "${board.nombre}"?`)) return;
    try {
      await pizarrasService.remove(board.id);
      setSelectedBoardId('');
      await refreshSavedBoards();
    } catch (err) {
      console.error('No se pudo eliminar la pizarra', err);
      alert('No se pudo eliminar la pizarra. Inténtalo de nuevo.');
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  useEffect(() => {
    getFFmpeg().catch(err => console.error('Error loading FFmpeg:', err));
  }, []);

  const downloadImage = async () => {
    if (!pitchRef.current) return;
    setIsExportingImage(true);

    try {
      const canvas = await html2canvas(pitchRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `pizarra-tactica-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    } catch (err) {
      console.error('Error al descargar imagen:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  const downloadVideoAsMP4 = async () => {
    if (!pitchRef.current) return;
    setIsExportingVideo(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear contexto 2D');

      const rect = pitchRef.current.getBoundingClientRect();
      const scale = 2;
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunks, { type: 'video/webm' });

        try {
          const ffmpeg = await getFFmpeg();
          await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
          await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', 'output.mp4']);
          const data = await ffmpeg.readFile('output.mp4');
          const mp4Blob = new Blob([data], { type: 'video/mp4' });
          const url = URL.createObjectURL(mp4Blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pizarra-tactica-${new Date().toISOString().split('T')[0]}.mp4`;
          a.click();
          URL.revokeObjectURL(url);
          await ffmpeg.deleteFile('input.webm');
          await ffmpeg.deleteFile('output.mp4');
        } catch (err) {
          console.error('Error convirtiendo a MP4:', err);
          const url = URL.createObjectURL(webmBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pizarra-tactica-${new Date().toISOString().split('T')[0]}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        } finally {
          setIsExportingVideo(false);
        }
      };

      mediaRecorder.start();

      const recordingDuration = 10000;
      const recordingStartTime = Date.now();

      const captureFrame = async () => {
        if (Date.now() - recordingStartTime < recordingDuration) {
          try {
            const frameCanvas = await html2canvas(pitchRef.current!, {
              backgroundColor: null,
              scale: scale,
              useCORS: true,
            });
            ctx.drawImage(frameCanvas, 0, 0);
          } catch (err) {
            console.error('Error capturando frame:', err);
          }
          requestAnimationFrame(captureFrame);
        } else {
          mediaRecorder.stop();
        }
      };

      requestAnimationFrame(captureFrame);
    } catch (err) {
      console.error('Error al descargar video:', err);
      setIsExportingVideo(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-800 dark:bg-[#121212] dark:text-slate-100">
      <aside className={`${mobileTeamPanelOpen ? 'flex fixed inset-0 z-60 w-full' : 'hidden'} md:flex md:static md:z-auto md:w-[290px] shrink-0 flex-col border-r border-slate-200 bg-[#f8f9fa] dark:border-white/10 dark:bg-[#121212]`}>
        <div className="flex h-[58px] items-center gap-3 border-b border-slate-200 px-5 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:border-white/10 dark:text-slate-400">
          <i className="fa-solid fa-bars text-[18px]" />
          <span>PLANTILLA</span>
          <button
            type="button"
            onClick={() => setMobileTeamPanelOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 md:hidden dark:hover:bg-white/10"
            aria-label="Cerrar panel"
          >
            <i className="fa-solid fa-xmark text-[16px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="border-l-2 border-[var(--accent)] pl-4">
            <div className="flex items-center gap-2 text-[15px] font-black uppercase tracking-[0.04em] text-slate-800 dark:text-white">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
              PIZARRA TACTICA
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowPlayerNumbers(v => !v)}
                className={`h-11 rounded-md border text-[12px] font-black uppercase tracking-[0.14em] transition-all ${
                  showPlayerNumbers
                    ? 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                }`}
              >
                {showPlayerNumbers ? 'NUM. ON' : 'NUM. OFF'}
              </button>
              <button
                onClick={() => {
                  updatePitchPlayers(prev => prev.map(p => ({ ...p, playerId: undefined, playerName: undefined, playerInitials: undefined, playerDorsal: undefined, playerFotoUrl: undefined })));
                  setSelectedPitchIds([]);
                  setSelectedSquadPlayerId(null);
                }}
                className="h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.13em] text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
              >
                <i className="fa-solid fa-broom mr-2 text-[11px]" />
                QUITAR JUGADORES
              </button>
              <button
                type="button"
                onClick={() => setPlayerScale(v => Math.max(0.85, +(v - 0.08).toFixed(2)))}
                className="h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                title="Reducir el tamaño de todos los jugadores"
              >
                <i className="fa-solid fa-magnifying-glass-minus mr-2 text-[11px]" />
                Menos
              </button>
              <button
                type="button"
                onClick={() => setPlayerScale(v => Math.min(1.45, +(v + 0.08).toFixed(2)))}
                className="h-11 rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[12px] font-black uppercase tracking-[0.14em] text-[var(--accent)]"
                title="Aumentar el tamaño de todos los jugadores"
              >
                <i className="fa-solid fa-magnifying-glass-plus mr-2 text-[11px]" />
                Más
              </button>
              <button
                onClick={downloadImage}
                disabled={isExportingImage}
                className={`h-11 rounded-md border text-[12px] font-black uppercase tracking-[0.14em] transition-all ${
                  isExportingImage
                    ? 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-400'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                }`}
                title={isExportingImage ? "Descargando PNG..." : "Descargar captura de la pizarra"}
              >
                <i className={`fa-solid ${isExportingImage ? 'fa-spinner' : 'fa-image'} mr-2 text-[11px] ${isExportingImage ? 'animate-spin' : ''}`} />
                {isExportingImage ? 'DESCARGANDO...' : 'IMAGEN'}
              </button>
              <button
                onClick={downloadVideoAsMP4}
                disabled={isExportingVideo}
                className={`h-11 rounded-md border text-[12px] font-black uppercase tracking-[0.14em] transition-all ${
                  isExportingVideo
                    ? 'border-blue-500/30 bg-blue-500/15 text-blue-600 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-400'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                }`}
                title={isExportingVideo ? "Generando video MP4..." : "Descargar pizarra como video en MP4"}
              >
                <i className={`fa-solid ${isExportingVideo ? 'fa-spinner' : 'fa-video'} mr-2 text-[11px] ${isExportingVideo ? 'animate-spin' : ''}`} />
                {isExportingVideo ? 'EXPORTANDO...' : 'VIDEO'}
              </button>
              <button
                onClick={() => setDrawingMode(!drawingMode)}
                className={`h-11 rounded-md border text-[12px] font-black uppercase tracking-[0.14em] transition-all ${
                  drawingMode
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                }`}
              >
                <i className={`fa-solid ${drawingMode ? 'fa-pen' : 'fa-pen'} mr-2 text-[11px]`} />
                {drawingMode ? 'MODO FLECHA ON' : 'MODO FLECHA'}
              </button>
              <div className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-[#1a1a1a]">
                <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Color
                </label>
                <input
                  type="color"
                  value={arrowColor}
                  onChange={e => {
                    const nextColor = e.target.value;
                    setArrowColor(nextColor);
                    if (selectedArrowId) {
                      updateArrows(prev => prev.map(arrow => (
                        arrow.id === selectedArrowId ? { ...arrow, color: nextColor } : arrow
                      )));
                    }
                  }}
                  className="h-7 w-10 rounded-md border border-slate-200 cursor-pointer dark:border-white/10"
                />
              </div>
              <button
                onClick={() => {
                  updateArrows([]);
                  setSelectedArrowId(null);
                }}
                disabled={arrows.length === 0}
                className="col-span-2 h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
              >
                <i className="fa-solid fa-trash-can mr-2 text-[11px]" />
                BORRAR FLECHAS
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#121212]">
        <div className="flex h-[58px] items-center gap-2 overflow-x-auto scrollbar-hide border-b border-slate-200 px-3 md:px-4 dark:border-white/10">
          <button
            type="button"
            onClick={() => setMobileTeamPanelOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 md:hidden dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
            aria-label="Abrir panel de equipos"
          >
            <i className="fa-solid fa-bars text-[14px]" />
          </button>
          <button
            type="button"
            onClick={() => setMobileAssignPanelOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 xl:hidden dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
            aria-label="Abrir panel de asignación de jugadores"
          >
            <i className="fa-solid fa-user-group text-[14px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isPlaying && currentFrameIndex >= frames.length - 1) {
                setCurrentFrameIndex(0);
              }
              setIsPlaying(v => !v);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-white"
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-[12px]`} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--sidebar-bg)] text-white"
            onClick={() => {
              const newIndex = frames.length;
              setFrames(prev => [...prev, (prev[currentFrameIndex] ?? []).map(p => ({ ...p }))]);
              setBallFrames(prev => [...prev, { ...(prev[currentFrameIndex] ?? { x: 50, y: 75 }) }]);
              setCurrentFrameIndex(newIndex);
            }}
          >
            <i className="fa-solid fa-plus text-[12px]" />
          </button>
          <div className="flex gap-2 items-center">
            <div className="flex h-8 shrink-0 items-center gap-1.5">
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="flex h-8 w-[110px] shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-700 md:w-[170px] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                title="Velocidad de reproducción"
              >
                <option value={1}>x1</option>
                <option value={2}>x2</option>
                <option value={3}>x3</option>
              </select>
              <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {frames.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentFrameIndex(i)}
                    className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-2 text-[14px] font-black transition-all ${
                      i === currentFrameIndex
                        ? 'bg-[var(--accent)] text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={frames.length <= 1}
              onClick={() => {
                setFrames(prev => prev.filter((_, i) => i !== currentFrameIndex));
                setBallFrames(prev => prev.filter((_, i) => i !== currentFrameIndex));
                setCurrentFrameIndex(prev => Math.max(0, Math.min(prev, frames.length - 2)));
              }}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white transition-all ${frames.length <= 1 ? 'bg-slate-200 cursor-not-allowed dark:bg-white/10' : 'bg-[#c92525] hover:opacity-90'}`}
              title="Eliminar fotograma actual"
              aria-label="Eliminar fotograma actual"
            >
              <i className="fa-solid fa-trash-can text-[12px]" />
            </button>

            <select
              value={myFormation}
              onChange={e => setMyFormation(e.target.value)}
              title="Sistema de mi equipo"
              className="h-8 rounded-md border border-red-200 bg-red-50 px-2 text-[12px] font-black uppercase tracking-[0.06em] text-red-700 outline-none dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
            >
              <option value="1-3-4-3">MI: 1-3-4-3</option>
              <option value="1-4-4-2">MI: 1-4-4-2</option>
              <option value="1-4-3-3">MI: 1-4-3-3</option>
              <option value="1-4-2-3-1">MI: 1-4-2-3-1</option>
              <option value="1-5-3-2">MI: 1-5-3-2</option>
            </select>

            <select
              value={rivalFormation}
              onChange={e => setRivalFormation(e.target.value)}
              title="Sistema del equipo rival"
              className="h-8 rounded-md border border-blue-200 bg-blue-50 px-2 text-[12px] font-black uppercase tracking-[0.06em] text-blue-700 outline-none dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
            >
              <option value="1-3-4-3">RIVAL: 1-3-4-3</option>
              <option value="1-4-4-2">RIVAL: 1-4-4-2</option>
              <option value="1-4-3-3">RIVAL: 1-4-3-3</option>
              <option value="1-4-2-3-1">RIVAL: 1-4-2-3-1</option>
              <option value="1-5-3-2">RIVAL: 1-5-3-2</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setIs3DView(value => !value);
              setDrawingMode(false);
              setIsDrawingArrow(false);
              setDrawStart(null);
              setSelectedArrowId(null);
              clearPitchSelection();
            }}
            className={`flex h-8 shrink-0 items-center gap-2 rounded-md border px-3 text-[12px] font-black uppercase tracking-[0.12em] transition-all ${
              is3DView
                ? 'border-sky-400/30 bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
            }`}
            title={is3DView ? 'Volver a vista normal' : 'Activar vista 3D'}
            aria-pressed={is3DView}
          >
            <i className="fa-solid fa-cube text-[12px]" />
            3D
          </button>
          <div className="ml-1 flex shrink-0 items-center gap-2 border-l border-slate-200 pl-3 dark:border-white/10">
            <button
              type="button"
              onClick={handleNewBoard}
              className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-black uppercase tracking-[0.12em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
              title="Crear una pizarra nueva en blanco"
            >
              <i className="fa-solid fa-file-circle-plus text-[12px]" />
              NUEVA PIZARRA
            </button>

            <select
              value={selectedBoardId}
              onChange={e => handleLoadBoard(e.target.value)}
              disabled={isLoadingBoards || savedBoards.length === 0}
              title="Cargar una pizarra guardada"
              className="h-8 max-w-[180px] rounded-md border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-600 outline-none disabled:opacity-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
            >
              <option value="">
                {isLoadingBoards ? 'Cargando...' : savedBoards.length ? 'Pizarras guardadas' : 'Sin pizarras guardadas'}
              </option>
              {savedBoards.map(board => (
                <option key={board.id} value={board.id}>{board.nombre}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSaveBoard}
              disabled={isSavingBoard}
              className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 text-[12px] font-black uppercase tracking-[0.12em] text-[var(--accent)] disabled:opacity-50"
              title="Guardar la pizarra actual"
            >
              <i className={`fa-solid ${isSavingBoard ? 'fa-spinner animate-spin' : 'fa-floppy-disk'} text-[12px]`} />
              GUARDAR
            </button>

            {selectedBoardId && (
              <button
                type="button"
                onClick={handleDeleteBoard}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                title="Eliminar esta pizarra guardada"
                aria-label="Eliminar pizarra guardada"
              >
                <i className="fa-solid fa-trash-can text-[12px]" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 px-4 py-3 md:px-5">
          <div className="grid h-full min-h-0 grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section
              ref={pitchStageRef}
              className={`min-h-0 transition-colors duration-500 ${
                is3DView
                  ? 'flex items-center justify-center overflow-hidden bg-[#07140d] px-0 py-2'
                  : 'flex items-center justify-center overflow-hidden p-2'
              }`}
              style={is3DView ? { perspective: '1400px', perspectiveOrigin: '50% 28%' } : undefined}
            >
              <div
                ref={pitchRef}
                className={`relative rounded-[14px] border transition-all duration-500 ease-out dark:border-white/10 ${
                  is3DView
                    ? 'overflow-visible border-emerald-100/70 shadow-[0_58px_90px_rgba(0,0,0,0.58)]'
                    : 'overflow-hidden border-slate-200 shadow-sm'
                }`}
                style={{
                  ...FIELD_BACKGROUND,
                  width: pitchFrameSize?.width ?? (is3DView ? '100%' : '100%'),
                  height: pitchFrameSize?.height ?? '100%',
                  maxWidth: is3DView ? 'none' : '100%',
                  maxHeight: is3DView ? 'none' : '100%',
                  aspectRatio: '105 / 68',
                  transform: is3DView ? 'translateY(-7%) rotateX(42deg) scale(1)' : 'none',
                  transformOrigin: '50% 50%',
                  transformStyle: 'preserve-3d',
                }}
                onPointerDown={handlePitchPointerDown}
                onClick={() => {
                  if (suppressNextPitchClickRef.current) {
                    suppressNextPitchClickRef.current = false;
                    return;
                  }
                  clearPitchSelection();
                }}
              >
                {is3DView && (
                  <>
                    <div className="pointer-events-none absolute -inset-10 -z-30 rounded-[28px] bg-[radial-gradient(ellipse_at_center,rgba(27,92,54,0.40),rgba(5,12,8,0.84)_68%)]" />
                    <div className="pointer-events-none absolute -bottom-7 left-4 right-4 -z-20 h-8 rounded-b-[18px] border-x border-b border-emerald-900/70 bg-[#102c1b] shadow-[0_24px_32px_rgba(0,0,0,0.42)]" />
                    <div className="pointer-events-none absolute -left-4 bottom-1 top-6 -z-20 w-5 skew-y-[-12deg] rounded-l-md bg-[#153b22]" />
                    <div className="pointer-events-none absolute -right-4 bottom-1 top-6 -z-20 w-5 skew-y-[12deg] rounded-r-md bg-[#0d2618]" />
                    <div className="pointer-events-none absolute inset-0 z-[2] rounded-[14px] bg-[linear-gradient(115deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.03)_26%,transparent_48%,rgba(0,0,0,0.18)_100%)]" />
                  </>
                )}
                {showFieldLines && (
                <svg
                  className="absolute inset-0 h-full w-full opacity-95 pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={is3DView ? { transform: 'translateZ(5px)' } : undefined}
                >
                  <g fill="none" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="0.16">
                    <rect x="2.6" y="2.6" width="94.8" height="94.8" rx="1.6" />
                    <line x1="2.6" y1="50" x2="97.4" y2="50" />
                    <circle cx="50" cy="50" r="11.5" />
                    <circle cx="50" cy="50" r="0.38" fill="#ffffff" stroke="none" />
                    <circle cx="50" cy="12" r="0.38" fill="#ffffff" stroke="none" />
                    <circle cx="50" cy="88" r="0.38" fill="#ffffff" stroke="none" />
                    <rect x="37" y="2.6" width="26" height="11.5" />
                    <rect x="27" y="2.6" width="46" height="20.5" />
                    <rect x="37" y="85.9" width="26" height="11.5" />
                    <rect x="27" y="76.9" width="46" height="20.5" />
                  </g>
                </svg>
                )}

                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={is3DView ? { transform: 'translateZ(10px)' } : undefined}
                >
                  {arrows.map(arrow => {
                    const isSelected = arrow.id === selectedArrowId;
                    const arrowHeadSize = 2;
                    const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
                    const headX1 = arrow.x2 - arrowHeadSize * Math.cos(angle - Math.PI / 6);
                    const headY1 = arrow.y2 - arrowHeadSize * Math.sin(angle - Math.PI / 6);
                    const headX2 = arrow.x2 - arrowHeadSize * Math.cos(angle + Math.PI / 6);
                    const headY2 = arrow.y2 - arrowHeadSize * Math.sin(angle + Math.PI / 6);

                    return (
                      <g
                        key={arrow.id}
                        onMouseDown={(e: React.MouseEvent) => {
                          if (is3DView) return;
                          e.stopPropagation();
                          if (!pitchRef.current) return;
                          const rect = pitchRef.current.getBoundingClientRect();
                          const start = {
                            x: ((e.clientX - rect.left) / rect.width) * 100,
                            y: ((e.clientY - rect.top) / rect.height) * 100,
                          };
                          setSelectedArrowId(arrow.id);
                          setDraggingArrowId(arrow.id);
                          draggingArrowStart.current = start;
                          arrowStartPosition.current = {
                            x1: arrow.x1,
                            y1: arrow.y1,
                            x2: arrow.x2,
                            y2: arrow.y2,
                          };
                          document.body.style.cursor = 'grabbing';
                          document.body.style.userSelect = 'none';
                        }}
                        style={{ cursor: 'grab', pointerEvents: is3DView ? 'none' : 'auto' }}
                      >
                        <line
                          x1={arrow.x1}
                          y1={arrow.y1}
                          x2={arrow.x2}
                          y2={arrow.y2}
                          stroke="transparent"
                          strokeWidth={3}
                          style={{ pointerEvents: is3DView ? 'none' : 'auto' }}
                        />
                        <line
                          x1={arrow.x1}
                          y1={arrow.y1}
                          x2={arrow.x2}
                          y2={arrow.y2}
                          stroke={arrow.color}
                          strokeWidth="0.4"
                          strokeOpacity="0.9"
                          style={{ pointerEvents: 'none' }}
                        />
                        <polygon
                          points={`${arrow.x2},${arrow.y2} ${headX1},${headY1} ${headX2},${headY2}`}
                          fill={arrow.color}
                          fillOpacity="0.9"
                          style={{ pointerEvents: 'none' }}
                        />
                      </g>
                    );
                  })}

                  {isDrawingArrow && drawStart && (drawStart as any).x2 !== undefined && (
                    <g>
                      <line
                        x1={drawStart.x}
                        y1={drawStart.y}
                        x2={(drawStart as any).x2}
                        y2={(drawStart as any).y2}
                        stroke={arrowColor}
                        strokeWidth="0.4"
                        strokeOpacity="0.7"
                        strokeDasharray="1,1"
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                  )}
                </svg>

                {draggingOrigin.current && selectedPitchId && draggingIds.current.length === 1 && (() => {
                  const active = pitchPlayers.find(p => p.id === selectedPitchId);
                  if (!active) return null;
                  return (
                    <div
                      className="absolute z-[5] pointer-events-none"
                      style={{ left: `${draggingOrigin.current.x}%`, top: `${draggingOrigin.current.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="h-8 w-8 rounded-full border border-dashed border-white/35 opacity-40" style={{ backgroundColor: active.color }} />
                    </div>
                  );
                })()}

                {/* Ball */}
                <div
                  className="absolute select-none"
                  style={{
                    left: `${ball.x}%`,
                    top: `${ball.y}%`,
                    transform: `translate(-50%, -50%)`,
                    cursor: draggingBall ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    zIndex: draggingBall ? 9999 : 30,
                    userSelect: 'none',
                    transition: draggingBall
                      ? 'none'
                      : isPlaying
                        ? `left ${frameDurationMs}ms ease-in-out, top ${frameDurationMs}ms ease-in-out`
                        : 'left 0.08s ease-out, top 0.08s ease-out',
                  }}
                  onPointerDown={e => {
                    if (isPlaying || is3DView) return;
                    e.stopPropagation();
                    const rect = pitchRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    ballDraggingStart.current = {
                      x: ((e.clientX - rect.left) / rect.width) * 100,
                      y: ((e.clientY - rect.top) / rect.height) * 100,
                    };
                    ballStartPosition.current = { x: ball.x, y: ball.y };
                    setDraggingBall(true);
                    document.body.style.userSelect = 'none';
                  }}
                >
                  <SoccerBallIcon
                    size={24}
                    className="drop-shadow-lg"
                  />
                </div>

                {pitchPlayers.map(player => {
                  if ((player.team === 'my' && !showMyTeam) || (player.team === 'rival' && !showRivalTeam)) return null;
                  const isSelected = selectedPitchIds.includes(player.id);
                  const isDragging = draggingIds.current.includes(player.id);
                  const isMarkedForDelete = isDragging && dragOutsideField;
                  const displaySize = (player.number === 1 ? 44 : 40) * playerScale;

                  return (
                    <div
                      key={player.id}
                      className="absolute select-none"
                      style={{
                        left: `${player.x}%`,
                        top: `${player.y}%`,
                        transform: is3DView
                          ? `translate(-50%, -50%) rotate(${player.rotation ?? 0}deg) translateZ(${PITCH_PLAYER_3D_LIFT_PX}px)`
                          : `translate(-50%, -50%) rotate(${player.rotation ?? 0}deg)`,
                        transformStyle: 'preserve-3d',
                        cursor: isPlaying ? 'default' : isDragging ? 'grabbing' : 'grab',
                        touchAction: 'none',
                        zIndex: isDragging ? 9999 : isSelected ? 50 : 20,
                        opacity: isMarkedForDelete ? 0.35 : 1,
                        transition: isDragging
                          ? 'none'
                          : isPlaying
                            ? `left ${frameDurationMs}ms ease-in-out, top ${frameDurationMs}ms ease-in-out, transform 0.3s ease-out`
                            : 'left 0.08s ease-out, top 0.08s ease-out, transform 0.3s ease-out',
                      }}
                      onPointerDown={e => {
                        e.stopPropagation();
                        handlePointerDown(e, player.id);
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        if (isPlaying) return;
                        if (is3DView) return;
                        if (suppressNextPitchClickRef.current) {
                          suppressNextPitchClickRef.current = false;
                          return;
                        }
                        const clickedPitchId = player.id;
                        setSelectedPitchIds([clickedPitchId]);
                        if (selectedSquadPlayerId && player.team === 'my') {
                          const squadPlayer = squad.find(p => p.id === selectedSquadPlayerId);
                          if (squadPlayer) assignPlayer(squadPlayer, clickedPitchId);
                        } else if (selectedRivalPlayerId && player.team === 'rival') {
                          const rivalPlayer = rivalPlayers.find(p => p.id === selectedRivalPlayerId);
                          if (rivalPlayer) assignPlayer(rivalPlayer, clickedPitchId);
                        } else {
                          setAssignTab(player.team);
                        }
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/80 px-1.5 py-1 shadow-xl"
                          style={{ bottom: `${displaySize / 2 + 8}px` }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10" onClick={e => { e.stopPropagation(); updatePitchPlayers(prev => prev.map(p => p.id === player.id ? { ...p, ...clampPitchPlayerPosition(p, p.x - 2, p.y) } : p)); }} title="Aumentar tamaño">
                            <i className="fa-solid fa-magnifying-glass-plus text-[9px]" />
                          </button>
                          <button className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10" onClick={e => { e.stopPropagation(); updatePitchPlayers(prev => prev.map(p => p.id === player.id ? { ...p, ...clampPitchPlayerPosition(p, p.x + 2, p.y) } : p)); }} title="Reducir tamaño">
                            <i className="fa-solid fa-magnifying-glass-minus text-[9px]" />
                          </button>
                          <button className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10" onClick={e => { e.stopPropagation(); updatePitchPlayers(prev => prev.map(p => p.id === player.id ? { ...p, rotation: ((p.rotation ?? 0) + 90) % 360 } : p)); }} title="Rotar 90 grados">
                            <i className="fa-solid fa-rotate-right text-[9px]" />
                          </button>
                        </div>
                      )}

                      <div
                        className={`flex items-center justify-center overflow-hidden rounded-full border-[3px] font-black shadow-lg ${player.number === 1 ? 'text-white' : 'text-white'} ${isSelected ? 'ring-2 ring-white/60' : ''}`}
                        style={{
                          width: displaySize,
                          height: displaySize,
                          backgroundColor: player.color,
                          borderColor: 'rgba(255,255,255,0.4)',
                          boxShadow: is3DView
                            ? '0 2px 3px rgba(0,0,0,0.28), inset 0 8px 14px rgba(255,255,255,0.18), inset 0 -8px 14px rgba(0,0,0,0.24)'
                            : isDragging
                              ? '0 14px 24px rgba(0,0,0,0.35)'
                              : '0 8px 18px rgba(0,0,0,0.35)',
                        }}
                      >
                        {showPlayerPhotos && player.playerFotoUrl ? (
                          <img src={player.playerFotoUrl} alt={player.playerName || ''} className="h-full w-full object-cover" />
                        ) : (
                          showPlayerNumbers && (
                            <span className="text-[15px] leading-none">{player.playerDorsal !== undefined ? player.playerDorsal : player.playerInitials ? player.playerInitials : player.number}</span>
                          )
                        )}
                      </div>

                      {showPlayerPhotos && player.playerFotoUrl && player.playerDorsal !== undefined && (
                        <div
                          className="absolute top-1/2 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/80 px-1 shadow-lg"
                          style={{ left: `calc(50% + ${displaySize / 2 - 6}px)`, pointerEvents: 'none' }}
                        >
                          <span className="whitespace-nowrap text-[10px] font-black leading-none text-white">
                            {player.playerDorsal}
                          </span>
                        </div>
                      )}

                      {player.playerName && (
                        <div className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] font-black uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {player.playerName.length > 8 ? player.playerName.substring(0, 8) + '...' : player.playerName}
                        </div>
                      )}

                      {isMarkedForDelete && (
                        <div
                          className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#cf2227] text-white shadow-lg"
                          style={{ pointerEvents: 'none' }}
                        >
                          <i className="fa-solid fa-trash-can text-[11px]" />
                        </div>
                      )}

                      {player.playerId && isSelected && (
                        <button
                          type="button"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => {
                            e.stopPropagation();
                            removeAssignment(player.id);
                          }}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#cf2227] text-[9px] text-white shadow-lg"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {selectionBox && selectionRef.current?.moved && (
                  <div
                    className="pointer-events-none absolute z-[30] rounded-md border border-dashed border-white/85 bg-white/10"
                    style={{
                      left: `${selectionBox.left}%`,
                      top: `${selectionBox.top}%`,
                      width: `${selectionBox.right - selectionBox.left}%`,
                      height: `${selectionBox.bottom - selectionBox.top}%`,
                    }}
                  />
                )}
              </div>
            </section>

            <aside className={`${mobileAssignPanelOpen ? 'flex fixed inset-0 z-60 w-full' : 'hidden'} min-h-0 xl:flex xl:static xl:z-auto xl:flex-col xl:border-l xl:border-slate-200 bg-[#f8f9fa] dark:xl:border-white/10 dark:bg-[#121212]`}>
              <div className="border-b border-slate-200 px-5 py-3 dark:border-white/10 xl:hidden">
                <button
                  type="button"
                  onClick={() => setMobileAssignPanelOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                  aria-label="Cerrar panel"
                >
                  <i className="fa-solid fa-xmark text-[16px]" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-6">
                <div className="space-y-3">
                  <div className="rounded-md border border-blue-200/50 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                      RIVAL
                    </div>

                    <div className="space-y-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setShowRivalTeam(v => !v)}
                        className={`w-full h-10 rounded-md border text-[12px] font-black uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 ${
                          showRivalTeam
                            ? 'border-blue-300/50 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
                            : 'border-blue-200 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-500/20 dark:bg-[#1a1a1a] dark:text-blue-300 dark:hover:bg-blue-500/10'
                        }`}
                      >
                        <i className={`fa-solid ${showRivalTeam ? 'fa-eye' : 'fa-eye-slash'} text-[11px]`} />
                        {showRivalTeam ? 'MOSTRAR' : 'OCULTAR'}
                      </button>

                      <div>
                        <label className="block mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          Club rival
                        </label>
                        <SearchableSelect
                          value={selectedRivalClubId}
                          onChange={e => handleSelectRivalClub(e.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                        >
                          <option value="">Selecciona club rival</option>
                          {rivalClubs.map(club => (
                            <option key={club.id} value={club.id}>{club.nombre}</option>
                          ))}
                        </SearchableSelect>
                      </div>

                      <div>
                        <label className="block mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          Equipo rival
                        </label>
                        <SearchableSelect
                          value={selectedRivalTeamId}
                          onChange={e => handleSelectRivalTeam(e.target.value)}
                          disabled={!selectedRivalClubId}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 outline-none disabled:opacity-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                        >
                          <option value="">
                            {selectedRivalClubId ? 'Selecciona equipo' : 'Sin plantilla rival (añadir a mano)'}
                          </option>
                          {rivalTeamsForSelectedClub.map(team => (
                            <option key={team.id} value={team.id}>{team.sub_equipo || team.nombre}</option>
                          ))}
                        </SearchableSelect>
                      </div>

                      <div>
                        <label className="block mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          Sistema
                        </label>
                        <select
                          value={rivalFormation}
                          onChange={e => setRivalFormation(e.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                        >
                          <option value="1-3-4-3">1-3-4-3</option>
                          <option value="1-4-4-2">1-4-4-2</option>
                          <option value="1-4-3-3">1-4-3-3</option>
                          <option value="1-4-2-3-1">1-4-2-3-1</option>
                          <option value="1-5-3-2">1-5-3-2</option>
                        </select>
                      </div>

                      {selectedRivalTeamId && rivalPlayers.length > 0 && (
                        <div className="rounded-md bg-blue-100 border border-blue-300 px-3 py-2 dark:bg-blue-500/20 dark:border-blue-500/40">
                          <p className="text-[11px] font-black text-blue-700 dark:text-blue-200">
                            ✓ {rivalPlayers.length} jugadores cargados
                          </p>
                        </div>
                      )}

                      {selectedRivalTeamId && rivalPlayers.length > 0 && (
                        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                          {rivalPlayers.map(player => {
                            const isSelected = selectedRivalPlayerId === player.id;
                            const isAssigned = assignedPlayerIds.has(player.id);
                            return (
                              <button
                                key={player.id}
                                type="button"
                                onClick={() => {
                                  if (selectedPitchId) {
                                    const pitchPlayer = pitchPlayers.find(p => p.id === selectedPitchId);
                                    if (pitchPlayer && pitchPlayer.team === 'rival') {
                                      assignPlayer(player, selectedPitchId);
                                      return;
                                    }
                                  }
                                  setSelectedRivalPlayerId(prev => (prev === player.id ? null : player.id));
                                }}
                                className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[12px] font-semibold transition-all ${
                                  isSelected
                                    ? 'border-blue-400 bg-blue-200 text-blue-800 dark:border-blue-400/60 dark:bg-blue-500/30 dark:text-blue-100'
                                    : isAssigned
                                      ? 'border-blue-200/60 bg-white/60 text-blue-400 dark:border-blue-500/20 dark:bg-[#1a1a1a]/60 dark:text-blue-300/50'
                                      : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:border-blue-500/20 dark:bg-[#1a1a1a] dark:text-blue-200 dark:hover:bg-blue-500/10'
                                }`}
                              >
                                <span className="flex h-5 w-6 shrink-0 items-center justify-center rounded bg-blue-600/10 text-[11px] font-black text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
                                  {player.dorsal ?? '-'}
                                </span>
                                <span className="truncate">{player.nombre}</span>
                                {isAssigned && <i className="fa-solid fa-check ml-auto text-[10px]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-red-200/50 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                    <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-300">
                      MI EQUIPO
                    </div>

                    <div className="space-y-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setShowMyTeam(v => !v)}
                        className={`w-full h-10 rounded-md border text-[12px] font-black uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 ${
                          showMyTeam
                            ? 'border-red-300/50 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200'
                            : 'border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:bg-[#1a1a1a] dark:text-red-300 dark:hover:bg-red-500/10'
                        }`}
                      >
                        <i className={`fa-solid ${showMyTeam ? 'fa-eye' : 'fa-eye-slash'} text-[11px]`} />
                        {showMyTeam ? 'MOSTRAR' : 'OCULTAR'}
                      </button>

                      <SearchableSelect
                        value={selectedMyTeamId}
                        onChange={e => setSelectedMyTeamId(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                      >
                        <option value="">Selecciona tu equipo</option>
                        {myTeams.map(team => (
                          <option key={team.id} value={team.id}>{team.sub_equipo || team.nombre}</option>
                        ))}
                      </SearchableSelect>

                      <div>
                        <label className="block mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          Sistema
                        </label>
                        <select
                          value={myFormation}
                          onChange={e => setMyFormation(e.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                        >
                          <option value="1-3-4-3">1-3-4-3</option>
                          <option value="1-4-4-2">1-4-4-2</option>
                          <option value="1-4-3-3">1-4-3-3</option>
                          <option value="1-4-2-3-1">1-4-2-3-1</option>
                          <option value="1-5-3-2">1-5-3-2</option>
                        </select>
                      </div>

                      {selectedMyTeamId && (
                        <div className="rounded-md border border-red-200 bg-red-100 px-3 py-2 dark:border-red-500/40 dark:bg-red-500/20">
                          <p className="text-[11px] font-black text-red-700 dark:text-red-200">
                            {isMySquadLoading
                              ? 'Cargando jugadores...'
                              : `${squad.length} jugador${squad.length === 1 ? '' : 'es'} ${selectedMyTeam ? `de ${selectedMyTeam.sub_equipo || selectedMyTeam.nombre}` : 'cargados'}`}
                          </p>
                        </div>
                      )}

                      {selectedMyTeamId && !isMySquadLoading && squad.length > 0 && (
                        <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                          {groupedSquad.map(([grupo, players]) => (
                            <div key={grupo}>
                              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-500/70 dark:text-red-300/60">
                                {grupo}
                              </div>
                              <div className="space-y-1.5">
                                {players.map(player => {
                                  const isSelected = selectedSquadPlayerId === player.id;
                                  const isAssigned = assignedPlayerIds.has(player.id);
                                  return (
                                    <button
                                      key={player.id}
                                      type="button"
                                      onClick={() => {
                                        if (selectedPitchId) {
                                          const pitchPlayer = pitchPlayers.find(p => p.id === selectedPitchId);
                                          if (pitchPlayer && pitchPlayer.team === 'my') {
                                            assignPlayer(player, selectedPitchId);
                                            return;
                                          }
                                        }
                                        setSelectedSquadPlayerId(prev => (prev === player.id ? null : player.id));
                                      }}
                                      className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[12px] font-semibold transition-all ${
                                        isSelected
                                          ? 'border-red-400 bg-red-200 text-red-800 dark:border-red-400/60 dark:bg-red-500/30 dark:text-red-100'
                                          : isAssigned
                                            ? 'border-red-200/60 bg-white/60 text-red-400 dark:border-red-500/20 dark:bg-[#1a1a1a]/60 dark:text-red-300/50'
                                            : 'border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/20 dark:bg-[#1a1a1a] dark:text-red-200 dark:hover:bg-red-500/10'
                                      }`}
                                    >
                                      <span className="flex h-5 w-6 shrink-0 items-center justify-center rounded bg-red-600/10 text-[11px] font-black text-red-600 dark:bg-red-400/10 dark:text-red-300">
                                        {player.dorsal ?? '-'}
                                      </span>
                                      <span className="truncate">{player.apodo || player.nombre}</span>
                                      {isAssigned && <i className="fa-solid fa-check ml-auto text-[10px]" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedMyTeamId && !isMySquadLoading && squad.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPlayerPhotos(!showPlayerPhotos)}
                          className="w-full h-10 rounded-md border border-red-200 bg-white text-[12px] font-black uppercase tracking-[0.12em] text-red-700 hover:bg-red-50 transition-all dark:border-red-500/20 dark:bg-[#1a1a1a] dark:text-red-200 dark:hover:bg-red-500/10"
                        >
                          <i className="fa-solid fa-image mr-2 text-[11px]" />
                          {showPlayerPhotos ? 'OCULTAR FOTOS' : 'FOTOS JUGADORES'}
                        </button>
                      )}

                      {showPlayerPhotos && squad.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                          {squad.map(player => (
                            <div key={player.id} className="flex flex-col items-center gap-1">
                              <div className="w-16 h-16 rounded-lg overflow-hidden border border-red-200 bg-red-50 flex items-center justify-center dark:border-red-500/20 dark:bg-red-500/10">
                                {player.fotoUrl && player.fotoUrl.length > 1 ? (
                                  <img src={player.fotoUrl} alt={player.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[20px] font-black text-red-600 dark:text-red-300">{(player.apodo || player.nombre).slice(0, 1).toUpperCase()}</span>
                                )}
                              </div>
                              <span className="text-[9px] font-black text-red-600 text-center truncate w-full px-0.5 dark:text-red-300">
                                {player.dorsal ? `#${player.dorsal}` : '-'}
                              </span>
                              <span className="text-[8px] text-red-500 text-center truncate w-full px-0.5 dark:text-red-300/70">
                                {(player.apodo || player.nombre).slice(0, 8)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PizarraTactica;

