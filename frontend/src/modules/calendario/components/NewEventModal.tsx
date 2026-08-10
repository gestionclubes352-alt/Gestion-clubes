import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent, EventType, EventFormData } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes/types';
import EquipoSelect, { type EquipoOption } from '../../../shared/components/EquipoSelect';
import { clubesService, equiposRivalesService } from '@shared/services';
import { competicionService, competicionEquiposService } from '@modules/competicion';
import type { Competicion, EquipoRival } from '@shared/services/dataService';

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
}) => {
  const { t } = useTranslation();
  const currentEvent = editEvent ?? event ?? null;
  const [typeSelected, setTypeSelected] = useState<EventType | null>(currentEvent?.type || defaultType);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [competitions, setCompetitions] = useState<Competicion[]>([]);
  const [rivalCatalog, setRivalCatalog] = useState<EquipoRival[]>([]);
  const [configuredOwnTeamIds, setConfiguredOwnTeamIds] = useState<Set<string> | null>(null);
  const [configuredRivalIds, setConfiguredRivalIds] = useState<Set<string>>(new Set());

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
    location: currentEvent?.location || (currentEvent?.type === 'Sesión' ? 'Derio' : ''),
    team: currentEvent?.team || '',
    competition: currentEvent?.competition || '',
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
    if (!currentEvent) {
      setFormData(prev => ({
        ...prev,
        date: toLocalDateString(initialDate)
      }));
    }
  }, [initialDate, currentEvent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Resolver el id de la competición seleccionada (el <select> guarda el nombre, no el id)
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

  const toTeamOption = (team: CompetitionTeam): EquipoOption => ({
    value: team.equipo || team.nombre || '',
    club: team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined,
    clubId: team.clubId != null ? String(team.clubId) : undefined,
  });

  // Si la competición seleccionada tiene equipos configurados, mostrar solo esos (propios + rivales de catálogo);
  // si no hay competición seleccionada o no tiene equipos configurados, mostrar todos como fallback.
  const relevantOwnTeams = configuredOwnTeamIds && configuredOwnTeamIds.size > 0
    ? competitionTeams.filter((team) => configuredOwnTeamIds.has(String(team.id)))
    : competitionTeams;

  const relevantRivals = configuredRivalIds.size > 0
    ? rivalCatalog.filter((rival) => configuredRivalIds.has(String(rival.id)))
    : [];

  const teamOptions: EquipoOption[] = [
    ...relevantOwnTeams.map(toTeamOption),
    ...relevantRivals.map((rival): EquipoOption => ({ value: rival.nombre })),
  ].filter((option) => option.value.trim().length > 0);

  // Para sesiones (entrenamientos propios) solo tiene sentido elegir entre los equipos del propio club
  const subTeamOptions: EquipoOption[] = ownClubId
    ? competitionTeams
        .filter((team) => String(team.clubId) === String(ownClubId))
        .map(toTeamOption)
        .filter((option) => option.value.trim().length > 0)
    : teamOptions;

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
      notes: formData.notes || undefined,
      videoUrl: formData.videoUrl || undefined,
      docUrl: formData.docUrl || undefined,
      competition: formData.competition || undefined,
      jornada: formData.jornada || undefined,
      sessionNumber: formData.sessionNumber ? Number(formData.sessionNumber) : undefined,
      localTeam: formData.localTeam || undefined,
      visitorTeam: formData.visitorTeam || undefined,
      localTeamClubId: formData.localTeamClubId || undefined,
      visitorTeamClubId: formData.visitorTeamClubId || undefined,
      score: formData.score || undefined,
      nombreInterno: formData.nombreInterno || undefined,
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
                <select
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                >
                  <option value="">{t('newEvent.sessionType')}</option>
                  <option value="Sesión equipo">{t('newEvent.teamSession')}</option>
                  <option value="Sesión individual">{t('newEvent.individualSession')}</option>
                  <option value="Gym">{t('newEvent.gym')}</option>
                </select>
              ) : typeSelected !== 'Partido' ? (
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={t('newEvent.titleField')}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#8b2b35]"
                />
              ) : null}

              {(typeSelected === 'Sesión' || (typeSelected !== 'Partido' && typeSelected !== 'Sesión')) && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('newEvent.team')}</p>
                  <EquipoSelect
                    value={formData.team}
                    onChange={(team) => setFormData({ ...formData, team })}
                    extraTeams={subTeamOptions}
                    placeholder={t('newEvent.teamPlaceholder')}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35] appearance-none cursor-pointer bg-white"
                  />
                </div>
              )}

              {typeSelected === 'Sesión' && (
                <select
                  name="sessionNumber"
                  value={formData.sessionNumber}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                >
                  <option value="">{t('newEvent.sessionNumber')}</option>
                  {Array.from({ length: 200 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#8b2b35]"
                />
                <input
                  name="time"
                  type="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#8b2b35]"
                />
              </div>

              {typeSelected === 'Partido' && (
                <>
                  <select
                    name="competition"
                    value={formData.competition}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                  >
                    <option value="">{t('newEvent.competition')}</option>
                    {competitions.map((c) => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                    <option value="Amistoso">{t('newEvent.friendly')}</option>
                  </select>
                </>
              )}

              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder={t('common.location')}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#8b2b35]"
              />

              {typeSelected === 'Partido' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('newEvent.team')}</p>
                    <EquipoSelect
                      value={formData.team}
                      onChange={(team) => setFormData({ ...formData, team })}
                      extraTeams={subTeamOptions}
                      placeholder={t('newEvent.teamPlaceholder')}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35] appearance-none cursor-pointer bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      name="jornada"
                      value={formData.jornada}
                      onChange={handleChange}
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                    >
                      <option value="">{t('newEvent.matchday')}</option>
                      <option value="-">-</option>
                      {Array.from({ length: 38 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                    <select
                      name="nombreInterno"
                      value={formData.nombreInterno}
                      onChange={handleChange}
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35] appearance-none bg-white"
                    >
                      <option value="" disabled hidden>Nombre interno</option>
                      {subTeamOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{t('newEvent.teams')}</p>
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    <EquipoSelect
                      value={formData.localTeam}
                      selectedClubId={formData.localTeamClubId}
                      onChange={(team, clubId) => setFormData({ ...formData, localTeam: team, localTeamClubId: clubId || '' })}
                      extraTeams={teamOptions}
                      placeholder={t('newEvent.homeTeam')}
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[#8b2b35]"
                    />
                    <EquipoSelect
                      value={formData.visitorTeam}
                      selectedClubId={formData.visitorTeamClubId}
                      onChange={(team, clubId) => setFormData({ ...formData, visitorTeam: team, visitorTeamClubId: clubId || '' })}
                      extraTeams={teamOptions}
                      placeholder={t('newEvent.awayTeam')}
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[#8b2b35]"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-red-200 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <i className="fa-solid fa-floppy-disk"></i> {t('newEvent.saveEvent')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewEventModal;
