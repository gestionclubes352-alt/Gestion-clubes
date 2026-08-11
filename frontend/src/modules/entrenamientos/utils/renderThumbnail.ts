import type { DesignerItem } from '../types';

/**
 * Genera una miniatura (JPEG en base64) dibujando directamente los elementos del ejercicio
 * sobre un <canvas> 2D, a partir de sus coordenadas/colores. Es síncrono y no depende del DOM
 * (evita fallos por CSS complejo, fuentes o CORS que sí podían darse capturando el pitch real).
 */
export const renderThumbnail = (items: DesignerItem[], fieldStructure: string = 'campo-total'): string | undefined => {
  try {
    const canvas = document.createElement('canvas');
    const width = 420;
    const height = 272; // proporción aproximada de un campo de fútbol (105 x 68)
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // Campo
    ctx.fillStyle = '#2f5a30';
    ctx.fillRect(0, 0, width, height);

    // Líneas básicas del campo (no se dibujan si la tarea se guardó como estructura 'libre')
    if (fieldStructure !== 'libre') {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.beginPath();
      ctx.moveTo(width / 2, 4);
      ctx.lineTo(width / 2, height - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, height * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Elementos del ejercicio
    const sorted = [...items].sort((a, b) => a.zIndex - b.zIndex);
    for (const item of sorted) {
      const cx = (item.x / 100) * width;
      const cy = (item.y / 100) * height;
      const isPlayer = item.type.startsWith('player-');
      const isCone = item.type === 'cone' || item.type === 'slalom';

      if (item.type === 'zone') {
        const w = ((item.width || 15) / 100) * width;
        const h = ((item.height || 15) / 100) * height;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.setLineDash([4, 3]);
        // A diferencia del resto de elementos, en el diseñador la zona posiciona x/y como su esquina superior-izquierda, no su centro.
        ctx.strokeRect(cx, cy, w, h);
        ctx.setLineDash([]);
      } else if (item.type === 'goal') {
        const w = ((item.width || 16) / 100) * width;
        const h = ((item.height || 8) / 100) * height;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.restore();
        ctx.lineWidth = 1.5;
      } else if (isPlayer || isCone) {
        const scale = item.scale || 1;
        const radius = (isPlayer ? 6 : 4) * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = item.color || '#ffffff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (item.type === 'text') {
        ctx.fillStyle = item.color || '#ffffff';
        ctx.font = `bold ${Math.max(10, (item.fontSize || 16) * 0.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(item.text || '', cx, cy);
      } else {
        // Material genérico (balón, escalera, valla, cono de slalom...)
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = item.color || '#e2e8f0';
        ctx.fill();
      }
    }

    return canvas.toDataURL('image/jpeg', 0.75);
  } catch (err) {
    console.error('Error generando miniatura:', err);
    return undefined;
  }
};
