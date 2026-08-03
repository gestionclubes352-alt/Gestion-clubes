-- =====================================================
-- GESTION CLUBES — Repositorio de tareas + fix de exercises
--
-- 1) `task_templates` (Repositorio de Tareas / plantillas de ejercicios de
--    entrenamiento) se guardaba en `db.task_templates`, un shim local sin
--    persistencia real (ver dataService.ts). Esta tabla le da persistencia
--    real en Supabase. Se usa desde el Diseñador Táctico, el Repositorio de
--    Tareas y el panel de tareas de sesión del Calendario.
--
--    El objeto TrainingTask (frontend/src/modules/repositorio-tareas/types.ts)
--    tiene muchos campos opcionales y evoluciona con frecuencia; se guarda
--    completo como JSONB (`payload`) en vez de columna por campo, siguiendo
--    el mismo criterio que `frames` en `exercises` (001_schema.sql).
--
-- 2) `exercises` (001_schema.sql) debería existir ya, pero en este proyecto
--    esa migración nunca se aplicó (comprobado: "relation exercises does not
--    exist"), así que la creamos aquí si falta. Su política RLS original
--    (002_rls_policies.sql) dependía de current_user_club()/current_user_rol(),
--    que leen de la tabla legacy `profiles`. El flujo de login real
--    (AuthContext + tabla `usuarios`) nunca escribe en `profiles`, así que
--    esas políticas bloquearían siempre la tabla (nadie podría leer ni
--    guardar ejercicios). Usamos directamente el mismo criterio "si
--    autenticado" que ya usan el resto de tablas migradas en la Fase 1
--    (eventos_calendario, tareas, sesiones...); se afina por rol/club más
--    adelante.
--
-- Toda la migración es idempotente: se puede volver a ejecutar sin error
-- aunque una ejecución anterior haya fallado a medias.
-- =====================================================

-- Función de trigger para updated_at (normalmente ya existe desde
-- 001_schema.sql, pero por si esa migración tampoco se aplicó).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLA: exercises (crear si falta)
-- =====================================================
CREATE TABLE IF NOT EXISTS exercises (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    club VARCHAR(100) DEFAULT '',
    frames JSONB DEFAULT '[]',
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_exercises_updated_at ON exercises;
CREATE TRIGGER trg_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercises: leer del propio club" ON exercises;
DROP POLICY IF EXISTS "exercises: escribir admin/entrenador" ON exercises;
DROP POLICY IF EXISTS "exercises: leer si autenticado" ON exercises;
DROP POLICY IF EXISTS "exercises: escribir si autenticado" ON exercises;

CREATE POLICY "exercises: leer si autenticado" ON exercises
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "exercises: escribir si autenticado" ON exercises
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- TABLA: task_templates (nueva)
-- =====================================================
CREATE TABLE IF NOT EXISTS task_templates (
    id VARCHAR(100) PRIMARY KEY,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_task_templates_updated_at ON task_templates;
CREATE TRIGGER trg_task_templates_updated_at BEFORE UPDATE ON task_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_templates: leer si autenticado" ON task_templates;
DROP POLICY IF EXISTS "task_templates: escribir si autenticado" ON task_templates;

CREATE POLICY "task_templates: leer si autenticado" ON task_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "task_templates: escribir si autenticado" ON task_templates
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
