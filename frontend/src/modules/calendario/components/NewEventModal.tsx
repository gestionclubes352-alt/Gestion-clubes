import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent, EventType, EventFormData } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes/types';
import EquipoSelect, { type EquipoOption } from '../../../shared/components/EquipoSelect';
import { clubesService } from '@shared/services';

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
}) => {
  const { t } = useTranslation();
  const currentEvent = editEvent ?? event ?? null;
  const [typeSelected, setTypeSelected] = useState<EventType | null>(currentEvent?.type || defaultType);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>(currentEvent?.clubId || '');

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
      ? (currentEvent.date instanceof Date ? currentEvent.date.toISOString().slice(0, 10) : String(currentEvent.date).slice(0, 10))
      : initialDate.toISOString().slice(0, 10),
    time: currentEvent?.time || '18:00',
    location: currentEvent?.location || (currentEvent?.type === 'Sesión' ? 'Derio' : ''),
    team: currentEvent?.team || '',
    competition: currentEvent?.competition || '',
    jornada: currentEvent?.jornada || '',
    sessionNumber: currentEvent?.sessionNumber ? String(currentEvent.sessionNumber) : '',
    localTeam: currentEvent?.localTeam || '',
    visitorTeam: currentEvent?.visitorTeam || '',
    score: currentEvent?.score || '',
    notes: currentEvent?.notes || '',
    videoUrl: currentEvent?.videoUrl || '',
    docUrl: currentEvent?.docUrl || '',
  });

  useEffect(() => {
    if (!currentEvent) {
      setFormData(prev => ({
        ...prev,
        date: initialDate.toISOString().slice(0, 10)
      }));
    }
  }, [initialDate, currentEvent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const clubNameById = new Map(clubs.map((club) => [String(club.id), club.nombre]));

  const teamOptions: EquipoOption[] = competitionTeams
    .map((team) => ({
      value: team.equipo || team.nombre || '',
      club: team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined,
    }))
    .filter((option) => option.value.trim().length > 0);

  const subTeamOptions = teamOptions;

  const handleSubmit = () => {
    if (!typeSelected) return;

    const nextEvent: CalendarEvent = {
      ...(currentEvent ?? {}),
      id: currentEvent?.id ?? crypto.randomUUID(),
      title: formData.title || eventTypeLabels[typeSelected].label,
      date: new Date(formData.date),
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
      score: formData.score || undefined,
      clubId: selectedClub || undefined,
    };

    onSave(nextEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-10 max-h-[90vh] overflow-y-auto relative animate-fade-in"
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

              {typeSelected === 'Sesión' && (
                <div className="space-y-4">
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
                </div>
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
                    value={selectedClub}
                    onChange={(e) => setSelectedClub(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                  >
                    <option value="">{t('newEvent.club') || 'Club'}</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.nombre}
                      </option>
                    ))}
                  </select>
                  <select
                    name="competition"
                    value={formData.competition}
                    onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#8b2b35]"
                  >
                    <option value="">{t('newEvent.competition')}</option>
                    <option value="Liga">{t('newEvent.league')}</option>
                    <option value="Copa">{t('newEvent.cup')}</option>
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
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      name="jornada"
                      value={formData.jornada}
                      onChange={handleChange}
                      placeholder={t('newEvent.matchdayPlaceholder')}
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#8b2b35]"
                    />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{t('newEvent.teams')}</p>
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    <EquipoSelect
                      value={formData.localTeam}
                      onChange={(team) => setFormData({ ...formData, localTeam: team })}
                      extraTeams={teamOptions}
                      placeholder={t('newEvent.homeTeam')}
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[#8b2b35]"
                    />
                    <EquipoSelect
                      value={formData.visitorTeam}
                      onChange={(team) => setFormData({ ...formData, visitorTeam: team })}
                      extraTeams={teamOptions}
                      placeholder={t('newEvent.awayTeam')}
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none cursor-pointer bg-white focus:outline-none focus:border-[#8b2b35]"
                    />
                  </div>
                  <input
                    name="score"
                    value={formData.score}
                    onChange={handleChange}
                    placeholder={t('newEvent.resultPlaceholder')}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold mt-1"
                  />
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
