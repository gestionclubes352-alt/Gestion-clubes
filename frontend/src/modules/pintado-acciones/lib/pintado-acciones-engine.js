window.PintadoAcciones = window.PintadoAcciones || {};
window.PintadoAcciones.mount = function mountPintadoAcciones() {
const youtubeUrlInput = document.getElementById("youtubeUrl");
const urlInputGroup = youtubeUrlInput?.closest(".input-group");
const loadYoutubeButton = document.getElementById("loadYoutube");
const togglePlaybackButton = document.getElementById("togglePlayback");
const toggleDrawModeButton = document.getElementById("toggleDrawMode");
const freezeHintButton = document.getElementById("freezeHint");
const imageUploadInput = document.getElementById("imageUpload");
const sourceLabel = document.getElementById("sourceLabel");
const statusText = document.getElementById("statusText");
const connectorEscHint = document.getElementById("connectorEscHint");
const timelineSeekInput = document.getElementById("timelineSeek");
const timeDisplay = document.getElementById("timeDisplay");
const keyboardHint = document.getElementById("keyboardHint");
const canvas = document.getElementById("annotationCanvas");
const stage = document.getElementById("stage");
const backgroundImage = document.getElementById("backgroundImage");
const youtubeContainer = document.getElementById("youtubePlayer");
const stagePanel = document.querySelector(".stage-panel");
const stageToolbar = document.querySelector(".stage-toolbar");
const stageToolbarToggleButton = document.getElementById("stageToolbarToggle");
const playbackPanel = document.querySelector(".playback-panel");
const toolButtons = document.querySelectorAll(".tool-button[data-tool]");
const duplicateAnnotationButton = document.getElementById("duplicateAnnotation");
const deleteAnnotationButton = document.getElementById("deleteAnnotation");
const strokeColorInput = document.getElementById("strokeColor");
const fillColorInput = document.getElementById("fillColor");
const lineWidthInput = document.getElementById("lineWidth");
const sizeControlInput = document.getElementById("sizeControl");
const sizeValue = document.getElementById("sizeValue");
const opacityControlInput = document.getElementById("opacityControl");
const opacityValueEl = document.getElementById("opacityValue");
const focusStyleButtons = document.querySelectorAll("[data-focus-style]");
const spotlightStyleButtons = document.querySelectorAll("[data-spotlight-style]");
const undoActionButton = document.getElementById("undoAction");
const clearActionButton = document.getElementById("clearAction");
const exportOverlayButton = document.getElementById("exportOverlay");
const quickInsertChips = document.querySelectorAll(".quick-insert-chip");
const collapsiblePanels = document.querySelectorAll("[data-collapsible]");

const ctx = canvas.getContext("2d");
let youtubeApiReadyPromise = null;
let statusHideTimeoutId = 0;
const state = {
  tool: "pen",
  stroke: strokeColorInput.value,
  fill: fillColorInput.value,
  lineWidth: Number(lineWidthInput.value),
  annotations: [],
  drawing: null,
  sourceMode: "youtube",
  imageObjectUrl: null,
  player: null,
  playerReady: false,
  playerState: "paused",
  drawEnabled: false,
  seekDragging: false,
  playerDuration: 0,
  draggingAnnotationIndex: -1,
  dragLastPoint: null,
  selectedAnnotationIndex: -1,
  resizeBaseline: null,
  selectedQuickInsert: "",
  focusStyle: "cilindrico",
  spotlightStyle: "filled",
  opacity: 1,
  resizingHandleIndex: -1,
  resizeAnchor: null,
  history: [],
  stageAspectRatio: 16 / 9,
};

function setStatus(message) {
  if (!statusText) {
    return;
  }

  window.clearTimeout(statusHideTimeoutId);
  statusText.textContent = message || "";

  if (!message) {
    statusText.classList.add("hidden");
    return;
  }

  statusText.classList.remove("hidden");
  statusHideTimeoutId = window.setTimeout(() => {
    statusText.classList.add("hidden");
  }, 4200);
}

function setConnectorHint(visible) {
  if (!connectorEscHint) return;
  if (visible) {
    connectorEscHint.classList.remove("hidden");
  } else {
    connectorEscHint.classList.add("hidden");
  }
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 820px)").matches;
}

function setPanelCollapsed(panel, collapsed) {
  if (!panel) {
    return;
  }

  const toggle = panel.querySelector("[data-collapse-toggle]");
  const summary = panel.querySelector(".mobile-collapse-summary");
  panel.classList.toggle("is-collapsed-mobile", collapsed);

  if (toggle) {
    toggle.setAttribute("aria-expanded", String(!collapsed));
  }

  if (summary) {
    summary.textContent = collapsed ? "Toca para abrir" : "Toca para cerrar";
  }
}

function collapsePanelForMobile(panel) {
  if (!isMobileViewport()) {
    return;
  }

  setPanelCollapsed(panel, true);
}

function setupMobilePanels() {
  collapsiblePanels.forEach((panel) => {
    const toggle = panel.querySelector("[data-collapse-toggle]");
    if (!toggle || toggle.dataset.collapseReady === "true") {
      return;
    }

    toggle.dataset.collapseReady = "true";
    setPanelCollapsed(panel, true);
    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      setPanelCollapsed(panel, isExpanded);
    });
  });
}

function setStageToolbarCollapsed(collapsed) {
  if (!stagePanel || !stageToolbarToggleButton) {
    return;
  }

  stagePanel.classList.toggle("is-stage-toolbar-open", !collapsed);
  stagePanel.classList.toggle("is-stage-toolbar-collapsed", collapsed);
  stageToolbarToggleButton.setAttribute("aria-expanded", String(!collapsed));

  const toggleText = stageToolbarToggleButton.querySelector(".stage-toolbar-toggle-text");
  if (toggleText) {
    toggleText.textContent = collapsed ? "Acciones" : "Cerrar";
  }
}

function syncStageToolbarMode() {
  if (!stagePanel || !stageToolbarToggleButton) {
    return;
  }

  if (isMobileViewport()) {
    const isOpen = stagePanel.classList.contains("is-stage-toolbar-open");
    setStageToolbarCollapsed(!isOpen);
    return;
  }

  stagePanel.classList.remove("is-stage-toolbar-collapsed", "is-stage-toolbar-open");
  stageToolbarToggleButton.setAttribute("aria-expanded", "true");
}

function pushHistory() {
  state.history.push(state.annotations.map(cloneShape));
  if (state.history.length > 60) state.history.shift();
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updatePlaybackUi() {
  canvas.classList.toggle("is-drawing", state.drawEnabled);
  toggleDrawModeButton.classList.toggle("is-active", state.drawEnabled);
  const drawLabel = toggleDrawModeButton.querySelector(".stage-action-text");
  if (drawLabel) {
    drawLabel.textContent = state.drawEnabled ? "DIBUJO ACTIVO" : "MODO REPRODUCIR";
  }
  toggleDrawModeButton.setAttribute("aria-pressed", String(state.drawEnabled));
}

function syncTimeline() {
  if (!state.player || !state.playerReady) return;
  const duration = Number(state.player.getDuration?.() || 0);
  state.playerDuration = duration;
  if (!state.seekDragging && timelineSeekInput && duration > 0) {
    const currentTime = Number(state.player.getCurrentTime?.() || 0);
    timelineSeekInput.value = String(Math.round((currentTime / duration) * 1000));
    if (timeDisplay) {
      timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }
  }
}

function setDrawEnabled(enabled) {
  state.drawEnabled = enabled;
  youtubeContainer.style.pointerEvents = "none";
  updatePlaybackUi();
}

function seekBy(deltaSeconds) {
  if (!state.player || !state.playerReady) {
    return;
  }

  const duration = Number(state.player.getDuration?.() || 0);
  const currentTime = Number(state.player.getCurrentTime?.() || 0);
  const nextTime = Math.max(0, Math.min(duration || currentTime + deltaSeconds, currentTime + deltaSeconds));
  state.player.seekTo(nextTime, true);
  syncTimeline(true);
}

function refreshSourceToggle() {}

function setSourceMode(mode) {
  state.sourceMode = mode;
  if (sourceLabel) sourceLabel.textContent = mode === "youtube" ? "YouTube" : "Imagen";
  youtubeContainer.classList.toggle("is-visible", mode === "youtube");
  backgroundImage.classList.toggle("is-visible", mode === "image");
  if (mode === "youtube") {
    state.stageAspectRatio = 16 / 9;
    stage.style.aspectRatio = "16 / 9";
  }
  if (mode === "image") {
    setDrawEnabled(true);
  } else {
    setDrawEnabled(false);
  }
  refreshSourceToggle();
  resizeCanvas();
}

function resizeCanvas() {
  fitStageToViewport();
  const { width, height } = stage.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  redraw();
}

function fitStageToViewport() {
  if (!stagePanel || !stageToolbar) {
    return;
  }

  const aspectRatio = state.stageAspectRatio > 0 ? state.stageAspectRatio : 16 / 9;

  if (isMobileViewport()) {
    const maxWidth = stagePanel.clientWidth - 20;
    stage.style.width = `${Math.max(0, maxWidth)}px`;
    stage.style.height = "";
    return;
  }

  const maxWidth = stagePanel.clientWidth - 32;

  const playbackHeight = playbackPanel?.offsetHeight || 0;
  const availableHeight = stagePanel.clientHeight - stageToolbar.offsetHeight - playbackHeight - 24;
  const safeHeight = Math.max(220, availableHeight || 220);
  const heightFromWidth = maxWidth / aspectRatio;

  if (heightFromWidth <= safeHeight) {
    stage.style.width = `${Math.max(0, maxWidth)}px`;
    stage.style.height = `${Math.max(0, heightFromWidth)}px`;
    return;
  }

  stage.style.height = `${safeHeight}px`;
  stage.style.width = `${Math.max(0, safeHeight * aspectRatio)}px`;
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function refreshQuickInsertChips() {
  quickInsertChips.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.insertText === state.selectedQuickInsert);
  });
}

function resolvePlayerShortcutValue(number) {
  return String(number);
}

function setSelectedQuickInsert(value) {
  state.selectedQuickInsert = value;
  refreshQuickInsertChips();
}

function setTool(nextTool) {
  if (state.tool === "connector" && state.drawing) {
    state.drawing = null;
    setConnectorHint(false);
    redraw();
  }
  state.tool = nextTool;
  toolButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === nextTool);
  });

  if (nextTool !== "text") {
    setSelectedQuickInsert("");
  }

  if (nextTool === "move") {
    setStatus("Modo mover activo. Pulsa sobre una marca ya dibujada y arrastrala.");
  }
}

function syncFocusStyleButtons(style = state.focusStyle) {
  focusStyleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.focusStyle === style);
  });
}

function syncSpotlightStyleButtons(style = state.spotlightStyle) {
  spotlightStyleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.spotlightStyle === style);
  });
}

