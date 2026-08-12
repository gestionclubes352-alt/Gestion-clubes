-- DIAGNÓSTICO: Investigar por qué DELETE falla en la tabla equipos

-- 1. Verificar políticas RLS en la tabla equipos
SELECT * FROM pg_policies WHERE tablename = 'equipos';

-- 2. Verificar políticas RLS en tablas relacionadas que podrían estar bloqueando cascadas
SELECT * FROM pg_policies WHERE tablename IN ('plantillas', 'competicion_equipos', 'personal', 'sesiones', 'partidos', 'eventos_calendario');

-- 3. Verificar constraints y triggers en la tabla equipos
SELECT
  c.constraint_name,
  c.constraint_type,
  c.table_name
FROM information_schema.table_constraints c
WHERE c.table_name = 'equipos';

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'equipos';

-- 4. Verificar las claves foráneas que referencian a equipos
SELECT
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.key_column_usage
WHERE referenced_table_name = 'equipos' AND referenced_column_name = 'id';

-- 5. Ver el esquema completo de la tabla equipos
\d equipos
