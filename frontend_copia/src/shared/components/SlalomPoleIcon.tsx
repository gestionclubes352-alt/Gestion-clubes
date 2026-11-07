// SVG de un palo de slalom con base, para usar como icono personalizado
// Puedes importar este componente y usarlo como <SlalomPoleIcon />
import React from 'react';

const SlalomPoleIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Palo */}
    <rect x="28" y="8" width="8" height="36" rx="4" fill="#FFD600" />
    {/* Base */}
    <ellipse cx="32" cy="52" rx="20" ry="10" fill="#FFD600" stroke="#FFD600" strokeWidth="2" />
    <ellipse cx="32" cy="52" rx="16" ry="7" fill="#FFF176" opacity="0.7" />
  </svg>
);

export default SlalomPoleIcon;
