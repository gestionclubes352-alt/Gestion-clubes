import React, { useState, useRef, useMemo, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadPlayerPhoto } from '../../../shared/services/photoService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Player } from '../types';
import type { CompetitionTeam } from '../../competicion/types';
import type { CalendarEvent } from '../../calendario/types';
import { getAttendanceSessionScope, getPlayerSessionAttendance, hasRecordedAttendance } from '../../calendario/utils/attendance';
import type { Match, MatchReport } from '@modules/partidos/types';
import type { Club } from '@modules/clubes/types';
import { computeMatchStats } from '../../partidos/components/PlayerStatsSummary';
import { db } from '@shared/services/dataService';
import PlayerStatsCharts from './PlayerStatsCharts';
import SearchableSelect from '@shared/components/SearchableSelect';

const PlayerMatchBreakdown = lazy(() => import('./PlayerMatchBreakdown'));
const PlayerPositionMap = lazy(() => import('./PlayerPositionMap'));

interface EditPlayerModalProps {
  player: Player;
  clubId: string;
  /** Equipos reales de Supabase a los que se puede asignar el jugador (de todos los clubes, propio y rivales) */
  equipos: CompetitionTeam[];
  /** Eventos del calendario (para calcular la asistencia a sesiones) */
  events?: CalendarEvent[];
  /** Partidos disponibles (para el desglose por competición y partido) */
  matches?: Match[];
  /** Clubes reales de Supabase (para mostrar el nombre de club en el desglose de partidos) */
  clubes?: Club[];
  onClose: () => void;
  onSave: (player: Player, originalId?: Player['id']) => Promise<void>;
}

const isPersistedImage = (value?: string | null): value is string =>
  typeof value === 'string' && /^(https?:\/\/|data:image\/|\/)/i.test(value);

const slugify = (value: string): string =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');

const getBirthYear = (fecha?: string): number | undefined => {
  const match = (fecha || '').match(/^(\d{4})-\d{2}-\d{2}$/);
  return match ? parseInt(match[1], 10) : undefined;
};

const normalizeTeamKey = (value?: string | number | null): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

const createCompressedPhotoDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxSize = 720;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo preparar la imagen'));
        return;
      }

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen'));
    };

    image.src = objectUrl;
  });

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ player, clubId, equipos, events, matches, clubes, onClose, onSave }) => {
  const { t } = useTranslation();
  const isHuesca = clubId === 'escuela-huesca' || player.club?.toUpperCase().includes('HUESCA'); // v2
  const initialPhotoUrl = isPersistedImage(player.fotoUrl) ? player.fotoUrl : '';
  const [formData, setFormData] = useState<Player>({ ...player, fotoUrl: player.fotoUrl || '', estado: player.estado || 'APTO', fechaNacimiento: player.fechaNacimiento || '2000-01-01' });
  const [preview, setPreview] = useState<string | null>(initialPhotoUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File|null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const attendanceStats = useMemo(() => {
    const pid = String(player.id);
    const teamNameByKey = new Map<string, string>();

    equipos.forEach((team) => {
      const label = team.equipo || team.nombre || 'Sin equipo';
      [team.id, team.equipo, team.nombre, team.nombreEnFed]
        .filter((value): value is string | number => value !== undefined && value !== null && String(value).trim().length > 0)
        .forEach((value) => {
          const key = normalizeTeamKey(value);
          if (key && !teamNameByKey.has(key)) teamNameByKey.set(key, label);
        });
    });

    const resolveSessionTeam = (team?: string) => {
      const raw = (team || '').trim();
      if (!raw) return 'Sin equipo';
      return teamNameByKey.get(normalizeTeamKey(raw)) || raw;
    };

    const stats = (events || []).filter(hasRecordedAttendance).reduce((acc, session) => {
      const sessionTeam = resolveSessionTeam(session.team);
      const teamKey = normalizeTeamKey(sessionTeam) || 'sin-equipo';
      const teamStats = acc.byTeam[teamKey] ?? {
        team: sessionTeam,
        scheduled: 0,
        total: 0,
        attended: 0,
        absences: 0,
      };
      acc.byTeam[teamKey] = teamStats;

      teamStats.scheduled += 1;
      acc.equipoTotal += 1;
      const result = getPlayerSessionAttendance(session, pid);
      if (!result.counted) return acc;

      const scope = getAttendanceSessionScope(session);
      const scopeStats = scope === 'individual'
        ? acc.individual
        : scope === 'group'
        ? acc.group
        : acc.team;

      acc.total += 1;
      scopeStats.total += 1;
      teamStats.total += 1;

      if (result.attended) {
        acc.attended += 1;
        scopeStats.attended += 1;
        teamStats.attended += 1;
      } else {
        const reason = result.status || 'Otro';
        acc.absences += 1;
        scopeStats.absences += 1;
        teamStats.absences += 1;
        acc.absenceReasons[reason] = (acc.absenceReasons[reason] || 0) + 1;
      }
      return acc;
    }, {
      equipoTotal: 0,
      total: 0,
      attended: 0,
      absences: 0,
      team: { total: 0, attended: 0, absences: 0 },
      group: { total: 0, attended: 0, absences: 0 },
      individual: { total: 0, attended: 0, absences: 0 },
      absenceReasons: {} as Record<string, number>,
      byTeam: {} as Record<string, { team: string; scheduled: number; total: number; attended: number; absences: number }>,
    });

    return {
      ...stats,
      byTeam: Object.values(stats.byTeam).sort((a, b) => b.scheduled - a.scheduled || a.team.localeCompare(b.team)),
    };
  }, [equipos, events, player.id]);

  // Datos de partido reales, calculados a partir de las actas registradas (no editables a mano).
  const [matchReports, setMatchReports] = useState<MatchReport[]>([]);
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await db.match_reports.get();
        if (!cancelled) {
          const reports = Array.isArray(data) ? data.slice(0, 500) : [];
          setMatchReports(reports as MatchReport[]);
        }
      } catch (err) {
        console.error('No se pudieron cargar los partes de partido', err);
        if (!cancelled) setMatchReports([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Muestra gráficas detalladas solo si hay datos y el usuario las quiere ver
  useEffect(() => {
    if (matchReports.length > 0) {
      const timer = requestIdleCallback(() => setShowDetailedStats(true), { timeout: 2000 });
      return () => cancelIdleCallback(timer);
    }
  }, [matchReports]);

  const matchStats = useMemo(() => {
    const pid = String(player.id);
    const reportById = new Map(matchReports.map(r => [String(r.id), r]));
    let partidosJugados = 0;
    let minutos = 0;
    let titular = 0;
    let goles = 0;
    let totalTeamMatches = 0;
    let totalTeamMinutes = 0;

    try {
      (matches || []).forEach(match => {
        const report = reportById.get(String(match.id));
        if (!report) return;

        totalTeamMatches += 1;
        const stats = computeMatchStats(report);

        // Calcula minutos totales del equipo por partido
        let teamMinutesThisMatch = 0;
        if (stats.minutesByPlayer && stats.minutesByPlayer.size > 0) {
          stats.minutesByPlayer.forEach(minutes => {
            if (typeof minutes === 'number' && isFinite(minutes)) {
              teamMinutesThisMatch += minutes;
            }
          });
        }
        totalTeamMinutes += teamMinutesThisMatch;

        if (!stats.involvedIds.has(pid)) return;

        partidosJugados += 1;
        minutos += stats.minutesByPlayer.get(pid) ?? 0;
        if (stats.starterIds.has(pid)) titular += 1;
        goles += stats.goalsByPlayer.get(pid) ?? 0;
      });
    } catch (error) {
      console.error('Error en matchStats:', error);
    }

    const playerAvailableMatches = totalTeamMatches > 0 ? totalTeamMatches : undefined;

    return { partidosJugados, minutos, titular, goles, totalTeamMatches, totalTeamMinutes, playerAvailableMatches };
  }, [matches, matchReports, player.id]);

  const modalRef = useRef<HTMLDivElement>(null);

  const normalizePlayerId = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');
  const resolvePlayerId = (data: Player) => {
    const dni = normalizePlayerId(String(data.dni || ''));
    return dni || String(data.id || '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (field: keyof Player, value: any) => {
    setFormData(prev => {
      const next: Player = { ...prev, [field]: value };
      if (field === 'nombrePila' || field === 'primerApellido' || field === 'segundoApellido') {
        const nombrePila = field === 'nombrePila' ? value : (prev.nombrePila || '');
        const primerApellido = field === 'primerApellido' ? value : (prev.primerApellido || '');
        const segundoApellido = field === 'segundoApellido' ? value : (prev.segundoApellido || '');
        next.nombre = `${nombrePila} ${primerApellido}`.replace(/\s+/g, ' ').trim().toUpperCase();
        next.nombreCompleto = `${nombrePila} ${primerApellido} ${segundoApellido}`.replace(/\s+/g, ' ').trim();
      }
      if (field === 'fechaNacimiento') {
        next.anioNacimiento = getBirthYear(value);
      }
      if (field === 'competicion') {
        next.competicionId = slugify(value);
      }
      return next;
    });
  };

  const handleEquipoSelect = (equipoId: string) => {
    const team = equipos.find(t => String(t.id) === equipoId);
    console.log('[EditPlayerModal] Equipo seleccionado:', { equipoId, teamNombre: team?.nombre, teamId: team?.id });
    setFormData(prev => ({
      ...prev,
      equipoId,
      equipo: team?.equipo || team?.nombre || '',
      club: team?.nombre || prev.club,
      clubId: team?.clubId ? String(team.clubId) : prev.clubId,
    }));
  };

  // Club al que se asigna el jugador (propio o rival). Al cambiarlo se resetea el equipo,
  // ya que los equipos disponibles dependen del club seleccionado.
  const handleClubSelect = (newClubId: string) => {
    const clubRow = (clubes || []).find(c => String(c.id) === newClubId);
    setFormData(prev => ({
      ...prev,
      clubId: newClubId,
      club: clubRow?.nombre || '',
      equipoId: '',
      equipo: '',
    }));
  };

  // Equipos disponibles para el club actualmente seleccionado (propio o rival)
  const equiposDelClubSeleccionado = useMemo(
    () => equipos.filter(eq => String(eq.clubId ?? '') === String(formData.clubId ?? '')),
    [equipos, formData.clubId]
  );
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const originalId = player.id;
      const resolvedId = resolvePlayerId(formData);
      let fotoUrl = formData.fotoUrl;
      // Si hay foto, subirla; si no, dejar campo vacío o actual
      if (photoFile) {
        try {
          fotoUrl = await uploadPlayerPhoto(photoFile, resolvedId || String(Date.now()), clubId);
        } catch (uploadErr) {
          console.warn('No se pudo subir la foto:', uploadErr);
          try {
            fotoUrl = await createCompressedPhotoDataUrl(photoFile);
          } catch (compressErr) {
            console.warn('No se pudo comprimir la foto:', compressErr);
            if (preview && preview.startsWith('data:image/')) {
              fotoUrl = preview;
            }
          }
        }
      }
      // Si no hay foto, permitir guardar sin fotoUrl
      const extended = isHuesca ? {
        clubId,
        equipoId: formData.equipoId,
        competicionId: formData.competicionId || slugify(formData.competicion || ''),
        anioNacimiento: formData.anioNacimiento ?? getBirthYear(formData.fechaNacimiento),
        nombreCompleto: formData.nombreCompleto || `${formData.nombrePila || ''} ${formData.primerApellido || ''} ${formData.segundoApellido || ''}`.replace(/\s+/g, ' ').trim(),
      } : {};
      await onSave({
        ...formData,
        ...extended,
        id: resolvedId,
        dni: normalizePlayerId(String(formData.dni || '')) || undefined,
        fotoUrl: fotoUrl || '',
        partidosJugados: matchStats.partidosJugados,
        minutos: matchStats.minutos,
        titular: matchStats.titular,
        goles: matchStats.goles,
      }, originalId);
      onClose();
    } catch (err) {
      console.error('Error guardando jugador:', err);
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('Detalles del error:', errorMsg);
      alert(`${t('editPlayer.saveError')}: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFullscreen = async () => {
    if (!modalRef.current) return;
    
    if (!isFullscreen) {
      try {
        if (modalRef.current.requestFullscreen) {
          await modalRef.current.requestFullscreen();
        } else if ((modalRef.current as any).webkitRequestFullscreen) {
          await (modalRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error al entrar en pantalla completa:', err);
      }
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if ((document as any).webkitFullscreenElement) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error al salir de pantalla completa:', err);
      }
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && !((document as any).webkitFullscreenElement)) {
      setIsFullscreen(false);
    }
  };

  React.useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Establecer "Juvenil A" como equipo por defecto si no hay uno asignado (solo para el propio club:
  // un jugador rival recién creado no tiene club todavía, así que no debe autoasignarse un equipo).
  useEffect(() => {
    if (formData.equipoId || String(formData.clubId ?? '') !== String(clubId)) return;
    const propios = equipos.filter(eq => String(eq.clubId ?? '') === String(clubId));
    if (propios.length === 0) return;
    const juvenilA = propios.find(eq => (eq.equipo || eq.nombre || '').includes('Juvenil A'));
    if (juvenilA) {
      handleEquipoSelect(String(juvenilA.id));
    }
  }, [equipos, formData.equipoId, formData.clubId, clubId]);

  const exportPlayerProfile = async () => {
    const target = exportRef.current;
    if (!target) return;

    const prevMaxHeight = target.style.maxHeight;
    const prevOverflow = target.style.overflow;
    const scrollEl = target.querySelector('[data-export-scroll]') as HTMLDivElement | null;
    const prevScrollOverflow = scrollEl?.style.overflow;
    const prevScrollMaxHeight = scrollEl?.style.maxHeight;
    target.style.maxHeight = 'none';
    target.style.overflow = 'visible';
    if (scrollEl) {
      scrollEl.style.overflow = 'visible';
      scrollEl.style.maxHeight = 'none';
    }

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    target.style.maxHeight = prevMaxHeight;
    target.style.overflow = prevOverflow;
    if (scrollEl) {
      scrollEl.style.overflow = prevScrollOverflow || '';
      scrollEl.style.maxHeight = prevScrollMaxHeight || '';
    }

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let position = 0;
    let heightLeft = imgHeight;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeName = (formData.nombre || 'jugador').replace(/\s+/g, '_');
    pdf.save(`ficha_${safeName}.pdf`);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div ref={modalRef} className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fade-in text-slate-800 flex flex-col transition-all duration-300 ${isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-5xl max-h-[95dvh] sm:max-h-[85dvh]'}`}>
        <div className="p-3 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-[var(--accent)] font-black text-lg sm:text-xl uppercase tracking-tighter">{t('editPlayer.title')}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 hidden sm:block">{t('editPlayer.cloudSync')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto flex-1" data-export-scroll ref={exportRef}>
          {/* === CABECERA: Foto + Datos básicos === */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Foto compacta */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div
                  onClick={triggerFileInput}
                  className="w-28 h-32 rounded-2xl border-2 border-dashed border-[var(--accent)]/20 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all overflow-hidden group shadow-inner"
                >
                  {preview ? (
                    <img loading="lazy" decoding="async"
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover object-top group-hover:opacity-75 transition-opacity"
                    />
                  ) : (
                    <>
                      <i className="fa-solid fa-camera text-[var(--accent)] text-xl mb-1 opacity-20"></i>
                      <span className="text-[var(--accent)] text-[9px] font-black uppercase opacity-40">{t('editPlayer.uploadPhoto')}</span>
                    </>
                  )}
                </div>
                <div
                  onClick={triggerFileInput}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-red-700 transition-colors border-2 border-white text-xs"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                </div>
              </div>
            </div>

            {/* Datos básicos al lado de la foto */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Los 3 campos de nombre aparecen primero para todos */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.firstName', 'Nombre')}</label>
                <input type="text" value={formData.nombrePila || ''} onChange={(e) => handleChange('nombrePila' as keyof Player, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 font-semibold text-slate-700" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.firstSurname', 'Primer apellido')}</label>
                <input type="text" value={formData.primerApellido || ''} onChange={(e) => handleChange('primerApellido' as keyof Player, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 font-semibold text-slate-700" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.secondSurname', 'Segundo apellido')}</label>
                <input type="text" value={formData.segundoApellido || ''} onChange={(e) => handleChange('segundoApellido' as keyof Player, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 font-semibold text-slate-700" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.fullName', 'Nombre Completo')}</label>
                <input
                  type="text"
                  value={`${formData.nombrePila || ''} ${formData.primerApellido || ''}`.trim().toUpperCase()}
                  readOnly
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-[var(--accent)] disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.nickname')}</label>
                <input
                  type="text"
                  value={formData.apodo || ''}
                  onChange={(e) => handleChange('apodo', e.target.value.toUpperCase())}
                  placeholder={t('editPlayer.nicknamePlaceholder')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 font-black text-[var(--accent)] uppercase"
                />
              </div>
              {!isHuesca && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.dni', 'DNI')}</label>
                  <input
                    type="text"
                    value={formData.dni || ''}
                    onChange={(e) => handleChange('dni', e.target.value.toUpperCase())}
                    placeholder="12345678A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 font-black text-[var(--accent)] uppercase"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('players.number')}</label>
                <input
                  type="number"
                  value={formData.dorsal ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    handleChange('dorsal', raw === '' ? undefined : parseInt(raw, 10));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('common.status')}</label>
                <SearchableSelect
                  value={formData.estado || 'APTO'}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
                >
                  <option value="APTO">{t('editPlayer.fit')} {'\u{1F7E2}'}</option>
                  <option value="LESIONADO">{t('editPlayer.injured')} {'\u{1F534}'}</option>
                  <option value="OTRO">{t('editPlayer.otherStatus')} {'\u{1F7E0}'}</option>
                </SearchableSelect>
              </div>
            </div>
          </div>

          {/* === CAMPOS DE CONFIGURACIÓN en grid compacto === */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('common.position', 'Posición')}</label>
              <SearchableSelect
                value={formData.posicion}
                onChange={(e) => handleChange('posicion', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
              >
                <option value="Portero">{t('players.goalkeeper')}</option>
                <option value="Defensa">{t('players.defender')}</option>
                <option value="Medio">{t('players.midfielder')}</option>
                <option value="Delantero">{t('players.forward')}</option>
              </SearchableSelect>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.concretePosition', 'Posición Concreta')}</label>
              <SearchableSelect
                value={formData.otraDemarcacion || ''}
                onChange={(e) => handleChange('otraDemarcacion' as keyof Player, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">–</option>
                {isHuesca ? (
                  <>
                    <option value="Portero">Portero</option>
                    <option value="Lateral Dcho">Lateral Dcho</option>
                    <option value="Lateral Izdo">Lateral Izdo</option>
                    <option value="Central Dcho">Central Dcho</option>
                    <option value="Central Izdo">Central Izdo</option>
                    <option value="Pivote">Pivote</option>
                    <option value="Media punta">Media punta</option>
                    <option value="Interior Dcho">Interior Dcho</option>
                    <option value="Interior Izdo">Interior Izdo</option>
                    <option value="Extremo Dcho">Extremo Dcho</option>
                    <option value="Extremo Izdo">Extremo Izdo</option>
                    <option value="Delantero">Delantero</option>
                  </>
                ) : (
                  <>
                    <option value="Portero">{t('players.goalkeeper')}</option>
                    <option value="Lateral Dcho">Lateral Dcho</option>
                    <option value="Lateral Izdo">Lateral Izdo</option>
                    <option value="Central Dcho">Central Dcho</option>
                    <option value="Central Izdo">Central Izdo</option>
                    <option value="Pivote">Pivote</option>
                    <option value="Media punta">Media punta</option>
                    <option value="Interior Dcho">Interior Dcho</option>
                    <option value="Interior Izdo">Interior Izdo</option>
                    <option value="Extremo Dcho">Extremo Dcho</option>
                    <option value="Extremo Izdo">Extremo Izdo</option>
                    <option value="Delantero">{t('players.forward')}</option>
                  </>
                )}
              </SearchableSelect>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.otherPosition', 'Otra Posición')}</label>
              <SearchableSelect
                value={formData.posicionJuego || ''}
                onChange={(e) => handleChange('posicionJuego', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">–</option>
                <option value="Portero">{t('players.goalkeeper')}</option>
                <option value="Defensa">{t('players.defender')}</option>
                <option value="Medio">{t('players.midfielder')}</option>
                <option value="Delantero">{t('players.forward')}</option>
              </SearchableSelect>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.concreteOtherPosition', 'Otra Posición Concreta')}</label>
              <SearchableSelect
                value={formData.otraPosicion || ''}
                onChange={(e) => handleChange('otraPosicion' as keyof Player, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">–</option>
                <option value="Portero">Portero</option>
                <option value="Lateral Dcho">Lateral Dcho</option>
                <option value="Lateral Izdo">Lateral Izdo</option>
                <option value="Central Dcho">Central Dcho</option>
                <option value="Central Izdo">Central Izdo</option>
                <option value="Medio centro 6">Medio centro 6</option>
                <option value="Medio centro 8">Medio centro 8</option>
                <option value="Interior Dcho">Interior Dcho</option>
                <option value="Interior Izdo">Interior Izdo</option>
                <option value="Extremo Dcho">Extremo Dcho</option>
                <option value="Extremo Izdo">Extremo Izdo</option>
                <option value="Media punta">Media punta</option>
                <option value="Delantero">Delantero</option>
              </SearchableSelect>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.laterality')}</label>
              <SearchableSelect
                value={formData.perfil}
                onChange={(e) => handleChange('perfil', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
              >
                <option value="D">{t('editPlayer.rightFootLabel', 'Diestro')}</option>
                <option value="I">{t('editPlayer.leftFootLabel', 'Zurdo')}</option>
                <option value="A">{t('editPlayer.bothFeetLabel', 'Ambas')}</option>
              </SearchableSelect>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.stage', 'Etapa')}</label>
              <SearchableSelect
                value={formData.etapa || ''}
                onChange={(e) => handleChange('etapa' as keyof Player, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">–</option>
                <option value="Senior">Senior</option>
                <option value="Juvenil">Juvenil</option>
                <option value="Cadete">Cadete</option>
                <option value="Infantil">Infantil</option>
                <option value="Alevín">Alevín</option>
                <option value="Benjamín">Benjamín</option>
              </SearchableSelect>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.club', 'Club')}</label>
              {(clubes || []).length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                  <i className="fa-solid fa-circle-info"></i>
                  No hay clubes disponibles.
                </div>
              ) : (
                <SearchableSelect
                  value={formData.clubId || ''}
                  onChange={(e) => handleClubSelect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
                >
                  <option value="">-- Selecciona un club --</option>
                  {[...clubes]
                    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
                    .map(c => (
                      <option key={c.id} value={String(c.id)}>
                        {String(c.id) === String(clubId) ? `${c.nombre} (mi club)` : c.nombre}
                      </option>
                    ))}
                </SearchableSelect>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.team')}</label>
              {!formData.clubId ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-[11px] font-bold">
                  <i className="fa-solid fa-circle-info"></i>
                  Selecciona antes un club.
                </div>
              ) : equiposDelClubSeleccionado.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                  <i className="fa-solid fa-circle-info"></i>
                  Crea antes un equipo en la sección Equipos.
                </div>
              ) : (
                <SearchableSelect
                  value={formData.equipoId || ''}
                  onChange={(e) => handleEquipoSelect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
                >
                  <option value="">-- Selecciona un equipo --</option>
                  {useMemo(() => {
                    const categoriesOrder = ['Senior', 'Juvenil', 'Cadete', 'Infantil', 'Alevín'];
                    const teamsMap = new Map<string, Array<{ id: string; label: string; fullName: string }>>();

                    equiposDelClubSeleccionado.forEach(eq => {
                      const fullName = eq.equipo || eq.nombre || '';
                      let category = '';
                      let displayLabel = fullName;

                      // Casos especiales primero (Primer equipo)
                      if (fullName.includes('Primer') || fullName.includes('1ª') || fullName === 'P.E.') {
                        category = 'Senior';
                        displayLabel = 'Primer Equipo';
                      } else if (fullName.includes('Filial')) {
                        category = 'Senior';
                        displayLabel = 'Filial';
                      } else if (fullName === 'F') {
                        category = 'Senior';
                        displayLabel = 'F';
                      } else {
                        // Extraer categoría de equipos regulares
                        for (const cat of categoriesOrder) {
                          if (fullName.includes(cat)) {
                            category = cat;
                            displayLabel = fullName; // Mostrar nombre completo (ej: "Juvenil A")
                            break;
                          }
                        }
                      }

                      if (!category) {
                        category = 'Otros';
                      }

                      const teamsList = teamsMap.get(category) || [];
                      if (!teamsList.some(t => t.fullName === displayLabel)) {
                        teamsList.push({ id: String(eq.id), label: displayLabel, fullName: displayLabel });
                      }
                      teamsMap.set(category, teamsList);
                    });

                    // Ordenar categorías
                    const sortedCategories = Array.from(teamsMap.keys()).sort((a, b) => {
                      const aIdx = categoriesOrder.indexOf(a);
                      const bIdx = categoriesOrder.indexOf(b);
                      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                      if (aIdx !== -1) return -1;
                      if (bIdx !== -1) return 1;
                      return a.localeCompare(b);
                    });

                    const seniorOrder = ['Primer Equipo', 'Filial', 'F'];
                    return sortedCategories.map(category => {
                      const teams = (teamsMap.get(category) || [])
                        .sort((a, b) => category === 'Senior'
                          ? seniorOrder.indexOf(a.label) - seniorOrder.indexOf(b.label)
                          : a.label.localeCompare(b.label));
                      return (
                        <optgroup key={category} label={category}>
                          {teams.map(team => (
                            <option key={`${category}-${team.fullName}`} value={team.id}>
                              {team.label}
                            </option>
                          ))}
                        </optgroup>
                      );
                    });
                  }, [equiposDelClubSeleccionado])}
                </SearchableSelect>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.birthDate')}</label>
              <input
                type="date"
                value={formData.fechaNacimiento || ''}
                onChange={(e) => handleChange('fechaNacimiento', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-[var(--accent)]"
              />
            </div>
            {isHuesca && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.birthYear', 'Año')}</label>
                <input
                  type="text"
                  value={getBirthYear(formData.fechaNacimiento) ?? ''}
                  readOnly
                  disabled
                  placeholder="–"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
            )}
          </div>

          {/* === TEXTAREAS en grid 2x2 — oculto para Huesca === */}
          {!isHuesca && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('common.description')}</label>
              <textarea
                value={formData.descripcion || ''}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                placeholder={t('editPlayer.descriptionPlaceholder')}
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none text-slate-700"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('editPlayer.attack')}</label>
              <textarea
                value={formData.ataque || ''}
                onChange={(e) => handleChange('ataque', e.target.value)}
                placeholder={t('editPlayer.attackPlaceholder')}
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none text-slate-700"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('editPlayer.defense')}</label>
              <textarea
                value={formData.defensa || ''}
                onChange={(e) => handleChange('defensa', e.target.value)}
                placeholder={t('editPlayer.defensePlaceholder')}
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none text-slate-700"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('editPlayer.person')}</label>
              <textarea
                value={formData.persona || ''}
                onChange={(e) => handleChange('persona', e.target.value)}
                placeholder={t('editPlayer.personPlaceholder')}
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none text-slate-700"
              />
            </div>
          </div>
          )}

          {/* === OBSERVACIONES — solo visible para Escuela Huesca === */}
          {(clubId === 'escuela-huesca' || formData.club?.toUpperCase().includes('HUESCA')) && (
            <>
              {/* === DATOS PERSONALES EXTENDIDOS === */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mt-4 mb-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                  <i className="fa-solid fa-id-card mr-1"></i>
                  {t('editPlayer.extendedData', 'Datos personales')}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.phone', 'Teléfono')}</label>
                    <input type="tel" value={formData.telefono || ''} onChange={(e) => handleChange('telefono' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.email', 'Correo')}</label>
                    <input type="email" value={formData.correo || ''} onChange={(e) => handleChange('correo' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.link', 'Enlace')}</label>
                    <input type="url" value={formData.enlace || ''} onChange={(e) => handleChange('enlace' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                </div>
              </div>

              {/* === DATOS DEL TUTOR/A === */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                  <i className="fa-solid fa-user-shield mr-1"></i>
                  {t('editPlayer.guardianData', 'Datos del tutor/a')}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.guardianName', 'Nombre tutor/a')}</label>
                    <input type="text" value={formData.nombreTutor || ''} onChange={(e) => handleChange('nombreTutor' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.guardianEmail', 'Correo tutor')}</label>
                    <input type="email" value={formData.correoTutor || ''} onChange={(e) => handleChange('correoTutor' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.guardianPhone', 'Teléfono tutor')}</label>
                    <input type="tel" value={formData.telefonoTutor || ''} onChange={(e) => handleChange('telefonoTutor' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('editPlayer.observations')}</label>
                <textarea
                  value={formData.observaciones || ''}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  placeholder={t('editPlayer.observationsPlaceholder')}
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none text-slate-700"
                />
              </div>
            </>
          )}

          {/* === DIVISOR: DATOS GENERADOS === */}
          <div className="my-6 pt-6 border-t-2 border-slate-200">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <i className="fa-solid fa-chart-line mr-2"></i>
              {t('editPlayer.generatedData', 'Datos generados')}
            </span>
          </div>

          {/* === DATOS DE PARTIDO en fila horizontal (calculados a partir de las actas, no editables) === */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{t('editPlayer.matchData')}</span>
              <div className="flex-1 grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.matches')}</label>
                  <div className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-black text-[var(--accent)] text-center">
                    {matchStats.partidosJugados}
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.minutes')}</label>
                  <div className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-black text-[var(--accent)] text-center">
                    {matchStats.minutos}
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.starter')}</label>
                  <div className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-black text-[var(--accent)] text-center">
                    {matchStats.titular}
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('players.goals')}</label>
                  <div className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-black text-[var(--accent)] text-center">
                    {matchStats.goles}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === GRÁFICAS DE PARTICIPACIÓN === */}
          <PlayerStatsCharts
            partidosJugados={matchStats.partidosJugados}
            minutos={matchStats.minutos}
            titular={matchStats.titular}
            goles={matchStats.goles}
            sesionesTotal={attendanceStats.total}
            sesionesAsistidas={attendanceStats.attended}
            sesionesAusencias={attendanceStats.absences}
            sesionesEquipoTotal={attendanceStats.equipoTotal}
            sesionesEquipo={attendanceStats.team}
            sesionesGrupales={attendanceStats.group}
            sesionesIndividuales={attendanceStats.individual}
            sesionesPorEquipo={attendanceStats.byTeam}
            motivosAusencia={attendanceStats.absenceReasons}
            totalTeamMatches={matchStats.totalTeamMatches}
            totalTeamMinutes={matchStats.totalTeamMinutes}
            playerAvailableMatches={matchStats.playerAvailableMatches}
            estado={formData.estado}
          />

          {/* === DESGLOSE POR COMPETICIÓN Y PARTIDO === */}
          {showDetailedStats && matches && matches.length > 0 && (
            <Suspense fallback={<div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4"><p className="text-xs font-bold text-slate-400 text-center py-2">{t('playerStatsSummary.loading')}</p></div>}>
              <PlayerMatchBreakdown playerId={String(player.id)} matches={matches} equipos={equipos} clubes={clubes} matchReports={matchReports} />
            </Suspense>
          )}

          {/* === MINUTOS POR POSICIÓN EN EL CAMPO === */}
          {showDetailedStats && matches && matches.length > 0 && (
            <Suspense fallback={<div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4"><p className="text-xs font-bold text-slate-400 text-center py-2">{t('playerStatsSummary.loading')}</p></div>}>
              <PlayerPositionMap
                playerId={String(player.id)}
                playerName={formData.apodo || formData.nombre}
                photoUrl={preview || undefined}
                matches={matches}
                matchReports={matchReports}
              />
            </Suspense>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-3 sticky bottom-0">
          <div className="grid grid-cols-3 sm:contents gap-3">
            <button
              disabled={isSaving}
              onClick={onClose}
              className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-slate-600 bg-white hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-slate-600 bg-white hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
              title={isFullscreen ? t('editPlayer.exitFullscreen') : t('editPlayer.fullscreen')}
            >
              <i className={`fa-solid fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
            </button>
            <button
              type="button"
              onClick={exportPlayerProfile}
              className="flex-1 py-4 border border-[var(--accent)]/20 rounded-2xl font-black text-[var(--accent)] bg-white hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
            >
              {t('editPlayer.exportPdf')}
            </button>
          </div>
          <button
            disabled={isSaving || !formData.nombre?.trim()}
            onClick={handleSave}
            className="flex-2 py-4 bg-[var(--accent)] text-white rounded-2xl font-black hover:bg-[var(--accent-dark)] transition-all shadow-xl shadow-[var(--accent)]/20 uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i>
                {t('editPlayer.saving')}
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up"></i>
                {t('editPlayer.saveChanges')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPlayerModal;
