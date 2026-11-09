import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '../types';
import { getTileLines, type TileConfig, type TileFieldKey } from '../utils/tileConfig';
import { ENCUADRE_DEFAULT, encuadreStyle, getFotoEncuadre } from '../utils/fotoEncuadre';

interface PlayerTileProps {
  player: Player;
  config: TileConfig;
  onClick?: () => void;
  /** Foto alternativa (p. ej. la previsualización aún sin guardar de la ficha) */
  photoOverride?: string | null;
  /** En la vista previa no se aplica el zoom al pasar el ratón */
  preview?: boolean;
}

const isImageUrl = (value?: string | null): value is string =>
  typeof value === 'string' && /^(https?:\/\/|data:image\/|\/)/i.test(value);

const DEFAULT_PLAYER_PHOTO = '/jugador-default.png';

const getInitials = (name: string) => {
  const parts = (name || '').split(' ').filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

// Estilo por línea: la primera línea visible es el título, el resto texto secundario
const LINE_CLASS: Partial<Record<TileFieldKey, string>> = {
  nombre: 'text-[10px] font-bold text-white uppercase leading-tight truncate',
  apodo: 'text-[10px] font-bold text-white uppercase leading-tight truncate',
};
const DEFAULT_LINE_CLASS = 'text-[8px] text-slate-300 uppercase leading-tight truncate';

/**
 * Detecta qué fracción superior de la foto es fondo vacío (color de las esquinas).
 * Devuelve null si no se puede analizar (p. ej. CORS).
 */
const analyzeTopEmpty = (src: string): Promise<number | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const W = 48;
        const H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W));
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;
        const px = (x: number, y: number) => {
          const i = (y * W + x) * 4;
          return [data[i], data[i + 1], data[i + 2]];
        };
        const c1 = px(0, 0);
        const c2 = px(W - 1, 0);
        const bg = c1.map((v, k) => Math.round((v + c2[k]) / 2));
        if (c1.some((v, k) => Math.abs(v - c2[k]) > 40)) return resolve(0); // fondo no uniforme
        for (let y = 0; y < H; y++) {
          let diff = 0;
          for (let x = 0; x < W; x++) {
            const p = px(x, y);
            if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60) diff++;
          }
          if (diff / W > 0.1) return resolve(y / H);
        }
        resolve(0);
      } catch {
        resolve(null);
      }
    };
    img.src = src;
  });

const PlayerTile: React.FC<PlayerTileProps> = ({ player, config, onClick, photoOverride, preview = false }) => {
  const { i18n } = useTranslation();
  const [photoFailed, setPhotoFailed] = useState(false);
  const [topEmpty, setTopEmpty] = useState(0);
  const rawPhoto = photoOverride !== undefined ? photoOverride : player.fotoUrl;
  // Sin foto (o si no carga) se muestra la imagen por defecto
  const photo = isImageUrl(rawPhoto) && !photoFailed ? rawPhoto : DEFAULT_PLAYER_PHOTO;
  const isDefaultPhoto = photo === DEFAULT_PLAYER_PHOTO;
  const encuadre = getFotoEncuadre(player);
  const sinPersonalizar =
    encuadre.zoom === ENCUADRE_DEFAULT.zoom && encuadre.posX === ENCUADRE_DEFAULT.posX && encuadre.posY === ENCUADRE_DEFAULT.posY;

  // Fotos con mucho fondo vacío arriba (cabeza abajo): ampliar desde la base para subir la cara
  useEffect(() => {
    setTopEmpty(0);
    if (isDefaultPhoto || !sinPersonalizar) return;
    let cancelled = false;
    analyzeTopEmpty(photo).then((t) => {
      if (!cancelled && t) setTopEmpty(t);
    });
    return () => {
      cancelled = true;
    };
  }, [photo, isDefaultPhoto, sinPersonalizar]);

  const autoStyle: React.CSSProperties | undefined =
    topEmpty > 0.1
      ? { transform: `scale(${Math.min(2.6, 1 / (1 - topEmpty + 0.06))})`, transformOrigin: '50% 100%', objectPosition: '50% 100%' }
      : undefined;
  const hasPhoto = true;
  const hasTransparentPhoto = /^data:image\/png|\.png(\?|$)/i.test(photo || '');
  const estadoColor = player.estado === 'LESIONADO' ? 'bg-red-500' : player.estado === 'OTRO' ? 'bg-amber-500' : 'bg-emerald-500';

  const formatDate = (d?: string) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString(i18n.language);
  };

  const lines = getTileLines(player, config, formatDate);
  const showDorsal = config.dorsal && player.dorsal !== undefined && player.dorsal !== null;

  return (
    <div
      className={`group relative bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg overflow-hidden shadow-sm transition-all duration-300 aspect-[4/5] flex flex-col ${
        preview ? '' : 'cursor-pointer hover:shadow-lg hover:border-[var(--surface-3)] hover:scale-[1.05]'
      }`}
      onClick={onClick}
    >
      {hasPhoto ? (
        <div className={`flex-1 overflow-hidden ${hasTransparentPhoto ? 'bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-2)]' : ''}`}>
          <img
            loading="lazy"
            decoding="async"
            src={photo}
            alt={player.nombre}
            onError={() => setPhotoFailed(true)}
            style={isDefaultPhoto ? undefined : autoStyle || encuadreStyle(encuadre)}
            className={`w-full h-full transition-transform duration-500 ${isDefaultPhoto ? 'object-contain p-5 pb-8' : 'object-cover'} ${preview ? '' : 'group-hover:scale-110'}`}
          />
        </div>
      ) : (
        <div className="flex-1 bg-[var(--surface-1)] flex items-center justify-center">
          <span className="text-3xl font-black text-[var(--surface-3)] select-none">{getInitials(player.nombre)}</span>
        </div>
      )}

      {(showDorsal || config.estado) && (
        <div className="absolute top-1.5 right-1.5 flex flex-col items-center gap-1">
          {showDorsal && (
            <div className="bg-slate-900 text-white w-6 h-6 rounded-md flex items-center justify-center font-black text-[11px] shadow-lg tabular-nums leading-none">
              {player.dorsal}
            </div>
          )}
          {config.estado && <div className={`w-1.5 h-1.5 rounded-full ${estadoColor} ring-2 ring-white/80`}></div>}
        </div>
      )}

      {lines.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent p-1.5">
          {lines.map((line) => (
            <p key={line.key} className={LINE_CLASS[line.key] || DEFAULT_LINE_CLASS}>{line.text}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerTile;
