/**
 * @fileoverview Modal de creación / edición de una tarea en el repositorio
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrainingTask, TaskCategory } from '../types';
import { TASK_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from '../types';

interface TaskDetailModalProps {
  task: TrainingTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (task: TrainingTask) => void;
  /** Cuando es true, solo se editan Nombre y Categoría (el resto se completa al añadir la tarea a una sesión). */
  minimalFields?: boolean;
}

const emptyTask = (): Omit<TrainingTask, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  category: 'Juego',
});

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, open, onClose, onSave, minimalFields = false }) => {
  const { t } = useTranslation();
  const isEditing = !!task;

  const [form, setForm] = useState(emptyTask());
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name,
        category: task.category,
        thumbnail: task.thumbnail,
      });
      setPreviewUrl(task.thumbnail || '');
    } else {
      setForm(emptyTask());
      setPreviewUrl('');
    }
    setThumbnailFile(null);
  }, [task, open]);

  if (!open) return null;

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

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
      updatedAt: now,
    } as TrainingTask;
    onSave(saved);
    onClose();
  };

  /* -------- Sección reutilizable -------- */
  const SectionTitle: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <i className={`fa-solid ${icon} text-[var(--accent)] text-xs`}></i>
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{text}</h4>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
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
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-hide">
          {/* Nombre */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.taskName')}</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              placeholder={t('taskRepository.taskNamePlaceholder')}
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.category')}</label>
            <select value={form.category} onChange={e => set('category', e.target.value as TaskCategory)} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 bg-white">
              {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Imagen */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Imagen/Diagrama</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl('');
                      setThumbnailFile(null);
                      set('thumbnail', undefined);
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">
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
