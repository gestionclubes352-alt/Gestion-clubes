/**
 * @fileoverview Shim temporal de compatibilidad (Fase 1 de la migración a Supabase).
 * El login real ya vive en `@context/AuthContext` (Supabase Auth). Este fichero
 * solo mantiene la forma pública que unos pocos consumidores todavía esperan
 * (`App.tsx`, `MatchReportView.tsx`, `roleService.ts`) para no romper el build
 * mientras se migran uno a uno:
 *   - `createAuthUser`: alta de usuario nuevo (admin) — necesita una Supabase
 *     Edge Function con `service_role` (no se puede hacer desde el cliente).
 *   - `getIdToken`/`refreshUserClaims`: ligados al sistema de Custom Claims de
 *     Firebase, sin equivalente directo en Supabase Auth.
 */

/** Emails con acceso de desarrollador (ven todos los clubs sin restricción). */
export const DEV_EMAILS = ['mikelzarate@gmail.com', 'ilandaleioa@gmail.com'];

export type UserRole = 'Responsable' | 'Administrador' | 'Tecnico' | 'Pendiente';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  avatar?: string;
  approved?: boolean;
  clubId?: string;
}

class AuthServiceStub {
  async createAuthUser(_email: string, _password: string, _displayName: string): Promise<{ success: boolean; uid?: string; error?: string }> {
    return { success: false, error: 'Alta de usuario pendiente de migrar a una Supabase Edge Function (ver plan de migración).' };
  }

  async getIdToken(): Promise<string | null> {
    return null;
  }

  async refreshUserClaims(): Promise<AuthUser | null> {
    return null;
  }
}

export const authService = new AuthServiceStub();
export default authService;
