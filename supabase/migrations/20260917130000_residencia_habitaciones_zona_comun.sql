-- =====================================================
-- Estado de zona común: semáforo (buenas condiciones/desordenado/sucio)
-- =====================================================

ALTER TABLE residencia_habitaciones
    ADD COLUMN IF NOT EXISTS zona_comun_estado VARCHAR(20) NOT NULL DEFAULT 'buenas_condiciones';

ALTER TABLE residencia_habitaciones
    DROP CONSTRAINT IF EXISTS residencia_habitaciones_zona_comun_estado_check;

ALTER TABLE residencia_habitaciones
    ADD CONSTRAINT residencia_habitaciones_zona_comun_estado_check
    CHECK (zona_comun_estado IN ('buenas_condiciones', 'desordenado', 'sucio'));
