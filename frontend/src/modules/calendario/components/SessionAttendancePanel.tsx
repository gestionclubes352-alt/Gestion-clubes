import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '@modules/plantilla';
import type { AttendanceStatus } from '../types';
import SearchableSelect from '@shared/components/SearchableSelect';

interface SessionAttendancePanelProps {
  players: Player[];
  additionalPlayers?: Player[];
  attendance: Record<string, AttendanceStatus>;
  onChange: (attendance: Record<string, AttendanceStatus>) => void;
  selectiveAttendance?: boolean;
}

const SessionAttendancePanel: React.FC<SessionAttendancePanelProps> = ({ players, additionalPlayers = [], attendance, onChange, selectiveAttendance = false }) => {
  const { t } = useTranslation();

  const getStatus = (playerId: string | number): AttendanceStatus => attendance[String(playerId)] || 'Si';

  const setStatus = (playerId: string | number, status: AttendanceStatus) => {
    onChange({ ...attendance, [String(playerId)]: status });
  };

  const setAttending = (playerId: string | number, attending: boolean) => {
    const next = { ...attendance };
    if (attending) {
      next[String(playerId)] = 'Si';
    } else {
      delete next[String(playerId)];
    }
    onChange(next);
  };

  const removeAdditionalPlayer = (playerId: string | number) => {
    const next = { ...attendance };
    delete next[String(playerId)];
    onChange(next);
  };

  const basePlayerIds = useMemo(() => new Set(players.map(p => String(p.id))), [players]);
  const uniqueAdditionalPlayers = useMemo(
    () => additionalPlayers.filter(p => !basePlayerIds.has(String(p.id))),
    [additionalPlayers, basePlayerIds]
  );

  const selectedAdditionalPlayers = useMemo(
    () => uniqueAdditionalPlayers.filter(p => selectiveAttendance
      ? attendance[String(p.id)] === 'Si'
      : Boolean(attendance[String(p.id)])
    ),
    [uniqueAdditionalPlayers, attendance, selectiveAttendance]
  );

  const allSelectablePlayers = useMemo(
    () => selectiveAttendance ? [...players, ...uniqueAdditionalPlayers] : players,
    [players, uniqueAdditionalPlayers, selectiveAttendance]
  );

  const { attendedCount, absentCount } = useMemo(() => {
    const countedPlayers = selectiveAttendance ? allSelectablePlayers : [...players, ...selectedAdditionalPlayers];
    const attended = selectiveAttendance
      ? countedPlayers.filter(p => attendance[String(p.id)] === 'Si').length
      : countedPlayers.filter(p => getStatus(p.id) === 'Si').length;
    return { attendedCount: attended, absentCount: countedPlayers.length - attended };
  }, [players, allSelectablePlayers, selectedAdditionalPlayers, attendance, selectiveAttendance]);

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

  const attendingPlayers = selectiveAttendance
    ? allSelectablePlayers.filter(p => attendance[String(p.id)] === 'Si')
    : [...players, ...selectedAdditionalPlayers].filter(p => getStatus(p.id) === 'Si');
  const availablePlayers = selectiveAttendance
    ? allSelectablePlayers.filter(p => attendance[String(p.id)] !== 'Si')
    : uniqueAdditionalPlayers.filter(p => !attendance[String(p.id)]);
  const groupedAttending = groupPlayersByDemarcation(attendingPlayers);
  const groupedAvailable = groupPlayersByDemarcation(availablePlayers);
  const isAdditionalPlayer = (player: Player) => !basePlayerIds.has(String(player.id));
  const getPlayerMeta = (player: Player) =>
    [player.posicionJuego || player.posicion, isAdditionalPlayer(player) ? player.equipo : '']
      .filter(Boolean)
      .join(' - ');

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
            {!selectiveAttendance && (
              <span className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[11px] font-black uppercase tracking-widest">
                {t('calendarView.absentSummary')}: {absentCount}
              </span>
            )}
          </div>
        </div>

        {players.length === 0 && uniqueAdditionalPlayers.length === 0 ? (
          <div className="text-center text-slate-400 text-sm font-black uppercase tracking-widest py-10">{t('calendarView.noPlayers')}</div>
        ) : (
          <div className="space-y-3 max-h-140 overflow-y-auto pr-2">
            {groupedAttending.length === 0 && (players.length > 0 || uniqueAdditionalPlayers.length > 0) && (
              <div className="text-center text-slate-400 text-sm font-bold py-4">
                {selectiveAttendance ? t('calendarView.noPlayersSelected') : t('calendarView.allAbsent')}
              </div>
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
                              <p className="text-[10px] text-slate-400 font-bold truncate">{getPlayerMeta(player)}</p>
                            </div>
                          </div>
                          {selectiveAttendance ? (
                            <button
                              type="button"
                              onClick={() => setAttending(player.id, false)}
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-black hover:text-red-600 hover:border-red-200"
                            >
                              {t('calendarView.removePlayer')}
                            </button>
                          ) : (
                            <>
                            <SearchableSelect
                              value={getStatus(player.id)}
                              onChange={(e) => setStatus(player.id, e.target.value as AttendanceStatus)}
                              className={`px-3 py-2 rounded-xl border ${colors.border} ${colors.text} ${colors.bg} text-xs font-black`}
                            >
                              <option value="Si">{t('calendarView.attendYes')}</option>
                              <option value="Lesión">{t('calendarView.attendInjury')}</option>
                              <option value="Vacaciones">{t('calendarView.attendVacation')}</option>
                              <option value="Descanso">{t('calendarView.attendRest')}</option>
                              <option value="No justificada">{t('calendarView.attendUnjustified')}</option>
                              <option value="Otro">{t('calendarView.other')}</option>
                            </SearchableSelect>
                            {isAdditionalPlayer(player) && (
                              <button
                                type="button"
                                onClick={() => removeAdditionalPlayer(player.id)}
                                className="ml-2 w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-red-600 hover:border-red-200"
                                title={t('calendarView.removePlayer')}
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ))}

            {groupedAvailable.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-6 mb-3 pt-4 border-t border-slate-200">
                  <i className="fa-solid fa-user-plus text-slate-400"></i>
                  <h4 className="text-slate-500 font-black text-sm uppercase tracking-widest">
                    {selectiveAttendance ? t('calendarView.availablePlayers') : t('calendarView.externalPlayers')}
                  </h4>
                  <span className="ml-auto text-[10px] font-black text-slate-400">{availablePlayers.length}</span>
                </div>
                {groupedAvailable.map(([positionGroup, posPlayers]) => (
                  <div key={`available-${positionGroup}`} className="space-y-2">
                    <div className="flex items-center gap-2 mt-2 mb-2">
                      <div className="bg-slate-400 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">+</div>
                      <h5 className="text-slate-500 font-black text-[11px] uppercase tracking-widest">{positionGroup}</h5>
                    </div>
                    {posPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-slate-300 text-white flex items-center justify-center font-black text-[11px]">
                            {player.dorsal || player.nombre.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-slate-700 truncate">{player.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-bold truncate">{getPlayerMeta(player)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttending(player.id, true)}
                          className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-100"
                        >
                          {t('calendarView.addPlayer')}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {(() => {
              if (selectiveAttendance) return null;
              const absentPlayers = [...players, ...selectedAdditionalPlayers].filter(p => getStatus(p.id) !== 'Si');
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
                                <p className="text-[10px] text-slate-400 font-bold truncate">{getPlayerMeta(player)}</p>
                              </div>
                            </div>
                            <>
                            <SearchableSelect
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
                            </SearchableSelect>
                            {isAdditionalPlayer(player) && (
                              <button
                                type="button"
                                onClick={() => removeAdditionalPlayer(player.id)}
                                className="ml-2 w-9 h-9 rounded-xl border border-red-200 bg-white text-red-400 hover:text-white hover:bg-red-500"
                                title={t('calendarView.removePlayer')}
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            )}
                            </>
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
