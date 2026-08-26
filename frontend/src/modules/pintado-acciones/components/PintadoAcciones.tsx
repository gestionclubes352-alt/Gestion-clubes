import React, { useEffect, useRef, useState } from 'react';
import '../pintado-acciones.css';
import engineScriptUrl from '../lib/pintado-acciones-engine.js?url';
import { plantillasService, equiposService, pintadoAccionesTramosService } from '@shared/services/dataService';
import type { Player } from '@modules/plantilla';
import type { PintadoAccionesTramo } from '@shared/services/dataService';
import { getFFmpeg } from '@shared/utils/ffmpegClient';
import { fetchFile } from '@ffmpeg/util';

declare global {
  interface Window {
    PintadoAcciones?: {
      mount?: () => (() => void) | undefined;
      addPlayerAnnotation?: (x: number, y: number, dorsal: number, nombre: string) => void;
      getSnapshot?: (range?: { startTime?: number; endTime?: number | null }) => Record<string, unknown> | null;
      loadSnapshot?: (snapshot: Record<string, unknown>) => Promise<void>;
      getCurrentTime?: () => number;
      recordSegment?: (startTime: number, endTime: number) => Promise<Blob>;
    };
  }
}

interface PintadoAccionesProps {
  ownClubId?: string;
  ownEquipoId?: string;
}

/**
 * Portado desde el proyecto original "Pintado de acciones"
 * (https://github.com/ilandaleioa/Pintado-acciones). El motor de dibujo
 * (canvas, herramientas, YouTube) se mantiene casi intacto en
 * `lib/pintado-acciones-engine.js` y se monta/desmonta vía
 * `window.PintadoAcciones.mount()` para no reescribir 2800+ líneas de
 * lógica probada. Este componente solo aporta el markup y el ciclo de vida.
 */
