-- =====================================================
-- GESTION CLUBES — Asistencia de jugadores a sesiones
--
-- El apartado "Datos Sesiones" del calendario necesita persistir la
-- asistencia de cada jugador (y su motivo de ausencia, si no asistió)
-- por sesión. Se guarda como JSONB indexado por id de jugador, igual
-- que `tasks`, para no requerir una tabla adicional con FKs a una
-- plantilla que puede ser "demo" (ids no-UUID).
-- =====================================================

ALTER TABLE eventos_calendario
    ADD COLUMN IF NOT EXISTS attendance JSONB DEFAULT '{}'::jsonb;
