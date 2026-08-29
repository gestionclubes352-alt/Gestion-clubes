-- =====================================================
-- Módulo Residencia: habitaciones, jugadores residentes
-- y planificación de comidas.
-- =====================================================

CREATE TABLE IF NOT EXISTS residencia_habitaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    capacidad INTEGER,
    planta VARCHAR(100),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_residencia_habitaciones_club ON residencia_habitaciones(club_id);

CREATE TABLE IF NOT EXISTS residencia_jugadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    jugador_id UUID REFERENCES plantillas(id) ON DELETE SET NULL,
    habitacion_id UUID REFERENCES residencia_habitaciones(id) ON DELETE SET NULL,
    fecha_entrada DATE,
    fecha_salida DATE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_residencia_jugadores_club ON residencia_jugadores(club_id);
CREATE INDEX IF NOT EXISTS idx_residencia_jugadores_jugador ON residencia_jugadores(jugador_id);
CREATE INDEX IF NOT EXISTS idx_residencia_jugadores_habitacion ON residencia_jugadores(habitacion_id);

CREATE TABLE IF NOT EXISTS residencia_comidas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    turno VARCHAR(50) NOT NULL DEFAULT 'Comida',
    menu TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_residencia_comidas_club ON residencia_comidas(club_id);
CREATE INDEX IF NOT EXISTS idx_residencia_comidas_fecha ON residencia_comidas(fecha);

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_residencia_habitaciones_updated_at ON residencia_habitaciones;
CREATE TRIGGER trg_residencia_habitaciones_updated_at
    BEFORE UPDATE ON residencia_habitaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_residencia_jugadores_updated_at ON residencia_jugadores;
CREATE TRIGGER trg_residencia_jugadores_updated_at
    BEFORE UPDATE ON residencia_jugadores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_residencia_comidas_updated_at ON residencia_comidas;
CREATE TRIGGER trg_residencia_comidas_updated_at
    BEFORE UPDATE ON residencia_comidas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: mismo patrón que el resto de módulos (leer/escribir si autenticado)
ALTER TABLE residencia_habitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE residencia_jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE residencia_comidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "residencia_habitaciones: leer si autenticado" ON residencia_habitaciones;
CREATE POLICY "residencia_habitaciones: leer si autenticado" ON residencia_habitaciones
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "residencia_habitaciones: escribir si autenticado" ON residencia_habitaciones;
CREATE POLICY "residencia_habitaciones: escribir si autenticado" ON residencia_habitaciones
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "residencia_jugadores: leer si autenticado" ON residencia_jugadores;
CREATE POLICY "residencia_jugadores: leer si autenticado" ON residencia_jugadores
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "residencia_jugadores: escribir si autenticado" ON residencia_jugadores;
CREATE POLICY "residencia_jugadores: escribir si autenticado" ON residencia_jugadores
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "residencia_comidas: leer si autenticado" ON residencia_comidas;
CREATE POLICY "residencia_comidas: leer si autenticado" ON residencia_comidas
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "residencia_comidas: escribir si autenticado" ON residencia_comidas;
CREATE POLICY "residencia_comidas: escribir si autenticado" ON residencia_comidas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
