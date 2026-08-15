-- =====================================================
-- GESTION CLUBES — Copia original de vídeos de partido
-- Ademas de subir el vídeo a YouTube, se guarda una copia
-- del archivo original en este bucket para poder recortar
-- clips cortos (eventos/goles) en el navegador con ffmpeg.wasm,
-- ya que YouTube no permite descargar el archivo fuente.
-- Path: {matchId}/{targetField}/{taskId}.{ext}
-- =====================================================

insert into storage.buckets (id, name, public)
values ('match-video-originals', 'match-video-originals', true)
on conflict (id) do nothing;

-- Lectura pública (se recorta en el navegador vía fetch + ffmpeg.wasm)
drop policy if exists "match-video-originals: lectura publica" on storage.objects;
create policy "match-video-originals: lectura publica"
    on storage.objects for select
    using (bucket_id = 'match-video-originals');

-- Subida solo para usuarios autenticados
drop policy if exists "match-video-originals: subir si autenticado" on storage.objects;
create policy "match-video-originals: subir si autenticado"
    on storage.objects for insert
    with check (bucket_id = 'match-video-originals' and auth.role() = 'authenticated');

-- Reemplazo (upsert) solo para usuarios autenticados
drop policy if exists "match-video-originals: actualizar si autenticado" on storage.objects;
create policy "match-video-originals: actualizar si autenticado"
    on storage.objects for update
    using (bucket_id = 'match-video-originals' and auth.role() = 'authenticated')
    with check (bucket_id = 'match-video-originals' and auth.role() = 'authenticated');

-- Borrado solo para usuarios autenticados
drop policy if exists "match-video-originals: borrar si autenticado" on storage.objects;
create policy "match-video-originals: borrar si autenticado"
    on storage.objects for delete
    using (bucket_id = 'match-video-originals' and auth.role() = 'authenticated');

-- Mapa { targetField: storagePublicUrl } de copias originales guardadas
-- por campo de vídeo (videoUrl, planVideoUrl, rivalVideoUrl, ...).
alter table match_reports
    add column if not exists video_originals jsonb not null default '{}'::jsonb;
