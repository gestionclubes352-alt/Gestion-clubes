/**
 * @fileoverview Servicio de gestión de roles vía Firebase Custom Claims.
 *
 * Todas las operaciones de roles pasan por Cloud Functions del backend
 * que usan Firebase Admin SDK para setCustomUserClaims().
 *
 * Esto garantiza que:
 *   1. Los roles NO se almacenan en localStorage (no manipulable)
 *   2. Son verificables en Firestore Rules (request.auth.token.role)
 *   3. Son verificables en Cloud Functions (decoded.role)
 *   4. Se propagan al ID Token del usuario
 */

import { authService, type UserRole } from './authService';

// Base URL de las Cloud Functions
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || '';

/** Resultado genérico de una operación de rol */
interface RoleOperationResult {
  success: boolean;
  error?: string;
}

/** Datos de un usuario del club (devuelto por listClubUsers) */
export interface ClubUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  clubId?: string;
  approved: boolean;
  disabled: boolean;
  lastSignIn?: string;
  createdAt?: string;
}

/** Headers comunes para llamadas autenticadas */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await authService.getIdToken();
  if (!token) throw new Error('No autenticado');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

/**
 * Cambia el rol de un usuario. Solo admins.
 * Se puede identificar al usuario por UID o por email.
 * Tras el cambio, el usuario objetivo deberá refrescar su token.
 */
export async function setUserRole(
  target: { uid?: string; email?: string },
  role: UserRole,
  clubId?: string,
): Promise<RoleOperationResult> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/setUserRole`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        targetUid: target.uid,
        targetEmail: target.email,
        role,
        clubId,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || `Error ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

/**
 * Obtiene los Custom Claims de un usuario.
 * Admins pueden consultar cualquier usuario; otros solo su propio perfil.
 */
export async function getUserClaims(targetUid?: string): Promise<{
  role: UserRole;
  clubId?: string;
} | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/getUserClaims`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUid }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      role: data.claims?.role || 'Staff',
      clubId: data.claims?.clubId,
    };
  } catch {
    return null;
  }
}

/**
 * Lista los usuarios de un club con sus roles. Solo admins.
 */
export async function listClubUsers(clubId: string): Promise<ClubUser[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/listClubUsers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ clubId }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.users || [];
  } catch {
    return [];
  }
}

/**
 * Fuerza un refresco del token del usuario actual para recoger claims actualizados.
 * Útil después de que un admin cambie el rol del usuario logueado.
 */
export async function refreshCurrentUserRole(): Promise<UserRole | null> {
  const user = await authService.refreshUserClaims();
  return user?.rol ?? null;
}

/**
 * Aprueba o rechaza un usuario pendiente. Solo admins.
 */
export async function approveUser(
  targetUid: string,
  approved: boolean,
  role?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/approveUser`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUid, approved, role }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || `Error ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

/**
 * Lista TODOS los usuarios registrados en Firebase Auth. Solo admins.
 */
export async function listAllUsers(): Promise<ClubUser[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FUNCTIONS_URL}/listAllUsers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.users || [];
  } catch {
    return [];
  }
}
