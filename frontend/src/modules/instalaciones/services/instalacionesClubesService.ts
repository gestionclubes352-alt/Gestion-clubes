import { supabase } from '@shared/services/supabaseClient';

export interface InstalacionClub {
  id: string;
  instalacion_campo_id: string;
  club_id: string;
  created_at?: string;
  updated_at?: string;
}

export const instalacionesClubesService = {
  async listAll(): Promise<InstalacionClub[]> {
    const { data, error } = await supabase
      .from('instalaciones_campos_clubes')
      .select('*');
    if (error) throw error;
    return data || [];
  },

  async getByInstalacion(instalacion_id: string): Promise<InstalacionClub[]> {
    const { data, error } = await supabase
      .from('instalaciones_campos_clubes')
      .select('*')
      .eq('instalacion_campo_id', instalacion_id);
    if (error) throw error;
    return data || [];
  },

  async setClubsForInstalacion(instalacion_id: string, club_ids: string[]): Promise<void> {
    // Eliminar relaciones actuales
    const { error: deleteError } = await supabase
      .from('instalaciones_campos_clubes')
      .delete()
      .eq('instalacion_campo_id', instalacion_id);

    if (deleteError) throw deleteError;

    // Agregar nuevas relaciones
    if (club_ids.length > 0) {
      const records = club_ids.map(club_id => ({
        instalacion_campo_id: instalacion_id,
        club_id,
      }));

      const { error: insertError } = await supabase
        .from('instalaciones_campos_clubes')
        .insert(records as any);

      if (insertError) throw insertError;
    }
  },

  async addClub(instalacion_id: string, club_id: string): Promise<void> {
    const { error } = await supabase
      .from('instalaciones_campos_clubes')
      .insert({
        instalacion_campo_id: instalacion_id,
        club_id,
      } as any);

    if (error) throw error;
  },

  async removeClub(instalacion_id: string, club_id: string): Promise<void> {
    const { error } = await supabase
      .from('instalaciones_campos_clubes')
      .delete()
      .eq('instalacion_campo_id', instalacion_id)
      .eq('club_id', club_id);

    if (error) throw error;
  },
};