function duplicateSelectedAnnotation() {
  const targetIndex = state.selectedAnnotationIndex;
  const hasSelection = targetIndex >= 0 && targetIndex < state.annotations.length;

  if (!hasSelection) return;

  pushHistory();
  const duplicate = cloneShape(state.annotations[targetIndex]);
  translateShape(duplicate, 18, 18);
  state.annotations.push(duplicate);
  state.selectedAnnotationIndex = state.annotations.length - 1;
  syncSizeControl();
  redraw();
  setStatus("Anotacion duplicada. Ya puedes recolocarla o editar su tamano.");
}

function deleteSelectedAnnotation() {
  const targetIndex = state.selectedAnnotationIndex;
  const hasSelection = targetIndex >= 0 && targetIndex < state.annotations.length;

  if (!hasSelection) return;

  pushHistory();
  state.annotations.splice(targetIndex, 1);

  if (state.selectedAnnotationIndex >= state.annotations.length) {
    state.selectedAnnotationIndex = state.annotations.length - 1;
  } else {
    state.selectedAnnotationIndex = -1;
  }

  syncSizeControl();
  redraw();
  setStatus("Anotacion borrada.");
}

function measureTextShape(text, lineWidth) {
  ctx.save();
  const fontSize = Math.max(18, lineWidth * 5);
  const paddingX = Math.max(12, fontSize * 0.45);
  const paddingY = Math.max(8, fontSize * 0.28);
  ctx.font = `700 ${fontSize}px Trebuchet MS`;
  const width = ctx.measureText(text).width;
  const height = fontSize;
  ctx.restore();
  return {
    width,
    height,
    fontSize,
    paddingX,
    paddingY,
    boxWidth: width + paddingX * 2,
    boxHeight: height + paddingY * 2,
  };
}

function cloneShape(shape) {
  return JSON.parse(JSON.stringify(shape));
}

function getShapeBounds(shape) {
  if (shape.type === "pen" || shape.type === "connector") {
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    return {
      left: Math.min(...xs),
      top: Math.min(...ys),
      right: Math.max(...xs),
      bottom: Math.max(...ys),
    };
  }

  if (shape.type === "text") {
    const size = measureTextShape(shape.text, shape.lineWidth);
    return {
      left: shape.x,
      top: shape.y - size.boxHeight + size.paddingY,
      right: shape.x + size.boxWidth,
      bottom: shape.y + size.paddingY,
    };
  }

  if (shape.type === "callout") {
    const fontSize = Math.max(16, shape.lineWidth * 4);
    ctx.save();
    ctx.font = `700 ${fontSize}px Trebuchet MS`;
    const textWidth = ctx.measureText(shape.text).width;
    ctx.restore();
    const boxWidth = textWidth + 32;
    const boxHeight = fontSize + 24;
    return {
      left: shape.x,
      top: shape.y - boxHeight,
      right: shape.x + boxWidth,
      bottom: shape.y + 22,
    };
  }

  if (shape.type === "spotlight") {
    const halfWidth = Math.abs(shape.x2 - shape.x1);
    return {
      left: shape.x1 - halfWidth,
      top: Math.min(shape.y1, shape.y2),
      right: shape.x1 + halfWidth,
      bottom: Math.max(shape.y1, shape.y2),
    };
  }

  return {
    left: Math.min(shape.x1, shape.x2),
    top: Math.min(shape.y1, shape.y2),
    right: Math.max(shape.x1, shape.x2),
    bottom: Math.max(shape.y1, shape.y2),
  };
}

function pointHitsShape(point, shape) {
  const bounds = getShapeBounds(shape);
  const padding = Math.max(10, (shape.lineWidth || 2) * 3);
  return (
    point.x >= bounds.left - padding &&
    point.x <= bounds.right + padding &&
    point.y >= bounds.top - padding &&
    point.y <= bounds.bottom + padding
  );
}

function findAnnotationAtPoint(point) {
  for (let index = state.annotations.length - 1; index >= 0; index -= 1) {
    if (pointHitsShape(point, state.annotations[index])) {
      return index;
    }
  }
  return -1;
}

function translateShape(shape, dx, dy) {
  if (shape.type === "pen" || shape.type === "connector") {
    shape.points = shape.points.map((point) => ({
      x: point.x + dx,
      y: point.y + dy,
    }));
    return;
  }

  if (shape.type === "text" || shape.type === "callout") {
    shape.x += dx;
    shape.y += dy;
    return;
  }

  shape.x1 += dx;
  shape.y1 += dy;
  shape.x2 += dx;
  shape.y2 += dy;
}

function scalePoint(point, center, factor) {
  return {
    x: center.x + (point.x - center.x) * factor,
    y: center.y + (point.y - center.y) * factor,
  };
}

function scaleShapeFromBaseline(shape, factor) {
  const scaledShape = cloneShape(shape);
  const bounds = getShapeBounds(shape);
  const center = {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2,
  };

  if (scaledShape.type === "pen" || scaledShape.type === "connector") {
    scaledShape.points = scaledShape.points.map((point) => scalePoint(point, center, factor));
    scaledShape.lineWidth = Math.max(1, shape.lineWidth * factor);
    return scaledShape;
  }

  if (scaledShape.type === "text" || scaledShape.type === "callout") {
    const anchor = scalePoint({ x: scaledShape.x, y: scaledShape.y }, center, factor);
    scaledShape.x = anchor.x;
    scaledShape.y = anchor.y;
    scaledShape.lineWidth = Math.max(1, shape.lineWidth * factor);
    return scaledShape;
  }

  const start = scalePoint({ x: scaledShape.x1, y: scaledShape.y1 }, center, factor);
  const end = scalePoint({ x: scaledShape.x2, y: scaledShape.y2 }, center, factor);
  scaledShape.x1 = start.x;
  scaledShape.y1 = start.y;
  scaledShape.x2 = end.x;
  scaledShape.y2 = end.y;
  scaledShape.lineWidth = Math.max(1, shape.lineWidth * factor);
  return scaledShape;
}

function syncSizeControl() {
  const hasSelection = state.selectedAnnotationIndex >= 0 && state.selectedAnnotationIndex < state.annotations.length;
  sizeControlInput.disabled = !hasSelection;

  if (!hasSelection) {
    state.resizeBaseline = null;
    sizeControlInput.value = "100";
    sizeValue.textContent = "100%";
    syncOpacityControl();
    return;
  }

  state.resizeBaseline = cloneShape(state.annotations[state.selectedAnnotationIndex]);
  sizeControlInput.value = "100";
  sizeValue.textContent = "100%";
  syncOpacityControl();
}

function syncOpacityControl() {
  const hasSelection = state.selectedAnnotationIndex >= 0 && state.selectedAnnotationIndex < state.annotations.length;
  const opacity = hasSelection
    ? (state.annotations[state.selectedAnnotationIndex].opacity ?? 1)
    : state.opacity;
  const pct = Math.round(opacity * 100);
  opacityControlInput.value = String(pct);
  opacityValueEl.textContent = `${pct}%`;
}

const HANDLE_PADDING = 10;
const HANDLE_SIZE = 8;

function getHandlePositions(bounds, padding = HANDLE_PADDING) {
  return [
    { x: bounds.left - padding,  y: bounds.top - padding    },
    { x: bounds.right + padding, y: bounds.top - padding    },
    { x: bounds.right + padding, y: bounds.bottom + padding },
    { x: bounds.left - padding,  y: bounds.bottom + padding },
  ];
}

function getHandleAtPoint(point, shape) {
  const handles = getHandlePositions(getShapeBounds(shape));
  const hit = HANDLE_SIZE + 4;
  for (let i = 0; i < handles.length; i++) {
    if (Math.hypot(point.x - handles[i].x, point.y - handles[i].y) <= hit) return i;
  }
  return -1;
}

function resizeShapeWithHandle(shape, handleIndex, newPoint, anchor) {
  const newLeft   = Math.min(newPoint.x, anchor.x);
  const newTop    = Math.min(newPoint.y, anchor.y);
  const newRight  = Math.max(newPoint.x, anchor.x);
  const newBottom = Math.max(newPoint.y, anchor.y);

  if (newRight - newLeft < 8 && newBottom - newTop < 8) return;

  if (shape.type === "pen" || shape.type === "connector") {
    const b = getShapeBounds(shape);
    const oldW = (b.right - b.left) || 1;
    const oldH = (b.bottom - b.top) || 1;
    const newW = (newRight - newLeft) || 1;
    const newH = (newBottom - newTop) || 1;
    shape.points = shape.points.map((p) => ({
      x: newLeft + ((p.x - b.left) / oldW) * newW,
      y: newTop  + ((p.y - b.top)  / oldH) * newH,
    }));
    return;
  }

  if (shape.type === "text" || shape.type === "callout") {
    const b = getShapeBounds(shape);
    const oldW = (b.right - b.left) || 1;
    const factor = ((newRight - newLeft) || 1) / oldW;
    shape.lineWidth = Math.max(1, shape.lineWidth * factor);
    shape.x = newLeft;
    shape.y = newBottom;
    return;
  }

  if (shape.type === "spotlight") {
    const cx = (newLeft + newRight) / 2;
    const hw = (newRight - newLeft) / 2;
    const tipAtBottom = shape.y1 >= shape.y2;
    shape.x1 = cx;
    shape.x2 = cx + hw;
    shape.y1 = tipAtBottom ? newBottom : newTop;
    shape.y2 = tipAtBottom ? newTop    : newBottom;
    return;
  }

  shape.x1 = newLeft;
  shape.y1 = newTop;
  shape.x2 = newRight;
  shape.y2 = newBottom;
}

