import React, { useEffect, useRef } from 'react';
import '../pintado-acciones.css';
import engineScriptUrl from '../lib/pintado-acciones-engine.js?url';
import { initializeABPLoader } from '../lib/abp-loader';

declare global {
  interface Window {
    PintadoAcciones?: {
      mount?: () => (() => void) | undefined;
    };
  }
}

/**
 * Portado desde el proyecto original "Pintado de acciones"
 * (https://github.com/ilandaleioa/Pintado-acciones). El motor de dibujo
 * (canvas, herramientas, YouTube) se mantiene casi intacto en
 * `lib/pintado-acciones-engine.js` y se monta/desmonta vía
 * `window.PintadoAcciones.mount()` para no reescribir 2800+ líneas de
 * lógica probada. Este componente solo aporta el markup y el ciclo de vida.
 */
export default function PintadoAcciones() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroy: (() => void) | undefined;
    let cancelled = false;

    const script = document.createElement('script');
    script.src = engineScriptUrl;
    script.async = true;
    script.onload = () => {
      if (cancelled) return;
      destroy = window.PintadoAcciones?.mount?.();

      // Inicializar ABP loader después de montar el motor principal
      // Esperar más tiempo para asegurar que todos los elementos estén listos
      setTimeout(() => {
        try {
          initializeABPLoader();
        } catch (error) {
          console.error('Error inicializando ABP Loader:', error);
        }
      }, 500);

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
                  <div className="number-palette-header"><span>Dorsales</span></div>
                  <div className="number-grid">
                    {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
                      <button key={n} className="number-chip quick-insert-chip" type="button" data-insert-text={n}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="panel-block">
                <h2>ABP</h2>
                <div className="abp-buttons">
                  <button
                    id="loadAtaque"
                    className="abp-button abp-ataque"
                    type="button"
                    title="Cargar campo de ataque en el canvas"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="2" y="3" width="20" height="14" rx="1" ry="1"></rect>
                      <path d="M12 3v14"></path>
                      <path d="M2 10h20"></path>
                      <circle cx="8" cy="8" r="1.5" fill="currentColor"></circle>
                      <circle cx="16" cy="12" r="1.5" fill="currentColor"></circle>
                    </svg>
                    <span>Ataque</span>
                  </button>
                  <button
                    id="loadDefensa"
                    className="abp-button abp-defensa"
                    type="button"
                    title="Cargar campo de defensa en el canvas"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="2" y="3" width="20" height="14" rx="1" ry="1"></rect>
                      <path d="M12 3v14"></path>
                      <path d="M2 10h20"></path>
                      <circle cx="8" cy="16" r="1.5" fill="currentColor"></circle>
                      <circle cx="16" cy="12" r="1.5" fill="currentColor"></circle>
                    </svg>
                    <span>Defensa</span>
                  </button>
                </div>
              </section>
            </div>
          </aside>

          {/* Panel central: lienzo */}
          <section className="stage-panel">
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
                <button id="captureFrame" type="button" className="stage-action-button">
                  <span className="stage-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                      <circle cx="12" cy="13" r="3"></circle>
                    </svg>
                  </span>
                  <span className="stage-action-text">Congelar</span>
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
                <button id="tutorialBtn" type="button" className="stage-action-button">
                  <span className="stage-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </span>
                  <span className="stage-action-text">Tutorial</span>
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
              <button id="togglePlayback" type="button" className="playback-play-btn">
                <span className="playback-play-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z"></path>
                  </svg>
                </span>
                <span>Reproducir</span>
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
                {/* Utilidades */}
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
                  <button id="duplicateAnnotation" className="tool-button" type="button" aria-label="Duplicar" title="Duplicar seleccion">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="8" y="7" width="9" height="11" rx="1.8"></rect>
                      <path d="M6.5 15.5H6A1.5 1.5 0 0 1 4.5 14V6A1.5 1.5 0 0 1 6 4.5h8A1.5 1.5 0 0 1 15.5 6v.5"></path>
                    </svg>
                    <span className="tool-label">Duplicar</span>
                  </button>
                  <button id="deleteAnnotation" className="tool-button" type="button" aria-label="Borrar" title="Borrar seleccion">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"></path>
                      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"></path>
                    </svg>
                    <span className="tool-label">Borrar</span>
                  </button>
                </div>

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
                </div>

                {/* TEXTOS */}
                <div className="tool-divider"><span className="tool-divider-dot"></span>TEXTOS</div>
                <div className="tool-grid tool-grid-2col">
                  <button className="tool-button" data-tool="text" aria-label="Texto" title="Texto">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 8h6"></path>
                      <path d="M8 8v9"></path>
                      <path d="M13.5 15.5c0-1.4 1-2.5 2.5-2.5s2.5 1.1 2.5 2.5v1.8"></path>
                      <path d="M18.5 17.3c-.7.7-1.4 1-2.4 1-1.6 0-2.6-1-2.6-2.3 0-1.2.9-2.1 2.5-2.1h2.4"></path>
                    </svg>
                    <span className="tool-label">Texto</span>
                  </button>
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
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
