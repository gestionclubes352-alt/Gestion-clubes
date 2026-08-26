-- =====================================================
-- Tramos guardados de Pintado de Acciones: permite guardar
-- un corte de video (YouTube) junto con las anotaciones
-- dibujadas encima, para poder recuperarlo mas tarde.
-- =====================================================

CREATE TABLE IF NOT EXISTS pintado_acciones_tramos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    -- Snapshot completo: videoId, playlistId, tiempo, anotaciones (ver getSnapshot() del motor).
    datos JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pintado_acciones_tramos_equipo ON pintado_acciones_tramos(equipo_id);

DROP TRIGGER IF EXISTS trg_pintado_acciones_tramos_updated_at ON pintado_acciones_tramos;
CREATE TRIGGER trg_pintado_acciones_tramos_updated_at
    BEFORE UPDATE ON pintado_acciones_tramos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: mismo patron que pizarras_tacticas (leer/escribir si autenticado)
ALTER TABLE pintado_acciones_tramos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pintado_acciones_tramos: leer si autenticado" ON pintado_acciones_tramos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "pintado_acciones_tramos: escribir si autenticado" ON pintado_acciones_tramos
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
