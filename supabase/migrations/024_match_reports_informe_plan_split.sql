-- =====================================================
-- match_reports: separar el contenido de "Informe Rival"
-- y "Plan de Partido", que hasta ahora compartían las
-- mismas columnas (vídeo, documento, bloques de Ataque/
-- Defensa/Transiciones y las jugadas de ABP). Cada pestaña
-- pasa a tener sus propias columnas con prefijo rival_/plan_.
--
-- La pestaña ABP dedicada (abp_off_corners, etc.) no se
-- toca: sigue siendo su propio conjunto de datos, ahora
-- independiente también del bloque ABP embebido en el
-- Informe Rival.
-- =====================================================

ALTER TABLE match_reports
    -- Informe Rival
    ADD COLUMN IF NOT EXISTS rival_video_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_doc_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_con_balon_text TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_con_balon_video TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_con_balon_doc TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_con_balon_images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rival_sin_balon_text TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_sin_balon_video TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_sin_balon_doc TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_sin_balon_images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rival_abp_text TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_abp_video TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_abp_doc TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rival_abp_images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rival_abp_off_corners JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rival_abp_off_lateral_fouls JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rival_abp_def_corners JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rival_abp_def_lateral_fouls JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rival_abp_def_frontal_fouls JSONB DEFAULT '[]'::jsonb,

    -- Plan de Partido
    ADD COLUMN IF NOT EXISTS plan_video_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_doc_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_con_balon_text TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_con_balon_video TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_con_balon_doc TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_con_balon_images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS plan_sin_balon_text TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_sin_balon_video TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_sin_balon_doc TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_sin_balon_images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS plan_abp_text TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_abp_video TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_abp_doc TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS plan_abp_images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS plan_abp_off_corners JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS plan_abp_off_lateral_fouls JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS plan_abp_def_corners JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS plan_abp_def_lateral_fouls JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS plan_abp_def_frontal_fouls JSONB DEFAULT '[]'::jsonb;

-- Backfill: el contenido que hubiera en las columnas compartidas se
-- duplica tanto a Informe Rival como a Plan de Partido, para no
-- perder nada ya cargado. A partir de aquí cada pestaña evoluciona
-- de forma independiente.

UPDATE match_reports SET
    rival_video_url = COALESCE(video_url, ''),
    plan_video_url = COALESCE(video_url, ''),
    rival_doc_url = COALESCE(doc_url, ''),
    plan_doc_url = COALESCE(doc_url, ''),
    rival_con_balon_text = COALESCE(con_balon_text, ''),
    plan_con_balon_text = COALESCE(con_balon_text, ''),
    rival_con_balon_video = COALESCE(con_balon_video, ''),
    plan_con_balon_video = COALESCE(con_balon_video, ''),
    rival_con_balon_doc = COALESCE(con_balon_doc, ''),
    plan_con_balon_doc = COALESCE(con_balon_doc, ''),
    rival_con_balon_images = COALESCE(con_balon_images, '[]'::jsonb),
    plan_con_balon_images = COALESCE(con_balon_images, '[]'::jsonb),
    rival_sin_balon_text = COALESCE(sin_balon_text, ''),
    plan_sin_balon_text = COALESCE(sin_balon_text, ''),
    rival_sin_balon_video = COALESCE(sin_balon_video, ''),
    plan_sin_balon_video = COALESCE(sin_balon_video, ''),
    rival_sin_balon_doc = COALESCE(sin_balon_doc, ''),
    plan_sin_balon_doc = COALESCE(sin_balon_doc, ''),
    rival_sin_balon_images = COALESCE(sin_balon_images, '[]'::jsonb),
    plan_sin_balon_images = COALESCE(sin_balon_images, '[]'::jsonb),
    rival_abp_text = COALESCE(abp_text, ''),
    plan_abp_text = COALESCE(abp_text, ''),
    rival_abp_video = COALESCE(abp_video, ''),
    plan_abp_video = COALESCE(abp_video, ''),
    rival_abp_doc = COALESCE(abp_doc, ''),
    plan_abp_doc = COALESCE(abp_doc, ''),
    rival_abp_images = COALESCE(abp_images, '[]'::jsonb),
    plan_abp_images = COALESCE(abp_images, '[]'::jsonb),
    rival_abp_off_corners = COALESCE(abp_off_corners, '[]'::jsonb),
    plan_abp_off_corners = COALESCE(abp_off_corners, '[]'::jsonb),
    rival_abp_off_lateral_fouls = COALESCE(abp_off_lateral_fouls, '[]'::jsonb),
    plan_abp_off_lateral_fouls = COALESCE(abp_off_lateral_fouls, '[]'::jsonb),
    rival_abp_def_corners = COALESCE(abp_def_corners, '[]'::jsonb),
    plan_abp_def_corners = COALESCE(abp_def_corners, '[]'::jsonb),
    rival_abp_def_lateral_fouls = COALESCE(abp_def_lateral_fouls, '[]'::jsonb),
    plan_abp_def_lateral_fouls = COALESCE(abp_def_lateral_fouls, '[]'::jsonb),
    rival_abp_def_frontal_fouls = COALESCE(abp_def_frontal_fouls, '[]'::jsonb),
    plan_abp_def_frontal_fouls = COALESCE(abp_def_frontal_fouls, '[]'::jsonb)
WHERE rival_video_url = '' AND plan_video_url = '';
