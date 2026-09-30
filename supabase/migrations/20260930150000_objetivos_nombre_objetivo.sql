-- Nombre del objetivo asignado al jugador (texto corto, opcional).
ALTER TABLE objetivos_individuales
    ADD COLUMN IF NOT EXISTS nombre_objetivo VARCHAR(150);

NOTIFY pgrst, 'reload schema';
