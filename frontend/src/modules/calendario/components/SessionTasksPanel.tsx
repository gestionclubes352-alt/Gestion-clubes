import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '@shared/services/dataService';
import type { TrainingTask } from '@modules/repositorio-tareas';
import { CATEGORY_ICONS, CATEGORY_COLORS, TaskDetailModal } from '@modules/repositorio-tareas';
import type { SessionTask } from '../types';

interface SessionTasksPanelProps {
  tasks: SessionTask[];
  onChange: (tasks: SessionTask[]) => void;
}

const SessionTasksPanel: React.FC<SessionTasksPanelProps> = ({ tasks, onChange }) => {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [repositoryTasks, setRepositoryTasks] = useState<TrainingTask[]>([]);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');

  const totalDuration = useMemo(
    () => tasks.reduce((sum, task) => sum + (task.durationMinutes || 0), 0),
    [tasks]
  );

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
        sessionPhase: task.sessionPhase,
        durationMinutes: task.durationMinutes,
        description: task.description,
      },
    ]);
    setPickerOpen(false);
  };

  const openCustomForm = () => {
    setDesignerOpen(true);
  };

  const saveCustomTask = async (task: TrainingTask) => {
    await db.task_templates.upsert(task);
    onChange([
      ...tasks,
      {
        id: `rt-${task.id}-${Date.now()}`,
        linkedTaskId: task.id,
        title: task.name,
        category: task.category,
        sessionPhase: task.sessionPhase,
        durationMinutes: task.durationMinutes,
        description: task.description,
      },
    ]);
  };

  const removeTask = (id: string) => {
    onChange(tasks.filter(task => task.id !== id));
  };

  const filteredRepository = useMemo(() => {
    if (!repoSearch) return repositoryTasks;
    const q = repoSearch.toLowerCase();
    return repositoryTasks.filter(task =>
      task.name.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q)
    );
  }, [repositoryTasks, repoSearch]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-list-check text-[var(--accent)]"></i>
            <h4 className="text-[var(--accent)] font-black text-lg">{t('calendarView.sessionTasksTitle')}</h4>
            {tasks.length > 0 && (
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {t('calendarView.totalDuration')}: {totalDuration} {t('calendarView.minutesAbbr')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <i className="fa-solid fa-book"></i> {t('calendarView.addFromRepository')}
            </button>
            <button
              type="button"
              onClick={openCustomForm}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-200"
            >
              <i className="fa-solid fa-plus"></i> {t('calendarView.addCustomTask')}
            </button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-sm">{t('calendarView.noSessionTasks')}</div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${task.category ? CATEGORY_COLORS[task.category] : 'bg-slate-500'}`}>
                  <i className={`fa-solid ${task.category ? CATEGORY_ICONS[task.category] : 'fa-ellipsis'}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-700 text-sm truncate">{task.title}</p>
                  <p className="text-[11px] text-slate-400 font-bold truncate">
                    {[task.sessionPhase, task.category].filter(Boolean).join(' • ')}
                  </p>
                </div>
                {typeof task.durationMinutes === 'number' && (
                  <span className="text-[11px] font-black text-slate-500 flex-shrink-0">{task.durationMinutes} {t('calendarView.minutesAbbr')}</span>
                )}
                <button
                  onClick={() => removeTask(task.id)}
                  className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all flex-shrink-0"
                  title={t('common.delete')}
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setPickerOpen(false)}>
          <div className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h4 className="text-[var(--accent)] font-black text-lg">{t('calendarView.repositoryPickerTitle')}</h4>
              <button onClick={() => setPickerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="p-5 border-b border-slate-50">
              <input
                value={repoSearch}
                onChange={e => setRepoSearch(e.target.value)}
                placeholder={t('calendarView.searchTasks')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {repositoryLoading ? (
                <div className="text-center text-slate-400 text-sm font-bold py-8">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
              ) : filteredRepository.length === 0 ? (
                <div className="text-center text-slate-400 text-sm font-bold py-8">{t('calendarView.repositoryEmpty')}</div>
              ) : (
                filteredRepository.map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => addTaskFromRepository(task)}
                    className="w-full flex items-center gap-3 rounded-xl border border-slate-100 hover:border-[var(--accent)]/40 hover:bg-slate-50 p-3 text-left transition-all"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${CATEGORY_COLORS[task.category]}`}>
                      <i className={`fa-solid ${CATEGORY_ICONS[task.category]}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-700 text-sm truncate">{task.name}</p>
                      <p className="text-[11px] text-slate-400 font-bold truncate">{task.sessionPhase} • {task.category} • {task.durationMinutes} {t('calendarView.minutesAbbr')}</p>
                    </div>
                    <i className="fa-solid fa-plus text-[var(--accent)]"></i>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <TaskDetailModal
        task={null}
        open={designerOpen}
        onClose={() => setDesignerOpen(false)}
        onSave={saveCustomTask}
      />
    </div>
  );
};

export default SessionTasksPanel;
