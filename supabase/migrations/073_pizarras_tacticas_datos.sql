-- =====================================================
-- Añade columna `datos` a pizarras_tacticas para guardar el
-- snapshot completo de la Pizarra Táctica (frames, flechas,
-- balón, colores, formaciones, equipo rival, etc.)
-- =====================================================

ALTER TABLE pizarras_tacticas
    ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}'::jsonb;

-- La formación se guarda ahora en formato "1-4-4-2" (más largo que "4-4-2")
ALTER TABLE pizarras_tacticas
    ALTER COLUMN formacion TYPE VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_pizarras_equipo_nombre ON pizarras_tacticas(equipo_id, nombre);
