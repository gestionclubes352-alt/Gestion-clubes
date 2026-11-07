import React, { useRef, useEffect, useState, useCallback } from 'react';

interface TableScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Clases extra para el contenedor de scroll inferior (el que envuelve la tabla), ej. overflow-y-auto */
  bodyClassName?: string;
  /** Estilo extra para el contenedor de scroll inferior, ej. { maxHeight } */
  bodyStyle?: React.CSSProperties;
}

/**
 * Envuelve una tabla con scroll horizontal, mostrando una barra de
 * desplazamiento tanto arriba como abajo (la de arriba se sincroniza
 * con el scroll real del contenido).
 */
export default function TableScrollContainer({ children, className = '', bodyClassName = '', bodyStyle }: TableScrollContainerProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const syncingRef = useRef<'top' | 'bottom' | null>(null);

  const syncWidth = useCallback(() => {
    if (bottomRef.current) {
      setScrollWidth(bottomRef.current.scrollWidth);
    }
  }, []);

  useEffect(() => {
    syncWidth();
    const el = bottomRef.current;
    if (!el) return;
    const observer = new ResizeObserver(syncWidth);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [syncWidth, children]);

  const handleTopScroll = () => {
    if (syncingRef.current === 'bottom') return;
    syncingRef.current = 'top';
    if (topRef.current && bottomRef.current) {
      bottomRef.current.scrollLeft = topRef.current.scrollLeft;
    }
    syncingRef.current = null;
  };

  const handleBottomScroll = () => {
    if (syncingRef.current === 'top') return;
    syncingRef.current = 'bottom';
    if (topRef.current && bottomRef.current) {
      topRef.current.scrollLeft = bottomRef.current.scrollLeft;
    }
    syncingRef.current = null;
  };

  return (
    <div className={className}>
      <div
        ref={topRef}
        onScroll={handleTopScroll}
        className="overflow-x-auto overflow-y-hidden"
        style={{ height: 14 }}
      >
        <div ref={spacerRef} style={{ width: scrollWidth, height: 1 }} />
      </div>
      <div
        ref={bottomRef}
        onScroll={handleBottomScroll}
        className={`overflow-x-auto -webkit-overflow-scrolling-touch ${bodyClassName}`}
        style={bodyStyle}
      >
        {children}
      </div>
    </div>
  );
}
