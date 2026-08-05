import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { plantillasService, equiposService, clubesService } from '@shared/services/dataService';
import type { Club, Equipo } from '@shared/services/dataService';

const FORMATIONS: Record<string, { x: number; y: number }[]> = {
  '4-4-2': [
    { x: 50, y: 88 }, { x: 18, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 82, y: 72 },
    { x: 18, y: 50 }, { x: 38, y: 52 }, { x: 62, y: 52 }, { x: 82, y: 50 },
    { x: 38, y: 26 }, { x: 62, y: 26 },
  ],
  '4-3-3': [
    { x: 50, y: 88 },
    { x: 18, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 82, y: 72 },
    { x: 30, y: 50 }, { x: 50, y: 48 }, { x: 70, y: 50 },
    { x: 20, y: 24 }, { x: 50, y: 18 }, { x: 80, y: 24 },
  ],
  '4-2-3-1': [
    { x: 50, y: 88 },
    { x: 18, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 82, y: 72 },
    { x: 38, y: 55 }, { x: 62, y: 55 },
    { x: 20, y: 36 }, { x: 50, y: 34 }, { x: 80, y: 36 },
    { x: 50, y: 18 },
  ],
  '5-3-2': [
    { x: 50, y: 88 },
    { x: 12, y: 70 }, { x: 30, y: 74 }, { x: 50, y: 76 }, { x: 70, y: 74 }, { x: 88, y: 70 },
    { x: 28, y: 50 }, { x: 50, y: 50 }, { x: 72, y: 50 },
    { x: 38, y: 24 }, { x: 62, y: 24 },
  ],
};

const MY_TEAM_COLOR = '#d32f2f';
const RIVAL_TEAM_COLOR = '#1976d2';
const MY_KEEPER_COLOR = '#e91e63';
const RIVAL_KEEPER_COLOR = '#fdd835';
const PANEL_COLORS = ['#d32f2f', '#1976d2', '#ffffff'];
const FRAME_DURATION_MS = 1200;
const FIELD_BACKGROUND = {
  backgroundColor: '#2d7a34',
  backgroundImage: [
    'radial-gradient(circle at 50% 48%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 42%, rgba(0, 0, 0, 0.10) 100%)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 0 56px, rgba(0, 0, 0, 0.08) 56px 112px)',
    'repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0 2px, transparent 2px 128px)',
  ].join(', '),
  backgroundBlendMode: 'soft-light, multiply, normal',
} as const;

interface PitchPlayer {
  id: string;
  number: number;
  team: 'my' | 'rival';
  x: number;
  y: number;
  color: string;
  playerId?: string;
  playerName?: string;
  playerInitials?: string;
}

interface SquadPlayer {
  id: string;
  nombre: string;
  apodo?: string;
  dorsal?: number;
  posicion?: string;
  fotoUrl?: string;
}

interface RivalPlayer {
  id: string;
  nombre: string;
  dorsal?: number;
}

type AssignableEntity = { id: string; nombre: string; apodo?: string };

type TeamKey = 'my' | 'rival';

interface PizarraTacticaProps {
  /** Id del club propio (currentTeam.id) — cualquier otro equipo/club se trata como rival. */
  ownClubId?: string;
}

