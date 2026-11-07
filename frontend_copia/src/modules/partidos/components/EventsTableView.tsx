import React, { useMemo } from 'react';
import type { VideoEvent } from '../types';
import type { Player } from '@modules/plantilla';
import { useTranslation } from 'react-i18next';
import TableScrollContainer from '@shared/components/TableScrollContainer';

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

interface StatBarRow {
  label: string;
  value: number;
  color: string;
}

const StatBarChart: React.FC<{ title: string; rows: StatBarRow[] }> = ({ title, rows }) => {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">{title}</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-xs text-slate-600 dark:text-slate-400 truncate" title={row.label}>{row.label}</span>
            <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
              <div
                className={`h-full rounded ${row.color}`}
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate-800 dark:text-slate-200">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number | string; icon: string; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
      <i className={`${icon} text-sm`}></i>
    </div>
    <div>
      <p className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  </div>
);

const EventsTableView: React.FC<EventsTableViewProps> = ({ events, squad, teamName, onPlay, onEdit, onDelete }) => {
  const { t } = useTranslation();

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const minA = parseInt(a.minute) || 0;
      const minB = parseInt(b.minute) || 0;
      return minA - minB;
    });
  }, [events]);

  const stats = useMemo(() => {
    const goalsFavor = events.filter(e => e.type === 'GOL' && e.goalSide === 'FAVOR').length;
    const goalsAgainst = events.filter(e => e.type === 'GOL' && e.goalSide === 'CONTRA').length;
    const occasionsFavor = events.filter(e => e.type === 'OCASION' && e.goalSide === 'FAVOR').length;
    const occasionsAgainst = events.filter(e => e.type === 'OCASION' && e.goalSide === 'CONTRA').length;
    const duelsWon = events.filter(e => e.type === 'DUELO' && e.duelOutcome === 'GANADO').length;
    const duelsLost = events.filter(e => e.type === 'DUELO' && e.duelOutcome === 'PERDIDO').length;
    const mcbCount = events.filter(e => e.type === 'MCB').length;
    const msbCount = events.filter(e => e.type === 'MSB').length;

    const zoneCounts: Record<string, number> = {};
    events.forEach(e => {
      if (!e.zone) return;
      const key = `Zona ${e.zone}`;
      zoneCounts[key] = (zoneCounts[key] || 0) + 1;
    });

    const playerCounts: Record<string, number> = {};
    events.forEach(e => {
      if (e.type === 'NOTA') return;
      const ids = [e.playerId, ...(e.playerIds || [])].filter((id): id is string | number => id !== undefined);
      ids.forEach(id => {
        const name = getPlayerName(id, squad);
        playerCounts[name] = (playerCounts[name] || 0) + 1;
      });
    });
    const topPlayers = Object.entries(playerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value, color: 'bg-sport-primary' }));

    const zoneRows: StatBarRow[] = ['Zona 1', 'Zona 2', 'Zona 3']
      .map(label => ({ label, value: zoneCounts[label] || 0, color: 'bg-indigo-500' }))
      .filter(r => r.value > 0);

    return {
      goalsFavor,
      goalsAgainst,
      occasionsFavor,
      occasionsAgainst,
      duelsWon,
      duelsLost,
      mcbCount,
      msbCount,
      topPlayers,
      zoneRows,
      total: events.length,
    };
  }, [events, squad]);

  if (sortedEvents.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <i className="fa fa-inbox text-4xl mb-4 block opacity-50"></i>
        <p>{t('matchReport.events.noEvents') || 'No hay eventos'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Estadísticas</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Goles a favor" value={stats.goalsFavor} icon="fa-solid fa-futbol" color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
          <StatCard label="Goles en contra" value={stats.goalsAgainst} icon="fa-solid fa-futbol" color="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" />
          <StatCard label="Ocasiones a favor" value={stats.occasionsFavor} icon="fa-solid fa-bullseye" color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" />
          <StatCard label="Ocasiones en contra" value={stats.occasionsAgainst} icon="fa-solid fa-bullseye" color="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" />
          <StatCard label="Duelos ganados" value={stats.duelsWon} icon="fa-solid fa-check-circle" color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
          <StatCard label="Duelos perdidos" value={stats.duelsLost} icon="fa-solid fa-times-circle" color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" />
          <StatCard label="MCB" value={stats.mcbCount} icon="fa-solid fa-futbol" color="bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" />
          <StatCard label="MSB" value={stats.msbCount} icon="fa-solid fa-shield-halved" color="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400" />
        </div>
      </div>

      {(stats.topPlayers.length > 0 || stats.zoneRows.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stats.topPlayers.length > 0 && (
            <StatBarChart title="Jugadores con más eventos" rows={stats.topPlayers} />
          )}
          {stats.zoneRows.length > 0 && (
            <StatBarChart title="Eventos por zona" rows={stats.zoneRows} />
          )}
        </div>
      )}

    <TableScrollContainer className="border border-slate-200 dark:border-slate-700 rounded-lg">
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
      </TableScrollContainer>
    </div>
  );
};

export default EventsTableView;
