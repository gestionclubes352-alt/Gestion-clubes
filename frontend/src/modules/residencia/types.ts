export interface ResidenciaHabitacionFormData {
  id?: string;
  nombre: string;
  capacidad?: number;
  planta?: string;
  notas?: string;
}

export interface ResidenciaJugadorFormData {
  id?: string;
  jugador_id?: string;
  habitacion_id?: string;
  fecha_entrada?: string;
  fecha_salida?: string;
  notas?: string;
}

export interface ResidenciaComidaFormData {
  id?: string;
  fecha: string;
  turno: string;
  menu?: string;
  notas?: string;
}
