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
import { supabase } from '@shared/services/supabaseClient';
import PlayerStatsCharts from './PlayerStatsCharts';
import SearchableSelect from '@shared/components/SearchableSelect';
import PlayerDashboard, { PlayerHeader } from './PlayerDashboard';
import { ENCUADRE_DEFAULT, ZOOM_MAX, ZOOM_MIN, encuadreStyle, getFotoEncuadre } from '../utils/fotoEncuadre';

const PlayerMatchBreakdown = lazy(() => import('./PlayerMatchBreakdown'));
const PlayerPositionMap = lazy(() => import('./PlayerPositionMap'));
const PlayerVideosSection = lazy(() => import('./PlayerVideosSection'));
const PlayerMedicionesSection = lazy(() => import('./PlayerMedicionesSection'));
const PlayerObjetivosSection = lazy(() => import('./PlayerObjetivosSection'));
const PlayerCalendarSection = lazy(() => import('./PlayerCalendarSection'));

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
  /** Si es true, el modal se muestra en modo solo lectura: sin edición ni botón de guardar */
  readOnly?: boolean;
}

/** Fila de `estadisticas_partido_jugador` (datos de actas de la Federación). */
interface ActaStatRow {
  jugador_id: string;
  fed_match_id: number;
  titular: boolean;
  minutos: number;
  goles: number;
  amarillas: number;
  rojas: number;
  fecha: string;
  jornada: string | null;
  competicion: string | null;
  rival: string | null;
  es_local: boolean | null;
}

const isPersistedImage =(value?: string | null): value is string =>
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

