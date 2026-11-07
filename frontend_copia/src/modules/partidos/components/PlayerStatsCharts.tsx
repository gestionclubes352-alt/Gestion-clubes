import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Jugador } from '@shared/services/dataService';

interface PlayerAggregate {
  playerId: string;
  matchesPlayed: number;
  starterCount: number;
  minutes: number;
  goals: number;
  yellowCards: number;
  redCards: number;
}

interface PlayerStatsChartsProps {
  rows: PlayerAggregate[];
  squadById: Map<string, Jugador>;
}

const TOP_N = 10;

const playerLabel = (row: PlayerAggregate, squadById: Map<string, Jugador>) => {
  const player = squadById.get(row.playerId);
  return player?.apodo || player?.nombre || row.playerId;
};

const BarRow: React.FC<{ label: string; value: number; max: number; suffix?: string; barClassName: string }> = ({ label, value, max, suffix = '', barClassName }) => (
  <div className="flex items-center gap-3">
    <span className="w-28 md:w-36 shrink-0 text-xs font-bold text-slate-600 truncate" title={label}>{label}</span>
    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%` }} />
    </div>
    <span className="w-12 text-right text-xs font-black text-slate-700 shrink-0">{value}{suffix}</span>
  </div>
);

const StackedCardsRow: React.FC<{ label: string; yellow: number; red: number; max: number }> = ({ label, yellow, red, max }) => (
  <div className="flex items-center gap-3">
    <span className="w-28 md:w-36 shrink-0 text-xs font-bold text-slate-600 truncate" title={label}>{label}</span>
    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden flex">
      <div className="h-full bg-amber-400" style={{ width: `${max > 0 ? (yellow / max) * 100 : 0}%` }} />
      <div className="h-full bg-red-500" style={{ width: `${max > 0 ? (red / max) * 100 : 0}%` }} />
    </div>
    <span className="w-12 text-right text-xs font-black text-slate-700 shrink-0">{yellow + red}</span>
  </div>
);

const PlayerStatsCharts: React.FC<PlayerStatsChartsProps> = ({ rows, squadById }) => {
  const { t } = useTranslation();

  const topStarters = [...rows].filter(r => r.starterCount > 0).sort((a, b) => b.starterCount - a.starterCount).slice(0, TOP_N);
  const maxStarters = Math.max(1, ...topStarters.map(r => r.starterCount));

  const topGoals = [...rows].filter(r => r.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, TOP_N);
  const maxGoals = Math.max(1, ...topGoals.map(r => r.goals));

  const topMinutes = [...rows].filter(r => r.minutes > 0).sort((a, b) => b.minutes - a.minutes).slice(0, TOP_N);
  const maxMinutes = Math.max(1, ...topMinutes.map(r => r.minutes));

  const topCards = [...rows]
    .filter(r => r.yellowCards > 0 || r.redCards > 0)
    .sort((a, b) => (b.yellowCards + b.redCards) - (a.yellowCards + a.redCards))
    .slice(0, TOP_N);
  const maxCards = Math.max(1, ...topCards.map(r => r.yellowCards + r.redCards));

  if (rows.length === 0) {
    return <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-list-ol text-blue-500"></i> {t('playerStatsSummary.chartStarters')}
        </h4>
        {topStarters.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>
        ) : (
          <div className="space-y-3">
            {topStarters.map(row => (
              <BarRow key={row.playerId} label={playerLabel(row, squadById)} value={row.starterCount} max={maxStarters} barClassName="bg-blue-500" />
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-futbol text-emerald-500"></i> {t('playerStatsSummary.chartGoals')}
        </h4>
        {topGoals.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>
        ) : (
          <div className="space-y-3">
            {topGoals.map(row => (
              <BarRow key={row.playerId} label={playerLabel(row, squadById)} value={row.goals} max={maxGoals} barClassName="bg-emerald-500" />
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-clock text-sport-primary"></i> {t('playerStatsSummary.chartMinutes')}
        </h4>
        {topMinutes.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>
        ) : (
          <div className="space-y-3">
            {topMinutes.map(row => (
              <BarRow key={row.playerId} label={playerLabel(row, squadById)} value={row.minutes} max={maxMinutes} suffix="'" barClassName="bg-sport-primary" />
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-square text-amber-400"></i> {t('playerStatsSummary.chartCards')}
          </h4>
          <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>{t('playerStatsSummary.yellowCards')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>{t('playerStatsSummary.redCards')}</span>
          </div>
        </div>
        {topCards.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>
        ) : (
          <div className="space-y-3">
            {topCards.map(row => (
              <StackedCardsRow key={row.playerId} label={playerLabel(row, squadById)} yellow={row.yellowCards} red={row.redCards} max={maxCards} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerStatsCharts;
