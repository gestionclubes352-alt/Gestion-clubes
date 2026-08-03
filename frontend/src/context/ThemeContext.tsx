/**
 * @fileoverview Theme context para sincronización global del tema oscuro/claro
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  isDark: boolean;
  mode: ThemeMode;
  toggle: () => void;
  setDark: () => void;
  setLight: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = 'ath-theme-mode';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Restaurar preferencia guardada o usar la del sistema
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
      // Detectar preferencia del sistema
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light'; // Por defecto: claro
  });

  const [isHydrated, setIsHydrated] = useState(false);

  // Aplicar tema al elemento raíz y guardar en localStorage
  useEffect(() => {
    const html = document.documentElement;

    if (mode === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    localStorage.setItem(THEME_STORAGE_KEY, mode);
    setIsHydrated(true);
  }, [mode]);

  const toggle = () => setMode(prev => prev === 'dark' ? 'light' : 'dark');
  const setDark = () => setMode('dark');
  const setLight = () => setMode('light');

  return (
    <ThemeContext.Provider value={{ isDark: mode === 'dark', mode, toggle, setDark, setLight }}>
      {isHydrated && children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
