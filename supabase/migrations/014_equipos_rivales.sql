-- =====================================================
-- GESTION CLUBES — Plantillas de equipos rivales
-- Da de alta equipos rivales y su plantilla básica (dorsal, nombre,
-- posición, foto) para poder reutilizarlos en la Pizarra Táctica
-- (hasta ahora los jugadores rivales solo existían como estado local
-- volátil en PizarraTactica.tsx) y en el Informe de Rival de Partidos.
-- =====================================================

CREATE TABLE IF NOT EXISTS equipos_rivales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    escudo_url TEXT,
    competicion VARCHAR(255),
    temporada VARCHAR(20),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipos_rivales_club ON equipos_rivales(club_id);

CREATE TABLE IF NOT EXISTS jugadores_rivales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_rival_id UUID NOT NULL REFERENCES equipos_rivales(id) ON DELETE CASCADE,
    dorsal INTEGER,
    nombre VARCHAR(255) NOT NULL,
    posicion VARCHAR(50),
    foto_url TEXT,
    anio_nacimiento INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jugadores_rivales_equipo ON jugadores_rivales(equipo_rival_id);

DROP TRIGGER IF EXISTS trg_equipos_rivales_updated_at ON equipos_rivales;
CREATE TRIGGER trg_equipos_rivales_updated_at BEFORE UPDATE ON equipos_rivales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_jugadores_rivales_updated_at ON jugadores_rivales;
CREATE TRIGGER trg_jugadores_rivales_updated_at BEFORE UPDATE ON jugadores_rivales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS: mismo criterio que el resto de tablas de la Fase 1
-- (leer/escribir si autenticado; se afina por rol más adelante)
-- =====================================================
ALTER TABLE equipos_rivales ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugadores_rivales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipos_rivales: leer si autenticado" ON equipos_rivales
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "equipos_rivales: escribir si autenticado" ON equipos_rivales
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "jugadores_rivales: leer si autenticado" ON jugadores_rivales
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "jugadores_rivales: escribir si autenticado" ON jugadores_rivales
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
