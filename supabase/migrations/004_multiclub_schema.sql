-- =====================================================
-- GESTION CLUBES — Esquema multi-club relacional
-- Sustituye el modelo plano (columnas de texto 'club'/'equipo')
-- por relaciones reales con claves foráneas.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: clubes
-- =====================================================
CREATE TABLE IF NOT EXISTS clubes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    escudo_url TEXT DEFAULT '',
    ciudad VARCHAR(255),
    fundacion INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clubes_nombre ON clubes(nombre);

-- =====================================================
-- TABLA: equipos (cada equipo pertenece a un club)
-- Ej: "Primer Equipo", "Juvenil A", "Alevín B"...
-- =====================================================
CREATE TABLE IF NOT EXISTS equipos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    competicion VARCHAR(100),
    temporada VARCHAR(20) DEFAULT '25/26',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipos_club ON equipos(club_id);
CREATE INDEX IF NOT EXISTS idx_equipos_temporada ON equipos(temporada);

-- =====================================================
-- TABLA: plantillas (jugadores de un equipo)
-- =====================================================
CREATE TABLE IF NOT EXISTS plantillas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    foto_url TEXT DEFAULT '',
    dorsal INTEGER,
    nombre VARCHAR(255) NOT NULL,
    posicion VARCHAR(50) CHECK (posicion IN ('Portero', 'Defensa', 'Medio', 'Delantero')),
    posicion_juego VARCHAR(100),
    perfil CHAR(1) CHECK (perfil IN ('D', 'I')),
    fecha_nacimiento DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (equipo_id, dorsal)
);

CREATE INDEX IF NOT EXISTS idx_plantillas_equipo ON plantillas(equipo_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_nombre ON plantillas(nombre);

-- =====================================================
-- TABLA: personal (staff/cuerpo técnico)
-- Puede colgar de un club entero o de un equipo concreto
-- =====================================================
CREATE TABLE IF NOT EXISTS personal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
    equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
    nombre VARCHAR(255) NOT NULL,
    primer_apellido VARCHAR(255) NOT NULL,
    segundo_apellido VARCHAR(255),
    foto_url TEXT DEFAULT '',
    dni VARCHAR(20),
    fecha_nacimiento DATE,
    rol VARCHAR(100) NOT NULL,
    telefono VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_club ON personal(club_id);
CREATE INDEX IF NOT EXISTS idx_personal_equipo ON personal(equipo_id);
CREATE INDEX IF NOT EXISTS idx_personal_rol ON personal(rol);

-- =====================================================
-- TABLA: usuarios (perfil de cada usuario autenticado)
-- 1 fila por usuario de Supabase Auth (auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    club_id UUID REFERENCES clubes(id) ON DELETE SET NULL,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'Staff'
        CHECK (rol IN ('Administrador', 'Entrenador', 'Analista', 'Staff')),
    estado VARCHAR(20) DEFAULT 'Pendiente'
        CHECK (estado IN ('Activo', 'Inactivo', 'Pendiente')),
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_club ON usuarios(club_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- Crea automáticamente una fila en 'usuarios' (estado Pendiente) al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, nombre, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- TRIGGERS updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['clubes','equipos','plantillas','personal','usuarios']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;', t, t);
        EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t, t);
    END LOOP;
END $$;

-- =====================================================
-- RLS — habilitado, con acceso básico por autenticación
-- (política de club/rol detallada la afinamos después si quieres)
-- =====================================================
ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clubes: leer si autenticado" ON clubes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "equipos: leer si autenticado" ON equipos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "plantillas: leer si autenticado" ON plantillas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "personal: leer si autenticado" ON personal
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios: ver el propio" ON usuarios
    FOR SELECT USING (id = auth.uid());
