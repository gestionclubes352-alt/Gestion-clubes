import React from 'react';
import type { DrawingShape, Point } from '../types';

interface DrawingShapesProps {
  shapes: DrawingShape[];
  currentShape: DrawingShape | null;
  selectedShapeId: string | null;
  viewBox: string;
  onShapeClick?: (id: string) => void;
}

export const DrawingShapes: React.FC<DrawingShapesProps> = ({
  shapes,
  currentShape,
  selectedShapeId,
  viewBox,
  onShapeClick,
}) => {
  const renderArrow = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
    const arrowHeadSize = Math.max(2, shape.lineWidth);
    const headX1 = shape.x2 - arrowHeadSize * Math.cos(angle - Math.PI / 6);
    const headY1 = shape.y2 - arrowHeadSize * Math.sin(angle - Math.PI / 6);
    const headX2 = shape.x2 - arrowHeadSize * Math.cos(angle + Math.PI / 6);
    const headY2 = shape.y2 - arrowHeadSize * Math.sin(angle + Math.PI / 6);

    if (shape.type === 'arrowStraight') {
      return (
        <g key={shape.id} onClick={() => onShapeClick?.(shape.id)}>
          <line
            x1={shape.x1}
            y1={shape.y1}
            x2={shape.x2}
            y2={shape.y2}
            stroke={shape.stroke}
            strokeWidth={shape.lineWidth}
            opacity={shape.opacity}
            fill="none"
            strokeLinecap="round"
          />
          <polygon
            points={`${shape.x2},${shape.y2} ${headX1},${headY1} ${headX2},${headY2}`}
            fill={shape.stroke}
            opacity={shape.opacity}
          />
        </g>
      );
    }

    // Arrow curvo - usar quadratic curve
    return (
      <g key={shape.id} onClick={() => onShapeClick?.(shape.id)}>
        <path
          d={`M ${shape.x1} ${shape.y1} Q ${(shape.x1 + shape.x2) / 2} ${Math.min(shape.y1, shape.y2) - 20} ${shape.x2} ${shape.y2}`}
          stroke={shape.stroke}
          strokeWidth={shape.lineWidth}
          opacity={shape.opacity}
          fill="none"
          strokeLinecap="round"
        />
        <polygon
          points={`${shape.x2},${shape.y2} ${headX1},${headY1} ${headX2},${headY2}`}
          fill={shape.stroke}
          opacity={shape.opacity}
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

    return (
      <rect
        key={shape.id}
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={shape.stroke}
        strokeWidth={shape.lineWidth}
        fill={shape.fill || 'transparent'}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        style={{ cursor: 'pointer' }}
      />
    );
  };

  const renderEllipse = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const cx = (shape.x1 + shape.x2) / 2;
    const cy = (shape.y1 + shape.y2) / 2;
    const rx = Math.abs(shape.x2 - shape.x1) / 2;
    const ry = Math.abs(shape.y2 - shape.y1) / 2;

    return (
      <ellipse
        key={shape.id}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        stroke={shape.stroke}
        strokeWidth={shape.lineWidth}
        fill={shape.fill || 'transparent'}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        style={{ cursor: 'pointer' }}
      />
    );
  };

  const renderZone = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    // Zona es similar a elipse pero más ancha
    const cx = (shape.x1 + shape.x2) / 2;
    const cy = (shape.y1 + shape.y2) / 2;
    const rx = Math.abs(shape.x2 - shape.x1) / 2;
    const ry = Math.abs(shape.y2 - shape.y1) / 2 * 0.5; // Más ancha

    return (
      <ellipse
        key={shape.id}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        stroke={shape.stroke}
        strokeWidth={shape.lineWidth}
        fill={shape.fill || 'transparent'}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        style={{ cursor: 'pointer' }}
      />
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

    return (
      <polygon
        key={shape.id}
        points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
        stroke={shape.stroke}
        strokeWidth={shape.lineWidth}
        fill={shape.fill || 'transparent'}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        style={{ cursor: 'pointer' }}
      />
    );
  };

  const renderPen = (shape: DrawingShape) => {
    if (!shape.points || shape.points.length < 2) return null;

    const pathData = shape.points.reduce((path, point, i) => {
      return path + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '');

    return (
      <path
        key={shape.id}
        d={pathData}
        stroke={shape.stroke}
        strokeWidth={shape.lineWidth}
        fill="none"
        opacity={shape.opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        onClick={() => onShapeClick?.(shape.id)}
        style={{ cursor: 'pointer' }}
      />
    );
  };

  const renderText = (shape: DrawingShape) => {
    if (shape.x === undefined || shape.y === undefined) return null;

    const fontSize = Math.max(12, shape.lineWidth * 4);

    return (
      <text
        key={shape.id}
        x={shape.x}
        y={shape.y}
        fontSize={fontSize}
        fontWeight="bold"
        fill={shape.stroke}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {shape.text || ''}
      </text>
    );
  };

  const renderCallout = (shape: DrawingShape) => {
    if (shape.x === undefined || shape.y === undefined) return null;

    const fontSize = Math.max(12, shape.lineWidth * 4);
    const padding = 8;
    const boxWidth = (shape.text?.length || 0) * fontSize * 0.5 + padding * 2;
    const boxHeight = fontSize + padding * 2;

    return (
      <g key={shape.id} onClick={() => onShapeClick?.(shape.id)} style={{ cursor: 'pointer' }}>
        <rect
          x={shape.x}
          y={shape.y - boxHeight}
          width={boxWidth}
          height={boxHeight}
          fill={shape.fill || '#17307a'}
          stroke={shape.stroke}
          strokeWidth={shape.lineWidth}
          opacity={shape.opacity}
          rx="4"
        />
        <text
          x={shape.x + boxWidth / 2}
          y={shape.y - boxHeight / 2}
          fontSize={fontSize}
          fontWeight="bold"
          fill={shape.stroke}
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

  const renderFocus = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    // Simplificación: focus como rectángulo con borde
    const x = Math.min(shape.x1, shape.x2);
    const y = Math.min(shape.y1, shape.y2);
    const width = Math.abs(shape.x2 - shape.x1);
    const height = Math.abs(shape.y2 - shape.y1);

    if (shape.focusStyle === 'abierto') {
      return (
        <g key={shape.id} onClick={() => onShapeClick?.(shape.id)}>
          <rect x={x} y={y} width={width} height={height} fill="none" stroke={shape.stroke} strokeWidth={shape.lineWidth} opacity={shape.opacity} />
          <line x1={x + width * 0.2} y1={y} x2={x + width * 0.2} y2={y - 10} stroke={shape.stroke} strokeWidth={shape.lineWidth} opacity={shape.opacity} />
          <line x1={x + width * 0.8} y1={y} x2={x + width * 0.8} y2={y - 10} stroke={shape.stroke} strokeWidth={shape.lineWidth} opacity={shape.opacity} />
        </g>
      );
    }

    return (
      <rect
        key={shape.id}
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={shape.stroke}
        strokeWidth={shape.lineWidth}
        fill={shape.fill || 'transparent'}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
      />
    );
  };

  const renderSpotlight = (shape: DrawingShape) => {
    if (shape.x1 === undefined || shape.y1 === undefined || shape.x2 === undefined || shape.y2 === undefined) return null;

    const cx = shape.x1;
    const cy = shape.y1;
    const radius = Math.abs(shape.x2 - shape.x1);

    if (shape.spotlightStyle === 'beams') {
      return (
        <g key={shape.id} onClick={() => onShapeClick?.(shape.id)}>
          {[0, Math.PI / 3, (Math.PI * 2) / 3, Math.PI, (Math.PI * 4) / 3, (Math.PI * 5) / 3].map((angle, i) => (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + radius * Math.cos(angle)}
              y2={cy + radius * Math.sin(angle)}
              stroke={shape.stroke}
              strokeWidth={shape.lineWidth}
              opacity={shape.opacity * 0.6}
            />
          ))}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke={shape.stroke} strokeWidth={shape.lineWidth} opacity={shape.opacity} />
        </g>
      );
    }

    return (
      <circle
        key={shape.id}
        cx={cx}
        cy={cy}
        r={radius}
        fill={shape.spotlightStyle === 'filled' ? shape.fill : 'none'}
        stroke={shape.stroke}
        strokeWidth={shape.lineWidth}
        opacity={shape.opacity}
        onClick={() => onShapeClick?.(shape.id)}
        style={{ cursor: 'pointer' }}
      />
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
