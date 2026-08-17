import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MatchGoal, MatchCard, VideoEvent } from '../types';
import type { Jugador } from '@shared/services/dataService';

interface MatchEventsRegistryProps {
  matchGoals?: MatchGoal[];
  matchCards?: MatchCard[];
  videoEvents?: VideoEvent[];
  squadById?: Map<string, Jugador>;
}

export const MatchEventsRegistry: React.FC<MatchEventsRegistryProps> = ({
  matchGoals = [],
  matchCards = [],
  videoEvents = [],
  squadById = new Map(),
}) => {
  const { t } = useTranslation();

  const getPlayerName = (playerId?: string | number) => {
    if (!playerId) return '-';
    const player = squadById.get(String(playerId));
    return player?.apodo || player?.nombre || '-';
  };

  // Goles a favor vs en contra
  const goalsInFavor = matchGoals.filter(g => g.side === 'FAVOR');
  const goalsAgainst = matchGoals.filter(g => g.side === 'CONTRA');

  // Ocasiones (solo del equipo propio)
  const chances = videoEvents.filter(e => e.type === 'OCASION');

  // Duelos
  const duels = videoEvents.filter(e => e.type === 'DUELO');

  // Tarjetas
  const yellowCards = matchCards.filter(c => c.type === 'AMARILLA');
  const redCards = matchCards.filter(c => c.type === 'ROJA');

  const renderSection = (title: string, items: any[], columns: { key: string; label: string }[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400">
          {title} ({items.length})
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="bg-[var(--surface-1)] text-[var(--text-muted)] uppercase text-[6px] font-black tracking-widest">
                {columns.map(col => (
                  <th key={col.key} className="px-3 py-3 text-left">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {items.map((item, idx) => (
                <tr key={idx} className="text-[var(--text-strong)]">
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2">
                      {item[col.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const goalsData = goalsInFavor.map(g => ({
    minute: `${g.minute}'`,
    player: getPlayerName(g.playerId),
    type: 'Gol',
  }));

  const goalsAgainstData = goalsAgainst.map(g => ({
    minute: `${g.minute}'`,
    player: getPlayerName(g.playerId),
    type: 'Gol en contra',
  }));

  const chancesData = chances.map(e => ({
    minute: e.minute,
    player: e.playerId ? getPlayerName(e.playerId) : '-',
    type: 'Ocasión',
  }));

  const duelsData = duels.map(e => ({
    minute: e.minute,
    outcome: e.duelOutcome === 'GANADO' ? 'Ganado' : e.duelOutcome === 'PERDIDO' ? 'Perdido' : '-',
  }));

  const yellowCardsData = yellowCards.map(c => ({
    minute: `${c.minute}'`,
    player: getPlayerName(c.playerId),
    type: 'Amarilla',
  }));

  const redCardsData = redCards.map(c => ({
    minute: `${c.minute}'`,
    player: getPlayerName(c.playerId),
    type: 'Roja',
  }));

  return (
    <div className="space-y-8">
      {/* Goles a favor */}
      {renderSection('Goles a Favor', goalsData, [
        { key: 'minute', label: 'Minuto' },
        { key: 'player', label: 'Jugador' },
      ])}

      {/* Goles en contra */}
      {renderSection('Goles en Contra', goalsAgainstData, [
        { key: 'minute', label: 'Minuto' },
        { key: 'player', label: 'Jugador Rival' },
      ])}

      {/* Ocasiones */}
      {renderSection('Ocasiones', chancesData, [
        { key: 'minute', label: 'Minuto' },
        { key: 'player', label: 'Jugador' },
      ])}

      {/* Duelos */}
      {renderSection('Duelos', duelsData, [
        { key: 'minute', label: 'Minuto' },
        { key: 'outcome', label: 'Resultado' },
      ])}

      {/* Tarjetas amarillas */}
      {renderSection('Tarjetas Amarillas', yellowCardsData, [
        { key: 'minute', label: 'Minuto' },
        { key: 'player', label: 'Jugador' },
      ])}

      {/* Tarjetas rojas */}
      {renderSection('Tarjetas Rojas', redCardsData, [
        { key: 'minute', label: 'Minuto' },
        { key: 'player', label: 'Jugador' },
      ])}
    </div>
  );
};

export default MatchEventsRegistry;
