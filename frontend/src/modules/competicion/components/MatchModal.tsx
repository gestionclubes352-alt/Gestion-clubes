import React, { useState, useEffect, useMemo } from 'react';
import type { CompetitionTeam } from '../types';
import type { Club } from '@modules/clubes/types';
import type { EquipoRival } from '@/shared/services/dataService';
import EquipoSelect, { type EquipoOption } from '@shared/components/EquipoSelect';
import { clubesService, equiposRivalesService, equiposService } from '@shared/services';
import { competicionEquiposService } from '../services/competicionEquiposService';
import { useAuth } from '@/context/AuthContext';
import SearchableSelect from '@shared/components/SearchableSelect';

export interface MatchFormData {
  id?: string;
  date: string;
  time: string;
  competition: string;
  location: string;
  jornada: string;
  localTeam: string;
  visitorTeam: string;
  localTeamClubId?: string;
  visitorTeamClubId?: string;
  nombreInterno?: string;
}

interface MatchModalProps {
  match?: MatchFormData | null;
  competitionId?: string;
  competitionName?: string;
  competitionTeams?: CompetitionTeam[];
  competitions?: Array<{ id: string; nombre: string }>;
  onSave: (match: MatchFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}

const MatchModal: React.FC<MatchModalProps> = ({
  match,
  competitionId,
  competitionName,
  competitionTeams = [],
  competitions = [],
  onSave,
  onDelete,
  onClose,
}) => {
  const { perfil } = useAuth();
  const [formData, setFormData] = useState<MatchFormData>({
    date: match?.date || '',
    time: match?.time || '18:00',
    competition: match?.competition || competitionName || '',
    location: match?.location || '',
    jornada: match?.jornada || '-',
    localTeam: match?.localTeam || '',
    visitorTeam: match?.visitorTeam || '',
    localTeamClubId: match?.localTeamClubId || '',
    visitorTeamClubId: match?.visitorTeamClubId || '',
    nombreInterno: match?.nombreInterno || '',
  });

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configuredOwnTeamIds, setConfiguredOwnTeamIds] = useState<Set<string> | null>(null);
  const [configuredRivalIds, setConfiguredRivalIds] = useState<Set<string>>(new Set());
  const [rivalCatalog, setRivalCatalog] = useState<EquipoRival[]>([]);
  const [equiposInternos, setEquiposInternos] = useState<CompetitionTeam[]>([]);

  // Resolver el id de la competición seleccionada (por nombre, ya que el selector guarda el nombre)
  const selectedCompetitionId = useMemo(() => {
    if (competitionId) return competitionId;
    const found = competitions.find(c => c.nombre === formData.competition);
    return found?.id;
  }, [competitionId, competitions, formData.competition]);

  useEffect(() => {
    const loadClubs = async () => {
      try {
        const data = await clubesService.list();
        setClubs((data as Club[]) || []);
      } catch (err) {
        console.error('Error loading clubs:', err);
      }
    };
    loadClubs();
  }, []);

  useEffect(() => {
    const loadRivalCatalog = async () => {
      try {
        const data = await equiposRivalesService.list();
        setRivalCatalog((data as EquipoRival[]) || []);
      } catch (err) {
        console.error('Error loading rival catalog:', err);
      }
    };
    loadRivalCatalog();
  }, []);

  useEffect(() => {
    const loadEquiposInternos = async () => {
      if (!perfil?.club_id) {
        setEquiposInternos([]);
        return;
      }
      try {
        const data = await equiposService.list({ club_id: perfil.club_id });
        const teams = (data || []).map((e: any): CompetitionTeam => ({
          id: e.id,
          clubId: e.club_id,
          nombre: e.nombre,
          estadio: e.estadio || '',
          localidad: e.localidad || '',
          logoUrl: e.logo_url || undefined,
          equipo: e.sub_equipo,
          nombreEnFed: e.nombre_en_fed,
          etapa: e.categoria,
          competicion: e.competicion,
          enlace: e.enlace,
        }));
        setEquiposInternos(teams);
      } catch (err) {
        console.error('Error loading internal teams:', err);
      }
    };
    loadEquiposInternos();
  }, [perfil?.club_id]);

  useEffect(() => {
    if (!selectedCompetitionId) {
      setConfiguredOwnTeamIds(null);
      setConfiguredRivalIds(new Set());
      return;
    }
    const loadTeams = async () => {
      try {
        const teams = await competicionEquiposService.getTeamsByCompeticion(selectedCompetitionId);
        setConfiguredOwnTeamIds(new Set(teams.filter(t => t.equipoId).map(t => t.equipoId as string)));
        setConfiguredRivalIds(new Set(teams.filter(t => t.equipoRivalId).map(t => t.equipoRivalId as string)));
      } catch (err) {
        console.error('Error loading configured teams:', err);
        setConfiguredOwnTeamIds(null);
        setConfiguredRivalIds(new Set());
      }
    };
    loadTeams();
  }, [selectedCompetitionId]);

  const clubNameById = new Map(clubs.map(club => [String(club.id), club.nombre]));

  const toTeamOption = (team: CompetitionTeam): EquipoOption => ({
    value: team.equipo || team.nombre || '',
    club: team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined,
    clubId: team.clubId != null ? String(team.clubId) : undefined,
  });

