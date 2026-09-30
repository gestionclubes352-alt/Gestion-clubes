-- Documentos adjuntos a acciones y evaluaciones de objetivos individuales.
-- Bucket PRIVADO (contiene información de jugadores): se accede con URLs firmadas
-- y solo usuarios autenticados. Límite 20 MB y lista blanca de tipos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'objetivos-documentos',
    'objetivos-documentos',
    false,
    20971520,
    array[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "objetivos-documentos: leer si autenticado" on storage.objects;
create policy "objetivos-documentos: leer si autenticado"
    on storage.objects for select
    using (bucket_id = 'objetivos-documentos' and auth.role() = 'authenticated');

drop policy if exists "objetivos-documentos: subir si autenticado" on storage.objects;
create policy "objetivos-documentos: subir si autenticado"
    on storage.objects for insert
    with check (bucket_id = 'objetivos-documentos' and auth.role() = 'authenticated');

drop policy if exists "objetivos-documentos: borrar si autenticado" on storage.objects;
create policy "objetivos-documentos: borrar si autenticado"
    on storage.objects for delete
    using (bucket_id = 'objetivos-documentos' and auth.role() = 'authenticated');
