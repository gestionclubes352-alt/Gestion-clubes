-- =====================================================
-- GESTION CLUBES — Relación muchos a muchos entre instalaciones y clubes
-- Permite que múltiples clubes compartan una instalación
-- =====================================================

-- Crear tabla de relación instalaciones_campos_clubes
CREATE TABLE IF NOT EXISTS instalaciones_campos_clubes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_campo_id UUID NOT NULL REFERENCES instalaciones_campos(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(instalacion_campo_id, club_id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_instalaciones_campos_clubes_instalacion ON instalaciones_campos_clubes(instalacion_campo_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_campos_clubes_club ON instalaciones_campos_clubes(club_id);

-- RLS para instalaciones_campos_clubes
ALTER TABLE instalaciones_campos_clubes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_insert_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes
  FOR UPDATE USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_delete_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );
