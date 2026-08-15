-- Fix: la tabla `usuarios` tiene RLS activado (004_multiclub_schema.sql) pero
-- nunca se le añadió una política de DELETE (006_roles_administrador_responsable_tecnico.sql
-- solo agregó SELECT/UPDATE). Sin política de DELETE, Postgres deniega el borrado
-- por defecto para cualquier usuario, incluidos los administradores.

DROP POLICY IF EXISTS "usuarios: administradores borran a cualquiera" ON usuarios;
CREATE POLICY "usuarios: administradores borran a cualquiera" ON usuarios
    FOR DELETE USING (current_usuario_rol() = 'Administrador');

-- Un Responsable puede borrar usuarios de su propio club, pero no a sí mismo
-- ni a un Administrador.
DROP POLICY IF EXISTS "usuarios: responsables borran su club" ON usuarios;
CREATE POLICY "usuarios: responsables borran su club" ON usuarios
    FOR DELETE USING (
        current_usuario_rol() = 'Responsable'
        AND club_id = current_usuario_club_id()
        AND rol <> 'Administrador'
        AND id <> auth.uid()
    );
