-- Limpieza final: si existe un partido de Juvenil A con hora real, elimina
-- la copia importada sin hora para la misma jornada y fecha.

DO $$
BEGIN
  WITH jornadas_con_partido_con_hora AS (
    SELECT
      date::date AS fecha,
      jornada
    FROM eventos_calendario
    WHERE type = 'Partido'
      AND competition = 'LIGA NACIONAL JUVENIL, Grupo 6'
      AND coalesce(nombre_interno, team, '') = 'Juvenil A'
      AND nullif(trim(coalesce(time, '')), '') IS NOT NULL
    GROUP BY date::date, jornada
  )
  DELETE FROM eventos_calendario ec
  USING jornadas_con_partido_con_hora j
  WHERE ec.type = 'Partido'
    AND ec.competition = 'LIGA NACIONAL JUVENIL, Grupo 6'
    AND coalesce(ec.nombre_interno, ec.team, '') = 'Juvenil A'
    AND ec.date::date = j.fecha
    AND coalesce(ec.jornada, '') = coalesce(j.jornada, '')
    AND nullif(trim(coalesce(ec.time, '')), '') IS NULL;
END $$;
