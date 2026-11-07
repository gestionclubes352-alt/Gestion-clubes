// Tipos específicos del módulo Staff (Personal)

export interface StaffMember {
  id: string;
  club_id: string;
  nombre: string;
  cargo: string;
  telefono?: string;
  dni?: string;
  foto_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StaffFilters {
  searchTerm: string;
  cargo: string;
}
