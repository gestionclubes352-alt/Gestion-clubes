import { useState, useCallback, useRef } from 'react';
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
  lineWidth: 2,
  opacity: 1,
};

export function useDrawingTools() {
  const [state, setState] = useState<DrawingState>(INITIAL_STATE);
  const [shapes, setShapes] = useState<DrawingShape[]>([]);
  const historyRef = useRef<DrawingShape[][]>([]);

  // Herramientas
  const setTool = useCallback((tool: DrawingToolType | null) => {
    setState(prev => ({ ...prev, tool, currentShape: null, isDrawing: false }));
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

  // Utilidades de shapes
  const pushHistory = useCallback(() => {
    historyRef.current.push(shapes.map(cloneShape));
    if (historyRef.current.length > 60) historyRef.current.shift();
  }, [shapes]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current.pop();
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
      focusStyle: state.focusStyle,
      spotlightStyle: state.spotlightStyle,
    };

    if (['pen', 'connector'].includes(state.tool)) {
      newShape.points = [point];
    } else if (['text', 'callout'].includes(state.tool)) {
      newShape.x = point.x;
      newShape.y = point.y;
      newShape.text = 'Texto';
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
        'focus', 'spotlight'].includes(state.currentShape.type) &&
       state.currentShape.x1 === state.currentShape.x2 &&
       state.currentShape.y1 === state.currentShape.y2)
    ) {
      setState(prev => ({ ...prev, isDrawing: false, currentShape: null }));
      return;
    }

    pushHistory();
    setShapes(prev => [...prev, state.currentShape]);
    setState(prev => ({ ...prev, isDrawing: false, currentShape: null }));
  }, [state, pushHistory]);

  const cancelDrawing = useCallback(() => {
    setState(prev => ({ ...prev, isDrawing: false, currentShape: null }));
  }, []);

  const updateShapeText = useCallback((id: string, text: string) => {
    setShapes(prev => prev.map(shape =>
      shape.id === id ? { ...shape, text } : shape
    ));
  }, []);

  return {
    // Estado
    state,
    shapes,

    // Setters
    setTool,
    setStroke,
    setFill,
    setLineWidth,
    setOpacity,
    setFocusStyle,
    setSpotlightStyle,

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
    updateShapeText,
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
