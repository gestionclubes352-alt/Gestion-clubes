-- =====================================================
-- FIX: Limpiar URLs de fotos truncadas/mal formadas
-- Las URLs estaban siendo guardadas sin el dominio de Supabase
-- Removemos todas las URLs que no son completas (que no comienzan con http)
-- =====================================================

-- Limpiar URLs truncadas (que no comienzan con http)
UPDATE plantillas
SET foto_url = ''
WHERE foto_url IS NOT NULL
  AND foto_url != ''
  AND foto_url NOT LIKE 'http%'
  AND LENGTH(foto_url) > 0;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Cleanup de URLs truncadas completado. Fotos mal formadas limpiadas.';
END $$;
