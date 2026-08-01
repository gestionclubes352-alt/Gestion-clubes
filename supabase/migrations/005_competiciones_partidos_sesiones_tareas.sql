-- =====================================================
-- GESTION CLUBES — Competiciones, Partidos, Sesiones,
-- Pizarras Tácticas y Tareas
-- Requiere haber ejecutado antes: 004_multiclub_schema.sql
-- (necesita las tablas clubes, equipos, usuarios)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: competiciones
-- (debe existir antes de poder dar de alta un partido)
-- =====================================================
CREATE TABLE IF NOT EXISTS competiciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Liga' CHECK (tipo IN ('Liga', 'Copa', 'Amistoso', 'Torneo')),
    categoria VARCHAR(100),
    temporada VARCHAR(20) DEFAULT '25/26',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competiciones_temporada ON competiciones(temporada);

-- =====================================================
-- TABLA: partidos
-- Requiere: competicion_id (competiciones) + equipo_id (equipos, que a su
-- vez cuelga de clubes). El rival puede ser un equipo propio del sistema
-- (equipo_visitante_id) o, si no está dado de alta, un nombre libre.
-- =====================================================
CREATE TABLE IF NOT EXISTS partidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competicion_id UUID NOT NULL REFERENCES competiciones(id) ON DELETE RESTRICT,
    equipo_local_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
    equipo_visitante_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
    rival_nombre VARCHAR(255), -- si el rival no está dado de alta como equipo
    jornada VARCHAR(50),
    fecha DATE NOT NULL,
    hora VARCHAR(10),
    lugar VARCHAR(255),
    marcador VARCHAR(20),
    estado VARCHAR(20) DEFAULT 'Programado' CHECK (estado IN ('Programado', 'Finalizado', 'Aplazado', 'Suspendido')),
    notas TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (equipo_visitante_id IS NOT NULL OR rival_nombre IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_partidos_competicion ON partidos(competicion_id);
CREATE INDEX IF NOT EXISTS idx_partidos_fecha ON partidos(fecha);
CREATE INDEX IF NOT EXISTS idx_partidos_equipo_local ON partidos(equipo_local_id);

-- =====================================================
-- TABLA: sesiones (entrenamientos, reuniones, otras actividades)
-- =====================================================
CREATE TABLE IF NOT EXISTS sesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Entrenamiento' CHECK (tipo IN ('Entrenamiento', 'Reunión', 'Descanso', 'Actividad', 'Otro')),
    fecha DATE NOT NULL,
    hora VARCHAR(10),
    lugar VARCHAR(255),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sesiones_equipo ON sesiones(equipo_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones(fecha);

-- =====================================================
-- TABLA: pizarras_tacticas
-- =====================================================
CREATE TABLE IF NOT EXISTS pizarras_tacticas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    formacion VARCHAR(20) DEFAULT '4-4-2',
    posiciones JSONB DEFAULT '[]',
    partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL, -- opcional: ligada a un partido concreto
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pizarras_equipo ON pizarras_tacticas(equipo_id);

-- =====================================================
-- TABLA: tareas
-- =====================================================
CREATE TABLE IF NOT EXISTS tareas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
    equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    asignado_a UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En progreso', 'Completada')),
    prioridad VARCHAR(20) DEFAULT 'Media' CHECK (prioridad IN ('Baja', 'Media', 'Alta')),
    fecha_limite DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tareas_club ON tareas(club_id);
CREATE INDEX IF NOT EXISTS idx_tareas_asignado ON tareas(asignado_a);
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas(estado);

-- =====================================================
-- TRIGGERS updated_at
-- =====================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['competiciones','partidos','sesiones','pizarras_tacticas','tareas']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;', t, t);
        EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t, t);
    END LOOP;
END $$;

-- =====================================================
-- RLS básico (leer si autenticado — afinamos por rol más adelante)
-- =====================================================
ALTER TABLE competiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pizarras_tacticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competiciones: leer si autenticado" ON competiciones
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "partidos: leer si autenticado" ON partidos
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sesiones: leer si autenticado" ON sesiones
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pizarras_tacticas: leer si autenticado" ON pizarras_tacticas
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "tareas: leer si autenticado" ON tareas
    FOR SELECT USING (auth.role() = 'authenticated');

-- Escritura básica: cualquier autenticado activo puede insertar/editar
-- (ajustaremos a nivel de rol Administrador/Entrenador cuando cerremos las políticas finas)
CREATE POLICY "competiciones: escribir si autenticado" ON competiciones
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "partidos: escribir si autenticado" ON partidos
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "sesiones: escribir si autenticado" ON sesiones
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pizarras_tacticas: escribir si autenticado" ON pizarras_tacticas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "tareas: escribir si autenticado" ON tareas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
