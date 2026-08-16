/**
 * @fileoverview Service Worker dedicado a subidas de vídeo a YouTube en segundo plano.
 *
 * A diferencia de sw.js (que cachea el shell de la PWA), este worker no
 * intercepta peticiones de red de la app: solo recibe mensajes de la página
 * para arrancar/cancelar subidas y las ejecuta él mismo mediante fetch,
 * manteniéndose vivo con event.waitUntil() durante toda la subida.
 *
 * Al vivir en el Service Worker (y no en el hilo de la pestaña), la subida
 * sigue en curso aunque el usuario navegue a otra página de la SPA o refresque
 * el navegador. El archivo de vídeo se guarda en IndexedDB (compartida entre
 * la página y el worker) para que el worker pueda leerlo aunque se haya
 * originado en una pestaña que ya no existe.
 *
 * Si la subida ya tiene una URL de sesión resumible (uploadUrl) guardada de un
 * intento anterior, se reanuda preguntando a YouTube cuántos bytes recibió,
 * en vez de reiniciar desde cero.
 */

const DB_NAME = 'yt-upload-db';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const TASKS_STORE = 'tasks';
const CHUNK_SIZE = 5 * 1024 * 1024;

const abortControllers = new Map();
const channel = new BroadcastChannel('yt-upload-channel');

// Fallback en memoria si IndexedDB está bloqueado
const memoryStore = {
  files: new Map(),
  tasks: new Map(),
};

let dbAvailable = true;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function openDb() {
  return new Promise((resolve, reject) => {
    // Verificar si IndexedDB está disponible
    if (!self.indexedDB) {
      console.error('[upload-worker] IndexedDB no disponible (bloqueado por Tracking Prevention)');
      reject(new Error('IndexedDB no disponible'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(TASKS_STORE)) db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      console.log('[upload-worker] IndexedDB abierto correctamente');
      resolve(req.result);
    };
    req.onerror = () => {
      console.error('[upload-worker] Error abriendo IndexedDB:', req.error);
      reject(req.error);
    };
  });
}

async function idbGet(storeName, id) {
  // Fallback a memoria si IndexedDB no está disponible
  if (!dbAvailable) {
    return memoryStore[storeName].get(id);
  }

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[upload-worker] IndexedDB fallo, usando memoria como fallback:', err);
    dbAvailable = false;
    return memoryStore[storeName].get(id);
  }
}

async function idbPut(storeName, value) {
  // Fallback a memoria si IndexedDB no está disponible
  if (!dbAvailable) {
    memoryStore[storeName].set(value.id, value);
    return;
  }

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[upload-worker] IndexedDB fallo, usando memoria como fallback:', err);
    dbAvailable = false;
    memoryStore[storeName].set(value.id, value);
  }
}

async function idbDelete(storeName, id) {
  // Fallback a memoria si IndexedDB no está disponible
  if (!dbAvailable) {
    memoryStore[storeName].delete(id);
    return;
  }

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[upload-worker] IndexedDB fallo, usando memoria como fallback:', err);
    dbAvailable = false;
    memoryStore[storeName].delete(id);
  }
}

function broadcastProgress(task) {
  channel.postMessage({ type: 'PROGRESS', task });
}

function broadcastRemoved(id) {
  channel.postMessage({ type: 'REMOVED', id });
}

async function updateTaskProgress(taskId, progress) {
  const task = await idbGet(TASKS_STORE, taskId);
  if (!task) return null;
  task.progress = progress;
  await idbPut(TASKS_STORE, task);
  broadcastProgress(task);
  return task;
}

