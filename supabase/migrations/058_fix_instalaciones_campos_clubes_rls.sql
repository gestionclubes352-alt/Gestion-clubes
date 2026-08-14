-- =====================================================
-- FIX: Corregir políticas RLS de instalaciones_campos_clubes
-- El problema: las políticas verificaban que el club_id perteneciera al usuario,
-- pero debería verificar que la instalación pertenezca al club del usuario
-- =====================================================

-- Eliminar políticas anteriores incorrectas
DROP POLICY IF EXISTS "users_can_view_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes;
DROP POLICY IF EXISTS "users_can_insert_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes;
DROP POLICY IF EXISTS "users_can_update_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes;
DROP POLICY IF EXISTS "users_can_delete_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes;

-- RLS corregidas: verifican que la instalación pertenezca al club del usuario
CREATE POLICY "users_can_view_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes
  FOR SELECT USING (
    instalacion_campo_id IN (
      SELECT id FROM instalaciones_campos WHERE club_id IN (
        SELECT club_id FROM usuarios WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "users_can_insert_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes
  FOR INSERT WITH CHECK (
    instalacion_campo_id IN (
      SELECT id FROM instalaciones_campos WHERE club_id IN (
        SELECT club_id FROM usuarios WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "users_can_update_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes
  FOR UPDATE USING (
    instalacion_campo_id IN (
      SELECT id FROM instalaciones_campos WHERE club_id IN (
        SELECT club_id FROM usuarios WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    instalacion_campo_id IN (
      SELECT id FROM instalaciones_campos WHERE club_id IN (
        SELECT club_id FROM usuarios WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "users_can_delete_instalaciones_campos_clubes_own_club" ON instalaciones_campos_clubes
  FOR DELETE USING (
    instalacion_campo_id IN (
      SELECT id FROM instalaciones_campos WHERE club_id IN (
        SELECT club_id FROM usuarios WHERE id = auth.uid()
      )
    )
  );
