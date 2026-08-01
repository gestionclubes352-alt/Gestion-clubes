/**
 * @fileoverview Shim temporal de compatibilidad (Fase 1 de la migración a Supabase).
 * El login real ya vive en `@context/AuthContext` (Supabase Auth). Este fichero
 * solo mantiene la forma pública que unos pocos consumidores todavía esperan
 * (`App.tsx`, `MatchReportView.tsx`, `roleService.ts`) para no romper el build
 * mientras se migran uno a uno:
 *   - `createAuthUser`: alta de usuario nuevo (admin) — delega en la Edge
 *     Function `create-user`, la única pieza con permiso (`service_role`)
 *     para escribir en `auth.users` (ver `supabase/functions/create-user`).
 *   - `getIdToken`/`refreshUserClaims`: ligados al sistema de Custom Claims de
 *     Firebase, sin equivalente directo en Supabase Auth.
 */

import { supabase } from './supabaseClient';

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

export interface NewUserPerfil {
  rol: 'Administrador' | 'Responsable' | 'Tecnico';
  estado: 'Activo' | 'Inactivo' | 'Pendiente';
  clubId?: string | null;
}

class AuthServiceStub {
  async createAuthUser(
    email: string,
    password: string,
    displayName: string,
    perfil: NewUserPerfil
  ): Promise<{ success: boolean; uid?: string; error?: string }> {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email,
        password,
        nombre: displayName,
        rol: perfil.rol,
        estado: perfil.estado,
        club_id: perfil.clubId ?? null,
      },
    });

    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: data.error };
    return { success: true, uid: data?.id };
  }

  /** Resetea la contraseña de un usuario ya existente (misma Edge Function, sin crear cuenta). */
  async setUserPassword(userId: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { user_id: userId, password },
    });

    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: data.error };
    return { success: true };
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
