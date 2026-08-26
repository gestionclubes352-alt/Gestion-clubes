-- =====================================================
-- TABLA: lesiones
-- Registro y seguimiento de lesiones de jugadores (área médica)
-- Requiere: plantillas.id (jugador)
-- =====================================================

CREATE TABLE IF NOT EXISTS lesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES plantillas(id) ON DELETE CASCADE,
    player_name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    body_part VARCHAR(50) NOT NULL,
    side VARCHAR(20),
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    date_occurred DATE NOT NULL DEFAULT CURRENT_DATE,
    estimated_return DATE,
    actual_return DATE,
    mechanism TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT lesiones_severity_check CHECK (severity IN ('LEVE', 'MODERADA', 'GRAVE')),
    CONSTRAINT lesiones_status_check CHECK (status IN ('ACTIVA', 'EN_REHABILITACIÓN', 'RECUPERADO')),
    CONSTRAINT lesiones_side_check CHECK (side IS NULL OR side IN ('IZQUIERDO', 'DERECHO'))
);

CREATE INDEX IF NOT EXISTS idx_lesiones_player_id ON lesiones(player_id);
CREATE INDEX IF NOT EXISTS idx_lesiones_status ON lesiones(status);
CREATE INDEX IF NOT EXISTS idx_lesiones_date_occurred ON lesiones(date_occurred);

-- RLS: lectura y escritura para autenticados (mismo patrón que match_reports)
ALTER TABLE lesiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesiones: leer si autenticado" ON lesiones;
CREATE POLICY "lesiones: leer si autenticado" ON lesiones
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "lesiones: escribir si autenticado" ON lesiones;
CREATE POLICY "lesiones: escribir si autenticado" ON lesiones
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_lesiones_updated_at ON lesiones;
CREATE TRIGGER trg_lesiones_updated_at BEFORE UPDATE ON lesiones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
