import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Player } from '@modules/plantilla';
import type { TacticalPosition } from '@modules/tactica';
import type { CalendarEvent } from '@modules/calendario';
import type { MatchReport, VideoEvent } from '../types';
import { db, equiposRivalesService, jugadoresRivalesService } from '@shared/services/dataService';
import type { EquipoRival, JugadorRival } from '@shared/services/dataService';
import { SQUAD } from '@shared/constants';
import { TacticalBoard } from '@modules/tactica';
import ActaPartidoView from './ActaPartidoView';
import { uploadVideoToYouTube, validateVideoFile, formatFileSize, type YouTubeUploadProgress } from '@shared/services/youtubeUploadService';
import { authService } from '@shared/services/authService';
import { useTranslation } from 'react-i18next';

interface MatchReportViewProps {
  match: CalendarEvent;
  onBack: () => void;
}

const getInitialPositions = (formation: string): TacticalPosition[] => {
  const defaults: Record<string, TacticalPosition[]> = {
    '4-3-3': [
      { id: 'GK', x: 50, y: 92, label: 'POR' },
      { id: 'LD', x: 94, y: 72, label: 'LD' },
      { id: 'CD1', x: 66, y: 72, label: 'DFC' },
      { id: 'CD2', x: 34, y: 72, label: 'DFC' },
      { id: 'LI', x: 6, y: 72, label: 'LI' },
      { id: 'MC', x: 50, y: 62, label: 'MC' },
      { id: 'MCO1', x: 75, y: 52, label: 'MCO' },
      { id: 'MCO2', x: 25, y: 52, label: 'MCO' },
      { id: 'ED', x: 92, y: 30, label: 'ED' },
      { id: 'DC', x: 50, y: 22, label: 'DC' },
      { id: 'EI', x: 8, y: 30, label: 'EI' },
    ],
    '4-4-2': [
      { id: 'GK', x: 50, y: 92, label: 'POR' },
      { id: 'LD', x: 94, y: 72, label: 'LD' },
      { id: 'CD1', x: 66, y: 72, label: 'DFC' },
      { id: 'CD2', x: 34, y: 72, label: 'DFC' },
      { id: 'LI', x: 6, y: 72, label: 'LI' },
      { id: 'MD', x: 92, y: 48, label: 'MD' },
      { id: 'MC1', x: 60, y: 55, label: 'MC' },
      { id: 'MC2', x: 40, y: 55, label: 'MC' },
      { id: 'MI', x: 8, y: 48, label: 'MI' },
      { id: 'DC1', x: 65, y: 25, label: 'DC' },
      { id: 'DC2', x: 35, y: 25, label: 'DC' },
    ],
    '4-2-3-1': [
      { id: 'GK', x: 50, y: 92, label: 'POR' },
      { id: 'LD', x: 94, y: 72, label: 'LD' },
      { id: 'CD1', x: 66, y: 72, label: 'DFC' },
      { id: 'CD2', x: 34, y: 72, label: 'DFC' },
      { id: 'LI', x: 6, y: 72, label: 'LI' },
      { id: 'MCD1', x: 62, y: 65, label: 'MCD' },
      { id: 'MCD2', x: 38, y: 65, label: 'MCD' },
      { id: 'MD', x: 92, y: 42, label: 'MD' },
      { id: 'MCO', x: 50, y: 45, label: 'MCO' },
      { id: 'MI', x: 8, y: 42, label: 'MI' },
      { id: 'DC', x: 50, y: 22, label: 'DC' },
    ],
    '5-3-2': [
      { id: 'GK', x: 50, y: 92, label: 'POR' },
      { id: 'CAD', x: 94, y: 65, label: 'CAD' },
      { id: 'CD1', x: 75, y: 82, label: 'DFC' },
      { id: 'CD2', x: 50, y: 85, label: 'DFC' },
      { id: 'CD3', x: 25, y: 82, label: 'DFC' },
      { id: 'CAI', x: 6, y: 65, label: 'CAI' },
      { id: 'MC1', x: 65, y: 52, label: 'MC' },
      { id: 'MC2', x: 50, y: 56, label: 'MC' },
      { id: 'MC3', x: 35, y: 52, label: 'MC' },
      { id: 'DC1', x: 65, y: 25, label: 'DC' },
      { id: 'DC2', x: 35, y: 25, label: 'DC' },
    ]
  };
  return defaults[formation] || defaults['4-3-3'];
};

const timeToSeconds = (time: string): number => {
  if (!time || !time.includes(':')) return parseInt(time) * 60 || 0;
  const [min, sec] = time.split(':').map(Number);
  return (min * 60) + (sec || 0);
};

