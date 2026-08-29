-- =====================================================
-- GESTION CLUBES — Permitir subir PDF en el bucket `club-media`
-- El bucket estaba restringido a mime types de imagen, lo que
-- bloqueaba la subida del documento del plan de partido y del
-- documento del rival (MatchReportView -> uploadMatchReportFile),
-- que suben PDFs a matches/{matchId}/reports/....
-- =====================================================

update storage.buckets
set allowed_mime_types = array(
    select distinct unnest(
        coalesce(allowed_mime_types, array[]::text[]) || array['application/pdf']
    )
)
where id = 'club-media';
