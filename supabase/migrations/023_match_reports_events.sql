-- =====================================================
-- match_reports: nueva pestaña EVENTOS del partido.
-- Registro de sustituciones (minuto + jugador que sale/entra)
-- y de goles a favor/en contra (minuto + autor).
-- =====================================================

ALTER TABLE match_reports
    ADD COLUMN IF NOT EXISTS substitutions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS match_goals JSONB DEFAULT '[]'::jsonb;
