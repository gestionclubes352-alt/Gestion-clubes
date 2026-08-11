-- Limpieza robusta: conserva los partidos con hora real y elimina duplicados
-- sin hora/placeholder del Juvenil A en Liga Nacional Juvenil.

DO $$
BEGIN
  WITH eventos_juvenil_a AS (
    SELECT
      id,
      date::date AS fecha,
      nullif(trim(coalesce(time, '')), '') AS hora
    FROM eventos_calendario
    WHERE type = 'Partido'
      AND competition ILIKE '%LIGA NACIONAL JUVENIL%'
      AND (
        coalesce(nombre_interno, team, '') = 'Juvenil A'
        OR local_team = 'IPC LA ESCUELA'
        OR visitor_team = 'IPC LA ESCUELA'
      )
  ),
  fechas_con_hora AS (
    SELECT fecha
    FROM eventos_juvenil_a
    WHERE hora IS NOT NULL
      AND hora NOT IN ('--:--', '-:-', '--')
    GROUP BY fecha
  ),
  eventos_sin_hora_duplicados AS (
    SELECT e.id
    FROM eventos_juvenil_a e
    JOIN fechas_con_hora f ON f.fecha = e.fecha
    WHERE e.hora IS NULL
      OR e.hora IN ('--:--', '-:-', '--')
  )
  DELETE FROM eventos_calendario ec
  USING eventos_sin_hora_duplicados d
  WHERE ec.id = d.id;
END $$;