function snakeCase(field) {
  return field.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function abortError() {
  return new DOMException('Subida cancelada', 'AbortError');
}

/** Valores por defecto de un informe de partido nuevo (mismo esquema que dataService.ts) */
const MATCH_REPORT_DEFAULTS = {
  general_notes: '', video_url: '',
  rival_video_url: '', rival_doc_url: '', rival_con_balon_text: '', rival_con_balon_video: '', rival_con_balon_doc: '', rival_con_balon_images: [],
  rival_sin_balon_text: '', rival_sin_balon_video: '', rival_sin_balon_doc: '', rival_sin_balon_images: [],
  rival_abp_text: '', rival_abp_video: '', rival_abp_doc: '', rival_abp_images: [],
  rival_abp_off_corners: [], rival_abp_off_lateral_fouls: [], rival_abp_def_corners: [], rival_abp_def_lateral_fouls: [], rival_abp_def_frontal_fouls: [],
  plan_video_url: '', plan_doc_url: '', plan_con_balon_text: '', plan_con_balon_video: '', plan_con_balon_doc: '', plan_con_balon_images: [],
  plan_sin_balon_text: '', plan_sin_balon_video: '', plan_sin_balon_doc: '', plan_sin_balon_images: [],
  plan_abp_text: '', plan_abp_video: '', plan_abp_doc: '', plan_abp_images: [],
  plan_abp_off_corners: [], plan_abp_off_lateral_fouls: [], plan_abp_def_corners: [], plan_abp_def_lateral_fouls: [], plan_abp_def_frontal_fouls: [],
  abp_off_corners: [], abp_off_lateral_fouls: [], abp_def_corners: [], abp_def_lateral_fouls: [], abp_def_frontal_fouls: [],
  formation: '1-4-3-3', lineup_positions: [], substitute_ids: [], not_convocado_ids: [], not_convocado_reasons: {},
  video_events: [], substitutions: [], match_goals: [], match_cards: [], tactical_changes: [],
  first_half_start: '', first_half_end: '', second_half_start: '', second_half_end: '',
  referee_name: '', referee_description: '',
};

async function persistVideoUrl({ supabaseUrl, supabaseAnonKey, supabaseAccessToken, matchId, targetField, videoUrl, videoOriginalUrl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    console.log('[upload-worker] Guardando URL del vídeo en la base de datos...');
    const headers = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAccessToken}`,
      'Content-Type': 'application/json',
    };
    const getRes = await fetch(`${supabaseUrl}/rest/v1/match_reports?id=eq.${encodeURIComponent(matchId)}&select=*`, {
      headers,
      signal: controller.signal,
    });
    if (!getRes.ok) throw new Error('No se pudo leer el informe de partido para guardar la URL');
    const rows = await getRes.json();
    const existing = rows && rows[0];
    const field = snakeCase(targetField);
    const baseRow = existing ? { ...existing } : { id: matchId, ...MATCH_REPORT_DEFAULTS };
    baseRow[field] = videoUrl;
    if (videoOriginalUrl) {
      baseRow.video_originals = { ...(baseRow.video_originals || {}), [targetField]: videoOriginalUrl };
    }

    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/match_reports`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(baseRow),
      signal: controller.signal,
    });
    if (!upsertRes.ok) {
      const text = await upsertRes.text().catch(() => '');
      throw new Error(`No se pudo guardar la URL del vídeo en el informe: ${upsertRes.status} ${text}`);
    }
    console.log('[upload-worker] URL del vídeo guardada');
  } finally {
    clearTimeout(timeout);
  }
}

/** Sube una copia del archivo original a Supabase Storage (best-effort: si falla no bloquea la subida a YouTube). */
async function uploadOriginalToStorage({ supabaseUrl, supabaseAnonKey, supabaseAccessToken, matchId, targetField, taskId, file }) {
  const ext = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'mp4';
  const path = `${matchId}/${targetField}/${taskId}.${ext}`;
  console.log('[upload-worker] Guardando copia original en Storage...', path);

  const putRes = await fetch(`${supabaseUrl}/storage/v1/object/match-video-originals/${path}`, {
    method: 'PUT',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAccessToken}`,
      'Content-Type': file.type || 'video/mp4',
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => '');
    throw new Error(`No se pudo guardar la copia original: ${putRes.status} ${text}`);
  }
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/match-video-originals/${path}`;
  console.log('[upload-worker] Copia original guardada:', publicUrl);
  return publicUrl;
}

async function getYoutubeAccessToken({ supabaseUrl, supabaseAnonKey, supabaseAccessToken }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    console.log('[upload-worker] Obteniendo token de acceso a YouTube...');
    const res = await fetch(`${supabaseUrl}/functions/v1/get-youtube-upload-token`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body && body.error;
      } catch { /* sin cuerpo JSON */ }
      if (res.status === 401) throw new Error('Tu sesión ha expirado. Vuelve a iniciar sesión e inténtalo de nuevo.');
      throw new Error(detail || `No se pudo obtener el token de YouTube (${res.status})`);
    }
    const data = await res.json();
    if (!data || !data.accessToken) throw new Error('La función get-youtube-upload-token no devolvió un token de acceso.');
    console.log('[upload-worker] Token de YouTube obtenido');
    return data.accessToken;
  } finally {
    clearTimeout(timeout);
  }
}

