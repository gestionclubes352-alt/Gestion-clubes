import { useEffect, useState } from 'react';

const STORAGE_KEY = 'residencia_estado_colores';

const DEFAULTS = {
  nivel2: '#f97316',
  nivel3: '#ef4444',
};

type ColoresEstado = typeof DEFAULTS;

const listeners = new Set<(colores: ColoresEstado) => void>();

const readColores = (): ColoresEstado => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
};

export const setColorEstado = (nivel: 'nivel2' | 'nivel3', color: string) => {
  const actuales = readColores();
  const nuevos = { ...actuales, [nivel]: color };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos));
  listeners.forEach(fn => fn(nuevos));
};

export const useColoresEstado = (): ColoresEstado => {
  const [colores, setColores] = useState<ColoresEstado>(readColores);

  useEffect(() => {
    listeners.add(setColores);
    return () => {
      listeners.delete(setColores);
    };
  }, []);

  return colores;
};
