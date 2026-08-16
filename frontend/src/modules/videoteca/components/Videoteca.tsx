import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import type { Match, MatchReport } from '@modules/partidos';
import { db, plantillasService, clubesService } from '@shared/services/dataService';
import type { Jugador } from '@shared/services/dataService';
import SearchableSelect from '@shared/components/SearchableSelect';
import ShareButton from '@modules/partidos/components/ShareButton';
import { DataTable } from '@shared/components/DataTable';
import type { DataTableAction } from '@shared/components/DataTable';
import { getOrCreateChannelShareLink, getChannelShareUrl, copyChannelShareUrlToClipboard } from '@shared/services/shareService';
import { useAuth } from '@context/AuthContext';

interface VideotecaProps {
  matches?: Match[];
}

interface MatchVideoItem {
  matchId: string;
  title: string;
  competition: string;
  date: string;
  vimeoUrl: string;
  goalsFavor: number;
  goalsContra: number;
  ocasionesCount: number;
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

const ALL_FILTER = 'ALL';

interface VideoRow {
  matchId: string;
  title: string;
  competition: string;
  date: string;
  vimeoUrl: string;
  goalsFavor: number;
  goalsContra: number;
  ocasionesCount: number;
}

const Videoteca: React.FC<VideotecaProps> = ({ matches = [] }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [matchReportsById, setMatchReportsById] = useState<Map<string, MatchReport>>(new Map());
  const [playersById, setPlayersById] = useState<Map<string | number, Jugador>>(new Map());
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [videoModalTimestamp, setVideoModalTimestamp] = useState<number | undefined>(undefined);
  const [competitionFilter, setCompetitionFilter] = useState<string>(ALL_FILTER);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [channelShareUrl, setChannelShareUrl] = useState<string | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // El vídeo completo, los goles a favor/contra y las ocasiones de cada partido vienen
  // del informe de partido (match_reports), no del propio Match.
  useEffect(() => {
    (async () => {
      try {
        const [reportsRes, playersRes] = await Promise.all([
          db.match_reports.get(),
          plantillasService.list()
        ]);

        const reportMap = new Map<string, MatchReport>();
        (reportsRes.data || []).forEach((report: MatchReport) => reportMap.set(String(report.id), report));
        setMatchReportsById(reportMap);

        const playerMap = new Map<string | number, Jugador>();
        (playersRes || []).forEach((player: Jugador) => playerMap.set(player.id, player));
        setPlayersById(playerMap);
      } catch (err) {
        console.error('Error al cargar datos:', err);
      }
    })();
  }, []);

  // Generate channel share link on mount
  useEffect(() => {
    if (!profile?.club_id) return;
    (async () => {
      try {
        const shareData = await getOrCreateChannelShareLink(profile.club_id);
        setChannelShareUrl(getChannelShareUrl(shareData.token));
      } catch (err) {
        console.error('Error al generar enlace de canal:', err);
      }
    })();
  }, [profile?.club_id]);

  const matchVideos = useMemo<MatchVideoItem[]>(() => {
    return matches
      .map((match): MatchVideoItem | null => {
        const report = matchReportsById.get(String(match.id));
        if (!report?.videoUrl) return null;
        const goalsFavor = (report.matchGoals || []).filter((g) => g.side === 'FAVOR').length;
        const goalsContra = (report.matchGoals || []).filter((g) => g.side === 'CONTRA').length;
        const ocasionesCount = (report.videoEvents || []).filter((e) => e.type === 'OCASION').length;
        const rival = match.opponent || match.visitorTeam || match.localTeam || 'Rival';
        return {
          matchId: String(match.id),
          title: `vs ${rival}${match.jornada ? ` (Jornada ${match.jornada})` : ''}`,
          competition: match.competition || '-',
          date: match.date ? new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
          vimeoUrl: report.videoUrl,
          goalsFavor,
          goalsContra,
          ocasionesCount,
        };
      })
      .filter((v): v is MatchVideoItem => v !== null)
      .sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime());
  }, [matches, matchReportsById]);

