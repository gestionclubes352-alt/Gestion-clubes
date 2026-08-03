/**
 * @fileoverview Hook para manejar el modo oscuro/claro (DEPRECATED)
 * @description Usa useTheme del ThemeContext en su lugar
 * @deprecated Usar useTheme desde '@context/ThemeContext'
 */

import { useTheme } from '@context/ThemeContext';

export const useThemeMode = () => {
  const { isDark, mode, toggle, setDark, setLight } = useTheme();
  return {
    mode,
    isDark,
    setDark,
    setLight,
    toggle,
  };
};

export default useThemeMode;
