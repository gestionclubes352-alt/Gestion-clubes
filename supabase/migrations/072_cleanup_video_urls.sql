-- =====================================================
-- GESTION CLUBES — Limpiar URLs de vídeos incorrectas
--
-- Si hay URLs de Supabase Storage que apunten a rutas antiguas
-- (ej: /storage/v1/object/public/match-video-originals/matches/{id}/videos/)
-- estas nunca existirán porque la ruta correcta es
-- /storage/v1/object/public/match-video-originals/{id}/{field}/
--
-- Borrar esas URLs para que la app intente usar video_originals.videoUrl como fallback.
-- =====================================================

update match_reports
set video_url = null
where video_url is not null
  and (
    video_url like '%/matches/%/videos/%'
    or (video_url like '%supabase%' and not video_url like 'https://www.%' and not video_url like '%/object/public/match-video-originals/%')
  );

update match_reports
set plan_video_url = null
where plan_video_url is not null
  and (
    plan_video_url like '%/matches/%/plans/%'
    or (plan_video_url like '%supabase%' and not plan_video_url like 'https://www.%' and not plan_video_url like '%/object/public/match-video-originals/%')
  );

update match_reports
set rival_video_url = null
where rival_video_url is not null
  and (
    rival_video_url like '%/matches/%'
    or (rival_video_url like '%supabase%' and not rival_video_url like 'https://www.%' and not rival_video_url like '%/object/public/match-video-originals/%')
  );

-- Lo mismo para los videos de plan, rival con/sin balón
update match_reports
set plan_con_balon_video = null
where plan_con_balon_video is not null
  and (
    plan_con_balon_video like '%/matches/%'
    or (plan_con_balon_video like '%supabase%' and not plan_con_balon_video like 'https://www.%' and not plan_con_balon_video like '%/object/public/match-video-originals/%')
  );

update match_reports
set plan_sin_balon_video = null
where plan_sin_balon_video is not null
  and (
    plan_sin_balon_video like '%/matches/%'
    or (plan_sin_balon_video like '%supabase%' and not plan_sin_balon_video like 'https://www.%' and not plan_sin_balon_video like '%/object/public/match-video-originals/%')
  );

update match_reports
set rival_con_balon_video = null
where rival_con_balon_video is not null
  and (
    rival_con_balon_video like '%/matches/%'
    or (rival_con_balon_video like '%supabase%' and not rival_con_balon_video like 'https://www.%' and not rival_con_balon_video like '%/object/public/match-video-originals/%')
  );

update match_reports
set rival_sin_balon_video = null
where rival_sin_balon_video is not null
  and (
    rival_sin_balon_video like '%/matches/%'
    or (rival_sin_balon_video like '%supabase%' and not rival_sin_balon_video like 'https://www.%' and not rival_sin_balon_video like '%/object/public/match-video-originals/%')
  );

update match_reports
set rival_abp_video = null
where rival_abp_video is not null
  and (
    rival_abp_video like '%/matches/%'
    or (rival_abp_video like '%supabase%' and not rival_abp_video like 'https://www.%' and not rival_abp_video like '%/object/public/match-video-originals/%')
  );
