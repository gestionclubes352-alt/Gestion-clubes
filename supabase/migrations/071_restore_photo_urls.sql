-- =====================================================
-- FIX: Restaurar foto_url URLs para todos los jugadores
-- Asumiendo el patrón de Supabase Storage y extensión .png
-- =====================================================

UPDATE plantillas
SET foto_url = 'https://kvshetedmhmtxodnxcne.supabase.co/storage/v1/object/public/club-media/clubs/df96bcda-5dff-4997-a546-a77081caa2e2/players/' || id || '/profile.png'
WHERE foto_url IS NULL;

UPDATE personal
SET foto_url = 'https://kvshetedmhmtxodnxcne.supabase.co/storage/v1/object/public/club-media/clubs/df96bcda-5dff-4997-a546-a77081caa2e2/personal/' || id || '/profile.png'
WHERE foto_url IS NULL;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Restauración de foto_url completada';
END $$;
