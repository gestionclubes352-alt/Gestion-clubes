-- El frontend crea cada campograma nuevo con crypto.randomUUID() y nunca deja
-- que la base de datos autogenere el id, así que el SERIAL original de
-- 001_schema.sql nunca podía aceptar esos valores.
--
-- Además, se ha comprobado que la tabla `campogramas` nunca llegó a crearse
-- en la base de datos remota (a pesar de que 001_schema.sql figura como
-- aplicada en el historial de migraciones — "relation campogramas does not
-- exist"), así que esta migración la crea si falta, ya directamente con id
-- TEXT, y si existiera con el SERIAL original la convierte a TEXT.
CREATE TABLE IF NOT EXISTS campogramas (
    id TEXT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    club VARCHAR(100) DEFAULT '',
    equipo VARCHAR(100) DEFAULT '',
    jugadores_count INTEGER DEFAULT 0,
    formacion VARCHAR(20) DEFAULT '4-4-2',
    positions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campogramas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE campogramas ALTER COLUMN id TYPE TEXT USING id::text;
DROP SEQUENCE IF EXISTS campogramas_id_seq;

CREATE INDEX IF NOT EXISTS idx_campogramas_club ON campogramas(club);

DROP TRIGGER IF EXISTS trg_campogramas_updated_at ON campogramas;
CREATE TRIGGER trg_campogramas_updated_at BEFORE UPDATE ON campogramas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: las políticas originales de 002_rls_policies.sql dependían de
-- current_user_club()/current_user_rol(), que leen de la tabla legacy
-- `profiles`. El flujo de login real (AuthContext + tabla `usuarios`) nunca
-- escribe en `profiles`, así que esas políticas bloquearían siempre la
-- tabla. Usamos el mismo criterio "si autenticado" que el resto de tablas
-- migradas en la Fase 1 (eventos_calendario, tareas, exercises...).
ALTER TABLE campogramas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campogramas: leer del propio club" ON campogramas;
DROP POLICY IF EXISTS "campogramas: escribir admin/entrenador" ON campogramas;
DROP POLICY IF EXISTS "campogramas: leer si autenticado" ON campogramas;
DROP POLICY IF EXISTS "campogramas: escribir si autenticado" ON campogramas;

CREATE POLICY "campogramas: leer si autenticado" ON campogramas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "campogramas: escribir si autenticado" ON campogramas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
