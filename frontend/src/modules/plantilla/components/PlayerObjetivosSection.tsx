import React, { useEffect, useState } from 'react';
import type { ObjetivoIndividual } from '@shared/services/dataService';
import { objetivosIndividualesService } from '@shared/services';
import { useAuth } from '@context/AuthContext';
import { EditObjetivoModal, TIPOS_OBJETIVO, ESTADOS_OBJETIVO } from '@modules/objetivos';
import type { ObjetivoIndividualFormData } from '@modules/objetivos';

interface PlayerObjetivosSectionProps {
  playerId: string;
  playerName: string;
  equipoId?: string;
}

const estadoColor = (estado: string) => ESTADOS_OBJETIVO.find(e => e.value === estado)?.color || '#94a3b8';
const tipoLabel = (tipo: string) => TIPOS_OBJETIVO.find(t => t.value === tipo)?.label || tipo;

const PlayerObjetivosSection: React.FC<PlayerObjetivosSectionProps> = ({ playerId, playerName, equipoId }) => {
  const { perfil } = useAuth();
  const [objetivos, setObjetivos] = useState<ObjetivoIndividual[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ObjetivoIndividualFormData | null | undefined>(undefined);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await objetivosIndividualesService.list({ jugador_id: playerId });
      setObjetivos((data || []).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')));
    } catch (err) {
      console.error('No se pudieron cargar los objetivos individuales del jugador', err);
      setObjetivos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [playerId]);

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
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
        <p className="text-xs font-bold text-slate-400 text-center py-2">Cargando objetivos individuales...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <i className="fa-solid fa-bullseye mr-2"></i>
          Objetivos Individuales
        </span>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all"
        >
          <i className="fa-solid fa-plus mr-1"></i>
          Nuevo objetivo
        </button>
      </div>

      {objetivos.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">Sin objetivos individuales registrados</p>
      ) : (
        <div className="space-y-2">
          {objetivos.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => setEditing(o)}
              className="w-full flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[var(--accent)]/40 transition-all text-left"
            >
              <span
                className="w-3 h-3 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: estadoColor(o.estado) }}
                title={o.estado}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{tipoLabel(o.tipo)}</span>
                  <span className="text-[10px] font-bold text-slate-400">{o.fecha}</span>
                </div>
                {o.detalle && <p className="text-xs text-slate-600 mt-1 truncate">{o.detalle}</p>}
                {o.plan_accion && <p className="text-[11px] text-slate-400 mt-0.5 truncate">Plan: {o.plan_accion}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <EditObjetivoModal
        isOpen={editing !== undefined}
        objetivo={editing ?? { equipo_id: equipoId || '', jugador_id: playerId, fecha: new Date().toISOString().slice(0, 10), tipo: 'deportivo', estado: 'verde' }}
        jugadores={[]}
        equipos={[]}
        jugadorNombreFijo={playerName}
        onClose={() => setEditing(undefined)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default PlayerObjetivosSection;
