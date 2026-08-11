-- Escudos oficiales extraidos de Futbol Aragon para el grupo del Juvenil B
-- HUESCA-S.D. ESCUELA DE FUTBOL, temporada 2026-2027.
-- Fuente:
-- https://www.futbolaragon.com/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodTemporada=22&CodGrupo=23183319&CodCompeticion=23183317&CodJornada=1

CREATE TEMP TABLE tmp_escudos_juvenil_b_2627 (
  nombre TEXT NOT NULL,
  logo_url TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_escudos_juvenil_b_2627 (nombre, logo_url)
VALUES
  ('PEÑAS OSCENSES-C.D. Aramovil', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000080862_penas_oscenses_2.jpg'),
  ('PEÑAS OSCENSES-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000080862_penas_oscenses_2.jpg'),
  ('PENAS OSCENSES-C.D. Aramovil', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000080862_penas_oscenses_2.jpg'),
  ('PENAS OSCENSES-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000080862_penas_oscenses_2.jpg'),
  ('HUESCA-S.D. ESCUELA DE FUTBOL', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png'),
  ('MONZON FUTBOL BASE - Mallazo', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000139369_escudocolorfaf.jpg'),
  ('MONZON FUTBOL BASE', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000139369_escudocolorfaf.jpg'),
  ('HUESCA-S.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000223477_huesca_sd.png'),
  ('ALMUDEVAR A.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000040474_ESCUDO%20ALMUDEVAR.jpg'),
  ('BARBASTRO-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000400603_Escudo_02.png'),
  ('SOBRARBE-ESCUELA DEP.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000315862_logo_escuela.jpg'),
  ('HUESCA INTERNATIONAL FOOTBALL ACADEMY "A"', 'https://files.futbolaragon.com/pnfg/img/web_responsive_2/ESP/escudo_sm_resultados_.jpg'),
  ('HUESCA INTERNATIONAL FOOTBALL ACADEMY', 'https://files.futbolaragon.com/pnfg/img/web_responsive_2/ESP/escudo_sm_resultados_.jpg'),
  ('JACETANO-C.F. Arok Sport', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000314482_logo_Jacetano_nuevo.png'),
  ('JACETANO-C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000314482_logo_Jacetano_nuevo.png'),
  ('BINEFAR-FUTBOL BASE', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000460195_Logo_Club.jpg');

UPDATE equipos e
SET logo_url = escudos.logo_url
FROM tmp_escudos_juvenil_b_2627 escudos
WHERE (e.logo_url IS NULL OR e.logo_url = '')
  AND (
    upper(trim(e.nombre)) = upper(trim(escudos.nombre))
    OR upper(trim(coalesce(e.nombre_en_fed, ''))) = upper(trim(escudos.nombre))
  );

UPDATE clubes c
SET escudo_url = escudos.logo_url
FROM tmp_escudos_juvenil_b_2627 escudos
WHERE (c.escudo_url IS NULL OR c.escudo_url = '')
  AND upper(trim(c.nombre)) = upper(trim(escudos.nombre));

DO $$
BEGIN
  IF to_regclass('public.equipos_rivales') IS NOT NULL THEN
    EXECUTE '
      UPDATE equipos_rivales r
      SET escudo_url = escudos.logo_url
      FROM tmp_escudos_juvenil_b_2627 escudos
      WHERE (r.escudo_url IS NULL OR r.escudo_url = '''')
        AND upper(trim(r.nombre)) = upper(trim(escudos.nombre))
    ';
  END IF;
END $$;
