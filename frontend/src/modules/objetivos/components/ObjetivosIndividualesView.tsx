import React, { useState, useEffect, useMemo } from 'react';
import type { Jugador, Equipo, ObjetivoIndividual } from '@shared/services/dataService';
import { objetivosIndividualesService, plantillasService, equiposService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import type { ObjetivoIndividualFormData } from '../types';
import { TIPOS_OBJETIVO, ESTADOS_OBJETIVO } from '../types';
import EditObjetivoModal from './EditObjetivoModal';

const estadoColor = (estado: string) => ESTADOS_OBJETIVO.find(e => e.value === estado)?.color || '#94a3b8';
const tipoLabel = (tipo: string) => TIPOS_OBJETIVO.find(t => t.value === tipo)?.label || tipo;

const ObjetivosIndividualesView: React.FC = () => {
  const { perfil } = useAuth();
  const [objetivos, setObjetivos] = useState<ObjetivoIndividual[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [editing, setEditing] = useState<ObjetivoIndividualFormData | null | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [objetivosData, jugadoresData, equiposData] = await Promise.all([
        objetivosIndividualesService.list(),
        plantillasService.list(),
        equiposService.list(),
      ]);
      setObjetivos(objetivosData || []);
      setJugadores(jugadoresData || []);
      setEquipos(equiposData || []);
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
        detalle: data.detalle,
        plan_accion: data.plan_accion,
      });
    } else {
      await objetivosIndividualesService.create({
        club_id: perfil?.club_id,
        equipo_id: data.equipo_id,
        jugador_id: data.jugador_id,
        fecha: data.fecha,
        tipo: data.tipo,
        estado: data.estado,
        detalle: data.detalle,
        plan_accion: data.plan_accion,
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
        <div className="flex-1" />
        <h2 className="text-2xl md:text-3xl font-black text-[var(--text-strong)] uppercase tracking-tighter text-center">
          OBJETIVOS INDIVIDUALES
        </h2>
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => setEditing(null)}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-xl flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            NUEVO OBJETIVO
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
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

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <i className="fa-solid fa-bullseye text-4xl text-slate-300 mb-4 block"></i>
          <p className="font-semibold">No hay objetivos individuales registrados</p>
          <p className="text-sm text-slate-400 mt-1">Pulsa "Nuevo objetivo" para crear el primero</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[1.4fr_1.2fr_0.9fr_1fr_0.7fr_2fr_2fr] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jugador</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipo</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalle</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan de acción</span>
            </div>
            {filtered.map(o => (
              <div
                key={o.id}
                onClick={() => setEditing(o)}
                className="grid grid-cols-[1.4fr_1.2fr_0.9fr_1fr_0.7fr_2fr_2fr] gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-all cursor-pointer items-center"
              >
                <span className="font-black text-[var(--accent)] uppercase tracking-tighter truncate">{getJugadorNombre(o.jugador_id)}</span>
                <span className="text-sm text-slate-600 truncate">{getEquipoNombre(o.equipo_id)}</span>
                <span className="text-sm text-slate-600">{o.fecha}</span>
                <span className="text-sm text-slate-600">{tipoLabel(o.tipo)}</span>
                <span>
                  <span
                    className="inline-block w-4 h-4 rounded-full"
                    style={{ backgroundColor: estadoColor(o.estado) }}
                    title={o.estado}
                  />
                </span>
                <span className="text-sm text-slate-600 truncate">{o.detalle || '—'}</span>
                <span className="text-sm text-slate-600 truncate">{o.plan_accion || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <EditObjetivoModal
        isOpen={editing !== undefined}
        objetivo={editing ?? null}
        jugadores={jugadores}
        equipos={equipos}
        onClose={() => setEditing(undefined)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ObjetivosIndividualesView;
