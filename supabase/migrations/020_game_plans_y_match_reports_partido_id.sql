-- =====================================================
-- TABLA: game_plans (Plan de Partido)
-- Tabla independiente de match_reports. Cada una guarda
-- sus propios datos aunque tengan campos similares.
-- Requiere: partido_id (partidos)
-- =====================================================

CREATE TABLE IF NOT EXISTS game_plans (
    id TEXT PRIMARY KEY,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
    general_notes TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    doc_url TEXT DEFAULT '',
    con_balon_text TEXT DEFAULT '',
    con_balon_video TEXT DEFAULT '',
    con_balon_doc TEXT DEFAULT '',
    sin_balon_text TEXT DEFAULT '',
    sin_balon_video TEXT DEFAULT '',
    sin_balon_doc TEXT DEFAULT '',
    ataque_text TEXT DEFAULT '',
    ataque_video TEXT DEFAULT '',
    ataque_doc TEXT DEFAULT '',
    defensa_text TEXT DEFAULT '',
    defensa_video TEXT DEFAULT '',
    defensa_doc TEXT DEFAULT '',
    abp_text TEXT DEFAULT '',
    abp_video TEXT DEFAULT '',
    abp_doc TEXT DEFAULT '',
    abp_off_corner_text TEXT DEFAULT '',
    abp_off_corner2_text TEXT DEFAULT '',
    abp_off_corner3_text TEXT DEFAULT '',
    abp_off_corner4_text TEXT DEFAULT '',
    abp_off_lateral_text TEXT DEFAULT '',
    abp_off_lateral2_text TEXT DEFAULT '',
    abp_off_frontal_text TEXT DEFAULT '',
    abp_def_corner1_text TEXT DEFAULT '',
    abp_def_corner2_text TEXT DEFAULT '',
    abp_def_lateral_text TEXT DEFAULT '',
    abp_def_frontal_text TEXT DEFAULT '',
    abp_off_corner_image TEXT DEFAULT '',
    abp_off_corner2_image TEXT DEFAULT '',
    abp_off_corner3_image TEXT DEFAULT '',
    abp_off_corner4_image TEXT DEFAULT '',
    abp_off_lateral_image TEXT DEFAULT '',
    abp_off_lateral2_image TEXT DEFAULT '',
    abp_off_frontal_image TEXT DEFAULT '',
    abp_def_corner1_image TEXT DEFAULT '',
    abp_def_corner2_image TEXT DEFAULT '',
    abp_def_lateral_image TEXT DEFAULT '',
    abp_def_frontal_image TEXT DEFAULT '',
    abp_off_corner_video TEXT DEFAULT '',
    abp_off_corner2_video TEXT DEFAULT '',
    abp_off_corner3_video TEXT DEFAULT '',
    abp_off_corner4_video TEXT DEFAULT '',
    abp_off_lateral_video TEXT DEFAULT '',
    abp_off_lateral2_video TEXT DEFAULT '',
    abp_off_frontal_video TEXT DEFAULT '',
    abp_def_corner1_video TEXT DEFAULT '',
    abp_def_corner2_video TEXT DEFAULT '',
    abp_def_lateral_video TEXT DEFAULT '',
    abp_def_frontal_video TEXT DEFAULT '',
    formation VARCHAR(20) DEFAULT '4-3-3',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_plans_partido ON game_plans(partido_id);
CREATE INDEX IF NOT EXISTS idx_game_plans_created ON game_plans(created_at);

-- RLS: lectura y escritura para autenticados
ALTER TABLE game_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_plans: leer si autenticado" ON game_plans
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "game_plans: escribir si autenticado" ON game_plans
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_game_plans_updated_at ON game_plans;
CREATE TRIGGER trg_game_plans_updated_at BEFORE UPDATE ON game_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ACTUALIZAR: match_reports (agregar partido_id)
-- =====================================================

ALTER TABLE match_reports ADD COLUMN IF NOT EXISTS partido_id UUID REFERENCES partidos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_match_reports_partido ON match_reports(partido_id);
