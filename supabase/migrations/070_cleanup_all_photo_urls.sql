-- =====================================================
-- FIX: Limpiar todos los foto_url ya que muchos archivos no existen en Storage
-- Setear a NULL para que la BD no tenga URLs rotos
-- =====================================================

UPDATE plantillas
SET foto_url = NULL
WHERE foto_url IS NOT NULL;

UPDATE personal
SET foto_url = NULL
WHERE foto_url IS NOT NULL;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Cleanup de todos los foto_url completado';
END $$;
