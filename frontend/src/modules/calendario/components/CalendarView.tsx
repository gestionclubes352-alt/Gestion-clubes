import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AttendanceStatus, CalendarEvent, SessionTask } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Player } from '@modules/plantilla';
import { db } from '@shared/services/dataService';
import type { TrainingTask } from '@modules/repositorio-tareas';
import NewEventModal from './NewEventModal';
import SessionTasksPanel from './SessionTasksPanel';
import SessionAttendancePanel from './SessionAttendancePanel';
import SessionAttendanceSummary from './SessionAttendanceSummary';
import MatchReportView from '@modules/partidos/components/MatchReportView';

interface CalendarViewProps {
  events: CalendarEvent[];
  squad?: Player[];
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  competitionTeams?: CompetitionTeam[];
  ownClubId?: string;
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

const CalendarView: React.FC<CalendarViewProps> = ({ events, squad = [], onSaveEvent, onDeleteEvent, onEditEvent, competitionTeams, ownClubId }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNewModal, setShowNewModal] = useState(false);
  const [defaultEventType, setDefaultEventType] = useState<'Sesión' | 'Partido' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activeTraining, setActiveTraining] = useState<CalendarEvent | null>(null);
  const [activeMatch, setActiveMatch] = useState<CalendarEvent | null>(null);
  const [detailTab, setDetailTab] = useState<'datos' | 'sesion' | 'asistencias'>('datos');
  const [rolesText, setRolesText] = useState('');
  const [notesText, setNotesText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [sessionTasks, setSessionTasks] = useState<SessionTask[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  // Evita que el tab vuelva a "Datos" cuando reabrimos la sesión tras crear una tarea en el diseñador
  const skipDatosResetRef = useRef(false);

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

  const availableTeams = useMemo(() => {
    const teams = new Set<string>();
    events.forEach(e => {
      if ((e.type === 'Entrenamiento' || e.type === 'Sesión') && e.team) {
        teams.add(e.team);
      }
    });
    return Array.from(teams).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events
      .filter(e => e.type === 'Entrenamiento' || e.type === 'Sesión')
      .filter(e => teamFilter === 'all' || e.team === teamFilter)
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        return da.getTime() - db.getTime();
      });
  }, [events, teamFilter]);

  useEffect(() => {
    const state = location.state as { openEventId?: string; newTaskId?: string } | null;
    const openEventId = state?.openEventId;
    const newTaskId = state?.newTaskId;
    if (!openEventId && !newTaskId) return;

    const applyIncomingState = async () => {
      let target = openEventId ? events.find(e => String(e.id) === String(openEventId)) : activeTraining;
      if (!target) return;

      if (newTaskId) {
        try {
          const { data } = await db.task_templates.get();
          const newTask = (data as TrainingTask[])?.find(t => t.id === newTaskId);
          if (newTask) {
            const sessionTask: SessionTask = {
              id: `rt-${newTask.id}-${Date.now()}`,
              linkedTaskId: newTask.id,
              title: newTask.name,
              category: newTask.category,
              sessionPhase: 'Parte Principal',
              durationMinutes: 15,
              thumbnail: newTask.thumbnail,
              designerSnapshot: newTask.designerSnapshot,
              fieldStructure: newTask.fieldStructure,
            };
            target = { ...target, tasks: [...(target.tasks || []), sessionTask] };
            // Persistir de inmediato: si el usuario navega fuera sin pulsar "Guardar",
            // la tarea recién creada en el diseñador no debe perderse.
            onSaveEvent(target);
          }
        } catch (err) {
          console.error('Error al cargar la tarea creada:', err);
        }
      }

      if (newTaskId) {
        skipDatosResetRef.current = true;
      }
      setActiveTraining(target);
      if (newTaskId) {
        setDetailTab('sesion');
      }
    };

    applyIncomingState();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, events, location.pathname, navigate, onSaveEvent]);

  useEffect(() => {
    if (!activeTraining) return;
    if (skipDatosResetRef.current) {
      skipDatosResetRef.current = false;
    } else {
      setDetailTab('datos');
    }
    setRolesText(activeTraining.staffRoles || '');
    setNotesText(activeTraining.notes || '');
    setVideoUrl(activeTraining.videoUrl || '');
    setDocUrl(activeTraining.docUrl || '');
    setSessionTasks(activeTraining.tasks || []);
    setAttendance(activeTraining.attendance || {});
  }, [activeTraining]);

  const handleSaveSession = () => {
    if (!activeTraining) return;
    onSaveEvent({
      ...activeTraining,
      notes: notesText,
      videoUrl,
      docUrl,
      staffRoles: rolesText,
      tasks: sessionTasks,
      attendance
    });
  };

  const formatLongDate = (date: Date) => {
    return `${dayNamesLong[date.getDay()]}, ${date.getDate()} de ${monthNames[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'Partido') {
      setActiveMatch(event);
    } else {
      setActiveTraining(event);
    }
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

  if (activeMatch) {
    return (
      <MatchReportView
        match={activeMatch}
        onBack={() => setActiveMatch(null)}
        ownClubId={ownClubId}
        competitionTeams={competitionTeams}
        onSave={(event) => { onSaveEvent(event); setActiveMatch(event); }}
        onDelete={(id) => { onDeleteEvent(String(id)); setActiveMatch(null); }}
      />
    );
  }

  if (activeTraining) {
    const sessionDate = activeTraining.date instanceof Date ? activeTraining.date : new Date(activeTraining.date);
    return (
      <div className="animate-fade-in space-y-6 h-full flex flex-col relative pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => setActiveTraining(null)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-sport-primary shadow-sm flex items-center gap-2">
              <i className="fa-solid fa-arrow-left"></i> {t('calendarView.back')}
            </button>
            <div>
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm mb-1">
                <button
                  type="button"
                  onClick={() => setDetailTab('datos')}
                  className={`px-4 py-1.5 rounded-lg font-black text-sm uppercase tracking-tight transition-all ${
                    detailTab === 'datos' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-[var(--accent)]'
                  }`}
                >
                  {t('calendarView.tabData')}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('sesion')}
                  className={`px-4 py-1.5 rounded-lg font-black text-sm uppercase tracking-tight transition-all ${
                    detailTab === 'sesion' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-[var(--accent)]'
                  }`}
                >
                  {t('calendarView.tabSession')}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('asistencias')}
                  className={`px-4 py-1.5 rounded-lg font-black text-sm uppercase tracking-tight transition-all ${
                    detailTab === 'asistencias' ? 'bg-[var(--accent)] text-white' : 'text-slate-400 hover:text-[var(--accent)]'
                  }`}
                >
                  {t('calendarView.tabAttendance')}
                </button>
              </div>
              <p className="text-slate-400 text-sm font-bold">{formatLongDate(sessionDate)} • {activeTraining.time}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSaveSession} className="bg-[#1a4f9c] hover:bg-[#143e7b] text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
              <i className="fa-solid fa-floppy-disk"></i> {t('common.save')}
            </button>
          </div>
        </div>

        {detailTab === 'sesion' && (
          <SessionTasksPanel
            tasks={sessionTasks}
            onChange={setSessionTasks}
            eventId={activeTraining.id}
            date={sessionDate}
            team={activeTraining.team}
            sessionNumber={activeTraining.sessionNumber}
          />
        )}

        {detailTab === 'asistencias' && (
          <SessionAttendancePanel
            players={squad}
            attendance={attendance}
            onChange={setAttendance}
          />
        )}

        {detailTab === 'datos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        )}
      </div>
    );
  }

  return (
    <div className={`animate-fade-in space-y-8 flex flex-col relative pb-10 ${fullscreen ? 'fixed inset-0 z-50 bg-white h-screen w-screen p-6 overflow-auto' : 'h-full'}` }>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          >
            <option value="all">{t('calendarView.filterAllTeams')}</option>
            {availableTeams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                viewMode === 'table'
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
              }`}
              aria-label={t('calendarView.viewTable')}
              title={t('calendarView.viewTable')}
            >
              <i className="fa-solid fa-table"></i>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                viewMode === 'calendar'
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'text-slate-400 hover:text-[var(--accent)] hover:bg-slate-50'
              }`}
              aria-label={t('calendarView.viewCalendar')}
              title={t('calendarView.viewCalendar')}
            >
              <i className="fa-solid fa-calendar-days"></i>
            </button>
          </div>
          <button onClick={() => { setDefaultEventType('Sesión'); setSelectedDate(new Date()); setShowNewModal(true); }} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-200">
            <i className="fa-solid fa-plus"></i> {t('calendarView.newSessionButton')}
          </button>
        </div>
      </div>

      {viewMode === 'table' && (
        <div className="w-full">
          <div className="bg-white rounded-4xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-4 md:px-10 py-4 md:py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h4 className="text-[var(--accent)] font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-person-running"></i> {t('calendarView.sessionsTitle')}
              </h4>
              <span className="text-xs font-black text-slate-400">{filteredEvents.length} {t('calendarView.sessionsCount')}</span>
            </div>
            {filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-bold text-sm">{t('calendarView.noSessionsFound')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colDate')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colTime')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colTeam')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colSessionType')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colSession')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calendarView.colLocation')}</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">{t('calendarView.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredEvents.map((ev) => {
                      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
                      return (
                        <tr key={ev.id} className="hover:bg-slate-50 transition group">
                          <td className="px-6 py-4 cursor-pointer" onClick={() => handleEventClick(ev)}>
                            <p className="font-black text-slate-700 text-sm capitalize">
                              {d.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-500 cursor-pointer" onClick={() => handleEventClick(ev)}>
                            {ev.time || t('calendarView.noTime')}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-500 cursor-pointer" onClick={() => handleEventClick(ev)}>
                            {ev.team || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-500 cursor-pointer" onClick={() => handleEventClick(ev)}>
                            {ev.type || '—'}
                          </td>
                          <td className="px-6 py-4 cursor-pointer" onClick={() => handleEventClick(ev)}>
                            <p className="font-black text-[var(--accent)] text-sm group-hover:underline">
                              {ev.title || t('calendarView.sessionDefault')}
                              {ev.sessionNumber ? ` — ${t('calendarView.sessionNumber')} ${ev.sessionNumber}` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-500 cursor-pointer" onClick={() => handleEventClick(ev)}>
                            {ev.location || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEventClick(ev)}
                                className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all"
                                title={t('calendarView.session')}
                              >
                                <i className="fa-solid fa-chevron-right text-sm"></i>
                              </button>
                              <button
                                onClick={() => onDeleteEvent(String(ev.id))}
                                className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all"
                                title={t('common.delete')}
                              >
                                <i className="fa-solid fa-trash-can text-sm"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
      <div className="flex-1 w-full">
        <div className="bg-white rounded-4xl border border-slate-100 shadow-xl min-h-125 flex flex-col overflow-hidden">
          <div className="px-4 md:px-10 py-4 md:py-8 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <h4 className="text-[var(--accent)] font-black text-sm uppercase tracking-widest">{ t('calendarView.monthlyCalendar')}</h4>
            <div className="flex gap-2 items-center">
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[var(--accent)] font-black"><i className="fa-solid fa-chevron-left"></i></button>
              <span className="font-black text-[var(--accent)] text-lg">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[var(--accent)] font-black"><i className="fa-solid fa-chevron-right"></i></button>
            </div>
          </div>
          <div className="flex-1 p-3 md:p-6 overflow-y-auto">
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
              {orderedDayNamesLong.map(day => (
                <div key={day} className="text-[9px] md:text-xs font-black text-slate-400 uppercase text-center py-1 md:py-2">{day.slice(0,3)}</div>
              ))}
            </div>
            {getMonthMatrix(currentMonth).map((week, i) => (
              <div key={i} className="grid grid-cols-7 gap-1 md:gap-2 mb-1.5 md:mb-2">
                {week.map((date, j) => (
                  <div key={j} className={`min-h-14 md:min-h-20 rounded-xl border border-slate-100 bg-slate-50 p-1 flex flex-col relative ${date && date.getMonth() === currentMonth.getMonth() ? '' : 'opacity-30'}`}>
                    {date && date.getMonth() === currentMonth.getMonth() && (
                      <button
                        className="absolute top-1 left-1 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-[14px] shadow-md z-10"
                        style={{ fontSize: '16px' }}
                        onClick={() => { setDefaultEventType('Sesión'); setSelectedDate(date); setShowNewModal(true); }}
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    )}
                    <div className="text-[11px] font-black text-[var(--accent)] text-right pr-1">{date ? date.getDate() : ''}</div>
                    <div className="flex-1 flex flex-col gap-1">
                      {date && eventsByDay[`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`]?.map(ev => (
                        <div key={ev.id} className="bg-red-100 text-red-800 rounded px-1.5 py-1 text-[11px] font-bold truncate cursor-pointer hover:bg-red-200 flex items-center gap-1 group/ev" title={ev.title}>
                          <span className="truncate flex-1 leading-tight" onClick={() => handleEventClick(ev)}>
                            {ev.time}{ev.team ? ` - ${ev.team}` : ''}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteEvent(String(ev.id)); }}
                            className="flex sm:hidden sm:group-hover/ev:flex w-3.5 h-3.5 items-center justify-center rounded-full text-red-400 hover:text-white hover:bg-red-500 flex-shrink-0 transition-all"
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
      )}

      {/* LISTADO DE SESIONES */}
      {viewMode === 'calendar' && filteredEvents.length > 0 && (
        <div className="w-full">
          <div className="bg-white rounded-4xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-4 md:px-10 py-4 md:py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
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
                    className="w-full flex items-center gap-4 px-4 md:px-10 py-3 md:py-4 hover:bg-slate-50 transition text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex flex-col items-center justify-center flex-shrink-0 shadow cursor-pointer" onClick={() => handleEventClick(ev)}>
                      <span className="text-[10px] font-black uppercase leading-none">{monthNames[d.getMonth()].slice(0, 3)}</span>
                      <span className="text-lg font-black leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEventClick(ev)}>
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
                      className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0"
                      title={t('common.delete')}
                    >
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                    <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-[var(--accent)] transition cursor-pointer" onClick={() => handleEventClick(ev)}></i>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <SessionAttendanceSummary events={filteredEvents} players={squad} />

      {showNewModal && (
        <NewEventModal
          initialDate={selectedDate}
          defaultType={defaultEventType}
          onClose={() => { setShowNewModal(false); setDefaultEventType(null); }}
          onSave={(newEvent) => {
            onSaveEvent(newEvent);
            if (newEvent.type === 'Partido') {
              setActiveMatch(newEvent);
            }
          }}
          competitionTeams={competitionTeams}
          ownClubId={ownClubId}
        />
      )}
    </div>
  );
};

export default CalendarView;
