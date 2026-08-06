import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Jugador } from '@shared/services/dataService';

export interface SystemMinutesStats {
  collective: Map<string, number>;
  individual: Map<string, Map<string, number>>;
}

interface SystemMinutesChartsProps {
  stats: SystemMinutesStats;
  squadById: Map<string, Jugador>;
}

const playerLabel = (playerId: string, squadById: Map<string, Jugador>) => {
  const player = squadById.get(playerId);
  return player?.apodo || player?.nombre || playerId;
};

const BarRow: React.FC<{ label: string; value: number; max: number; barClassName: string }> = ({ label, value, max, barClassName }) => (
  <div className="flex items-center gap-3">
    <span className="w-28 md:w-36 shrink-0 text-xs font-bold text-slate-600 truncate" title={label}>{label}</span>
    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%` }} />
    </div>
    <span className="w-12 text-right text-xs font-black text-slate-700 shrink-0">{value}'</span>
  </div>
);

const SystemMinutesCharts: React.FC<SystemMinutesChartsProps> = ({ stats, squadById }) => {
  const { t } = useTranslation();

  const collectiveRows = Array.from(stats.collective.entries())
    .map(([formation, minutes]) => ({ formation, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
  const maxCollective = Math.max(1, ...collectiveRows.map(r => r.minutes));

  const systemsWithPlayers = Array.from(stats.individual.entries())
    .map(([formation, byPlayer]) => ({
      formation,
      players: Array.from(byPlayer.entries())
        .map(([playerId, minutes]) => ({ playerId, minutes }))
        .sort((a, b) => b.minutes - a.minutes)
    }))
    .sort((a, b) => (stats.collective.get(b.formation) ?? 0) - (stats.collective.get(a.formation) ?? 0));

  if (collectiveRows.length === 0) {
    return <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-diagram-project text-purple-500"></i> {t('playerStatsSummary.chartSystemMinutesCollective')}
        </h4>
        <div className="space-y-3">
          {collectiveRows.map(row => (
            <BarRow key={row.formation} label={row.formation} value={row.minutes} max={maxCollective} barClassName="bg-purple-500" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {systemsWithPlayers.map(({ formation, players }) => {
          const maxPlayer = Math.max(1, ...players.map(p => p.minutes));
          return (
            <div key={formation} className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-users text-sport-primary"></i> {t('playerStatsSummary.chartSystemMinutesByPlayer')} — {formation}
              </h4>
              {players.length === 0 ? (
                <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>
              ) : (
                <div className="space-y-3">
                  {players.map(p => (
                    <BarRow key={p.playerId} label={playerLabel(p.playerId, squadById)} value={p.minutes} max={maxPlayer} barClassName="bg-sport-primary" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SystemMinutesCharts;
