/**
 * @fileoverview Subida de fotos de staff a Supabase Storage.
 * Sustituye la versión anterior sobre Firebase Storage.
 * Requiere un bucket público llamado `club-media` en el proyecto de Supabase.
 */

import { supabase } from './supabaseClient';

const BUCKET = 'club-media';

export async function uploadStaffPhoto(file: File, staffId: string, clubId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `clubs/${clubId}/staff/${staffId}/profile.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
