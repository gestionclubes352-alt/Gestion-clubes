-- =====================================================
-- MIGRACIÓN: Agregar campos de partes y minutos a competiciones
-- =====================================================

ALTER TABLE competiciones
ADD COLUMN IF NOT EXISTS numero_partes INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS minutos_por_parte INT DEFAULT 45,
ADD COLUMN IF NOT EXISTS total_minutos INT DEFAULT 90;

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_competiciones_numero_partes ON competiciones(numero_partes);
