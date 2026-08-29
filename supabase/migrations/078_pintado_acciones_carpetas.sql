-- =====================================================
-- Carpetas para organizar los Tramos guardados de
-- Pintado de Acciones. Cada carpeta pertenece a un equipo;
-- los tramos pueden asignarse opcionalmente a una carpeta
-- (NULL = sin carpeta). Mismo patron que pizarras_carpetas.
-- =====================================================

CREATE TABLE IF NOT EXISTS pintado_acciones_carpetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (equipo_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_pintado_acciones_carpetas_equipo ON pintado_acciones_carpetas(equipo_id);

ALTER TABLE pintado_acciones_tramos
    ADD COLUMN IF NOT EXISTS carpeta_id UUID REFERENCES pintado_acciones_carpetas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pintado_acciones_tramos_carpeta ON pintado_acciones_tramos(carpeta_id);

-- Trigger para mantener updated_at
DROP TRIGGER IF EXISTS trg_pintado_acciones_carpetas_updated_at ON pintado_acciones_carpetas;
CREATE TRIGGER trg_pintado_acciones_carpetas_updated_at
    BEFORE UPDATE ON pintado_acciones_carpetas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: mismo patron que pizarras_carpetas (leer/escribir si autenticado)
ALTER TABLE pintado_acciones_carpetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pintado_acciones_carpetas: leer si autenticado" ON pintado_acciones_carpetas;
CREATE POLICY "pintado_acciones_carpetas: leer si autenticado" ON pintado_acciones_carpetas
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pintado_acciones_carpetas: escribir si autenticado" ON pintado_acciones_carpetas;
CREATE POLICY "pintado_acciones_carpetas: escribir si autenticado" ON pintado_acciones_carpetas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