function drawSelection(shape) {
  const bounds = getShapeBounds(shape);
  const p = HANDLE_PADDING;

  ctx.save();
  ctx.strokeStyle = "rgba(141, 235, 110, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(bounds.left - p, bounds.top - p,
    bounds.right - bounds.left + p * 2, bounds.bottom - bounds.top + p * 2);

  ctx.setLineDash([]);
  getHandlePositions(bounds).forEach((h) => {
    ctx.beginPath();
    ctx.rect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.fillStyle = "#0b1320";
    ctx.fill();
    ctx.strokeStyle = "rgba(141, 235, 110, 0.95)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  ctx.restore();
}

function drawArrow(shape) {
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const distance = Math.hypot(dx, dy);

  if (distance < 2) {
    return;
  }

  const normalX = -dy / distance;
  const normalY = dx / distance;
  const curveDirection = normalY > 0 ? -1 : 1;
  const curveAmount = Math.max(26, Math.min(distance * 0.35, 120));
  const controlX = (shape.x1 + shape.x2) / 2 + normalX * curveAmount * curveDirection;
  const controlY = (shape.y1 + shape.y2) / 2 + normalY * curveAmount * curveDirection;
  const headLength = Math.max(14, shape.lineWidth * 4.5);
  const tangentAngle = Math.atan2(shape.y2 - controlY, shape.x2 - controlX);
  const headSpread = Math.PI / 8;

  ctx.beginPath();
  ctx.moveTo(shape.x1, shape.y1);
  ctx.quadraticCurveTo(controlX, controlY, shape.x2, shape.y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(shape.x2, shape.y2);
  ctx.lineTo(
    shape.x2 - headLength * Math.cos(tangentAngle - headSpread),
    shape.y2 - headLength * Math.sin(tangentAngle - headSpread)
  );
  ctx.moveTo(shape.x2, shape.y2);
  ctx.lineTo(
    shape.x2 - headLength * Math.cos(tangentAngle + headSpread),
    shape.y2 - headLength * Math.sin(tangentAngle + headSpread)
  );
  ctx.stroke();
}

function drawStraightArrow(shape) {
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const distance = Math.hypot(dx, dy);

  if (distance < 2) {
    return;
  }

  const headLength = Math.max(14, shape.lineWidth * 4.5);
  const angle = Math.atan2(dy, dx);
  const headSpread = Math.PI / 8;

  ctx.beginPath();
  ctx.moveTo(shape.x1, shape.y1);
  ctx.lineTo(shape.x2, shape.y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(shape.x2, shape.y2);
  ctx.lineTo(
    shape.x2 - headLength * Math.cos(angle - headSpread),
    shape.y2 - headLength * Math.sin(angle - headSpread)
  );
  ctx.moveTo(shape.x2, shape.y2);
  ctx.lineTo(
    shape.x2 - headLength * Math.cos(angle + headSpread),
    shape.y2 - headLength * Math.sin(angle + headSpread)
  );
  ctx.stroke();
}

function drawRectangle(shape) {
  const width = shape.x2 - shape.x1;
  const height = shape.y2 - shape.y1;
  ctx.strokeRect(shape.x1, shape.y1, width, height);
}

function drawEllipse(shape) {
  const centerX = (shape.x1 + shape.x2) / 2;
  const centerY = (shape.y1 + shape.y2) / 2;
  const radiusX = Math.abs(shape.x2 - shape.x1) / 2;
  const radiusY = Math.abs(shape.y2 - shape.y1) / 2;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function ellipsePath(centerX, centerY, radiusX, radiusY) {
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
}

function drawFocusAbierto(shape) {
  const left = Math.min(shape.x1, shape.x2);
  const top = Math.min(shape.y1, shape.y2);
  const width = Math.abs(shape.x2 - shape.x1);
  const height = Math.abs(shape.y2 - shape.y1);
  if (width < 8 || height < 12) return;

  const cx = left + width / 2;
  const bottomY = top + height;
  const topY = top;

  ctx.save();

  const grad = ctx.createLinearGradient(cx, bottomY, cx, topY);
  grad.addColorStop(0, hexToRgba(shape.stroke, 0.42));
  grad.addColorStop(0.5, hexToRgba(shape.stroke, 0.18));
  grad.addColorStop(1, hexToRgba(shape.stroke, 0.04));

  ctx.beginPath();
  ctx.moveTo(cx, bottomY);
  ctx.lineTo(left, topY);
  ctx.lineTo(left + width, topY);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = hexToRgba(shape.stroke, 0.72);
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.5);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, bottomY);
  ctx.lineTo(left, topY);
  ctx.moveTo(cx, bottomY);
  ctx.lineTo(left + width, topY);
  ctx.stroke();

  const fr = Math.max(5, Math.min(width * 0.1, 12));
  ctx.beginPath();
  ctx.arc(cx, bottomY, fr, Math.PI, 0);
  ctx.fillStyle = shape.stroke;
  ctx.fill();

  ctx.restore();
}

function drawFocusEstrecho(shape) {
  const left = Math.min(shape.x1, shape.x2);
  const top = Math.min(shape.y1, shape.y2);
  const width = Math.abs(shape.x2 - shape.x1);
  const height = Math.abs(shape.y2 - shape.y1);
  if (width < 8 || height < 12) return;

  const cx = left + width / 2;
  const bottomY = top + height;
  const topY = top;
  const topHW = width * 0.38;

  ctx.save();

  const grad = ctx.createLinearGradient(cx, bottomY, cx, topY);
  grad.addColorStop(0, hexToRgba(shape.stroke, 0.48));
  grad.addColorStop(0.5, hexToRgba(shape.stroke, 0.22));
  grad.addColorStop(1, hexToRgba(shape.stroke, 0.05));

  ctx.beginPath();
  ctx.moveTo(cx, bottomY);
  ctx.lineTo(cx - topHW, topY);
  ctx.lineTo(cx + topHW, topY);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = hexToRgba(shape.stroke, 0.75);
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.5);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, bottomY);
  ctx.lineTo(cx - topHW, topY);
  ctx.moveTo(cx, bottomY);
  ctx.lineTo(cx + topHW, topY);
  ctx.stroke();

  const fr = Math.max(5, Math.min(width * 0.1, 12));
  ctx.beginPath();
  ctx.arc(cx, bottomY, fr, Math.PI, 0);
  ctx.fillStyle = shape.stroke;
  ctx.fill();

  ctx.restore();
}

function drawFocusCilindrico(shape) {
  const left = Math.min(shape.x1, shape.x2);
  const top = Math.min(shape.y1, shape.y2);
  const width = Math.abs(shape.x2 - shape.x1);
  const height = Math.abs(shape.y2 - shape.y1);
  if (width < 8 || height < 12) return;

  const cx = left + width / 2;
  const bottomY = top + height;
  const topY = top;
  const hw = width * 0.35;
  const baseRx = Math.max(8, hw * 1.08);
  const baseRy = Math.max(2.5, height * 0.03);
  const baseY = bottomY - Math.max(1.5, baseRy * 0.2);

  ctx.save();

  const grad = ctx.createLinearGradient(cx, bottomY, cx, topY);
  grad.addColorStop(0, hexToRgba(shape.stroke, 0.5));
  grad.addColorStop(0.45, hexToRgba(shape.stroke, 0.28));
  grad.addColorStop(1, hexToRgba(shape.stroke, 0.08));

  ctx.beginPath();
  ctx.rect(cx - hw, topY, hw * 2, height);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = hexToRgba(shape.stroke, 0.7);
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.5);
  ctx.beginPath();
  ctx.moveTo(cx - hw, topY);
  ctx.lineTo(cx - hw, bottomY);
  ctx.moveTo(cx + hw, topY);
  ctx.lineTo(cx + hw, bottomY);
  ctx.stroke();

  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(cx - hw, topY);
  ctx.lineTo(cx + hw, topY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, baseRx, baseRy, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexToRgba(shape.stroke, 0.5);
  ctx.lineWidth = Math.max(1, shape.lineWidth * 0.22);
  ctx.beginPath();
  ctx.ellipse(cx, baseY - baseRy * 0.12, baseRx * 0.92, baseRy * 0.52, 0, Math.PI, 0, true);
  ctx.stroke();

  ctx.restore();
}

function drawFocus(shape) {
  const focusStyle = shape.focusStyle || "cilindrico";

  if (focusStyle === "estrecho") {
    drawFocusEstrecho(shape);
    return;
  }

  if (focusStyle === "cilindrico") {
    drawFocusCilindrico(shape);
    return;
  }

  drawFocusAbierto(shape);
}

function drawCone(shape) {
  const left = Math.min(shape.x1, shape.x2);
  const top = Math.min(shape.y1, shape.y2);
  const width = Math.abs(shape.x2 - shape.x1);
  const height = Math.abs(shape.y2 - shape.y1);

  if (width < 8 || height < 12) {
    return;
  }

  const centerX = left + width / 2;
  const radiusX = width / 2;
  const ellipseDepth = Math.max(9, Math.min(height * 0.11, width * 0.24));
  const topY = top + ellipseDepth;
  const bottomY = top + height - ellipseDepth;

  ctx.save();
  ctx.lineWidth = Math.max(2, shape.lineWidth);
  ctx.strokeStyle = shape.stroke;

  const bodyGradient = ctx.createLinearGradient(left, top, left + width, top + height);
  bodyGradient.addColorStop(0, hexToRgba(shape.stroke, 0.06));
  bodyGradient.addColorStop(0.55, hexToRgba(shape.stroke, 0.14));
  bodyGradient.addColorStop(1, hexToRgba(shape.stroke, 0.03));
  ctx.fillStyle = bodyGradient;
  ctx.fillRect(left, topY, width, Math.max(0, bottomY - topY));

  ctx.beginPath();
  ctx.moveTo(left, topY);
  ctx.lineTo(left, bottomY);
  ctx.moveTo(left + width, topY);
  ctx.lineTo(left + width, bottomY);
  ctx.stroke();

  ellipsePath(centerX, topY, radiusX, ellipseDepth);
  ctx.stroke();

  ellipsePath(centerX, bottomY, radiusX, ellipseDepth);
  ctx.stroke();

  ctx.restore();
}

function drawZone(shape) {
  const left = Math.min(shape.x1, shape.x2);
  const top = Math.min(shape.y1, shape.y2);
  const width = Math.abs(shape.x2 - shape.x1);
  const height = Math.abs(shape.y2 - shape.y1);

  if (width < 8 || height < 8) {
    return;
  }

  const centerX = left + width / 2;
  const centerY = top + height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;

  ctx.save();
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.45);

  const baseGradient = ctx.createLinearGradient(left, centerY, left + width, centerY);
  baseGradient.addColorStop(0, hexToRgba(shape.stroke, 0.9));
  baseGradient.addColorStop(0.58, hexToRgba(shape.stroke, 0.72));
  baseGradient.addColorStop(1, hexToRgba("#120204", 0.92));

  ellipsePath(centerX, centerY, radiusX, radiusY);
  ctx.fillStyle = baseGradient;
  ctx.fill();

  ctx.strokeStyle = hexToRgba("#f3d8db", 0.34);
  ctx.stroke();

  const topGlow = ctx.createRadialGradient(centerX, centerY - radiusY * 0.1, radiusX * 0.12, centerX, centerY, radiusX);
  topGlow.addColorStop(0, hexToRgba("#ffffff", 0.34));
  topGlow.addColorStop(0.45, hexToRgba("#ffffff", 0.12));
  topGlow.addColorStop(1, hexToRgba("#ffffff", 0));
  ellipsePath(centerX, centerY, radiusX, radiusY);
  ctx.fillStyle = topGlow;
  ctx.fill();

  ctx.save();
  ellipsePath(centerX, centerY, radiusX, radiusY);
  ctx.clip();

  const highlight = ctx.createLinearGradient(centerX, top, centerX + radiusX, top + height);
  highlight.addColorStop(0, hexToRgba("#ffffff", 0.02));
  highlight.addColorStop(0.35, hexToRgba("#ffffff", 0.08));
  highlight.addColorStop(0.58, hexToRgba("#ffffff", 0.44));
  highlight.addColorStop(1, hexToRgba("#ffffff", 0));
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(centerX, top);
  ctx.lineTo(left + width, top + height * 0.18);
  ctx.lineTo(left + width, top + height);
  ctx.lineTo(centerX, top + height);
  ctx.closePath();
  ctx.fill();

  const divider = ctx.createLinearGradient(centerX, top, centerX, top + height);
  divider.addColorStop(0, hexToRgba("#ffffff", 0.1));
  divider.addColorStop(0.5, hexToRgba("#ffffff", 0.4));
  divider.addColorStop(1, hexToRgba("#ffffff", 0.08));
  ctx.strokeStyle = divider;
  ctx.lineWidth = Math.max(1, shape.lineWidth * 0.3);
  ctx.beginPath();
  ctx.moveTo(centerX, top + height * 0.08);
  ctx.lineTo(centerX, top + height * 0.92);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function triangleVertices(shape) {
  const left = Math.min(shape.x1, shape.x2);
  const right = Math.max(shape.x1, shape.x2);
  const top = Math.min(shape.y1, shape.y2);
  const bottom = Math.max(shape.y1, shape.y2);

  return [
    { x: left, y: bottom },
    { x: left + (right - left) * 0.42, y: top },
    { x: right, y: bottom - (bottom - top) * 0.06 },
  ];
}

