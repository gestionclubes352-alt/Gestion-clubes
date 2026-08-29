-- Restringe el rol 'Jugador' a ver/editar únicamente su propia ficha
-- (plantillas) y sus propias respuestas de RPE/Wellness. El resto de roles
-- (Administrador, Responsable, Tecnico) mantienen el acceso amplio que ya
-- tenían ("autenticado" = todo el club), sin cambios de comportamiento.

CREATE OR REPLACE FUNCTION current_usuario_jugador_id() RETURNS UUID AS $$
    SELECT jugador_id FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- plantillas: un Jugador solo lee/edita su propia fila.
-- =====================================================
DROP POLICY IF EXISTS "plantillas: leer si autenticado" ON plantillas;
CREATE POLICY "plantillas: leer si autenticado" ON plantillas
    FOR SELECT USING (
        current_usuario_rol() <> 'Jugador'
        OR id = current_usuario_jugador_id()
    );

DROP POLICY IF EXISTS "plantillas: escribir si autenticado" ON plantillas;
CREATE POLICY "plantillas: escribir si autenticado" ON plantillas
    FOR ALL USING (
        current_usuario_rol() <> 'Jugador'
        OR id = current_usuario_jugador_id()
    )
    WITH CHECK (
        current_usuario_rol() <> 'Jugador'
        OR id = current_usuario_jugador_id()
    );

-- =====================================================
-- rpe_respuestas / wellness_respuestas: un Jugador solo
-- lee/escribe sus propias respuestas.
-- =====================================================
DROP POLICY IF EXISTS "rpe_respuestas: leer si autenticado" ON rpe_respuestas;
CREATE POLICY "rpe_respuestas: leer si autenticado" ON rpe_respuestas
    FOR SELECT USING (
        current_usuario_rol() <> 'Jugador'
        OR jugador_id = current_usuario_jugador_id()
    );

DROP POLICY IF EXISTS "rpe_respuestas: escribir si autenticado" ON rpe_respuestas;
CREATE POLICY "rpe_respuestas: escribir si autenticado" ON rpe_respuestas
    FOR ALL USING (
        current_usuario_rol() <> 'Jugador'
        OR jugador_id = current_usuario_jugador_id()
    )
    WITH CHECK (
        current_usuario_rol() <> 'Jugador'
        OR jugador_id = current_usuario_jugador_id()
    );

DROP POLICY IF EXISTS "wellness_respuestas: leer si autenticado" ON wellness_respuestas;
CREATE POLICY "wellness_respuestas: leer si autenticado" ON wellness_respuestas
    FOR SELECT USING (
        current_usuario_rol() <> 'Jugador'
        OR jugador_id = current_usuario_jugador_id()
    );

DROP POLICY IF EXISTS "wellness_respuestas: escribir si autenticado" ON wellness_respuestas;
CREATE POLICY "wellness_respuestas: escribir si autenticado" ON wellness_respuestas
    FOR ALL USING (
        current_usuario_rol() <> 'Jugador'
        OR jugador_id = current_usuario_jugador_id()
    )
    WITH CHECK (
        current_usuario_rol() <> 'Jugador'
        OR jugador_id = current_usuario_jugador_id()
    );
