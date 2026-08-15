import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Match, MatchReport } from '@modules/partidos';
import { db } from '@shared/services/dataService';
import SearchableSelect from '@shared/components/SearchableSelect';
import ShareButton from '@modules/partidos/components/ShareButton';

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
const getEmbedUrl = (url: string): string => {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (vimeoMatch) {
    const hash = vimeoMatch[2];
    return `https://player.vimeo.com/video/${vimeoMatch[1]}${hash ? `?h=${hash}` : ''}`;
  }
  return url;
};

const ALL_FILTER = 'ALL';

const Videoteca: React.FC<VideotecaProps> = ({ matches = [] }) => {
  const navigate = useNavigate();
  const [matchReportsById, setMatchReportsById] = useState<Map<string, MatchReport>>(new Map());
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [competitionFilter, setCompetitionFilter] = useState<string>(ALL_FILTER);

  // El vídeo completo, los goles a favor/contra y las ocasiones de cada partido vienen
  // del informe de partido (match_reports), no del propio Match.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await db.match_reports.get();
        const map = new Map<string, MatchReport>();
        (data || []).forEach((report: MatchReport) => map.set(String(report.id), report));
        setMatchReportsById(map);
      } catch (err) {
        console.error('Error al cargar los informes de partido:', err);
      }
    })();
  }, []);

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

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-sport-primary font-black text-2xl uppercase tracking-tighter">Videoteca Oficial</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Vídeos completos de los partidos</p>
        </div>
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

      {filteredVideos.length === 0 ? (
        <div className="py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-60">
          <i className="fa-solid fa-video-slash text-4xl mb-4 text-slate-300"></i>
          <p className="font-black text-sm uppercase tracking-widest text-slate-400">No hay vídeos de partidos disponibles</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Añade un vídeo en el informe de un partido para que aparezca aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVideos.map((video) => (
            <div key={video.matchId} className="group bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all">
              <div className="relative aspect-video overflow-hidden bg-slate-900">
                <button
                  onClick={() => setVideoModalUrl(video.vimeoUrl)}
                  className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center"
                  title="Ver vídeo completo"
                >
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white text-xl group-hover:scale-125 transition-transform border border-white/30">
                    <i className="fa-solid fa-play ml-1"></i>
                  </div>
                </button>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg bg-red-600 text-white">
                    PARTIDO
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h4 className="text-slate-800 font-black text-sm uppercase leading-tight mb-2 group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                  {video.title}
                </h4>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                  <i className="fa-regular fa-calendar mr-2"></i>
                  {video.date} · {video.competition}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Goles F: {video.goalsFavor}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-700 border border-red-200">
                    Goles C: {video.goalsContra}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                    Ocasiones: {video.ocasionesCount}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigate(`/partidos/${video.matchId}`)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all"
                  >
                    Ver informe completo
                  </button>
                  <ShareButton
                    matchReportId={video.matchId}
                    size="md"
                  />
                </div>
              </div>
            </div>
          ))}
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
              src={getEmbedUrl(videoModalUrl)}
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