export default function PintadoAcciones({ ownClubId, ownEquipoId: propsOwnEquipoId }: PintadoAccionesProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [squad, setSquad] = useState<Player[]>([]);
  const [loadingSquad, setLoadingSquad] = useState(false);
  const [ownEquipoId, setOwnEquipoId] = useState<string>('');
  const [equipos, setEquipos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [selectedEquipoId, setSelectedEquipoId] = useState<string>('');
  const [selectedPlayerForInsertion, setSelectedPlayerForInsertion] = useState<Player | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const [tramos, setTramos] = useState<PintadoAccionesTramo[]>([]);
  const [selectedTramoId, setSelectedTramoId] = useState<string>('');
  const [isSavingTramo, setIsSavingTramo] = useState(false);
  const [isLoadingTramo, setIsLoadingTramo] = useState(false);
  const [isRecordingTramo, setIsRecordingTramo] = useState(false);
  const [isDownloadingTramo, setIsDownloadingTramo] = useState(false);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Obtener los equipos del club actual
  useEffect(() => {
    if (!ownClubId) return;

    (async () => {
      try {
        const equiposList = await equiposService.list({ club_id: ownClubId });
        if (equiposList && equiposList.length > 0) {
          // Guardar lista de equipos para el filtro
          setEquipos(equiposList.map((e: any) => ({ id: e.id, nombre: e.sub_equipo || e.nombre })));
          // Seleccionar el primer equipo como predeterminado
          setOwnEquipoId(equiposList[0].id);
          setSelectedEquipoId(equiposList[0].id);
        }
      } catch (err) {
        console.error('Error cargando equipos:', err);
      }
    })();
  }, [ownClubId]);

  // Cargar jugadores del equipo seleccionado
  useEffect(() => {
    const equipoId = propsOwnEquipoId || selectedEquipoId;
    if (!equipoId) return;

    (async () => {
      try {
        setLoadingSquad(true);
        const rows = await plantillasService.list({ equipo_id: equipoId });
        const mapped: Player[] = rows.map((p): Player => ({
          id: p.id,
          fotoUrl: p.foto_url || '',
          competicion: '',
          club: '',
          equipo: '',
          dorsal: p.dorsal ?? 0,
          nombre: p.nombre,
          apodo: p.apodo,
          posicion: p.posicion,
          posicionJuego: p.posicion_juego || '',
          perfil: (p.perfil || 'D') as Player['perfil'],
          estado: p.estado,
        }));
        setSquad(mapped.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)));
      } catch (err) {
        console.error('Error cargando plantilla:', err);
      } finally {
        setLoadingSquad(false);
      }
    })();
  }, [propsOwnEquipoId, selectedEquipoId]);

  const refreshTramos = async (equipoId: string) => {
    try {
      const rows = await pintadoAccionesTramosService.list({ equipo_id: equipoId });
      setTramos(rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')));
    } catch (err) {
      console.error('Error cargando tramos guardados:', err);
    }
  };

  // Cargar tramos guardados del equipo seleccionado
  useEffect(() => {
    const equipoId = propsOwnEquipoId || selectedEquipoId;
    if (!equipoId) return;
    refreshTramos(equipoId);
  }, [propsOwnEquipoId, selectedEquipoId]);

  const handleStartRecording = () => {
    if (!window.PintadoAcciones?.getCurrentTime) {
      alert('Carga un video de YouTube antes de grabar un tramo.');
      return;
    }
    recordingStartTimeRef.current = window.PintadoAcciones.getCurrentTime();
    setIsRecordingTramo(true);
  };

  const handleStopRecording = async () => {
    const equipoId = propsOwnEquipoId || selectedEquipoId;
    if (!equipoId) {
      alert('Selecciona primero un equipo para poder guardar el tramo.');
      setIsRecordingTramo(false);
      return;
    }

    const startTime = recordingStartTimeRef.current ?? 0;
    const endTime = window.PintadoAcciones?.getCurrentTime?.() ?? startTime;
    setIsRecordingTramo(false);
    recordingStartTimeRef.current = null;

    const snapshot = window.PintadoAcciones?.getSnapshot?.({
      startTime: Math.min(startTime, endTime),
      endTime: Math.max(startTime, endTime),
    });
    if (!snapshot) {
      alert('Carga un video de YouTube y dibuja sobre él antes de guardar un tramo.');
      return;
    }

    const nombre = window.prompt('Nombre del tramo:', '')?.trim();
    if (!nombre) return;

    setIsSavingTramo(true);
    try {
      const created = await pintadoAccionesTramosService.create({ equipo_id: equipoId, nombre, datos: snapshot });
      setSelectedTramoId(created.id);
      await refreshTramos(equipoId);
    } catch (err) {
      console.error('No se pudo guardar el tramo', err);
      alert('No se pudo guardar el tramo. Inténtalo de nuevo.');
    } finally {
      setIsSavingTramo(false);
    }
  };

  const handleLoadTramo = async (tramoId: string) => {
    setSelectedTramoId(tramoId);
    if (!tramoId) return;
    const tramo = tramos.find((t) => t.id === tramoId);
    if (!tramo) return;

    setIsLoadingTramo(true);
    try {
      await window.PintadoAcciones?.loadSnapshot?.(tramo.datos);
    } catch (err) {
      console.error('No se pudo cargar el tramo', err);
      alert('No se pudo cargar el tramo. Inténtalo de nuevo.');
    } finally {
      setIsLoadingTramo(false);
    }
  };

  const handleDeleteTramo = async () => {
    if (!selectedTramoId) return;
    const tramo = tramos.find((t) => t.id === selectedTramoId);
    if (!tramo) return;
    if (!window.confirm(`¿Eliminar el tramo "${tramo.nombre}"?`)) return;

    try {
      await pintadoAccionesTramosService.remove(tramo.id);
      setSelectedTramoId('');
      const equipoId = propsOwnEquipoId || selectedEquipoId;
      if (equipoId) await refreshTramos(equipoId);
    } catch (err) {
      console.error('No se pudo eliminar el tramo', err);
      alert('No se pudo eliminar el tramo. Inténtalo de nuevo.');
    }
  };

  const handleDownloadTramo = async () => {
    if (!selectedTramoId) return;
    const tramo = tramos.find((t) => t.id === selectedTramoId);
    if (!tramo) return;

    const datos = tramo.datos as { startTime?: number; endTime?: number };
    const startTime = Number(datos?.startTime ?? 0);
    const endTime = Number(datos?.endTime);
    if (!Number.isFinite(endTime) || endTime <= startTime) {
      alert('Este tramo no tiene un rango de tiempo válido para descargar.');
      return;
    }

    setIsDownloadingTramo(true);
    try {
      // Aseguramos que el video y las anotaciones del tramo están cargados antes de grabar.
      await window.PintadoAcciones?.loadSnapshot?.(tramo.datos);
      const webmBlob = await window.PintadoAcciones?.recordSegment?.(startTime, endTime);
      if (!webmBlob) return;

      const safeName = tramo.nombre.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();

      try {
        const ffmpeg = await getFFmpeg();
        await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
        await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', 'output.mp4']);
        const data = await ffmpeg.readFile('output.mp4');
        const mp4Blob = new Blob([data as BlobPart], { type: 'video/mp4' });
        const url = URL.createObjectURL(mp4Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tramo-${safeName}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        await ffmpeg.deleteFile('input.webm');
        await ffmpeg.deleteFile('output.mp4');
      } catch (err) {
        console.error('Error convirtiendo a MP4, se descarga en WEBM:', err);
        const url = URL.createObjectURL(webmBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tramo-${safeName}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('No se pudo descargar el tramo', err);
      alert(err instanceof Error ? err.message : 'No se pudo descargar el tramo. Inténtalo de nuevo.');
    } finally {
      setIsDownloadingTramo(false);
    }
  };

  // Manejar inserción de jugador al hacer clic en el canvas
  useEffect(() => {
    if (!selectedPlayerForInsertion) return;

    const canvas = document.getElementById('annotationCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Insertar el jugador como anotación del motor (círculo con dorsal + nombre),
      // para que quede registrada, se redibuje correctamente y se pueda mover.
      window.PintadoAcciones?.addPlayerAnnotation?.(
        x,
        y,
        selectedPlayerForInsertion.dorsal,
        selectedPlayerForInsertion.nombre
      );

      // Deseleccionar el jugador después de la inserción
      setSelectedPlayerForInsertion(null);
    };

    canvas.addEventListener('click', handleCanvasClick);
    canvas.style.cursor = 'crosshair';

    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.style.cursor = 'default';
    };
  }, [selectedPlayerForInsertion]);

  useEffect(() => {
    let destroy: (() => void) | undefined;
    let cancelled = false;

    const script = document.createElement('script');
    script.src = engineScriptUrl;
    script.async = true;
    script.onload = () => {
      if (cancelled) return;
      destroy = window.PintadoAcciones?.mount?.();

      // Agregar manejador de pantalla completa
      const fullscreenBtn = document.getElementById('fullscreenToggle');
      const stagePanel = document.querySelector('.stage-panel');
      if (fullscreenBtn && stagePanel) {
        fullscreenBtn.addEventListener('click', async () => {
          try {
            if (!document.fullscreenElement) {
              await stagePanel.requestFullscreen();
              fullscreenBtn.classList.add('is-fullscreen');
            } else {
              await document.exitFullscreen();
              fullscreenBtn.classList.remove('is-fullscreen');
            }
          } catch (error) {
            console.error('Error al cambiar pantalla completa:', error);
          }
        });

        // Actualizar estado del botón cuando cambia el estado de pantalla completa
        document.addEventListener('fullscreenchange', () => {
          if (document.fullscreenElement) {
            fullscreenBtn.classList.add('is-fullscreen');
          } else {
            fullscreenBtn.classList.remove('is-fullscreen');
          }
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      destroy?.();
      script.remove();
    };
  }, []);

  return (
    <div className="pintado-acciones-app" ref={rootRef}>
      <div className="app-shell">
        <header className="topbar">
          <div className="source-panel" data-collapsible>
            <button
              className="mobile-collapse-toggle"
              type="button"
              data-collapse-toggle
              aria-expanded="false"
              aria-controls="sourcePanelBody"
            >
              <span className="mobile-collapse-title">Cargar imagen o video</span>
              <span className="mobile-collapse-summary">Toca para abrir</span>
            </button>
            <div id="sourcePanelBody" className="mobile-collapse-body">
              <label className="input-group">
                <span>URL de YouTube</span>
                <input id="youtubeUrl" type="text" placeholder="Añade URL de YouTube" />
              </label>
              <button id="loadYoutube" className="primary">Cargar video</button>
              <label className="upload-button">
                <input id="imageUpload" type="file" accept="image/*" />
                Sube una imagen
              </label>
            </div>
          </div>
          <div className="topbar-title">PINTADO DE ACCIONES</div>
        </header>

        <main className="workspace">
          {/* Panel izquierdo: Estilo y Acciones */}
          <aside className="left-panel" data-collapsible>
            <button
              className="mobile-collapse-toggle"
              type="button"
              data-collapse-toggle
              aria-expanded="false"
              aria-controls="leftPanelBody"
            >
              <span className="mobile-collapse-title">Ajustes y dorsales</span>
              <span className="mobile-collapse-summary">Toca para abrir</span>
            </button>
            <div id="leftPanelBody" className="mobile-collapse-body">
              <section className="panel-block">
                <h2>Estilo</h2>
                <label className="field">
                  <span>Color principal</span>
                  <input id="strokeColor" type="color" defaultValue="#dd145f" />
                </label>
                <label className="field">
                  <span>Relleno</span>
                  <input id="fillColor" type="color" defaultValue="#17307a" />
                </label>
                <label className="field">
                  <span>Grosor</span>
                  <input id="lineWidth" type="range" min="1" max="14" defaultValue="4" />
                </label>
                <label className="field">
                  <span>Tamaño <strong id="sizeValue">100%</strong></span>
                  <input id="sizeControl" type="range" min="50" max="200" defaultValue="100" />
                </label>
                <label className="field">
                  <span>Transparencia <strong id="opacityValue">100%</strong></span>
                  <input id="opacityControl" type="range" min="0" max="100" defaultValue="100" />
                </label>
              </section>

              <section className="panel-block">
                <div className="number-palette" aria-label="Numeros del 1 al 11">
                  <div className="number-palette-header"><span>Números</span></div>
                  <div className="number-grid">
                    {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
                      <button key={n} className="number-chip quick-insert-chip" type="button" data-insert-text={n}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Sección de Jugadores */}
              <section className="panel-block">
                <div className="panel-block-header">
                  <h2>Jugadores</h2>
                  <button
                    type="button"
                    className="toggle-players-button"
                    onClick={() => setShowPlayers((prev) => !prev)}
                    aria-expanded={showPlayers}
                    title={showPlayers ? 'Ocultar jugadores' : 'Mostrar jugadores'}
                  >
                    {showPlayers ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {showPlayers && (
                  <>
                    {equipos.length > 0 && (
                      <div className="equipo-selector">
                        <label htmlFor="equipoSelect" className="equipo-label">Equipo:</label>
                        <select
                          id="equipoSelect"
                          className="equipo-select"
                          value={selectedEquipoId}
                          onChange={(e) => setSelectedEquipoId(e.target.value)}
                        >
                          {equipos.map((equipo) => (
                            <option key={equipo.id} value={equipo.id}>
                              {equipo.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {loadingSquad ? (
                      <p className="text-sm text-gray-500 text-center py-2">Cargando jugadores...</p>
                    ) : squad.length > 0 ? (
                      <div className="players-grid">
                        {squad.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            className={`player-chip ${selectedPlayerForInsertion?.id === player.id ? 'is-selected' : ''}`}
                            onClick={() => setSelectedPlayerForInsertion(selectedPlayerForInsertion?.id === player.id ? null : player)}
                            title={selectedPlayerForInsertion?.id === player.id ? `Clic en el campo para insertar ${player.nombre}` : `Clic para insertar ${player.nombre} en el campo`}
                          >
                            <span className="dorsal">{player.dorsal}</span>
                            <span className="nombre">{player.nombre}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">No hay jugadores disponibles</p>
                    )}
                  </>
                )}
              </section>

              {/* Sección de Tramos guardados */}
              <section className="panel-block">
                <h2>Tramos guardados</h2>
                <label className="field">
                  <span>Selecciona un tramo</span>
                  <select
                    value={selectedTramoId}
                    onChange={(e) => handleLoadTramo(e.target.value)}
                    disabled={isLoadingTramo || isRecordingTramo || tramos.length === 0}
                  >
                    <option value="">
                      {tramos.length === 0 ? 'No hay tramos guardados' : 'Elegir tramo...'}
                    </option>
                    {tramos.map((tramo) => (
                      <option key={tramo.id} value={tramo.id}>
                        {tramo.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="tramo-actions">
                  {!isRecordingTramo ? (
                    <button
                      type="button"
                      className="primary record-tramo-button"
                      onClick={handleStartRecording}
                      disabled={isSavingTramo}
                    >
                      <span className="record-tramo-icon record-tramo-icon-play" aria-hidden="true" />
                      GRABAR TRAMO
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="record-tramo-button is-recording"
                      onClick={handleStopRecording}
                      disabled={isSavingTramo}
                    >
                      <span className="record-tramo-icon record-tramo-icon-stop" aria-hidden="true" />
                      {isSavingTramo ? 'Guardando...' : 'STOP'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDeleteTramo}
                    disabled={!selectedTramoId || isRecordingTramo}
                  >
                    Eliminar tramo
                  </button>
                </div>
                <div className="tramo-actions">
                  <button
                    type="button"
                    onClick={handleDownloadTramo}
                    disabled={!selectedTramoId || isRecordingTramo || isDownloadingTramo}
                    title="Descarga el tramo como video MP4 con las anotaciones incrustadas"
                  >
                    {isDownloadingTramo ? 'Generando MP4...' : 'Descargar tramo (MP4)'}
                  </button>
                </div>
              </section>

            </div>
          </aside>

          {/* Panel central: lienzo */}
          <section className="stage-panel">
            <div className="stage-title-container">
              <h1 className="stage-title">PINTADO DE ACCIONES</h1>
            </div>
            <div id="stageToolbarPanel" className="stage-toolbar">
              <div className="mode-pill">
                <span className="mode-label">Fuente: <strong id="sourceLabel">YouTube</strong></span>
                <button id="fullscreenToggle" type="button" className="stage-action-button" title="Pantalla completa">
                  <span className="stage-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m16 0V5a2 2 0 0 0-2-2h-3m0 16h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                  </span>
                  <span className="stage-action-text">Pantalla completa</span>
                </button>
                <button id="toggleDrawMode" type="button" className="stage-action-button">
                  <span className="stage-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 16.5 15.5 5l3.5 3.5L7.5 20H4z"></path>
                      <path d="M13.5 7l3.5 3.5"></path>
                    </svg>
                  </span>
                  <span className="stage-action-text">MODO REPRODUCIR</span>
                </button>
                <button id="undoAction" type="button" className="stage-action-button">
                  <span className="stage-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 7 4 12l5 5"></path>
                      <path d="M5 12h8a5 5 0 0 1 0 10h-2"></path>
                    </svg>
                  </span>
                  <span className="stage-action-text">Deshacer</span>
                </button>
                <button id="clearToolbar" type="button" className="stage-action-button">
                  <span className="stage-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 7h14"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"></path>
                      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"></path>
                    </svg>
                  </span>
                  <span className="stage-action-text">Limpiar</span>
                </button>
                <button id="freezeHint" type="button" className="stage-action-button">
                  <span className="stage-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 3v12"></path>
                      <path d="m7 10 5 5 5-5"></path>
                      <path d="M5 19h14"></path>
                    </svg>
                  </span>
                  <span className="stage-action-text">Exportar PNG</span>
                </button>
              </div>
              <p id="statusText" className="hidden"></p>
            </div>

            <div id="stage" className="stage">
              <div id="connectorEscHint" className="connector-esc-hint hidden">Doble clic para terminar</div>
              <button
                id="stageToolbarToggle"
                className="stage-toolbar-toggle"
                type="button"
                aria-expanded="false"
                aria-controls="stageToolbarPanel"
              >
                <span className="stage-toolbar-toggle-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 7h16"></path>
                    <path d="M4 12h16"></path>
                    <path d="M4 17h16"></path>
                  </svg>
                </span>
                <span className="stage-toolbar-toggle-text">Acciones</span>
              </button>
              <div id="youtubePlayer" className="media-layer is-visible"></div>
              <img id="backgroundImage" className="media-layer" alt="Fotograma congelado" />
              <canvas id="annotationCanvas"></canvas>
            </div>

            <div className="playback-panel">
              <button id="seekBackward" type="button" className="playback-skip-btn" aria-label="Retroceder 5 segundos" title="Retroceder 5 segundos">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 17V7l-7 5 7 5z"></path>
                  <path d="M20 17V7l-7 5 7 5z"></path>
                </svg>
                <span>5</span>
              </button>
              <button id="togglePlayback" type="button" className="playback-play-btn">
                <span className="playback-play-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z"></path>
                  </svg>
                </span>
                <span>Reproducir</span>
              </button>
              <button id="seekForward" type="button" className="playback-skip-btn" aria-label="Avanzar 5 segundos" title="Avanzar 5 segundos">
                <span>5</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 17V7l7 5-7 5z"></path>
                  <path d="M13 17V7l7 5-7 5z"></path>
                </svg>
              </button>
              <input
                id="timelineSeek"
                type="range"
                min="0"
                max="1000"
                defaultValue="0"
                step="1"
                className="playback-seek"
                aria-label="Línea de tiempo"
              />
              <span id="timeDisplay" className="playback-time">00:00 / 00:00</span>
            </div>
          </section>

          {/* Panel derecho: Herramientas */}
          <aside className="tool-panel">
            <section className="panel-block">
              <h2>Herramientas</h2>
              <div className="tool-rail">
                {/* FLECHAS */}
                <div className="tool-divider"><span className="tool-divider-dot"></span>FLECHAS</div>
                <div className="tool-grid">
                  <button className="tool-button" data-tool="arrow" aria-label="Flecha" title="Flecha">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 18 Q4 6 18 6"></path>
                      <path d="M14.5 3.5 L18 6 L14.5 8.5"></path>
                    </svg>
                  </button>
                  <button className="tool-button" data-tool="arrowStraight" aria-label="Flecha recta" title="Flecha recta">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4.5 16.5c4.5-3.8 8.9-6.3 14.2-6.3"></path>
                      <path d="M15.6 7.4l3.2 2.8-2.2 3.6"></path>
                    </svg>
                  </button>
                  <button className="tool-button is-active" data-tool="pen" aria-label="Dibujo libre" title="Dibujo libre">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 15 C5 9, 8 9, 11 15 C14 21, 17 21, 21 15" strokeWidth="2" strokeLinecap="round"></path>
                      <path d="M3 10 C5 4, 8 4, 11 10 C14 16, 17 16, 21 10" opacity="0.4" strokeWidth="1.2" strokeLinecap="round"></path>
                    </svg>
                  </button>
                  <button className="tool-button" data-tool="text" aria-label="Texto" title="Texto">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 8h6"></path>
                      <path d="M8 8v9"></path>
                      <path d="M13.5 15.5c0-1.4 1-2.5 2.5-2.5s2.5 1.1 2.5 2.5v1.8"></path>
                      <path d="M18.5 17.3c-.7.7-1.4 1-2.4 1-1.6 0-2.6-1-2.6-2.3 0-1.2.9-2.1 2.5-2.1h2.4"></path>
                    </svg>
                    <span className="tool-label">Texto</span>
                  </button>
                </div>

                {/* TEXTOS */}
                <div className="tool-divider"><span className="tool-divider-dot"></span>TEXTOS</div>
                <div className="tool-grid tool-grid-2col">
                  <button className="tool-button" data-tool="callout" aria-label="Etiqueta" title="Etiqueta">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 7h8l2 2v7l-6 1.5-4-4V7z"></path>
                      <circle className="solid" cx="14.5" cy="9.5" r="1"></circle>
                    </svg>
                    <span className="tool-label">Etiqueta</span>
                  </button>
                </div>

                {/* ZONAS */}
                <div className="tool-divider"><span className="tool-divider-dot"></span>ZONAS</div>
                <div className="tool-grid">
                  <button className="tool-button" data-tool="rect" aria-label="Rectangulo" title="Rectangulo">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="5.5" y="6" width="13" height="10.5" rx="1.5"></rect>
                      <path d="M8 14l2.5-3 2.2 2.4 2.1-2.6 1.7 3.2"></path>
                    </svg>
                    <span className="tool-label">Recta.</span>
                  </button>
                  <button className="tool-button" data-tool="ellipse" aria-label="Circulo" title="Circulo">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="11" cy="11" r="5"></circle>
                      <path d="M14.7 14.7L18 18"></path>
                    </svg>
                    <span className="tool-label">Circulo</span>
                  </button>
                  <button className="tool-button" data-tool="zone" aria-label="Zona" title="Zona">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <ellipse cx="12" cy="12" rx="8" ry="4.8"></ellipse>
                      <path d="M12 7.2v9.6"></path>
                      <path d="M13 16.8c2.1-.2 3.9-.7 5.5-1.6"></path>
                    </svg>
                    <span className="tool-label">Zona</span>
                  </button>
                </div>

                <div className="variant-picker hidden" id="focusStylePicker">
                  <button className="variant-button" type="button" data-focus-style="abierto">
                    <svg viewBox="0 0 44 130" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <defs>
                        <linearGradient id="coneGrad1" x1="50%" y1="0%" x2="50%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#cccccc', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#444444', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <polygon points="22,5 2,120 42,120" fill="url(#coneGrad1)" stroke="#999" strokeWidth="0.3"></polygon>
                      <ellipse cx="22" cy="120" rx="20" ry="5" fill="none" stroke="#888" strokeWidth="0.5"></ellipse>
                      <path d="M 8 120 Q 22 125 36 120" stroke="#aaa" strokeWidth="0.5" fill="none"></path>
                    </svg>
                    <span>Abierto</span>
                  </button>
                  <button className="variant-button" type="button" data-focus-style="estrecho">
                    <svg viewBox="0 0 44 130" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <defs>
                        <linearGradient id="coneGrad2" x1="50%" y1="0%" x2="50%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#e0e0e0', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#505050', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <polygon points="22,5 10,120 34,120" fill="url(#coneGrad2)" stroke="#999" strokeWidth="0.3"></polygon>
                      <ellipse cx="22" cy="120" rx="12" ry="4" fill="none" stroke="#888" strokeWidth="0.5"></ellipse>
                      <path d="M 14 120 Q 22 123 30 120" stroke="#aaa" strokeWidth="0.5" fill="none"></path>
                    </svg>
                    <span>Estrecho</span>
                  </button>
                  <button className="variant-button is-active" type="button" data-focus-style="cilindrico">
                    <svg viewBox="0 0 44 130" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <defs>
                        <linearGradient id="cylGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" style={{ stopColor: '#999999', stopOpacity: 1 }} />
                          <stop offset="50%" style={{ stopColor: '#cccccc', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#888888', stopOpacity: 1 }} />
                        </linearGradient>
                        <linearGradient id="cylGradV" x1="50%" y1="0%" x2="50%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#e0e0e0', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#505050', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <ellipse cx="22" cy="8" rx="10" ry="3" fill="#d0d0d0" stroke="#999" strokeWidth="0.5"></ellipse>
                      <rect x="12" y="8" width="20" height="108" fill="url(#cylGradV)" stroke="#999" strokeWidth="0.3"></rect>
                      <ellipse cx="22" cy="116" rx="11" ry="2.6" fill="#fff"></ellipse>
                      <path d="M 12.5 115.7 Q 22 113.9 31.5 115.7" stroke="#a24a6b" strokeWidth="0.55" fill="none"></path>
                    </svg>
                    <span>Cilíndrico</span>
                  </button>
                </div>

                {/* VARIOS */}
                <div className="tool-divider"><span className="tool-divider-dot"></span>VARIOS</div>
                <div className="tool-grid">
                  <button className="tool-button" data-tool="move" aria-label="Mover" title="Mover">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 4v16"></path>
                      <path d="M4 12h16"></path>
                      <path d="M12 4l-2.3 2.3"></path>
                      <path d="M12 4l2.3 2.3"></path>
                      <path d="M12 20l-2.3-2.3"></path>
                      <path d="M12 20l2.3-2.3"></path>
                      <path d="M4 12l2.3-2.3"></path>
                      <path d="M4 12l2.3 2.3"></path>
                      <path d="M20 12l-2.3-2.3"></path>
                      <path d="M20 12l-2.3 2.3"></path>
                    </svg>
                    <span className="tool-label">Mover</span>
                  </button>
                  <button id="deleteAnnotation" className="tool-button" type="button" aria-label="Papelera" title="Eliminar seleccion">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"></path>
                      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"></path>
                    </svg>
                    <span className="tool-label">Papelera</span>
                  </button>
                  <button
                    className="tool-button"
                    data-tool="connector"
                    aria-label="Conector"
                    title="Conector (clic para añadir puntos, doble clic para terminar)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="solid" cx="4.5" cy="17" r="2"></circle>
                      <circle className="solid" cx="12" cy="7" r="2"></circle>
                      <circle className="solid" cx="19.5" cy="17" r="2"></circle>
                      <line x1="4.5" y1="17" x2="12" y2="7"></line>
                      <line x1="12" y1="7" x2="19.5" y2="17"></line>
                    </svg>
                    <span className="tool-label">Conector</span>
                  </button>
                  <button className="tool-button" data-tool="focus" aria-label="Foco" title="Foco">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 4 6.5 19"></path>
                      <path d="M12 4 17.5 19"></path>
                      <path d="M8.5 16.8c2.1 1.1 4.9 1.1 7 0"></path>
                      <path d="M7.4 19h9.2"></path>
                    </svg>
                    <span className="tool-label">Foco</span>
                  </button>
                  <button className="tool-button" data-tool="triangleZone" aria-label="Triangulo tactico" title="Triangulo tactico">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 17L11 7l8 9z"></path>
                      <path d="M8 15l5-6"></path>
                      <path d="M11 17l6-7"></path>
                      <circle className="solid" cx="5" cy="17" r="1.4"></circle>
                      <circle className="solid" cx="11" cy="7" r="1.4"></circle>
                      <circle className="solid" cx="19" cy="16" r="1.4"></circle>
                    </svg>
                    <span className="tool-label">Triangulo</span>
                  </button>
                </div>

                {/* SEGUIMIENTO DEL FOCO */}
                <div className="tool-divider"><span className="tool-divider-dot"></span>SEGUIMIENTO DEL FOCO</div>
                <div className="focus-follow-controls">
                  <button id="focusFollowKeyframe" type="button" className="stage-action-button" title="Fija la posicion actual del foco seleccionado en este instante del video">
                    Fijar posicion aqui
                  </button>
                  <button id="focusFollowEnd" type="button" className="stage-action-button" title="El foco desaparecera a partir de este instante del video">
                    Terminar seguimiento aqui
                  </button>
                  <p className="focus-follow-hint">
                    Selecciona un foco, pausa el video en distintos momentos, coloca el foco sobre el jugador y pulsa
                    &quot;Fijar posicion aqui&quot; en cada uno. El foco solo aparecera a partir del primer instante fijado, y
                    seguira esa trayectoria al reproducir. Cuando quieras que deje de seguir al jugador, pausa en ese
                    momento y pulsa &quot;Terminar seguimiento aqui&quot; para que desaparezca a partir de ahi.
                  </p>
                </div>
              </div>
            </section>

          </aside>
        </main>
      </div>
    </div>
  );
}
