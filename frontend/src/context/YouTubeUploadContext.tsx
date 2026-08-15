/**
 * @fileoverview Contexto global de subidas a YouTube.
 * La subida en sí corre en un Service Worker dedicado (uploadWorkerClient /
 * public/upload-worker.js), no en este componente ni en la pestaña: por eso
 * sigue en curso aunque el usuario navegue a otra página o refresque el
 * navegador. Este contexto solo refleja ese estado para la UI.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  beginBackgroundUpload,
  cancelBackgroundUpload,
  dismissBackgroundUpload,
  ensureUploadRunning,
  getSnapshotTasks,
  subscribeToUploadEvents,
  type BackgroundUploadTask,
} from '@shared/services/uploadWorkerClient';

export type YouTubeUploadTargetField = string;

export type YouTubeUploadTask = BackgroundUploadTask;

interface StartUploadOptions {
  file: File;
  title: string;
  description?: string;
  matchId: string | number;
  matchLabel: string;
  targetField: YouTubeUploadTargetField;
}

interface YouTubeUploadContextType {
  tasks: YouTubeUploadTask[];
  startUpload: (opts: StartUploadOptions) => string;
  cancelUpload: (id: string) => void;
  dismissTask: (id: string) => void;
  getTaskForTarget: (matchId: string | number, targetField: YouTubeUploadTargetField) => YouTubeUploadTask | undefined;
}

const YouTubeUploadContext = createContext<YouTubeUploadContextType | undefined>(undefined);

export const YouTubeUploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<YouTubeUploadTask[]>([]);

  // Al montar la app: recupera subidas que ya estaban en curso (IndexedDB
  // sobrevive a refrescos) y se asegura de que el worker las siga procesando.
  useEffect(() => {
    let cancelled = false;

    getSnapshotTasks()
      .then(snapshot => {
        if (cancelled) return;
        setTasks(snapshot);
        snapshot
          .filter(t => t.progress.stage !== 'done' && t.progress.stage !== 'error')
          .forEach(t => {
            ensureUploadRunning(t).catch(err => console.error('[youtube-upload] No se pudo reanudar la subida:', err));
          });
      })
      .catch(err => console.error('[youtube-upload] No se pudo recuperar el estado de subidas:', err));

    const unsubscribe = subscribeToUploadEvents((msg) => {
      if (!msg) return;
      if (msg.type === 'PROGRESS' && msg.task) {
        setTasks(prev => {
          const idx = prev.findIndex(t => t.id === msg.task.id);
          if (idx === -1) return [...prev, msg.task];
          const next = [...prev];
          next[idx] = msg.task;
          return next;
        });
      } else if (msg.type === 'REMOVED' && msg.id) {
        setTasks(prev => prev.filter(t => t.id !== msg.id));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const startUpload = useCallback((opts: StartUploadOptions): string => {
    const id = crypto.randomUUID();

    // Entrada optimista para feedback inmediato; el worker la irá actualizando.
    setTasks(prev => [
      ...prev,
      {
        id,
        matchId: opts.matchId,
        matchLabel: opts.matchLabel,
        targetField: opts.targetField,
        fileName: opts.file.name,
        fileSize: opts.file.size,
        title: opts.title,
        description: opts.description,
        progress: { percent: 0, stage: 'requesting-token', message: 'Autenticando con YouTube...' },
      },
    ]);

    beginBackgroundUpload(id, opts.file, {
      matchId: opts.matchId,
      matchLabel: opts.matchLabel,
      targetField: opts.targetField,
      title: opts.title,
      description: opts.description,
    }).catch((err: any) => {
      const message = err?.message || 'No se pudo iniciar la subida';
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, progress: { percent: 0, stage: 'error', message, error: message } } : t))
      );
    });

    return id;
  }, []);

  const cancelUpload = useCallback((id: string) => {
    cancelBackgroundUpload(id).catch(err => console.error('[youtube-upload] Error cancelando:', err));
  }, []);

  const dismissTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    dismissBackgroundUpload(id).catch(err => console.error('[youtube-upload] Error descartando:', err));
  }, []);

  const getTaskForTarget = useCallback(
    (matchId: string | number, targetField: YouTubeUploadTargetField) =>
      tasks.find(t => String(t.matchId) === String(matchId) && t.targetField === targetField),
    [tasks]
  );

  return (
    <YouTubeUploadContext.Provider
      value={{ tasks, startUpload, cancelUpload, dismissTask, getTaskForTarget }}
    >
      {children}
    </YouTubeUploadContext.Provider>
  );
};

export const useYouTubeUpload = (): YouTubeUploadContextType => {
  const context = useContext(YouTubeUploadContext);
  if (!context) {
    throw new Error('useYouTubeUpload debe usarse dentro de YouTubeUploadProvider');
  }
  return context;
};
