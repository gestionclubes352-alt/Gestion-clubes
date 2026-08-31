import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { plantillasService, equiposService, clubesService, pizarrasService, pizarrasCarpetasService } from '@shared/services/dataService';
import type { Club, Equipo, PizarraTactica as PizarraTacticaRow, PizarraCarpeta } from '@shared/services/dataService';
import type { TacticalArrow, DrawingToolType, DrawingShape } from '../types';
import { useUndoRedo } from '@context/UndoRedoContext';
import SearchableSelect from '@shared/components/SearchableSelect';
import { compareEquipoNames } from '@shared/components/EquipoSelect';
import SoccerBallIcon from '@shared/components/SoccerBallIcon';
import html2canvas from 'html2canvas-pro';
import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from '@shared/utils/ffmpegClient';
import ataqueImage from '@modules/pintado-acciones/assets/campos/ataque/campo.png?url';
import defensaImage from '@modules/pintado-acciones/assets/campos/defensa/campo.png?url';
import completoImage from '@modules/pintado-acciones/assets/campos/ataque/campo.png?url';
import { useDrawingTools } from '../hooks/useDrawingTools';
import { DrawingShapes } from './DrawingShapes';

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

const SIN_CARPETA_VALUE = '__sin_carpeta__';

const MY_TEAM_COLOR = '#d32f2f';
const RIVAL_TEAM_COLOR = '#1976d2';
const MY_KEEPER_COLOR = '#e91e63';
const RIVAL_KEEPER_COLOR = '#fdd835';
const PANEL_COLORS = ['#d32f2f', '#1976d2', '#ffffff'];
type TextSizePreset = 'S' | 'M' | 'L' | 'XL';
const TEXT_SIZE_PRESETS: TextSizePreset[] = ['S', 'M', 'L', 'XL'];
const TEXT_SIZE_VALUES: Record<TextSizePreset, number> = { S: 2.5, M: 3.5, L: 5, XL: 7 };
const TEXT_COLOR_PRESETS = [
  '#ffffff',
  '#111111',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
];
const FRAME_DURATION_MS = 1200;
const PITCH_ASPECT = 105 / 68;
const FIELD_LINE_EDGE_PERCENT = 2.6;
const PITCH_PLAYER_3D_LIFT_PX = 2;
const FIELD_BACKGROUND = {
  backgroundColor: '#132e1c',
  backgroundImage: [
    'radial-gradient(ellipse 95% 90% at 50% 45%, rgba(46, 125, 50, 0.38) 0%, rgba(19, 46, 28, 0.7) 45%, rgba(3, 8, 5, 0.94) 100%)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 0 56px, rgba(0, 0, 0, 0.14) 56px 112px)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 0 2px, transparent 2px 128px)',
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

type FadeState = 'entering' | 'visible' | 'exiting';
const FADE_DURATION_MS = 300;

interface PizarraTacticaProps {
  /** Id del club propio (currentTeam.id) — cualquier otro equipo/club se trata como rival. */
  ownClubId?: string;
}

const PLAN_PARTIDO_SECTION_LABELS: Record<string, string> = {
  planConBalon: 'Ataque',
  planSinBalon: 'Defensa',
  planAbp: 'Transiciones',
};

const PizarraTactica: React.FC<PizarraTacticaProps> = ({ ownClubId }) => {
  const { pushState, setOnStateRestore } = useUndoRedo();
  const linkedParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const partidoId = params.get('partidoId') || undefined;
    const seccion = params.get('seccion') || undefined;
    const boardId = params.get('boardId') || undefined;
    const isNew = params.get('new') === '1';
    return partidoId && seccion ? { partidoId, seccion, boardId, isNew } : null;
  }, []);
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
  const [myTeamPanelExpanded, setMyTeamPanelExpanded] = useState(false);
  const [rivalTeamPanelExpanded, setRivalTeamPanelExpanded] = useState(false);
  const [showPlayersAndFieldsPanel, setShowPlayersAndFieldsPanel] = useState(true);
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
  const [arrowFrames, setArrowFrames] = useState<TacticalArrow[][]>([[]]);
  const [shapeFrames, setShapeFrames] = useState<DrawingShape[][]>([[]]);
  const arrows = arrowFrames[currentFrameIndex] ?? [];
  const shapes = shapeFrames[currentFrameIndex] ?? [];
  const setShapesForCurrentFrame = useCallback((updater: DrawingShape[] | ((prev: DrawingShape[]) => DrawingShape[])) => {
    setShapeFrames(prev => {
      const next = [...prev];
      const current = next[currentFrameIndex] ?? [];
      next[currentFrameIndex] = typeof updater === 'function' ? (updater as (prev: DrawingShape[]) => DrawingShape[])(current) : updater;
      return next;
    });
  }, [currentFrameIndex]);
  const drawingTools = useDrawingTools(shapes, setShapesForCurrentFrame);

  // Entrada/salida progresiva de flechas y formas al cambiar de fotograma:
  // los elementos nuevos aparecen con fundido y los que desaparecen se
  // mantienen brevemente en pantalla desvaneciéndose en vez de cortarse.
  const [displayedArrows, setDisplayedArrows] = useState<(TacticalArrow & { _fade: FadeState })[]>(
    () => arrows.map(a => ({ ...a, _fade: 'visible' as FadeState }))
  );
  const [displayedShapes, setDisplayedShapes] = useState<(DrawingShape & { _fade: FadeState })[]>(
    () => shapes.map(s => ({ ...s, _fade: 'visible' as FadeState }))
  );
  const prevFadeFrameIndexRef = useRef(currentFrameIndex);

  useEffect(() => {
    const frameChanged = prevFadeFrameIndexRef.current !== currentFrameIndex;
    prevFadeFrameIndexRef.current = currentFrameIndex;

    setDisplayedArrows(prevList => {
      if (!frameChanged) {
        return arrows.map(a => ({ ...a, _fade: 'visible' as FadeState }));
      }
      const nextIds = new Set(arrows.map(a => a.id));
      const stillHere = prevList.filter(a => a._fade !== 'exiting');
      const stillHereIds = new Set(stillHere.map(a => a.id));
      const kept = arrows.map(a => ({ ...a, _fade: (stillHereIds.has(a.id) ? 'visible' : 'entering') as FadeState }));
      const leaving = stillHere.filter(a => !nextIds.has(a.id)).map(a => ({ ...a, _fade: 'exiting' as FadeState }));
      return [...kept, ...leaving];
    });

    setDisplayedShapes(prevList => {
      if (!frameChanged) {
        return shapes.map(s => ({ ...s, _fade: 'visible' as FadeState }));
      }
      const nextIds = new Set(shapes.map(s => s.id));
      const stillHere = prevList.filter(s => s._fade !== 'exiting');
      const stillHereIds = new Set(stillHere.map(s => s.id));
      const kept = shapes.map(s => ({ ...s, _fade: (stillHereIds.has(s.id) ? 'visible' : 'entering') as FadeState }));
      const leaving = stillHere.filter(s => !nextIds.has(s.id)).map(s => ({ ...s, _fade: 'exiting' as FadeState }));
      return [...kept, ...leaving];
    });
  }, [arrows, shapes, currentFrameIndex]);

  useEffect(() => {
    const hasEntering = displayedArrows.some(a => a._fade === 'entering') || displayedShapes.some(s => s._fade === 'entering');
    if (!hasEntering) return;
    const raf = requestAnimationFrame(() => {
      setDisplayedArrows(prev => prev.map(a => (a._fade === 'entering' ? { ...a, _fade: 'visible' } : a)));
      setDisplayedShapes(prev => prev.map(s => (s._fade === 'entering' ? { ...s, _fade: 'visible' } : s)));
    });
    return () => cancelAnimationFrame(raf);
  }, [displayedArrows, displayedShapes]);

  useEffect(() => {
    const hasExiting = displayedArrows.some(a => a._fade === 'exiting') || displayedShapes.some(s => s._fade === 'exiting');
    if (!hasExiting) return;
    const timeout = setTimeout(() => {
      setDisplayedArrows(prev => prev.filter(a => a._fade !== 'exiting'));
      setDisplayedShapes(prev => prev.filter(s => s._fade !== 'exiting'));
    }, FADE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [displayedArrows, displayedShapes]);

  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [arrowColor, setArrowColor] = useState('#ffffff');
  const [drawingMode, setDrawingMode] = useState(false);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showDrawingOptions, setShowDrawingOptions] = useState(false);
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
  const [carpetas, setCarpetas] = useState<PizarraCarpeta[]>([]);
  const [selectedCarpetaId, setSelectedCarpetaId] = useState('');
  const [isLoadingCarpetas, setIsLoadingCarpetas] = useState(false);
  const [showCarpetaMenu, setShowCarpetaMenu] = useState(false);
  const boardsFilteredByCarpeta = useMemo(() => {
    return selectedCarpetaId
      ? savedBoards.filter(board => board.carpeta_id === selectedCarpetaId)
      : savedBoards.filter(board => !board.carpeta_id);
  }, [savedBoards, selectedCarpetaId]);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [carpetaMenuPos, setCarpetaMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [newBoardModal, setNewBoardModal] = useState<{ nombre: string; carpetaId: string } | null>(null);
  const [boardMenuPos, setBoardMenuPos] = useState<{ top: number; right: number } | null>(null);

  // Configurar callback para restaurar estado de pizarra táctica
  useEffect(() => {
    setOnStateRestore((state: any) => {
      if (state.frames) setFrames(state.frames);
      if (Array.isArray(state.arrowFrames)) {
        setArrowFrames(state.arrowFrames);
      } else if (state.arrows) {
        const frameCount = Array.isArray(state.frames) && state.frames.length ? state.frames.length : 1;
        setArrowFrames(Array.from({ length: frameCount }, () => state.arrows));
      }
      if (Array.isArray(state.ballFrames) && state.ballFrames.length) {
        setBallFrames(state.ballFrames);
      } else if (state.ball) {
        setBallFrames((state.frames ?? [[]]).map(() => state.ball));
      }
    });
  }, [setOnStateRestore]);

  // Wrapper para registrar cambios en las flechas del fotograma actual
  const updateArrows = (updater: TacticalArrow[] | ((prev: TacticalArrow[]) => TacticalArrow[])) => {
    let next: TacticalArrow[][] = arrowFrames;
    setArrowFrames(prev => {
      next = [...prev];
      const current = next[currentFrameIndex] ?? [];
      next[currentFrameIndex] = typeof updater === 'function' ? (updater as (prev: TacticalArrow[]) => TacticalArrow[])(current) : updater;
      return next;
    });

    // Registrar cambio en el historial (fuera del updater para no actualizar
    // otro componente -UndoRedoProvider- durante el render de este)
    pushState({
      squadList: squad,
      usersList: [],
      personalList: [],
      competitionTeams: [],
      clubesList: [],
      campogramasList: [],
      eventsList: [],
      frames,
      arrowFrames: next,
      ballFrames,
    });
  };

  // Wrapper para registrar cambios en la posición del balón del fotograma actual
  const updateBall = (newBall: Ball) => {
    let next: Ball[] = ballFrames;
    setBallFrames(prev => {
      next = [...prev];
      next[currentFrameIndex] = newBall;
      return next;
    });

    // Registrar cambio en el historial (fuera del updater)
    pushState({
      squadList: squad,
      usersList: [],
      personalList: [],
      competitionTeams: [],
      clubesList: [],
      campogramasList: [],
      eventsList: [],
      frames,
      arrowFrames,
      ballFrames: next,
    });
  };

  useEffect(() => {
    if (!selectedArrowId && !drawingTools.state.selectedShapeId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (selectedArrowId) {
        updateArrows(prev => prev.filter(arrow => arrow.id !== selectedArrowId));
        setSelectedArrowId(null);
      } else if (drawingTools.state.selectedShapeId) {
        drawingTools.deleteShape(drawingTools.state.selectedShapeId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedArrowId, drawingTools.state.selectedShapeId, drawingTools]);

  const pitchPlayers = frames[currentFrameIndex] ?? [];
  const ball = ballFrames[currentFrameIndex] ?? { x: 50, y: 75 };
  const updatePitchPlayers = (updater: PitchPlayer[] | ((prev: PitchPlayer[]) => PitchPlayer[])) => {
    let next: PitchPlayer[][] = frames;
    setFrames(prev => {
      next = [...prev];
      const current = next[currentFrameIndex] ?? [];
      next[currentFrameIndex] = typeof updater === 'function' ? (updater as (prev: PitchPlayer[]) => PitchPlayer[])(current) : updater;
      return next;
    });

    // Registrar cambio en el historial (fuera del updater)
    pushState({
      squadList: squad,
      usersList: [],
      personalList: [],
      competitionTeams: [],
      clubesList: [],
      campogramasList: [],
      eventsList: [],
      frames: next,
      arrowFrames,
      ballFrames,
    });
  };

  const skipFormationResetRef = useRef(false);
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
  const shapeDraggingId = useRef<string | null>(null);
  const shapeDraggingStart = useRef({ x: 0, y: 0 });
  const shapeDragged = useRef(false);
  const resizeHandleRef = useRef<string | null>(null);
  const resizeStartRef = useRef({ x: 0, y: 0 });
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
    if (skipFormationResetRef.current) {
      skipFormationResetRef.current = false;
      return;
    }
    const myTeam = buildTeamPlayers(myFormation, 'my');
    const rivalTeam = buildTeamPlayers(rivalFormation, 'rival');
    setFrames([[...myTeam, ...rivalTeam]]);
    setBallFrames([{ x: 50, y: 75 }]);
    setArrowFrames([[]]);
    setShapeFrames([[]]);
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

  const handleSelectTool = useCallback((tool: DrawingToolType | null) => {
    drawingTools.setTool(tool);
  }, [drawingTools]);

  const handleShapePointerDown = useCallback((e: React.PointerEvent, shapeId: string) => {
    // El conector se maneja pulsando sobre los jugadores, no sobre formas;
    // en cualquier otro caso, un clic directo sobre una forma existente
    // siempre debe poder arrastrarla, tenga o no una herramienta activa.
    if (drawingTools.state.tool === 'connector' || !pitchRef.current) return;
    e.stopPropagation();
    const rect = pitchRef.current.getBoundingClientRect();
    shapeDraggingId.current = shapeId;
    shapeDraggingStart.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
    document.body.style.cursor = 'grab';
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [drawingTools.state.tool]);

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

    // Manejar CONECTOR: permitir seleccionar jugadores para conectar
    if (drawingTools.state.tool === 'connector' && !is3DView) {
      const player = pitchPlayers.find(p => p.id === id);
      if (player) {
        event.stopPropagation();
        drawingTools.addConnectorPlayer(player.id, player.x, player.y);
        document.body.style.cursor = 'pointer';
        return;
      }
    }

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

    event.preventDefault();
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
  }, [clearPitchSelection, drawingMode, drawingTools, getPitchPercentPoint, isPlaying, is3DView, pitchPlayers, selectedPitchIds]);

  const handlePitchPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId.current || isPlaying || is3DView) return;

    const isClickOnSvgElement = (e.target as any)?.tagName?.toLowerCase() === 'g' ||
                                 (e.target as any)?.tagName?.toLowerCase() === 'line' ||
                                 (e.target as any)?.tagName?.toLowerCase() === 'polygon';

    const start = getPitchPercentPoint(e.clientX, e.clientY);
    if (!start) return;

    // Manejo de herramientas de dibujo
    if (drawingTools.state.tool && e.target === e.currentTarget) {
      drawingTools.startDrawing(start);
      document.body.style.cursor = 'crosshair';
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

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
  }, [getPitchPercentPoint, isPlaying, is3DView, drawingMode, getArrowAtPoint, drawingTools]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (shapeDraggingId.current && pitchRef.current) {
        const rect = pitchRef.current.getBoundingClientRect();
        const currentX = ((event.clientX - rect.left) / rect.width) * 100;
        const currentY = ((event.clientY - rect.top) / rect.height) * 100;

        const dx = currentX - shapeDraggingStart.current.x;
        const dy = currentY - shapeDraggingStart.current.y;

        // Detectar si hay movimiento significativo (más de 2 pixels)
        if (!shapeDragged.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
          shapeDragged.current = true;
        }

        if (shapeDragged.current) {
          drawingTools.moveShape(shapeDraggingId.current, dx, dy);
          shapeDraggingStart.current = { x: currentX, y: currentY };
          document.body.style.cursor = 'grabbing';
        }
        return;
      }

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
      // Manejo de herramientas de dibujo
      if (drawingTools.state.isDrawing && pitchRef.current) {
        const rect = pitchRef.current.getBoundingClientRect();
        const currentX = ((event.clientX - rect.left) / rect.width) * 100;
        const currentY = ((event.clientY - rect.top) / rect.height) * 100;
        drawingTools.continueDrawing({ x: currentX, y: currentY });
        return;
      }

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

      if (shapeDraggingId.current) {
        const shapeId = shapeDraggingId.current;
        if (!shapeDragged.current) {
          // Si no hubo drag, solo seleccionar la forma
          drawingTools.selectShape(shapeId);
        }
        shapeDraggingId.current = null;
        shapeDragged.current = false;
        document.body.style.cursor = '';
        return;
      }

      // Finalizar dibujo
      if (drawingTools.state.isDrawing) {
        drawingTools.finishDrawing();
        document.body.style.cursor = '';
        return;
      }

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
  }, [clampPitchPlayerPosition, clearPitchSelection, getPlayerBounds, pitchPlayers, rectIntersects, selectPitchIds, isDrawingArrow, drawStart, arrowColor, draggingArrowId, draggingBall, ball, drawingTools]);

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
    setSelectedPitchIds([pitchId]);
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

  const linkedBoardLoadedRef = useRef(false);

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

  useEffect(() => {
    if (!selectedMyTeamId) {
      setCarpetas([]);
      setSelectedCarpetaId('');
      return;
    }
    setIsLoadingCarpetas(true);
    let cancelled = false;

    (async () => {
      try {
        const rows = await pizarrasCarpetasService.list({ equipo_id: selectedMyTeamId });
        if (!cancelled) {
          setCarpetas([...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('No se pudieron cargar las carpetas de pizarras', err);
          setCarpetas([]);
        }
      } finally {
        if (!cancelled) setIsLoadingCarpetas(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedMyTeamId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu="carpeta"]')) setShowCarpetaMenu(false);
      if (!target.closest('[data-menu="board"]')) setShowBoardMenu(false);
    };
    if (showCarpetaMenu || showBoardMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCarpetaMenu, showBoardMenu]);

  const refreshCarpetas = useCallback(async () => {
    if (!selectedMyTeamId) {
      setCarpetas([]);
      return;
    }
    setIsLoadingCarpetas(true);
    try {
      const rows = await pizarrasCarpetasService.list({ equipo_id: selectedMyTeamId });
      setCarpetas([...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    } catch (err) {
      console.error('No se pudieron cargar las carpetas de pizarras', err);
      setCarpetas([]);
    } finally {
      setIsLoadingCarpetas(false);
    }
  }, [selectedMyTeamId]);

  const handleNewCarpeta = async () => {
    if (!selectedMyTeamId) {
      alert('Selecciona primero "Mi equipo" para poder crear una carpeta.');
      return;
    }
    const nombre = window.prompt('Nombre de la nueva carpeta:')?.trim();
    if (!nombre) return;

    try {
      const created = await pizarrasCarpetasService.create({ equipo_id: selectedMyTeamId, nombre });
      setSelectedCarpetaId(created.id);
      await refreshCarpetas();
    } catch (err) {
      console.error('No se pudo crear la carpeta', err);
      alert('No se pudo crear la carpeta. Puede que ya exista una con ese nombre.');
    }
  };

  const handleDeleteCarpeta = async () => {
    if (!selectedCarpetaId) return;
    const carpeta = carpetas.find(c => c.id === selectedCarpetaId);
    if (!carpeta) return;
    if (!window.confirm(`¿Eliminar la carpeta "${carpeta.nombre}"? Las pizarras que contiene no se borrarán, quedarán sin carpeta.`)) return;
    try {
      await pizarrasCarpetasService.remove(carpeta.id);
      setSelectedCarpetaId('');
      await refreshCarpetas();
      await refreshSavedBoards();
    } catch (err) {
      console.error('No se pudo eliminar la carpeta', err);
      alert('No se pudo eliminar la carpeta. Inténtalo de nuevo.');
    }
  };

  const handleNewBoard = () => {
    const nombre = window.prompt('Nombre de la nueva pizarra:')?.trim();
    if (!nombre) return;

    if (!selectedMyTeamId) {
      alert('Selecciona primero "Mi equipo" para poder crear una pizarra.');
      return;
    }

    setNewBoardModal({ nombre, carpetaId: selectedCarpetaId });
  };

  const handleConfirmNewBoard = async () => {
    if (!newBoardModal || !selectedMyTeamId) return;
    const { nombre, carpetaId } = newBoardModal;

    const newFrames = [[...buildTeamPlayers(myFormation, 'my'), ...buildTeamPlayers(rivalFormation, 'rival')]];
    const newBallFrames = [{ x: 50, y: 75 }];
    const newArrowFrames = [[]];
    const newShapeFrames = [[]];
    const datos = {
      frames: newFrames,
      arrowFrames: newArrowFrames,
      shapeFrames: newShapeFrames,
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
      campoTipo,
    };

    setIsSavingBoard(true);
    try {
      const created = await pizarrasService.create({
        equipo_id: selectedMyTeamId,
        nombre,
        formacion: myFormation,
        posiciones: [],
        carpeta_id: carpetaId || null,
        partido_id: linkedParams?.partidoId ?? null,
        seccion: linkedParams?.seccion ?? null,
        datos,
      });
      setSelectedCarpetaId(carpetaId);
      setSelectedBoardId(created.id);
      setArrowFrames(newArrowFrames);
      setShapeFrames(newShapeFrames);
      setBallFrames(newBallFrames);
      setSelectedArrowId(null);
      clearPitchSelection();
      setCurrentFrameIndex(0);
      setFrames(newFrames);
      await refreshSavedBoards();
      setNewBoardModal(null);
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

    // En el flujo de Plan de Partido, la pizarra queda vinculada a un partido+sección:
    // se actualiza directamente sin pedir nombre para no crear duplicados.
    const nombre = linkedParams
      ? (currentBoard?.nombre ?? `Plan de partido · ${PLAN_PARTIDO_SECTION_LABELS[linkedParams.seccion] || linkedParams.seccion}`)
      : window.prompt('Nombre de la pizarra:', currentBoard?.nombre ?? '')?.trim();
    if (!nombre) return;

    const datos = {
      frames,
      arrowFrames,
      shapeFrames,
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
      campoTipo,
    };

    setIsSavingBoard(true);
    try {
      if (currentBoard) {
        const updated = await pizarrasService.update(currentBoard.id, {
          nombre,
          formacion: myFormation,
          carpeta_id: selectedCarpetaId || null,
          datos,
        });
        setSelectedBoardId(updated.id);
      } else {
        const created = await pizarrasService.create({
          equipo_id: selectedMyTeamId,
          nombre,
          formacion: myFormation,
          posiciones: [],
          carpeta_id: selectedCarpetaId || null,
          partido_id: linkedParams?.partidoId ?? null,
          seccion: linkedParams?.seccion ?? null,
          datos,
        });
        setSelectedBoardId(created.id);
        linkedBoardLoadedRef.current = true;
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
    setSelectedCarpetaId(board.carpeta_id ?? '');
    const datos = (board.datos ?? {}) as Record<string, any>;

    if (Array.isArray(datos.frames) && datos.frames.length) setFrames(datos.frames);
    setCurrentFrameIndex(0);
    const loadedFrameCount = Array.isArray(datos.frames) && datos.frames.length ? datos.frames.length : 1;
    if (Array.isArray(datos.arrowFrames) && datos.arrowFrames.length) {
      setArrowFrames(datos.arrowFrames);
    } else {
      const fallbackArrows = Array.isArray(datos.arrows) ? datos.arrows : [];
      setArrowFrames(Array.from({ length: loadedFrameCount }, () => fallbackArrows));
    }
    if (Array.isArray(datos.shapeFrames) && datos.shapeFrames.length) {
      setShapeFrames(datos.shapeFrames);
    } else {
      setShapeFrames(Array.from({ length: loadedFrameCount }, () => []));
    }
    if (Array.isArray(datos.ballFrames) && datos.ballFrames.length) {
      setBallFrames(datos.ballFrames);
    } else {
      const frameCount = Array.isArray(datos.frames) && datos.frames.length ? datos.frames.length : 1;
      const fallbackBall = datos.ball ?? { x: 50, y: 75 };
      setBallFrames(Array.from({ length: frameCount }, () => ({ ...fallbackBall })));
    }
    if ((datos.myFormation && datos.myFormation !== myFormation) || (datos.rivalFormation && datos.rivalFormation !== rivalFormation)) {
      skipFormationResetRef.current = true;
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
    const loadedCampoTipo: 'ataque' | 'defensa' | 'completo' = datos.campoTipo ?? 'completo';
    setCampoTipo(loadedCampoTipo);
    setAbpImageUrl(
      loadedCampoTipo === 'ataque' ? ataqueImage : loadedCampoTipo === 'defensa' ? defensaImage : null
    );
  };

  useEffect(() => {
    if (!linkedParams || linkedBoardLoadedRef.current || isLoadingBoards || !savedBoards.length) return;
    if (linkedParams.isNew) {
      linkedBoardLoadedRef.current = true;
      return;
    }
    const linkedBoard = linkedParams.boardId
      ? savedBoards.find(b => b.id === linkedParams.boardId)
      : savedBoards.find(b => b.partido_id === linkedParams.partidoId && b.seccion === linkedParams.seccion);
    if (linkedBoard) {
      linkedBoardLoadedRef.current = true;
      handleLoadBoard(linkedBoard.id);
    }
  }, [linkedParams, savedBoards, isLoadingBoards]);

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
  const [abpImageUrl, setAbpImageUrl] = useState<string | null>(null);
  const [campoTipo, setCampoTipo] = useState<'ataque' | 'defensa' | 'completo'>('completo');

  useEffect(() => {
    getFFmpeg().catch(err => console.error('Error loading FFmpeg:', err));
  }, []);

  // Configurar botones de CAMPOS
  useEffect(() => {
    const loadAtaqueBtn = document.getElementById('loadAtaque');
    const loadDefensaBtn = document.getElementById('loadDefensa');
    const loadCompletoBtn = document.getElementById('loadCompleto');

    const handleAtaque = () => {
      setAbpImageUrl(ataqueImage);
      setCampoTipo('ataque');
    };
    const handleDefensa = () => {
      setAbpImageUrl(defensaImage);
      setCampoTipo('defensa');
    };
    const handleCompleto = () => {
      setAbpImageUrl(null);
      setCampoTipo('completo');
    };

    if (loadAtaqueBtn) {
      loadAtaqueBtn.addEventListener('click', handleAtaque);
    }
    if (loadDefensaBtn) {
      loadDefensaBtn.addEventListener('click', handleDefensa);
    }
    if (loadCompletoBtn) {
      loadCompletoBtn.addEventListener('click', handleCompleto);
    }

    return () => {
      if (loadAtaqueBtn) loadAtaqueBtn.removeEventListener('click', handleAtaque);
      if (loadDefensaBtn) loadDefensaBtn.removeEventListener('click', handleDefensa);
      if (loadCompletoBtn) loadCompletoBtn.removeEventListener('click', handleCompleto);
    };
  }, [ataqueImage, defensaImage, completoImage]);

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
    <div className="flex h-[calc(100vh-90px)] md:h-[calc(100vh-100px)] overflow-hidden bg-white text-slate-800 dark:bg-[#121212] dark:text-slate-100">
      {linkedParams && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <i className="fa-solid fa-link"></i>
          Plan de Partido · {PLAN_PARTIDO_SECTION_LABELS[linkedParams.seccion] || linkedParams.seccion}
          <button
            type="button"
            onClick={handleSaveBoard}
            disabled={isSavingBoard}
            className="ml-1 flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 hover:bg-white/25 transition-colors normal-case tracking-normal font-bold disabled:opacity-50"
          >
            <i className={`fa-solid ${isSavingBoard ? 'fa-spinner animate-spin' : 'fa-floppy-disk'} text-[10px]`}></i>
            Guardar
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.opener && !window.opener.closed) {
                try {
                  window.opener.dispatchEvent(new Event('focus'));
                } catch {
                  // ignore si el opener es de otro origen
                }
                window.opener.focus();
                window.close();
              } else {
                window.location.href = `/partidos/${linkedParams.partidoId}?tab=${encodeURIComponent('PLAN DE PARTIDO')}`;
              }
            }}
            className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 hover:bg-white/25 transition-colors normal-case tracking-normal font-bold"
          >
            <i className="fa-solid fa-arrow-left text-[10px]"></i>
            Volver
          </button>
        </div>
      )}
      <aside className={`${mobileTeamPanelOpen ? 'flex fixed inset-0 z-60 w-full' : 'hidden'} md:flex md:static md:z-auto md:w-[290px] shrink-0 flex-col border-r border-slate-200 bg-[#f8f9fa] dark:border-white/10 dark:bg-[#121212]`}>
        <div className="flex h-[58px] items-center gap-3 border-b border-slate-200 px-5 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:border-white/10 dark:text-slate-400">
          <i className="fa-solid fa-bars text-[18px]" />
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
          <div className="space-y-5">
              {/* ACCIONES Section */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-2">ACCIONES</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={drawingTools.undo}
                    disabled={drawingTools.historyLength === 0}
                    className="h-8 rounded-md border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <i className="fa-solid fa-undo mr-1.5 text-[10px]" />
                    Deshacer
                  </button>
                  <button
                    onClick={drawingTools.deleteAll}
                    disabled={drawingTools.shapes.length === 0}
                    className="h-8 rounded-md border border-red-200 bg-white text-[10px] font-black uppercase tracking-[0.1em] text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:bg-[#1a1a1a] dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <i className="fa-solid fa-eraser mr-1.5 text-[10px]" />
                    Limpiar
                  </button>
                  <button
                    onClick={() => {
                      if (selectedArrowId) {
                        updateArrows(prev => prev.filter(arrow => arrow.id !== selectedArrowId));
                        setSelectedArrowId(null);
                      } else if (drawingTools.state.selectedShapeId) {
                        drawingTools.deleteShape(drawingTools.state.selectedShapeId);
                      } else if (selectedPitchIds.length > 0) {
                        updatePitchPlayers(prev => prev.filter(p => !selectedPitchIds.includes(p.id)));
                        setSelectedPitchIds([]);
                      }
                    }}
                    disabled={!selectedArrowId && !drawingTools.state.selectedShapeId && selectedPitchIds.length === 0}
                    title="Elimina el elemento seleccionado en el campo"
                    className={`h-8 rounded-md border text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                      !selectedArrowId && !drawingTools.state.selectedShapeId && selectedPitchIds.length === 0
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-slate-500'
                        : 'border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:bg-[#1a1a1a] dark:text-red-400 dark:hover:bg-red-500/10'
                    }`}
                  >
                    <i className="fa-solid fa-trash-can mr-1.5 text-[10px]" />
                    Borrar
                  </button>
                </div>
              </div>

              {/* CAMPOS Section */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-2">CAMPOS</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    id="loadAtaque"
                    className="h-8 rounded-md border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                    type="button"
                    title="Cargar posición de ataque"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5 inline mr-1">
                      <rect x="2" y="3" width="20" height="14" rx="1" ry="1"></rect>
                      <path d="M12 3v14"></path>
                      <path d="M2 10h20"></path>
                      <circle cx="8" cy="8" r="1.5" fill="currentColor"></circle>
                      <circle cx="16" cy="12" r="1.5" fill="currentColor"></circle>
                    </svg>
                    Ataque
                  </button>
                  <button
                    id="loadDefensa"
                    className="h-8 rounded-md border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                    type="button"
                    title="Cargar posición de defensa"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5 inline mr-1">
                      <rect x="2" y="3" width="20" height="14" rx="1" ry="1"></rect>
                      <path d="M12 3v14"></path>
                      <path d="M2 10h20"></path>
                      <circle cx="8" cy="16" r="1.5" fill="currentColor"></circle>
                      <circle cx="16" cy="12" r="1.5" fill="currentColor"></circle>
                    </svg>
                    Defensa
                  </button>
                  <button
                    id="loadCompleto"
                    className="h-8 rounded-md border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                    type="button"
                    title="Cargar campo entero"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5 inline mr-1">
                      <rect x="2" y="3" width="20" height="14" rx="1" ry="1"></rect>
                      <path d="M12 3v14"></path>
                      <path d="M2 10h20"></path>
                      <circle cx="8" cy="8" r="1.5" fill="currentColor"></circle>
                      <circle cx="16" cy="12" r="1.5" fill="currentColor"></circle>
                      <circle cx="8" cy="16" r="1.5" fill="currentColor"></circle>
                      <circle cx="16" cy="8" r="1.5" fill="currentColor"></circle>
                    </svg>
                    Entero
                  </button>
                </div>
              </div>

              {/* Texto (contenido, tamaño y color) — para crear o para editar el seleccionado. Siempre visible, sin depender de acordeones colapsados. */}
              {(() => {
                const isTextTool = ['text', 'callout'].includes(drawingTools.state.tool ?? '');
                const selectedTextShape = shapes.find(
                  s => s.id === drawingTools.state.selectedShapeId && ['text', 'callout'].includes(s.type)
                );
                if (!isTextTool && !selectedTextShape) return null;

                const currentText = selectedTextShape ? (selectedTextShape.text || '') : (drawingTools.state.textDraft ?? '');
                const currentFontSize = selectedTextShape ? (selectedTextShape.fontSize ?? 16) : drawingTools.state.fontSize;
                const currentColor = selectedTextShape ? selectedTextShape.stroke : drawingTools.state.stroke;

                return (
                  <div className="col-span-2 mt-2 pt-3 border-t border-slate-200 dark:border-white/10">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                      {selectedTextShape ? 'Texto seleccionado' : 'Texto'}
                    </label>
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={currentText}
                        onChange={e => {
                          if (selectedTextShape) {
                            drawingTools.updateShapeText(selectedTextShape.id, e.target.value);
                          } else {
                            drawingTools.setTextDraft(e.target.value);
                          }
                        }}
                        placeholder="Escribe el texto..."
                        maxLength={40}
                        autoFocus
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        {TEXT_SIZE_PRESETS.map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              drawingTools.setFontSize(TEXT_SIZE_VALUES[size]);
                              if (selectedTextShape) {
                                drawingTools.updateShapeFontSize(selectedTextShape.id, TEXT_SIZE_VALUES[size]);
                              }
                            }}
                            className={`rounded-lg border py-1.5 text-[10px] font-black uppercase transition-all ${currentFontSize === TEXT_SIZE_VALUES[size] ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'}`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {TEXT_COLOR_PRESETS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              drawingTools.setStroke(c);
                              if (selectedTextShape) {
                                drawingTools.updateShapeStroke(selectedTextShape.id, c);
                              }
                            }}
                            style={{ backgroundColor: c }}
                            className={`h-6 w-6 rounded-full border-2 transition-all ${currentColor === c ? 'border-[var(--accent)] scale-110' : 'border-slate-200 hover:scale-105 dark:border-white/20'}`}
                            aria-label={`Color de texto ${c}`}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Opciones de dibujo (también visible al tener un texto/etiqueta seleccionado) */}
              {(drawingTools.state.tool || shapes.some(
                s => s.id === drawingTools.state.selectedShapeId && ['text', 'callout'].includes(s.type)
              )) && (
                <div className="col-span-2 mt-2 pt-3 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowDrawingOptions(v => !v)}
                    className="mb-2 flex w-full items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    aria-expanded={showDrawingOptions}
                  >
                    <span>Opciones</span>
                    <i className={`fa-solid ${showDrawingOptions ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`} />
                  </button>
                  {showDrawingOptions && (
                  <div>

                  {!['text', 'callout'].includes(drawingTools.state.tool ?? '') && !shapes.some(
                    s => s.id === drawingTools.state.selectedShapeId && ['text', 'callout'].includes(s.type)
                  ) && (
                  <>
                  {/* Color */}
                  <div className="mb-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={drawingTools.state.stroke}
                        onChange={e => drawingTools.setStroke(e.target.value)}
                        className="h-8 w-12 rounded-md border border-slate-200 cursor-pointer dark:border-white/10"
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">{drawingTools.state.stroke}</span>
                    </div>
                  </div>

                  {/* Grosor */}
                  <div className="mb-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                      Grosor: <span className="font-normal">{drawingTools.state.lineWidth}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={drawingTools.state.lineWidth}
                      onChange={e => drawingTools.setLineWidth(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  </>
                  )}

                  {/* Estilo de línea (solo flechas) */}
                  {['arrow', 'arrowStraight'].includes(drawingTools.state.tool ?? '') && (
                    <div className="mb-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                        Estilo de línea
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => drawingTools.setDashed(false)}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-semibold ${!drawingTools.state.dashed ? 'border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-500/10 dark:text-red-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'}`}
                        >
                          <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
                            <line x1="1" y1="5" x2="19" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          Continua
                        </button>
                        <button
                          type="button"
                          onClick={() => drawingTools.setDashed(true)}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-semibold ${drawingTools.state.dashed ? 'border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-500/10 dark:text-red-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'}`}
                        >
                          <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
                            <line x1="1" y1="5" x2="19" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3,2.5" />
                          </svg>
                          Discontinua
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Opacidad */}
                  <div className="mb-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                      Opacidad: <span className="font-normal">{Math.round(drawingTools.state.opacity * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={drawingTools.state.opacity}
                      onChange={e => drawingTools.setOpacity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Focus Style */}
                  {drawingTools.state.tool === 'focus' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                        Estilo Foco
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {['abierto', 'estrecho', 'cilindrico', 'base'].map(style => (
                          <button
                            key={style}
                            onClick={() => drawingTools.setFocusStyle(style as any)}
                            className={`h-8 rounded-md border text-[10px] font-black uppercase transition-all ${
                              drawingTools.state.focusStyle === style
                                ? 'border-blue-400/50 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
                                : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spotlight Style */}
                  {drawingTools.state.tool === 'spotlight' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                        Estilo Light
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['filled', 'outline', 'beams'].map(style => (
                          <button
                            key={style}
                            onClick={() => drawingTools.setSpotlightStyle(style as any)}
                            className={`h-8 rounded-md border text-[10px] font-black uppercase transition-all ${
                              drawingTools.state.spotlightStyle === style
                                ? 'border-blue-400/50 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
                                : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  </div>
                  )}
                </div>
              )}

              {/* HERRAMIENTAS Section */}
              <div className="col-span-2 mt-2 pt-3 border-t border-slate-200 dark:border-white/10 tool-panel">
                <button
                  type="button"
                  onClick={() => setShowDrawingTools(v => !v)}
                  className="mb-2 flex w-full items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  aria-expanded={showDrawingTools}
                >
                  <span>Herramientas</span>
                  <i className={`fa-solid ${showDrawingTools ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`} />
                </button>
                {showDrawingTools && (
                <div className="tool-rail">

                  {/* FLECHAS */}
                  <div className="tool-divider"><span className="tool-divider-dot"></span>FLECHAS</div>
                  <div className="tool-grid">
                    <button
                      type="button"
                      data-tool="arrow"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'arrow' ? null : 'arrow')}
                      className={`tool-button ${drawingTools.state.tool === 'arrow' ? 'is-active' : ''}`}
                      title="Flecha con curva"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 18 Q4 6 18 6"></path>
                        <path d="M14.5 3.5 L18 6 L14.5 8.5"></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      data-tool="arrowStraight"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'arrowStraight' ? null : 'arrowStraight')}
                      className={`tool-button ${drawingTools.state.tool === 'arrowStraight' ? 'is-active' : ''}`}
                      title="Flecha recta"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4.5 16.5c4.5-3.8 8.9-6.3 14.2-6.3"></path>
                        <path d="M15.6 7.4l3.2 2.8-2.2 3.6"></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      data-tool="pen"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'pen' ? null : 'pen')}
                      className={`tool-button ${drawingTools.state.tool === 'pen' ? 'is-active' : ''}`}
                      title="Dibujo libre"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 15 C5 9, 8 9, 11 15 C14 21, 17 21, 21 15" strokeWidth="2" strokeLinecap="round"></path>
                        <path d="M3 10 C5 4, 8 4, 11 10 C14 16, 17 16, 21 10" opacity="0.4" strokeWidth="1.2" strokeLinecap="round"></path>
                      </svg>
                    </button>
                  </div>

                  {/* TEXTOS */}
                  <div className="tool-divider"><span className="tool-divider-dot"></span>TEXTOS</div>
                  <div className="tool-grid tool-grid-2col">
                    <button
                      type="button"
                      data-tool="text"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'text' ? null : 'text')}
                      className={`tool-button ${drawingTools.state.tool === 'text' ? 'is-active' : ''}`}
                      title="Texto"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 8h6"></path>
                        <path d="M8 8v9"></path>
                        <path d="M13.5 15.5c0-1.4 1-2.5 2.5-2.5s2.5 1.1 2.5 2.5v1.8"></path>
                        <path d="M18.5 17.3c-.7.7-1.4 1-2.4 1-1.6 0-2.6-1-2.6-2.3 0-1.2.9-2.1 2.5-2.1h2.4"></path>
                      </svg>
                      <span className="tool-label">Texto</span>
                    </button>
                    <button
                      type="button"
                      data-tool="callout"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'callout' ? null : 'callout')}
                      className={`tool-button ${drawingTools.state.tool === 'callout' ? 'is-active' : ''}`}
                      title="Etiqueta"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 7h8l2 2v7l-6 1.5-4-4V7z"></path>
                        <circle className="solid" cx="14.5" cy="9.5" r="1"></circle>
                      </svg>
                      <span className="tool-label">Etiqueta</span>
                    </button>
                  </div>

                  {/* ZONAS */}
                  <div className="tool-divider"><span className="tool-divider-dot"></span>ZONAS</div>
                  <div className="tool-grid">
                    <button
                      type="button"
                      data-tool="rectangle"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'rectangle' ? null : 'rectangle')}
                      className={`tool-button ${drawingTools.state.tool === 'rectangle' ? 'is-active' : ''}`}
                      title="Rectángulo"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5.5" y="6" width="13" height="10.5" rx="1.5"></rect>
                        <path d="M8 14l2.5-3 2.2 2.4 2.1-2.6 1.7 3.2"></path>
                      </svg>
                      <span className="tool-label">Recta.</span>
                    </button>
                    <button
                      type="button"
                      data-tool="ellipse"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'ellipse' ? null : 'ellipse')}
                      className={`tool-button ${drawingTools.state.tool === 'ellipse' ? 'is-active' : ''}`}
                      title="Círculo"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="5"></circle>
                        <path d="M14.7 14.7L18 18"></path>
                      </svg>
                      <span className="tool-label">Circulo</span>
                    </button>
                    <button
                      type="button"
                      data-tool="zone"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'zone' ? null : 'zone')}
                      className={`tool-button ${drawingTools.state.tool === 'zone' ? 'is-active' : ''}`}
                      title="Zona"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <ellipse cx="12" cy="12" rx="8" ry="4.8"></ellipse>
                        <path d="M12 7.2v9.6"></path>
                        <path d="M13 16.8c2.1-.2 3.9-.7 5.5-1.6"></path>
                      </svg>
                      <span className="tool-label">Zona</span>
                    </button>
                  </div>

                  {/* VARIOS */}
                  <div className="tool-divider"><span className="tool-divider-dot"></span>VARIOS</div>
                  <div className="tool-grid">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedArrowId) {
                          updateArrows(prev => prev.filter(arrow => arrow.id !== selectedArrowId));
                          setSelectedArrowId(null);
                        } else if (drawingTools.state.selectedShapeId) {
                          drawingTools.deleteShape(drawingTools.state.selectedShapeId);
                        }
                      }}
                      className="tool-button"
                      title="Eliminar elemento seleccionado"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 7h14"></path>
                        <path d="M10 11v6"></path>
                        <path d="M14 11v6"></path>
                        <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"></path>
                        <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"></path>
                      </svg>
                      <span className="tool-label">Papelera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedArrowId) {
                          const arrow = arrows.find(a => a.id === selectedArrowId);
                          if (arrow) {
                            const duplicate = { ...arrow, id: `arrow-${Date.now()}-${Math.random()}` };
                            updateArrows(prev => [...prev, duplicate]);
                          }
                        } else if (drawingTools.state.selectedShapeId) {
                          drawingTools.duplicateShape(drawingTools.state.selectedShapeId);
                        }
                      }}
                      className="tool-button"
                      title="Duplicar elemento seleccionado"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="9" width="8" height="8"></rect>
                        <rect x="11" y="5" width="8" height="8"></rect>
                        <path d="M11 9h6v6h-6z" opacity="0.3"></path>
                      </svg>
                      <span className="tool-label">Duplicar</span>
                    </button>
                  </div>
                  <div className="tool-grid">
                    <button
                      type="button"
                      disabled={!drawingTools.state.selectedShapeId}
                      onClick={() => {
                        if (drawingTools.state.selectedShapeId) {
                          drawingTools.bringToFront(drawingTools.state.selectedShapeId);
                        }
                      }}
                      className="tool-button disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Traer al frente"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="4" y="4" width="10" height="10" rx="1.2" opacity="0.35"></rect>
                        <rect x="10" y="10" width="10" height="10" rx="1.2"></rect>
                      </svg>
                      <span className="tool-label">Al frente</span>
                    </button>
                    <button
                      type="button"
                      disabled={!drawingTools.state.selectedShapeId}
                      onClick={() => {
                        if (drawingTools.state.selectedShapeId) {
                          drawingTools.sendToBack(drawingTools.state.selectedShapeId);
                        }
                      }}
                      className="tool-button disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Enviar atrás"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="10" y="10" width="10" height="10" rx="1.2" opacity="0.35"></rect>
                        <rect x="4" y="4" width="10" height="10" rx="1.2"></rect>
                      </svg>
                      <span className="tool-label">Atrás</span>
                    </button>
                  </div>
                  <div className="tool-grid tool-grid-2col">
                    <button
                      type="button"
                      data-tool="connector"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'connector' ? null : 'connector')}
                      className={`tool-button ${drawingTools.state.tool === 'connector' ? 'is-active' : ''}`}
                      title="Conector"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="solid" cx="4.5" cy="17" r="2"></circle>
                        <circle className="solid" cx="12" cy="7" r="2"></circle>
                        <circle className="solid" cx="19.5" cy="17" r="2"></circle>
                        <line x1="4.5" y1="17" x2="12" y2="7"></line>
                        <line x1="12" y1="7" x2="19.5" y2="17"></line>
                      </svg>
                      <span className="tool-label">Conector</span>
                    </button>
                    <button
                      type="button"
                      data-tool="tshape"
                      onClick={() => handleSelectTool(drawingTools.state.tool === 'tshape' ? null : 'tshape')}
                      className={`tool-button ${drawingTools.state.tool === 'tshape' ? 'is-active' : ''}`}
                      title="Línea en T"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <line x1="12" y1="3" x2="12" y2="21" strokeWidth="2" strokeLinecap="round"></line>
                        <line x1="6" y1="18" x2="18" y2="18" strokeWidth="2" strokeLinecap="round"></line>
                      </svg>
                      <span className="tool-label">Línea</span>
                    </button>
                  </div>

                </div>
                )}
              </div>

              {/* EXPORTAR Section */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-2">EXPORTAR</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={downloadImage}
                    disabled={isExportingImage}
                    className={`h-8 rounded-md border text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                      isExportingImage
                        ? 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-400'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                    title={isExportingImage ? "Descargando PNG..." : "Descargar captura de la pizarra"}
                  >
                    <i className={`fa-solid ${isExportingImage ? 'fa-spinner' : 'fa-image'} mr-1.5 text-[10px] ${isExportingImage ? 'animate-spin' : ''}`} />
                    {isExportingImage ? 'DESCARGANDO...' : 'Imagen'}
                  </button>
                  <button
                    onClick={downloadVideoAsMP4}
                    disabled={isExportingVideo}
                    className={`h-8 rounded-md border text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                      isExportingVideo
                        ? 'border-blue-500/30 bg-blue-500/15 text-blue-600 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-400'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                    title={isExportingVideo ? "Generando video MP4..." : "Descargar pizarra como video en MP4"}
                  >
                    <i className={`fa-solid ${isExportingVideo ? 'fa-spinner' : 'fa-video'} mr-1.5 text-[10px] ${isExportingVideo ? 'animate-spin' : ''}`} />
                    {isExportingVideo ? 'EXPORTANDO...' : 'Video'}
                  </button>
                </div>
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
              setArrowFrames(prev => [...prev, (prev[currentFrameIndex] ?? []).map(a => ({ ...a }))]);
              setShapeFrames(prev => [...prev, (prev[currentFrameIndex] ?? []).map(s => JSON.parse(JSON.stringify(s)))]);
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
                className="flex h-8 w-[52px] shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-[13px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
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
                setArrowFrames(prev => prev.filter((_, i) => i !== currentFrameIndex));
                setShapeFrames(prev => prev.filter((_, i) => i !== currentFrameIndex));
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
              onClick={handleNewCarpeta}
              className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-black uppercase tracking-[0.12em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
              title="Crear una carpeta nueva para organizar pizarras"
            >
              <i className="fa-solid fa-folder-plus text-[12px]" />
              NUEVA CARPETA
            </button>

            <select
              value={selectedCarpetaId}
              onChange={e => {
                setSelectedCarpetaId(e.target.value);
                setSelectedBoardId('');
              }}
              disabled={isLoadingCarpetas || carpetas.length === 0}
              title="Carpeta donde guardar / desde la que filtrar pizarras"
              className="h-8 max-w-[160px] rounded-md border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-600 outline-none disabled:opacity-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
            >
              <option value="">
                {isLoadingCarpetas ? 'Cargando...' : carpetas.length ? 'Sin carpeta' : 'Sin carpetas'}
              </option>
              {carpetas.map(carpeta => (
                <option key={carpeta.id} value={carpeta.id}>{carpeta.nombre}</option>
              ))}
            </select>

            {selectedCarpetaId && selectedCarpetaId !== SIN_CARPETA_VALUE && (
              <div className="relative" data-menu="carpeta">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setCarpetaMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    setShowCarpetaMenu(!showCarpetaMenu);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                  title="Opciones de carpeta"
                  aria-label="Opciones de carpeta"
                >
                  <i className="fa-solid fa-ellipsis-v text-[12px]" />
                </button>
                {showCarpetaMenu && carpetaMenuPos && createPortal(
                  <div
                    className="fixed w-48 rounded-md border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#1a1a1a] z-50"
                    style={{ top: carpetaMenuPos.top, right: carpetaMenuPos.right }}
                    data-menu="carpeta"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteCarpeta();
                        setShowCarpetaMenu(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-[12px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      <i className="fa-solid fa-trash-can mr-2 text-red-500" />
                      Eliminar carpeta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCarpetaId('');
                        setShowCarpetaMenu(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-[12px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 border-t border-slate-200 dark:border-white/10"
                    >
                      <i className="fa-solid fa-times mr-2" />
                      Deseleccionar
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            )}

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
              disabled={isLoadingBoards || boardsFilteredByCarpeta.length === 0}
              title="Cargar una pizarra guardada"
              className="h-8 max-w-[180px] rounded-md border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-600 outline-none disabled:opacity-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
            >
              <option value="">
                {isLoadingBoards ? 'Cargando...' : boardsFilteredByCarpeta.length ? 'Pizarras guardadas' : 'Sin pizarras guardadas'}
              </option>
              {boardsFilteredByCarpeta.map(board => (
                <option key={board.id} value={board.id}>{board.nombre}</option>
              ))}
            </select>

            {selectedBoardId && (
              <div className="relative" data-menu="board">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setBoardMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    setShowBoardMenu(!showBoardMenu);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                  title="Opciones de pizarra"
                  aria-label="Opciones de pizarra"
                >
                  <i className="fa-solid fa-ellipsis-v text-[12px]" />
                </button>
                {showBoardMenu && boardMenuPos && createPortal(
                  <div
                    className="fixed w-48 rounded-md border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#1a1a1a] z-50"
                    style={{ top: boardMenuPos.top, right: boardMenuPos.right }}
                    data-menu="board"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteBoard();
                        setShowBoardMenu(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-[12px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      <i className="fa-solid fa-trash-can mr-2 text-red-500" />
                      Eliminar pizarra
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBoardId('');
                        setShowBoardMenu(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-[12px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 border-t border-slate-200 dark:border-white/10"
                    >
                      <i className="fa-solid fa-times mr-2" />
                      Deseleccionar
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            )}

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
          </div>
        </div>

        <div className="min-h-0 flex-1 px-4 py-3 md:px-5 flex flex-col">
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
                {showFieldLines && !abpImageUrl && (
                <svg
                  className="absolute inset-0 h-full w-full opacity-95 pointer-events-none"
                  viewBox="0 0 105 68"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={is3DView ? { transform: 'translateZ(5px)' } : undefined}
                >
                  <g fill="none" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="0.16">
                    <rect x="2.73" y="1.77" width="99.54" height="64.46" rx="1" />
                    <line x1="2.73" y1="34" x2="102.27" y2="34" />
                    <circle cx="52.5" cy="34" r="7.82" />
                    <circle cx="52.5" cy="34" r="0.26" fill="#ffffff" stroke="none" />
                    <circle cx="52.5" cy="8.16" r="0.26" fill="#ffffff" stroke="none" />
                    <circle cx="52.5" cy="59.84" r="0.26" fill="#ffffff" stroke="none" />
                    {campoTipo !== 'defensa' && (
                      <>
                        <rect x="38.85" y="1.77" width="27.3" height="7.82" />
                        <rect x="28.35" y="1.77" width="48.3" height="13.94" />
                      </>
                    )}
                    {campoTipo !== 'ataque' && (
                      <>
                        <rect x="38.85" y="58.41" width="27.3" height="7.82" />
                        <rect x="28.35" y="52.29" width="48.3" height="13.94" />
                      </>
                    )}
                  </g>
                </svg>
                )}

                {/* ABP Image Layer */}
                {abpImageUrl && (
                  <img
                    src={abpImageUrl}
                    alt="ABP"
                    className="absolute inset-0 h-full w-full object-cover rounded-[14px] opacity-85 pointer-events-none"
                    style={is3DView ? { transform: 'translateZ(8px)' } : undefined}
                  />
                )}

                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full z-[10]"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={is3DView ? { transform: 'translateZ(10px)' } : undefined}
                >
                  {displayedArrows.map(arrow => {
                    const isSelected = arrow.id === selectedArrowId;
                    const isGhost = arrow._fade !== 'visible';
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
                          if (is3DView || isGhost) return;
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
                        style={{
                          cursor: 'grab',
                          pointerEvents: is3DView || isGhost ? 'none' : 'auto',
                          opacity: arrow._fade === 'visible' ? 1 : 0,
                          transition: `opacity ${FADE_DURATION_MS}ms ease`,
                        }}
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

                  {/* Herramientas de dibujo */}
                  <DrawingShapes
                    shapes={displayedShapes}
                    currentShape={drawingTools.state.currentShape}
                    selectedShapeId={drawingTools.state.selectedShapeId}
                    viewBox="0 0 100 100"
                    fadeDurationMs={FADE_DURATION_MS}
                    onShapeClick={drawingTools.selectShape}
                    onShapePointerDown={handleShapePointerDown}
                    onRotateShape={(id) => drawingTools.rotateShape(id)}
                    onShapeDoubleClick={(id) => {
                      const shape = shapes.find(s => s.id === id);
                      if (!shape) return;
                      const nuevoTexto = window.prompt('Editar texto:', shape.text ?? '');
                      if (nuevoTexto !== null) {
                        drawingTools.updateShapeText(id, nuevoTexto);
                      }
                    }}
                  />

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
                  const isPendingConnector = drawingTools.state.tool === 'connector' && drawingTools.state.pendingConnectorPlayerId === player.id;
                  const isDragging = draggingIds.current.includes(player.id);
                  const isMarkedForDelete = isDragging && dragOutsideField;
                  const displaySize = 40 * playerScale;

                  return (
                    <div
                      key={player.id}
                      className="absolute select-none"
                      draggable={false}
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
                      onDragStart={e => e.preventDefault()}
                      onClick={e => {
                        e.stopPropagation();
                        if (isPlaying) return;
                        if (is3DView) return;
                        if (drawingTools.state.tool) return;
                        if (drawingMode) return;
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
                      <div
                        className={`flex items-center justify-center overflow-hidden rounded-full border-[3px] font-black shadow-lg ${player.number === 1 ? 'text-white' : 'text-white'} ${isPendingConnector ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                        style={{
                          width: displaySize,
                          height: displaySize,
                          backgroundColor: player.color,
                          borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)',
                          borderWidth: isSelected ? '5px' : '3px',
                          boxShadow: isSelected
                            ? `0 0 0 3px #ffffff, ${is3DView
                              ? '0 2px 3px rgba(0,0,0,0.28), inset 0 8px 14px rgba(255,255,255,0.18), inset 0 -8px 14px rgba(0,0,0,0.24)'
                              : isDragging
                                ? '0 14px 24px rgba(0,0,0,0.35)'
                                : '0 8px 18px rgba(0,0,0,0.35)'}`
                            : is3DView
                              ? '0 2px 3px rgba(0,0,0,0.28), inset 0 8px 14px rgba(255,255,255,0.18), inset 0 -8px 14px rgba(0,0,0,0.24)'
                              : isDragging
                                ? '0 14px 24px rgba(0,0,0,0.35)'
                                : '0 8px 18px rgba(0,0,0,0.35)',
                        }}
                      >
                        {showPlayerPhotos && player.playerFotoUrl ? (
                          <img src={player.playerFotoUrl} alt={player.playerName || ''} className="h-full w-full object-cover" draggable={false} />
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
                  <button
                    type="button"
                    onClick={() => setShowPlayersAndFieldsPanel(v => !v)}
                    className="flex w-full items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    aria-expanded={showPlayersAndFieldsPanel}
                  >
                    <span>Jugadores</span>
                    <i className={`fa-solid ${showPlayersAndFieldsPanel ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`} />
                  </button>
                  {showPlayersAndFieldsPanel && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPlayerNumbers(v => !v)}
                      className={`h-8 rounded-md border text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                        showPlayerNumbers
                          ? 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      {showPlayerNumbers ? 'NUM. ON' : 'NUM. OFF'}
                    </button>
                    <button
                      onClick={() => {
                        const nextVisible = !(showMyTeam && showRivalTeam);
                        setShowMyTeam(nextVisible);
                        setShowRivalTeam(nextVisible);
                        setSelectedPitchIds([]);
                        setSelectedSquadPlayerId(null);
                      }}
                      className={`h-8 rounded-md border text-[10px] font-black uppercase tracking-[0.09em] transition-all ${
                        showMyTeam && showRivalTeam
                          ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                          : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'
                      }`}
                    >
                      <i className={`fa-solid ${showMyTeam && showRivalTeam ? 'fa-broom' : 'fa-eye'} mr-1.5 text-[10px]`} />
                      JUGADORES
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayerScale(v => Math.max(0.85, +(v - 0.08).toFixed(2)))}
                      className="h-8 rounded-md border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                      title="Reducir el tamaño de todos los jugadores"
                    >
                      <i className="fa-solid fa-magnifying-glass-minus mr-1.5 text-[10px]" />
                      Menos
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayerScale(v => Math.min(1.45, +(v + 0.08).toFixed(2)))}
                      className="h-8 rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--accent)]"
                      title="Aumentar el tamaño de todos los jugadores"
                    >
                      <i className="fa-solid fa-magnifying-glass-plus mr-1.5 text-[10px]" />
                      Más
                    </button>
                  </div>
                  )}

                  <div className="rounded-md border border-blue-200/50 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                      RIVAL
                    </div>

                    <div className="space-y-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setRivalTeamPanelExpanded(v => !v)}
                        className={`w-full h-10 rounded-md border text-[12px] font-black uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 ${
                          rivalTeamPanelExpanded
                            ? 'border-blue-300/50 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
                            : 'border-blue-200 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-500/20 dark:bg-[#1a1a1a] dark:text-blue-300 dark:hover:bg-blue-500/10'
                        }`}
                      >
                        <i className={`fa-solid ${rivalTeamPanelExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[11px]`} />
                        {rivalTeamPanelExpanded ? 'OCULTAR' : 'MOSTRAR'}
                      </button>

                      {rivalTeamPanelExpanded && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-red-200/50 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                    <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-300">
                      MI EQUIPO
                    </div>

                    <button
                      type="button"
                      onClick={() => setMyTeamPanelExpanded(v => !v)}
                      className={`w-full h-10 rounded-md border text-[12px] font-black uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 mb-3 ${
                        myTeamPanelExpanded
                          ? 'border-red-300/50 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200'
                          : 'border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:bg-[#1a1a1a] dark:text-red-300 dark:hover:bg-red-500/10'
                      }`}
                    >
                      <i className={`fa-solid ${myTeamPanelExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[11px]`} />
                      {myTeamPanelExpanded ? 'OCULTAR' : 'MOSTRAR'}
                    </button>

                    {myTeamPanelExpanded && <div className="space-y-3 mb-3">

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
                    </div>}
                  </div>
                </div>
              </div>

            </aside>
          </div>
        </div>
      </main>

      {newBoardModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]">
            <h3 className="mb-3 text-[13px] font-black uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200">
              ¿En qué carpeta quieres guardar "{newBoardModal.nombre}"?
            </h3>
            <select
              value={newBoardModal.carpetaId}
              onChange={e => setNewBoardModal(prev => (prev ? { ...prev, carpetaId: e.target.value } : prev))}
              className="mb-4 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-600 outline-none dark:border-white/10 dark:bg-[#121212] dark:text-slate-300"
              autoFocus
            >
              <option value="">Sin carpeta</option>
              {carpetas.map(carpeta => (
                <option key={carpeta.id} value={carpeta.id}>{carpeta.nombre}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewBoardModal(null)}
                disabled={isSavingBoard}
                className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmNewBoard}
                disabled={isSavingBoard}
                className="h-8 rounded-md border border-blue-200 bg-blue-600 px-3 text-[12px] font-black uppercase tracking-[0.1em] text-white hover:bg-blue-700 disabled:opacity-50 dark:border-blue-500/20"
              >
                {isSavingBoard ? 'Creando...' : 'Crear pizarra'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PizarraTactica;

