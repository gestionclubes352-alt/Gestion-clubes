-- =====================================================
-- GESTION CLUBES — Datos de prueba para Localidades e Instalaciones
-- Datos iniciales para Athletic Club (club_id = 'd4a2dbed-e0cb-4003-bdef-3f8e5cda57e1')
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
