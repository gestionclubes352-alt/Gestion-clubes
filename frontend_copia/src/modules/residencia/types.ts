export type ZonaComunEstado = 'buenas_condiciones' | 'naranja_desordenado' | 'naranja_sucio' | 'rojo_desordenado' | 'rojo_sucio';

export interface ResidenciaHabitacionFormData {
  id?: string;
  nombre: string;
  capacidad?: number;
  planta?: string;
  notas?: string;
  incidencia?: string;
  estado?: 'verde' | 'naranja' | 'rojo';
  zona_comun_estado?: ZonaComunEstado;
}

export interface ResidenciaJugadorFormData {
  id?: string;
  jugador_id?: string;
  habitacion_id?: string;
  fecha_entrada?: string;
  fecha_salida?: string;
  notas?: string;
  estado?: 'verde' | 'naranja' | 'rojo';
  condicion?: ZonaComunEstado;
  numero_habitacion?: 1 | 2 | 3;
}

export interface ResidenciaComidaFormData {
  id?: string;
  fecha: string;
  turno: string;
  menu?: string;
  notas?: string;
}
