-- =====================================================
-- Estado por residente: semáforo (verde/naranja/rojo) + estado (buenas condiciones/desordenado/sucio)
-- =====================================================

ALTER TABLE residencia_jugadores
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'verde',
    ADD COLUMN IF NOT EXISTS condicion VARCHAR(20) NOT NULL DEFAULT 'buenas_condiciones';

ALTER TABLE residencia_jugadores
    DROP CONSTRAINT IF EXISTS residencia_jugadores_estado_check;

ALTER TABLE residencia_jugadores
    ADD CONSTRAINT residencia_jugadores_estado_check
    CHECK (estado IN ('verde', 'naranja', 'rojo'));

ALTER TABLE residencia_jugadores
    DROP CONSTRAINT IF EXISTS residencia_jugadores_condicion_check;

ALTER TABLE residencia_jugadores
    ADD CONSTRAINT residencia_jugadores_condicion_check
    CHECK (condicion IN ('buenas_condiciones', 'desordenado', 'sucio'));
