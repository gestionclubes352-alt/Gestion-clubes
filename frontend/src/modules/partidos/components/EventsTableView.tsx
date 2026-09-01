import React, { useMemo } from 'react';
import type { VideoEvent } from '../types';
import type { Player } from '@modules/plantilla';
import { useTranslation } from 'react-i18next';

interface EventsTableViewProps {
  events: VideoEvent[];
  squad: Player[];
  teamName?: string;
  onPlay?: (event: VideoEvent) => void;
  onEdit?: (event: VideoEvent) => void;
  onDelete?: (eventId: string) => void;
}

const MCB_CONCEPTO_LABELS: Record<string, string> = {
  JUEGO_DIRECTO: 'Juego directo',
  VERTICALES: 'Verticales',
  MICRO: 'Micro',
  PROGRESION_JUEGO: 'Progresión en el juego',
  JUEGO_INTERIOR: 'Juego interior',
  JUEGO_POR_FUERA: 'Juego por fuera',
};

const getPlayerName = (playerId: string | number | undefined, squad: Player[]): string => {
  if (!playerId) return '-';
  const player = squad.find(p => String(p.id) === String(playerId) || p.nombre === playerId);
  return player?.nombre || String(playerId);
};

const getEventTypeInfo = (type: VideoEvent['type']): { label: string; icon: string; color: string; bgColor: string } => {
  switch (type) {
    case 'GOL':
      return {
        label: 'Gol',
        icon: 'fa-solid fa-futbol',
        color: 'text-green-700',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
      };
    case 'OCASION':
      return {
        label: 'Ocasión',
        icon: 'fa-solid fa-bullseye',
        color: 'text-red-700',
        bgColor: 'bg-red-100 dark:bg-red-900/30'
      };
    case 'DUELO':
      return {
        label: 'Duelo',
        icon: 'fa-solid fa-people-arrows',
        color: 'text-amber-700',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30'
      };
    case 'NOTA':
      return {
        label: 'Nota',
        icon: 'fa-solid fa-note-sticky',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30'
      };
    default:
      return {
        label: type,
        icon: 'fa-solid fa-circle',
        color: 'text-slate-700',
        bgColor: 'bg-slate-100 dark:bg-slate-900/30'
      };
  }
};

const EventsTableView: React.FC<EventsTableViewProps> = ({ events, squad, teamName, onPlay, onEdit, onDelete }) => {
  const { t } = useTranslation();

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const minA = parseInt(a.minute) || 0;
      const minB = parseInt(b.minute) || 0;
      return minA - minB;
    });
  }, [events]);

  if (sortedEvents.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <i className="fa fa-inbox text-4xl mb-4 block opacity-50"></i>
        <p>{t('matchReport.events.noEvents') || 'No hay eventos'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
      <table className="w-full text-xs">
        <thead className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
              Min'
            </th>
            {teamName && (
              <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
                Equipo interno
              </th>
            )}
            <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
              Goles A Favor
            </th>
            <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
              Goles En Contra
            </th>
            <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
              Ocasiones
            </th>
            <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
              Duelos Ganados
            </th>
            <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
              Duelos Perdidos
            </th>
            <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
              Notas
            </th>
            <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
              MCB
            </th>
            <th className="px-2 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">
              MSB
            </th>
            <th className="px-2 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedEvents.map((event, idx) => {
            const isGoalFavor = event.type === 'GOL' && event.goalSide === 'FAVOR';
            const isGoalAgainst = event.type === 'GOL' && event.goalSide === 'CONTRA';
            const isOccasion = event.type === 'OCASION';
            const isDuelWon = event.type === 'DUELO' && event.duelOutcome === 'GANADO';
            const isDuelLost = event.type === 'DUELO' && event.duelOutcome === 'PERDIDO';
            const isNote = event.type === 'NOTA';
            const isMcb = event.type === 'MCB';
            const isMsb = event.type === 'MSB';
            const momentPlayers = [event.playerId, ...(event.playerIds || [])]
              .filter((id, i, arr) => id !== undefined && arr.findIndex(x => String(x) === String(id)) === i)
              .map(id => getPlayerName(id, squad))
              .join(', ');
            const momentDetail = [
              event.concepto ? MCB_CONCEPTO_LABELS[event.concepto] || event.concepto : null,
              event.goalSide === 'FAVOR' ? 'A favor' : event.goalSide === 'CONTRA' ? 'En contra' : null,
              event.zone ? `Zona ${event.zone}` : null,
              momentPlayers || null,
            ].filter(Boolean).join(' · ');

            return (
              <tr
                key={event.id}
                onClick={() => onPlay?.(event)}
                className={`${
                  idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-900/50'
                } hover:bg-slate-100 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 transition-colors ${onPlay ? 'cursor-pointer' : ''}`}
              >
                <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{event.minute}'</span>
                </td>
                {teamName && (
                  <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                    <span className="text-xs text-slate-600 dark:text-slate-400">{teamName}</span>
                  </td>
                )}
                <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                  {isGoalFavor ? (
                    <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs font-semibold">
                      <i className="fa-solid fa-futbol"></i>
                      {getPlayerName(event.playerId, squad)}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                  {isGoalAgainst ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded text-xs font-semibold">
                      <i className="fa-solid fa-futbol"></i>
                      {getPlayerName(event.playerId, squad)}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                  {isOccasion ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-xs font-semibold">
                      <i className="fa-solid fa-bullseye"></i>
                      {getPlayerName(event.playerId, squad)}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                  {isDuelWon ? (
                    <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded text-xs font-semibold">
                      <i className="fa-solid fa-check-circle"></i>
                      {getPlayerName(event.playerId, squad)}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                  {isDuelLost ? (
                    <span className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded text-xs font-semibold">
                      <i className="fa-solid fa-times-circle"></i>
                      {getPlayerName(event.playerId, squad)}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                  {isNote ? (
                    <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded text-xs font-semibold max-w-xs">
                      <i className="fa-solid fa-note-sticky flex-shrink-0"></i>
                      <span className="truncate">{event.note || '-'}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                  {isMcb ? (
                    <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded text-xs font-semibold max-w-xs">
                      <i className="fa-solid fa-futbol flex-shrink-0"></i>
                      <span className="truncate">{momentDetail || '-'}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                  {isMsb ? (
                    <span className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded text-xs font-semibold max-w-xs">
                      <i className="fa-solid fa-shield flex-shrink-0"></i>
                      <span className="truncate">{momentDetail || '-'}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex gap-2 justify-end">
                    {onPlay && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onPlay(event); }}
                        className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                        title="Ver vídeo"
                      >
                        <i className="fa fa-play" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Editar"
                      >
                        <i className="fa fa-edit" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Eliminar"
                      >
                        <i className="fa fa-trash" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EventsTableView;
