import React, { useMemo } from 'react';
import type { VideoEvent } from '../types';
import type { Player } from '@modules/plantilla';
import { useTranslation } from 'react-i18next';

interface EventsTableViewProps {
  events: VideoEvent[];
  squad: Player[];
  onEdit?: (event: VideoEvent) => void;
  onDelete?: (eventId: string) => void;
}

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

const EventsTableView: React.FC<EventsTableViewProps> = ({ events, squad, onEdit, onDelete }) => {
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
      <table className="w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
              Min'
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
              Tipo
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
              Detalles
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedEvents.map((event, idx) => {
            const typeInfo = getEventTypeInfo(event.type);
            let details = '-';

            if (event.type === 'GOL') {
              details = `${event.goalSide === 'FAVOR' ? '✓ A favor' : '✗ En contra'} - ${getPlayerName(event.playerId, squad)}`;
            } else if (event.type === 'OCASION') {
              details = getPlayerName(event.playerId, squad);
            } else if (event.type === 'DUELO') {
              details = `${getPlayerName(event.playerId, squad)} - ${event.duelOutcome || '-'}`;
            } else if (event.type === 'NOTA') {
              details = event.note || '-';
            }

            return (
              <tr
                key={event.id}
                className={`${
                  idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-900/50'
                } hover:bg-slate-100 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 transition-colors`}
              >
                <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{event.minute}'</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${typeInfo.color} ${typeInfo.bgColor}`}
                  >
                    <i className={`${typeInfo.icon} mr-2`}></i>
                    {typeInfo.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                  <p className="text-sm max-w-md line-clamp-2">{details}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(event)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Editar"
                      >
                        <i className="fa fa-edit" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(event.id)}
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
