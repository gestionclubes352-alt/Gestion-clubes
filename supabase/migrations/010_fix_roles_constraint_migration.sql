-- =====================================================
-- 006_roles_administrador_responsable_tecnico.sql se marcó como aplicada
-- en el historial de Supabase, pero su UPDATE corría antes de soltar el
-- CHECK constraint viejo, así que fallaba contra ese mismo constraint y
-- nunca llegó a tomar efecto: la tabla `usuarios` seguía con el CHECK
-- antiguo ('Administrador','Entrenador','Analista','Staff'), lo que
-- rompía el alta de usuarios (create-user) para cualquier rol nuevo.
-- Como 006 ya figura como aplicada, no se vuelve a ejecutar sola:
-- repetimos aquí el mismo arreglo, en el orden correcto, de forma
-- idempotente.
-- =====================================================

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;

UPDATE usuarios SET rol = 'Responsable' WHERE rol = 'Entrenador';
UPDATE usuarios SET rol = 'Tecnico' WHERE rol IN ('Analista', 'Staff');

ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'Tecnico';
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('Administrador', 'Responsable', 'Tecnico'));
