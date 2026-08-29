/**
 * @fileoverview Contexto de autenticación con Supabase Auth.
 * Sustituye la versión anterior basada en Firebase Auth + custom claims.
 * El rol/club del usuario se lee de la tabla `usuarios` (ver 004_multiclub_schema.sql).
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../shared/services/supabaseClient';

export type Rol = 'Administrador' | 'Responsable' | 'Tecnico';
export type Estado = 'Activo' | 'Inactivo' | 'Pendiente';

export interface UsuarioPerfil {
  id: string;
  club_id: string | null;
  nombre: string;
  email: string;
  rol: Rol;
  estado: Estado;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: UsuarioPerfil | null;
  loading: boolean;
  perfilLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nombre: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshPerfil: () => Promise<void>;
  isAdmin: boolean;
  isResponsable: boolean;
  isTecnico: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [perfilLoading, setPerfilLoading] = useState(false);

  const cargarPerfil = useCallback(async (userId: string) => {
    setPerfilLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, club_id, nombre, email, rol, estado')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error cargando perfil de usuario:', error);
      setPerfil(null);
      setPerfilLoading(false);
      return;
    }
    setPerfil(data as UsuarioPerfil);
    setPerfilLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) cargarPerfil(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase dispara TOKEN_REFRESHED (y a veces SIGNED_IN) automáticamente
      // al recuperar el foco de la pestaña (autoRefreshToken). Si el usuario
      // no ha cambiado, evitamos recargar perfil/estado para no provocar una
      // "resincronización" visible al volver de otra pestaña.
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        return;
      }
      setSession(session);
      setUser(prevUser => {
        const nextUser = session?.user ?? null;
        if (prevUser?.id === nextUser?.id) return prevUser;
        if (nextUser) {
          cargarPerfil(nextUser.id);
        } else {
          setPerfil(null);
        }
        return nextUser;
      });
    });

    return () => listener.subscription.unsubscribe();
  }, [cargarPerfil]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } }, // usado por el trigger handle_new_user()
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshPerfil = async () => {
    if (user) await cargarPerfil(user.id);
  };

  const value: AuthContextType = {
    user,
    session,
    perfil,
    loading,
    perfilLoading,
    signIn,
    signUp,
    signOut,
    refreshPerfil,
    isAdmin: perfil?.rol === 'Administrador',
    isResponsable: perfil?.rol === 'Responsable',
    isTecnico: perfil?.rol === 'Tecnico',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
