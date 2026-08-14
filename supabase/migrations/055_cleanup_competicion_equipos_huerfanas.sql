-- ============================================================
-- Limpiar referencias huérfanas en competicion_equipos
-- (equipos que fueron eliminados pero dejaron referencias)
-- ============================================================

-- 1. Eliminar referencias a equipos que ya no existen
DELETE FROM competicion_equipos
WHERE equipo_id IS NOT NULL
  AND equipo_id NOT IN (SELECT id FROM equipos);

-- 2. Eliminar referencias a equipos_rivales que ya no existen
DELETE FROM competicion_equipos
WHERE equipo_rival_id IS NOT NULL
  AND equipo_rival_id NOT IN (SELECT id FROM equipos_rivales);

-- 3. Verificación: encontrar cualquier violación de integridad restante
-- Si esta query devuelve resultados, hay un problema más profundo
SELECT
  ce.id,
  ce.competicion_id,
  ce.equipo_id,
  ce.equipo_rival_id,
  CASE
    WHEN ce.equipo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos WHERE id = ce.equipo_id) THEN 'equipo_inexistente'
    WHEN ce.equipo_rival_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos_rivales WHERE id = ce.equipo_rival_id) THEN 'equipo_rival_inexistente'
  END as problema
FROM competicion_equipos ce
WHERE (ce.equipo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos WHERE id = ce.equipo_id))
   OR (ce.equipo_rival_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos_rivales WHERE id = ce.equipo_rival_id));
