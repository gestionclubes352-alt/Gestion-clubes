import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match, MatchReport } from '@modules/partidos/types';
import type { CompetitionTeam } from '@modules/competicion/types';
import type { Club } from '@modules/clubes/types';
import { computeMatchStats, MATCH_DURATION_MINUTES } from '../../partidos/components/PlayerStatsSummary';
import { db } from '@shared/services/dataService';

interface PlayerMatchBreakdownProps {
  playerId: string;
  matches: Match[];
  /** Equipos reales de Supabase, para resolver el club al que pertenece cada equipo del partido */
  equipos?: CompetitionTeam[];
  /** Clubes reales de Supabase, para mostrar el nombre del club en lugar (o además) de la categoría */
  clubes?: Club[];
}

/** Abrevia una categoría de equipo tipo "Juvenil A" a sus iniciales, p.ej. "JA". */
const abbreviateTeamName = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return name;
  return words.map(w => w[0]?.toUpperCase() || '').join('');
};

interface MatchRow {
  match: Match;
  minutes: number;
  isStarter: boolean;
  goals: number;
  yellowCards: number;
  redCards: number;
}

interface CompetitionGroup {
  competition: string;
  rows: MatchRow[];
  matchesPlayed: number;
  starterCount: number;
  minutes: number;
  goals: number;
  yellowCards: number;
  redCards: number;
}

