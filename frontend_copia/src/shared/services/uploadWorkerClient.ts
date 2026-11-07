/**
 * @fileoverview Cliente del Service Worker de subidas a YouTube en segundo plano.
 * La página solo guarda el archivo en IndexedDB y le pide al worker que suba;
 * la ejecución real (fetch por chunks) vive en el worker, así que sobrevive a
 * la navegación por la SPA y a un refresco completo del navegador.
 */
import { supabase } from './supabaseClient';
import type { YouTubeUploadProgress } from './youtubeUploadService';

const WORKER_URL = '/upload-worker.js';
// Scope propio y sin páginas reales para no pisar el service worker de la PWA (sw.js, scope '/').
const WORKER_SCOPE = '/__yt-upload-sw-scope__/';
const CHANNEL_NAME = 'yt-upload-channel';
const DB_NAME = 'yt-upload-db';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const TASKS_STORE = 'tasks';

export interface BackgroundUploadTask {
  id: string;
  matchId: string | number;
  matchLabel: string;
  targetField: string;
  fileName: string;
  fileSize: number;
  title: string;
  description?: string;
  progress: YouTubeUploadProgress;
}

interface BackgroundUploadMeta {
  matchId: string | number;
  matchLabel: string;
  targetField: string;
  title: string;
  description?: string;
}

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(TASKS_STORE)) db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName: string, value: any): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(storeName: string, id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function registerUploadWorker(): Promise<ServiceWorkerRegistration> {
  if (!isSupported()) return Promise.reject(new Error('Los service workers no están disponibles en este navegador.'));
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register(WORKER_URL, { scope: WORKER_SCOPE });
  }
  return registrationPromise;
}

async function getActiveWorker(): Promise<ServiceWorker> {
  const reg = await registerUploadWorker();
  if (reg.active) return reg.active;

  return new Promise((resolve, reject) => {
    const candidate = reg.installing || reg.waiting;
    if (!candidate) {
      reject(new Error('No se pudo activar el worker de subidas.'));
      return;
    }
    candidate.addEventListener('statechange', function handler() {
      if (candidate.state === 'activated') {
        candidate.removeEventListener('statechange', handler);
        resolve(reg.active || candidate);
      } else if (candidate.state === 'redundant') {
        candidate.removeEventListener('statechange', handler);
        reject(new Error('El worker de subidas no se pudo instalar.'));
      }
    });
  });
}

async function currentSupabaseAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Tu sesión ha expirado. Vuelve a iniciar sesión e inténtalo de nuevo.');
  return token;
}

async function sendStart(taskId: string, meta: BackgroundUploadMeta): Promise<void> {
  const accessToken = await currentSupabaseAccessToken();
  const worker = await getActiveWorker();
  worker.postMessage({
    type: 'START_UPLOAD',
    taskId,
    meta: {
      ...meta,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      supabaseAccessToken: accessToken,
    },
  });
}

/** Guarda el archivo en IndexedDB y arranca la subida en el service worker. */
export async function beginBackgroundUpload(taskId: string, file: File, meta: BackgroundUploadMeta): Promise<void> {
  await idbPut(FILES_STORE, { id: taskId, file });
  const task: BackgroundUploadTask = {
    id: taskId,
    matchId: meta.matchId,
    matchLabel: meta.matchLabel,
    targetField: meta.targetField,
    fileName: file.name,
    fileSize: file.size,
    title: meta.title,
    description: meta.description,
    progress: { percent: 0, stage: 'requesting-token', message: 'Autenticando con YouTube...' },
  };
  await idbPut(TASKS_STORE, task);
  await sendStart(taskId, meta);
}

export async function cancelBackgroundUpload(taskId: string): Promise<void> {
  try {
    const worker = await getActiveWorker();
    worker.postMessage({ type: 'CANCEL_UPLOAD', taskId });
  } catch {
    // El worker no está disponible: al menos limpiamos localmente
    await idbDelete(FILES_STORE, taskId).catch(() => {});
    await idbDelete(TASKS_STORE, taskId).catch(() => {});
  }
}

export async function dismissBackgroundUpload(taskId: string): Promise<void> {
  try {
    const worker = await getActiveWorker();
    worker.postMessage({ type: 'DISMISS_TASK', taskId });
  } catch {
    /* seguimos con la limpieza local igualmente */
  }
  await idbDelete(FILES_STORE, taskId).catch(() => {});
  await idbDelete(TASKS_STORE, taskId).catch(() => {});
}

/** Estado de subidas ya guardado (sobrevive a refrescos de página) */
export function getSnapshotTasks(): Promise<BackgroundUploadTask[]> {
  if (!isSupported()) return Promise.resolve([]);
  return idbGetAll<BackgroundUploadTask>(TASKS_STORE);
}

export function subscribeToUploadEvents(onEvent: (msg: any) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (e) => onEvent(e.data);
  return () => channel.close();
}

function pingTask(worker: ServiceWorker, taskId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const mc = new MessageChannel();
    const timeout = setTimeout(() => resolve(false), 1500);
    mc.port1.onmessage = (e) => {
      clearTimeout(timeout);
      resolve(Boolean(e.data?.running));
    };
    worker.postMessage({ type: 'PING_TASK', taskId }, [mc.port2]);
  });
}

/**
 * Se asegura de que una subida pendiente (recuperada de IndexedDB tras un
 * refresco o reapertura del navegador) siga corriendo en el worker; si el
 * worker no la tiene activa (p. ej. se reinició), la reanuda.
 */
export async function ensureUploadRunning(task: BackgroundUploadTask): Promise<void> {
  if (!isSupported()) return;
  const worker = await getActiveWorker();
  const running = await pingTask(worker, task.id);
  if (running) return;
  await sendStart(task.id, {
    matchId: task.matchId,
    matchLabel: task.matchLabel,
    targetField: task.targetField,
    title: task.title,
    description: task.description,
  });
}

export function isBackgroundUploadSupported(): boolean {
  return isSupported();
}