function drawTriangleZone(shape) {
  const width = Math.abs(shape.x2 - shape.x1);
  const height = Math.abs(shape.y2 - shape.y1);

  if (width < 10 || height < 10) {
    return;
  }

  const vertices = triangleVertices(shape);
  const [a, b, c] = vertices;

  ctx.save();
  ctx.lineWidth = Math.max(2, shape.lineWidth * 0.55);

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.closePath();

  const fillGradient = ctx.createLinearGradient(a.x, b.y, c.x, c.y);
  fillGradient.addColorStop(0, hexToRgba(shape.fill, 0.2));
  fillGradient.addColorStop(0.45, hexToRgba(shape.fill, 0.42));
  fillGradient.addColorStop(1, hexToRgba(shape.fill, 0.14));
  ctx.fillStyle = fillGradient;
  ctx.fill();

  ctx.strokeStyle = hexToRgba("#d4c34f", 0.65);
  ctx.stroke();

  const nodeRadius = Math.max(7, shape.lineWidth * 1.7);
  vertices.forEach((vertex) => {
    const nodeGradient = ctx.createRadialGradient(
      vertex.x - nodeRadius * 0.25,
      vertex.y - nodeRadius * 0.35,
      nodeRadius * 0.4,
      vertex.x,
      vertex.y,
      nodeRadius * 1.05
    );
    nodeGradient.addColorStop(0, "#7f3cff");
    nodeGradient.addColorStop(0.7, "#5b18c6");
    nodeGradient.addColorStop(1, "#2b0a67");
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = nodeGradient;
    ctx.fill();
    ctx.lineWidth = Math.max(2, shape.lineWidth * 0.45);
    ctx.strokeStyle = hexToRgba("#f3e97c", 0.92);
    ctx.stroke();
  });

  ctx.restore();
}

function drawPen(shape) {
  if (!shape.points.length) {
    return;
  }
  ctx.beginPath();
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  shape.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
}

function drawText(shape) {
  const size = measureTextShape(shape.text, shape.lineWidth);
  const boxX = shape.x;
  const boxY = shape.y - size.boxHeight + size.paddingY;
  const radius = Math.max(12, size.fontSize * 0.5);

  ctx.save();
  ctx.shadowColor = hexToRgba("#000000", 0.24);
  ctx.shadowBlur = Math.max(12, size.fontSize * 0.7);
  ctx.shadowOffsetY = Math.max(4, size.fontSize * 0.18);

  const badgeGradient = ctx.createLinearGradient(boxX, boxY, boxX + size.boxWidth, boxY + size.boxHeight);
  badgeGradient.addColorStop(0, hexToRgba("#08111f", 0.88));
  badgeGradient.addColorStop(0.55, hexToRgba(shape.fill, 0.78));
  badgeGradient.addColorStop(1, hexToRgba(shape.stroke, 0.92));

  roundRectPath(boxX, boxY, size.boxWidth, size.boxHeight, radius);
  ctx.fillStyle = badgeGradient;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.32);
  ctx.strokeStyle = hexToRgba("#ffffff", 0.22);
  ctx.stroke();

  const sheen = ctx.createLinearGradient(boxX, boxY, boxX, boxY + size.boxHeight);
  sheen.addColorStop(0, hexToRgba("#ffffff", 0.24));
  sheen.addColorStop(0.38, hexToRgba("#ffffff", 0.08));
  sheen.addColorStop(1, hexToRgba("#ffffff", 0));
  roundRectPath(boxX + 1, boxY + 1, size.boxWidth - 2, size.boxHeight * 0.56, Math.max(10, radius - 2));
  ctx.fillStyle = sheen;
  ctx.fill();

  ctx.font = `700 ${size.fontSize}px Trebuchet MS`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(shape.text, shape.x + size.paddingX, shape.y);
  ctx.restore();
}

function drawCallout(shape) {
  const paddingX = 16;
  const paddingY = 12;
  const fontSize = Math.max(16, shape.lineWidth * 4);
  ctx.font = `700 ${fontSize}px Trebuchet MS`;
  const textWidth = ctx.measureText(shape.text).width;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const radius = 14;

  ctx.fillStyle = shape.fill;
  ctx.strokeStyle = shape.stroke;
  ctx.lineWidth = Math.max(2, shape.lineWidth);

  roundRectPath(shape.x, shape.y - boxHeight, boxWidth, boxHeight, radius);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(shape.x + 28, shape.y);
  ctx.lineTo(shape.x + 16, shape.y + 22);
  ctx.lineTo(shape.x + 54, shape.y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f4f7ff";
  ctx.fillText(shape.text, shape.x + paddingX, shape.y - paddingY);
}

function roundRectPath(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawConnector(shape) {
  const pts = shape.previewEnd
    ? [...shape.points, shape.previewEnd]
    : shape.points;

  if (pts.length < 1) return;

  const nodeRadius = Math.max(4, shape.lineWidth * 1.4);

  if (pts.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }

  if (shape.previewEnd && shape.points.length >= 1) {
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(shape.points[shape.points.length - 1].x, shape.points[shape.points.length - 1].y);
    ctx.lineTo(shape.previewEnd.x, shape.previewEnd.y);
    ctx.stroke();
    ctx.restore();
  }

  shape.points.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = shape.stroke;
    ctx.fill();
    if (i === 0 || i === shape.points.length - 1) {
      ctx.save();
      ctx.strokeStyle = hexToRgba("#ffffff", 0.7);
      ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.4);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function drawSpotlightBase(shape) {
  const tipX = shape.x1;
  const tipY = shape.y1;
  const topY = shape.y2;
  const halfWidth = Math.abs(shape.x2 - shape.x1);
  return { tipX, tipY, topY, halfWidth, height: Math.abs(topY - tipY) };
}

function drawSpotlightFilled(shape) {
  const { tipX, tipY, topY, halfWidth, height } = drawSpotlightBase(shape);
  if (halfWidth < 4 || height < 8) return;
  ctx.save();
  const gradient = ctx.createLinearGradient(tipX, tipY, tipX, topY);
  gradient.addColorStop(0, hexToRgba(shape.stroke, 0.0));
  gradient.addColorStop(0.38, hexToRgba(shape.stroke, 0.14));
  gradient.addColorStop(1, hexToRgba(shape.stroke, 0.42));
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - halfWidth, topY);
  ctx.lineTo(tipX + halfWidth, topY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = hexToRgba(shape.stroke, 0.78);
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.55);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - halfWidth, topY);
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + halfWidth, topY);
  ctx.stroke();
  const nodeR = Math.max(5, shape.lineWidth * 1.3);
  ctx.beginPath();
  ctx.arc(tipX, tipY, nodeR, 0, Math.PI * 2);
  ctx.fillStyle = shape.stroke;
  ctx.fill();
  ctx.strokeStyle = hexToRgba("#ffffff", 0.65);
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawSpotlightOutline(shape) {
  const { tipX, tipY, topY, halfWidth, height } = drawSpotlightBase(shape);
  if (halfWidth < 4 || height < 8) return;
  ctx.save();
  ctx.strokeStyle = shape.stroke;
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.6);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - halfWidth, topY);
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + halfWidth, topY);
  ctx.stroke();
  const nodeR = Math.max(4, shape.lineWidth * 1.1);
  ctx.beginPath();
  ctx.arc(tipX, tipY, nodeR, 0, Math.PI * 2);
  ctx.fillStyle = shape.stroke;
  ctx.fill();
  ctx.restore();
}