  // Si hay equipos propios configurados para esta competición, filtrar solo esos; si no, mostrar todos
  const relevantOwnTeams = configuredOwnTeamIds && configuredOwnTeamIds.size > 0
    ? competitionTeams.filter(team => configuredOwnTeamIds.has(String(team.id)))
    : competitionTeams;

  const relevantRivals = rivalCatalog.filter(rival => configuredRivalIds.has(String(rival.id)));

  // Si la competición solo tiene un equipo propio configurado, se autocompleta como Local
  useEffect(() => {
    if (formData.localTeam) return;
    if (relevantOwnTeams.length !== 1) return;
    const ownTeam = toTeamOption(relevantOwnTeams[0]);
    setFormData(prev =>
      prev.localTeam ? prev : { ...prev, localTeam: ownTeam.value, localTeamClubId: ownTeam.clubId || '' }
    );
  }, [relevantOwnTeams]);

  const teamOptions: EquipoOption[] = [
    ...relevantOwnTeams.map(toTeamOption),
    ...relevantRivals.map((rival): EquipoOption => ({ value: rival.nombre })),
  ].filter(option => option.value.trim().length > 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!formData.date) {
      setError('La fecha es obligatoria');
      return;
    }
    if (!formData.time) {
      setError('La hora es obligatoria');
      return;
    }
    if (!formData.competition) {
      setError('La competición es obligatoria');
      return;
    }
    if (!formData.jornada) {
      setError('La jornada es obligatoria');
      return;
    }
    if (!formData.localTeam || !formData.visitorTeam) {
      setError('Ambos equipos son obligatorios');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        ...formData,
        ...(match?.id && { id: match.id }),
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el partido';
      setError(msg);
      console.error('Error saving match:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!match?.id || !onDelete) return;

    if (window.confirm('¿Estás seguro de que deseas eliminar este partido?')) {
      try {
        setLoading(true);
        await onDelete(match.id);
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al eliminar el partido';
        setError(msg);
        console.error('Error deleting match:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter flex items-center gap-2">
              <i className="fa-solid fa-futbol"></i>
              {match?.id ? 'EDITAR PARTIDO' : 'NUEVO PARTIDO'}
            </h3>
            {competitionName && (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {competitionName}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75dvh] overflow-y-auto flex-1">
          {/* Section: Información del Partido */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-info-circle text-[var(--accent)] text-sm"></i>
              <h4 className="text-[var(--accent)] font-black uppercase tracking-tighter text-sm">
                Información del Partido
              </h4>
            </div>

            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    <i className="fa-solid fa-calendar mr-1"></i>Fecha
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    <i className="fa-solid fa-clock mr-1"></i>Hora
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Competición */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-trophy mr-1"></i>Competición
                </label>
                <SearchableSelect
                  name="competition"
                  value={formData.competition}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--accent)] appearance-none bg-white"
                >
                  <option value="">Selecciona una competición</option>
                  {competitions.map(comp => (
                    <option key={comp.id} value={comp.nombre}>
                      {comp.nombre}
                    </option>
                  ))}
                </SearchableSelect>
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-map-pin mr-1"></i>Ubicación
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Ej: Estadio San Mamés, Campo de Derio..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Jornada */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-list-ol mr-1"></i>Jornada
                </label>
                <SearchableSelect
                  name="jornada"
                  value={formData.jornada}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--accent)] appearance-none bg-white"
                >
                  <option value="">Selecciona jornada</option>
                  <option value="-">-</option>
                  {Array.from({ length: 38 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </SearchableSelect>
              </div>

              {/* Nombre Interno */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-people-group mr-1"></i>Nombre Interno
                </label>
                <SearchableSelect
                  name="nombreInterno"
                  value={formData.nombreInterno}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--accent)] appearance-none bg-white"
                >
                  <option value="">Selecciona equipo interno</option>
                  {equiposInternos.map(equipo => {
                    const nombre = equipo.equipo || equipo.etapa || equipo.nombre;
                    return (
                      <option key={equipo.id} value={nombre}>
                        {nombre}
                      </option>
                    );
                  })}
                </SearchableSelect>
              </div>
            </div>
          </div>

          {/* Section: Equipos */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-people-group text-[var(--accent)] text-sm"></i>
              <h4 className="text-[var(--accent)] font-black uppercase tracking-tighter text-sm">
                Equipos
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-shield mr-1"></i>Local
                </label>
                <EquipoSelect
                  value={formData.localTeam}
                  selectedClubId={formData.localTeamClubId}
                  onChange={(team, clubId) =>
                    setFormData({ ...formData, localTeam: team, localTeamClubId: clubId || '' })
                  }
                  extraTeams={teamOptions}
                  placeholder="Selecciona equipo local"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-shield mr-1"></i>Visitante
                </label>
                <EquipoSelect
                  value={formData.visitorTeam}
                  selectedClubId={formData.visitorTeamClubId}
                  onChange={(team, clubId) =>
                    setFormData({ ...formData, visitorTeam: team, visitorTeamClubId: clubId || '' })
                  }
                  extraTeams={teamOptions}
                  placeholder="Selecciona equipo visitante"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-between">
          {match?.id && onDelete && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-6 py-3 rounded-2xl border border-red-200 text-red-600 font-black text-[11px] uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
            >
              <i className="fa-solid fa-trash-can mr-1"></i>
              ELIMINAR PARTIDO
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-[var(--accent)] text-white font-black text-[11px] uppercase tracking-widest hover:bg-[var(--accent-dark)] transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchModal;
