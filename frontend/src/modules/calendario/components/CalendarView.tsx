import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Player } from '@modules/plantilla';
import NewEventModal from './NewEventModal';

interface CalendarViewProps {
  events: CalendarEvent[];
  squad?: Player[];
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  competitionTeams?: CompetitionTeam[];
}

const getDefaultTrainingEvent = (events: CalendarEvent[]): CalendarEvent | null => {
  const trainings = events
    .filter(e => e.type === 'Entrenamiento' || e.type === 'Sesión')
    .sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return da.getTime() - db.getTime();
    });
  return trainings[0] ?? null;
};

const CalendarView: React.FC<CalendarViewProps> = ({ events, squad = [], onSaveEvent, onDeleteEvent, onEditEvent, competitionTeams }) => {
  const { t, i18n } = useTranslation();
  const [showNewModal, setShowNewModal] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activeTraining, setActiveTraining] = useState<CalendarEvent | null>(null);
  const [rolesText, setRolesText] = useState('');
  const [notesText, setNotesText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [attendance, setAttendance] = useState<Record<number, 'Si' | 'Lesión' | 'Vacaciones' | 'Descanso' | 'No justificada' | 'Otro'>>({});

  const monthNames = t('calendarView.months', { returnObjects: true }) as string[];
  const dayNamesLong = t('calendarView.daysLong', { returnObjects: true }) as string[];
  const orderedDayNamesLong = useMemo(() => [...dayNamesLong.slice(1), dayNamesLong[0]], [dayNamesLong]);

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (vimeoMatch) {
      const id = vimeoMatch[1];
      const hash = vimeoMatch[2];
      return hash ? `https://player.vimeo.com/video/${id}?h=${hash}` : `https://player.vimeo.com/video/${id}`;
    }
    return url;
  };

  const filteredEvents = useMemo(() => {
    return events
      .filter(e => e.type === 'Entrenamiento' || e.type === 'Sesión')
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        return da.getTime() - db.getTime();
      });
  }, [events]);

  useEffect(() => {
    if (!activeTraining) return;
    setRolesText(activeTraining.staffRoles || '');
    setNotesText(activeTraining.notes || '');
    setVideoUrl(activeTraining.videoUrl || '');
    setDocUrl(activeTraining.docUrl || '');
    setAttendance({});
  }, [activeTraining]);

  const handleSaveSession = () => {
    if (!activeTraining) return;
    onSaveEvent({
      ...activeTraining,
      notes: notesText,
      videoUrl,
      docUrl,
      staffRoles: rolesText
    });
  };

  const formatLongDate = (date: Date) => {
    return `${dayNamesLong[date.getDay()]}, ${date.getDate()} de ${monthNames[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
  };

  // --- CALENDARIO MENSUAL ---
  const getMonthMatrix = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const matrix = [];
    let week = [];
    let day = new Date(firstDay);
    // Rellenar días previos al primer día del mes (semana empieza en lunes)
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < leadingBlanks; i++) {
      week.push(null);
    }
    while (day <= lastDay) {
      week.push(new Date(day));
      if (week.length === 7) {
        matrix.push(week);
        week = [];
      }
      day = new Date(day);
      day.setDate(day.getDate() + 1);
    }
    // Rellenar días restantes de la última semana
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      matrix.push(week);
    }
    return matrix;
  };

  const eventsByDay = useMemo(() => {
    const map = {} as Record<string, CalendarEvent[]>;
    events.forEach(ev => {
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  // --- FIN CALENDARIO MENSUAL ---

  if (activeTraining) {
    const sessionDate = activeTraining.date instanceof Date ? activeTraining.date : new Date(activeTraining.date);
    return (
      <div className="animate-fade-in space-y-6 h-full flex flex-col relative pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTraining(null)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-sport-primary shadow-sm flex items-center gap-2">
              <i className="fa-solid fa-arrow-left"></i> {t('calendarView.back')}
            </button>
            <div>
              <h3 className="text-[var(--accent)] font-black text-2xl uppercase tracking-tight">{t('calendarView.session')}</h3>
              <p className="text-slate-400 text-sm font-bold">{formatLongDate(sessionDate)} • {activeTraining.time}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSaveSession} className="bg-[#1a4f9c] hover:bg-[#143e7b] text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
              <i className="fa-solid fa-floppy-disk"></i> {t('common.save')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h4 className="text-[var(--accent)] font-black text-lg mb-4">{t('calendarView.information')}</h4>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[var(--accent)]"><i className="fa-solid fa-calendar-day"></i></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.date')}</p>
                    <p className="font-black text-black">{sessionDate.toLocaleDateString(i18n.language)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[var(--accent)]"><i className="fa-solid fa-clock"></i></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.time')}</p>
                    <p className="font-black text-black">{activeTraining.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[var(--accent)]"><i className="fa-solid fa-location-dot"></i></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.location')}</p>
                    <p className="font-black text-black">{activeTraining.location || t('calendarView.notDefined')}</p>
                  </div>
                </div>
                {activeTraining.team && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[var(--accent)]"><i className="fa-solid fa-shield-halved"></i></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('newEvent.team')}</p>
                      <p className="font-black text-black">{activeTraining.team}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h4 className="text-[var(--accent)] font-black text-lg">{t('calendarView.resources')}</h4>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.video')}</label>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={t('calendarView.videoUrl')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
                />
                {videoUrl && (
                  <div className="aspect-video rounded-xl overflow-hidden border border-slate-100">
                    <iframe
                      title="video"
                      src={getVideoEmbedUrl(videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
                {videoUrl && (
                  <a
                    className="text-[11px] font-black text-[var(--accent)] underline"
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('calendarView.openVideoNewTab')}
                  </a>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('calendarView.pdf')}</label>
                <input
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder={t('calendarView.docUrl')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
                />
                {docUrl && (
                  <div className="aspect-4/3 rounded-xl overflow-hidden border border-slate-100">
                    <iframe title="pdf" src={docUrl} className="w-full h-full"></iframe>
                  </div>
                )}
                {docUrl && (
                  <a
                    className="text-[11px] font-black text-[var(--accent)] underline"
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('calendarView.openPdfNewTab')}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-user-group text-[var(--accent)]"></i>
              <h4 className="text-[var(--accent)] font-black text-lg">{t('calendarView.attendanceTitle')}</h4>
            </div>
            <div className="space-y-3 max-h-140 overflow-y-auto pr-2 min-h-140">
              {squad.filter(p => (attendance[p.id] || 'Si') === 'Si').map((player) => (
                <div key={player.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-black text-[11px]">
                      {player.dorsal || player.nombre.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-black text-black truncate">{player.nombre}</p>
                      <p className="text-[10px] text-slate-400 font-bold truncate">{player.posicionJuego || player.posicion}</p>
                    </div>
                  </div>
                  <select
                    value="Si"
                    onChange={(e) => setAttendance(prev => ({ ...prev, [player.id]: e.target.value as 'Si' | 'Lesión' | 'Vacaciones' | 'Descanso' | 'No justificada' | 'Otro' }))}
                    className="px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 text-xs font-black"
                  >
                    <option value="Si">{t('calendarView.attendYes')}</option>
                    <option value="Lesión">{t('calendarView.attendInjury')}</option>
                    <option value="Vacaciones">{t('calendarView.attendVacation')}</option>
                    <option value="Descanso">{t('calendarView.attendRest')}</option>
                    <option value="No justificada">{t('calendarView.attendUnjustified')}</option>
                    <option value="Otro">{t('calendarView.other')}</option>
                  </select>
                </div>
              ))}
              {squad.filter(p => (attendance[p.id] || 'Si') === 'Si').length === 0 && squad.length > 0 && (
                <div className="text-center text-slate-400 text-sm font-bold py-4">{t('calendarView.allAbsent')}</div>
              )}
              {squad.length === 0 && (
                <div className="h-full min-h-125 flex items-center justify-center text-center text-slate-400 text-3xl font-black uppercase tracking-widest">{t('calendarView.noPlayers')}</div>
              )}

              {/* AUSENCIAS */}
              {squad.filter(p => (attendance[p.id] || 'Si') !== 'Si').length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-6 mb-2 pt-4 border-t border-slate-200">
                    <i className="fa-solid fa-user-xmark text-red-500"></i>
                    <h4 className="text-red-600 font-black text-sm uppercase tracking-widest">{t('calendarView.absences')}</h4>
                    <span className="ml-auto text-[10px] font-black text-red-400">{squad.filter(p => (attendance[p.id] || 'Si') !== 'Si').length}</span>
                  </div>
                  {squad.filter(p => (attendance[p.id] || 'Si') !== 'Si').map((player) => {
                    const status = attendance[player.id] || 'Si';
                    return (
                      <div key={player.id} className="flex items-center justify-between bg-red-50 rounded-xl p-3">
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
                          onChange={(e) => setAttendance(prev => ({ ...prev, [player.id]: e.target.value as 'Si' | 'Lesión' | 'Vacaciones' | 'Descanso' | 'No justificada' | 'Otro' }))}
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
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-user-gear text-[var(--accent)]"></i>
              <h4 className="text-[var(--accent)] font-black text-lg">{t('calendarView.staffRoles')}</h4>
              </div>
              <textarea
                value={rolesText}
                onChange={(e) => setRolesText(e.target.value)}
                rows={6}
                placeholder={t('calendarView.staffRolesPlaceholder')}
                className="w-full resize-none rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-600"
              />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h4 className="text-[var(--accent)] font-black text-lg mb-4">{t('calendarView.notesTitle')}</h4>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={6}
                placeholder={t('calendarView.notesPlaceholder')}
                className="w-full resize-none rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-600"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-in space-y-8 flex flex-col relative pb-10 ${fullscreen ? 'fixed inset-0 z-50 bg-white h-screen w-screen p-6 overflow-auto' : 'h-full'}` }>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sport-primary font-black text-3xl uppercase tracking-tighter">{t('calendarView.technicalCalendar')}</h3>
          <p className="text-slate-300 text-sm font-bold mt-1">{t('calendarView.technicalCalendarDesc')}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={() => setShowNewModal(true)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-200">
            <i className="fa-solid fa-plus"></i> {t('calendarView.newEventButton')}
          </button>
        </div>
      </div>

      <div className="flex-1 w-full">
        <div className="bg-white rounded-4xl border border-slate-100 shadow-xl min-h-125 flex flex-col overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <h4 className="text-[var(--accent)] font-black text-sm uppercase tracking-widest">{ t('calendarView.monthlyCalendar')}</h4>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[var(--accent)] font-black"><i className="fa-solid fa-chevron-left"></i></button>
              <span className="font-black text-[var(--accent)] text-lg">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[var(--accent)] font-black"><i className="fa-solid fa-chevron-right"></i></button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {orderedDayNamesLong.map(day => (
                <div key={day} className="text-xs font-black text-slate-400 uppercase text-center py-2">{day.slice(0,3)}</div>
              ))}
            </div>
            {getMonthMatrix(currentMonth).map((week, i) => (
              <div key={i} className="grid grid-cols-7 gap-2 mb-2">
                {week.map((date, j) => (
                  <div key={j} className={`min-h-20 rounded-xl border border-slate-100 bg-slate-50 p-1 flex flex-col relative ${date && date.getMonth() === currentMonth.getMonth() ? '' : 'opacity-30'}`}>
                    {date && date.getMonth() === currentMonth.getMonth() && (
                      <button
                        className="absolute top-1 left-1 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-[14px] shadow-md z-10"
                        style={{ fontSize: '16px' }}
                        onClick={() => { setShowNewModal(true); }}
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    )}
                    <div className="text-[11px] font-black text-[var(--accent)] text-right pr-1">{date ? date.getDate() : ''}</div>
                    <div className="flex-1 flex flex-col gap-1">
                      {date && eventsByDay[`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`]?.map(ev => (
                        <div key={ev.id} className="bg-red-100 text-red-800 rounded px-1.5 py-1 text-[11px] font-bold truncate cursor-pointer hover:bg-red-200 flex items-center gap-1 group/ev" title={ev.title}>
                          <span className="truncate flex-1 leading-tight" onClick={() => setActiveTraining(ev)}>
                            {ev.time}{ev.team ? ` - ${ev.team}` : ''}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteEvent(String(ev.id)); }}
                            className="hidden group-hover/ev:flex w-3.5 h-3.5 items-center justify-center rounded-full text-red-400 hover:text-white hover:bg-red-500 flex-shrink-0 transition-all"
                            title={t('common.delete')}
                          >
                            <i className="fa-solid fa-xmark" style={{ fontSize: '8px' }}></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LISTADO DE SESIONES */}
      {filteredEvents.length > 0 && (
        <div className="w-full">
          <div className="bg-white rounded-4xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h4 className="text-[var(--accent)] font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-person-running"></i> {t('calendarView.sessionsTitle')}
              </h4>
              <span className="text-xs font-black text-slate-400">{filteredEvents.length} {t('calendarView.sessionsCount')}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredEvents.map((ev) => {
                const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
                return (
                  <div
                    key={ev.id}
                    className="w-full flex items-center gap-4 px-10 py-4 hover:bg-slate-50 transition text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex flex-col items-center justify-center flex-shrink-0 shadow cursor-pointer" onClick={() => setActiveTraining(ev)}>
                      <span className="text-[10px] font-black uppercase leading-none">{monthNames[d.getMonth()].slice(0, 3)}</span>
                      <span className="text-lg font-black leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setActiveTraining(ev)}>
                        <p className="font-black text-[var(--accent)] text-base md:text-lg truncate group-hover:underline leading-tight">
                          {ev.title || t('calendarView.sessionDefault')}
                          {ev.sessionNumber ? ` — ${t('calendarView.sessionNumber')} ${ev.sessionNumber}` : ''}
                        </p>
                      <p className="text-sm text-slate-400 font-bold">
                        {d.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {ev.time}{ev.team ? ` - ${ev.team}` : ''}
                        {ev.location ? ` • ${ev.location}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => onDeleteEvent(String(ev.id))}
                      className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title={t('common.delete')}
                    >
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                    <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-[var(--accent)] transition cursor-pointer" onClick={() => setActiveTraining(ev)}></i>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showNewModal && <NewEventModal initialDate={new Date()} onClose={() => setShowNewModal(false)} onSave={onSaveEvent} competitionTeams={competitionTeams} />}
    </div>
  );
};

export default CalendarView;
