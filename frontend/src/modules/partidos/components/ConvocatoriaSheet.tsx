import React, { useMemo } from 'react';
import type { ActaPartido } from '@shared/services/rfefActasService';
import { matchPlayer, type ActaSide, type SquadPlayer } from '../utils/actaMapping';

/** Motivos de ausencia (mismos valores que usa la alineación en TacticalBoard). */
export const ABSENCE_REASONS: Array<{ value: string; label: string }> = [
  { value: 'decision_tecnica', label: 'Decisión técnica' },
  { value: 'lesion', label: 'Lesión' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'sancion_federativa', label: 'Sanción federativa' },
  { value: 'sancion_interna', label: 'Sanción interna' },
  { value: 'otro', label: 'Otro' },
  { value: 'otro_equipo', label: 'Otro equipo' },
];

interface ConvocatoriaPlayer extends SquadPlayer {
  posicion?: string;
}

interface ConvocatoriaSheetProps {
  acta: ActaPartido | null;
  ownSide: ActaSide | null;
  /** Plantilla del equipo del partido */
  squad: ConvocatoriaPlayer[];
  notConvocadoReasons: Record<string, string>;
  canEdit: boolean;
  onChangeReason: (playerId: string | number, reason: string) => void;
  loading?: boolean;
}

const label = 'text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-3';

const ConvocatoriaSheet: React.FC<ConvocatoriaSheetProps> = ({ acta, ownSide, squad, notConvocadoReasons, canEdit, onChangeReason, loading }) => {
  const { convocados, noConvocados, starterIds, sinEmparejar } = useMemo(() => {
    if (!acta || !ownSide) return { convocados: [], noConvocados: [], starterIds: new Set<string>(), sinEmparejar: [] as string[] };
    const own = ownSide === 'home' ? acta.homeTeam : acta.awayTeam;
    const used = new Set<string>();
    const starters = new Set<string>();
    const sin: string[] = [];
    [...own.starters.map(p => ({ ...p, starter: true })), ...own.substitutes.map(p => ({ ...p, starter: false }))].forEach(p => {
      const found = matchPlayer(p.name, p.dorsal, squad, used);
      if (found) {
        used.add(String(found.id));
        if (p.starter) starters.add(String(found.id));
      } else sin.push(p.name);
    });
    const byDorsal = (a: ConvocatoriaPlayer, b: ConvocatoriaPlayer) => (a.dorsal ?? 999) - (b.dorsal ?? 999);
    return {
      convocados: squad
        .filter(p => used.has(String(p.id)))
        .sort((a, b) => (Number(starters.has(String(b.id))) - Number(starters.has(String(a.id)))) || byDorsal(a, b)),
      noConvocados: squad.filter(p => !used.has(String(p.id))).sort(byDorsal),
      starterIds: starters,
      sinEmparejar: sin,
    };
  }, [acta, ownSide, squad]);

  if (!acta) {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        {loading ? 'Cargando convocatoria…' : 'La convocatoria se genera a partir del acta federativa, que aún no está disponible para este partido.'}
      </p>
    );
  }
  if (!ownSide) {
    return <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">No se ha podido determinar cuál de los equipos del acta es el tuyo (ningún jugador de la plantilla coincide).</p>;
  }

  const name = (p: ConvocatoriaPlayer) => p.apodo || p.nombre;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs text-[var(--text)]">
      <div>
        <div className={label}>Convocados ({convocados.length})</div>
        <ul className="space-y-2">
          {convocados.map(p => (
            <li key={String(p.id)} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surface-1)] font-bold">
              <span className="w-7 text-center text-[var(--text-muted)] tabular-nums">{p.dorsal ?? '-'}</span>
              <span className="flex-1 truncate">{name(p)}</span>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${starterIds.has(String(p.id)) ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-slate-500'}`}>
                {starterIds.has(String(p.id)) ? 'Titular' : 'Suplente'}
              </span>
            </li>
          ))}
          {convocados.length === 0 && <li className="text-[var(--text-muted)]">—</li>}
        </ul>
        {sinEmparejar.length > 0 && (
          <p className="mt-3 text-amber-600 dark:text-amber-400 font-bold">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>Convocados del acta sin emparejar con la plantilla: {sinEmparejar.length}
          </p>
        )}
      </div>

      <div>
        <div className={label}>No convocados ({noConvocados.length})</div>
        <ul className="space-y-2">
          {noConvocados.map(p => {
            const reason = notConvocadoReasons[String(p.id)] || '';
            return (
              <li key={String(p.id)} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surface-1)] font-bold">
                <span className="w-7 text-center text-[var(--text-muted)] tabular-nums">{p.dorsal ?? '-'}</span>
                <span className="flex-1 truncate">{name(p)}</span>
                {canEdit ? (
                  <select
                    value={reason}
                    onChange={e => onChangeReason(p.id, e.target.value)}
                    aria-label={`Motivo de ausencia de ${name(p)}`}
                    className="text-[11px] font-bold rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--text)] px-2 py-1.5"
                  >
                    <option value="">Sin motivo</option>
                    {ABSENCE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                ) : (
                  <span className="text-[var(--text-muted)]">{ABSENCE_REASONS.find(r => r.value === reason)?.label || 'Sin motivo'}</span>
                )}
              </li>
            );
          })}
          {noConvocados.length === 0 && <li className="text-[var(--text-muted)]">—</li>}
        </ul>
      </div>
    </div>
  );
};

export default ConvocatoriaSheet;
