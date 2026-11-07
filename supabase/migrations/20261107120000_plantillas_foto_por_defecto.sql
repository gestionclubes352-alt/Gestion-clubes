-- =====================================================
-- Foto por defecto para jugadores PROPIOS sin foto
-- El fichero vive en frontend/public/jugador-default.png (servido por Vercel).
-- Excluye equipos rivales. No sobrescribe fotos existentes. Idempotente.
-- =====================================================

UPDATE plantillas p
SET foto_url = 'https://gestion-clubes.vercel.app/jugador-default.png'
WHERE (p.foto_url IS NULL OR btrim(p.foto_url) = '')
  AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.id = p.equipo_id AND e.es_rival);