function drawSpotlightBeams(shape) {
  const { tipX, tipY, topY, halfWidth, height } = drawSpotlightBase(shape);
  if (halfWidth < 4 || height < 8) return;
  ctx.save();
  const gradient = ctx.createLinearGradient(tipX, tipY, tipX, topY);
  gradient.addColorStop(0, hexToRgba(shape.stroke, 0.0));
  gradient.addColorStop(1, hexToRgba(shape.stroke, 0.1));
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - halfWidth, topY);
  ctx.lineTo(tipX + halfWidth, topY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = shape.stroke;
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.55);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - halfWidth, topY);
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + halfWidth, topY);
  ctx.stroke();
  const beamRatios = [0.3, 0.58, 0.82];
  ctx.lineWidth = Math.max(1, shape.lineWidth * 0.32);
  ctx.setLineDash([5, 4]);
  beamRatios.forEach((r) => {
    const beamY = tipY + (topY - tipY) * r;
    const beamHW = halfWidth * r;
    ctx.globalAlpha = 0.55 + r * 0.2;
    ctx.beginPath();
    ctx.moveTo(tipX - beamHW, beamY);
    ctx.lineTo(tipX + beamHW, beamY);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  const nodeR = Math.max(5, shape.lineWidth * 1.3);
  ctx.beginPath();
  ctx.arc(tipX, tipY, nodeR, 0, Math.PI * 2);
  ctx.fillStyle = shape.stroke;
  ctx.fill();
  ctx.strokeStyle = hexToRgba("#ffffff", 0.65);
  ctx.lineWidth = Math.max(1.5, shape.lineWidth * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawSpotlight(shape) {
  const style = shape.spotlightStyle || "filled";
  if (style === "outline") { drawSpotlightOutline(shape); return; }
  if (style === "beams") { drawSpotlightBeams(shape); return; }
  drawSpotlightFilled(shape);
}

function drawShape(shape) {
  ctx.save();
  ctx.globalAlpha = shape.opacity ?? 1;
  ctx.strokeStyle = shape.stroke;
  ctx.fillStyle = shape.stroke;
  ctx.lineWidth = shape.lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (shape.type === "pen") {
    drawPen(shape);
  }
  if (shape.type === "arrow") {
    drawArrow(shape);
  }
  if (shape.type === "arrowStraight") {
    drawStraightArrow(shape);
  }
  if (shape.type === "rect") {
    drawRectangle(shape);
  }
  if (shape.type === "ellipse") {
    drawEllipse(shape);
  }
  if (shape.type === "focus") {
    drawFocus(shape);
  }
  if (shape.type === "cone") {
    drawCone(shape);
  }
  if (shape.type === "zone") {
    drawZone(shape);
  }
  if (shape.type === "triangleZone") {
    drawTriangleZone(shape);
  }
  if (shape.type === "text") {
    drawText(shape);
  }
  if (shape.type === "callout") {
    drawCallout(shape);
  }
  if (shape.type === "connector") {
    drawConnector(shape);
  }
  if (shape.type === "spotlight") {
    drawSpotlight(shape);
  }

  ctx.restore();
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.annotations.forEach((shape, index) => {
    drawShape(shape);
    if (index === state.selectedAnnotationIndex && state.tool === "move") {
      drawSelection(shape);
    }
  });
  if (state.drawing) {
    drawShape(state.drawing);
  }
}

function beginDrawing(event) {
  if (!state.drawEnabled) {
    return;
  }

  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  if (typeof canvas.setPointerCapture === "function" && event.pointerId != null) {
    canvas.setPointerCapture(event.pointerId);
  }

  if (state.tool === "connector") {
    return;
  }

  const point = getCanvasPoint(event);

  if (state.tool !== "move" && findAnnotationAtPoint(point) >= 0) {
    setTool("move");
  }

  if (state.tool === "move") {
    if (state.selectedAnnotationIndex >= 0 && state.selectedAnnotationIndex < state.annotations.length) {
      const sel = state.annotations[state.selectedAnnotationIndex];
      const hi = getHandleAtPoint(point, sel);
      if (hi >= 0) {
        pushHistory();
        const handles = getHandlePositions(getShapeBounds(sel));
        state.resizingHandleIndex = hi;
        state.resizeAnchor = handles[(hi + 2) % 4];
        state.resizeBaseline = cloneShape(sel);
        return;
      }
    }

    const targetIndex = findAnnotationAtPoint(point);
    state.selectedAnnotationIndex = targetIndex;

    if (targetIndex >= 0) {
      pushHistory();
      state.draggingAnnotationIndex = targetIndex;
      state.dragLastPoint = point;
      const shape = state.annotations[targetIndex];
      if (shape?.type === "focus") {
        state.focusStyle = shape.focusStyle || "cilindrico";
        syncFocusStyleButtons();
      }
      if (shape?.type === "spotlight") {
        state.spotlightStyle = shape.spotlightStyle || "filled";
        syncSpotlightStyleButtons();
      }
      setStatus("Arrastrando anotacion. Suelta para dejarla en la nueva posicion.");
    } else {
      setStatus("No he encontrado una marca en ese punto. Pulsa sobre una anotacion existente.");
    }
    syncSizeControl();
    redraw();
    return;
  }

  if (state.tool === "text" || state.tool === "callout") {
    const label =
      state.tool === "text" && state.selectedQuickInsert
        ? state.selectedQuickInsert
        : window.prompt(
            state.tool === "text" ? "Texto a insertar" : "Texto de la etiqueta",
            state.tool === "text" ? "Jugador clave" : "Mike O'Connor"
          );
    if (!label) {
      return;
    }

    pushHistory();
    state.annotations.push({
      type: state.tool,
      x: point.x,
      y: point.y,
      text: label,
      stroke: state.stroke,
      fill: state.fill,
      lineWidth: state.lineWidth,
      opacity: state.opacity,
    });
    state.selectedAnnotationIndex = state.annotations.length - 1;
    syncSizeControl();
    redraw();
    return;
  }

  if (state.tool === "pen") {
    state.drawing = {
      type: "pen",
      points: [point],
      stroke: state.stroke,
      lineWidth: state.lineWidth,
      opacity: state.opacity,
    };
    redraw();
    return;
  }

  state.drawing = {
    type: state.tool,
    x1: point.x,
    y1: point.y,
    x2: point.x,
    y2: point.y,
    stroke: state.stroke,
    fill: state.fill,
    lineWidth: state.lineWidth,
    focusStyle: state.focusStyle,
    spotlightStyle: state.spotlightStyle,
    opacity: state.opacity,
  };
  redraw();
}

function updateDrawing(event) {
  if (!state.drawEnabled) {
    return;
  }

  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  if (state.tool === "connector" && state.drawing) {
    state.drawing.previewEnd = getCanvasPoint(event);
    redraw();
    return;
  }

  if (state.tool === "move" && state.resizingHandleIndex >= 0 && state.resizeAnchor) {
    const point = getCanvasPoint(event);
    const idx = state.selectedAnnotationIndex;
    if (idx >= 0 && state.resizeBaseline) {
      state.annotations[idx] = cloneShape(state.resizeBaseline);
      resizeShapeWithHandle(state.annotations[idx], state.resizingHandleIndex, point, state.resizeAnchor);
    }
    redraw();
    return;
  }

  if (state.tool === "move" && state.draggingAnnotationIndex >= 0 && state.dragLastPoint) {
    const point = getCanvasPoint(event);
    const dx = point.x - state.dragLastPoint.x;
    const dy = point.y - state.dragLastPoint.y;
    translateShape(state.annotations[state.draggingAnnotationIndex], dx, dy);
    state.dragLastPoint = point;
    redraw();
    return;
  }

  if (!state.drawing) {
    return;
  }

  const point = getCanvasPoint(event);
  if (state.drawing.type === "pen") {
    state.drawing.points.push(point);
  } else {
    state.drawing.x2 = point.x;
    state.drawing.y2 = point.y;
  }
  redraw();
}

function finishDrawing(event) {
  if (!state.drawEnabled) {
    return;
  }

  if (typeof event?.preventDefault === "function") {
    event.preventDefault();
  }

  if (typeof canvas.releasePointerCapture === "function" && event?.pointerId != null) {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (_error) {}
  }

  if (state.tool === "connector") {
    return;
  }

  if (state.tool === "move") {
    if (state.resizingHandleIndex >= 0) {
      state.resizingHandleIndex = -1;
      state.resizeAnchor = null;
      setStatus("Anotacion redimensionada.");
    } else if (state.draggingAnnotationIndex >= 0) {
      setStatus("Anotacion recolocada.");
    }
    state.draggingAnnotationIndex = -1;
    state.dragLastPoint = null;
    syncSizeControl();
    redraw();
    return;
  }

  if (!state.drawing) {
    return;
  }
  pushHistory();
  state.annotations.push(state.drawing);
  state.selectedAnnotationIndex = state.annotations.length - 1;
  state.drawing = null;
  syncSizeControl();
  redraw();
}

function downloadCanvas(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function hasLoadedBackgroundImage() {
  return Boolean(
    backgroundImage
    && backgroundImage.complete
    && backgroundImage.naturalWidth > 0
    && (backgroundImage.currentSrc || backgroundImage.src)
  );
}

async function captureVideoFrame() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    setStatus("Tu navegador no soporta la captura. Usa Chrome actualizado.");
    return;
  }

  setStatus("Selecciona 'Esta pestaña' en el diálogo y haz clic en Compartir...");

  // Ocultar el canvas durante la captura para que las anotaciones no queden
  // dobles en el fotograma capturado (el vídeo de fondo se captura limpio).
  canvas.style.visibility = "hidden";

  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
    });
  } catch {
    canvas.style.visibility = "";
    setStatus("Captura cancelada.");
    return;
  }

  canvas.style.visibility = "";

  const videoEl = document.createElement("video");
  videoEl.muted = true;
  videoEl.srcObject = stream;
  await new Promise(resolve => { videoEl.onloadedmetadata = resolve; });
  await videoEl.play();
  // Esperar dos frames para que el contenido esté renderizado
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const captureW = videoEl.videoWidth;
  const captureH = videoEl.videoHeight;

  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = captureW;
  fullCanvas.height = captureH;
  fullCanvas.getContext("2d").drawImage(videoEl, 0, 0);

  stream.getTracks().forEach(t => t.stop());
  videoEl.srcObject = null;

  // Calcular el recorte al área del reproductor de YouTube
  const rect = youtubeContainer.getBoundingClientRect();
  const scaleX = captureW / window.innerWidth;
  const scaleY = captureH / window.innerHeight;

  const cropX = Math.round(rect.left * scaleX);
  const cropY = Math.round(rect.top * scaleY);
  const cropW = Math.round(rect.width * scaleX);
  const cropH = Math.round(rect.height * scaleY);

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  croppedCanvas.getContext("2d").drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return new Promise(resolve => {
    croppedCanvas.toBlob(async (blob) => {
      if (blob) {
        await loadImageBlob(blob);
      }
      resolve();
    }, "image/png");
  });
}

function exportCanvas() {
  redraw();

  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const exportW = Math.round(width * ratio);
  const exportH = Math.round(height * ratio);

  const offscreen = document.createElement("canvas");
  offscreen.width = exportW;
  offscreen.height = exportH;
  const octx = offscreen.getContext("2d");

  // Garantiza un fondo visible en el PNG aunque no haya una imagen cargada.
  octx.fillStyle = "#060a12";
  octx.fillRect(0, 0, exportW, exportH);

  if (hasLoadedBackgroundImage()) {
    octx.drawImage(backgroundImage, 0, 0, exportW, exportH);
  } else if (state.sourceMode === "youtube") {
    setStatus("⚠️ No hay fotograma capturado. Usa el botón Congelar primero y luego vuelve a exportar.");
    return;
  }

  octx.drawImage(canvas, 0, 0);

  const date = new Date().toISOString().slice(0, 10);
  downloadCanvas(offscreen.toDataURL("image/png"), `accion-${date}.png`);
  setStatus("Imagen guardada.");
}

function loadYouTubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiReadyPromise) {
    return youtubeApiReadyPromise;
  }

  youtubeApiReadyPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };

    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("No se pudo cargar la API de YouTube."));
    document.head.appendChild(script);
  });

  return youtubeApiReadyPromise;
}

function parseYouTubeStartTime(rawValue) {
  if (!rawValue) {
    return "";
  }

  if (/^\d+$/.test(rawValue)) {
    return rawValue;
  }

  const match = rawValue.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match) {
    return "";
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
  return totalSeconds > 0 ? String(totalSeconds) : "";
}

