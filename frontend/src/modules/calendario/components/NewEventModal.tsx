import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent, EventType, EventFormData } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes/types';
import EquipoSelect, { type EquipoOption, compareEquipoNames } from '../../../shared/components/EquipoSelect';
import { clubesService, equiposRivalesService, equiposService, localidadesService, instalacionesCamposService } from '@shared/services';
import { uploadClubLogo } from '@shared/services/photoService';
import { competicionService, competicionEquiposService } from '@modules/competicion';
import type { Competicion, Equipo, EquipoRival, Localidad, InstalacionCampo } from '@shared/services/dataService';
import SearchableSelect from '@shared/components/SearchableSelect';

const toLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const eventTypeLabels: Record<EventType, { label: string; icon: string; color: string }> = {
  Partido: { label: 'Partido', icon: 'fa-futbol', color: 'from-[#FF5A5F] to-[#e54449]' },
  Sesión: { label: 'Sesión', icon: 'fa-person-running', color: 'from-emerald-400 to-emerald-600' },
  Entrenamiento: { label: 'Entrenamiento', icon: 'fa-dumbbell', color: 'from-blue-400 to-blue-600' },
  Actividad: { label: 'Actividad', icon: 'fa-calendar-check', color: 'from-violet-400 to-violet-600' },
  Otro: { label: 'Otro', icon: 'fa-ellipsis', color: 'from-slate-400 to-slate-600' },
};

interface NewEventModalProps {
  initialDate?: Date;
  defaultType?: EventType | null;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: string | number) => void;
  competitionTeams?: CompetitionTeam[];
  editEvent?: CalendarEvent | null;
  event?: CalendarEvent | null;
  /** Club del usuario actual: restringe el selector de equipo de las sesiones a los equipos propios */
  ownClubId?: string;
  /** Notifica al resto de la app que se ha creado un club/equipo nuevo, para que refresquen sus propios listados. */
  onTeamCreated?: () => void;
}

