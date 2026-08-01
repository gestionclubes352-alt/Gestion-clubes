// Tipos específicos del módulo Staff (Personal)

export interface StaffMember {
  id: number | string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  fotoUrl?: string;
  dni?: string;
  fechaNacimiento?: string;
  rol: string;
  equipo?: string;
  etapa?: string;
  competicion?: string;
  telefono?: string;
  email?: string;
  club?: string;
}

export interface StaffFilters {
  searchTerm: string;
  role: string;
}
