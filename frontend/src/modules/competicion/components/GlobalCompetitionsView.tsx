import React, { useEffect, useMemo, useState } from 'react';
import { FEDERATION_STANDINGS_BY_COMPETITION } from '../data/federationStandings';
import { FEDERATION_RESULTS_BY_COMPETITION, type FederationResultRow } from '../data/federationResults';

export type GlobalTargetSection = 'clasificacion' | 'calendario' | 'resultados';

interface GlobalCompetitionsViewProps {
  /** Navega a la vista de una competición concreta para un sub-equipo del club. */
  onNavigate?: (equipo: string, section: GlobalTargetSection) => void;
  /** Sub-equipo seleccionado en los chips de filtro; 'TODOS' (o vacío) no filtra. */
  equipoFilter?: string;
}

type ModalKind = 'clasificacion' | 'horarios' | 'resultados' | 'calendario' | 'portal';

type Etapa = 'Senior' | 'Juvenil' | 'Cadete' | 'Infantil' | 'Alevín';

interface GlobalRow {
  etapa: Etapa;
  competition: string;
  /** Id federativo `competición-temporada-grupo`; ausente si la competición no tiene datos propios (ej. Copa). */
  compId?: string;
  /** Sub-equipo interno (coincide con el filtro "Equipo"). */
  equipo: string;
  /** Nombre con el que figura el equipo en la federación. */
  clubLabel: string;
}

const ETAPAS: Etapa[] = ['Senior', 'Juvenil', 'Cadete', 'Infantil', 'Alevín'];

/** Competiciones 2026-27 del club, en el orden de la ficha federativa. */
const GLOBAL_ROWS: GlobalRow[] = [
  { etapa: 'Senior', competition: 'Tercera RFEF G-17', compId: '23183316-22-23258924', equipo: 'Primer Equipo', clubLabel: 'Internacional Huesca - Primer Equipo' },

  { etapa: 'Juvenil', competition: 'Copa - Juvenil Preferente Grupo 1 - Huesca', equipo: 'Juvenil B', clubLabel: 'Huesca International Football Academy - Juvenil B' },
  { etapa: 'Juvenil', competition: 'Copa - Juvenil Preferente Grupo 2 - Huesca', equipo: 'Juvenil C', clubLabel: 'Huesca-S.D. Escuela de Futbol - Juvenil C' },
  { etapa: 'Juvenil', competition: 'Juvenil Preferente Grupo 2 - Huesca', compId: '23183317-22-23183319', equipo: 'Juvenil B', clubLabel: 'Huesca International Football Academy - Juvenil B' },
  { etapa: 'Juvenil', competition: 'Juvenil Preferente Grupo 2 - Huesca', compId: '23183317-22-23183319', equipo: 'Juvenil C', clubLabel: 'Huesca-S.D. Escuela de Futbol - Juvenil C' },
  { etapa: 'Juvenil', competition: 'Liga Nacional Juvenil Grupo 6', compId: '23183382-22-23183383', equipo: 'Juvenil A', clubLabel: 'Ipc la Escuela - Juvenil A' },
  { etapa: 'Juvenil', competition: 'Primera Juvenil Grupo 2 - Huesca Occidental', compId: '23183321-22-23197223', equipo: 'Juvenil D', clubLabel: 'Huesca International Football Academy - Juvenil D' },

  { etapa: 'Cadete', competition: 'Cadete Autonómica Grupo 1 - Norte', compId: '23185096-22-23198208', equipo: 'Cadete B', clubLabel: 'Huesca-S.D. Escuela de Futbol - Cadete B' },
  { etapa: 'Cadete', competition: 'Cadete Preferente Grupo 2 - Huesca', compId: '23183325-22-23198218', equipo: 'Cadete C', clubLabel: 'Ipc la Escuela - Cadete C' },
  { etapa: 'Cadete', competition: 'División Honor Cadete Grupo Único', compId: '23183313-22-23183314', equipo: 'Cadete A', clubLabel: 'Huesca-S.D. Escuela de Futbol - Cadete A' },
  { etapa: 'Cadete', competition: 'Primera Cadete Grupo 2 - Huesca Occidental', compId: '23183332-22-23362987', equipo: 'Cadete D', clubLabel: 'Huesca-S.D. Escuela de Futbol - Cadete D' },

  { etapa: 'Infantil', competition: 'División Honor Infantil', compId: '23183315-22-23200330', equipo: 'Infantil A', clubLabel: 'Huesca-S.D. Escuela de Futbol - Infantil A' },
  { etapa: 'Infantil', competition: 'Infantil Preferente Grupo 2 - Huesca', compId: '23183329-22-23200389', equipo: 'Infantil B', clubLabel: 'Huesca-S.D. Escuela de Futbol - Infantil B' },
  { etapa: 'Infantil', competition: 'Primera Infantil Subgrupo 1 - Huesca', compId: '23183333-22-23362986', equipo: 'Infantil C', clubLabel: 'Ipc la Escuela "A" - Infantil C' },
  { etapa: 'Infantil', competition: 'Primera Infantil Subgrupo 1 - Huesca', compId: '23183333-22-23362986', equipo: 'Infantil D', clubLabel: 'Ipc la Escuela "B" - Infantil D' },

  { etapa: 'Alevín', competition: 'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental', compId: '23596848-22-23596900', equipo: 'Alevín B', clubLabel: 'Ipc la Escuela - Alevín B' },
  { etapa: 'Alevín', competition: 'Segunda Alevín Grupo 5 - Zaragoza', compId: '23183372-22-23442812', equipo: 'Alevín A', clubLabel: 'Ipc la Escuela - Alevín A' },
];

