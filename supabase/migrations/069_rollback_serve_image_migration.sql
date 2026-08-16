-- =====================================================
-- ROLLBACK: Deshacer migración 068
-- Restaurar URLs original de serve-image
-- =====================================================

-- Restaurar ALAN y SASHA que tenían serve-image
UPDATE plantillas
SET foto_url = 'https://kvshetedmhmtxodnxcne.functions.supabase.co/serve-image?bucket=club-media&path=clubs%2Fdf96bcda-5dff-4997-a546-a77081caa2e2%2Fplayers%2Fac93f5be-63fe-4e0f-9fcb-6369f614a623%2Fprofile.png'
WHERE id = 'ac93f5be-63fe-4e0f-9fcb-6369f614a623';

UPDATE plantillas
SET foto_url = 'https://kvshetedmhmtxodnxcne.functions.supabase.co/serve-image?bucket=club-media&path=clubs%2Fdf96bcda-5dff-4997-a546-a77081caa2e2%2Fplayers%2F1c9979bb-6675-4c5c-b305-fbc75202214b%2Fprofile.png'
WHERE id = '1c9979bb-6675-4c5c-b305-fbc75202214b';

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Rollback de migración 068 completado';
END $$;
