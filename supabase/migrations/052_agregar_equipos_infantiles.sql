-- Agregar categorías Infantil A, B, C, D a todos los clubes
INSERT INTO equipos (club_id, nombre, categoria, temporada)
SELECT c.id, cat.nombre, cat.categoria, '26/27'
FROM clubes c
CROSS JOIN (
  VALUES
    ('Infantil A',  'INFANTIL'),
    ('Infantil B',  'INFANTIL'),
    ('Infantil C',  'INFANTIL'),
    ('Infantil D',  'INFANTIL')
) AS cat(nombre, categoria)
WHERE NOT EXISTS (
  SELECT 1 FROM equipos e
  WHERE e.club_id = c.id AND e.nombre = cat.nombre
);
