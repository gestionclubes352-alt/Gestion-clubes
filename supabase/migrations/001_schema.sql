-- =====================================================
-- GESTION CLUBES — Esquema inicial (Supabase / Postgres)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: profiles (perfil de cada usuario autenticado)
-- 1 fila por usuario de Supabase Auth (auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'Staff'
        CHECK (rol IN ('Administrador', 'Entrenador', 'Analista', 'Staff')),
    club VARCHAR(100) DEFAULT '',
    estado VARCHAR(20) DEFAULT 'Pendiente'
        CHECK (estado IN ('Activo', 'Inactivo', 'Pendiente')),
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_club ON profiles(club);
CREATE INDEX IF NOT EXISTS idx_profiles_rol ON profiles(rol);

-- Crear automáticamente un profile "Pendiente" cuando alguien se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nombre, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- TABLA: players (Jugadores)
-- =====================================================
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    foto_url TEXT DEFAULT '',
    competicion VARCHAR(100) DEFAULT '',
    club VARCHAR(100) NOT NULL DEFAULT '',
    equipo VARCHAR(100) DEFAULT '',
    dorsal INTEGER NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    posicion VARCHAR(50) NOT NULL CHECK (posicion IN ('Portero', 'Defensa', 'Medio', 'Delantero')),
    posicion_juego VARCHAR(100),
    perfil CHAR(1) CHECK (perfil IN ('D', 'I')),
    fecha_nacimiento DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_nombre ON players(nombre);
CREATE INDEX IF NOT EXISTS idx_players_posicion ON players(posicion);
CREATE INDEX IF NOT EXISTS idx_players_club ON players(club);

-- =====================================================
-- TABLA: staff (Personal)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    primer_apellido VARCHAR(255) NOT NULL,
    segundo_apellido VARCHAR(255),
    foto_url TEXT DEFAULT '',
    dni VARCHAR(20),
    fecha_nacimiento DATE,
    rol VARCHAR(100) NOT NULL,
    club VARCHAR(100) DEFAULT '',
    equipo VARCHAR(100),
    etapa VARCHAR(100),
    competicion VARCHAR(100),
    telefono VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_rol ON staff(rol);
CREATE INDEX IF NOT EXISTS idx_staff_club ON staff(club);

-- =====================================================
-- TABLA: competition_teams (Equipos de la competición)
-- =====================================================
CREATE TABLE IF NOT EXISTS competition_teams (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    estadio VARCHAR(255),
    localidad VARCHAR(255),
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_teams_nombre ON competition_teams(nombre);

-- =====================================================
-- TABLA: events (Calendario de eventos)
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Entrenamiento', 'Partido', 'Reunión', 'Otro', 'Descanso', 'Actividad')),
    date DATE NOT NULL,
    time VARCHAR(10),
    club VARCHAR(100) DEFAULT '',
    team VARCHAR(100),
    location VARCHAR(255),
    notes TEXT,
    video_url TEXT,
    doc_url TEXT,
    competition VARCHAR(100),
    jornada VARCHAR(50),
    local_team VARCHAR(100),
    visitor_team VARCHAR(100),
    opponent VARCHAR(100),
    score VARCHAR(20),
    status VARCHAR(20) CHECK (status IN ('Finished', 'Upcoming')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_club ON events(club);

-- =====================================================
-- TABLA: match_reports (Informes de partido)
-- =====================================================
CREATE TABLE IF NOT EXISTS match_reports (
    id VARCHAR(100) PRIMARY KEY,
    general_notes TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    doc_url TEXT DEFAULT '',
    con_balon_text TEXT DEFAULT '',
    con_balon_video TEXT DEFAULT '',
    con_balon_doc TEXT DEFAULT '',
    sin_balon_text TEXT DEFAULT '',
    sin_balon_video TEXT DEFAULT '',
    sin_balon_doc TEXT DEFAULT '',
    abp_text TEXT DEFAULT '',
    abp_video TEXT DEFAULT '',
    abp_doc TEXT DEFAULT '',
    formation VARCHAR(20),
    lineup_positions JSONB DEFAULT '[]',
    substitute_ids JSONB DEFAULT '[]',
    video_events JSONB DEFAULT '[]',
    first_half_start VARCHAR(10),
    first_half_end VARCHAR(10),
    second_half_start VARCHAR(10),
    second_half_end VARCHAR(10),
    event_id VARCHAR(100) REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_reports_event ON match_reports(event_id);

-- =====================================================
-- TABLA: campogramas (Formaciones tácticas)
-- =====================================================
CREATE TABLE IF NOT EXISTS campogramas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    club VARCHAR(100) DEFAULT '',
    equipo VARCHAR(100) DEFAULT '',
    jugadores_count INTEGER DEFAULT 0,
    formacion VARCHAR(20) DEFAULT '4-4-2',
    positions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campogramas_club ON campogramas(club);

-- =====================================================
-- TABLA: exercises (Ejercicios de diseño)
-- =====================================================
CREATE TABLE IF NOT EXISTS exercises (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    club VARCHAR(100) DEFAULT '',
    frames JSONB DEFAULT '[]',
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: tactical_boards (Pizarras tácticas guardadas)
-- =====================================================
CREATE TABLE IF NOT EXISTS tactical_boards (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    club VARCHAR(100) DEFAULT '',
    formation VARCHAR(20),
    positions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: activity_log (Auditoría)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    FOREACH t IN ARRAY ARRAY['profiles','players','staff','competition_teams','events','match_reports','campogramas','exercises','tactical_boards']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;', t, t);
        EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t, t);
    END LOOP;
END $$;
