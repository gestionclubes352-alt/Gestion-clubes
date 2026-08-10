/**
 * @fileoverview Modal de creación / edición de una tarea en el repositorio
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { TrainingTask, TaskCategory } from '../types';
import { TASK_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from '../types';

interface TaskDetailModalProps {
  task: TrainingTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (task: TrainingTask) => void;
  /** Cuando es true, solo se editan Nombre y Categoría (el resto se completa al añadir la tarea a una sesión). */
  minimalFields?: boolean;
  /** ID del evento/sesión de origen, para volver a él tras diseñar la tarea. */
  returnEventId?: string;
}

const emptyTask = (): Omit<TrainingTask, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  category: 'Juego',
  designerSnapshot: undefined,
});

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, open, onClose, onSave, minimalFields = false, returnEventId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEditing = !!task;

  const [form, setForm] = useState(emptyTask());
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageMode, setImageMode] = useState<'none' | 'upload' | 'design'>('none');
  const [designerSnapshot, setDesignerSnapshot] = useState<any[] | undefined>(undefined);

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name,
        category: task.category,
        thumbnail: task.thumbnail,
        designerSnapshot: task.designerSnapshot,
      });
      setPreviewUrl(task.thumbnail || '');
      setDesignerSnapshot(task.designerSnapshot);
      setImageMode(task.designerSnapshot ? 'design' : task.thumbnail ? 'upload' : 'none');
    } else {
      setForm(emptyTask());
      setPreviewUrl('');
      setDesignerSnapshot(undefined);
      setImageMode('none');
    }
    setThumbnailFile(null);
  }, [task, open]);

  if (!open) return null;

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => setForm(prev => ({ ...prev, [key]: val }));

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    const now = new Date().toISOString();
    let thumbnail = form.thumbnail;

    if (thumbnailFile) {
      const { uploadTaskThumbnail } = await import('@shared/services/photoService');
      const taskId = task?.id || crypto.randomUUID();
      thumbnail = await uploadTaskThumbnail(thumbnailFile, taskId);
    }

    const saved: TrainingTask = {
      ...(task || { id: crypto.randomUUID(), createdAt: now }),
      ...form,
      thumbnail,
      designerSnapshot: designerSnapshot || form.designerSnapshot,
      updatedAt: now,
    } as TrainingTask;
    onSave(saved);
    onClose();
  };

  const handleOpenDesigner = async () => {
    const now = new Date().toISOString();
    const taskId = task?.id || crypto.randomUUID();

    const taskToSave: TrainingTask = {
      ...(task || { id: taskId, createdAt: now }),
      ...form,
      thumbnail: form.thumbnail,
      designerSnapshot: designerSnapshot || form.designerSnapshot,
      updatedAt: now,
    } as TrainingTask;

    await onSave(taskToSave);
    navigate('/disenador', {
      state: returnEventId
        ? { selectTaskId: taskId, fromSessionCreation: true, returnEventId }
        : { selectTaskId: taskId },
    });
  };

  /* -------- Sección reutilizable -------- */
  const SectionTitle: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <i className={`fa-solid ${icon} text-[var(--accent)] text-xs`}></i>
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{text}</h4>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90dvh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${CATEGORY_COLORS[form.category]} flex items-center justify-center`}>
              <i className={`fa-solid ${CATEGORY_ICONS[form.category]} text-white text-sm`}></i>
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
              {isEditing ? t('taskRepository.editTask') : t('taskRepository.newTask')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-hide">
          {/* Nombre */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">
              {t('taskRepository.taskName')}
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              placeholder={t('taskRepository.taskNamePlaceholder')}
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">
              {t('taskRepository.category')}
            </label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value as TaskCategory)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 bg-white"
            >
              {TASK_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Imagen/Diagrama */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Imagen/Diagrama</label>

            {/* Selector de modo */}
            {imageMode === 'none' && (
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setImageMode('design')}
                  className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wide text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                >
                  <i className="fa-solid fa-paintbrush mr-2"></i>
                  Diseñar
                </button>
              </div>
            )}

            {/* Modo Upload */}
            {imageMode === 'upload' && (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
                {previewUrl && imageMode === 'upload' ? (
                  <div className="relative">
                    <img loading="lazy" decoding="async" src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl('');
                        setThumbnailFile(null);
                        set('thumbnail', undefined);
                        setImageMode('none');
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer py-6">
                    <i className="fa-solid fa-image text-3xl text-slate-300 mb-2"></i>
                    <span className="text-xs font-bold text-slate-500">Seleccionar imagen</span>
                    <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {/* Modo Design */}
            {imageMode === 'design' && (
              <div className="border-2 border-dashed border-emerald-300 rounded-xl p-4 bg-emerald-50">
                <div className="flex flex-col items-center gap-3">
                  <i className="fa-solid fa-paintbrush text-2xl text-emerald-600"></i>
                  <div className="text-center">
                    <p className="text-xs font-bold text-emerald-700 mb-2">Diseñador de Tácticas</p>
                    <p className="text-[10px] text-emerald-600 mb-3">Se abrirá el diseñador para crear tu diagrama</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenDesigner}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <i className="fa-solid fa-external-link-alt mr-2"></i>
                    Abrir diseñador
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('none')}
                    className="text-[10px] text-slate-500 hover:text-slate-600 underline"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={false}
            className="px-8 py-3 bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all"
          >
            <i className="fa-solid fa-check mr-2"></i>
            {isEditing ? t('common.save') : t('taskRepository.create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
