-- =====================================================
-- CLEANUP: Eliminar data: URLs inválidas de fotos de jugadores
-- Las data: URLs no son persistentes entre sesiones y causan
-- que las fotos desaparezcan cuando se recarga la aplicación.
-- =====================================================

-- Limpiar fotos que son data: URLs (no son URLs públicas válidas)
UPDATE plantillas
SET foto_url = ''
WHERE foto_url LIKE 'data:image/%'
  AND LENGTH(foto_url) > 0;

-- Log de auditoría
DO $$
DECLARE
  affected_count INT;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM plantillas
  WHERE foto_url = '' AND id IN (
    SELECT id FROM plantillas WHERE LENGTH(COALESCE(foto_url, '')) = 0
  );
  RAISE NOTICE 'Cleanup completado. Fotos limpiadas: %', affected_count;
END $$;
