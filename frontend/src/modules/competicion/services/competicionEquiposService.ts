/**
 * Servicio para manejar la relación M:M entre competiciones y equipos.
 * Permite configurar qué equipos participan en cada competición, ya sean
 * equipos propios (con ficha en `equipos`) o equipos rivales del catálogo
 * `equipos_rivales` (p.ej. equipos de amistosos sin plantilla propia).
 *
 * Ambos deben existir previamente como entidad (en `equipos` o en
 * `equipos_rivales`) antes de poder añadirse a una competición: no se admite
 * texto libre, para mantener consistencia de datos entre partidos.
 */

import { supabase } from '@/shared/services/supabaseClient';

export interface CompeticionEquipo {
  id: string;
  competicion_id: string;
  equipo_id: string | null;
  equipo_rival_id: string | null;
  created_at?: string;
}

/** Referencia a un equipo dentro de una competición: propio (por id) o rival de catálogo (por id) */
export interface EquipoRef {
  equipoId?: string;
  equipoRivalId?: string;
}

export const competicionEquiposService = {
  /**
   * Obtiene todos los equipos (propios y rivales de catálogo) de una competición
   */
  async getTeamsByCompeticion(competicionId: string): Promise<EquipoRef[]> {
    const { data, error } = await supabase
      .from('competicion_equipos')
      .select('equipo_id, equipo_rival_id')
      .eq('competicion_id', competicionId);

    if (error) throw error;
    return (data || []).map(row => ({
      equipoId: row.equipo_id || undefined,
      equipoRivalId: row.equipo_rival_id || undefined,
    }));
  },

  async addTeamToCompeticion(competicionId: string, team: EquipoRef): Promise<void> {
    const { error } = await supabase
      .from('competicion_equipos')
      .insert({
        competicion_id: competicionId,
        equipo_id: team.equipoId || null,
        equipo_rival_id: team.equipoRivalId || null,
      });

    if (error && error.code !== '23505') throw error;
  },

  /**
   * Reemplaza todos los equipos (propios y rivales) de una competición.
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
        equipo_rival_id: team.equipoRivalId || null,
      }));

      const { error: insertError } = await supabase
        .from('competicion_equipos')
        .insert(rowsToInsert);

      if (insertError) throw insertError;
    }
  },
};