const calculateAge = (fecha?: string): number | undefined => {
  if (!fecha) return undefined;
  const birthDate = new Date(fecha);
  if (isNaN(birthDate.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
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

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ player, clubId, equipos, events, matches, clubes, onClose, onSave, readOnly = false }) => {
  const { t } = useTranslation();
  const isHuesca = clubId === 'escuela-huesca' || player.club?.toUpperCase().includes('HUESCA'); // v2
  const initialPhotoUrl = isPersistedImage(player.fotoUrl) ? player.fotoUrl : '';
  const [formData, setFormData] = useState<Player>({ ...player, fotoUrl: player.fotoUrl || '', estado: player.estado || 'APTO', fechaNacimiento: player.fechaNacimiento || '2000-01-01' });
  const [preview, setPreview] = useState<string | null>(initialPhotoUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File|null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'tile'>('tile');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const pdfHeaderRef = useRef<HTMLDivElement>(null);

  // Eventos del calendario del equipo del jugador (para la sección CALENDARIO).
  const ownTeamEvents = useMemo(() => {
    const keys = new Set(
      [player.equipoId, player.equipo]
        .filter((v): v is string => v !== undefined && v !== null && String(v).trim().length > 0)
        .map(normalizeTeamKey),
    );
    equipos.forEach((team) => {
      if (keys.has(normalizeTeamKey(team.id))) {
        [team.equipo, team.nombre, team.nombreEnFed].forEach((v) => { if (v) keys.add(normalizeTeamKey(v)); });
      }
    });
    return (events || []).filter((ev) => keys.size === 0 || !ev.team || keys.has(normalizeTeamKey(ev.team)));
  }, [events, equipos, player.equipoId, player.equipo]);

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

    // Solo cuentan las sesiones del equipo del jugador (no las de otros equipos donde haya entrenado).
    const ownTeamKeys = new Set(
      [player.equipoId, player.equipo]
        .filter((v): v is string => v !== undefined && v !== null && String(v).trim().length > 0)
        .map((v) => normalizeTeamKey(resolveSessionTeam(String(v)))),
    );
    const isOwnTeamSession = (session: { team?: string }) =>
      ownTeamKeys.size === 0 || ownTeamKeys.has(normalizeTeamKey(resolveSessionTeam(session.team)));

    const stats = (events || []).filter(hasRecordedAttendance).filter(isOwnTeamSession).reduce((acc, session) => {
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
  }, [equipos, events, player.id, player.equipo, player.equipoId]);

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

  // Estadísticas por partido procedentes de las actas de la Federación (fuente principal).
  const [actaRows, setActaRows] = useState<ActaStatRow[]>([]);

  useEffect(() => {
    const equipoId = player.equipoId || formData.equipoId;
    if (!equipoId) { setActaRows([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('estadisticas_partido_jugador')
          .select('jugador_id, fed_match_id, titular, minutos, goles, amarillas, rojas, fecha, jornada, competicion, rival, es_local')
          .eq('equipo_id', equipoId);
        if (error) throw error;
        if (!cancelled) setActaRows((data ?? []) as ActaStatRow[]);
      } catch (err) {
        console.error('No se pudieron cargar las estadísticas de actas', err);
        if (!cancelled) setActaRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [player.equipoId, formData.equipoId]);

  // Goles recibidos con el jugador en campo (columna posterior: si falta, se queda en 0).
  const [golesRecibidos, setGolesRecibidos] = useState(0);
  useEffect(() => {
    if (!player.id) { setGolesRecibidos(0); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('estadisticas_partido_jugador')
        .select('goles_recibidos, titular, minutos')
        .eq('jugador_id', String(player.id));
      if (cancelled) return;
      if (error) { setGolesRecibidos(0); return; }
      setGolesRecibidos((data ?? []).reduce((s: number, r: any) => (r.titular || r.minutos > 0 ? s + (r.goles_recibidos ?? 0) : s), 0));
    })();
    return () => { cancelled = true; };
  }, [player.id]);

  // Partidos del jugador en todos los equipos (puede jugar con varios).
  const [allTeamRows, setAllTeamRows] = useState<{ equipo_id: string | null; fed_match_id: number; titular: boolean; minutos: number; goles: number }[]>([]);
  useEffect(() => {
    if (!player.id) { setAllTeamRows([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('estadisticas_partido_jugador')
          .select('equipo_id, fed_match_id, titular, minutos, goles')
          .eq('jugador_id', String(player.id));
        if (error) throw error;
        if (!cancelled) setAllTeamRows((data ?? []) as typeof allTeamRows);
      } catch (err) {
        console.error('No se pudieron cargar los partidos por equipo', err);
        if (!cancelled) setAllTeamRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [player.id]);

  const matchesByTeam = useMemo(() => {
    const map = new Map<string, { team: string; convocado: number; jugados: number; titular: number; minutos: number; goles: number }>();
    allTeamRows.forEach(r => {
      const key = String(r.equipo_id ?? '');
      const team = equipos.find(t => String(t.id) === key)?.nombre || 'Sin equipo';
      const e = map.get(key) ?? { team, convocado: 0, jugados: 0, titular: 0, minutos: 0, goles: 0 };
      e.convocado += 1;
      if (r.titular || r.minutos > 0) e.jugados += 1;
      if (r.titular) e.titular += 1;
      e.minutos += r.minutos || 0;
      e.goles += r.goles || 0;
      map.set(key, e);
    });
    return [...map.values()].sort((a, b) => b.jugados - a.jugados);
  }, [allTeamRows, equipos]);

  // Muestra gráficas detalladas solo si hay datos y el usuario las quiere ver
  useEffect(() => {
    if (matchReports.length > 0) {
      const timer = requestIdleCallback(() => setShowDetailedStats(true), { timeout: 2000 });
      return () => cancelIdleCallback(timer);
    }
  }, [matchReports]);

  // Participación del jugador partido a partido (acta federativa), para el dashboard.
  const playerActaMatches = useMemo(() => {
    const pid = String(player.id);
    return actaRows
      .filter(r => String(r.jugador_id) === pid)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [actaRows, player.id]);

  const matchStats = useMemo(() => {
    const pid = String(player.id);

    // Si el equipo tiene actas federativas cargadas, son la fuente de verdad.
    if (actaRows.length > 0) {
      const teamMatchIds = new Set(actaRows.map(r => r.fed_match_id));
      const mine = actaRows.filter(r => String(r.jugador_id) === pid && (r.titular || r.minutos > 0));
      const teamMinutes = actaRows.reduce((sum, r) => sum + (r.minutos || 0), 0);
      return {
        partidosJugados: mine.length,
        minutos: mine.reduce((s, r) => s + (r.minutos || 0), 0),
        titular: mine.filter(r => r.titular).length,
        goles: mine.reduce((s, r) => s + (r.goles || 0), 0),
        totalTeamMatches: teamMatchIds.size,
        totalTeamMinutes: teamMinutes,
        playerAvailableMatches: teamMatchIds.size > 0 ? teamMatchIds.size : undefined,
      };
    }

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
  }, [matches, matchReports, player.id, actaRows]);

  const modalRef = useRef<HTMLDivElement>(null);

  const normalizePlayerId = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');
  const resolvePlayerId = (data: Player) => {
    const dni = normalizePlayerId(String(data.dni || ''));
    return dni || String(data.id || '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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

  // Calcular opciones de equipo aquí, al nivel superior, no dentro del condicional del JSX
  const teamOptions = useMemo(() => {
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
  }, [equiposDelClubSeleccionado]);

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
          console.warn('No se pudo subir la foto a Supabase:', uploadErr);
          // NO guardar data: URLs en la BD - no son persistentes entre sesiones.
          // Mantener la foto anterior o dejar vacío en lugar de guardar data: URL.
          alert('No se pudo subir la foto. Se mantiene la foto anterior. Por favor, intenta nuevamente.');
          fotoUrl = formData.fotoUrl; // Mantener la anterior
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
    const target = activeTab === 'tile' ? tileRef.current : exportRef.current;
    if (!target) return;

    const header = pdfHeaderRef.current;
    const prev = {
      maxHeight: target.style.maxHeight,
      overflow: target.style.overflow,
      flex: target.style.flex,
      headerDisplay: header?.style.display ?? '',
    };
    target.style.maxHeight = 'none';
    target.style.overflow = 'visible';
    target.style.flex = 'none';
    if (header && activeTab === 'tile') header.style.display = 'block';

    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      let imgWidth = pageWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      // La ficha del jugador (pestaña dashboard) debe caber en una sola hoja: se reduce para ajustarla.
      if (activeTab === 'tile') {
        const margin = 16;
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;
        const ratio = Math.min(maxW / imgWidth, maxH / imgHeight, 1);
        imgWidth *= ratio;
        imgHeight *= ratio;
        pdf.addImage(imgData, 'JPEG', (pageWidth - imgWidth) / 2, margin, imgWidth, imgHeight);
        const safe = (formData.nombre || 'jugador').replace(/\s+/g, '_');
        pdf.save(`ficha_${safe}.pdf`);
        return;
      }

      let position = 0;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeName = (formData.nombre || 'jugador').replace(/\s+/g, '_');
      pdf.save(`ficha_${safeName}.pdf`);
    } catch (err) {
      console.error('Error al exportar la ficha a PDF', err);
      alert('No se pudo generar el PDF. Revisa la consola para más detalle.');
    } finally {
      target.style.maxHeight = prev.maxHeight;
      target.style.overflow = prev.overflow;
      target.style.flex = prev.flex;
      if (header) header.style.display = prev.headerDisplay;
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-100 flex items-end sm:items-center justify-center p-0 sm:p-1"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={modalRef} className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fade-in text-slate-800 flex flex-col transition-all duration-300 ${isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-5xl max-h-[98dvh] sm:max-h-[98dvh] sm:h-[98dvh]'}`}>
        <div className="px-3 sm:px-4 py-1.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <PlayerHeader
            player={formData}
            photoUrl={preview}
            extra={
              <div className="flex gap-1 ml-2" role="tablist">
                {([
                  { id: 'tile', icon: 'fa-id-badge', label: t('editPlayer.tabTile', 'Ficha jugador') },
                  { id: 'edit', icon: 'fa-pen-to-square', label: t('editPlayer.tabEdit', 'Editar') },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full border transition-colors ${
                      activeTab === tab.id
                        ? 'text-[var(--accent)] border-[var(--accent)] bg-white'
                        : 'text-slate-400 border-transparent hover:text-slate-600'
                    }`}
                  >
                    <i className={`fa-solid ${tab.icon} mr-1.5`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          />
          {/* === BOTONES DE ACCIÓN (iconos, arriba a la derecha) === */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 bg-white hover:bg-slate-50 transition-colors"
              title={isFullscreen ? t('editPlayer.exitFullscreen') : t('editPlayer.fullscreen')}
              aria-label={isFullscreen ? t('editPlayer.exitFullscreen') : t('editPlayer.fullscreen')}
            >
              <i className={`fa-solid fa-${isFullscreen ? 'compress' : 'expand'} text-sm`}></i>
            </button>
            <button
              type="button"
              onClick={exportPlayerProfile}
              className="w-8 h-8 flex items-center justify-center border border-[var(--accent)]/20 rounded-lg text-[var(--accent)] bg-white hover:bg-slate-50 transition-colors"
              title={t('editPlayer.exportPdf', 'Exportar PDF')}
              aria-label={t('editPlayer.exportPdf', 'Exportar PDF')}
            >
              <i className="fa-solid fa-file-pdf text-sm"></i>
            </button>
            {!readOnly && (
              <button
                type="button"
                disabled={isSaving || !formData.nombre?.trim()}
                onClick={handleSave}
                className="w-8 h-8 flex items-center justify-center bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-dark)] transition-all shadow-md shadow-[var(--accent)]/20 disabled:opacity-70"
                title={isSaving ? t('editPlayer.saving') : t('editPlayer.saveChanges')}
                aria-label={t('editPlayer.saveChanges')}
              >
                <i className={`fa-solid ${isSaving ? 'fa-spinner animate-spin' : 'fa-floppy-disk'} text-sm`}></i>
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors" aria-label="Cerrar">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {/* === PESTAÑA FICHA JUGADOR: dashboard del jugador === */}
        {activeTab === 'tile' && (
          <div className="p-2 sm:p-3 overflow-y-auto flex-1 bg-white" ref={tileRef}>
            {/* Cabecera solo visible al exportar a PDF (en pantalla ya está en el título del modal) */}
            <div ref={pdfHeaderRef} style={{ display: 'none' }} className="mb-2"><PlayerHeader player={formData} photoUrl={preview} /></div>
            <PlayerDashboard
              hideHeader
              player={formData}
              photoUrl={preview}
              matchStats={matchStats}
              matchLog={playerActaMatches}
              matchesByTeam={matchesByTeam}
              teamMatches={matchStats.totalTeamMatches}
              golesRecibidos={golesRecibidos}
              attendance={{
                total: attendanceStats.total,
                attended: attendanceStats.attended,
                absences: attendanceStats.absences,
                reasons: attendanceStats.absenceReasons,
                byScope: [
                  { label: 'Equipo', ...attendanceStats.team },
                  { label: 'Grupales', ...attendanceStats.group },
                  { label: 'Individuales', ...attendanceStats.individual },
                ],
                byTeam: attendanceStats.byTeam,
              }}
            />
            <div className="mt-2">
              <Suspense fallback={<div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4"><p className="text-xs font-bold text-slate-400 text-center py-2">{t('playerStatsSummary.loading')}</p></div>}>
                <PlayerObjetivosSection playerId={String(player.id)} playerName={formData.apodo || formData.nombre} equipoId={player.equipoId} />
              </Suspense>
            </div>
            <div className="mt-2">
              <Suspense fallback={<div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4"><p className="text-xs font-bold text-slate-400 text-center py-2">{t('playerStatsSummary.loading')}</p></div>}>
                <PlayerCalendarSection playerId={String(player.id)} events={ownTeamEvents} matchLog={playerActaMatches} teamName={equipos.find(tm => String(tm.id) === String(player.equipoId))?.equipo || equipos.find(tm => String(tm.id) === String(player.equipoId))?.nombre || player.equipo} />
              </Suspense>
            </div>
          </div>
        )}

        <fieldset disabled={readOnly} className="contents">
        <div className={`p-3 sm:p-4 overflow-y-auto flex-1 ${activeTab === 'tile' ? 'hidden' : ''}`} data-export-scroll ref={exportRef}>
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
                  onClick={readOnly ? undefined : triggerFileInput}
                  className={`relative w-28 h-32 rounded-2xl border-2 border-dashed border-[var(--accent)]/20 flex flex-col items-center justify-center bg-slate-50 transition-all overflow-hidden group shadow-inner ${readOnly ? '' : 'cursor-pointer hover:bg-slate-100'}`}
                >
                  {preview ? (
                    <img loading="lazy" decoding="async"
                      src={preview}
                      alt="Preview"
                      style={encuadreStyle(getFotoEncuadre(formData))}
                      className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                    />
                  ) : (
                    <>
                      <i className="fa-solid fa-camera text-[var(--accent)] text-xl mb-1 opacity-20"></i>
                      <span className="text-[var(--accent)] text-[9px] font-black uppercase opacity-40">{t('editPlayer.uploadPhoto')}</span>
                    </>
                  )}
                </div>
                {!readOnly && (
                <div
                  onClick={triggerFileInput}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-red-700 transition-colors border-2 border-white text-xs"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                </div>
                )}
              </div>
              {/* Encuadre de la foto: zoom y posición (se guardan con la ficha) */}
              {preview && !readOnly && (() => {
                const enc = getFotoEncuadre(formData);
                const setEnc = (key: 'fotoZoom' | 'fotoPosX' | 'fotoPosY', value: number) => handleChange(key, value);
                const sliders: { label: string; key: 'fotoZoom' | 'fotoPosX' | 'fotoPosY'; min: number; max: number; step: number; value: number }[] = [
                  { label: t('editPlayer.photoZoom', 'Zoom'), key: 'fotoZoom', min: ZOOM_MIN, max: ZOOM_MAX, step: 0.05, value: enc.zoom },
                  { label: t('editPlayer.photoX', 'Horizontal'), key: 'fotoPosX', min: 0, max: 100, step: 1, value: enc.posX },
                  { label: t('editPlayer.photoY', 'Vertical'), key: 'fotoPosY', min: 0, max: 100, step: 1, value: enc.posY },
                ];
                return (
                  <div className="w-28 flex flex-col gap-1.5">
                    {sliders.map(s => (
                      <label key={s.key} className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                        <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                          onChange={e => setEnc(s.key, Number(e.target.value))}
                          className="w-full accent-[var(--accent)]" />
                      </label>
                    ))}
                    <button type="button"
                      onClick={() => { setEnc('fotoZoom', ENCUADRE_DEFAULT.zoom); setEnc('fotoPosX', ENCUADRE_DEFAULT.posX); setEnc('fotoPosY', ENCUADRE_DEFAULT.posY); }}
                      className="text-[9px] font-bold text-slate-500 hover:text-[var(--accent)] uppercase tracking-widest text-left">
                      {t('editPlayer.photoReset', 'Restablecer')}
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Datos básicos al lado de la foto */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Los 3 campos de nombre aparecen primero para todos, salvo en la vista del jugador */}
              {!readOnly && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.firstName', 'Nombre')}</label>
                <input type="text" value={formData.nombrePila || ''} onChange={(e) => handleChange('nombrePila' as keyof Player, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 font-semibold text-slate-700" />
              </div>
              )}
              {!readOnly && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.firstSurname', 'Primer apellido')}</label>
                <input type="text" value={formData.primerApellido || ''} onChange={(e) => handleChange('primerApellido' as keyof Player, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 font-semibold text-slate-700" />
              </div>
              )}
              {!readOnly && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.secondSurname', 'Segundo apellido')}</label>
                <input type="text" value={formData.segundoApellido || ''} onChange={(e) => handleChange('segundoApellido' as keyof Player, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 font-semibold text-slate-700" />
              </div>
              )}
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
                <SearchableSelect
                  value={formData.dorsal !== undefined && formData.dorsal !== null ? String(formData.dorsal) : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    handleChange('dorsal', raw === '' ? undefined : parseInt(raw, 10));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-[var(--accent)] appearance-none cursor-pointer"
                >
                  <option value="">–</option>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </SearchableSelect>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.residence', 'Residencia')}</label>
                <SearchableSelect
                  value={formData.residencia ? 'SI' : 'NO'}
                  onChange={(e) => handleChange('residencia', e.target.value === 'SI')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
                >
                  <option value="NO">{t('common.no', 'No')}</option>
                  <option value="SI">{t('common.yes', 'Sí')}</option>
                </SearchableSelect>
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
            </div>
          </div>

          {/* === ETAPA, CLUB, EQUIPO (3 columnas) === */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 mb-4">
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
                  {teamOptions}
                </SearchableSelect>
              )}
            </div>
          </div>

          {/* === CAMPOS DE POSICIÓN (4 columnas) === */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
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
          </div>

          {/* === FECHA DE NACIMIENTO === */}
          <div className={`grid ${isHuesca ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-2'} gap-3 mb-4`}>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.birthDate')}</label>
              <input
                type="date"
                value={formData.fechaNacimiento || ''}
                onChange={(e) => handleChange('fechaNacimiento', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.age', 'Edad')}</label>
              <input
                type="text"
                value={calculateAge(formData.fechaNacimiento) ?? ''}
                readOnly
                disabled
                placeholder="–"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-[var(--accent)] disabled:cursor-not-allowed text-center"
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
              {/* === DATOS PERSONALES EXTENDIDOS — ocultos en la vista del jugador === */}
              {!readOnly && (
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
                    <input type="email" value={formData.correo || ''} onChange={(e) => handleChange('correo' as keyof Player, e.target.value.trim().toLowerCase())}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.link', 'Enlace')}</label>
                    <input type="url" value={formData.enlace || ''} onChange={(e) => handleChange('enlace' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                </div>
              </div>
              )}

              {/* === OBSERVACIONES — ocultas en la vista del jugador === */}
              {!readOnly && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('editPlayer.observations')}</label>
                <textarea
                  value={formData.observaciones || ''}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  placeholder={t('editPlayer.observationsPlaceholder')}
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none text-slate-700"
                />
              </div>
              )}

              {/* === DATOS DEL TUTOR/A (ÚLTIMO) === */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
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

          {/* === MEDICIONES: RPE & WELLNESS === */}
          {showDetailedStats && (
            <Suspense fallback={<div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4"><p className="text-xs font-bold text-slate-400 text-center py-2">{t('playerStatsSummary.loading')}</p></div>}>
              <PlayerMedicionesSection playerId={String(player.id)} />
            </Suspense>
          )}

          {/* === OBJETIVOS INDIVIDUALES === */}
          {showDetailedStats && (
            <Suspense fallback={<div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4"><p className="text-xs font-bold text-slate-400 text-center py-2">{t('playerStatsSummary.loading')}</p></div>}>
              <PlayerObjetivosSection playerId={String(player.id)} playerName={formData.apodo || formData.nombre} equipoId={player.equipoId} />
            </Suspense>
          )}

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

          {/* === VIDEOS DEL JUGADOR === */}
          {showDetailedStats && (
            <Suspense fallback={<div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4"><p className="text-xs font-bold text-slate-400 text-center py-2">{t('playerStatsSummary.loading')}</p></div>}>
              <PlayerVideosSection
                playerId={String(player.id)}
                playerName={formData.apodo || formData.nombre}
                matches={matches}
              />
            </Suspense>
          )}
        </div>
        </fieldset>

      </div>
    </div>
  );
};

export default EditPlayerModal;
