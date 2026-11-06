import { useCallback, useEffect, useState } from 'react';
import type { Player } from '../types';

/** Campos que se pueden mostrar en la tarjeta (tile) del jugador. */
export type TileFieldKey =
  | 'apodo'
  | 'nombre'
  | 'posicion'
  | 'posicionConcreta'
  | 'fechaNacimiento'
  | 'edad'
  | 'equipo'
  | 'club'
  | 'etapa'
  | 'perfil'
  | 'dorsal'
  | 'estado';

export type TileConfig = Record<TileFieldKey, boolean>;

export interface TileFieldDef {
  key: TileFieldKey;
  label: string;
  /** Campos que se dibujan como insignia sobre la foto (no como línea de texto) */
  badge?: boolean;
}

export const TILE_FIELDS: TileFieldDef[] = [
  { key: 'dorsal', label: 'Dorsal', badge: true },
  { key: 'estado', label: 'Estado (punto de color)', badge: true },
  { key: 'nombre', label: 'Nombre' },
  { key: 'apodo', label: 'Apodo' },
  { key: 'posicion', label: 'Posición' },
  { key: 'posicionConcreta', label: 'Posición concreta' },
  { key: 'perfil', label: 'Lateralidad' },
  { key: 'fechaNacimiento', label: 'Fecha de nacimiento' },
  { key: 'edad', label: 'Edad' },
  { key: 'etapa', label: 'Etapa' },
  { key: 'equipo', label: 'Equipo' },
  { key: 'club', label: 'Club' },
];

/** Valores por defecto: equivalen a lo que mostraba la tarjeta antes de poder configurarla. */
export const DEFAULT_TILE_CONFIG: TileConfig = {
  apodo: false,
  nombre: true,
  posicion: false,
  posicionConcreta: true,
  fechaNacimiento: true,
  edad: false,
  equipo: false,
  club: false,
  etapa: false,
  perfil: false,
  dorsal: true,
  estado: true,
};

const STORAGE_KEY = 'plantilla.tileConfig.v1';
const CHANGE_EVENT = 'plantilla:tileConfigChanged';

export const loadTileConfig = (): TileConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TILE_CONFIG };
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const next = { ...DEFAULT_TILE_CONFIG };
    (Object.keys(DEFAULT_TILE_CONFIG) as TileFieldKey[]).forEach((k) => {
      // Solo se aceptan booleanos: cualquier otro valor del almacenamiento se ignora
      if (typeof parsed[k] === 'boolean') next[k] = parsed[k] as boolean;
    });
    return next;
  } catch {
    return { ...DEFAULT_TILE_CONFIG };
  }
};

export const saveTileConfig = (config: TileConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // almacenamiento no disponible (modo privado, etc.): la configuración solo vive en memoria
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

/** Hook: configuración del tile, sincronizada entre la ficha y la tabla de jugadores. */
export const useTileConfig = (): [TileConfig, (next: TileConfig) => void] => {
  const [config, setConfig] = useState<TileConfig>(loadTileConfig);

  useEffect(() => {
    const sync = () => setConfig(loadTileConfig());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = useCallback((next: TileConfig) => {
    setConfig(next);
    saveTileConfig(next);
  }, []);

  return [config, update];
};

export const calculatePlayerAge = (fecha?: string): number | undefined => {
  if (!fecha) return undefined;
  const birth = new Date(fecha);
  if (isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const PERFIL_LABEL: Record<string, string> = { D: 'Diestro', I: 'Zurdo', A: 'Ambas' };

/** Líneas de texto de la tarjeta según la configuración elegida (en orden y sin vacías). */
export const getTileLines = (
  player: Player,
  config: TileConfig,
  formatDate: (d?: string) => string | null,
): { key: TileFieldKey; text: string }[] => {
  const lines: { key: TileFieldKey; text: string | null | undefined }[] = [
    { key: 'nombre', text: player.nombre },
    { key: 'apodo', text: player.apodo },
    { key: 'posicion', text: player.posicion },
    { key: 'posicionConcreta', text: player.otraDemarcacion || player.posicionJuego },
    { key: 'perfil', text: player.perfil ? PERFIL_LABEL[player.perfil] : undefined },
    { key: 'fechaNacimiento', text: formatDate(player.fechaNacimiento) },
    { key: 'edad', text: calculatePlayerAge(player.fechaNacimiento)?.toString().concat(' años') },
    { key: 'etapa', text: player.etapa },
    { key: 'equipo', text: player.equipo },
    { key: 'club', text: player.club },
  ];
  return lines
    .filter((l) => config[l.key] && l.text && String(l.text).trim() !== '')
    .map((l) => ({ key: l.key, text: String(l.text) }));
};
