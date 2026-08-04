import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas-pro';
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
  const [fullscreenTaskId, setFullscreenTaskId] = useState<string | null>(null);

  const fullscreenTask = useMemo(
    () => tasks.find(task => task.id === fullscreenTaskId) || null,
    [tasks, fullscreenTaskId]
  );
  const fullscreenIndex = useMemo(
    () => tasks.findIndex(task => task.id === fullscreenTaskId),
    [tasks, fullscreenTaskId]
  );

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

  /** Agrupa las tareas de 4 en 4: cada grupo ocupa una página A4 completa en el PDF */
  const exportPages = useMemo(() => {
    const pages: SessionTask[][] = [];
    for (let i = 0; i < tasks.length; i += 4) {
      pages.push(tasks.slice(i, i + 4));
    }
    return pages;
  }, [tasks]);

  const renderExportCard = (task: SessionTask, globalIndex: number) => {
    const seriesTotal =
      (task.numberOfSeries ?? 0) > 0
        ? (task.numberOfSeries ?? 0) * (task.timePerSeries ?? 0) +
          Math.max(0, (task.numberOfSeries ?? 0) - 1) * (task.restBetweenSeries ?? 0)
        : task.durationMinutes ?? 0;

    return (
      <div key={task.id} className="rounded-2xl border-2 border-slate-100 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            {t('calendarView.exerciseLabel')} {globalIndex + 1}
          </span>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-0.5">
            <i className="fa-solid fa-clock text-slate-400 text-[10px]"></i>
            <span className="text-[11px] font-black text-slate-600">{seriesTotal} min</span>
          </div>
        </div>

        <p className="font-black text-slate-800 text-sm break-words mb-0.5 flex-shrink-0">{task.title}</p>
        <p className="text-[10px] font-bold text-slate-500 mb-2 break-words flex-shrink-0">{task.category || t('calendarView.notDefined')}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            {task.designerSnapshot && task.designerSnapshot.length > 0 ? (
              <div className="rounded-lg overflow-hidden">
                <DesignerPreview items={task.designerSnapshot} fieldStructure={task.fieldStructure} className="w-full" />
              </div>
            ) : task.thumbnail ? (
              <div className="w-full aspect-[105/68] rounded-lg bg-[#2f5a30] overflow-hidden flex items-center justify-center">
                <img src={task.thumbnail} alt={task.title} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className={`w-full aspect-[105/68] rounded-lg flex items-center justify-center text-white ${task.category ? CATEGORY_COLORS[task.category] : 'bg-slate-400'}`}>
                <i className={`fa-solid ${task.category ? CATEGORY_ICONS[task.category] : 'fa-ellipsis'} text-lg`}></i>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex-shrink-0">{t('calendarView.fieldDescription')}</p>
            <p className="text-[10px] font-bold text-slate-600 leading-snug whitespace-pre-wrap break-words">
              {task.description || '—'}
            </p>
          </div>
        </div>

        {((task.numberOfSeries ?? 0) > 0 || task.technicalRoles) && (
          <div className="mt-2 flex-shrink-0 space-y-1.5">
            {(task.numberOfSeries ?? 0) > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                <div className="rounded-lg border border-slate-200 px-1.5 py-1 text-center">
                  <p className="text-[6px] font-bold text-slate-400 uppercase">Series</p>
                  <p className="text-[10px] font-black text-slate-700">{task.numberOfSeries}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-1.5 py-1 text-center">
                  <p className="text-[6px] font-bold text-slate-400 uppercase">T/Serie</p>
                  <p className="text-[10px] font-black text-slate-700">{task.timePerSeries ?? 0}m</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-1.5 py-1 text-center">
                  <p className="text-[6px] font-bold text-slate-400 uppercase">Descanso</p>
                  <p className="text-[10px] font-black text-slate-700">{task.restBetweenSeries ?? 0}m</p>
                </div>
              </div>
            )}
            {task.technicalRoles && (
              <p className="text-[9px] font-bold text-slate-500 break-words">
                <span className="text-slate-400 uppercase">Roles:</span> {task.technicalRoles}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const exportToPDF = async () => {
    // Abrir la pestaña ya (dentro del gesto de click) para que el navegador no la bloquee como pop-up
    const newTab = window.open('', '_blank');
    const container = document.getElementById('session-tasks-export');

    if (!container) {
      newTab?.close();
      alert(t('calendarView.exportError') || 'Error al exportar PDF');
      return;
    }

    const originalDisplay = container.style.display;
    const originalPosition = container.style.position;
    const originalVisibility = container.style.visibility;

    try {
      container.style.display = 'block';
      container.style.position = 'static';
      container.style.visibility = 'visible';

      await new Promise(resolve => setTimeout(resolve, 100));

      const pageEls = Array.from(container.querySelectorAll<HTMLElement>('[data-export-page]'));
      if (pageEls.length === 0) {
        throw new Error('No hay tareas para exportar');
      }

      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;

      let pdf: jsPDF | null = null;

      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        // Alto real de la página en mm, respetando el ancho A4; si el contenido
        // no cabe en una hoja estándar, la hoja crece en vez de recortar/comprimir el contenido.
        const pageHeightMm = Math.max(A4_HEIGHT_MM, (canvas.height / canvas.width) * A4_WIDTH_MM);

        if (!pdf) {
          pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [A4_WIDTH_MM, pageHeightMm],
          });
        } else {
          pdf.addPage([A4_WIDTH_MM, pageHeightMm]);
        }

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, A4_WIDTH_MM, pageHeightMm);
      }

      if (!pdf) {
        throw new Error('No hay tareas para exportar');
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

      const pdfUrl = URL.createObjectURL(pdfBlob);

      if (newTab) {
        newTab.document.title = fileName;
        newTab.location.href = pdfUrl;
      } else {
        // El navegador bloqueó la apertura previa de la pestaña; lo intentamos ahora igualmente
        window.open(pdfUrl, '_blank');
      }
    } catch (error) {
      newTab?.close();
      console.error('Error exporting to PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`${t('calendarView.exportError') || 'Error al exportar PDF'}\n\n${errorMessage}`);
    } finally {
      container.style.display = originalDisplay;
      container.style.position = originalPosition;
      container.style.visibility = originalVisibility;
    }
  };

  return (
    <>
      <div id="session-tasks-export" className="hidden">
        {exportPages.map((pageTasks, pageIndex) => (
          <div
            key={pageIndex}
            data-export-page="true"
            className="bg-white flex flex-col"
            style={{ width: '1191px', minHeight: '1684px', padding: '50px' }}
          >
            <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-list-check text-xl text-[var(--accent)]"></i>
                <h1 className="text-xl font-black text-slate-900">{t('calendarView.sessionTasksTitle')}</h1>
              </div>
              <div className="flex items-center gap-7">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-calendar-day text-[var(--accent)]"></i>
                  <span className="font-black text-slate-700 text-sm">{date ? date.toLocaleDateString(i18n.language) : t('calendarView.notDefined')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-shield-halved text-[var(--accent)]"></i>
                  <span className="font-black text-slate-700 text-sm">{team || t('calendarView.notDefined')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-hashtag text-[var(--accent)]"></i>
                  <span className="font-black text-slate-700 text-sm">{sessionNumber ?? t('calendarView.notDefined')}</span>
                </div>
                <span className="text-xs font-black text-slate-400">{pageIndex + 1}/{exportPages.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 flex-1">
              {pageTasks.map((task, idxInPage) => renderExportCard(task, pageIndex * 4 + idxInPage))}
            </div>
          </div>
        ))}
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
            <button
              type="button"
              onClick={openPicker}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <i className="fa-solid fa-book"></i> {t('calendarView.addFromRepository')}
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
                      type="button"
                      onClick={() => setFullscreenTaskId(task.id)}
                      className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all flex-shrink-0"
                      title={t('calendarView.viewFullscreen')}
                    >
                      <i className="fa-solid fa-expand text-xs"></i>
                    </button>
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

      {fullscreenTask && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-slate-950"
          onClick={() => setFullscreenTaskId(null)}
        >
          <div className="flex items-center justify-between px-8 py-5 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <span className="text-xs font-black text-white/40 uppercase tracking-widest">
                {t('calendarView.exerciseLabel')} {fullscreenIndex + 1} / {tasks.length}
              </span>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">{fullscreenTask.title}</h3>
            </div>
            <div className="flex items-center gap-2">
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
                <i className="fa-solid fa-xmark text-lg"></i>
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
                  items={fullscreenTask.designerSnapshot}
                  fieldStructure={fullscreenTask.fieldStructure}
                  className="w-full shadow-2xl"
                />
              ) : fullscreenTask.thumbnail ? (
                <div className="w-full aspect-[105/68] rounded-xl bg-[#2f5a30] overflow-hidden flex items-center justify-center shadow-2xl">
                  <img src={fullscreenTask.thumbnail} alt={fullscreenTask.title} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  className={`w-full aspect-[105/68] rounded-xl flex items-center justify-center text-white shadow-2xl ${fullscreenTask.category ? CATEGORY_COLORS[fullscreenTask.category] : 'bg-slate-400'}`}
                >
                  <i className={`fa-solid ${fullscreenTask.category ? CATEGORY_ICONS[fullscreenTask.category] : 'fa-ellipsis'} text-6xl`}></i>
                </div>
              )}
            </div>

            <div className="space-y-6 text-white">
              <div>
                <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-1">{t('calendarView.fieldTaskType')}</p>
                <p className="text-lg font-black">{fullscreenTask.category || t('calendarView.notDefined')}</p>
              </div>

              {(fullscreenTask.numberOfSeries ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2">Series y Tiempos</p>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    <div className="rounded-xl border border-white/15 px-3 py-2 text-center">
                      <p className="text-[9px] font-bold text-white/40 uppercase mb-1">Nº Series</p>
                      <p className="text-lg font-black">{fullscreenTask.numberOfSeries}</p>
                    </div>
                    <div className="rounded-xl border border-white/15 px-3 py-2 text-center">
                      <p className="text-[9px] font-bold text-white/40 uppercase mb-1">Tiempo/Serie</p>
                      <p className="text-lg font-black">{fullscreenTask.timePerSeries ?? 0} min</p>
                    </div>
                    <div className="rounded-xl border border-white/15 px-3 py-2 text-center">
                      <p className="text-[9px] font-bold text-white/40 uppercase mb-1">Descanso</p>
                      <p className="text-lg font-black">{fullscreenTask.restBetweenSeries ?? 0} min</p>
                    </div>
                  </div>
                </div>
              )}

              {fullscreenTask.description && (
                <div>
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2">{t('calendarView.fieldDescription')}</p>
                  <p className="text-lg font-bold whitespace-pre-wrap leading-relaxed">{fullscreenTask.description}</p>
                </div>
              )}

              {fullscreenTask.technicalRoles && (
                <div>
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2">Roles Técnicos</p>
                  <p className="text-lg font-bold whitespace-pre-wrap leading-relaxed">{fullscreenTask.technicalRoles}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default SessionTasksPanel;
