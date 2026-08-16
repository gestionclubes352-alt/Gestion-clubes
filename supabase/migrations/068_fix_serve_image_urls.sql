-- =====================================================
-- FIX: Convertir URLs rotas de serve-image a URLs directas
-- La función serve-image fue removida, estas URLs están rotas
-- =====================================================

-- Actualizar plantillas: convertir serve-image URLs a URLs directas de Supabase
UPDATE plantillas
SET foto_url = 'https://kvshetedmhmtxodnxcne.supabase.co/storage/v1/object/public/club-media/' ||
               replace(
                 replace(
                   substring(foto_url FROM position('path=' IN foto_url) + 5),
                   '%2F', '/'
                 ),
                 '%20', ' '
               )
WHERE foto_url LIKE '%serve-image%';

-- Actualizar personal: convertir serve-image URLs a URLs directas de Supabase
UPDATE personal
SET foto_url = 'https://kvshetedmhmtxodnxcne.supabase.co/storage/v1/object/public/club-media/' ||
               replace(
                 replace(
                   substring(foto_url FROM position('path=' IN foto_url) + 5),
                   '%2F', '/'
                 ),
                 '%20', ' '
               )
WHERE foto_url LIKE '%serve-image%';

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Conversion de serve-image URLs completada';
END $$;
