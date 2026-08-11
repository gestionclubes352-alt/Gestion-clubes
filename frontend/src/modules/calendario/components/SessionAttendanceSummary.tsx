import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '@modules/plantilla';
import type { AttendanceStatus, CalendarEvent } from '../types';
import { getPlayerSessionAttendance, hasRecordedAttendance } from '../utils/attendance';

interface SessionAttendanceSummaryProps {
  events: CalendarEvent[];
  players: Player[];
  filterDateFrom?: string;
  filterDateTo?: string;
  onFilterDateFromChange?: (date: string) => void;
  onFilterDateToChange?: (date: string) => void;
}

const REASONS: AttendanceStatus[] = ['Lesión', 'Vacaciones', 'Descanso', 'No justificada', 'Otro'];
const TOP_CHART_ROWS = 8;

const reasonTranslationKey = (reason: AttendanceStatus) =>
  `calendarView.attend${reason === 'Lesión' ? 'Injury' : reason === 'Vacaciones' ? 'Vacation' : reason === 'Descanso' ? 'Rest' : reason === 'No justificada' ? 'Unjustified' : 'Other'}`;

const chartWidth = (value: number, max: number) =>
  `${max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%`;

interface ChartBarRowProps {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  barClassName: string;
}

const ChartBarRow: React.FC<ChartBarRowProps> = ({ label, value, max, suffix = '', barClassName }) => (
  <div className="flex items-center gap-3 min-w-0">
    <span className="w-28 md:w-36 shrink-0 text-xs font-bold text-slate-600 truncate" title={label}>{label}</span>
    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden min-w-24">
      <div className={`h-full rounded-full ${barClassName}`} style={{ width: chartWidth(value, max) }} />
    </div>
    <span className="w-12 text-right text-xs font-black text-slate-700 shrink-0">{value}{suffix}</span>
  </div>
);

