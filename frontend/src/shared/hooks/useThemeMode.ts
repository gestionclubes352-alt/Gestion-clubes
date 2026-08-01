/**
 * @fileoverview Hook para manejar el modo oscuro/claro
 * @description Proporciona funcionalidad de tema con persistencia en localStorage
 */

import { useState, useEffect, useCallback } from 'react';

type ThemeMode = 'light' | 'dark';

interface UseThemeModeReturn {
  /** Modo actual del tema */
  mode: ThemeMode;
  /** Si el modo oscuro está activo */
  isDark: boolean;
  /** Cambiar al modo oscuro */
  setDark: () => void;
  /** Cambiar al modo claro */
  setLight: () => void;
  /** Alternar entre modos */
  toggle: () => void;
}

const STORAGE_KEY = 'ath-theme-mode';

/**
 * Hook para manejar el modo oscuro/claro de la aplicación
 * - Persiste la preferencia en localStorage
 * - Respeta la preferencia del sistema si no hay valor guardado
 * - Aplica la clase 'dark' al elemento HTML
 */
export const useThemeMode = (): UseThemeModeReturn => {
  // Inicializar con la preferencia guardada o del sistema
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Verificar si hay preferencia guardada
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    
    // Por defecto: tema oscuro
    return 'dark';
  });

  // Aplicar clase al HTML cuando cambie el modo
  useEffect(() => {
    const root = document.documentElement;
    
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Guardar preferencia
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Escuchar cambios en la preferencia del sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Solo cambiar si no hay preferencia guardada explícitamente
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setDark = useCallback(() => setMode('dark'), []);
  const setLight = useCallback(() => setMode('light'), []);
  const toggle = useCallback(() => setMode(prev => prev === 'dark' ? 'light' : 'dark'), []);

  return {
    mode,
    isDark: mode === 'dark',
    setDark,
    setLight,
    toggle,
  };
};

export default useThemeMode;
