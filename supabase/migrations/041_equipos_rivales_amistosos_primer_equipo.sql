-- =====================================================
-- Seed: equipos rivales para los amistosos del Primer Equipo (temporada 2026/2027)
-- Da de alta en el catálogo `equipos_rivales` los rivales necesarios para
-- registrar los amistosos de pretemporada. Solo inserta si no existen ya
-- (evita duplicados en reintentos).
-- =====================================================
INSERT INTO equipos_rivales (nombre)
SELECT nombre FROM (VALUES
    ('AT Lleida'),
    ('Real Zaragoza (DHJ)'),
    ('CD Cortes'),
    ('CD Ebro'),
    ('CA Osasuna (DHJ)')
) AS nuevos(nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM equipos_rivales er WHERE er.nombre = nuevos.nombre
);
