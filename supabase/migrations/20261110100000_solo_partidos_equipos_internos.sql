-- =====================================================================
-- Deja solo los partidos de MIS equipos internos.
-- Elimina:
--   1) todos los amistosos (competición 'AMISTOSO%' o de tipo 'Amistoso')
--   2) todos los partidos en los que ningún lado (local/visitante/nombre_interno)
--      es un equipo interno (equipos.es_rival = false del club Huesca Escuela de Fútbol)
-- Se borran en partidos y en eventos_calendario (tipo 'Partido'), junto con
-- sus informes (match_reports), share_tokens y pizarras_tacticas.
-- Se conservan las competiciones.
--
-- ATENCIÓN: irreversible. Haz copia de seguridad antes de ejecutar.
-- Ejecuta primero la vista previa (bloque 1) y revisa los recuentos.
-- =====================================================================

-- Equipos internos y condición de "partido a eliminar" reutilizables
CREATE TEMP TABLE _internos ON COMMIT PRESERVE ROWS AS
SELECT DISTINCT LOWER(TRIM(e.nombre)) AS nombre
  FROM equipos e
  JOIN clubes cl ON cl.id = e.club_id
                AND cl.nombre ILIKE '%huesca%' AND cl.nombre ILIKE '%escuela%'
 WHERE COALESCE(e.es_rival, false) = false;

-- 1) VISTA PREVIA ------------------------------------------------------
SELECT 'equipos internos' AS concepto, count(*) AS total FROM _internos
UNION ALL
SELECT 'partidos a borrar', count(*) FROM partidos p
 WHERE (p.competition ILIKE 'AMISTOSO%'
        OR p.competition IN (SELECT nombre FROM competiciones WHERE tipo = 'Amistoso'))
    OR NOT (LOWER(TRIM(COALESCE(p.local_team, '')))     IN (SELECT nombre FROM _internos)
         OR LOWER(TRIM(COALESCE(p.visitor_team, '')))   IN (SELECT nombre FROM _internos)
         OR LOWER(TRIM(COALESCE(p.nombre_interno, ''))) IN (SELECT nombre FROM _internos))
UNION ALL
SELECT 'partidos que se quedan', count(*) FROM partidos p
 WHERE NOT (p.competition ILIKE 'AMISTOSO%'
        OR p.competition IN (SELECT nombre FROM competiciones WHERE tipo = 'Amistoso'))
   AND (LOWER(TRIM(COALESCE(p.local_team, '')))     IN (SELECT nombre FROM _internos)
     OR LOWER(TRIM(COALESCE(p.visitor_team, '')))   IN (SELECT nombre FROM _internos)
     OR LOWER(TRIM(COALESCE(p.nombre_interno, ''))) IN (SELECT nombre FROM _internos));

-- 2) BORRADO -----------------------------------------------------------
DO $$
DECLARE
    ids TEXT[];
BEGIN
    IF (SELECT count(*) FROM _internos) = 0 THEN
        RAISE EXCEPTION 'No se encontraron equipos internos; abortando para no borrar todo.';
    END IF;

    SELECT COALESCE(array_agg(p.id::text), ARRAY[]::text[]) INTO ids
      FROM partidos p
     WHERE (p.competition ILIKE 'AMISTOSO%'
            OR p.competition IN (SELECT nombre FROM competiciones WHERE tipo = 'Amistoso'))
        OR NOT (LOWER(TRIM(COALESCE(p.local_team, '')))     IN (SELECT nombre FROM _internos)
             OR LOWER(TRIM(COALESCE(p.visitor_team, '')))   IN (SELECT nombre FROM _internos)
             OR LOWER(TRIM(COALESCE(p.nombre_interno, ''))) IN (SELECT nombre FROM _internos));

    IF to_regclass('public.match_reports') IS NOT NULL THEN
        IF to_regclass('public.share_tokens') IS NOT NULL THEN
            DELETE FROM share_tokens
             WHERE match_report_id IN (SELECT id::text FROM match_reports WHERE partido_id::text = ANY(ids));
        END IF;
        DELETE FROM match_reports WHERE partido_id::text = ANY(ids);
    END IF;

    IF to_regclass('public.pizarras_tacticas') IS NOT NULL THEN
        DELETE FROM pizarras_tacticas WHERE partido_id::text = ANY(ids);
    END IF;

    IF to_regclass('public.eventos_calendario') IS NOT NULL THEN
        DELETE FROM eventos_calendario e
         WHERE e.type = 'Partido'
           AND ((e.competition ILIKE 'AMISTOSO%'
                 OR e.competition IN (SELECT nombre FROM competiciones WHERE tipo = 'Amistoso'))
             OR NOT (LOWER(TRIM(COALESCE(e.local_team, '')))     IN (SELECT nombre FROM _internos)
                  OR LOWER(TRIM(COALESCE(e.visitor_team, '')))   IN (SELECT nombre FROM _internos)
                  OR LOWER(TRIM(COALESCE(e.nombre_interno, ''))) IN (SELECT nombre FROM _internos)));
    END IF;

    DELETE FROM partidos WHERE id::text = ANY(ids);
END $$;

DROP TABLE IF EXISTS _internos;
