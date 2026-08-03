-- =====================================================
-- GESTION CLUBES — Eventos de calendario
-- El calendario (módulo `calendario`) gestiona un único tipo de evento
-- genérico (Entrenamiento/Sesión/Partido/Actividad/Otro) que hasta ahora
-- se guardaba en un shim local sin persistencia real (ver dataService.ts,
-- `db.events`). Esta tabla le da persistencia real en Supabase.
--
-- Nota: `club_id` y `team` se guardan como texto libre (no FK) porque el
-- frontend todavía admite equipos "demo" con ids no-UUID (p.ej.
-- 'cd-derio', 'escuela-huesca') como fallback cuando no hay datos reales.
-- =====================================================

CREATE TABLE IF NOT EXISTS eventos_calendario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Entrenamiento', 'Sesión', 'Partido', 'Otro', 'Actividad')),
    date TIMESTAMPTZ NOT NULL,
    time VARCHAR(10),
    team VARCHAR(255),
    location VARCHAR(255),
    notes TEXT,
    video_url TEXT,
    doc_url TEXT,
    staff_roles TEXT,
    competition VARCHAR(255),
    jornada VARCHAR(50),
    session_number INTEGER,
    local_team VARCHAR(255),
    visitor_team VARCHAR(255),
    opponent VARCHAR(255),
    score VARCHAR(20),
    status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_calendario_club ON eventos_calendario(club_id);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_fecha ON eventos_calendario(date);

DROP TRIGGER IF EXISTS trg_eventos_calendario_updated_at ON eventos_calendario;
CREATE TRIGGER trg_eventos_calendario_updated_at BEFORE UPDATE ON eventos_calendario
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS: mismo criterio que el resto de tablas de la Fase 1
-- (leer/escribir si autenticado; se afina por rol más adelante)
-- =====================================================
ALTER TABLE eventos_calendario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_calendario: leer si autenticado" ON eventos_calendario
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "eventos_calendario: escribir si autenticado" ON eventos_calendario
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
