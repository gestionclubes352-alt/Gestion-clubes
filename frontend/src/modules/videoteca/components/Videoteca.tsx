import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoItem, DetectionEvent, DetectionType } from '../types';

declare global {
  interface Window {
    Vimeo?: {
      Player: new (element: HTMLElement, options: { id: string; autopause?: boolean; autoplay?: boolean; muted?: boolean; }) => any;
    };
  }
}

const Videoteca: React.FC = () => {
  const { t } = useTranslation();
  const initialVideos: VideoItem[] = [
    { id: 1, title: "Resumen: DEMO vs SD Leioa (Jornada 20)", category: 'PARTIDO', duration: "12:45", date: "18/05/2024", thumbnail: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800" },
    { id: 2, title: "Sesión Técnica: Salida de Balón 4-3-3", category: 'ENTRENAMIENTO', duration: "45:20", date: "20/05/2024", thumbnail: "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=800" },
    { id: 3, title: "Análisis: Balón Parado Defensivo", category: 'TACTICA', duration: "08:15", date: "15/05/2024", thumbnail: "https://images.unsplash.com/photo-1518604666860-9ed391f76460?q=80&w=800" },
    { id: 4, title: "Goles del mes: Mayo 2024", category: 'PARTIDO', duration: "05:30", date: "01/06/2024", thumbnail: "https://images.unsplash.com/photo-1560272564-c83d66b1ad12?q=80&w=800" },
  ];

  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoCategory, setNewVideoCategory] = useState<VideoItem['category']>('PARTIDO');
  const [newVideoDuration, setNewVideoDuration] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [analysisVideoUrl, setAnalysisVideoUrl] = useState('');
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerTitle, setPlayerTitle] = useState('');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [eventFilter, setEventFilter] = useState<DetectionType | 'TODOS'>('TODOS');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const sampleEvents = useMemo<DetectionEvent[]>(() => ([
    { id: 'ev-1', minute: '03:12', type: 'OCASION', note: 'Remate tras centro desde banda derecha', confidence: 0.78, actions: ['Centro lateral', 'Remate de cabeza'] },
    { id: 'ev-2', minute: '05:01', startAt: '05:00', type: 'CORNER', note: 'Saque en corto y centro al primer palo', confidence: 0.80, actions: ['Saque de esquina', 'Centro', 'Despeje'] },
    { id: 'ev-3', minute: '07:45', type: 'GOL', note: 'Finalización en el área pequeña', confidence: 0.92, actions: ['Robo alto', 'Pase filtrado', 'Definición'] },
    { id: 'ev-4', minute: '09:18', startAt: '09:18', type: 'CORNER', note: 'Saque directo al área y remate', confidence: 0.76, actions: ['Saque de esquina', 'Remate'] },
    { id: 'ev-5', minute: '10:08', type: 'OCASION', note: 'Disparo lejano detenido por el portero', confidence: 0.74, actions: ['Conducción', 'Disparo lejano'] },
    { id: 'ev-6', minute: '11:32', type: 'GOL', note: 'Contraataque y definición cruzada', confidence: 0.89, actions: ['Contraataque', 'Pase al espacio', 'Definición cruzada'] },
  ]), []);

  const handleAnalyze = (title?: string, urlOverride?: string) => {
    setIsAnalyzing(true);
    setSelectedTitle(title || (vimeoUrl ? 'Vimeo' : 'Vídeo'));
    const nextUrl = (urlOverride || vimeoUrl).trim();
    setAnalysisVideoUrl(nextUrl);
    setActiveVideoUrl(nextUrl);
    setActiveEventId(null);
    setEvents([]);
    setTimeout(() => {
      setEvents(sampleEvents);
      if (sampleEvents.length > 0 && nextUrl) {
        const firstCorner = sampleEvents.find(e => e.type === 'CORNER');
        const firstEvent = firstCorner || sampleEvents[0];
        setActiveEventId(firstEvent.id);
        openPlayer(nextUrl, title || 'Vimeo', firstEvent.startAt || firstEvent.minute);
      }
      setIsAnalyzing(false);
    }, 900);
  };

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'TODOS') return events;
    return events.filter(e => e.type === eventFilter);
  }, [events, eventFilter]);

  const getSecondsFromMinute = (minute: string) => {
    const parts = minute.split(':').map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p))) return 0;
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    return 0;
  };

  const buildVimeoTimestampUrl = (url: string, minute: string) => {
    if (!url) return '';
    const seconds = getSecondsFromMinute(minute);
    if (!seconds) return url;
    const urlNoHash = url.split('#')[0];
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${urlNoHash}#t=${minutes}m${secs}s`;
  };

  const extractVimeoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  };

  const ensurePlayer = async (id: string) => {
    if (!playerContainerRef.current || !window.Vimeo?.Player) return false;
    if (!playerRef.current) {
      playerRef.current = new window.Vimeo.Player(playerContainerRef.current, {
        id,
        autoplay: false,
        autopause: true,
        muted: false
      });
      await playerRef.current.ready();
      setPlayerReady(true);
    }
    return true;
  };

  const openPlayer = async (url: string, title: string, minute?: string) => {
    const id = extractVimeoId(url);
    if (!id) {
      window.open(buildVimeoTimestampUrl(url, minute || '00:00'), '_blank');
      return;
    }
    setPlayerTitle(title);
    setActiveVideoId(id);
    setActiveVideoUrl(url);
    const seconds = getSecondsFromMinute(minute || '00:00');
    const ok = await ensurePlayer(id);
    if (!ok || !playerRef.current) {
      window.open(buildVimeoTimestampUrl(url, minute || '00:00'), '_blank');
      return;
    }
    try {
      await playerRef.current.loadVideo(id);
      await playerRef.current.setCurrentTime(seconds);
      await playerRef.current.play();
    } catch (err) {
      console.error('Vimeo player error', err);
      window.open(buildVimeoTimestampUrl(url, minute || '00:00'), '_blank');
    }
  };

  useEffect(() => {
    if (!analysisVideoUrl) return;
    const id = extractVimeoId(analysisVideoUrl);
    if (!id) return;

    const setupPlayer = () => {
      if (!playerContainerRef.current || !window.Vimeo?.Player) return;
      if (playerRef.current) return;
      playerRef.current = new window.Vimeo.Player(playerContainerRef.current, {
        id,
        autoplay: false,
        autopause: true,
        muted: false
      });
      playerRef.current.ready().then(() => setPlayerReady(true));
    };

    if (!window.Vimeo?.Player) {
      const existingScript = document.querySelector('script[data-vimeo-player="true"]');
      if (existingScript) return;
      const script = document.createElement('script');
      script.src = 'https://player.vimeo.com/api/player.js';
      script.async = true;
      script.dataset.vimeoPlayer = 'true';
      script.onload = setupPlayer;
      document.body.appendChild(script);
    } else {
      setupPlayer();
    }
  }, [analysisVideoUrl]);

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  };

  const handleAddVideo = () => {
    const trimmedUrl = newVideoUrl.trim();
    if (!trimmedUrl) {
      alert(t('videos.pasteUrlAlert'));
      return;
    }
    const title = newVideoTitle.trim() || 'Video de Vimeo';
    const duration = newVideoDuration.trim() || '--:--';
    const newVideo: VideoItem = {
      id: crypto.randomUUID(),
      title,
      category: newVideoCategory,
      duration,
      date: formatDate(new Date()),
      thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800',
      vimeoUrl: trimmedUrl
    };
    setVideos(prev => [newVideo, ...prev]);
    setNewVideoTitle('');
    setNewVideoCategory('PARTIDO');
    setNewVideoDuration('');
    setNewVideoUrl('');
  };

  const handleDeleteVideo = (id: number | string) => {
    if (!window.confirm(t('videos.deleteConfirm'))) return;
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-sport-primary font-black text-2xl uppercase tracking-tighter">{t('videos.officialTitle')}</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{t('videos.subtitle')}</p>
        </div>
        <button
          onClick={handleAddVideo}
          className="w-full sm:w-auto bg-sport-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sport-primary-dark transition-all shadow-lg shadow-red-900/10"
        >
          <i className="fa-solid fa-cloud-arrow-up"></i>
          {t('videos.uploadVideo')}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[28px] p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h4 className="text-slate-900 font-black text-sm uppercase tracking-widest">{t('videos.addVimeo')}</h4>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{t('videos.addVimeoDesc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder={t('videos.titleOptional')}
            value={newVideoTitle}
            onChange={(e) => setNewVideoTitle(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <input
            type="text"
            placeholder={t('videos.durationExample')}
            value={newVideoDuration}
            onChange={(e) => setNewVideoDuration(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <select
            value={newVideoCategory}
            onChange={(e) => setNewVideoCategory(e.target.value as VideoItem['category'])}
            className="px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          >
            <option value="PARTIDO">{t('videos.categoryMatch')}</option>
            <option value="ENTRENAMIENTO">{t('videos.categoryTraining')}</option>
            <option value="TACTICA">{t('videos.categoryTactics')}</option>
          </select>
          <input
            type="url"
            placeholder={t('videos.vimeoUrl')}
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[28px] p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h4 className="text-slate-900 font-black text-sm uppercase tracking-widest">{t('videos.detectionAssistant')}</h4>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
              {t('videos.detectionDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              {t('videos.demo')}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="url"
            placeholder={t('videos.pasteVimeoUrl')}
            value={vimeoUrl}
            onChange={(e) => setVimeoUrl(e.target.value)}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <button
            onClick={() => handleAnalyze()}
            className="px-6 py-3 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            {isAnalyzing ? t('videos.analyzing') : t('videos.detectGoals')}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t('videos.aiResults')} {selectedTitle ? `• ${selectedTitle}` : ''}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {filteredEvents.length} {t('videos.events')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['TODOS', 'GOL', 'OCASION', 'CORNER'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setEventFilter(opt)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                  eventFilter === opt
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-red-600 hover:border-red-300'
                }`}
              >
                {opt === 'CORNER' ? t('videos.cornerKick') : opt === 'OCASION' ? t('videos.chance') : opt === 'TODOS' ? t('calendarView.allTypes') : opt}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {isAnalyzing && (
              <div className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                {t('videos.analyzingVideo')}
              </div>
            )}

            {!isAnalyzing && filteredEvents.length === 0 && (
              <div className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest">
                {t('videos.noDetections')}
              </div>
            )}

            {!isAnalyzing && filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 rounded-2xl border transition-all ${
                  activeEventId === event.id
                    ? 'border-red-200 bg-red-50/60'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    event.type === 'GOL'
                      ? 'bg-red-600 text-white'
                      : event.type === 'CORNER'
                        ? 'bg-orange-500 text-white'
                        : 'bg-red-100 text-red-700'
                  }`}>
                    {event.type === 'CORNER' ? t('videos.cornerKick') : event.type === 'OCASION' ? t('videos.chance') : event.type}
                  </span>
                  <span className="text-[11px] font-black text-slate-900">{event.minute}</span>
                  <span className="text-[11px] font-bold text-slate-500">{event.note}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {Math.round(event.confidence * 100)}%
                  </span>
                  {analysisVideoUrl && (
                    <button
                      onClick={() => {
                        const startAt = event.startAt || event.minute;
                        setActiveEventId(event.id);
                        openPlayer(analysisVideoUrl, selectedTitle || 'Vimeo', startAt);
                      }}
                      className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all"
                    >
                      {t('videos.viewClip')}
                    </button>
                  )}
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('videos.actionsLabel')}</span>
                  {event.actions.map((action) => (
                    <span
                      key={`${event.id}-${action}`}
                      className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {analysisVideoUrl && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('videos.embeddedPreview')}</p>
              {playerTitle && (
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{playerTitle}</p>
              )}
            </div>
            <div className="relative w-full max-w-3xl aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200">
              <div ref={playerContainerRef} className="absolute inset-0"></div>
              {!playerReady && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                  {t('videos.loadingPlayer')}
                </div>
              )}
              {playerReady && !activeVideoId && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                  {t('videos.selectEvent')}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => {
                  if (analysisVideoUrl) {
                    openPlayer(analysisVideoUrl, selectedTitle || 'Vimeo');
                  }
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:text-red-600 hover:border-red-300 transition-all"
              >
                {t('videos.viewFullVideo')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {videos.map((video) => (
          <div key={video.id} className="group bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all">
            <div className="relative aspect-video overflow-hidden">
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              {video.vimeoUrl && (
                <div className="absolute bottom-4 left-4 bg-white/90 text-slate-800 text-[9px] font-black px-2 py-1 rounded-lg">
                  Vimeo
                </div>
              )}
              <button
                onClick={() => {
                  if (video.vimeoUrl) {
                    openPlayer(video.vimeoUrl, video.title);
                  }
                }}
                className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center"
                title={video.vimeoUrl ? t('videos.viewVideo') : t('videos.noVimeoUrl')}
              >
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white text-xl group-hover:scale-125 transition-transform border border-white/30">
                  <i className="fa-solid fa-play ml-1"></i>
                </div>
              </button>
              <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-lg">
                {video.duration}
              </div>
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg ${
                  video.category === 'PARTIDO' ? 'bg-red-600 text-white' :
                  video.category === 'ENTRENAMIENTO' ? 'bg-red-600 text-white' :
                  'bg-orange-600 text-white'
                }`}>
                  {video.category === 'PARTIDO' ? t('videos.categoryMatch') : video.category === 'ENTRENAMIENTO' ? t('videos.categoryTraining') : t('videos.categoryTactics')}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video.id); }}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 text-red-600 flex items-center justify-center shadow-md hover:bg-red-600 hover:text-white transition-all"
                title={t('videos.deleteVideo')}
              >
                <i className="fa-regular fa-trash-can"></i>
              </button>
            </div>
            <div className="p-6">
              <h4 className="text-slate-800 font-black text-sm uppercase leading-tight mb-2 group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                {video.title}
              </h4>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <i className="fa-regular fa-calendar mr-2"></i>
                {video.date}
              </p>
              <div className="mt-4">
                <button
                  onClick={() => handleAnalyze(video.title, video.vimeoUrl)}
                  className="w-full px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                >
                  {t('videos.analyzeThis')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Videoteca;
