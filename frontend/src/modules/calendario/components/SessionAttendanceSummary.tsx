import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '@modules/plantilla';
import type { AttendanceStatus, CalendarEvent } from '../types';

interface SessionAttendanceSummaryProps {
  events: CalendarEvent[];
  players: Player[];
  filterDateFrom?: string;
  filterDateTo?: string;
  onFilterDateFromChange?: (date: string) => void;
  onFilterDateToChange?: (date: string) => void;
}

const REASONS: AttendanceStatus[] = ['Lesión', 'Vacaciones', 'Descanso', 'No justificada', 'Otro'];

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
    () => events.filter(e => e.attendance && Object.keys(e.attendance).length > 0),
    [events]
  );

  const rows = useMemo(() => {
    return players.map(player => {
      const pid = String(player.id);
      let attended = 0;
      const reasonCounts: Record<string, number> = {};
      sessionsWithAttendance.forEach(session => {
        const status = session.attendance?.[pid] || 'Si';
        if (status === 'Si') {
          attended += 1;
        } else {
          reasonCounts[status] = (reasonCounts[status] || 0) + 1;
        }
      });
      const total = sessionsWithAttendance.length;
      const absences = total - attended;
      const attendancePct = total > 0 ? Math.round((attended / total) * 100) : 0;
      return { player, total, attended, absences, attendancePct, reasonCounts };
    });
  }, [players, sessionsWithAttendance]);

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
                {rows.map(({ player, total, attended, absences, attendancePct, reasonCounts }) => (
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
                            {t(`calendarView.attend${r === 'Lesión' ? 'Injury' : r === 'Vacaciones' ? 'Vacation' : r === 'Descanso' ? 'Rest' : r === 'No justificada' ? 'Unjustified' : 'Other'}`)}: {reasonCounts[r]}
                          </span>
                        ))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionAttendanceSummary;
