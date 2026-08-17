import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match, MatchReport } from '../types';
import { db, plantillasService, getTeamConfig } from '@shared/services/dataService';
import type { Jugador } from '@shared/services/dataService';
import PlayerStatsCharts from './PlayerStatsCharts';
import SystemsDataSummary from './SystemsDataSummary';
import MultiSelectFilter from '@shared/components/MultiSelectFilter';

const getMyTeamName = (): string => {
  try { return getTeamConfig()?.teamName || ''; } catch { return ''; }
};

const isMyTeam = (name: string): boolean => {
  const my = getMyTeamName();
  if (!my || !name) return false;
  return name.toLowerCase().includes(my.toLowerCase());
};

// El equipo "propio" de un partido es el que coincide con el club activo;
// si no se puede determinar, se usa el local como mejor esfuerzo.
const ownTeamNameOf = (match: Match): string => {
  const local = match.localTeam || '';
  const visitor = match.visitorTeam || '';
  if (isMyTeam(local)) return local;
  if (isMyTeam(visitor)) return visitor;
  return local || visitor;
};

export const MATCH_DURATION_MINUTES = 90;

export const computeMatchStats = (report: MatchReport) => {
  const starterIds = new Set(
    (report.lineupPositions || []).flatMap(pos => pos.playerIds || []).map(id => String(id))
  );
  const subs = [...(report.substitutions || [])].sort((a, b) => a.minute - b.minute);

  const redCardMinuteByPlayer = new Map<string, number>();
  (report.matchCards || [])
    .filter(c => c.type === 'ROJA' && c.playerId !== undefined)
    .forEach(c => {
      const key = String(c.playerId);
      const existing = redCardMinuteByPlayer.get(key);
      if (existing === undefined || c.minute < existing) redCardMinuteByPlayer.set(key, c.minute);
    });

  // Calcula intervalos de tiempo en el que cada jugador está en el campo
  const playerIntervals = new Map<string, Array<{ start: number; end: number }>>();

  // Starters comienzan en minuto 0
  starterIds.forEach(key => {
    playerIntervals.set(key, [{ start: 0, end: MATCH_DURATION_MINUTES }]);
  });

  // Procesa todas las sustituciones para ajustar intervalos
  subs.forEach(sub => {
    if (sub.playerOutId !== undefined) {
      const outKey = String(sub.playerOutId);
      const intervals = playerIntervals.get(outKey);
      if (intervals && intervals.length > 0) {
        // Cierra el último intervalo del jugador que sale
        intervals[intervals.length - 1].end = sub.minute;
      }
    }
    if (sub.playerInId !== undefined) {
      const inKey = String(sub.playerInId);
      if (!playerIntervals.has(inKey)) {
        playerIntervals.set(inKey, []);
      }
      // Abre un nuevo intervalo para el jugador que entra
      playerIntervals.get(inKey)!.push({ start: sub.minute, end: MATCH_DURATION_MINUTES });
    }
  });

  // Convierte los intervalos a minutos totales y aplica tarjetas rojas
  const minutesByPlayer = new Map<string, number>();
  playerIntervals.forEach((intervals, playerId) => {
    let total = 0;
    intervals.forEach(interval => {
      let end = interval.end;
      const redMinute = redCardMinuteByPlayer.get(playerId);
      if (redMinute !== undefined && redMinute < end && redMinute >= interval.start) {
        end = redMinute;
      }
      total += Math.max(0, end - interval.start);
    });
    // Un jugador no puede haber jugado más minutos que la duración del partido
    // (protege frente a datos inconsistentes, p. ej. un jugador registrado a
    // la vez como titular y como entrada de un cambio).
    minutesByPlayer.set(playerId, Math.min(total, MATCH_DURATION_MINUTES));
  });

  const goalsByPlayer = new Map<string, number>();
  (report.matchGoals || [])
    .filter(g => g.side === 'FAVOR' && g.playerId !== undefined)
    .forEach(g => {
      const key = String(g.playerId);
      goalsByPlayer.set(key, (goalsByPlayer.get(key) || 0) + 1);
    });

  const goalsConcededByPlayer = new Map<string, number>();
  (report.matchGoals || [])
    .filter(g => g.side === 'CONTRA' && g.playerId !== undefined)
    .forEach(g => {
      const key = String(g.playerId);
      goalsConcededByPlayer.set(key, (goalsConcededByPlayer.get(key) || 0) + 1);
    });

  const cardsByPlayer = new Map<string, { amarillas: number; rojas: number }>();
  (report.matchCards || []).forEach(c => {
    if (c.playerId === undefined) return;
    const key = String(c.playerId);
    const entry = cardsByPlayer.get(key) || { amarillas: 0, rojas: 0 };
    if (c.type === 'AMARILLA') entry.amarillas += 1; else entry.rojas += 1;
    cardsByPlayer.set(key, entry);
  });

  const involvedIds = new Set<string>([
    ...starterIds,
    ...minutesByPlayer.keys(),
    ...goalsByPlayer.keys(),
    ...goalsConcededByPlayer.keys(),
    ...cardsByPlayer.keys(),
  ]);

  return { starterIds, minutesByPlayer, goalsByPlayer, goalsConcededByPlayer, cardsByPlayer, involvedIds };
};

