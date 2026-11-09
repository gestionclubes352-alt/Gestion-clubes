-- =====================================================================
-- Sustituye las competiciones de la web app por las de la Federación (temporada 2026-27)
-- Origen: BD federativa, club 100718 (Huesca-S.D. Escuela de Futbol): 17 equipos-competición.
--  * Se borran TODAS las competiciones salvo los amistosos (nombre 'AMISTOSO%' o tipo 'Amistoso').
--    Al borrar, se eliminan en cascada sus competicion_equipos y calendario_competicion.
--  * Se insertan las 16 competiciones federativas distintas (Juvenil Preferente G2 se comparte
--    por Juvenil B y C, que ahora están en Copa pero también aparecen en la liga).
--  * Se vincula cada equipo interno (equipos.id_equipo_fed) a sus competiciones en competicion_equipos.
-- partidos / eventos_calendario guardan el nombre de la competición como texto: no se ven afectados.
-- Partes/minutos por categoría: Primer Equipo/Juvenil 2x45, Cadete 2x40, Infantil 2x35, Alevín 2x30.
-- =====================================================================

BEGIN;

DELETE FROM competiciones
 WHERE tipo IS DISTINCT FROM 'Amistoso'
   AND nombre NOT ILIKE 'AMISTOSO%';

CREATE TEMP TABLE _comp_fed (
    id_competicion TEXT, nombre TEXT, tipo TEXT, categoria TEXT, minutos INT, id_equipo TEXT
) ON COMMIT DROP;

INSERT INTO _comp_fed VALUES
    ('23185096-22-23198208', 'Cadete Autonómica Grupo 1 - Norte',                   'Liga', 'Cadete',        40, '5301041'),
    ('23183325-22-23198218', 'Cadete Preferente Grupo 2 - Huesca',                  'Liga', 'Cadete',        40, '1874191'),
    ('23245982-22-23245995', 'Copa - Juvenil Preferente Grupo 1 - Huesca',          'Copa', 'Juvenil',       45, '5591480'),
    ('23245982-22-23245996', 'Copa - Juvenil Preferente Grupo 2 - Huesca',          'Copa', 'Juvenil',       45, '2804926'),
    ('23183313-22-23183314', 'División Honor Cadete Grupo Único',                   'Liga', 'Cadete',        40, '2804927'),
    ('23183315-22-23200330', 'División Honor Infantil',                             'Liga', 'Infantil',      35, '2804928'),
    ('23183329-22-23200389', 'Infantil Preferente Grupo 2 - Huesca',                'Liga', 'Infantil',      35, '4607890'),
    ('23183317-22-23183319', 'Juvenil Preferente Grupo 2 - Huesca',                 'Liga', 'Juvenil',       45, '5591480'),
    ('23183317-22-23183319', 'Juvenil Preferente Grupo 2 - Huesca',                 'Liga', 'Juvenil',       45, '2804926'),
    ('23183382-22-23183383', 'Liga Nacional Juvenil Grupo 6',                       'Liga', 'Juvenil',       45, '1874190'),
    ('23183332-22-23362987', 'Primera Cadete Grupo 2 - Huesca Occidental',          'Liga', 'Cadete',        40, '6073640'),
    ('23183333-22-23362986', 'Primera Infantil Subgrupo 1 - Huesca',                'Liga', 'Infantil',      35, '23215033'),
    ('23183333-22-23362986', 'Primera Infantil Subgrupo 1 - Huesca',                'Liga', 'Infantil',      35, '23292361'),
    ('23183321-22-23197223', 'Primera Juvenil Grupo 2 - Huesca Occidental',         'Liga', 'Juvenil',       45, '22382611'),
    ('23596848-22-23596900', 'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental', 'Liga', 'Alevín',        30, '5004161'),
    ('23183372-22-23442812', 'Segunda Alevín Grupo 5 - Zaragoza',                   'Liga', 'Alevín',        30, '23215262'),
    ('23183316-22-23258924', 'Tercera RFEF G-17',                                   'Liga', 'Primer Equipo', 45, '940');

-- Competiciones federativas (una por id de competición); evita duplicar si ya existe por nombre
INSERT INTO competiciones (nombre, tipo, categoria, temporada, numero_partes, minutos_por_parte, total_minutos)
SELECT DISTINCT c.nombre, c.tipo, c.categoria, '26/27', 2, c.minutos, c.minutos * 2
  FROM _comp_fed c
 WHERE NOT EXISTS (SELECT 1 FROM competiciones x WHERE x.nombre = c.nombre AND x.temporada = '26/27');

-- Equipos internos del club -> competiciones federativas
INSERT INTO competicion_equipos (competicion_id, equipo_id)
SELECT DISTINCT comp.id, e.id
  FROM _comp_fed c
  JOIN competiciones comp ON comp.nombre = c.nombre AND comp.temporada = '26/27'
  JOIN equipos e ON e.id_equipo_fed = c.id_equipo AND COALESCE(e.es_rival, false) = false
  JOIN clubes cl ON cl.id = e.club_id
                AND cl.nombre ILIKE '%huesca%' AND cl.nombre ILIKE '%escuela%'
ON CONFLICT (competicion_id, equipo_id) DO NOTHING;

COMMIT;

SELECT c.nombre, c.tipo, c.numero_partes, c.minutos_por_parte,
       (SELECT count(*) FROM competicion_equipos ce WHERE ce.competicion_id = c.id) AS equipos
  FROM competiciones c
 ORDER BY c.tipo, c.nombre;
