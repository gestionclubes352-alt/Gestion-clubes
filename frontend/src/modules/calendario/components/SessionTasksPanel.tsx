import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { db, tareasStaffCatalogoService } from '@shared/services/dataService';
import { useAuth } from '@context/AuthContext';
import type { TrainingTask } from '@modules/repositorio-tareas';
import { CATEGORY_ICONS, CATEGORY_COLORS, TaskDetailModal, DesignerPreview } from '@modules/repositorio-tareas';
import type { SessionTask } from '../types';
import { getEmbeddedFontCss } from '../utils/pdfFonts';
import type { Player } from '@modules/plantilla';
import { getFirstDesignerFrame } from '@modules/entrenamientos/types';

/** Nombre en minúsculas con la inicial de cada palabra en mayúscula (p. ej. "MIGUEL FUENTES" → "Miguel Fuentes"). */
// ── Roles técnicos: cada línea "Técnico: rol" (se mantiene como texto para no cambiar el modelo) ──
const DEFAULT_STAFF = ['Lizer', 'Raúl'];
const DEFAULT_ROLES = ['Balones fase defensiva', 'Balones fase ofensiva'];
/** Quita el prefijo "Sergio - " de los roles (p. ej. "Sergio - Dirigir tarea" → "Dirigir tarea"). */
const cleanRole = (r: string) => r.replace(/^\s*Sergio\s*-\s*/i, '');
/** Textarea que se estira con su contenido (sin barra de desplazamiento). */
const AutoGrowTextarea: React.FC<{
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; minHeight?: number;
}> = ({ value, onChange, placeholder, className, minHeight = 80 }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, [minHeight]);
  React.useLayoutEffect(resize, [value, resize]);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(resize); // reajusta si cambia el ancho de la columna
    ro.observe(el);
    return () => ro.disconnect();
  }, [resize]);
  return <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={className} rows={1} />;
};
const ADD_NEW = '__add__';
const MIN_ROWS = 1;// filas visibles por defecto; el resto con "+ Seleccionar técnico"

const parseRoleLines = (text?: string): { staff: string; role: string }[] =>
  (text || '').split('\n').filter(l => l.trim()).map(l => {
    const i = l.indexOf(':');
    return i < 0 ? { staff: '', role: l.trim() } : { staff: l.slice(0, i).trim(), role: l.slice(i + 1).trim() };
  });
const serializeRoleLines = (rows: { staff: string; role: string }[]) =>
  rows.map(r => (r.staff ? `${r.staff}: ${r.role}` : r.role)).join('\n');

const TechnicalRolesEditor: React.FC<{ value?: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const { perfil } = useAuth();
  const clubId = perfil?.club_id;
  const [staffList, setStaffList] = useState<string[]>(DEFAULT_STAFF);
  const [roleList, setRoleList] = useState<string[]>(DEFAULT_ROLES);

  // Catálogo compartido del club (tabla tareas_staff_catalogo)
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    tareasStaffCatalogoService.list({ club_id: clubId }).then(rows => {
      if (cancelled) return;
      const merge = (tipo: 'tecnico' | 'rol', defaults: string[]) => {
        const names = rows.filter(r => r.tipo === tipo).map(r => (tipo === 'rol' ? cleanRole(r.nombre) : r.nombre));
        return [...defaults, ...Array.from(new Set(names)).filter(n => !defaults.includes(n))];
      };
      setStaffList(merge('tecnico', DEFAULT_STAFF));
      setRoleList(merge('rol', DEFAULT_ROLES));
    }).catch(() => { /* sin catálogo: se usan los valores por defecto */ });
    return () => { cancelled = true; };
  }, [clubId]);
  const lines = parseRoleLines(value);
  const [draft, setDraft] = useState(false); // fila nueva aún sin técnico
  // Técnicos disponibles: catálogo + los que figuren en datos antiguos
  const allStaff = [...staffList, ...lines.map(l => l.staff).filter((n, i, arr) => n && !staffList.includes(n) && arr.indexOf(n) === i)];

  const commit = (rows: { staff: string; role: string }[]) =>
    onChange(serializeRoleLines(rows.filter(r => r.staff || r.role)));
  // Por defecto se muestran MIN_ROWS filas (vacías si aún no hay datos)
  const rows = [...lines, ...Array.from({ length: Math.max(0, MIN_ROWS - lines.length) }, () => ({ staff: '', role: '' }))];
  const updateRow = (i: number, patch: Partial<{ staff: string; role: string }>) =>
    commit(rows.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeRow = (i: number) => commit(lines.filter((_, idx) => idx !== i));

  const addToCatalog = (kind: 'staff' | 'role'): string | null => {
    const name = window.prompt(kind === 'staff' ? 'Nombre del técnico' : 'Nombre del rol')?.trim().replace(/[\r\n:]+/g, ' ');
    if (!name) return null;
    const list = kind === 'staff' ? staffList : roleList;
    if (!list.includes(name)) {
      (kind === 'staff' ? setStaffList : setRoleList)([...list, name]);
      if (clubId) {
        tareasStaffCatalogoService
          .create({ club_id: clubId, tipo: kind === 'staff' ? 'tecnico' : 'rol', nombre: name })
          .catch(() => { /* ya existente o sin permisos: se mantiene en la lista local */ });
      }
    }
    return name;
  };

  const pickRole = (i: number, v: string) => {
    if (v !== ADD_NEW) return updateRow(i, { role: v });
    const role = addToCatalog('role');
    if (role) updateRow(i, { role });
  };
  const pickStaff = (i: number, v: string) => {
    if (v !== ADD_NEW) return updateRow(i, { staff: v });
    const staff = addToCatalog('staff');
    if (staff) updateRow(i, { staff });
  };
  const pickDraftStaff = (v: string) => {
    const staff = v === ADD_NEW ? addToCatalog('staff') : v;
    if (!staff) return;
    setDraft(false);
    commit([...lines, { staff, role: '' }]);
  };

  const staffOptions = (
    <>
      <option value="">Seleccionar técnico…</option>
      {allStaff.map(x => <option key={x} value={x}>{x}</option>)}
      <option value={ADD_NEW}>+ Añadir técnico (si no está en la lista)…</option>
    </>
  );
  const selectCls = 'min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-1 py-1 !text-[9px] !min-h-0 font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30';

  const roleOptions = (rawCurrent: string) => {
    const current = cleanRole(rawCurrent);
    return (
    <>
      <option value="">Sin rol</option>
      {current && !roleList.includes(current) && <option value={current}>{current}</option>}
      {roleList.map(x => <option key={x} value={x}>{x}</option>)}
      <option value={ADD_NEW}>+ Añadir rol…</option>
    </>
    );
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-1 flex-1 min-h-[40px] overflow-y-auto">
      {rows.map((l, i) => (
        <div key={i} className="flex items-center gap-1">
          <select value={l.staff} onChange={e => pickStaff(i, e.target.value)} className={`${selectCls} !flex-[2]`}>
            {staffOptions}
          </select>
          <select value={cleanRole(l.role)} onChange={e => pickRole(i, e.target.value)} className={`${selectCls} !flex-[3]`}>
            {roleOptions(l.role)}
          </select>
          {i < lines.length ? (
            <button type="button" onClick={() => removeRow(i)} title="Quitar"
              className="shrink-0 px-1 text-[12px] font-black text-slate-400 hover:text-red-500">×</button>
          ) : <span className="shrink-0 px-1 text-[12px] invisible">×</span>}
        </div>
      ))}
      {draft && (
        <div className="flex items-center gap-1">
          <select value="" onChange={e => pickDraftStaff(e.target.value)} className={selectCls}>
            {staffOptions}
          </select>
          <button type="button" onClick={() => setDraft(false)} title="Cancelar"
            className="shrink-0 px-1 text-[12px] font-black text-slate-400 hover:text-red-500">×</button>
        </div>
      )}
      <button type="button" onClick={() => setDraft(true)}
        className="self-start !min-h-0 text-[9px] font-black text-[var(--accent)] hover:underline">+ Seleccionar técnico</button>
    </div>
  );
};

