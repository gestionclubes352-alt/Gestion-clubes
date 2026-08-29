import React, { useMemo, useState, useEffect } from 'react';
import type { MatchReport, VideoEvent, Match } from '@modules/partidos';
import { containsTeamWords } from '@modules/partidos/utils/teamResolution';
import type { Jugador } from '@shared/services/dataService';
import { useTranslation } from 'react-i18next';

interface VideotecaEventsTableProps {
  matches: Partial<Match>[];
  matchReportsById: Map<string, MatchReport>;
  playersById: Map<string | number, Jugador>;
  onVideoClick?: (vimeoUrl: string, startSeconds?: number) => void;
  eventoTipoFilter?: string[];
  ladoFilter?: string[];
  playerFilter?: string[];
  dateFromFilter?: string;
  dateToFilter?: string;
  monthFilter?: string[];
}

interface EventWithContext extends VideoEvent {
  matchTitle: string;
  matchDate: string;
  matchId: string;
  localTeam?: string;
  visitorTeam?: string;
  nombreInterno?: string;
  competition?: string;
  jornada?: string;
}

const getPlayerName = (playerId: string | number | undefined, playersById: Map<string | number, Jugador>): string => {
  if (!playerId) return '-';
  const player = playersById.get(playerId);
  return player?.nombre || 'Jugador eliminado';
};

const getMatchScoreLabel = (event: EventWithContext, report?: MatchReport): string => {
  const goals = report?.matchGoals || [];
  if (goals.length === 0) return '-';
  const goalsFavor = goals.filter((g) => g.side === 'FAVOR').length;
  const goalsContra = goals.filter((g) => g.side === 'CONTRA').length;
  const isLocal =
    containsTeamWords(event.localTeam, event.nombreInterno) ||
    containsTeamWords(event.nombreInterno, event.localTeam);
  const golesLocal = isLocal ? goalsFavor : goalsContra;
  const golesVisitante = isLocal ? goalsContra : goalsFavor;
  return `${golesLocal} - ${golesVisitante}`;
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
    case 'MCB':
      return { label: 'MCB', color: 'text-sky-700', bgColor: 'bg-sky-100 dark:bg-sky-900/30' };
    case 'MSB':
      return { label: 'MSB', color: 'text-violet-700', bgColor: 'bg-violet-100 dark:bg-violet-900/30' };
    default:
      return { label: type, color: 'text-slate-700', bgColor: 'bg-slate-100 dark:bg-slate-900/30' };
  }
};

const EVENTS_PER_PAGE = 50;