interface PlayerAggregate {
  playerId: string;
  matchesPlayed: number;
  starterCount: number;
  minutes: number;
  goals: number;
  goalsConceded: number;
  yellowCards: number;
  redCards: number;
}

interface PlayerStatsSummaryProps {
  matches: Match[];
  onSelectPlayer?: (playerId: string) => void;
}

const PlayerStatsSummary: React.FC<PlayerStatsSummaryProps> = ({ matches, onSelectPlayer }) => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<MatchReport[]>([]);
  const [squad, setSquad] = useState<Jugador[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [competitionFilter, setCompetitionFilter] = useState<string[]>([]);
  const [matchFilter, setMatchFilter] = useState<string[]>([]);
  const [view, setView] = useState<'TABLE' | 'CHARTS' | 'SYSTEMS'>('TABLE');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [{ data: reportRows }, squadRows] = await Promise.all([
          db.match_reports.get(),
          plantillasService.list(),
        ]);
        setReports((reportRows as MatchReport[]) || []);
        setSquad(squadRows as Jugador[]);
      } catch (err) {
        console.error('No se pudieron cargar los datos agregados de partidos', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const reportById = useMemo(() => new Map(reports.map(r => [String(r.id), r])), [reports]);
  const squadById = useMemo(() => new Map(squad.map(p => [String(p.id), p])), [squad]);

  const teamOptions = useMemo(() => {
    const names = new Set<string>();
    matches.forEach(m => {
      const name = ownTeamNameOf(m);
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matches]);

  const matchesByTeam = useMemo(
    () => (teamFilter.length === 0 ? matches : matches.filter(m => teamFilter.includes(ownTeamNameOf(m)))),
    [matches, teamFilter]
  );

  const competitionOptions = useMemo(() => {
    const names = new Set<string>();
    matchesByTeam.forEach(m => { if (m.competition) names.add(m.competition); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matchesByTeam]);

  const matchesByTeamAndCompetition = useMemo(
    () => (competitionFilter.length === 0 ? matchesByTeam : matchesByTeam.filter(m => competitionFilter.includes(m.competition))),
    [matchesByTeam, competitionFilter]
  );

  const matchOptions = useMemo(
    () => [...matchesByTeamAndCompetition].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [matchesByTeamAndCompetition]
  );

  const filteredMatches = useMemo(
    () => (matchFilter.length === 0 ? matchesByTeamAndCompetition : matchesByTeamAndCompetition.filter(m => matchFilter.includes(String(m.id)))),
    [matchesByTeamAndCompetition, matchFilter]
  );

  // Si cambia el equipo/competición seleccionados, el partido elegido puede dejar de ser válido.
  useEffect(() => {
    setMatchFilter((prev) => {
      const next = prev.filter((id) => matchesByTeamAndCompetition.some(m => String(m.id) === id));
      return next.length === prev.length ? prev : next;
    });
  }, [matchesByTeamAndCompetition]);

  const rows = useMemo(() => {
    const acc = new Map<string, PlayerAggregate>();
    filteredMatches.forEach(match => {
      const report = reportById.get(String(match.id));
      if (!report) return;
      const stats = computeMatchStats(report);
      stats.involvedIds.forEach(key => {
        const entry = acc.get(key) || { playerId: key, matchesPlayed: 0, starterCount: 0, minutes: 0, goals: 0, goalsConceded: 0, yellowCards: 0, redCards: 0 };
        entry.matchesPlayed += 1;
        if (stats.starterIds.has(key)) entry.starterCount += 1;
        entry.minutes += stats.minutesByPlayer.get(key) ?? 0;
        entry.goals += stats.goalsByPlayer.get(key) ?? 0;
        entry.goalsConceded += stats.goalsConcededByPlayer.get(key) ?? 0;
        const cards = stats.cardsByPlayer.get(key);
        entry.yellowCards += cards?.amarillas ?? 0;
        entry.redCards += cards?.rojas ?? 0;
        acc.set(key, entry);
      });
    });
    return Array.from(acc.values())
      .filter(a => squadById.has(a.playerId))
      .sort((a, b) => {
        const playerA = squadById.get(a.playerId);
        const playerB = squadById.get(b.playerId);
        return (playerA?.dorsal ?? 999) - (playerB?.dorsal ?? 999);
      });
  }, [filteredMatches, reportById, squadById]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('playerStatsSummary.filterTeam')}
          </label>
          <MultiSelectFilter
            value={teamFilter}
            onChange={setTeamFilter}
            allLabel={t('playerStatsSummary.allTeams')}
            options={teamOptions.map((name) => ({ value: name, label: name }))}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('playerStatsSummary.filterCompetition')}
          </label>
          <MultiSelectFilter
            value={competitionFilter}
            onChange={setCompetitionFilter}
            allLabel={t('playerStatsSummary.allCompetitions')}
            options={competitionOptions.map((name) => ({ value: name, label: name }))}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('playerStatsSummary.filterMatch')}
          </label>
          <MultiSelectFilter
            value={matchFilter}
            onChange={setMatchFilter}
            allLabel={t('playerStatsSummary.allMatches')}
            options={matchOptions.map((m) => ({
              value: String(m.id),
              label: `${new Date(m.date).toLocaleDateString()} · ${m.localTeam || '—'} vs ${m.visitorTeam || '—'}`,
            }))}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          />
        </div>
      </div>

      <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h3 className="text-[11px] font-black text-sport-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <i className="fa-solid fa-table"></i> {t('playerStatsSummary.title')}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {t('playerStatsSummary.matchesCount', { count: filteredMatches.length })}
            </span>
            <div className="flex gap-1 bg-slate-50 border border-slate-100 rounded-xl p-1">
              <button
                onClick={() => setView('TABLE')}
                className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'TABLE' ? 'bg-white text-sport-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fa-solid fa-table"></i> {t('playerStatsSummary.viewTable')}
              </button>
              <button
                onClick={() => setView('CHARTS')}
                className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'CHARTS' ? 'bg-white text-sport-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fa-solid fa-chart-simple"></i> {t('playerStatsSummary.viewCharts')}
              </button>
              <button
                onClick={() => setView('SYSTEMS')}
                className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'SYSTEMS' ? 'bg-white text-sport-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fa-solid fa-diagram-project"></i> {t('playerStatsSummary.viewSystems')}
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.loading')}</p>
        ) : view === 'SYSTEMS' ? (
          <SystemsDataSummary matches={filteredMatches} reports={reports} squadById={squadById} />
        ) : view === 'CHARTS' ? (
          <PlayerStatsCharts rows={rows} squadById={squadById} />
        ) : rows.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-widest">
                  <th className="px-3 py-3 text-left">#</th>
                  <th className="px-3 py-3 text-left">{t('playerStatsSummary.player')}</th>
                  <th className="px-3 py-3 text-center">{t('playerStatsSummary.matchesPlayed')}</th>
                  <th className="px-3 py-3 text-center">{t('playerStatsSummary.starter')}</th>
                  <th className="px-3 py-3 text-center">{t('playerStatsSummary.minutesPlayed')}</th>
                  <th className="px-3 py-3 text-center">{t('playerStatsSummary.minutesPercent')}</th>
                  <th className="px-3 py-3 text-center">{t('playerStatsSummary.starterPercent')}</th>
                  <th className="px-3 py-3 text-center">{t('playerStatsSummary.goals')}</th>
                  <th className="px-3 py-3 text-center">{t('playerStatsSummary.goalsConceded')}</th>
                  <th className="px-3 py-3 text-center">{t('playerStatsSummary.yellowCards')}</th>
                  <th className="px-3 py-3 text-center">{t('playerStatsSummary.redCards')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => {
                  const player = squadById.get(row.playerId);
                  const minutesPercent = row.matchesPlayed > 0 ? Math.round((row.minutes / (row.matchesPlayed * MATCH_DURATION_MINUTES)) * 100) : 0;
                  const starterPercent = row.matchesPlayed > 0 ? Math.round((row.starterCount / row.matchesPlayed) * 100) : 0;
                  return (
                    <tr
                      key={row.playerId}
                      className={`text-slate-700 ${onSelectPlayer ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                      onClick={() => onSelectPlayer && onSelectPlayer(row.playerId)}
                    >
                      <td className="px-3 py-2 font-black">{player?.dorsal ?? '-'}</td>
                      <td className="px-3 py-2 font-bold truncate max-w-48">{player?.apodo || player?.nombre || row.playerId}</td>
                      <td className="px-3 py-2 text-center font-bold">{row.matchesPlayed}</td>
                      <td className="px-3 py-2 text-center font-bold">{row.starterCount}</td>
                      <td className="px-3 py-2 text-center font-bold">{row.minutes}'</td>
                      <td className="px-3 py-2 text-center font-bold">{minutesPercent}%</td>
                      <td className="px-3 py-2 text-center font-bold">{starterPercent}%</td>
                      <td className="px-3 py-2 text-center font-bold">{row.goals}</td>
                      <td className="px-3 py-2 text-center font-bold">{row.goalsConceded}</td>
                      <td className="px-3 py-2 text-center font-bold">{row.yellowCards}</td>
                      <td className="px-3 py-2 text-center font-bold">{row.redCards}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerStatsSummary;
