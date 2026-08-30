import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import type { Match, MatchReport } from '@modules/partidos';
import { clubesService } from '@shared/services/dataService';
import type { Jugador, Club } from '@shared/services/dataService';
import { supabase } from '@shared/services/supabaseClient';
import MultiSelectFilter from '@shared/components/MultiSelectFilter';
import ShareButton from '@modules/partidos/components/ShareButton';
import { DataTable } from '@shared/components/DataTable';
import VideotecaEventsTable from './VideotecaEventsTable';
import type { DataTableAction } from '@shared/components/DataTable';
import { getOrCreateChannelShareLink, getChannelShareUrl, copyChannelShareUrlToClipboard } from '@shared/services/shareService';
import { useAuth } from '@context/AuthContext';
import type { CompetitionTeam } from '@modules/competicion';
import { compareEquipoNames } from '@shared/components/EquipoSelect';
import {
  normalizeTeamKey,
  isSameCompetition,
  internalNameOfTeam,
  isLikelyInternalTeamName,
  getCompetitionType,
  buildInternalNameByFedName,
  resolveEquipoInterno,
} from '@modules/partidos/utils/teamResolution';

interface VideotecaProps {
  matches?: Match[];
  competitionTeams?: CompetitionTeam[];
  ownClubId?: string | number;
}

const EVENTO_TIPO_OPTIONS: { value: string; label: string }[] = [
  { value: 'GOL', label: 'Goles' },
  { value: 'OCASION', label: 'Ocasiones' },
  { value: 'DUELO', label: 'Duelos' },
  { value: 'MCB', label: 'MCB' },
  { value: 'MSB', label: 'MSB' },
  { value: 'NOTA', label: 'Notas' },
];

const LADO_OPTIONS: { value: string; label: string }[] = [
  { value: 'FAVOR', label: 'A favor' },
  { value: 'CONTRA', label: 'En contra' },
];


interface MatchVideoItem {
  matchId: string;
  title: string;
  competition: string;
  date: string;
  vimeoUrl: string;
  goalsFavor: number;
  goalsContra: number;
  ocasionesCount: number;
  resultado: 'FAVOR' | 'CONTRA' | 'EMPATE';
  equipoInterno: string;
}

