-- =====================================================
-- GESTION CLUBES — SQL COMPLETO PARA LOCALIDADES E INSTALACIONES
-- Ejecutar este script completo en Supabase SQL Editor
-- =====================================================

-- 1. CREAR TABLA DE LOCALIDADES
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

-- 2. CREAR TABLA DE INSTALACIONES/CAMPOS
CREATE TABLE IF NOT EXISTS instalaciones_campos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
  localidad_id UUID REFERENCES localidades(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  capacidad INTEGER,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(club_id, nombre)
);

-- 3. AGREGAR COLUMNAS A PARTIDOS
ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS localidad_id UUID REFERENCES localidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instalacion_campo_id UUID REFERENCES instalaciones_campos(id) ON DELETE SET NULL;

-- 4. AGREGAR COLUMNAS A EVENTOS_CALENDARIO
ALTER TABLE eventos_calendario
  ADD COLUMN IF NOT EXISTS localidad_id UUID REFERENCES localidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instalacion_campo_id UUID REFERENCES instalaciones_campos(id) ON DELETE SET NULL;

-- 5. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_localidades_club_id ON localidades(club_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_campos_club_id ON instalaciones_campos(club_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_campos_localidad_id ON instalaciones_campos(localidad_id);
CREATE INDEX IF NOT EXISTS idx_partidos_localidad_id ON partidos(localidad_id);
CREATE INDEX IF NOT EXISTS idx_partidos_instalacion_campo_id ON partidos(instalacion_campo_id);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_localidad_id ON eventos_calendario(localidad_id);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_instalacion_campo_id ON eventos_calendario(instalacion_campo_id);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS) PARA LOCALIDADES
ALTER TABLE localidades ENABLE ROW LEVEL SECURITY;

-- Política de lectura para localidades
CREATE POLICY "users_can_view_localidades_own_club" ON localidades
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política de creación para localidades
CREATE POLICY "users_can_insert_localidades_own_club" ON localidades
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política de actualización para localidades
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

-- Política de eliminación para localidades
CREATE POLICY "users_can_delete_localidades_own_club" ON localidades
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- 7. HABILITAR ROW LEVEL SECURITY (RLS) PARA INSTALACIONES_CAMPOS
ALTER TABLE instalaciones_campos ENABLE ROW LEVEL SECURITY;

-- Política de lectura para instalaciones_campos
CREATE POLICY "users_can_view_instalaciones_campos_own_club" ON instalaciones_campos
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política de creación para instalaciones_campos
CREATE POLICY "users_can_insert_instalaciones_campos_own_club" ON instalaciones_campos
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política de actualización para instalaciones_campos
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

-- Política de eliminación para instalaciones_campos
CREATE POLICY "users_can_delete_instalaciones_campos_own_club" ON instalaciones_campos
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- =====================================================
-- DATOS DE PRUEBA (OPCIONAL)
-- Reemplaza 'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1' con el UUID de tu club
-- =====================================================

-- Insertar localidades de ejemplo
INSERT INTO localidades (club_id, nombre, provincia, pais) VALUES
('d4a2dbed-e0cb-4003-bdef-3f8e5cda57e1', 'Bilbao', 'Bizkaia', 'España'),
('d4a2dbed-e0cb-4003-bdef-3f8e5cda57e1', 'Derio', 'Bizkaia', 'España'),
('d4a2dbed-e0cb-4003-bdef-3f8e5cda57e1', 'Getxo', 'Bizkaia', 'España'),
('d4a2dbed-e0cb-4003-bdef-3f8e5cda57e1', 'Leioa', 'Bizkaia', 'España')
ON CONFLICT (club_id, nombre) DO NOTHING;

-- Insertar instalaciones/campos de ejemplo
INSERT INTO instalaciones_campos (club_id, localidad_id, nombre, tipo, capacidad, descripcion) VALUES
-- Bilbao
(
  'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1',
  (SELECT id FROM localidades WHERE nombre = 'Bilbao' AND club_id = 'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1' LIMIT 1),
  'San Mamés',
  'Natural',
  53289,
  'Estadio principal del Athletic Club'
),
-- Derio
(
  'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1',
  (SELECT id FROM localidades WHERE nombre = 'Derio' AND club_id = 'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1' LIMIT 1),
  'Lezama',
  'Artificial',
  2000,
  'Centro de entrenamiento'
),
(
  'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1',
  (SELECT id FROM localidades WHERE nombre = 'Derio' AND club_id = 'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1' LIMIT 1),
  'Lezama - Campo 2',
  'Artificial',
  1500,
  'Campo de entrenamiento secundario'
),
-- Getxo
(
  'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1',
  (SELECT id FROM localidades WHERE nombre = 'Getxo' AND club_id = 'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1' LIMIT 1),
  'Campo Municipal Getxo',
  'Natural',
  1000,
  'Campo municipal de Getxo'
),
-- Leioa
(
  'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1',
  (SELECT id FROM localidades WHERE nombre = 'Leioa' AND club_id = 'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1' LIMIT 1),
  'Universidad',
  'Natural',
  1200,
  'Campo de la UPV/EHU'
)
ON CONFLICT DO NOTHING;
