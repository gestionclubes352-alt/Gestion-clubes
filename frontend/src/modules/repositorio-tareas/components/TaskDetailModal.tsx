/**
 * @fileoverview Modal de creación / edición de una tarea en el repositorio
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrainingTask, TaskCategory, TaskIntensity, SessionPhase, TaskMaterial } from '../types';
import { TASK_CATEGORIES, TASK_INTENSITIES, SESSION_PHASES, CATEGORY_ICONS, CATEGORY_COLORS } from '../types';

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
  description: '',
  sessionPhase: 'Parte Principal',
  intensity: 'Media',
  durationMinutes: 15,
  minPlayers: 2,
  maxPlayers: 22,
  objectives: [],
  materials: [],
  tags: [],
  fieldDimensions: '',
  notes: '',
});

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, open, onClose, onSave, minimalFields = false }) => {
  const { t } = useTranslation();
  const isEditing = !!task;

  const [form, setForm] = useState(emptyTask());
  const [objectiveInput, setObjectiveInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [materialQty, setMaterialQty] = useState(1);

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name,
        category: task.category,
        description: task.description,
        sessionPhase: task.sessionPhase,
        intensity: task.intensity,
        durationMinutes: task.durationMinutes,
        minPlayers: task.minPlayers,
        maxPlayers: task.maxPlayers,
        objectives: [...task.objectives],
        materials: [...task.materials],
        tags: [...task.tags],
        fieldDimensions: task.fieldDimensions || '',
        notes: task.notes || '',
      });
    } else {
      setForm(emptyTask());
    }
    setObjectiveInput('');
    setTagInput('');
    setMaterialName('');
    setMaterialQty(1);
  }, [task, open]);

  if (!open) return null;

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleAddObjective = () => {
    const val = objectiveInput.trim();
    if (!val) return;
    set('objectives', [...form.objectives, val]);
    setObjectiveInput('');
  };

  const handleRemoveObjective = (idx: number) =>
    set('objectives', form.objectives.filter((_, i) => i !== idx));

  const handleAddTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (!val || form.tags.includes(val)) return;
    set('tags', [...form.tags, val]);
    setTagInput('');
  };

  const handleRemoveTag = (idx: number) =>
    set('tags', form.tags.filter((_, i) => i !== idx));

  const handleAddMaterial = () => {
    const name = materialName.trim();
    if (!name) return;
    set('materials', [...form.materials, { name, quantity: materialQty }]);
    setMaterialName('');
    setMaterialQty(1);
  };

  const handleRemoveMaterial = (idx: number) =>
    set('materials', form.materials.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    const now = new Date().toISOString();
    const saved: TrainingTask = {
      ...(task || { id: crypto.randomUUID(), createdAt: now }),
      ...form,
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1 scrollbar-hide">
          {/* ---- Datos principales ---- */}
          <SectionTitle icon="fa-pen" text={t('taskRepository.basicInfo')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.taskName')}</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder={t('taskRepository.taskNamePlaceholder')}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.category')}</label>
              <select value={form.category} onChange={e => set('category', e.target.value as TaskCategory)} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 bg-white">
                {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {!minimalFields && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.sessionPhase')}</label>
                <select value={form.sessionPhase} onChange={e => set('sessionPhase', e.target.value as SessionPhase)} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 bg-white">
                  {SESSION_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
          </div>

          {!minimalFields && (
            <>
              <div className="mt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.description')}</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-none"
                  placeholder={t('taskRepository.descriptionPlaceholder')}
                />
              </div>

              {/* ---- Parámetros ---- */}
              <SectionTitle icon="fa-sliders" text={t('taskRepository.parameters')} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.intensity')}</label>
                  <select value={form.intensity} onChange={e => set('intensity', e.target.value as TaskIntensity)} className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 bg-white">
                    {TASK_INTENSITIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.duration')}</label>
                  <input type="number" min={1} value={form.durationMinutes} onChange={e => set('durationMinutes', Number(e.target.value))} className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.minPlayers')}</label>
                  <input type="number" min={1} value={form.minPlayers} onChange={e => set('minPlayers', Number(e.target.value))} className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.maxPlayers')}</label>
                  <input type="number" min={1} value={form.maxPlayers} onChange={e => set('maxPlayers', Number(e.target.value))} className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{t('taskRepository.fieldDimensions')}</label>
                <input
                  value={form.fieldDimensions}
                  onChange={e => set('fieldDimensions', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  placeholder="30x20m"
                />
              </div>

              {/* ---- Objetivos ---- */}
              <SectionTitle icon="fa-bullseye" text={t('taskRepository.objectives')} />
              <div className="flex gap-2 mb-2">
                <input value={objectiveInput} onChange={e => setObjectiveInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddObjective()} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" placeholder={t('taskRepository.objectivePlaceholder')} />
                <button onClick={handleAddObjective} className="px-4 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"><i className="fa-solid fa-plus"></i></button>
              </div>
              <div className="flex flex-col gap-1.5">
                {form.objectives.map((obj, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-xs font-bold text-slate-700 flex-1">{obj}</span>
                    <button onClick={() => handleRemoveObjective(idx)} className="text-red-400 hover:text-red-600 text-xs"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                ))}
              </div>

              {/* ---- Material ---- */}
              <SectionTitle icon="fa-box" text={t('taskRepository.materials')} />
              <div className="flex gap-2 mb-2">
                <input value={materialName} onChange={e => setMaterialName(e.target.value)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" placeholder={t('taskRepository.materialPlaceholder')} />
                <input type="number" min={1} value={materialQty} onChange={e => setMaterialQty(Number(e.target.value))} className="w-16 px-2 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
                <button onClick={handleAddMaterial} className="px-4 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"><i className="fa-solid fa-plus"></i></button>
              </div>
              <div className="flex flex-col gap-1.5">
                {form.materials.map((mat, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-xs font-bold text-slate-700 flex-1">{mat.name} <span className="text-slate-400">x{mat.quantity}</span></span>
                    <button onClick={() => handleRemoveMaterial(idx)} className="text-red-400 hover:text-red-600 text-xs"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                ))}
              </div>

              {/* ---- Etiquetas ---- */}
              <SectionTitle icon="fa-tags" text={t('taskRepository.tags')} />
              <div className="flex gap-2 mb-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" placeholder={t('taskRepository.tagPlaceholder')} />
                <button onClick={handleAddTag} className="px-4 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"><i className="fa-solid fa-plus"></i></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.tags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    {tag}
                    <button onClick={() => handleRemoveTag(idx)} className="hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark text-[8px]"></i></button>
                  </span>
                ))}
              </div>

              {/* ---- Notas ---- */}
              <SectionTitle icon="fa-note-sticky" text={t('taskRepository.notes')} />
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-none"
                placeholder={t('taskRepository.notesPlaceholder')}
              />
            </>
          )}
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
