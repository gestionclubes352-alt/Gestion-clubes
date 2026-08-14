-- =====================================================
-- GESTION CLUBES — Localidades e Instalaciones/Campos
-- Separa ubicaciones y instalaciones en tablas propias
-- Usadas en partidos y sesiones de calendario
-- =====================================================

-- Crear tabla de localidades
CREATE TABLE IF NOT EXISTS localidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  provincia VARCHAR(255),
  pais VARCHAR(255) DEFAULT 'España',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(club_id, nombre)
);

-- Crear tabla de instalaciones/campos
CREATE TABLE IF NOT EXISTS instalaciones_campos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
  localidad_id UUID REFERENCES localidades(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(100), -- e.g., "Natural", "Artificial", "Indoor"
  capacidad INTEGER,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(club_id, nombre)
);

-- Agregar columnas a partidos
ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS localidad_id UUID REFERENCES localidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instalacion_campo_id UUID REFERENCES instalaciones_campos(id) ON DELETE SET NULL;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_localidades_club_id ON localidades(club_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_campos_club_id ON instalaciones_campos(club_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_campos_localidad_id ON instalaciones_campos(localidad_id);
CREATE INDEX IF NOT EXISTS idx_partidos_localidad_id ON partidos(localidad_id);
CREATE INDEX IF NOT EXISTS idx_partidos_instalacion_campo_id ON partidos(instalacion_campo_id);

-- Agregar columnas a eventos_calendario
ALTER TABLE eventos_calendario
  ADD COLUMN IF NOT EXISTS localidad_id UUID REFERENCES localidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instalacion_campo_id UUID REFERENCES instalaciones_campos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_calendario_localidad_id ON eventos_calendario(localidad_id);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_instalacion_campo_id ON eventos_calendario(instalacion_campo_id);

-- RLS para localidades
ALTER TABLE localidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_localidades_own_club" ON localidades
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_insert_localidades_own_club" ON localidades
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_localidades_own_club" ON localidades
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

CREATE POLICY "users_can_delete_localidades_own_club" ON localidades
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- RLS para instalaciones_campos
ALTER TABLE instalaciones_campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_instalaciones_campos_own_club" ON instalaciones_campos
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_insert_instalaciones_campos_own_club" ON instalaciones_campos
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_instalaciones_campos_own_club" ON instalaciones_campos
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

CREATE POLICY "users_can_delete_instalaciones_campos_own_club" ON instalaciones_campos
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );
