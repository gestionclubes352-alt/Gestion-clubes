-- Los equipos rivales de una competición ya no se guardan como texto libre:
-- deben existir primero en el catálogo `equipos_rivales` (tabla ya creada en la
-- migración 014, hasta ahora sin usar) y se referencian aquí por id.

-- 1. Nueva columna: referencia al catálogo de rivales
ALTER TABLE competicion_equipos
  ADD COLUMN IF NOT EXISTS equipo_rival_id UUID REFERENCES equipos_rivales(id) ON DELETE CASCADE;

-- 2. Quitar la restricción anterior (equipo_id o nombre_externo) y el texto libre
ALTER TABLE competicion_equipos DROP CONSTRAINT IF EXISTS check_equipo_id_o_externo;
DROP INDEX IF EXISTS idx_competicion_equipos_externo_unico;
ALTER TABLE competicion_equipos DROP COLUMN IF EXISTS nombre_externo;

-- 3. Cada fila debe representar exactamente un equipo propio O un rival de catálogo, nunca ambos ni ninguno
ALTER TABLE competicion_equipos
  ADD CONSTRAINT check_equipo_propio_o_rival
  CHECK (
    (equipo_id IS NOT NULL)::int + (equipo_rival_id IS NOT NULL)::int = 1
  );

-- 4. Evitar duplicados de rivales dentro de la misma competición
CREATE UNIQUE INDEX IF NOT EXISTS idx_competicion_equipos_rival_unico
  ON competicion_equipos(competicion_id, equipo_rival_id)
  WHERE equipo_rival_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competicion_equipos_equipo_rival_id ON competicion_equipos(equipo_rival_id);

COMMENT ON COLUMN competicion_equipos.equipo_rival_id IS 'Id del rival (tabla equipos_rivales) que participa en esta competición';
