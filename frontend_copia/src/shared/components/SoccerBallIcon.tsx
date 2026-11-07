// Icono de balón de fútbol: usa el emoji nativo para reproducir fielmente el diseño clásico blanco y negro
import React from 'react';

const SoccerBallIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <span
    role="img"
    aria-label="Balón de fútbol"
    className={className}
    style={{ fontSize: size, lineHeight: 1, display: 'inline-block', filter: 'grayscale(1) contrast(1.4)' }}
  >
    ⚽
  </span>
);

export default SoccerBallIcon;
