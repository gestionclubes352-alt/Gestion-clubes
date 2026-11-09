import type React from 'react';

/** Encuadre de la foto de un jugador: zoom (1–3) y posición del centro en % (0–100). */
export interface FotoEncuadre {
  zoom: number;
  posX: number;
  posY: number;
}

/** Encuadre por defecto: sin zoom y con la cabeza arriba (equivale al recorte anterior). */
export const ENCUADRE_DEFAULT: FotoEncuadre = { zoom: 1, posX: 50, posY: 20 };

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Lee el encuadre de un jugador, usando los valores por defecto si faltan o no son válidos. */
export const getFotoEncuadre = (p?: { fotoZoom?: number | null; fotoPosX?: number | null; fotoPosY?: number | null } | null): FotoEncuadre => {
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    zoom: clamp(num(p?.fotoZoom, ENCUADRE_DEFAULT.zoom), ZOOM_MIN, ZOOM_MAX),
    posX: clamp(num(p?.fotoPosX, ENCUADRE_DEFAULT.posX), 0, 100),
    posY: clamp(num(p?.fotoPosY, ENCUADRE_DEFAULT.posY), 0, 100),
  };
};

/** Estilo de la imagen: la foto se recorta en la posición elegida y se amplía desde ese mismo punto. */
export const encuadreStyle = (e: FotoEncuadre): React.CSSProperties => {
  // Encuadre sin personalizar: acercar para mostrar más la cara y menos fondo superior
  const sinPersonalizar =
    e.zoom === ENCUADRE_DEFAULT.zoom && e.posX === ENCUADRE_DEFAULT.posX && e.posY === ENCUADRE_DEFAULT.posY;
  const z = sinPersonalizar ? 1.5 : e.zoom;
  const oy = sinPersonalizar ? 45 : e.posY;
  return {
    objectPosition: `${e.posX}% ${e.posY}%`,
    transform: `scale(${z})`,
    transformOrigin: `${e.posX}% ${oy}%`,
  };
};