function buildYouTubeEmbedUrl(videoId, options = {}) {
  const embedHost = "https://www.youtube-nocookie.com";
  const { enableJsApi = false, playlistId = "", start = "" } = options;
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "1",
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });

  if (enableJsApi) {
    params.set("enablejsapi", "1");
  }

  if (playlistId) {
    params.set("list", playlistId);
  }

  if (start) {
    params.set("start", start);
  }

  if (window.location.protocol !== "file:" && window.location.origin) {
    params.set("origin", window.location.origin);
  }

  return `${embedHost}/embed/${videoId}?${params.toString()}`;
}

function createYouTubeFallbackIframe(videoId, options = {}) {
  const container = document.getElementById("youtubePlayer");
  container.innerHTML = "";

  const iframe = document.createElement("iframe");
  iframe.src = buildYouTubeEmbedUrl(videoId, options);
  iframe.width = "100%";
  iframe.height = "100%";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.frameBorder = "0";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.title = "Reproductor de YouTube";
  container.appendChild(iframe);

  state.player = null;
  resetPlayerState();
  setSourceMode("youtube");
  setDrawEnabled(false);
  setStatus("Video cargado en modo reproduccion. Activa el modo dibujo cuando quieras pintar sobre el fotograma.");
}

function getYouTubeErrorMessage(errorCode) {
  if (errorCode === 2) {
    return "La URL o el ID del video no son validos para YouTube.";
  }

  if (errorCode === 5) {
    return "YouTube no ha podido reproducir este video en el reproductor incrustado.";
  }

  if (errorCode === 100) {
    return "El video no existe o no esta disponible.";
  }

  if (errorCode === 101 || errorCode === 150) {
    return "Este video de YouTube no permite reproduccion incrustada.";
  }

  return "No se pudo cargar este video de YouTube.";
}

function parseYouTubeInput(url) {
  const value = url.trim();
  if (!value) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return { videoId: value, playlistId: "", start: "" };
  }

  try {
    const parsedUrl = new URL(value);
    const host = parsedUrl.hostname.replace(/^www\./, "");
    const playlistId = parsedUrl.searchParams.get("list") || "";
    const start = parseYouTubeStartTime(
      parsedUrl.searchParams.get("t") ||
      parsedUrl.searchParams.get("start") ||
      ""
    );

    if (host === "youtu.be") {
      const shortId = parsedUrl.pathname.split("/").filter(Boolean)[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(shortId || "")
        ? { videoId: shortId, playlistId, start }
        : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsedUrl.searchParams.has("v")) {
        const id = parsedUrl.searchParams.get("v");
        return /^[a-zA-Z0-9_-]{11}$/.test(id || "")
          ? { videoId: id, playlistId, start }
          : null;
      }

      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
      const prefixIndex = pathParts.findIndex((part) => part === "embed" || part === "shorts" || part === "live");

      if (prefixIndex >= 0) {
        const id = pathParts[prefixIndex + 1];
        return /^[a-zA-Z0-9_-]{11}$/.test(id || "")
          ? { videoId: id, playlistId, start }
          : null;
      }
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function resetPlayerState() {
  state.playerReady = false;
  state.playerState = "paused";
  state.playerCurrentTime = 0;
  state.playerDuration = 0;
  if (togglePlaybackButton) {
    togglePlaybackButton.textContent = "Reproducir";
  }
}

async function ensurePlayer(videoId, options = {}) {
  const { playlistId = "", start = "" } = options;
  const container = document.getElementById("youtubePlayer");

  if (state.player?.destroy) {
    state.player.destroy();
  }

  container.innerHTML = "";
  resetPlayerState();

  const playerHost = document.createElement("div");
  playerHost.id = "youtubeIframePlayer";
  playerHost.style.width = "100%";
  playerHost.style.height = "100%";
  container.appendChild(playerHost);

  const YT = await loadYouTubeApi();

  setSourceMode("youtube");

  return new Promise((resolve) => {
    let settled = false;
    const settle = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(readyTimeout);
      resolve(result);
    };

    const readyTimeout = window.setTimeout(() => {
      try {
        state.player?.destroy?.();
      } catch (_error) {
        // If the API player gets stuck, we still want to fall back to a plain iframe.
      }

      createYouTubeFallbackIframe(videoId, { playlistId, start });
      setStatus("La API de YouTube tardo demasiado. He cargado un reproductor compatible.");
      settle("fallback");
    }, 5000);

    state.player = new YT.Player(playerHost, {
      videoId,
      host: "https://www.youtube-nocookie.com",
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        fs: 1,
        disablekb: 1,
        iv_load_policy: 3,
      },
      events: {
        onReady: (event) => {
          state.player = event.target;
          state.playerReady = true;
          state.playerDuration = Number(event.target.getDuration?.() || 0);
          syncTimeline(true);
          setStatus("Video listo. Pausalo en el momento exacto y dibuja sobre el fotograma.");
          settle("api");
        },
        onError: (event) => {
          const message = getYouTubeErrorMessage(event.data);
          setStatus(message);
          createYouTubeFallbackIframe(videoId, { playlistId, start });
          if (event.data === 101 || event.data === 150) {
            window.alert(message);
          }
          settle("fallback");
        },
        onStateChange: (event) => {
          state.playerDuration = Number(state.player?.getDuration?.() || state.playerDuration || 0);

          if (event.data === YT.PlayerState.PLAYING) {
            state.playerState = "playing";
            if (togglePlaybackButton) togglePlaybackButton.textContent = "Pausar";
            setDrawEnabled(false);
            setStatus("Reproduciendo. Pausa cuando quieras fijar la accion.");
          }

          if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            state.playerState = "paused";
            if (togglePlaybackButton) togglePlaybackButton.textContent = "Reproducir";
            syncTimeline(true);
            setDrawEnabled(true);
            setStatus("Video pausado. Ya puedes pintar encima.");
          }
        },
      },
    });
  });
}

loadYoutubeButton.addEventListener("click", async () => {
  const youtubeInput = parseYouTubeInput(youtubeUrlInput.value);
  if (!youtubeInput?.videoId) {
    window.alert("Introduce una URL valida de YouTube o un ID de video.");
    return;
  }

  try {
    await ensurePlayer(youtubeInput.videoId, {
      playlistId: youtubeInput.playlistId,
      start: youtubeInput.start,
    });
    collapsePanelForMobile(document.querySelector(".source-panel"));
  } catch (_error) {
    createYouTubeFallbackIframe(youtubeInput.videoId, {
      playlistId: youtubeInput.playlistId,
      start: youtubeInput.start,
    });
    collapsePanelForMobile(document.querySelector(".source-panel"));
    window.alert(
      window.location.protocol === "file:"
        ? "La API de YouTube ha fallado en este modo. He cargado un reproductor compatible. Si sigue fallando, abre la app desde http://localhost."
        : "La API de YouTube ha fallado. He cargado un reproductor compatible."
    );
  }
});

togglePlaybackButton?.addEventListener("click", () => {
  if (!state.player || !state.playerReady) {
    if (state.sourceMode === "youtube" && youtubeContainer.querySelector("iframe")) {
      window.alert("Este video esta cargado en modo compatible. Usa los controles del reproductor de YouTube.");
      return;
    }
    window.alert("Primero carga un video de YouTube.");
    return;
  }

  if (state.playerState === "playing") {
    state.player.pauseVideo();
  } else {
    state.player.playVideo();
  }
});

toggleDrawModeButton.addEventListener("click", () => {
  if (state.sourceMode === "image") {
    setDrawEnabled(true);
    setStatus("Modo dibujo activo sobre la imagen congelada.");
    if (isMobileViewport()) {
      setStageToolbarCollapsed(true);
    }
    return;
  }

  setDrawEnabled(!state.drawEnabled);
  setStatus(
    state.drawEnabled
      ? "Modo dibujo activo. El canvas vuelve a captar el raton sobre el video."
      : "Modo controles activo. Ya puedes usar la linea de tiempo del reproductor."
  );
  if (isMobileViewport()) {
    setStageToolbarCollapsed(true);
  }
});

freezeHintButton.addEventListener("click", async () => {
  if (state.sourceMode === "youtube" && !hasLoadedBackgroundImage()) {
    await captureVideoFrame();
    if (!hasLoadedBackgroundImage()) {
      // La captura fue cancelada o falló: no exportar con fondo negro.
      return;
    }
  }
  exportCanvas();
  if (isMobileViewport()) {
    setStageToolbarCollapsed(true);
  }
});

stageToolbarToggleButton?.addEventListener("click", () => {
  if (!isMobileViewport()) {
    return;
  }

  const isOpen = stagePanel?.classList.contains("is-stage-toolbar-open");
  setStageToolbarCollapsed(Boolean(isOpen));
});

function loadImageBlob(blob) {
  if (!blob || !blob.type.startsWith("image/")) {
    return Promise.resolve();
  }

  if (state.imageObjectUrl) {
    URL.revokeObjectURL(state.imageObjectUrl);
  }

  state.imageObjectUrl = URL.createObjectURL(blob);
  backgroundImage.src = state.imageObjectUrl;
  return new Promise(resolve => {
    backgroundImage.onload = () => {
      const w = backgroundImage.naturalWidth;
      const h = backgroundImage.naturalHeight;
      if (w > 0 && h > 0) {
        state.stageAspectRatio = w / h;
        stage.style.aspectRatio = `${w} / ${h}`;
      }
      setSourceMode("image");
      collapsePanelForMobile(document.querySelector(".source-panel"));
      requestAnimationFrame(() => resizeCanvas());
      setStatus("Imagen cargada. Ahora puedes exportar el PNG final.");
      resolve();
    };
  });
}

imageUploadInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  loadImageBlob(file);
});

const handlePaste = (event) => {
  const items = event.clipboardData?.items;
  if (!items) {
    return;
  }
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      event.preventDefault();
      loadImageBlob(item.getAsFile());
      return;
    }
  }
};
document.addEventListener("paste", handlePaste);

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

quickInsertChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const value = chip.dataset.playerNumber
      ? resolvePlayerShortcutValue(chip.dataset.playerNumber)
      : chip.dataset.insertText || "";

    chip.dataset.insertText = value;
    setSelectedQuickInsert(state.selectedQuickInsert === value ? "" : value);
    setTool("text");
    if (state.selectedQuickInsert) {
      setStatus(`${state.selectedQuickInsert} listo. Haz clic en el campo para colocarlo.`);
      return;
    }
    setStatus("Selector rapido desactivado. La herramienta Texto vuelve a pedir contenido.");
  });
});

duplicateAnnotationButton?.addEventListener("click", duplicateSelectedAnnotation);
deleteAnnotationButton?.addEventListener("click", deleteSelectedAnnotation);

strokeColorInput.addEventListener("input", (event) => {
  state.stroke = event.target.value;
});

fillColorInput.addEventListener("input", (event) => {
  state.fill = event.target.value;
});