const federationPortalUrl = (compId: string): string | null => {
  const m = /^(\d+)-(\d+)-(\d+)$/.exec(compId);
  if (!m) return null;
  const [, competicion, temporada, grupo] = m;
  return `https://www.futbolaragon.com/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=${competicion}&CodGrupo=${grupo}&CodTemporada=${temporada}&cod_agrupacion=&CodJornada=1&Sch_Tipo_Juego=1`;
};

const ActionButton: React.FC<{
  icon: string;
  label: string;
  tone: string;
  disabled?: boolean;
  onClick?: () => void;
}> = ({ icon, label, tone, disabled, onClick }) => {
  const cls = `inline-flex h-4 w-6 items-center justify-center rounded-full border bg-white text-[8px] transition-all ${
    disabled ? 'cursor-not-allowed border-slate-200 text-slate-300' : `${tone} hover:scale-110 hover:shadow`
  }`;
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={cls}>
      <i className={`fa-solid ${icon}`}></i>
    </button>
  );
};


const normalizeName = (n: string) =>
  n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Nombre federativo del club: la etiqueta sin el sufijo " - Etapa". */
const federationClubName = (clubLabel: string) => clubLabel.replace(/\s-\s[^-]+$/, '');

/** ¿Es `team` uno de los equipos internos del club dentro de la competición `compId`? */
export const isOwnTeamInCompetition = (compId: string, team: string): boolean => {
  const t = normalizeName(team);
  return GLOBAL_ROWS.some(r => r.compId === compId && normalizeName(federationClubName(r.clubLabel)) === t);
};

