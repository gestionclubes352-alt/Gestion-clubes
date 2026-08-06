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

  const positionColors: Record<string, { badge: string; bg: string; border: string; text: string; icon: string }> = {
    'POR': { badge: 'bg-yellow-400', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'GK' },
    'Portero': { badge: 'bg-yellow-400', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'GK' },
    'Defensa': { badge: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'DF' },
    'Central': { badge: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'DF' },
    'Lateral': { badge: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'DF' },
    'Lateral izquierdo': { badge: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'DF' },
    'Lateral derecho': { badge: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'DF' },
    'DFC': { badge: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'DF' },
    'DF': { badge: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'DF' },
    'Centrocampista': { badge: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'MF' },
    'MC': { badge: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'MF' },
    'MF': { badge: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'MF' },
    'Delantero': { badge: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'ST' },
    'DC': { badge: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'ST' },
    'ST': { badge: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'ST' },
  };

  const getPositionColor = (player: Player) => {
    const pos = player.posicionJuego || player.posicion || '';
    for (const [key, value] of Object.entries(positionColors)) {
      if (pos.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(pos.toLowerCase())) {
        return value;
      }
    }
    return { badge: 'bg-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'MS' };
  };

  const groupPlayersByDemarcation = (playersList: Player[]) => {
    const grouped = new Map<string, Player[]>();
    const demarcations = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];

    playersList.forEach(p => {
      const pos = (p.posicionJuego || p.posicion || '').toLowerCase();
      let demarcation = 'Otros';

      if (pos.includes('portero') || pos.includes('por') || pos === 'gk') {
        demarcation = 'Portero';
      } else if (pos.includes('defensa') || pos.includes('central') || pos.includes('lateral') || pos.includes('df') || pos === 'dfc') {
        demarcation = 'Defensa';
      } else if (pos.includes('centrocampista') || pos.includes('medio') || pos.includes('mf') || pos === 'mc' || pos.includes('mco') || pos.includes('mcd')) {
        demarcation = 'Centrocampista';
      } else if (pos.includes('delantero') || pos.includes('st') || pos === 'dc') {
        demarcation = 'Delantero';
      }

      if (!grouped.has(demarcation)) grouped.set(demarcation, []);
      grouped.get(demarcation)!.push(p);
    });

    const result: [string, Player[]][] = [];
    demarcations.forEach(d => {
      if (grouped.has(d)) result.push([d, grouped.get(d)!]);
    });
    if (grouped.has('Otros')) result.push(['Otros', grouped.get('Otros')!]);
    return result;
  };

  const attendingPlayers = players.filter(p => getStatus(p.id) === 'Si');
  const groupedAttending = groupPlayersByDemarcation(attendingPlayers);

  return (
    <div className="space-y-6">
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
          <div className="space-y-3 max-h-140 overflow-y-auto pr-2">
            {groupedAttending.length === 0 && players.length > 0 && (
              <div className="text-center text-slate-400 text-sm font-bold py-4">{t('calendarView.allAbsent')}</div>
            )}

            {groupedAttending.map(([positionGroup, posPlayers]) => (
              <div key={positionGroup} className="space-y-2">
                {posPlayers.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-4 mb-2 pt-2">
                      {(() => {
                        const colors = getPositionColor(posPlayers[0]);
                        return (
                          <>
                            <div className={`${colors.badge} text-white text-[10px] font-black px-2.5 py-1 rounded-lg`}>
                              {colors.icon}
                            </div>
                            <h5 className={`${colors.text} font-black text-[11px] uppercase tracking-widest`}>{positionGroup}</h5>
                          </>
                        );
                      })()}
                    </div>
                    {posPlayers.map((player) => {
                      const colors = getPositionColor(player);
                      return (
                        <div key={player.id} className={`flex items-center justify-between ${colors.bg} rounded-xl p-3 border ${colors.border}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`${colors.badge} text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-[11px]`}>
                              {player.dorsal || player.nombre.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-black text-black truncate">{player.nombre}</p>
                              <p className="text-[10px] text-slate-400 font-bold truncate">{player.posicionJuego || player.posicion}</p>
                            </div>
                          </div>
                          <select
                            value="Si"
                            onChange={(e) => setStatus(player.id, e.target.value as AttendanceStatus)}
                            className={`px-3 py-2 rounded-xl border ${colors.border} ${colors.text} ${colors.bg} text-xs font-black`}
                          >
                            <option value="Si">{t('calendarView.attendYes')}</option>
                            <option value="Lesión">{t('calendarView.attendInjury')}</option>
                            <option value="Vacaciones">{t('calendarView.attendVacation')}</option>
                            <option value="Descanso">{t('calendarView.attendRest')}</option>
                            <option value="No justificada">{t('calendarView.attendUnjustified')}</option>
                            <option value="Otro">{t('calendarView.other')}</option>
                          </select>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ))}

            {(() => {
              const absentPlayers = players.filter(p => getStatus(p.id) !== 'Si');
              if (absentPlayers.length === 0) return null;

              const groupedAbsent = groupPlayersByDemarcation(absentPlayers);
              return (
                <>
                  <div className="flex items-center gap-2 mt-6 mb-3 pt-4 border-t border-slate-200">
                    <i className="fa-solid fa-user-xmark text-red-500"></i>
                    <h4 className="text-red-600 font-black text-sm uppercase tracking-widest">{t('calendarView.absences')}</h4>
                    <span className="ml-auto text-[10px] font-black text-red-400">{absentPlayers.length}</span>
                  </div>
                  {groupedAbsent.map(([positionGroup, posPlayers]) => (
                    <div key={`absent-${positionGroup}`} className="space-y-2">
                      <div className="flex items-center gap-2 mt-2 mb-2">
                        <div className="bg-red-400 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">DF</div>
                        <h5 className="text-red-600 font-black text-[11px] uppercase tracking-widest">{positionGroup}</h5>
                      </div>
                      {posPlayers.map((player) => {
                        const status = getStatus(player.id);
                        return (
                          <div key={player.id} className="flex items-center justify-between bg-red-50 rounded-xl p-3 border border-red-200">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-red-400 text-white flex items-center justify-center font-black text-[11px]">
                                {player.dorsal || player.nombre.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-black text-red-700 truncate">{player.nombre}</p>
                                <p className="text-[10px] text-slate-400 font-bold truncate">{player.posicionJuego || player.posicion}</p>
                              </div>
                            </div>
                            <select
                              value={status}
                              onChange={(e) => setStatus(player.id, e.target.value as AttendanceStatus)}
                              className="px-3 py-2 rounded-xl border border-red-200 text-red-700 bg-red-50 text-xs font-black"
                            >
                              <option value="Si">{t('calendarView.attendYes')}</option>
                              <option value="Lesión">{t('calendarView.attendInjury')}</option>
                              <option value="Vacaciones">{t('calendarView.attendVacation')}</option>
                              <option value="Descanso">{t('calendarView.attendRest')}</option>
                              <option value="No justificada">{t('calendarView.attendUnjustified')}</option>
                              <option value="Otro">{t('calendarView.other')}</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionAttendancePanel;
