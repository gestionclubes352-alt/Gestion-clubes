import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match, MatchReport, VideoEvent, MatchGoal } from '@modules/partidos/types';
import { db, clubesService } from '@shared/services/dataService';
import type { Club } from '@shared/services/dataService';
import { supabase } from '@shared/services/supabaseClient';

interface PlayerVideosSectionProps {
  playerId: string;
  playerName?: string;
  matches?: Match[];
}

interface PlayerVideoItem {
  matchId: string;
  reportId: string;
  title: string;
  date: string;
  competition: string;
  videoUrl: string;
  events: Array<{
    type: 'GOL' | 'OCASION' | 'DUELO' | 'NOTA';
    minute: string | number;
    note?: string;
  }>;
}

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

const PlayerVideosSection: React.FC<PlayerVideosSectionProps> = ({ playerId, playerName, matches = [] }) => {
  const { t } = useTranslation();
  const [playerVideos, setPlayerVideos] = useState<PlayerVideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [clubsById, setClubsById] = useState<Map<string | number, Club>>(new Map());

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);

        // Cargar todos los match reports
        const reportsRes = await db.match_reports.get();
        const reports = (reportsRes.data || []) as MatchReport[];

        // Cargar clubes para mostrar nombres
        const clubsRes = await clubesService.list();
        const clubMap = new Map<string | number, Club>();
        clubsRes.forEach((club: Club) => clubMap.set(String(club.id), club));
        setClubsById(clubMap);

        // Filtrar videos donde aparece este jugador
        const videosWithPlayer: PlayerVideoItem[] = [];

        for (const report of reports) {
          const hasPlayer =
            (report.matchGoals || []).some((g: MatchGoal) => String(g.playerId) === String(playerId)) ||
            (report.videoEvents || []).some((e: VideoEvent) => String(e.playerId) === String(playerId));

          if (!hasPlayer) continue;

          // Encontrar el match correspondiente (report.id es el matchId)
          const match = matches.find((m) => String(m.id) === String(report.id));
          if (!match || !report.videoUrl) continue;

          // Recopilar eventos del jugador
          const events: Array<{ type: 'GOL' | 'OCASION' | 'DUELO' | 'NOTA'; minute: string | number; note?: string }> = [];

          (report.matchGoals || []).forEach((goal: MatchGoal) => {
            if (String(goal.playerId) === String(playerId)) {
              events.push({
                type: 'GOL' as const,
                minute: goal.minute || '-',
                note: `${goal.side === 'FAVOR' ? 'A favor' : 'En contra'}`,
              });
            }
          });

          (report.videoEvents || []).forEach((event: VideoEvent) => {
            if (String(event.playerId) === String(playerId)) {
              const eventType = (event.type || 'NOTA') as 'GOL' | 'OCASION' | 'DUELO' | 'NOTA';
              events.push({
                type: eventType,
                minute: event.minute || '-',
                note: event.note,
              });
            }
          });

          if (events.length === 0) continue;

          // Obtener nombre del club visitante
          let clubVisitante = match.visitorTeam || 'Visitante';
          if (match.visitorTeamClubId) {
            const clubData = clubsById.get(String(match.visitorTeamClubId));
            if (clubData) {
              clubVisitante = clubData.nombre || clubVisitante;
            }
          }

          const videoUrl = report.videoUrl || (report.videoOriginals?.videoUrl);
          videosWithPlayer.push({
            matchId: String(match.id),
            reportId: String(report.id),
            title: `${match.nombreInterno || match.team} vs ${clubVisitante}${match.jornada ? ` (J${match.jornada})` : ''}`,
            date: match.date ? new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
            competition: match.competition || '-',
            videoUrl,
            events,
          });
        }

        // Ordenar por fecha descendente
        videosWithPlayer.sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('-'));
          const dateB = new Date(b.date.split('/').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        });

        setPlayerVideos(videosWithPlayer);
      } catch (err) {
        console.error('Error al cargar videos del jugador:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [playerId, matches]);

  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-film text-slate-400"></i>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('players.videos', 'Videos')}</span>
        </div>
        <div className="mt-3 text-xs text-slate-400 text-center py-4">
          {t('common.loading', 'Cargando...')}
        </div>
      </div>
    );
  }

  if (playerVideos.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <i className="fa-solid fa-film text-slate-400"></i>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('players.videos', 'Videos')}</span>
        </div>
        <div className="text-xs text-slate-400 text-center py-4">
          {t('players.noVideos', 'No hay videos disponibles')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <i className="fa-solid fa-film text-slate-600"></i>
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
          {t('players.videos', 'Videos')} ({playerVideos.length})
        </span>
      </div>

      <div className="space-y-2">
        {playerVideos.map((video) => (
          <div key={`${video.matchId}-${video.reportId}`} className="bg-white border border-slate-200 rounded-lg p-2 hover:border-slate-300 transition-colors">
            <div className="flex items-start gap-2">
              {video.videoUrl && (
                <button
                  onClick={() => setSelectedVideoUrl(video.videoUrl)}
                  className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center hover:shadow-md transition-all"
                  title="Ver video"
                >
                  <i className="fa-solid fa-play text-white text-xs"></i>
                </button>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{video.title}</div>
                <div className="text-[11px] text-slate-500 mb-1">
                  {video.date} • {video.competition}
                </div>
                <div className="flex flex-wrap gap-1">
                  {video.events.map((event, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        event.type === 'GOL'
                          ? 'bg-red-100 text-red-700'
                          : event.type === 'OCASION'
                            ? 'bg-yellow-100 text-yellow-700'
                            : event.type === 'DUELO'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <i className={`fa-solid ${event.type === 'GOL' ? 'fa-circle' : event.type === 'OCASION' ? 'fa-star' : event.type === 'DUELO' ? 'fa-crossed-swords' : 'fa-note-sticky'} text-xs`}></i>
                      <span>
                        {event.type} {event.minute && `${event.minute}'`}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de reproducción de video */}
      {selectedVideoUrl && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideoUrl(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-black">
              <iframe
                src={getEmbedUrl(selectedVideoUrl)}
                title="Video del jugador"
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setSelectedVideoUrl(null)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-semibold text-sm text-slate-700 transition-colors"
              >
                {t('common.close', 'Cerrar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerVideosSection;
