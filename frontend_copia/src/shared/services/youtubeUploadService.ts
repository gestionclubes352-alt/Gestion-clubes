/**
 * @fileoverview Servicio de subida de vídeos a YouTube.
 * Usa la YouTube Data API v3 con resumable uploads para subir
 * vídeos directamente desde el navegador al canal del club.
 *
 * Flujo:
 *   1. Pide un access_token a la Edge Function de Supabase
 *      `get-youtube-upload-token` (canjea el refresh token OAuth del
 *      canal del club, guardado como secreto de la función)
 *   2. Inicia un resumable upload a YouTube
 *   3. Sube el archivo en chunks mostrando progreso
 *   4. Devuelve la URL del vídeo subido
 */

import { supabase } from './supabaseClient';

const YT_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

export interface YouTubeUploadProgress {
  /** 0-100 */
  percent: number;
  /** 'requesting-token' | 'initializing' | 'uploading' | 'processing' | 'done' | 'error' */
  stage: 'requesting-token' | 'initializing' | 'uploading' | 'processing' | 'done' | 'error';
  /** Mensaje para el usuario */
  message: string;
  /** URL del vídeo (solo cuando stage === 'done') */
  videoUrl?: string;
  /** Mensaje de error (solo cuando stage === 'error') */
  error?: string;
}

export interface YouTubeUploadOptions {
  /** Archivo de vídeo a subir */
  file: File;
  /** Título del vídeo en YouTube */
  title: string;
  /** Descripción (opcional) */
  description?: string;
  /** Callback de progreso */
  onProgress: (progress: YouTubeUploadProgress) => void;
  /** AbortSignal para cancelar la subida */
  signal?: AbortSignal;
}

/**
 * Obtiene un access token de YouTube llamando a la Edge Function de Supabase.
 * `supabase.functions.invoke` adjunta automáticamente el JWT de la sesión
 * activa, así que no hace falta pasar ningún token manualmente.
 */
async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-youtube-upload-token', {
    body: {},
  });

  if (error) {
    const status = (error as any)?.context?.status;
    if (status === 404) {
      throw new Error('La función get-youtube-upload-token no existe. Despliega el backend primero.');
    }
    if (status === 401) {
      throw new Error('Tu sesión ha expirado. Vuelve a iniciar sesión e inténtalo de nuevo.');
    }
    let detail = '';
    try {
      const body = await (error as any)?.context?.json?.();
      detail = body?.error;
    } catch { /* respuesta sin cuerpo JSON */ }
    throw new Error(detail || error.message || 'No se pudo obtener el token de YouTube');
  }

  if (!data?.accessToken) {
    throw new Error('La función get-youtube-upload-token no devolvió un token de acceso.');
  }

  return data.accessToken;
}

/**
 * Inicia un resumable upload y devuelve la URI de subida.
 */
async function initResumableUpload(
  accessToken: string,
  file: File,
  title: string,
  description: string
): Promise<string> {
  const metadata = {
    snippet: {
      title,
      description,
      categoryId: '17', // Sports
    },
    status: {
      privacyStatus: 'unlisted',
      selfDeclaredMadeForKids: false,
    },
  };

  const response = await fetch(
    `${YT_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(file.size),
        'X-Upload-Content-Type': file.type || 'video/mp4',
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[youtube-upload] Init error:', response.status, errorText);
    throw new Error(`Error al iniciar la subida: ${response.status}`);
  }

  const uploadUrl = response.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No se recibió la URL de subida de YouTube');
  }

  return uploadUrl;
}

/**
 * Sube el archivo en chunks con progreso.
 * Usa chunks de 5MB (múltiplo de 256KB como requiere YouTube).
 */
async function uploadFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
  let uploadedBytes = 0;

  while (uploadedBytes < file.size) {
    if (signal?.aborted) {
      throw new Error('Subida cancelada');
    }

    const end = Math.min(uploadedBytes + CHUNK_SIZE, file.size);
    const chunk = file.slice(uploadedBytes, end);
    const isLastChunk = end === file.size;

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${uploadedBytes}-${end - 1}/${file.size}`,
        'Content-Type': file.type || 'video/mp4',
      },
      body: chunk,
      signal,
    });

    if (response.status === 308) {
      // Chunk aceptado, YouTube está esperando más datos
      const rangeHeader = response.headers.get('Range');
      if (rangeHeader) {
        uploadedBytes = parseInt(rangeHeader.split('-')[1], 10) + 1;
      } else {
        uploadedBytes = end;
      }
    } else if (response.ok && isLastChunk) {
      // Subida completada
      const data = await response.json();
      uploadedBytes = file.size;
      onProgress(100);
      return `https://www.youtube.com/watch?v=${data.id}`;
    } else if (!response.ok) {
      const errorText = await response.text();
      console.error('[youtube-upload] Chunk error:', response.status, errorText);
      throw new Error(`Error en la subida: ${response.status}`);
    }

    onProgress(Math.round((uploadedBytes / file.size) * 100));
  }

  throw new Error('La subida terminó sin respuesta de YouTube');
}

