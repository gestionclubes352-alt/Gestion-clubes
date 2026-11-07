/**
 * @fileoverview Servicio de almacenamiento en Supabase Storage.
 * Maneja la carga de archivos (PDFs, imágenes, etc.) a buckets de Storage.
 */

import { supabase } from './supabaseClient';

const STORAGE_BUCKET = 'session-pdfs';

export const storageService = {
  /**
   * Carga un PDF a Supabase Storage
   * @param file Blob del archivo
   * @param fileName Nombre del archivo (ej: "Tareas_sesion_2026-08-03.pdf")
   * @param eventId ID del evento (para organizar en carpetas)
   * @returns URL pública del archivo cargado
   */
  async uploadSessionPDF(file: Blob, fileName: string, eventId?: string): Promise<string> {
    try {
      const path = eventId
        ? `session-pdfs/${eventId}/${fileName}`
        : `session-pdfs/${fileName}`;

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: 'application/pdf',
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

      return publicUrl.publicUrl;
    } catch (error) {
      console.error('Error uploading PDF to Storage:', error);
      throw error;
    }
  },

  /**
   * Obtiene la URL pública de un archivo en Storage
   */
  getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Elimina un archivo de Storage
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);
    if (error) throw error;
  },
};
