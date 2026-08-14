export interface LocalidadFormData {
  id?: string;
  nombre: string;
  provincia?: string;
  pais: string;
}

export interface InstalacionCampoFormData {
  id?: string;
  localidad_id?: string;
  nombre: string;
  tipo?: string;
  capacidad?: number;
  descripcion?: string;
}