lineWidthInput.addEventListener("input", (event) => {
  state.lineWidth = Number(event.target.value);
});

focusStyleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.focusStyle = button.dataset.focusStyle || "cilindrico";
    syncFocusStyleButtons();
    setTool("focus");
  });
});

spotlightStyleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.spotlightStyle = button.dataset.spotlightStyle || "filled";
    syncSpotlightStyleButtons();
    const sel = state.annotations[state.selectedAnnotationIndex];
    if (sel?.type === "spotlight") {
      sel.spotlightStyle = state.spotlightStyle;
      redraw();
    }
  });
});

sizeControlInput.addEventListener("input", (event) => {
  const targetIndex = state.selectedAnnotationIndex;
  const hasSelection = targetIndex >= 0 && targetIndex < state.annotations.length && state.resizeBaseline;
  const scaleFactor = Number(event.target.value) / 100;
  sizeValue.textContent = `${Math.round(scaleFactor * 100)}%`;

  if (!hasSelection) {
    return;
  }

  state.annotations[targetIndex] = scaleShapeFromBaseline(state.resizeBaseline, scaleFactor);
  redraw();
});

let _opacityHistoryPushed = false;
opacityControlInput.addEventListener("pointerdown", () => {
  _opacityHistoryPushed = false;
});
opacityControlInput.addEventListener("input", (event) => {
  const value = Number(event.target.value) / 100;
  opacityValueEl.textContent = `${event.target.value}%`;
  const targetIndex = state.selectedAnnotationIndex;
  const hasSelection = targetIndex >= 0 && targetIndex < state.annotations.length;
  if (hasSelection) {
    if (!_opacityHistoryPushed) {
      pushHistory();
      _opacityHistoryPushed = true;
    }
    state.annotations[targetIndex].opacity = value;
    redraw();
  } else {
    state.opacity = value;
  }
});

undoActionButton.addEventListener("click", () => {
  if (state.history.length === 0) return;
  state.annotations = state.history.pop();
  state.drawing = null;
  if (state.selectedAnnotationIndex >= state.annotations.length) {
    state.selectedAnnotationIndex = state.annotations.length - 1;
  }
  if (state.draggingAnnotationIndex >= state.annotations.length) {
    state.draggingAnnotationIndex = -1;
    state.dragLastPoint = null;
  }
  state.resizingHandleIndex = -1;
  state.resizeAnchor = null;
  syncSizeControl();
  redraw();
  if (isMobileViewport()) {
    setStageToolbarCollapsed(true);
  }
});

clearActionButton?.addEventListener("click", () => {
  pushHistory();
  state.annotations = [];
  state.drawing = null;
  state.selectedAnnotationIndex = -1;
  state.draggingAnnotationIndex = -1;
  state.dragLastPoint = null;
  syncSizeControl();
  redraw();
});

exportOverlayButton?.addEventListener("click", exportCanvas);

document.getElementById("captureFrame")?.addEventListener("click", captureVideoFrame);

document.getElementById("clearToolbar")?.addEventListener("click", () => {
  pushHistory();
  state.annotations = [];
  state.drawing = null;
  state.selectedAnnotationIndex = -1;
  state.draggingAnnotationIndex = -1;
  state.dragLastPoint = null;
  syncSizeControl();
  redraw();
  if (isMobileViewport()) {
    setStageToolbarCollapsed(true);
  }
});

timelineSeekInput?.addEventListener("input", (event) => {
  state.seekDragging = true;
  const sliderValue = Number(event.target.value);
  const previewTime = state.playerDuration > 0 ? (sliderValue / 1000) * state.playerDuration : 0;
  timeDisplay.textContent = `${formatTime(previewTime)} / ${formatTime(state.playerDuration)}`;
});

timelineSeekInput?.addEventListener("change", (event) => {
  if (!state.player || !state.playerReady) {
    state.seekDragging = false;
    return;
  }

  const sliderValue = Number(event.target.value);
  const nextTime = state.playerDuration > 0 ? (sliderValue / 1000) * state.playerDuration : 0;
  state.player.seekTo(nextTime, true);
  state.seekDragging = false;
  syncTimeline(true);
});

canvas.addEventListener("pointerdown", beginDrawing);
canvas.addEventListener("pointermove", updateDrawing);
canvas.addEventListener("pointerup", finishDrawing);
canvas.addEventListener("pointercancel", finishDrawing);
canvas.addEventListener("pointerleave", finishDrawing);

canvas.addEventListener("click", (event) => {
  if (state.tool !== "connector" || !state.drawEnabled) return;
  const point = getCanvasPoint(event);
  if (!state.drawing) {
    state.drawing = {
      type: "connector",
      points: [point],
      previewEnd: point,
      stroke: state.stroke,
      lineWidth: state.lineWidth,
      opacity: state.opacity,
    };
    setConnectorHint(true);
  } else {
    state.drawing.points.push(point);
  }
  redraw();
});

canvas.addEventListener("dblclick", (event) => {
  if (state.tool !== "connector" || !state.drawEnabled || !state.drawing) return;
  if (state.drawing.points.length > 1) {
    state.drawing.points.pop();
  }
  if (state.drawing.points.length >= 2) {
    pushHistory();
    delete state.drawing.previewEnd;
    state.annotations.push(state.drawing);
    state.selectedAnnotationIndex = state.annotations.length - 1;
    syncSizeControl();
    setStatus("Conector añadido. Doble clic para terminar el siguiente.");
  }
  state.drawing = null;
  setConnectorHint(false);
  redraw();
});

const handleKeydown = (event) => {
  const activeTag = document.activeElement?.tagName;
  const isTypingField =
    activeTag === "INPUT" || activeTag === "TEXTAREA" || document.activeElement?.isContentEditable;

  if (isTypingField && document.activeElement !== timelineSeekInput) {
    return;
  }

  if (event.key === "Delete") {
    event.preventDefault();
    deleteSelectedAnnotation();
    return;
  }

  if (event.key === "Escape" && state.tool === "connector" && state.drawing) {
    if (state.drawing.points.length >= 2) {
      pushHistory();
      delete state.drawing.previewEnd;
      state.annotations.push(state.drawing);
      state.selectedAnnotationIndex = state.annotations.length - 1;
      syncSizeControl();
      setStatus("Conector guardado.");
    } else {
      setStatus("Conector cancelado.");
    }
    state.drawing = null;
    setConnectorHint(false);
    redraw();
    return;
  }

  if (!state.player || !state.playerReady || state.sourceMode !== "youtube") {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (state.playerState === "playing") {
      state.player.pauseVideo();
    } else {
      state.player.playVideo();
    }
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    seekBy(event.shiftKey ? 5 : 1);
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    seekBy(event.shiftKey ? -5 : -1);
  }
};
window.addEventListener("keydown", handleKeydown);

const handleResize = () => {
  syncStageToolbarMode();
  resizeCanvas();
  if (tutorial.active) tutorial.repositionSpotlight();
};
window.addEventListener("resize", handleResize);
const syncIntervalId = window.setInterval(() => syncTimeline(), 250);
refreshSourceToggle();
setDrawEnabled(state.drawEnabled);
refreshQuickInsertChips();
syncSizeControl();
syncOpacityControl();
syncFocusStyleButtons();
syncSpotlightStyleButtons();
setupMobilePanels();
syncStageToolbarMode();
resizeCanvas();

// ============================
// TUTORIAL GUIADO CON VOZ
// ============================

const TUTORIAL_STEPS = [
  {
    element: null,
    title: "Bienvenido a Pintado de Acciones",
    text: "Bienvenido a Pintado de Acciones, la herramienta de análisis táctico visual del Athletic Club. Vamos a recorrer juntos todas las secciones disponibles.",
  },
  {
    element: ".source-panel",
    title: "Cargar video o imagen",
    text: "En la cabecera puedes cargar un video de YouTube pegando su URL y pulsando Cargar video. También puedes subir una imagen desde tu dispositivo con el botón Sube una imagen.",
    position: "bottom",
  },
  {
    element: ".left-panel .panel-block:first-child",
    title: "Controles de estilo",
    text: "El panel izquierdo tiene los ajustes de estilo: color principal, color de relleno, grosor de línea, tamaño y transparencia. Estos valores se aplican a todas las anotaciones que dibujes.",
    position: "right",
  },
  {
    element: ".number-palette",
    title: "Dorsales rápidos",
    text: "Los botones de dorsales del 1 al 11 te permiten insertar el número de un jugador de forma rápida. Selecciona primero la herramienta Texto y luego pulsa un dorsal para colocarlo.",
    position: "right",
  },
  {
    element: "#toggleDrawMode",
    title: "Modo dibujo",
    text: "Este botón alterna entre Modo Reproducir y Modo Dibujo. Actívalo para poder trazar anotaciones sobre el video o la imagen. El video se pausa automáticamente.",
    position: "bottom",
  },
  {
    element: ".mode-pill",
    title: "Barra de acciones",
    text: "Aquí tienes Deshacer para revertir la última anotación, Limpiar para borrar todas, y Exportar para descargar el fotograma con las anotaciones como imagen PNG.",
    position: "bottom",
  },
  {
    element: "#stage",
    title: "Lienzo principal",
    text: "Este es el lienzo de trabajo. Aquí aparece el video o imagen cargado. En modo dibujo, haz clic y arrastra para crear anotaciones según la herramienta seleccionada.",
    position: "top",
  },
  {
    element: ".tool-panel .tool-grid",
    elementIndex: 0,
    title: "Mover, duplicar y borrar",
    text: "Con Mover puedes seleccionar, arrastrar y redimensionar anotaciones. Duplicar copia la seleccionada, y Borrar la elimina. También puedes usar la tecla Suprimir.",
    position: "left",
  },
  {
    element: ".tool-panel .tool-grid",
    elementIndex: 1,
    title: "Flechas",
    text: "Las flechas son esenciales para indicar movimientos. Tienes flecha curva, flecha recta con ángulo libre, y dibujo libre a mano alzada para trazos más expresivos.",
    position: "left",
  },
  {
    element: ".tool-panel .tool-grid",
    elementIndex: 2,
    title: "Herramientas de texto",
    text: "La herramienta Texto crea una etiqueta con el texto que escribas al hacer clic. La Etiqueta crea una burbuja con puntero hacia el punto de interés en el campo.",
    position: "left",
  },
  {
    element: ".tool-panel .tool-grid",
    elementIndex: 3,
    title: "Zonas y áreas",
    text: "Las zonas permiten marcar áreas del campo. Tienes Rectángulo, Círculo, y Zona elíptica con gradiente, ideal para destacar zonas tácticas de presión o espacios libres.",
    position: "left",
  },
  {
    element: ".tool-panel .tool-grid",
    elementIndex: 4,
    title: "Herramientas avanzadas",
    text: "En Varios tienes el Conector para trazar recorridos multi-punto haciendo clic y doble clic para terminar, el Foco táctico en cono, y el Triángulo táctico para estructuras de juego.",
    position: "left",
  },
  {
    element: null,
    title: "Atajos de teclado",
    text: "Atajos útiles: Barra espaciadora para pausar o reproducir el video. Flechas izquierda y derecha para mover fotograma a fotograma. Tecla Suprimir para borrar la anotación seleccionada.",
  },
  {
    element: null,
    title: "¡Listo para analizar!",
    text: "¡Y eso es todo! Ya conoces todas las herramientas de Pintado de Acciones. Carga un video, elige tus herramientas y empieza a analizar. ¡Aupa Athletic!",
  },
];

