import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match, MatchReport } from '../types';
import type { Jugador } from '@shared/services/dataService';

const MATCH_DURATION_MINUTES = 90;

interface SystemStats {
  system: string;
  minutes: number;
  playerMinutes: Map<string, number>;
}

interface MatchSystemData {
  matchId: string;
  date: string;
  localTeam: string;
  visitorTeam: string;
  systems: SystemStats[];
}

const getMyTeamName = (): string => {
  try {
    const config = localStorage.getItem('teamConfig');
    if (!config) return '';
    return JSON.parse(config)?.teamName || '';
  } catch {
    return '';
  }
};

const isMyTeam = (name: string): boolean => {
  const my = getMyTeamName();
  if (!my || !name) return false;
  return name.toLowerCase().includes(my.toLowerCase());
};

const calculateFormationWindows = (
  formation: string | undefined,
  formationChanges: any[] = [],
  matchDuration = MATCH_DURATION_MINUTES
) => {
  const windows: Array<{ formation: string; start: number; end: number }> = [];
  const changes = [...formationChanges].sort((a, b) => a.minute - b.minute);

  if (formation) {
    windows.push({ formation, start: 0, end: changes.length > 0 ? changes[0].minute : matchDuration });
  }

  changes.forEach((change, i) => {
    const nextChange = changes[i + 1];
    const end = nextChange ? nextChange.minute : matchDuration;
    windows.push({ formation: change.formation, start: change.minute, end });
  });

  return windows.filter(w => w.end > w.start);
};

const calculatePlayerIntervals = (
  lineup: any[] = [],
  substitutions: any[] = [],
  redCards: any[] = [],
  matchDuration = MATCH_DURATION_MINUTES
): Map<string, Array<{ start: number; end: number }>> => {
  const playerIntervals = new Map<string, Array<{ start: number; end: number }>>();
  const starterIds = new Set((lineup || []).flatMap(pos => pos.playerIds || []).map(id => String(id)));

  // Starters comienzan en minuto 0
  starterIds.forEach(id => {
    playerIntervals.set(id, [{ start: 0, end: matchDuration }]);
  });

  const redCardMinute = new Map<string, number>();
  (redCards || [])
    .filter(c => c.type === 'ROJA' && c.playerId !== undefined)
    .forEach(c => {
      const key = String(c.playerId);
      const existing = redCardMinute.get(key);
      if (existing === undefined || c.minute < existing) redCardMinute.set(key, c.minute);
    });

  // Procesa todas las sustituciones para ajustar intervalos
  (substitutions || []).forEach(sub => {
    if (sub.playerOutId !== undefined) {
      const outId = String(sub.playerOutId);
      const intervals = playerIntervals.get(outId);
      if (intervals && intervals.length > 0) {
        // Cierra el último intervalo del jugador que sale
        intervals[intervals.length - 1].end = sub.minute;
      }
    }
    if (sub.playerInId !== undefined) {
      const inId = String(sub.playerInId);
      if (!playerIntervals.has(inId)) {
        playerIntervals.set(inId, []);
      }
      // Abre un nuevo intervalo para el jugador que entra
      playerIntervals.get(inId)!.push({ start: sub.minute, end: matchDuration });
    }
  });

  // Aplica tarjetas rojas (reduce el tiempo de fin)
  redCardMinute.forEach((minute, playerId) => {
    const intervals = playerIntervals.get(playerId);
    if (intervals) {
      intervals.forEach(interval => {
        if (minute >= interval.start && minute < interval.end) {
          interval.end = minute;
        }
      });
    }
  });

  return playerIntervals;
};

const calculateSystemStats = (report: MatchReport): SystemStats[] => {
  const formationWindows = calculateFormationWindows(report.formation, report.formationChanges);
  const playerIntervalsMap = calculatePlayerIntervals(report.lineupPositions, report.substitutions, report.matchCards);

  const systemMap = new Map<string, { minutes: number; playerMinutes: Map<string, number> }>();

  formationWindows.forEach(window => {
    const key = window.formation;
    if (!systemMap.has(key)) {
      systemMap.set(key, { minutes: 0, playerMinutes: new Map() });
    }
    const entry = systemMap.get(key)!;
    entry.minutes += window.end - window.start;

    playerIntervalsMap.forEach((intervals, playerId) => {
      // Itera sobre todos los intervalos del jugador
      intervals.forEach(interval => {
        const overlap = Math.min(interval.end, window.end) - Math.max(interval.start, window.start);
        if (overlap > 0) {
          entry.playerMinutes.set(playerId, (entry.playerMinutes.get(playerId) ?? 0) + overlap);
        }
      });
    });
  });

  return Array.from(systemMap.entries())
    .map(([system, data]) => ({ system, ...data }))
    .sort((a, b) => b.minutes - a.minutes);
};

interface SystemsDataSummaryProps {
  matches: Match[];
  reports: MatchReport[];
  squadById: Map<string, Jugador>;
}

