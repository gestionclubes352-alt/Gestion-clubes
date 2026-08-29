// Tipos específicos del módulo Usuarios

export interface User {
  id: number | string;
  nombre: string;
  email: string;
  rol: 'Responsable' | 'Administrador' | 'Tecnico' | 'Jugador' | 'Pendiente';
  estado: 'Activo' | 'Inactivo' | 'Pendiente' | 'Sin cuenta';
  departamento: 'Personal' | 'Directiva' | 'Dirección Deportiva';
  rolTecnico?: string;
  telefono?: string;
  fotoUrl?: string;
  ultimoAcceso?: string;
  /** UID de Firebase Auth (si está vinculado) */
  firebaseUid?: string;
  /** Club al que pertenece (Custom Claim de Firebase Auth) */
  clubId?: string;
  /** Jugador de `plantillas` vinculado a esta cuenta (rol Jugador) */
  jugadorId?: string;
}

export type UserRole = User['rol'];
export type UserStatus = User['estado'];
export type UserDepartamento = User['departamento'];

export const USER_ROLES: UserRole[] = ['Responsable', 'Administrador', 'Tecnico', 'Jugador'];
export const USER_STATUSES: UserStatus[] = ['Activo', 'Inactivo', 'Pendiente', 'Sin cuenta'];
export const USER_DEPARTAMENTOS: UserDepartamento[] = ['Personal', 'Directiva', 'Dirección Deportiva'];
export const ROLES_TECNICOS: string[] = [
  'COORDINADOR',
  'ENTRENADOR',
  '2º ENTRENADOR',
  'ENTRENADOR DE PORTEROS',
  'PREPARADOR FÍSICO',
  'ANALISTA',
  'PSICÓLOGO',
  'MÉDICO',
  'FISIOTERAPEUTA',
  'ATS',
  'DELEGADO',
];
