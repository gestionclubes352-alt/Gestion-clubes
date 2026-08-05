-- Agregar soporte para múltiples equipos por miembro del personal
-- Cambiar de equipo_id (una sola referencia) a equipo_ids (array de referencias)

ALTER TABLE personal
ADD COLUMN equipo_ids UUID[] DEFAULT '{}';

-- Migrar datos existentes: si hay un equipo_id, agregarlo al array equipo_ids
UPDATE personal
SET equipo_ids = ARRAY[equipo_id]
WHERE equipo_id IS NOT NULL;

-- Ya no necesitamos el índice del campo anterior, pero lo dejamos para compatibilidad
-- CREATE INDEX IF NOT EXISTS idx_personal_equipo_ids ON personal USING GIN(equipo_ids);
