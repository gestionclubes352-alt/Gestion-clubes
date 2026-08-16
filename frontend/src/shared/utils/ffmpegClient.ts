/**
 * @fileoverview Instancia compartida de ffmpeg.wasm. Se usa tanto para
 * exportar el vídeo de la pizarra táctica como para recortar clips de
 * eventos de partido, evitando cargar el core wasm (~30MB) más de una vez.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let loadError: Error | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (loadError) {
    throw new Error(`FFmpeg ya falló al cargar anteriormente: ${loadError.message}`);
  }

  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
  }

  if (ffmpeg.loaded) {
    return ffmpeg;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('FFmpeg tardó demasiado en cargar (>120s)')), 120000)
        );
        await Promise.race([
          ffmpeg!.load({
            coreURL: '/ffmpeg/ffmpeg-core.js',
            wasmURL: '/ffmpeg/ffmpeg-core.wasm',
          }),
          timeout,
        ]);
        return ffmpeg!;
      } catch (err) {
        loadError = err instanceof Error ? err : new Error(String(err));
        ffmpeg = null;
        loadPromise = null;
        throw loadError;
      }
    })();
  }

  return await loadPromise;
}
