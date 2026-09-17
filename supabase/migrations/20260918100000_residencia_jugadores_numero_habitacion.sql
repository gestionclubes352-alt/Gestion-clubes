-- =====================================================
-- Cada apartamento (residencia_habitaciones) tiene 3 habitaciones internas.
-- Este campo indica en cuál de las 3 vive el residente asignado a ese apartamento.
-- =====================================================

ALTER TABLE residencia_jugadores
    ADD COLUMN IF NOT EXISTS numero_habitacion SMALLINT;

ALTER TABLE residencia_jugadores
    DROP CONSTRAINT IF EXISTS residencia_jugadores_numero_habitacion_check;

ALTER TABLE residencia_jugadores
    ADD CONSTRAINT residencia_jugadores_numero_habitacion_check
    CHECK (numero_habitacion IS NULL OR numero_habitacion IN (1, 2, 3));