async function initResumableUpload(accessToken, file, title, description) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    console.log('[upload-worker] Inicializando sesión resumible con YouTube...');
    const metadata = {
      snippet: { title, description, categoryId: '17' },
      status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false },
    };
    const response = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(file.size),
          'X-Upload-Content-Type': file.type || 'video/mp4',
        },
        body: JSON.stringify(metadata),
        signal: controller.signal,
      }
    );
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Error al iniciar la subida: ${response.status} ${errorText}`);
    }
    const uploadUrl = response.headers.get('Location');
    if (!uploadUrl) throw new Error('No se recibió la URL de subida de YouTube');
    console.log('[upload-worker] Sesión resumible iniciada');
    return uploadUrl;
  } finally {
    clearTimeout(timeout);
  }
}

/** Pregunta a YouTube cuántos bytes recibió ya de una sesión resumible existente. */
async function queryResumeOffset(uploadUrl, fileSize, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    console.log('[upload-worker] Consultando offset de sesión resumible...');
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes */${fileSize}` },
      signal: AbortSignal.any([signal, controller.signal]),
    });
    if (res.status === 308) {
      const range = res.headers.get('Range');
      const offset = range ? parseInt(range.split('-')[1], 10) + 1 : 0;
      console.log(`[upload-worker] Sesión resumible en offset: ${offset}`);
      return offset;
    }
    if (res.ok) {
      console.log('[upload-worker] Sesión ya completada');
      return fileSize;
    }
    console.warn('[upload-worker] Sesión caducada, reiniciando...');
    return -1;
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadFileInChunks(uploadUrl, file, signal, startOffset, onProgress, taskId) {
  let uploadedBytes = startOffset || 0;
  onProgress(Math.round((uploadedBytes / file.size) * 100));

  const MAX_RETRIES = 3;
  const TIMEOUT_MS = Math.max(60000, Math.ceil((CHUNK_SIZE / 1000000) * 15000));

  while (uploadedBytes < file.size) {
    if (signal.aborted) throw abortError();

    const end = Math.min(uploadedBytes + CHUNK_SIZE, file.size);
    const chunk = file.slice(uploadedBytes, end);
    const isLastChunk = end === file.size;
    const chunkNum = Math.floor(uploadedBytes / CHUNK_SIZE) + 1;

    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (signal.aborted) throw abortError();

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          console.warn(`[upload-worker] Timeout (${TIMEOUT_MS}ms) en chunk ${chunkNum}, intento ${attempt}`);
          controller.abort();
        }, TIMEOUT_MS);

        console.log(`[upload-worker] Enviando chunk ${chunkNum} (${uploadedBytes}-${end - 1} de ${file.size}), intento ${attempt}`);

        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${uploadedBytes}-${end - 1}/${file.size}`,
            'Content-Type': file.type || 'video/mp4',
          },
          body: chunk,
          signal: AbortSignal.any([signal, controller.signal]),
        });

        clearTimeout(timeout);

        if (response.status === 308) {
          const rangeHeader = response.headers.get('Range');
          uploadedBytes = rangeHeader ? parseInt(rangeHeader.split('-')[1], 10) + 1 : end;
          console.log(`[upload-worker] Chunk ${chunkNum} aceptado, progreso: ${Math.round((uploadedBytes / file.size) * 100)}%`);
          onProgress(Math.round((uploadedBytes / file.size) * 100));
          break;
        } else if (response.ok && isLastChunk) {
          // Último chunk completado — extraer ID del video con timeout
          console.log(`[upload-worker] Último chunk aceptado (200 OK), extrayendo ID del video...`);
          let videoId;

          // Intenta obtener el videoId de la respuesta JSON
          try {
            const jsonController = new AbortController();
            const jsonTimeout = setTimeout(() => jsonController.abort(), 10000);
            const data = await Promise.race([
              response.json(),
              new Promise((_, reject) => jsonController.signal.addEventListener('abort', () => reject(new DOMException('JSON parse timeout', 'AbortError'))))
            ]);
            clearTimeout(jsonTimeout);
            videoId = data && data.id;
            if (videoId) {
              console.log(`[upload-worker] VideoId obtenido del JSON: ${videoId}`);
            }
          } catch (jsonErr) {
            console.warn(`[upload-worker] No se pudo parsear JSON de YouTube:`, jsonErr);
          }

          if (!videoId) {
            console.warn('[upload-worker] No se pudo obtener ID del video, pero se subió correctamente. Esperando que YouTube procese...');
            onProgress(100);
            // Sin videoId, no podemos retornar una URL válida
            // El usuario necesitará completar manualmente o reintentar
            throw new Error('No se pudo extraer el ID del video de la respuesta de YouTube');
          }

          console.log(`[upload-worker] Subida completada: ${videoId}`);
          onProgress(100);
          return `https://www.youtube.com/watch?v=${videoId}`;
        } else if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const msg = `Error en la subida: ${response.status} ${errorText}`;
          lastError = new Error(msg);
          console.error(`[upload-worker] Error en chunk ${chunkNum}: ${msg}`);
          if (attempt < MAX_RETRIES) {
            const delay = 2000 * attempt;
            console.log(`[upload-worker] Reintentando en ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw lastError;
        }
        break;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES && (err.name === 'AbortError' || err.message.includes('timeout'))) {
          const delay = 2000 * attempt;
          console.warn(`[upload-worker] Timeout/abort en intento ${attempt}, reintentando en ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        if (attempt === MAX_RETRIES) {
          console.error(`[upload-worker] Falló después de ${MAX_RETRIES} intentos:`, err);
          throw err;
        }
      }
    }
  }

  throw new Error('La subida terminó sin respuesta de YouTube');
}

