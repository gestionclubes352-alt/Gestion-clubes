-- =====================================================
-- Sustituye los nombres placeholder ("Jugador 01", "Jugador 02"...)
-- de la plantilla de Juvenil A (EF Huesca) por nombres y apellidos
-- inventados. El mapeo se hace por el propio nombre "Jugador NN",
-- no por dorsal, porque no coinciden en orden.
-- =====================================================

-- Comprobación previa: revisa qué filas se van a tocar
SELECT p.id, p.dorsal, p.nombre, e.nombre AS equipo, e.sub_equipo
FROM plantillas p
JOIN equipos e ON e.id = p.equipo_id
WHERE e.sub_equipo = 'Juvenil A'
  AND p.nombre LIKE 'Jugador %'
ORDER BY p.nombre;

-- Mapeo nombre placeholder -> nombre inventado
WITH nombres_inventados (nombre_viejo, nombre_nuevo) AS (
    VALUES
        ('Jugador 01', 'Aitor Etxebarria'),
        ('Jugador 02', 'Mikel Zubiaurre'),
        ('Jugador 03', 'Jon Iturbe'),
        ('Jugador 04', 'Unai Larrañaga'),
        ('Jugador 05', 'Ander Goikoetxea'),
        ('Jugador 06', 'Iker Mendizabal'),
        ('Jugador 07', 'Gorka Aranburu'),
        ('Jugador 08', 'Asier Barandiaran'),
        ('Jugador 09', 'Eneko Uriarte'),
        ('Jugador 10', 'Julen Azkarate'),
        ('Jugador 11', 'Beñat Arrieta'),
        ('Jugador 12', 'Markel Egurrola'),
        ('Jugador 13', 'Xabier Landaburu'),
        ('Jugador 14', 'Oier Bilbao'),
        ('Jugador 15', 'Imanol Arriaga'),
        ('Jugador 16', 'Ekaitz Muniozguren'),
        ('Jugador 17', 'Peio Gaztañaga'),
        ('Jugador 18', 'Hodei Larrinaga'),
        ('Jugador 19', 'Kepa Urrutikoetxea'),
        ('Jugador 20', 'Iñigo Salaberria'),
        ('Jugador 21', 'Ibai Zabaleta'),
        ('Jugador 22', 'Andoni Elorriaga'),
        ('Jugador 23', 'Naroa Etxaniz'),
        ('Jugador 24', 'Ander Basterretxea'),
        ('Jugador 25', 'Jokin Amuategi')
)
UPDATE plantillas p
SET nombre = ni.nombre_nuevo
FROM equipos e, nombres_inventados ni
WHERE p.equipo_id = e.id
  AND e.sub_equipo = 'Juvenil A'
  AND p.nombre = ni.nombre_viejo;
