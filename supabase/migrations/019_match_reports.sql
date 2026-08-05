-- =====================================================
-- TABLA: match_reports
-- Informe detallado de partidos: alineaciones, eventos,
-- análisis táctico, vídeos y documentos
-- Requiere: eventos_calendario.id (partido)
-- =====================================================

CREATE TABLE IF NOT EXISTS match_reports (
    id TEXT PRIMARY KEY,
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
    lineup_positions JSONB DEFAULT '[]'::jsonb,
    substitute_ids JSONB DEFAULT '[]'::jsonb,
    not_convocado_ids JSONB DEFAULT '[]'::jsonb,
    not_convocado_reasons JSONB DEFAULT '{}'::jsonb,
    video_events JSONB DEFAULT '[]'::jsonb,
    first_half_start VARCHAR(10) DEFAULT '',
    first_half_end VARCHAR(10) DEFAULT '',
    second_half_start VARCHAR(10) DEFAULT '',
    second_half_end VARCHAR(10) DEFAULT '',
    referee_name VARCHAR(255) DEFAULT '',
    referee_description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_reports_created ON match_reports(created_at);

-- RLS: lectura y escritura para autenticados
ALTER TABLE match_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_reports: leer si autenticado" ON match_reports;
CREATE POLICY "match_reports: leer si autenticado" ON match_reports
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "match_reports: escribir si autenticado" ON match_reports;
CREATE POLICY "match_reports: escribir si autenticado" ON match_reports
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_match_reports_updated_at ON match_reports;
CREATE TRIGGER trg_match_reports_updated_at BEFORE UPDATE ON match_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