async function runUpload(taskId, meta, retry) {
  const abort = new AbortController();
  abortControllers.set(taskId, abort);

  try {
    let task = await idbGet(TASKS_STORE, taskId);
    if (!task) {
      task = {
        id: taskId,
        matchId: meta.matchId,
        matchLabel: meta.matchLabel,
        targetField: meta.targetField,
        title: meta.title,
        description: meta.description || '',
        fileName: '',
        fileSize: 0,
        progress: { percent: 0, stage: 'requesting-token', message: 'Autenticando con YouTube...' },
      };
    }

    const fileRecord = await idbGet(FILES_STORE, taskId);
    if (!fileRecord || !fileRecord.file) {
      throw new Error('No se encontró el archivo de vídeo (se perdió al limpiar datos del navegador)');
    }
    const file = fileRecord.file;
    task.fileName = file.name;
    task.fileSize = file.size;
    await idbPut(TASKS_STORE, task);

    let uploadedBytes = 0;

    if (task.uploadUrl) {
      await updateTaskProgress(taskId, { percent: task.progress?.percent || 0, stage: 'uploading', message: 'Reanudando subida...' });
      const offset = await queryResumeOffset(task.uploadUrl, file.size, abort.signal);
      if (offset < 0) {
        // Sesión resumible caducada: reiniciamos desde cero (una sola vez)
        task.uploadUrl = undefined;
        await idbPut(TASKS_STORE, task);
        if (!retry) return runUpload(taskId, meta, true);
        throw new Error('La sesión de subida a YouTube caducó y no se pudo reiniciar');
      }
      uploadedBytes = offset;
    } else {
      await updateTaskProgress(taskId, { percent: 0, stage: 'requesting-token', message: 'Autenticando con YouTube...' });
      const ytAccessToken = await getYoutubeAccessToken(meta);
      if (abort.signal.aborted) throw abortError();

      await updateTaskProgress(taskId, { percent: 0, stage: 'initializing', message: 'Preparando subida...' });
      const uploadUrl = await initResumableUpload(ytAccessToken, file, meta.title, meta.description || '');
      task.uploadUrl = uploadUrl;
      await idbPut(TASKS_STORE, task);
    }

    await updateTaskProgress(taskId, { percent: Math.round((uploadedBytes / file.size) * 100), stage: 'uploading', message: 'Subiendo vídeo...' });

    const videoUrl = await uploadFileInChunks(task.uploadUrl, file, abort.signal, uploadedBytes, (percent) => {
      updateTaskProgress(taskId, { percent, stage: 'uploading', message: `Subiendo vídeo... ${percent}%` });
    }, taskId);

    // Guardar copia del archivo original en Storage (best-effort: si falla, no bloquea la subida a YouTube)
    let videoOriginalUrl;
    try {
      console.log('[upload-worker] Subiendo copia original a Storage...');
      const storageController = new AbortController();
      const storageTimeout = setTimeout(() => {
        console.warn('[upload-worker] Timeout guardando copia original (5s), continuando sin ella...');
        storageController.abort();
      }, 5000);

      try {
        videoOriginalUrl = await Promise.race([
          uploadOriginalToStorage({ ...meta, taskId, file }),
          new Promise((_, reject) => storageController.signal.addEventListener('abort', () => reject(new DOMException('Storage timeout', 'AbortError'))))
        ]);
      } finally {
        clearTimeout(storageTimeout);
      }
    } catch (originalErr) {
      console.error('[upload-worker] Error guardando la copia original (no bloqueante):', originalErr);
    }

    // Intentar guardar la URL con timeout — no bloquear aunque falle
    try {
      console.log('[upload-worker] Intentando guardar URL del vídeo en la base de datos...');
      const persistController = new AbortController();
      const persistTimeout = setTimeout(() => {
        console.warn('[upload-worker] Timeout guardando URL, continuando sin esperar...');
        persistController.abort();
      }, 10000);

      await Promise.race([
        persistVideoUrl({ ...meta, videoUrl, videoOriginalUrl }),
        new Promise((_, reject) => persistController.signal.addEventListener('abort', () => reject(new DOMException('Persist timeout', 'AbortError'))))
      ]);
      clearTimeout(persistTimeout);
      console.log('[upload-worker] URL guardada correctamente');
    } catch (persistErr) {
      console.error('[upload-worker] Error guardando la URL (no bloqueante):', persistErr);
      // Continuar de todas formas — el video se subió correctamente
    }

    console.log('[upload-worker] Marcando tarea como completada...');
    await updateTaskProgress(taskId, { percent: 100, stage: 'done', message: 'Vídeo subido correctamente', videoUrl });
    await idbDelete(FILES_STORE, taskId);
    abortControllers.delete(taskId);

    setTimeout(() => {
      console.log('[upload-worker] Limpiando tarea de IndexedDB...');
      idbDelete(TASKS_STORE, taskId).then(() => broadcastRemoved(taskId));
    }, 8000);
  } catch (err) {
    abortControllers.delete(taskId);
    if (err && err.name === 'AbortError') {
      await idbDelete(FILES_STORE, taskId).catch(() => {});
      await idbDelete(TASKS_STORE, taskId).catch(() => {});
      broadcastRemoved(taskId);
      return;
    }
    const message = (err && err.message) || 'Error desconocido al subir el vídeo';
    await updateTaskProgress(taskId, { percent: 0, stage: 'error', message, error: message }).catch(() => {});
  }
}

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'START_UPLOAD') {
    event.waitUntil(runUpload(data.taskId, data.meta, false));
    return;
  }

  if (data.type === 'CANCEL_UPLOAD') {
    const controller = abortControllers.get(data.taskId);
    if (controller) controller.abort();
    return;
  }

  if (data.type === 'DISMISS_TASK') {
    event.waitUntil(
      Promise.all([idbDelete(FILES_STORE, data.taskId), idbDelete(TASKS_STORE, data.taskId)]).then(() =>
        broadcastRemoved(data.taskId)
      )
    );
    return;
  }

  if (data.type === 'PING_TASK') {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage({ running: abortControllers.has(data.taskId) });
  }
});
