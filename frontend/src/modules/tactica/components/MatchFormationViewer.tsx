import React, { useMemo } from 'react';
import { TacticalPosition, getInitialPositions } from '../types';
import SoccerField from './SoccerField';

interface PlayerInfo {
  id: string | number;
  name: string;
  dorsal?: number;
  yellowCards?: number;
  redCards?: number;
}

interface MatchFormationViewerProps {
  /** Formation name (e.g., '4-3-3', '4-4-2', etc.) */
  formation?: string;
  /** Array of player IDs/names currently in field positions */
  players?: PlayerInfo[];
  /** Substitute players */
  substitutes?: PlayerInfo[];
  /** Highlight a player that changed (entered or left) */
  highlightPlayerId?: string | number;
  /** Show player names below positions */
  showNames?: boolean;
  /** Card title */
  title?: string;
  /** Custom className for container */
  className?: string;
  /** Small mode (for cards/grid) */
  compact?: boolean;
  /** Full mode with sidebar lists */
  fullLayout?: boolean;
}

const MatchFormationViewer: React.FC<MatchFormationViewerProps> = ({
  formation = '4-3-3',
  players = [],
  substitutes = [],
  highlightPlayerId,
  showNames = true,
  title,
  className = '',
  compact = false,
  fullLayout = false,
}) => {
  const positions = useMemo(() => getInitialPositions(formation), [formation]);

  // Create a mapping of position ID to player
  const playersByPosition = useMemo(() => {
    const map = new Map<string, PlayerInfo>();
    positions.forEach((pos, idx) => {
      if (idx < players.length) {
        map.set(pos.id, players[idx]);
      }
    });
    return map;
  }, [positions, players]);

  // Render player in sidebar list
  const renderPlayerListItem = (player: PlayerInfo, isOnField: boolean = true) => (
    <div
      key={player.id}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
        player.id === highlightPlayerId
          ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400'
          : 'hover:bg-slate-100 dark:hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
          {player.dorsal || '—'}
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
          {player.name}
        </span>
      </div>
      <div className="flex gap-1 shrink-0">
        {player.yellowCards ? (
          <div className="w-4 h-6 bg-yellow-400 rounded-sm" title={`${player.yellowCards} tarjeta(s) amarilla(s)`} />
        ) : null}
        {player.redCards ? (
          <div className="w-4 h-6 bg-red-600 rounded-sm" title="Tarjeta roja" />
        ) : null}
      </div>
    </div>
  );

  if (compact) {
    // Compact view for grid cards
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {title && (
          <div className="text-center">
            <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{title}</p>
          </div>
        )}
        <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-[#1a1a1a]">
          <div
            className="relative w-full rounded-md overflow-hidden"
            style={{ aspectRatio: '1 / 1.05', background: '#2d7a34' }}
          >
            {/* Mini field SVG */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <g fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.3">
                <rect x="2.6" y="2.6" width="94.8" height="94.8" rx="1.6" />
                <line x1="2.6" y1="50" x2="97.4" y2="50" />
                <circle cx="50" cy="50" r="11.5" />
              </g>
            </svg>

            {/* Player circles - compact version */}
            {positions.map((pos) => {
              const player = playersByPosition.get(pos.id);
              const isHighlighted = player?.id === highlightPlayerId;

              return (
                <div
                  key={pos.id}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-md transition-all ${
                      isHighlighted
                        ? 'ring-2 ring-yellow-400 ring-offset-1 bg-yellow-500'
                        : player
                        ? 'bg-red-600 dark:bg-red-700'
                        : 'bg-slate-400/30 dark:bg-white/5 border border-slate-300/50 dark:border-white/10'
                    }`}
                  >
                    {player ? player.dorsal || '?' : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Player list below */}
          {showNames && (
            <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[8px] font-semibold text-slate-600 dark:text-slate-400">
              {positions.map((pos) => {
                const player = playersByPosition.get(pos.id);
                return (
                  <div key={pos.id} className="truncate">
                    {player ? player.name.split(' ')[0] : '—'}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (fullLayout) {
    // Full 3-column layout (Once Inicial - Campo - Suplentes)
    return (
      <div className={`flex gap-6 h-full ${className}`}>
        {/* Left panel - Titulares */}
        <div className="w-56 shrink-0 bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-white/10 p-4 overflow-y-auto">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-white/10">
            Once Inicial
          </h3>
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 rounded px-2 py-1.5 transition-all ${
                  player.id === highlightPlayerId
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <div className="h-7 w-7 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-xs shrink-0 border border-red-700">
                  {player.dorsal || '—'}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {player.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Campo */}
        <div className="flex-1 flex flex-col">
          <SoccerField className="min-h-[500px]">
            {/* SVG overlay for interactive elements */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              pointerEvents="none"
            >
              {/* Player positions */}
              {positions.map((pos) => {
                const player = playersByPosition.get(pos.id);
                const isHighlighted = player?.id === highlightPlayerId;

                return (
                  <g key={pos.id}>
                    {/* Larger player circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="5.5"
                      fill={
                        isHighlighted
                          ? '#ffffff' // white ring
                          : player
                          ? '#ffffff' // white
                          : '#d1d5db' // gray-300
                      }
                      opacity={isHighlighted ? 1 : player ? 1 : 0.2}
                      style={{ pointerEvents: 'none' }}
                      stroke={isHighlighted ? '#e5e7eb' : 'none'}
                      strokeWidth="1"
                    />

                    {/* Player number text */}
                    {player && (
                      <text
                        x={pos.x}
                        y={pos.y + 1.5}
                        textAnchor="middle"
                        fontSize="3.5"
                        fontWeight="bold"
                        fill="#1f2937"
                        style={{ pointerEvents: 'none' }}
                      >
                        {player.dorsal || '?'}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Player names and labels positioned absolutely */}
            {positions.map((pos) => {
              const player = playersByPosition.get(pos.id);

              return (
                <div
                  key={`label-${pos.id}`}
                  className="absolute"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y + 6.5}%`,
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <div className="whitespace-nowrap text-center">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {player ? player.name : pos.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </SoccerField>
        </div>

        {/* Right panel - Suplentes */}
        <div className="w-56 shrink-0 bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-white/10 p-4 overflow-y-auto">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-white/10">
            Suplentes
          </h3>
          <div className="space-y-2">
            {substitutes.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 rounded px-2 py-1.5 transition-all ${
                  player.id === highlightPlayerId
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <div className="h-7 w-7 rounded-full bg-slate-400 flex items-center justify-center font-bold text-white text-xs shrink-0 border border-slate-500">
                  {player.dorsal || '—'}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {player.name}
                </span>
              </div>
            ))}
            {substitutes.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                No hay suplentes
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full-size view (original)
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {title && (
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">{title}</h3>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formation}</span>
        </div>
      )}

      <SoccerField className="min-h-[400px]">
        {/* SVG overlay for interactive elements */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          pointerEvents="none"
        >
          {/* Player positions and connections */}
          {positions.map((pos) => {
            const player = playersByPosition.get(pos.id);
            const isHighlighted = player?.id === highlightPlayerId;

            return (
              <g key={pos.id}>
                {/* Player circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="4.5"
                  fill={
                    isHighlighted
                      ? '#fbbf24' // amber-400
                      : player
                      ? '#1f2937' // gray-800
                      : '#9ca3af' // gray-400
                  }
                  opacity={isHighlighted ? 1 : player ? 0.8 : 0.3}
                  style={{ pointerEvents: 'none' }}
                />

                {/* Player number text */}
                {player && (
                  <text
                    x={pos.x}
                    y={pos.y + 1.2}
                    textAnchor="middle"
                    fontSize="3"
                    fontWeight="bold"
                    fill="white"
                    style={{ pointerEvents: 'none' }}
                  >
                    {player.dorsal || '?'}
                  </text>
                )}

                {/* Position label (small) */}
                {!player && (
                  <text
                    x={pos.x}
                    y={pos.y + 1}
                    textAnchor="middle"
                    fontSize="2.5"
                    fill="#d1d5db"
                    opacity="0.5"
                    style={{ pointerEvents: 'none' }}
                  >
                    {pos.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Player names and info positioned absolutely */}
        {showNames &&
          positions.map((pos) => {
            const player = playersByPosition.get(pos.id);
            if (!player) return null;

            return (
              <div
                key={`name-${pos.id}`}
                className="absolute"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y + 5}%`,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                }}
              >
                <div className="whitespace-nowrap text-center">
                  <p className="text-[11px] font-black uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {player.name}
                  </p>
                </div>
              </div>
            );
          })}
      </SoccerField>

      {/* Formation stats */}
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#1a1a1a]">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Formación</p>
          <p className="font-bold text-slate-700 dark:text-white">{formation}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Jugadores</p>
          <p className="font-bold text-slate-700 dark:text-white">{players.length}/11</p>
        </div>
      </div>
    </div>
  );
};

export default MatchFormationViewer;
