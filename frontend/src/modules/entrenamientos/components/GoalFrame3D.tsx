import { useId, type FC } from 'react';

interface GoalFrame3DProps {
  className?: string;
  compact?: boolean;
  isFlipped?: boolean;
}

const GoalFrame3D: FC<GoalFrame3DProps> = ({ className = '', compact = false, isFlipped = false }) => {
  const rawId = useId().replace(/:/g, '');
  const depth = compact ? 42 : 56;
  const inset = compact ? 8 : 10;
  const frontLeft = 2;
  const frontRight = 98;
  const rearLeft = inset;
  const rearRight = 100 - inset;
  const glowId = `goal3d-glow-${rawId}`;
  const tubeWidth = compact ? 3.2 : 4.6;

  const sideHorizontalLines = [25, 50, 75];
  const sideDepthLines = [0.25, 0.5, 0.75];
  const rearVerticalLines = [0.2, 0.4, 0.6, 0.8];
  const rearHorizontalLines = [0.25, 0.5, 0.75];

  return (
    <div
      className={`relative h-full w-full overflow-visible ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'scaleY(-1)' : undefined,
      }}
    >
      <div
        className="absolute inset-x-[-8%] bottom-[-10%] h-[42%] rounded-full bg-black/35 blur-[7px]"
        style={{ transform: 'translateZ(-2px)' }}
      />

      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ overflow: 'visible', transform: 'translateZ(6px)' }}
        aria-hidden="true"
      >
        <defs>
          <filter id={glowId} x="-35%" y="-70%" width="170%" height="220%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polygon
          points={`${frontLeft},0 ${rearLeft},${-depth} ${rearLeft},${100 - depth} ${frontLeft},100`}
          fill="rgba(255,255,255,0.07)"
          stroke="rgba(255,255,255,0.26)"
          strokeWidth="0.9"
          vectorEffect="non-scaling-stroke"
        />
        <polygon
          points={`${frontRight},0 ${rearRight},${-depth} ${rearRight},${100 - depth} ${frontRight},100`}
          fill="rgba(255,255,255,0.07)"
          stroke="rgba(255,255,255,0.26)"
          strokeWidth="0.9"
          vectorEffect="non-scaling-stroke"
        />
        <polygon
          points={`${frontLeft},0 ${rearLeft},${-depth} ${rearRight},${-depth} ${frontRight},0`}
          fill="rgba(255,255,255,0.09)"
          stroke="rgba(255,255,255,0.32)"
          strokeWidth="0.9"
          vectorEffect="non-scaling-stroke"
        />

        <g stroke="rgba(255,255,255,0.32)" strokeWidth="0.7" vectorEffect="non-scaling-stroke">
          {sideHorizontalLines.map(y => (
            <g key={`side-horizontal-${y}`}>
              <line x1={frontLeft} y1={y} x2={rearLeft} y2={y - depth} />
              <line x1={frontRight} y1={y} x2={rearRight} y2={y - depth} />
            </g>
          ))}
          {sideDepthLines.map(t => {
            const leftX = frontLeft + (rearLeft - frontLeft) * t;
            const rightX = frontRight + (rearRight - frontRight) * t;
            const topY = -depth * t;
            const bottomY = 100 - depth * t;

            return (
              <g key={`side-depth-${t}`}>
                <line x1={leftX} y1={topY} x2={leftX} y2={bottomY} />
                <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} />
              </g>
            );
          })}
          {rearVerticalLines.map(t => {
            const x = rearLeft + (rearRight - rearLeft) * t;
            return <line key={`rear-vertical-${t}`} x1={x} y1={-depth} x2={x} y2={100 - depth} />;
          })}
          {rearHorizontalLines.map(t => {
            const y = -depth + 100 * t;
            return <line key={`rear-horizontal-${t}`} x1={rearLeft} y1={y} x2={rearRight} y2={y} />;
          })}
        </g>

        <g
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        >
          <path
            d={`M ${rearLeft} ${100 - depth} L ${rearLeft} ${-depth} L ${rearRight} ${-depth} L ${rearRight} ${100 - depth}`}
            stroke="rgba(255,255,255,0.58)"
            strokeWidth={tubeWidth * 0.72}
          />
          <path
            d={`M ${frontLeft} 0 L ${rearLeft} ${-depth} M ${frontRight} 0 L ${rearRight} ${-depth} M ${frontLeft} 100 L ${rearLeft} ${100 - depth} M ${frontRight} 100 L ${rearRight} ${100 - depth}`}
            stroke="rgba(255,255,255,0.78)"
            strokeWidth={tubeWidth * 0.64}
          />
          <path
            d={`M ${frontLeft} 100 L ${frontLeft} 0 L ${frontRight} 0 L ${frontRight} 100`}
            stroke="rgba(255,255,255,0.98)"
            strokeWidth={tubeWidth}
            filter={`url(#${glowId})`}
          />
        </g>
      </svg>
    </div>
  );
};

export default GoalFrame3D;
