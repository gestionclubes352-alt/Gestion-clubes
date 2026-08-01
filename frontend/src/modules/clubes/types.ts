// Tipos específicos del módulo Clubes

export interface Club {
  id: number | string;
  nombre: string;
  logoUrl?: string;
  localidad?: string;
}
