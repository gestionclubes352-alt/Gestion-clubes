-- Primer Equipo, Tercera RFEF G-17: J6 (Illueca, 10/10) y J7 (Almudevar, 17/10).
-- La federación los publica como 0-0 con alineaciones pero SIN acta cerrada (acta_closed vacío),
-- por lo que el marcador es provisional. Se muestra como la federación; corregir cuando se cierre el acta.
-- Solo toca filas sin marcador.

UPDATE eventos_calendario
   SET score = '0-0', status = 'Finished'
 WHERE club_id = 'escuela-huesca' AND type = 'Partido' AND team = 'Primer Equipo'
   AND ((jornada = 'J6' AND local_team = 'Illueca-C.F.' AND visitor_team = 'Primer Equipo')
     OR (jornada = 'J7' AND local_team = 'Almudevar A.D.' AND visitor_team = 'Primer Equipo'))
   AND (score IS NULL OR score = '');

UPDATE partidos
   SET score = '0-0', status = 'Finished'
 WHERE ((jornada = 'J6' AND local_team = 'Illueca-C.F.' AND visitor_team = 'Primer Equipo')
     OR (jornada = 'J7' AND local_team = 'Almudevar A.D.' AND visitor_team = 'Primer Equipo'))
   AND competition = 'Tercera RFEF G-17'
   AND (score IS NULL OR score = '');

SELECT jornada, local_team, visitor_team, score, status,
       acta_fed IS NOT NULL AS tiene_acta,
       jsonb_array_length(acta_fed->'homeTeam'->'starters') AS titulares_local
  FROM eventos_calendario
 WHERE club_id = 'escuela-huesca' AND type = 'Partido' AND team = 'Primer Equipo' AND jornada IN ('J6','J7');
