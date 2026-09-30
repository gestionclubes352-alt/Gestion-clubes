-- Acciones asociadas a un objetivo individual:
-- lista de { id, fecha, tipo, detalle } con tipo en
-- reunion | video | sesion_individual | sesion_colectiva | sesion_grupal
ALTER TABLE objetivos_individuales
    ADD COLUMN IF NOT EXISTS acciones JSONB NOT NULL DEFAULT '[]'::jsonb;