const VideotecaEventsTable: React.FC<VideotecaEventsTableProps> = ({
  matches,
  matchReportsById,
  playersById,
  onVideoClick,
  eventoTipoFilter = [],
  ladoFilter = [],
  playerFilter = [],
  dateFromFilter = '',
  dateToFilter = '',
  monthFilter = [],
}) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

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
          nombreInterno: match.nombreInterno,
          competition: match.competition,
          jornada: match.jornada,
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
          nombreInterno: match.nombreInterno,
          competition: match.competition,
          jornada: match.jornada,
        };
        events.push(eventWithContext);
      });
    });

    // Aplicar filtros
    const filtered = events.filter((event) => {
      if (eventoTipoFilter.length > 0 && !eventoTipoFilter.includes(event.type)) return false;
      if (
        ladoFilter.length > 0 &&
        (event.type === 'GOL' || event.type === 'OCASION' || event.type === 'MCB' || event.type === 'MSB') &&
        (!event.goalSide || !ladoFilter.includes(event.goalSide))
      ) return false;
      if (playerFilter.length > 0 && !playerFilter.includes(String(event.playerId))) return false;

      // Filtro de fechas
      if (event.matchDate) {
        const eventDate = new Date(event.matchDate);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          if (eventDate < fromDate) return false;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          toDate.setHours(23, 59, 59, 999);
          if (eventDate > toDate) return false;
        }
        if (monthFilter.length > 0) {
          const eventMonth = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
          if (!monthFilter.includes(eventMonth)) return false;
        }
      }

      return true;
    });

    // Ordenar por fecha (más reciente primero) y luego por minuto
    return filtered.sort((a, b) => {
      const dateA = a.matchDate ? new Date(a.matchDate).getTime() : 0;
      const dateB = b.matchDate ? new Date(b.matchDate).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      const minA = parseInt(a.minute) || 0;
      const minB = parseInt(b.minute) || 0;
      return minA - minB;
    });
  }, [matches, matchReportsById, eventoTipoFilter, ladoFilter, playerFilter, dateFromFilter, dateToFilter, monthFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [matches, matchReportsById, eventoTipoFilter, ladoFilter, playerFilter, dateFromFilter, dateToFilter, monthFilter]);

  const paginatedEvents = useMemo(() => {
    const startIdx = (currentPage - 1) * EVENTS_PER_PAGE;
    return allEvents.slice(startIdx, startIdx + EVENTS_PER_PAGE);
  }, [allEvents, currentPage]);

  const totalPages = Math.ceil(allEvents.length / EVENTS_PER_PAGE);

  if (allEvents.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <i className="fa fa-inbox text-4xl mb-4 block opacity-50"></i>
        <p>No hay eventos en los partidos filtrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="w-full text-[9px]">
          <thead className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Fecha
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Equipo interno
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Competición
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Jornada
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Partido
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Resultado
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Min'
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Tipo
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Equipo
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Balance
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Jugadores
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Notas
              </th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-left text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Ver
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedEvents.map((event) => {
              const typeInfo = getEventTypeLabel(event.type);
              const report = getMatchReport(event.matchId);

              // Renderizar jugador y nota por separado según el tipo
              const jugadorDetalle =
                event.type === 'GOL' || event.type === 'OCASION' || event.type === 'DUELO' || event.type === 'MCB' || event.type === 'MSB'
                  ? getPlayerName(event.playerId, playersById)
                  : '-';
              const notaDetalle = event.type === 'NOTA' ? (event.note || '-') : '-';

              const showLado = event.type === 'GOL' || event.type === 'OCASION' || event.type === 'MCB' || event.type === 'MSB';
              const ladoFavor = event.goalSide === 'FAVOR';

              return (
                <tr
                  key={event.id}
                  className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {event.matchDate ? new Date(event.matchDate).toLocaleDateString('es-ES') : '-'}
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-slate-600 dark:text-slate-400">
                    {event.nombreInterno || '-'}
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-slate-600 dark:text-slate-400">
                    {event.competition || '-'}
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-slate-600 dark:text-slate-400">
                    {event.jornada || '-'}
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-slate-800 dark:text-slate-200">
                    <span className="font-semibold">
                      {event.localTeam || 'Local'} vs {event.visitorTeam || 'Visitante'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-slate-800 dark:text-slate-200">
                    <span className="font-semibold tabular-nums">{getMatchScoreLabel(event, report)}</span>
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-slate-800 dark:text-slate-200">
                    <span className="font-semibold">{event.minute}'</span>
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${typeInfo.color} ${typeInfo.bgColor}`}
                    >
                      {event.type === 'GOL' && <i className="fa-solid fa-futbol mr-1"></i>}
                      {event.type === 'OCASION' && <i className="fa-solid fa-bullseye mr-1"></i>}
                      {event.type === 'DUELO' && <i className="fa-solid fa-people-arrows mr-1"></i>}
                      {event.type === 'NOTA' && <i className="fa-solid fa-note-sticky mr-1"></i>}
                      {event.type === 'MCB' && <i className="fa-solid fa-futbol mr-1"></i>}
                      {event.type === 'MSB' && <i className="fa-solid fa-shield-halved mr-1"></i>}
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                    {showLado ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          ladoFavor
                            ? 'text-green-700 bg-green-100 dark:bg-green-900/30'
                            : 'text-red-700 bg-red-100 dark:bg-red-900/30'
                        }`}
                      >
                        {ladoFavor ? 'Mi equipo' : 'Equipo rival'}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                    {event.type === 'DUELO' ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          event.duelOutcome === 'GANADO'
                            ? 'text-green-700 bg-green-100 dark:bg-green-900/30'
                            : 'text-red-700 bg-red-100 dark:bg-red-900/30'
                        }`}
                      >
                        {event.duelOutcome === 'GANADO' ? 'Ganado' : 'Perdido'}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-slate-800 dark:text-slate-200">
                    <p className="text-[9px] max-w-md line-clamp-2">{jugadorDetalle}</p>
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-slate-800 dark:text-slate-200">
                    <p className="text-[9px] max-w-md line-clamp-2">{notaDetalle}</p>
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                    {report?.videoUrl ? (
                      <button
                        onClick={() => onVideoClick?.(report.videoUrl, event.videoTimestamp)}
                        className="w-6 h-6 rounded-full bg-sport-primary/20 text-sport-primary hover:bg-sport-primary hover:text-white transition-all flex items-center justify-center"
                        title="Ver evento en el vídeo"
                      >
                        <i className="fa-solid fa-play text-[9px]"></i>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Mostrando {(currentPage - 1) * EVENTS_PER_PAGE + 1}-{Math.min(currentPage * EVENTS_PER_PAGE, allEvents.length)} de {allEvents.length} eventos
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              <i className="fa-solid fa-chevron-left"></i> Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isActive = pageNum === currentPage;
                const isNear = Math.abs(pageNum - currentPage) <= 1;
                const isEdge = pageNum === 1 || pageNum === totalPages;

                if (!isActive && !isNear && !isEdge) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-sport-primary text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Siguiente <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideotecaEventsTable;
