import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadPlayerPhoto } from '../../../shared/services/photoService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Player } from '../types';
import type { CompetitionTeam } from '../../competicion/types';
import type { CalendarEvent } from '../../calendario/types';
import type { Match, MatchReport } from '@modules/partidos/types';
import type { Club } from '@modules/clubes/types';
import { computeMatchStats } from '../../partidos/components/PlayerStatsSummary';
import { db } from '@shared/services/dataService';
import PlayerStatsCharts from './PlayerStatsCharts';
import PlayerMatchBreakdown from './PlayerMatchBreakdown';
import PlayerPositionMap from './PlayerPositionMap';

interface EditPlayerModalProps {
  player: Player;
  clubId: string;
  /** Equipos reales de Supabase a los que se puede asignar el jugador */
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
  const isHuesca = clubId === 'escuela-huesca' || player.club?.toUpperCase().includes('HUESCA');
  const initialPhotoUrl = isPersistedImage(player.fotoUrl) ? player.fotoUrl : '';
  const [formData, setFormData] = useState<Player>({ ...player, fotoUrl: player.fotoUrl || '', estado: player.estado || 'APTO' });
  const [preview, setPreview] = useState<string | null>(initialPhotoUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File|null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const attendanceStats = useMemo(() => {
    const pid = String(player.id);
    const sessions = (events || []).filter(e => e.attendance && Object.keys(e.attendance).length > 0);
    const total = sessions.length;
    const attended = sessions.filter(e => (e.attendance?.[pid] || 'Si') === 'Si').length;
    return { total, attended, absences: total - attended };
  }, [events, player.id]);

  // Datos de partido reales, calculados a partir de las actas registradas (no editables a mano).
  const [matchReports, setMatchReports] = useState<MatchReport[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await db.match_reports.get();
        if (!cancelled) setMatchReports((data as MatchReport[]) || []);
      } catch (err) {
        console.error('No se pudieron cargar los partes de partido', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const matchStats = useMemo(() => {
    const pid = String(player.id);
    const reportById = new Map(matchReports.map(r => [String(r.id), r]));
    let partidosJugados = 0;
    let minutos = 0;
    let titular = 0;
    let goles = 0;
    (matches || []).forEach(match => {
      const report = reportById.get(String(match.id));
      if (!report) return;
      const stats = computeMatchStats(report);
      if (!stats.involvedIds.has(pid)) return;
      partidosJugados += 1;
      minutos += stats.minutesByPlayer.get(pid) ?? 0;
      if (stats.starterIds.has(pid)) titular += 1;
      goles += stats.goalsByPlayer.get(pid) ?? 0;
    });
    return { partidosJugados, minutos, titular, goles };
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
      if (isHuesca && (field === 'nombrePila' || field === 'primerApellido' || field === 'segundoApellido')) {
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
    setFormData(prev => ({
      ...prev,
      equipoId,
      equipo: team?.equipo || team?.nombre || '',
      club: team?.nombre || prev.club,
      clubId: team?.clubId ? String(team.clubId) : prev.clubId,
    }));
  };
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
      console.error(err);
      alert(t('editPlayer.saveError'));
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
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">
                  {isHuesca ? t('editPlayer.nameAndSurname', 'Nombre y apellido') : t('common.name')} *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value.toUpperCase())}
                  placeholder={t('editPlayer.namePlaceholder')}
                  readOnly={isHuesca}
                  disabled={isHuesca}
                  title={isHuesca ? t('editPlayer.nameAutoHint', 'Se genera automáticamente desde Nombre + Primer apellido') : undefined}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10 font-black text-[var(--accent)] uppercase disabled:opacity-70 disabled:cursor-not-allowed"
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
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('players.number')}</label>
                <input 
                  type="number" 
                  value={formData.dorsal} 
                  onChange={(e) => handleChange('dorsal', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-[var(--accent)]" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('common.status')}</label>
                <select
                  value={formData.estado || 'APTO'}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
                >
                  <option value="APTO">{t('editPlayer.fit')} {'\u{1F7E2}'}</option>
                  <option value="LESIONADO">{t('editPlayer.injured')} {'\u{1F534}'}</option>
                  <option value="OTRO">{t('editPlayer.otherStatus')} {'\u{1F7E0}'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* === CAMPOS DE CONFIGURACIÓN en grid compacto === */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{isHuesca ? t('editPlayer.demarcation', 'Demarcación') : t('common.position')}</label>
              <select
                value={formData.posicion}
                onChange={(e) => handleChange('posicion', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
              >
                {isHuesca ? (
                  <>
                    <option value="Portero">Portero</option>
                    <option value="Lateral">Lateral</option>
                    <option value="Central">Central</option>
                    <option value="Pivote">Pivote</option>
                    <option value="Media punta">Media punta</option>
                    <option value="Interior">Interior</option>
                    <option value="Extremo">Extremo</option>
                    <option value="Delantero">Delantero</option>
                    <option value="–">–</option>
                  </>
                ) : (
                  <>
                    <option value="Portero">{t('players.goalkeeper')}</option>
                    <option value="Defensa">{t('players.defender')}</option>
                    <option value="Medio">{t('players.midfielder')}</option>
                    <option value="Delantero">{t('players.forward')}</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.otherDemarcation', 'Otra Demarcación')}</label>
              <select
                value={formData.otraDemarcacion || ''}
                onChange={(e) => handleChange('otraDemarcacion' as keyof Player, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">–</option>
                {isHuesca ? (
                  <>
                    <option value="Portero">Portero</option>
                    <option value="Lateral">Lateral</option>
                    <option value="Central">Central</option>
                    <option value="Pivote">Pivote</option>
                    <option value="Media punta">Media punta</option>
                    <option value="Interior">Interior</option>
                    <option value="Extremo">Extremo</option>
                    <option value="Delantero">Delantero</option>
                  </>
                ) : (
                  <>
                    <option value="Portero">{t('players.goalkeeper')}</option>
                    <option value="Defensa">{t('players.defender')}</option>
                    <option value="Medio">{t('players.midfielder')}</option>
                    <option value="Delantero">{t('players.forward')}</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{isHuesca ? t('common.position') : t('editPlayer.tacticalRole')}</label>
              {isHuesca ? (
                <select
                  value={formData.posicionJuego}
                  onChange={(e) => handleChange('posicionJuego', e.target.value)}
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
                </select>
              ) : (
                <input 
                  type="text" 
                  value={formData.posicionJuego} 
                  onChange={(e) => handleChange('posicionJuego', e.target.value.toUpperCase())}
                  placeholder={t('editPlayer.tacticalRolePlaceholder')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-[var(--accent)] uppercase" 
                />
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.otherPosition', 'Otra Posición')}</label>
              {isHuesca ? (
                <select
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
                </select>
              ) : (
                <input 
                  type="text" 
                  value={formData.otraPosicion || ''} 
                  onChange={(e) => handleChange('otraPosicion' as keyof Player, e.target.value.toUpperCase())}
                  placeholder="–"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-[var(--accent)] uppercase" 
                />
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.laterality')}</label>
              <select
                value={formData.perfil}
                onChange={(e) => handleChange('perfil', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
              >
                <option value="D">{t('editPlayer.rightFootLabel', 'Diestro')}</option>
                <option value="I">{t('editPlayer.leftFootLabel', 'Zurdo')}</option>
                <option value="A">{t('editPlayer.bothFeetLabel', 'Ambas')}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.team')}</label>
              {equipos.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                  <i className="fa-solid fa-circle-info"></i>
                  Crea antes un equipo en la sección Equipos.
                </div>
              ) : (
                <select
                  value={formData.equipoId || ''}
                  onChange={(e) => handleEquipoSelect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer"
                >
                  <option value="">-- Selecciona un equipo --</option>
                  {equipos.map(eq => (
                    <option key={String(eq.id)} value={String(eq.id)}>
                      {eq.nombre}{eq.equipo ? ` — ${eq.equipo}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('editPlayer.birthDate')}</label>
              <input
                type="text"
                placeholder={t('editPlayer.birthDatePlaceholder')}
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
          />

          {/* === MINUTOS POR POSICIÓN EN EL CAMPO === */}
          {matches && matches.length > 0 && (
            <PlayerPositionMap
              playerId={String(player.id)}
              playerName={formData.apodo || formData.nombre}
              photoUrl={preview || undefined}
              matches={matches}
            />
          )}

          {/* === DESGLOSE POR COMPETICIÓN Y PARTIDO === */}
          {matches && matches.length > 0 && (
            <PlayerMatchBreakdown playerId={String(player.id)} matches={matches} equipos={equipos} clubes={clubes} />
          )}

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
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.firstName', 'Nombre')}</label>
                    <input type="text" value={formData.nombrePila || ''} onChange={(e) => handleChange('nombrePila' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.firstSurname', 'Primer apellido')}</label>
                    <input type="text" value={formData.primerApellido || ''} onChange={(e) => handleChange('primerApellido' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.secondSurname', 'Segundo apellido')}</label>
                    <input type="text" value={formData.segundoApellido || ''} onChange={(e) => handleChange('segundoApellido' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700" />
                  </div>
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
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{t('editPlayer.stage', 'Etapa')}</label>
                    <select value={formData.etapa || ''} onChange={(e) => handleChange('etapa' as keyof Player, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none font-semibold text-slate-700 appearance-none cursor-pointer">
                      <option value="">–</option>
                      <option value="Senior">Senior</option>
                      <option value="Juvenil">Juvenil</option>
                      <option value="Cadete">Cadete</option>
                      <option value="Infantil">Infantil</option>
                      <option value="Alevín">Alevín</option>
                      <option value="Benjamín">Benjamín</option>
                    </select>
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
            disabled={isSaving || !formData.equipoId}
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
