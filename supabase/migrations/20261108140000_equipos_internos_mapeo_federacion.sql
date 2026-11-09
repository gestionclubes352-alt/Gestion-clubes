-- =====================================================================
-- Mapeo equipo interno -> equipo/competición de la Federación (temporada 2026-27)
-- Origen: BD federativa (ffv_statsbomb_20261102_200113.dump), club 100718
-- (Huesca-S.D. Escuela de Futbol). Se guardan nombre, competición e IDs federativos
-- en cada equipo interno. Solo toca equipos propios de clubes "Huesca ... Escuela".
-- Para Juvenil B y C (que juegan Copa y Liga) se usa la competición de liga.
-- =====================================================================

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS id_equipo_fed VARCHAR(30);
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS id_competicion_fed VARCHAR(40);
COMMENT ON COLUMN equipos.id_equipo_fed IS 'ID del equipo en la federación (team_id)';
COMMENT ON COLUMN equipos.id_competicion_fed IS 'ID de la competición en la federación (competición-temporada-grupo)';

DO $$
DECLARE
    r RECORD;
    n INT := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('Primer Equipo', 'Internacional Huesca',                     '940',      'Tercera RFEF G-17',                                   '23183316-22-23258924'),
            ('Juvenil A',     'Ipc la Escuela',                           '1874190',  'Liga Nacional Juvenil Grupo 6',                       '23183382-22-23183383'),
            ('Juvenil B',     'Huesca International Football Academy',    '5591480',  'Juvenil Preferente Grupo 2 - Huesca',                 '23183317-22-23183319'),
            ('Juvenil C',     'Huesca-S.D. Escuela de Futbol',            '2804926',  'Juvenil Preferente Grupo 2 - Huesca',                 '23183317-22-23183319'),
            ('Juvenil D',     'Huesca International Football Academy',    '22382611', 'Primera Juvenil Grupo 2 - Huesca Occidental',         '23183321-22-23197223'),
            ('Cadete A',      'Huesca-S.D. Escuela de Futbol',            '2804927',  'División Honor Cadete Grupo Único',                   '23183313-22-23183314'),
            ('Cadete B',      'Huesca-S.D. Escuela de Futbol',            '5301041',  'Cadete Autonómica Grupo 1 - Norte',                   '23185096-22-23198208'),
            ('Cadete C',      'Ipc la Escuela',                           '1874191',  'Cadete Preferente Grupo 2 - Huesca',                  '23183325-22-23198218'),
            ('Cadete D',      'Huesca-S.D. Escuela de Futbol',            '6073640',  'Primera Cadete Grupo 2 - Huesca Occidental',          '23183332-22-23362987'),
            ('Infantil A',    'Huesca-S.D. Escuela de Futbol',            '2804928',  'División Honor Infantil',                             '23183315-22-23200330'),
            ('Infantil B',    'Huesca-S.D. Escuela de Futbol',            '4607890',  'Infantil Preferente Grupo 2 - Huesca',                '23183329-22-23200389'),
            ('Infantil C',    'Ipc la Escuela "A"',                       '23215033', 'Primera Infantil Subgrupo 1 - Huesca',                '23183333-22-23362986'),
            ('Infantil D',    'Ipc la Escuela "B"',                       '23292361', 'Primera Infantil Subgrupo 1 - Huesca',                '23183333-22-23362986'),
            ('Alevín A',      'Ipc la Escuela',                           '23215262', 'Segunda Alevín Grupo 5 - Zaragoza',                   '23183372-22-23442812'),
            ('Alevín B',      'Ipc la Escuela',                           '5004161',  'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental', '23596848-22-23596900')
        ) AS v(nombre, nombre_fed, id_equipo, competicion, id_competicion)
    LOOP
        UPDATE equipos e
           SET nombre_en_fed      = r.nombre_fed,
               competicion        = r.competicion,
               id_equipo_fed      = r.id_equipo,
               id_competicion_fed = r.id_competicion
          FROM clubes c
         WHERE c.id = e.club_id
           AND c.nombre ILIKE '%huesca%' AND (c.nombre ILIKE '%escuela%' OR lower(trim(c.nombre)) = 'ef huesca')
           AND COALESCE(e.es_rival, false) = false
           AND lower(e.nombre) = lower(r.nombre);
        IF FOUND THEN n := n + 1;
        ELSE RAISE NOTICE 'Sin equipo interno para: %', r.nombre;
        END IF;
    END LOOP;
    RAISE NOTICE 'Equipos internos actualizados: % de 15', n;
END $$;
