/**
 * Servicio para manejar la relación M:M entre competiciones y equipos.
 * Permite configurar qué equipos participan en cada competición.
 */

import { supabase } from '@/shared/services/supabaseClient';

export interface CompeticionEquipo {
  id: string;
  competicion_id: string;
  equipo_id: string;
  created_at?: string;
}

export const competicionEquiposService = {
  /**
   * Obtiene todos los equipos de una competición
   */
  async getEquiposByCompeticion(competicionId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('competicion_equipos')
      .select('equipo_id')
      .eq('competicion_id', competicionId);

    if (error) throw error;
    return (data || []).map(row => row.equipo_id);
  },

  /**
   * Agrega un equipo a una competición
   */
  async addEquipoToCompeticion(competicionId: string, equipoId: string): Promise<void> {
    const { error } = await supabase
      .from('competicion_equipos')
      .insert({
        competicion_id: competicionId,
        equipo_id: equipoId,
      });

    if (error) throw error;
  },

  /**
   * Elimina un equipo de una competición
   */
  async removeEquipoFromCompeticion(competicionId: string, equipoId: string): Promise<void> {
    const { error } = await supabase
      .from('competicion_equipos')
      .delete()
      .eq('competicion_id', competicionId)
      .eq('equipo_id', equipoId);

    if (error) throw error;
  },

  /**
   * Reemplaza todos los equipos de una competición
   * Primero elimina todos los existentes y luego agrega los nuevos
   */
  async setEquiposForCompeticion(competicionId: string, equipoIds: string[]): Promise<void> {
    // Primero, eliminar todos los equipos existentes
    const { error: deleteError } = await supabase
      .from('competicion_equipos')
      .delete()
      .eq('competicion_id', competicionId);

    if (deleteError) throw deleteError;

    // Si hay equipos nuevos, agregarlos
    if (equipoIds.length > 0) {
      const rowsToInsert = equipoIds.map(equipoId => ({
        competicion_id: competicionId,
        equipo_id: equipoId,
      }));

      const { error: insertError } = await supabase
        .from('competicion_equipos')
        .insert(rowsToInsert);

      if (insertError) throw insertError;
    }
  },

  /**
   * Verifica si un equipo participa en una competición
   */
  async equipoParticipa(competicionId: string, equipoId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('competicion_equipos')
      .select('id')
      .eq('competicion_id', competicionId)
      .eq('equipo_id', equipoId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return !!data;
  },
};
