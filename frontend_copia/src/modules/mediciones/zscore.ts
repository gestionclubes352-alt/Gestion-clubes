// Nº de respuestas recientes que forman la "tendencia" de cada jugador.
const VENTANA = 10;
// Por debajo de esto la desviación típica no es fiable (demasiado ruidosa).
const MIN_PUNTOS = 3;

function mediaYDesviacion(valores: number[]): { media: number; sd: number } {
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const sd = Math.sqrt(valores.reduce((a, b) => a + (b - media) ** 2, 0) / valores.length);
  return { media, sd };
}

/**
 * Añade el Z-score de cada campo relativo a la TENDENCIA reciente del jugador:
 * la media y desviación típica de sus últimas VENTANA respuestas (no de todo su
 * histórico ni del equipo). Así detecta cambios frente a cómo ha estado
 * respondiendo últimamente, no frente a un promedio fijo de meses atrás.
 *
 * `filas` debe venir ordenado por jugador; se reordena internamente por fecha.
 */
export function conZScoresPorTendencia<T extends { jugador_id: string; fecha: string }>(
  filas: T[],
  campos: Array<[keyof T, string]>
): Array<T & Record<string, number | null>> {
  const porJugador = new Map<string, T[]>();
  for (const f of filas) {
    if (!porJugador.has(f.jugador_id)) porJugador.set(f.jugador_id, []);
    porJugador.get(f.jugador_id)!.push(f);
  }

  const resultado = filas as Array<T & Record<string, number | null>>;

  for (const grupo of porJugador.values()) {
    grupo.sort((a, b) => a.fecha.localeCompare(b.fecha));
    for (const [campo, campoZ] of campos) {
      grupo.forEach((fila, i) => {
        const r: Record<string, number | null> = fila as unknown as Record<string, number | null>;
        const ventana = grupo.slice(Math.max(0, i - VENTANA + 1), i + 1);
        const valores = ventana
          .map((x) => x[campo] as unknown as number | null | undefined)
          .filter((v): v is number => v !== null && v !== undefined);

        const valorActual = fila[campo] as unknown as number | null | undefined;
        if (valorActual === null || valorActual === undefined || valores.length < MIN_PUNTOS) {
          r[campoZ] = null;
          return;
        }
        const { media, sd } = mediaYDesviacion(valores);
        r[campoZ] = sd > 0 ? Math.round(((valorActual - media) / sd) * 100) / 100 : null;
      });
    }
  }

  return resultado;
}

/** Color en función del Z-score. z=0 (en la media reciente) queda neutro,
 * ±2 desviaciones típicas satura a rojo/verde. `invertido` decide qué lado
 * es el malo: para RPE/cansancio un z alto es malo (rojo); para ánimo/sueño/
 * motivación un z alto es bueno (verde). */
export function colorHeat(z: number | null | undefined, invertido: boolean): string {
  if (z === null || z === undefined) return 'transparent';
  let t = (z + 2) / 4;
  t = Math.min(1, Math.max(0, t));
  if (invertido) t = 1 - t;
  const hue = t * 120; // 0=rojo, 120=verde
  return `hsl(${hue}, 60%, 62%)`;
}
