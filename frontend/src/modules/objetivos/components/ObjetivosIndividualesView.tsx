import React, { useState, useEffect, useMemo } from 'react';
import type { Jugador, Equipo, ObjetivoIndividual } from '@shared/services/dataService';
import { objetivosIndividualesService, plantillasService, equiposService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import type { ObjetivoIndividualFormData } from '../types';
import { TIPOS_OBJETIVO, ESTADOS_OBJETIVO } from '../types';
import EditObjetivoModal from './EditObjetivoModal';
import ObjetivosGraficas from './ObjetivosGraficas';
import ObjetivosCalendario from './ObjetivosCalendario';

const contarEvaluaciones = (o: ObjetivoIndividual): number =>
  (o.acciones ?? []).filter(a => a.categoria === 'evaluacion').length;

/** Las evaluaciones no cuentan como acciones. */
const contarAcciones = (o: ObjetivoIndividual): number =>
  (o.acciones ?? []).filter(a => a.categoria !== 'evaluacion').length;

const estadoColor = (estado: string) => ESTADOS_OBJETIVO.find(e => e.value === estado)?.color || '#94a3b8';
const tipoLabel = (tipo: string) => TIPOS_OBJETIVO.find(t => t.value === tipo)?.label || tipo;

interface ObjetivosIndividualesViewProps {
  /**
   * Equipos internos del propio club, ya resueltos por App.tsx (`misClubCompetitionTeams`).
   * Se usan en vez de volver a llamar a `equiposService.list()` directamente porque
   * la tabla `equipos` puede depender de fallbacks/merges que solo App.tsx aplica.
   * Si no se pasa, el componente cae a su propio fetch (uso autónomo).
   */
  equipos?: Pick<Equipo, 'id' | 'nombre'>[];
}

const ObjetivosIndividualesView: React.FC<ObjetivosIndividualesViewProps> = ({ equipos: equiposProp }) => {
  const { perfil } = useAuth();
  const [objetivos, setObjetivos] = useState<ObjetivoIndividual[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [equiposPropios, setEquiposPropios] = useState<Pick<Equipo, 'id' | 'nombre'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [editing, setEditing] = useState<ObjetivoIndividualFormData | null | undefined>(undefined);
  // Sección a destacar en el modal: solo cuando se abre desde el nº de acciones/evaluaciones de la tabla.
  const [enfoque, setEnfoque] = useState<'acciones' | 'evaluaciones' | undefined>(undefined);
  const [vista, setVista] = useState<'listado' | 'calendario' | 'graficas'>('listado');

  const equipos = useMemo(
    () => [...(equiposProp ?? equiposPropios)].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [equiposProp, equiposPropios]
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (equiposProp) {
        const [objetivosData, jugadoresData] = await Promise.all([
          objetivosIndividualesService.list(),
          plantillasService.list(),
        ]);
        setObjetivos(objetivosData || []);
        setJugadores(jugadoresData || []);
      } else {
        const [objetivosData, jugadoresData, equiposData] = await Promise.all([
          objetivosIndividualesService.list(),
          plantillasService.list(),
          equiposService.list(),
        ]);
        setObjetivos(objetivosData || []);
        setJugadores(jugadoresData || []);
        setEquiposPropios(equiposData || []);
      }
    } catch (err) {
      console.error('Error loading objetivos individuales:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const getJugadorNombre = (id: string) => jugadores.find(j => String(j.id) === String(id))?.nombre || '—';
  const getEquipoNombre = (id: string) => equipos.find(e => String(e.id) === String(id))?.nombre || '—';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = objetivos;
    if (q) {
      list = list.filter(o =>
        getJugadorNombre(o.jugador_id).toLowerCase().includes(q) ||
        (o.detalle || '').toLowerCase().includes(q)
      );
    }
    if (filtroEquipo) list = list.filter(o => String(o.equipo_id) === filtroEquipo);
    if (filtroTipo) list = list.filter(o => o.tipo === filtroTipo);
    if (filtroEstado) list = list.filter(o => o.estado === filtroEstado);
    return [...list].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  }, [objetivos, jugadores, search, filtroEquipo, filtroTipo, filtroEstado]);

  const handleSave = async (data: ObjetivoIndividualFormData) => {
    if (data.id) {
      await objetivosIndividualesService.update(data.id, {
        equipo_id: data.equipo_id,
        jugador_id: data.jugador_id,
        fecha: data.fecha,
        tipo: data.tipo,
        estado: data.estado,
        estado_inicial: data.estado_inicial ?? data.estado,
        nombre_objetivo: data.nombre_objetivo?.trim() || null,
        detalle: data.detalle,
        acciones: data.acciones ?? [],
      });
    } else {
      await objetivosIndividualesService.create({
        club_id: perfil?.club_id,
        equipo_id: data.equipo_id,
        jugador_id: data.jugador_id,
        fecha: data.fecha,
        tipo: data.tipo,
        estado: data.estado,
        estado_inicial: data.estado_inicial ?? data.estado,
        nombre_objetivo: data.nombre_objetivo?.trim() || null,
        detalle: data.detalle,
        acciones: data.acciones ?? [],
      } as any);
    }
    await loadData();
    setEditing(undefined);
  };

  const handleDelete = async (id: string) => {
    await objetivosIndividualesService.remove(id);
    await loadData();
    setEditing(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <i className="fa-solid fa-spinner animate-spin text-4xl text-[var(--accent)]"></i>
          <p className="text-slate-600 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 flex">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {([
              { value: 'listado', label: 'Listado', icon: 'fa-list' },
              { value: 'calendario', label: 'Calendario', icon: 'fa-calendar-days' },
              { value: 'graficas', label: 'Gráficas', icon: 'fa-chart-simple' },
            ] as const).map(v => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVista(v.value)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                  vista === v.value ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <i className={`fa-solid ${v.icon}`}></i>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          OBJETIVOS INDIVIDUALES
        </h2>
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => {
              setEnfoque(undefined);
              setEditing(null);
            }}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-xl flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            NUEVO OBJETIVO
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-56 sm:shrink-0">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar jugador o detalle..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
        <select
          value={filtroEquipo}
          onChange={e => setFiltroEquipo(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        >
          <option value="">Todos los equipos</option>
          {equipos.map(eq => (
            <option key={eq.id} value={String(eq.id)}>{eq.nombre}</option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_OBJETIVO.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_OBJETIVO.map(e => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {vista === 'graficas' ? (
        <ObjetivosGraficas objetivos={filtered} getEquipoNombre={getEquipoNombre} />
      ) : vista === 'calendario' ? (
        <ObjetivosCalendario
          objetivos={filtered}
          getJugadorNombre={getJugadorNombre}
          getEquipoNombre={getEquipoNombre}
          onSelect={o => {
            setEnfoque(undefined);
            setEditing(o);
          }}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <i className="fa-solid fa-bullseye text-4xl text-slate-300 mb-4 block"></i>
          <p className="font-semibold">No hay objetivos individuales registrados</p>
          <p className="text-sm text-slate-400 mt-1">Pulsa "Nuevo objetivo" para crear el primero</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[1.3fr_0.8fr_0.7fr_0.8fr_2.2fr_0.5fr_3fr_64px_84px] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jugador</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipo</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Objetivo</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalle</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Evaluaciones</span>
            </div>
            {filtered.map(o => {
              const nAcciones = contarAcciones(o);
              const nEvaluaciones = contarEvaluaciones(o);
              const numBtn = (kind: 'acciones' | 'evaluaciones', n: number) =>
                n === 0 ? (
                  <span className="text-sm text-slate-400">—</span>
                ) : (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setEnfoque(kind);
                      setEditing(o);
                    }}
                    className={`min-w-[28px] px-2 py-0.5 rounded-lg text-sm font-black tabular-nums transition-all ${
                      'bg-slate-100 text-slate-700 hover:bg-[var(--accent)] hover:text-white'
                    }`}
                    title={kind === 'acciones' ? 'Ver acciones realizadas' : 'Ver evaluaciones'}
                  >
                    {n}
                    <i className={`fa-solid fa-arrow-up-right-from-square ml-1.5 text-[8px]`}></i>
                  </button>
                );
              return (
              <React.Fragment key={o.id}>
              <div
                onClick={() => {
                  setEnfoque(undefined);
                  setEditing(o);
                }}
                className="grid grid-cols-[1.3fr_0.8fr_0.7fr_0.8fr_2.2fr_0.5fr_3fr_64px_84px] gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-all cursor-pointer items-center"
              >
                <span className="font-black text-[var(--accent)] uppercase tracking-tighter truncate">{getJugadorNombre(o.jugador_id)}</span>
                <span className="text-sm text-slate-600 truncate">{getEquipoNombre(o.equipo_id)}</span>
                <span className="text-sm text-slate-600">{o.fecha}</span>
                <span className="text-sm text-slate-600">{tipoLabel(o.tipo)}</span>
                <span className="text-sm text-slate-600 truncate" title={o.nombre_objetivo || undefined}>{o.nombre_objetivo || '—'}</span>
                <span>
                  <span
                    className="inline-block w-4 h-4 rounded-full"
                    style={{ backgroundColor: estadoColor(o.estado) }}
                    title={o.estado}
                  />
                </span>
                <span className="text-sm text-slate-600 truncate">{o.detalle || '—'}</span>
                <span>{numBtn('acciones', nAcciones)}</span>
                <span>{numBtn('evaluaciones', nEvaluaciones)}</span>
              </div>
              </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <EditObjetivoModal
        isOpen={editing !== undefined}
        objetivo={editing ?? null}
        jugadores={jugadores}
        equipos={equipos}
        enfoque={enfoque}
        onClose={() => setEditing(undefined)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ObjetivosIndividualesView;
