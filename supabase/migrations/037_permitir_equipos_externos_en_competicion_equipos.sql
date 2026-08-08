-- Permite añadir equipos "externos" (rivales que no están en la plantilla propia, p.ej. amistosos)
-- a una competición, además de los equipos propios ya existentes.

-- 1. Quitar la FK y el NOT NULL de equipo_id: ahora es opcional
ALTER TABLE competicion_equipos DROP CONSTRAINT IF EXISTS competicion_equipos_equipo_id_fkey;
ALTER TABLE competicion_equipos ALTER COLUMN equipo_id DROP NOT NULL;

-- 2. Nueva columna para el nombre de equipos externos (sin entidad en `plantillas`)
ALTER TABLE competicion_equipos ADD COLUMN IF NOT EXISTS nombre_externo TEXT;

-- 3. Restricción: cada fila debe representar un equipo propio O uno externo, nunca ninguno
ALTER TABLE competicion_equipos
  ADD CONSTRAINT check_equipo_id_o_externo
  CHECK (equipo_id IS NOT NULL OR nombre_externo IS NOT NULL);

-- 4. Evitar duplicados de equipos externos dentro de la misma competición
CREATE UNIQUE INDEX IF NOT EXISTS idx_competicion_equipos_externo_unico
  ON competicion_equipos(competicion_id, nombre_externo)
  WHERE nombre_externo IS NOT NULL;

COMMENT ON COLUMN competicion_equipos.nombre_externo IS 'Nombre libre de un equipo rival sin ficha en plantillas (p.ej. equipos de amistosos)';
