// Tipos específicos del módulo Plantilla (Jugadores)

export interface Player {
  id: number | string;
  fotoUrl: string;
  competicion: string;
  club: string;
  equipo: string;
  dorsal?: number;
  nombre: string;
  apodo?: string;
  posicion: string;
  posicionJuego: string;
  perfil: 'D' | 'I' | 'A';
  descripcion?: string;
  ataque?: string;
  defensa?: string;
  persona?: string;
  observaciones?: string;
  fechaNacimiento?: string;
  partidosJugados?: number;
  minutos?: number;
  titular?: number;
  goles?: number;
  ratingTecnica?: number;
  ratingTactica?: number;
  ratingCondicional?: number;
  ratingPsicologico?: number;
  ratingHumano?: number;
  estado?: 'APTO' | 'LESIONADO' | 'OTRO';
  residencia?: boolean;
  // Campos extendidos (Escuela Huesca / AppSheet)
  etapa?: string;
  enlace?: string;
  nombrePila?: string;
  primerApellido?: string;
  segundoApellido?: string;
  dni?: string;
  otraDemarcacion?: string;
  otraPosicion?: string;
  telefono?: string;
  correo?: string;
  // Ficha ampliada (Escuela Huesca)
  temporada?: string;
  clubId?: string;
  equipoId?: string;
  competicionId?: string;
  nombreCompleto?: string;
  anioNacimiento?: number;
  nombreTutor?: string;
  correoTutor?: string;
  telefonoTutor?: string;
}

export interface PlayerFilters {
  searchTerm: string;
  position: string;
  viewMode: 'table' | 'cards';
}

export interface PlayerGroup {
  pos: string;
  players: Player[];
}
