import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from '../types';

interface GestionCalendarViewProps {
  events: CalendarEvent[];
  onCreateEvent?: () => void;
  onClickEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (id: string | number) => void;
  onSaveEvent?: (event: CalendarEvent) => void;
}

const EVENT_BADGE_COLORS: Record<string, string> = {
  Entrenamiento: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Partido: 'bg-red-100 text-red-700 border-red-200',
  Reunión: 'bg-purple-100 text-purple-700 border-purple-200',
  Otro: 'bg-gray-100 text-gray-700 border-gray-200',
  Descanso: 'bg-green-100 text-green-700 border-green-200',
  Actividad: 'bg-amber-100 text-amber-700 border-amber-200',
};

const EVENT_DOT_COLORS: Record<string, string> = {
  Entrenamiento: 'bg-emerald-500',
  Partido: 'bg-red-500',
  Reunión: 'bg-purple-500',
  Otro: 'bg-gray-500',
  Descanso: 'bg-green-500',
  Actividad: 'bg-amber-500',
};

const formatEventLabel = (time?: string, team?: string, fallbackTime = '--:--') => {
  const hour = time || fallbackTime;
  return team ? `${hour} - ${team}` : hour;
};

const GestionCalendarView: React.FC<GestionCalendarViewProps> = ({ events, onCreateEvent, onClickEvent, onDeleteEvent, onSaveEvent }) => {
  const { t, i18n } = useTranslation();
  const monthNames = t('calendarView.months', { returnObjects: true }) as string[];
  const dayNames = t('calendarView.daysAbbr', { returnObjects: true }) as string[];
  const orderedDayNames = useMemo(() => [...dayNames.slice(1), dayNames[0]], [dayNames]);
  const [activeView, setActiveView] = useState<'annual' | 'monthly' | 'weekly' | 'schedule'>('monthly');
  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date();
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [duplicateEvent, setDuplicateEvent] = useState<CalendarEvent | null>(null);
  const [duplicateTargetDate, setDuplicateTargetDate] = useState<Date | null>(null);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const getMonthMatrix = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const matrix: (Date | null)[][] = [];
    let week: (Date | null)[] = [];
    const day = new Date(firstDay);

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
      day.setDate(day.getDate() + 1);
    }

    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      matrix.push(week);
    }

    return matrix;
  };

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const weekStart = useMemo(() => {
    const base = new Date(currentMonth);
    const start = new Date(base);
    start.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return start;
  }, [currentMonth]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    return d;
  }), [weekStart]);

  const eventsByMonth = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach(ev => {
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
      const key = d.getMonth();
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const scheduleDays = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + index);
      return d;
    });
    return days;
  }, [weekStart]);

  const scheduleHours = useMemo(
    () => Array.from({ length: 14 }, (_, index) => 9 + index),
    []
  );

  const parseEventTime = (time?: string) => {
    if (!time) return null;
    const match = String(time).match(/^(\d{1,2})(?::(\d{2}))?/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2] || '0');
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return { hour, minute };
  };

  const renderScheduleGrid = () => {
    const scheduleEvents = scheduleDays.map(date => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      return { date, events: eventsByDay[key] || [] };
    });

    return (
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <div className="min-w-[980px]">
          <div
            className="grid gap-px rounded-2xl overflow-hidden border border-slate-200 bg-slate-200"
            style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}
          >
            <div className="bg-slate-900/95 px-3 py-3"></div>
            {scheduleEvents.map(({ date }) => (
              <div key={date.toISOString()} className="bg-slate-900/95 px-3 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {dayNames[date.getDay()]}
                </p>
                <p className={`text-sm font-black ${isToday(date) ? 'text-[var(--accent)]' : 'text-white'}`}>
                  {date.getDate()}
                </p>
              </div>
            ))}

            {scheduleHours.map(hour => (
              <React.Fragment key={hour}>
                <div className="bg-slate-900/95 px-2 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {scheduleEvents.map(({ date, events: dayEvents }) => {
                  const hourEvents = dayEvents.filter(ev => {
                    const parsed = parseEventTime(ev.time);
                    return parsed && parsed.hour === hour;
                  });

                  return (
                    <div
                      key={`${date.toISOString()}-${hour}`}
                      className={`min-h-14 bg-slate-950/70 p-1.5 ${isToday(date) ? 'bg-red-50/10' : ''}`}
                    >
                      <div className="space-y-1">
                        {hourEvents.map(ev => (
                          <div
                            key={ev.id}
                            onClick={() => {
                              setSelectedEvent(ev);
                              onClickEvent?.(ev);
                            }}
                            className={`rounded-lg px-2 py-1 text-[10px] font-bold truncate cursor-pointer border transition-all hover:shadow-sm ${EVENT_BADGE_COLORS[ev.type] || EVENT_BADGE_COLORS.Otro}`}
                            title={`${formatEventLabel(ev.time, ev.team)} - ${ev.title}`}
                          >
                            <span className="font-black">{formatEventLabel(ev.time || `${String(hour).padStart(2, '0')}:00`, ev.team)}</span> {ev.title}
                          </div>
                        ))}
                        {hourEvents.length === 0 && onCreateEvent && hour === 9 && (
                          <button
                            onClick={() => onCreateEvent()}
                            className="w-full rounded-lg border border-dashed border-slate-700 text-[10px] font-bold text-slate-500 py-2 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                          >
                            + {t('calendarView.newEventButton')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyGrid = () => (
    <div className="flex-1 p-3 md:p-6 overflow-y-auto">
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-3">
        {orderedDayNames.map(day => (
          <div key={day} className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase text-center py-2 tracking-widest">
            {day.slice(0,3)}
          </div>
        ))}
      </div>

      {getMonthMatrix(currentMonth).map((week, i) => (
        <div key={i} className="grid grid-cols-7 gap-1 md:gap-2 mb-1.5 md:mb-2">
          {week.map((date, j) => {
            const inMonth = date && date.getMonth() === currentMonth.getMonth();
            const dayKey = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : '';
            const dayEvents = dayKey ? (eventsByDay[dayKey] || []) : [];

            return (
              <div
                key={j}
                className={`
                  min-h-20 md:min-h-28 rounded-xl border p-1.5 md:p-2 flex flex-col transition-all group
                  ${!inMonth ? 'opacity-20 border-transparent' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}
                  ${dragOverDate && date && date.getTime() === dragOverDate.getTime() ? 'bg-blue-100 border-blue-400 shadow-lg' : ''}
                `}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  if (date) setDragOverDate(date);
                }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedEvent && date) {
                    const newEvent = { ...draggedEvent, id: `${draggedEvent.id}-copy-${Date.now()}`, date };
                    onSaveEvent?.(newEvent);
                    setDraggedEvent(null);
                    setDragOverDate(null);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] md:text-[12px] font-black text-slate-500`}>
                    {date ? date.getDate() : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-bold text-slate-300">{dayEvents.length}</span>
                    )}
                    {inMonth && onCreateEvent && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onCreateEvent(); }}
                        className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:!opacity-100 shadow-sm"
                        title={t('calendarView.newEvent')}
                      >
                        <i className="fa-solid fa-plus text-[8px]"></i>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      draggable
                      className={`
                        rounded-lg px-1 py-0.5 text-[9px] font-bold cursor-move border transition-all hover:shadow-sm flex items-center gap-0.5 select-none
                        ${EVENT_BADGE_COLORS[ev.type] || EVENT_BADGE_COLORS.Otro}
                      `}
                      title={`${formatEventLabel(ev.time, ev.team)} - ${ev.title}`}
                      onDragStart={(e) => {
                        e.dataTransfer!.effectAllowed = 'copy';
                        e.dataTransfer!.setData('text/plain', JSON.stringify(ev));
                        setDraggedEvent(ev);
                      }}
                      onDragEnd={() => {
                        setDraggedEvent(null);
                        setDragOverDate(null);
                      }}
                    >
                      <i className="fa-solid fa-grip-vertical text-[8px] opacity-60 flex-shrink-0"></i>
                      <span
                        className="truncate flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                          onClickEvent?.(ev);
                        }}
                      >
                        <span className="hidden md:inline">{formatEventLabel(ev.time, ev.team)} </span>{ev.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEvent?.(ev.id);
                        }}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        title={t('common.delete')}
                      >
                        <i className="fa-solid fa-xmark text-[8px]" style={{
                          color: ev.type === 'Partido' ? 'rgb(248, 113, 113)' : 'rgb(52, 211, 153)',
                        }}></i>
                      </button>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] font-bold text-slate-400 text-center">
                      {t('calendarView.moreEvents', { count: dayEvents.length - 3 })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderWeeklyGrid = () => {
    const weekEvents = weekDays.map(date => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      return { date, events: eventsByDay[key] || [] };
    });

    return (
      <div className="flex-1 p-3 md:p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekEvents.map(({ date, events: dayEvents }) => {
            const isTodayDate = isToday(date);
            return (
              <div
                key={date.toISOString()}
                className={`rounded-2xl border p-3 min-h-40 ${isTodayDate ? 'border-[var(--accent)]/40 bg-red-50/30' : 'border-slate-100 bg-white'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {dayNames[date.getDay()]}
                    </p>
                    <p className={`text-xl font-black ${isTodayDate ? 'text-[var(--accent)]' : 'text-slate-700'}`}>
                      {date.getDate()}
                    </p>
                  </div>
                  {onCreateEvent && (
                    <button
                      onClick={() => onCreateEvent()}
                      className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
                      title={t('calendarView.newEvent')}
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i>
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium">{t('calendarView.noEvents', 'Sin eventos')}</p>
                  ) : dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setSelectedEvent(ev);
                        onClickEvent?.(ev);
                      }}
                      className={`rounded-lg px-2 py-1 text-[10px] font-bold truncate border cursor-pointer ${EVENT_BADGE_COLORS[ev.type] || EVENT_BADGE_COLORS.Otro}`}
                    >
                      <span className="font-black">{formatEventLabel(ev.time, ev.team)}</span> {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnnualGrid = () => (
    <div className="flex-1 p-3 md:p-6 overflow-y-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {monthNames.map((month, index) => {
          const monthEvents = eventsByMonth[index] || [];
          return (
            <button
              key={month}
              onClick={() => {
                setCurrentMonth(new Date(currentMonth.getFullYear(), index, 1));
                setActiveView('monthly');
              }}
              className={`rounded-2xl border p-4 text-left transition-all hover:shadow-lg ${
                index === currentMonth.getMonth()
                  ? 'border-[var(--accent)]/40 bg-red-50/30'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-slate-700">{month}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                    {monthEvents.length} {t('calendarView.total', 'eventos')}
                  </p>
                </div>
                <i className="fa-solid fa-calendar text-[var(--accent)]"></i>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in flex h-full min-h-[calc(100vh-110px)] flex-col gap-4 pb-6">
      <div className="flex items-center justify-end gap-3 px-1">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveView('monthly')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              activeView === 'monthly'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
            }`}
            aria-label="Vista mensual"
            title="Vista mensual"
          >
            <i className="fa-solid fa-calendar-days"></i>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('annual')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              activeView === 'annual'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
            }`}
            aria-label="Vista anual"
            title="Vista anual"
          >
            <i className="fa-solid fa-calendar"></i>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('weekly')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              activeView === 'weekly'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
            }`}
            aria-label="Vista semanal"
            title="Vista semanal"
          >
            <i className="fa-solid fa-calendar-week"></i>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('schedule')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              activeView === 'schedule'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
            }`}
            aria-label="Vista horaria"
            title="Vista horaria"
          >
            <i className="fa-solid fa-clock"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl min-h-[78vh] flex flex-col overflow-hidden">
          <div className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                if (activeView === 'annual') {
                  setCurrentMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
                } else if (activeView === 'schedule') {
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
                } else {
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                }
              }}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all shadow-sm"
              aria-label="Anterior"
            >
              <i className="fa-solid fa-chevron-left text-sm"></i>
            </button>
            <div className="text-center">
              <h4 className="text-[var(--accent)] font-black text-lg md:text-2xl uppercase tracking-wider">
                {activeView === 'annual'
                  ? String(currentMonth.getFullYear())
                  : `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}
              </h4>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.25em] mt-1">
                {activeView === 'annual'
                  ? 'Vista anual'
                  : activeView === 'weekly'
                    ? 'Vista semanal'
                    : activeView === 'schedule'
                      ? 'Vista horaria'
                    : 'Vista mensual'}
              </p>
            </div>
            <button
              onClick={() => {
                if (activeView === 'annual') {
                  setCurrentMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
                } else if (activeView === 'schedule') {
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
                } else {
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                }
              }}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all shadow-sm"
              aria-label="Siguiente"
            >
              <i className="fa-solid fa-chevron-right text-sm"></i>
            </button>
          </div>

          {activeView === 'annual' && renderAnnualGrid()}
          {activeView === 'monthly' && renderMonthlyGrid()}
          {activeView === 'weekly' && renderWeeklyGrid()}
          {activeView === 'schedule' && renderScheduleGrid()}
        </div>
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${EVENT_DOT_COLORS[selectedEvent.type] || EVENT_DOT_COLORS.Otro}`}></span>
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${EVENT_BADGE_COLORS[selectedEvent.type] || EVENT_BADGE_COLORS.Otro}`}>
                  {selectedEvent.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onDeleteEvent && (
                  <button
                    onClick={() => {
                      onDeleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-400 transition-all hover:border-red-500 hover:bg-red-500 hover:text-white"
                    title={t('calendarView.deleteEvent')}
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                )}
                <button onClick={() => setSelectedEvent(null)} className="text-slate-400 transition-colors hover:text-slate-600">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tight">{selectedEvent.title}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <i className="fa-solid fa-calendar-day text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.date')}</p>
                    <p className="text-sm font-bold text-slate-700">
                      {(selectedEvent.date instanceof Date ? selectedEvent.date : new Date(selectedEvent.date)).toLocaleDateString(i18n.language, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <i className="fa-solid fa-clock text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.time')}</p>
                    <p className="text-sm font-bold text-slate-700">{selectedEvent.time || t('calendarView.noTime')}</p>
                  </div>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <i className="fa-solid fa-location-dot text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.location')}</p>
                      <p className="text-sm font-bold text-slate-700">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.type === 'Partido' && selectedEvent.opponent && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <i className="fa-solid fa-futbol text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.opponent')}</p>
                      <p className="text-sm font-bold text-slate-700">{selectedEvent.opponent}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.notes && (
                  <div className="mt-2 rounded-xl bg-slate-50 p-4">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.notes')}</p>
                    <p className="text-sm text-slate-600">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {duplicateEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setDuplicateEvent(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl animate-fade-in p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-900">Duplicar evento</h3>
              <p className="text-sm text-slate-500 mt-1">{duplicateEvent.title}</p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Array.from({ length: 30 }, (_, i) => {
                const date = new Date(currentMonth);
                date.setDate(date.getDate() + i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      const newEvent = { ...duplicateEvent, id: `${duplicateEvent.id}-copy-${Date.now()}`, date };
                      onSaveEvent?.(newEvent);
                      setDuplicateEvent(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    <p className="font-bold text-slate-700">
                      {date.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setDuplicateEvent(null)}
              className="mt-6 w-full px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionCalendarView;
