-- Limpieza de duplicados generados para Juvenil A / IPC LA ESCUELA.
-- La migracion 041 anterior podia seleccionar varios equipos "Juvenil A"
-- de clubes rivales. Esta limpieza conserva el Juvenil A propio de Huesca/IPC
-- y elimina eventos repetidos del mismo partido.

DO $$
DECLARE
  v_competicion_id UUID;
BEGIN
  SELECT id
    INTO v_competicion_id
  FROM competiciones
  WHERE nombre = 'LIGA NACIONAL JUVENIL, Grupo 6'
  ORDER BY created_at
  LIMIT 1;

  IF v_competicion_id IS NULL THEN
    RETURN;
  END IF;

  WITH own_juvenil_a AS (
    SELECT e.id
    FROM equipos e
    LEFT JOIN clubes c ON c.id = e.club_id
    WHERE lower(trim(coalesce(nullif(e.sub_equipo, ''), e.nombre))) = 'juvenil a'
    ORDER BY
      CASE
        WHEN lower(trim(coalesce(e.nombre, ''))) = 'ipc la escuela' THEN 0
        WHEN lower(trim(coalesce(c.nombre, ''))) LIKE '%huesca%' THEN 1
        WHEN lower(trim(coalesce(e.nombre_en_fed, ''))) = 'ipc la escuela' THEN 2
        ELSE 3
      END,
      e.created_at
    LIMIT 1
  )
  UPDATE equipos e
  SET
    nombre_en_fed = NULL,
    competicion = NULL
  FROM clubes c
  WHERE c.id = e.club_id
    AND lower(trim(coalesce(nullif(e.sub_equipo, ''), e.nombre))) = 'juvenil a'
    AND lower(trim(coalesce(e.nombre_en_fed, ''))) = 'ipc la escuela'
    AND e.id NOT IN (SELECT id FROM own_juvenil_a)
    AND lower(trim(coalesce(e.nombre, ''))) <> 'ipc la escuela'
    AND lower(trim(coalesce(c.nombre, ''))) NOT LIKE '%huesca%';

  WITH own_juvenil_a AS (
    SELECT e.id
    FROM equipos e
    LEFT JOIN clubes c ON c.id = e.club_id
    WHERE lower(trim(coalesce(nullif(e.sub_equipo, ''), e.nombre))) = 'juvenil a'
    ORDER BY
      CASE
        WHEN lower(trim(coalesce(e.nombre, ''))) = 'ipc la escuela' THEN 0
        WHEN lower(trim(coalesce(c.nombre, ''))) LIKE '%huesca%' THEN 1
        WHEN lower(trim(coalesce(e.nombre_en_fed, ''))) = 'ipc la escuela' THEN 2
        ELSE 3
      END,
      e.created_at
    LIMIT 1
  )
  DELETE FROM competicion_equipos ce
  USING equipos e
  LEFT JOIN clubes c ON c.id = e.club_id
  WHERE ce.competicion_id = v_competicion_id
    AND ce.equipo_id = e.id
    AND lower(trim(coalesce(nullif(e.sub_equipo, ''), e.nombre))) = 'juvenil a'
    AND e.id NOT IN (SELECT id FROM own_juvenil_a)
    AND lower(trim(coalesce(e.nombre, ''))) <> 'ipc la escuela'
    AND lower(trim(coalesce(c.nombre, ''))) NOT LIKE '%huesca%';

  WITH repeated_events AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY
          date::date,
          jornada,
          local_team,
          visitor_team,
          coalesce(nombre_interno, team, '')
        ORDER BY
          CASE
            WHEN local_team_club_id IS NULL AND visitor_team_club_id IS NULL THEN 0
            ELSE 1
          END,
          created_at,
          id
      ) AS rn
    FROM eventos_calendario
    WHERE type = 'Partido'
      AND competition = 'LIGA NACIONAL JUVENIL, Grupo 6'
      AND coalesce(nombre_interno, team, '') = 'Juvenil A'
      AND (local_team = 'IPC LA ESCUELA' OR visitor_team = 'IPC LA ESCUELA')
  )
  DELETE FROM eventos_calendario ec
  USING repeated_events re
  WHERE ec.id = re.id
    AND re.rn > 1;

  UPDATE eventos_calendario
  SET
    local_team_club_id = CASE
      WHEN local_team = 'IPC LA ESCUELA' THEN NULL
      ELSE local_team_club_id
    END,
    visitor_team_club_id = CASE
      WHEN visitor_team = 'IPC LA ESCUELA' THEN NULL
      ELSE visitor_team_club_id
    END
  WHERE type = 'Partido'
    AND competition = 'LIGA NACIONAL JUVENIL, Grupo 6'
    AND coalesce(nombre_interno, team, '') = 'Juvenil A'
    AND (local_team = 'IPC LA ESCUELA' OR visitor_team = 'IPC LA ESCUELA');

  WITH repeated_calendar_rows AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY competicion_id, jornada, fecha, equipo_local, equipo_visitante
        ORDER BY created_at, id
      ) AS rn
    FROM calendario_competicion
    WHERE competicion_id = v_competicion_id
      AND (equipo_local = 'IPC LA ESCUELA' OR equipo_visitante = 'IPC LA ESCUELA')
  )
  DELETE FROM calendario_competicion cc
  USING repeated_calendar_rows rcr
  WHERE cc.id = rcr.id
    AND rcr.rn > 1;
END $$;
