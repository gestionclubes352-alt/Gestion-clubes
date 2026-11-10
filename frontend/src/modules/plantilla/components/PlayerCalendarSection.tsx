import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ObjetivoIndividual } from '@shared/services/dataService';
import { objetivosIndividualesService } from '@shared/services';
import type { CalendarEvent } from '../../calendario/types';
import { DashboardGroup } from './PlayerDashboard';
import type { PlayerMatchLogRow } from './PlayerDashboard';

interface PlayerCalendarSectionProps {
  playerId: string;
  /** Eventos del calendario ya filtrados al equipo del jugador */
  events: CalendarEvent[];
  /** Partidos del jugador según actas federativas */
  matchLog: PlayerMatchLogRow[];
  /** Nombre del equipo del jugador, para mostrar Local - Visitante */
  teamName?: string;
}

type EntryKind = 'partido' | 'entrenamiento' | 'objetivo';

interface CalEntry {
  key: string;
  kind: EntryKind;
  date: string; // YYYY-MM-DD
  title: string;
  subtitle?: string;
  /** Detalles extra (icono + texto) mostrados en el detalle del día */
  details?: { icon: string; text: string }[];
  /** Id del evento de calendario asociado (para abrir su contenido) */
  eventId?: string | number;
}

const KIND_META: Record<EntryKind, { label: string; dot: string; chip: string; icon: string }> = {
  partido: { label: 'Partido', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200', icon: 'fa-futbol' },
  entrenamiento: { label: 'Sesión', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'fa-person-running' },
  objetivo: { label: 'Objetivo', dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'fa-bullseye' },
};

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const PlayerCalendarSection: React.FC<PlayerCalendarSectionProps> = ({ playerId, events, matchLog, teamName }) => {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(toKey(today));
  const [objetivos, setObjetivos] = useState<ObjetivoIndividual[]>([]);
  const [filters, setFilters] = useState<Record<EntryKind, boolean>>({ partido: true, entrenamiento: true, objetivo: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await objetivosIndividualesService.list({ jugador_id: playerId });
        if (!cancelled) setObjetivos(data || []);
      } catch (err) {
        console.error('No se pudieron cargar los objetivos para el calendario', err);
        if (!cancelled) setObjetivos([]);
      }
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  const entriesByDay = useMemo(() => {
    const list: CalEntry[] = [];
    const matchDays = new Set<string>();

    const matchEvents = new Map<string, CalendarEvent>();
    events.forEach(ev => {
      if (ev.type !== 'Partido') return;
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
      if (!isNaN(d.getTime())) matchEvents.set(toKey(d), ev);
    });

    matchLog.forEach(m => {
      const date = String(m.fecha || '').slice(0, 10);
      if (!date) return;
      matchDays.add(date);
      const ev = matchEvents.get(date);
      const details: { icon: string; text: string }[] = [];
      if (m.jornada || ev?.jornada) details.push({ icon: 'fa-hashtag', text: String(m.jornada || ev?.jornada) });
      if (ev?.competition) details.push({ icon: 'fa-trophy', text: ev.competition });
      if (ev?.time) details.push({ icon: 'fa-clock', text: ev.time });
      if (ev?.location) details.push({ icon: 'fa-location-dot', text: ev.location });
      if (ev?.score) details.push({ icon: 'fa-futbol', text: `Resultado ${ev.score}` });
      if (m.es_local !== null && m.es_local !== undefined) details.push({ icon: 'fa-house', text: m.es_local ? 'Local' : 'Visitante' });
      details.push({ icon: 'fa-shirt', text: m.titular ? 'Titular' : (m.minutos ? 'Suplente' : 'No jugó') });
      if (m.minutos) details.push({ icon: 'fa-stopwatch', text: `${m.minutos}'` });
      if (m.goles) details.push({ icon: 'fa-bullseye', text: `${m.goles} gol${m.goles > 1 ? 'es' : ''}` });
      if (m.amarillas) details.push({ icon: 'fa-square', text: `${m.amarillas} amarilla${m.amarillas > 1 ? 's' : ''}` });
      if (m.rojas) details.push({ icon: 'fa-square', text: `${m.rojas} roja${m.rojas > 1 ? 's' : ''}` });
      list.push({
        key: `acta-${m.fed_match_id}`,
        kind: 'partido',
        date,
        title: !teamName || !m.rival ? (m.rival || 'Partido') : m.es_local === false ? `${m.rival} - ${teamName}` : `${teamName} - ${m.rival}`,
        subtitle: undefined,
        eventId: ev?.id,
        details,
      });
    });

    events.forEach(ev => {
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
      if (isNaN(d.getTime())) return;
      const date = toKey(d);
      if (ev.type === 'Partido') {
        // Evita duplicar un partido ya presente en las actas
        if (matchDays.has(date)) return;
        const rival = ev.localTeam && ev.visitorTeam ? `${ev.localTeam} - ${ev.visitorTeam}` : (ev.opponent || ev.title);
        list.push({
          key: `ev-${ev.id}`,
          kind: 'partido',
          date,
          title: rival || ev.title,
          eventId: ev.id,
          details: [
            ev.jornada && { icon: 'fa-hashtag', text: ev.jornada },
            ev.competition && { icon: 'fa-trophy', text: ev.competition },
            ev.time && { icon: 'fa-clock', text: ev.time },
            ev.location && { icon: 'fa-location-dot', text: ev.location },
            ev.score && { icon: 'fa-futbol', text: `Resultado ${ev.score}` },
          ].filter(Boolean) as { icon: string; text: string }[],
        });
      } else if (ev.type === 'Entrenamiento' || ev.type === 'Sesión') {
        list.push({
          key: `ev-${ev.id}`,
          kind: 'entrenamiento',
          date,
          title: ev.sessionNumber ? `Sesión ${ev.sessionNumber}` : 'Sesión',
          subtitle: [ev.title, ev.time, ev.location].filter(Boolean).join(' · '),
          eventId: ev.id,
        });
      }
    });

    objetivos.forEach(o => {
      const date = String(o.fecha || '').slice(0, 10);
      if (!date) return;
      list.push({
        key: `obj-${o.id}`,
        kind: 'objetivo',
        date,
        title: o.nombre_objetivo?.trim() || o.detalle?.trim() || 'Objetivo',
        subtitle: o.tipo,
      });
      (o.acciones || []).forEach(a => {
        const aDate = String(a.fecha || '').slice(0, 10);
        if (!aDate) return;
        list.push({
          key: `obj-${o.id}-acc-${a.id}`,
          kind: 'objetivo',
          date: aDate,
          title: `${a.categoria === 'evaluacion' ? 'Evaluación' : 'Acción'}: ${o.nombre_objetivo?.trim() || o.detalle?.trim() || 'Objetivo'}`,
          subtitle: [a.tipo?.replace('_', ' '), a.detalle].filter(Boolean).join(' · ') || undefined,
        });
      });
    });

    const map = new Map<string, CalEntry[]>();
    list.filter(e => filters[e.kind]).forEach(e => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [events, matchLog, objetivos, filters, teamName]);

  // Días en los que un objetivo está "en curso": desde su fecha hasta hoy (o hasta
  // la última acción/evaluación si ya está cumplido en verde).
  const activeObjByDay = useMemo(() => {
    const map = new Map<string, ObjetivoIndividual[]>();
    if (!filters.objetivo) return map;
    const todayStr = toKey(new Date());
    objetivos.forEach(o => {
      const start = String(o.fecha || '').slice(0, 10);
      if (!start) return;
      const lastAction = (o.acciones || []).map(a => String(a.fecha || '').slice(0, 10)).filter(Boolean).sort().pop();
      let end = o.estado === 'verde' ? (lastAction || start) : (lastAction && lastAction > todayStr ? lastAction : todayStr);
      if (end < start) end = start;
      const [sy, sm, sd] = start.split('-').map(Number);
      const cur = new Date(sy, sm - 1, sd);
      for (let guard = 0; guard < 800; guard++) {
        const k = toKey(cur);
        if (k > end) break;
        const arr = map.get(k) ?? [];
        arr.push(o);
        map.set(k, arr);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [objetivos, filters.objetivo]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes primero
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const shiftMonth = (delta: number) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(toKey(today));
  };

  const selectedEntries = selected ? entriesByDay.get(selected) ?? [] : [];
  const todayKey = toKey(today);

  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  const body = (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap px-1">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shiftMonth(-1)} className="w-6 h-6 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100" aria-label="Mes anterior">
            <i className="fa-solid fa-chevron-left text-[9px]"></i>
          </button>
          <span className="text-xs font-black text-slate-700 uppercase tracking-wide w-36 text-center">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <button type="button" onClick={() => shiftMonth(1)} className="w-6 h-6 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100" aria-label="Mes siguiente">
            <i className="fa-solid fa-chevron-right text-[9px]"></i>
          </button>
          <button type="button" onClick={goToday} className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-100">
            Hoy
          </button>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setIsFullscreen(v => !v)}
            className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 mr-1"
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
          >
            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-[10px]`}></i>
          </button>
          {(Object.keys(KIND_META) as EntryKind[]).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setFilters(f => ({ ...f, [k]: !f[k] }))}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border transition-all ${filters[k] ? KIND_META[k].chip : 'bg-white text-slate-300 border-slate-200'}`}
            >
              <span className={`w-2 h-2 rounded-full ${filters[k] ? KIND_META[k].dot : 'bg-slate-200'}`}></span>
              {KIND_META[k].label}
            </button>
          ))}
        </div>
      </div>

      {objetivos.some(o => o.nombre_objetivo?.trim()) && (
        <div className="flex items-center gap-1 flex-wrap px-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Trabajando:</span>
          {objetivos.filter(o => o.nombre_objetivo?.trim()).map(o => (
            <span key={o.id} className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${KIND_META.objetivo.chip}`}>
              <i className="fa-solid fa-bullseye mr-1"></i>{o.nombre_objetivo}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
        {WEEKDAYS.map(w => (
          <div key={w} className="bg-slate-50 text-center text-[9px] font-black text-slate-400 py-1">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className={`bg-slate-50 ${isFullscreen ? 'min-h-[110px]' : 'min-h-[44px]'}`} />;
          const key = toKey(d);
          const dayEntries = entriesByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSel = key === selected;
          const hasActiveObj = (activeObjByDay.get(key)?.length ?? 0) > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`${hasActiveObj ? 'bg-orange-50/60 border-b-2 border-orange-400' : 'bg-white'} ${isFullscreen ? 'min-h-[110px]' : 'min-h-[44px]'} p-1 flex flex-col items-start gap-1 text-left transition-colors hover:bg-slate-50 ${isSel ? 'ring-2 ring-inset ring-[var(--accent)]' : ''}`}
            >
              <span className={`text-[10px] font-black tabular-nums leading-none ${isToday ? 'bg-[var(--accent)] text-white rounded-full w-4 h-4 flex items-center justify-center' : 'text-slate-600'}`}>
                {d.getDate()}
              </span>
              <span className="flex flex-col gap-0.5 w-full min-w-0">
                {(activeObjByDay.get(key) ?? [])
                  .filter(o => (o.nombre_objetivo?.trim() || o.detalle?.trim()) && (String(o.fecha || '').slice(0, 10) === key || d.getDay() === 1 || d.getDate() === 1))
                  .map(o => (
                    <span
                      key={`objchip-${o.id}`}
                      title={o.nombre_objetivo?.trim() || o.detalle?.trim()}
                      className={`block truncate rounded px-1 py-px text-[8px] font-black leading-tight border ${KIND_META.objetivo.chip}`}
                    >
                      <i className="fa-solid fa-bullseye mr-0.5"></i>{o.nombre_objetivo?.trim() || o.detalle?.trim()}
                    </span>
                  ))}
                {dayEntries.slice(0, 3).map(e => (
                  <span
                    key={e.key}
                    title={e.title}
                    className={`block truncate rounded px-1 py-px text-[8px] font-black leading-tight border ${KIND_META[e.kind].chip}`}
                  >
                    {e.title}
                  </span>
                ))}
                {dayEntries.length > 3 && (
                  <span className="text-[8px] font-black text-slate-400">+{dayEntries.length - 3}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">
          {selected ? selected.split('-').reverse().join('/') : 'Selecciona un día'}
        </p>
        {selected && (activeObjByDay.get(selected) ?? []).filter(o => o.nombre_objetivo?.trim() || o.detalle?.trim()).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">En curso:</span>
            {(activeObjByDay.get(selected) ?? []).map(o => (
              <span key={o.id} className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${KIND_META.objetivo.chip}`}>
                <i className="fa-solid fa-bullseye mr-1"></i>{o.nombre_objetivo?.trim() || o.detalle?.trim()}
              </span>
            ))}
          </div>
        )}
        {selectedEntries.length === 0 ? (
          <p className="text-xs text-slate-400 py-1">Sin eventos este día</p>
        ) : (
          <div className="space-y-1">
            {selectedEntries.map(e => (
              <div
                key={e.key}
                className="flex items-start gap-2 px-2 py-1.5 bg-white rounded-xl border border-slate-200"
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${KIND_META[e.kind].dot}`}>
                  <i className={`fa-solid ${KIND_META[e.kind].icon}`}></i>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-700 truncate">{e.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {KIND_META[e.kind].label}{e.subtitle ? ` · ${e.subtitle}` : ''}
                  </p>
                  {e.details && e.details.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {e.details.map((dt, i) => (
                        <span key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[9px] font-bold text-slate-600">
                          <i className={`fa-solid ${dt.icon} text-[8px] ${dt.icon === 'fa-square' ? (dt.text.includes('roja') ? 'text-red-500' : 'text-yellow-500') : 'text-slate-400'}`}></i>
                          {dt.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[300] bg-white overflow-auto p-4 md:p-6 space-y-3">{body}</div>,
      document.body
    );
  }
  return <DashboardGroup title="Calendario" icon="fa-calendar-days">{body}</DashboardGroup>;
};

export default PlayerCalendarSection;
