import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TableScrollContainer from '@shared/components/TableScrollContainer';
import FullscreenChart from '@shared/components/FullscreenChart';
import { BallIcon, CardIcon, StatCount } from '@shared/components/MatchIcons';

/** Fila de `estadisticas_partido_jugador` (acta importada de la Federación) de un jugador. */
export interface ActaMatchRow {
  fed_match_id: number;
  titular: boolean;
  minutos: number;
  goles: number;
  amarillas: number;
  rojas: number;
  fecha: string;
  jornada: string | null;
  competicion: string | null;
  rival: string | null;
  es_local: boolean | null;
}

interface PlayerMatchBreakdownProps {
  /** Partidos del jugador procedentes de actas federativas (únicos que se muestran) */
  actaMatches: ActaMatchRow[];
}

interface CompetitionGroup {
  competition: string;
  rows: ActaMatchRow[];
  matchesPlayed: number;
  starterCount: number;
  minutes: number;
  goals: number;
  yellowCards: number;
  redCards: number;
}

const PlayerMatchBreakdown: React.FC<PlayerMatchBreakdownProps> = ({ actaMatches }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<'TABLE' | 'CHART'>('TABLE');

  const groups = useMemo(() => {
    const byCompetition = new Map<string, CompetitionGroup>();

    [...actaMatches]
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
      .forEach(row => {
        const competition = row.competicion || t('editPlayer.noCompetition', 'Sin competición');
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
        group.rows.push(row);
        group.matchesPlayed += 1;
        if (row.titular) group.starterCount += 1;
        group.minutes += row.minutos || 0;
        group.goals += row.goles || 0;
        group.yellowCards += row.amarillas || 0;
        group.redCards += row.rojas || 0;
        byCompetition.set(competition, group);
      });

    return Array.from(byCompetition.values()).sort((a, b) => b.matchesPlayed - a.matchesPlayed);
  }, [actaMatches, t]);

  const maxCompetitionMinutes = Math.max(1, ...groups.map(g => g.minutes));
  const maxMatchMinutes = Math.max(1, ...groups.flatMap(g => g.rows.map(r => r.minutos || 0)));

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
              <TableScrollContainer>
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[8px] font-black tracking-widest">
                      <th className="px-3 py-2 text-left">{t('common.date', 'Fecha')}</th>
                      <th className="px-3 py-2 text-left">{t('playerStatsSummary.filterMatch', 'Partido')}</th>
                      <th className="px-3 py-2 text-center">{t('editPlayer.minutes')}</th>
                      <th className="px-3 py-2 text-center">{t('editPlayer.starter')}</th>
                      <th className="px-3 py-2 text-center"><span className="inline-flex items-center gap-1"><BallIcon className="w-3 h-3" />{t('players.goals')}</span></th>
                      <th className="px-3 py-2 text-center"><span className="inline-flex items-center gap-1"><CardIcon kind="yellow" className="w-2 h-3" />{t('playerStatsSummary.yellowCards')}</span></th>
                      <th className="px-3 py-2 text-center"><span className="inline-flex items-center gap-1"><CardIcon kind="red" className="w-2 h-3" />{t('playerStatsSummary.redCards')}</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.rows.map(row => (
                      <tr key={row.fed_match_id} className="text-slate-700">
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">
                          {row.fecha ? new Date(row.fecha).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2 font-semibold truncate max-w-56">
                          {row.es_local === false ? '@ ' : 'vs '}{row.rival || '—'}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-[var(--accent)]">{row.minutos || 0}'</td>
                        <td className="px-3 py-2 text-center font-semibold">
                          {row.titular ? t('editPlayer.starter') : t('editPlayer.substitute', 'Suplente')}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold"><StatCount kind="goal" count={row.goles || 0} /></td>
                        <td className="px-3 py-2 text-center font-semibold"><StatCount kind="yellow" count={row.amarillas || 0} /></td>
                        <td className="px-3 py-2 text-center font-semibold"><StatCount kind="red" count={row.rojas || 0} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScrollContainer>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <FullscreenChart>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block pr-8">
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
          </FullscreenChart>

          <FullscreenChart className="pt-3 border-t border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block pr-8">
              {t('editPlayer.minutesByMatch', 'Minutos por partido')}
            </span>
            <div className="space-y-3">
              {groups.map(group => (
                <div key={group.competition}>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{group.competition}</span>
                  <div className="flex items-end gap-1 mt-1 h-16">
                    {group.rows.map(row => (
                      <div key={row.fed_match_id} className="flex-1 flex flex-col items-center justify-end h-full" title={`${row.rival || ''} · ${row.minutos || 0}'`}>
                        <div
                          className={`w-full rounded-t ${row.titular ? 'bg-[var(--accent)]' : 'bg-slate-400'}`}
                          style={{ height: `${Math.max(4, ((row.minutos || 0) / maxMatchMinutes) * 100)}%` }}
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
          </FullscreenChart>
        </div>
      )}
    </div>
  );
};

export default React.memo(PlayerMatchBreakdown);
