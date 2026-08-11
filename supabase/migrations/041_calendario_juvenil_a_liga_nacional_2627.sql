-- Calendario del equipo interno Juvenil A en LIGA NACIONAL JUVENIL, Grupo 6
-- Fuente: Futbol Aragon, temporada 2026-2027
-- https://www.futbolaragon.com/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=22&codcompeticion=23183382&codgrupo=23183383&CodJornada=1

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
    INSERT INTO competiciones (
      nombre,
      tipo,
      categoria,
      temporada,
      numero_partes,
      minutos_por_parte,
      total_minutos
    )
    VALUES (
      'LIGA NACIONAL JUVENIL, Grupo 6',
      'Liga',
      'Juvenil',
      '26/27',
      2,
      45,
      90
    )
    RETURNING id INTO v_competicion_id;
  END IF;

  WITH candidate_teams AS (
    SELECT
      e.id,
      e.club_id,
      lower(trim(coalesce(e.nombre_en_fed, ''))) AS normalized_fed_name,
      lower(trim(coalesce(e.nombre, ''))) AS normalized_name,
      lower(trim(coalesce(c.nombre, ''))) AS normalized_club_name,
      e.created_at
    FROM equipos e
    LEFT JOIN clubes c ON c.id = e.club_id
    WHERE lower(trim(coalesce(nullif(e.sub_equipo, ''), e.nombre))) = 'juvenil a'
  ),
  target_teams AS (
    SELECT *
    FROM candidate_teams
    ORDER BY
      CASE
        WHEN normalized_fed_name = 'ipc la escuela' THEN 0
        WHEN normalized_name = 'ipc la escuela' THEN 1
        WHEN normalized_club_name LIKE '%huesca%' THEN 2
        ELSE 3
      END,
      created_at
    LIMIT 1
  )
  UPDATE equipos e
  SET
    nombre_en_fed = 'IPC LA ESCUELA',
    competicion = 'LIGA NACIONAL JUVENIL, Grupo 6',
    temporada = '26/27',
    categoria = coalesce(nullif(e.categoria, ''), 'Juvenil')
  FROM target_teams tt
  WHERE e.id = tt.id;

  WITH candidate_teams AS (
    SELECT
      e.id,
      lower(trim(coalesce(e.nombre_en_fed, ''))) AS normalized_fed_name,
      lower(trim(coalesce(e.nombre, ''))) AS normalized_name,
      lower(trim(coalesce(c.nombre, ''))) AS normalized_club_name,
      e.created_at
    FROM equipos e
    LEFT JOIN clubes c ON c.id = e.club_id
    WHERE lower(trim(coalesce(nullif(e.sub_equipo, ''), e.nombre))) = 'juvenil a'
  ),
  target_teams AS (
    SELECT *
    FROM candidate_teams
    ORDER BY
      CASE
        WHEN normalized_fed_name = 'ipc la escuela' THEN 0
        WHEN normalized_name = 'ipc la escuela' THEN 1
        WHEN normalized_club_name LIKE '%huesca%' THEN 2
        ELSE 3
      END,
      created_at
    LIMIT 1
  )
  INSERT INTO competicion_equipos (competicion_id, equipo_id, equipo_rival_id)
  SELECT v_competicion_id, tt.id, NULL
  FROM target_teams tt
  WHERE NOT EXISTS (
    SELECT 1
    FROM competicion_equipos ce
    WHERE ce.competicion_id = v_competicion_id
      AND ce.equipo_id = tt.id
  );

  WITH partidos_ipc(jornada, fecha, equipo_local, equipo_visitante) AS (
    VALUES
      (1, DATE '2026-09-06', 'SAN GREGORIO ARRABAL-C.D.', 'IPC LA ESCUELA'),
      (2, DATE '2026-09-13', 'IPC LA ESCUELA', 'HERNAN CORTES JUNQUERA-C.F.'),
      (3, DATE '2026-09-20', 'RACING CLUB ZARAGOZA', 'IPC LA ESCUELA'),
      (4, DATE '2026-09-27', 'IPC LA ESCUELA', 'AMISTAD-U.D.'),
      (5, DATE '2026-10-04', 'ESTADIO MIRALBUENO EL OLIVAR', 'IPC LA ESCUELA'),
      (6, DATE '2026-10-11', 'IPC LA ESCUELA', 'SANTO DOMINGO JUVENTUD C.F.'),
      (7, DATE '2026-10-25', 'FRAGA-FÚTBOL BASE', 'IPC LA ESCUELA'),
      (8, DATE '2026-11-01', 'IPC LA ESCUELA', 'LA LITERA-ESCUELA DEP.'),
      (9, DATE '2026-11-08', 'IPC LA ESCUELA', 'HUESCA-S.D.'),
      (10, DATE '2026-11-15', 'EBRO-C.D.', 'IPC LA ESCUELA'),
      (11, DATE '2026-11-22', 'IPC LA ESCUELA', 'CALAMOCHA-C.F.'),
      (12, DATE '2026-11-29', 'MONTECARLO-U.D.', 'IPC LA ESCUELA'),
      (13, DATE '2026-12-06', 'IPC LA ESCUELA', 'BALSAS PICARRAL-U.D.'),
      (14, DATE '2026-12-13', 'OLIVER-C.D.', 'IPC LA ESCUELA'),
      (15, DATE '2026-12-20', 'IPC LA ESCUELA', 'E.F.B. EJEA'),
      (16, DATE '2027-01-10', 'STADIUM CASABLANCA-C.D.', 'IPC LA ESCUELA'),
      (17, DATE '2027-01-17', 'IPC LA ESCUELA', 'REAL ZARAGOZA S.A.D.'),
      (18, DATE '2027-01-24', 'IPC LA ESCUELA', 'SAN GREGORIO ARRABAL-C.D.'),
      (19, DATE '2027-01-31', 'HERNAN CORTES JUNQUERA-C.F.', 'IPC LA ESCUELA'),
      (20, DATE '2027-02-07', 'IPC LA ESCUELA', 'RACING CLUB ZARAGOZA'),
      (21, DATE '2027-02-14', 'AMISTAD-U.D.', 'IPC LA ESCUELA'),
      (22, DATE '2027-02-21', 'IPC LA ESCUELA', 'ESTADIO MIRALBUENO EL OLIVAR'),
      (23, DATE '2027-02-28', 'SANTO DOMINGO JUVENTUD C.F.', 'IPC LA ESCUELA'),
      (24, DATE '2027-03-07', 'IPC LA ESCUELA', 'FRAGA-FÚTBOL BASE'),
      (25, DATE '2027-03-14', 'LA LITERA-ESCUELA DEP.', 'IPC LA ESCUELA'),
      (26, DATE '2027-03-21', 'HUESCA-S.D.', 'IPC LA ESCUELA'),
      (27, DATE '2027-04-04', 'IPC LA ESCUELA', 'EBRO-C.D.'),
      (28, DATE '2027-04-11', 'CALAMOCHA-C.F.', 'IPC LA ESCUELA'),
      (29, DATE '2027-04-18', 'IPC LA ESCUELA', 'MONTECARLO-U.D.'),
      (30, DATE '2027-04-25', 'BALSAS PICARRAL-U.D.', 'IPC LA ESCUELA'),
      (31, DATE '2027-05-02', 'IPC LA ESCUELA', 'OLIVER-C.D.'),
      (32, DATE '2027-05-09', 'E.F.B. EJEA', 'IPC LA ESCUELA'),
      (33, DATE '2027-05-16', 'IPC LA ESCUELA', 'STADIUM CASABLANCA-C.D.'),
      (34, DATE '2027-05-23', 'REAL ZARAGOZA S.A.D.', 'IPC LA ESCUELA')
  )
  INSERT INTO calendario_competicion (
    competicion_id,
    jornada,
    fecha,
    equipo_local,
    equipo_visitante
  )
  SELECT
    v_competicion_id,
    p.jornada,
    p.fecha,
    p.equipo_local,
    p.equipo_visitante
  FROM partidos_ipc p
  WHERE NOT EXISTS (
    SELECT 1
    FROM calendario_competicion cc
    WHERE cc.competicion_id = v_competicion_id
      AND cc.jornada = p.jornada
      AND cc.fecha = p.fecha
      AND cc.equipo_local = p.equipo_local
      AND cc.equipo_visitante = p.equipo_visitante
  );

  WITH partidos_ipc(jornada, fecha, equipo_local, equipo_visitante) AS (
    VALUES
      (1, DATE '2026-09-06', 'SAN GREGORIO ARRABAL-C.D.', 'IPC LA ESCUELA'),
      (2, DATE '2026-09-13', 'IPC LA ESCUELA', 'HERNAN CORTES JUNQUERA-C.F.'),
      (3, DATE '2026-09-20', 'RACING CLUB ZARAGOZA', 'IPC LA ESCUELA'),
      (4, DATE '2026-09-27', 'IPC LA ESCUELA', 'AMISTAD-U.D.'),
      (5, DATE '2026-10-04', 'ESTADIO MIRALBUENO EL OLIVAR', 'IPC LA ESCUELA'),
      (6, DATE '2026-10-11', 'IPC LA ESCUELA', 'SANTO DOMINGO JUVENTUD C.F.'),
      (7, DATE '2026-10-25', 'FRAGA-FÚTBOL BASE', 'IPC LA ESCUELA'),
      (8, DATE '2026-11-01', 'IPC LA ESCUELA', 'LA LITERA-ESCUELA DEP.'),
      (9, DATE '2026-11-08', 'IPC LA ESCUELA', 'HUESCA-S.D.'),
      (10, DATE '2026-11-15', 'EBRO-C.D.', 'IPC LA ESCUELA'),
      (11, DATE '2026-11-22', 'IPC LA ESCUELA', 'CALAMOCHA-C.F.'),
      (12, DATE '2026-11-29', 'MONTECARLO-U.D.', 'IPC LA ESCUELA'),
      (13, DATE '2026-12-06', 'IPC LA ESCUELA', 'BALSAS PICARRAL-U.D.'),
      (14, DATE '2026-12-13', 'OLIVER-C.D.', 'IPC LA ESCUELA'),
      (15, DATE '2026-12-20', 'IPC LA ESCUELA', 'E.F.B. EJEA'),
      (16, DATE '2027-01-10', 'STADIUM CASABLANCA-C.D.', 'IPC LA ESCUELA'),
      (17, DATE '2027-01-17', 'IPC LA ESCUELA', 'REAL ZARAGOZA S.A.D.'),
      (18, DATE '2027-01-24', 'IPC LA ESCUELA', 'SAN GREGORIO ARRABAL-C.D.'),
      (19, DATE '2027-01-31', 'HERNAN CORTES JUNQUERA-C.F.', 'IPC LA ESCUELA'),
      (20, DATE '2027-02-07', 'IPC LA ESCUELA', 'RACING CLUB ZARAGOZA'),
      (21, DATE '2027-02-14', 'AMISTAD-U.D.', 'IPC LA ESCUELA'),
      (22, DATE '2027-02-21', 'IPC LA ESCUELA', 'ESTADIO MIRALBUENO EL OLIVAR'),
      (23, DATE '2027-02-28', 'SANTO DOMINGO JUVENTUD C.F.', 'IPC LA ESCUELA'),
      (24, DATE '2027-03-07', 'IPC LA ESCUELA', 'FRAGA-FÚTBOL BASE'),
      (25, DATE '2027-03-14', 'LA LITERA-ESCUELA DEP.', 'IPC LA ESCUELA'),
      (26, DATE '2027-03-21', 'HUESCA-S.D.', 'IPC LA ESCUELA'),
      (27, DATE '2027-04-04', 'IPC LA ESCUELA', 'EBRO-C.D.'),
      (28, DATE '2027-04-11', 'CALAMOCHA-C.F.', 'IPC LA ESCUELA'),
      (29, DATE '2027-04-18', 'IPC LA ESCUELA', 'MONTECARLO-U.D.'),
      (30, DATE '2027-04-25', 'BALSAS PICARRAL-U.D.', 'IPC LA ESCUELA'),
      (31, DATE '2027-05-02', 'IPC LA ESCUELA', 'OLIVER-C.D.'),
      (32, DATE '2027-05-09', 'E.F.B. EJEA', 'IPC LA ESCUELA'),
      (33, DATE '2027-05-16', 'IPC LA ESCUELA', 'STADIUM CASABLANCA-C.D.'),
      (34, DATE '2027-05-23', 'REAL ZARAGOZA S.A.D.', 'IPC LA ESCUELA')
  ),
  candidate_teams AS (
    SELECT
      e.id,
      e.club_id,
      lower(trim(coalesce(e.nombre_en_fed, ''))) AS normalized_fed_name,
      lower(trim(coalesce(e.nombre, ''))) AS normalized_name,
      lower(trim(coalesce(c.nombre, ''))) AS normalized_club_name,
      e.created_at
    FROM equipos e
    LEFT JOIN clubes c ON c.id = e.club_id
    WHERE lower(trim(coalesce(nullif(e.sub_equipo, ''), e.nombre))) = 'juvenil a'
  ),
  target_teams AS (
    SELECT *
    FROM candidate_teams
    ORDER BY
      CASE
        WHEN normalized_fed_name = 'ipc la escuela' THEN 0
        WHEN normalized_name = 'ipc la escuela' THEN 1
        WHEN normalized_club_name LIKE '%huesca%' THEN 2
        ELSE 3
      END,
      created_at
    LIMIT 1
  )
  INSERT INTO eventos_calendario (
    club_id,
    title,
    type,
    date,
    time,
    team,
    competition,
    jornada,
    local_team,
    visitor_team,
    local_team_club_id,
    visitor_team_club_id,
    opponent,
    status,
    nombre_interno
  )
  SELECT
    tt.club_id::text,
    'Jornada ' || p.jornada || ' - ' ||
      CASE
        WHEN p.equipo_local = 'IPC LA ESCUELA' THEN p.equipo_visitante
        ELSE p.equipo_local
      END,
    'Partido',
    p.fecha::timestamptz,
    NULL,
    'Juvenil A',
    'LIGA NACIONAL JUVENIL, Grupo 6',
    p.jornada::text,
    p.equipo_local,
    p.equipo_visitante,
    CASE WHEN p.equipo_local = 'IPC LA ESCUELA' THEN tt.club_id::text ELSE NULL END,
    CASE WHEN p.equipo_visitante = 'IPC LA ESCUELA' THEN tt.club_id::text ELSE NULL END,
    CASE
      WHEN p.equipo_local = 'IPC LA ESCUELA' THEN p.equipo_visitante
      ELSE p.equipo_local
    END,
    'Upcoming',
    'Juvenil A'
  FROM target_teams tt
  CROSS JOIN partidos_ipc p
  WHERE NOT EXISTS (
    SELECT 1
    FROM eventos_calendario ec
    WHERE ec.club_id = tt.club_id::text
      AND ec.type = 'Partido'
      AND ec.competition = 'LIGA NACIONAL JUVENIL, Grupo 6'
      AND ec.jornada = p.jornada::text
      AND ec.date::date = p.fecha
      AND ec.local_team = p.equipo_local
      AND ec.visitor_team = p.equipo_visitante
      AND coalesce(ec.nombre_interno, ec.team, '') = 'Juvenil A'
  );
END $$;
