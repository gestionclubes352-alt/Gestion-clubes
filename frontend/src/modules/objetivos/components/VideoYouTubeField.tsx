import React, { useEffect, useRef, useState } from 'react';
import {
  uploadVideoToYouTube,
  validateVideoFile,
  type YouTubeUploadProgress,
} from '@shared/services/youtubeUploadService';

/** Solo se aceptan enlaces de YouTube (evita guardar/abrir URLs arbitrarias). */
const esUrlYouTube = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && /^(www\.)?(youtube\.com|youtu\.be)$/.test(hostname);
  } catch {
    return false;
  }
};

/** Convierte una URL de YouTube (ya validada) en su URL de embed; null si no se reconoce el ID. */
const getEmbedUrl = (url: string): string | null => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};

/**
 * Sube un vídeo directamente al canal de YouTube del club (no listado) y
 * guarda solo su URL. La subida corre en esta pestaña: hay que esperar a que
 * termine antes de cerrar el modal (se avisa al padre con `onBusyChange`).
 */
const VideoYouTubeField: React.FC<{
  videoUrl?: string;
  /** Título del vídeo en YouTube */
  titulo: string;
  onChange: (url: string | undefined) => void;
  onBusyChange?: (busy: boolean) => void;
}> = ({ videoUrl, titulo, onChange, onBusyChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<YouTubeUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const busy = !!progress && progress.stage !== 'done' && progress.stage !== 'error';
  const embedUrl = videoUrl && esUrlYouTube(videoUrl) ? getEmbedUrl(videoUrl) : null;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Al desmontar (cierre del modal) se cancela la subida en curso y se libera el bloqueo.
  useEffect(() => () => {
    abortRef.current?.abort();
    onBusyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error ?? 'Vídeo no válido.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const url = await uploadVideoToYouTube({
        file,
        title: titulo,
        onProgress: setProgress,
        signal: controller.signal,
      });
      onChange(url);
    } catch (err) {
      if ((err as { name?: string } | null)?.name !== 'AbortError') {
        setError((err as { message?: string } | null)?.message || 'No se pudo subir el vídeo.');
      }
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  return (
    <div>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Vídeo</label>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mkv,.mov,.mts,.m4v"
        onChange={handleFile}
        className="hidden"
      />
      <div className="flex items-center gap-2 flex-wrap">
        {embedUrl && (
          <button
            type="button"
            onClick={() => setShowPlayer((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-[var(--accent)]/40"
            title={showPlayer ? 'Ocultar vídeo' : 'Ver vídeo aquí'}
          >
            <i className="fa-brands fa-youtube text-red-600"></i>
            <span>{showPlayer ? 'Ocultar vídeo' : 'Ver vídeo'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <i className={`fa-solid ${busy ? 'fa-spinner animate-spin' : 'fa-video'} mr-1`}></i>
          {busy ? 'Subiendo...' : videoUrl ? 'Cambiar vídeo' : 'Subir vídeo'}
        </button>
        {busy && (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="px-3 py-2 rounded-xl border border-red-200 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-all"
          >
            Cancelar
          </button>
        )}
        {videoUrl && !busy && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title="Quitar vídeo (no lo borra de YouTube)"
            className="w-8 h-8 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>
      {embedUrl && showPlayer && (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-black">
          <iframe
            src={embedUrl}
            title="Vídeo"
            className="h-full w-full"
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      {busy && progress && (
        <div className="mt-2">
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="mt-1 text-[10px] font-bold text-slate-500">{progress.message}</p>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
};

export default VideoYouTubeField;
