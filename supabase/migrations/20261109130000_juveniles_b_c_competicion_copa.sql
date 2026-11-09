-- =====================================================================
-- Juvenil B y Juvenil C juegan ahora la COPA (Juvenil Preferente G1 / G2 - Huesca).
-- Reapunta su mapeo federativo (equipos.competicion / id_competicion_fed) a la Copa,
-- que es donde tienen partidos y actas hasta que empiece la liga
-- (Juvenil Preferente Grupo 2 - Huesca, 23183317-22-23183319, desde 2026-12-12).
-- Origen: BD federativa local (Docker ffv-postgres), competition_season 23245982-22-*.
--   Juvenil B -> Copa - Juvenil Preferente Grupo 1 - Huesca (23245982-22-23245995)
--   Juvenil C -> Copa - Juvenil Preferente Grupo 2 - Huesca (23245982-22-23245996)
-- Las actas de Copa ya están cargadas en partidos/eventos_calendario (migración 20261108160000).
-- Para volver a la liga al empezar, repetir este UPDATE con la competición de liga.
-- =====================================================================

DO $$
DECLARE
    r RECORD;
    n INT := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('Juvenil B', 'Copa - Juvenil Preferente Grupo 1 - Huesca', '23245982-22-23245995'),
            ('Juvenil C', 'Copa - Juvenil Preferente Grupo 2 - Huesca', '23245982-22-23245996')
        ) AS v(nombre, competicion, id_competicion)
    LOOP
        UPDATE equipos e
           SET competicion        = r.competicion,
               id_competicion_fed = r.id_competicion
          FROM clubes c
         WHERE c.id = e.club_id
           AND c.nombre ILIKE '%huesca%' AND c.nombre ILIKE '%escuela%'
           AND COALESCE(e.es_rival, false) = false
           AND lower(e.nombre) = lower(r.nombre);
        IF FOUND THEN n := n + 1;
        ELSE RAISE NOTICE 'Sin equipo interno para: %', r.nombre;
        END IF;
    END LOOP;
    RAISE NOTICE 'Equipos reapuntados a Copa: %', n;
END $$;
