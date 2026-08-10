/**
 * @fileoverview Subida de fotos (jugadores, equipos, clubes) a Supabase Storage.
 * Sustituye la versión anterior sobre Firebase Storage.
 * Requiere un bucket público llamado `club-media` en el proyecto de Supabase.
 */

import { supabase } from './supabaseClient';
import { optimizeImageFile, type ImagePreset } from './imageOptimizer';

const BUCKET = 'club-media';

async function uploadToStorage(path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Sube la imagen reducida. La extensión se toma del fichero ya optimizado para que
 * el tipo del objeto en Storage coincida con su contenido real.
 */
async function uploadOptimized(pathPrefix: string, name: string, file: File, preset: ImagePreset): Promise<string> {
  const optimized = await optimizeImageFile(file, preset);
  const ext = optimized.name.split('.').pop() || 'jpg';
  return uploadToStorage(`${pathPrefix}/${name}.${ext}`, optimized);
}

export async function uploadPlayerPhoto(file: File, playerId: string, clubId: string): Promise<string> {
  return uploadOptimized(`clubs/${clubId}/players/${playerId}`, 'profile', file, 'photo');
}

export async function uploadTeamLogo(file: File, teamId: string, clubId: string): Promise<string> {
  return uploadOptimized(`clubs/${clubId}/teams/${teamId}`, 'logo', file, 'logo');
}

export async function uploadClubLogo(file: File, clubEntityId: string, clubId: string): Promise<string> {
  return uploadOptimized(`clubs/${clubId}/clubes/${clubEntityId}`, 'logo', file, 'logo');
}

export async function uploadTaskThumbnail(file: File, taskId: string): Promise<string> {
  return uploadOptimized(`tasks/${taskId}`, 'thumbnail', file, 'thumbnail');
}

export async function uploadMatchReportFile(file: File, matchId: string | number): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin';
  return uploadToStorage(`matches/${matchId}/reports/${crypto.randomUUID()}.${ext}`, file);
}
