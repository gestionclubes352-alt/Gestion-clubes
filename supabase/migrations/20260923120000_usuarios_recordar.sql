-- Añade el campo "recordar" (texto libre) a la tabla usuarios,
-- para notas u observaciones sobre el usuario en el modal de gestión de acceso.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS recordar text;
