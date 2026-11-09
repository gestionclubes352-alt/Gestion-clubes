import React, { useMemo, useState } from 'react';
import type { Player } from '@modules/plantilla';

type SortKey = 'nombre' | 'anio' | 'equipo' | 'competicion' | 'dorsal' | 'pj' | 'titular' | 'minutos' | 'minPj' | 'goles';

interface ColumnDef {
  key: SortKey;
  label: string;
  title?: string;
  numeric?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'nombre', label: 'Jugador' },
  { key: 'anio', label: 'Año', numeric: true },
  { key: 'equipo', label: 'Equipo' },
  { key: 'competicion', label: 'Competición' },
  { key: 'dorsal', label: 'Dorsal', numeric: true },
  { key: 'pj', label: 'PJ', numeric: true, title: 'Partidos jugados' },
  { key: 'titular', label: 'TIT', numeric: true, title: 'Titularidades' },
  { key: 'minutos', label: 'MIN', numeric: true, title: 'Minutos jugados' },
  { key: 'minPj', label: 'MIN/PJ', numeric: true, title: 'Minutos por partido jugado' },
  { key: 'goles', label: 'Goles', numeric: true },
];

const UNASSIGNED_SEASON = 'Sin temporada';

const getAnio = (p: Player): number | undefined => {
  if (p.anioNacimiento) return p.anioNacimiento;
  if (p.fechaNacimiento) {
    const y = new Date(p.fechaNacimiento).getFullYear();
    return Number.isNaN(y) ? undefined : y;
  }
  return undefined;
};

const getMinPj = (p: Player): number => {
  const pj = p.partidosJugados ?? 0;
  return pj > 0 ? Math.round((p.minutos ?? 0) / pj) : 0;
};

const getSortValue = (p: Player, key: SortKey): string | number => {
  switch (key) {
    case 'nombre': return (p.nombreCompleto || p.nombre || '').toLocaleLowerCase('es');
    case 'anio': return getAnio(p) ?? 0;
    case 'equipo': return (p.equipo || '').toLocaleLowerCase('es');
    case 'competicion': return (p.competicion || '').toLocaleLowerCase('es');
    case 'dorsal': return p.dorsal ?? 0;
    case 'pj': return p.partidosJugados ?? 0;
    case 'titular': return p.titular ?? 0;
    case 'minutos': return p.minutos ?? 0;
    case 'minPj': return getMinPj(p);
    case 'goles': return p.goles ?? 0;
  }
};

