-- =====================================================================
-- Rellena score y status de partidos y eventos_calendario a partir del acta
-- federativa ya volcada en acta_fed (formato score "local-visitante").
-- Solo toca filas con acta y sin marcador, para no pisar datos manuales.
-- =====================================================================

BEGIN;

UPDATE partidos
   SET score  = acta_fed->>'score',
       status = 'Finished'
 WHERE acta_fed IS NOT NULL
   AND (acta_fed->>'score') ~ '^[0-9]+-[0-9]+$'
   AND (score IS NULL OR score = '');

UPDATE eventos_calendario
   SET score  = acta_fed->>'score',
       status = 'Finished'
 WHERE acta_fed IS NOT NULL
   AND type = 'Partido'
   AND (acta_fed->>'score') ~ '^[0-9]+-[0-9]+$'
   AND (score IS NULL OR score = '');

COMMIT;