  const competitionOptions = useMemo(
    () => Array.from(new Set(matchVideos.map((v) => v.competition))).sort((a, b) => a.localeCompare(b, 'es')),
    [matchVideos]
  );

  const filteredVideos = useMemo(
    () => (competitionFilter === ALL_FILTER ? matchVideos : matchVideos.filter((v) => v.competition === competitionFilter)),
    [matchVideos, competitionFilter]
  );

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
    return player ? player.nombre : `Jugador #${playerId}`;
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
      header: 'RIVAL',
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

  const tableActions: DataTableAction<VideoRow>[] = useMemo(() => [
    {
      icon: 'fa-regular fa-file-lines',
      label: 'Ver informe completo',
      onClick: (row) => navigate(`/partidos/${row.matchId}`),
    },
  ], [navigate]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-sport-primary font-black text-2xl uppercase tracking-tighter">Videoteca Oficial</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Vídeos completos de los partidos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {channelShareUrl ? (
            <button
              onClick={() => {
                const url = new URL(channelShareUrl, window.location.origin);
                window.open(url.toString(), '_blank');
              }}
              className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:border-red-300"
              title="Abrir tu canal público (sin login requerido)"
            >
              <i className="fa-solid fa-link text-lg"></i>
              Mi Canal
            </button>
          ) : (
            <a
              href="https://www.youtube.com/@athletic-club"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:border-red-300"
            >
              <i className="fa-brands fa-youtube text-lg"></i>
              Mi Canal
            </a>
          )}
          {channelShareUrl && (
            <button
              onClick={handleCopyChannelShareUrl}
              disabled={sharingLoading}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                shareCopied
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 hover:border-blue-300'
              }`}
              title="Copiar enlace privado para compartir el canal"
            >
              <i className={`fa-solid ${shareCopied ? 'fa-check' : 'fa-link'} text-lg`}></i>
              {shareCopied ? 'Copiado' : 'Compartir Canal'}
            </button>
          )}
          <div className="w-full sm:w-64">
            <SearchableSelect
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
            >
              <option value={ALL_FILTER}>Todas las competiciones</option>
              {competitionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </SearchableSelect>
          </div>
        </div>
      </div>

      {filteredVideos.length === 0 ? (
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
          />
          {filteredVideos.map((video) => {
            if (!expandedRows.has(video.matchId)) return null;
            const report = matchReportsById.get(video.matchId);
            if (!report) return null;

            const goals = report.matchGoals || [];
            const goalsFavor = goals.filter(g => g.side === 'FAVOR');
            const goalsContra = goals.filter(g => g.side === 'CONTRA');
            const ocasiones = (report.videoEvents || []).filter(e => e.type === 'OCASION');

            return (
              <div key={`details-${video.matchId}`} className="border-t border-slate-200 bg-slate-50/50 p-3 md:p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(goal.videoTimestamp); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center"
                                title={goal.videoTimestamp ? 'Ver gol' : 'Sin timestamp'}
                                disabled={!goal.videoTimestamp}
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
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(goal.videoTimestamp); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-red-600/20 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                                title={goal.videoTimestamp ? 'Ver gol' : 'Sin timestamp'}
                                disabled={!goal.videoTimestamp}
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
                                onClick={() => { setVideoModalUrl(video.vimeoUrl); setVideoModalTimestamp(ocasion.videoTimestamp); }}
                                className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-slate-400/20 text-slate-600 hover:bg-slate-600 hover:text-white transition-all flex items-center justify-center"
                                title={ocasion.videoTimestamp ? 'Ver ocasión' : 'Sin timestamp'}
                                disabled={!ocasion.videoTimestamp}
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
            <iframe
              key={videoModalTimestamp}
              src={getEmbedUrl(videoModalUrl, videoModalTimestamp)}
              className="w-full h-full rounded-2xl border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vídeo del partido"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Videoteca;