const formatSeconds = (totalSeconds: number): string => {
  const min = Math.floor(totalSeconds / 60);
  const sec = Math.floor(totalSeconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const formatHMS = (totalSeconds: number): string => {
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  const sec = Math.floor(totalSeconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const isBlockedEmbed = (url: string) => {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('veo.co');
  } catch {
    return url.includes('veo.co');
  }
};

const getEmbedUrl = (url: string, startSeconds?: number) => {
  if (!url) return '';
  let videoId = '';
  let hash = '';
  let baseUrl = '';

  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    videoId = ytMatch[1];
    baseUrl = `https://www.youtube.com/embed/${videoId}`;
  } else {
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (vimeoMatch) {
        videoId = vimeoMatch[1];
        hash = vimeoMatch[2];
        baseUrl = `https://player.vimeo.com/video/${videoId}`;
        if (hash) {
          baseUrl += `?h=${hash}`;
        }
    } else {
        return url;
    }
  }

  const origin = window.location.origin;
  const params: string[] = [
    'autoplay=1',
    'enablejsapi=1',
    'api=1',
    `origin=${origin}`
  ];
  
  if (startSeconds !== undefined) {
    if (baseUrl.includes('youtube')) params.push(`start=${startSeconds}`);
    if (baseUrl.includes('vimeo')) params.push(`t=${startSeconds}s`);
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params.join('&')}`;
};

const MatchReportView: React.FC<MatchReportViewProps> = ({ match, onBack }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('INFORME RIVAL');
  const [isSaving, setIsSaving] = useState(false);
  const [squad, setSquad] = useState<Player[]>(SQUAD);
  
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isLinked, setIsLinked] = useState(false);
  const [isManualPlay, setIsManualPlay] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pollInterval = useRef<any>(null);
  const manualTicker = useRef<any>(null);
  const stopTimeoutRef = useRef<any>(null);

  const [currentNote, setCurrentNote] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [playerFilter, setPlayerFilter] = useState<string | number | 'ALL'>('ALL');
  const [showMatchTimes, setShowMatchTimes] = useState(true);
  const [sharedStartSec, setSharedStartSec] = useState<number | null>(null);
  const sharedStartRef = useRef<number | null>(null);
  
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ minute: string; note: string; playerId: string | number | ''; goalSide: 'FAVOR' | 'CONTRA' | '' }>({ minute: '', note: '', playerId: '', goalSide: '' });
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | number | ''>('');
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalSideSelection, setGoalSideSelection] = useState<'FAVOR' | 'CONTRA' | ''>('');
  const [goalPlayerSelection, setGoalPlayerSelection] = useState<string | number | ''>('');
  const [isDuelDialogOpen, setIsDuelDialogOpen] = useState(false);
  const [duelPlayerSelection, setDuelPlayerSelection] = useState<string | number | ''>('');
  const [abpPreviewImage, setAbpPreviewImage] = useState<string | null>(null);

  const [expandedMediaBlock, setExpandedMediaBlock] = useState<string | null>(null);

  // Plantilla rival (scouting) para el Informe de Rival
  const [rivalTeams, setRivalTeams] = useState<EquipoRival[]>([]);
  const [selectedRivalTeamId, setSelectedRivalTeamId] = useState('');
  const [rivalRoster, setRivalRoster] = useState<JugadorRival[]>([]);

  const samePlayerId = (a?: string | number, b?: string | number) => String(a) === String(b);

  // YouTube upload state
  const [ytUploadProgress, setYtUploadProgress] = useState<YouTubeUploadProgress | null>(null);
  const [ytSelectedFile, setYtSelectedFile] = useState<File | null>(null);
  const ytAbortRef = useRef<AbortController | null>(null);
  const ytFileInputRef = useRef<HTMLInputElement>(null);

  const [report, setReport] = useState<MatchReport>({
    id: match.id,
    generalNotes: '',
    videoUrl: '',
    docUrl: '',
    conBalonText: '',
    conBalonVideo: '',
    conBalonDoc: '',
    sinBalonText: '',
    sinBalonVideo: '',
    sinBalonDoc: '',
    abpText: '',
    abpVideo: '',
    abpDoc: '',
    abpOffCornerText: '',
    abpOffCorner2Text: '',
    abpOffCorner3Text: '',
    abpOffCorner4Text: '',
    abpOffLateralText: '',
    abpOffLateral2Text: '',
    abpOffFrontalText: '',
    abpDefCorner1Text: '',
    abpDefCorner2Text: '',
    abpDefLateralText: '',
    abpDefFrontalText: '',
    abpOffCornerImage: '',
    abpOffCorner2Image: '',
    abpOffCorner3Image: '',
    abpOffCorner4Image: '',
    abpOffLateralImage: '',
    abpOffLateral2Image: '',
    abpOffFrontalImage: '',
    abpDefCorner1Image: '',
    abpDefCorner2Image: '',
    abpDefLateralImage: '',
    abpDefFrontalImage: '',
    abpOffCornerVideo: '',
    abpOffCorner2Video: '',
    abpOffCorner3Video: '',
    abpOffCorner4Video: '',
    abpOffLateralVideo: '',
    abpOffLateral2Video: '',
    abpOffFrontalVideo: '',
    abpDefCorner1Video: '',
    abpDefCorner2Video: '',
    abpDefLateralVideo: '',
    abpDefFrontalVideo: '',
    formation: '4-3-3',
    lineupPositions: [],
    substituteIds: [],
    videoEvents: [],
    firstHalfStart: '',
    firstHalfEnd: '',
    secondHalfStart: '',
    secondHalfEnd: ''
  });

  const filteredEvents = useMemo(() => {
    const events = report.videoEvents || [];
    const byType = eventFilter === 'ALL' ? events : events.filter(e => e.type === eventFilter);
    if (playerFilter === 'ALL') return byType;
    return byType.filter(e => samePlayerId(e.playerId, playerFilter));
  }, [report.videoEvents, eventFilter, playerFilter]);

  const activeLineupPlayers = useMemo(() => {
    const positions = report.lineupPositions || [];
    const ids = positions
      .flatMap(pos => pos.playerIds || [])
      .filter((id): id is number => typeof id === 'number');
    const uniqueIds = Array.from(new Set(ids));
    return uniqueIds.map(id => squad.find(p => samePlayerId(p.id, id))).filter(Boolean) as Player[];
  }, [report.lineupPositions, squad]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [{ data: reportsData }, { data: playersData }] = await Promise.all([
          db.match_reports.get(),
          db.players.get()
        ]);
        if (playersData && playersData.length > 0) {
          const merged = new Map<number, Player>();
          SQUAD.forEach(p => merged.set(p.id, p));
          playersData.forEach(p => merged.set(p.id, p));
          setSquad(Array.from(merged.values()));
        } else {
          await Promise.all(SQUAD.map(p => db.players.upsert(p)));
          setSquad(SQUAD);
        }
        const existing = reportsData?.find((r: any) => String(r.id) === String(match.id));
        if (existing) {
            const formation = existing.formation || '4-3-3';
            const positions = existing.lineupPositions && existing.lineupPositions.length > 0 
                ? existing.lineupPositions 
                : getInitialPositions(formation);
            
            setReport({ ...report, ...existing, formation, lineupPositions: positions });
        } else {
             setReport(prev => ({ ...prev, lineupPositions: getInitialPositions('4-3-3') }));
        }
      } catch (e) {}
    };
    loadData();
  }, [match.id]);

  useEffect(() => {
    (async () => {
      try {
        const rows = await equiposRivalesService.list();
        setRivalTeams(rows.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      } catch (err) {
        console.error('No se pudieron cargar los equipos rivales', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedRivalTeamId || !match.opponent || rivalTeams.length === 0) return;
    const normalize = (v: string) => v.trim().toLowerCase();
    const match_ = rivalTeams.find(rt => normalize(rt.nombre) === normalize(match.opponent || ''));
    if (match_) setSelectedRivalTeamId(match_.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rivalTeams, match.opponent]);

  useEffect(() => {
    if (!selectedRivalTeamId) { setRivalRoster([]); return; }
    (async () => {
      try {
        const rows = await jugadoresRivalesService.list({ equipo_rival_id: selectedRivalTeamId });
        setRivalRoster(rows.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)));
      } catch (err) {
        console.error('No se pudo cargar la plantilla rival', err);
      }
    })();
  }, [selectedRivalTeamId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let data: any = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { return; }
      }
      const minStart = sharedStartRef.current;
      if (event.origin.includes('youtube.com')) {
        if (data.event === 'infoDelivery' && data.info && data.info.currentTime !== undefined) {
          const nextSec = Math.floor(data.info.currentTime);
          if (minStart !== null && nextSec < minStart - 1) {
            playVideoAt(minStart);
            return;
          }
          setCurrentTimeSec(minStart !== null ? Math.max(nextSec, minStart) : nextSec);
          setIsLinked(true);
          setIsManualPlay(false);
        }
      }
      if (event.origin.includes('vimeo.com')) {
        if (data.event === 'timeupdate' || data.method === 'getCurrentTime') {
          const seconds = data.data?.seconds || data.value;
          if (seconds !== undefined) {
            const nextSec = Math.floor(seconds);
            if (minStart !== null && nextSec < minStart - 1) {
              playVideoAt(minStart);
              return;
            }
            setCurrentTimeSec(minStart !== null ? Math.max(nextSec, minStart) : nextSec);
            setIsLinked(true);
            setIsManualPlay(false);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    pollInterval.current = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: 'getCurrentTime' }), '*');
      }
    }, 1000);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [report.videoUrl]);

  useEffect(() => {
    if (isManualPlay) {
      manualTicker.current = setInterval(() => { setCurrentTimeSec(prev => prev + 1); }, 1000);
    } else if (manualTicker.current) {
      clearInterval(manualTicker.current);
    }
    return () => { if (manualTicker.current) clearInterval(manualTicker.current); };
  }, [isManualPlay]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('t');
    if (t) {
        const seconds = parseInt(t);
        if(!isNaN(seconds)) {
            sharedStartRef.current = seconds;
            setSharedStartSec(seconds);
            setCurrentTimeSec(seconds);
            setTimeout(() => playVideoAt(seconds), 2000);
        }
    }
  }, []);

  const pauseVideo = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*');
      setIsManualPlay(false);
    }
  };

  const playVideoAt = (seconds: number) => {
    if (!report.videoUrl) {
      alert(t('matchReport.alerts.noVideoLinked'));
      return;
    }
    const minStart = sharedStartRef.current;
    const safeSeconds = minStart !== null ? Math.max(seconds, minStart) : seconds;
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [safeSeconds, true]
      }), '*');
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: []
        }), '*');
      }, 100);
      
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        method: 'setCurrentTime',
        value: safeSeconds
      }), '*');
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        method: 'play'
      }), '*');

      setCurrentTimeSec(safeSeconds);
    } else {
        alert(t('matchReport.alerts.playerNotReady'));
    }
  };

  const handleAddEvent = (type: VideoEvent['type'], options?: { goalSide?: 'FAVOR' | 'CONTRA'; playerId?: string | number; duelOutcome?: 'GANADO' | 'PERDIDO' }) => {
    const eventTime = Math.max(0, currentTimeSec - 5);
    const resolvedPlayerId = options?.playerId ?? (selectedPlayerId === '' ? undefined : selectedPlayerId);
    const newEvent: VideoEvent = {
      id: Math.random().toString(36).substr(2, 9),
      minute: formatSeconds(eventTime),
      type: type,
      note: currentNote,
      playerId: resolvedPlayerId,
      goalSide: options?.goalSide,
      duelOutcome: options?.duelOutcome,
      timestamp: Date.now()
    };
    
    const nextEvents = [...(report.videoEvents || []), newEvent].sort((a, b) => timeToSeconds(a.minute) - timeToSeconds(b.minute));
    const next = { ...report, videoEvents: nextEvents };
    setReport(next);
    persistReport(next);
    setCurrentNote('');

    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = setTimeout(() => {
      pauseVideo();
    }, 5000);
  };

  const persistReport = async (updatedReport: MatchReport) => {
    try { await db.match_reports.upsert(updatedReport); } catch (err) {}
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await db.match_reports.upsert(report);
      alert(t('matchReport.alerts.reportSaved'));
    } catch (err) {
      alert(t('matchReport.alerts.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const setHalfTime = (field: keyof MatchReport, seconds: number) => {
    const value = formatSeconds(Math.max(0, seconds));
    const next = { ...report, [field]: value };
    setReport(next);
    persistReport(next);
  };

  const handleShareEvent = async (ev: VideoEvent) => {
    const seconds = timeToSeconds(ev.minute);
    const baseUrl = window.location.href.split('?')[0];
    const shareUrl = `${baseUrl}?matchId=${match.id}&t=${seconds}`;
    
    try {
        await navigator.clipboard.writeText(shareUrl);
        alert(`${t('matchReport.alerts.linkCopied')}\n\n${shareUrl}`);
    } catch (err) {
        prompt(t('matchReport.alerts.copyManually'), shareUrl);
    }
  };

  const startEditing = (ev: VideoEvent) => {
    setEditingEventId(ev.id);
    setEditForm({
      minute: ev.minute,
      note: ev.note,
      playerId: ev.playerId ?? '',
      goalSide: ev.goalSide ?? ''
    });
  };

  const saveEditing = () => {
    if (!editingEventId) return;

    const updatedEvents = (report.videoEvents || []).map(ev => {
      if (ev.id === editingEventId) {
        return { 
          ...ev, 
          minute: editForm.minute, 
          note: editForm.note, 
          playerId: editForm.playerId === '' ? undefined : Number(editForm.playerId),
          goalSide: ev.type === 'GOL' ? (editForm.goalSide === '' ? undefined : editForm.goalSide) : undefined,
          duelOutcome: ev.type === 'DUELO' ? ev.duelOutcome : undefined
        };
      }
      return ev;
    }).sort((a, b) => timeToSeconds(a.minute) - timeToSeconds(b.minute));

    const next = { ...report, videoEvents: updatedEvents };
    setReport(next);
    persistReport(next);
    setEditingEventId(null);
  };

  const cancelEditing = () => {
    setEditingEventId(null);
    setEditForm({ minute: '', note: '', playerId: '', goalSide: '' });
  };

  const calculateMatchTime = useMemo(() => {
    if (currentTimeSec === 0) return null;
    if (report.firstHalfStart && report.firstHalfEnd) {
        const start = timeToSeconds(report.firstHalfStart);
        const end = timeToSeconds(report.firstHalfEnd);
        if (currentTimeSec >= start && currentTimeSec <= end) {
            const elapsed = currentTimeSec - start;
            return { part: t('matchReport.matchTimes.firstHalf'), full: `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}` };
        }
    }
    if (report.secondHalfStart && report.secondHalfEnd) {
        const start = timeToSeconds(report.secondHalfStart);
        const end = timeToSeconds(report.secondHalfEnd);
        if (currentTimeSec >= start && currentTimeSec <= end) {
            const elapsed = currentTimeSec - start;
            const matchMin = 45 + Math.floor(elapsed / 60);
            return { part: t('matchReport.matchTimes.secondHalf'), full: `${matchMin}:${(elapsed % 60).toString().padStart(2, '0')}` };
        }
    }
    return null;
  }, [currentTimeSec, report, t]);

  const eventButtons = [
    { id: 'GOL', label: t('matchReport.events.goal'), bg: 'bg-red-600', icon: 'fa-futbol' },
    { id: 'OCASION', label: t('matchReport.events.chance'), bg: 'bg-red-600', icon: 'fa-bullseye' },
    { id: 'DUELO', label: t('matchReport.events.duel'), bg: 'bg-amber-500', icon: 'fa-people-arrows' },
    { id: 'NOTA', label: t('matchReport.events.note'), bg: 'bg-slate-500', icon: 'fa-comment' },
  ];

  const eventTypeLabels: Record<string, string> = {
    'GOL': t('matchReport.events.goal'),
    'OCASION': t('matchReport.events.chance'),
    'DUELO': t('matchReport.events.duel'),
    'NOTA': t('matchReport.events.note'),
  };

  const goalSideLabels: Record<string, string> = {
    'FAVOR': t('matchReport.events.inFavor'),
    'CONTRA': t('matchReport.events.against'),
  };

  const duelOutcomeLabels: Record<string, string> = {
    'GANADO': t('matchReport.events.won'),
    'PERDIDO': t('matchReport.events.lost'),
  };

  const getPlayerLabel = (playerId?: string | number) => {
    if (!playerId) return t('matchReport.events.noPlayer');
    const player = squad.find(p => samePlayerId(p.id, playerId));
    if (!player) return t('matchReport.events.playerNum', { id: playerId });
    const dorsal = player.dorsal ? `${player.dorsal} ` : '';
    return `${dorsal}${player.apodo || player.nombre}`;
  };

  const handleAbpImageUpload = (field: keyof MatchReport, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      handleChange(field, result);
      persistReport({ ...report, [field]: result });
    };
    reader.readAsDataURL(file);
  };

  const handleAbpVideoUpload = (field: keyof MatchReport, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      handleChange(field, result);
      persistReport({ ...report, [field]: result });
    };
    reader.readAsDataURL(file);
  };

  const isDirectVideoUrl = (url?: string) => {
    if (!url) return false;
    if (url.startsWith('data:video')) return true;
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
  };

  const renderAbpVideoControls = (field: keyof MatchReport) => {
    const value = (report as any)[field] as string | undefined;
    return (
      <div className="space-y-2">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleAbpVideoUpload(field, e.target.files?.[0])}
          className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-3 text-xs text-[var(--text)] focus:outline-none"
        />
        <input
          type="text"
          placeholder={t('matchReport.video.videoUrlPlaceholder')}
          value={value || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          onBlur={() => persistReport({ ...report, [field]: (report as any)[field] })}
          className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-3 text-xs text-[var(--text)] focus:outline-none"
        />
        {value && (
          isDirectVideoUrl(value) ? (
            <video src={value} controls className="w-full rounded-2xl border border-[var(--border-soft)] bg-black" />
          ) : (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-full bg-slate-900 text-white rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest"
            >
              {t('matchReport.video.openVideo')}
            </a>
          )
        )}
      </div>
    );
  };

  const exportEventsToCsv = () => {
    const events = report.videoEvents || [];
    if (events.length === 0) {
      alert(t('matchReport.alerts.noEventsToExport'));
      return;
    }
    const headers = ['minuto', 'tipo', 'jugador', 'resultado', 'lado_gol', 'nota', 'timestamp'];
    const rows = events.map(ev => {
      const jugador = ev.playerId ? getPlayerLabel(ev.playerId) : '';
      const resultado = ev.type === 'DUELO' ? (ev.duelOutcome || '') : '';
      const ladoGol = ev.type === 'GOL' ? (ev.goalSide || '') : '';
      const nota = (ev.note || '').replace(/"/g, '""');
      return [
        ev.minute || '',
        ev.type || '',
        jugador,
        resultado,
        ladoGol,
        `"${nota}"`,
        ev.timestamp ? new Date(ev.timestamp).toISOString() : ''
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventos_${match.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAssignPlayer = async (posId: string, playerId: string | number) => {
    const updatedPositions = (report.lineupPositions || []).map(pos => {
      if (pos.id === posId) {
        const playerIds = pos.playerIds || [];
        if (playerIds.some(id => samePlayerId(id, playerId))) return pos;
        return { ...pos, playerIds: [...playerIds, playerId].slice(-2) };
      }
      return pos;
    });
    setReport(prev => ({ ...prev, lineupPositions: updatedPositions }));
  };

  const handleRemovePlayer = async (posId: string, playerId: string | number) => {
    const updatedPositions = (report.lineupPositions || []).map(pos => {
      if (pos.id === posId) return { ...pos, playerIds: (pos.playerIds || []).filter(id => !samePlayerId(id, playerId)) };
      return pos;
    });
    setReport(prev => ({ ...prev, lineupPositions: updatedPositions }));
  };

  const handleChangeFormation = async (newForm: string) => {
    const newPositions = getInitialPositions(newForm);
    setReport(prev => ({ ...prev, formation: newForm, lineupPositions: newPositions }));
  };

  // ── YouTube Upload Handlers ──────────────────────────────
  const handleYtFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    setYtSelectedFile(file);
    setYtUploadProgress(null);
  };

  const handleYtUpload = async () => {
    if (!ytSelectedFile) return;
    const idToken = await authService.getIdToken();
    if (!idToken) {
      alert(t('matchReport.alerts.sessionExpired'));
      return;
    }

    const abort = new AbortController();
    ytAbortRef.current = abort;

    const title = match.localTeam && match.visitorTeam
      ? `${match.localTeam} vs ${match.visitorTeam} – ${match.date ? new Date(match.date).toLocaleDateString(i18n.language) : ''}`
      : `${t('matchReport.match')} ${match.id} – ${match.date ? new Date(match.date).toLocaleDateString(i18n.language) : ''}`;

    try {
      const videoUrl = await uploadVideoToYouTube({
        file: ytSelectedFile,
        title,
        description: `Subido desde IBL – ${match.competition || ''} ${match.jornada ? 'J' + match.jornada : ''}`.trim(),
        onProgress: setYtUploadProgress,
        signal: abort.signal,
        idToken,
      });

      // Guardar la URL en el report
      setReport(prev => ({ ...prev, videoUrl }));
      persistReport({ ...report, videoUrl });
      setYtSelectedFile(null);
      if (ytFileInputRef.current) ytFileInputRef.current.value = '';
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[youtube-upload]', err);
      }
    }
  };

  const handleYtCancel = () => {
    ytAbortRef.current?.abort();
    setYtUploadProgress(null);
    setYtSelectedFile(null);
    if (ytFileInputRef.current) ytFileInputRef.current.value = '';
  };

  const renderEventos = () => (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-180px)] bg-[#121212] overflow-hidden">
      <div className="flex-1 bg-black relative order-1 lg:order-2 flex items-center justify-center border-b lg:border-b-0 lg:border-l border-white/5">
          {report.videoUrl ? (
            <div className="relative w-full h-full">
                {isBlockedEmbed(report.videoUrl) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/60">
                        <i className="fa-solid fa-ban text-4xl"></i>
                        <p className="text-xs font-black uppercase tracking-widest">{t('matchReport.video.providerBlocked')}</p>
                        <a href={report.videoUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest">{t('matchReport.video.openNewTab')}</a>
                    </div>
                ) : (
                    <iframe 
                        ref={iframeRef}
                        key={report.videoUrl} 
                        src={getEmbedUrl(report.videoUrl, sharedStartSec ?? undefined)} 
                        className="w-full h-full" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                )}
                {calculateMatchTime && (
                    <div className="absolute bottom-6 right-6 z-20 animate-fade-in pointer-events-none">
                        <div className="bg-[var(--accent)]/90 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">{calculateMatchTime.part}</span>
                                <span className="text-2xl font-black text-white leading-none font-mono tracking-tighter">{calculateMatchTime.full}'</span>
                            </div>
                            <div className="flex flex-col items-end pl-4 border-l border-white/20">
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">{t('matchReport.matchTimes.realTime')}</span>
                                <span className="text-sm font-black text-white/90 font-mono tracking-tight">{formatHMS(currentTimeSec)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          ) : (
            <div className="w-full max-w-lg p-10 flex flex-col items-center text-center gap-6 animate-fade-in">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/20"><i className="fa-solid fa-link-slash text-4xl"></i></div>
                <div><h4 className="text-white font-black uppercase tracking-widest text-lg mb-2">{t('matchReport.video.noVideo')}</h4><p className="text-white/40 text-[11px] font-medium leading-relaxed">{t('matchReport.video.noVideoDesc')}</p></div>
                <div className="w-full"><input type="text" placeholder={t('matchReport.video.urlPlaceholder')} value={report.videoUrl} onChange={(e) => { const val = e.target.value; setReport({...report, videoUrl: val}); if (val.includes('http')) persistReport({...report, videoUrl: val}); }} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-sm focus:border-red-500 outline-none text-center font-bold" /></div>

                {/* Separador */}
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{t('matchReport.video.orUploadDirectly')}</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* YouTube Upload */}
                <div className="w-full space-y-3">
                  <input
                    ref={ytFileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleYtFileSelect}
                    className="hidden"
                  />
                  {!ytSelectedFile && !ytUploadProgress && (
                    <button
                      onClick={() => ytFileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-2xl px-6 py-5 text-red-400 transition-all group"
                    >
                      <i className="fa-brands fa-youtube text-2xl group-hover:scale-110 transition-transform"></i>
                      <div className="text-left">
                        <span className="block text-sm font-black uppercase tracking-widest">{t('matchReport.video.uploadToYoutube')}</span>
                        <span className="block text-[10px] text-white/30 font-medium">{t('matchReport.video.uploadUnlisted')}</span>
                      </div>
                    </button>
                  )}

                  {ytSelectedFile && !ytUploadProgress && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-film text-white/30"></i>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate">{ytSelectedFile.name}</p>
                          <p className="text-white/30 text-[10px]">{formatFileSize(ytSelectedFile.size)}</p>
                        </div>
                        <button onClick={handleYtCancel} className="text-white/20 hover:text-white/60 text-xs">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                      <button
                        onClick={handleYtUpload}
                        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        <i className="fa-brands fa-youtube mr-2"></i>{t('matchReport.video.uploadToYoutube')}
                      </button>
                    </div>
                  )}

                  {ytUploadProgress && ytUploadProgress.stage !== 'done' && ytUploadProgress.stage !== 'error' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{ytUploadProgress.message}</span>
                        <button onClick={handleYtCancel} className="text-white/20 hover:text-red-400 text-[10px] font-bold uppercase">{t('common.cancel')}</button>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-300"
                          style={{ width: `${ytUploadProgress.percent}%` }}
                        ></div>
                      </div>
                      <p className="text-white/30 text-[10px] text-center">{ytUploadProgress.percent}%</p>
                    </div>
                  )}

                  {ytUploadProgress?.stage === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center space-y-2">
                      <p className="text-red-400 text-xs font-bold"><i className="fa-solid fa-circle-exclamation mr-2"></i>{ytUploadProgress.error}</p>
                      <button onClick={handleYtCancel} className="text-white/40 hover:text-white/60 text-[10px] font-bold uppercase">{t('matchReport.video.retry')}</button>
                    </div>
                  )}
                </div>
            </div>
          )}
      </div>

      <div className="w-full lg:w-[420px] flex flex-col bg-[#0f0f0f] overflow-y-auto lg:overflow-hidden shrink-0 order-2 lg:order-1 border-r border-white/5 shadow-2xl">
         <div className="p-4 border-b border-white/10 bg-[#0b0b0b]">
            <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-2"><i className="fa-brands fa-youtube mr-2"></i>{t('matchReport.video.matchUrl')}</label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={report.videoUrl} 
                    onChange={(e) => { const val = e.target.value; setReport({...report, videoUrl: val}); }} 
                    onBlur={() => persistReport(report)}
                    placeholder={t('matchReport.video.pasteLink')}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-red-400 focus:border-red-500 outline-none font-bold placeholder:text-white/10 font-mono"
                />
                <button
                  onClick={() => ytFileInputRef.current?.click()}
                  title={t('matchReport.video.uploadToYoutubeTitle')}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-red-400 transition-colors shrink-0"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                </button>
            </div>
            {/* Mini progress bar in sidebar */}
            {ytUploadProgress && ytUploadProgress.stage !== 'done' && ytUploadProgress.stage !== 'error' && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: `${ytUploadProgress.percent}%` }}></div>
                </div>
                <p className="text-[8px] text-white/30 font-bold">{ytUploadProgress.message}</p>
              </div>
            )}
         </div>
         <div className="p-5 border-b border-white/10 space-y-6">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-5 space-y-4">
                <button onClick={() => setShowMatchTimes(!showMatchTimes)} className="w-full flex items-center justify-between">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">{t('matchReport.matchTimes.title')}</span>
                    <span className="text-[9px] font-black text-white/30 flex items-center gap-2 uppercase">
                        {showMatchTimes ? t('matchReport.matchTimes.hide') : t('matchReport.matchTimes.show')}
                        <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${showMatchTimes ? '' : '-rotate-90'}`}></i>
                    </span>
                </button>
                {showMatchTimes && (
                <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t('matchReport.matchTimes.firstHalfStart')}</span>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={report.firstHalfStart || ''}
                                onChange={(e) => setReport(prev => ({ ...prev, firstHalfStart: e.target.value }))}
                                onBlur={() => persistReport(report)}
                                placeholder="00:00"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono focus:border-red-500 outline-none"
                            />
                            <button onClick={() => setHalfTime('firstHalfStart', currentTimeSec)} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 text-[9px] font-black">SET</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t('matchReport.matchTimes.firstHalfEnd')}</span>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={report.firstHalfEnd || ''}
                                onChange={(e) => setReport(prev => ({ ...prev, firstHalfEnd: e.target.value }))}
                                onBlur={() => persistReport(report)}
                                placeholder="45:00"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono focus:border-red-500 outline-none"
                            />
                            <button onClick={() => setHalfTime('firstHalfEnd', currentTimeSec)} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 text-[9px] font-black">SET</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t('matchReport.matchTimes.secondHalfStart')}</span>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={report.secondHalfStart || ''}
                                onChange={(e) => setReport(prev => ({ ...prev, secondHalfStart: e.target.value }))}
                                onBlur={() => persistReport(report)}
                                placeholder="45:00"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono focus:border-red-500 outline-none"
                            />
                            <button onClick={() => setHalfTime('secondHalfStart', currentTimeSec)} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 text-[9px] font-black">SET</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t('matchReport.matchTimes.secondHalfEnd')}</span>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={report.secondHalfEnd || ''}
                                onChange={(e) => setReport(prev => ({ ...prev, secondHalfEnd: e.target.value }))}
                                onBlur={() => persistReport(report)}
                                placeholder="90:00"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white font-mono focus:border-red-500 outline-none"
                            />
                            <button onClick={() => setHalfTime('secondHalfEnd', currentTimeSec)} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 text-[9px] font-black">SET</button>
                        </div>
                    </div>
                </div>
                <p className="text-[9px] text-white/30 font-bold leading-relaxed">
                    {t('matchReport.matchTimes.timesHelp')}
                </p>
                </div>
                )}
            </div>

            <div className="space-y-4">
                
                <div className="grid grid-cols-2 gap-3">
                    {eventButtons.map((btn) => (
                        <button
                          key={btn.id}
                          onClick={() => {
                            if (btn.id === 'GOL') { setIsGoalDialogOpen(true); return; }
                            if (btn.id === 'DUELO') { 
                              setDuelPlayerSelection(selectedPlayerId);
                              setIsDuelDialogOpen(true);
                              return;
                            }
                            handleAddEvent(btn.id as any);
                          }}
                          className="flex items-center gap-3 group cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-4 py-3 transition-all active:scale-[0.98]"
                        >
                            <div className={`${btn.bg} w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg`}>
                                <i className={`fa-solid ${btn.icon} text-sm`}></i>
                            </div>
                            <span className="text-[10px] font-black text-white/70 group-hover:text-white transition-colors uppercase tracking-[0.2em]">{btn.label}</span>
                        </button>
                    ))}
                </div>
            </div>
         </div>
         
         {isGoalDialogOpen && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-sm mx-4 bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <div className="text-center space-y-2">
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">GOL</div>
                        <h3 className="text-lg font-black text-white">
                          {goalSideSelection === '' ? t('matchReport.goalDialog.favorOrAgainst') : t('matchReport.goalDialog.selectPlayer')}
                        </h3>
                        <p className="text-[10px] text-white/40">
                          {goalSideSelection === '' ? t('matchReport.goalDialog.selectGoalType') : t('matchReport.goalDialog.selectWhoScored')}
                        </p>
                    </div>
                    {goalSideSelection === '' ? (
                      <div className="mt-6 grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setGoalSideSelection('FAVOR')}
                            className="py-4 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest"
                          >
                            {t('matchReport.goalDialog.inFavor')}
                          </button>
                          <button
                            onClick={() => { setIsGoalDialogOpen(false); setGoalSideSelection(''); setGoalPlayerSelection(''); handleAddEvent('GOL', { goalSide: 'CONTRA' }); }}
                            className="py-4 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest"
                          >
                            {t('matchReport.goalDialog.against')}
                          </button>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-3">
                        {(report.lineupPositions || []).length === 0 ? (
                          <div className="text-center text-[10px] text-white/40">
                            No hay 11 asignado en la alineación.
                          </div>
                        ) : (
                          <div className="relative w-full h-[320px] rounded-2xl bg-[#2d5a3f] border border-white/10 overflow-hidden">
                            <div className="absolute inset-3 border border-white/30 rounded-lg pointer-events-none">
                              <div className="absolute top-1/2 left-0 right-0 border-t border-white/30"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/30 rounded-full"></div>
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-10 border-b border-x border-white/30"></div>
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-10 border-t border-x border-white/30"></div>
                            </div>
                            <div className="absolute inset-0">
                              {(report.lineupPositions || []).map((pos) => {
                                const assignedId = pos.playerIds && pos.playerIds.length > 0 ? pos.playerIds[pos.playerIds.length - 1] : undefined;
                                const player = assignedId ? squad.find(p => samePlayerId(p.id, assignedId)) : undefined;
                                if (!player) return null;
                                const isSelected = samePlayerId(goalPlayerSelection, player.id);
                                return (
                                  <button
                                    key={pos.id}
                                    onClick={() => setGoalPlayerSelection(player.id)}
                                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all ${
                                      isSelected ? 'scale-105' : ''
                                    }`}
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                  >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-[10px] border-[3px] ${
                                      isSelected ? 'bg-[var(--accent)] border-yellow-300 text-white ring-4 ring-yellow-300/40' : 'bg-[var(--accent)] border-white text-white'
                                    }`}>
                                      {player.dorsal}
                                    </div>
                                    <span className="mt-1 text-[7px] font-black uppercase text-white/90 bg-black/80 px-2 py-0.5 rounded">
                                      {player.apodo || player.nombre}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (goalPlayerSelection === '') return;
                            setIsGoalDialogOpen(false);
                            handleAddEvent('GOL', { goalSide: 'FAVOR', playerId: goalPlayerSelection });
                            setGoalSideSelection('');
                            setGoalPlayerSelection('');
                          }}
                          className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${goalPlayerSelection === '' ? 'bg-white/5 text-white/30' : 'bg-red-600/90 hover:bg-red-600 text-white'}`}
                        >
                          {t('common.confirm')}
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => { setIsGoalDialogOpen(false); setGoalSideSelection(''); setGoalPlayerSelection(''); }}
                      className="mt-4 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 font-black text-[9px] uppercase tracking-widest"
                    >
                      {t('common.cancel')}
                    </button>
                </div>
            </div>
         )}

         {isDuelDialogOpen && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-sm mx-4 bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <div className="text-center space-y-2">
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">DUELO</div>
                        <h3 className="text-lg font-black text-white">{t('matchReport.duelDialog.selectPlayer')}</h3>
                        <p className="text-[10px] text-white/40">{t('matchReport.duelDialog.selectOutcome')}</p>
                    </div>
                    <div className="mt-6 space-y-3">
                        {(report.lineupPositions || []).length === 0 ? (
                          <div className="text-center text-[10px] text-white/40">
                            {t('matchReport.duelDialog.noLineup')}
                          </div>
                        ) : (
                          <div className="relative w-full h-[320px] rounded-2xl bg-[#2d5a3f] border border-white/10 overflow-hidden">
                            <div className="absolute inset-3 border border-white/30 rounded-lg pointer-events-none">
                              <div className="absolute top-1/2 left-0 right-0 border-t border-white/30"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/30 rounded-full"></div>
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-10 border-b border-x border-white/30"></div>
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-10 border-t border-x border-white/30"></div>
                            </div>
                            <div className="absolute inset-0">
                              {(report.lineupPositions || []).map((pos) => {
                                const assignedId = pos.playerIds && pos.playerIds.length > 0 ? pos.playerIds[pos.playerIds.length - 1] : undefined;
                                const player = assignedId ? squad.find(p => samePlayerId(p.id, assignedId)) : undefined;
                                if (!player) return null;
                                const isSelected = samePlayerId(duelPlayerSelection, player.id);
                                return (
                                  <button
                                    key={pos.id}
                                    onClick={() => setDuelPlayerSelection(player.id)}
                                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all ${
                                      isSelected ? 'scale-105' : ''
                                    }`}
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                  >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-[10px] border-[3px] ${
                                      isSelected ? 'bg-[var(--accent)] border-yellow-300 text-white ring-4 ring-yellow-300/40' : 'bg-[var(--accent)] border-white text-white'
                                    }`}>
                                      {player.dorsal}
                                    </div>
                                    <span className="mt-1 text-[7px] font-black uppercase text-white/90 bg-black/80 px-2 py-0.5 rounded">
                                      {player.apodo || player.nombre}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              if (duelPlayerSelection === '') return;
                              setIsDuelDialogOpen(false);
                              handleAddEvent('DUELO', { playerId: duelPlayerSelection, duelOutcome: 'GANADO' });
                              setDuelPlayerSelection('');
                            }}
                            className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${duelPlayerSelection === '' ? 'bg-white/5 text-white/30' : 'bg-emerald-600/90 hover:bg-emerald-600 text-white'}`}
                          >
                            {t('matchReport.duelDialog.won')}
                          </button>
                          <button
                            onClick={() => {
                              if (duelPlayerSelection === '') return;
                              setIsDuelDialogOpen(false);
                              handleAddEvent('DUELO', { playerId: duelPlayerSelection, duelOutcome: 'PERDIDO' });
                              setDuelPlayerSelection('');
                            }}
                            className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${duelPlayerSelection === '' ? 'bg-white/5 text-white/30' : 'bg-red-600/90 hover:bg-red-600 text-white'}`}
                          >
                            {t('matchReport.duelDialog.lost')}
                          </button>
                        </div>
                    </div>
                    <button
                      onClick={() => { setIsDuelDialogOpen(false); setDuelPlayerSelection(''); }}
                      className="mt-4 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 font-black text-[9px] uppercase tracking-widest"
                    >
                      {t('common.cancel')}
                    </button>
                </div>
            </div>
         )}

         <div className="p-3 border-b border-white/10 bg-[#0a0a0a] space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">{t('matchReport.events.history')}</span>
                <div className="flex items-center gap-3">
                    <button
                      onClick={exportEventsToCsv}
                      className="px-3 py-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-[9px] font-black uppercase tracking-widest"
                    >
                      {t('matchReport.events.exportCsv')}
                    </button>
                    <span className="text-[9px] font-black text-white/30">{filteredEvents.length}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t('matchReport.events.player')}</span>
                <select
                  value={playerFilter}
                  onChange={(e) => setPlayerFilter(e.target.value === 'ALL' ? 'ALL' : e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/80 outline-none"
                >
                  <option value="ALL" className="text-black">{t('matchReport.events.all')}</option>
                  {squad.map(player => (
                    <option key={player.id} value={player.id} className="text-black">
                      {player.dorsal ? `${player.dorsal} - ` : ''}{player.apodo || player.nombre}
                    </option>
                  ))}
                </select>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {['ALL', ...eventButtons.map(btn => btn.id)].map(f => (
                    <button
                      key={f}
                      onClick={() => setEventFilter(f)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all ${eventFilter === f ? 'bg-white text-black' : 'bg-white/5 text-white/30 hover:text-white/60'}`}
                    >
                      {f === 'ALL' ? t('matchReport.events.historyFilter') : (eventTypeLabels[f] || f)}
                    </button>
                ))}
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0a] min-h-[400px] scrollbar-hide pb-20">
            {filteredEvents.length === 0 ? (
                <div className="py-20 text-center opacity-5"><i className="fa-solid fa-timeline text-6xl mb-4"></i><p className="text-white text-[10px] uppercase font-black tracking-widest">{t('matchReport.events.noEvents')}</p></div>
            ) : (
                filteredEvents.map((ev) => {
                    const isEditing = editingEventId === ev.id;
                    return (
                        <div key={ev.id} className={`p-4 rounded-3xl bg-[#141414] border border-white/5 transition-all group relative z-10 ${isEditing ? 'ring-2 ring-red-500/50 bg-[#1a1a1a]' : 'hover:bg-[#1a1a1a]'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-black text-red-500 font-mono tracking-tighter">{ev.minute}</span>
                                    <span className="text-white text-[10px] font-black uppercase tracking-widest">{eventTypeLabels[ev.type] || ev.type}</span>
                                    {ev.playerId && (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                                            {getPlayerLabel(ev.playerId)}
                                        </span>
                                    )}
                                    {ev.type === 'GOL' && ev.goalSide && (
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${ev.goalSide === 'FAVOR' ? 'text-red-400' : 'text-red-400'}`}>
                                            {goalSideLabels[ev.goalSide || ''] || ev.goalSide}
                                        </span>
                                    )}
                                    {ev.type === 'DUELO' && ev.duelOutcome && (
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${ev.duelOutcome === 'GANADO' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {duelOutcomeLabels[ev.duelOutcome || ''] || ev.duelOutcome}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {!isEditing && (
                                        <>
                                            <button 
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); playVideoAt(timeToSeconds(ev.minute)); }}
                                              className="w-10 h-10 rounded-xl bg-red-600 text-white shadow-lg active:scale-90 transition-all flex items-center justify-center cursor-pointer hover:bg-red-500 z-20"
                                              title={t('matchReport.events.playClip')}
                                            >
                                              <i className="fa-solid fa-play text-[11px]"></i>
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleShareEvent(ev); }}
                                              className="w-10 h-10 rounded-xl bg-white/5 text-red-400 hover:bg-red-600 hover:text-white shadow-lg flex items-center justify-center transition-all cursor-pointer z-20" 
                                              title={t('matchReport.events.copyEventLink')}
                                            >
                                              <i className="fa-solid fa-share-nodes text-[11px]"></i>
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); startEditing(ev); }}
                                              className="w-10 h-10 rounded-xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer z-20"
                                              title={t('matchReport.events.editTimeNote')}
                                            >
                                              <i className="fa-solid fa-pencil text-[11px]"></i>
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={(e) => { 
                                                e.stopPropagation();
                                                if(confirm(t('matchReport.alerts.deleteEventConfirm'))) {
                                                  const nextEvents = report.videoEvents?.filter(x=>x.id!==ev.id);
                                                  const next = {...report, videoEvents: nextEvents};
                                                  setReport(next); 
                                                  persistReport(next);
                                                } 
                                              }} 
                                              className="w-10 h-10 rounded-xl bg-white/5 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center cursor-pointer z-20"
                                              title={t('matchReport.events.deleteRecord')}
                                            >
                                              <i className="fa-solid fa-trash text-[11px]"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {isEditing ? (
                                <div className="space-y-3 animate-fade-in pt-3 border-t border-white/5">
                                    <div className="flex gap-2">
                                        <div className="w-24">
                                            <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">{t('matchReport.editForm.time')}</label>
                                            <input 
                                                type="text" 
                                                value={editForm.minute}
                                                onChange={(e) => setEditForm({...editForm, minute: e.target.value})}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono text-center focus:border-red-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">{t('matchReport.editForm.description')}</label>
                                            <input 
                                              type="text" 
                                              autoFocus
                                              value={editForm.note}
                                              onChange={(e) => setEditForm({...editForm, note: e.target.value})} 
                                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-red-500" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">{t('matchReport.editForm.player')}</label>
                                        <select
                                          value={editForm.playerId}
                                          onChange={(e) => setEditForm({ ...editForm, playerId: e.target.value === '' ? '' : e.target.value })}
                                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                                        >
                                          <option value="" className="text-black">{t('matchReport.editForm.noPlayer')}</option>
                                          {squad.map(player => (
                                            <option key={player.id} value={player.id} className="text-black">
                                              {player.dorsal ? `${player.dorsal} - ` : ''}{player.apodo || player.nombre}
                                            </option>
                                          ))}
                                        </select>
                                    </div>
                                    {report.videoEvents?.find(x => x.id === ev.id)?.type === 'GOL' && (
                                      <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase">{t('matchReport.editForm.goalLabel')}</label>
                                        <select
                                          value={editForm.goalSide}
                                          onChange={(e) => setEditForm({ ...editForm, goalSide: e.target.value as any })}
                                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                                        >
                                          <option value="" className="text-black">{t('matchReport.editForm.undefined')}</option>
                                          <option value="FAVOR" className="text-black">{t('matchReport.editForm.inFavor')}</option>
                                          <option value="CONTRA" className="text-black">{t('matchReport.editForm.against')}</option>
                                        </select>
                                      </div>
                                    )}
                                    <div className="flex justify-end gap-2">
                                        <button onClick={cancelEditing} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase transition-all">{t('common.cancel')}</button>
                                        <button onClick={saveEditing} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase transition-all">{t('matchReport.editForm.saveChanges')}</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-white/40 text-[11px] font-medium italic pl-1 truncate">{ev.note || t('matchReport.events.noDescription')}</p>
                            )}
                        </div>
                    );
                })
            )}
         </div>
         <div className="p-4 border-t border-white/10 bg-[#0f0f0f]">
            <button onClick={handleSave} className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-2">
                {isSaving ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-check-double"></i>} {t('matchReport.finishAndSave')}
            </button>
         </div>
      </div>
    </div>
  );

  const renderAlineacionTactiva = () => (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-130px)]">
        <div className="flex justify-end px-6 py-2">
             <button onClick={handleSave} className="bg-sport-primary hover:bg-sport-primary-dark text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"><i className="fa-solid fa-floppy-disk"></i> {t('matchReport.saveLineup')}</button>
        </div>
        <TacticalBoard 
            formacion={report.formation || '4-3-3'}
            positions={report.lineupPositions && report.lineupPositions.length > 0 
                ? report.lineupPositions 
                : getInitialPositions(report.formation || '4-3-3')} 
            squad={squad}
            onAssignPlayer={handleAssignPlayer}
            onRemovePlayer={handleRemovePlayer}
            onChangeFormation={handleChangeFormation}
        />
    </div>
  );

  const renderPlanPartido = () => (
    <div className="animate-fade-in space-y-8 max-w-5xl mx-auto pb-32">
      <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-8">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
              <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2"><i className="fa-solid fa-sliders text-red-500"></i> {t('matchReport.finalReports')}</div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest">PRO ENGINE v3.0</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.playerUrl')}</label>
                <input type="text" value={report.videoUrl} onChange={(e) => handleChange('videoUrl', e.target.value)} className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]" placeholder="https://..." />
                {report.videoUrl && !isBlockedEmbed(report.videoUrl) && (
                  <div className="mt-4 aspect-video rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
                  <iframe title="reproductor-plan" src={getEmbedUrl(report.videoUrl, sharedStartSec ?? undefined)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  </div>
                )}
                {report.videoUrl && (
                  <a className="text-[11px] font-black text-[var(--accent)] underline inline-block mt-2" href={report.videoUrl} target="_blank" rel="noreferrer">
                    {t('matchReport.video.openVideoNewTab')}
                  </a>
                )}
             </div>
             <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.tacticalDoc')}</label>
                <input type="text" value={report.docUrl} onChange={(e) => handleChange('docUrl', e.target.value)} className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]" placeholder="https://..." />
                {report.docUrl && (
                  <div className="mt-4 aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
                    <iframe title="documento-plan" src={report.docUrl} className="w-full h-full"></iframe>
                  </div>
                )}
                {report.docUrl && (
                  <a className="text-[11px] font-black text-[var(--accent)] underline inline-block mt-2" href={report.docUrl} target="_blank" rel="noreferrer">
                    {t('matchReport.video.openPdfNewTab')}
                  </a>
                )}
             </div>
          </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[{ id: 'conBalon', label: t('matchReport.attack'), icon: 'fa-futbol', color: 'text-red-500' }, { id: 'sinBalon', label: t('matchReport.defense'), icon: 'fa-shield-halved', color: 'text-red-500' }, { id: 'abp', label: t('matchReport.transitions'), icon: 'fa-bolt', color: 'text-emerald-500' }].map((block) => (
          <div key={block.id} className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-xl space-y-5 flex flex-col relative group hover:border-[var(--surface-3)] transition-all">
            <div className="flex justify-between items-center">
                <div className={`text-[11px] font-black ${block.color} uppercase tracking-[0.2em] flex items-center gap-2`}><i className={`fa-solid ${block.icon}`}></i> {block.label}</div>
                <button onClick={() => setExpandedMediaBlock(expandedMediaBlock === block.id ? null : block.id)} className="w-8 h-8 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all"><i className={`fa-solid ${expandedMediaBlock === block.id ? 'fa-xmark' : 'fa-paperclip'} text-xs`}></i></button>
            </div>
            
            {expandedMediaBlock === block.id && (
                <div className="bg-[var(--surface-1)] p-4 rounded-2xl space-y-3 animate-fade-in border border-[var(--border-soft)]">
                    <div>
                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">{t('matchReport.specificVideo')}</label>
                        <input type="text" value={(report as any)[`${block.id}Video`]} onChange={(e) => handleChange(`${block.id}Video` as any, e.target.value)} className="w-full bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text)] focus:outline-none" placeholder={t('matchReport.videoLinkPlaceholder')} />
                        {(report as any)[`${block.id}Video`] && !isBlockedEmbed((report as any)[`${block.id}Video`]) && (
                          <div className="mt-2 aspect-video rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)]">
                            <iframe title={`${block.id}-video-plan`} src={getEmbedUrl((report as any)[`${block.id}Video`])} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                          </div>
                        )}
                        {(report as any)[`${block.id}Video`] && (
                          <a className="text-[10px] font-black text-[var(--accent)] underline inline-block mt-2" href={(report as any)[`${block.id}Video`]} target="_blank" rel="noreferrer">
                            {t('matchReport.video.openVideoNewTab')}
                          </a>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">{t('matchReport.document')}</label>
                        <input type="text" value={(report as any)[`${block.id}Doc`]} onChange={(e) => handleChange(`${block.id}Doc` as any, e.target.value)} className="w-full bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text)] focus:outline-none" placeholder={t('matchReport.pdfLinkPlaceholder')} />
                        {(report as any)[`${block.id}Doc`] && (
                          <div className="mt-2 aspect-[4/3] rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)]">
                            <iframe title={`${block.id}-doc-plan`} src={(report as any)[`${block.id}Doc`]} className="w-full h-full"></iframe>
                          </div>
                        )}
                        {(report as any)[`${block.id}Doc`] && (
                          <a className="text-[10px] font-black text-[var(--accent)] underline inline-block mt-2" href={(report as any)[`${block.id}Doc`]} target="_blank" rel="noreferrer">
                            {t('matchReport.video.openPdfNewTab')}
                          </a>
                        )}
                    </div>
                </div>
            )}

            <textarea value={(report as any)[`${block.id}Text`]} onChange={(e) => handleChange(`${block.id}Text` as any, e.target.value)} className="w-full flex-1 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-3xl px-5 py-5 text-xs text-[var(--text)] focus:outline-none h-64 resize-none leading-relaxed" placeholder={t('matchReport.analysisPlaceholder', { section: block.label.toLowerCase() })}></textarea>
          </div>
        ))}
      </div>
      <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50"><button onClick={handleSave} className="bg-sport-primary hover:bg-sport-primary-dark text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all"><i className="fa-solid fa-floppy-disk"></i> {t('matchReport.savePlan')}</button></div>
    </div>
  );

  const renderAbpCard = (label: string, imageField: keyof MatchReport, videoField: keyof MatchReport, textField: keyof MatchReport) => (
    <div className="bg-[var(--surface-0)] rounded-3xl border border-[var(--border-soft)] shadow-xl p-6 space-y-4">
      <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">{label}</div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleAbpImageUpload(imageField, e.target.files?.[0])}
        className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-3 text-xs text-[var(--text)] focus:outline-none"
      />
      {(report as any)[imageField] && (
        <div className="aspect-video rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
          <img
            src={(report as any)[imageField]}
            alt={label}
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={() => setAbpPreviewImage((report as any)[imageField] || null)}
          />
        </div>
      )}
      {renderAbpVideoControls(videoField)}
      <textarea
        value={(report as any)[textField] || ''}
        onChange={(e) => handleChange(textField, e.target.value)}
        className="w-full min-h-30 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-4 py-4 text-xs text-[var(--text)] focus:outline-none resize-none"
        placeholder={t('matchReport.abp.playDetail')}
      />
    </div>
  );

  const renderABP = () => (
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto pb-32">
      <div className="flex items-center justify-center">
        <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-full">ABP</div>
      </div>

      {/* ── OFENSIVO ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-md">{t('matchReport.abp.offensive')}</div>
        </div>
        {/* Corners */}
        <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.corners')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderAbpCard(`${t('matchReport.abp.corner')} 1`, 'abpOffCornerImage', 'abpOffCornerVideo', 'abpOffCornerText')}
          {renderAbpCard(`${t('matchReport.abp.corner')} 2`, 'abpOffCorner2Image', 'abpOffCorner2Video', 'abpOffCorner2Text')}
          {renderAbpCard(`${t('matchReport.abp.corner')} 3`, 'abpOffCorner3Image', 'abpOffCorner3Video', 'abpOffCorner3Text')}
          {renderAbpCard(`${t('matchReport.abp.corner')} 4`, 'abpOffCorner4Image', 'abpOffCorner4Video', 'abpOffCorner4Text')}
        </div>
        {/* Faltas Laterales */}
        <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.lateralFouls')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {renderAbpCard(`${t('matchReport.abp.lateralFoul')} 1`, 'abpOffLateralImage', 'abpOffLateralVideo', 'abpOffLateralText')}
          {renderAbpCard(`${t('matchReport.abp.lateralFoul')} 2`, 'abpOffLateral2Image', 'abpOffLateral2Video', 'abpOffLateral2Text')}
        </div>
      </div>

      {/* ── DEFENSIVO ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-md">{t('matchReport.abp.defensive')}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderAbpCard(t('matchReport.abp.corner'), 'abpDefCorner1Image', 'abpDefCorner1Video', 'abpDefCorner1Text')}
          {renderAbpCard(t('matchReport.abp.lateralFoul'), 'abpDefLateralImage', 'abpDefLateralVideo', 'abpDefLateralText')}
          {renderAbpCard(t('matchReport.abp.frontalFoul'), 'abpDefFrontalImage', 'abpDefFrontalVideo', 'abpDefFrontalText')}
        </div>
      </div>
    </div>
  );

  const renderArbitro = () => (
    <div className="animate-fade-in space-y-8 max-w-5xl mx-auto pb-32">
      <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-8">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
          <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2"><i className="fa-solid fa-gavel text-red-500"></i> {t('matchReport.refereeSection.title')}</div>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.refereeSection.name')}</label>
            <input
              type="text"
              value={report.refereeName || ''}
              onChange={e => handleChange('refereeName', e.target.value)}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]"
              placeholder={t('matchReport.refereeSection.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.refereeSection.description')}</label>
            <textarea
              value={report.refereeDescription || ''}
              onChange={e => handleChange('refereeDescription', e.target.value)}
              className="w-full min-h-[180px] bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none resize-none text-[var(--text)]"
              placeholder={t('matchReport.refereeSection.descriptionPlaceholder')}
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={handleSave} className="bg-sport-primary hover:bg-sport-primary-dark text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"><i className="fa-solid fa-floppy-disk"></i> {t('common.save')}</button>
        </div>
      </div>
    </div>
  );

  const renderInforme = () => (
    <div className="animate-fade-in space-y-8 max-w-5xl mx-auto pb-32">
      <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">
          <i className="fa-solid fa-user-secret text-red-500"></i> {t('sidebar.rivalTeamsLabel')}
        </div>
        <select
          value={selectedRivalTeamId}
          onChange={e => setSelectedRivalTeamId(e.target.value)}
          className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text)] focus:outline-none"
        >
          <option value="">{t('rivalTeams.noTeams')}</option>
          {rivalTeams.map(team => (
            <option key={team.id} value={team.id}>{team.nombre}</option>
          ))}
        </select>
      </div>
      <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-8">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
              <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2"><i className="fa-solid fa-sliders text-red-500"></i> {t('matchReport.finalReports')}</div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest">PRO ENGINE v3.0</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.playerUrl')}</label>
                <input type="text" value={report.videoUrl} onChange={(e) => handleChange('videoUrl', e.target.value)} className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]" placeholder="https://..." />
                {report.videoUrl && !isBlockedEmbed(report.videoUrl) && (
                  <div className="mt-4 aspect-video rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
                    <iframe title="reproductor" src={getEmbedUrl(report.videoUrl, sharedStartSec ?? undefined)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  </div>
                )}
                {report.videoUrl && (
                  <a className="text-[11px] font-black text-[var(--accent)] underline inline-block mt-2" href={report.videoUrl} target="_blank" rel="noreferrer">
                    {t('matchReport.video.openVideoNewTab')}
                  </a>
                )}
             </div>
             <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">{t('matchReport.tacticalDoc')}</label>
                <input type="text" value={report.docUrl} onChange={(e) => handleChange('docUrl', e.target.value)} className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl px-5 py-4 text-sm focus:outline-none font-bold text-[var(--text)]" placeholder="https://..." />
                {report.docUrl && (
                  <div className="mt-4 aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-1)]">
                    <iframe title="documento" src={report.docUrl} className="w-full h-full"></iframe>
                  </div>
                )}
                {report.docUrl && (
                  <a className="text-[11px] font-black text-[var(--accent)] underline inline-block mt-2" href={report.docUrl} target="_blank" rel="noreferrer">
                    {t('matchReport.video.openPdfNewTab')}
                  </a>
                )}
             </div>
          </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[{ id: 'conBalon', label: t('matchReport.attack'), icon: 'fa-futbol', color: 'text-red-500' }, { id: 'sinBalon', label: t('matchReport.defense'), icon: 'fa-shield-halved', color: 'text-red-500' }, { id: 'abp', label: t('matchReport.transitions'), icon: 'fa-bolt', color: 'text-emerald-500' }].map((block) => (
          <div key={block.id} className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-xl space-y-5 flex flex-col relative group hover:border-[var(--surface-3)] transition-all">
            <div className="flex justify-between items-center">
                <div className={`text-[11px] font-black ${block.color} uppercase tracking-[0.2em] flex items-center gap-2`}><i className={`fa-solid ${block.icon}`}></i> {block.label}</div>
                <button onClick={() => setExpandedMediaBlock(expandedMediaBlock === block.id ? null : block.id)} className="w-8 h-8 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-all"><i className={`fa-solid ${expandedMediaBlock === block.id ? 'fa-xmark' : 'fa-paperclip'} text-xs`}></i></button>
            </div>
            {expandedMediaBlock === block.id && (
                <div className="bg-[var(--surface-1)] p-4 rounded-2xl space-y-3 animate-fade-in border border-[var(--border-soft)]">
                    <div>
                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">{t('matchReport.specificVideo')}</label>
                        <input type="text" value={(report as any)[`${block.id}Video`]} onChange={(e) => handleChange(`${block.id}Video` as any, e.target.value)} className="w-full bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text)] focus:outline-none" placeholder={t('matchReport.videoLinkPlaceholder')} />
                        {(report as any)[`${block.id}Video`] && !isBlockedEmbed((report as any)[`${block.id}Video`]) && (
                          <div className="mt-2 aspect-video rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)]">
                            <iframe title={`${block.id}-video`} src={getEmbedUrl((report as any)[`${block.id}Video`])} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                          </div>
                        )}
                        {(report as any)[`${block.id}Video`] && (
                          <a className="text-[10px] font-black text-[var(--accent)] underline inline-block mt-2" href={(report as any)[`${block.id}Video`]} target="_blank" rel="noreferrer">
                            {t('matchReport.video.openVideoNewTab')}
                          </a>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1">{t('matchReport.document')}</label>
                        <input type="text" value={(report as any)[`${block.id}Doc`]} onChange={(e) => handleChange(`${block.id}Doc` as any, e.target.value)} className="w-full bg-[var(--surface-0)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text)] focus:outline-none" placeholder={t('matchReport.pdfLinkPlaceholder')} />
                        {(report as any)[`${block.id}Doc`] && (
                          <div className="mt-2 aspect-[4/3] rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)]">
                            <iframe title={`${block.id}-doc`} src={(report as any)[`${block.id}Doc`]} className="w-full h-full"></iframe>
                          </div>
                        )}
                        {(report as any)[`${block.id}Doc`] && (
                          <a className="text-[10px] font-black text-[var(--accent)] underline inline-block mt-2" href={(report as any)[`${block.id}Doc`]} target="_blank" rel="noreferrer">
                            {t('matchReport.video.openPdfNewTab')}
                          </a>
                        )}
                    </div>
                </div>
            )}
            <textarea value={(report as any)[`${block.id}Text`]} onChange={(e) => handleChange(`${block.id}Text` as any, e.target.value)} className="w-full flex-1 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-3xl px-5 py-5 text-xs text-[var(--text)] focus:outline-none h-64 resize-none leading-relaxed" placeholder={t('matchReport.analysisPlaceholder', { section: block.label.toLowerCase() })}></textarea>
          </div>
        ))}
      </div>

      {/* BLOQUE ABP */}
      <div className="space-y-10 mt-12">
        <div className="flex items-center justify-center">
          <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-full">{t('matchReport.abp.title')}</div>
        </div>

        {/* OFENSIVO */}
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-md">{t('matchReport.abp.offensive')}</div>
          </div>
          <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.corners')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderAbpCard(`${t('matchReport.abp.corner')} 1`, 'abpOffCornerImage', 'abpOffCornerVideo', 'abpOffCornerText')}
            {renderAbpCard(`${t('matchReport.abp.corner')} 2`, 'abpOffCorner2Image', 'abpOffCorner2Video', 'abpOffCorner2Text')}
            {renderAbpCard(`${t('matchReport.abp.corner')} 3`, 'abpOffCorner3Image', 'abpOffCorner3Video', 'abpOffCorner3Text')}
            {renderAbpCard(`${t('matchReport.abp.corner')} 4`, 'abpOffCorner4Image', 'abpOffCorner4Video', 'abpOffCorner4Text')}
          </div>
          <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] mt-4 text-[var(--text-muted)]">{t('matchReport.abp.lateralFouls')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {renderAbpCard(`${t('matchReport.abp.lateralFoul')} 1`, 'abpOffLateralImage', 'abpOffLateralVideo', 'abpOffLateralText')}
            {renderAbpCard(`${t('matchReport.abp.lateralFoul')} 2`, 'abpOffLateral2Image', 'abpOffLateral2Video', 'abpOffLateral2Text')}
          </div>
        </div>

        {/* DEFENSIVO */}
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="bg-[var(--surface-0)] border border-[var(--border-soft)] text-[var(--text-strong)] text-[9px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-md">{t('matchReport.abp.defensive')}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderAbpCard(t('matchReport.abp.corner'), 'abpDefCorner1Image', 'abpDefCorner1Video', 'abpDefCorner1Text')}
            {renderAbpCard(t('matchReport.abp.lateralFoul'), 'abpDefLateralImage', 'abpDefLateralVideo', 'abpDefLateralText')}
            {renderAbpCard(t('matchReport.abp.frontalFoul'), 'abpDefFrontalImage', 'abpDefFrontalVideo', 'abpDefFrontalText')}
          </div>
        </div>
      </div>

      {selectedRivalTeamId && (
        <div className="bg-[var(--surface-0)] p-8 rounded-[40px] border border-[var(--border-soft)] shadow-2xl space-y-6">
          <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-2">
            <i className="fa-solid fa-users text-red-500"></i> {t('sidebar.rivalTeamsLabel')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {rivalRoster.map(player => (
              <div key={player.id} className="flex items-center gap-3 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-2xl p-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-0)] flex items-center justify-center text-[var(--text-muted)] font-black text-xs shrink-0">
                  {player.foto_url ? (
                    <img src={player.foto_url} className="w-full h-full object-cover object-top" />
                  ) : (
                    <span>{player.dorsal ?? '—'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-[var(--text-strong)] truncate">{player.nombre}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{player.posicion || '—'}</p>
                </div>
              </div>
            ))}
            {rivalRoster.length === 0 && (
              <p className="col-span-full text-xs text-[var(--text-muted)]">{t('rivalTeams.noPlayers')}</p>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50"><button onClick={handleSave} className="bg-sport-primary hover:bg-sport-primary-dark text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all"><i className="fa-solid fa-floppy-disk"></i> {t('matchReport.saveReport')}</button></div>
    </div>
  );

  const renderAbpImagePreview = () => (
    abpPreviewImage ? (
      <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-6">
        <button
          onClick={() => setAbpPreviewImage(null)}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <img
          src={abpPreviewImage}
          alt="ABP Preview"
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          onClick={() => setAbpPreviewImage(null)}
        />
      </div>
    ) : null
  );

  const renderPostPartido = () => (
    <div className="animate-fade-in max-w-5xl mx-auto pb-32">
      <ActaPartidoView />
    </div>
  );

  const tabs = [
    { id: 'INFORME RIVAL', label: t('matchReport.tabs.opponentReport'), icon: 'fa-shield-heart' },
    { id: 'ÁRBITRO', label: t('matchReport.tabs.referee'), icon: 'fa-gavel' },
    { id: 'ALINEACIÓN', label: t('matchReport.tabs.lineup'), icon: 'fa-border-all' },
    { id: 'PLAN DE PARTIDO', label: t('matchReport.tabs.matchPlan'), icon: 'fa-clipboard-list' },
    { id: 'ABP', label: t('matchReport.tabs.abp'), icon: 'fa-flag' },
    { id: 'EVENTOS', label: t('matchReport.tabs.events'), icon: 'fa-video' }
  ];

  const handleChange = (field: keyof MatchReport, value: any) => { setReport(prev => ({ ...prev, [field]: value })); };

  return (
    <div className="min-h-screen flex flex-col animate-fade-in bg-[var(--bg)]">
      {renderAbpImagePreview()}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-0)] shadow-sm sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all text-[var(--text)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"><i className="fa-solid fa-chevron-left text-xs"></i></button>
          <div><h1 className="text-xs lg:text-sm font-black uppercase truncate tracking-tight text-[var(--text-strong)]">{match.localTeam} <span className="text-[var(--text-muted)] mx-1">vs</span> {match.visitorTeam}</h1><p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{match.jornada || t('matchReport.tacticalAnalysis')}</p></div>
        </div>
      </div>
      <div className="flex overflow-x-auto px-4 gap-2 scrollbar-hide border-b border-[var(--border-soft)] bg-[var(--surface-0)]">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-5 flex items-center gap-3 transition-all border-b-[4px] whitespace-nowrap ${activeTab === tab.id ? 'border-[var(--accent)] text-[var(--text-strong)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}><i className={`fa-solid ${tab.icon} text-[10px]`}></i><span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span></button>
        ))}
      </div>
      <div className={`flex-1 ${activeTab === 'EVENTOS' || activeTab === 'ALINEACIÓN' ? '' : 'p-4 lg:p-12'}`}>{activeTab === 'ALINEACIÓN' ? renderAlineacionTactiva() : activeTab === 'PLAN DE PARTIDO' ? renderPlanPartido() : activeTab === 'ABP' ? renderABP() : activeTab === 'INFORME RIVAL' ? renderInforme() : activeTab === 'ÁRBITRO' ? renderArbitro() : activeTab === 'EVENTOS' ? renderEventos() : null}</div>
    </div>
  );
};

export default MatchReportView;


