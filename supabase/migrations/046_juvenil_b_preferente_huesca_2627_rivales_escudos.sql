-- Configura el Juvenil B de ef huesca en Juvenil Preferente 26/27 y
-- da de alta sus rivales de grupo con escudo oficial.
-- Fuente:
-- https://www.futbolaragon.com/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodTemporada=22&CodGrupo=23183319&CodCompeticion=23183317&CodJornada=1

CREATE TEMP TABLE tmp_juvenil_b_preferente_huesca_2627 (
  nombre TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  es_propio BOOLEAN NOT NULL DEFAULT FALSE
) ON COMMIT DROP;

INSERT INTO tmp_juvenil_b_preferente_huesca_2627 (nombre, logo_url, es_propio)
VALUES
  ('PEÑAS OSCENSES-C.D. Aramovil', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000080862_penas_oscenses_2.jpg', FALSE),
  ('BARBASTRO-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000400603_Escudo_02.png', FALSE),
  ('HUESCA-S.D. ESCUELA DE FUTBOL', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png', TRUE),
  ('SOBRARBE-ESCUELA DEP.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000315862_logo_escuela.jpg', FALSE),
  ('MONZON FUTBOL BASE - Mallazo', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000139369_escudocolorfaf.jpg', FALSE),
  ('HUESCA INTERNATIONAL FOOTBALL ACADEMY "A"', 'https://files.futbolaragon.com/pnfg/img/web_responsive_2/ESP/escudo_sm_resultados_.jpg', FALSE),
  ('HUESCA-S.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000223477_huesca_sd.png', FALSE),
  ('JACETANO-C.F. Arok Sport', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000314482_logo_Jacetano_nuevo.png', FALSE),
  ('ALMUDEVAR A.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000040474_ESCUDO%20ALMUDEVAR.jpg', FALSE),
  ('BINEFAR-FUTBOL BASE', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000460195_Logo_Club.jpg', FALSE);

DO $$
DECLARE
  v_club_id UUID := 'df96bcda-5dff-4997-a546-a77081caa2e2';
  v_equipo_id UUID;
  v_competicion_id UUID;
  v_competicion_nombre TEXT := 'JUVENIL PREFERENTE Grupo 2 - Huesca';
  v_temporada TEXT := '26/27';
  v_fed_url TEXT := 'https://www.futbolaragon.com/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodTemporada=22&CodGrupo=23183319&CodCompeticion=23183317&CodJornada=1';
BEGIN
  SELECT id
    INTO v_competicion_id
  FROM competiciones
  WHERE upper(trim(nombre)) = upper(trim(v_competicion_nombre))
    AND temporada = v_temporada
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
      v_competicion_nombre,
      'Liga',
      'Juvenil',
      v_temporada,
      2,
      45,
      90
    )
    RETURNING id INTO v_competicion_id;
  END IF;

  SELECT id
    INTO v_equipo_id
  FROM equipos
  WHERE club_id = v_club_id
    AND lower(trim(nombre)) = 'juvenil b'
    AND coalesce(es_rival, FALSE) = FALSE
  ORDER BY created_at
  LIMIT 1;

  IF v_equipo_id IS NOT NULL THEN
    UPDATE equipos e
    SET
      nombre_en_fed = 'HUESCA-S.D. ESCUELA DE FUTBOL',
      competicion = v_competicion_nombre,
      temporada = v_temporada,
      categoria = coalesce(nullif(e.categoria, ''), 'Juvenil'),
      logo_url = coalesce(nullif(e.logo_url, ''), (SELECT logo_url FROM tmp_juvenil_b_preferente_huesca_2627 WHERE es_propio)),
      enlace = coalesce(nullif(e.enlace, ''), v_fed_url)
    WHERE e.id = v_equipo_id;

    INSERT INTO competicion_equipos (competicion_id, equipo_id, equipo_rival_id)
    SELECT v_competicion_id, v_equipo_id, NULL
    WHERE NOT EXISTS (
      SELECT 1
      FROM competicion_equipos ce
      WHERE ce.competicion_id = v_competicion_id
        AND ce.equipo_id = v_equipo_id
    );
  END IF;

  UPDATE equipos_rivales r
  SET
    escudo_url = coalesce(nullif(r.escudo_url, ''), t.logo_url),
    competicion = coalesce(nullif(r.competicion, ''), v_competicion_nombre),
    temporada = coalesce(nullif(r.temporada, ''), v_temporada)
  FROM tmp_juvenil_b_preferente_huesca_2627 t
  WHERE r.club_id = v_club_id
    AND t.es_propio = FALSE
    AND upper(trim(r.nombre)) = upper(trim(t.nombre));

  INSERT INTO equipos_rivales (
    club_id,
    nombre,
    escudo_url,
    competicion,
    temporada
  )
  SELECT
    v_club_id,
    t.nombre,
    t.logo_url,
    v_competicion_nombre,
    v_temporada
  FROM tmp_juvenil_b_preferente_huesca_2627 t
  WHERE t.es_propio = FALSE
    AND NOT EXISTS (
      SELECT 1
      FROM equipos_rivales r
      WHERE r.club_id = v_club_id
        AND upper(trim(r.nombre)) = upper(trim(t.nombre))
    );

  INSERT INTO competicion_equipos (competicion_id, equipo_id, equipo_rival_id)
  SELECT
    v_competicion_id,
    NULL,
    r.id
  FROM equipos_rivales r
  JOIN tmp_juvenil_b_preferente_huesca_2627 t
    ON upper(trim(r.nombre)) = upper(trim(t.nombre))
  WHERE r.club_id = v_club_id
    AND t.es_propio = FALSE
    AND NOT EXISTS (
      SELECT 1
      FROM competicion_equipos ce
      WHERE ce.competicion_id = v_competicion_id
        AND ce.equipo_rival_id = r.id
    );
END $$;
