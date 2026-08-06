import { supabase } from '@/shared/services/supabaseClient';
import { Competicion } from '@/shared/services/dataService';

export const competicionService = {
  async listCompeticiones(filters?: Record<string, unknown>): Promise<Competicion[]> {
    let query = supabase.from('competiciones').select('*');
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value as string | number | boolean);
      }
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as Competicion[];
  },

  async getCompeticionById(id: string): Promise<Competicion> {
    const { data, error } = await supabase
      .from('competiciones')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Competicion;
  },

  async createCompeticion(competicion: Partial<Competicion>): Promise<Competicion> {
    const { data, error } = await supabase
      .from('competiciones')
      .insert({
        nombre: competicion.nombre,
        tipo: competicion.tipo || 'Liga',
        categoria: competicion.categoria,
        temporada: competicion.temporada || '25/26',
        numero_partes: competicion.numero_partes || 2,
        minutos_por_parte: competicion.minutos_por_parte || 45,
        total_minutos: competicion.total_minutos || 90,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data as Competicion;
  },

  async updateCompeticion(id: string, competicion: Partial<Competicion>): Promise<Competicion> {
    const { data, error } = await supabase
      .from('competiciones')
      .update({
        nombre: competicion.nombre,
        tipo: competicion.tipo,
        categoria: competicion.categoria,
        temporada: competicion.temporada,
        numero_partes: competicion.numero_partes,
        minutos_por_parte: competicion.minutos_por_parte,
        total_minutos: competicion.total_minutos,
      } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Competicion;
  },

  async deleteCompeticion(id: string): Promise<void> {
    const { error } = await supabase.from('competiciones').delete().eq('id', id);
    if (error) throw error;
  },
};
