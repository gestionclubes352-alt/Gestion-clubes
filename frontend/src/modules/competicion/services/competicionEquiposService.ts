/**
 * Servicio para manejar la relación M:M entre competiciones y equipos.
 * Permite configurar qué equipos participan en cada competición, ya sean
 * equipos propios (con ficha en `plantillas`) o equipos externos/rivales
 * de nombre libre (p.ej. equipos de amistosos sin ficha en el sistema).
 */

import { supabase } from '@/shared/services/supabaseClient';

export interface CompeticionEquipo {
  id: string;
  competicion_id: string;
  equipo_id: string | null;
  nombre_externo: string | null;
  created_at?: string;
}

/** Referencia a un equipo dentro de una competición: propio (por id) o externo (por nombre) */
export interface EquipoRef {
  equipoId?: string;
  nombreExterno?: string;
}

export const competicionEquiposService = {
  /**
   * Obtiene todos los equipos (propios y externos) de una competición
   */
  async getTeamsByCompeticion(competicionId: string): Promise<EquipoRef[]> {
    const { data, error } = await supabase
      .from('competicion_equipos')
      .select('equipo_id, nombre_externo')
      .eq('competicion_id', competicionId);

    if (error) throw error;
    return (data || []).map(row => ({
      equipoId: row.equipo_id || undefined,
      nombreExterno: row.nombre_externo || undefined,
    }));
  },

  /**
   * @deprecated usa getTeamsByCompeticion, que también incluye equipos externos
   */
  async getEquiposByCompeticion(competicionId: string): Promise<string[]> {
    const teams = await this.getTeamsByCompeticion(competicionId);
    return teams.filter(t => t.equipoId).map(t => t.equipoId as string);
  },

  /**
   * Reemplaza todos los equipos (propios y externos) de una competición.
   * Primero elimina los existentes y luego inserta la nueva lista.
   */
  async setTeamsForCompeticion(competicionId: string, teams: EquipoRef[]): Promise<void> {
    const { error: deleteError } = await supabase
      .from('competicion_equipos')
      .delete()
      .eq('competicion_id', competicionId);

    if (deleteError) throw deleteError;

    if (teams.length > 0) {
      const rowsToInsert = teams.map(team => ({
        competicion_id: competicionId,
        equipo_id: team.equipoId || null,
        nombre_externo: team.nombreExterno || null,
      }));

      const { error: insertError } = await supabase
        .from('competicion_equipos')
        .insert(rowsToInsert);

      if (insertError) throw insertError;
    }
  },

  /**
   * @deprecated usa setTeamsForCompeticion, que también soporta equipos externos
   */
  async setEquiposForCompeticion(competicionId: string, equipoIds: string[]): Promise<void> {
    await this.setTeamsForCompeticion(
      competicionId,
      equipoIds.map(equipoId => ({ equipoId }))
    );
  },
};
