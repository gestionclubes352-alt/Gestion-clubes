import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match, MatchReport } from '@modules/partidos/types';
import { db } from '@shared/services/dataService';
import { MATCH_DURATION_MINUTES } from '../../partidos/components/PlayerStatsSummary';

interface PlayerPositionMapProps {
  playerId: string;
  playerName?: string;
  photoUrl?: string;
  matches: Match[];
}

interface PositionInterval {
  label: string;
  x: number;
  y: number;
  minutes: number;
}

interface MatchPositionPoint {
  matchId: string;
  date?: string;
  label: string;
  x: number;
  y: number;
  minutes: number;
}

/** Reconstruye, sustitución a sustitución, qué posición del campo ocupó el jugador en un partido
 * concreto, moviendo el "hueco" del jugador que sale al que entra en su misma posición. */
const computePlayerPositionIntervals = (report: MatchReport, playerId: string): PositionInterval[] => {
  const slots = report.lineupPositions || [];
  if (slots.length === 0) return [];

  const targetKey = String(playerId);
  const slotById = new Map(slots.map(slot => [slot.id, slot]));

  const occupantOfSlot = new Map<string, string>();
  slots.forEach(slot => {
    const pid = (slot.playerIds || [])[0];
    if (pid !== undefined) occupantOfSlot.set(slot.id, String(pid));
  });

  let currentSlotId = Array.from(occupantOfSlot.entries()).find(([, pid]) => pid === targetKey)?.[0];
  let currentStart: number | undefined = currentSlotId !== undefined ? 0 : undefined;

  const closedIntervals: Array<{ slotId: string; start: number; end: number }> = [];
  const subs = [...(report.substitutions || [])].sort((a, b) => a.minute - b.minute);

  subs.forEach(sub => {
    const outId = sub.playerOutId !== undefined ? String(sub.playerOutId) : undefined;
    const inId = sub.playerInId !== undefined ? String(sub.playerInId) : undefined;

    let vacatedSlotId: string | undefined;
    occupantOfSlot.forEach((pid, sid) => {
      if (pid === outId) vacatedSlotId = sid;
    });

    if (outId === targetKey && currentSlotId !== undefined && currentStart !== undefined) {
      closedIntervals.push({ slotId: currentSlotId, start: currentStart, end: sub.minute });
      currentSlotId = undefined;
      currentStart = undefined;
    }

    if (vacatedSlotId !== undefined) {
      if (inId !== undefined) occupantOfSlot.set(vacatedSlotId, inId);
      else occupantOfSlot.delete(vacatedSlotId);
    }

    if (inId === targetKey && vacatedSlotId !== undefined) {
      currentSlotId = vacatedSlotId;
      currentStart = sub.minute;
    }
  });

  if (currentSlotId !== undefined && currentStart !== undefined) {
    let end = MATCH_DURATION_MINUTES;
    const redCardMinute = (report.matchCards || [])
      .filter(c => c.type === 'ROJA' && c.playerId !== undefined && String(c.playerId) === targetKey)
      .reduce((min, c) => Math.min(min, c.minute), Infinity);
    if (redCardMinute < end) end = redCardMinute;
    closedIntervals.push({ slotId: currentSlotId, start: currentStart, end });
  }

  return closedIntervals
    .map(({ slotId, start, end }) => {
      const slot = slotById.get(slotId);
      const minutes = Math.max(0, end - start);
      if (!slot || minutes <= 0) return null;
      return { label: slot.label, x: slot.x, y: slot.y, minutes };
    })
    .filter((v): v is PositionInterval => v !== null);
};

const PlayerPositionMap: React.FC<PlayerPositionMapProps> = ({ playerId, playerName, photoUrl, matches }) => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<MatchReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await db.match_reports.get();
        if (!cancelled) setReports((data as MatchReport[]) || []);
      } catch (err) {
        console.error('No se pudieron cargar los partes de partido', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const reportById = useMemo(() => new Map(reports.map(r => [String(r.id), r])), [reports]);

  // Un punto por partido: la posición donde más minutos disputó ese día.
  const points = useMemo<MatchPositionPoint[]>(() => {
    const result: MatchPositionPoint[] = [];
    [...matches]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(match => {
        const report = reportById.get(String(match.id));
        if (!report) return;
        const intervals = computePlayerPositionIntervals(report, playerId);
        if (intervals.length === 0) return;

        const totalMinutes = intervals.reduce((sum, iv) => sum + iv.minutes, 0);
        const dominant = intervals.reduce((best, iv) => (iv.minutes > best.minutes ? iv : best), intervals[0]);

        result.push({
          matchId: String(match.id),
          date: match.date,
          label: dominant.label,
          x: dominant.x,
          y: dominant.y,
          minutes: totalMinutes,
        });
      });
    return result;
  }, [matches, reportById, playerId]);

  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
        <p className="text-xs font-bold text-slate-400 text-center py-2">{t('playerStatsSummary.loading')}</p>
      </div>
    );
  }

  if (points.length === 0) {
    return null;
  }

  const initials = (playerName || '').trim().slice(0, 2).toUpperCase();

  return (
    <div className="bg-[#0b0f14] border border-slate-800 rounded-2xl p-4 mb-4">
      <div className="text-center mb-3">
        <span className="text-[11px] font-black text-sky-300 uppercase tracking-widest">
          {t('editPlayer.positionMapTitle', 'Posiciones de campo')}
          {playerName ? ` — ${playerName.toUpperCase()}` : ''}
        </span>
      </div>

      <div
        className="relative w-full max-w-72 mx-auto rounded-xl overflow-hidden border border-white/10"
        style={{ aspectRatio: '68 / 100', background: 'linear-gradient(to bottom, #1f6b3d 0%, #2d8a4e 50%, #1f6b3d 100%)' }}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.5" vectorEffect="non-scaling-stroke">
            <rect x="2" y="2" width="96" height="96" />
            <line x1="2" y1="50" x2="98" y2="50" />
            <circle cx="50" cy="50" r="9" />
            <circle cx="50" cy="50" r="0.5" fill="#ffffff" stroke="none" />
          </g>
        </svg>

        {points.map(point => (
          <div
            key={point.matchId}
            className="absolute flex flex-col items-center"
            style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
            title={`${point.label} · ${point.date ? new Date(point.date).toLocaleDateString() : ''} · ${point.minutes}'`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-lg bg-slate-600 flex items-center justify-center">
              {photoUrl ? (
                <img loading="lazy" decoding="async" src={photoUrl} alt={playerName || ''} className="w-full h-full object-cover object-top" />
              ) : (
                <span className="text-white text-[10px] font-black">{initials}</span>
              )}
            </div>
            <span className="mt-0.5 text-[10px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
              {point.minutes} {t('editPlayer.min', 'min')}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[10px] text-slate-300">
          <thead>
            <tr className="uppercase text-slate-500 font-black tracking-widest">
              <th className="text-left px-2 py-1">{t('common.date', 'Fecha')}</th>
              <th className="text-left px-2 py-1">{t('common.position')}</th>
              <th className="text-right px-2 py-1">{t('editPlayer.minutes')}</th>
            </tr>
          </thead>
          <tbody>
            {points.map(point => (
              <tr key={point.matchId} className="border-t border-white/5">
                <td className="px-2 py-1 whitespace-nowrap">{point.date ? new Date(point.date).toLocaleDateString() : '—'}</td>
                <td className="px-2 py-1 font-bold">{point.label}</td>
                <td className="px-2 py-1 text-right font-black text-sky-300">{point.minutes}'</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerPositionMap;
