-- =====================================================
-- Carpetas para organizar las Pizarras Tácticas guardadas.
-- Cada carpeta pertenece a un equipo; las pizarras pueden
-- asignarse opcionalmente a una carpeta (NULL = sin carpeta).
-- =====================================================

CREATE TABLE IF NOT EXISTS pizarras_carpetas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (equipo_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_pizarras_carpetas_equipo ON pizarras_carpetas(equipo_id);

ALTER TABLE pizarras_tacticas
    ADD COLUMN IF NOT EXISTS carpeta_id UUID REFERENCES pizarras_carpetas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pizarras_carpeta ON pizarras_tacticas(carpeta_id);

-- Trigger para mantener updated_at
DROP TRIGGER IF EXISTS trg_pizarras_carpetas_updated_at ON pizarras_carpetas;
CREATE TRIGGER trg_pizarras_carpetas_updated_at
    BEFORE UPDATE ON pizarras_carpetas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: mismo patrón que pizarras_tacticas (leer/escribir si autenticado)
ALTER TABLE pizarras_carpetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pizarras_carpetas: leer si autenticado" ON pizarras_carpetas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "pizarras_carpetas: escribir si autenticado" ON pizarras_carpetas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