/**
 * Sube un vídeo a YouTube. Función principal del servicio.
 *
 * @example
 * ```ts
 * const cancel = new AbortController();
 * await uploadVideoToYouTube({
 *   file: selectedFile,
 *   title: 'J10 - Athletic vs Osasuna',
 *   onProgress: (p) => setProgress(p),
 *   signal: cancel.signal,
 * });
 * ```
 */
export async function uploadVideoToYouTube(
  options: YouTubeUploadOptions
): Promise<string> {
  const { file, title, description, onProgress, signal } = options;

  try {
    // 1. Obtener access token
    onProgress({
      percent: 0,
      stage: 'requesting-token',
      message: 'Autenticando con YouTube...',
    });

    const accessToken = await getAccessToken();

    // 2. Iniciar resumable upload
    onProgress({
      percent: 0,
      stage: 'initializing',
      message: 'Preparando subida...',
    });

    const uploadUrl = await initResumableUpload(
      accessToken,
      file,
      title,
      description || `Subido desde IBL – ${new Date().toLocaleDateString('es-ES')}`
    );

    // 3. Subir con progreso
    onProgress({
      percent: 0,
      stage: 'uploading',
      message: 'Subiendo vídeo... 0%',
    });

    const videoUrl = await uploadFileWithProgress(
      uploadUrl,
      file,
      (percent) => {
        onProgress({
          percent,
          stage: 'uploading',
          message: `Subiendo vídeo... ${percent}%`,
        });
      },
      signal
    );

    // 4. Completado
    onProgress({
      percent: 100,
      stage: 'done',
      message: 'Vídeo subido correctamente',
      videoUrl,
    });

    return videoUrl;
  } catch (error: any) {
    const errorMessage = error.name === 'AbortError'
      ? 'Subida cancelada'
      : error.message || 'Error desconocido al subir el vídeo';

    onProgress({
      percent: 0,
      stage: 'error',
      message: errorMessage,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Valida si un archivo es un vídeo válido para YouTube.
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 128 * 1024 * 1024 * 1024; // 128 GB (límite YouTube)
  const ALLOWED_TYPES = [
    'video/mp4',
    'video/quicktime',       // .mov
    'video/x-msvideo',       // .avi
    'video/x-ms-wmv',        // .wmv
    'video/webm',
    'video/x-matroska',      // .mkv
    'video/3gpp',
    'video/x-flv',
  ];

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'El archivo supera el límite de 128 GB' };
  }

  // Verificar tipo o extensión
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['mp4', 'mov', 'avi', 'wmv', 'webm', 'mkv', 'flv', '3gp', 'mpg', 'mpeg', 'mts', 'm4v'];
  
  if (!ALLOWED_TYPES.includes(file.type) && (!ext || !validExtensions.includes(ext))) {
    return { valid: false, error: `Formato no soportado: ${file.type || ext}. Usa MP4, MOV, AVI, etc.` };
  }

  return { valid: true };
}

/**
 * Formatea el tamaño de archivo para mostrar.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
