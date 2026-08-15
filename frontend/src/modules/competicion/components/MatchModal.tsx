import React, { useState, useEffect, useMemo } from 'react';
import type { CompetitionTeam } from '../types';
import type { Club } from '@modules/clubes/types';
import type { Equipo, EquipoRival, Localidad, InstalacionCampo } from '@/shared/services/dataService';
import EquipoSelect, { type EquipoOption, compareEquipoNames } from '@shared/components/EquipoSelect';
import { clubesService, equiposRivalesService, equiposService, localidadesService, instalacionesCamposService } from '@shared/services';
import { competicionEquiposService } from '../services/competicionEquiposService';
import { uploadClubLogo } from '@shared/services/photoService';
import { useAuth } from '@/context/AuthContext';
import SearchableSelect from '@shared/components/SearchableSelect';

export interface MatchFormData {
  id?: string;
  date: string;
  time: string;
  matchType?: 'Liga' | 'Copa' | 'Amistoso' | 'Torneo';
  competition: string;
  location: string;
  localidad_id?: string;
  instalacion_campo_id?: string;
  jornada: string;
  localTeam: string;
  visitorTeam: string;
  localTeamClubId?: string;
  visitorTeamClubId?: string;
}

interface MatchModalProps {
  match?: MatchFormData | null;
  competitionId?: string;
  competitionName?: string;
  competitionTeams?: CompetitionTeam[];
  competitions?: Array<{ id: string; nombre: string; tipo?: 'Liga' | 'Copa' | 'Amistoso' | 'Torneo' }>;
  onSave: (match: MatchFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
  /** Notifica al resto de la app que se ha creado un club/equipo nuevo, para que refresquen sus propios listados. */
  onTeamCreated?: () => void;
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
  onTeamCreated,
}) => {
  const { perfil } = useAuth();
  const [formData, setFormData] = useState<MatchFormData>({
    date: match?.date || '',
    time: match?.time || '18:00',
    matchType: match?.matchType || '',
    competition: match?.competition || competitionName || '',
    location: match?.location || '',
    jornada: match?.jornada || '-',
    localTeam: match?.localTeam || '',
    visitorTeam: match?.visitorTeam || '',
    localTeamClubId: match?.localTeamClubId || '',
    visitorTeamClubId: match?.visitorTeamClubId || '',
  });

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configuredOwnTeamIds, setConfiguredOwnTeamIds] = useState<Set<string> | null>(null);
  const [configuredRivalIds, setConfiguredRivalIds] = useState<Set<string>>(new Set());
  const [rivalCatalog, setRivalCatalog] = useState<EquipoRival[]>([]);
  const [allEquiposCatalog, setAllEquiposCatalog] = useState<CompetitionTeam[]>([]);
  const [dynamicCompetitionTeams, setDynamicCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [instalacionesCampos, setInstalacionesCampos] = useState<InstalacionCampo[]>([]);
  const [instalacionesFiltradas, setInstalacionesFiltradas] = useState<InstalacionCampo[]>([]);

  // Resolver el id de la competición seleccionada (por nombre, ya que el selector guarda el nombre)
  const selectedCompetitionId = useMemo(() => {
    if (competitionId) return competitionId;
    const found = competitions.find(c => c.nombre === formData.competition);
    return found?.id;
  }, [competitionId, competitions, formData.competition]);

  // Filtrar competiciones por tipo seleccionado
  const filteredCompetitions = useMemo(() => {
    if (!formData.matchType) return competitions;
    return competitions.filter(c => c.tipo === formData.matchType);
  }, [competitions, formData.matchType]);

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
    const loadLocalidades = async () => {
      try {
        const data = await localidadesService.list();
        setLocalidades(data || []);
      } catch (err) {
        console.error('Error loading localidades:', err);
      }
    };
    loadLocalidades();
  }, []);

  useEffect(() => {
    const loadInstalaciones = async () => {
      try {
        const data = await instalacionesCamposService.list();
        setInstalacionesCampos(data || []);
      } catch (err) {
        console.error('Error loading instalaciones:', err);
      }
    };
    loadInstalaciones();
  }, []);

  useEffect(() => {
    if (formData.localidad_id) {
      const filtradas = instalacionesCampos.filter(
        ic => ic.localidad_id === formData.localidad_id
      );
      setInstalacionesFiltradas(filtradas);
    } else {
      setInstalacionesFiltradas(instalacionesCampos);
    }
  }, [formData.localidad_id, instalacionesCampos]);

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
    // Catálogo completo de equipos ya dados de alta en el sistema (de cualquier club), para poder
    // buscarlos como rival/local aunque todavía no estén adheridos a la competición seleccionada.
    const loadAllEquipos = async () => {
      try {
        const data = await equiposService.list();
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
        setAllEquiposCatalog(teams);
      } catch (err) {
        console.error('Error loading equipos catalog:', err);
      }
    };
    loadAllEquipos();
  }, []);

  useEffect(() => {
    if (!selectedCompetitionId) {
      setConfiguredOwnTeamIds(null);
      setConfiguredRivalIds(new Set());
      setDynamicCompetitionTeams([]);
      return;
    }
    const loadTeams = async () => {
      try {
        const teams = await competicionEquiposService.getTeamsByCompeticion(selectedCompetitionId);
        setConfiguredOwnTeamIds(new Set(teams.filter(t => t.equipoId).map(t => t.equipoId as string)));
        setConfiguredRivalIds(new Set(teams.filter(t => t.equipoRivalId).map(t => t.equipoRivalId as string)));

        // Cargar los equipos (de cualquier club) ya adheridos a la competición seleccionada
        const ownTeamIds = teams
          .filter(t => t.equipoId)
          .map(t => t.equipoId as string);

        const competitionTeamsForSelection = allEquiposCatalog.filter(team =>
          ownTeamIds.includes(String(team.id))
        );
        setDynamicCompetitionTeams(competitionTeamsForSelection);
      } catch (err) {
        console.error('Error loading configured teams:', err);
        setConfiguredOwnTeamIds(null);
        setConfiguredRivalIds(new Set());
        setDynamicCompetitionTeams([]);
      }
    };
    loadTeams();
  }, [selectedCompetitionId, allEquiposCatalog]);

  const clubNameById = new Map(clubs.map(club => [String(club.id), club.nombre]));

  const cleanTeamName = (name: string): string => {
    // Remover patrones como "(ef huesca)", "(ef-huesca)", etc.
    return name.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  };

  // Grupo destacado en el desplegable para los equipos ya adheridos a la competición seleccionada
  const COMPETITION_GROUP = 'Equipos de la competición';

  const toTeamOption = (team: CompetitionTeam, group?: string): EquipoOption => ({
    value: team.equipo || team.nombre || '',
    club: team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined,
    clubId: team.clubId != null ? String(team.clubId) : undefined,
    group,
  });

  // Usar los equipos dinámicos cargados para la competición seleccionada
  const relevantOwnTeams = dynamicCompetitionTeams.length > 0
    ? dynamicCompetitionTeams
    : competitionTeams;

  const relevantRivals = rivalCatalog
    .filter(rival => configuredRivalIds.has(String(rival.id)))
    .map(rival => ({
      ...rival,
      nombre: cleanTeamName(rival.nombre),
    }));

  // Resto del catálogo (equipos de cualquier club ya guardados en el sistema) que todavía no
  // está adherido a la competición seleccionada — se puede buscar por club/equipo y añadir directamente.
  const relevantOwnIds = new Set(relevantOwnTeams.map(team => String(team.id)));
  const restOwnTeams = allEquiposCatalog.filter(team => !relevantOwnIds.has(String(team.id)));

  const configuredOrRelevantRivalIds = new Set([
    ...Array.from(configuredRivalIds),
    ...relevantRivals.map(rival => String(rival.id)),
  ]);
  const restRivals = rivalCatalog
    .filter(rival => !configuredOrRelevantRivalIds.has(String(rival.id)))
    .map(rival => ({ ...rival, nombre: cleanTeamName(rival.nombre) }));

  // Si la competición solo tiene un equipo propio configurado, se autocompleta como Local
  useEffect(() => {
    if (formData.localTeam) return;
    if (relevantOwnTeams.length !== 1) return;
    const ownTeam = toTeamOption(relevantOwnTeams[0]);
    setFormData(prev =>
      prev.localTeam ? prev : { ...prev, localTeam: ownTeam.value, localTeamClubId: ownTeam.clubId || '' }
    );
  }, [relevantOwnTeams]);

  const sortedOwnTeams = useMemo(
    () => [...relevantOwnTeams].sort((a, b) => compareEquipoNames(a.equipo || a.nombre || '', b.equipo || b.nombre || '')),
    [relevantOwnTeams]
  );

  const sortedRivals = useMemo(
    () => [...relevantRivals].sort((a, b) => compareEquipoNames(a.nombre, b.nombre)),
    [relevantRivals]
  );

  const sortedRestOwnTeams = useMemo(
    () => [...restOwnTeams].sort((a, b) => compareEquipoNames(a.equipo || a.nombre || '', b.equipo || b.nombre || '')),
    [restOwnTeams]
  );

  const teamOptions: EquipoOption[] = [
    // 1º: equipos ya adheridos a la competición (ordenados por categoría)
    ...sortedOwnTeams.map((team) => toTeamOption(team, COMPETITION_GROUP)),
    ...sortedRivals.map((rival): EquipoOption => ({ value: rival.nombre, group: COMPETITION_GROUP })),
    // 2º: resto de clubes/equipos guardados en el sistema, agrupados por club para buscarlos
    ...sortedRestOwnTeams.map((team) => toTeamOption(team, team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined)),
    ...restRivals.map((rival): EquipoOption => ({
      value: rival.nombre,
      club: rival.club_id != null ? clubNameById.get(String(rival.club_id)) : undefined,
      group: rival.club_id != null ? clubNameById.get(String(rival.club_id)) : undefined,
    })),
  ].filter(option => option.value.trim().length > 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Si cambia el tipo, limpiar la competición si no coincide
    if (name === 'matchType') {
      const selectedType = value as 'Liga' | 'Copa' | 'Amistoso' | 'Torneo' | '';
      const currentCompetition = competitions.find(c => c.nombre === formData.competition);
      if (currentCompetition && selectedType && currentCompetition.tipo !== selectedType) {
        setFormData({ ...formData, [name]: value, competition: '' });
      } else {
        setFormData({ ...formData, [name]: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
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
    if (!formData.matchType) {
      setError('El tipo de partido es obligatorio');
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

  const handleCreateEquipo = async (input: { value: string; club?: string; escudoFile?: File }) => {
    try {
      const clubName = input.club?.trim();
      const teamName = input.value.trim();
      if (!clubName) {
        setError('Debes especificar un club para crear un nuevo equipo');
        return null;
      }
      if (!selectedCompetitionId) {
        setError('Selecciona una competición antes de añadir equipos');
        return null;
      }

      // Da de alta el club (si no existe todavía) y el equipo en el sistema
      let dbClub = clubs.find(c => c.nombre.trim().toLowerCase() === clubName.toLowerCase());
      if (!dbClub) {
        const createdClub = await clubesService.create({ nombre: clubName } as any);
        dbClub = createdClub as Club;
        if (input.escudoFile && perfil?.club_id) {
          try {
            const escudoUrl = await uploadClubLogo(input.escudoFile, String(dbClub.id), String(perfil.club_id));
            dbClub = await clubesService.update(dbClub.id, { escudo_url: escudoUrl } as any) as Club;
          } catch (err) {
            console.error('Error uploading club logo:', err);
          }
        }
        setClubs(prev => [...prev, dbClub as Club]);
      }

      const createdEquipo = await equiposService.create({
        club_id: String(dbClub.id),
        nombre: clubName,
        sub_equipo: teamName,
        competicion: formData.competition || undefined,
      } as Partial<Equipo>);

      // Lo añade directamente a la competición actual
      await competicionEquiposService.addTeamToCompeticion(selectedCompetitionId, {
        equipoId: String(createdEquipo.id),
      });

      const newTeam: CompetitionTeam = {
        id: createdEquipo.id,
        clubId: createdEquipo.club_id,
        nombre: createdEquipo.nombre,
        estadio: createdEquipo.estadio || '',
        localidad: createdEquipo.localidad || '',
        logoUrl: createdEquipo.logo_url || undefined,
        equipo: createdEquipo.sub_equipo,
        nombreEnFed: createdEquipo.nombre_en_fed,
        etapa: createdEquipo.categoria,
        competicion: createdEquipo.competicion,
        enlace: createdEquipo.enlace,
      };
      setDynamicCompetitionTeams(prev => [...prev, newTeam]);
      setAllEquiposCatalog(prev => [...prev, newTeam]);
      setConfiguredOwnTeamIds(prev => {
        const next = new Set(prev ?? []);
        next.add(String(newTeam.id));
        return next;
      });
      onTeamCreated?.();

      return {
        value: newTeam.equipo || newTeam.nombre,
        club: clubName,
        clubId: String(newTeam.clubId ?? ''),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear el equipo';
      setError(msg);
      console.error('Error creating team:', err);
      throw err;
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

              {/* Tipo */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-layer-group mr-1"></i>Tipo
                </label>
                <select
                  name="matchType"
                  value={formData.matchType || ''}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--accent)] appearance-none bg-white"
                >
                  <option value="">Selecciona tipo</option>
                  <option value="Liga">Liga</option>
                  <option value="Copa">Copa</option>
                  <option value="Amistoso">Amistoso</option>
                  <option value="Torneo">Torneo</option>
                </select>
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
                  {filteredCompetitions.map(comp => (
                    <option key={comp.id} value={comp.nombre}>
                      {comp.nombre}
                    </option>
                  ))}
                </SearchableSelect>
              </div>

              {/* Localidad */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-map-pin mr-1"></i>Localidad
                </label>
                <select
                  name="localidad_id"
                  value={formData.localidad_id || ''}
                  onChange={(e) => setFormData({ ...formData, localidad_id: e.target.value || undefined, instalacion_campo_id: undefined })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--accent)] appearance-none bg-white"
                >
                  <option value="">Selecciona localidad</option>
                  {localidades.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.nombre} {loc.provincia ? `(${loc.provincia})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instalación/Campo */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-fence mr-1"></i>Instalación / Campo
                </label>
                <select
                  name="instalacion_campo_id"
                  value={formData.instalacion_campo_id || ''}
                  onChange={(e) => setFormData({ ...formData, instalacion_campo_id: e.target.value || undefined })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[var(--accent)] appearance-none bg-white"
                  disabled={!formData.localidad_id}
                >
                  <option value="">
                    {formData.localidad_id ? 'Selecciona instalación' : 'Selecciona localidad primero'}
                  </option>
                  {instalacionesFiltradas.map(ic => (
                    <option key={ic.id} value={ic.id}>
                      {ic.nombre} {ic.tipo ? `(${ic.tipo})` : ''}
                    </option>
                  ))}
                </select>
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
                  useDefaultTeams={false}
                  placeholder="Selecciona equipo local"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[var(--accent)]"
                  onCreateOption={handleCreateEquipo}
                  addNewMode="clubTeam"
                  addLabel="+ Añadir club y equipo..."
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
                  useDefaultTeams={false}
                  placeholder="Selecciona equipo visitante"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[var(--accent)]"
                  onCreateOption={handleCreateEquipo}
                  addNewMode="clubTeam"
                  addLabel="+ Añadir club y equipo..."
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
