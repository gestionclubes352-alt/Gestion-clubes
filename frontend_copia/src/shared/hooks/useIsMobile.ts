/**
 * @fileoverview Hook para detectar dispositivos móviles y breakpoints responsive.
 * Usa matchMedia para un rendimiento óptimo (sin listener de resize).
 */

import { useState, useEffect, useCallback } from 'react';

/** Breakpoints alineados con Tailwind CSS */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

interface UseIsMobileResult {
  /** true si la pantalla es < 768px (md) */
  isMobile: boolean;
  /** true si la pantalla es < 1024px (lg) — incluye tablets */
  isTablet: boolean;
  /** true si la pantalla es < 640px (sm) — móviles pequeños */
  isSmall: boolean;
  /** Ancho actual de la ventana */
  width: number;
}

/**
 * Hook que devuelve el estado responsive actual.
 * Usa `matchMedia` para máxima eficiencia.
 */
export function useIsMobile(): UseIsMobileResult {
  const getState = useCallback((): UseIsMobileResult => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    return {
      isMobile: w < BREAKPOINTS.md,
      isTablet: w < BREAKPOINTS.lg,
      isSmall: w < BREAKPOINTS.sm,
      width: w,
    };
  }, []);

  const [state, setState] = useState<UseIsMobileResult>(getState);

  useEffect(() => {
    // Crear media queries
    const mqMobile = window.matchMedia(`(max-width: ${BREAKPOINTS.md - 1}px)`);
    const mqTablet = window.matchMedia(`(max-width: ${BREAKPOINTS.lg - 1}px)`);
    const mqSmall = window.matchMedia(`(max-width: ${BREAKPOINTS.sm - 1}px)`);

    const handleChange = () => setState(getState());

    // Escuchar cambios en cada breakpoint
    mqMobile.addEventListener('change', handleChange);
    mqTablet.addEventListener('change', handleChange);
    mqSmall.addEventListener('change', handleChange);

    return () => {
      mqMobile.removeEventListener('change', handleChange);
      mqTablet.removeEventListener('change', handleChange);
      mqSmall.removeEventListener('change', handleChange);
    };
  }, [getState]);

  return state;
}
