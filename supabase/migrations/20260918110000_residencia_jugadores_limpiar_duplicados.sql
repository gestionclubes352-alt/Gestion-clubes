-- =====================================================
-- Corrige jugadores con más de un registro activo en residencia_jugadores
-- (habitacion_id/numero_habitacion asignados en varias filas a la vez).
-- Se conserva el registro más reciente y se desasignan (habitacion_id/
-- numero_habitacion a NULL) el resto de duplicados activos por jugador.
-- =====================================================

WITH activos_rankeados AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY jugador_id
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM residencia_jugadores
    WHERE fecha_salida IS NULL
      AND habitacion_id IS NOT NULL
)
UPDATE residencia_jugadores rj
SET habitacion_id = NULL,
    numero_habitacion = NULL
FROM activos_rankeados ar
WHERE rj.id = ar.id
  AND ar.rn > 1;
