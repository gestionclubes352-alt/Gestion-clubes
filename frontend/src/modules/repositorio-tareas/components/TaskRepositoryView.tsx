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
  CATEGORY_ICONS,
  CATEGORY_COLORS,
} from '../types';
import TaskDetailModal from './TaskDetailModal';
import DesignerPreview from './DesignerPreview';

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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [previewTask, setPreviewTask] = useState<TrainingTask | null>(null);

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


  // ─── Filtering ───
  const filtered = useMemo(() => {
    let result = [...tasks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q));
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

  const confirmDelete = (task: TrainingTask) => {
    if (window.confirm(t('taskRepository.deleteConfirm', { name: task.name, defaultValue: `¿Borrar "${task.name}"?` }))) {
      handleDelete(task.id);
    }
  };

  const handleDuplicate = async (task: TrainingTask) => {
    const now = new Date().toISOString();
    const dup: TrainingTask = {
      ...task,
      id: crypto.randomUUID(),
      name: `${task.name} (copia)`,
      createdAt: now,
      updatedAt: now,
    };
    await db.task_templates.upsert(dup);
    await fetchTasks();
  };

  const openNew = () => { setEditingTask(null); setModalOpen(true); };
  const openEdit = (task: TrainingTask) => { setEditingTask(task); setModalOpen(true); };
  /** Abrir el diseño táctico de una tarea existente (permite editar el dibujo y regenerar su miniatura) */
  const openInDesigner = (task: TrainingTask) => {
    navigate('/disenador', { state: { selectTaskId: task.id } });
  };

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


  // ─── Mini task card (thumbnail) ───
  const MiniTaskCard: React.FC<{ task: TrainingTask }> = ({ task }) => (
    <div
      onClick={() => setPreviewTask(task)}
      className="group relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Duplicate / edit / delete actions */}
      <div className="absolute top-1.5 right-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); handleDuplicate(task); }}
          className="w-6 h-6 rounded-full bg-black/50 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
          title={t('taskRepository.duplicate')}
          aria-label={t('taskRepository.duplicate')}
        >
          <i className="fa-solid fa-copy text-[10px]"></i>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); openEdit(task); }}
          className="w-6 h-6 rounded-full bg-black/50 hover:bg-[var(--accent)] text-white flex items-center justify-center transition-colors"
          title={t('common.edit')}
          aria-label={t('common.edit')}
        >
          <i className="fa-solid fa-pen text-[10px]"></i>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); confirmDelete(task); }}
          className="w-6 h-6 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
          title={t('common.delete')}
          aria-label={t('common.delete')}
        >
          <i className="fa-solid fa-trash text-[10px]"></i>
        </button>
      </div>

      {/* Image preview */}
      {task.designerSnapshot && task.designerSnapshot.length > 0 ? (
        <DesignerPreview items={task.designerSnapshot} fieldStructure={task.fieldStructure} className="w-full" />
      ) : task.thumbnail ? (
        <img loading="lazy" decoding="async" src={task.thumbnail} alt={task.name} className="h-16 w-full object-cover" />
      ) : (
        <div className="h-16 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
          <i className={`fa-solid ${CATEGORY_ICONS[task.category]} text-slate-300 text-lg`}></i>
        </div>
      )}
      <div className="p-2">
        <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-800 truncate leading-tight mb-1">{task.name}</h4>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider text-white ${CATEGORY_COLORS[task.category]}`}>
          {task.category}
        </span>
      </div>
    </div>
  );

  // ─── Full task preview modal ───
  const TaskPreviewModal: React.FC<{ task: TrainingTask; onClose: () => void }> = ({ task, onClose }) => {
    const [is3DPreview, setIs3DPreview] = useState(false);
    const hasDesignerSnapshot = task.designerSnapshot && task.designerSnapshot.length > 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in max-h-[90dvh] flex flex-col"
        >
          {/* Close button */}
          <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>

          {/* Designer preview or thumbnail */}
          {hasDesignerSnapshot ? (
            <div className={`relative shrink-0 overflow-hidden p-6 transition-colors duration-500 ${is3DPreview ? 'bg-[#050607]' : 'bg-slate-50'}`}>
              <button
                type="button"
                onClick={() => setIs3DPreview(value => !value)}
                className={`absolute left-3 top-3 z-10 flex h-9 items-center gap-2 rounded-xl border px-3 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${
                  is3DPreview
                    ? 'border-blue-400/30 bg-blue-600 text-white shadow-blue-600/25'
                    : 'border-white/80 bg-white/90 text-slate-700 hover:bg-white'
                }`}
                title={is3DPreview ? 'Volver a vista 2D' : 'Ver tarea en 3D'}
                aria-pressed={is3DPreview}
              >
                <i className="fa-solid fa-cube text-[12px]"></i>
                {is3DPreview ? '2D' : '3D'}
              </button>
              {is3DPreview && (
                <div className="pointer-events-none absolute left-1/2 top-[64%] h-[22%] w-[82%] -translate-x-1/2 rounded-full bg-black/80 blur-3xl" />
              )}
              <div
                className={`relative transition-all duration-500 ${is3DPreview ? 'px-2 py-9' : ''}`}
                style={is3DPreview ? { perspective: '1150px' } : undefined}
              >
                <div
                  className="transition-transform duration-500"
                  style={is3DPreview ? {
                    transform: 'translateY(-6%) rotateX(40deg) scale(0.98)',
                    transformOrigin: 'center center',
                    transformStyle: 'preserve-3d',
                  } : undefined}
                >
                  <DesignerPreview items={task.designerSnapshot} fieldStructure={task.fieldStructure} is3D={is3DPreview} className="max-w-full shadow-2xl" />
                </div>
              </div>
            </div>
          ) : task.thumbnail ? (
            <img loading="lazy" decoding="async" src={task.thumbnail} alt={task.name} className="h-80 w-full object-cover shrink-0" />
          ) : (
            <div className="h-80 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center shrink-0">
              <i className={`fa-solid ${CATEGORY_ICONS[task.category]} text-slate-300 text-6xl`}></i>
            </div>
          )}

          {/* Content */}
          <div className="p-5 overflow-y-auto flex-1">
            {/* Header */}
            <div className="mb-3">
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 mb-2">{task.name}</h3>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white ${CATEGORY_COLORS[task.category]}`}>
                {task.category}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => { openInDesigner(task); onClose(); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 transition-colors">
                <i className="fa-solid fa-chess-board"></i> {t('taskRepository.openDesigner')}
              </button>
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
  };

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
