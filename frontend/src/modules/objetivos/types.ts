export type TipoObjetivoIndividual = 'deportivo' | 'psicologico' | 'habitos' | 'academico';
export type EstadoObjetivoIndividual = 'verde' | 'naranja' | 'rojo';

export interface ObjetivoIndividualFormData {
  id?: string;
  equipo_id: string;
  jugador_id: string;
  fecha: string;
  tipo: TipoObjetivoIndividual;
  estado: EstadoObjetivoIndividual;
  detalle?: string;
  plan_accion?: string;
}

export const TIPOS_OBJETIVO: { value: TipoObjetivoIndividual; label: string }[] = [
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'psicologico', label: 'Psicológico' },
  { value: 'habitos', label: 'Hábitos' },
  { value: 'academico', label: 'Académico' },
];

export const ESTADOS_OBJETIVO: { value: EstadoObjetivoIndividual; label: string; color: string }[] = [
  { value: 'verde', label: 'Verde', color: '#22c55e' },
  { value: 'naranja', label: 'Naranja', color: '#f97316' },
  { value: 'rojo', label: 'Rojo', color: '#ef4444' },
];
