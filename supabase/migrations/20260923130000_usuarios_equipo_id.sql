-- Añade "equipo_id" a usuarios: equipo interno (`equipos`) vinculado a una
-- cuenta con rol Jugador, seleccionable desde el modal "Gestionar acceso".
-- El frontend (App.tsx, EditUserModal.tsx) ya esperaba esta columna, pero
-- nunca se había creado en la base de datos.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS equipo_id uuid REFERENCES equipos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_equipo ON usuarios(equipo_id);
