/**
 * @fileoverview Indicador flotante de subidas a YouTube en curso.
 * Se monta una única vez a nivel global para que el usuario vea el
 * progreso (y pueda cancelarlo) desde cualquier página de la app.
 */
import React from 'react';
import { useYouTubeUpload } from '@context/YouTubeUploadContext';

const YouTubeUploadStatusWidget: React.FC = () => {
  const { tasks, cancelUpload, dismissTask } = useYouTubeUpload();

  if (tasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 w-[300px] max-w-[calc(100vw-2rem)] pointer-events-none">
      {tasks.map(task => {
        const isError = task.progress.stage === 'error';
        const isDone = task.progress.stage === 'done';
        return (
          <div
            key={task.id}
            className="pointer-events-auto bg-white dark:bg-[#151515] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center gap-2 mb-2">
              <i className={`fa-brands fa-youtube ${isError ? 'text-red-500' : isDone ? 'text-emerald-500' : 'text-red-500'}`}></i>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-[var(--text-strong)] truncate uppercase tracking-wide">{task.matchLabel}</p>
                <p className="text-[9px] text-slate-400 dark:text-white/30 truncate">{task.fileName}</p>
              </div>
              <button
                onClick={() => (isDone || isError ? dismissTask(task.id) : cancelUpload(task.id))}
                className="text-slate-300 dark:text-white/20 hover:text-red-400 text-xs shrink-0"
                title={isDone || isError ? 'Cerrar' : 'Cancelar subida'}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            {isError ? (
              <p className="text-red-400 text-[10px] font-bold">{task.progress.error || task.progress.message}</p>
            ) : (
              <>
                <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${task.progress.percent}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-white/40 font-bold mt-1 truncate">{task.progress.message}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default YouTubeUploadStatusWidget;
