-- =====================================================
-- Estado de habitación: tipo de incidencia + semáforo (verde/naranja/rojo)
-- =====================================================

ALTER TABLE residencia_habitaciones
    ADD COLUMN IF NOT EXISTS incidencia VARCHAR(255),
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'verde';

ALTER TABLE residencia_habitaciones
    DROP CONSTRAINT IF EXISTS residencia_habitaciones_estado_check;

ALTER TABLE residencia_habitaciones
    ADD CONSTRAINT residencia_habitaciones_estado_check
    CHECK (estado IN ('verde', 'naranja', 'rojo'));
