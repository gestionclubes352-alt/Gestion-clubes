-- =====================================================
-- match_reports: convertir los campos abiertos de ABP
-- (corners, faltas laterales, faltas frontales) de un
-- número fijo de columnas a listas extensibles (JSONB)
-- para poder añadir tantas jugadas como se necesite.
-- =====================================================

ALTER TABLE match_reports
    ADD COLUMN IF NOT EXISTS abp_off_corners JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS abp_off_lateral_fouls JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS abp_def_corners JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS abp_def_lateral_fouls JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS abp_def_frontal_fouls JSONB DEFAULT '[]'::jsonb;

-- Backfill: migra los datos de las columnas fijas antiguas a las
-- nuevas listas, para las filas que todavía no tengan la lista
-- rellenada (columna recién creada, por tanto todo `[]`).

UPDATE match_reports SET abp_off_corners = (
    SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', gen_random_uuid()::text, 'text', COALESCE(t, ''), 'image', COALESCE(i, ''), 'video', COALESCE(v, '')) AS item
        FROM (VALUES
            (abp_off_corner_text, abp_off_corner_image, abp_off_corner_video),
            (abp_off_corner2_text, abp_off_corner2_image, abp_off_corner2_video),
            (abp_off_corner3_text, abp_off_corner3_image, abp_off_corner3_video),
            (abp_off_corner4_text, abp_off_corner4_image, abp_off_corner4_video)
        ) AS s(t, i, v)
        WHERE COALESCE(t, '') <> '' OR COALESCE(i, '') <> '' OR COALESCE(v, '') <> ''
    ) sub
)
WHERE abp_off_corners = '[]'::jsonb;

UPDATE match_reports SET abp_off_lateral_fouls = (
    SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', gen_random_uuid()::text, 'text', COALESCE(t, ''), 'image', COALESCE(i, ''), 'video', COALESCE(v, '')) AS item
        FROM (VALUES
            (abp_off_lateral_text, abp_off_lateral_image, abp_off_lateral_video),
            (abp_off_lateral2_text, abp_off_lateral2_image, abp_off_lateral2_video)
        ) AS s(t, i, v)
        WHERE COALESCE(t, '') <> '' OR COALESCE(i, '') <> '' OR COALESCE(v, '') <> ''
    ) sub
)
WHERE abp_off_lateral_fouls = '[]'::jsonb;

UPDATE match_reports SET abp_def_corners = (
    SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', gen_random_uuid()::text, 'text', COALESCE(t, ''), 'image', COALESCE(i, ''), 'video', COALESCE(v, '')) AS item
        FROM (VALUES
            (abp_def_corner1_text, abp_def_corner1_image, abp_def_corner1_video),
            (abp_def_corner2_text, abp_def_corner2_image, abp_def_corner2_video)
        ) AS s(t, i, v)
        WHERE COALESCE(t, '') <> '' OR COALESCE(i, '') <> '' OR COALESCE(v, '') <> ''
    ) sub
)
WHERE abp_def_corners = '[]'::jsonb;

UPDATE match_reports SET abp_def_lateral_fouls = (
    SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', gen_random_uuid()::text, 'text', COALESCE(t, ''), 'image', COALESCE(i, ''), 'video', COALESCE(v, '')) AS item
        FROM (VALUES
            (abp_def_lateral_text, abp_def_lateral_image, abp_def_lateral_video)
        ) AS s(t, i, v)
        WHERE COALESCE(t, '') <> '' OR COALESCE(i, '') <> '' OR COALESCE(v, '') <> ''
    ) sub
)
WHERE abp_def_lateral_fouls = '[]'::jsonb;

UPDATE match_reports SET abp_def_frontal_fouls = (
    SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', gen_random_uuid()::text, 'text', COALESCE(t, ''), 'image', COALESCE(i, ''), 'video', COALESCE(v, '')) AS item
        FROM (VALUES
            (abp_def_frontal_text, abp_def_frontal_image, abp_def_frontal_video)
        ) AS s(t, i, v)
        WHERE COALESCE(t, '') <> '' OR COALESCE(i, '') <> '' OR COALESCE(v, '') <> ''
    ) sub
)
WHERE abp_def_frontal_fouls = '[]'::jsonb;
