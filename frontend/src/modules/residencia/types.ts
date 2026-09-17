export interface ResidenciaHabitacionFormData {
  id?: string;
  nombre: string;
  capacidad?: number;
  planta?: string;
  notas?: string;
  incidencia?: string;
  estado?: 'verde' | 'naranja' | 'rojo';
  zona_comun_estado?: 'buenas_condiciones' | 'desordenado' | 'sucio';
}

export interface ResidenciaJugadorFormData {
  id?: string;
  jugador_id?: string;
  habitacion_id?: string;
  fecha_entrada?: string;
  fecha_salida?: string;
  notas?: string;
  estado?: 'verde' | 'naranja' | 'rojo';
  condicion?: 'buenas_condiciones' | 'desordenado' | 'sucio';
  numero_habitacion?: 1 | 2 | 3;
}

export interface ResidenciaComidaFormData {
  id?: string;
  fecha: string;
  turno: string;
  menu?: string;
  notas?: string;
}
