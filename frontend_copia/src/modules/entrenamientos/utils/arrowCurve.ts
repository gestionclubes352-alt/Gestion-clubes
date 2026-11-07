interface Point {
  x: number;
  y: number;
}

/**
 * Punto de control de una flecha curva (en % del campo).
 * La curva se arquea hacia arriba del extremo más alto; la inversa, hacia abajo del más bajo.
 */
export const getArrowControlPoint = (start: Point, end: Point, inverse = false): Point => ({
  x: (start.x + end.x) / 2,
  y: inverse ? Math.max(start.y, end.y) + 15 : Math.min(start.y, end.y) - 15,
});
