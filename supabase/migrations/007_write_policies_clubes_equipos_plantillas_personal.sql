-- =====================================================
-- Escritura básica para clubes/equipos/plantillas/personal
-- (004_multiclub_schema.sql solo dejó política de lectura;
--  sin esto, crear/editar/borrar desde la app falla por RLS)
-- Mismo patrón ya usado en 005 para competiciones/partidos/etc.:
-- cualquier autenticado puede escribir; se afina por rol más adelante.
-- =====================================================

CREATE POLICY "clubes: escribir si autenticado" ON clubes
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "equipos: escribir si autenticado" ON equipos
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "plantillas: escribir si autenticado" ON plantillas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "personal: escribir si autenticado" ON personal
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
