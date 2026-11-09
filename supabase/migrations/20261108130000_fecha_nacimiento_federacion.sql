-- Completa plantillas.fecha_nacimiento con el AÑO de nacimiento de la federación
-- (BD statsbomb, player_profile.birth_year). Solo se guarda AAAA-01-01 (marcador de año)
-- y solo si el jugador no tiene ya fecha. Coincidencia por nombre normalizado, en los equipos Huesca.
CREATE OR REPLACE FUNCTION pg_temp.norm_key(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
    SELECT string_agg(w, ' ' ORDER BY w) FROM unnest(regexp_split_to_array(
        btrim(regexp_replace(translate(upper(COALESCE(t,'')), 'ÁÉÍÓÚÜÀÈÌÒÙ', 'AEIOUUAEIOU'), '[^A-Z0-9Ñ ]', ' ', 'g')),
        '\s+')) w WHERE w <> ''
$f$;

UPDATE plantillas p SET fecha_nacimiento = make_date(v.anio, 1, 1)
FROM (VALUES ('Almerge Viñuales, Javier',2001),('Bernardez Sanjuan, Pablo',2002),('Eroles Prats, Ivan',2000),('Fofana Keita, Fadiala',2001),('Landa Borau, Nicolas Silverio',2000),('Sanz Campos, Miguel Angel',2003)) AS v(nombre, anio)
WHERE p.fecha_nacimiento IS NULL
  AND pg_temp.norm_key(p.nombre) = pg_temp.norm_key(v.nombre)
  AND p.equipo_id IN (SELECT e.id FROM equipos e JOIN clubes c ON c.id = e.club_id
                      WHERE COALESCE(e.es_rival,false) = false AND c.nombre ILIKE '%huesca%');

NOTIFY pgrst, 'reload schema';
