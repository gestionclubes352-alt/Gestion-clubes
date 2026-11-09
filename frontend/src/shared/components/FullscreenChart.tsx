import React, { useCallback, useEffect, useRef, useState } from 'react';

interface FullscreenChartProps {
  children: React.ReactNode;
  /** Clases del contenedor en modo normal (borde, padding, etc.). */
  className?: string;
  /** Tag HTML del contenedor. */
  as?: 'div' | 'section';
}

/**
 * Envuelve una gráfica y añade un botón de pantalla completa.
 * Usa la Fullscreen API cuando está disponible y, si no, un overlay a pantalla completa.
 * Esc cierra el modo ampliado.
 */
const FullscreenChart: React.FC<FullscreenChartProps> = ({ children, className = '', as = 'div' }) => {
  const ref = useRef<HTMLElement | null>(null);
  const [full, setFull] = useState(false);

  const close = useCallback(() => {
    setFull(false);
    if (document.fullscreenElement === ref.current) document.exitFullscreen?.().catch(() => undefined);
  }, []);

  const open = useCallback(() => {
    setFull(true);
    ref.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onFsChange = () => { if (!document.fullscreenElement) setFull(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [full, close]);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={full
        ? 'fixed inset-0 z-[9999] overflow-auto bg-white p-6 [&_ul]:!max-h-none'
        : `relative ${className}`}
    >
      <button
        type="button"
        onClick={full ? close : open}
        title={full ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
        aria-label={full ? 'Salir de pantalla completa' : 'Ver gráfica en pantalla completa'}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-[11px] text-slate-500 shadow-sm hover:text-slate-800"
      >
        <i className={`fa-solid ${full ? 'fa-compress' : 'fa-expand'}`}></i>
      </button>
      {children}
    </Tag>
  );
};

export default FullscreenChart;
