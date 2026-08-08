-- Agregar columna nombre_interno a la tabla partidos
ALTER TABLE partidos
ADD COLUMN IF NOT EXISTS nombre_interno VARCHAR(255);

-- Crear índice para nombre_interno
CREATE INDEX IF NOT EXISTS idx_partidos_nombre_interno ON partidos(nombre_interno);
