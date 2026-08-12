-- Completa las categorías que faltan (Filial, Juvenil C/D, Cadete C/D, Alevín A-D)
-- para todos los clubes ya existentes en la tabla `equipos`, como filas placeholder
-- (sin escudo/nombre en federación/enlace), igual que Cadete A/B en EF Huesca.

INSERT INTO equipos (club_id, nombre, categoria, temporada)
SELECT c.id, cat.nombre, cat.categoria, '26/27'
FROM clubes c
CROSS JOIN (
  VALUES
    ('Filial',      'SENIOR'),
    ('Juvenil C',   'JUVENIL'),
    ('Juvenil D',   'JUVENIL'),
    ('Cadete C',    'CADETE'),
    ('Cadete D',    'CADETE'),
    ('Alevín A',    'ALEVIN'),
    ('Alevín B',    'ALEVIN'),
    ('Alevín C',    'ALEVIN'),
    ('Alevín D',    'ALEVIN')
) AS cat(nombre, categoria)
WHERE NOT EXISTS (
  SELECT 1 FROM equipos e
  WHERE e.club_id = c.id AND e.nombre = cat.nombre
);
