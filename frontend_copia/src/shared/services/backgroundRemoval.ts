/**
 * @fileoverview Eliminación de fondo de fotos en el navegador (sin servicios externos).
 *
 * Se ejecuta localmente con un modelo de segmentación descargado la primera vez
 * (se cachea en el navegador). Nunca debe bloquear una subida: si falla, se
 * devuelve el fichero original tal cual.
 */

import { removeBackground } from '@imgly/background-removal';

/**
 * Devuelve una copia del fichero con el fondo eliminado (PNG con transparencia).
 * Si el proceso falla (formato no soportado, sin memoria, etc.) devuelve el original.
 */
export async function removePhotoBackground(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const blob = await removeBackground(file);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${baseName}.png`, {
      type: 'image/png',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('No se pudo eliminar el fondo de la foto, se usa la original.', error);
    return file;
  }
}

/** Descarga una foto ya subida (URL pública) como File, para poder reprocesarla. */
export async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar la foto (${response.status})`);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}