const PizarraTactica: React.FC<PizarraTacticaProps> = ({ ownClubId }) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [myTeams, setMyTeams] = useState<(Equipo & { clubNombre?: string })[]>([]);
  const [selectedMyTeamId, setSelectedMyTeamId] = useState('');
  const [rivalPlayers, setRivalPlayers] = useState<RivalPlayer[]>([]);
  const [rivalTeams, setRivalTeams] = useState<(Equipo & { clubNombre?: string })[]>([]);
  const [rivalClubs, setRivalClubs] = useState<Club[]>([]);
  const [selectedRivalClubId, setSelectedRivalClubId] = useState('');
  const [selectedRivalTeamId, setSelectedRivalTeamId] = useState('');
  const [rivalNameInput, setRivalNameInput] = useState('');
  const [rivalDorsalInput, setRivalDorsalInput] = useState('');
  const [assignTab, setAssignTab] = useState<TeamKey>('my');
  const [selectedPitchIds, setSelectedPitchIds] = useState<string[]>([]);
  const [selectedSquadPlayerId, setSelectedSquadPlayerId] = useState<string | null>(null);
  const [selectedRivalPlayerId, setSelectedRivalPlayerId] = useState<string | null>(null);
  const [mobileTeamPanelOpen, setMobileTeamPanelOpen] = useState(false);
  const [mobileAssignPanelOpen, setMobileAssignPanelOpen] = useState(false);
  const [myFormation, setMyFormation] = useState('4-4-2');
  const [rivalFormation, setRivalFormation] = useState('4-4-2');
  const [showMyTeam, setShowMyTeam] = useState(true);
  const [showRivalTeam, setShowRivalTeam] = useState(true);
  const [showPlayerNumbers, setShowPlayerNumbers] = useState(true);
  const [playerScale, setPlayerScale] = useState(1);
  const [frames, setFrames] = useState<PitchPlayer[][]>([[]]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mode = 'Normal';
  const [myTeamColor, setMyTeamColor] = useState(MY_TEAM_COLOR);
  const [rivalTeamColor, setRivalTeamColor] = useState(RIVAL_TEAM_COLOR);
  const pitchPlayers = frames[currentFrameIndex] ?? [];
  const updatePitchPlayers = (updater: PitchPlayer[] | ((prev: PitchPlayer[]) => PitchPlayer[])) => {
    setFrames(prev => {
      const next = [...prev];
      const current = next[currentFrameIndex] ?? [];
      next[currentFrameIndex] = typeof updater === 'function' ? (updater as (prev: PitchPlayer[]) => PitchPlayer[])(current) : updater;
      return next;
    });
  };

  const draggingId = useRef<string | null>(null);
  const draggingIds = useRef<string[]>([]);
  const draggingOffset = useRef({ x: 0, y: 0 });
  const draggingStart = useRef({ x: 0, y: 0 });
  const draggingStartPercent = useRef({ x: 0, y: 0 });
  const draggingOrigin = useRef<{ x: number; y: number } | null>(null);
  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>({});
  const selectionRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const selectionBoxRef = useRef<null | { left: number; top: number; right: number; bottom: number }>(null);
  const suppressNextPitchClickRef = useRef(false);
  const dragged = useRef(false);
  const rafId = useRef<number>(0);
  const [selectionBox, setSelectionBox] = useState<null | { left: number; top: number; right: number; bottom: number }>(null);

  useEffect(() => {
    (async () => {
      try {
        const [equiposRows, plantillaRows] = await Promise.all([equiposService.list(), plantillasService.list()]);

        const myTeamsFiltered = ownClubId
          ? equiposRows.filter(e => String(e.club_id) === String(ownClubId))
          : [];

        setMyTeams(myTeamsFiltered.sort((a, b) => (a.sub_equipo || a.nombre).localeCompare(b.sub_equipo || b.nombre, 'es')));

        if (myTeamsFiltered.length > 0 && !selectedMyTeamId) {
          setSelectedMyTeamId(String(myTeamsFiltered[0].id));
        }

        setSquad(plantillaRows.map(row => ({
          id: row.id,
          nombre: row.nombre,
          apodo: row.apodo,
          dorsal: row.dorsal,
          posicion: row.posicion,
          fotoUrl: row.foto_url,
        })));
      } catch (err) {
        console.error('No se pudo cargar la plantilla', err);
      }
    })();
  }, [ownClubId]);

  useEffect(() => {
    (async () => {
      try {
        const [equiposRows, clubesRows] = await Promise.all([equiposService.list(), clubesService.list()]);
        const clubesById = new Map(clubesRows.map(c => [String(c.id), c.nombre]));
        const rivals = equiposRows
          .filter(e => !ownClubId || String(e.club_id) !== String(ownClubId))
          .map(e => ({ ...e, clubNombre: clubesById.get(String(e.club_id)) }))
          .sort((a, b) => (a.clubNombre || a.nombre).localeCompare(b.clubNombre || b.nombre, 'es'));
        setRivalTeams(rivals);

        const clubIdsConEquipos = new Set(rivals.map(r => String(r.club_id)));
        const clubs = clubesRows
          .filter(c => clubIdsConEquipos.has(String(c.id)))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        setRivalClubs(clubs);
      } catch (err) {
        console.error('No se pudieron cargar los equipos rivales', err);
      }
    })();
  }, [ownClubId]);

  const rivalTeamsForSelectedClub = useMemo(
    () => rivalTeams.filter(t => String(t.club_id) === selectedRivalClubId),
    [rivalTeams, selectedRivalClubId]
  );

  const handleSelectRivalClub = useCallback((clubId: string) => {
    setSelectedRivalClubId(clubId);
    setSelectedRivalTeamId('');
    setRivalPlayers([]);
  }, []);

  const handleSelectRivalTeam = useCallback(async (equipoId: string) => {
    setSelectedRivalTeamId(equipoId);
    if (!equipoId) return;
    try {
      const rows = await plantillasService.list({ equipo_id: equipoId });
      setRivalPlayers(rows.map(row => ({ id: row.id, nombre: row.nombre, dorsal: row.dorsal })));
    } catch (err) {
      console.error('No se pudo cargar la plantilla rival', err);
    }
  }, []);

  const buildTeamPlayers = useCallback((formation: string, team: TeamKey): PitchPlayer[] => {
    const coords = FORMATIONS[formation] || FORMATIONS['4-4-2'];
    const baseColor = team === 'my' ? myTeamColor : rivalTeamColor;
    const keeperColor = team === 'my' ? MY_KEEPER_COLOR : RIVAL_KEEPER_COLOR;

    return coords.map((pos, index) => ({
      id: `${team}-${index}`,
      number: index + 1,
      team,
      x: pos.x,
      y: team === 'rival' ? 100 - pos.y : pos.y,
      color: index === 0 ? keeperColor : baseColor,
    }));
  }, [myTeamColor, rivalTeamColor]);

  useEffect(() => {
    setFrames([[
      ...buildTeamPlayers(myFormation, 'my'),
      ...buildTeamPlayers(rivalFormation, 'rival'),
    ]]);
    setCurrentFrameIndex(0);
  }, [buildTeamPlayers, myFormation, rivalFormation, myTeamColor, rivalTeamColor]);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => {
        if (prev >= frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, FRAME_DURATION_MS);
    return () => clearInterval(interval);
  }, [isPlaying, frames.length]);

  const rectIntersects = useCallback(
    (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) =>
      !(b.left > a.right || b.right < a.left || b.top > a.bottom || b.bottom < a.top),
    []
  );

  const getPitchPercentPoint = useCallback((clientX: number, clientY: number) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const getPlayerBounds = useCallback((player: PitchPlayer) => {
    const halfSize = player.number === 1 ? 3.8 : 3.4;
    return {
      left: player.x - halfSize,
      right: player.x + halfSize,
      top: player.y - halfSize,
      bottom: player.y + halfSize,
    };
  }, []);

  const clearPitchSelection = useCallback(() => {
    setSelectedPitchIds([]);
    setSelectedSquadPlayerId(null);
    setSelectedRivalPlayerId(null);
  }, []);

  const selectPitchIds = useCallback((ids: string[]) => {
    setSelectedPitchIds(Array.from(new Set(ids)));
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent, id: string) => {
    if (isPlaying) return;
    const player = pitchPlayers.find(p => p.id === id);
    if (!player || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    draggingId.current = id;
    dragged.current = false;
    draggingStart.current = { x: event.clientX, y: event.clientY };
    draggingStartPercent.current = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
    draggingOrigin.current = { x: player.x, y: player.y };
    const nextSelectedIds = selectedPitchIds.includes(id) && selectedPitchIds.length > 1 ? selectedPitchIds : [id];
    draggingIds.current = nextSelectedIds;
    dragStartPositions.current = Object.fromEntries(
      nextSelectedIds.map(playerId => {
        const currentPlayer = pitchPlayers.find(entry => entry.id === playerId);
        return [playerId, { x: currentPlayer?.x ?? player.x, y: currentPlayer?.y ?? player.y }];
      })
    );

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    setSelectedPitchIds(nextSelectedIds);
  }, [isPlaying, pitchPlayers, selectedPitchIds]);

  const handlePitchPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || draggingId.current || isPlaying) return;
    const start = getPitchPercentPoint(e.clientX, e.clientY);
    if (!start) return;

    selectionRef.current = {
      active: true,
      startX: start.x,
      startY: start.y,
      moved: false,
    };
    draggingStart.current = { x: e.clientX, y: e.clientY };
    selectionBoxRef.current = {
      left: start.x,
      top: start.y,
      right: start.x,
      bottom: start.y,
    };
    setSelectionBox(selectionBoxRef.current);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'crosshair';
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [getPitchPercentPoint, isPlaying]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (selectionRef.current?.active && pitchRef.current) {
        const rect = pitchRef.current.getBoundingClientRect();
        const currentX = ((event.clientX - rect.left) / rect.width) * 100;
        const currentY = ((event.clientY - rect.top) / rect.height) * 100;
        const dx = event.clientX - draggingStart.current.x;
        const dy = event.clientY - draggingStart.current.y;

        if (!selectionRef.current.moved && (Math.abs(dx) >= 3 || Math.abs(dy) >= 3)) {
          selectionRef.current.moved = true;
        }

        if (!selectionRef.current.moved) return;

        const nextSelectionBox = {
          left: Math.min(selectionRef.current.startX, currentX),
          top: Math.min(selectionRef.current.startY, currentY),
          right: Math.max(selectionRef.current.startX, currentX),
          bottom: Math.max(selectionRef.current.startY, currentY),
        };
        selectionBoxRef.current = nextSelectionBox;
        setSelectionBox(nextSelectionBox);
        return;
      }

      if (!pitchRef.current || !draggingId.current) return;

      if (!dragged.current) {
        const dx = event.clientX - draggingStart.current.x;
        const dy = event.clientY - draggingStart.current.y;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        dragged.current = true;
      }

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (!pitchRef.current || !draggingId.current) return;
        const rect = pitchRef.current.getBoundingClientRect();
        const currentPercent = {
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        };
        const deltaX = currentPercent.x - draggingStartPercent.current.x;
        const deltaY = currentPercent.y - draggingStartPercent.current.y;
        const idsToMove = draggingIds.current.length > 0 ? draggingIds.current : [draggingId.current];
        updatePitchPlayers(prev => prev.map(player => {
          if (!idsToMove.includes(player.id)) return player;
          const start = dragStartPositions.current[player.id];
          if (!start) return player;
          return {
            ...player,
            x: Math.min(97, Math.max(3, start.x + deltaX)),
            y: Math.min(97, Math.max(3, start.y + deltaY)),
          };
        }));
      });
    };

    const onPointerUp = () => {
      cancelAnimationFrame(rafId.current);
      if (selectionRef.current?.active) {
        const box = selectionBoxRef.current;
        if (selectionRef.current.moved && box) {
          const selected = pitchPlayers
            .filter(player => rectIntersects(box, getPlayerBounds(player)))
            .map(player => player.id);
          selectPitchIds(selected);
          suppressNextPitchClickRef.current = true;
        } else {
          clearPitchSelection();
        }
        selectionRef.current = null;
        selectionBoxRef.current = null;
        setSelectionBox(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        return;
      }

      if (dragged.current) {
        suppressNextPitchClickRef.current = true;
      }
      draggingId.current = null;
      draggingIds.current = [];
      draggingOrigin.current = null;
      dragStartPositions.current = {};
      dragged.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [clearPitchSelection, getPlayerBounds, pitchPlayers, rectIntersects, selectPitchIds]);

  const groupedSquad = useMemo(() => {
    const buckets: Record<string, SquadPlayer[]> = {
      PORTERO: [],
      DEFENSA: [],
      MEDIO: [],
      DELANTERO: [],
    };

    squad.forEach(player => {
      const pos = (player.posicion || '').toLowerCase();
      if (pos.includes('portero')) buckets.PORTERO.push(player);
      else if (['defensa', 'lateral', 'central'].some(k => pos.includes(k))) buckets.DEFENSA.push(player);
      else if (['medio', 'pivote', 'interior', 'media punta'].some(k => pos.includes(k))) buckets.MEDIO.push(player);
      else buckets.DELANTERO.push(player);
    });

    return Object.entries(buckets).filter(([, players]) => players.length > 0);
  }, [squad]);

  const assignedPlayerIds = useMemo(() => new Set(pitchPlayers.map(player => player.playerId).filter(Boolean) as string[]), [pitchPlayers]);

  const selectedPitchId = selectedPitchIds[0] ?? null;
  const selectedPlayer = selectedPitchId ? pitchPlayers.find(p => p.id === selectedPitchId) : null;

  const assignPlayer = (player: AssignableEntity, pitchId: string = selectedPitchId ?? '') => {
    if (!pitchId) return;
    const initials = (player.apodo || player.nombre).slice(0, 2).toUpperCase();

    updatePitchPlayers(prev => prev.map(p => (
      p.id === pitchId
        ? { ...p, playerId: player.id, playerName: player.apodo || player.nombre, playerInitials: initials }
        : p
    )));
    setSelectedPitchIds([]);
    setSelectedSquadPlayerId(null);
    setSelectedRivalPlayerId(null);
  };

  const removeAssignment = (pitchId: string) => {
    updatePitchPlayers(prev => prev.map(p => (
      p.id === pitchId ? { ...p, playerId: undefined, playerName: undefined, playerInitials: undefined } : p
    )));
  };

  const addRivalPlayer = () => {
    const nombre = rivalNameInput.trim();
    if (!nombre) return;
    const dorsalValue = rivalDorsalInput.trim();
    const dorsal = dorsalValue ? Number(dorsalValue) : undefined;
    setRivalPlayers(prev => [
      ...prev,
      { id: `rival-manual-${prev.length}-${nombre}-${Math.random().toString(36).slice(2, 7)}`, nombre, dorsal },
    ]);
    setRivalNameInput('');
    setRivalDorsalInput('');
  };

  const removeRivalPlayer = (id: string) => {
    setRivalPlayers(prev => prev.filter(p => p.id !== id));
    updatePitchPlayers(prev => prev.map(p => (
      p.playerId === id ? { ...p, playerId: undefined, playerName: undefined, playerInitials: undefined } : p
    )));
    if (selectedRivalPlayerId === id) setSelectedRivalPlayerId(null);
  };

  const selectedSquadPlayer = selectedSquadPlayerId ? squad.find(p => p.id === selectedSquadPlayerId) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-800 dark:bg-[#121212] dark:text-slate-100">
      <aside className={`${mobileTeamPanelOpen ? 'flex fixed inset-0 z-60 w-full' : 'hidden'} md:flex md:static md:z-auto md:w-[290px] shrink-0 flex-col border-r border-slate-200 bg-[#f8f9fa] dark:border-white/10 dark:bg-[#121212]`}>
        <div className="flex h-[58px] items-center gap-3 border-b border-slate-200 px-5 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:border-white/10 dark:text-slate-400">
          <i className="fa-solid fa-bars text-[18px]" />
          <span>PLANTILLA</span>
          <button
            type="button"
            onClick={() => setMobileTeamPanelOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 md:hidden dark:hover:bg-white/10"
            aria-label="Cerrar panel"
          >
            <i className="fa-solid fa-xmark text-[16px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="border-l-2 border-[var(--accent)] pl-4">
            <div className="flex items-center gap-2 text-[15px] font-black uppercase tracking-[0.04em] text-slate-800 dark:text-white">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
              PIZARRA TACTICA
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-none">
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <span className="h-3 w-3 rounded-full bg-[var(--accent)]" />
                MI EQUIPO
                <button
                  type="button"
                  onClick={() => setShowMyTeam(v => !v)}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600"
                >
                  <i className={`fa-solid ${showMyTeam ? 'fa-eye' : 'fa-eye-slash'} text-[10px]`} />
                  {showMyTeam ? 'VISIBLE' : 'OCULTO'}
                </button>
              </div>

              <div className="mt-4">
                <label className="block mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Elige equipo
                </label>
                <select
                  value={selectedMyTeamId}
                  onChange={e => setSelectedMyTeamId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[15px] font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                >
                  <option value="">Selecciona tu equipo</option>
                  {myTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.sub_equipo || team.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="block mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Formación
                </label>
                <select
                  value={myFormation}
                  onChange={e => setMyFormation(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[15px] font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                >
                  {Object.keys(FORMATIONS).map(form => <option key={form} value={form}>{form}</option>)}
                </select>
              </div>

              <div className="mt-4">
                <label className="block mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  {PANEL_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setMyTeamColor(color)}
                      className={`h-9 w-9 rounded-full border-2 ${color === myTeamColor ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30' : 'border-slate-200 dark:border-white/10'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-none">
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <span className="h-3 w-3 rounded-full bg-[#1976d2]" />
                EQUIPO RIVAL
                <button
                  type="button"
                  onClick={() => setShowRivalTeam(v => !v)}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-400"
                >
                  <i className={`fa-solid ${showRivalTeam ? 'fa-eye' : 'fa-eye-slash'} text-[10px]`} />
                  {showRivalTeam ? 'VISIBLE' : 'OCULTO'}
                </button>
              </div>

              <select
                value={selectedRivalClubId}
                onChange={e => handleSelectRivalClub(e.target.value)}
                className="mt-4 w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[15px] font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
              >
                <option value="">Selecciona un club rival</option>
                {rivalClubs.map(club => (
                  <option key={club.id} value={club.id}>{club.nombre}</option>
                ))}
              </select>

              <select
                value={selectedRivalTeamId}
                onChange={e => handleSelectRivalTeam(e.target.value)}
                disabled={!selectedRivalClubId}
                className="mt-3 w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[15px] font-medium text-slate-700 outline-none disabled:opacity-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
              >
                <option value="">
                  {selectedRivalClubId ? 'Selecciona un equipo' : 'Sin plantilla rival (añadir a mano)'}
                </option>
                {rivalTeamsForSelectedClub.map(team => (
                  <option key={team.id} value={team.id}>{team.sub_equipo || team.nombre}</option>
                ))}
              </select>

              <select
                value={rivalFormation}
                onChange={e => setRivalFormation(e.target.value)}
                className="mt-4 w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[15px] font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
              >
                {Object.keys(FORMATIONS).map(form => <option key={form} value={form}>{form}</option>)}
              </select>

              <div className="mt-4 flex items-center gap-3">
                {PANEL_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setRivalTeamColor(color)}
                    className={`h-9 w-9 rounded-full border-2 ${color === rivalTeamColor ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30' : 'border-slate-200 dark:border-white/10'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowPlayerNumbers(v => !v)}
                className={`col-span-2 h-11 rounded-md border text-[12px] font-black uppercase tracking-[0.14em] transition-all ${
                  showPlayerNumbers
                    ? 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                }`}
              >
                <i className={`fa-solid ${showPlayerNumbers ? 'fa-hashtag' : 'fa-minus'} mr-2 text-[11px]`} />
                {showPlayerNumbers ? 'NÚMEROS ON' : 'NÚMEROS OFF'}
              </button>
              <button
                type="button"
                onClick={() => setPlayerScale(v => Math.max(0.85, +(v - 0.08).toFixed(2)))}
                className="h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                title="Reducir el tamaño de todos los jugadores"
              >
                <i className="fa-solid fa-magnifying-glass-minus mr-2 text-[11px]" />
                Menos
              </button>
              <button
                type="button"
                onClick={() => setPlayerScale(v => Math.min(1.45, +(v + 0.08).toFixed(2)))}
                className="h-11 rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[12px] font-black uppercase tracking-[0.14em] text-[var(--accent)]"
                title="Aumentar el tamaño de todos los jugadores"
              >
                <i className="fa-solid fa-magnifying-glass-plus mr-2 text-[11px]" />
                Más
              </button>
              <button
                type="button"
                onClick={() => setPlayerScale(1)}
                className="col-span-2 h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
                title="Restablecer tamaño de todos los jugadores"
              >
                <i className="fa-solid fa-rotate-left mr-2 text-[11px]" />
                {Math.round(playerScale * 100)}%
              </button>
              <button className="h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
                <i className="fa-solid fa-image mr-2 text-[11px]" />
                IMAGEN
              </button>
              <button className="h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
                <i className="fa-solid fa-video mr-2 text-[11px]" />
                VIDEO
              </button>
              <button className="h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
                <i className="fa-solid fa-rotate-left mr-2 text-[11px]" />
                DESHACER
              </button>
              <button className="h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
                <i className="fa-solid fa-share-nodes mr-2 text-[11px]" />
                COMPARTIR
              </button>
              <button className="col-span-2 h-11 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5">
                <i className="fa-solid fa-user mr-2 text-[11px]" />
                FOTOS JUGADORES
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => { setFrames([[]]); setCurrentFrameIndex(0); setSelectedPitchIds([]); setSelectedSquadPlayerId(null); }}
                className="h-12 rounded-md bg-[var(--accent)] text-[12px] font-black uppercase tracking-[0.16em] text-white"
              >
                <i className="fa-solid fa-square mr-2 text-[11px]" />
                RESETEAR
              </button>
              <button
                onClick={() => {
                  updatePitchPlayers(prev => prev.map(p => ({ ...p, playerId: undefined, playerName: undefined, playerInitials: undefined })));
                  setSelectedPitchIds([]);
                  setSelectedSquadPlayerId(null);
                }}
                className="h-12 rounded-md border border-slate-200 bg-white text-[12px] font-black uppercase tracking-[0.13em] text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5"
              >
                <i className="fa-solid fa-broom mr-2 text-[11px]" />
                QUITAR JUGADORES
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#121212]">
        <div className="flex h-[58px] items-center gap-2 overflow-x-auto scrollbar-hide border-b border-slate-200 px-3 md:px-4 dark:border-white/10">
          <button
            type="button"
            onClick={() => setMobileTeamPanelOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 md:hidden dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
            aria-label="Abrir panel de equipos"
          >
            <i className="fa-solid fa-bars text-[14px]" />
          </button>
          <button
            type="button"
            onClick={() => setMobileAssignPanelOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 xl:hidden dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
            aria-label="Abrir panel de asignación de jugadores"
          >
            <i className="fa-solid fa-user-group text-[14px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isPlaying && currentFrameIndex >= frames.length - 1) {
                setCurrentFrameIndex(0);
              }
              setIsPlaying(v => !v);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-white"
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-[12px]`} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--sidebar-bg)] text-white"
            onClick={() => {
              const newIndex = frames.length;
              setFrames(prev => [...prev, (prev[currentFrameIndex] ?? []).map(p => ({ ...p }))]);
              setCurrentFrameIndex(newIndex);
            }}
          >
            <i className="fa-solid fa-plus text-[12px]" />
          </button>
          <div className="flex h-8 w-[110px] shrink-0 items-center rounded-md border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-700 md:w-[170px] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            {mode}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto scrollbar-hide max-w-[140px] md:max-w-[260px]">
            {frames.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentFrameIndex(i)}
                className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-2 text-[14px] font-black transition-all ${
                  i === currentFrameIndex
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:bg-white/5'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={frames.length <= 1}
            onClick={() => {
              setFrames(prev => prev.filter((_, i) => i !== currentFrameIndex));
              setCurrentFrameIndex(prev => Math.max(0, Math.min(prev, frames.length - 2)));
            }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white transition-all ${frames.length <= 1 ? 'bg-slate-200 cursor-not-allowed dark:bg-white/10' : 'bg-[#c92525] hover:opacity-90'}`}
            title="Eliminar fotograma actual"
            aria-label="Eliminar fotograma actual"
          >
            <i className="fa-solid fa-trash-can text-[12px]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 px-4 py-3 md:px-5">
          <div className="grid h-full min-h-0 grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-h-0">
              <div
                ref={pitchRef}
                className="relative h-full min-h-[420px] md:min-h-[620px] overflow-hidden rounded-[14px] border border-slate-200 shadow-sm dark:border-white/10"
                style={FIELD_BACKGROUND}
                onPointerDown={handlePitchPointerDown}
                onClick={() => {
                  if (suppressNextPitchClickRef.current) {
                    suppressNextPitchClickRef.current = false;
                    return;
                  }
                  clearPitchSelection();
                }}
              >
                <svg
                  className="absolute inset-0 h-full w-full opacity-95"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <g fill="none" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="0.16">
                    <rect x="2.6" y="2.6" width="94.8" height="94.8" rx="1.6" />
                    <line x1="2.6" y1="50" x2="97.4" y2="50" />
                    <circle cx="50" cy="50" r="11.5" />
                    <circle cx="50" cy="50" r="0.38" fill="#ffffff" stroke="none" />
                    <circle cx="50" cy="12" r="0.38" fill="#ffffff" stroke="none" />
                    <circle cx="50" cy="88" r="0.38" fill="#ffffff" stroke="none" />
                    <rect x="37" y="2.6" width="26" height="11.5" />
                    <rect x="27" y="2.6" width="46" height="20.5" />
                    <rect x="37" y="85.9" width="26" height="11.5" />
                    <rect x="27" y="76.9" width="46" height="20.5" />
                  </g>
                </svg>

                {draggingOrigin.current && selectedPitchId && draggingIds.current.length === 1 && (() => {
                  const active = pitchPlayers.find(p => p.id === selectedPitchId);
                  if (!active) return null;
                  return (
                    <div
                      className="absolute z-[5] pointer-events-none"
                      style={{ left: `${draggingOrigin.current.x}%`, top: `${draggingOrigin.current.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="h-8 w-8 rounded-full border border-dashed border-white/35 opacity-40" style={{ backgroundColor: active.color }} />
                    </div>
                  );
                })()}

                {pitchPlayers.map(player => {
                  if ((player.team === 'my' && !showMyTeam) || (player.team === 'rival' && !showRivalTeam)) return null;
                  const isSelected = selectedPitchIds.includes(player.id);
                  const isDragging = draggingIds.current.includes(player.id);
                  const displaySize = (player.number === 1 ? 44 : 40) * playerScale;

                  return (
                    <div
                      key={player.id}
                      className="absolute select-none"
                      style={{
                        left: `${player.x}%`,
                        top: `${player.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: isDragging ? 9999 : isSelected ? 50 : 20,
                        transition: isDragging
                          ? 'none'
                          : isPlaying
                            ? `left ${FRAME_DURATION_MS}ms ease-in-out, top ${FRAME_DURATION_MS}ms ease-in-out`
                            : 'left 0.08s ease-out, top 0.08s ease-out',
                      }}
                      onPointerDown={e => {
                        e.stopPropagation();
                        handlePointerDown(e, player.id);
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        if (isPlaying) return;
                        if (suppressNextPitchClickRef.current) {
                          suppressNextPitchClickRef.current = false;
                          return;
                        }
                        const clickedPitchId = player.id;
                        setSelectedPitchIds([clickedPitchId]);
                        if (selectedSquadPlayerId && player.team === 'my') {
                          const squadPlayer = squad.find(p => p.id === selectedSquadPlayerId);
                          if (squadPlayer) assignPlayer(squadPlayer, clickedPitchId);
                        } else if (selectedRivalPlayerId && player.team === 'rival') {
                          const rivalPlayer = rivalPlayers.find(p => p.id === selectedRivalPlayerId);
                          if (rivalPlayer) assignPlayer(rivalPlayer, clickedPitchId);
                        } else {
                          setAssignTab(player.team);
                        }
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/80 px-1.5 py-1 shadow-xl"
                          style={{ bottom: `${displaySize / 2 + 8}px` }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10" onClick={e => { e.stopPropagation(); updatePitchPlayers(prev => prev.map(p => p.id === player.id ? { ...p, x: Math.max(3, p.x - 2) } : p)); }}>
                            <i className="fa-solid fa-magnifying-glass-plus text-[9px]" />
                          </button>
                          <button className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10" onClick={e => { e.stopPropagation(); updatePitchPlayers(prev => prev.map(p => p.id === player.id ? { ...p, x: Math.min(97, p.x + 2) } : p)); }}>
                            <i className="fa-solid fa-magnifying-glass-minus text-[9px]" />
                          </button>
                        </div>
                      )}

                      <div
                        className={`flex items-center justify-center rounded-full border-[3px] font-black shadow-lg ${player.number === 1 ? 'text-white' : 'text-white'} ${isSelected ? 'ring-2 ring-white/60' : ''}`}
                        style={{
                          width: displaySize,
                          height: displaySize,
                          backgroundColor: player.color,
                          borderColor: 'rgba(255,255,255,0.4)',
                          boxShadow: isDragging ? '0 14px 24px rgba(0,0,0,0.35)' : '0 8px 18px rgba(0,0,0,0.35)',
                        }}
                      >
                        {showPlayerNumbers && (
                          <span className="text-[15px] leading-none">{player.playerInitials || player.number}</span>
                        )}
                      </div>

                      {player.playerName && (
                        <div className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {player.playerName}
                        </div>
                      )}

                      {player.playerId && isSelected && (
                        <button
                          type="button"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => {
                            e.stopPropagation();
                            removeAssignment(player.id);
                          }}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#cf2227] text-[9px] text-white shadow-lg"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {selectionBox && selectionRef.current?.moved && (
                  <div
                    className="pointer-events-none absolute z-[30] rounded-md border border-dashed border-white/85 bg-white/10"
                    style={{
                      left: `${selectionBox.left}%`,
                      top: `${selectionBox.top}%`,
                      width: `${selectionBox.right - selectionBox.left}%`,
                      height: `${selectionBox.bottom - selectionBox.top}%`,
                    }}
                  />
                )}
              </div>
            </section>

            <aside className={`${mobileAssignPanelOpen ? 'flex fixed inset-0 z-60 w-full' : 'hidden'} min-h-0 xl:flex xl:static xl:z-auto xl:flex-col xl:border-l xl:border-slate-200 bg-[#f8f9fa] dark:xl:border-white/10 dark:bg-[#121212]`}>
              <div className="border-b border-slate-200 px-5 py-5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <h3 className="text-[16px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    ASIGNAR JUGADORES A PIZARRA
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMobileAssignPanelOpen(false)}
                    className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 xl:hidden dark:hover:bg-white/10"
                    aria-label="Cerrar panel"
                  >
                    <i className="fa-solid fa-xmark text-[16px]" />
                  </button>
                </div>
                <div className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-4 text-center text-[14px] leading-tight text-slate-500 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-400">
                  Pulsa un circulo y luego un jugador, o al revés
                </div>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => { setAssignTab('my'); setSelectedRivalPlayerId(null); }}
                    className={`w-full h-10 rounded-md text-[12px] font-black uppercase tracking-[0.12em] transition-all ${
                      assignTab === 'my'
                        ? 'bg-[var(--accent)] text-white'
                        : 'border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300'
                    }`}
                  >
                    MI EQUIPO
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssignTab('rival'); setSelectedSquadPlayerId(null); }}
                    className={`w-full h-10 rounded-md text-[12px] font-black uppercase tracking-[0.12em] transition-all ${
                      assignTab === 'rival'
                        ? 'bg-[#1976d2] text-white'
                        : 'border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300'
                    }`}
                  >
                    RIVAL
                  </button>
                </div>

                {assignTab === 'rival' && (
                  <div className="mt-4 space-y-3 pb-4 border-b border-slate-200 dark:border-white/10">
                    <div>
                      <label className="block mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Club Rival
                      </label>
                      <select
                        value={selectedRivalClubId}
                        onChange={e => handleSelectRivalClub(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                      >
                        <option value="">Selecciona club rival</option>
                        {rivalClubs.map(club => (
                          <option key={club.id} value={club.id}>{club.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Equipo Rival
                      </label>
                      <select
                        value={selectedRivalTeamId}
                        onChange={e => handleSelectRivalTeam(e.target.value)}
                        disabled={!selectedRivalClubId}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 outline-none disabled:opacity-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-200"
                      >
                        <option value="">
                          {selectedRivalClubId ? 'Selecciona equipo' : 'Sin plantilla rival (añadir a mano)'}
                        </option>
                        {rivalTeamsForSelectedClub.map(team => (
                          <option key={team.id} value={team.id}>{team.sub_equipo || team.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {selectedRivalTeamId && rivalPlayers.length > 0 && (
                      <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 dark:bg-blue-500/10 dark:border-blue-500/20">
                        <p className="text-[11px] font-black text-blue-700 dark:text-blue-300">
                          ✓ {rivalPlayers.length} jugadores cargados
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {assignTab === 'my' && groupedSquad.map(([groupName, players]) => (
                  <div key={groupName} className="mb-5">
                    <div className="mb-3 border-b border-slate-200 pb-2 text-[13px] font-black uppercase tracking-[0.18em] text-slate-400 dark:border-white/10 dark:text-slate-500">
                      {groupName}
                    </div>
                    <div className="space-y-4">
                      {players.map(player => {
                        const isAssigned = assignedPlayerIds.has(player.id);
                        const canAssign = !!selectedPitchId && selectedPlayer?.team === 'my' && !isAssigned;
                        return (
                          <button
                            key={player.id}
                            type="button"
                            disabled={isAssigned}
                            onClick={() => {
                              if (selectedPitchId && canAssign) {
                                assignPlayer(player);
                                return;
                              }
                              if (selectedPitchId && !canAssign) return;
                              setSelectedSquadPlayerId(prev => prev === player.id ? null : player.id);
                            }}
                            className={`flex w-full items-center gap-4 text-left transition-opacity ${isAssigned ? 'opacity-35 grayscale' : canAssign ? 'opacity-100' : 'opacity-100'} ${selectedSquadPlayerId === player.id ? 'scale-[1.01]' : ''}`}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[15px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
                              {player.dorsal ?? (player.apodo || player.nombre).slice(0, 1)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[18px] font-black text-slate-800 dark:text-white">
                                {player.apodo || player.nombre}
                              </div>
                            </div>
                            {selectedSquadPlayerId === player.id && (
                              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">SELECCIONADO</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {assignTab === 'rival' && (
                  <div>
                    <div className="mb-5 rounded-md border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#1a1a1a]">
                      <div className="mb-2 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Añadir jugador rival
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={rivalNameInput}
                          onChange={e => setRivalNameInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addRivalPlayer(); }}
                          placeholder="Nombre"
                          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-700 outline-none dark:border-white/10 dark:bg-[#121212] dark:text-slate-200"
                        />
                        <input
                          type="number"
                          value={rivalDorsalInput}
                          onChange={e => setRivalDorsalInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addRivalPlayer(); }}
                          placeholder="Dorsal"
                          className="w-20 shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-700 outline-none dark:border-white/10 dark:bg-[#121212] dark:text-slate-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addRivalPlayer}
                        disabled={!rivalNameInput.trim()}
                        className="mt-2 h-10 w-full rounded-md bg-[#1976d2] text-[12px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-40"
                      >
                        <i className="fa-solid fa-plus mr-2 text-[11px]" />
                        Añadir
                      </button>
                    </div>

                    <div className="space-y-4">
                      {rivalPlayers.map(player => {
                        const isAssigned = assignedPlayerIds.has(player.id);
                        const canAssign = !!selectedPitchId && selectedPlayer?.team === 'rival' && !isAssigned;
                        return (
                          <div key={player.id} className="flex w-full items-center gap-3">
                            <button
                              type="button"
                              disabled={isAssigned}
                              onClick={() => {
                                if (selectedPitchId && canAssign) {
                                  assignPlayer(player);
                                  return;
                                }
                                if (selectedPitchId && !canAssign) return;
                                setSelectedRivalPlayerId(prev => prev === player.id ? null : player.id);
                              }}
                              className={`flex min-w-0 flex-1 items-center gap-4 text-left transition-opacity ${isAssigned ? 'opacity-35 grayscale' : 'opacity-100'} ${selectedRivalPlayerId === player.id ? 'scale-[1.01]' : ''}`}
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[15px] font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                                {player.dorsal ?? player.nombre.slice(0, 1)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[18px] font-black text-slate-800 dark:text-white">
                                  {player.nombre}
                                </div>
                              </div>
                              {selectedRivalPlayerId === player.id && (
                                <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-[#1976d2]">SELECCIONADO</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRivalPlayer(player.id)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#cf2227] dark:hover:bg-white/10"
                              title="Quitar jugador rival"
                            >
                              <i className="fa-solid fa-trash-can text-[12px]" />
                            </button>
                          </div>
                        );
                      })}
                      {rivalPlayers.length === 0 && (
                        <div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-[13px] text-slate-400 dark:border-white/10 dark:text-slate-500">
                          Añade jugadores del rival para poder colocarlos en el campo
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PizarraTactica;
