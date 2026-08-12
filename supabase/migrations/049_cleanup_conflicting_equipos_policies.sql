-- Cleanup: Limpiar políticas RLS conflictivas en la tabla equipos
-- Si hay políticas conflictivas que estén bloqueando DELETE, removerlas.

-- La política "equipos: escribir si autenticado" usa FOR ALL que debería cubrir DELETE,
-- pero podría estar conflictando con las políticas explícitas que agregamos en 048.
-- Para evitar conflictos, podemos remover la política general y confiar en las explícitas.

DROP POLICY IF EXISTS "equipos: escribir si autenticado" ON equipos;

-- Las políticas explícitas de 048 ahora cubren todas las operaciones necesarias.
