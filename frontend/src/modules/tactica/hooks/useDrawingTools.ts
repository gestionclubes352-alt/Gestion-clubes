import { useState, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { DrawingShape, DrawingState, DrawingToolType, Point, FocusStyle, SpotlightStyle } from '../types';

const INITIAL_STATE: DrawingState = {
  tool: null,
  isDrawing: false,
  currentShape: null,
  selectedShapeId: null,
  focusStyle: 'cilindrico',
  spotlightStyle: 'filled',
  stroke: '#ffffff',
  fill: '#17307a',
  lineWidth: 1,
  opacity: 1,
  fontSize: 3.5,
  dashed: false,
  pendingConnectorPlayerId: null,
  textDraft: 'Texto',
};

export function useDrawingTools(
  shapes: DrawingShape[],
  setShapes: Dispatch<SetStateAction<DrawingShape[]>>
) {
  const [state, setState] = useState<DrawingState>(INITIAL_STATE);
  const [historyLength, setHistoryLength] = useState(0);
  const historyRef = useRef<DrawingShape[][]>([]);
  const connectorSelectedPlayersRef = useRef<{ id: string; x: number; y: number }[]>([]);
  const activeConnectorShapeIdRef = useRef<string | null>(null);

  // Herramientas
  const setTool = useCallback((tool: DrawingToolType | null) => {
    connectorSelectedPlayersRef.current = [];
    activeConnectorShapeIdRef.current = null;
    setState(prev => ({ ...prev, tool, currentShape: null, isDrawing: false, pendingConnectorPlayerId: null }));
  }, []);

  const setStroke = useCallback((stroke: string) => {
    setState(prev => ({ ...prev, stroke }));
  }, []);

  const setFill = useCallback((fill: string) => {
    setState(prev => ({ ...prev, fill }));
  }, []);

  const setLineWidth = useCallback((lineWidth: number) => {
    setState(prev => ({ ...prev, lineWidth: Math.max(1, Math.min(20, lineWidth)) }));
  }, []);

  const setOpacity = useCallback((opacity: number) => {
    setState(prev => ({ ...prev, opacity: Math.max(0, Math.min(1, opacity)) }));
  }, []);

  const setFocusStyle = useCallback((focusStyle: FocusStyle) => {
    setState(prev => ({ ...prev, focusStyle }));
  }, []);

  const setSpotlightStyle = useCallback((spotlightStyle: SpotlightStyle) => {
    setState(prev => ({ ...prev, spotlightStyle }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setState(prev => ({ ...prev, fontSize: Math.max(1, Math.min(10, fontSize)) }));
  }, []);

  const setDashed = useCallback((dashed: boolean) => {
    setState(prev => ({ ...prev, dashed }));
  }, []);

  const setTextDraft = useCallback((textDraft: string) => {
    setState(prev => ({ ...prev, textDraft }));
  }, []);

  // Utilidades de shapes
  const pushHistory = useCallback(() => {
    historyRef.current.push(shapes.map(cloneShape));
    if (historyRef.current.length > 60) historyRef.current.shift();
    setHistoryLength(historyRef.current.length);
  }, [shapes]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current.pop();
    setHistoryLength(historyRef.current.length);
    if (previous) setShapes(previous);
  }, []);

  const deleteShape = useCallback((id: string) => {
    pushHistory();
    setShapes(prev => prev.filter(shape => shape.id !== id));
    setState(prev => ({ ...prev, selectedShapeId: null }));
  }, [pushHistory]);

  const deleteAll = useCallback(() => {
    pushHistory();
    setShapes([]);
    setState(prev => ({ ...prev, selectedShapeId: null, currentShape: null }));
  }, [pushHistory]);

  const duplicateShape = useCallback((id: string) => {
    pushHistory();
    const original = shapes.find(s => s.id === id);
    if (!original) return;
    const duplicate = cloneShape(original);
    duplicate.id = `shape-${Date.now()}-${Math.random()}`;
    translateShape(duplicate, 18, 18);
    setShapes(prev => [...prev, duplicate]);
  }, [shapes, pushHistory]);

  const selectShape = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedShapeId: id }));
  }, []);

  const bringToFront = useCallback((id: string) => {
    pushHistory();
    setShapes(prev => {
      const shape = prev.find(s => s.id === id);
      if (!shape) return prev;
      return [...prev.filter(s => s.id !== id), shape];
    });
  }, [pushHistory]);

  const sendToBack = useCallback((id: string) => {
    pushHistory();
    setShapes(prev => {
      const shape = prev.find(s => s.id === id);
      if (!shape) return prev;
      return [shape, ...prev.filter(s => s.id !== id)];
    });
  }, [pushHistory]);

  // Manejo de dibujo
  const startDrawing = useCallback((point: Point) => {
    if (!state.tool) return;

    const newShape: DrawingShape = {
      id: `shape-${Date.now()}-${Math.random()}`,
      type: state.tool,
      stroke: state.stroke,
      fill: state.fill,
      lineWidth: state.lineWidth,
      opacity: state.opacity,
      fontSize: state.fontSize,
      focusStyle: state.focusStyle,
      spotlightStyle: state.spotlightStyle,
      dashed: state.dashed,
    };

    if (['pen', 'connector'].includes(state.tool)) {
      newShape.points = [point];
    } else if (['text', 'callout'].includes(state.tool)) {
      newShape.x = point.x;
      newShape.y = point.y;
      newShape.text = state.textDraft.trim() || 'Texto';
    } else {
      newShape.x1 = point.x;
      newShape.y1 = point.y;
      newShape.x2 = point.x;
      newShape.y2 = point.y;
    }

    setState(prev => ({
      ...prev,
      currentShape: newShape,
      isDrawing: true,
      selectedShapeId: null,
    }));
  }, [state]);

  const continueDrawing = useCallback((point: Point) => {
    if (!state.isDrawing || !state.currentShape) return;

    const updated = cloneShape(state.currentShape);

    if (['pen', 'connector'].includes(updated.type) && updated.points) {
      updated.points.push(point);
    } else if (state.tool === 'text' || state.tool === 'callout') {
      // Los textos no cambian durante el drag
    } else {
      updated.x2 = point.x;
      updated.y2 = point.y;
    }

    setState(prev => ({ ...prev, currentShape: updated }));
  }, [state]);

  const finishDrawing = useCallback(() => {
    if (!state.isDrawing || !state.currentShape) return;

    // Validar que la forma tenga contenido mínimo
    if (
      (['pen', 'connector'].includes(state.currentShape.type) &&
       (!state.currentShape.points || state.currentShape.points.length < 2)) ||
      (['arrow', 'arrowStraight', 'rectangle', 'ellipse', 'zone', 'triangleZone',
        'focus', 'spotlight', 'line', 'tshape'].includes(state.currentShape.type) &&
       state.currentShape.x1 === state.currentShape.x2 &&
       state.currentShape.y1 === state.currentShape.y2)
    ) {
      setState(prev => ({ ...prev, isDrawing: false, currentShape: null }));
      return;
    }

    const createdShape = state.currentShape;
    const isTextShape = ['text', 'callout'].includes(createdShape.type);

    pushHistory();
    setShapes(prev => [...prev, createdShape]);
    setState(prev => ({
      ...prev,
      isDrawing: false,
      currentShape: null,
      // Tras colocar un texto/etiqueta, desactivar la herramienta y
      // seleccionar el elemento recién creado para poder editarlo enseguida
      // (si no, la herramienta queda activa y cada clic crea un texto nuevo).
      tool: isTextShape ? null : prev.tool,
      selectedShapeId: isTextShape ? createdShape.id : prev.selectedShapeId,
    }));
  }, [state, pushHistory]);

  const cancelDrawing = useCallback(() => {
    setState(prev => ({ ...prev, isDrawing: false, currentShape: null }));
  }, []);

  const updateShapeText = useCallback((id: string, text: string) => {
    setShapes(prev => prev.map(shape =>
      shape.id === id ? { ...shape, text } : shape
    ));
  }, []);

  const updateShapeFontSize = useCallback((id: string, fontSize: number) => {
    setShapes(prev => prev.map(shape =>
      shape.id === id ? { ...shape, fontSize } : shape
    ));
  }, []);

  const updateShapeStroke = useCallback((id: string, stroke: string) => {
    setShapes(prev => prev.map(shape =>
      shape.id === id ? { ...shape, stroke } : shape
    ));
  }, []);

  const addConnectorPlayer = useCallback((playerId: string, x: number, y: number) => {
    if (state.tool !== 'connector') return;

    const selected = connectorSelectedPlayersRef.current;
    const last = selected[selected.length - 1];

    // Pulsar de nuevo el último jugador finaliza la cadena de conexiones
    if (last && last.id === playerId) {
      connectorSelectedPlayersRef.current = [];
      activeConnectorShapeIdRef.current = null;
      setState(prev => ({ ...prev, pendingConnectorPlayerId: null }));
      return;
    }

    selected.push({ id: playerId, x, y });

    if (selected.length === 1) {
      setState(prev => ({ ...prev, pendingConnectorPlayerId: playerId }));
      return;
    }

    const prevPoint = selected[selected.length - 2];

    if (selected.length === 2) {
      // Primera conexión de la cadena: crear la forma
      pushHistory();
      const newShapeId = `shape-${Date.now()}-${Math.random()}`;
      activeConnectorShapeIdRef.current = newShapeId;
      const newShape: DrawingShape = {
        id: newShapeId,
        type: 'connector',
        points: [{ x: prevPoint.x, y: prevPoint.y }, { x, y }],
        stroke: state.stroke,
        fill: state.fill,
        lineWidth: state.lineWidth,
        opacity: state.opacity,
      };
      setShapes(prev => [...prev, newShape]);
    } else {
      // Jugadores siguientes: extender la misma forma con un nuevo punto
      const shapeId = activeConnectorShapeIdRef.current;
      if (shapeId) {
        setShapes(prev => prev.map(shape =>
          shape.id === shapeId && shape.points
            ? { ...shape, points: [...shape.points, { x, y }] }
            : shape
        ));
      }
    }

    setState(prev => ({ ...prev, pendingConnectorPlayerId: playerId }));
  }, [state.tool, state.stroke, state.fill, state.lineWidth, state.opacity, pushHistory]);

  const clearConnectorPlayers = useCallback(() => {
    connectorSelectedPlayersRef.current = [];
    activeConnectorShapeIdRef.current = null;
    setState(prev => ({ ...prev, pendingConnectorPlayerId: null }));
  }, []);

  const moveShape = useCallback((id: string, dx: number, dy: number) => {
    setShapes(prev => prev.map(shape => {
      if (shape.id !== id) return shape;
      const updated = cloneShape(shape);
      translateShape(updated, dx, dy);
      return updated;
    }));
  }, []);

  const rotateShape = useCallback((id: string, deltaDeg: number = 45) => {
    pushHistory();
    setShapes(prev => prev.map(shape => {
      if (shape.id !== id) return shape;
      const current = shape.rotation || 0;
      const next = (current + deltaDeg + 360) % 360;
      return { ...shape, rotation: next };
    }));
  }, [pushHistory]);

  const scaleShape = useCallback((id: string, factor: number) => {
    pushHistory();
    setShapes(prev => prev.map(shape => {
      if (shape.id !== id) return shape;
      const updated = cloneShape(shape);

      if (shape.type === 'pen' || shape.type === 'connector') {
        if (updated.points) {
          const centerX = updated.points.reduce((sum, p) => sum + p.x, 0) / updated.points.length;
          const centerY = updated.points.reduce((sum, p) => sum + p.y, 0) / updated.points.length;
          updated.points = updated.points.map(p => ({
            x: centerX + (p.x - centerX) * factor,
            y: centerY + (p.y - centerY) * factor,
          }));
        }
        return updated;
      }

      if (['text', 'callout'].includes(shape.type)) {
        if (updated.x !== undefined && updated.y !== undefined) {
          updated.x = updated.x * factor;
          updated.y = updated.y * factor;
        }
        return updated;
      }

      if (shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
        const centerX = (shape.x1 + shape.x2) / 2;
        const centerY = (shape.y1 + shape.y2) / 2;
        updated.x1 = centerX + (shape.x1 - centerX) * factor;
        updated.y1 = centerY + (shape.y1 - centerY) * factor;
        updated.x2 = centerX + (shape.x2 - centerX) * factor;
        updated.y2 = centerY + (shape.y2 - centerY) * factor;
      }

      return updated;
    }));
  }, [pushHistory]);

  return {
    // Estado
    state,
    shapes,
    historyLength,

    // Setters
    setTool,
    setStroke,
    setFill,
    setLineWidth,
    setOpacity,
    setFontSize,
    setFocusStyle,
    setSpotlightStyle,
    setDashed,
    setTextDraft,

    // Acciones
    startDrawing,
    continueDrawing,
    finishDrawing,
    cancelDrawing,
    undo,
    deleteShape,
    deleteAll,
    duplicateShape,
    selectShape,
    bringToFront,
    sendToBack,
    updateShapeText,
    updateShapeFontSize,
    updateShapeStroke,
    addConnectorPlayer,
    clearConnectorPlayers,
    moveShape,
    rotateShape,
    scaleShape,
  };
}

// Funciones de utilidad
function cloneShape(shape: DrawingShape): DrawingShape {
  return JSON.parse(JSON.stringify(shape));
}

function translateShape(shape: DrawingShape, dx: number, dy: number) {
  if (shape.type === 'pen' || shape.type === 'connector') {
    if (shape.points) {
      shape.points = shape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    }
    return;
  }

  if (['text', 'callout'].includes(shape.type)) {
    if (shape.x !== undefined) shape.x += dx;
    if (shape.y !== undefined) shape.y += dy;
    return;
  }

  if (shape.x1 !== undefined) shape.x1 += dx;
  if (shape.y1 !== undefined) shape.y1 += dy;
  if (shape.x2 !== undefined) shape.x2 += dx;
  if (shape.y2 !== undefined) shape.y2 += dy;
}
