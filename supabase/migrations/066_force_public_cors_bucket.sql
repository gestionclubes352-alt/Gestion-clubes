-- =====================================================
-- FIX: Forzar bucket público con CORS habilitado
-- El bucket club-media debe servir recursos públicamente
-- sin restricciones de origen
-- =====================================================

-- 1. Garantizar que el bucket es público
UPDATE storage.buckets
SET public = true
WHERE id = 'club-media';

-- 2. Eliminar todas las políticas restrictivas
DROP POLICY IF EXISTS "club-media: lectura publica" ON storage.objects;
DROP POLICY IF EXISTS "club-media: subir si autenticado" ON storage.objects;
DROP POLICY IF EXISTS "club-media: actualizar si autenticado" ON storage.objects;
DROP POLICY IF EXISTS "club-media: borrar si autenticado" ON storage.objects;

-- 3. Crear una política de lectura completamente pública (sin restricciones)
CREATE POLICY "club-media-public-read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'club-media');

-- 4. Crear políticas de escritura/actualización/borrado solo para autenticados
CREATE POLICY "club-media-authenticated-write"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'club-media' AND auth.role() = 'authenticated');

CREATE POLICY "club-media-authenticated-update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'club-media' AND auth.role() = 'authenticated')
    WITH CHECK (bucket_id = 'club-media' AND auth.role() = 'authenticated');

CREATE POLICY "club-media-authenticated-delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'club-media' AND auth.role() = 'authenticated');

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Bucket club-media configurado como público con políticas permisivas.';
END $$;
