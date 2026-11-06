import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '../types';
import { getTileLines, type TileConfig, type TileFieldKey } from '../utils/tileConfig';

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

const PlayerTile: React.FC<PlayerTileProps> = ({ player, config, onClick, photoOverride, preview = false }) => {
  const { i18n } = useTranslation();
  const photo = photoOverride !== undefined ? photoOverride : player.fotoUrl;
  const hasPhoto = isImageUrl(photo);
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
            className={`w-full h-full transition-transform duration-500 ${preview ? '' : 'group-hover:scale-110'} ${hasTransparentPhoto ? 'object-contain object-bottom' : 'object-cover object-[50%_20%]'}`}
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
