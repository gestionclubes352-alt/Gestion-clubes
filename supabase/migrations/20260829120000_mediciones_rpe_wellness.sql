-- =====================================================
-- Módulo Mediciones: respuestas diarias de RPE y Wellness
-- por jugador (sustituye a los Google Forms/Sheets).
-- =====================================================

CREATE TABLE IF NOT EXISTS rpe_respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    jugador_id UUID REFERENCES plantillas(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    rpe NUMERIC(4,1),
    animo NUMERIC(4,1),
    motivacion NUMERIC(4,1),
    molestia TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rpe_respuestas_club ON rpe_respuestas(club_id);
CREATE INDEX IF NOT EXISTS idx_rpe_respuestas_jugador ON rpe_respuestas(jugador_id);
CREATE INDEX IF NOT EXISTS idx_rpe_respuestas_fecha ON rpe_respuestas(fecha);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rpe_respuestas_jugador_fecha ON rpe_respuestas(jugador_id, fecha);

CREATE TABLE IF NOT EXISTS wellness_respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    jugador_id UUID REFERENCES plantillas(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    sueno NUMERIC(4,1),
    musc NUMERIC(4,1),
    aerob NUMERIC(4,1),
    zona_cargada TEXT,
    molestias TEXT,
    semaforo VARCHAR(20),
    comentario TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellness_respuestas_club ON wellness_respuestas(club_id);
CREATE INDEX IF NOT EXISTS idx_wellness_respuestas_jugador ON wellness_respuestas(jugador_id);
CREATE INDEX IF NOT EXISTS idx_wellness_respuestas_fecha ON wellness_respuestas(fecha);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wellness_respuestas_jugador_fecha ON wellness_respuestas(jugador_id, fecha);

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_rpe_respuestas_updated_at ON rpe_respuestas;
CREATE TRIGGER trg_rpe_respuestas_updated_at
    BEFORE UPDATE ON rpe_respuestas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_wellness_respuestas_updated_at ON wellness_respuestas;
CREATE TRIGGER trg_wellness_respuestas_updated_at
    BEFORE UPDATE ON wellness_respuestas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: mismo patrón que el resto de módulos (leer/escribir si autenticado)
ALTER TABLE rpe_respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_respuestas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rpe_respuestas: leer si autenticado" ON rpe_respuestas;
CREATE POLICY "rpe_respuestas: leer si autenticado" ON rpe_respuestas
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "rpe_respuestas: escribir si autenticado" ON rpe_respuestas;
CREATE POLICY "rpe_respuestas: escribir si autenticado" ON rpe_respuestas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wellness_respuestas: leer si autenticado" ON wellness_respuestas;
CREATE POLICY "wellness_respuestas: leer si autenticado" ON wellness_respuestas
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "wellness_respuestas: escribir si autenticado" ON wellness_respuestas;
CREATE POLICY "wellness_respuestas: escribir si autenticado" ON wellness_respuestas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
