import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { DesignerItem, Exercise } from '../types';
import { getDesignerItemAnimationClass } from '../types';
import { renderThumbnail } from '../utils/renderThumbnail';
import type { TrainingTask } from '@modules/repositorio-tareas';
import { db } from '@shared/services/dataService';
import SlalomPoleIcon from '@shared/components/SlalomPoleIcon';
import SoccerBallIcon from '@shared/components/SoccerBallIcon';
import type { Player } from '@modules/plantilla';

const RESIZABLE_DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  zone: { width: 15, height: 15 },
  goal: { width: 16, height: 8 },
};

const FIELD_BACKGROUND = {
  backgroundColor: '#315b31',
  backgroundImage: [
    'radial-gradient(circle at 50% 48%, rgba(117, 166, 99, 0.20) 0%, rgba(80, 121, 73, 0.12) 42%, rgba(18, 30, 18, 0.34) 100%)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.020) 0 56px, rgba(0, 0, 0, 0.045) 56px 112px)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.010) 0 2px, transparent 2px 128px)',
  ].join(', '),
  backgroundBlendMode: 'soft-light, multiply, normal',
} as const;

const PLAYER_TOOL_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#111111',
];

const TEXT_COLORS = [
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

type SizePreset = 'S' | 'M' | 'L' | 'XL';

const SIZE_PRESETS: SizePreset[] = ['S', 'M', 'L', 'XL'];
const TEXT_SIZES: Record<SizePreset, number> = { S: 16, M: 22, L: 30, XL: 42 };
const ELEMENT_SCALES: Record<SizePreset, number> = { S: 0.75, M: 1, L: 1.3, XL: 1.6 };
const PITCH_3D_ROTATION_DEG = 40;
const PLAYER_3D_BILLBOARD_TRANSFORM = `rotateX(-${PITCH_3D_ROTATION_DEG}deg)`;
const GOAL_3D_HEIGHT_PX = 58;
const GOAL_3D_BACK_HEIGHT_PX = 38;
const GOAL_3D_TUBE_PX = 5;

/** Color de las fichas colocadas a partir de un jugador real de la plantilla (distinto de la paleta genérica). */
const SQUAD_PLAYER_COLOR = '#1d4ed8';

interface ExerciseDesignerProps {
  /** Plantilla de jugadores reales del club activo (p.ej. Escuela Huesca), para poder colocarlos en el diseñador */
  squad?: Player[];
}

const ExerciseDesigner: React.FC<ExerciseDesignerProps> = ({ squad = [] }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // Tarea a preseleccionar al llegar desde el Repositorio de Tareas (creación rápida de una tarea nueva)
  const incomingSelectTaskIdRef = useRef<string | null>((location.state as any)?.selectTaskId ?? null);
  const fromSessionCreationRef = useRef<boolean>((location.state as any)?.fromSessionCreation ?? false);
  const returnEventIdRef = useRef<string | null>((location.state as any)?.returnEventId ?? null);
  const [incomingTaskApplied, setIncomingTaskApplied] = useState(false);
  const [frames, setFrames] = useState<DesignerItem[][]>([[]]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [is3DView, setIs3DView] = useState(false);
  const [frameDuration] = useState(2000);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  /** Tras guardar una tarea creada desde una sesión, mostramos un banner persistente
   * con un botón explícito para volver, en vez de redirigir automáticamente. */
  const [showReturnToSessionBanner, setShowReturnToSessionBanner] = useState(false);
  const [activeProject, setActiveProject] = useState('NUEVO EJERCICIO TÁCTICO');
  const [tasks, setTasks] = useState<Array<{ id: string; name: string; type: 'Juego' | 'Posesión' | 'Finalización'; designerSnapshot?: DesignerItem[]; fieldStructure?: string }>>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingDimensionItemId, setEditingDimensionItemId] = useState<string | null>(null);
  const [editingDimensionType, setEditingDimensionType] = useState<'width' | 'height' | null>(null);
  const historyRef = useRef<Array<{ frames: DesignerItem[][]; index: number }>>([]);
  const pendingHistoryRef = useRef<{ frames: DesignerItem[][]; index: number } | null>(null);
  const [historyCount, setHistoryCount] = useState(0);

  // Cargar tareas guardadas del repositorio
  const loadSavedTasks = useCallback(async () => {
    try {
      const { data } = await db.task_templates.get();
      if (data && data.length > 0) {
        const mapped = (data as TrainingTask[]).map(t => ({
          id: t.id,
          name: t.name,
          type: (['Juego', 'Posesión', 'Finalización'].includes(t.category) ? t.category : 'Juego') as 'Juego' | 'Posesión' | 'Finalización',
          designerSnapshot: t.designerSnapshot || [],
          fieldStructure: t.fieldStructure,
        }));
        setTasks(mapped);
      }
    } catch (err) {
      console.error('Error cargando tareas:', err);
    }
  }, []);

  useEffect(() => {
    loadSavedTasks();
  }, [loadSavedTasks]);

  useEffect(() => {
    const loadLastExercise = async () => {
      // Si venimos de crear una tarea nueva, no pisamos el canvas con el último desarrollo guardado
      if (incomingSelectTaskIdRef.current) return;
      const { data } = await db.exercises.get();
      if (data && data.length > 0) {
        const latest = data.sort((a: any, b: any) => 
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        )[0];
        setFrames(latest.frames);
        setActiveProject(latest.title);
      }
    };
    loadLastExercise();
  }, []);

  const items = frames[currentFrameIndex];
  const modeLabel = is3DView ? 'Vista 3D' : 'Normal';

  const cloneFrames = (value: DesignerItem[][]) => value.map(frame => frame.map(item => ({ ...item })));

  const pushHistoryNow = () => {
    historyRef.current.push({ frames: cloneFrames(frames), index: currentFrameIndex });
    setHistoryCount(historyRef.current.length);
  };

  const beginHistorySnapshot = () => {
    if (!pendingHistoryRef.current) {
      pendingHistoryRef.current = { frames: cloneFrames(frames), index: currentFrameIndex };
    }
  };

  const commitHistorySnapshot = () => {
    if (!pendingHistoryRef.current) return;
    historyRef.current.push(pendingHistoryRef.current);
    pendingHistoryRef.current = null;
    setHistoryCount(historyRef.current.length);
  };

  const handleUndo = () => {
    const last = historyRef.current.pop();
    if (!last) return;
    setHistoryCount(historyRef.current.length);
    setFrames(last.frames);
    setCurrentFrameIndex(last.index);
  };
  
  const updateFrames = (newItems: DesignerItem[] | ((prev: DesignerItem[]) => DesignerItem[])) => {
    setFrames(prev => {
      const next = [...prev];
      if (typeof newItems === 'function') {
        next[currentFrameIndex] = newItems(next[currentFrameIndex]);
      } else {
        next[currentFrameIndex] = newItems;
      }
      return next;
    });
  };

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedIds([]);
    setIsSelectedPanelOpen(false);
  }, []);

  const selectSingleItem = useCallback((id: string) => {
    setSelectedId(id);
    setSelectedIds([id]);
    setIsSelectedPanelOpen(true);
  }, []);

  const selectItemOnly = useCallback((id: string) => {
    setSelectedId(id);
    setSelectedIds([id]);
  }, []);

  const selectItemIds = useCallback((ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));
    setSelectedIds(uniqueIds);
    setSelectedId(uniqueIds[0] ?? null);
    setIsSelectedPanelOpen(uniqueIds.length === 1);
  }, []);

  const getPitchPercentPoint = useCallback((clientX: number, clientY: number) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
    return {
      x: clampPercent(((clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((clientY - rect.top) / rect.height) * 100),
    };
  }, []);

  const getItemBounds = useCallback((item: DesignerItem) => {
    const scale = item.scale || 1;
    const isBigItem = item.type === 'zone' || item.type === 'goal';
    const width = isBigItem ? (item.width || RESIZABLE_DEFAULT_SIZES[item.type]?.width || 12) : 7.5;
    const height = isBigItem ? (item.height || RESIZABLE_DEFAULT_SIZES[item.type]?.height || 12) : 7.5;
    const adjustedWidth = width * (isBigItem ? 1 : scale);
    const adjustedHeight = height * (isBigItem ? 1 : scale);
    return {
      left: item.x - adjustedWidth / 2,
      right: item.x + adjustedWidth / 2,
      top: item.y - adjustedHeight / 2,
      bottom: item.y + adjustedHeight / 2,
    };
  }, []);

  const rectIntersects = (
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number }
  ) => !(b.left > a.right || b.right < a.left || b.top > a.bottom || b.bottom < a.top);

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectedPanelOpen, setIsSelectedPanelOpen] = useState(false);
  const [activeStructure, setActiveStructure] = useState('campo-total');
  const [showPlayerNumbers, setShowPlayerNumbers] = useState(true);
  const [orientationModeEnabled, setOrientationModeEnabled] = useState(false);
  const [playerSource, setPlayerSource] = useState<'generico' | 'plantilla'>('generico');
  const [playerSize, setPlayerSize] = useState<SizePreset>('M');
  const [coneSize, setConeSize] = useState<SizePreset>('M');
  const [materialSize, setMaterialSize] = useState<SizePreset>('M');
  const [textDraft, setTextDraft] = useState('Texto');
  const [textSize, setTextSize] = useState<SizePreset>('M');
  const [textColor, setTextColor] = useState('#ffffff');
  
  const [showStructure, setShowStructure] = useState(true);
  const [showPlayers, setShowPlayers] = useState(true);
  const [showCones, setShowCones] = useState(true);
  const [showText, setShowText] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [showMaterial, setShowMaterial] = useState(true);
  const [arrowColor, setArrowColor] = useState('#ffffff');
  const [arrowStrokeWidth, setArrowStrokeWidth] = useState(0.3);
  
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [initialResizeData, setInitialResizeData] = useState({ x: 0, y: 0, w: 0, h: 0, itemX: 0, itemY: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Refs for high-performance drag (avoid state re-renders during movement)
  const draggingRef = useRef<string | null>(null);
  const draggingIdsRef = useRef<string[]>([]);
  const dragStartPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const hasDragged = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartPercentRef = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);
  const itemsRef = useRef<DesignerItem[]>([]);
  const selectionRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const selectionBoxRef = useRef<null | { left: number; top: number; right: number; bottom: number }>(null);
  const suppressBackgroundClicksUntilRef = useRef(0);
  const SUPPRESS_BACKGROUND_CLICK_MS = 400;
  const DRAG_THRESHOLD = 3;
  const MIN_ZONE_SIZE = 4;

  // Dibujo de una zona (rectángulo) siguiendo el arrastre del ratón, en vez de un tamaño fijo
  const zoneCreationRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const zoneCreationBoxRef = useRef<null | { left: number; top: number; right: number; bottom: number }>(null);
  const [zoneCreationBox, setZoneCreationBox] = useState<null | { left: number; top: number; right: number; bottom: number }>(null);

  // Dibujo de flechas (línea desde punto A a punto B)
  const arrowCreationRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [arrowCreationLine, setArrowCreationLine] = useState<null | { startX: number; startY: number; endX: number; endY: number }>(null);

  // Al activar una herramienta de colocación (jugador, cono, etc.) cerramos el panel de edición
  // del elemento seleccionado: si no, su overlay (hasta 520px de ancho) queda flotando sobre el
  // campo interceptando los clics y el usuario no puede colocar nada en esa zona sin saber por qué.
  useEffect(() => {
    if (selectedTool) {
      setIsSelectedPanelOpen(false);
    }
  }, [selectedTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      clearSelection();
      setSelectedTool(null);
      setSelectionBox(null);
      selectionRef.current = null;
      setZoneCreationBox(null);
      zoneCreationRef.current = null;
      zoneCreationBoxRef.current = null;
      setResizingId(null);
      setResizeHandle(null);

      draggingRef.current = null;
      draggingIdsRef.current = [];
      setDraggingId(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (resizingId || draggingId) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`[data-item-root="${selectedId}"]`)) return;
      if (target.closest('[data-resize-handle="true"]')) return;
      if (target.closest('[data-edit-button="true"]')) return;
      if (target.closest('[data-selected-panel="true"]')) return;
      clearSelection();
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [selectedId, resizingId, draggingId, clearSelection]);

  const tools = {
    jugadores: Array.from({ length: 11 }, (_, index) => {
      const number = index + 1;
      return {
        id: `player-${number}`,
        number,
        color: PLAYER_TOOL_COLORS[index],
      };
    }),
    conos: [
      { id: 'cone-red', color: '#ef4444', label: 'ROJO' },
      { id: 'cone-blue', color: '#3b82f6', label: 'AZUL' },
      { id: 'cone-green', color: '#22c55e', label: 'VERDE' },
      { id: 'cone-black', color: '#111111', label: 'NEGRO' },
    ],
    anotacion: [
      { id: 'text', label: 'TEXTO', icon: 'fa-t' },
    ],
    flechas: [
      { id: 'arrow-straight-solid', label: 'RECTA CONTINUA', icon: 'fa-arrow-right', style: 'solid', curve: false },
      { id: 'arrow-straight-dashed', label: 'RECTA DISCONTINUA', icon: 'fa-arrow-right', style: 'dashed', curve: false },
      { id: 'arrow-curve-solid', label: 'CURVA CONTINUA', icon: 'fa-arrow-up-right', style: 'solid', curve: true },
      { id: 'arrow-curve-dashed', label: 'CURVA DISCONTINUA', icon: 'fa-arrow-up-right', style: 'dashed', curve: true },
    ],
    material: [
      { id: 'ball', label: 'BALÓN', icon: 'fa-futbol' },
      { id: 'ladder', label: 'ESCALERA', icon: 'fa-border-all' },
      { id: 'fence', label: 'VALLA', icon: 'fa-grip-lines-vertical' },
      { id: 'goal', label: 'PORTERÍA', icon: 'fa-door-open' },
      { id: 'zone', label: 'ZONA', icon: 'fa-square' },
      { id: 'slalom', label: 'CONO', icon: 'fa-location-dot' },
    ]
  };

  /** Deep-clone de items del canvas para evitar referencias compartidas */
  const deepCloneItems = (items: DesignerItem[]): DesignerItem[] => {
    if (!items || items.length === 0) return [];
    return JSON.parse(JSON.stringify(items));
  };

  /** Persistir snapshot (y miniatura) de una tarea en la DB. */
  const persistTaskSnapshot = async (taskId: string, snapshot: DesignerItem[], thumbnail?: string, structure?: string) => {
    try {
      const { data } = await db.task_templates.get();
      if (!data) return;
      const existing = (data as TrainingTask[]).find(t => t.id === taskId);
      if (existing) {
        await db.task_templates.upsert({
          ...existing,
          designerSnapshot: snapshot,
          fieldStructure: structure as TrainingTask['fieldStructure'],
          ...(thumbnail ? { thumbnail } : {}),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error persistiendo snapshot:', err);
    }
  };

  /** Auto-guardar la tarea activa actual antes de cambiar */
  const autoSaveActiveTask = async () => {
    if (!activeTaskId) return;
    const snapshot = deepCloneItems(frames[currentFrameIndex]);
    const thumbnail = renderThumbnail(snapshot, activeStructure);
    setTasks(prev => prev.map(t => t.id === activeTaskId ? { ...t, designerSnapshot: snapshot, fieldStructure: activeStructure } : t));
    await persistTaskSnapshot(activeTaskId, snapshot, thumbnail, activeStructure);
  };

  /** Seleccionar una tarea y cargar su snapshot en el canvas */
  const handleSelectTask = (task: { id: string; name: string; type: 'Juego' | 'Posesión' | 'Finalización'; designerSnapshot?: DesignerItem[]; fieldStructure?: string }) => {
    // Si ya estamos en esta tarea, auto-guardar y deseleccionar
    if (activeTaskId === task.id) {
      autoSaveActiveTask();
      setActiveTaskId(null);
      pushHistoryNow();
      setFrames([[]]);
      setCurrentFrameIndex(0);
      setActiveStructure('campo-total');
      setSaveStatus('TAREA GUARDADA');
      setTimeout(() => setSaveStatus(null), 2000);
      return;
    }
    // Si hay otra tarea activa, auto-guardar antes de cambiar
    if (activeTaskId) {
      autoSaveActiveTask();
    }
    pushHistoryNow();
    setActiveTaskId(task.id);
    // Cargar snapshot en el canvas (deep-clone)
    const snapshot = deepCloneItems(task.designerSnapshot || []);
    setFrames([snapshot]);
    setCurrentFrameIndex(0);
    setActiveStructure(task.fieldStructure || 'campo-total');
  };

  /** Al llegar desde el Repositorio de Tareas tras crear una tarea, abrir ya el diseñador sobre esa tarea */
  useEffect(() => {
    if (incomingTaskApplied) return;
    const targetId = incomingSelectTaskIdRef.current;
    if (!targetId || tasks.length === 0) return;
    const target = tasks.find(t => t.id === targetId);
    if (!target) return;
    handleSelectTask(target);
    setActiveProject(target.name);
    setIncomingTaskApplied(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [tasks, incomingTaskApplied, handleSelectTask, navigate, location.pathname]);

  /** Guardar los cambios del canvas de vuelta a la tarea activa */
  const handleSaveActiveTask = async (options?: { showToast?: boolean }) => {
    if (!activeTaskId) return;
    const snapshot = deepCloneItems(frames[currentFrameIndex]);
    const thumbnail = renderThumbnail(snapshot, activeStructure);
    setTasks(prev => prev.map(t => t.id === activeTaskId ? { ...t, designerSnapshot: snapshot, fieldStructure: activeStructure } : t));
    await persistTaskSnapshot(activeTaskId, snapshot, thumbnail, activeStructure);
    if (options?.showToast !== false) {
      setSaveStatus('TAREA GUARDADA');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const handleSaveDevelopment = async () => {
    setSaveStatus("GUARDANDO DESARROLLO...");
    const exercise: Exercise = {
      id: 'current_working_exercise',
      title: activeProject,
      frames: frames,
      lastModified: new Date().toISOString()
    };
    
    try {
      await db.exercises.upsert(exercise);
      setSaveStatus("DESARROLLO GUARDADO CON ÉXITO");
    } catch (err) {
      setSaveStatus("ERROR AL GUARDAR");
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  useEffect(() => {
    (window as any).saveCurrentExercise = handleSaveDevelopment;
    return () => { delete (window as any).saveCurrentExercise; };
  }, [frames, activeProject]);

  useEffect(() => {
    if (!activeTaskId) return;
    const autoSaveInterval = setInterval(() => {
      autoSaveActiveTask();
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [activeTaskId, frames, currentFrameIndex]);

  /** Guardar: si hay una tarea activa se guarda su snapshot, si no se guarda el desarrollo libre.
   * Si venimos de crear una tarea desde una sesión, al guardar volvemos directamente a la sesión.
   */
  const handleSaveClick = async () => {
    if (activeTaskId) {
      if (fromSessionCreationRef.current) {
        await handleSaveActiveTask({ showToast: false });
        console.log('Tarea guardada. ID:', activeTaskId);
        handleReturnToSession();
      } else {
        await handleSaveActiveTask();
      }
    } else {
      handleSaveDevelopment();
    }
  };

  /** Volver a la sesión de origen tras confirmar el guardado desde el banner */
  const handleReturnToSession = () => {
    navigate('/sesiones', {
      state: { newTaskId: activeTaskId, openEventId: returnEventIdRef.current },
    });
  };

  /** Volver al repositorio de tareas o a la sesión, guardando antes los cambios de la tarea activa */
  const handleBackClick = async () => {
    if (activeTaskId) {
      await autoSaveActiveTask();
      console.log('Auto-guardada la tarea:', activeTaskId);
    }
    if (fromSessionCreationRef.current) {
      console.log('Volviendo a la sesión con newTaskId:', activeTaskId, 'openEventId:', returnEventIdRef.current);
      navigate('/sesiones', {
        state: activeTaskId
          ? { newTaskId: activeTaskId, openEventId: returnEventIdRef.current }
          : { openEventId: returnEventIdRef.current },
      });
    } else {
      navigate('/repositorio-tareas', { state: activeTaskId ? { openTaskId: activeTaskId } : undefined });
    }
  };

  /** Si hay un jugador de plantilla seleccionado en la lista, asigna sus datos (nombre, dorsal, foto)
   * a una ficha de jugador ya colocada en el campo, en vez de crear una ficha nueva encima.
   * Devuelve true si se realizó la asignación. */
  const assignSelectedSquadPlayerToItem = (itemId: string): boolean => {
    if (!selectedTool || !selectedTool.startsWith('player-real-')) return false;
    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem || !targetItem.type.startsWith('player-')) return false;
    const squadPlayer = squad.find(p => String(p.id) === selectedTool.replace('player-real-', ''));
    if (!squadPlayer) return false;

    pushHistoryNow();
    updateFrames(prev => prev.map(it => (
      it.id === itemId
        ? {
            ...it,
            color: SQUAD_PLAYER_COLOR,
            playerId: squadPlayer.id,
            playerName: squadPlayer.apodo || squadPlayer.nombre,
            playerDorsal: squadPlayer.dorsal,
            playerPhoto: squadPlayer.fotoUrl,
          }
        : it
    )));
    setSelectedTool(null);
    selectItemOnly(itemId);
    return true;
  };

  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || resizingId || draggingId || isPlaying) return;
    if (!selectedTool) { clearSelection(); return; }
    
    const point = getPitchPercentPoint(e.clientX, e.clientY);
    if (!point) return;
    const { x, y } = point;
    
    const isCone = selectedTool.startsWith('cone-');
    const isPlayer = selectedTool.startsWith('player-');
    const isMaterial = tools.material.some(material => material.id === selectedTool);
    
    let baseZ = 0;
    if (isPlayer) baseZ = 1000;
    else if (isCone) baseZ = 500;
    else if (selectedTool === 'zone') baseZ = 1;
    else baseZ = 100;

    const categoryItems = items.filter(i => {
        if (isPlayer) return i.type.startsWith('player-');
        if (isCone) return i.type === 'cone';
        if (selectedTool === 'zone') return i.type === 'zone';
        return !i.type.startsWith('player-') && i.type !== 'cone' && i.type !== 'zone';
    });

    const nextZ = categoryItems.length > 0 ? Math.max(...categoryItems.map(i => i.zIndex)) + 1 : baseZ;

    const coneColor = tools.conos.find(c => c.id === selectedTool)?.color;
    const isText = selectedTool === 'text';
    const isSquadPlayer = selectedTool.startsWith('player-real-');
    const squadPlayer = isSquadPlayer
      ? squad.find(p => String(p.id) === selectedTool.replace('player-real-', ''))
      : undefined;
    const newItem: DesignerItem = {
      id: Math.random().toString(),
      type: isCone ? 'cone' : selectedTool,
      x,
      y,
      rotation: 0,
      scale: isPlayer ? ELEMENT_SCALES[playerSize] : isCone ? ELEMENT_SCALES[coneSize] : isMaterial ? ELEMENT_SCALES[materialSize] : 1,
      locked: false,
      zIndex: nextZ,
      color: coneColor || tools.jugadores.find(p => p.id === selectedTool)?.color || (squadPlayer ? SQUAD_PLAYER_COLOR : undefined) || (isText ? textColor : undefined),
      icon: [...tools.anotacion, ...tools.material].find(t => t.id === selectedTool)?.icon,
      width: selectedTool === 'zone' ? 15 : selectedTool === 'ladder' ? 11 : undefined,
      height: selectedTool === 'zone' ? 15 : selectedTool === 'ladder' ? 6 : undefined,
      text: isText ? (textDraft.trim() || 'Texto') : undefined,
      fontSize: isText ? TEXT_SIZES[textSize] : undefined,
      playerId: squadPlayer?.id,
      playerName: squadPlayer ? (squadPlayer.apodo || squadPlayer.nombre) : undefined,
      playerDorsal: squadPlayer?.dorsal,
      playerPhoto: squadPlayer?.fotoUrl,
    };
    pushHistoryNow();
    updateFrames([...items, newItem]);
    selectItemOnly(newItem.id);
  };

  const handlePitchBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() < suppressBackgroundClicksUntilRef.current) {
      return;
    }
    handlePitchClick(e);
    if (!selectedTool && e.target === e.currentTarget) {
      clearSelection();
    }
  };

  const handlePitchPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (is3DView && !selectedTool) return;
    if (e.target !== e.currentTarget || resizingId || draggingId || isPlaying) return;
    if (selectedTool && selectedTool !== 'zone' && !selectedTool?.startsWith('arrow-')) return;
    const start = getPitchPercentPoint(e.clientX, e.clientY);
    if (!start) return;

    if (selectedTool?.startsWith('arrow-')) {
      arrowCreationRef.current = {
        active: true,
        startX: start.x,
        startY: start.y,
        endX: start.x,
        endY: start.y,
      };
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      setArrowCreationLine({ startX: start.x, startY: start.y, endX: start.x, endY: start.y });
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'crosshair';
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (selectedTool === 'zone') {
      zoneCreationRef.current = {
        active: true,
        startX: start.x,
        startY: start.y,
        moved: false,
      };
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      const nextZoneBox = { left: start.x, top: start.y, right: start.x, bottom: start.y };
      zoneCreationBoxRef.current = nextZoneBox;
      setZoneCreationBox(nextZoneBox);

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'crosshair';
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    selectionRef.current = {
      active: true,
      startX: start.x,
      startY: start.y,
      moved: false,
    };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    suppressBackgroundClicksUntilRef.current = 0;
    const nextSelectionBox = {
      left: start.x,
      top: start.y,
      right: start.x,
      bottom: start.y,
    };
    selectionBoxRef.current = nextSelectionBox;
    setSelectionBox(nextSelectionBox);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'crosshair';
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const [selectionBox, setSelectionBox] = useState<null | { left: number; top: number; right: number; bottom: number }>(null);

  const handleDragStart = useCallback((e: React.PointerEvent, item: DesignerItem) => {
    e.stopPropagation();
    e.preventDefault();
    if (resizingId || rotatingId || isPlaying) return;
    if (item.locked) { selectItemOnly(item.id); return; }
    const start = getPitchPercentPoint(e.clientX, e.clientY);
    if (!start) return;

    // Capture pointer for reliable tracking (touch + mouse)
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    beginHistorySnapshot();
    draggingRef.current = item.id;
    draggingIdsRef.current = selectedIds.includes(item.id) && selectedIds.length > 1 ? selectedIds : [item.id];
    hasDragged.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartPercentRef.current = start;
    dragStartPositionsRef.current = Object.fromEntries(
      draggingIdsRef.current.map(id => {
        const currentItem = items.find(entry => entry.id === id);
        return [id, { x: currentItem?.x ?? item.x, y: currentItem?.y ?? item.y }];
      })
    );

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    setDraggingId(item.id);
    if (draggingIdsRef.current.length > 1) {
      selectItemIds(draggingIdsRef.current);
    } else {
      selectItemOnly(item.id);
    }
  }, [resizingId, rotatingId, isPlaying, getPitchPercentPoint, items, selectedIds, selectItemIds, selectItemOnly]);

  const handleRotateStart = useCallback((e: React.PointerEvent, item: DesignerItem) => {
    e.stopPropagation();
    e.preventDefault();
    if (item.locked || isPlaying) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    beginHistorySnapshot();
    setRotatingId(item.id);
    selectItemOnly(item.id);
  }, [isPlaying, selectItemOnly]);

  const updateSelectedItem = (updates: Partial<DesignerItem>) => {
    if (!selectedId) return;
    updateFrames(prev => prev.map(item => item.id === selectedId ? { ...item, ...updates } : item));
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrameIndex(prev => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, frameDuration);
    }
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, frameDuration]);

  // Persistent pointer listeners for drag (no re-registration during drag)
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (arrowCreationRef.current?.active && pitchRef.current) {
        const point = getPitchPercentPoint(e.clientX, e.clientY);
        if (!point) return;
        const currentX = point.x;
        const currentY = point.y;
        arrowCreationRef.current.endX = currentX;
        arrowCreationRef.current.endY = currentY;
        setArrowCreationLine({
          startX: arrowCreationRef.current.startX,
          startY: arrowCreationRef.current.startY,
          endX: currentX,
          endY: currentY,
        });
        return;
      }

      if (zoneCreationRef.current?.active && pitchRef.current) {
        const point = getPitchPercentPoint(e.clientX, e.clientY);
        if (!point) return;
        const currentX = point.x;
        const currentY = point.y;
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;

        if (!zoneCreationRef.current.moved && (Math.abs(dx) >= DRAG_THRESHOLD || Math.abs(dy) >= DRAG_THRESHOLD)) {
          zoneCreationRef.current.moved = true;
        }

        const nextZoneBox = {
          left: Math.min(zoneCreationRef.current.startX, currentX),
          top: Math.min(zoneCreationRef.current.startY, currentY),
          right: Math.max(zoneCreationRef.current.startX, currentX),
          bottom: Math.max(zoneCreationRef.current.startY, currentY),
        };
        zoneCreationBoxRef.current = nextZoneBox;
        setZoneCreationBox(nextZoneBox);
        return;
      }

      if (selectionRef.current?.active && pitchRef.current) {
        const point = getPitchPercentPoint(e.clientX, e.clientY);
        if (!point) return;
        const currentX = point.x;
        const currentY = point.y;
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;

        if (!selectionRef.current.moved && (Math.abs(dx) >= DRAG_THRESHOLD || Math.abs(dy) >= DRAG_THRESHOLD)) {
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

      const id = draggingRef.current;
      if (!id || !pitchRef.current) return;

      // Check drag threshold before starting actual move
      if (!hasDragged.current) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        hasDragged.current = true;
      }

      // Throttle updates via requestAnimationFrame for smooth 60fps
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (!pitchRef.current || !draggingRef.current) return;
        const currentPercent = getPitchPercentPoint(e.clientX, e.clientY);
        if (!currentPercent) return;
        const deltaX = currentPercent.x - dragStartPercentRef.current.x;
        const deltaY = currentPercent.y - dragStartPercentRef.current.y;
        const idsToMove = draggingIdsRef.current.length > 0 ? draggingIdsRef.current : [draggingRef.current];

        updateFrames(prev => prev.map(item => {
          const startPosition = dragStartPositionsRef.current[item.id];
          if (!startPosition || !idsToMove.includes(item.id)) return item;
          const newX = Math.min(98, Math.max(2, startPosition.x + deltaX));
          const newY = Math.min(98, Math.max(2, startPosition.y + deltaY));
          const updated: DesignerItem = {
            ...item,
            x: newX,
            y: newY,
          };
          // Para flechas, también actualizar arrowStart y arrowEnd
          if (item.type?.startsWith('arrow-') && item.arrowStart && item.arrowEnd) {
            updated.arrowStart = {
              x: item.arrowStart.x + deltaX,
              y: item.arrowStart.y + deltaY,
            };
            updated.arrowEnd = {
              x: item.arrowEnd.x + deltaX,
              y: item.arrowEnd.y + deltaY,
            };
          }
          return updated;
        }));
      });
    };

    const onPointerUp = () => {
      cancelAnimationFrame(rafId.current);
      if (arrowCreationRef.current?.active) {
        const arrow = arrowCreationRef.current;
        arrowCreationRef.current = null;
        setArrowCreationLine(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        suppressBackgroundClicksUntilRef.current = Date.now() + SUPPRESS_BACKGROUND_CLICK_MS;

        const distance = Math.sqrt(Math.pow(arrow.endX - arrow.startX, 2) + Math.pow(arrow.endY - arrow.startY, 2));
        if (distance < 2) return;

        const arrowItems = itemsRef.current.filter(i => i.type?.startsWith('arrow-'));
        const nextZ = arrowItems.length > 0 ? Math.max(...arrowItems.map(i => i.zIndex)) + 1 : 100;

        const toolArrow = tools.flechas.find(a => a.id === selectedTool);
        const newItem: DesignerItem = {
          id: Math.random().toString(),
          type: selectedTool || 'arrow-straight-solid',
          x: (arrow.startX + arrow.endX) / 2,
          y: (arrow.startY + arrow.endY) / 2,
          rotation: 0,
          scale: 1,
          locked: false,
          zIndex: nextZ,
          color: arrowColor,
          strokeWidth: arrowStrokeWidth,
          arrowStart: { x: arrow.startX, y: arrow.startY },
          arrowEnd: { x: arrow.endX, y: arrow.endY },
        };
        pushHistoryNow();
        updateFrames(prev => [...prev, newItem]);
        selectItemOnly(newItem.id);
        return;
      }

      if (zoneCreationRef.current?.active) {
        const box = zoneCreationBoxRef.current;
        const moved = zoneCreationRef.current.moved;
        const startX = zoneCreationRef.current.startX;
        const startY = zoneCreationRef.current.startY;

        zoneCreationRef.current = null;
        zoneCreationBoxRef.current = null;
        setZoneCreationBox(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        suppressBackgroundClicksUntilRef.current = Date.now() + SUPPRESS_BACKGROUND_CLICK_MS;

        const width = moved && box ? Math.max(MIN_ZONE_SIZE, box.right - box.left) : RESIZABLE_DEFAULT_SIZES.zone.width;
        const height = moved && box ? Math.max(MIN_ZONE_SIZE, box.bottom - box.top) : RESIZABLE_DEFAULT_SIZES.zone.height;
        const x = moved && box ? box.left : startX;
        const y = moved && box ? box.top : startY;

        const zoneItems = itemsRef.current.filter(i => i.type === 'zone');
        const nextZ = zoneItems.length > 0 ? Math.max(...zoneItems.map(i => i.zIndex)) + 1 : 1;

        const newItem: DesignerItem = {
          id: Math.random().toString(),
          type: 'zone',
          x, y, rotation: 0, scale: 1, locked: false,
          zIndex: nextZ,
          width, height,
        };
        pushHistoryNow();
        updateFrames(prev => [...prev, newItem]);
        selectItemOnly(newItem.id);
        return;
      }

      if (selectionRef.current?.active) {
        const box = selectionBoxRef.current;
        if (selectionRef.current.moved && box) {
          const selected = itemsRef.current
            .filter(item => !item.locked)
            .filter(item => rectIntersects(box, getItemBounds(item)))
            .map(item => item.id);
          if (selected.length > 0) {
            selectItemIds(selected);
          } else {
            clearSelection();
          }
          suppressBackgroundClicksUntilRef.current = Date.now() + SUPPRESS_BACKGROUND_CLICK_MS;
        } else {
          clearSelection();
        }
        selectionRef.current = null;
        selectionBoxRef.current = null;
        setSelectionBox(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        return;
      }

      if (draggingRef.current) {
        commitHistorySnapshot();
      }
      draggingRef.current = null;
      draggingIdsRef.current = [];
      dragStartPositionsRef.current = {};
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDraggingId(null);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      cancelAnimationFrame(rafId.current);
    };
  }, [clearSelection, getItemBounds, getPitchPercentPoint, rectIntersects, selectItemIds, selectItemOnly]);

  // Separate resize listeners (keep existing logic, only active when resizing)
  useEffect(() => {
    if (!resizingId) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!pitchRef.current) return;
      const rect = pitchRef.current.getBoundingClientRect();
      const dx = ((e.clientX - initialResizeData.x) / rect.width) * 100;
      const dy = ((e.clientY - initialResizeData.y) / rect.height) * 100;
      updateFrames(prev => prev.map(item => {
        if (item.id !== resizingId) return item;
        let nextW = initialResizeData.w;
        let nextH = initialResizeData.h;
        let nextX = initialResizeData.itemX;
        let nextY = initialResizeData.itemY;

        if (resizeHandle?.includes('e')) nextW = initialResizeData.w + dx;
        if (resizeHandle?.includes('s')) nextH = initialResizeData.h + dy;
        if (resizeHandle?.includes('w')) {
          nextW = initialResizeData.w - dx;
          nextX = initialResizeData.itemX + dx;
        }
        if (resizeHandle?.includes('n')) {
          nextH = initialResizeData.h - dy;
          nextY = initialResizeData.itemY + dy;
        }

        const clampedW = Math.max(2, nextW);
        const clampedH = Math.max(2, nextH);
        const deltaW = clampedW - nextW;
        const deltaH = clampedH - nextH;

        if (deltaW !== 0 && resizeHandle?.includes('w')) nextX -= deltaW;
        if (deltaH !== 0 && resizeHandle?.includes('n')) nextY -= deltaH;

        return { ...item, width: clampedW, height: clampedH, x: nextX, y: nextY };
      }));
    };
    const handleMouseUp = () => {
      commitHistorySnapshot();
      setResizingId(null);
      setResizeHandle(null);
      suppressBackgroundClicksUntilRef.current = Date.now() + SUPPRESS_BACKGROUND_CLICK_MS;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingId, initialResizeData, resizeHandle]);

  // Rotate-by-dragging listeners for the "Orientaciones" arm handle (only active while rotating)
  useEffect(() => {
    if (!rotatingId) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (!pitchRef.current) return;
      const item = itemsRef.current.find(i => i.id === rotatingId);
      if (!item) return;
      const itemElement = pitchRef.current.querySelector<HTMLElement>(`[data-item-root="${rotatingId}"]`);
      const itemRect = itemElement?.getBoundingClientRect();
      const pitchRect = pitchRef.current.getBoundingClientRect();
      const centerX = itemRect ? itemRect.left + itemRect.width / 2 : pitchRect.left + (item.x / 100) * pitchRect.width;
      const centerY = itemRect ? itemRect.top + itemRect.height / 2 : pitchRect.top + (item.y / 100) * pitchRect.height;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      const rawRotation = angleDeg + 90;
      const nextRotation = Math.round(((rawRotation + 180) % 360 + 360) % 360 - 180);
      updateFrames(prev => prev.map(it => it.id === rotatingId ? { ...it, rotation: nextRotation } : it));
    };
    const handlePointerUp = () => {
      commitHistorySnapshot();
      setRotatingId(null);
      suppressBackgroundClicksUntilRef.current = Date.now() + SUPPRESS_BACKGROUND_CLICK_MS;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [rotatingId]);

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.zIndex - b.zIndex), [items]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;

    const updateCanvasSize = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      setCanvasSize(prev => (
        prev.width === width && prev.height === height ? prev : { width, height }
      ));
    };

    updateCanvasSize();
    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const selectedItem = selectedIds.length === 1 ? items.find(i => i.id === selectedId) : null;
  const getResizableDimensions = (item: DesignerItem) => {
    const fallback = RESIZABLE_DEFAULT_SIZES[item.type];
    return {
      width: item.width ?? fallback?.width,
      height: item.height ?? fallback?.height,
    };
  };
  const canResizeItem = (item: DesignerItem) => item.type === 'zone' || item.type === 'goal';
  const canOrientItem = (item: DesignerItem) => item.type?.startsWith('player-') || item.type === 'goal' || item.type === 'fence';
  const getPitchMeters = () =>
    (activeStructure === 'ataque' || activeStructure === 'defensa')
      ? { width: 68, height: 52.5 }
      : { width: 105, height: 68 };
  const pitchAspectValue = (activeStructure === 'ataque' || activeStructure === 'defensa') ? 68 / 52.5 : 105 / 68;
  const pitchAspectRatio = (activeStructure === 'ataque' || activeStructure === 'defensa') ? '68 / 52.5' : '105 / 68';
  const pitchCanvasWidth = useMemo(() => {
    if (!canvasSize.width || !canvasSize.height) return undefined;

    const horizontalMargin = is3DView ? 24 : 16;
    const verticalMargin = is3DView ? 42 : 16;
    const availableWidth = Math.max(160, canvasSize.width - horizontalMargin);
    const availableHeight = Math.max(120, canvasSize.height - verticalMargin);
    const projectedHeightFactor = is3DView ? 0.72 : 1;
    const widthByHeight = (availableHeight / projectedHeightFactor) * pitchAspectValue;
    const width = Math.min(availableWidth, widthByHeight);

    return `${Math.max(Math.min(260, availableWidth), Math.floor(width))}px`;
  }, [canvasSize.height, canvasSize.width, is3DView, pitchAspectValue]);
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const isPlayerItem = (item?: DesignerItem | null) => !!item?.type?.startsWith('player-');
  const isConeItem = (item?: DesignerItem | null) => item?.type === 'cone' || item?.type === 'slalom';
  const isMaterialItem = (item?: DesignerItem | null) =>
    !!item && tools.material.some(material => material.id === item.type);
  const getSizePresetForScale = (scale = 1): SizePreset =>
    SIZE_PRESETS.reduce((closest, size) => (
      Math.abs(ELEMENT_SCALES[size] - scale) < Math.abs(ELEMENT_SCALES[closest] - scale) ? size : closest
    ), 'M' as SizePreset);
  const selectedElementSize = selectedItem ? getSizePresetForScale(selectedItem.scale) : 'M';
  const applyPlayerSize = (size: SizePreset) => {
    setPlayerSize(size);
    if (isPlayerItem(selectedItem)) {
      pushHistoryNow();
      updateSelectedItem({ scale: ELEMENT_SCALES[size] });
    }
  };
  const applyConeSize = (size: SizePreset) => {
    setConeSize(size);
    if (isConeItem(selectedItem)) {
      pushHistoryNow();
      updateSelectedItem({ scale: ELEMENT_SCALES[size] });
    }
  };
  const applyMaterialSize = (size: SizePreset) => {
    setMaterialSize(size);
    if (isMaterialItem(selectedItem)) {
      pushHistoryNow();
      updateSelectedItem({ scale: ELEMENT_SCALES[size] });
    }
  };
  const resizeHandles = [
    { id: 'nw', shape: 'corner' as const, className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
    { id: 'ne', shape: 'corner' as const, className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
    { id: 'sw', shape: 'corner' as const, className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
    { id: 'se', shape: 'corner' as const, className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
    { id: 'n', shape: 'edge-h' as const, className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
    { id: 's', shape: 'edge-h' as const, className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize' },
    { id: 'w', shape: 'edge-v' as const, className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
    { id: 'e', shape: 'edge-v' as const, className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
  ];
  const resizeHandleHitClass = (shape: 'corner' | 'edge-h' | 'edge-v') =>
    shape === 'corner' ? 'w-7 h-7' : shape === 'edge-h' ? 'w-9 h-6' : 'w-6 h-9';
  const resizeHandleDotClass = (shape: 'corner' | 'edge-h' | 'edge-v') =>
    shape === 'corner'
      ? 'w-3.5 h-3.5 rounded-full border-2 border-white'
      : shape === 'edge-h'
        ? 'w-6 h-2 rounded-full border border-white/80'
        : 'w-2 h-6 rounded-full border border-white/80';
  const selectedScaleLabel = selectedItem ? `${selectedItem.scale.toFixed(1)}x` : '1.0x';
  const selectedTypeLabel = selectedItem?.type || '';
  const selectedMenuMode = selectedItem && selectedItem.type !== 'zone' && selectedItem.type !== 'goal' ? 'item' : 'panel';
  const selectedPanelStyle = useMemo(() => {
    if (!selectedItem) return null;

    const placeLeft = selectedItem.x > 58;
    const placeAbove = selectedItem.y > 72;
    const placeBelow = selectedItem.y < 28;

    return {
      left: placeLeft ? undefined : `calc(${selectedItem.x}% + 18px)`,
      right: placeLeft ? `calc(${100 - selectedItem.x}% + 18px)` : undefined,
      top: placeAbove
        ? `calc(${selectedItem.y}% - 12px)`
        : placeBelow
          ? `calc(${selectedItem.y}% + 12px)`
          : `${selectedItem.y}%`,
      transform: placeAbove ? 'translateY(-100%)' : placeBelow ? 'translateY(0)' : 'translateY(-50%)',
      maxWidth: 'calc(100% - 24px)',
    } as React.CSSProperties;
  }, [selectedItem]);
  const adjustSelectedScale = (delta: number) => {
    if (!selectedItem) return;
    pushHistoryNow();
    updateSelectedItem({ scale: clamp(Number((selectedItem.scale + delta).toFixed(1)), 0.5, 3) });
  };
  const duplicateSelectedItem = () => {
    if (!selectedItem) return;
    pushHistoryNow();
    const clone: DesignerItem = {
      ...JSON.parse(JSON.stringify(selectedItem)),
      id: `${selectedItem.id}-${crypto.randomUUID()}`,
      x: clamp(selectedItem.x + 3, 0, 97),
      y: clamp(selectedItem.y + 3, 0, 97),
      zIndex: Math.max(...items.map(i => i.zIndex), 0) + 1,
    };
    updateFrames(prev => [...prev, clone]);
    selectSingleItem(clone.id);
  };
  const moveSelectedItem = (direction: 'up' | 'down') => {
    if (!selectedItem) return;
    const sorted = [...items].sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
    const currentIndex = sorted.findIndex(item => item.id === selectedItem.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    pushHistoryNow();
    const currentZ = sorted[currentIndex].zIndex;
    const targetZ = sorted[targetIndex].zIndex;
    updateFrames(prev => prev.map(item => {
      if (item.id === sorted[currentIndex].id) return { ...item, zIndex: targetZ };
      if (item.id === sorted[targetIndex].id) return { ...item, zIndex: currentZ };
      return item;
    }));
  };
  const deleteSelectedItem = () => {
    if (!selectedId) return;
    pushHistoryNow();
    updateFrames(items.filter(i => i.id !== selectedId));
    clearSelection();
  };

  return (
    <div className="relative flex min-h-[calc(100vh-60px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white font-sans shadow-xl animate-fade-in lg:h-[calc(100vh-60px)] lg:flex-row">
      <aside className="flex w-full flex-col gap-6 overflow-y-visible border-b border-slate-200 bg-[#f1f5f9] p-4 scrollbar-hide sm:p-5 lg:w-80 lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <div className="flex flex-col gap-3">
          <button onClick={() => setShowStructure(!showStructure)} className="flex justify-between items-center px-2 w-full">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ESTRUCTURA</h4>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${showStructure ? '' : '-rotate-90'}`}></i>
          </button>
          {showStructure && (
            <div className="flex flex-col gap-2 px-1">
              { [{ id: 'campo-total', label: 'Campo Total', icon: 'fa-up-right-and-down-left-from-center' }, { id: 'ataque', label: 'Ataque', icon: 'fa-chevron-up' }, { id: 'defensa', label: 'Defensa', icon: 'fa-chevron-down' }, { id: 'libre', label: 'Libre', icon: 'fa-square' }].map((s) => (
                <button key={s.id} onClick={() => setActiveStructure(s.id)} className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all w-full border ${activeStructure === s.id ? 'bg-[var(--accent)] text-white shadow-lg border-[var(--accent)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-white/80'}`}>
                  <i className={`fa-solid ${s.icon} text-[10px] ${activeStructure === s.id ? 'text-white' : 'text-[var(--accent)]'}`}></i>
                  <span className="text-[11px] font-black uppercase">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-slate-200 mx-2"></div>

        <div className="flex flex-col gap-4 px-2">
          <div className="flex flex-col gap-2 mb-1">
            <button type="button" onClick={() => setShowPlayers(v => !v)} className="flex items-center gap-2">
              <h4 className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">JUGADORES</h4>
              <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${showPlayers ? '' : '-rotate-90'}`}></i>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowPlayerNumbers(v => !v)}
                className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                  showPlayerNumbers
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                aria-pressed={showPlayerNumbers}
                title="Mostrar u ocultar dorsales de los jugadores"
              >
                <i className={`fa-solid ${showPlayerNumbers ? 'fa-hashtag' : 'fa-minus'}`}></i>
                Dorsales
              </button>
              <button
                type="button"
                onClick={() => setOrientationModeEnabled(v => !v)}
                className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                  orientationModeEnabled
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                aria-pressed={orientationModeEnabled}
                title="Muestra una flecha de orientación en jugadores, vallas y porterías; arrástrala con el ratón para girarla"
              >
                <i className="fa-solid fa-compass"></i>
                Orientaciones
              </button>
            </div>
          </div>
          {showPlayers && (
            <div className="grid grid-cols-4 gap-1.5">
              {SIZE_PRESETS.map((size) => {
                const activeSize = isPlayerItem(selectedItem) ? selectedElementSize : playerSize;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => applyPlayerSize(size)}
                    className={`rounded-lg border py-1.5 text-[10px] font-black uppercase transition-all ${activeSize === size ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    aria-label={`Tamano de jugador ${size}`}
                    title={`Tamano de jugador ${size}`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          )}
          {showPlayers && squad.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setPlayerSource('generico')}
                className={`rounded-lg py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${playerSource === 'generico' ? 'bg-[var(--accent)] text-white shadow' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
              >
                Genérico
              </button>
              <button
                type="button"
                onClick={() => setPlayerSource('plantilla')}
                className={`rounded-lg py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${playerSource === 'plantilla' ? 'bg-[var(--accent)] text-white shadow' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
              >
                Plantilla
              </button>
            </div>
          )}
          {showPlayers && (playerSource === 'generico' || squad.length === 0) && (
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
              {tools.jugadores.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTool(selectedTool === p.id ? null : p.id)}
                  style={{ backgroundColor: p.color }}
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-white transition-all shadow-xl relative group font-black text-xs sm:h-10 sm:w-10 sm:text-sm ${selectedTool === p.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#f1f5f9] scale-110' : 'opacity-90 hover:opacity-100 hover:scale-105'}`}
                  aria-label={`Jugador ${p.number}`}
                  title={`Jugador ${p.number}`}
                >
                  <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">{p.number}</span>
                </button>
              ))}
            </div>
          )}
          {showPlayers && playerSource === 'plantilla' && squad.length > 0 && (
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
              {squad.map(player => {
                const toolId = `player-real-${player.id}`;
                const isSelected = selectedTool === toolId;
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelectedTool(isSelected ? null : toolId)}
                    className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-all ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    title={player.apodo || player.nombre}
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-full overflow-hidden border-2 ${isSelected ? 'border-white/70' : 'border-slate-200'} bg-slate-100 flex items-center justify-center`}>
                      {player.fotoUrl && player.fotoUrl.length > 1 ? (
                        <img src={player.fotoUrl} className="w-full h-full object-cover" />
                      ) : (
                        <span className={`text-[9px] font-black ${isSelected ? 'text-white' : 'text-slate-500'}`}>{(player.apodo || player.nombre).slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black ${isSelected ? 'bg-white/15 text-white' : 'bg-[var(--accent)] text-white'}`}>
                      {player.dorsal}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-left text-[10px] font-black uppercase">{player.apodo || player.nombre}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <button type="button" onClick={() => setShowCones(v => !v)} className="flex justify-between items-center px-2 w-full">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">CONOS</h4>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${showCones ? '' : '-rotate-90'}`}></i>
          </button>
          {showCones && (
            <div className="flex flex-col gap-2 px-1">
              <div className="grid grid-cols-4 gap-1.5">
                {SIZE_PRESETS.map((size) => {
                  const activeSize = isConeItem(selectedItem) ? selectedElementSize : coneSize;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => applyConeSize(size)}
                      className={`rounded-lg border py-1.5 text-[10px] font-black uppercase transition-all ${activeSize === size ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      aria-label={`Tamano de cono ${size}`}
                      title={`Tamano de cono ${size}`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {tools.conos.map((cone) => (
                  <button key={cone.id} onClick={() => setSelectedTool(selectedTool === cone.id ? null : cone.id)} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border bg-[#121212] ${selectedTool === cone.id ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#f1f5f9] scale-105' : 'border-transparent opacity-80 hover:opacity-100'}`}>
                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px]" style={{ borderBottomColor: cone.color }}></div>
                    <div className="w-6 h-1 bg-white/40 rounded-full mt-1"></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <button type="button" onClick={() => setShowText(v => !v)} className="flex justify-between items-center px-2 w-full">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">TEXTO</h4>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${showText ? '' : '-rotate-90'}`}></i>
          </button>
          {showText && (
            <div className="flex flex-col gap-2 px-1">
              <button
                type="button"
                onClick={() => setSelectedTool(selectedTool === 'text' ? null : 'text')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${selectedTool === 'text' ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:bg-white/80'}`}
              >
                <i className="fa-solid fa-font"></i> Añadir Texto
              </button>
              {selectedTool === 'text' && (
                <>
                  <input
                    type="text"
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    placeholder="Escribe el texto..."
                    maxLength={40}
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    {SIZE_PRESETS.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setTextSize(size);
                          if (selectedItem?.type === 'text') {
                            pushHistoryNow();
                            updateSelectedItem({ fontSize: TEXT_SIZES[size] });
                          }
                        }}
                        className={`rounded-lg border py-1.5 text-[10px] font-black uppercase transition-all ${textSize === size ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setTextColor(c);
                          if (selectedItem?.type === 'text') {
                            pushHistoryNow();
                            updateSelectedItem({ color: c });
                          }
                        }}
                        style={{ backgroundColor: c }}
                        className={`h-6 w-6 rounded-full border-2 transition-all ${textColor === c ? 'border-[var(--accent)] scale-110' : 'border-slate-200 hover:scale-105'}`}
                        aria-label={`Color de texto ${c}`}
                        title={c}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <button type="button" onClick={() => setShowArrows(v => !v)} className="flex justify-between items-center px-2 w-full">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">FLECHAS</h4>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${showArrows ? '' : '-rotate-90'}`}></i>
          </button>
          {showArrows && (
            <div className="flex flex-col gap-2 px-1">
              <div className="grid grid-cols-2 gap-2">
                {tools.flechas.map((arrow) => (
                  <button key={arrow.id} onClick={() => setSelectedTool(selectedTool === arrow.id ? null : arrow.id)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border ${selectedTool === arrow.id ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg scale-105' : 'bg-white text-slate-600 border-slate-200 hover:bg-white/80'}`}>
                    <i className={`fa-solid ${arrow.icon} text-lg`}></i>
                    <span className="text-[8px] font-black uppercase tracking-tight text-center">{arrow.label}</span>
                  </button>
                ))}
              </div>
              {selectedTool?.startsWith('arrow-') && (
                <>
                  <div className="grid grid-cols-6 gap-1.5">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setArrowColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-6 w-6 rounded-full border-2 transition-all ${arrowColor === c ? 'border-[var(--accent)] scale-110' : 'border-slate-200 hover:scale-105'}`}
                        aria-label={`Color de flecha ${c}`}
                        title={c}
                      />
                    ))}
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Grosor</span>
                      <span className="text-[9px] font-black text-[var(--accent)]">{arrowStrokeWidth.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={arrowStrokeWidth}
                      onChange={(e) => setArrowStrokeWidth(parseFloat(e.target.value))}
                      className="w-full accent-[var(--accent)] bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pb-8">
          <button type="button" onClick={() => setShowMaterial(v => !v)} className="flex justify-between items-center px-2 w-full">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">MATERIAL</h4>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${showMaterial ? '' : '-rotate-90'}`}></i>
          </button>
          {showMaterial && (
            <div className="flex flex-col gap-2 px-1">
              <div className="grid grid-cols-4 gap-1.5">
                {SIZE_PRESETS.map((size) => {
                  const activeSize = isMaterialItem(selectedItem) ? selectedElementSize : materialSize;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => applyMaterialSize(size)}
                      className={`rounded-lg border py-1.5 text-[10px] font-black uppercase transition-all ${activeSize === size ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      aria-label={`Tamano de material ${size}`}
                      title={`Tamano de material ${size}`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {tools.material.map((m) => (
                  <button key={m.id} onClick={() => setSelectedTool(selectedTool === m.id ? null : m.id)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border ${selectedTool === m.id ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg scale-105' : 'bg-white text-slate-600 border-slate-200 hover:bg-white/80'}`}>
                    {m.id === 'slalom'
                      ? <SlalomPoleIcon size={28} />
                      : m.id === 'ball'
                      ? <SoccerBallIcon size={14} />
                      : <i className={`fa-solid ${m.icon} text-lg ${selectedTool === m.id ? 'text-white' : 'text-[var(--accent)]'}`}></i>
                    }
                    <span className="text-[9px] font-black uppercase tracking-tight">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </aside>

      <main className="flex-1 flex flex-col bg-white relative overflow-hidden">
        <header className="p-4 md:p-6 flex flex-wrap justify-between items-center gap-3 bg-white border-b border-slate-100 shadow-sm z-10">
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleBackClick}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
              title="Volver al repositorio de tareas"
              aria-label="Volver al repositorio de tareas"
            >
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </button>
            <div className="w-10 h-10 shrink-0 bg-[var(--accent)] rounded-xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-chess-board text-white text-sm"></i></div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">DEMO - DISEÑO TÁCTICO</p>
              <input
                type="text"
                value={activeProject}
                onChange={(e) => setActiveProject(e.target.value)}
                className="w-full text-base md:text-xl font-black uppercase text-[var(--accent)] tracking-tighter leading-none bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-slate-100 rounded"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 relative shrink-0">
            {saveStatus && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white text-[9px] font-black px-4 py-1 rounded-full whitespace-nowrap animate-bounce">
                    {saveStatus}
                </div>
            )}
            <button
              type="button"
              onClick={handleSaveClick}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-[var(--accent-dark)]"
            >
              <i className={`fa-solid ${fromSessionCreationRef.current ? 'fa-plus' : 'fa-floppy-disk'}`}></i>
              {fromSessionCreationRef.current ? 'AÑADIR' : 'Guardar'}
            </button>
          </div>
        </header>

        <div className="flex h-[58px] items-center gap-2 overflow-x-auto scrollbar-hide border-b border-slate-200 px-3 md:px-4">
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
              pushHistoryNow();
              const newIndex = frames.length;
              setFrames(prev => [...prev, [...prev[prev.length - 1]]]);
              setCurrentFrameIndex(newIndex);
            }}
          >
            <i className="fa-solid fa-plus text-[12px]" />
          </button>
          <div className="flex h-8 w-[110px] shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-700 md:w-[170px]">
            {modeLabel}
          </div>
          <button
            type="button"
            onClick={() => {
              const next3DView = !is3DView;
              setIs3DView(next3DView);
              if (next3DView) {
                setIsPlaying(false);
                setSelectedTool(null);
                setArrowCreationLine(null);
                setZoneCreationBox(null);
                setSelectionBox(null);
                clearSelection();
              }
            }}
            className={`flex h-8 shrink-0 items-center gap-2 rounded-md border px-3 text-[11px] font-black uppercase tracking-[0.12em] transition-all ${
              is3DView
                ? 'border-blue-400/30 bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
            title={is3DView ? 'Volver a vista normal' : 'Activar vista 3D'}
            aria-pressed={is3DView}
          >
            <i className="fa-solid fa-cube text-[12px]" />
            Vista 3D
          </button>
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto scrollbar-hide max-w-[140px] md:max-w-[260px]">
            {frames.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentFrameIndex(i)}
                className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-2 text-[14px] font-black transition-all ${
                  i === currentFrameIndex
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={frames.length <= 1}
            onClick={() => {
              pushHistoryNow();
              setFrames(prev => prev.filter((_, i) => i !== currentFrameIndex));
              setCurrentFrameIndex(prev => Math.max(0, Math.min(prev, frames.length - 2)));
            }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white transition-all ${frames.length <= 1 ? 'bg-slate-200 cursor-not-allowed' : 'bg-[#c92525] hover:opacity-90'}`}
            title="Eliminar fotograma actual"
            aria-label="Eliminar fotograma actual"
          >
            <i className="fa-solid fa-trash-can text-[12px]" />
          </button>
          <div className="ml-1 flex shrink-0 items-center gap-2 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("¿Borrar todo?")) {
                  pushHistoryNow();
                  setFrames([[]]);
                  setCurrentFrameIndex(0);
                }
              }}
              className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-red-100 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-50"
            >
              <i className="fa-solid fa-trash-can text-[11px]" />
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyCount === 0}
              className={`flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 text-[10px] font-black uppercase tracking-widest transition-all ${historyCount === 0 ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              <i className="fa-solid fa-rotate-left text-[11px]" />
              Deshacer
            </button>
          </div>
        </div>

        <div className={`flex-1 min-h-0 flex gap-2 p-2 relative overflow-hidden transition-colors duration-500 ${is3DView ? 'bg-[#050607]' : 'bg-slate-50'}`}>
          <div className="flex-[1.35] min-w-0 min-h-0 flex flex-col items-start gap-2">
            <div
              ref={canvasRef}
              className={`relative w-full flex-1 min-h-0 flex overflow-hidden ${
                is3DView
                  ? 'items-center justify-center px-2 py-5 md:px-8 md:py-8'
                  : 'items-center justify-center p-2'
              }`}
              style={is3DView ? { perspective: '1150px' } : undefined}
            >
              {is3DView && (
                <div className="pointer-events-none absolute left-1/2 top-[61%] h-[24%] w-[78%] -translate-x-1/2 rounded-full bg-black/80 blur-3xl" />
              )}
              <div
                ref={pitchRef}
                className={`max-w-full max-h-full relative overflow-visible transition-all duration-500 origin-center ml-0 ${
                  is3DView
                    ? `rounded-[10px] border border-white/20 ${selectedTool ? 'cursor-crosshair' : 'cursor-default'} shadow-[0_46px_95px_rgba(0,0,0,0.8)]`
                    : 'rounded-3xl border-[12px] border-[#ffffff22] cursor-crosshair shadow-[0_40px_100px_rgba(0,0,0,0.3)]'
                }`}
                onPointerDown={handlePitchPointerDown}
                onClick={handlePitchBackgroundClick}
                style={{
                  ...FIELD_BACKGROUND,
                  aspectRatio: pitchAspectRatio,
                  height: 'auto',
                  width: pitchCanvasWidth ?? (is3DView ? 'min(94%, 980px)' : '100%'),
                  maxWidth: '100%',
                  maxHeight: '100%',
                  transform: is3DView ? `translateY(-8%) rotateX(${PITCH_3D_ROTATION_DEG}deg) scale(1.04)` : undefined,
                  transformOrigin: 'center center',
                  transformStyle: 'preserve-3d',
                }}
              >
                {is3DView && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[inherit]"
                    style={{
                      background: 'radial-gradient(circle at 24% 38%, rgba(88, 170, 85, 0.30), transparent 28%), radial-gradient(circle at 78% 42%, rgba(106, 196, 94, 0.22), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.12))',
                    }}
                  />
                )}
                {activeStructure !== 'libre' && (
                  <svg
                    className={`absolute pointer-events-none ${is3DView ? 'opacity-60' : 'opacity-35'}`}
                    style={{ top: '4%', left: '4%', width: '92%', height: '92%', overflow: 'visible' }}
                    viewBox={
                      activeStructure === 'ataque' ? '0 0 68 52.5'
                      : activeStructure === 'defensa' ? '0 52.5 68 52.5'
                      : '0 0 105 68'
                    }
                    aria-hidden="true"
                  >
                    <g fill="none" stroke="white" strokeWidth="0.45">
                      {activeStructure === 'campo-total' ? (
                        <>
                          <rect x="0" y="0" width="105" height="68" />
                          <line x1="52.5" y1="0" x2="52.5" y2="68" />
                          <circle cx="52.5" cy="34" r="9.15" />
                          <circle cx="52.5" cy="34" r="0.2" fill="white" stroke="none" />
                          <rect x="0" y="13.84" width="16.5" height="40.32" />
                          <rect x="0" y="24.84" width="5.5" height="18.32" />
                          <circle cx="11" cy="34" r="0.2" fill="white" stroke="none" />
                          <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" />
                          <rect x="-2" y="30.34" width="2" height="7.32" strokeWidth="0.6" />
                          <rect x="88.5" y="13.84" width="16.5" height="40.32" />
                          <rect x="99.5" y="24.84" width="5.5" height="18.32" />
                          <circle cx="94" cy="34" r="0.2" fill="white" stroke="none" />
                          <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" />
                          <rect x="105" y="30.34" width="2" height="7.32" strokeWidth="0.6" />
                          <path d="M 0 1 A 1 1 0 0 1 1 0" />
                          <path d="M 104 0 A 1 1 0 0 1 105 1" />
                          <path d="M 1 68 A 1 1 0 0 1 0 67" />
                          <path d="M 105 67 A 1 1 0 0 1 104 68" />
                        </>
                      ) : (
                        <>
                          <rect x="0" y="0" width="68" height="105" />
                          <line x1="0" y1="52.5" x2="68" y2="52.5" />
                          <circle cx="34" cy="52.5" r="1.1" fill="white" stroke="none" />
                          <rect x="13.84" y="0" width="40.32" height="16.5" />
                          <rect x="24.84" y="0" width="18.32" height="5.5" />
                          <circle cx="34" cy="11" r="0.2" fill="white" stroke="none" />
                          <path d="M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5" />
                          <rect x="30.34" y="-2" width="7.32" height="2" strokeWidth="0.6" />
                          <rect x="13.84" y="88.5" width="40.32" height="16.5" />
                          <rect x="24.84" y="99.5" width="18.32" height="5.5" />
                          <circle cx="34" cy="94" r="0.2" fill="white" stroke="none" />
                          <path d="M 26.69 88.5 A 9.15 9.15 0 0 1 41.31 88.5" />
                          <rect x="30.34" y="105" width="7.32" height="2" strokeWidth="0.6" />
                          <path d="M 0 1 A 1 1 0 0 1 1 0" />
                          <path d="M 67 0 A 1 1 0 0 1 68 1" />
                          <path d="M 1 105 A 1 1 0 0 1 0 104" />
                          <path d="M 68 104 A 1 1 0 0 1 67 105" />
                        </>
                      )}
                    </g>
                  </svg>
                )}

                {!is3DView && selectionBox && selectionRef.current?.moved && (
                  <div
                    className="absolute z-[8] pointer-events-none border border-dashed border-white/80 bg-white/10 backdrop-blur-[1px]"
                    style={{
                      left: `${selectionBox.left}%`,
                      top: `${selectionBox.top}%`,
                      width: `${selectionBox.right - selectionBox.left}%`,
                      height: `${selectionBox.bottom - selectionBox.top}%`,
                    }}
                  >
                    <div className="absolute -top-7 left-0 rounded-full bg-black/80 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                      {selectedIds.length > 1 ? `${selectedIds.length} elementos` : 'Seleccionando'}
                    </div>
                  </div>
                )}

                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-[9]"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <defs>
                    {TEXT_COLORS.map((color, i) => (
                      <marker key={`arrow-${i}`} id={`arrowhead-${i}`} markerWidth="8" markerHeight="8" refX="7" refY="2.5" orient="auto">
                        <polygon points="0 0, 8 2.5, 0 5" fill={color} />
                      </marker>
                    ))}
                  </defs>

                  {arrowCreationLine && (
                    <>
                      {selectedTool?.includes('curve') ? (
                        <path
                          d={`M ${arrowCreationLine.startX} ${arrowCreationLine.startY} Q ${(arrowCreationLine.startX + arrowCreationLine.endX) / 2} ${Math.min(arrowCreationLine.startY, arrowCreationLine.endY) - 15} ${arrowCreationLine.endX} ${arrowCreationLine.endY}`}
                          stroke="white"
                          strokeWidth={arrowStrokeWidth}
                          fill="none"
                          strokeDasharray={selectedTool?.includes('dashed') ? '1.5,1.5' : '0'}
                          markerEnd="url(#arrowhead-0)"
                          strokeLinecap="round"
                          opacity="0.8"
                        />
                      ) : (
                        <line
                          x1={arrowCreationLine.startX}
                          y1={arrowCreationLine.startY}
                          x2={arrowCreationLine.endX}
                          y2={arrowCreationLine.endY}
                          stroke="white"
                          strokeWidth={arrowStrokeWidth}
                          strokeDasharray={selectedTool?.includes('dashed') ? '1.5,1.5' : '0'}
                          markerEnd="url(#arrowhead-0)"
                          strokeLinecap="round"
                          opacity="0.8"
                        />
                      )}
                    </>
                  )}

                  {sortedItems.map((item) => {
                    if (!item.type?.startsWith('arrow-') || !item.arrowStart || !item.arrowEnd) return null;
                    const colorIndex = TEXT_COLORS.indexOf(item.color || '#ffffff');
                    const markerIndex = colorIndex >= 0 ? colorIndex : 0;
                    const isCurved = item.type.includes('curve');
                    const strokeW = item.strokeWidth ?? 0.3;
                    const handleArrowPointerDown = (e: React.PointerEvent) => {
                      e.stopPropagation();
                      e.preventDefault();
                      beginHistorySnapshot();
                      draggingRef.current = item.id;
                      draggingIdsRef.current = selectedIds.includes(item.id) && selectedIds.length > 1 ? selectedIds : [item.id];
                      hasDragged.current = false;
                      dragStartPos.current = { x: e.clientX, y: e.clientY };
                      dragStartPercentRef.current = getPitchPercentPoint(e.clientX, e.clientY) ?? dragStartPercentRef.current;
                      dragStartPositionsRef.current = Object.fromEntries(
                        draggingIdsRef.current.map(id => {
                          const currentItem = items.find(entry => entry.id === id);
                          return [id, { x: currentItem?.x ?? item.x, y: currentItem?.y ?? item.y }];
                        })
                      );
                      document.body.style.cursor = 'grabbing';
                      document.body.style.userSelect = 'none';
                      setDraggingId(item.id);
                      if (draggingIdsRef.current.length > 1) {
                        selectItemIds(draggingIdsRef.current);
                      } else {
                        selectItemOnly(item.id);
                      }
                      (e.target as any).setPointerCapture(e.pointerId);
                    };
                    return isCurved ? (
                      <path
                        key={item.id}
                        d={`M ${item.arrowStart.x} ${item.arrowStart.y} Q ${(item.arrowStart.x + item.arrowEnd.x) / 2} ${Math.min(item.arrowStart.y, item.arrowEnd.y) - 15} ${item.arrowEnd.x} ${item.arrowEnd.y}`}
                        stroke={item.color || '#ffffff'}
                        strokeWidth={strokeW}
                        fill="none"
                        strokeDasharray={item.type.includes('dashed') ? '1.5,1.5' : '0'}
                        markerEnd={`url(#arrowhead-${markerIndex})`}
                        strokeLinecap="round"
                        style={{ cursor: draggingId === item.id ? 'grabbing' : 'grab', pointerEvents: 'auto' }}
                        onPointerDown={handleArrowPointerDown}
                        onClick={(e) => { e.stopPropagation(); if (!hasDragged.current) selectItemOnly(item.id); }}
                        opacity={selectedIds.includes(item.id) ? '1' : '0.85'}
                      />
                    ) : (
                      <line
                        key={item.id}
                        x1={item.arrowStart.x}
                        y1={item.arrowStart.y}
                        x2={item.arrowEnd.x}
                        y2={item.arrowEnd.y}
                        stroke={item.color || '#ffffff'}
                        strokeWidth={strokeW}
                        strokeDasharray={item.type.includes('dashed') ? '1.5,1.5' : '0'}
                        markerEnd={`url(#arrowhead-${markerIndex})`}
                        strokeLinecap="round"
                        style={{ cursor: draggingId === item.id ? 'grabbing' : 'grab', pointerEvents: 'auto' }}
                        onPointerDown={handleArrowPointerDown}
                        onClick={(e) => { e.stopPropagation(); if (!hasDragged.current) selectItemOnly(item.id); }}
                        opacity={selectedIds.includes(item.id) ? '1' : '0.85'}
                      />
                    );
                  })}
                </svg>

                {zoneCreationBox && zoneCreationRef.current?.moved && (
                  <div
                    className="absolute z-[8] pointer-events-none border-[3px] border-dashed border-white/80 bg-white/10 backdrop-blur-[1px]"
                    style={{
                      left: `${zoneCreationBox.left}%`,
                      top: `${zoneCreationBox.top}%`,
                      width: `${Math.max(MIN_ZONE_SIZE, zoneCreationBox.right - zoneCreationBox.left)}%`,
                      height: `${Math.max(MIN_ZONE_SIZE, zoneCreationBox.bottom - zoneCreationBox.top)}%`,
                    }}
                  />
                )}

                {sortedItems.map((item) => (
                  (() => {
                    const size = getResizableDimensions(item);
                    const isResizable = canResizeItem(item);
                    const itemWidth = size.width ? `${size.width}%` : 'auto';
                    const itemHeight = size.height ? `${size.height}%` : 'auto';
                    const isItemSelected = selectedIds.includes(item.id);
                    const showResizeHandles = !is3DView && selectedId === item.id && selectedIds.length === 1 && isResizable && !item.locked;
                    const animationClass = getDesignerItemAnimationClass(item.animation);

                    return (
                  <div
                    key={item.id}
                    data-item-root={item.id}
                    className={`absolute group cursor-grab touch-none ${(item.type === 'zone' && !isItemSelected) ? 'pointer-events-none' : ''} ${draggingId === item.id ? 'cursor-grabbing z-[9999] scale-105 opacity-75' : isPlaying ? 'transition-all duration-[2000ms] ease-in-out' : ''} ${isItemSelected ? (item.type === 'zone' || item.type === 'goal' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a4716]' : 'ring-2 ring-white ring-offset-2 ring-offset-[#1a4716] rounded-full') : ''}`}
                    onPointerDown={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('[data-resize-handle="true"]') || target.closest('[data-orientation-handle="true"]')) return;
                      handleDragStart(e, item);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasDragged.current) return;
                      if (assignSelectedSquadPlayerToItem(item.id)) return;
                      selectItemOnly(item.id);
                    }}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      zIndex: item.zIndex,
                      transform: `${item.type === 'zone' ? (is3DView ? 'translateZ(10px)' : '') : `translate(-50%, -50%) ${is3DView ? 'translateZ(18px)' : ''}`} rotate(${item.rotation}deg) scale(${item.scale})`.trim(),
                      transformStyle: 'preserve-3d',
                      width: item.type === 'goal' || item.type === 'zone' ? itemWidth : (item.width ? `${item.width}%` : 'auto'),
                      height: item.type === 'goal' || item.type === 'zone' ? itemHeight : (item.height ? `${item.height}%` : 'auto'),
                      pointerEvents: (item.type === 'zone' && !isItemSelected) ? 'none' : 'auto'
                    }}
                  >
                    {resizingId === item.id && item.type !== 'goal' && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 whitespace-nowrap pointer-events-none z-20">
                        <div className="rounded-full bg-black/85 px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                          {Math.round(size.width ?? 0)}% × {Math.round(size.height ?? 0)}%
                        </div>
                        <div className="rounded-full bg-black/85 px-2.5 py-1 text-[9px] font-semibold text-white/80 shadow-lg">
                          Dale a esc para dejar de modificar
                        </div>
                      </div>
                    )}
                    {isResizable && item.type !== 'goal' && (isItemSelected || resizingId === item.id) && (() => {
                      const pitchMeters = getPitchMeters();
                      const widthMeters = ((size.width ?? 0) / 100) * pitchMeters.width;
                      const heightMeters = ((size.height ?? 0) / 100) * pitchMeters.height;

                      const handleWidthChange = (newValue: number) => {
                        const newWidthPercent = (newValue / pitchMeters.width) * 100;
                        updateFrames(prev => prev.map(i => i.id === item.id ? { ...i, width: newWidthPercent } : i));
                      };

                      const handleHeightChange = (newValue: number) => {
                        const newHeightPercent = (newValue / pitchMeters.height) * 100;
                        updateFrames(prev => prev.map(i => i.id === item.id ? { ...i, height: newHeightPercent } : i));
                      };

                      return (
                        <>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black text-white shadow-lg z-20 cursor-text pointer-events-auto">
                            {editingDimensionItemId === item.id && editingDimensionType === 'width' ? (
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                autoFocus
                                defaultValue={Math.round(widthMeters)}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val >= 0) {
                                    handleWidthChange(val);
                                  }
                                  setEditingDimensionItemId(null);
                                  setEditingDimensionType(null);
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') {
                                    const val = parseFloat(e.currentTarget.value);
                                    if (!isNaN(val) && val >= 0) {
                                      handleWidthChange(val);
                                    }
                                    setEditingDimensionItemId(null);
                                    setEditingDimensionType(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingDimensionItemId(null);
                                    setEditingDimensionType(null);
                                  }
                                }}
                                className="w-12 bg-[var(--accent)] text-white text-[10px] font-black text-center border-0 outline-none"
                              />
                            ) : (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDimensionItemId(item.id);
                                  setEditingDimensionType('width');
                                }}
                              >
                                {Math.round(widthMeters)} m
                              </span>
                            )}
                          </div>
                          <div
                            className="absolute top-1/2 -left-6 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black text-white shadow-lg z-20 cursor-text pointer-events-auto"
                            style={{ transform: 'translate(-50%, -50%) rotate(-90deg)' }}
                          >
                            {editingDimensionItemId === item.id && editingDimensionType === 'height' ? (
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                autoFocus
                                defaultValue={Math.round(heightMeters)}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val >= 0) {
                                    handleHeightChange(val);
                                  }
                                  setEditingDimensionItemId(null);
                                  setEditingDimensionType(null);
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') {
                                    const val = parseFloat(e.currentTarget.value);
                                    if (!isNaN(val) && val >= 0) {
                                      handleHeightChange(val);
                                    }
                                    setEditingDimensionItemId(null);
                                    setEditingDimensionType(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingDimensionItemId(null);
                                    setEditingDimensionType(null);
                                  }
                                }}
                                className="w-12 bg-[var(--accent)] text-white text-[10px] font-black text-center border-0 outline-none"
                              />
                            ) : (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDimensionItemId(item.id);
                                  setEditingDimensionType('height');
                                }}
                              >
                                {Math.round(heightMeters)} m
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                    {item.type === 'zone' ? (
                      <div className={`relative w-full h-full border-[3px] border-dashed border-white/60 bg-white/5 shadow-inner group-hover:border-white transition-colors ${animationClass}`}>
                        {showResizeHandles && (
                          <>
                            {resizeHandles.map(handle => (
                              <div
                                key={handle.id}
                                data-resize-handle="true"
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  beginHistorySnapshot();
                                  setResizingId(item.id);
                                  setResizeHandle(handle.id);
                                  setInitialResizeData({
                                    x: e.clientX,
                                    y: e.clientY,
                                    w: item.width || RESIZABLE_DEFAULT_SIZES.zone.width,
                                    h: item.height || RESIZABLE_DEFAULT_SIZES.zone.height,
                                    itemX: item.x,
                                    itemY: item.y
                                  });
                                }}
                                className={`absolute flex items-center justify-center ${resizeHandleHitClass(handle.shape)} ${handle.className}`}
                              >
                                <div className={`bg-[var(--accent)] shadow-lg ${resizeHandleDotClass(handle.shape)}`} />
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    ) : item.type === 'goal' ? (
                      is3DView ? (
                        <div
                          className={`relative h-full w-full overflow-visible drop-shadow-[0_18px_16px_rgba(0,0,0,0.42)] ${animationClass}`}
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          <div
                            className="absolute inset-x-[-5%] bottom-[-8px] h-[18px] rounded-full bg-black/35 blur-[7px]"
                            style={{ transform: 'translateZ(-1px)' }}
                          />

                          <div
                            className="absolute left-0 right-0 bottom-0 overflow-visible"
                            style={{
                              height: GOAL_3D_HEIGHT_PX,
                              transform: 'translateZ(3px) rotateX(-90deg)',
                              transformOrigin: 'bottom center',
                              transformStyle: 'preserve-3d'
                            }}
                          >
                            <div
                              className="absolute left-0 top-0 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                              style={{
                                width: GOAL_3D_TUBE_PX,
                                height: GOAL_3D_HEIGHT_PX
                              }}
                            />
                            <div
                              className="absolute right-0 top-0 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                              style={{
                                width: GOAL_3D_TUBE_PX,
                                height: GOAL_3D_HEIGHT_PX
                              }}
                            />
                            <div
                              className="absolute left-0 right-0 top-0 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.85)]"
                              style={{ height: GOAL_3D_TUBE_PX }}
                            />
                            <div className="absolute inset-x-[5px] top-[5px] bottom-0 border border-white/35 bg-white/[0.025] shadow-[inset_0_0_18px_rgba(255,255,255,0.08)]" />
                          </div>

                          <div
                            className="absolute inset-x-[5px] top-0 h-full border-x-[3px] border-t-[3px] border-white/70 bg-white/[0.03] shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                            style={{
                              transform: 'translateZ(2px)',
                              transformStyle: 'preserve-3d'
                            }}
                          >
                            <div
                              className="absolute inset-[4px] opacity-45"
                              style={{
                                backgroundImage:
                                  'linear-gradient(to right, rgba(255,255,255,0.58) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.45) 1px, transparent 1px)',
                                backgroundSize: '13px 13px'
                              }}
                            />
                          </div>

                          <div
                            className="absolute left-0 top-0 rounded-full bg-white shadow-[0_0_9px_rgba(255,255,255,0.65)]"
                            style={{
                              width: GOAL_3D_TUBE_PX,
                              height: '100%',
                              transform: 'translateZ(3px)'
                            }}
                          />
                          <div
                            className="absolute right-0 top-0 rounded-full bg-white shadow-[0_0_9px_rgba(255,255,255,0.65)]"
                            style={{
                              width: GOAL_3D_TUBE_PX,
                              height: '100%',
                              transform: 'translateZ(3px)'
                            }}
                          />
                          <div
                            className="absolute left-0 right-0 top-0 rounded-full bg-white/95 shadow-[0_0_9px_rgba(255,255,255,0.58)]"
                            style={{
                              height: GOAL_3D_TUBE_PX,
                              transform: 'translateZ(3px)'
                            }}
                          />

                          <div
                            className="absolute left-[5px] right-[5px] top-0 overflow-hidden border border-white/30 bg-white/[0.025]"
                            style={{
                              height: GOAL_3D_BACK_HEIGHT_PX,
                              transform: `translateZ(${GOAL_3D_HEIGHT_PX - GOAL_3D_BACK_HEIGHT_PX}px) rotateX(-90deg)`,
                              transformOrigin: 'top center'
                            }}
                          >
                            <div
                              className="absolute inset-0 opacity-35"
                              style={{
                                backgroundImage:
                                  'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.42) 1px, transparent 1px)',
                                backgroundSize: '12px 12px'
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className={`relative h-full w-full border-[4px] border-white border-b-0 shadow-2xl group-hover:border-[#ffd700] transition-colors overflow-hidden ${animationClass}`}>
                        {showResizeHandles && (
                          <>
                            {resizeHandles.map(handle => (
                              <div
                                key={handle.id}
                                data-resize-handle="true"
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  beginHistorySnapshot();
                                  setResizingId(item.id);
                                  setResizeHandle(handle.id);
                                  setInitialResizeData({
                                    x: e.clientX,
                                    y: e.clientY,
                                    w: item.width || RESIZABLE_DEFAULT_SIZES.goal.width,
                                    h: item.height || RESIZABLE_DEFAULT_SIZES.goal.height,
                                    itemX: item.x,
                                    itemY: item.y
                                  });
                                }}
                                className={`absolute flex items-center justify-center ${resizeHandleHitClass(handle.shape)} ${handle.className}`}
                              >
                                <div className={`bg-[var(--accent)] shadow-lg ${resizeHandleDotClass(handle.shape)}`} />
                              </div>
                            ))}
                          </>
                        )}
                        </div>
                      )
                    ) : item.type === 'cone' ? (
                      <div className={`flex flex-col items-center ${animationClass}`}>
                        <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[24px] drop-shadow-xl" style={{ borderBottomColor: item.color }}></div>
                        <div className="w-7 h-1 bg-white/40 rounded-full mt-0.5"></div>
                      </div>
                    ) : item.type === 'slalom' ? (
                      <div className={animationClass}>
                        <SlalomPoleIcon size={42} />
                      </div>
                    ) : item.type === 'ball' ? (
                      <div className={`drop-shadow-lg ${animationClass}`}>
                        <SoccerBallIcon size={21} />
                      </div>
                    ) : item.type === 'ladder' ? (
                      <svg viewBox="0 0 110 60" className={`h-full w-full drop-shadow-lg ${animationClass}`} preserveAspectRatio="none">
                        <rect x="2" y="2" width="106" height="56" rx="4" fill="none" stroke="#fff" strokeWidth="4" />
                        {Array.from({ length: 4 }).map((_, i) => {
                          const rx = 22 + i * 22;
                          return <line key={i} x1={rx} y1="2" x2={rx} y2="58" stroke="#fff" strokeWidth="4" />;
                        })}
                      </svg>
                    ) : item.type === 'text' ? (
                      <div
                        style={{ color: item.color || '#ffffff', fontSize: `${item.fontSize || TEXT_SIZES.M}px` }}
                        className={`whitespace-nowrap select-none font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] ${animationClass}`}
                      >
                        {item.text}
                      </div>
                    ) : item.type?.startsWith('arrow-') ? (
                      <div className={`absolute pointer-events-none select-none ${animationClass}`} />
                    ) : item.type?.startsWith('player-') ? (
                      <div
                        style={{
                          backgroundColor: item.color || SQUAD_PLAYER_COLOR,
                          transform: is3DView ? PLAYER_3D_BILLBOARD_TRANSFORM : undefined,
                          transformStyle: 'preserve-3d',
                        }}
                        className={`w-10 h-10 rounded-full border-[4px] border-white shadow-xl flex items-center justify-center overflow-hidden font-black text-white ${animationClass}`}
                      >
                        {item.playerId !== undefined ? (
                          item.playerPhoto && item.playerPhoto.length > 1 ? (
                            <img src={item.playerPhoto} className="w-full h-full object-cover" />
                          ) : showPlayerNumbers ? (
                            <span className="text-[13px] leading-none">{item.playerDorsal ?? ''}</span>
                          ) : (
                            <span className="text-[10px] leading-none">{(item.playerName || '').slice(0, 2).toUpperCase()}</span>
                          )
                        ) : (
                          showPlayerNumbers && (
                            <span className="text-[13px] leading-none">
                              {Number(item.type.replace('player-', ''))}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      <i className={`fa-solid ${item.icon} text-3xl text-white drop-shadow-lg ${animationClass}`}></i>
                    )}
                    {!is3DView && canOrientItem(item) && orientationModeEnabled && (
                      <svg
                        width="80"
                        height="80"
                        viewBox="-40 -40 80 80"
                        className={`absolute left-1/2 top-1/2 overflow-visible ${isItemSelected ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                        style={{ transform: 'translate(-50%, -50%)' }}
                      >
                        <path d="M 19.8 -19.8 A 28 28 0 1 1 -19.8 -19.8" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
                        {isItemSelected && (
                          <path
                            data-orientation-handle="true"
                            onPointerDown={(e) => handleRotateStart(e, item)}
                            d="M 19.8 -19.8 A 28 28 0 1 1 -19.8 -19.8"
                            fill="none"
                            stroke="transparent"
                            strokeWidth="20"
                            strokeLinecap="round"
                            style={{ pointerEvents: 'stroke' }}
                          />
                        )}
                      </svg>
                    )}
                    {!is3DView && canOrientItem(item) && orientationModeEnabled && isItemSelected && (
                      <div
                        data-orientation-handle="true"
                        onPointerDown={(e) => handleRotateStart(e, item)}
                        className="absolute left-1/2 top-1/2 z-20 flex h-8 w-8 cursor-grab items-center justify-center rounded-full border border-white/15 bg-[#121212]/90 text-white shadow-lg active:cursor-grabbing"
                        style={{ transform: 'translate(-50%, calc(-50% - 28px))' }}
                        title={item.type === 'goal' ? 'Arrastra para orientar la portería' : item.type === 'fence' ? 'Arrastra para orientar la valla' : 'Arrastra para orientar al jugador'}
                      >
                        <i className="fa-solid fa-rotate text-sm"></i>
                      </div>
                    )}
                    {!is3DView && (item.type === 'goal' || item.type === 'fence') && isItemSelected && !item.locked && (
                      <button
                        type="button"
                        data-orientation-handle="true"
                        onPointerDown={(e) => {
                          handleRotateStart(e, item);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="absolute bottom-0 right-0 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#121212]/90 text-white shadow-lg transition-all hover:bg-[var(--accent)] hover:text-white"
                        style={{ transform: 'translate(60%, 60%)' }}
                        title={item.type === 'goal' ? 'Arrastra para girar la portería' : 'Arrastra para girar la valla'}
                        aria-label={item.type === 'goal' ? 'Girar portería manualmente' : 'Girar valla manualmente'}
                      >
                        <i className="fa-solid fa-rotate-right text-sm"></i>
                      </button>
                    )}
                    {item.playerId !== undefined && item.playerName && (
                      <div className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-lg">
                        {item.playerName}
                      </div>
                    )}
                    {selectedIds.includes(item.id) && item.locked && (
                      <div className="absolute -top-2 -left-2 bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] shadow-lg"><i className="fa-solid fa-lock"></i></div>
                    )}
                    <button
                      type="button"
                      data-edit-button="true"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSingleItem(item.id);
                      }}
                      className={`absolute bottom-0 left-0 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#121212]/90 text-white shadow-lg transition-all hover:bg-[var(--accent)] hover:text-white ${isItemSelected ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                      style={{ transform: 'translate(-60%, 60%)' }}
                      title="Editar elemento"
                      aria-label="Editar elemento"
                    >
                      <i className="fa-solid fa-pen-to-square text-sm"></i>
                    </button>
                  </div>
                    );
                  })()
                ))}                {!is3DView && selectedItem && selectedPanelStyle && isSelectedPanelOpen && (
                  <div className="pointer-events-none absolute inset-0 z-[10000]">
                    <div
                      data-selected-panel="true"
                      className="pointer-events-auto absolute w-[min(92vw,520px)] rounded-3xl border border-white/10 bg-[#121212]/95 p-4 text-white shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl animate-fade-in"
                      style={selectedPanelStyle}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[var(--accent)]">
                          <i className="fa-solid fa-sliders text-sm"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">ELEMENTO SELECCIONADO</p>
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-black uppercase tracking-tight text-white">{selectedTypeLabel}</p>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">{selectedScaleLabel}</span>
                            <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">{selectedMenuMode}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => updateSelectedItem({ locked: !selectedItem.locked })}
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${selectedItem.locked ? 'border-red-500/40 bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.28)]' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}
                          title={selectedItem.locked ? 'Desbloquear' : 'Bloquear'}
                        >
                          <i className={`fa-solid ${selectedItem.locked ? 'fa-lock' : 'fa-lock-open'} text-xs`}></i>
                        </button>
                        <button
                          onClick={() => setIsSelectedPanelOpen(false)}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
                          title="Cerrar ventana"
                        >
                          <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        <button onClick={() => adjustSelectedScale(0.1)} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/10">
                          <i className="fa-solid fa-magnifying-glass-plus text-sm text-emerald-400"></i>
                          Aumentar
                        </button>
                        <button onClick={() => adjustSelectedScale(-0.1)} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/10">
                          <i className="fa-solid fa-magnifying-glass-minus text-sm text-amber-400"></i>
                          Disminuir
                        </button>
                        <button onClick={duplicateSelectedItem} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/10">
                          <i className="fa-regular fa-clone text-sm text-sky-400"></i>
                          Duplicar
                        </button>
                        <button onClick={() => moveSelectedItem('up')} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/10">
                          <i className="fa-solid fa-arrow-up text-sm text-white"></i>
                          Arriba
                        </button>
                        <button onClick={() => moveSelectedItem('down')} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/10">
                          <i className="fa-solid fa-arrow-down text-sm text-white"></i>
                          Abajo
                        </button>
                        <button onClick={deleteSelectedItem} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-red-500/30 bg-red-600/15 px-3 py-3 text-[9px] font-black uppercase tracking-widest text-red-300 transition-all hover:bg-red-600 hover:text-white">
                          <i className="fa-regular fa-trash-can text-sm"></i>
                          Borrar
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Rotación</span>
                            <span className="text-[10px] font-black text-red-400">{selectedItem.rotation}°</span>
                          </div>
                          <div className="mb-2 grid grid-cols-4 gap-2">
                            {[0, 45, 90, 180].map((angle) => (
                              <button
                                key={angle}
                                onClick={() => updateSelectedItem({ rotation: angle })}
                                className={`rounded-xl border px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-all ${selectedItem.rotation === angle ? 'border-red-500 bg-red-500 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                              >
                                {angle}°
                              </button>
                            ))}
                          </div>
                          <input type="range" min="0" max="360" value={selectedItem.rotation} onChange={(e) => updateSelectedItem({ rotation: parseInt(e.target.value) })} onMouseDown={beginHistorySnapshot} onMouseUp={commitHistorySnapshot} onTouchStart={beginHistorySnapshot} onTouchEnd={commitHistorySnapshot} className="w-full accent-red-500 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Escala</span>
                            <span className="text-[10px] font-black text-red-400">{selectedScaleLabel}</span>
                          </div>
                          <input type="range" min="0.5" max="3" step="0.1" value={selectedItem.scale} onChange={(e) => updateSelectedItem({ scale: parseFloat(e.target.value) })} onMouseDown={beginHistorySnapshot} onMouseUp={commitHistorySnapshot} onTouchStart={beginHistorySnapshot} onTouchEnd={commitHistorySnapshot} className="w-full accent-red-500 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer" />
                          {(isPlayerItem(selectedItem) || isConeItem(selectedItem) || isMaterialItem(selectedItem)) && (
                            <div className="mt-3 grid grid-cols-4 gap-2">
                              {SIZE_PRESETS.map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => {
                                    pushHistoryNow();
                                    updateSelectedItem({ scale: ELEMENT_SCALES[size] });
                                    if (isPlayerItem(selectedItem)) setPlayerSize(size);
                                    if (isConeItem(selectedItem)) setConeSize(size);
                                    if (isMaterialItem(selectedItem)) setMaterialSize(size);
                                  }}
                                  className={`rounded-xl border px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-all ${selectedElementSize === size ? 'border-red-500 bg-red-500 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedItem.type?.startsWith('player-') && (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                          <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-slate-500">Color</span>
                          <div className="grid grid-cols-6 gap-2">
                            {PLAYER_TOOL_COLORS.map((c) => (
                              <button
                                key={c}
                                onClick={() => { pushHistoryNow(); updateSelectedItem({ color: c }); }}
                                style={{ backgroundColor: c }}
                                className={`h-7 w-7 rounded-full border-2 transition-all ${selectedItem.color === c ? 'border-red-500 scale-110' : 'border-white/30 hover:scale-105'}`}
                                aria-label={`Color de jugador ${c}`}
                                title={c}
                              />
                            ))}
                          </div>
                          {selectedItem.playerId !== undefined && selectedItem.playerPhoto && selectedItem.playerPhoto.length > 1 && (
                            <p className="mt-2 text-[9px] font-semibold text-slate-500">El color queda oculto por la foto del jugador; quítasela para verlo.</p>
                          )}
                        </div>
                      )}

                      {selectedItem.type?.startsWith('arrow-') && (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                          <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-slate-500">Color</span>
                          <div className="grid grid-cols-6 gap-2 mb-4">
                            {TEXT_COLORS.map((c) => (
                              <button
                                key={c}
                                onClick={() => { pushHistoryNow(); updateSelectedItem({ color: c }); }}
                                style={{ backgroundColor: c }}
                                className={`h-7 w-7 rounded-full border-2 transition-all ${selectedItem.color === c ? 'border-red-500 scale-110' : 'border-white/30 hover:scale-105'}`}
                                aria-label={`Color de flecha ${c}`}
                                title={c}
                              />
                            ))}
                          </div>
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Grosor</span>
                              <span className="text-[10px] font-black text-red-400">{(selectedItem.strokeWidth ?? 0.3).toFixed(2)}</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="1"
                              step="0.05"
                              value={selectedItem.strokeWidth ?? 0.3}
                              onChange={(e) => { pushHistoryNow(); updateSelectedItem({ strokeWidth: parseFloat(e.target.value) }); }}
                              onMouseDown={beginHistorySnapshot}
                              onMouseUp={commitHistorySnapshot}
                              onTouchStart={beginHistorySnapshot}
                              onTouchEnd={commitHistorySnapshot}
                              className="w-full accent-red-500 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      {selectedItem.type === 'text' && (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                          <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-slate-500">Texto</span>
                          <input
                            type="text"
                            value={selectedItem.text || ''}
                            onChange={(e) => updateSelectedItem({ text: e.target.value })}
                            onFocus={beginHistorySnapshot}
                            onBlur={commitHistorySnapshot}
                            maxLength={40}
                            className="mb-3 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                          />
                          <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-slate-500">Tamaño</span>
                          <div className="mb-3 grid grid-cols-4 gap-2">
                            {SIZE_PRESETS.map((size) => (
                              <button
                                key={size}
                                onClick={() => { pushHistoryNow(); updateSelectedItem({ fontSize: TEXT_SIZES[size] }); }}
                                className={`rounded-xl border px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-all ${selectedItem.fontSize === TEXT_SIZES[size] ? 'border-red-500 bg-red-500 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                          <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-slate-500">Color</span>
                          <div className="grid grid-cols-6 gap-2">
                            {TEXT_COLORS.map((c) => (
                              <button
                                key={c}
                                onClick={() => { pushHistoryNow(); updateSelectedItem({ color: c }); }}
                                style={{ backgroundColor: c }}
                                className={`h-7 w-7 rounded-full border-2 transition-all ${selectedItem.color === c ? 'border-red-500 scale-110' : 'border-white/30 hover:scale-105'}`}
                                aria-label={`Color de texto ${c}`}
                                title={c}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExerciseDesigner;
