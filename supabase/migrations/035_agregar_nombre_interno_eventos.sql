-- Agregar columna nombre_interno a la tabla eventos_calendario
ALTER TABLE eventos_calendario
ADD COLUMN IF NOT EXISTS nombre_interno VARCHAR(255);

-- Crear índice para nombre_interno
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_nombre_interno ON eventos_calendario(nombre_interno);
