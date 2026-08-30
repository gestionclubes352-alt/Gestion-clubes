export const TURNOS = ['Desayuno', 'Comida', 'Merienda', 'Cena'] as const;
export type Turno = typeof TURNOS[number];

/**
 * Espejo SOLO PRESENTACIONAL de turno_comedor_por_hora() en SQL.
 * La fuente de verdad es el servidor: el fichaje real ignora este cálculo.
 */
export function turnoPorHora(d: Date = new Date()): Turno | null {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m >= 360 && m <= 629) return 'Desayuno';
  if (m >= 750 && m <= 989) return 'Comida';
  if (m >= 990 && m <= 1169) return 'Merienda';
  if (m >= 1200) return 'Cena';
  return null;
}