const PlayerMatchBreakdown: React.FC<PlayerMatchBreakdownProps> = ({ playerId, matches, equipos = [], clubes = [] }) => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<MatchReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'TABLE' | 'CHART'>('TABLE');

  const clubNameById = useMemo(() => new Map(clubes.map(club => [String(club.id), club.nombre])), [clubes]);

  // Fallback por nombre para partidos guardados sin clubId por equipo: si dos clubes
  // tienen un equipo homónimo (p.ej. "Juvenil A"), esto solo puede acertar uno de los dos.
  const clubNameByTeamName = useMemo(() => {
    const map = new Map<string, string>();
    equipos.forEach(team => {
      const teamName = team.equipo || team.nombre;
      const clubName = team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined;
      if (teamName && clubName && !map.has(teamName)) map.set(teamName, clubName);
    });
    return map;
  }, [equipos, clubNameById]);

  const resolveClubLabel = (teamName: string, clubId?: string): string | undefined =>
    (clubId && clubNameById.get(String(clubId))) || clubNameByTeamName.get(teamName);

  const formatTeam = (teamName?: string, clubId?: string): string => {
    if (!teamName) return '—';
    const clubLabel = resolveClubLabel(teamName, clubId);
    const abbreviated = abbreviateTeamName(teamName);
    return clubLabel ? `${clubLabel} (${abbreviated})` : teamName;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await db.match_reports.get();
        if (!cancelled) setReports((data as MatchReport[]) || []);
      } catch (err) {
        console.error('No se pudieron cargar los partes de partido', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const reportById = useMemo(() => new Map(reports.map(r => [String(r.id), r])), [reports]);

  const groups = useMemo(() => {
    const pid = String(playerId);
    const byCompetition = new Map<string, CompetitionGroup>();

    [...matches]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(match => {
        const report = reportById.get(String(match.id));
        if (!report) return;
        const stats = computeMatchStats(report);
        if (!stats.involvedIds.has(pid)) return;

        const competition = match.competition || t('editPlayer.noCompetition', 'Sin competición');
        const group = byCompetition.get(competition) || {
          competition,
          rows: [],
          matchesPlayed: 0,
          starterCount: 0,
          minutes: 0,
          goals: 0,
          yellowCards: 0,
          redCards: 0,
        };

        const cards = stats.cardsByPlayer.get(pid);
        const row: MatchRow = {
          match,
          minutes: stats.minutesByPlayer.get(pid) ?? 0,
          isStarter: stats.starterIds.has(pid),
          goals: stats.goalsByPlayer.get(pid) ?? 0,
          yellowCards: cards?.amarillas ?? 0,
          redCards: cards?.rojas ?? 0,
        };

        group.rows.push(row);
        group.matchesPlayed += 1;
        if (row.isStarter) group.starterCount += 1;
        group.minutes += row.minutes;
        group.goals += row.goals;
        group.yellowCards += row.yellowCards;
        group.redCards += row.redCards;
        byCompetition.set(competition, group);
      });

    return Array.from(byCompetition.values()).sort((a, b) => b.matchesPlayed - a.matchesPlayed);
  }, [matches, reportById, playerId, t]);

  const maxCompetitionMinutes = Math.max(1, ...groups.map(g => g.minutes));
  const maxMatchMinutes = Math.max(1, ...groups.flatMap(g => g.rows.map(r => r.minutes)));

  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
        <p className="text-xs font-bold text-slate-400 text-center py-2">{t('playerStatsSummary.loading')}</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
          <i className="fa-solid fa-list-check mr-1"></i>
          {t('editPlayer.matchBreakdownTitle', 'Desglose por competición y partido')}
        </span>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setView('TABLE')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'TABLE' ? 'bg-slate-100 text-[var(--accent)]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className="fa-solid fa-table"></i> {t('playerStatsSummary.viewTable')}
          </button>
          <button
            type="button"
            onClick={() => setView('CHART')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'CHART' ? 'bg-slate-100 text-[var(--accent)]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className="fa-solid fa-chart-simple"></i> {t('playerStatsSummary.viewCharts')}
          </button>
        </div>
      </div>

      {view === 'TABLE' ? (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.competition} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 bg-slate-100/70 border-b border-slate-200">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{group.competition}</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {group.matchesPlayed} {t('playerStatsSummary.matchesPlayed').toLowerCase()} · {group.minutes}' · {group.goals} {t('players.goals').toLowerCase()}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[9px] font-black tracking-widest">
                      <th className="px-3 py-2 text-left">{t('common.date', 'Fecha')}</th>
                      <th className="px-3 py-2 text-left">{t('playerStatsSummary.filterMatch', 'Partido')}</th>
                      <th className="px-3 py-2 text-center">{t('editPlayer.minutes')}</th>
                      <th className="px-3 py-2 text-center">{t('editPlayer.starter')}</th>
                      <th className="px-3 py-2 text-center">{t('players.goals')}</th>
                      <th className="px-3 py-2 text-center">{t('playerStatsSummary.yellowCards')}</th>
                      <th className="px-3 py-2 text-center">{t('playerStatsSummary.redCards')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.rows.map(row => (
                      <tr key={String(row.match.id)} className="text-slate-700">
                        <td className="px-3 py-2 font-bold whitespace-nowrap">
                          {row.match.date ? new Date(row.match.date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2 font-bold truncate max-w-56">
                          {formatTeam(row.match.localTeam, row.match.localTeamClubId)} vs{' '}
                          {formatTeam(row.match.visitorTeam || row.match.opponent, row.match.visitorTeamClubId)}
                        </td>
                        <td className="px-3 py-2 text-center font-black text-[var(--accent)]">{row.minutes}'</td>
                        <td className="px-3 py-2 text-center font-bold">
                          {row.isStarter ? t('editPlayer.starter') : t('editPlayer.substitute', 'Suplente')}
                        </td>
                        <td className="px-3 py-2 text-center font-bold">{row.goals}</td>
                        <td className="px-3 py-2 text-center font-bold">{row.yellowCards}</td>
                        <td className="px-3 py-2 text-center font-bold">{row.redCards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              {t('editPlayer.minutesByCompetition', 'Minutos por competición')}
            </span>
            <div className="space-y-2">
              {groups.map(group => (
                <div key={group.competition}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[60%]">{group.competition}</span>
                    <span className="text-[10px] font-black text-[var(--accent)]">{group.minutes}'</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full transition-all"
                      style={{ width: `${(group.minutes / maxCompetitionMinutes) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              {t('editPlayer.minutesByMatch', 'Minutos por partido')}
            </span>
            <div className="space-y-3">
              {groups.map(group => (
                <div key={group.competition}>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{group.competition}</span>
                  <div className="flex items-end gap-1 mt-1 h-16">
                    {group.rows.map(row => (
                      <div key={String(row.match.id)} className="flex-1 flex flex-col items-center justify-end h-full" title={`${row.match.opponent || ''} · ${row.minutes}'`}>
                        <div
                          className={`w-full rounded-t ${row.isStarter ? 'bg-[var(--accent)]' : 'bg-slate-400'}`}
                          style={{ height: `${Math.max(4, (row.minutes / maxMatchMinutes) * 100)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block"></span>
                {t('editPlayer.starter')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                {t('editPlayer.substitute', 'Suplente')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerMatchBreakdown;
