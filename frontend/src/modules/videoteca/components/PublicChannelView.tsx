import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getChannelByToken } from '@shared/services/shareService';
import { supabase } from '@shared/services/supabaseClient';
import type { Match, MatchReport } from '@modules/partidos';

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

const PublicChannelView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [club, setClub] = useState<any | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchReportsById, setMatchReportsById] = useState<Map<string, MatchReport>>(new Map());
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [competitionFilter, setCompetitionFilter] = useState<string>('ALL');

  const ALL_FILTER = 'ALL';

  useEffect(() => {
    async function loadPublicChannel() {
      if (!token) {
        setError('Token inválido');
        setLoading(false);
        return;
      }

      try {
        const result = await getChannelByToken(token);
        if (!result) {
          setError('El enlace compartido no es válido o ha expirado');
          setLoading(false);
          return;
        }

        const { club: clubData } = result;
        setClub(clubData);

        // Load matches for this club
        const { data: matchesData, error: matchesError } = await supabase
          .from('calendar')
          .select('*')
          .eq('club_id', clubData.id)
          .order('date', { ascending: false });

        if (matchesError) throw matchesError;
        setMatches(matchesData || []);

        // Load match reports
        const { data: reportsData, error: reportsError } = await supabase
          .from('match_reports')
          .select('*');

        if (reportsError) throw reportsError;

        const map = new Map<string, MatchReport>();
        (reportsData || []).forEach((report: MatchReport) => {
          map.set(String(report.match_id), report);
        });
        setMatchReportsById(map);

        setLoading(false);
      } catch (err) {
        console.error('Error loading public channel:', err);
        setError('Error al cargar el canal');
        setLoading(false);
      }
    }

    loadPublicChannel();
  }, [token]);

  const matchVideos = useMemo<MatchVideoItem[]>(() => {
    return (matches || [])
      .map((match): MatchVideoItem | null => {
        const report = matchReportsById.get(String(match.id));
        if (!report?.video_url) return null;
        const goalsFavor = (report.match_goals || []).filter((g: any) => g.side === 'FAVOR').length;
        const goalsContra = (report.match_goals || []).filter((g: any) => g.side === 'CONTRA').length;
        const ocasionesCount = (report.video_events || []).filter((e: any) => e.type === 'OCASION').length;
        const rival = match.opponent || match.visitor_team || match.local_team || 'Rival';
        return {
          matchId: String(match.id),
          title: `vs ${rival}${match.jornada ? ` (Jornada ${match.jornada})` : ''}`,
          competition: match.competition || '-',
          date: match.date ? new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
          vimeoUrl: report.video_url,
          goalsFavor,
          goalsContra,
          ocasionesCount,
        };
      })
      .filter((v): v is MatchVideoItem => v !== null)
      .sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime());
  }, [matches, matchReportsById]);

  const competitions = useMemo(() => {
    const unique = new Set(matchVideos.map(v => v.competition));
    return [ALL_FILTER, ...Array.from(unique)];
  }, [matchVideos]);

  const filteredVideos = useMemo(() => {
    if (competitionFilter === ALL_FILTER) return matchVideos;
    return matchVideos.filter(v => v.competition === competitionFilter);
  }, [matchVideos, competitionFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <i className="fa-solid fa-spinner fa-spin text-4xl text-sport-primary"></i>
          </div>
          <p className="text-white font-bold">Cargando canal...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {club?.escudo_url && (
              <img src={club.escudo_url} alt={club.nombre} className="h-12 w-12 rounded-lg" />
            )}
            <div>
              <h1 className="text-white font-black text-2xl sm:text-3xl uppercase tracking-tighter flex items-center gap-3">
                <i className="fa-solid fa-video text-sport-primary"></i>
                Videoteca
              </h1>
              <p className="text-white/60 text-sm mt-1">{club?.nombre}</p>
            </div>
          </div>
        </div>

        {/* Video Display */}
        {selectedVideoUrl && (
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl mb-8">
            <div className="relative aspect-video overflow-hidden bg-slate-900">
              <iframe
                src={getEmbedUrl(selectedVideoUrl)}
                className="w-full h-full rounded-2xl border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Vídeo del partido"
              />
            </div>
          </div>
        )}

        {/* Filter */}
        {competitions.length > 1 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {competitions.map(comp => (
                <button
                  key={comp}
                  onClick={() => setCompetitionFilter(comp)}
                  className={`px-4 py-2 rounded-full font-bold uppercase text-xs transition-all ${
                    competitionFilter === comp
                      ? 'bg-sport-primary text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {comp === ALL_FILTER ? 'Todos' : comp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Videos Grid */}
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map(video => (
              <button
                key={video.matchId}
                onClick={() => setSelectedVideoUrl(video.vimeoUrl)}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden hover:bg-white/20 transition-all text-left group"
              >
                <div className="relative aspect-video bg-slate-800 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sport-primary/30 to-transparent group-hover:from-sport-primary/50 transition-all">
                    <i className="fa-solid fa-play text-white text-3xl opacity-70 group-hover:opacity-100 transition-opacity"></i>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">{video.title}</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-white/70 mb-3">
                    <div>
                      <p className="text-white/50 text-xs mb-1">Fecha</p>
                      <p className="font-semibold text-white">{video.date}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs mb-1">Competición</p>
                      <p className="font-semibold text-white text-xs">{video.competition}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-200 px-2 py-1 rounded-full">
                      <i className="fa-solid fa-futbol"></i> {video.goalsFavor}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-200 px-2 py-1 rounded-full">
                      <i className="fa-solid fa-futbol"></i> {video.goalsContra}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded-full">
                      <i className="fa-solid fa-star"></i> {video.ocasionesCount}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center">
            <i className="fa-solid fa-video-slash text-4xl text-white/40 mb-4"></i>
            <p className="text-white/60">No hay vídeos disponibles</p>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 text-center text-white/50 text-xs font-bold uppercase tracking-widest">
          <p>Canal compartido de forma privada</p>
        </div>
      </div>
    </div>
  );
};

export default PublicChannelView;
