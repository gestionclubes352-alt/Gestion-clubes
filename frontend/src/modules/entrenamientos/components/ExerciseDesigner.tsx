import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { DesignerItem, Exercise } from '../types';
import { getDesignerItemAnimationClass } from '../types';
import type { TrainingTask } from '@modules/repositorio-tareas';
import { db } from '@shared/services/dataService';
import SlalomPoleIcon from '@shared/components/SlalomPoleIcon';
import SoccerBallIcon from '@shared/components/SoccerBallIcon';

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

const TEXT_SIZES: Record<'S' | 'M' | 'L' | 'XL', number> = { S: 16, M: 22, L: 30, XL: 42 };

const ExerciseDesigner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Tarea a preseleccionar al llegar desde el Repositorio de Tareas (creación rápida de una tarea nueva)
  const incomingSelectTaskIdRef = useRef<string | null>((location.state as any)?.selectTaskId ?? null);
  const fromSessionCreationRef = useRef<boolean>((location.state as any)?.fromSessionCreation ?? false);
  const [incomingTaskApplied, setIncomingTaskApplied] = useState(false);
  const [frames, setFrames] = useState<DesignerItem[][]>([[]]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameDuration] = useState(2000);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState('NUEVO EJERCICIO TÁCTICO');
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState<'Juego' | 'Posesión' | 'Finalización'>('Juego');
  const [tasks, setTasks] = useState<Array<{ id: string; name: string; type: 'Juego' | 'Posesión' | 'Finalización'; designerSnapshot?: DesignerItem[] }>>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
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
          designerSnapshot: t.designerSnapshot || []
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
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
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
  const [hideSelectionOnDrag, setHideSelectionOnDrag] = useState(false);
  const [activeStructure, setActiveStructure] = useState('campo-total');
  const [showPlayerNumbers, setShowPlayerNumbers] = useState(true);
  const [textDraft, setTextDraft] = useState('Texto');
  const [textSize, setTextSize] = useState<'S' | 'M' | 'L' | 'XL'>('M');
  const [textColor, setTextColor] = useState('#ffffff');
  
  const [showStructure, setShowStructure] = useState(true);
  const [showPlayers, setShowPlayers] = useState(true);
  const [showCones, setShowCones] = useState(true);
  const [showText, setShowText] = useState(true);
  const [showMaterial, setShowMaterial] = useState(true);
  
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [initialResizeData, setInitialResizeData] = useState({ x: 0, y: 0, w: 0, h: 0, itemX: 0, itemY: 0 });
  
  const pitchRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      clearSelection();
      setSelectionBox(null);
      selectionRef.current = null;
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
      { id: 'arrow', label: 'FLECHA', icon: 'fa-arrow-right' },
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

  type LocalTask = { id: string; name: string; type: 'Juego' | 'Posesión' | 'Finalización'; designerSnapshot?: DesignerItem[] };

  const taskTypes: Array<'Juego' | 'Posesión' | 'Finalización'> = ['Juego', 'Posesión', 'Finalización'];
  const tasksByType = useMemo(() => {
    return taskTypes.reduce((acc, type) => {
      acc[type] = tasks.filter(t => t.type === type);
      return acc;
    }, {} as Record<'Juego' | 'Posesión' | 'Finalización', LocalTask[]>);
  }, [tasks]);

  /** Deep-clone de items del canvas para evitar referencias compartidas */
  const deepCloneItems = (items: DesignerItem[]): DesignerItem[] => {
    if (!items || items.length === 0) return [];
    return JSON.parse(JSON.stringify(items));
  };

  /** Persistir snapshot de una tarea en la DB */
  const persistTaskSnapshot = async (taskId: string, snapshot: DesignerItem[]) => {
    try {
      const { data } = await db.task_templates.get();
      if (!data) return;
      const existing = (data as TrainingTask[]).find(t => t.id === taskId);
      if (existing) {
        await db.task_templates.upsert({ ...existing, designerSnapshot: snapshot, updatedAt: new Date().toISOString() });
      }
    } catch (err) {
      console.error('Error persistiendo snapshot:', err);
    }
  };

  const handleAddTask = async () => {
    const name = taskName.trim();
    if (!name) return;
    // Capturar snapshot actual del canvas (deep-clone)
    const snapshot = deepCloneItems(frames[currentFrameIndex]);
    const newTaskId = crypto.randomUUID();
    const newTask = { id: newTaskId, name, type: taskType, designerSnapshot: snapshot };
    setTasks(prev => [newTask, ...prev]);
    setTaskName('');
    // Limpiar el canvas tras crear la tarea
    pushHistoryNow();
    setFrames([[]]);
    setCurrentFrameIndex(0);
    setActiveTaskId(null);
    // Guardar en el repositorio de tareas (db.task_templates)
    const now = new Date().toISOString();
    const taskTemplate: TrainingTask = {
      id: newTaskId,
      name: newTask.name,
      category: newTask.type,
      description: '',
      sessionPhase: 'Parte Principal',
      intensity: 'Media',
      durationMinutes: 15,
      minPlayers: 2,
      maxPlayers: 22,
      objectives: [],
      materials: [],
      tags: [],
      designerSnapshot: snapshot,
      createdAt: now,
      updatedAt: now,
    };
    await db.task_templates.upsert(taskTemplate);
    // Si viene de una creación desde sesión, regresar automáticamente con la ID de la tarea creada
    if (fromSessionCreationRef.current) {
      navigate('/calendario', { state: { newTaskId } });
    } else {
      setSaveStatus('TAREA CREADA');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const handleRemoveTask = (id: string) => {
    if (activeTaskId === id) {
      setActiveTaskId(null);
      setFrames([[]]);
      setCurrentFrameIndex(0);
    }
    setTasks(prev => prev.filter(t => t.id !== id));
    db.task_templates.delete(id).catch(err => console.error('Error eliminando tarea:', err));
  };

  const handleDuplicateTask = (task: { id: string; name: string; type: 'Juego' | 'Posesión' | 'Finalización'; designerSnapshot?: DesignerItem[] }) => {
    const snapshot = deepCloneItems(task.designerSnapshot || []);
    const newTask = { id: crypto.randomUUID(), name: `${task.name} (copia)`, type: task.type, designerSnapshot: snapshot };
    setTasks(prev => [newTask, ...prev]);
    const now = new Date().toISOString();
    const taskTemplate: TrainingTask = {
      id: newTask.id,
      name: newTask.name,
      category: newTask.type,
      description: '',
      sessionPhase: 'Parte Principal',
      intensity: 'Media',
      durationMinutes: 15,
      minPlayers: 2,
      maxPlayers: 22,
      objectives: [],
      materials: [],
      tags: [],
      designerSnapshot: snapshot,
      createdAt: now,
      updatedAt: now,
    };
    db.task_templates.upsert(taskTemplate).catch(err => console.error('Error duplicando tarea:', err));
  };

  /** Auto-guardar la tarea activa actual antes de cambiar */
  const autoSaveActiveTask = () => {
    if (!activeTaskId) return;
    const snapshot = deepCloneItems(frames[currentFrameIndex]);
    setTasks(prev => prev.map(t => t.id === activeTaskId ? { ...t, designerSnapshot: snapshot } : t));
    persistTaskSnapshot(activeTaskId, snapshot);
  };

  /** Seleccionar una tarea y cargar su snapshot en el canvas */
  const handleSelectTask = (task: { id: string; name: string; type: 'Juego' | 'Posesión' | 'Finalización'; designerSnapshot?: DesignerItem[] }) => {
    // Si ya estamos en esta tarea, auto-guardar y deseleccionar
    if (activeTaskId === task.id) {
      autoSaveActiveTask();
      setActiveTaskId(null);
      pushHistoryNow();
      setFrames([[]]);
      setCurrentFrameIndex(0);
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
  const handleSaveActiveTask = () => {
    if (!activeTaskId) return;
    const snapshot = deepCloneItems(frames[currentFrameIndex]);
    setTasks(prev => prev.map(t => t.id === activeTaskId ? { ...t, designerSnapshot: snapshot } : t));
    persistTaskSnapshot(activeTaskId, snapshot);
    setSaveStatus('TAREA GUARDADA');
    setTimeout(() => setSaveStatus(null), 2000);
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

  /** Guardar: si hay una tarea activa se guarda su snapshot, si no se guarda el desarrollo libre */
  const handleSaveClick = () => {
    if (activeTaskId) {
      handleSaveActiveTask();
    } else {
      handleSaveDevelopment();
    }
  };

  /** Volver al repositorio de tareas o a la sesión, guardando antes los cambios de la tarea activa */
  const handleBackClick = () => {
    if (activeTaskId) {
      autoSaveActiveTask();
    }
    if (fromSessionCreationRef.current) {
      navigate('/calendario');
    } else {
      navigate('/repositorio-tareas', { state: activeTaskId ? { openTaskId: activeTaskId } : undefined });
    }
  };

  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || resizingId || draggingId || isPlaying) return;
    if (!selectedTool) { clearSelection(); return; }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const isCone = selectedTool.startsWith('cone-');
    const isPlayer = selectedTool.startsWith('player-');
    
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
  const newItem: DesignerItem = {
      id: Math.random().toString(),
      type: isCone ? 'cone' : selectedTool,
      x, y, rotation: 0, scale: 1, locked: false,
      zIndex: nextZ,
      color: coneColor || tools.jugadores.find(p => p.id === selectedTool)?.color || (isText ? textColor : undefined),
      icon: [...tools.anotacion, ...tools.material].find(t => t.id === selectedTool)?.icon,
      width: selectedTool === 'zone' ? 15 : selectedTool === 'ladder' ? 11 : undefined,
      height: selectedTool === 'zone' ? 15 : selectedTool === 'ladder' ? 6 : undefined,
      text: isText ? (textDraft.trim() || 'Texto') : undefined,
      fontSize: isText ? TEXT_SIZES[textSize] : undefined,
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
    if (e.target !== e.currentTarget || resizingId || draggingId || isPlaying || selectedTool) return;
    const start = getPitchPercentPoint(e.clientX, e.clientY);
    if (!start) return;

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
    if (resizingId || isPlaying) return;
    if (item.locked) { selectItemOnly(item.id); return; }
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Capture pointer for reliable tracking (touch + mouse)
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    beginHistorySnapshot();
    draggingRef.current = item.id;
    draggingIdsRef.current = selectedIds.includes(item.id) && selectedIds.length > 1 ? selectedIds : [item.id];
    hasDragged.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartPercentRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
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
  }, [resizingId, isPlaying, items, selectedIds, selectItemIds, selectItemOnly]);

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
      if (selectionRef.current?.active && pitchRef.current) {
        const rect = pitchRef.current.getBoundingClientRect();
        const currentX = ((e.clientX - rect.left) / rect.width) * 100;
        const currentY = ((e.clientY - rect.top) / rect.height) * 100;
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
        const rect = pitchRef.current.getBoundingClientRect();
        const currentPercent = {
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        };
        const deltaX = currentPercent.x - dragStartPercentRef.current.x;
        const deltaY = currentPercent.y - dragStartPercentRef.current.y;
        const idsToMove = draggingIdsRef.current.length > 0 ? draggingIdsRef.current : [draggingRef.current];

        updateFrames(prev => prev.map(item => {
          const startPosition = dragStartPositionsRef.current[item.id];
          if (!startPosition || !idsToMove.includes(item.id)) return item;
          return {
            ...item,
            x: Math.min(98, Math.max(2, startPosition.x + deltaX)),
            y: Math.min(98, Math.max(2, startPosition.y + deltaY)),
          };
        }));
      });
    };

    const onPointerUp = () => {
      cancelAnimationFrame(rafId.current);
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
  }, [clearSelection, getItemBounds, rectIntersects, selectItemIds]);

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

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.zIndex - b.zIndex), [items]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const selectedItem = selectedIds.length === 1 ? items.find(i => i.id === selectedId) : null;
  const getResizableDimensions = (item: DesignerItem) => {
    const fallback = RESIZABLE_DEFAULT_SIZES[item.type];
    return {
      width: item.width ?? fallback?.width,
      height: item.height ?? fallback?.height,
    };
  };
  const canResizeItem = (item: DesignerItem) => item.type === 'zone' || item.type === 'goal';
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
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
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">ACCIONES</h4>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("¿Borrar todo?")) {
                  pushHistoryNow();
                  setFrames([[]]);
                  setCurrentFrameIndex(0);
                }
              }}
              className="bg-slate-50 text-red-600 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-trash-can"></i> Limpiar
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyCount === 0}
              className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${historyCount === 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            >
              <i className="fa-solid fa-rotate-left"></i> Deshacer
            </button>
            <button
              type="button"
              onClick={() => setHideSelectionOnDrag(v => !v)}
              className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                hideSelectionOnDrag
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              aria-pressed={hideSelectionOnDrag}
              title="Al arrastrar un elemento, deja de mostrar su marca de selección"
            >
              <i className={`fa-solid ${hideSelectionOnDrag ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              {hideSelectionOnDrag ? 'Marca al arrastrar OFF' : 'Marca al arrastrar ON'}
            </button>
          </div>
        </div>

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
          <div className="flex items-center justify-between gap-3 mb-1">
            <button type="button" onClick={() => setShowPlayers(v => !v)} className="flex items-center gap-2">
              <h4 className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">JUGADORES</h4>
              <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${showPlayers ? '' : '-rotate-90'}`}></i>
            </button>
            <button
              type="button"
              onClick={() => setShowPlayerNumbers(v => !v)}
              className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 shrink-0 ${
                showPlayerNumbers
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              aria-pressed={showPlayerNumbers}
              title="Mostrar u ocultar dorsales de los jugadores"
            >
              <i className={`fa-solid ${showPlayerNumbers ? 'fa-hashtag' : 'fa-minus'}`}></i>
              {showPlayerNumbers ? 'Dorsales ON' : 'Dorsales OFF'}
            </button>
          </div>
          {showPlayers && (
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
              {tools.jugadores.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTool(p.id)}
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
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <button type="button" onClick={() => setShowCones(v => !v)} className="flex justify-between items-center px-2 w-full">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">CONOS</h4>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${showCones ? '' : '-rotate-90'}`}></i>
          </button>
          {showCones && (
            <div className="grid grid-cols-4 gap-2 px-1">
              {tools.conos.map((cone) => (
                <button key={cone.id} onClick={() => setSelectedTool(cone.id)} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border bg-[#121212] ${selectedTool === cone.id ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#f1f5f9] scale-105' : 'border-transparent opacity-80 hover:opacity-100'}`}>
                  <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px]" style={{ borderBottomColor: cone.color }}></div>
                  <div className="w-6 h-1 bg-white/40 rounded-full mt-1"></div>
                </button>
              ))}
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
                    {(['S', 'M', 'L', 'XL'] as const).map((size) => (
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

        <div className="flex flex-col gap-3 pb-8">
          <button type="button" onClick={() => setShowMaterial(v => !v)} className="flex justify-between items-center px-2 w-full">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">MATERIAL</h4>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform ${showMaterial ? '' : '-rotate-90'}`}></i>
          </button>
          {showMaterial && (
            <div className="grid grid-cols-2 gap-2 px-1">
              {tools.material.map((m) => (
                <button key={m.id} onClick={() => setSelectedTool(m.id)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border ${selectedTool === m.id ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg scale-105' : 'bg-white text-slate-600 border-slate-200 hover:bg-white/80'}`}>
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
          )}
        </div>

      </aside>

      <main className="flex-1 flex flex-col bg-white relative overflow-hidden">
        <header className="p-6 flex justify-between items-center bg-white border-b border-slate-100 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBackClick}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
              title="Volver al repositorio de tareas"
              aria-label="Volver al repositorio de tareas"
            >
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </button>
            <div className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-chess-board text-white text-sm"></i></div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">DEMO - DISEÑO TÁCTICO</p>
              <input
                type="text"
                value={activeProject}
                onChange={(e) => setActiveProject(e.target.value)}
                className="text-xl font-black uppercase text-[var(--accent)] tracking-tighter leading-none bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-slate-100 rounded"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 relative">
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
              <i className="fa-solid fa-floppy-disk"></i> Guardar
            </button>
          </div>
        </header>

        <div className="flex h-[58px] items-center gap-2 border-b border-slate-200 px-3 md:px-4">
          <button
            type="button"
            onClick={() => {
              if (!isPlaying && currentFrameIndex >= frames.length - 1) {
                setCurrentFrameIndex(0);
              }
              setIsPlaying(v => !v);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-white"
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-[12px]`} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--sidebar-bg)] text-white"
            onClick={() => {
              pushHistoryNow();
              const newIndex = frames.length;
              setFrames(prev => [...prev, [...prev[prev.length - 1]]]);
              setCurrentFrameIndex(newIndex);
            }}
          >
            <i className="fa-solid fa-plus text-[12px]" />
          </button>
          <div className="flex h-8 w-[170px] items-center rounded-md border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-700">
            Normal
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide max-w-[260px]">
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
            className={`flex h-8 w-8 items-center justify-center rounded-md text-white transition-all ${frames.length <= 1 ? 'bg-slate-200 cursor-not-allowed' : 'bg-[#c92525] hover:opacity-90'}`}
            title="Eliminar fotograma actual"
            aria-label="Eliminar fotograma actual"
          >
            <i className="fa-solid fa-trash-can text-[12px]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex gap-2 p-2 relative overflow-hidden bg-slate-50">
          <div className="flex-[1.35] min-w-0 min-h-0 flex flex-col items-start gap-2">
            <div className="relative w-full flex-1 min-h-0 flex items-start justify-start p-0">
              <div
                ref={pitchRef}
                className="max-w-full max-h-full rounded-3xl relative border-[12px] border-[#ffffff22] cursor-crosshair overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)] transition-all duration-500 origin-center ml-0"
                onPointerDown={handlePitchPointerDown}
                onClick={handlePitchBackgroundClick}
                style={{
                  ...FIELD_BACKGROUND,
                  aspectRatio: activeStructure === 'libre'
                    ? '105 / 68'
                    : activeStructure === 'campo-total'
                      ? '105 / 68'
                    : (activeStructure === 'ataque' || activeStructure === 'defensa')
                      ? '68 / 52.5'
                      : '3 / 4',
                  height: 'auto',
                  width: '100%',
                }}
              >
                {activeStructure !== 'libre' && (
                  <svg
                    className="absolute pointer-events-none opacity-35"
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

                {selectionBox && selectionRef.current?.moved && (
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

                {sortedItems.map((item) => (
                  (() => {
                    const size = getResizableDimensions(item);
                    const isResizable = canResizeItem(item);
                    const itemWidth = size.width ? `${size.width}%` : 'auto';
                    const itemHeight = size.height ? `${size.height}%` : 'auto';
                    const isBeingDragged = draggingId === item.id;
                    const isItemSelected = selectedIds.includes(item.id) && !(hideSelectionOnDrag && isBeingDragged);
                    const showResizeHandles = selectedId === item.id && selectedIds.length === 1 && isResizable && !item.locked;
                    const animationClass = getDesignerItemAnimationClass(item.animation);

                    return (
                  <div
                    key={item.id}
                    data-item-root={item.id}
                    className={`absolute group cursor-grab touch-none ${draggingId === item.id ? 'cursor-grabbing z-[9999] scale-105 opacity-75' : isPlaying ? 'transition-all duration-[2000ms] ease-in-out' : ''} ${isItemSelected ? (item.type === 'zone' || item.type === 'goal' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a4716]' : 'ring-2 ring-white ring-offset-2 ring-offset-[#1a4716] rounded-full') : ''}`}
                    onPointerDown={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('[data-resize-handle="true"]')) return;
                      handleDragStart(e, item);
                    }}
                    onClick={(e) => { e.stopPropagation(); if (!hasDragged.current) { selectItemOnly(item.id); } }}
                    style={{ 
                      left: `${item.x}%`, 
                      top: `${item.y}%`,
                      zIndex: item.zIndex,
                      transform: `${item.type === 'zone' ? 'none' : 'translate(-50%, -50%)'} rotate(${item.rotation}deg) scale(${item.scale})`,
                      width: item.type === 'goal' || item.type === 'zone' ? itemWidth : (item.width ? `${item.width}%` : 'auto'),
                      height: item.type === 'goal' || item.type === 'zone' ? itemHeight : (item.height ? `${item.height}%` : 'auto')
                    }}
                  >
                    {resizingId === item.id && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 whitespace-nowrap pointer-events-none z-20">
                        <div className="rounded-full bg-black/85 px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                          {Math.round(size.width ?? 0)}% × {Math.round(size.height ?? 0)}%
                        </div>
                        <div className="rounded-full bg-black/85 px-2.5 py-1 text-[9px] font-semibold text-white/80 shadow-lg">
                          Dale a esc para dejar de modificar
                        </div>
                      </div>
                    )}
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
                    ) : item.type?.startsWith('player-') ? (
                      <div
                        style={{ backgroundColor: item.color }}
                        className={`w-10 h-10 rounded-full border-[4px] border-white shadow-xl flex items-center justify-center font-black text-white ${animationClass}`}
                      >
                        {showPlayerNumbers && (
                          <span className="text-[13px] leading-none">
                            {Number(item.type.replace('player-', ''))}
                          </span>
                        )}
                      </div>
                    ) : (
                      <i className={`fa-solid ${item.icon} text-3xl text-white drop-shadow-lg ${animationClass}`}></i>
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
                      className="absolute -top-2 -right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#121212]/90 text-white shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-[var(--accent)] hover:text-white"
                      title="Editar elemento"
                      aria-label="Editar elemento"
                    >
                      <i className="fa-solid fa-pen-to-square text-sm"></i>
                    </button>
                  </div>
                    );
                  })()
                ))}                {selectedItem && selectedPanelStyle && isSelectedPanelOpen && !(hideSelectionOnDrag && draggingId === selectedItem.id) && (
                  <div className="pointer-events-none absolute inset-0 z-30">
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
                        </div>
                      </div>

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
                            {(['S', 'M', 'L', 'XL'] as const).map((size) => (
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
