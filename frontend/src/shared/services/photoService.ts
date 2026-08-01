/**
 * @fileoverview Subida de fotos (jugadores, equipos, clubes) a Supabase Storage.
 * Sustituye la versión anterior sobre Firebase Storage.
 * Requiere un bucket público llamado `club-media` en el proyecto de Supabase.
 */

import { supabase } from './supabaseClient';

const BUCKET = 'club-media';

async function uploadToStorage(path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPlayerPhoto(file: File, playerId: string, clubId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  return uploadToStorage(`clubs/${clubId}/players/${playerId}/profile.${ext}`, file);
}

export async function uploadTeamLogo(file: File, teamId: string, clubId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  return uploadToStorage(`clubs/${clubId}/teams/${teamId}/logo.${ext}`, file);
}

export async function uploadClubLogo(file: File, clubEntityId: string, clubId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  return uploadToStorage(`clubs/${clubId}/clubes/${clubEntityId}/logo.${ext}`, file);
}
