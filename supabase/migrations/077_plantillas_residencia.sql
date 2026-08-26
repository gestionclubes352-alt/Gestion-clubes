-- =====================================================
-- Añade el campo "Residencia" (Sí/No) a la ficha del jugador.
-- =====================================================

ALTER TABLE plantillas
    ADD COLUMN IF NOT EXISTS residencia BOOLEAN NOT NULL DEFAULT false;
