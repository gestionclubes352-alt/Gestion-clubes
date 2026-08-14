/**
 * @fileoverview Redimensionado y compresión de imágenes en el navegador antes de subirlas.
 *
 * Motivo: las fotos hechas con el móvil pesan varios MB y se mostraban en avatares
 * de 36px o tarjetas de 200px. Al subirlas ya reducidas, la carga en móvil pasa de
 * megabytes a decenas de KB por imagen.
 */

/** Límites por tipo de imagen (lado mayor en píxeles y calidad JPEG) */
export const IMAGE_PRESETS = {
  /** Fotos de jugadores/personal: se ven como avatar o tarjeta */
  photo: { maxSize: 800, quality: 0.82 },
  /** Escudos y logos: suelen necesitar menos resolución */
  logo: { maxSize: 512, quality: 0.9 },
  /** Miniaturas de tareas/ejercicios */
  thumbnail: { maxSize: 640, quality: 0.8 },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

/** Formatos que no conviene recomprimir (SVG es vectorial, GIF puede estar animado) */
const SKIP_TYPES = ['image/svg+xml', 'image/gif'];

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen'));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
      type,
      quality
    );
  });

/**
 * Devuelve una versión reducida del fichero. Si algo falla (formato no soportado,
 * canvas no disponible…) devuelve el fichero original: nunca bloquea la subida.
 */
export async function optimizeImageFile(file: File, preset: ImagePreset = 'photo'): Promise<File> {
  if (!file.type.startsWith('image/') || SKIP_TYPES.includes(file.type)) return file;

  const { maxSize, quality } = IMAGE_PRESETS[preset];

  try {
    const image = await loadImage(file);
    const largestSide = Math.max(image.width, image.height);
    const scale = Math.min(1, maxSize / largestSide);

    // Ya es pequeña y ligera: no merece la pena recomprimir
    if (scale === 1 && file.size <= 300 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Los PNG con transparencia (logos, fotos con el fondo eliminado) se mantienen en PNG; el resto pasa a JPEG
    const keepPng = file.type === 'image/png';
    const outputType = keepPng ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, outputType, quality);

    // Si la "optimización" no reduce el peso, se conserva el original
    if (blob.size >= file.size) return file;

    const extension = outputType === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
