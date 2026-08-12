-- MIGRACIÓN COMPLETA: Redefinir políticas RLS para la tabla equipos
-- El problema: Las políticas RLS actuales no están permitiendo correctamente DELETE
-- Solución: Remover todas las políticas existentes y recrearlas de manera más explícita

-- 1. Remover TODAS las políticas RLS existentes en la tabla equipos
DROP POLICY IF EXISTS "equipos: leer si autenticado" ON equipos;
DROP POLICY IF EXISTS "equipos: escribir si autenticado" ON equipos;
DROP POLICY IF EXISTS "equipos: insert si autenticado" ON equipos;
DROP POLICY IF EXISTS "equipos: update si autenticado" ON equipos;
DROP POLICY IF EXISTS "equipos: delete si autenticado" ON equipos;

-- 2. Agregar nuevas políticas RLS más específicas y explícitas

-- Política para SELECT (lectura)
CREATE POLICY "equipos: select para autenticados" ON equipos
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para INSERT (creación)
CREATE POLICY "equipos: insert para autenticados" ON equipos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para UPDATE (edición)
CREATE POLICY "equipos: update para autenticados" ON equipos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para DELETE (eliminación) - LA MÁS IMPORTANTE
CREATE POLICY "equipos: delete para autenticados" ON equipos
  FOR DELETE
  TO authenticated
  USING (true);

-- Nota: Estas políticas permiten cualquier usuario autenticado realizar cualquier operación.
-- Si necesitas restricciones más granulares (por club, por rol, etc.), se pueden refinar después.
