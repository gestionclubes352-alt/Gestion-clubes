-- =====================================================
-- Estado de zona común: separar naranja/rojo de desordenado/sucio
-- (antes 'desordenado'/'sucio' no indicaban color; ahora se combinan)
-- =====================================================

-- residencia_habitaciones.zona_comun_estado
ALTER TABLE residencia_habitaciones
    DROP CONSTRAINT IF EXISTS residencia_habitaciones_zona_comun_estado_check;

UPDATE residencia_habitaciones
    SET zona_comun_estado = 'naranja_desordenado'
    WHERE zona_comun_estado = 'desordenado';

UPDATE residencia_habitaciones
    SET zona_comun_estado = 'rojo_sucio'
    WHERE zona_comun_estado = 'sucio';

ALTER TABLE residencia_habitaciones
    ADD CONSTRAINT residencia_habitaciones_zona_comun_estado_check
    CHECK (zona_comun_estado IN ('buenas_condiciones', 'naranja_desordenado', 'naranja_sucio', 'rojo_desordenado', 'rojo_sucio'));

-- residencia_jugadores.condicion
ALTER TABLE residencia_jugadores
    DROP CONSTRAINT IF EXISTS residencia_jugadores_condicion_check;

UPDATE residencia_jugadores
    SET condicion = 'naranja_desordenado'
    WHERE condicion = 'desordenado';

UPDATE residencia_jugadores
    SET condicion = 'rojo_sucio'
    WHERE condicion = 'sucio';

ALTER TABLE residencia_jugadores
    ADD CONSTRAINT residencia_jugadores_condicion_check
    CHECK (condicion IN ('buenas_condiciones', 'naranja_desordenado', 'naranja_sucio', 'rojo_desordenado', 'rojo_sucio'));
