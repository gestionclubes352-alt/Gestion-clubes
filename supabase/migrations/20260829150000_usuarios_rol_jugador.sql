-- Permite crear usuarios con rol 'Jugador' vinculados a una fila de `plantillas`.
-- La cuenta de acceso queda asociada al jugador vía `jugador_id`, para poder
-- resolver de qué jugador es la cuenta (ej. futuras vistas "mi ficha").

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS jugador_id uuid REFERENCES plantillas(id) ON DELETE SET NULL;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('Administrador', 'Responsable', 'Tecnico', 'Jugador'));
