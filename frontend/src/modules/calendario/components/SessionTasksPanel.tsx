import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { db } from '@shared/services/dataService';
import type { TrainingTask } from '@modules/repositorio-tareas';
import { CATEGORY_ICONS, CATEGORY_COLORS, TaskDetailModal, DesignerPreview } from '@modules/repositorio-tareas';
import type { SessionTask } from '../types';

interface SessionTasksPanelProps {
  tasks: SessionTask[];
  onChange: (tasks: SessionTask[]) => void;
  /** ID del evento/sesión activo, para poder reabrirlo al volver del diseñador */
  eventId?: string;
  date?: Date;
  team?: string;
  sessionNumber?: number;
}

const SessionTasksPanel: React.FC<SessionTasksPanelProps> = ({ tasks, onChange, eventId, date, team, sessionNumber }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
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
        sessionPhase: 'Parte Principal',
        durationMinutes: 15,
        thumbnail: task.thumbnail,
        designerSnapshot: task.designerSnapshot,
        fieldStructure: task.fieldStructure,
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
      state: { selectTaskId: task.id, fromSessionCreation: true, returnEventId: eventId },
    });
  };

  const removeTask = (id: string) => {
    onChange(tasks.filter(task => task.id !== id));
  };

  const filteredRepository = useMemo(() => {
    if (!repoSearch) return repositoryTasks;
    const q = repoSearch.toLowerCase();
    return repositoryTasks.filter(task =>
      task.name.toLowerCase().includes(q)
    );
  }, [repositoryTasks, repoSearch]);

  const exportToPDF = async () => {
    try {
      const element = document.getElementById('session-tasks-export');
      if (!element) {
        throw new Error('Elemento de exportación no encontrado');
      }

      // Mostrar el elemento temporalmente para que html2canvas pueda capturarlo
      const originalDisplay = (element as HTMLElement).style.display;
      const originalPosition = (element as HTMLElement).style.position;
      const originalVisibility = (element as HTMLElement).style.visibility;

      (element as HTMLElement).style.display = 'block';
      (element as HTMLElement).style.position = 'static';
      (element as HTMLElement).style.visibility = 'visible';

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowHeight: (element as HTMLElement).scrollHeight,
        windowWidth: (element as HTMLElement).scrollWidth,
      });

      // Volver a ocultar el elemento
      (element as HTMLElement).style.display = originalDisplay;
      (element as HTMLElement).style.position = originalPosition;
      (element as HTMLElement).style.visibility = originalVisibility;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imgWidth = pageWidth - 2 * margin;
      const maxHeightPerPage = pageHeight - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let pageNumber = 1;

      while (heightLeft > 0) {
        if (pageNumber > 1) {
          pdf.addPage();
        }

        const heightToDraw = Math.min(heightLeft, maxHeightPerPage);
        const srcY = imgHeight - heightLeft;

        pdf.addImage(
          imgData,
          'PNG',
          margin,
          margin,
          imgWidth,
          heightToDraw,
          undefined,
          'FAST',
          srcY / imgHeight
        );

        heightLeft -= maxHeightPerPage;
        pageNumber++;
      }

      const fileName = `Tareas_sesion_${date ? date.toISOString().split('T')[0] : 'sin_fecha'}.pdf`;

      // Obtener el Blob de manera compatible con jsPDF 4.x
      let pdfBlob: Blob;
      const pdfOutput = pdf.output('blob');
      if (pdfOutput instanceof Blob) {
        pdfBlob = pdfOutput;
      } else if (pdfOutput instanceof Promise) {
        pdfBlob = await pdfOutput;
      } else {
        pdfBlob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
      }

      // Descargar localmente
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`${t('calendarView.exportError') || 'Error al exportar PDF'}\n\n${errorMessage}`);
    }
  };

  return (
    <>
      <div id="session-tasks-export" className="hidden">
        <div className="bg-white p-8">
          <h1 className="text-2xl font-black text-slate-900 mb-2">{t('calendarView.sessionTasksTitle')}</h1>
          <div className="space-y-4 mb-8 pb-4 border-b border-slate-200">
            {date && (
              <p className="text-sm font-bold text-slate-600">
                <span className="font-black text-slate-900">{t('calendarView.colDate')}:</span> {date.toLocaleDateString(i18n.language)}
              </p>
            )}
            {team && (
              <p className="text-sm font-bold text-slate-600">
                <span className="font-black text-slate-900">{t('calendarView.colTeam')}:</span> {team}
              </p>
            )}
            {sessionNumber && (
              <p className="text-sm font-bold text-slate-600">
                <span className="font-black text-slate-900">{t('calendarView.sessionNumberLabel')}:</span> {sessionNumber}
              </p>
            )}
            <p className="text-sm font-bold text-slate-600">
              <span className="font-black text-slate-900">{t('calendarView.totalDuration')}:</span> {totalDuration} {t('calendarView.minutesAbbr')}
            </p>
          </div>
          {tasks.map((task, index) => (
            <div key={task.id} className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <h3 className="text-lg font-black text-slate-900 mb-3">
                {t('calendarView.exerciseLabel')} {index + 1}: {task.title}
              </h3>
              <div className="space-y-2 text-sm text-slate-700">
                <p><span className="font-black">Categoría:</span> {task.category}</p>
                <p><span className="font-black">Fase:</span> {task.sessionPhase}</p>
                <p><span className="font-black">Duración:</span> {task.durationMinutes} minutos</p>
                {task.description && (
                  <p><span className="font-black">Descripción:</span> {task.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-list-check text-[var(--accent)]"></i>
            <h4 className="text-[var(--accent)] font-black text-lg">{t('calendarView.sessionTasksTitle')}</h4>
            {tasks.length > 0 && (
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {t('calendarView.totalDuration')}: {totalDuration} {t('calendarView.minutesAbbr')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={openPicker}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <i className="fa-solid fa-book"></i> {t('calendarView.addFromRepository')}
            </button>
            {tasks.length > 0 && (
              <button
                type="button"
                onClick={exportToPDF}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <i className="fa-solid fa-file-pdf"></i> SESION EN PDF
              </button>
            )}
            <button
              type="button"
              onClick={openExerciseDesigner}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-200"
            >
              <i className="fa-solid fa-plus"></i> {t('calendarView.addCustomTask')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-calendar-day text-[var(--accent)]"></i>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.colDate')}</p>
              <p className="font-black text-slate-700 text-sm">{date ? date.toLocaleDateString(i18n.language) : t('calendarView.notDefined')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-[var(--accent)]"></i>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.colTeam')}</p>
              <p className="font-black text-slate-700 text-sm">{team || t('calendarView.notDefined')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-hashtag text-[var(--accent)]"></i>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.sessionNumberLabel')}</p>
              <p className="font-black text-slate-700 text-sm">{sessionNumber ?? t('calendarView.notDefined')}</p>
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-sm">{t('calendarView.noSessionTasks')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task, index) => (
              <div key={task.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                {/* Header con número de ejercicio y duración */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {t('calendarView.exerciseLabel')} {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                      <i className="fa-solid fa-clock text-slate-400 text-xs"></i>
                      {(task.numberOfSeries ?? 0) > 0 ? (
                        <span className="w-10 text-xs font-black text-slate-600 text-center">
                          {(task.numberOfSeries ?? 0) * (task.timePerSeries ?? 0) + Math.max(0, (task.numberOfSeries ?? 0) - 1) * (task.restBetweenSeries ?? 0)}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={task.durationMinutes ?? 0}
                          onChange={e => updateTask(task.id, { durationMinutes: Number(e.target.value) })}
                          className="w-10 text-xs font-black text-slate-600 text-center focus:outline-none bg-transparent"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="w-6 h-6 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all flex-shrink-0"
                      title={t('common.delete')}
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>

                {/* Cuerpo: info arriba, vista previa y descripción abajo */}
                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('calendarView.fieldName')}</p>
                    <p className="font-black text-slate-700 text-sm">{task.title}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('calendarView.fieldTaskType')}</p>
                    <p className="font-black text-slate-600 text-sm">{task.category || t('calendarView.notDefined')}</p>
                  </div>
                </div>

                {/* Vista previa y Descripción lado a lado */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    {task.designerSnapshot && task.designerSnapshot.length > 0 ? (
                      <div className="rounded-xl overflow-hidden">
                        <DesignerPreview items={task.designerSnapshot} fieldStructure={task.fieldStructure} className="w-full" />
                      </div>
                    ) : task.thumbnail ? (
                      <div className="w-full aspect-[105/68] rounded-xl bg-[#2f5a30] overflow-hidden flex items-center justify-center border border-slate-100">
                        <img src={task.thumbnail} alt={task.title} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className={`w-full aspect-[105/68] rounded-xl flex items-center justify-center text-white border border-slate-100 ${task.category ? CATEGORY_COLORS[task.category] : 'bg-slate-400'}`}>
                        <i className={`fa-solid ${task.category ? CATEGORY_ICONS[task.category] : 'fa-ellipsis'} text-3xl`}></i>
                      </div>
                    )}
                  </div>

                  {/* Descripción */}
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('calendarView.fieldDescription')}</p>
                    <textarea
                      value={task.description || ''}
                      onChange={e => updateTask(task.id, { description: e.target.value })}
                      placeholder={t('calendarView.describeTaskPlaceholder')}
                      rows={4}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 flex-1"
                    />
                  </div>
                </div>

                {/* Series y tiempos */}
                <div className="mt-4 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Series y Tiempos</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <label className="text-[8px] font-bold text-slate-500 uppercase mb-1.5">Nº Series</label>
                      <input
                        type="number"
                        min={0}
                        value={task.numberOfSeries ?? 0}
                        onChange={e => updateTask(task.id, { numberOfSeries: Number(e.target.value) })}
                        className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[8px] font-bold text-slate-500 uppercase mb-1.5">Tiempo/Serie (min)</label>
                      <input
                        type="number"
                        min={0}
                        value={task.timePerSeries ?? 0}
                        onChange={e => updateTask(task.id, { timePerSeries: Number(e.target.value) })}
                        className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[8px] font-bold text-slate-500 uppercase mb-1.5">Descanso (min)</label>
                      <input
                        type="number"
                        min={0}
                        value={task.restBetweenSeries ?? 0}
                        onChange={e => updateTask(task.id, { restBetweenSeries: Number(e.target.value) })}
                        className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                  </div>
                </div>

                {/* ROLES Técnicos */}
                <div className="mt-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">ROLES Técnicos</p>
                  <textarea
                    value={task.technicalRoles || ''}
                    onChange={e => updateTask(task.id, { technicalRoles: e.target.value })}
                    placeholder="Especifica los roles técnicos..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                </div>
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
                    {task.thumbnail ? (
                      <img src={task.thumbnail} alt={task.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${CATEGORY_COLORS[task.category]}`}>
                        <i className={`fa-solid ${CATEGORY_ICONS[task.category]}`}></i>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-700 text-sm truncate">{task.name}</p>
                      <p className="text-[11px] text-slate-400 font-bold truncate">{task.category}</p>
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
        open={newTaskModalOpen}
        onClose={() => setNewTaskModalOpen(false)}
        onSave={handleCreateTaskAndDesign}
        minimalFields
        returnEventId={eventId}
      />
      </div>
    </>
  );
};

export default SessionTasksPanel;
