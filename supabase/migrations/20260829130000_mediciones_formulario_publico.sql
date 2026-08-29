-- =====================================================
-- Permitir que jugadores sin login (rol anon) registren su
-- propia respuesta diaria de RPE/Wellness desde un formulario
-- público, sin exponer lectura pública de los datos de otros.
-- =====================================================

DROP POLICY IF EXISTS "rpe_respuestas: insertar anonimo" ON rpe_respuestas;
CREATE POLICY "rpe_respuestas: insertar anonimo" ON rpe_respuestas
    FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "rpe_respuestas: actualizar anonimo" ON rpe_respuestas;
CREATE POLICY "rpe_respuestas: actualizar anonimo" ON rpe_respuestas
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wellness_respuestas: insertar anonimo" ON wellness_respuestas;
CREATE POLICY "wellness_respuestas: insertar anonimo" ON wellness_respuestas
    FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "wellness_respuestas: actualizar anonimo" ON wellness_respuestas;
CREATE POLICY "wellness_respuestas: actualizar anonimo" ON wellness_respuestas
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- El formulario público necesita listar los nombres de la plantilla para que
-- el jugador se seleccione a sí mismo, pero `plantillas` tiene columnas
-- sensibles (DNI, teléfono, datos del tutor) de todos los clubes: se expone
-- una vista reducida, no la tabla completa.
DROP VIEW IF EXISTS plantillas_publico;
CREATE VIEW plantillas_publico
WITH (security_invoker = false) AS
SELECT id, nombre, equipo_id
FROM plantillas
WHERE estado IS DISTINCT FROM 'Inactivo';

GRANT SELECT ON plantillas_publico TO anon;
