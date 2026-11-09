-- =====================================================================
-- Elimina todos los partidos que NO son de la Federación (amistosos incluidos).
-- Un partido es federativo si su competición es una competición federativa
-- (cualquiera que no sea 'Amistoso' ni se llame 'AMISTOSO%'), o si ya tiene
-- id_partido_fed / acta_fed.
--
-- Se borran para esos partidos:
--   * share_tokens y match_reports (informes) ligados
--   * pizarras_tacticas ligadas
--   * eventos_calendario de tipo 'Partido'
--   * la fila de partidos
-- Se conservan las competiciones (incluidas las de amistosos, ahora vacías).
--
-- ATENCIÓN: irreversible. Haz copia de seguridad antes de ejecutar.
-- Paso 1 (solo lectura): revisa el recuento antes de borrar.
-- =====================================================================

-- Vista previa: qué se borraría
SELECT competition, count(*) AS partidos
  FROM partidos
 WHERE id_partido_fed IS NULL
   AND acta_fed IS NULL
   AND (competition ILIKE 'AMISTOSO%'
        OR competition IN (SELECT nombre FROM competiciones WHERE tipo = 'Amistoso'))
 GROUP BY competition
 ORDER BY competition;

DO $$
DECLARE
    ids TEXT[];
BEGIN
    SELECT COALESCE(array_agg(id::text), ARRAY[]::text[]) INTO ids
      FROM partidos
     WHERE id_partido_fed IS NULL
       AND acta_fed IS NULL
       AND (competition ILIKE 'AMISTOSO%'
            OR competition IN (SELECT nombre FROM competiciones WHERE tipo = 'Amistoso'));

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
        DELETE FROM eventos_calendario
         WHERE type = 'Partido'
           AND id_partido_fed IS NULL
           AND acta_fed IS NULL
           AND (competition ILIKE 'AMISTOSO%'
                OR competition IN (SELECT nombre FROM competiciones WHERE tipo = 'Amistoso'));
    END IF;

    DELETE FROM partidos WHERE id::text = ANY(ids);
END $$;
