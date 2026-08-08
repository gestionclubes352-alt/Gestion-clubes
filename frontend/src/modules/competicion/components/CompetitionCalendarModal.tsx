import React, { useEffect, useMemo, useState } from 'react';
import { Competicion, CalendarioCompeticionPartido, calendarioCompeticionService, partidosService } from '@/shared/services/dataService';
import type { CompetitionTeam } from '../types';
import MatchModal, { type MatchFormData } from './MatchModal';
import type { Partido } from '@/shared/services/dataService';

interface CompetitionCalendarModalProps {
  competicion: Competicion;
  /** Nombre exacto del equipo propio a resaltar en el calendario (p.ej. "IPC LA ESCUELA"). */
  equipoDestacado?: string;
  competitionTeams?: CompetitionTeam[];
  allCompetitions?: Competicion[];
  onClose: () => void;
}

const formatFecha = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const CompetitionCalendarModal: React.FC<CompetitionCalendarModalProps> = ({
  competicion,
  equipoDestacado,
  competitionTeams = [],
  allCompetitions = [],
  onClose,
}) => {
  const [partidos, setPartidos] = useState<CalendarioCompeticionPartido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchFormData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await calendarioCompeticionService.list({ competicion_id: competicion.id });
        setPartidos(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al cargar el calendario';
        setError(msg);
        console.error('Error loading calendario_competicion:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [competicion.id]);

  const jornadas = useMemo(() => {
    const grouped = new Map<number, CalendarioCompeticionPartido[]>();
    for (const p of partidos) {
      const list = grouped.get(p.jornada) || [];
      list.push(p);
      grouped.set(p.jornada, list);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([jornada, items]) => ({ jornada, items }));
  }, [partidos]);

  const esDestacado = (nombreEquipo: string) =>
    !!equipoDestacado && nombreEquipo.trim().toUpperCase() === equipoDestacado.trim().toUpperCase();

  const handleOpenMatchModal = () => {
    console.log('Opening match modal');
    setEditingMatch(null);
    setMatchModalOpen(true);
  };

  const handleSaveMatch = async (matchData: MatchFormData) => {
    try {
      const partidoData = {
        competition: matchData.competition,
        date: matchData.date,
        time: matchData.time,
        location: matchData.location,
        jornada: matchData.jornada,
        local_team: matchData.localTeam,
        visitor_team: matchData.visitorTeam,
        local_team_club_id: matchData.localTeamClubId,
        visitor_team_club_id: matchData.visitorTeamClubId,
        opponent: matchData.visitorTeam,
        status: 'Upcoming' as const,
      };

      if (matchData.id) {
        await partidosService.update(matchData.id, partidoData);
      } else {
        await partidosService.create(partidoData);
      }
    } catch (err) {
      console.error('Error saving match:', err);
      throw err;
    }
  };

  const handleDeleteMatch = async (id: string) => {
    try {
      await partidosService.remove(id);
    } catch (err) {
      console.error('Error deleting match:', err);
      throw err;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">{competicion.nombre}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                Calendario completo · Temporada {competicion.temporada}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={handleOpenMatchModal}
                className="text-[var(--accent)] hover:bg-red-50 transition-colors rounded-lg px-3 py-2 font-black text-xs uppercase tracking-widest flex items-center gap-1"
              >
                <i className="fa-solid fa-plus"></i>
                Nuevo Partido
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <i className="fa-solid fa-spinner text-4xl mb-3 animate-spin"></i>
                <span className="text-sm font-bold uppercase tracking-widest">Cargando calendario...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                <i className="fa-solid fa-circle-exclamation mr-2"></i>
                {error}
              </div>
            ) : jornadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <i className="fa-solid fa-calendar-days text-4xl mb-3"></i>
                <span className="text-sm font-bold uppercase tracking-widest">Todavía no hay calendario cargado</span>
              </div>
            ) : (
              jornadas.map(({ jornada, items }) => (
                <div key={jornada} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Jornada {jornada}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatFecha(items[0].fecha)}</span>
                  </div>
                  <div>
                    {items.map(p => {
                      const localDestacado = esDestacado(p.equipo_local);
                      const visitanteDestacado = esDestacado(p.equipo_visitante);
                      return (
                        <div
                          key={p.id}
                          className="grid items-center px-4 py-3 border-b border-slate-100 last:border-b-0 text-sm"
                          style={{ gridTemplateColumns: '1fr auto 1fr' }}
                        >
                          <span
                            className={`text-right pr-3 ${localDestacado ? 'font-black text-red-600' : 'text-slate-700'}`}
                          >
                            {p.equipo_local}
                          </span>
                          <span className="px-2 text-[10px] font-black text-slate-400 uppercase">
                            {p.resultado || 'vs'}
                          </span>
                          <span
                            className={`text-left pl-3 ${visitanteDestacado ? 'font-black text-red-600' : 'text-slate-700'}`}
                          >
                            {p.equipo_visitante}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Match Modal - Rendered at top level */}
      {matchModalOpen && (
        <MatchModal
          match={editingMatch}
          competitionId={competicion.id}
          competitionName={competicion.nombre}
          competitionTeams={competitionTeams}
          competitions={allCompetitions}
          onSave={handleSaveMatch}
          onDelete={handleDeleteMatch}
          onClose={() => {
            setMatchModalOpen(false);
            setEditingMatch(null);
          }}
        />
      )}
    </>
  );
};

export default CompetitionCalendarModal;
