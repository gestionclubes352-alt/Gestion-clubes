/**
 * @fileoverview Vista principal del Repositorio de Tareas
 * @description Muestra todas las tareas agrupadas por tipo/categoría
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '@shared/services/dataService';
import type { TrainingTask, TaskCategory, TaskIntensity, SessionPhase } from '../types';
import {
  TASK_CATEGORIES,
  TASK_INTENSITIES,
  SESSION_PHASES,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  INTENSITY_COLORS,
  getDesignerItemAnimationClass,
} from '../types';
import TaskDetailModal from './TaskDetailModal';

const TaskRepositoryView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // ─── State ───
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TrainingTask | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [previewTask, setPreviewTask] = useState<TrainingTask | null>(null);
  const [previewAnimating, setPreviewAnimating] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);

  // ─── Data loading ───
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await db.task_templates.get();
      setTasks(data as TrainingTask[]);
    } catch (err) {
      console.error('Error fetching task_templates:', err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    setPreviewAnimating(false);
    setPreviewStep(0);
  }, [previewTask?.id]);

  useEffect(() => {
    if (!previewAnimating || !previewTask?.designerSnapshot?.length) return;

    const timer = window.setInterval(() => {
      setPreviewStep(prev => (prev + 1) % (previewTask.designerSnapshot?.length ?? 1));
    }, 900);

    return () => window.clearInterval(timer);
  }, [previewAnimating, previewTask?.designerSnapshot]);

  // ─── Filtering ───
  const filtered = useMemo(() => {
    let result = [...tasks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.includes(q))
      );
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks, search]);

  // ─── Grouped by category ───
  const grouped = useMemo(() => {
    const map = new Map<TaskCategory, TrainingTask[]>();
    // Inicializar todas las categorías que tienen tareas
    for (const task of filtered) {
      const cat = task.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(task);
    }
    // Ordenar por categoría según TASK_CATEGORIES
    const sorted: { category: TaskCategory; tasks: TrainingTask[] }[] = [];
    for (const cat of TASK_CATEGORIES) {
      if (map.has(cat)) {
        sorted.push({ category: cat, tasks: map.get(cat)! });
      }
    }
    return sorted;
  }, [filtered]);

  // ─── Stats ───
  const stats = useMemo(() => ({
    total: tasks.length,
    categories: TASK_CATEGORIES.map(c => ({ category: c, count: tasks.filter(t => t.category === c).length })).filter(c => c.count > 0),
  }), [tasks]);

  // ─── Handlers ───
  const handleSave = async (task: TrainingTask) => {
    const isNewTask = !editingTask;
    await db.task_templates.upsert(task);
    await fetchTasks();
    // Al crear una tarea nueva, pasamos directamente al diseñador para dibujar el ejercicio
    if (isNewTask) {
      navigate('/disenador', { state: { selectTaskId: task.id } });
    }
  };

  const handleDelete = async (id: string) => {
    await db.task_templates.delete(id);
    await fetchTasks();
  };

  const handleToggleFavorite = async (task: TrainingTask) => {
    await db.task_templates.upsert({ ...task, isFavorite: !task.isFavorite, updatedAt: new Date().toISOString() });
    await fetchTasks();
  };

  const handleDuplicate = async (task: TrainingTask) => {
    const now = new Date().toISOString();
    const dup: TrainingTask = {
      ...task,
      id: crypto.randomUUID(),
      name: `${task.name} (copia)`,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.task_templates.upsert(dup);
    await fetchTasks();
  };

  const openNew = () => { setEditingTask(null); setModalOpen(true); };
  const openEdit = (task: TrainingTask) => { setEditingTask(task); setModalOpen(true); };

  // Al volver desde el Diseñador Táctico con una tarea activa, reabrir su edición
  useEffect(() => {
    const targetId = (location.state as any)?.openTaskId;
    if (!targetId || tasks.length === 0) return;
    const target = tasks.find(t => t.id === targetId);
    if (!target) return;
    openEdit(target);
    navigate(location.pathname, { replace: true, state: null });
  }, [tasks, location.state, navigate, location.pathname]);

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const fieldBackgroundStyle = {
    backgroundColor: '#315b31',
    backgroundImage: [
      'radial-gradient(circle at 50% 48%, rgba(117, 166, 99, 0.20) 0%, rgba(80, 121, 73, 0.12) 42%, rgba(18, 30, 18, 0.34) 100%)',
      'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.020) 0 56px, rgba(0, 0, 0, 0.045) 56px 112px)',
      'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.010) 0 2px, transparent 2px 128px)',
    ].join(', '),
    backgroundBlendMode: 'soft-light, multiply, normal',
  } as const;

  // ─── Field preview renderer (shared between mini and full views) ───
  const FieldPreview: React.FC<{ task: TrainingTask; className?: string; itemScale?: number; visibleCount?: number }> = ({ task, className = '', itemScale = 1, visibleCount }) => (
    <div className={`w-full relative overflow-hidden ${className}`} style={fieldBackgroundStyle}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-35" viewBox="0 0 68 105" preserveAspectRatio="none">
        <g fill="none" stroke="white" strokeWidth="0.45">
          <rect x="0" y="0" width="68" height="105" />
          <line x1="0" y1="52.5" x2="68" y2="52.5" />
          <circle cx="34" cy="52.5" r="9.15" />
          <rect x="13.84" y="0" width="40.32" height="16.5" />
          <rect x="13.84" y="88.5" width="40.32" height="16.5" />
        </g>
      </svg>
      {task.designerSnapshot?.slice(0, visibleCount ?? task.designerSnapshot.length).map((item: any, idx: number) => (
        <div key={item.id || idx} className="absolute" style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}>
          {item.type === 'cone' ? (
            <div className={getDesignerItemAnimationClass(item.animation)} style={{ lineHeight: 0 }}>
              <div className="w-0 h-0" style={{ borderLeft: `${4 * itemScale}px solid transparent`, borderRight: `${4 * itemScale}px solid transparent`, borderBottom: `${7 * itemScale}px solid ${item.color || '#ef4444'}` }}></div>
            </div>
          ) : item.type === 'zone' ? (
            <div className={getDesignerItemAnimationClass(item.animation)} style={{ lineHeight: 0 }}>
              <div className="border border-dashed border-white/50" style={{ width: `${(item.width || 15) * 0.6 * itemScale}px`, height: `${(item.height || 15) * 0.6 * itemScale}px` }}></div>
            </div>
          ) : item.type === 'goal' ? (
            <div className={getDesignerItemAnimationClass(item.animation)} style={{ lineHeight: 0 }}>
              <div style={{ width: `${24 * itemScale}px`, height: `${12 * itemScale}px`, border: '1px solid white', borderBottom: 'none' }}></div>
            </div>
          ) : item.type?.startsWith('player-') ? (
            <div className={getDesignerItemAnimationClass(item.animation)} style={{ lineHeight: 0 }}>
              <div style={{ backgroundColor: item.color || '#ef4444', width: `${12 * itemScale}px`, height: `${12 * itemScale}px` }} className="rounded-full border border-white shadow-sm"></div>
            </div>
          ) : (
            <div className={getDesignerItemAnimationClass(item.animation)} style={{ lineHeight: 0 }}>
              <div style={{ width: `${8 * itemScale}px`, height: `${8 * itemScale}px` }} className="bg-white rounded-full opacity-80"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // ─── Mini task card (thumbnail) ───
  const MiniTaskCard: React.FC<{ task: TrainingTask }> = ({ task }) => (
    <div
      onClick={() => setPreviewTask(task)}
      className="group bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Mini field preview */}
      {task.designerSnapshot && task.designerSnapshot.length > 0 ? (
        <FieldPreview task={task} className="h-16" itemScale={0.6} />
      ) : (
        <div className="h-16 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
          <i className={`fa-solid ${CATEGORY_ICONS[task.category]} text-slate-300 text-lg`}></i>
        </div>
      )}
      <div className="p-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-800 truncate leading-tight">{task.name}</h4>
          {task.isFavorite && <i className="fa-solid fa-star text-amber-400 text-[8px] shrink-0"></i>}
        </div>
        <div className="flex flex-wrap gap-1">
          <span className={`inline-flex items-center px-1.5 py-0 rounded text-[7px] font-black uppercase tracking-wider border ${INTENSITY_COLORS[task.intensity]}`}>
            {task.intensity}
          </span>
          <span className="inline-flex items-center px-1.5 py-0 rounded text-[7px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
            <i className="fa-solid fa-clock mr-0.5 text-[6px]"></i>{task.durationMinutes}'
          </span>
          <span className="inline-flex items-center px-1.5 py-0 rounded text-[7px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-500 border border-indigo-100">
            {task.sessionPhase}
          </span>
        </div>
      </div>
    </div>
  );

  // ─── Full task preview modal ───
  const TaskPreviewModal: React.FC<{ task: TrainingTask; onClose: () => void }> = ({ task, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col"
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center transition-colors">
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        {/* Large field preview */}
        {task.designerSnapshot && task.designerSnapshot.length > 0 ? (
          <div className="relative">
            <FieldPreview
              task={task}
              className="h-52 shrink-0"
              itemScale={1.2}
              visibleCount={previewAnimating ? Math.min(task.designerSnapshot.length, previewStep + 1) : task.designerSnapshot.length}
            />
            <button
              type="button"
              onClick={() => setPreviewAnimating(v => !v)}
              className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-md transition-colors hover:bg-black/70"
            >
              <i className={`fa-solid ${previewAnimating ? 'fa-pause' : 'fa-play'} text-[9px]`} />
              {previewAnimating ? 'Pausar animación' : 'Animar'}
            </button>
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center shrink-0">
            <i className={`fa-solid ${CATEGORY_ICONS[task.category]} text-slate-300 text-4xl`}></i>
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">{task.name}</h3>
            <button onClick={() => handleToggleFavorite(task)} className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${task.isFavorite ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'}`}>
              <i className={`fa-${task.isFavorite ? 'solid' : 'regular'} fa-star`}></i>
            </button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${INTENSITY_COLORS[task.intensity]}`}>
              {task.intensity}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
              <i className="fa-solid fa-clock mr-1 text-[9px]"></i>{task.durationMinutes}'
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
              <i className="fa-solid fa-users mr-1 text-[9px]"></i>{task.minPlayers}-{task.maxPlayers}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
              {task.sessionPhase}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-slate-600 leading-relaxed mb-3">{task.description}</p>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {task.tags.map((tag, i) => (
                <span key={i} className="inline-block bg-slate-100 text-slate-500 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            {task.objectives && task.objectives.length > 0 && (
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('taskRepository.objectives')}</span>
                <ul className="mt-1 space-y-1">
                  {task.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <i className="fa-solid fa-check text-emerald-500 text-[9px] mt-1"></i>
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {task.materials && task.materials.length > 0 && (
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('taskRepository.materials')}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {task.materials.map((mat, i) => (
                    <span key={i} className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-0.5 text-[11px] font-bold text-slate-600">{mat.name} x{mat.quantity}</span>
                  ))}
                </div>
              </div>
            )}
            {task.fieldDimensions && (
              <div className="text-xs text-slate-500"><i className="fa-solid fa-ruler-combined mr-1"></i> {task.fieldDimensions}</div>
            )}
            {task.notes && (
              <div className="text-xs text-slate-500 italic">{task.notes}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <button onClick={() => { handleDuplicate(task); onClose(); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition-colors">
              <i className="fa-solid fa-copy"></i> {t('taskRepository.duplicate')}
            </button>
            <button onClick={() => { openEdit(task); onClose(); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-[var(--accent)] hover:bg-[var(--accent-dark)] flex items-center gap-1.5 transition-colors">
              <i className="fa-solid fa-pen"></i> {t('common.edit')}
            </button>
            <button onClick={() => { handleDelete(task.id); onClose(); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors">
              <i className="fa-solid fa-trash"></i> {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Main render ───
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">{t('taskRepository.title')}</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{t('taskRepository.subtitle')}</p>
        </div>
        <button onClick={openNew} className="w-full md:w-auto bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-colors">
          <i className="fa-solid fa-plus text-lg"></i> {t('taskRepository.newTask')}
        </button>
      </div>

      {/* Stats summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <i className="fa-solid fa-layer-group text-slate-500 text-sm"></i>
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{stats.total}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('taskRepository.totalTasks')}</div>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex flex-wrap gap-2">
            {stats.categories.map(c => (
              <span key={c.category} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white ${CATEGORY_COLORS[c.category]}`}>
                <i className={`fa-solid ${CATEGORY_ICONS[c.category]} text-[9px]`}></i>
                {c.category} <span className="bg-white/25 rounded-md px-1.5">{c.count}</span>
              </span>
            ))}
            {stats.categories.length === 0 && <span className="text-[10px] text-slate-400 font-bold uppercase">{t('taskRepository.noTasks')}</span>}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder={t('taskRepository.searchPlaceholder')}
          />
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">
          {filtered.length} {t('taskRepository.results')}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-slate-400"></i>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <i className="fa-solid fa-folder-open text-3xl text-slate-300"></i>
          </div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">{t('taskRepository.emptyTitle')}</h4>
          <p className="text-xs text-slate-400">{t('taskRepository.emptyDescription')}</p>
          {tasks.length === 0 && (
            <button onClick={openNew} className="mt-4 px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-opacity">
              <i className="fa-solid fa-plus mr-2"></i>{t('taskRepository.createFirst')}
            </button>
          )}
        </div>
      ) : (
        /* ─── Grouped by category ─── */
        <div className="space-y-6">
          {grouped.map(({ category, tasks: catTasks }) => {
            const isCollapsed = collapsedCategories.has(category);
            return (
              <div key={category} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => toggleCategoryCollapse(category)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl ${CATEGORY_COLORS[category]} flex items-center justify-center shrink-0`}>
                    <i className={`fa-solid ${CATEGORY_ICONS[category]} text-white text-sm`}></i>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">{category}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {catTasks.length} {catTasks.length === 1 ? 'tarea' : 'tareas'}
                    </p>
                  </div>
                  <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'} text-slate-400 text-xs transition-transform`}></i>
                </button>

                {/* Tasks grid */}
                {!isCollapsed && (
                  <div className="border-t border-slate-100 p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {catTasks.map(task => <MiniTaskCard key={task.id} task={task} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {previewTask && <TaskPreviewModal task={previewTask} onClose={() => setPreviewTask(null)} />}

      {/* Edit modal */}
      <TaskDetailModal task={editingTask} open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} minimalFields />
    </div>
  );
};

export default TaskRepositoryView;
