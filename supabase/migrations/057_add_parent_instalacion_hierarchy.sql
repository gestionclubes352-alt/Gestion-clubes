-- =====================================================
-- GESTION CLUBES — Jerarquía de Instalaciones y Campos
-- Permite que instalaciones tengan campos como sub-items
-- =====================================================

-- Agregar columna parent_instalacion_id a instalaciones_campos
ALTER TABLE instalaciones_campos
  ADD COLUMN IF NOT EXISTS parent_instalacion_id UUID REFERENCES instalaciones_campos(id) ON DELETE CASCADE;

-- Crear índice para mejor rendimiento en búsquedas de campos por instalación padre
CREATE INDEX IF NOT EXISTS idx_instalaciones_campos_parent ON instalaciones_campos(parent_instalacion_id);

-- Comentario explicativo
COMMENT ON COLUMN instalaciones_campos.parent_instalacion_id IS
  'Referencia a la instalación padre. NULL si es una instalación principal. No NULL si es un campo de una instalación.';
