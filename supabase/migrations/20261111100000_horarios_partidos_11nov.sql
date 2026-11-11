DO $mig$
BEGIN
DROP TABLE IF EXISTS pg_temp._horas;
CREATE TEMP TABLE _horas (competition TEXT, jornada TEXT, local TEXT, visitante TEXT, hora TEXT, hora_antigua TEXT);
INSERT INTO _horas VALUES
('Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','J2','Alevín B','Siglo Xxi Oscense Zynk ''C''','17:30',NULL),
('Primera Juvenil Grupo 2 - Huesca Occidental','J5','Frula-A.D.','Juvenil D','16:00',NULL),
('División Honor Cadete Grupo Único','J8','Escuela Futbol Oscense-C.D. R. Blasco','Cadete A','10:45',NULL),
('División Honor Infantil','J8','Balsas Picarral-U.D.','Infantil A','15:30',NULL),
('Cadete Preferente Grupo 2 - Huesca','J4','La Litera-Escuela Dep.','Cadete C','10:00',NULL),
('División Honor Cadete Grupo Único','J24','Amistad-U.D.','Cadete A','14:15',NULL),
('División Honor Infantil','J9','Infantil A','Hernan Cortes Junquera-C.F.','17:30',NULL),
('Cadete Preferente Grupo 2 - Huesca','J18','Binefar-Futbol Base','Cadete C','11:00',NULL),
('Primera Infantil Subgrupo 1 - Huesca','J7','Infantil D','Sabiñanigo-A.D. Futbol Base','15:00',NULL),
('Primera Infantil Subgrupo 1 - Huesca','J7','Cantera Oscense','Infantil C','09:00',NULL),
('Primera Cadete Grupo 2 - Huesca Occidental','J6','Cantera Oscense','Cadete D','09:00',NULL),
('Segunda Alevín Grupo 5 - Zaragoza','J7','San Mateo-C.D.','Alevín A','12:35',NULL),
('Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','J5','Siglo Xxi Oscense Peña los 30 ''D''','Alevín B','11:15',NULL),
('Primera Juvenil Grupo 2 - Huesca Occidental','J8','Santiago Grañen-C.D.','Juvenil D','16:00',NULL),
('Primera Cadete Grupo 2 - Huesca Occidental','J7','Santiago Grañen-C.D.','Cadete D','12:00',NULL),
('Segunda Alevín Grupo 5 - Zaragoza','J8','Ranillas-At. "A"','Alevín A','14:00','13:50');

UPDATE partidos p
   SET time = h.hora,
       date = p.date::date + h.hora::time
  FROM _horas h
 WHERE p.competition = h.competition AND p.jornada = h.jornada
   AND p.local_team = h.local AND p.visitor_team = h.visitante
   AND (COALESCE(p.time, '') = '' OR p.time = h.hora_antigua);

UPDATE eventos_calendario e
   SET time = h.hora
  FROM _horas h
 WHERE e.type = 'Partido'
   AND e.competition = h.competition AND e.jornada = h.jornada
   AND e.local_team = h.local AND e.visitor_team = h.visitante
   AND (COALESCE(e.time, '') = '' OR e.time = h.hora_antigua);

DROP TABLE IF EXISTS pg_temp._horas;
END
$mig$;
