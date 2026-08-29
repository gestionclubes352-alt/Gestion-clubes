-- Amplía la vista pública de jugadores con nombre_pila y primer_apellido,
-- para mostrar "Nombre Apellido" en vez del campo libre `nombre` en el
-- formulario público y en las vistas de Mediciones.

DROP VIEW IF EXISTS plantillas_publico;
CREATE VIEW plantillas_publico
WITH (security_invoker = false) AS
SELECT id, nombre, nombre_pila, primer_apellido, equipo_id
FROM plantillas
WHERE estado IS DISTINCT FROM 'Inactivo';

GRANT SELECT ON plantillas_publico TO anon;