const BarRow: React.FC<{ label: string; value: number; max: number; barClassName: string }> = ({
  label,
  value,
  max,
  barClassName,
}) => (
  <div className="flex items-center gap-3">
    <span className="w-28 md:w-36 shrink-0 text-xs font-bold text-slate-600 truncate" title={label}>
      {label}
    </span>
    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${barClassName}`}
        style={{ width: `${max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%` }}
      />
    </div>
    <span className="w-12 text-right text-xs font-black text-slate-700 shrink-0">{value}'</span>
  </div>
);

const SystemsDataSummary: React.FC<SystemsDataSummaryProps> = ({ matches, reports, squadById }) => {
  const { t } = useTranslation();

  const reportById = useMemo(() => new Map(reports.map(r => [String(r.id), r])), [reports]);

  const matchSystemsData = useMemo(() => {
    return matches
      .map(match => {
        const report = reportById.get(String(match.id));
        if (!report) return null;

        return {
          matchId: String(match.id),
          date: match.date,
          localTeam: match.localTeam || '',
          visitorTeam: match.visitorTeam || '',
          systems: calculateSystemStats(report),
          report,
        };
      })
      .filter(Boolean) as (MatchSystemData & { report: MatchReport })[];
  }, [matches, reportById]);

  // Aggregate systems across all filtered matches
  const aggregateSystemStats = useMemo(() => {
    const collective = new Map<string, number>();
    const individual = new Map<string, Map<string, number>>();

    matchSystemsData.forEach(matchData => {
      matchData.systems.forEach(system => {
        collective.set(system.system, (collective.get(system.system) ?? 0) + system.minutes);

        if (!individual.has(system.system)) {
          individual.set(system.system, new Map());
        }
        const byPlayer = individual.get(system.system)!;
        system.playerMinutes.forEach((minutes, playerId) => {
          byPlayer.set(playerId, (byPlayer.get(playerId) ?? 0) + minutes);
        });
      });
    });

    return { collective, individual };
  }, [matchSystemsData]);

  if (matchSystemsData.length === 0) {
    return <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>;
  }

  const collectiveRows = Array.from(aggregateSystemStats.collective.entries())
    .map(([formation, minutes]) => ({ formation, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
  const maxCollective = Math.max(1, ...collectiveRows.map(r => r.minutes));

  const systemsWithPlayers = Array.from(aggregateSystemStats.individual.entries())
    .map(([formation, byPlayer]) => ({
      formation,
      players: Array.from(byPlayer.entries())
        .map(([playerId, minutes]) => ({ playerId, minutes }))
        .sort((a, b) => b.minutes - a.minutes),
    }))
    .sort(
      (a, b) =>
        (aggregateSystemStats.collective.get(b.formation) ?? 0) - (aggregateSystemStats.collective.get(a.formation) ?? 0)
    );

  const playerLabel = (playerId: string) => {
    const player = squadById.get(playerId);
    return player?.apodo || player?.nombre || playerId;
  };

  return (
    <div className="space-y-8">
      {/* Aggregate Systems View */}
      <div className="space-y-6">
        <h3 className="text-[11px] font-black text-sport-primary uppercase tracking-[0.2em] flex items-center gap-2">
          <i className="fa-solid fa-diagram-project"></i> {t('playerStatsSummary.chartSystemMinutesCollective')}
        </h3>

        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
          {collectiveRows.length === 0 ? (
            <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>
          ) : (
            <div className="space-y-3">
              {collectiveRows.map(row => (
                <BarRow
                  key={row.formation}
                  label={row.formation}
                  value={row.minutes}
                  max={maxCollective}
                  barClassName="bg-purple-500"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Systems by Player */}
      <div>
        <h3 className="text-[11px] font-black text-sport-primary uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
          <i className="fa-solid fa-users"></i> {t('playerStatsSummary.chartSystemMinutesByPlayer')}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {systemsWithPlayers.map(({ formation, players }) => {
            const maxPlayer = Math.max(1, ...players.map(p => p.minutes));
            return (
              <div key={formation} className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-users text-sport-primary"></i> {formation}
                </h4>
                {players.length === 0 ? (
                  <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>
                ) : (
                  <div className="space-y-3">
                    {players.map(p => (
                      <BarRow
                        key={p.playerId}
                        label={playerLabel(p.playerId)}
                        value={p.minutes}
                        max={maxPlayer}
                        barClassName="bg-sport-primary"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Match-by-Match Breakdown */}
      <div>
        <h3 className="text-[11px] font-black text-sport-primary uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
          <i className="fa-solid fa-calendar-days"></i> {t('playerStatsSummary.systemsByMatch')}
        </h3>
        <div className="space-y-6">
          {matchSystemsData.map(matchData => (
            <div key={matchData.matchId} className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {new Date(matchData.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    {matchData.localTeam}
                    {' vs '}
                    {matchData.visitorTeam}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {t('playerStatsSummary.systemsUsed')}
                  </p>
                  <p className="text-sm font-black text-sport-primary">{matchData.systems.length}</p>
                </div>
              </div>
              <div className="space-y-3">
                {matchData.systems.map(system => (
                  <div key={`${matchData.matchId}-${system.system}`} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">{system.system}</span>
                      <span className="text-xs font-black text-slate-700">{system.minutes}'</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sport-primary rounded-full"
                        style={{ width: `${(system.minutes / MATCH_DURATION_MINUTES) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemsDataSummary;