const formatPlayerName =(name?: string) =>
  (name || '').toLocaleLowerCase('es').replace(/(^|[\s'-])(\p{L})/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase('es'));

/** Líneas de la plantilla; `match` agrupa también las demarcaciones específicas (p. ej. Lateral → Defensas). */
const POSITION_GROUPS = [
  { label: 'Porteros', match: /portero/i },
  { label: 'Defensas', match: /defensa|lateral|central/i },
  { label: 'Medios', match: /medio|pivote|interior|media punta|mediapunta/i },
  { label: 'Delanteros', match: /delantero|extremo|punta/i },
];

/** Índice de la línea a la que pertenece una posición; las desconocidas van al final. */
const positionGroupIndex = (posicion?: string): number => {
  const idx = POSITION_GROUPS.findIndex(g => g.match.test(posicion || ''));
  return idx === -1 ? POSITION_GROUPS.length : idx;
};

interface SessionTasksPanelProps {
  tasks: SessionTask[];
  onChange: (tasks: SessionTask[]) => void;
  /** ID del evento/sesión activo, para poder reabrirlo al volver del diseñador */
  eventId?: string;
  date?: Date;
  team?: string;
  sessionNumber?: number;
  squad?: Player[];
  attendance?: Record<string, string>;
  /** Plantilla completa de la sesión (convocados y no convocados), para el resumen de asistencia */
  allSquad?: Player[];
  /** Datos de la cabecera de sesión: club propio, competición/temporada y hora de inicio */
  header?: { clubName?: string; clubLogo?: string; subtitle?: string; time?: string };
}

const SessionTasksPanel: React.FC<SessionTasksPanelProps> = ({ tasks, onChange, eventId, date, team, sessionNumber, squad = [], attendance = {}, allSquad = [], header }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [repositoryTasks, setRepositoryTasks] = useState<TrainingTask[]>([]);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [fullscreenTaskId, setFullscreenTaskId] = useState<string | null>(null);
  const [showVests, setShowVests] = useState(true);
  const [showAttendanceSummary, setShowAttendanceSummary] = useState(false);
  const [pdfPreviewMode, setPdfPreviewMode] = useState<'full' | 'no-vests' | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  // Arrastre: la tarjeta solo es arrastrable mientras se pulsa el asa, para no romper la selección de texto en los campos
  const [armedTaskId, setArmedTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [pdfPreviewZoom, setPdfPreviewZoom] = useState(0.7);

  const fullscreenTask = useMemo(
    () => tasks.find(task => task.id === fullscreenTaskId) || null,
    [tasks, fullscreenTaskId]
  );
  const fullscreenIndex = useMemo(
    () => tasks.findIndex(task => task.id === fullscreenTaskId),
    [tasks, fullscreenTaskId]
  );

  // Precarga las fuentes incrustadas mientras el usuario mira la vista previa del PDF.
  React.useEffect(() => {
    if (pdfPreviewMode) void getEmbeddedFontCss();
  }, [pdfPreviewMode]);

  React.useEffect(() => {
    if (!fullscreenTaskId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenTaskId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenTaskId]);

  const totalDuration = useMemo(
    () => tasks.reduce((sum, task) => sum + (task.durationMinutes || 0), 0),
    [tasks]
  );

  const attendanceSummary = useMemo(() => {
    const attendees: Player[] = [];
    const absentees: { player: Player; reason: string }[] = [];
    for (const player of allSquad) {
      const status = attendance[String(player.id)] || 'Si';
      if (status === 'Si') {
        attendees.push(player);
      } else {
        absentees.push({ player, reason: status });
      }
    }
    const byPosition = (a: Player, b: Player) =>
      positionGroupIndex(a.posicion) - positionGroupIndex(b.posicion) ||
      (a.dorsal ?? 999) - (b.dorsal ?? 999);
    attendees.sort(byPosition);
    absentees.sort((a, b) => byPosition(a.player, b.player));
    return { attendees, absentees };
  }, [allSquad, attendance]);

  /** Asistentes agrupados por línea (porteros, defensas, medios, delanteros), con el mismo orden que la plantilla. */
  const attendeeGroups = useMemo(
    () =>
      POSITION_GROUPS.map((group, idx) => ({
        label: group.label,
        players: attendanceSummary.attendees.filter(p => positionGroupIndex(p.posicion) === idx),
      })).filter(g => g.players.length > 0),
    [attendanceSummary.attendees]
  );

  /** Cabecera de sesión (escudo, club, fecha, horario y nº de sesión), igual en pantalla y en el PDF. */
  const renderSessionHeader = (size: 'screen' | 'export') => {
    const big = size === 'export';
    const weekday = date ? date.toLocaleDateString(i18n.language, { weekday: 'short' }).replace('.', '') : '';
    const dateLabel = date
      ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
      : t('calendarView.notDefined');
    const start = header?.time;
    let timeLabel = start || '';
    const m = start?.match(/^(\d{1,2}):(\d{2})/);
    if (m && totalDuration > 0) {
      const endMin = Number(m[1]) * 60 + Number(m[2]) + totalDuration;
      const pad = (n: number) => String(n).padStart(2, '0');
      timeLabel = `${pad(Number(m[1]))}:${m[2]} – ${pad(Math.floor(endMin / 60) % 24)}:${pad(endMin % 60)}`;
    }
    const label = `${big ? 'text-[12px]' : 'text-[9px]'} font-black uppercase tracking-[0.18em] text-[var(--accent)]`;
    const value = `${big ? 'text-[22px]' : 'text-[12px]'} font-black text-slate-900 leading-tight`;

    return (
      <div className={`flex items-center flex-shrink-0 border-b-[4px] border-slate-900 ${big ? 'gap-8 pb-5 mb-4' : 'gap-4 pb-2 mb-2 flex-wrap'}`}>
        {header?.clubLogo && (
          <img
            src={header.clubLogo}
            alt=""
            crossOrigin="anonymous"
            className={`${big ? 'h-[110px] w-[110px]' : 'h-[52px] w-[52px]'} object-contain flex-shrink-0`}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={`${big ? 'text-[34px]' : 'text-[17px]'} font-black text-slate-900 uppercase tracking-wide leading-none truncate`}>
            {header?.clubName || team || t('calendarView.notDefined')}
          </p>
          {header?.subtitle && (
            <p className={`${big ? 'text-[30px] mt-2' : 'text-[15px] mt-1'} font-black uppercase tracking-[0.12em] text-[var(--accent)] leading-tight truncate`}>{header.subtitle}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className={`flex ${big ? 'gap-8' : 'gap-4'}`}>
            <div>
              <p className={label}>{t('calendarView.colDate')}</p>
              <p className={value}>{dateLabel}</p>
            </div>
            {timeLabel && (
              <div>
                <p className={label}>Horario</p>
                <p className={value}>{timeLabel}</p>
              </div>
            )}
          </div>
          <div className={`flex items-baseline gap-2 ${big ? 'mt-2' : 'mt-1'}`}>
            <p className={label}>Duración</p>
            <p className={value}>{totalDuration} min</p>
          </div>
        </div>
        <div
          className={`flex-shrink-0 flex flex-col items-center justify-center bg-[var(--accent)] text-white ${big ? 'rounded-2xl px-8 py-3 min-w-[120px]' : 'rounded-md px-2 py-0.5 min-w-[40px]'}`}
        >
          <span className={`${big ? 'text-[12px]' : 'text-[6px]'} font-black uppercase tracking-[0.2em] leading-none`}>Sesión</span>
          <span className={`${big ? 'text-[40px]' : 'text-[15px]'} font-black leading-none`}>{sessionNumber ?? '-'}</span>
        </div>
      </div>
    );
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setRepositoryLoading(true);
    try {
      const { data } = await db.task_templates.get();
      setRepositoryTasks(data as TrainingTask[]);
    } catch (err) {
      console.error('Error fetching task_templates:', err);
    }
    setRepositoryLoading(false);
  };

  const addTaskFromRepository = (task: TrainingTask) => {
    onChange([
      ...tasks,
      {
        id: `rt-${task.id}-${Date.now()}`,
        linkedTaskId: task.id,
        title: task.name,
        category: task.category,
        sessionPhase: 'Parte Principal',
        durationMinutes: 15,
        thumbnail: task.thumbnail,
        designerSnapshot: task.designerSnapshot,
        fieldStructure: task.fieldStructure,
        dimensions: task.dimensions,
      },
    ]);
    setPickerOpen(false);
  };

  const updateTask = (id: string, patch: Partial<SessionTask>) => {
    onChange(tasks.map(task => (task.id === id ? { ...task, ...patch } : task)));
  };

  const openExerciseDesigner = () => {
    setNewTaskModalOpen(true);
  };

  /** Al confirmar nombre y categoría, se crea la tarea en el repositorio y se abre el diseñador sobre ella */
  const handleCreateTaskAndDesign = async (task: TrainingTask) => {
    await db.task_templates.upsert(task);
    setNewTaskModalOpen(false);
    navigate('/disenador', {
      state: {
        selectTaskId: task.id,
        fromSessionCreation: true,
        returnEventId: eventId,
        sessionSquadIds: squad.map(p => String(p.id)),
      },
    });
  };

  /** Mueve una tarea a la posición de destino (reordenación por arrastre) */
  const moveTaskTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const from = tasks.findIndex(task => task.id === fromId);
    const to = tasks.findIndex(task => task.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...tasks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const endDrag = () => {
    setArmedTaskId(null);
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const removeTask = (id: string) => {
    onChange(tasks.filter(task => task.id !== id));
  };

  /** Abre el diseñador táctico sobre el dibujo ya guardado de esta tarea de sesión, para modificarlo */
  const editTaskDrawing = (task: SessionTask) => {
    if (!task.linkedTaskId) return;
    navigate('/disenador', {
      state: {
        selectTaskId: task.linkedTaskId,
        fromSessionCreation: true,
        returnEventId: eventId,
        editSessionTaskId: task.id,
        fallbackSnapshot: task.designerSnapshot,
        fallbackStructure: task.fieldStructure,
        fallbackTitle: task.title,
        fallbackCategory: task.category,
        sessionSquadIds: squad.map(p => String(p.id)),
      },
    });
  };

  const filteredRepository = useMemo(() => {
    if (!repoSearch) return repositoryTasks;
    const q = repoSearch.toLowerCase();
    return repositoryTasks.filter(task =>
      task.name.toLowerCase().includes(q)
    );
  }, [repositoryTasks, repoSearch]);

  const groupedRepositoryTasks = useMemo(() => {
    const grouped = new Map<string, TrainingTask[]>();
    for (const task of filteredRepository) {
      const category = task.category || 'Sin Categoría';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(task);
    }
    // Mantener un orden consistente de categorías
    const categoryOrder = ['Juego', 'Posesión', 'Finalización', 'Físico', 'Recuperación', 'Rondo'];
    const result: { category: string; tasks: TrainingTask[] }[] = [];
    for (const cat of categoryOrder) {
      if (grouped.has(cat)) {
        result.push({ category: cat, tasks: grouped.get(cat)! });
      }
    }
    // Agregar categorías no contempladas al final
    for (const [cat, tasks] of grouped) {
      if (!categoryOrder.includes(cat)) {
        result.push({ category: cat, tasks });
      }
    }
    return result;
  }, [filteredRepository]);

  /** Agrupa las tareas para el PDF con petos: la primera página lleva 2 ejercicios
   * (cabecera más cargada) y el resto de páginas caben 3 ejercicios cada una. */
  const exportPages = useMemo(() => {
    const pages: SessionTask[][] = [];
    if (tasks.length === 0) return pages;
    pages.push(tasks.slice(0, 2));
    for (let i = 2; i < tasks.length; i += 3) {
      pages.push(tasks.slice(i, i + 3));
    }
    return pages;
  }, [tasks]);

  /** Igual que exportPages pero para la versión "sin petos".
   * La primera página lleva el resumen de asistencia, así que solo caben 2 ejercicios en ella. */
  const exportPagesNoVests = useMemo(() => {
    const pages: SessionTask[][] = [];
    if (tasks.length === 0) return pages;
    pages.push(tasks.slice(0, 2));
    for (let i = 2; i < tasks.length; i += 3) {
      pages.push(tasks.slice(i, i + 3));
    }
    return pages;
  }, [tasks]);

  const renderExportCard = (task: SessionTask, globalIndex: number, hideVests = false) => {
    const seriesTotal =
      (task.numberOfSeries ?? 0) > 0
        ? (task.numberOfSeries ?? 0) * (task.timePerSeries ?? 0) +
          Math.max(0, (task.numberOfSeries ?? 0) - 1) * (task.restBetweenSeries ?? 0)
        : task.durationMinutes ?? 0;

    const filteredPlayers = squad;
    const vestColorStyles: Record<string, { bg: string; color: string }> = {
      '': { bg: '#ffffff', color: '#94a3b8' },
      rojo: { bg: '#ef4444', color: '#ffffff' },
      azul: { bg: '#3b82f6', color: '#ffffff' },
      verde: { bg: '#22c55e', color: '#ffffff' },
    };

    return (
      <div key={task.id} className="overflow-hidden rounded-xl border-2 border-slate-400 p-3 flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0 }}>
        {/* Header: insignia numerada, nombre y duración total en píldora */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="w-6 h-6 rounded-md bg-[var(--accent)] text-white flex items-center justify-center text-[12px] font-black flex-shrink-0">
            {globalIndex + 1}
          </span>
          <p className="font-black text-slate-800 text-[15px] truncate min-w-0">{task.title}</p>
          <span className="ml-auto flex-shrink-0 border-2 border-slate-800 rounded-full px-3.5 py-1 text-[18px] leading-none font-black text-slate-800">
            {seriesTotal}'
          </span>
        </div>

        {/* Cuerpo: pizarra (izda, reducida al 78% de la altura, más espacio a la dcha) | Info (dcha: series+roles / descripción) */}
        <div className="flex-1 min-h-0 flex gap-3">
          {/* Pizarra: se ajusta a la altura disponible manteniendo proporción 105:68, sin recortarse */}
          <div className="h-full flex-shrink-0 flex flex-col gap-2 overflow-hidden">
            {task.designerSnapshot && task.designerSnapshot.length > 0 ? (
              <div className="rounded-lg overflow-hidden border-2 border-slate-500" style={{ height: '78%', width: 'auto', aspectRatio: '105 / 68' }}>
                <DesignerPreview items={getFirstDesignerFrame(task.designerSnapshot)} fieldStructure={task.fieldStructure} className="w-full! h-full!" />
              </div>
            ) : task.thumbnail ? (
              <div className="rounded-lg bg-[#2f5a30] overflow-hidden flex items-center justify-center border-2 border-slate-500" style={{ height: '78%', width: 'auto', aspectRatio: '105 / 68' }}>
                <img loading="lazy" decoding="async" src={task.thumbnail} alt={task.title} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                className={`rounded-lg flex items-center justify-center text-white ${task.category ? CATEGORY_COLORS[task.category] : 'bg-slate-400'}`}
                style={{ height: '78%', width: 'auto', aspectRatio: '105 / 68' }}
              >
                <i className={`fa-solid ${task.category ? CATEGORY_ICONS[task.category] : 'fa-ellipsis'} text-[20px]`}></i>
              </div>
            )}
            {task.technicalRoles && (
              <div className="flex-1 min-h-0 overflow-hidden rounded-lg border-2 border-slate-400 p-2" style={{ width: 0, minWidth: '100%' }}>
                <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest mb-0.5">Roles Técnicos</p>
                <p className="text-[12px] font-medium text-slate-700 whitespace-pre-wrap leading-snug">{task.technicalRoles}</p>
              </div>
            )}
          </div>

          {/* Columna derecha: descripción */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden rounded-lg border-2 border-slate-400 p-2">
              <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest mb-0.5">{t('calendarView.fieldDescription')}</p>
              <p className="text-[13px] font-medium text-slate-800 whitespace-pre-wrap leading-snug">{task.description || '—'}</p>
            </div>
          </div>
        </div>

        {/* Fila de métricas inferior */}
        <div className="flex-shrink-0 grid grid-cols-6 border-t-2 border-slate-400 pt-1">
          {[
            ['Tipo', task.category || t('calendarView.notDefined'), false],
            ['Dimensiones', (task.dimensions?.length || task.dimensions?.width) ? `${task.dimensions?.length ?? '?'} x ${task.dimensions?.width ?? '?'} m` : '—', false],
            ['Nº Series', `${task.numberOfSeries ?? 0}`, false],
            ['T/Serie', `${task.timePerSeries ?? 0}`, false],
            ['Descanso', `${task.restBetweenSeries ?? 0}'`, true],
            ['Duración', `${seriesTotal}'`, true],
          ].map(([label, value, withClock], i) => (
            <div key={label as string} className={`px-2 ${i > 0 ? 'border-l-2 border-slate-400' : ''}`}>
              <p className="text-[11px] font-medium text-slate-500 leading-tight">{label}</p>
              <p className="text-[15px] font-black text-slate-800 leading-tight truncate">
                {withClock && <i className="fa-regular fa-clock mr-1 text-[13px] text-slate-500"></i>}
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Fila inferior: petos de entrenamiento a todo el ancho, compactos */}
        {!hideVests && filteredPlayers.length > 0 && (
          <div className="flex-shrink-0 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 overflow-hidden">
            <div className="grid grid-cols-4 gap-1">
              {filteredPlayers.map(player => {
                const current = task.playerVestColors?.[String(player.id)] || '';
                const style = vestColorStyles[current] || vestColorStyles[''];
                return (
                  <div key={player.id} className="flex items-center gap-0.5 px-1 py-0.5 rounded border border-slate-200 bg-white text-[9px]">
                    <span className="flex-1 min-w-0 truncate font-bold text-slate-700">{player.apodo || player.nombre}</span>
                    <div
                      style={{
                        width: '16px',
                        height: '13px',
                        borderRadius: '3px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: style.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: '7px', fontWeight: 700, color: style.color }}>
                        {current ? current[0].toUpperCase() : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  /** Contenido de una página de exportación (cabecera + grid de tareas), compartido entre los
   * contenedores ocultos usados por html2canvas y el modal de vista previa. */
  const renderExportPageContent = (pageTasks: SessionTask[], pageIndex: number, totalPages: number, hideVests: boolean) => {
    const cardsPerPage = pageIndex === 0 ? 2 : 3;
    const globalStartIndex = pageIndex === 0 ? 0 : 2 + (pageIndex - 1) * 3;

    return (
      <div
        data-export-page="true"
        className="bg-white flex flex-col overflow-hidden"
        style={{ width: '1191px', height: '1684px', padding: '40px' }}
      >
        <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-slate-100 flex-shrink-0">
          <div />
          <span className="text-[16px] font-black text-slate-400">{pageIndex + 1}/{totalPages}</span>
        </div>

        {pageIndex === 0 && renderSessionHeader('export')}

        {hideVests && pageIndex === 0 && (
          <div className="flex items-stretch gap-3 mb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">
                <i className="fa-solid fa-circle-check"></i> Asisten ({attendanceSummary.attendees.length})
              </p>
              <div className="flex flex-col gap-1">
                {attendeeGroups.map(group => (
                  <div key={group.label} className="flex items-start gap-1.5">
                    <span className="w-[62px] flex-shrink-0 text-[8px] font-black uppercase tracking-wider text-black pt-[3px]">{group.label}</span>
                    <div className="flex flex-wrap gap-1">
                      {group.players.map(player => (
                        <span key={player.id} className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 rounded px-1.5 py-0.5 whitespace-nowrap leading-tight">
                          {formatPlayerName(player.apodo || player.nombre)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-0 rounded-lg border border-red-200 bg-red-50 p-2">
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">
                <i className="fa-solid fa-circle-xmark"></i> No asisten ({attendanceSummary.absentees.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {attendanceSummary.absentees.map(({ player, reason }) => (
                  <span key={player.id} className="text-[10px] font-bold text-red-700 bg-white border border-red-200 rounded px-1.5 py-0.5 whitespace-nowrap leading-tight">
                    {formatPlayerName(player.apodo || player.nombre)} · {reason}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 flex-1 min-h-0 overflow-hidden" style={{ gridTemplateRows: `repeat(${cardsPerPage}, 1fr)` }}>
          {pageTasks.map((task, idxInPage) => renderExportCard(task, globalStartIndex + idxInPage, hideVests))}
        </div>
      </div>
    );
  };

  const exportToPDF = async (mode: 'full' | 'no-vests' = 'full') => {
    const container = document.getElementById(mode === 'full' ? 'session-tasks-export' : 'session-tasks-export-no-vests');

    if (!container) {
      alert(t('calendarView.exportError') || 'Error al exportar PDF');
      return;
    }

    setPdfDownloading(true);
    const originalDisplay = container.style.display;
    const originalPosition = container.style.position;
    const originalVisibility = container.style.visibility;

    try {
      container.style.display = 'block';
      // Fijo en (0,0) y de una página cada vez: el render por foreignObject depende de la posición
      // del elemento en pantalla y del scroll, y la captura salía desplazada.
      Object.assign(container.style, { position: 'fixed', top: '0', left: '0', zIndex: '-1', pointerEvents: 'none', visibility: 'visible' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const pageEls = Array.from(container.querySelectorAll<HTMLElement>('[data-export-page]'));
      if (pageEls.length === 0) {
        throw new Error('No hay tareas para exportar');
      }

      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      // Dimensiones exactas de la página exportada (definidas en el estilo de data-export-page),
      // mismo ratio que un DIN A4 (210x297mm). Se fijan aquí para forzar a html2canvas a capturar
      // siempre este tamaño exacto, recortando cualquier contenido que se desborde en vez de dejar
      // que la hoja crezca y pierda las proporciones A4.
      const PAGE_WIDTH_PX = 1191;
      const PAGE_HEIGHT_PX = 1684;

      // Fuentes incrustadas: sin ellas el render por foreignObject usa una fuente de respaldo más ancha
      // (textos truncados/desbordados) y los iconos de Font Awesome salen como cuadrados.
      const fontCss = await getEmbeddedFontCss();
      if (!fontCss) console.warn('No se pudieron incrustar las fuentes para el PDF');

      let pdf: jsPDF | null = null;

      for (let i = 0; i < pageEls.length; i++) {
        const tPage = performance.now();
        pageEls.forEach((el, idx) => { el.style.display = idx === i ? '' : 'none'; });
        await new Promise(resolve => setTimeout(resolve, 50));
        const captureOpts = {
          scale: 1.5,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: PAGE_WIDTH_PX,
          height: PAGE_HEIGHT_PX,
          windowWidth: PAGE_WIDTH_PX,
          windowHeight: PAGE_HEIGHT_PX,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          logging: false,
          // Render nativo del navegador (foreignObject): html2canvas reimplementa el layout y falla con
          // SVG dimensionados en %, viewBox, unidades cqw y rotaciones (campo, flechas y arcos de orientación).
          foreignObjectRendering: true,
          // html2canvas clona todo el documento en cada captura; se descarta cuanto no sea la página
          // exportada (o sus ancestros) para no clonar la app entera, la vista previa ni las demás hojas.
          ignoreElements: (el) => {
            const page = pageEls[i];
            if (el === page || page.contains(el) || el.contains(page)) return false;
            return !['STYLE', 'LINK', 'SCRIPT', 'META', 'TITLE'].includes(el.tagName);
          },
          onclone: (_doc, clonedEl) => {
            if (!fontCss) return;
            const style = _doc.createElement('style');
            style.textContent = fontCss;
            clonedEl.insertBefore(style, clonedEl.firstChild);
          },
        };
        // Las fuentes incrustadas en el SVG se cargan al primer render y la imagen se dibuja antes de que
        // estén listas; una captura previa en miniatura las calienta para que la real ya las use.
        if (fontCss && i === 0) {
          await html2canvas(pageEls[i], { ...captureOpts, scale: 0.1 });
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        const canvas = await html2canvas(pageEls[i], captureOpts);

        if (!pdf) {
          pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [A4_WIDTH_MM, A4_HEIGHT_MM],
          });
        } else {
          pdf.addPage([A4_WIDTH_MM, A4_HEIGHT_MM]);
        }

        // JPEG: codificar PNG de una página A4 a esta resolución tardaba segundos y pesaba mucho más.
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
        console.debug(`[PDF] página ${i + 1}/${pageEls.length}: ${Math.round(performance.now() - tPage)} ms`);
      }

      if (!pdf) {
        throw new Error('No hay tareas para exportar');
      }

      const fileNameSuffix = mode === 'no-vests' ? '_sin_petos' : '';
      const fileName = `Tareas_sesion_${date ? date.toISOString().split('T')[0] : 'sin_fecha'}${fileNameSuffix}.pdf`;

      // Obtener el Blob de manera compatible con jsPDF 4.x
      let pdfBlob: Blob;
      // Cast defensivo: en runtime algunas versiones de jsPDF han devuelto una Promise<Blob>
      const pdfOutput = pdf.output('blob') as Blob | Promise<Blob>;
      if (pdfOutput instanceof Blob) {
        pdfBlob = pdfOutput;
      } else if (pdfOutput instanceof Promise) {
        pdfBlob = await pdfOutput;
      } else {
        pdfBlob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
      }

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
      setPdfPreviewMode(null);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`${t('calendarView.exportError') || 'Error al exportar PDF'}\n\n${errorMessage}`);
    } finally {
      container.style.display = originalDisplay;
      container.style.position = originalPosition;
      container.style.visibility = originalVisibility;
      Object.assign(container.style, { top: '', left: '', zIndex: '', pointerEvents: '' });
      container.querySelectorAll<HTMLElement>('[data-export-page]').forEach((el) => { el.style.display = ''; });
      setPdfDownloading(false);
    }
  };

  return (
    <>
      <div id="session-tasks-export" className="hidden">
        {exportPages.map((pageTasks, pageIndex) => (
          <React.Fragment key={pageIndex}>
            {renderExportPageContent(pageTasks, pageIndex, exportPages.length, false)}
          </React.Fragment>
        ))}
      </div>
      <div id="session-tasks-export-no-vests" className="hidden">
        {exportPagesNoVests.map((pageTasks, pageIndex) => (
          <React.Fragment key={pageIndex}>
            {renderExportPageContent(pageTasks, pageIndex, exportPagesNoVests.length, true)}
          </React.Fragment>
        ))}
      </div>
      <div className="space-y-1.5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-3 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <i className="fa-solid fa-list-check text-[var(--accent)] text-[14px]"></i>
            <h4 className="text-[var(--accent)] font-black text-[14px]">{t('calendarView.sessionTasksTitle')}</h4>
            {tasks.length > 0 && (
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {t('calendarView.totalDuration')}: {totalDuration} {t('calendarView.minutesAbbr')}
              </span>
            )}
            <div className="flex items-center gap-1.5 flex-wrap ml-2 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={openExerciseDesigner}
                className="px-2.5 py-0.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-200"
              >
                <i className="fa-solid fa-plus"></i> {t('calendarView.addCustomTask')}
              </button>
              <button
                type="button"
                onClick={openPicker}
                className="px-2.5 py-0.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <i className="fa-solid fa-book"></i> {t('calendarView.addFromRepository')}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {allSquad.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAttendanceSummary(v => !v)}
                className="px-2.5 py-0.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <i className="fa-solid fa-users"></i>
                Mostrar convocados
                <i className={`fa-solid ${showAttendanceSummary ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowVests(v => !v)}
              className={`px-2.5 py-0.5 rounded-xl border font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all ${
                showVests
                  ? 'border-[var(--accent)]/40 text-[var(--accent)]'
                  : 'border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40'
              }`}
            >
              <i className={`fa-solid ${showVests ? 'fa-eye-slash' : 'fa-eye'}`}></i> {showVests ? 'OCULTAR PETOS' : 'MOSTRAR PETOS'}
            </button>
            {tasks.length > 0 && (
              <button
                type="button"
                onClick={() => setPdfPreviewMode('full')}
                className="px-2.5 py-0.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <i className="fa-solid fa-file-pdf"></i> PDF CON PETOS
              </button>
            )}
            {tasks.length > 0 && (
              <button
                type="button"
                onClick={() => setPdfPreviewMode('no-vests')}
                className="px-2.5 py-0.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <i className="fa-solid fa-file-pdf"></i> PDF SIN PETOS
              </button>
            )}
          </div>
        </div>

        {renderSessionHeader('screen')}

        {showAttendanceSummary && allSquad.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-1.5 pb-1.5 border-b border-slate-100">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                <i className="fa-solid fa-circle-check"></i> Asisten ({attendanceSummary.attendees.length})
              </p>
              <div className="flex flex-col gap-1">
                {attendeeGroups.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-bold">—</p>
                ) : (
                  attendeeGroups.map(group => (
                    <div key={group.label} className="flex items-start gap-1.5">
                      <span className="w-[58px] flex-shrink-0 text-[8px] font-black uppercase tracking-wider text-black pt-[3px]">{group.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {group.players.map(player => (
                          <span key={player.id} className="px-1.5 py-0.5 rounded-lg bg-white border border-emerald-200 text-[11px] font-bold text-emerald-700">
                            {formatPlayerName(player.apodo || player.nombre)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-2">
              <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <i className="fa-solid fa-circle-xmark"></i> No asisten ({attendanceSummary.absentees.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {attendanceSummary.absentees.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-bold">—</p>
                ) : (
                  attendanceSummary.absentees.map(({ player, reason }) => (
                    <span key={player.id} className="px-1.5 py-0.5 rounded-lg bg-white border border-red-200 text-[11px] font-bold text-red-600 flex items-center gap-1">
                      {formatPlayerName(player.apodo || player.nombre)}
                      <span className="text-red-400 font-black">· {reason}</span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-[20px]">{t('calendarView.noSessionTasks')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                draggable={armedTaskId === task.id}
                onDragStart={e => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', task.id);
                  setDraggedTaskId(task.id);
                }}
                onDragOver={e => {
                  if (!draggedTaskId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverTaskId !== task.id) setDragOverTaskId(task.id);
                }}
                onDrop={e => {
                  e.preventDefault();
                  if (draggedTaskId) moveTaskTo(draggedTaskId, task.id);
                  endDrag();
                }}
                onDragEnd={endDrag}
                className={`rounded-2xl border bg-white p-3 shadow-sm hover:shadow-md transition-all ${
                  draggedTaskId === task.id
                    ? 'opacity-40 border-slate-100'
                    : dragOverTaskId === task.id && draggedTaskId
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30'
                      : 'border-slate-100'
                }`}
              >
                {/* Header con número de ejercicio, nombre, tipo y duración */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {tasks.length > 1 && (
                    <span
                      onMouseDown={() => setArmedTaskId(task.id)}
                      onMouseUp={() => setArmedTaskId(null)}
                      className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-[var(--accent)] cursor-grab active:cursor-grabbing flex-shrink-0"
                      title="Arrastra para reordenar"
                    >
                      <i className="fa-solid fa-grip-vertical text-[12px]"></i>
                    </span>
                  )}
                  <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[11px] font-black flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex items-baseline gap-1">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nombre:</p>
                    <p className="font-black text-slate-700 text-[12px] truncate">{task.title}</p>
                  </div>
                  <div className="min-w-0 flex items-baseline gap-1">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Tipo:</p>
                    <p className="font-black text-slate-600 text-[12px] truncate">{task.category || t('calendarView.notDefined')}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5">
                      <i className="fa-solid fa-clock text-slate-400 text-[11px]"></i>
                      {(task.numberOfSeries ?? 0) > 0 ? (
                        <span className="w-8 text-[12px] font-black text-slate-900 text-center">
                          {(task.numberOfSeries ?? 0) * (task.timePerSeries ?? 0) + Math.max(0, (task.numberOfSeries ?? 0) - 1) * (task.restBetweenSeries ?? 0)}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={task.durationMinutes ?? 0}
                          onChange={e => updateTask(task.id, { durationMinutes: Number(e.target.value) })}
                          className="w-8 text-[12px] font-black text-slate-900 text-center focus:outline-none bg-transparent"
                        />
                      )}
                    </div>
                    {task.linkedTaskId && (
                      <button
                        type="button"
                        onClick={() => editTaskDrawing(task)}
                        className="w-5 h-5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all flex-shrink-0"
                        title={t('calendarView.editDrawing') || 'Editar dibujo'}
                      >
                        <i className="fa-solid fa-pen text-[11px]"></i>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFullscreenTaskId(task.id)}
                      className="w-5 h-5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all flex-shrink-0"
                      title={t('calendarView.viewFullscreen')}
                    >
                      <i className="fa-solid fa-expand text-[11px]"></i>
                    </button>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="w-5 h-5 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all flex-shrink-0"
                      title={t('common.delete')}
                    >
                      <i className="fa-solid fa-trash-can text-[11px]"></i>
                    </button>
                  </div>
                </div>


                {/* Vista previa + Series/Tiempos + Roles (izda, estrecho) | Descripción | Petos */}
                <div className={`grid grid-cols-1 gap-2 mb-2 ${showVests ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]' : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}`}>
                  <>
                    <div
                      className={`group/preview relative sm:col-start-1 sm:row-start-1 ${task.linkedTaskId ? 'cursor-pointer' : ''}`}
                      onClick={() => task.linkedTaskId && editTaskDrawing(task)}
                      title={task.linkedTaskId ? (t('calendarView.editDrawing') || 'Editar dibujo') : undefined}
                    >
                      {task.designerSnapshot && task.designerSnapshot.length > 0 ? (
                        <div className="rounded-lg overflow-hidden">
                          <DesignerPreview items={getFirstDesignerFrame(task.designerSnapshot)} fieldStructure={task.fieldStructure} className="w-full" />
                        </div>
                      ) : task.thumbnail ? (
                        <div className="w-full aspect-[105/68] rounded-lg bg-[#2f5a30] overflow-hidden flex items-center justify-center border border-slate-100">
                          <img loading="lazy" decoding="async" src={task.thumbnail} alt={task.title} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className={`w-full aspect-[105/68] rounded-lg flex items-center justify-center text-white border border-slate-100 ${task.category ? CATEGORY_COLORS[task.category] : 'bg-slate-400'}`}>
                          <i className={`fa-solid ${task.category ? CATEGORY_ICONS[task.category] : 'fa-ellipsis'} text-[20px]`}></i>
                        </div>
                      )}
                      {task.linkedTaskId && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/0 opacity-0 transition-all group-hover/preview:bg-black/40 group-hover/preview:opacity-100">
                          <span className="flex items-center gap-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                            <i className="fa-solid fa-pen"></i>
                            {t('calendarView.editDrawing') || 'Editar dibujo'}
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setFullscreenTaskId(task.id);
                            }}
                            className="pointer-events-auto flex items-center gap-2 rounded-lg bg-white/90 hover:bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-colors"
                            title={t('calendarView.viewFullscreen') || 'Ver'}
                          >
                            <i className="fa-solid fa-eye"></i>
                            Ver
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Dimensiones del campo + series y tiempos */}
                    <div className="space-y-1 sm:col-start-1 sm:row-start-2">
                      <div className="grid grid-cols-2 gap-1">
                        {([['length', 'Campo largo (m)'], ['width', 'Campo ancho (m)']] as const).map(([key, label]) => (
                          <div key={key} className="flex flex-col">
                            <label className="text-[7px] font-bold text-slate-500 uppercase mb-0.5 truncate">{label}</label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={task.dimensions?.[key] ?? ''}
                              placeholder="0"
                              onChange={e => {
                                const raw = e.target.value;
                                const num = raw === '' ? undefined : Math.max(0, Number(raw));
                                updateTask(task.id, { dimensions: { ...task.dimensions, [key]: num } });
                              }}
                              className="px-1 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 w-full"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <div className="flex flex-col">
                          <label className="text-[7px] font-bold text-slate-500 uppercase mb-0.5 truncate">Nº Series</label>
                          <input
                            type="number"
                            min={0}
                            value={task.numberOfSeries ?? 0}
                            onChange={e => updateTask(task.id, { numberOfSeries: Number(e.target.value) })}
                            className="px-1 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 w-full"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[7px] font-bold text-slate-500 uppercase mb-0.5 truncate">T/Serie (')</label>
                          <input
                            type="number"
                            min={0}
                            value={task.timePerSeries ?? 0}
                            onChange={e => updateTask(task.id, { timePerSeries: Number(e.target.value) })}
                            className="px-1 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 w-full"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[7px] font-bold text-slate-500 uppercase mb-0.5 truncate">Descanso (')</label>
                          <input
                            type="number"
                            min={0}
                            value={task.restBetweenSeries ?? 0}
                            onChange={e => updateTask(task.id, { restBetweenSeries: Number(e.target.value) })}
                            className="px-1 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </>

                  {/* Descripción + Roles técnicos (alineados con las dimensiones del campo) */}
                  <>
                    <div className="flex flex-col flex-none sm:col-start-2 sm:row-start-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('calendarView.fieldDescription')}</p>
                      <AutoGrowTextarea
                        value={task.description || ''}
                        onChange={v => updateTask(task.id, { description: v })}
                        placeholder={t('calendarView.describeTaskPlaceholder')}
                        className="w-full resize-none overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-1 !text-[10px] leading-snug font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                    <div className="flex flex-col flex-none sm:col-start-2 sm:row-start-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ROLES Técnicos</p>
                      <TechnicalRolesEditor
                        value={task.technicalRoles}
                        onChange={v => updateTask(task.id, { technicalRoles: v })}
                      />
                    </div>
                  </>

                  {/* Petos de Entrenamiento */}
                  {showVests && (
                    <div className="flex flex-col sm:col-start-3 sm:row-start-1 sm:row-span-2 border border-slate-200 rounded-lg p-1 bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Petos</p>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {(() => {
                          const filteredPlayers = squad;
                          if (!filteredPlayers || filteredPlayers.length === 0) {
                            return <p className="text-[10px] text-slate-400 py-2">Sin plantilla</p>;
                          }
                          const vestColorStyles: Record<string, { bg: string; color: string }> = {
                            '': { bg: '#ffffff', color: '#94a3b8' },
                            rojo: { bg: '#ef4444', color: '#ffffff' },
                            azul: { bg: '#3b82f6', color: '#ffffff' },
                            verde: { bg: '#22c55e', color: '#ffffff' },
                          };
                          return (
                            <div className="grid grid-cols-2 gap-1">
                              {filteredPlayers.map(player => {
                                const current = task.playerVestColors?.[String(player.id)] || '';
                                const style = vestColorStyles[current] || vestColorStyles[''];
                                return (
                                  <div key={player.id} className="flex items-center gap-0.5 p-1 rounded border border-slate-200 bg-white text-[10px]">
                                    <span className="flex-1 min-w-0 truncate font-bold text-slate-700">{player.apodo || player.nombre}</span>
                                    <div
                                      style={{
                                        position: 'relative',
                                        width: '24px',
                                        height: '18px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: style.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '9px',
                                          fontWeight: 700,
                                          color: style.color,
                                          pointerEvents: 'none',
                                        }}
                                      >
                                        {current ? current[0].toUpperCase() : '-'}
                                      </span>
                                      <select
                                        value={current}
                                        onChange={(e) => updateTask(task.id, {
                                          playerVestColors: {
                                            ...(task.playerVestColors || {}),
                                            [String(player.id)]: e.target.value
                                          }
                                        })}
                                        style={{
                                          position: 'absolute',
                                          inset: 0,
                                          width: '100%',
                                          height: '100%',
                                          opacity: 0,
                                          cursor: 'pointer',
                                          border: 'none',
                                        }}
                                      >
                                        <option value="">-</option>
                                        <option value="rojo">Rojo</option>
                                        <option value="azul">Azul</option>
                                        <option value="verde">Verde</option>
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setPickerOpen(false)}>
          <div className="w-full max-w-lg max-h-[80dvh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h4 className="text-[var(--accent)] font-black text-[28px]">{t('calendarView.repositoryPickerTitle')}</h4>
              <button onClick={() => setPickerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-[28px]"></i>
              </button>
            </div>
            <div className="p-5 border-b border-slate-50">
              <input
                value={repoSearch}
                onChange={e => setRepoSearch(e.target.value)}
                placeholder={t('calendarView.searchTasks')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[28px] font-bold text-slate-600"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {repositoryLoading ? (
                <div className="text-center text-slate-400 text-[20px] font-bold py-8">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
              ) : filteredRepository.length === 0 ? (
                <div className="text-center text-slate-400 text-[20px] font-bold py-8">{t('calendarView.repositoryEmpty')}</div>
              ) : (
                groupedRepositoryTasks.map(({ category, tasks: categoryTasks }) => (
                  <div key={category} className="border border-slate-100 rounded-xl overflow-hidden">
                    {/* Category header */}
                    <div className={`px-4 py-3 ${CATEGORY_COLORS[category] || 'bg-slate-100'}`}>
                      <h5 className="font-black text-white text-[16px] uppercase tracking-wide flex items-center gap-2">
                        <i className={`fa-solid ${CATEGORY_ICONS[category] || 'fa-ellipsis'}`}></i>
                        {category}
                        <span className="ml-auto text-[12px] bg-white/25 px-2 py-1 rounded">{categoryTasks.length}</span>
                      </h5>
                    </div>
                    {/* Tasks in category */}
                    <div className="space-y-1 p-3">
                      {categoryTasks.map(task => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => addTaskFromRepository(task)}
                          className="w-full flex items-center gap-3 rounded-lg border border-slate-100 hover:border-[var(--accent)]/40 hover:bg-slate-50 p-2.5 text-left transition-all"
                        >
                          {task.thumbnail ? (
                            <img loading="lazy" decoding="async" src={task.thumbnail} alt={task.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${CATEGORY_COLORS[task.category]}`}>
                              <i className={`fa-solid ${CATEGORY_ICONS[task.category]}`}></i>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-700 text-[16px] truncate">{task.name}</p>
                          </div>
                          <i className="fa-solid fa-plus text-[var(--accent)] flex-shrink-0"></i>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <TaskDetailModal
        task={null}
        open={newTaskModalOpen}
        onClose={() => setNewTaskModalOpen(false)}
        onSave={handleCreateTaskAndDesign}
        minimalFields
        returnEventId={eventId}
      />

      {fullscreenTask && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-slate-950"
          onClick={() => setFullscreenTaskId(null)}
        >
          <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <span className="text-[20px] font-black text-white/40 uppercase tracking-widest flex-shrink-0">
                {t('calendarView.exerciseLabel')} {fullscreenIndex + 1} / {tasks.length}
              </span>
              <h3 className="text-[28px] font-black text-white uppercase tracking-tight truncate">{fullscreenTask.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {tasks.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setFullscreenTaskId(tasks[(fullscreenIndex - 1 + tasks.length) % tasks.length].id)}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                    title={t('common.previous')}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenTaskId(tasks[(fullscreenIndex + 1) % tasks.length].id)}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                    title={t('common.next')}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setFullscreenTaskId(null)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-red-500 flex items-center justify-center text-white transition-all ml-2"
                title={t('calendarView.closeFullscreen')}
              >
                <i className="fa-solid fa-xmark text-[20px]"></i>
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-8 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full">
              {fullscreenTask.designerSnapshot && fullscreenTask.designerSnapshot.length > 0 ? (
                <DesignerPreview
                  items={getFirstDesignerFrame(fullscreenTask.designerSnapshot)}
                  fieldStructure={fullscreenTask.fieldStructure}
                  className="w-full shadow-2xl"
                />
              ) : fullscreenTask.thumbnail ? (
                <div className="w-full aspect-[105/68] rounded-xl bg-[#2f5a30] overflow-hidden flex items-center justify-center shadow-2xl">
                  <img loading="lazy" decoding="async" src={fullscreenTask.thumbnail} alt={fullscreenTask.title} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  className={`w-full aspect-[105/68] rounded-xl flex items-center justify-center text-white shadow-2xl ${fullscreenTask.category ? CATEGORY_COLORS[fullscreenTask.category] : 'bg-slate-400'}`}
                >
                  <i className={`fa-solid ${fullscreenTask.category ? CATEGORY_ICONS[fullscreenTask.category] : 'fa-ellipsis'} text-[20px]`}></i>
                </div>
              )}
            </div>

            <div className="space-y-6 text-white">
              <div>
                <p className="text-[20px] font-black text-white/40 uppercase tracking-widest mb-1">{t('calendarView.fieldTaskType')}</p>
                <p className="text-[20px] font-black">{fullscreenTask.category || t('calendarView.notDefined')}</p>
              </div>

              {(fullscreenTask.numberOfSeries ?? 0) > 0 && (
                <div>
                  <p className="text-[20px] font-black text-white/40 uppercase tracking-widest mb-2">Series y Tiempos</p>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    <div className="rounded-xl border border-white/15 px-3 py-2 text-center">
                      <p className="text-[14px] font-bold text-white/40 uppercase mb-1">Nº Series</p>
                      <p className="text-[20px] font-black">{fullscreenTask.numberOfSeries}</p>
                    </div>
                    <div className="rounded-xl border border-white/15 px-3 py-2 text-center">
                      <p className="text-[14px] font-bold text-white/40 uppercase mb-1">Tiempo/Serie</p>
                      <p className="text-[20px] font-black">{fullscreenTask.timePerSeries ?? 0} min</p>
                    </div>
                    <div className="rounded-xl border border-white/15 px-3 py-2 text-center">
                      <p className="text-[14px] font-bold text-white/40 uppercase mb-1">Descanso</p>
                      <p className="text-[20px] font-black">{fullscreenTask.restBetweenSeries ?? 0} min</p>
                    </div>
                    {(fullscreenTask.dimensions?.length || fullscreenTask.dimensions?.width) && (
                      <div className="rounded-xl border border-white/15 px-3 py-2 text-center col-span-3">
                        <p className="text-[14px] font-bold text-white/40 uppercase mb-1">Campo (largo x ancho)</p>
                        <p className="text-[20px] font-black">{fullscreenTask.dimensions?.length ?? '?'} x {fullscreenTask.dimensions?.width ?? '?'} m</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {fullscreenTask.description && (
                <div>
                  <p className="text-[20px] font-black text-white/40 uppercase tracking-widest mb-2">{t('calendarView.fieldDescription')}</p>
                  <p className="text-[28px] font-bold whitespace-pre-wrap leading-relaxed">{fullscreenTask.description}</p>
                </div>
              )}

              {fullscreenTask.technicalRoles && (
                <div>
                  <p className="text-[20px] font-black text-white/40 uppercase tracking-widest mb-2">Roles Técnicos</p>
                  <p className="text-[28px] font-bold whitespace-pre-wrap leading-relaxed">{fullscreenTask.technicalRoles}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {pdfPreviewMode && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex flex-col" onClick={() => !pdfDownloading && setPdfPreviewMode(null)}>
          <div className="relative flex items-center justify-center gap-4 px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <h3 className="hidden xl:block absolute left-6 font-black text-slate-800 text-[16px] uppercase tracking-widest">
              Vista previa · {pdfPreviewMode === 'full' ? 'PDF CON PETOS' : 'PDF SIN PETOS'}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-1 py-1 mr-2">
                <button
                  type="button"
                  onClick={() => setPdfPreviewZoom(z => Math.max(0.25, Math.round((z - 0.1) * 100) / 100))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all"
                  title="Alejar"
                >
                  <i className="fa-solid fa-minus text-[11px]"></i>
                </button>
                <span className="w-12 text-center text-[11px] font-black text-slate-600">{Math.round(pdfPreviewZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setPdfPreviewZoom(z => Math.min(1.5, Math.round((z + 0.1) * 100) / 100))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all"
                  title="Acercar"
                >
                  <i className="fa-solid fa-plus text-[11px]"></i>
                </button>
              </div>
              <button
                type="button"
                onClick={() => exportToPDF(pdfPreviewMode)}
                disabled={pdfDownloading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-black text-[12px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-200"
              >
                <i className={`fa-solid ${pdfDownloading ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                {pdfDownloading ? 'Generando...' : 'Descargar PDF'}
              </button>
              <button
                type="button"
                onClick={() => setPdfPreviewMode(null)}
                disabled={pdfDownloading}
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-60"
              >
                <i className="fa-solid fa-xmark text-[16px]"></i>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-8" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-8">
              {(pdfPreviewMode === 'full' ? exportPages : exportPagesNoVests).map((pageTasks, pageIndex) => (
                <div
                  key={pageIndex}
                  className="bg-white shadow-2xl overflow-hidden flex-shrink-0"
                  style={{ width: `${1191 * pdfPreviewZoom}px`, height: `${1684 * pdfPreviewZoom}px` }}
                >
                  <div style={{ width: '1191px', height: '1684px', transform: `scale(${pdfPreviewZoom})`, transformOrigin: 'top left' }}>
                    {pdfPreviewMode === 'full'
                      ? renderExportPageContent(pageTasks, pageIndex, exportPages.length, false)
                      : renderExportPageContent(pageTasks, pageIndex, exportPagesNoVests.length, true)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default SessionTasksPanel;
