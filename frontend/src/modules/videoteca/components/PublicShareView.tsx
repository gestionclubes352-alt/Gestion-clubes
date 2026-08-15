import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMatchReportByToken } from '@shared/services/shareService';
import type { MatchReport } from '@modules/partidos';

interface MatchData {
  opponent?: string;
  date?: string;
  competition?: string;
  jornada?: string;
}

const getEmbedUrl = (url: string, startTimestamp?: number): string => {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    const videoId = ytMatch[1];
    const params = startTimestamp ? `&start=${Math.floor(startTimestamp)}` : '';
    return `https://www.youtube.com/embed/${videoId}?${params}`;
  }
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (vimeoMatch) {
    const hash = vimeoMatch[2];
    const baseUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}${hash ? `?h=${hash}` : ''}`;
    return startTimestamp ? `${baseUrl}#t=${Math.floor(startTimestamp)}s` : baseUrl;
  }
  return url;
};

const PublicShareView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [startTimestamp, setStartTimestamp] = useState<number | undefined>();

  useEffect(() => {
    async function loadSharedVideo() {
      if (!token) {
        setError('Token inválido');
        setLoading(false);
        return;
      }

      try {
        const result = await getMatchReportByToken(token);
        if (!result) {
          setError('El enlace compartido no es válido o ha expirado');
          setLoading(false);
          return;
        }

        const { shareToken, matchReport } = result;

        // Map database fields to frontend format
        const report: MatchReport & { id: string } = {
          id: matchReport.id,
          generalNotes: matchReport.general_notes || '',
          videoUrl: matchReport.video_url || '',
          rivalVideoUrl: matchReport.rival_video_url || '',
          rivalDocUrl: matchReport.rival_doc_url || '',
          rivalConBalonText: matchReport.rival_con_balon_text || '',
          rivalConBalonVideo: matchReport.rival_con_balon_video || '',
          rivalConBalonDoc: matchReport.rival_con_balon_doc || '',
          rivalSinBalonText: matchReport.rival_sin_balon_text || '',
          rivalSinBalonVideo: matchReport.rival_sin_balon_video || '',
          rivalSinBalonDoc: matchReport.rival_sin_balon_doc || '',
          rivalAbpText: matchReport.rival_abp_text || '',
          rivalAbpVideo: matchReport.rival_abp_video || '',
          rivalAbpDoc: matchReport.rival_abp_doc || '',
          planVideoUrl: matchReport.plan_video_url || '',
          planDocUrl: matchReport.plan_doc_url || '',
          planConBalonText: matchReport.plan_con_balon_text || '',
          planConBalonVideo: matchReport.plan_con_balon_video || '',
          planConBalonDoc: matchReport.plan_con_balon_doc || '',
          planSinBalonText: matchReport.plan_sin_balon_text || '',
          planSinBalonVideo: matchReport.plan_sin_balon_video || '',
          planSinBalonDoc: matchReport.plan_sin_balon_doc || '',
          planAbpText: matchReport.plan_abp_text || '',
          planAbpVideo: matchReport.plan_abp_video || '',
          planAbpDoc: matchReport.plan_abp_doc || '',
          videoEvents: matchReport.video_events || [],
        };

        // Set video URL based on share type (default to main video)
        const url = report.videoUrl || report.rivalVideoUrl || report.planVideoUrl;
        setVideoUrl(url);
        setStartTimestamp(shareToken.start_timestamp ?? undefined);

        // Fetch match data for metadata
        try {
          const { data: matchData } = await fetch(`/api/matches/${matchReport.match_id}`)
            .then(r => r.json())
            .catch(() => ({ data: null }));

          if (matchData) {
            setMatchData(matchData);
          }
        } catch (err) {
          console.error('Error fetching match data:', err);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading shared video:', err);
        setError('Error al cargar el vídeo compartido');
        setLoading(false);
      }
    }

    loadSharedVideo();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <i className="fa-solid fa-spinner fa-spin text-4xl text-sport-primary"></i>
          </div>
          <p className="text-white font-bold">Cargando vídeo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-600 mb-4"></i>
          <h1 className="text-red-900 font-black text-xl uppercase tracking-tight mb-2">
            Enlace no válido
          </h1>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-50 border-2 border-slate-200 rounded-3xl p-8 text-center">
          <i className="fa-solid fa-video-slash text-4xl text-slate-400 mb-4"></i>
          <h1 className="text-slate-900 font-black text-xl uppercase tracking-tight mb-2">
            Vídeo no disponible
          </h1>
          <p className="text-slate-600 text-sm">El vídeo de este partido no está disponible.</p>
        </div>
      </div>
    );
  }

  const embedUrl = getEmbedUrl(videoUrl, startTimestamp);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-white font-black text-2xl sm:text-3xl uppercase tracking-tighter flex items-center gap-3">
            <i className="fa-solid fa-video text-sport-primary"></i>
            Vídeo compartido
          </h1>
        </div>

        {/* Video Container */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl mb-6">
          <div className="relative aspect-video overflow-hidden bg-slate-900">
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-2xl border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vídeo compartido del partido"
            />
          </div>
        </div>

        {/* Match Info (if available) */}
        {matchData && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h2 className="text-white font-black text-lg uppercase tracking-tight mb-4">
              Información del partido
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-white/90">
              {matchData.opponent && (
                <div>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">
                    Rival
                  </p>
                  <p className="text-sm font-semibold">{matchData.opponent}</p>
                </div>
              )}
              {matchData.date && (
                <div>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">
                    Fecha
                  </p>
                  <p className="text-sm font-semibold">
                    {new Date(matchData.date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {matchData.competition && (
                <div>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">
                    Competición
                  </p>
                  <p className="text-sm font-semibold">{matchData.competition}</p>
                </div>
              )}
              {matchData.jornada && (
                <div>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">
                    Jornada
                  </p>
                  <p className="text-sm font-semibold">{matchData.jornada}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-6 text-center text-white/60 text-xs font-bold uppercase tracking-widest">
          <p>Este vídeo ha sido compartido de forma privada</p>
        </div>
      </div>
    </div>
  );
};

export default PublicShareView;
