-- Fix: Agregar políticas RLS explícitas para operaciones en la tabla equipos
-- La política "equipos: escribir si autenticado" usa FOR ALL que debería cubrir todas las operaciones,
-- pero algunos usuarios reportan problemas al eliminar equipos. Esta migración agrega políticas explícitas.

-- Política explícita para INSERT
CREATE POLICY "equipos: insert si autenticado" ON equipos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política explícita para UPDATE
CREATE POLICY "equipos: update si autenticado" ON equipos
    FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Política explícita para DELETE (la más importante para este fix)
CREATE POLICY "equipos: delete si autenticado" ON equipos
    FOR DELETE USING (auth.role() = 'authenticated');
