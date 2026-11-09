-- =====================================================================
-- Goles recibidos por jugador y partido: goles del rival mientras el jugador estuvo en campo.
-- Se calcula a partir de acta_fed (goles con marcador acumulado y cambios), usando
-- el minuto de entrada (0 si es titular, o el minuto del cambio) y los minutos jugados.
-- Un gol en el minuto M cuenta si entrada < M <= entrada + minutos.
-- Idempotente: se puede relanzar.
-- =====================================================================

BEGIN;

ALTER TABLE estadisticas_partido_jugador
    ADD COLUMN IF NOT EXISTS goles_recibidos INTEGER NOT NULL DEFAULT 0 CHECK (goles_recibidos >= 0);

CREATE OR REPLACE FUNCTION pg_temp.norm_key(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
    SELECT string_agg(w, ' ' ORDER BY w) FROM unnest(regexp_split_to_array(
        btrim(regexp_replace(translate(upper(COALESCE(t,'')), 'ÁÉÍÓÚÜÀÈÌÒÙ', 'AEIOUUAEIOU'), '[^A-Z0-9Ñ ]', ' ', 'g')),
        '\s+')) w WHERE w <> ''
$f$;

WITH actas AS (
    SELECT DISTINCT ON (mid) mid, acta FROM (
        SELECT id_partido_fed AS mid, acta_fed AS acta FROM eventos_calendario
         WHERE acta_fed IS NOT NULL AND id_partido_fed IS NOT NULL
        UNION ALL
        SELECT id_partido_fed, acta_fed FROM partidos
         WHERE acta_fed IS NOT NULL AND id_partido_fed IS NOT NULL
    ) x ORDER BY mid
),
raw_goals AS (
    SELECT a.mid,
           NULLIF(substring(g->>'minute' from '^\d+'), '')::int AS minute,
           COALESCE((g->>'homeScore')::int, 0) AS hs,
           COALESCE((g->>'awayScore')::int, 0) AS aws
      FROM actas a, jsonb_array_elements(COALESCE(a.acta->'goals', '[]'::jsonb)) g
),
goals AS (
    -- Equipo que marca = el que incrementa su marcador respecto al gol anterior (cubre goles en propia puerta)
    SELECT mid, minute,
           CASE WHEN hs > COALESCE(lag(hs) OVER w, 0) THEN 'H' ELSE 'A' END AS side
      FROM raw_goals
    WINDOW w AS (PARTITION BY mid ORDER BY minute, hs + aws)
),
entries AS (
    SELECT s.id,
           CASE WHEN s.titular THEN 0 ELSE COALESCE((
               SELECT min(NULLIF(substring(sub->>'minute' from '^\d+'), '')::int)
                 FROM actas a,
                      jsonb_array_elements(COALESCE((a.acta -> CASE WHEN s.es_local THEN 'homeTeam' ELSE 'awayTeam' END) -> 'substitutions', '[]'::jsonb)) sub
                WHERE a.mid = s.fed_match_id
                  AND (pg_temp.norm_key(sub->>'playerIn') = pg_temp.norm_key(p.nombre)
                       OR (array_length(string_to_array(pg_temp.norm_key(p.nombre), ' '), 1) >= 2
                           AND string_to_array(pg_temp.norm_key(p.nombre), ' ') <@ string_to_array(pg_temp.norm_key(sub->>'playerIn'), ' ')))
           ), 0) END AS entrada
      FROM estadisticas_partido_jugador s
      JOIN plantillas p ON p.id = s.jugador_id
)
UPDATE estadisticas_partido_jugador s
   SET goles_recibidos = (
        SELECT count(*) FROM goals g
         WHERE g.mid = s.fed_match_id
           AND g.side = CASE WHEN s.es_local THEN 'A' ELSE 'H' END
           AND g.minute > e.entrada
           AND g.minute <= e.entrada + s.minutos)
  FROM entries e
 WHERE e.id = s.id
   AND s.minutos > 0;

COMMIT;
