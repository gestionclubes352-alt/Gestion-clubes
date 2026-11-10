-- =====================================================================
-- Copa - Juvenil Preferente, Jornada 8 (Juvenil C en Grupo 2, Juvenil B en Grupo 1).
-- Fuente: futbolaragon.com (CodCompeticion=23245982, CodGrupo=23245996, CodJornada=8)
--   Monzon Futbol Base-At. Mallazo vs Huesca-S.D. Escuela de Futbol (Juvenil C)
--   14-11-2026 15:30 · Monzon Isidro Calderón
-- Grupo 1 (CodGrupo=23245995): Huesca International Football Academy (Juvenil B) vs Huesca-S.D.
--   14-11-2026 19:30 · HUESCA-Universidad
-- Idempotente: no duplica si ya existe.
-- =====================================================================
DO $mig$
BEGIN
DROP TABLE IF EXISTS pg_temp._fed_p;
CREATE TEMP TABLE _fed_p (competition TEXT, fecha DATE, hora TEXT, jornada TEXT, local TEXT, visitante TEXT, opponent TEXT, equipo TEXT, estadio TEXT, score TEXT, status TEXT);
INSERT INTO _fed_p VALUES
('Copa - Juvenil Preferente Grupo 2 - Huesca','2026-11-14','15:30','J8','Monzon Futbol Base-At. Mallazo','Juvenil C','Monzon Futbol Base-At. Mallazo','Juvenil C','Monzon Isidro Calderón',NULL,'Upcoming'),
('Copa - Juvenil Preferente Grupo 1 - Huesca','2026-11-14','19:30','J8','Juvenil B','Huesca-S.D.','Huesca-S.D.','Juvenil B','HUESCA-Universidad',NULL,'Upcoming');

INSERT INTO partidos (competition, date, opponent, status, score, jornada, local_team, visitor_team, time, location)
SELECT v.competition, (v.fecha::text || ' ' || v.hora || ':00')::timestamp, v.opponent, v.status, v.score,
       v.jornada, v.local, v.visitante, v.hora, v.estadio
  FROM _fed_p v
 WHERE NOT EXISTS (SELECT 1 FROM partidos p WHERE p.competition = v.competition AND p.jornada = v.jornada
                      AND p.local_team = v.local AND p.visitor_team = v.visitante);

INSERT INTO eventos_calendario (club_id, title, type, date, time, team, location, competition, jornada, local_team, visitor_team, opponent, score, status)
SELECT 'escuela-huesca', v.equipo || ' vs ' || v.opponent, 'Partido', (v.fecha::timestamp AT TIME ZONE 'Europe/Madrid'), v.hora, v.equipo,
       v.estadio, v.competition, v.jornada, v.local, v.visitante, v.opponent, v.score, v.status
  FROM _fed_p v
 WHERE NOT EXISTS (SELECT 1 FROM eventos_calendario e WHERE e.club_id = 'escuela-huesca' AND e.type = 'Partido'
                      AND e.competition = v.competition AND e.jornada = v.jornada
                      AND e.local_team = v.local AND e.visitor_team = v.visitante);

DROP TABLE IF EXISTS pg_temp._fed_p;
END
$mig$;
