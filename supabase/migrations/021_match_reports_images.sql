-- =====================================================
-- match_reports: imágenes subidas desde el ordenador para
-- los bloques Ataque / Defensa / Transiciones del plan de
-- partido e informe de rival
-- =====================================================

ALTER TABLE match_reports
    ADD COLUMN IF NOT EXISTS con_balon_images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS sin_balon_images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS abp_images JSONB DEFAULT '[]'::jsonb;
