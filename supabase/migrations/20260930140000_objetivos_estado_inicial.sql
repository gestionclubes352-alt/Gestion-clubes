-- Estado inicial del objetivo. `estado` pasa a ser el estado ACTUAL
-- (última evaluación por fecha, o el inicial si no hay evaluaciones).
ALTER TABLE objetivos_individuales
    ADD COLUMN IF NOT EXISTS estado_inicial VARCHAR(10)
    CHECK (estado_inicial IN ('verde', 'naranja', 'rojo'));

-- Objetivos existentes: aún sin evaluaciones, su estado actual es el inicial.
UPDATE objetivos_individuales SET estado_inicial = estado WHERE estado_inicial IS NULL;

NOTIFY pgrst, 'reload schema';
