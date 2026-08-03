-- =====================================================
-- GESTION CLUBES — Tareas dentro de una sesión de calendario
-- Añade la lista de tareas/ejercicios de la sesión (pestaña "SESIÓN"
-- del detalle de entrenamiento) como JSONB sobre `eventos_calendario`.
-- Cada elemento: { id, linkedTaskId?, title, category?, sessionPhase?,
-- durationMinutes?, description? }
-- =====================================================

ALTER TABLE eventos_calendario
    ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;
