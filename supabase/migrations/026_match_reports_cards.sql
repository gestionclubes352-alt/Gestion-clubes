-- =====================================================
-- match_reports: columna que faltaba para las tarjetas
-- registradas en la pestaña EVENTOS del partido.
-- =====================================================

ALTER TABLE match_reports
    ADD COLUMN IF NOT EXISTS match_cards JSONB DEFAULT '[]'::jsonb;
