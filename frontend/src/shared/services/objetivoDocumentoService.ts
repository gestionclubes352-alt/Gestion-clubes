/**
 * @fileoverview Documentos adjuntos de acciones/evaluaciones de objetivos individuales.
 * Bucket privado `objetivos-documentos` (migración 20260930130000): se abren con URL firmada.
 */

import { supabase } from './supabaseClient';

const BUCKET = 'objetivos-documentos';
const MAX_BYTES = 20 * 1024 * 1024;
const EXTENSIONES_PERMITIDAS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

export interface DocumentoAdjunto {
  nombre: string;
  path: string;
  tamano?: number;
}

const sanitizar = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);

export async function uploadObjetivoDocumento(file: File): Promise<DocumentoAdjunto> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!EXTENSIONES_PERMITIDAS.includes(ext)) {
    throw new Error('Tipo de archivo no permitido. Usa PDF, imagen, Word, Excel, PowerPoint o texto.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('El archivo supera el máximo de 20 MB.');
  }
  const unico = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `objetivos/${unico}-${sanitizar(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return { nombre: file.name, path, tamano: file.size };
}

export async function openObjetivoDocumento(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) throw error ?? new Error('No se pudo abrir el documento.');
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

export async function removeObjetivoDocumento(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
