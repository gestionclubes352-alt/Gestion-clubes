-- Asigna el equipo interno a los amistosos que lo tenían vacío (columna "Equipo interno" = "—"):
--   AMISTOSOS PRIMER EQUIPO -> Primer Equipo
--   AMISTOSOS JUVENIL B     -> Juvenil B
-- Solo equipos internos (es_rival = false) del club Huesca-S.D. Escuela de Fútbol. Idempotente.

INSERT INTO competicion_equipos (competicion_id, equipo_id)
SELECT DISTINCT comp.id, e.id
  FROM (VALUES
          ('AMISTOSOS PRIMER EQUIPO', 'primer equipo'),
          ('AMISTOSOS JUVENIL B',     'juvenil b')
       ) AS m(competicion, equipo)
  JOIN competiciones comp ON UPPER(comp.nombre) = m.competicion
  JOIN equipos e ON LOWER(TRIM(e.nombre)) = m.equipo
                AND COALESCE(e.es_rival, false) = false
  JOIN clubes cl ON cl.id = e.club_id
                AND cl.nombre ILIKE '%huesca%' AND cl.nombre ILIKE '%escuela%'
ON CONFLICT (competicion_id, equipo_id) DO NOTHING;

SELECT c.nombre AS competicion, e.nombre AS equipo_interno
  FROM competicion_equipos ce
  JOIN competiciones c ON c.id = ce.competicion_id
  JOIN equipos e ON e.id = ce.equipo_id
 WHERE UPPER(c.nombre) IN ('AMISTOSOS PRIMER EQUIPO', 'AMISTOSOS JUVENIL B');
