-- =====================================================
-- Elimina TODOS los jugadores de equipos rivales (plantillas).
-- Se conservan los equipos rivales (tabla equipos).
-- ATENCIÓN: irreversible. Por ON DELETE CASCADE también se borran sus
-- lesiones, mediciones RPE/wellness, objetivos individuales y registros
-- de comedor; residencia y usuarios.jugador_id pasan a NULL.
-- Haz copia de seguridad antes de ejecutar.
-- =====================================================

DELETE FROM plantillas p
USING equipos e
WHERE e.id = p.equipo_id
  AND e.es_rival;
