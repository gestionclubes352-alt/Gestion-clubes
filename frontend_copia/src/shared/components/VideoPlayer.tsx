import React, { useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  playsInline?: boolean;
  autoPlay?: boolean;
  className?: string;
  title?: string;
}

const PLAYBACK_SPEEDS = [
  { value: 1, label: 'x1' },
  { value: 2, label: 'x2' },
  { value: 3, label: 'x3' },
];

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  playsInline = true,
  autoPlay = false,
  className = '',
  title,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState<number>(1);

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const speedLabel = PLAYBACK_SPEEDS.find(s => s.value === speed)?.label || 'x1';

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline={playsInline}
        autoPlay={autoPlay}
        controlsList="nofullscreen"
        className={className}
        title={title}
      />
      {/* Speed selector dropdown */}
      <select
        value={speed}
        onChange={handleSpeedChange}
        className="absolute top-2 right-12 px-3 py-1 text-sm font-semibold bg-white text-black rounded-lg border-0 cursor-pointer hover:bg-gray-100 transition-colors"
        title="Velocidad de reproducción"
      >
        {PLAYBACK_SPEEDS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VideoPlayer;