/** Lista de barras horizontales con el recuento de jugadores por grupo. */
const CountBarCard: React.FC<{ title: string; icon: string; items: { label: string; count: number }[] }> = ({ title, icon, items }) => {
  const max = items.reduce((m, it) => Math.max(m, it.count), 0);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <i className={`fa-solid ${icon} text-sport-primary`}></i>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">Sin datos</p>
      ) : (
        <ul className="space-y-2">
          {items.map(it => (
            <li key={it.label} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-xs font-bold text-slate-700 dark:text-slate-200" title={it.label}>{it.label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sport-primary"
                  style={{ width: max > 0 ? `${(it.count / max) * 100}%` : '0%' }}
                />
              </div>
              <span className="w-8 text-right text-xs font-black text-slate-700 dark:text-slate-200">{it.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PlayerAvatar: React.FC<{ player: Player }> = ({ player }) => {
  const name = player.nombreCompleto || player.nombre || '';
  if (player.fotoUrl) {
    return <img src={player.fotoUrl} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[11px] font-black text-slate-600 dark:text-slate-200 shrink-0">
      {name.charAt(0).toUpperCase() || '?'}
    </span>
  );
};

interface JugadoresViewProps {
  /** Jugadores ya filtrados por el selector de equipos de la app. */
  players: Player[];
  /** Abre la ficha de edición del jugador (modal existente en App). */
  onOpen: (player: Player) => void;
}

const JugadoresView: React.FC<JugadoresViewProps> = ({ players, onOpen }) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'goles', dir: 'desc' });

  const toggleSort = (key: SortKey) => {
    setSort(prev => (prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'nombre' || key === 'equipo' || key === 'competicion' ? 'asc' : 'desc' }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es');
    const base = q
      ? players.filter(p => [p.nombre, p.nombreCompleto, p.equipo, p.club, p.competicion]
          .some(v => (v || '').toLocaleLowerCase('es').includes(q)))
      : players;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      const va = getSortValue(a, sort.key);
      const vb = getSortValue(b, sort.key);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'es') * dir;
    });
  }, [players, search, sort]);

  // Agrupación por temporada (la más reciente primero). Dentro de cada grupo se respeta la ordenación.
  const groups = useMemo(() => {
    const map = new Map<string, Player[]>();
    filtered.forEach(p => {
      const key = p.temporada?.trim() || UNASSIGNED_SEASON;
      const list = map.get(key);
      if (list) list.push(p);
      else map.set(key, [p]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === UNASSIGNED_SEASON) return 1;
      if (b === UNASSIGNED_SEASON) return -1;
      return b.localeCompare(a, 'es');
    });
  }, [filtered]);

  const byClub = useMemo(() => countBy(players, p => p.club || 'Sin club'), [players]);
  const byCompeticion = useMemo(() => countBy(players, p => p.competicion || 'Sin competición'), [players]);
  const totalGoles = useMemo(() => players.reduce((sum, p) => sum + (p.goles ?? 0), 0), [players]);

  let rowIndex = 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Jugadores</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {players.length} jugadores · {totalGoles} goles
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, equipo, club o competición…"
          className="w-full md:w-80 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sport-primary/40"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <section className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b-2 border-sport-primary">
                <tr>
                  <th className="px-3 py-2 text-left font-black w-10">#</th>
                  {COLUMNS.map(col => {
                    const active = sort.key === col.key;
                    return (
                      <th
                        key={col.key}
                        title={col.title}
                        onClick={() => toggleSort(col.key)}
                        className={`px-3 py-2 font-black cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200 ${col.numeric ? 'text-right' : 'text-left'} ${active ? 'text-sport-primary' : ''}`}
                      >
                        {col.label}
                        {active && <i className={`fa-solid ${sort.dir === 'asc' ? 'fa-caret-up' : 'fa-caret-down'} ml-1`}></i>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-3 py-12 text-center text-sm text-slate-400">
                      No hay jugadores que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
                {groups.map(([season, list]) => (
                  <React.Fragment key={season}>
                    <tr className="bg-slate-100 dark:bg-slate-900/60">
                      <td colSpan={COLUMNS.length + 1} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">
                        {season === UNASSIGNED_SEASON ? season : `Temporada ${season}`}
                        <span className="ml-2 font-bold text-slate-400">({list.length})</span>
                      </td>
                    </tr>
                    {list.map(p => {
                      rowIndex += 1;
                      const anio = getAnio(p);
                      return (
                        <tr
                          key={`${season}-${p.id}`}
                          tabIndex={0}
                          onClick={() => onOpen(p)}
                          onKeyDown={e => { if (e.key === 'Enter') onOpen(p); }}
                          className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-sport-primary/5 cursor-pointer focus:outline-none focus:bg-sport-primary/10 text-slate-700 dark:text-slate-200"
                        >
                          <td className="px-3 py-2 text-slate-400">{rowIndex}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <PlayerAvatar player={p} />
                              <span className="font-bold">{p.nombreCompleto || p.nombre}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{anio ?? '—'}</td>
                          <td className="px-3 py-2">
                            {p.equipo ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold border border-red-100 dark:border-red-900/50">
                                {p.equipo}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2">{p.competicion || '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.dorsal ?? '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.partidosJugados ?? 0}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.titular ?? 0}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.minutos ?? 0}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{getMinPj(p)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-black text-slate-800 dark:text-slate-100">{p.goles ?? 0}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <CountBarCard title="Jugadores por club" icon="fa-shield-halved" items={byClub} />
          <CountBarCard title="Jugadores por competición" icon="fa-ranking-star" items={byCompeticion} />
        </aside>
      </div>
    </div>
  );
};

function countBy(players: Player[], keyOf: (p: Player) => string): { label: string; count: number }[] {
  const map = new Map<string, number>();
  players.forEach(p => {
    const k = keyOf(p);
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
    .slice(0, 8);
}

export default JugadoresView;