const CompetitionModal: React.FC<{ row: GlobalRow; kind: ModalKind; onClose: () => void }> = ({ row, kind, onClose }) => {
  const [tab, setTab] = useState<ModalKind>(kind);
  const portal = row.compId ? federationPortalUrl(row.compId) : null;
  const standings = row.compId ? FEDERATION_STANDINGS_BY_COMPETITION[row.compId] ?? [] : [];
  const results = row.compId ? FEDERATION_RESULTS_BY_COMPETITION[row.compId] ?? [] : [];
  const mine = normalizeName(federationClubName(row.clubLabel));
  const isMine = (team: string) => normalizeName(team) === mine;
  /** Cualquier equipo interno del club en esta competición (no solo el de la fila). */
  const isInternal = (team: string) =>
    isMine(team) ||
    (!!row.compId && isOwnTeamInCompetition(row.compId, team)) ||
    /^(primerequipo|filial|juvenil[a-d]|cadete[a-d]|infantil[a-d]|alevin[a-d])$/.test(normalizeName(team)) ||
    /^(ipclaescuela|huescasdescueladefutbol)/.test(normalizeName(team));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const jornadas = useMemo(() => {
    const map = new Map<number, FederationResultRow[]>();
    results.forEach(r => map.set(r[0], [...(map.get(r[0]) ?? []), r]));
    return [...map.entries()].sort((x, y) => y[0] - x[0]);
  }, [results]);

  const myMatches = useMemo(
    () => results.filter(r => isMine(r[1]) || isMine(r[2])).sort((x, y) => x[0] - y[0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, mine]
  );

  const tabs: { id: ModalKind; label: string }[] = [
    { id: 'clasificacion', label: 'Clasificación' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'horarios', label: 'Horarios' },
    { id: 'calendario', label: 'Calendario' },
    { id: 'portal', label: 'Portal' },
  ];

  const empty = (msg: string) => <p className="py-10 text-center text-sm font-semibold text-slate-400">{msg}</p>;

  const matchLine = (r: FederationResultRow, key: string) => (
    <div key={key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-50 px-3 py-1.5 text-xs">
      <span className={`text-right ${isInternal(r[1]) ? 'font-black text-[#9f1239]' : 'text-slate-700'}`}>{r[1]}</span>
      <span className="min-w-[44px] rounded bg-slate-100 px-2 py-0.5 text-center font-black text-slate-800">{r[3]}</span>
      <span className={isInternal(r[2]) ? 'font-black text-[#9f1239]' : 'text-slate-700'}>{r[2]}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
          <div>
            <p className="text-sm font-black text-slate-800">{row.competition}</p>
            <p className="text-[11px] font-bold text-[#c8102e]">{row.clubLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-200">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                tab === t.id ? 'bg-[#c8102e] text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-[300px] flex-1 overflow-y-auto">
          {tab === 'clasificacion' &&
            (standings.length === 0 ? empty('Esta competición no tiene clasificación.') : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-white text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-3 py-2">#</th><th className="px-3 py-2">Equipo</th>
                    <th className="px-2 py-2 text-center">PJ</th><th className="px-2 py-2 text-center">G</th>
                    <th className="px-2 py-2 text-center">E</th><th className="px-2 py-2 text-center">P</th>
                    <th className="px-2 py-2 text-center">GF</th><th className="px-2 py-2 text-center">GC</th>
                    <th className="px-2 py-2 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map(s => (
                    <tr key={s.team} className={`border-b border-slate-50 ${isInternal(s.team) ? 'bg-[#9f1239]/15 font-black text-[#9f1239]' : ''}`}>
                      <td className={`px-3 py-1.5 ${isInternal(s.team) ? 'border-l-4 border-[#9f1239] text-[#9f1239]' : 'text-slate-400'}`}>{s.pos}</td>
                      <td className={`px-3 py-1.5 ${isInternal(s.team) ? 'text-[#9f1239]' : 'text-slate-800'}`}>{s.team}</td>
                      <td className="px-2 py-1.5 text-center">{s.played}</td>
                      <td className="px-2 py-1.5 text-center">{s.won}</td>
                      <td className="px-2 py-1.5 text-center">{s.drawn}</td>
                      <td className="px-2 py-1.5 text-center">{s.lost}</td>
                      <td className="px-2 py-1.5 text-center">{s.goalsFor ?? '—'}</td>
                      <td className="px-2 py-1.5 text-center">{s.goalsAgainst ?? '—'}</td>
                      <td className="px-2 py-1.5 text-center font-black">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

          {tab === 'resultados' &&
            (jornadas.length === 0 ? empty('Sin resultados disponibles para esta competición.') : (
              <div className="p-3">
                {jornadas.map(([j, rs]) => (
                  <div key={j} className="mb-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Jornada {j}</p>
                    {rs.map((r, i) => matchLine(r, `${j}-${i}`))}
                  </div>
                ))}
              </div>
            ))}

          {(tab === 'horarios' || tab === 'calendario') &&
            (myMatches.length === 0 ? empty('Sin partidos disponibles para este equipo.') : (
              <div className="p-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Partidos de {federationClubName(row.clubLabel)}
                </p>
                {myMatches.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-center text-[10px] font-black text-slate-400">J{r[0]}</span>
                    <div className="flex-1">{matchLine(r, `m-${i}`)}</div>
                  </div>
                ))}
                <p className="mt-3 text-[11px] text-slate-400">
                  Los horarios de los próximos partidos se consultan en la pestaña Portal.
                </p>
              </div>
            ))}

          {tab === 'portal' &&
            (portal ? (
              <div className="flex h-[60vh] flex-col">
                <iframe
                  title="Portal de la federación"
                  src={portal}
                  className="w-full flex-1 border-0"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
                <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
                  Si el portal no se muestra (la federación puede bloquear su incrustación),{' '}
                  <a href={portal} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 underline">
                    ábrelo en otra pestaña
                  </a>
                  .
                </p>
              </div>
            ) : empty('Esta competición no tiene portal federativo.'))}
        </div>
      </div>
    </div>
  );
};

const GlobalCompetitionsView: React.FC<GlobalCompetitionsViewProps> = ({ onNavigate, equipoFilter }) => {
  const [collapsed, setCollapsed] = useState<Set<Etapa>>(new Set());
  const [modal, setModal] = useState<{ row: GlobalRow; kind: ModalKind } | null>(null);

  const toggle = (etapa: Etapa) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(etapa)) next.delete(etapa);
      else next.add(etapa);
      return next;
    });

  const visibleRows = useMemo(() => {
    if (!equipoFilter || equipoFilter === 'TODOS') return GLOBAL_ROWS;
    const f = normalizeName(equipoFilter);
    return GLOBAL_ROWS.filter(r => normalizeName(r.equipo) === f);
  }, [equipoFilter]);

  const rowsByEtapa = useMemo(
    () => ETAPAS
      .map(etapa => ({ etapa, rows: visibleRows.filter(r => r.etapa === etapa) }))
      .filter(g => g.rows.length > 0),
    [visibleRows]
  );

  const totalEquipos = useMemo(() => new Set(visibleRows.map(r => r.clubLabel)).size, [visibleRows]);
  const totalCompeticiones = useMemo(() => new Set(visibleRows.map(r => r.competition)).size, [visibleRows]);

  let counter = 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-2">
        <div>
          <p className="text-[11px] font-black text-slate-800">Temporada 2026-2027 · Federación Aragonesa</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {totalCompeticiones} competiciones · {totalEquipos} equipos · Masculino
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-max max-w-full whitespace-nowrap border-collapse text-left text-xs leading-tight">
          <thead>
            <tr className="border-b border-slate-100 bg-white text-[9px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-1.5 py-1 w-10">#</th>
              <th className="px-1.5 py-1">Federación</th>
              <th className="px-1.5 py-1">Género</th>
              <th className="px-1.5 py-1">Etapa</th>
              <th className="px-1.5 py-1">Competición</th>
              <th className="px-1.5 py-1">Equipo</th>
              <th className="px-1.5 py-1 text-center">Equipos</th>
              <th className="px-1.5 py-1 text-center">Jornada</th>
              <th className="px-0.5 py-1 text-center">Clasif.</th>
              <th className="px-0.5 py-1 text-center">Horarios</th>
              <th className="px-0.5 py-1 text-center">Result.</th>
              <th className="px-0.5 py-1 text-center">Calend.</th>
              <th className="px-0.5 py-1 text-center">Portal</th>
            </tr>
          </thead>
          <tbody>
            {rowsByEtapa.map(({ etapa, rows }) => {
              const isCollapsed = collapsed.has(etapa);
              return (
                <React.Fragment key={etapa}>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <td colSpan={13} className="px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => toggle(etapa)}
                        aria-expanded={!isCollapsed}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#c8102e]"
                      >
                        <i className={`fa-solid fa-caret-${isCollapsed ? 'right' : 'down'} text-[10px]`}></i>
                        {etapa}
                        <span className="text-[9px] font-bold text-slate-400">· {rows.length}</span>
                      </button>
                    </td>
                  </tr>
                  {!isCollapsed &&
                    rows.map(row => {
                      counter += 1;
                      const standings = row.compId ? FEDERATION_STANDINGS_BY_COMPETITION[row.compId] : undefined;
                      const nEquipos = standings?.length;
                      const jornada = standings?.length ? Math.max(...standings.map(s => s.played)) : undefined;
                      const portal = row.compId ? federationPortalUrl(row.compId) : null;
                      return (
                        <tr key={`${row.competition}|${row.clubLabel}`} className="border-b border-slate-50 hover:bg-slate-50/70">
                          <td className="px-1.5 py-0.5 text-xs text-slate-400">{counter}</td>
                          <td className="px-1.5 py-0.5 text-[11px] font-bold text-slate-500">ARAGÓN</td>
                          <td className="px-1.5 py-0.5 text-xs font-medium text-slate-700">Masculino</td>
                          <td className="px-1.5 py-0.5 text-xs font-medium text-slate-700">{row.etapa}</td>
                          <td className="px-1.5 py-0.5 text-xs font-medium text-slate-700">{row.competition}</td>
                          <td className="px-1.5 py-0.5">
                            <span className="inline-block rounded-md bg-[#c8102e]/10 px-1.5 py-0 text-xs font-semibold text-slate-800">
                              {row.clubLabel}
                            </span>
                          </td>
                          <td className="px-1.5 py-0.5 text-center text-xs font-medium text-slate-700">{nEquipos ?? '—'}</td>
                          <td className="px-1.5 py-0.5 text-center text-xs font-medium text-slate-700">{jornada ? `J${jornada}` : '—'}</td>
                          <td className="px-0.5 py-0.5 text-center">
                            <ActionButton
                              icon="fa-trophy"
                              label="Clasificación"
                              tone="border-amber-400 text-amber-500"
                              disabled={!row.compId}
                              onClick={() => setModal({ row, kind: 'clasificacion' })}
                            />
                          </td>
                          <td className="px-0.5 py-0.5 text-center">
                            <ActionButton
                              icon="fa-clock"
                              label="Horarios"
                              tone="border-slate-500 text-slate-600"
                              onClick={() => setModal({ row, kind: 'horarios' })}
                            />
                          </td>
                          <td className="px-0.5 py-0.5 text-center">
                            <ActionButton
                              icon="fa-list-check"
                              label="Resultados"
                              tone="border-blue-500 text-blue-600"
                              onClick={() => setModal({ row, kind: 'resultados' })}
                            />
                          </td>
                          <td className="px-0.5 py-0.5 text-center">
                            <ActionButton
                              icon="fa-calendar-days"
                              label="Calendario"
                              tone="border-indigo-400 text-indigo-500"
                              onClick={() => setModal({ row, kind: 'calendario' })}
                            />
                          </td>
                          <td className="px-0.5 py-0.5 text-center">
                            <ActionButton
                              icon="fa-arrow-up-right-from-square"
                              label="Abrir en el portal de la federación"
                              tone="border-emerald-500 text-emerald-600"
                              disabled={!portal}
                              onClick={() => setModal({ row, kind: 'portal' })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {modal && <CompetitionModal row={modal.row} kind={modal.kind} onClose={() => setModal(null)} />}
    </section>
  );
};

export default GlobalCompetitionsView;