/** Convierte una URL de YouTube/Vimeo en su URL de embebido para reproducir en el modal. */
const getEmbedUrl = (url: string, startSeconds?: number): string => {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    return startSeconds ? `${embedUrl}?start=${Math.floor(startSeconds)}` : embedUrl;
  }
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (vimeoMatch) {
    const hash = vimeoMatch[2];
    const baseUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}${hash ? `?h=${hash}` : ''}`;
    return startSeconds ? `${baseUrl}${hash ? '&' : '?'}t=${Math.floor(startSeconds)}` : baseUrl;
  }
  return url;
};

/** Detecta si la URL apunta a un archivo servido por Supabase Storage (no un embed de YouTube/Vimeo). */
const isSupabaseUrl = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('supabase.co') || lower.includes('supabaseusercontent.com');
};

interface VideoRow {
  matchId: string;
  title: string;
  competition: string;
  date: string;
  vimeoUrl: string;
  goalsFavor: number;
  goalsContra: number;
  ocasionesCount: number;
  resultado: 'FAVOR' | 'CONTRA' | 'EMPATE';
}

const Videoteca: React.FC<VideotecaProps> = ({ matches = [], competitionTeams = [], ownClubId }) => {
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const esJugador = perfil?.rol === 'Jugador';
  const [matchReportsById, setMatchReportsById] = useState<Map<string, MatchReport>>(new Map());
  const [playersById, setPlayersById] = useState<Map<string | number, Jugador>>(new Map());
  const [clubsById, setClubsById] = useState<Map<string | number, Club>>(new Map());
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [videoModalTimestamp, setVideoModalTimestamp] = useState<number | undefined>(undefined);
  const [equipoInternoFilter, setEquipoInternoFilter] = useState<string[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const [competitionFilter, setCompetitionFilter] = useState<string[]>([]);
  const [eventoTipoFilter, setEventoTipoFilter] = useState<string[]>([]);
  const [ladoFilter, setLadoFilter] = useState<string[]>([]);
  const [playerFilter, setPlayerFilter] = useState<string[]>([]);
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [channelShareUrl, setChannelShareUrl] = useState<string | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'videos' | 'events'>('events');

  // Solo nuestros propios equipos (por clubId), no los rivales del catálogo de la competición.
  const ownCompetitionTeams = useMemo(
    () => (ownClubId ? competitionTeams.filter((team) => String(team.clubId) === String(ownClubId)) : []),
    [competitionTeams, ownClubId]
  );

  const internalNameByFedName = useMemo(
    () => buildInternalNameByFedName(ownCompetitionTeams),
    [ownCompetitionTeams]
  );

  // El vídeo completo, los goles a favor/contra y las ocasiones de cada partido vienen
  // del informe de partido (match_reports), no del propio Match.
  // Optimización: cargar solo reports con videoUrl para evitar procesar miles de filas innecesarias.
  useEffect(() => {
    (async () => {
      try {
        // Consulta ligera directa a Supabase: solo las columnas que usa Videoteca,
        // en vez de db.match_reports.get() que trae ~50 columnas JSONB/texto por fila
        // (informes rivales, planes de partido, ABP...) que aquí no se usan.
        const { data: reportsData, error: reportsError } = await supabase
          .from('match_reports')
          .select('id, video_url, video_originals, match_goals, video_events')
          .or('video_url.not.is.null,video_originals->>videoUrl.not.is.null');
        if (reportsError) throw reportsError;

        const reportMap = new Map<string, MatchReport>();
        (reportsData || []).forEach((row: any) => {
          reportMap.set(String(row.id), {
            id: row.id,
            videoUrl: row.video_url,
            videoOriginals: row.video_originals || {},
            matchGoals: row.match_goals || [],
            videoEvents: row.video_events || [],
          } as MatchReport);
        });
        setMatchReportsById(reportMap);

        // Solo se cargan los jugadores realmente referenciados en goles/ocasiones
        const playerIds = new Set<string>();
        reportMap.forEach((report) => {
          (report.matchGoals || []).forEach((g) => { if (g.playerId != null) playerIds.add(String(g.playerId)); });
          (report.videoEvents || []).forEach((e) => { if (e.playerId != null) playerIds.add(String(e.playerId)); });
        });

        const playerMap = new Map<string | number, Jugador>();
        if (playerIds.size > 0) {
          const { data: playersRes, error } = await supabase
            .from('plantillas')
            .select('*')
            .in('id', Array.from(playerIds));
          if (error) throw error;
          (playersRes || []).forEach((player: Jugador) => playerMap.set(player.id, player));
        }
        setPlayersById(playerMap);

        // Cargar clubes para poder mostrar nombres en los partidos
        const clubsRes = await clubesService.list();
        const clubMap = new Map<string | number, Club>();
        clubsRes.forEach((club: Club) => clubMap.set(String(club.id), club));
        setClubsById(clubMap);
      } catch (err) {
        console.error('Error al cargar datos:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Generate channel share link on mount
  useEffect(() => {
    if (!perfil?.club_id || esJugador) return;
    (async () => {
      try {
        const shareData = await getOrCreateChannelShareLink(perfil.club_id!);
        setChannelShareUrl(getChannelShareUrl(shareData.token));
      } catch (err) {
        console.error('Error al generar enlace de canal:', err);
      }
    })();
  }, [perfil?.club_id, esJugador]);

  // Partidos que tienen vídeo del informe (base de todo lo que se muestra en la Videoteca).
  const matchesWithVideo = useMemo(
    () => matches.filter((match) => !!matchReportsById.get(String(match.id))?.videoUrl),
    [matches, matchReportsById]
  );

  const equipoInternoOptions = useMemo(() => {
    const names = new Map<string, string>();
    const addName = (name?: string) => {
      const value = name?.trim();
      const key = normalizeTeamKey(value);
      if (value && key && !names.has(key)) names.set(key, value);
    };
    ownCompetitionTeams.forEach((team) => addName(internalNameOfTeam(team)));
    matchesWithVideo.forEach((m) => {
      addName(isLikelyInternalTeamName(m.nombreInterno) ? m.nombreInterno : undefined);
      addName(isLikelyInternalTeamName(m.team) ? m.team : undefined);
    });
    return Array.from(names.values()).sort(compareEquipoNames);
  }, [ownCompetitionTeams, matchesWithVideo]);

  const tipoOptions = useMemo(() => {
    const types = new Set<string>();
    matchesWithVideo.forEach((m) => {
      const type = getCompetitionType(m.competition);
      if (type !== '-') types.add(type);
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matchesWithVideo]);

  const competitionOptions = useMemo(
    () => Array.from(new Set(matchesWithVideo.map((m) => m.competition || '-').filter((c) => c !== '-'))).sort((a, b) => a.localeCompare(b, 'es')),
    [matchesWithVideo]
  );

  const playerOptions = useMemo(() => {
    const names = new Map<string, string>();
    matchesWithVideo.forEach((m) => {
      const report = matchReportsById.get(String(m.id));
      if (!report) return;
      (report.matchGoals || []).forEach((g) => {
        if (g.playerId == null) return;
        const key = String(g.playerId);
        if (!names.has(key)) names.set(key, playersById.get(g.playerId)?.nombre || 'Jugador eliminado');
      });
      (report.videoEvents || []).forEach((e) => {
        if (e.playerId == null) return;
        const key = String(e.playerId);
        if (!names.has(key)) names.set(key, playersById.get(e.playerId)?.nombre || 'Jugador eliminado');
      });
    });
    return Array.from(names.entries()).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [matchesWithVideo, matchReportsById, playersById]);

  const monthOptions = useMemo(() => {
    const months = new Map<string, string>();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    matchesWithVideo.forEach((m) => {
      if (m.date) {
        const date = new Date(m.date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        const label = `${monthNames[month]} ${year}`;
        if (!months.has(key)) months.set(key, label);
      }
    });

    return Array.from(months.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, [matchesWithVideo]);

  const filteredVideos = useMemo<MatchVideoItem[]>(() => {
    return matchesWithVideo
      .filter((match) => {
        if (equipoInternoFilter.length > 0 && !equipoInternoFilter.includes(resolveEquipoInterno(match, ownCompetitionTeams, internalNameByFedName))) return false;
        if (tipoFilter.length > 0 && !tipoFilter.includes(getCompetitionType(match.competition))) return false;
        if (competitionFilter.length > 0 && !competitionFilter.includes(match.competition)) return false;

        // Filtro de fechas
        if (match.date) {
          const matchDate = new Date(match.date);
          if (dateFromFilter || dateToFilter) {
            if (dateFromFilter) {
              const fromDate = new Date(dateFromFilter);
              if (matchDate < fromDate) return false;
            }
            if (dateToFilter) {
              const toDate = new Date(dateToFilter);
              toDate.setHours(23, 59, 59, 999);
              if (matchDate > toDate) return false;
            }
          } else if (monthFilter.length > 0) {
            const matchMonth = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthFilter.includes(matchMonth)) return false;
          }
        }

        const report = matchReportsById.get(String(match.id));
        const goals = report?.matchGoals || [];
        const events = report?.videoEvents || [];
        const goalsFavor = goals.filter((g) => g.side === 'FAVOR').length;
        const goalsContra = goals.filter((g) => g.side === 'CONTRA').length;
        const resultado = goalsFavor > goalsContra ? 'FAVOR' : goalsContra > goalsFavor ? 'CONTRA' : 'EMPATE';

        if (eventoTipoFilter.length > 0) {
          const matchesEventoTipo = eventoTipoFilter.some((tipo) => {
            if (tipo === 'GOL') return goals.length > 0;
            if (tipo === 'OCASION') return events.some((e) => e.type === 'OCASION');
            if (tipo === 'DUELO') return events.some((e) => e.type === 'DUELO');
            if (tipo === 'MCB') return events.some((e) => e.type === 'MCB');
            if (tipo === 'MSB') return events.some((e) => e.type === 'MSB');
            if (tipo === 'NOTA') return events.some((e) => e.type === 'NOTA');
            return false;
          });
          if (!matchesEventoTipo) return false;
        }

        if (ladoFilter.length > 0 && !goals.some((g) => ladoFilter.includes(g.side))) return false;

        if (playerFilter.length > 0) {
          const hasPlayer =
            goals.some((g) => playerFilter.includes(String(g.playerId))) ||
            events.some((e) => playerFilter.includes(String(e.playerId)));
          if (!hasPlayer) return false;
        }

        return true;
      })
      .map((match): MatchVideoItem => {
        const report = matchReportsById.get(String(match.id))!;
        const goalsFavor = (report.matchGoals || []).filter((g) => g.side === 'FAVOR').length;
        const goalsContra = (report.matchGoals || []).filter((g) => g.side === 'CONTRA').length;
        const ocasionesCount = (report.videoEvents || []).filter((e) => e.type === 'OCASION').length;
        const resultado = goalsFavor > goalsContra ? 'FAVOR' : goalsContra > goalsFavor ? 'CONTRA' : 'EMPATE';

        // Obtener nombre interno del equipo local
        const equipoInterno = resolveEquipoInterno(match, ownCompetitionTeams, internalNameByFedName);

        // Obtener nombre del club visitante
        let clubVisitante = match.visitorTeam || 'Visitante';
        if (match.visitorTeamClubId) {
          const clubData = clubsById.get(String(match.visitorTeamClubId));
          if (clubData) {
            clubVisitante = clubData.nombre || clubVisitante;
          }
        }

        const videoUrl = report.videoUrl || (report.videoOriginals?.videoUrl);
        return {
          matchId: String(match.id),
          title: `${equipoInterno} vs ${clubVisitante}${match.jornada ? ` (Jornada ${match.jornada})` : ''}`,
          competition: match.competition || '-',
          date: match.date ? new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
          vimeoUrl: videoUrl,
          goalsFavor,
          goalsContra,
          ocasionesCount,
          resultado,
          equipoInterno,
        };
      })
      .sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime());
  }, [matchesWithVideo, matchReportsById, equipoInternoFilter, tipoFilter, competitionFilter, eventoTipoFilter, ladoFilter, playerFilter, dateFromFilter, dateToFilter, monthFilter, ownCompetitionTeams, internalNameByFedName, clubsById]);

  const toggleRowExpanded = (matchId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const getPlayerName = (playerId?: string | number): string => {
    if (!playerId) return 'Gol';
    const player = playersById.get(playerId);
    return player ? player.nombre : 'Jugador eliminado';
  };

  const handleCopyChannelShareUrl = async () => {
    if (!channelShareUrl) return;
    setSharingLoading(true);
    try {
      // Extract token from URL
      const token = channelShareUrl.split('/').pop();
      if (token) {
        await copyChannelShareUrlToClipboard(token);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch (err) {
      console.error('Error copiando enlace:', err);
    } finally {
      setSharingLoading(false);
    }
  };

  const columnHelper = createColumnHelper<VideoRow>();
  const tableColumns = useMemo(() => [
    columnHelper.display({
      id: 'expand',
      header: '',
      cell: (info) => (
        <button
          type="button"
          onClick={() => toggleRowExpanded(info.row.original.matchId)}
          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          title={expandedRows.has(info.row.original.matchId) ? 'Ocultar detalles' : 'Mostrar detalles'}
        >
          <i className={`fa-solid fa-chevron-down text-xs transition-transform ${expandedRows.has(info.row.original.matchId) ? 'rotate-180' : ''}`}></i>
        </button>
      ),
    }),
    columnHelper.accessor('competition', { header: 'COMPETICIÓN' }),
    columnHelper.accessor('date', { header: 'FECHA' }),
    columnHelper.accessor('title', {
      header: 'PARTIDO',
      cell: (info) => (
        <span className="font-black uppercase text-slate-800">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('goalsFavor', {
      header: 'GOLES F',
      cell: (info) => <span className="font-black text-emerald-600">{info.getValue()}</span>,
    }),
    columnHelper.accessor('goalsContra', {
      header: 'GOLES C',
      cell: (info) => <span className="font-black text-red-500">{info.getValue()}</span>,
    }),
    columnHelper.accessor('resultado', {
      header: 'A FAVOR / EN CONTRA',
      cell: (info) => {
        const resultado = info.getValue();
        if (resultado === 'FAVOR') {
          return <span className="font-black text-emerald-600 text-xs">A FAVOR</span>;
        } else if (resultado === 'CONTRA') {
          return <span className="font-black text-red-500 text-xs">EN CONTRA</span>;
        } else {
          return <span className="font-black text-amber-600 text-xs">EMPATE</span>;
        }
      }
    }),
    columnHelper.accessor('ocasionesCount', { header: 'OCASIONES' }),
    columnHelper.accessor('vimeoUrl', {
      header: 'VÍDEO',
      cell: (info) =>
        info.getValue() ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVideoModalUrl(info.getValue()); setVideoModalTimestamp(undefined); }}
            className="w-7 h-7 rounded-full bg-sport-primary/10 text-sport-primary hover:bg-sport-primary hover:text-white transition-all flex items-center justify-center"
            title="Ver vídeo completo del partido"
          >
            <i className="fa-solid fa-play text-[10px]"></i>
          </button>
        ) : (
          <span className="text-slate-300">-</span>
        ),
    }),
  ], [expandedRows]);

  const tableActions: DataTableAction<VideoRow>[] = useMemo(() => (
    esJugador ? [] : [
      {
        icon: 'fa-regular fa-file-lines',
        label: 'Ver informe completo',
        onClick: (row) => navigate(`/partidos/${row.matchId}`),
      },
    ]
  ), [navigate, esJugador]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-sport-primary font-black text-lg uppercase tracking-tighter">Videoteca Oficial</h3>
          <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest mt-1">Vídeos completos de los partidos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <a
            href="https://www.youtube.com/@GestionClubes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:border-red-300"
            title="Abrir el canal de YouTube (sin login)"
          >
            <i className="fa-brands fa-youtube text-xs"></i>
            Mi Canal
          </a>
          {channelShareUrl && (
            <button
              onClick={handleCopyChannelShareUrl}
              disabled={sharingLoading}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                shareCopied
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 hover:border-blue-300'
              }`}
              title="Copiar enlace privado para compartir el canal"
            >
              <i className={`fa-solid ${shareCopied ? 'fa-check' : 'fa-link'} text-xs`}></i>
              {shareCopied ? 'Copiado' : 'Compartir Canal'}
            </button>
          )}
        </div>
      </div>

      {/* Filtros: Tipo, Equipo, Jugadores */}
      <div className={`grid grid-cols-1 gap-3 ${esJugador ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Tipo</label>
          <MultiSelectFilter
            options={EVENTO_TIPO_OPTIONS}
            value={eventoTipoFilter}
            onChange={setEventoTipoFilter}
            allLabel="Todos los tipos"
          />
        </div>
        {!esJugador && (
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Equipo</label>
            <MultiSelectFilter
              options={equipoInternoOptions.map((name) => ({ value: name, label: name }))}
              value={equipoInternoFilter}
              onChange={setEquipoInternoFilter}
              allLabel="Todos los equipos"
            />
          </div>
        )}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Jugadores</label>
          <MultiSelectFilter
            options={playerOptions.map(([value, label]) => ({ value, label }))}
            value={playerFilter}
            onChange={setPlayerFilter}
            allLabel="Todos los jugadores"
          />
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setViewMode('events')}
          className={`px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
            viewMode === 'events'
              ? 'bg-sport-primary text-white shadow-lg'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <i className="fa-solid fa-th text-xs"></i> Tabla Eventos
        </button>
        <button
          onClick={() => setViewMode('videos')}
          className={`px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
            viewMode === 'videos'
              ? 'bg-sport-primary text-white shadow-lg'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <i className="fa-solid fa-video text-xs"></i> Videos
        </button>
      </div>

      {viewMode === 'events' ? (
        // VISTA DE TABLA DE EVENTOS
        isLoading ? (
          <div className="py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center">
            <div className="animate-spin mb-4">
              <i className="fa-solid fa-spinner text-4xl text-sport-primary"></i>
            </div>
            <p className="font-black text-sm uppercase tracking-widest text-slate-600">Cargando...</p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <VideotecaEventsTable
              matches={filteredVideos.map(v => {
                const match = matches.find(m => String(m.id) === v.matchId);
                if (match) return { ...match, nombreInterno: v.equipoInterno };
                // Si no encuentra el match, crea uno parcial con los campos necesarios
                const [local, visitor] = v.title.split(' vs ');
                return {
                  id: v.matchId,
                  opponent: v.title,
                  date: v.date,
                  competition: v.competition,
                  localTeam: local?.trim() || 'Local',
                  visitorTeam: visitor?.split('(')[0].trim() || 'Visitante',
                  nombreInterno: v.equipoInterno,
                };
              })}
              matchReportsById={matchReportsById}
              playersById={playersById}
              onVideoClick={(url, timestamp) => {
                setVideoModalUrl(url);
                setVideoModalTimestamp(timestamp);
              }}
              eventoTipoFilter={eventoTipoFilter}
              ladoFilter={ladoFilter}
              playerFilter={playerFilter}
              dateFromFilter={dateFromFilter}
              dateToFilter={dateToFilter}
              monthFilter={monthFilter}
            />
          </div>
        )
      ) : (
        // VISTA DE TABLA DE VIDEOS
        isLoading ? (
          <div className="py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center">
            <div className="animate-spin mb-4">
              <i className="fa-solid fa-spinner text-4xl text-sport-primary"></i>
            </div>
            <p className="font-black text-sm uppercase tracking-widest text-slate-600">Cargando...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
        <div className="py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-60">
          <i className="fa-solid fa-video-slash text-4xl mb-4 text-slate-300"></i>
          <p className="font-black text-sm uppercase tracking-widest text-slate-400">No hay vídeos de partidos disponibles</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Añade un vídeo en el informe de un partido para que aparezca aquí</p>
        </div>
      ) : (
        <div className="space-y-0 border border-slate-200 rounded-lg overflow-hidden bg-white">
          <DataTable<VideoRow>
            data={filteredVideos}
            columns={tableColumns}
            actions={tableActions}
            searchable
            sortable
            paginated={false}
            pageSize={30}
            pageSizeOptions={[30, 50, 100]}
            exportable={false}
            exportFilename="videoteca"
            emptyMessage="No hay vídeos disponibles"
            emptyIcon="fa-solid fa-video-slash"
            cellTextClassName="text-[11px]"
          />
          {filteredVideos.map((video) => {
            if (!expandedRows.has(video.matchId)) return null;
            const report = matchReportsById.get(video.matchId);
            if (!report) return null;

            const goals = report.matchGoals || [];
            const goalsFavor = goals.filter(g => g.side === 'FAVOR');
            const goalsContra = goals.filter(g => g.side === 'CONTRA');
            const ocasiones = (report.videoEvents || []).filter(e => e.type === 'OCASION');
            const duelos = (report.videoEvents || []).filter(e => e.type === 'DUELO');
            const mcbEvents = (report.videoEvents || []).filter(e => e.type === 'MCB');
            const msbEvents = (report.videoEvents || []).filter(e => e.type === 'MSB');
            const notas = (report.videoEvents || []).filter(e => e.type === 'NOTA');

            return (
              <div key={`details-${video.matchId}`} className="border-t border-slate-200 bg-slate-50/50 p-3 md:p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  {/* Goles a favor */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      Goles a favor ({goalsFavor.length})
                    </h4>
                    <div className="space-y-0.5">
                      {goalsFavor.length === 0 ? (
                        <p className="text-[10px] text-slate-400">Sin goles</p>
                      ) : (
                        goalsFavor.map((goal) => (
                          <div key={goal.id} className="text-xs font-bold text-slate-700 bg-white rounded px-2 py-1 border border-emerald-100 flex items-center justify-between gap-2">
                            <span><span className="text-emerald-600 font-black text-xs">{goal.minute}'</span> {getPlayerName(goal.playerId)}</span>
                            {video.vimeoUrl && (
                              <button
                                type="button"
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(goal.videoTimestamp ?? 0); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center"
                                title="Ver gol"
                              >
                                <i className="fa-solid fa-play text-[7px]"></i>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Goles en contra */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-red-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-600"></span>
                      Goles en contra ({goalsContra.length})
                    </h4>
                    <div className="space-y-0.5">
                      {goalsContra.length === 0 ? (
                        <p className="text-[10px] text-slate-400">Sin goles</p>
                      ) : (
                        goalsContra.map((goal) => (
                          <div key={goal.id} className="text-xs font-bold text-slate-700 bg-white rounded px-2 py-1 border border-red-100 flex items-center justify-between gap-2">
                            <span><span className="text-red-600 font-black text-xs">{goal.minute}'</span> {getPlayerName(goal.playerId)}</span>
                            {video.vimeoUrl && (
                              <button
                                type="button"
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(goal.videoTimestamp ?? 0); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-red-600/20 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                                title="Ver gol"
                              >
                                <i className="fa-solid fa-play text-[7px]"></i>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Ocasiones */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                      Ocasiones ({ocasiones.length})
                    </h4>
                    <div className="space-y-0.5">
                      {ocasiones.length === 0 ? (
                        <p className="text-[10px] text-slate-400">Sin ocasiones</p>
                      ) : (
                        ocasiones.map((ocasion) => (
                          <div key={ocasion.id} className="text-xs font-bold text-slate-700 bg-white rounded px-2 py-1 border border-slate-200 flex items-center justify-between gap-2">
                            <span><span className="text-slate-600 font-black text-xs">{ocasion.minute}'</span> {ocasion.note || 'Ocasión'}</span>
                            {video.vimeoUrl && (
                              <button
                                type="button"
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(ocasion.videoTimestamp ?? 0); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-slate-400/20 text-slate-600 hover:bg-slate-600 hover:text-white transition-all flex items-center justify-center"
                                title="Ver ocasión"
                              >
                                <i className="fa-solid fa-play text-[7px]"></i>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Duelos */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                      Duelos ({duelos.length})
                    </h4>
                    <div className="space-y-0.5">
                      {duelos.length === 0 ? (
                        <p className="text-[10px] text-slate-400">Sin duelos</p>
                      ) : (
                        duelos.map((duelo) => (
                          <div key={duelo.id} className="text-xs font-bold text-slate-700 bg-white rounded px-2 py-1 border border-amber-100 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1">
                              <span className="text-amber-600 font-black text-xs">{duelo.minute}'</span>
                              {getPlayerName(duelo.playerId)}
                              {duelo.duelOutcome && (
                                <span className={`text-[9px] font-black px-1.5 rounded ${duelo.duelOutcome === 'GANADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {duelo.duelOutcome === 'GANADO' ? 'G' : 'P'}
                                </span>
                              )}
                            </span>
                            {video.vimeoUrl && (
                              <button
                                type="button"
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(duelo.videoTimestamp ?? 0); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-amber-600/20 text-amber-600 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center"
                                title="Ver duelo"
                              >
                                <i className="fa-solid fa-play text-[7px]"></i>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* MCB */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      MCB ({mcbEvents.length})
                    </h4>
                    <div className="space-y-0.5">
                      {mcbEvents.length === 0 ? (
                        <p className="text-[10px] text-slate-400">Sin eventos MCB</p>
                      ) : (
                        mcbEvents.map((mcb) => (
                          <div key={mcb.id} className="text-xs font-bold text-slate-700 bg-white rounded px-2 py-1 border border-blue-100 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1">
                              <span className="text-blue-600 font-black text-xs">{mcb.minute}'</span>
                              {getPlayerName(mcb.playerId)}
                            </span>
                            {video.vimeoUrl && (
                              <button
                                type="button"
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(mcb.videoTimestamp ?? 0); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                                title="Ver evento MCB"
                              >
                                <i className="fa-solid fa-play text-[7px]"></i>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* MSB */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-violet-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                      MSB ({msbEvents.length})
                    </h4>
                    <div className="space-y-0.5">
                      {msbEvents.length === 0 ? (
                        <p className="text-[10px] text-slate-400">Sin eventos MSB</p>
                      ) : (
                        msbEvents.map((msb) => (
                          <div key={msb.id} className="text-xs font-bold text-slate-700 bg-white rounded px-2 py-1 border border-violet-100 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1">
                              <span className="text-violet-600 font-black text-xs">{msb.minute}'</span>
                              {getPlayerName(msb.playerId)}
                            </span>
                            {video.vimeoUrl && (
                              <button
                                type="button"
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(msb.videoTimestamp ?? 0); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-violet-600/20 text-violet-600 hover:bg-violet-600 hover:text-white transition-all flex items-center justify-center"
                                title="Ver evento MSB"
                              >
                                <i className="fa-solid fa-play text-[7px]"></i>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      Notas ({notas.length})
                    </h4>
                    <div className="space-y-0.5">
                      {notas.length === 0 ? (
                        <p className="text-[10px] text-slate-400">Sin notas</p>
                      ) : (
                        notas.map((nota) => (
                          <div key={nota.id} className="text-xs font-bold text-slate-700 bg-white rounded px-2 py-1 border border-indigo-100 flex items-center justify-between gap-2">
                            <span><span className="text-indigo-600 font-black text-xs">{nota.minute}'</span> {nota.note || 'Nota'}</span>
                            {video.vimeoUrl && (
                              <button
                                type="button"
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(nota.videoTimestamp ?? 0); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                title="Ver nota"
                              >
                                <i className="fa-solid fa-play text-[7px]"></i>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )
      )}

      {videoModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setVideoModalUrl(null)}
        >
          <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setVideoModalUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest"
            >
              <i className="fa-solid fa-xmark"></i> Cerrar
            </button>
            {isSupabaseUrl(videoModalUrl) ? (
              <video
                key={`${videoModalUrl}-${videoModalTimestamp}`}
                src={videoModalUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full rounded-2xl border-0 bg-black"
                onLoadedMetadata={(e) => {
                  if (videoModalTimestamp) {
                    e.currentTarget.currentTime = videoModalTimestamp;
                  }
                }}
                onError={() => {
                  console.warn('[videoteca] Error cargando video:', videoModalUrl);
                  alert('No se pudo cargar el vídeo. Verifica la URL o intenta más tarde.');
                }}
              >
                Tu navegador no soporta vídeo HTML5
              </video>
            ) : (
              <iframe
                key={videoModalTimestamp}
                src={getEmbedUrl(videoModalUrl, videoModalTimestamp)}
                className="w-full h-full rounded-2xl border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Vídeo del partido"
                onError={() => {
                  console.warn('[videoteca] Error cargando iframe:', videoModalUrl);
                  alert('No se pudo cargar el vídeo. Verifica la URL o intenta más tarde.');
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Videoteca;
