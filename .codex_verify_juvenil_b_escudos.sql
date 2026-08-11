WITH escudos(nombre) AS (
  VALUES
    ('PEÑAS OSCENSES-C.D. Aramovil'),
    ('PEÑAS OSCENSES-C.D.'),
    ('PENAS OSCENSES-C.D. Aramovil'),
    ('PENAS OSCENSES-C.D.'),
    ('HUESCA-S.D. ESCUELA DE FUTBOL'),
    ('MONZON FUTBOL BASE - Mallazo'),
    ('MONZON FUTBOL BASE'),
    ('HUESCA-S.D.'),
    ('ALMUDEVAR A.D.'),
    ('BARBASTRO-U.D.'),
    ('SOBRARBE-ESCUELA DEP.'),
    ('HUESCA INTERNATIONAL FOOTBALL ACADEMY "A"'),
    ('HUESCA INTERNATIONAL FOOTBALL ACADEMY'),
    ('JACETANO-C.F. Arok Sport'),
    ('JACETANO-C.F.'),
    ('BINEFAR-FUTBOL BASE')
)
SELECT
  'equipos' AS tabla,
  count(*) FILTER (WHERE coalesce(e.logo_url, '') <> '') AS con_escudo
FROM equipos e
JOIN escudos s
  ON upper(trim(e.nombre)) = upper(trim(s.nombre))
  OR upper(trim(coalesce(e.nombre_en_fed, ''))) = upper(trim(s.nombre))
UNION ALL
SELECT
  'clubes' AS tabla,
  count(*) FILTER (WHERE coalesce(c.escudo_url, '') <> '') AS con_escudo
FROM clubes c
JOIN escudos s
  ON upper(trim(c.nombre)) = upper(trim(s.nombre));
