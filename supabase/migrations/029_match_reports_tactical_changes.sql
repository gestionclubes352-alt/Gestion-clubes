-- =====================================================
-- match_reports: agregar columna para cambios tácticos
-- durante el partido (entradas, salidas, cambios de
-- formación)
-- =====================================================

ALTER TABLE match_reports
    ADD COLUMN IF NOT EXISTS tactical_changes JSONB DEFAULT '[]'::jsonb;
