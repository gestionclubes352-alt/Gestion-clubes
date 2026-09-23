-- =====================================================
-- Objetivos individuales de jugadores (apartado GESTIÓN)
-- Equipo, jugador, fecha, tipo de objetivo, estado (semáforo),
-- detalle y plan de acción.
-- =====================================================

CREATE TABLE IF NOT EXISTS objetivos_individuales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    jugador_id UUID NOT NULL REFERENCES plantillas(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('deportivo', 'psicologico', 'habitos', 'academico')),
    estado VARCHAR(10) NOT NULL DEFAULT 'verde' CHECK (estado IN ('verde', 'naranja', 'rojo')),
    detalle TEXT,
    plan_accion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objetivos_individuales_club ON objetivos_individuales(club_id);
CREATE INDEX IF NOT EXISTS idx_objetivos_individuales_equipo ON objetivos_individuales(equipo_id);
CREATE INDEX IF NOT EXISTS idx_objetivos_individuales_jugador ON objetivos_individuales(jugador_id);

DROP TRIGGER IF EXISTS trg_objetivos_individuales_updated_at ON objetivos_individuales;
CREATE TRIGGER trg_objetivos_individuales_updated_at
    BEFORE UPDATE ON objetivos_individuales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE objetivos_individuales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "objetivos_individuales: leer si autenticado" ON objetivos_individuales;
CREATE POLICY "objetivos_individuales: leer si autenticado" ON objetivos_individuales
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "objetivos_individuales: escribir si autenticado" ON objetivos_individuales;
CREATE POLICY "objetivos_individuales: escribir si autenticado" ON objetivos_individuales
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
