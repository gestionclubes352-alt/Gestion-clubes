import React, { useMemo, useState } from 'react';
import type { ActaPartido, ActaTeamData } from '@shared/services/rfefActasService';
import { BallIcon, CardIcon, CardIcons, GoalIcons, SubChange, SubInIcon, SubOutIcon } from '@shared/components/MatchIcons';

type Side = 'home' | 'away';

interface Props {
  acta: ActaPartido;
  /** Lado del equipo propio (se resalta en rojo) */
  ownSide?: Side | null;
  /** Duración total configurada en la competición (partes × min/parte), si existe */
  configuredMinutes?: number | null;
  /** Minutos manuales por dorsal del equipo propio (para actas que no traen minutos) */
  manualMinutes?: Record<string, number>;
  /** Si se informa, los minutos del equipo propio son editables */
  onChangeMinutes?: (dorsal: number, minutes: number | null) => void;
}

const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const minuteOf = (m?: string) => {
  const n = parseInt(String(m ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Algunas actas traen "s principal Nombre asistente Otro asistente Otro": nos quedamos con el principal. */
const cleanReferee = (v: string) =>
  v.replace(/^\s*s?\s*principal\s+/i, '').split(/\s+asistente\s+/i)[0].replace(/\s{2,}/g, ' ').trim();

/** Duración orientativa según la categoría (editable por el usuario) */
const guessDuration = (competition: string, actaEnd: number): number => {
  const c = norm(competition);
  let d = 90;
  if (c.includes('alevin')) d = 60;
  else if (c.includes('infantil')) d = 70;
  else if (c.includes('cadete')) d = 80;
  return Math.max(d, actaEnd);
};

interface Row {
  dorsal: number;
  name: string;
  starter: boolean;
  minutes: number;
  goals: number;
  yellow: number;
  red: number;
  inMin?: number;
  outMin?: number;
}

const buildRows = (
  team: ActaTeamData,
  goalScorers: string[],
  duration: number
): Row[] => {
  const outMap = new Map<string, number>();
  const inMap = new Map<string, number>();
  team.substitutions.forEach(s => {
    outMap.set(norm(s.playerOut), minuteOf(s.minute));
    inMap.set(norm(s.playerIn), minuteOf(s.minute));
  });
  const count = (list: string[], name: string) => list.filter(n => norm(n) === norm(name)).length;
  // La doble amarilla llega como 'yellow' (1ª) + 'second-yellow' (2ª, expulsión): se cuenta una amarilla y una roja
  const yellows = team.cards.filter(c => c.type === 'yellow').map(c => c.player);
  const reds = team.cards.filter(c => c.type === 'red' || c.type === 'second-yellow').map(c => c.player);

  const make = (p: { dorsal: number; name: string }, starter: boolean): Row => {
    const key = norm(p.name);
    const inMin = starter ? 0 : inMap.get(key);
    const outMin = outMap.get(key);
    const played = inMin === undefined ? 0 : Math.max(0, (outMin ?? duration) - inMin);
    return {
      dorsal: p.dorsal,
      name: p.name,
      starter,
      minutes: played,
      goals: count(goalScorers, p.name),
      yellow: count(yellows, p.name),
      red: count(reds, p.name),
      inMin: starter ? undefined : inMin,
      outMin,
    };
  };
  return [...team.starters.map(p => make(p, true)), ...team.substitutes.map(p => make(p, false))];
};

const TeamTable: React.FC<{ title: string; rows: Row[]; highlight: boolean; showMinutes?: boolean; manualMinutes?: Record<string, number>; onChangeMinutes?: (dorsal: number, minutes: number | null) => void; hideSubs?: boolean }> = ({ title, rows, highlight, showMinutes = true, manualMinutes, onChangeMinutes, hideSubs = false }) => {
  const starters = rows.filter(r => r.starter);
  const bench = rows.filter(r => !r.starter);
  const renderRow = (r: Row, dim: boolean) => (
    <tr key={`${r.dorsal}-${r.name}`} className={`border-b border-[var(--border-soft)] ${dim ? 'text-[var(--text-muted)]' : 'text-[var(--text-strong)]'}`}>
      <td className="py-0.5 pr-3 w-8 text-right tabular-nums">{r.dorsal}</td>
      <td className="py-0.5 pr-3 font-medium">{r.name}</td>
      <td className="py-0.5 pr-3 text-right tabular-nums">
        {showMinutes && onChangeMinutes ? (
          <input
            type="number"
            min={0}
            max={120}
            aria-label={`Minutos de ${r.name}`}
            value={manualMinutes?.[String(r.dorsal)] ?? ''}
            placeholder="—"
            onChange={e => onChangeMinutes(r.dorsal, e.target.value === '' ? null : Math.max(0, Math.min(120, parseInt(e.target.value, 10) || 0)))}
            className="w-14 text-right bg-[var(--surface-1)] border border-[var(--border-soft)] rounded px-1 py-0.5 tabular-nums"
          />
        ) : showMinutes ? `${r.minutes}'` : ''}
      </td>
      <td className="py-0.5 pr-2 whitespace-nowrap text-center w-16">
        <span className="inline-flex items-center gap-0.5">
          <GoalIcons count={r.goals} />
          <CardIcons yellow={r.yellow} red={r.red} />
        </span>
      </td>
      <td className="py-0.5 text-right whitespace-nowrap w-24">
        {!hideSubs && <SubChange inMin={r.inMin} outMin={r.outMin} />}
      </td>
    </tr>
  );
  return (
    <div className="min-w-0">
      <h3 className={`inline-block text-[11px] font-black uppercase tracking-wider mb-3 px-2 py-1 rounded ${highlight ? 'bg-red-500/15 text-red-700 dark:text-red-300' : 'text-[var(--text-muted)]'}`}>{title}</h3>
      <table className="w-full text-xs leading-tight">
        <tbody>
          {starters.map(r => renderRow(r, false))}
          {bench.length > 0 && (
            <tr><td colSpan={5} className="pt-3 pb-1 text-xs font-bold text-[var(--text-muted)]">Suplentes</td></tr>
          )}
          {bench.map(r => renderRow(r, true))}
        </tbody>
      </table>
    </div>
  );
};

const ActaMatchSheet: React.FC<Props> = ({ acta, ownSide, configuredMinutes, manualMinutes, onChangeMinutes }) => {
  // Goles por equipo: el que incrementa su marcador es el que marca
  const goalsBySide = useMemo(() => {
    let h = 0, a = 0;
    return acta.goals.map(g => {
      const side: Side = g.homeScore > h ? 'home' : g.awayScore > a ? 'away' : 'home';
      h = Math.max(h, g.homeScore); a = Math.max(a, g.awayScore);
      return { ...g, side, min: minuteOf(g.minute) };
    });
  }, [acta.goals]);

  const actaEnd = useMemo(() => Math.max(
    0,
    ...goalsBySide.map(g => g.min),
    ...acta.homeTeam.substitutions.map(s => minuteOf(s.minute)),
    ...acta.awayTeam.substitutions.map(s => minuteOf(s.minute)),
  ), [goalsBySide, acta]);

  const [duration, setDuration] = useState(() =>
    configuredMinutes && configuredMinutes > 0
      ? Math.max(configuredMinutes, actaEnd)
      : guessDuration(acta.competition, actaEnd)
  );

  // Alevín = fútbol 8: solo 8 titulares; el resto de la lista pasa a suplentes
  const maxStarters = /alev[ií]n/i.test(acta.competition || '') ? 8 : Infinity;
  const capStarters = (t: ActaTeamData): ActaTeamData =>
    t.starters.length > maxStarters
      ? { ...t, starters: t.starters.slice(0, maxStarters), substitutes: [...t.starters.slice(maxStarters), ...t.substitutes] }
      : t;
  const homeRows = useMemo(() => buildRows(capStarters(acta.homeTeam), goalsBySide.filter(g => g.side === 'home').map(g => g.player), duration), [acta, goalsBySide, duration]);
  const awayRows = useMemo(() => buildRows(capStarters(acta.awayTeam), goalsBySide.filter(g => g.side === 'away').map(g => g.player), duration), [acta, goalsBySide, duration]);

  // Eventos agrupados por minuto
  const events = useMemo(() => {
    const byMin = new Map<number, { home: React.ReactNode[]; away: React.ReactNode[] }>();
    const slot = (m: number) => {
      if (!byMin.has(m)) byMin.set(m, { home: [], away: [] });
      return byMin.get(m)!;
    };
    goalsBySide.forEach((g, i) => slot(g.min)[g.side].push(
      <div key={`g${i}`} className="font-medium"><BallIcon className="w-3.5 h-3.5 mr-1" /> {g.player} <span className="text-[var(--text-muted)]">{g.homeScore}-{g.awayScore}</span></div>
    ));
    (['home', 'away'] as Side[]).forEach(side => {
      const team = side === 'home' ? acta.homeTeam : acta.awayTeam;
      if (!onChangeMinutes) team.substitutions.forEach((s, i) => {
        const m = minuteOf(s.minute);
        slot(m)[side].push(<div key={`si${side}${i}`}><SubInIcon className="w-3 h-3 mr-1" />{s.playerIn}</div>);
        slot(m)[side].push(<div key={`so${side}${i}`} className="text-[var(--text-muted)]"><SubOutIcon className="w-3 h-3 mr-1" />{s.playerOut}</div>);
      });
      team.cards.forEach((c, i) => {
        if (c.minute === undefined) return;
        slot(minuteOf(c.minute))[side].push(
          <div key={`c${side}${i}`}><CardIcon kind={c.type === 'yellow' ? 'yellow' : 'red'} className="w-2.5 h-3.5 mr-1" />{c.player}{c.type === 'second-yellow' && <span className="text-[var(--text-muted)]"> (2ª am.)</span>}</div>
        );
      });
    });
    return Array.from(byMin.entries()).sort((a, b) => a[0] - b[0]);
  }, [goalsBySide, acta, onChangeMinutes]);

  const half = duration / 2;
  let halfShown = false;
  const hasCardsWithoutMinute = [...acta.homeTeam.cards, ...acta.awayTeam.cards].some(c => c.minute === undefined);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <p className="text-sm text-[var(--text-muted)]">{[acta.competition, acta.jornada].filter(Boolean).join(' · ')}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span className={`font-black text-base lg:text-lg px-2 py-0.5 rounded ${ownSide === 'home' ? 'bg-red-500/15 text-red-700 dark:text-red-300' : 'text-[var(--text-strong)]'}`}>{acta.homeTeam.name}</span>
          {acta.homeTeam.logoUrl && <img loading="lazy" src={acta.homeTeam.logoUrl} alt="" className="w-12 h-12 object-contain" />}
          <span className="text-3xl font-black tracking-wider text-[var(--text-strong)]">{acta.homeScore} - {acta.awayScore}</span>
          {acta.awayTeam.logoUrl && <img loading="lazy" src={acta.awayTeam.logoUrl} alt="" className="w-12 h-12 object-contain" />}
          <span className={`font-black text-base lg:text-lg px-2 py-0.5 rounded ${ownSide === 'away' ? 'bg-red-500/15 text-red-700 dark:text-red-300' : 'text-[var(--text-strong)]'}`}>{acta.awayTeam.name}</span>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {[`${acta.date} ${acta.time}`.trim(), [acta.stadium, acta.city && `(${acta.city})`].filter(Boolean).join(' '), acta.referees[0] && `Árbitro: ${cleanReferee(acta.referees[0])}`].filter(Boolean).join(' · ')}
        </p>
        <label className="inline-flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          Duración del partido
          <select value={duration} onChange={e => setDuration(parseInt(e.target.value, 10))} className="bg-[var(--surface-1)] border border-[var(--border-soft)] rounded px-2 py-1 text-[var(--text)]">
            {Array.from(new Set([50, 60, 70, 80, 90, duration])).sort((a, b) => a - b).map(d => <option key={d} value={d}>{d}'</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <TeamTable title={acta.homeTeam.name} rows={homeRows} highlight={ownSide === 'home'} showMinutes={!ownSide || ownSide === 'home'} manualMinutes={manualMinutes} onChangeMinutes={ownSide === 'home' ? onChangeMinutes : undefined} hideSubs={!!onChangeMinutes} />
        <TeamTable title={acta.awayTeam.name} rows={awayRows} highlight={ownSide === 'away'} showMinutes={!ownSide || ownSide === 'away'} manualMinutes={manualMinutes} onChangeMinutes={ownSide === 'away' ? onChangeMinutes : undefined} hideSubs={!!onChangeMinutes} />
      </div>

      <div>
        <h3 className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-4">Eventos</h3>
        {events.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">El acta no contiene eventos.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border-soft)]" />
            {events.map(([min, ev]) => {
              const showHalf = !halfShown && min > half;
              if (showHalf) halfShown = true;
              return (
                <React.Fragment key={min}>
                  {showHalf && (
                    <div className="relative flex justify-center my-3">
                      <span className="px-3 py-0.5 rounded-full bg-slate-600 text-white text-[11px]">Descanso</span>
                    </div>
                  )}
                  <div className="relative grid grid-cols-[1fr_auto_1fr] gap-3 items-center py-2 text-sm text-[var(--text-strong)]">
                    <div className="text-right space-y-0.5">{ev.home}</div>
                    <span className="z-10 min-w-[2.5rem] text-center text-xs px-2 py-1 rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] tabular-nums">{min}'</span>
                    <div className="text-left space-y-0.5">{ev.away}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
        {hasCardsWithoutMinute && (
          <p className="mt-4 text-[11px] text-[var(--text-muted)]">Las tarjetas se muestran junto a cada jugador; el acta no indica el minuto.</p>
        )}
      </div>
    </div>
  );
};

export default ActaMatchSheet;