const NewEventModal: React.FC<NewEventModalProps> = ({
  initialDate = new Date(),
  defaultType = null,
  onClose,
  onSave,
  onDelete,
  competitionTeams = [],
  editEvent,
  event,
  ownClubId,
  onTeamCreated,
}) => {
  const { t } = useTranslation();
  const currentEvent = editEvent ?? event ?? null;
  const [typeSelected, setTypeSelected] = useState<EventType | null>(currentEvent?.type || defaultType);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [competitions, setCompetitions] = useState<Competicion[]>([]);
  const [rivalCatalog, setRivalCatalog] = useState<EquipoRival[]>([]);
  const [configuredOwnTeamIds, setConfiguredOwnTeamIds] = useState<Set<string> | null>(null);
  const [configuredRivalIds, setConfiguredRivalIds] = useState<Set<string>>(new Set());
  const [createdCompetitionTeams, setCreatedCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [isAddingLocalTeam, setIsAddingLocalTeam] = useState(false);
  const [isAddingVisitorTeam, setIsAddingVisitorTeam] = useState(false);
  const [isCreatingTeamFromButton, setIsCreatingTeamFromButton] = useState(false);
  const [newTeamFormData, setNewTeamFormData] = useState({ clubId: '', teamName: '', clubName: '', clubLogo: null as File | null });
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [instalacionesCampos, setInstalacionesCampos] = useState<InstalacionCampo[]>([]);
  const [instalacionPrincipalId, setInstalacionPrincipalId] = useState<string>('');
  const hasPendingTeamCreation = isAddingLocalTeam || isAddingVisitorTeam || isCreatingTeamFromButton;

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

    const loadCompetitions = async () => {
      try {
        const data = await competicionService.listCompeticiones();
        setCompetitions(data || []);
      } catch (err) {
        console.error('Error loading competitions:', err);
      }
    };
    loadCompetitions();

    const loadRivalCatalog = async () => {
      try {
        const data = await equiposRivalesService.list();
        setRivalCatalog((data as EquipoRival[]) || []);
      } catch (err) {
        console.error('Error loading rival catalog:', err);
      }
    };
    loadRivalCatalog();

    const loadLocalidades = async () => {
      try {
        const data = await localidadesService.list();
        setLocalidades(data || []);
      } catch (err) {
        console.error('Error loading localidades:', err);
      }
    };
    loadLocalidades();

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

  const typeTranslations: Record<EventType, string> = {
    Partido: t('calendar.match'),
    Sesión: t('newEvent.session'),
    Entrenamiento: t('calendar.training'),
    Actividad: t('newEvent.activity'),
    Otro: t('calendar.other'),
  };

  const [formData, setFormData] = useState<EventFormData>({
    title: currentEvent?.title || '',
    date: currentEvent?.date
      ? (currentEvent.date instanceof Date ? toLocalDateString(currentEvent.date) : String(currentEvent.date).slice(0, 10))
      : toLocalDateString(initialDate),
    time: currentEvent?.time || '18:00',
    location: currentEvent?.location || '',
    localidad_id: currentEvent?.localidad_id || '',
    instalacion_campo_id: currentEvent?.instalacion_campo_id || '',
    team: currentEvent?.team || '',
    competition: currentEvent?.competition || '',
    competicion_tipo: currentEvent?.competicion_tipo || '',
    jornada: currentEvent?.jornada || '',
    sessionNumber: currentEvent?.sessionNumber ? String(currentEvent.sessionNumber) : '',
    localTeam: currentEvent?.localTeam || '',
    visitorTeam: currentEvent?.visitorTeam || '',
    localTeamClubId: currentEvent?.localTeamClubId || '',
    visitorTeamClubId: currentEvent?.visitorTeamClubId || '',
    score: currentEvent?.score || '',
    notes: currentEvent?.notes || '',
    videoUrl: currentEvent?.videoUrl || '',
    docUrl: currentEvent?.docUrl || '',
    nombreInterno: currentEvent?.nombreInterno || '',
  });

  useEffect(() => {
    if (currentEvent) {
      setFormData({
        title: currentEvent.title || '',
        date: currentEvent.date
          ? (currentEvent.date instanceof Date ? toLocalDateString(currentEvent.date) : String(currentEvent.date).slice(0, 10))
          : toLocalDateString(initialDate),
        time: currentEvent.time || '18:00',
        location: currentEvent.location || '',
        localidad_id: currentEvent.localidad_id || '',
        instalacion_campo_id: currentEvent.instalacion_campo_id || '',
        team: currentEvent.team || '',
        competition: currentEvent.competition || '',
        competicion_tipo: currentEvent.competicion_tipo || '',
        jornada: currentEvent.jornada || '',
        sessionNumber: currentEvent.sessionNumber ? String(currentEvent.sessionNumber) : '',
        localTeam: currentEvent.localTeam || '',
        visitorTeam: currentEvent.visitorTeam || '',
        localTeamClubId: currentEvent.localTeamClubId || '',
        visitorTeamClubId: currentEvent.visitorTeamClubId || '',
        score: currentEvent.score || '',
        notes: currentEvent.notes || '',
        videoUrl: currentEvent.videoUrl || '',
        docUrl: currentEvent.docUrl || '',
        nombreInterno: currentEvent.nombreInterno || '',
      });
    } else {
      setFormData(prev => ({
        ...prev,
        date: toLocalDateString(initialDate)
      }));
    }
  }, [initialDate, currentEvent]);

  const instalacionesPrincipales = useMemo(
    () => instalacionesCampos.filter(
      ic => !ic.parent_instalacion_id && (!formData.localidad_id || ic.localidad_id === formData.localidad_id)
    ),
    [instalacionesCampos, formData.localidad_id]
  );

  const camposDisponibles = useMemo(
    () => instalacionesCampos.filter(ic => ic.parent_instalacion_id === instalacionPrincipalId),
    [instalacionesCampos, instalacionPrincipalId]
  );

  // Al editar un evento existente, resolver a qué instalación principal pertenece el campo guardado
  // (o si el propio instalacion_campo_id ya es una instalación principal sin campos hijos).
  useEffect(() => {
    if (!currentEvent?.instalacion_campo_id || instalacionesCampos.length === 0 || instalacionPrincipalId) return;
    const saved = instalacionesCampos.find(ic => ic.id === currentEvent.instalacion_campo_id);
    if (!saved) return;
    setInstalacionPrincipalId(saved.parent_instalacion_id || saved.id);
  }, [currentEvent, instalacionesCampos, instalacionPrincipalId]);

  // Si la instalación principal seleccionada no tiene campos hijos, ella misma es el "campo" a guardar.
  // Si tiene campos, esperar a que el usuario elija uno explícitamente.
  useEffect(() => {
    if (!instalacionPrincipalId) return;
    const campos = instalacionesCampos.filter(ic => ic.parent_instalacion_id === instalacionPrincipalId);
    if (campos.length === 0) {
      setFormData(prev => (prev.instalacion_campo_id === instalacionPrincipalId ? prev : { ...prev, instalacion_campo_id: instalacionPrincipalId }));
    } else if (!campos.some(c => c.id === formData.instalacion_campo_id)) {
      setFormData(prev => (prev.instalacion_campo_id ? { ...prev, instalacion_campo_id: '' } : prev));
    }
  }, [instalacionPrincipalId, instalacionesCampos]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'competition') {
      setFormData({
        ...formData,
        competition: value,
        team: '',
        localTeam: '',
        visitorTeam: '',
        localTeamClubId: '',
        visitorTeamClubId: '',
        nombreInterno: '',
      });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  // Resolver el id de la competición seleccionada (el selector guarda el nombre, no el id)
  const selectedCompetitionId = useMemo(() => {
    const found = competitions.find(c => c.nombre === formData.competition);
    return found?.id;
  }, [competitions, formData.competition]);

  useEffect(() => {
    if (!selectedCompetitionId) {
      setConfiguredOwnTeamIds(null);
      setConfiguredRivalIds(new Set());
      return;
    }
    const loadConfiguredTeams = async () => {
      try {
        const teams = await competicionEquiposService.getTeamsByCompeticion(selectedCompetitionId);
        setConfiguredOwnTeamIds(new Set(teams.filter(t => t.equipoId).map(t => t.equipoId as string)));
        setConfiguredRivalIds(new Set(teams.filter(t => t.equipoRivalId).map(t => t.equipoRivalId as string)));
      } catch (err) {
        console.error('Error loading configured teams for competition:', err);
        setConfiguredOwnTeamIds(null);
        setConfiguredRivalIds(new Set());
      }
    };
    loadConfiguredTeams();
  }, [selectedCompetitionId]);

  const clubNameById = new Map(clubs.map((club) => [String(club.id), club.nombre]));

  // Grupo destacado en el desplegable para los equipos ya adheridos a la competición seleccionada
  const COMPETITION_GROUP = 'Equipos de la competición';

  const toTeamOption = (team: CompetitionTeam, group?: string): EquipoOption => ({
    value: team.equipo || team.nombre || '',
    club: team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined,
    clubId: team.clubId != null ? String(team.clubId) : undefined,
    group,
  });

  const toRivalOption = (rival: EquipoRival, group?: string): EquipoOption => ({
    value: rival.nombre,
    club: rival.club_id != null ? clubNameById.get(String(rival.club_id)) : undefined,
    group,
  });

  // Si la competición seleccionada tiene equipos configurados, mostrar solo esos (propios + rivales de catálogo);
  // si no hay competición seleccionada o no tiene equipos configurados, mostrar todos como fallback.
  const allCompetitionTeams = useMemo(() => {
    const seen = new Set(competitionTeams.map(team => String(team.id)));
    return [
      ...competitionTeams,
      ...createdCompetitionTeams.filter(team => !seen.has(String(team.id))),
    ];
  }, [competitionTeams, createdCompetitionTeams]);

  const relevantOwnTeams = selectedCompetitionId && configuredOwnTeamIds
    ? allCompetitionTeams.filter((team) => configuredOwnTeamIds.has(String(team.id)))
    : [];

  const relevantRivals = configuredRivalIds.size > 0
    ? rivalCatalog.filter((rival) => configuredRivalIds.has(String(rival.id)))
    : [];

  // Resto del catálogo (clubes y equipos ya guardados en el sistema) que todavía no está
  // adherido a la competición seleccionada — se puede buscar por club/equipo y añadir directamente.
  const restOwnTeams = selectedCompetitionId && configuredOwnTeamIds
    ? allCompetitionTeams.filter((team) => !configuredOwnTeamIds.has(String(team.id)))
    : allCompetitionTeams;

  const restRivals = rivalCatalog.filter((rival) => !configuredRivalIds.has(String(rival.id)));

  const sortedRelevantOwnTeams = useMemo(
    () => [...relevantOwnTeams].sort((a, b) => compareEquipoNames(a.equipo || a.nombre || '', b.equipo || b.nombre || '')),
    [relevantOwnTeams]
  );

  const sortedRelevantRivals = useMemo(
    () => [...relevantRivals].sort((a, b) => compareEquipoNames(a.nombre, b.nombre)),
    [relevantRivals]
  );

  const sortedRestOwnTeams = useMemo(
    () => [...restOwnTeams].sort((a, b) => compareEquipoNames(a.equipo || a.nombre || '', b.equipo || b.nombre || '')),
    [restOwnTeams]
  );

  const sortedRestRivals = useMemo(
    () => [...restRivals].sort((a, b) => compareEquipoNames(a.nombre, b.nombre)),
    [restRivals]
  );

  const teamOptions: EquipoOption[] = [
    // 1º: equipos ya adheridos a la competición (ordenados por categoría)
    ...sortedRelevantOwnTeams.map((team) => toTeamOption(team, COMPETITION_GROUP)),
    ...sortedRelevantRivals.map((rival) => toRivalOption(rival, COMPETITION_GROUP)),
    // 2º: resto de clubes/equipos guardados en el sistema, agrupados por club para buscarlos
    ...sortedRestOwnTeams.map((team) => toTeamOption(team, team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined)),
    ...sortedRestRivals.map((rival) => toRivalOption(rival, rival.club_id != null ? clubNameById.get(String(rival.club_id)) : undefined)),
  ].filter((option) => option.value.trim().length > 0);

  // Para sesiones (entrenamientos propios) solo tiene sentido elegir entre los equipos del propio club
  const subTeamOptions: EquipoOption[] = ownClubId
    ? allCompetitionTeams
        .filter((team) => String(team.clubId) === String(ownClubId))
        .map((team) => toTeamOption(team))
        .filter((option) => option.value.trim().length > 0)
        .sort((a, b) => compareEquipoNames(a.value, b.value))
    : [];

  const matchOwnTeamOptions = subTeamOptions;

  const handleCreateTeamForCompetition = async ({ value, club, escudoFile }: { value: string; club?: string; escudoFile?: File }): Promise<EquipoOption> => {
    if (!selectedCompetitionId) throw new Error('Selecciona una competición antes de añadir equipos');
    const clubName = club?.trim();
    const teamName = value.trim();
    if (!clubName || !teamName) throw new Error('Indica club y equipo');

    let dbClub = clubs.find((item) => item.nombre.trim().toLowerCase() === clubName.toLowerCase());
    if (!dbClub) {
      const createdClub = await clubesService.create({ nombre: clubName } as any);
      dbClub = { id: createdClub.id, nombre: createdClub.nombre };
      if (escudoFile && ownClubId) {
        try {
          const escudoUrl = await uploadClubLogo(escudoFile, String(createdClub.id), String(ownClubId));
          await clubesService.update(createdClub.id, { escudo_url: escudoUrl } as any);
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
      competicion: formData.competition,
    } as Partial<Equipo>);

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

    await competicionEquiposService.addTeamToCompeticion(selectedCompetitionId, { equipoId: String(newTeam.id) });
    setCreatedCompetitionTeams(prev => [...prev, newTeam]);
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
  };

  const handleSubmit = () => {
    if (!typeSelected) return;

    const nextEvent: CalendarEvent = {
      ...(currentEvent ?? {}),
      id: currentEvent?.id ?? crypto.randomUUID(),
      title: formData.title || eventTypeLabels[typeSelected].label,
      date: (() => {
        const [year, month, day] = formData.date.split('-').map(Number);
        return new Date(year, month - 1, day);
      })(),
      time: formData.time,
      type: typeSelected,
      team: formData.team || undefined,
      location: formData.location || undefined,
      localidad_id: formData.localidad_id || undefined,
      instalacion_campo_id: formData.instalacion_campo_id || undefined,
      notes: formData.notes || undefined,
      videoUrl: formData.videoUrl || undefined,
      docUrl: formData.docUrl || undefined,
      competition: formData.competition || undefined,
      competicion_tipo: formData.competicion_tipo || undefined,
      jornada: formData.jornada || undefined,
      sessionNumber: formData.sessionNumber ? Number(formData.sessionNumber) : undefined,
      localTeam: formData.localTeam || undefined,
      visitorTeam: formData.visitorTeam || undefined,
      localTeamClubId: formData.localTeamClubId || undefined,
      visitorTeamClubId: formData.visitorTeamClubId || undefined,
      score: formData.score || undefined,
      nombreInterno: formData.team || undefined,
    };

    onSave(nextEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-10 max-h-[90dvh] overflow-y-auto relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 sm:right-6 sm:top-6 text-slate-300 hover:text-red-500 transition text-xl">
          <i className="fa-solid fa-xmark"></i>
        </button>

        {currentEvent && onDelete && (
          <button
            onClick={() => {
              onDelete(currentEvent.id);
              onClose();
            }}
            className="absolute left-4 top-4 sm:left-6 sm:top-6 text-slate-300 hover:text-red-500 transition text-lg"
            title={t('newEvent.deleteEvent')}
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
        )}

        {!typeSelected ? (
          <div className="space-y-8">
            <div>
              <h3 className="text-sport-primary font-black text-2xl uppercase tracking-tight">{t('newEvent.title')}</h3>
              <p className="text-slate-300 text-xs font-bold mt-1">{t('newEvent.selectType')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(eventTypeLabels) as EventType[])
                .filter((type) => type !== 'Entrenamiento')
                .map((type) => {
                  const opt = eventTypeLabels[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTypeSelected(type)}
                      className={`flex flex-col items-center justify-center gap-2 aspect-square rounded-3xl bg-gradient-to-br ${opt.color} text-white shadow-lg hover:scale-105 transition-transform`}
                    >
                      <i className={`fa-solid ${opt.icon} text-4xl`}></i>
                      <span className="font-black uppercase tracking-widest text-[11px]">{typeTranslations[type]}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sport-primary font-black text-xl uppercase tracking-tight flex items-center gap-2">
                <i className={`fa-solid ${eventTypeLabels[typeSelected].icon}`}></i>
                {typeTranslations[typeSelected]}
              </h3>
              <button
                onClick={() => setTypeSelected(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest"
              >
                <i className="fa-solid fa-arrow-left mr-1"></i> {t('newEvent.changeType')}
              </button>
            </div>

            <div className="space-y-4">
              {typeSelected === 'Sesión' ? (
                <SearchableSelect
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                >
                  <option value="">{t('newEvent.sessionType')}</option>
                  <option value="Sesión equipo">{t('newEvent.teamSession')}</option>
                  <option value="Sesión grupal">{t('newEvent.groupSession', { defaultValue: 'Sesión grupal' })}</option>
                  <option value="Sesión individual">{t('newEvent.individualSession')}</option>
                  <option value="Gym">{t('newEvent.gym')}</option>
                </SearchableSelect>
              ) : typeSelected !== 'Partido' ? (
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={t('newEvent.titleField')}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:border-[#8b2b35]"
                />
              ) : null}

              {typeSelected === 'Sesión' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('newEvent.team')}</p>
                    <EquipoSelect
                      value={formData.team}
                      onChange={(team) => setFormData({ ...formData, team })}
                      extraTeams={matchOwnTeamOptions}
                      placeholder={t('newEvent.teamPlaceholder')}
                      useDefaultTeams={false}
                      onCreateOption={handleCreateTeamForCompetition}
                      addNewMode="clubTeam"
                      addLabel="+ Añadir club y equipo..."
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35] appearance-none cursor-pointer bg-white"
                    />
                  </div>
                  <SearchableSelect
                    name="sessionNumber"
                    value={formData.sessionNumber}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                  >
                    <option value="">{t('newEvent.sessionNumber')}</option>
                    {Array.from({ length: 200 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </SearchableSelect>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:border-[#8b2b35]"
                />
                <input
                  name="time"
                  type="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:border-[#8b2b35]"
                />
              </div>

              {typeSelected === 'Partido' && (
                <>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-2">Tipo de competición</p>
                    <select
                      name="competicion_tipo"
                      value={formData.competicion_tipo}
                      onChange={handleChange}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-[#8b2b35] appearance-none bg-white"
                    >
                      <option value="">Selecciona tipo</option>
                      <option value="Liga">Liga</option>
                      <option value="Copa">Copa</option>
                      <option value="Amistoso">Amistoso</option>
                      <option value="Torneo">Torneo</option>
                      <option value="Fase previa">Fase previa</option>
                      <option value="Playoff">Playoff</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-2">{t('newEvent.competition')}</p>
                    <SearchableSelect
                      name="competition"
                      value={formData.competition}
                      onChange={handleChange}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                    >
                      <option value="">{t('newEvent.competition')}</option>
                      {competitions.map((c) => (
                        <option key={c.id} value={c.nombre}>
                          {c.nombre}
                        </option>
                      ))}
                      <option value="Amistoso">{t('newEvent.friendly')}</option>
                    </SearchableSelect>
                  </div>
                  <SearchableSelect
                    name="jornada"
                    value={formData.jornada}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                  >
                    <option value="">{t('newEvent.matchday')}</option>
                    <option value="-">-</option>
                    {Array.from({ length: 38 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </option>
                    ))}
                  </SearchableSelect>
                </>
              )}

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-2">Localidad</p>
                <select
                  name="localidad_id"
                  value={formData.localidad_id || ''}
                  onChange={(e) => {
                    const localidad_id = e.target.value;
                    setFormData({ ...formData, localidad_id });
                    setInstalacionPrincipalId('');
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-[#8b2b35] appearance-none bg-white"
                >
                  <option value="">Selecciona localidad</option>
                  {localidades.map(loc => (
                    <option key={loc.id} value={loc.id || ''}>
                      {loc.nombre} {loc.provincia ? `(${loc.provincia})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-2">Instalación</p>
                <select
                  value={instalacionPrincipalId}
                  onChange={(e) => setInstalacionPrincipalId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-[#8b2b35] appearance-none bg-white"
                >
                  <option value="">Selecciona instalación</option>
                  {instalacionesPrincipales.map(ic => (
                    <option key={ic.id} value={ic.id}>
                      {ic.nombre} {ic.tipo ? `(${ic.tipo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {instalacionPrincipalId && camposDisponibles.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-2">Campo</p>
                  <select
                    value={formData.instalacion_campo_id || ''}
                    onChange={(e) => setFormData({ ...formData, instalacion_campo_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-[#8b2b35] appearance-none bg-white"
                  >
                    <option value="">Selecciona campo</option>
                    {camposDisponibles.map(ic => (
                      <option key={ic.id} value={ic.id}>
                        {ic.nombre} {ic.tipo ? `(${ic.tipo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {typeSelected === 'Partido' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-2">{t('newEvent.team')}</p>
                    <EquipoSelect
                      value={formData.team}
                      onChange={(team) => setFormData({ ...formData, team })}
                      extraTeams={subTeamOptions}
                      placeholder={t('newEvent.teamPlaceholder')}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35] appearance-none cursor-pointer bg-white"
                    />
                  </div>
                  <p className="text-[10px] font-black text-slate-700 font-black uppercase tracking-widest mt-2">{t('newEvent.teams')}</p>
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    <EquipoSelect
                      value={formData.localTeam}
                      selectedClubId={formData.localTeamClubId}
                      onChange={(team, clubId) => setFormData({ ...formData, localTeam: team, localTeamClubId: clubId || '' })}
                      extraTeams={teamOptions}
                      placeholder={t('newEvent.homeTeam')}
                      useDefaultTeams={false}
                      onCreateOption={handleCreateTeamForCompetition}
                      addNewMode="clubTeam"
                      addLabel="+ Añadir club y equipo..."
                      onAddingChange={setIsAddingLocalTeam}
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[#8b2b35]"
                    />
                    <EquipoSelect
                      value={formData.visitorTeam}
                      selectedClubId={formData.visitorTeamClubId}
                      onChange={(team, clubId) => setFormData({ ...formData, visitorTeam: team, visitorTeamClubId: clubId || '' })}
                      extraTeams={teamOptions}
                      placeholder={t('newEvent.awayTeam')}
                      useDefaultTeams={false}
                      onCreateOption={handleCreateTeamForCompetition}
                      addNewMode="clubTeam"
                      addLabel="+ Añadir club y equipo..."
                      onAddingChange={setIsAddingVisitorTeam}
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[#8b2b35]"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 mb-4">
                    <p className="text-[12px] font-semibold text-slate-700 mb-3">Busca el rival para asignar, si no existe crea uno nuevo</p>
                    <button
                      type="button"
                      onClick={() => setIsCreatingTeamFromButton(true)}
                      className="text-[11px] font-black text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                    >
                      <i className="fa-solid fa-plus"></i> Crear nuevo equipo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {hasPendingTeamCreation && (
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center">
                {t('newEvent.confirmPendingTeam')}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={hasPendingTeamCreation}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-red-200 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <i className="fa-solid fa-floppy-disk"></i> {t('newEvent.saveEvent')}
            </button>
          </div>
        )}

        {isCreatingTeamFromButton && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 rounded-3xl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-sport-primary font-black text-lg uppercase tracking-tight">Crear nuevo Club / Equipo</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1 block">Club</label>
                  <SearchableSelect
                    value={newTeamFormData.clubId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setNewTeamFormData(prev => ({
                        ...prev,
                        clubId: selectedId,
                        clubName: selectedId === '__CREATE_NEW__' ? '' : clubs.find(c => String(c.id) === selectedId)?.nombre || ''
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="">Selecciona un club...</option>
                    {[...clubs]
                      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
                      .map(club => (
                        <option key={club.id} value={String(club.id)}>
                          {club.nombre}
                        </option>
                      ))}
                    <option value="__CREATE_NEW__">━━━ 🔴 Crear nuevo club... 🔴 ━━━</option>
                  </SearchableSelect>
                </div>

                {newTeamFormData.clubId === '__CREATE_NEW__' && (
                  <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1 block">Nombre del club</label>
                      <input
                        type="text"
                        value={newTeamFormData.clubName}
                        onChange={(e) => setNewTeamFormData(prev => ({ ...prev, clubName: e.target.value }))}
                        placeholder="ej: Athletic Bilbao"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1 block">Logo del club</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setNewTeamFormData(prev => ({ ...prev, clubLogo: file }));
                        }}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1 block">Nombre del equipo</label>
                  <input
                    type="text"
                    value={newTeamFormData.teamName}
                    onChange={(e) => setNewTeamFormData(prev => ({ ...prev, teamName: e.target.value }))}
                    placeholder="ej: Juvenil A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (newTeamFormData.clubId === '__CREATE_NEW__') {
                        if (!newTeamFormData.clubName.trim() || !newTeamFormData.teamName.trim()) {
                          alert('Completa el nombre del club y equipo');
                          return;
                        }
                      } else {
                        if (!newTeamFormData.clubId || !newTeamFormData.teamName.trim()) {
                          alert('Completa todos los campos');
                          return;
                        }
                      }

                      if (selectedCompetitionId) {
                        try {
                          const clubNameForTeam = newTeamFormData.clubId === '__CREATE_NEW__' ? newTeamFormData.clubName : newTeamFormData.clubName;
                          await handleCreateTeamForCompetition({
                            value: newTeamFormData.teamName,
                            club: clubNameForTeam,
                            escudoFile: newTeamFormData.clubId === '__CREATE_NEW__' ? newTeamFormData.clubLogo || undefined : undefined,
                          });
                          setFormData(prev => ({ ...prev, visitorTeam: newTeamFormData.teamName }));
                          setIsCreatingTeamFromButton(false);
                          setNewTeamFormData({ clubId: '', teamName: '', clubName: '', clubLogo: null });
                        } catch (err) {
                          alert('Error al crear el equipo');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-black hover:opacity-90"
                  >
                    <i className="fa-solid fa-check mr-1"></i> Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingTeamFromButton(false);
                      setNewTeamFormData({ clubId: '', teamName: '', clubName: '', clubLogo: null });
                    }}
                    className="flex-1 px-3 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-300"
                  >
                    <i className="fa-solid fa-xmark mr-1"></i> Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewEventModal;
