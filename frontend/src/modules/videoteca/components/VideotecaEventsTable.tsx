import React, { useMemo } from 'react';
import type { MatchReport, VideoEvent, Match } from '@modules/partidos';
import type { Jugador } from '@shared/services/dataService';
import { useTranslation } from 'react-i18next';

interface VideotecaEventsTableProps {
  matches: Partial<Match>[];
  matchReportsById: Map<string, MatchReport>;
  playersById: Map<string | number, Jugador>;
  onVideoClick?: (vimeoUrl: string, startSeconds?: number) => void;
  eventoTipoFilter?: string;
  ladoFilter?: string;
  playerFilter?: string;
}

interface EventWithContext extends VideoEvent {
  matchTitle: string;
  matchDate: string;
  matchId: string;
  localTeam?: string;
  visitorTeam?: string;
}

const getPlayerName = (playerId: string | number | undefined, playersById: Map<string | number, Jugador>): string => {
  if (!playerId) return '-';
  const player = playersById.get(playerId);
  return player?.nombre || `#${playerId}`;
};

const getEventTypeLabel = (type: VideoEvent['type']): { label: string; color: string; bgColor: string } => {
  switch (type) {
    case 'GOL':
      return { label: 'Gol', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30' };
    case 'OCASION':
      return { label: 'Ocasión', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30' };
    case 'DUELO':
      return { label: 'Duelo', color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30' };
    case 'NOTA':
      return { label: 'Nota', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
    default:
      return { label: type, color: 'text-slate-700', bgColor: 'bg-slate-100 dark:bg-slate-900/30' };
  }
};

const VideotecaEventsTable: React.FC<VideotecaEventsTableProps> = ({
  matches,
  matchReportsById,
  playersById,
  onVideoClick,
  eventoTipoFilter = 'ALL',
  ladoFilter = 'ALL',
  playerFilter = 'ALL',
}) => {
  const { t } = useTranslation();

  const getMatchReport = (matchId: string) => matchReportsById.get(String(matchId));

  const allEvents = useMemo(() => {
    const events: EventWithContext[] = [];

    matches.forEach((match) => {
      const report = matchReportsById.get(String(match.id));
      if (!report?.videoEvents && !report?.matchGoals) return;

      // Agregar goles del matchGoals
      (report.matchGoals || []).forEach((goal) => {
        const event: EventWithContext = {
          id: `goal-${goal.id}`,
          minute: String(goal.minute),
          type: 'GOL',
          note: '',
          goalSide: goal.side,
          playerId: goal.playerId,
          videoTimestamp: goal.videoTimestamp,
          matchTitle: match.opponent || 'Partido',
          matchDate: match.date || '',
          matchId: String(match.id),
          localTeam: match.localTeam,
          visitorTeam: match.visitorTeam,
        };
        events.push(event);
      });

      // Agregar eventos de video
      (report.videoEvents || []).forEach((event) => {
        const eventWithContext: EventWithContext = {
          ...event,
          matchTitle: match.opponent || 'Partido',
          matchDate: match.date || '',
          matchId: String(match.id),
          localTeam: match.localTeam,
          visitorTeam: match.visitorTeam,
        };
        events.push(eventWithContext);
      });
    });

    // Aplicar filtros
    const filtered = events.filter((event) => {
      if (eventoTipoFilter !== 'ALL' && event.type !== eventoTipoFilter) return false;
      if (ladoFilter !== 'ALL' && event.type === 'GOL' && event.goalSide !== ladoFilter) return false;
      if (playerFilter !== 'ALL' && String(event.playerId) !== playerFilter) return false;
      return true;
    });

    // Ordenar por minuto
    return filtered.sort((a, b) => {
      const minA = parseInt(a.minute) || 0;
      const minB = parseInt(b.minute) || 0;
      return minA - minB;
    });
  }, [matches, matchReportsById, eventoTipoFilter, ladoFilter, playerFilter]);

  if (allEvents.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <i className="fa fa-inbox text-4xl mb-4 block opacity-50"></i>
        <p>No hay eventos en los partidos filtrados</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
              Partido
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
              Min'
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
              Tipo
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
              Detalles
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
              Ver
            </th>
          </tr>
        </thead>
        <tbody>
          {allEvents.map((event, idx) => {
            const typeInfo = getEventTypeLabel(event.type);
            const report = getMatchReport(event.matchId);

            // Renderizar detalles según el tipo
            let details = '-';
            if (event.type === 'GOL') {
              details = `${event.goalSide === 'FAVOR' ? '✓ A favor' : '✗ En contra'} - ${getPlayerName(event.playerId, playersById)}`;
            } else if (event.type === 'OCASION') {
              details = getPlayerName(event.playerId, playersById);
            } else if (event.type === 'DUELO') {
              details = `${getPlayerName(event.playerId, playersById)} - ${event.duelOutcome || '-'}`;
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
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {event.localTeam || 'Local'} vs {event.visitorTeam || 'Visitante'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(event.matchDate).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{event.minute}'</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${typeInfo.color} ${typeInfo.bgColor}`}
                  >
                    {event.type === 'GOL' && <i className="fa-solid fa-futbol mr-2"></i>}
                    {event.type === 'OCASION' && <i className="fa-solid fa-bullseye mr-2"></i>}
                    {event.type === 'DUELO' && <i className="fa-solid fa-people-arrows mr-2"></i>}
                    {event.type === 'NOTA' && <i className="fa-solid fa-note-sticky mr-2"></i>}
                    {typeInfo.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                  <p className="text-sm max-w-md line-clamp-2">{details}</p>
                </td>
                <td className="px-4 py-3">
                  {report?.videoUrl ? (
                    <button
                      onClick={() => onVideoClick?.(report.videoUrl, event.videoTimestamp)}
                      className="w-8 h-8 rounded-full bg-sport-primary/20 text-sport-primary hover:bg-sport-primary hover:text-white transition-all flex items-center justify-center"
                      title="Ver evento en el vídeo"
                    >
                      <i className="fa-solid fa-play text-[11px]"></i>
                    </button>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VideotecaEventsTable;
