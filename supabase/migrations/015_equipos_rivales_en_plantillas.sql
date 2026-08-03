-- =====================================================
-- GESTION CLUBES — Rivales en las mismas tablas que los propios
--
-- El frontend ya dio de alta a los rivales con el criterio nuevo:
-- MatchReportView.tsx y PizarraTactica.tsx tratan como "rival"
-- cualquier fila de `equipos` que no sea el equipo activo, y leen
-- su plantilla con plantillasService (tabla `plantillas`). Las
-- tablas equipos_rivales/jugadores_rivales de la migración 014 ya
-- no se consultan desde el cliente.
--
-- Hasta ahora "rival" era una comparación de IDs en el cliente,
-- sin ningún dato en BD que lo respalde (riesgo: un equipo propio
-- de otra categoría se mostraría como rival). Esta migración:
--   1) añade un discriminador real (`equipos.es_rival`)
--   2) permite que un equipo rival no dependa de un club propio
--      (club_id pasa a ser opcional solo para rivales)
--   3) traslada los datos que hubiera en equipos_rivales/jugadores_rivales
--      a equipos/plantillas conservando los mismos UUID (así las
--      referencias existentes, si las hay, no se rompen)
--   4) elimina las tablas huérfanas equipos_rivales/jugadores_rivales
-- =====================================================

-- 1) Discriminador real de rival
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS es_rival BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_equipos_es_rival ON equipos(es_rival);

-- Notas libres (scouting del rival); equipos_rivales sí tenía este campo
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS notas TEXT;

-- 2) Un rival no pertenece a ningún club gestionado en la app
ALTER TABLE equipos ALTER COLUMN club_id DROP NOT NULL;

-- ...pero un equipo propio (es_rival = false) sigue necesitando club_id
ALTER TABLE equipos DROP CONSTRAINT IF EXISTS equipos_club_id_requerido_si_no_rival;
ALTER TABLE equipos ADD CONSTRAINT equipos_club_id_requerido_si_no_rival
    CHECK (es_rival OR club_id IS NOT NULL);

-- 3) Backfill: equipos_rivales -> equipos (mismo id, es_rival = true)
INSERT INTO equipos (id, club_id, nombre, competicion, temporada, logo_url, notas, es_rival, created_at, updated_at)
SELECT id, club_id, nombre, competicion, temporada, escudo_url, notas, TRUE, created_at, updated_at
FROM equipos_rivales
ON CONFLICT (id) DO NOTHING;

-- Backfill: jugadores_rivales -> plantillas (mismo id/equipo_id).
-- `posicion` en jugadores_rivales era texto libre; solo se traslada a
-- plantillas.posicion si respeta su CHECK, el resto va a otra_posicion.
INSERT INTO plantillas (
    id, equipo_id, foto_url, dorsal, nombre, posicion, otra_posicion,
    anio_nacimiento, created_at, updated_at
)
SELECT
    id, equipo_rival_id, foto_url, dorsal, nombre,
    CASE WHEN posicion IN ('Portero', 'Defensa', 'Medio', 'Delantero') THEN posicion END,
    CASE WHEN posicion IS NOT NULL AND posicion NOT IN ('Portero', 'Defensa', 'Medio', 'Delantero') THEN posicion END,
    anio_nacimiento, created_at, updated_at
FROM jugadores_rivales
ON CONFLICT (id) DO NOTHING;

-- 4) Tablas huérfanas: ya nada las consulta desde el frontend
DROP TABLE IF EXISTS jugadores_rivales;
DROP TABLE IF EXISTS equipos_rivales;
