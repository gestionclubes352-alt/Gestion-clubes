import React from 'react';
import type { DrawingShape, Point } from '../types';

interface DrawingShapesProps {
  shapes: DrawingShape[];
  currentShape: DrawingShape | null;
  selectedShapeId: string | null;
  viewBox: string;
  onShapeClick?: (id: string) => void;
  onShapePointerDown?: (e: React.PointerEvent, id: string) => void;
  onRotateShape?: (id: string) => void;
}

// Convierte el grosor elegido en el panel (1-10) a un ancho de trazo expresado
// en unidades del viewBox porcentual (0-100), en la misma escala que ya usaban
// renderFocus/renderSpotlight. Antes el resto de formas usaban shape.lineWidth
// tal cual como strokeWidth, lo que en un viewBox de 100 unidades lo convertía
// en un trazo hasta 10 veces más grueso de lo esperado.
const STROKE_SCALE = 0.18;
const strokeWidthOf = (shape: DrawingShape) => Math.max(0.2, shape.lineWidth * STROKE_SCALE);

export const DrawingShapes: React.FC<DrawingShapesProps> = ({
  shapes,
  currentShape,
  selectedShapeId,
  viewBox,
  onShapeClick,
  onShapePointerDown,
  onRotateShape,
}) => {
  const renderArrow = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const lineWidth = strokeWidthOf(shape);
    const isStraight = shape.type === 'arrowStraight';
    const isSelected = selectedShapeId === shape.id;

    // Punto de control de la curva: desplazamiento perpendicular a la línea,
    // proporcional a la distancia (igual criterio que el motor de canvas de
    // Pintado de Acciones), para que la flecha se arquee de forma natural en
    // cualquier dirección en vez de curvarse siempre hacia arriba.
    const dx = shape.x2 - shape.x1;
    const dy = shape.y2 - shape.y1;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const curveDirection = normalY > 0 ? -1 : 1;
    const curveAmount = isStraight ? 0 : Math.max(2.9, Math.min(distance * 0.35, 13.3));
    const controlX = (shape.x1 + shape.x2) / 2 + normalX * curveAmount * curveDirection;
    const controlY = (shape.y1 + shape.y2) / 2 + normalY * curveAmount * curveDirection;

    const tangentAngle = isStraight
      ? Math.atan2(dy, dx)
      : Math.atan2(shape.y2 - controlY, shape.x2 - controlX);
    const headLength = Math.max(1.5, lineWidth * 4.5);
    const headSpread = Math.PI / 8;
    const headX1 = shape.x2 - headLength * Math.cos(tangentAngle - headSpread);
    const headY1 = shape.y2 - headLength * Math.sin(tangentAngle - headSpread);
    const headX2 = shape.x2 - headLength * Math.cos(tangentAngle + headSpread);
    const headY2 = shape.y2 - headLength * Math.sin(tangentAngle + headSpread);

    const d = isStraight
      ? `M ${shape.x1} ${shape.y1} L ${shape.x2} ${shape.y2}`
      : `M ${shape.x1} ${shape.y1} Q ${controlX} ${controlY} ${shape.x2} ${shape.y2}`;

    return (
      <g key={shape.id} onClick={() => onShapeClick?.(shape.id)} onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)} style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}>
        <path
          d={d}
          stroke={isSelected ? '#00ff00' : shape.stroke}
          strokeWidth={isSelected ? lineWidth * 1.5 : lineWidth}
          opacity={shape.opacity}
          fill="none"
          strokeLinecap="round"
          style={{ pointerEvents: 'auto' }}
        />
        <path
          d={`M ${headX1} ${headY1} L ${shape.x2} ${shape.y2} L ${headX2} ${headY2}`}
          stroke={isSelected ? '#00ff00' : shape.stroke}
          strokeWidth={isSelected ? lineWidth * 1.5 : lineWidth}
          opacity={shape.opacity}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: 'auto' }}
        />
      </g>
    );
  };

  const renderRectangle = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const x = Math.min(shape.x1, shape.x2);
    const y = Math.min(shape.y1, shape.y2);
    const width = Math.abs(shape.x2 - shape.x1);
    const height = Math.abs(shape.y2 - shape.y1);
    const isSelected = selectedShapeId === shape.id;

    return (
      <rect
        key={shape.id}
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={isSelected ? '#00ff00' : shape.stroke}
        strokeWidth={isSelected ? strokeWidthOf(shape) * 1.5 : strokeWidthOf(shape)}
        fill={shape.fill || 'transparent'}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)}
        style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
      />
    );
  };

  const renderEllipse = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const cx = (shape.x1 + shape.x2) / 2;
    const cy = (shape.y1 + shape.y2) / 2;
    const rx = Math.abs(shape.x2 - shape.x1) / 2;
    const ry = Math.abs(shape.y2 - shape.y1) / 2;
    const isSelected = selectedShapeId === shape.id;

    return (
      <ellipse
        key={shape.id}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        stroke={isSelected ? '#00ff00' : shape.stroke}
        strokeWidth={isSelected ? strokeWidthOf(shape) * 1.5 : strokeWidthOf(shape)}
        fill={shape.fill || 'transparent'}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)}
        style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
      />
    );
  };

  const renderZone = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const isSelected = selectedShapeId === shape.id;
    // Zona es similar a elipse pero más ancha
    const cx = (shape.x1 + shape.x2) / 2;
    const cy = (shape.y1 + shape.y2) / 2;
    const rx = Math.abs(shape.x2 - shape.x1) / 2;
    const ry = Math.abs(shape.y2 - shape.y1) / 2 * 0.5; // Más ancha
    if (rx < 0.5 || ry < 0.5) return null;

    // Réplica del efecto "orbe" 3D del motor de canvas de Pintado de Acciones:
    // degradado base de color a oscuro, brillo radial superior y un reflejo
    // diagonal recortado a la elipse.
    const baseGradId = `zone-base-${shape.id}`;
    const glowGradId = `zone-glow-${shape.id}`;
    const highlightGradId = `zone-highlight-${shape.id}`;
    const clipId = `zone-clip-${shape.id}`;

    return (
      <g key={shape.id} onClick={() => onShapeClick?.(shape.id)} onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)} opacity={shape.opacity} style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}>
        <defs>
          <linearGradient id={baseGradId} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={isSelected ? '#00ff00' : shape.stroke} stopOpacity="0.9" />
            <stop offset="58%" stopColor={isSelected ? '#00ff00' : shape.stroke} stopOpacity="0.72" />
            <stop offset="100%" stopColor="#120204" stopOpacity="0.92" />
          </linearGradient>
          <radialGradient id={glowGradId} cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={highlightGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="58%" stopColor="#ffffff" stopOpacity="0.44" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={clipId}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
          </clipPath>
        </defs>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${baseGradId})`} stroke={isSelected ? '#00ff00' : '#f3d8db'} strokeOpacity={isSelected ? 0.8 : 0.34} strokeWidth={isSelected ? strokeWidthOf(shape) * 1.5 : strokeWidthOf(shape)} />
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${glowGradId})`} />
        <polygon
          clipPath={`url(#${clipId})`}
          points={`${cx},${cy - ry} ${cx + rx},${cy - ry + ry * 0.36} ${cx + rx},${cy + ry} ${cx},${cy + ry}`}
          fill={`url(#${highlightGradId})`}
        />
        <line
          x1={cx}
          y1={cy - ry * 0.84}
          x2={cx}
          y2={cy + ry * 0.84}
          stroke="#ffffff"
          strokeOpacity="0.32"
          strokeWidth={Math.max(0.15, shape.lineWidth * 0.1)}
        />
      </g>
    );
  };

  const renderTriangleZone = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const x1 = (shape.x1 + shape.x2) / 2;
    const y1 = Math.min(shape.y1, shape.y2);
    const x2 = Math.min(shape.x1, shape.x2);
    const y2 = Math.max(shape.y1, shape.y2);
    const x3 = Math.max(shape.x1, shape.x2);
    const y3 = y2;
    const isSelected = selectedShapeId === shape.id;

    return (
      <polygon
        key={shape.id}
        points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
        stroke={isSelected ? '#00ff00' : shape.stroke}
        strokeWidth={isSelected ? strokeWidthOf(shape) * 1.5 : strokeWidthOf(shape)}
        fill={shape.fill || 'transparent'}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)}
        style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
      />
    );
  };

  const renderPen = (shape: DrawingShape) => {
    if (!shape.points || shape.points.length < 2) return null;

    const pathData = shape.points.reduce((path, point, i) => {
      return path + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '');
    const isSelected = selectedShapeId === shape.id;

    return (
      <path
        key={shape.id}
        d={pathData}
        stroke={isSelected ? '#00ff00' : shape.stroke}
        strokeWidth={isSelected ? strokeWidthOf(shape) * 1.5 : strokeWidthOf(shape)}
        fill="none"
        opacity={shape.opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        onClick={() => onShapeClick?.(shape.id)}
        onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)}
        style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
      />
    );
  };

  const renderText = (shape: DrawingShape) => {
    if (shape.x === undefined || shape.y === undefined) return null;

    const fontSize = shape.fontSize ?? 16;
    const isSelected = selectedShapeId === shape.id;

    return (
      <text
        key={shape.id}
        x={shape.x}
        y={shape.y}
        fontSize={fontSize}
        fontWeight="bold"
        fill={isSelected ? '#00ff00' : shape.stroke}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)}
        style={{ cursor: isSelected ? 'move' : 'pointer', userSelect: 'none' }}
      >
        {shape.text || ''}
      </text>
    );
  };

  const renderCallout = (shape: DrawingShape) => {
    if (shape.x === undefined || shape.y === undefined) return null;

    const fontSize = shape.fontSize ?? 16;
    const padding = 8;
    const boxWidth = (shape.text?.length || 0) * fontSize * 0.5 + padding * 2;
    const boxHeight = fontSize + padding * 2;
    const isSelected = selectedShapeId === shape.id;

    return (
      <g key={shape.id} onClick={() => onShapeClick?.(shape.id)} onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)} style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}>
        <rect
          x={shape.x}
          y={shape.y - boxHeight}
          width={boxWidth}
          height={boxHeight}
          fill={shape.fill || '#17307a'}
          stroke={isSelected ? '#00ff00' : shape.stroke}
          strokeWidth={isSelected ? strokeWidthOf(shape) * 1.5 : strokeWidthOf(shape)}
          opacity={shape.opacity}
          rx="4"
        />
        <text
          x={shape.x + boxWidth / 2}
          y={shape.y - boxHeight / 2}
          fontSize={fontSize}
          fontWeight="bold"
          fill={isSelected ? '#00ff00' : shape.stroke}
          opacity={shape.opacity}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none' }}
        >
          {shape.text || ''}
        </text>
      </g>
    );
  };

  const renderConnector = (shape: DrawingShape) => {
    return renderPen(shape);
  };

  const renderLine = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const isSelected = selectedShapeId === shape.id;

    return (
      <line
        key={shape.id}
        x1={shape.x1}
        y1={shape.y1}
        x2={shape.x2}
        y2={shape.y2}
        stroke={isSelected ? '#00ff00' : shape.stroke}
        strokeWidth={isSelected ? strokeWidthOf(shape) * 1.5 : strokeWidthOf(shape)}
        opacity={shape.opacity}
        strokeLinecap="round"
        onClick={() => onShapeClick?.(shape.id)}
        onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)}
        style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
      />
    );
  };

  const renderTShape = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const cx = (shape.x1 + shape.x2) / 2;
    const y1 = Math.min(shape.y1, shape.y2);
    const y2 = Math.max(shape.y1, shape.y2);
    const x1 = Math.min(shape.x1, shape.x2);
    const x2 = Math.max(shape.x1, shape.x2);
    const cy = (y1 + y2) / 2;
    const lineWidth = strokeWidthOf(shape);
    const isSelected = selectedShapeId === shape.id;
    const rotation = shape.rotation || 0;

    // Botón de rotar: se sitúa en la esquina superior derecha del bounding box
    // y gira con la propia forma para que quede siempre "fuera" de la T.
    const handleR = Math.max(2, lineWidth * 1.4);
    const handleX = x2 + handleR * 1.5;
    const handleY = y1 - handleR * 1.5;

    return (
      <g key={shape.id} transform={`rotate(${rotation} ${cx} ${cy})`}>
        <g onClick={() => onShapeClick?.(shape.id)} onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)} style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}>
          {/* Línea horizontal */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y1}
            stroke={isSelected ? '#00ff00' : shape.stroke}
            strokeWidth={isSelected ? lineWidth * 1.5 : lineWidth}
            opacity={shape.opacity}
            strokeLinecap="round"
          />
          {/* Línea vertical */}
          <line
            x1={cx}
            y1={y1}
            x2={cx}
            y2={y2}
            stroke={isSelected ? '#00ff00' : shape.stroke}
            strokeWidth={isSelected ? lineWidth * 1.5 : lineWidth}
            opacity={shape.opacity}
            strokeLinecap="round"
          />
        </g>

        {/* Botón de rotación (solo visible si la forma está seleccionada) */}
        {isSelected && onRotateShape && (
          <g
            onClick={(e) => { e.stopPropagation(); onRotateShape(shape.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          >
            <circle cx={handleX} cy={handleY} r={handleR} fill="#00ff00" opacity={0.9} />
            <path
              d={`M ${handleX - handleR * 0.45} ${handleY - handleR * 0.1}
                  A ${handleR * 0.5} ${handleR * 0.5} 0 1 1 ${handleX + handleR * 0.05} ${handleY + handleR * 0.48}`}
              fill="none"
              stroke="#0a2a12"
              strokeWidth={handleR * 0.22}
              strokeLinecap="round"
            />
            <path
              d={`M ${handleX - handleR * 0.45} ${handleY - handleR * 0.1} L ${handleX - handleR * 0.75} ${handleY - handleR * 0.35} M ${handleX - handleR * 0.45} ${handleY - handleR * 0.1} L ${handleX - handleR * 0.15} ${handleY - handleR * 0.28}`}
              fill="none"
              stroke="#0a2a12"
              strokeWidth={handleR * 0.22}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </g>
    );
  };

  const renderFocus = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const x = Math.min(shape.x1, shape.x2);
    const y = Math.min(shape.y1, shape.y2);
    const width = Math.abs(shape.x2 - shape.x1);
    const height = Math.abs(shape.y2 - shape.y1);
    if (width < 1 || height < 1) return null;

    const isSelected = selectedShapeId === shape.id;
    const style = shape.focusStyle || 'cilindrico';
    const cx = x + width / 2;
    const topY = y;
    const bottomY = y + height;
    const gradId = `focus-grad-${shape.id}`;
    const strokeW = Math.max(0.15, shape.lineWidth * 0.18);
    const baseRy = Math.max(0.4, height * 0.03);
    const shapeStroke = isSelected ? '#00ff00' : shape.stroke;

    let body: React.ReactNode;
    if (style === 'cilindrico') {
      const hw = width * 0.35;
      const baseRx = Math.max(1.2, hw * 1.08);
      body = (
        <>
          <rect x={cx - hw} y={topY} width={hw * 2} height={height} fill={`url(#${gradId})`} />
          <line x1={cx - hw} y1={topY} x2={cx - hw} y2={bottomY} stroke={shapeStroke} strokeWidth={strokeW} opacity={0.7} />
          <line x1={cx + hw} y1={topY} x2={cx + hw} y2={bottomY} stroke={shapeStroke} strokeWidth={strokeW} opacity={0.7} />
          <line x1={cx - hw} y1={topY} x2={cx + hw} y2={topY} stroke={shapeStroke} strokeWidth={strokeW} opacity={0.4} />
          <ellipse cx={cx} cy={bottomY} rx={baseRx} ry={baseRy} fill="#ffffff" />
          <path
            d={`M ${cx - baseRx * 0.92} ${bottomY - baseRy * 0.06} A ${baseRx * 0.92} ${baseRy * 0.52} 0 0 0 ${cx + baseRx * 0.92} ${bottomY - baseRy * 0.06}`}
            fill="none"
            stroke={shapeStroke}
            strokeWidth={strokeW * 0.7}
            opacity={0.5}
          />
        </>
      );
    } else {
      const topHW = style === 'estrecho' ? width * 0.19 : width * 0.5;
      const footR = Math.max(0.5, baseRy * 1.6);
      body = (
        <>
          <polygon points={`${cx},${bottomY} ${cx - topHW},${topY} ${cx + topHW},${topY}`} fill={`url(#${gradId})`} />
          <line x1={cx} y1={bottomY} x2={cx - topHW} y2={topY} stroke={shapeStroke} strokeWidth={strokeW} opacity={0.72} />
          <line x1={cx} y1={bottomY} x2={cx + topHW} y2={topY} stroke={shapeStroke} strokeWidth={strokeW} opacity={0.72} />
          <path
            d={`M ${cx - footR} ${bottomY} A ${footR} ${footR} 0 0 0 ${cx + footR} ${bottomY}`}
            fill={shapeStroke}
          />
        </>
      );
    }

    return (
      <g key={shape.id} onClick={() => onShapeClick?.(shape.id)} onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)} opacity={shape.opacity} style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={shapeStroke} stopOpacity={isSelected ? 0.8 : 0.5} />
            <stop offset="50%" stopColor={shapeStroke} stopOpacity={isSelected ? 0.6 : 0.24} />
            <stop offset="100%" stopColor={shapeStroke} stopOpacity={isSelected ? 0.4 : 0.06} />
          </linearGradient>
        </defs>
        {body}
      </g>
    );
  };

  const renderSpotlight = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const x = Math.min(shape.x1, shape.x2);
    const y = Math.min(shape.y1, shape.y2);
    const width = Math.abs(shape.x2 - shape.x1);
    const height = Math.abs(shape.y2 - shape.y1);
    if (width < 1 || height < 1) return null;

    const isSelected = selectedShapeId === shape.id;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;
    const gradId = `spot-grad-${shape.id}`;
    const shapeStroke = isSelected ? '#00ff00' : shape.stroke;

    return (
      <g key={shape.id} onClick={() => onShapeClick?.(shape.id)} onPointerDown={(e) => onShapePointerDown?.(e as any, shape.id)} opacity={shape.opacity} style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}>
        <defs>
          <radialGradient id={gradId} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="45%" stopColor={shapeStroke} stopOpacity={isSelected ? 0.8 : 0.55} />
            <stop offset="100%" stopColor={shapeStroke} stopOpacity={isSelected ? 1 : 0.85} />
          </radialGradient>
        </defs>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${gradId})`} stroke={shapeStroke} strokeWidth={isSelected ? Math.max(0.15, shape.lineWidth * 0.2) * 1.5 : Math.max(0.15, shape.lineWidth * 0.2)} />
        <line x1={cx} y1={cy - ry * 0.85} x2={cx} y2={cy + ry * 0.85} stroke="#ffffff" strokeWidth={Math.max(0.1, shape.lineWidth * 0.12)} opacity={0.35} />
      </g>
    );
  };

  const renderShape = (shape: DrawingShape) => {
    switch (shape.type) {
      case 'arrow':
      case 'arrowStraight':
        return renderArrow(shape);
      case 'rectangle':
        return renderRectangle(shape);
      case 'ellipse':
        return renderEllipse(shape);
      case 'zone':
        return renderZone(shape);
      case 'triangleZone':
        return renderTriangleZone(shape);
      case 'pen':
        return renderPen(shape);
      case 'text':
        return renderText(shape);
      case 'callout':
        return renderCallout(shape);
      case 'connector':
        return renderConnector(shape);
      case 'focus':
        return renderFocus(shape);
      case 'spotlight':
        return renderSpotlight(shape);
      case 'line':
        return renderLine(shape);
      case 'tshape':
        return renderTShape(shape);
      default:
        return null;
    }
  };

  return (
    <>
      {/* Formas completadas */}
      {shapes.map(renderShape)}

      {/* Forma en progreso */}
      {currentShape && renderShape(currentShape)}

      {/* Selección */}
      {selectedShapeId && shapes.find(s => s.id === selectedShapeId) && (
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill="none"
          stroke="#00ff00"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          opacity="0.5"
        />
      )}
    </>
  );
};