const SessionAttendanceSummary: React.FC<SessionAttendanceSummaryProps> = ({
  events,
  players,
  filterDateFrom = '',
  filterDateTo = '',
  onFilterDateFromChange,
  onFilterDateToChange,
}) => {
  const { t } = useTranslation();

  const sessionsWithAttendance = useMemo(
    () => events.filter(hasRecordedAttendance),
    [events]
  );

  const rows = useMemo(() => {
    return players.map(player => {
      const pid = String(player.id);
      let attended = 0;
      const reasonCounts: Record<string, number> = {};
      sessionsWithAttendance.forEach(session => {
        const result = getPlayerSessionAttendance(session, pid);
        if (!result.counted) return;
        if (result.attended) {
          attended += 1;
        } else {
          const status = result.status || 'Otro';
          reasonCounts[status] = (reasonCounts[status] || 0) + 1;
        }
      });
      const total = sessionsWithAttendance.filter(session => getPlayerSessionAttendance(session, pid).counted).length;
      const absences = total - attended;
      const attendancePct = total > 0 ? Math.round((attended / total) * 100) : 0;
      return { player, total, attended, absences, attendancePct, reasonCounts };
    });
  }, [players, sessionsWithAttendance]);

  const rowsByPosition = useMemo(() => {
    const grouped: Record<string, typeof rows> = {};
    rows.forEach(row => {
      const position = row.player.posicionJuego || row.player.posicion || 'Sin posición';
      if (!grouped[position]) {
        grouped[position] = [];
      }
      grouped[position].push(row);
    });
    return grouped;
  }, [rows]);

  const chartData = useMemo(() => {
    const totalAttended = rows.reduce((sum, row) => sum + row.attended, 0);
    const totalAbsences = rows.reduce((sum, row) => sum + row.absences, 0);
    const totalCounted = rows.reduce((sum, row) => sum + row.total, 0);
    const averageAttendancePct = totalCounted > 0 ? Math.round((totalAttended / totalCounted) * 100) : 0;
    const topAttendance = [...rows]
      .filter(row => row.total > 0)
      .sort((a, b) => b.attendancePct - a.attendancePct || b.attended - a.attended)
      .slice(0, TOP_CHART_ROWS);
    const topAbsences = [...rows]
      .filter(row => row.absences > 0)
      .sort((a, b) => b.absences - a.absences || a.attendancePct - b.attendancePct)
      .slice(0, TOP_CHART_ROWS);
    const reasonTotals = REASONS.map(reason => ({
      reason,
      total: rows.reduce((sum, row) => sum + (row.reasonCounts[reason] || 0), 0),
    })).filter(item => item.total > 0);
    const maxAbsences = Math.max(1, ...topAbsences.map(row => row.absences), ...reasonTotals.map(item => item.total));

    return {
      totalAttended,
      totalAbsences,
      totalCounted,
      averageAttendancePct,
      topAttendance,
      topAbsences,
      reasonTotals,
      maxAbsences,
    };
  }, [rows]);

  return (
    <div className="w-full">
      <div className="bg-white rounded-4xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-4 md:px-10 py-4 md:py-6 border-b border-slate-50 bg-slate-50/30">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <h4 className="text-[var(--accent)] font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-clipboard-user"></i> {t('calendarView.sessionDataTitle')}
            </h4>
            <span className="text-xs font-black text-slate-400">
              {sessionsWithAttendance.length} {t('calendarView.sessionsWithAttendance')}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Desde:</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => onFilterDateFromChange?.(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <label className="text-[10px] font-bold text-slate-500 uppercase">Hasta:</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => onFilterDateToChange?.(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            {(filterDateFrom || filterDateTo) && (
              <button
                onClick={() => {
                  onFilterDateFromChange?.('');
                  onFilterDateToChange?.('');
                }}
                className="px-3 py-2 text-[10px] font-bold text-red-600 hover:text-red-700 uppercase"
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>
        {players.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold text-sm">{t('calendarView.noPlayers')}</div>
        ) : sessionsWithAttendance.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold text-sm">{t('calendarView.noAttendanceRecorded')}</div>
        ) : (
          <div className="space-y-6 pb-6">
            <section className="px-4 md:px-10 py-6 border-b border-slate-100">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <h5 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-chart-simple text-[var(--accent)]"></i> {t('calendarView.sessionChartsTitle')}
                </h5>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {chartData.totalCounted} {t('calendarView.attendanceRecords')}
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="border-l-4 border-[var(--accent)] bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.sessions')}</p>
                  <p className="text-2xl font-black text-slate-800">{sessionsWithAttendance.length}</p>
                </div>
                <div className="border-l-4 border-emerald-500 bg-emerald-50/60 px-4 py-3">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{t('calendarView.attendedSummary')}</p>
                  <p className="text-2xl font-black text-emerald-700">{chartData.totalAttended}</p>
                </div>
                <div className="border-l-4 border-red-500 bg-red-50/60 px-4 py-3">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{t('calendarView.absentSummary')}</p>
                  <p className="text-2xl font-black text-red-600">{chartData.totalAbsences}</p>
                </div>
                <div className="border-l-4 border-blue-500 bg-blue-50/60 px-4 py-3">
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{t('calendarView.averageAttendance')}</p>
                  <p className="text-2xl font-black text-blue-700">{chartData.averageAttendancePct}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-ranking-star text-emerald-500"></i> {t('calendarView.topAttendance')}
                  </h6>
                  {chartData.topAttendance.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400">{t('playerStatsSummary.noData')}</p>
                  ) : (
                    <div className="space-y-3">
                      {chartData.topAttendance.map(row => (
                        <ChartBarRow
                          key={row.player.id}
                          label={row.player.apodo || row.player.nombre}
                          value={row.attendancePct}
                          max={100}
                          suffix="%"
                          barClassName="bg-emerald-500"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-user-minus text-red-500"></i> {t('calendarView.topAbsences')}
                  </h6>
                  {chartData.topAbsences.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400">{t('calendarView.noAbsences')}</p>
                  ) : (
                    <div className="space-y-3">
                      {chartData.topAbsences.map(row => (
                        <ChartBarRow
                          key={row.player.id}
                          label={row.player.apodo || row.player.nombre}
                          value={row.absences}
                          max={chartData.maxAbsences}
                          barClassName="bg-red-500"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-circle-question text-amber-500"></i> {t('calendarView.absenceReasonsChart')}
                  </h6>
                  {chartData.reasonTotals.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400">{t('calendarView.noAbsences')}</p>
                  ) : (
                    <div className="space-y-3">
                      {chartData.reasonTotals.map(({ reason, total }) => (
                        <ChartBarRow
                          key={reason}
                          label={t(reasonTranslationKey(reason))}
                          value={total}
                          max={chartData.maxAbsences}
                          barClassName="bg-amber-500"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {Object.entries(rowsByPosition).map(([position, positionRows]) => (
              <div key={position}>
                <div className="px-6 py-3 bg-gradient-to-r from-[var(--accent)]/10 to-transparent border-l-4 border-[var(--accent)] mb-3">
                  <h5 className="text-sm font-black text-slate-700 uppercase tracking-widest">{position}</h5>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-100">
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colNumber')}</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colPlayer')}</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colSessionsConvened')}</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colAttendance')}</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colAttendancePct')}</th>
                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colReason')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {positionRows.map(({ player, total, attended, absences, attendancePct, reasonCounts }) => (
                        <tr key={player.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 text-sm font-black text-slate-500">{player.dorsal ?? '—'}</td>
                          <td className="px-6 py-4">
                            <p className="font-black text-black text-sm">{player.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{player.posicionJuego || player.posicion}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-500">{total}</td>
                          <td className="px-6 py-4 text-sm font-black">
                            <span className="text-emerald-600">{attended}</span>
                            <span className="text-slate-300"> / </span>
                            <span className="text-red-500">{absences}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${attendancePct >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : attendancePct >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                              {attendancePct}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">
                            {absences === 0 ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              REASONS.filter(r => reasonCounts[r]).map(r => (
                                <span key={r} className="inline-block mr-3">
                                  {t(reasonTranslationKey(r))}: {reasonCounts[r]}
                                </span>
                              ))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionAttendanceSummary;
