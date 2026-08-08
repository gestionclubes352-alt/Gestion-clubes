-- Tabla de relación entre competiciones y equipos (M:M)
CREATE TABLE IF NOT EXISTS competicion_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competicion_id UUID NOT NULL REFERENCES competiciones(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Evitar duplicados: una competición no puede tener el mismo equipo dos veces
  UNIQUE(competicion_id, equipo_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_competicion_equipos_competicion_id ON competicion_equipos(competicion_id);
CREATE INDEX idx_competicion_equipos_equipo_id ON competicion_equipos(equipo_id);

-- Comentarios para documentación
COMMENT ON TABLE competicion_equipos IS 'Relación muchos-a-muchos entre competiciones y equipos que participan en ellas';
COMMENT ON COLUMN competicion_equipos.competicion_id IS 'ID de la competición';
COMMENT ON COLUMN competicion_equipos.equipo_id IS 'ID del equipo (de la tabla equipos)';
