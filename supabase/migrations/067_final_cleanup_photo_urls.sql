-- =====================================================
-- FIX: Limpieza definitiva de URLs de fotos inválidas
-- Elimina:
-- 1. URLs de data: (no persistentes)
-- 2. URLs sin protocolo (truncadas)
-- 3. URLs muy cortas (< 20 caracteres)
-- 4. URLs sin dominio válido de Supabase
-- =====================================================

-- Limpiar plantillas con URLs inválidas
UPDATE plantillas
SET foto_url = NULL
WHERE foto_url IS NOT NULL
  AND foto_url != ''
  AND (
    -- data: URLs (no persistentes)
    foto_url LIKE 'data:%'
    -- URLs sin protocolo http/https (truncadas)
    OR (foto_url NOT LIKE 'http://%' AND foto_url NOT LIKE 'https://%')
    -- URLs muy cortas (probablemente truncadas, ej: "4", "9")
    OR LENGTH(TRIM(foto_url)) < 20
  );

-- Limpiar personal con URLs inválidas
UPDATE personal
SET foto_url = NULL
WHERE foto_url IS NOT NULL
  AND foto_url != ''
  AND (
    foto_url LIKE 'data:%'
    OR (foto_url NOT LIKE 'http://%' AND foto_url NOT LIKE 'https://%')
    OR LENGTH(TRIM(foto_url)) < 20
  );

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Cleanup definitivo de URLs de fotos completado';
END $$;