const tutorial = {
  active: false,
  step: 0,
  speaking: false,
  muted: false,

  start() {
    this.step = 0;
    this.active = true;
    this.render();
  },

  end() {
    this.active = false;
    this.speaking = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    document.getElementById("tutorialOverlay")?.remove();
    document.getElementById("tutorialSpotlight")?.remove();
  },

  next() {
    if (this.step < TUTORIAL_STEPS.length - 1) {
      this.step++;
      this.render();
    } else {
      this.end();
    }
  },

  prev() {
    if (this.step > 0) {
      this.step--;
      this.render();
    }
  },

  enhanceAudioControls() {
    const tooltip = document.getElementById("tutorialTooltip");
    const controls = tooltip?.querySelector(".tutorial-controls");
    const muteButton = document.getElementById("tutMute");
    const voiceIndicator = document.getElementById("tutVoiceIndicator");
    if (!tooltip || !controls || !muteButton || !voiceIndicator) return;

    let audioRow = tooltip.querySelector(".tutorial-audio-row");
    if (!audioRow) {
      audioRow = document.createElement("div");
      audioRow.className = "tutorial-audio-row";
      voiceIndicator.before(audioRow);
      audioRow.appendChild(voiceIndicator);
      audioRow.appendChild(muteButton);
    }

    muteButton.className = `tutorial-audio-toggle${this.muted ? " is-muted" : ""}`;
    muteButton.type = "button";
    muteButton.removeAttribute("style");
    muteButton.setAttribute("aria-pressed", this.muted ? "true" : "false");
    muteButton.title = this.muted ? "Activar audio del tutorial" : "Silenciar audio del tutorial";
    muteButton.textContent = this.muted ? "Activar audio" : "Silenciar audio";

    if (!voiceIndicator.querySelector("#tutVoiceLabel")) {
      const label = document.createElement("span");
      label.id = "tutVoiceLabel";
      label.textContent = "Narrando...";
      voiceIndicator.appendChild(label);
      voiceIndicator.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.remove();
        }
      });
    }

    const voiceLabel = document.getElementById("tutVoiceLabel");
    if (voiceLabel) {
      voiceLabel.textContent = this.muted ? "Audio silenciado" : "Narrando...";
    }

    if (this.muted) {
      voiceIndicator.classList.add("is-muted");
      voiceIndicator.classList.remove("is-speaking");
    } else if (this.speaking) {
      voiceIndicator.classList.remove("is-muted");
      voiceIndicator.classList.add("is-speaking");
    } else {
      voiceIndicator.classList.remove("is-muted");
    }
  },

  resolveElement(step) {
    if (!step.element) return null;
    if (step.elementIndex !== undefined) {
      return document.querySelectorAll(step.element)[step.elementIndex] || null;
    }
    return document.querySelector(step.element);
  },

  repositionSpotlight() {
    const step = TUTORIAL_STEPS[this.step];
    if (!step?.element) return;
    const targetEl = this.resolveElement(step);
    if (!targetEl) return;
    const spotlight = document.getElementById("tutorialSpotlight");
    if (!spotlight) return;
    const rect = targetEl.getBoundingClientRect();
    const pad = 8;
    spotlight.style.top = `${rect.top - pad}px`;
    spotlight.style.left = `${rect.left - pad}px`;
    spotlight.style.width = `${rect.width + pad * 2}px`;
    spotlight.style.height = `${rect.height + pad * 2}px`;
    this.positionTooltip(
      document.getElementById("tutorialTooltip"),
      targetEl,
      step.position || "bottom"
    );
  },

  render() {
    if (!this.active) return;
    const step = TUTORIAL_STEPS[this.step];

    document.getElementById("tutorialOverlay")?.remove();
    document.getElementById("tutorialSpotlight")?.remove();

    const targetEl = this.resolveElement(step);

    // Overlay — blocks clicks on the app
    const overlay = document.createElement("div");
    overlay.id = "tutorialOverlay";
    overlay.className = "tutorial-overlay" + (targetEl ? "" : " tutorial-overlay--dim");
    document.body.appendChild(overlay);

    // Spotlight — highlights target element
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const pad = 8;
      const spotlight = document.createElement("div");
      spotlight.id = "tutorialSpotlight";
      spotlight.className = "tutorial-spotlight";
      spotlight.style.top = `${rect.top - pad}px`;
      spotlight.style.left = `${rect.left - pad}px`;
      spotlight.style.width = `${rect.width + pad * 2}px`;
      spotlight.style.height = `${rect.height + pad * 2}px`;
      document.body.appendChild(spotlight);
    }

    // Tooltip
    const progress = this.step + 1;
    const total = TUTORIAL_STEPS.length;
    const fillPct = Math.round((progress / total) * 100);
    const isLast = this.step === total - 1;

    const tooltip = document.createElement("div");
    tooltip.id = "tutorialTooltip";
    tooltip.className = "tutorial-tooltip" + (targetEl ? "" : " tutorial-tooltip--center");
    tooltip.innerHTML = `
      <div class="tutorial-progress">
        <span>${progress} / ${total}</span>
        <div class="tutorial-progress-bar">
          <div class="tutorial-progress-fill" style="width:${fillPct}%"></div>
        </div>
      </div>
      <h3 class="tutorial-title">${step.title}</h3>
      <p class="tutorial-text">${step.text}</p>
      <div class="tutorial-voice-indicator" id="tutVoiceIndicator">
        <div class="tutorial-voice-waves">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        Narrando…
      </div>
      <div class="tutorial-controls">
        <button id="tutMute" class="tut-btn tut-btn-secondary" style="background:rgba(255,202,58,.2);border:1px solid rgba(255,202,58,.5);font-weight:700;margin-right:auto;">${this.muted ? "🔇 SILENCIADO" : "🔊 AUDIO"}</button>
        <button id="tutPrev" class="tut-btn tut-btn-secondary" ${this.step === 0 ? "disabled" : ""}>← Anterior</button>
        <button id="tutSkip" class="tut-btn tut-btn-ghost">Saltar</button>
        <button id="tutNext" class="tut-btn tut-btn-primary">${isLast ? "¡Finalizar!" : "Siguiente →"}</button>
      </div>
    `;
    overlay.appendChild(tooltip);

    // Position tooltip next to target (or centered)
    if (targetEl) {
      this.positionTooltip(tooltip, targetEl, step.position || "bottom");
    }

    // Controls
    document.getElementById("tutNext").addEventListener("click", () => this.next());
    document.getElementById("tutPrev").addEventListener("click", () => this.prev());
    document.getElementById("tutSkip").addEventListener("click", () => this.end());
    document.getElementById("tutMute").addEventListener("click", () => {
      this.muted = !this.muted;
      if (this.muted) {
        window.speechSynthesis?.cancel();
        this.speaking = false;
        document.getElementById("tutVoiceIndicator")?.classList.remove("is-speaking");
      }
      this.render();
    });

    // Scroll target into view
    targetEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    // Narrate
    this.speak(step.text);
  },

  positionTooltip(tooltip, targetEl, position) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;
    const tooltipW = 340;
    const tooltipH = 240;

    tooltip.style.position = "fixed";
    tooltip.style.transform = "none";
    tooltip.style.maxWidth = `min(${tooltipW}px, calc(100vw - 32px))`;

    if (position === "bottom") {
      const top = Math.min(rect.bottom + margin, vh - tooltipH - margin);
      tooltip.style.top = `${Math.max(margin, top)}px`;
      let left = rect.left + rect.width / 2 - tooltipW / 2;
      left = Math.max(margin, Math.min(vw - tooltipW - margin, left));
      tooltip.style.left = `${left}px`;
    } else if (position === "top") {
      const bottom = vh - rect.top + margin;
      tooltip.style.top = "auto";
      tooltip.style.bottom = `${Math.min(bottom, vh - tooltipH - margin)}px`;
      let left = rect.left + rect.width / 2 - tooltipW / 2;
      left = Math.max(margin, Math.min(vw - tooltipW - margin, left));
      tooltip.style.left = `${left}px`;
    } else if (position === "left") {
      let top = rect.top + rect.height / 2 - tooltipH / 2;
      top = Math.max(margin, Math.min(vh - tooltipH - margin, top));
      tooltip.style.top = `${top}px`;
      const right = vw - rect.left + margin;
      tooltip.style.right = `${Math.max(margin, right)}px`;
      tooltip.style.left = "auto";
    } else if (position === "right") {
      let top = rect.top + rect.height / 2 - tooltipH / 2;
      top = Math.max(margin, Math.min(vh - tooltipH - margin, top));
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${Math.min(rect.right + margin, vw - tooltipW - margin)}px`;
    }
  },

  speak(text) {
    if (this.muted || !window.speechSynthesis) {
      this.speaking = false;
      document.getElementById("tutVoiceIndicator")?.classList.remove("is-speaking");
      return;
    }
    window.speechSynthesis.cancel();
    this.speaking = false;
    const indicator = document.getElementById("tutVoiceIndicator");

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(v => v.lang === "es-ES" && v.localService) ||
        voices.find(v => v.lang.startsWith("es") && v.localService) ||
        voices.find(v => v.lang === "es-ES") ||
        voices.find(v => v.lang.startsWith("es"));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => {
        this.speaking = true;
        indicator?.classList.add("is-speaking");
        document.getElementById("tutVoiceLabel")?.replaceChildren("Narrando...");
      };
      utterance.onend = utterance.onerror = () => {
        this.speaking = false;
        indicator?.classList.remove("is-speaking");
        document.getElementById("tutVoiceLabel")?.replaceChildren("Narrando...");
      };

      window.speechSynthesis.speak(utterance);
    };

    // Voices may not be loaded yet on first call
    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
    }
  },
};

document.getElementById("tutorialBtn")?.addEventListener("click", () => {
  if (tutorial.active) {
    tutorial.end();
  } else {
    tutorial.start();
  }
});

return function destroyPintadoAcciones() {
  document.removeEventListener("paste", handlePaste);
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("resize", handleResize);
  window.clearInterval(syncIntervalId);
  if (state.player && typeof state.player.destroy === "function") {
    try { state.player.destroy(); } catch (error) { /* noop */ }
  }
};
};
