-- =====================================================
-- GESTION CLUBES — Modelo de roles a 3 niveles
-- Sustituye ('Administrador','Entrenador','Analista','Staff')
-- por ('Administrador','Responsable','Tecnico'):
--   - Administrador: acceso total a todos los clubes (superusuario).
--   - Responsable:   acceso total a su propio club (antes "Entrenador").
--   - Tecnico:        solo lectura de su club + sus tareas asignadas
--                      (antes "Analista"/"Staff").
-- =====================================================

-- 1) Migrar datos existentes al nuevo vocabulario
UPDATE usuarios SET rol = 'Responsable' WHERE rol = 'Entrenador';
UPDATE usuarios SET rol = 'Tecnico' WHERE rol IN ('Analista', 'Staff');

-- 2) Reemplazar el CHECK constraint y el DEFAULT
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'Tecnico';
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('Administrador', 'Responsable', 'Tecnico'));

-- 3) Helpers para políticas RLS basadas en rol/club del usuario autenticado
--    (nombres distintos de current_user_rol()/current_user_club() de 002_rls_policies.sql,
--    que siguen operando sobre la tabla legacy `profiles`)
CREATE OR REPLACE FUNCTION current_usuario_rol() RETURNS TEXT AS $$
    SELECT rol FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_usuario_club_id() RETURNS UUID AS $$
    SELECT club_id FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4) La tabla `usuarios` solo tenía una política de SELECT ("ver el propio"):
--    nadie podía ver ni gestionar el resto de usuarios de su club.
--    Añadimos visibilidad/gestión para Administrador (global) y Responsable (su club).
CREATE POLICY "usuarios: administradores ven todos" ON usuarios
    FOR SELECT USING (current_usuario_rol() = 'Administrador');

CREATE POLICY "usuarios: responsables ven su club" ON usuarios
    FOR SELECT USING (
        current_usuario_rol() = 'Responsable' AND club_id = current_usuario_club_id()
    );

CREATE POLICY "usuarios: administradores gestionan todos" ON usuarios
    FOR UPDATE USING (current_usuario_rol() = 'Administrador')
    WITH CHECK (current_usuario_rol() = 'Administrador');

-- Un Responsable puede editar usuarios de su club, pero no ascender a nadie
-- (ni a sí mismo) a Administrador.
CREATE POLICY "usuarios: responsables gestionan su club" ON usuarios
    FOR UPDATE USING (
        current_usuario_rol() = 'Responsable' AND club_id = current_usuario_club_id()
    )
    WITH CHECK (
        current_usuario_rol() = 'Responsable'
        AND club_id = current_usuario_club_id()
        AND rol <> 'Administrador'
    );
