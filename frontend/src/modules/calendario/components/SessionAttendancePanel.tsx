import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '@modules/plantilla';
import type { AttendanceStatus } from '../types';

interface SessionAttendancePanelProps {
  players: Player[];
  attendance: Record<string, AttendanceStatus>;
  onChange: (attendance: Record<string, AttendanceStatus>) => void;
}

const SessionAttendancePanel: React.FC<SessionAttendancePanelProps> = ({ players, attendance, onChange }) => {
  const { t } = useTranslation();

  const getStatus = (playerId: string | number): AttendanceStatus => attendance[String(playerId)] || 'Si';

  const setStatus = (playerId: string | number, status: AttendanceStatus) => {
    onChange({ ...attendance, [String(playerId)]: status });
  };

  const { attendedCount, absentCount } = useMemo(() => {
    const attended = players.filter(p => getStatus(p.id) === 'Si').length;
    return { attendedCount: attended, absentCount: players.length - attended };
  }, [players, attendance]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-clipboard-user text-[var(--accent)]"></i>
          <h4 className="text-[var(--accent)] font-black text-lg">{t('calendarView.attendanceDataTitle')}</h4>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black uppercase tracking-widest">
            {t('calendarView.attendedSummary')}: {attendedCount}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[11px] font-black uppercase tracking-widest">
            {t('calendarView.absentSummary')}: {absentCount}
          </span>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="text-center text-slate-400 text-sm font-black uppercase tracking-widest py-10">{t('calendarView.noPlayers')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colNumber')}</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colPlayer')}</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colPosition')}</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colAttendance')}</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colReason')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {players.map(player => {
                const status = getStatus(player.id);
                const attended = status === 'Si';
                return (
                  <tr key={player.id} className={attended ? 'hover:bg-slate-50' : 'bg-red-50/40 hover:bg-red-50'}>
                    <td className="px-4 py-3 text-sm font-black text-slate-500">{player.dorsal ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-black ${attended ? 'text-black' : 'text-red-700'}`}>{player.nombre}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-500">{player.posicionJuego || player.posicion || '—'}</td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={attended}
                          onChange={(e) => setStatus(player.id, e.target.checked ? 'Si' : 'No justificada')}
                          className="w-4 h-4 accent-[var(--accent)]"
                        />
                        <span className={`text-xs font-black ${attended ? 'text-emerald-600' : 'text-red-600'}`}>
                          {attended ? t('calendarView.attendYes') : t('calendarView.absences')}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      {attended ? (
                        <span className="text-xs font-bold text-slate-300">—</span>
                      ) : (
                        <select
                          value={status}
                          onChange={(e) => setStatus(player.id, e.target.value as AttendanceStatus)}
                          className="px-3 py-2 rounded-xl border border-red-200 text-red-700 bg-white text-xs font-black"
                        >
                          <option value="Lesión">{t('calendarView.attendInjury')}</option>
                          <option value="Vacaciones">{t('calendarView.attendVacation')}</option>
                          <option value="Descanso">{t('calendarView.attendRest')}</option>
                          <option value="No justificada">{t('calendarView.attendUnjustified')}</option>
                          <option value="Otro">{t('calendarView.other')}</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SessionAttendancePanel;
