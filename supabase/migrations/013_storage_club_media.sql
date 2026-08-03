-- =====================================================
-- GESTION CLUBES — Bucket de Storage para fotos/logos
-- Crea el bucket público `club-media` que usan photoService.ts
-- y staffPhotoService.ts para subir fotos de jugadores, escudos
-- de equipo y logos de club (paths: clubs/{clubId}/players/{id}/...,
-- clubs/{clubId}/staff/{id}/..., clubs/{clubId}/teams/{id}/..., etc.)
-- =====================================================

insert into storage.buckets (id, name, public)
values ('club-media', 'club-media', true)
on conflict (id) do nothing;

-- Lectura pública (las fotos se muestran directamente vía getPublicUrl)
drop policy if exists "club-media: lectura publica" on storage.objects;
create policy "club-media: lectura publica"
    on storage.objects for select
    using (bucket_id = 'club-media');

-- Subida solo para usuarios autenticados
drop policy if exists "club-media: subir si autenticado" on storage.objects;
create policy "club-media: subir si autenticado"
    on storage.objects for insert
    with check (bucket_id = 'club-media' and auth.role() = 'authenticated');

-- Reemplazo (upsert) de la foto/logo solo para usuarios autenticados
drop policy if exists "club-media: actualizar si autenticado" on storage.objects;
create policy "club-media: actualizar si autenticado"
    on storage.objects for update
    using (bucket_id = 'club-media' and auth.role() = 'authenticated')
    with check (bucket_id = 'club-media' and auth.role() = 'authenticated');

-- Borrado solo para usuarios autenticados
drop policy if exists "club-media: borrar si autenticado" on storage.objects;
create policy "club-media: borrar si autenticado"
    on storage.objects for delete
    using (bucket_id = 'club-media' and auth.role() = 'authenticated');
