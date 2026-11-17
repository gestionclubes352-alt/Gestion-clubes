-- =====================================================================
-- Actualización con la BD federativa del 17/11/2026 (ffv_statsbomb_20261117_191540.dump).
-- SOLO AÑADE LO NUEVO respecto a lo ya cargado; no borra nada ni pisa marcadores manuales.
--   1) Partidos (partidos + eventos_calendario) de los 15 equipos del club 100718:
--        * se insertan los que aún no existen (nuevas jornadas del calendario)
--        * se reprograman fecha/hora/estadio de los que no se han jugado
--        * se rellena marcador y estado de los jugados (solo filas sin marcador)
--   2) Actas federativas (acta_fed) de los partidos del 14 y 15/11/2026.
--   3) Estadísticas por jugador de esos 13 partidos (estadisticas_partido_jugador)
--      y goles recibidos. Idempotente: se puede relanzar.
-- Ejecutar en el editor SQL de Supabase (una sola sentencia DO).
-- =====================================================================
-- Columna usada en el paso 3 (la crea también 20261109120000; aquí por si no se aplicó)
ALTER TABLE estadisticas_partido_jugador
    ADD COLUMN IF NOT EXISTS goles_recibidos INTEGER NOT NULL DEFAULT 0 CHECK (goles_recibidos >= 0);

DO $mig$
BEGIN
DROP TABLE IF EXISTS pg_temp._fed_p;
CREATE TEMP TABLE _fed_p (mid INT, competition TEXT, fecha DATE, hora TEXT, jornada TEXT, local TEXT, visitante TEXT, opponent TEXT, equipo TEXT, estadio TEXT, score TEXT, status TEXT);
INSERT INTO _fed_p VALUES
(933265,'Liga Nacional Juvenil Grupo 6','2026-11-14','18:45','J10','Ebro-C.D.','Juvenil A','Ebro-C.D.','Juvenil A','Almozara (antiguo El Carmen)-C.M.F.','6-2','Finished'),
(937408,'Cadete Autonómica Grupo 1 - Norte','2026-11-14','15:00','J9','Valdefierro-C.D.','Cadete B','Valdefierro-C.D.','Cadete B','Valdefierro-C.M.F.','2-2','Finished'),
(938253,'División Honor Cadete Grupo Único','2026-11-14','14:15','J24','Amistad-U.D.','Cadete A','Amistad-U.D.','Cadete A','Juslibol San Pantaleón','2-0','Finished'),
(940367,'División Honor Infantil','2026-11-14','17:30','J9','Infantil A','Hernan Cortes Junquera-C.F.','Hernan Cortes Junquera-C.F.','Infantil A','HUESCA-Universidad','1-0','Finished'),
(943047,'Cadete Preferente Grupo 2 - Huesca','2026-11-14',NULL,'J5','Cadete C','Binefar-Futbol Base','Binefar-Futbol Base','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(943138,'Cadete Preferente Grupo 2 - Huesca','2026-11-14','11:00','J18','Binefar-Futbol Base','Cadete C','Binefar-Futbol Base','Cadete C','Binefar Nuevo Los Olmos','2-1','Finished'),
(943320,'Infantil Preferente Grupo 2 - Huesca','2026-11-14','15:30','J5','Binefar-Futbol Base','Infantil B','Binefar-Futbol Base','Infantil B','Binefar Nuevo Los Olmos','2-2','Finished'),
(944040,'Copa - Juvenil Preferente Grupo 1 - Huesca','2026-11-14','19:30','J8','Juvenil B','Huesca-S.D.','Huesca-S.D.','Juvenil B','HUESCA-Universidad','3-2','Finished'),
(944072,'Copa - Juvenil Preferente Grupo 2 - Huesca','2026-11-14','15:30','J8','Monzon Futbol Base - Automoviles Cabrero','Juvenil C','Monzon Futbol Base - Automoviles Cabrero','Juvenil C','Monzon Isidro Calderón','1-1','Finished'),
(949737,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-11-14','17:30','J7','Peñas Oscenses-C.D. Hoscafrost "A"','Juvenil D','Peñas Oscenses-C.D. Hoscafrost "A"','Juvenil D','Huesca San Jorge-2','1-2','Finished'),
(951466,'Primera Infantil Subgrupo 1 - Huesca','2026-11-14','15:00','J7','Infantil D','Sabiñanigo-A.D. Futbol Base','Sabiñanigo-A.D. Futbol Base','Infantil D','HUESCA-Universidad','3-1','Finished'),
(951467,'Primera Infantil Subgrupo 1 - Huesca','2026-11-14','09:00','J7','Cantera Oscense','Infantil C','Cantera Oscense','Infantil C','Huesca San Jorge-1','2-5','Finished'),
(952200,'Primera Cadete Grupo 2 - Huesca Occidental','2026-11-14','09:00','J6','Cantera Oscense','Cadete D','Cantera Oscense','Cadete D','Huesca San Jorge-1','0-2','Finished'),
(960049,'Segunda Alevín Grupo 5 - Zaragoza','2026-11-14','12:35','J7','San Mateo-C.D.','Alevín A','San Mateo-C.D.','Alevín A','San Mateo de Gº-Sta.Engracia','1-4','Finished'),
(935790,'Tercera RFEF G-17','2026-11-15','16:30','J11','Caspe-C.D.','Primer Equipo','Caspe-C.D.','Primer Equipo','Caspe Los Rosales','2-0','Finished'),
(970000,'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','2026-11-15','11:15','J5','Siglo Xxi Oscense Peña los 30 ''D''','Alevín B','Siglo Xxi Oscense Peña los 30 ''D''','Alevín B','HUESCA-C.Deportiva F7-1','2-7','Finished'),
(937416,'Cadete Autonómica Grupo 1 - Norte','2026-11-21',NULL,'J10','Cadete B','Amistad-U.D.','Amistad-U.D.','Cadete B','HUESCA-Universidad',NULL,'Upcoming'),
(938142,'División Honor Cadete Grupo Único','2026-11-21','17:00','J10','Stadium Casablanca-C.D.','Cadete A','Stadium Casablanca-C.D.','Cadete A','St. CASABLANCA-Gregorio Usabel',NULL,'Upcoming'),
(940376,'División Honor Infantil','2026-11-21',NULL,'J10','Santo Domingo Juventud C.F.','Infantil A','Santo Domingo Juventud C.F.','Infantil A','Joaquin GONZALEZ-1',NULL,'Upcoming'),
(943048,'Cadete Preferente Grupo 2 - Huesca','2026-11-21',NULL,'J6','Sobrarbe-Escuela Dep.','Cadete C','Sobrarbe-Escuela Dep.','Cadete C','Tierrantona El Comellón',NULL,'Upcoming'),
(943230,'Infantil Preferente Grupo 2 - Huesca','2026-11-21',NULL,'J6','Sobrarbe-Escuela Dep.','Infantil B','Sobrarbe-Escuela Dep.','Infantil B','Ainsa Municipal El Cinca',NULL,'Upcoming'),
(949742,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-11-21','15:45','J8','Santiago Grañen-C.D.','Juvenil D','Santiago Grañen-C.D.','Juvenil D','Grañen Municipal',NULL,'Upcoming'),
(951469,'Primera Infantil Subgrupo 1 - Huesca','2026-11-21',NULL,'J8','Infantil C','Sabiñanigo-A.D. Futbol Base','Sabiñanigo-A.D. Futbol Base','Infantil C','HUESCA-Universidad',NULL,'Upcoming'),
(951471,'Primera Infantil Subgrupo 1 - Huesca','2026-11-21','11:15','J8','Jacetano-C.F. Castiello de Jaca','Infantil D','Jacetano-C.F. Castiello de Jaca','Infantil D','Jaca Oroel',NULL,'Upcoming'),
(952189,'Primera Cadete Grupo 2 - Huesca Occidental','2026-11-21','12:00','J7','Santiago Grañen-C.D.','Cadete D','Santiago Grañen-C.D.','Cadete D','Grañen Municipal',NULL,'Upcoming'),
(960022,'Segunda Alevín Grupo 5 - Zaragoza','2026-11-21','13:45','J8','Ranillas-At. "A"','Alevín A','Ranillas-At. "A"','Alevín A','Nuevo Ranillas-C.M.F.',NULL,'Upcoming'),
(970004,'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','2026-11-21',NULL,'J6','Alevín B','Peñas Oscenses-C.D. Ecomputer/La10ma','Peñas Oscenses-C.D. Ecomputer/La10ma','Alevín B','HUESCA-Universidad F7-1 (medio campo)',NULL,'Upcoming'),
(933274,'Liga Nacional Juvenil Grupo 6','2026-11-22','16:00','J11','Juvenil A','Calamocha-C.F.','Calamocha-C.F.','Juvenil A','HUESCA-Universidad',NULL,'Upcoming'),
(935799,'Tercera RFEF G-17','2026-11-22','12:00','J12','Primer Equipo','Robres-C.D.','Robres-C.D.','Primer Equipo','Huesca San Jorge-1',NULL,'Upcoming'),
(937423,'Cadete Autonómica Grupo 1 - Norte','2026-11-28',NULL,'J11','Borja-E.F.B.','Cadete B','Borja-E.F.B.','Cadete B','Borja Manuel Meler',NULL,'Upcoming'),
(938150,'División Honor Cadete Grupo Único','2026-11-28',NULL,'J11','Real Zaragoza S.A.D.','Cadete A','Real Zaragoza S.A.D.','Cadete A','Ciudad Deportiva R.Z. - 1',NULL,'Upcoming'),
(940384,'División Honor Infantil','2026-11-28',NULL,'J11','Racing Club Zaragoza','Infantil A','Racing Club Zaragoza','Infantil A','Parque Deportivo EBRO-1',NULL,'Upcoming'),
(943061,'Cadete Preferente Grupo 2 - Huesca','2026-11-28',NULL,'J7','Cadete C','Jacetano-C.F. Peña Enta Deban','Jacetano-C.F. Peña Enta Deban','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(943243,'Infantil Preferente Grupo 2 - Huesca','2026-11-28',NULL,'J7','Infantil B','Jacetano-C.F. Frankfurter','Jacetano-C.F. Frankfurter','Infantil B','HUESCA-Universidad',NULL,'Upcoming'),
(949747,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-11-28',NULL,'J9','Juvenil D','Escuela Futbol Oscense-C.D. La tabla nueva Modimela "B"','Escuela Futbol Oscense-C.D. La tabla nueva Modimela "B"','Juvenil D','HUESCA-Universidad',NULL,'Upcoming'),
(951472,'Primera Infantil Subgrupo 1 - Huesca','2026-11-28',NULL,'J9','Infantil C','Infantil D','Ipc la Escuela "B"','Infantil C','HUESCA-Universidad',NULL,'Upcoming'),
(952207,'Primera Cadete Grupo 2 - Huesca Occidental','2026-11-28',NULL,'J8','Cadete D','Escuela Futbol Oscense-C.D. R. Blasco','Escuela Futbol Oscense-C.D. R. Blasco','Cadete D','HUESCA-Universidad',NULL,'Upcoming'),
(960027,'Segunda Alevín Grupo 5 - Zaragoza','2026-11-28',NULL,'J9','Alevín A','Amistad-U.D. "C"','Amistad-U.D. "C"','Alevín A','HUESCA-Universidad',NULL,'Upcoming'),
(970007,'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','2026-11-28','10:00','J7','Sabiñanigo-A.D. Futbol Base ''C''','Alevín B','Sabiñanigo-A.D. Futbol Base ''C''','Alevín B','SABIÑANIGO-Joaquin Ascaso F7-2 (medio campo)',NULL,'Upcoming'),
(933284,'Liga Nacional Juvenil Grupo 6','2026-11-29',NULL,'J12','Montecarlo-U.D.','Juvenil A','Montecarlo-U.D.','Juvenil A','José Luis Violeta',NULL,'Upcoming'),
(935807,'Tercera RFEF G-17','2026-11-29',NULL,'J13','Fraga-U.D.','Primer Equipo','Fraga-U.D.','Primer Equipo','Fraga La Estacada',NULL,'Upcoming'),
(938158,'División Honor Cadete Grupo Único','2026-12-05',NULL,'J12','Cadete A','San Agustin-C.D.','San Agustin-C.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940392,'División Honor Infantil','2026-12-05',NULL,'J12','Infantil A','Fraga-Fútbol Base','Fraga-Fútbol Base','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943062,'Cadete Preferente Grupo 2 - Huesca','2026-12-05',NULL,'J8','Peñas Oscenses-C.D. Climetel','Cadete C','Peñas Oscenses-C.D. Climetel','Cadete C','Huesca San Jorge-1',NULL,'Upcoming'),
(933293,'Liga Nacional Juvenil Grupo 6','2026-12-06','16:00','J13','Juvenil A','Balsas Picarral-U.D.','Balsas Picarral-U.D.','Juvenil A','HUESCA-Universidad',NULL,'Upcoming'),
(938165,'División Honor Cadete Grupo Único','2026-12-12',NULL,'J13','Montecarlo-U.D.','Cadete A','Montecarlo-U.D.','Cadete A','José Luis Violeta',NULL,'Upcoming'),
(940399,'División Honor Infantil','2026-12-12',NULL,'J13','Oliver-C.D.','Infantil A','Oliver-C.D.','Infantil A','Municipal la Camisera',NULL,'Upcoming'),
(943075,'Cadete Preferente Grupo 2 - Huesca','2026-12-12',NULL,'J9','Cadete C','Futbol Base Peñas Oscenses Inmobiliaria Buil','Futbol Base Peñas Oscenses Inmobiliaria Buil','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(943930,'Juvenil Preferente Grupo 2 - Huesca','2026-12-12',NULL,'J1','Juvenil C','Sobrarbe-Escuela Dep.','Sobrarbe-Escuela Dep.','Juvenil C','HUESCA-Universidad',NULL,'Upcoming'),
(943931,'Juvenil Preferente Grupo 2 - Huesca','2026-12-12',NULL,'J1','Monzon Futbol Base - Automoviles Cabrero','Juvenil B','Monzon Futbol Base - Automoviles Cabrero','Juvenil B','Monzon Isidro Calderón',NULL,'Upcoming'),
(933303,'Liga Nacional Juvenil Grupo 6','2026-12-13',NULL,'J14','Oliver-C.D.','Juvenil A','Oliver-C.D.','Juvenil A','Municipal la Camisera',NULL,'Upcoming'),
(938173,'División Honor Cadete Grupo Único','2026-12-19',NULL,'J14','Cadete A','San Gregorio Arrabal-C.D.','San Gregorio Arrabal-C.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940407,'División Honor Infantil','2026-12-19',NULL,'J14','Infantil A','Atletico Teruel C.F.','Atletico Teruel C.F.','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943076,'Cadete Preferente Grupo 2 - Huesca','2026-12-19',NULL,'J10','Cantera Oscense','Cadete C','Cantera Oscense','Cadete C','Huesca San Jorge-1',NULL,'Upcoming'),
(943936,'Juvenil Preferente Grupo 2 - Huesca','2026-12-19',NULL,'J2','Juvenil B','Juvenil C','Huesca-S.D. Escuela de Futbol','Juvenil B','HUESCA-Universidad',NULL,'Upcoming'),
(938180,'División Honor Cadete Grupo Único','2027-01-09',NULL,'J15','Balsas Picarral-U.D.','Cadete A','Balsas Picarral-U.D.','Cadete A','Picarral-C.M.F.',NULL,'Upcoming'),
(940414,'División Honor Infantil','2027-01-09',NULL,'J15','Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina','Infantil A','Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina','Infantil A','Huesca San Jorge-1',NULL,'Upcoming'),
(943089,'Cadete Preferente Grupo 2 - Huesca','2027-01-09',NULL,'J11','Cadete C','Escuela Futbol Oscense-C.D. Apartamentos Rio Gallego','Escuela Futbol Oscense-C.D. Apartamentos Rio Gallego','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(938185,'División Honor Cadete Grupo Único','2027-01-16',NULL,'J16','Hernan Cortes Junquera-C.F.','Cadete A','Hernan Cortes Junquera-C.F.','Cadete A','Garcia Traid',NULL,'Upcoming'),
(940419,'División Honor Infantil','2027-01-16',NULL,'J16','Amistad-U.D.','Infantil A','Amistad-U.D.','Infantil A','Juslibol San Pantaleón',NULL,'Upcoming'),
(943090,'Cadete Preferente Grupo 2 - Huesca','2027-01-16',NULL,'J12','Cadete C','Monzon Futbol Base-At. Sgr Kafe Var One Friomonzón','Monzon Futbol Base-At. Sgr Kafe Var One Friomonzón','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(938194,'División Honor Cadete Grupo Único','2027-01-23',NULL,'J17','Cadete A','Santo Domingo Juventud C.F.','Santo Domingo Juventud C.F.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940428,'División Honor Infantil','2027-01-23',NULL,'J17','Infantil A','Stadium Casablanca-C.D. Patatas Gómez','Stadium Casablanca-C.D. Patatas Gómez','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943103,'Cadete Preferente Grupo 2 - Huesca','2027-01-23',NULL,'J13','Barbastro-U.D.','Cadete C','Barbastro-U.D.','Cadete C','BARBASTRO-Munic. de los Deportes',NULL,'Upcoming'),
(943949,'Juvenil Preferente Grupo 2 - Huesca','2027-01-23',NULL,'J5','Sobrarbe-Escuela Dep.','Juvenil B','Sobrarbe-Escuela Dep.','Juvenil B','Boltaña Villaboya',NULL,'Upcoming'),
(943952,'Juvenil Preferente Grupo 2 - Huesca','2027-01-23',NULL,'J5','Juvenil C','Huesca-S.D.','Huesca-S.D.','Juvenil C','HUESCA-Universidad',NULL,'Upcoming'),
(960021,'Segunda Alevín Grupo 5 - Zaragoza','2027-01-23',NULL,'J7','Alevín A','San Mateo-C.D.','San Mateo-C.D.','Alevín A','HUESCA-Universidad',NULL,'Upcoming'),
(943110,'Cadete Preferente Grupo 2 - Huesca','2027-01-30',NULL,'J14','Almudevar A.D.','Cadete C','Almudevar A.D.','Cadete C','Almudevar Virgen de la Corona',NULL,'Upcoming'),
(943954,'Juvenil Preferente Grupo 2 - Huesca','2027-01-30',NULL,'J6','Juvenil B','Almudevar A.D.','Almudevar A.D.','Juvenil B','HUESCA-Universidad',NULL,'Upcoming'),
(943958,'Juvenil Preferente Grupo 2 - Huesca','2027-01-30',NULL,'J6','Monzon Futbol Base - Automoviles Cabrero','Juvenil C','Monzon Futbol Base - Automoviles Cabrero','Juvenil C','Monzon Isidro Calderón',NULL,'Upcoming'),
(938202,'División Honor Cadete Grupo Único','2027-02-06',NULL,'J18','Huesca-S.D.','Cadete A','Huesca-S.D.','Cadete A','Huesca Base Aragonesa de Fútbol',NULL,'Upcoming'),
(940436,'División Honor Infantil','2027-02-06',NULL,'J18','Cuarte-C.D.','Infantil A','Cuarte-C.D.','Infantil A','Cuarte de HUERVA-Estadio Juan Guerrero "El Lobo"',NULL,'Upcoming'),
(943111,'Cadete Preferente Grupo 2 - Huesca','2027-02-06',NULL,'J15','Cadete C','Sabiñanigo-A.D. Futbol Base','Sabiñanigo-A.D. Futbol Base','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(938211,'División Honor Cadete Grupo Único','2027-02-13',NULL,'J19','Cadete A','Binefar-Futbol Base','Binefar-Futbol Base','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940445,'División Honor Infantil','2027-02-13',NULL,'J19','Infantil A','Huesca-S.D.','Huesca-S.D.','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943124,'Cadete Preferente Grupo 2 - Huesca','2027-02-13',NULL,'J16','Peñas Sariñena-C.D.','Cadete C','Peñas Sariñena-C.D.','Cadete C','SARIÑENA-El Carmen',NULL,'Upcoming'),
(938219,'División Honor Cadete Grupo Único','2027-02-20',NULL,'J20','Racing Club Zaragoza','Cadete A','Racing Club Zaragoza','Cadete A','Parque Deportivo EBRO-1',NULL,'Upcoming'),
(940453,'División Honor Infantil','2027-02-20',NULL,'J20','Real Zaragoza S.A.D.','Infantil A','Real Zaragoza S.A.D.','Infantil A','Ciudad Deportiva R.Z. - 1',NULL,'Upcoming'),
(938228,'División Honor Cadete Grupo Único','2027-02-27',NULL,'J21','Cadete A','Oliver-C.D.','Oliver-C.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940462,'División Honor Infantil','2027-02-27',NULL,'J21','Infantil A','Montecarlo-U.D.','Montecarlo-U.D.','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943125,'Cadete Preferente Grupo 2 - Huesca','2027-02-27',NULL,'J17','Cadete C','La Litera-Escuela Dep.','La Litera-Escuela Dep.','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(943229,'Infantil Preferente Grupo 2 - Huesca','2027-03-06',NULL,'J5','Infantil B','Binefar-Futbol Base','Binefar-Futbol Base','Infantil B','HUESCA-Universidad',NULL,'Upcoming'),
(938236,'División Honor Cadete Grupo Único','2027-03-13',NULL,'J22','Teruel-C.D.','Cadete A','Teruel-C.D.','Cadete A','TERUEL-Luis Milla',NULL,'Upcoming'),
(940470,'División Honor Infantil','2027-03-13',NULL,'J22','Teruel-C.D.','Infantil A','Teruel-C.D.','Infantil A','TERUEL-Luis Milla',NULL,'Upcoming'),
(943139,'Cadete Preferente Grupo 2 - Huesca','2027-03-13',NULL,'J19','Cadete C','Sobrarbe-Escuela Dep.','Sobrarbe-Escuela Dep.','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(938245,'División Honor Cadete Grupo Único','2027-03-20',NULL,'J23','Cadete A','Escuela Futbol Oscense-C.D. R. Blasco','Escuela Futbol Oscense-C.D. R. Blasco','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940479,'División Honor Infantil','2027-03-20',NULL,'J23','Infantil A','Balsas Picarral-U.D.','Balsas Picarral-U.D.','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943152,'Cadete Preferente Grupo 2 - Huesca','2027-03-20',NULL,'J20','Jacetano-C.F. Peña Enta Deban','Cadete C','Jacetano-C.F. Peña Enta Deban','Cadete C','Jaca Oroel',NULL,'Upcoming'),
(938133,'División Honor Cadete Grupo Único','2027-04-03',NULL,'J9','Cadete A','Amistad-U.D.','Amistad-U.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940487,'División Honor Infantil','2027-04-03',NULL,'J24','Hernan Cortes Junquera-C.F.','Infantil A','Hernan Cortes Junquera-C.F.','Infantil A','Garcia Traid',NULL,'Upcoming'),
(943153,'Cadete Preferente Grupo 2 - Huesca','2027-04-03',NULL,'J21','Cadete C','Peñas Oscenses-C.D. Climetel','Peñas Oscenses-C.D. Climetel','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(938262,'División Honor Cadete Grupo Único','2027-04-10',NULL,'J25','Cadete A','Stadium Casablanca-C.D.','Stadium Casablanca-C.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940496,'División Honor Infantil','2027-04-10',NULL,'J25','Infantil A','Santo Domingo Juventud C.F.','Santo Domingo Juventud C.F.','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943166,'Cadete Preferente Grupo 2 - Huesca','2027-04-10',NULL,'J22','Futbol Base Peñas Oscenses Inmobiliaria Buil','Cadete C','Futbol Base Peñas Oscenses Inmobiliaria Buil','Cadete C','Huesca San Jorge-1',NULL,'Upcoming'),
(938270,'División Honor Cadete Grupo Único','2027-04-17',NULL,'J26','Cadete A','Real Zaragoza S.A.D.','Real Zaragoza S.A.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940504,'División Honor Infantil','2027-04-17',NULL,'J26','Infantil A','Racing Club Zaragoza','Racing Club Zaragoza','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943167,'Cadete Preferente Grupo 2 - Huesca','2027-04-17',NULL,'J23','Cadete C','Cantera Oscense','Cantera Oscense','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(938278,'División Honor Cadete Grupo Único','2027-04-24',NULL,'J27','San Agustin-C.D.','Cadete A','San Agustin-C.D.','Cadete A','San Agustin Carlos Sebastián-COL.',NULL,'Upcoming'),
(940512,'División Honor Infantil','2027-04-24',NULL,'J27','Fraga-Fútbol Base','Infantil A','Fraga-Fútbol Base','Infantil A','Fraga La Estacada',NULL,'Upcoming'),
(943180,'Cadete Preferente Grupo 2 - Huesca','2027-04-24',NULL,'J24','Escuela Futbol Oscense-C.D. Apartamentos Rio Gallego','Cadete C','Escuela Futbol Oscense-C.D. Apartamentos Rio Gallego','Cadete C','Huesca San Jorge-1',NULL,'Upcoming'),
(938285,'División Honor Cadete Grupo Único','2027-05-01',NULL,'J28','Cadete A','Montecarlo-U.D.','Montecarlo-U.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940519,'División Honor Infantil','2027-05-01',NULL,'J28','Infantil A','Oliver-C.D.','Oliver-C.D.','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(938293,'División Honor Cadete Grupo Único','2027-05-08',NULL,'J29','San Gregorio Arrabal-C.D.','Cadete A','San Gregorio Arrabal-C.D.','Cadete A','La Azucarera-C.M.F.',NULL,'Upcoming'),
(940527,'División Honor Infantil','2027-05-08',NULL,'J29','Atletico Teruel C.F.','Infantil A','Atletico Teruel C.F.','Infantil A','TERUEL-Antiguo federativo',NULL,'Upcoming'),
(943181,'Cadete Preferente Grupo 2 - Huesca','2027-05-08',NULL,'J25','Monzon Futbol Base-At. Sgr Kafe Var One Friomonzón','Cadete C','Monzon Futbol Base-At. Sgr Kafe Var One Friomonzón','Cadete C','Monzon Antonio Alcubierre',NULL,'Upcoming'),
(938300,'División Honor Cadete Grupo Único','2027-05-15',NULL,'J30','Cadete A','Balsas Picarral-U.D.','Balsas Picarral-U.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940534,'División Honor Infantil','2027-05-15',NULL,'J30','Infantil A','Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina','Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943194,'Cadete Preferente Grupo 2 - Huesca','2027-05-15',NULL,'J26','Cadete C','Barbastro-U.D.','Barbastro-U.D.','Cadete C','HUESCA-Universidad',NULL,'Upcoming');

-- 1a) Reprogramar (fecha/hora/estadio) los partidos aún no jugados
UPDATE partidos p
   SET date = (v.fecha::text || ' ' || COALESCE(v.hora, '00:00') || ':00')::timestamp,
       time = COALESCE(v.hora, p.time),
       location = COALESCE(NULLIF(v.estadio, ''), p.location)
  FROM _fed_p v
 WHERE p.competition = v.competition AND p.jornada = v.jornada
   AND p.local_team = v.local AND p.visitor_team = v.visitante
   AND p.status IS DISTINCT FROM 'Finished'
   AND (p.date::date IS DISTINCT FROM v.fecha OR p.time IS DISTINCT FROM COALESCE(v.hora, p.time));

UPDATE eventos_calendario e
   SET date = (v.fecha::timestamp AT TIME ZONE 'Europe/Madrid'),
       time = COALESCE(v.hora, e.time),
       location = COALESCE(NULLIF(v.estadio, ''), e.location)
  FROM _fed_p v
 WHERE e.club_id = 'escuela-huesca' AND e.type = 'Partido'
   AND e.competition = v.competition AND e.jornada = v.jornada
   AND e.local_team = v.local AND e.visitor_team = v.visitante
   AND e.status IS DISTINCT FROM 'Finished'
   AND ((e.date AT TIME ZONE 'Europe/Madrid')::date IS DISTINCT FROM v.fecha OR e.time IS DISTINCT FROM COALESCE(v.hora, e.time));

-- 1b) Insertar los partidos que faltan (nuevas jornadas del calendario)
INSERT INTO partidos (competition, date, opponent, status, score, jornada, local_team, visitor_team, time, location)
SELECT v.competition, (v.fecha::text || ' ' || COALESCE(v.hora, '00:00') || ':00')::timestamp, v.opponent, v.status, v.score,
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

-- 1c) Marcador y estado de los jugados (solo filas sin marcador)
UPDATE partidos p SET score = v.score, status = 'Finished'
  FROM _fed_p v
 WHERE v.score IS NOT NULL AND (p.score IS NULL OR p.score = '')
   AND p.competition = v.competition AND p.jornada = v.jornada AND p.local_team = v.local AND p.visitor_team = v.visitante;

UPDATE eventos_calendario e SET score = v.score, status = 'Finished'
  FROM _fed_p v
 WHERE v.score IS NOT NULL AND (e.score IS NULL OR e.score = '')
   AND e.club_id = 'escuela-huesca' AND e.type = 'Partido'
   AND e.competition = v.competition AND e.jornada = v.jornada AND e.local_team = v.local AND e.visitor_team = v.visitante;

DROP TABLE IF EXISTS pg_temp._fed_p;

-- 2) Actas de los partidos del 14 y 15/11/2026
DROP TABLE IF EXISTS pg_temp._actas_fed;
CREATE TEMP TABLE _actas_fed (fecha DATE, jornada TEXT, local TEXT, visitante TEXT, mid INTEGER, acta JSONB);
INSERT INTO _actas_fed VALUES
('2026-11-14','J10','Ebro-C.D.','Juvenil A',933265,'{"codActa": "933265", "time": "18:45", "stadium": "Almozara (antiguo El Carmen)-C.M.F.", "city": "Zaragoza", "homeTeam": {"name": "Ebro-C.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000169078_CD_EBRO.jpg?nova=1", "coach": "No presenta", "starters": [{"name": "Soguero Ibarra, Gabriel", "dorsal": 1}, {"name": "Sillah Krubally, Lakamin", "dorsal": 3}, {"name": "Cabero Cebollada, Alejandro", "dorsal": 5}, {"name": "Vallano Rojas, Javier", "dorsal": 7}, {"name": "Abad Aguilon, Adrian", "dorsal": 8}, {"name": "Domínguez Cantín, Adrián", "dorsal": 9}, {"name": "Cortes Clavero, Leo", "dorsal": 14}, {"name": "Yahaya, Abba Mohammed", "dorsal": 17}, {"name": "Borao Perez, Guillermo", "dorsal": 18}, {"name": "Diop, Ndakhte", "dorsal": 20}, {"name": "Ortiz Gomez, Cristian", "dorsal": 25}], "substitutes": [{"name": "Villacampa Beired, Iker", "dorsal": 4}, {"name": "Rodrigo Mateo, Raul", "dorsal": 6}, {"name": "Sesma Berges, David", "dorsal": 10}, {"name": "Ruiz Bielsa, Ignacio", "dorsal": 11}, {"name": "Solanilla Suelves, Mario", "dorsal": 13}, {"name": "Martin Perez, Dennis", "dorsal": 21}, {"name": "Casas Cardiel, Sergio", "dorsal": 27}], "substitutions": [{"minute": "46", "playerOut": "Yahaya, Abba Mohammed", "playerIn": "Rodrigo Mateo, Raul"}, {"minute": "46", "playerOut": "Abad Aguilon, Adrian", "playerIn": "Sesma Berges, David"}, {"minute": "46", "playerOut": "Cortes Clavero, Leo", "playerIn": "Villacampa Beired, Iker"}, {"minute": "65", "playerOut": "Ortiz Gomez, Cristian", "playerIn": "Ruiz Bielsa, Ignacio"}, {"minute": "69", "playerOut": "Borao Perez, Guillermo", "playerIn": "Martin Perez, Dennis"}], "cards": [{"minute": "6", "player": "Cortes Clavero, Leo", "type": "yellow"}, {"minute": "32", "player": "Vallano Rojas, Javier", "type": "yellow"}, {"minute": "37", "player": "Diop, Ndakhte", "type": "yellow"}, {"minute": "89", "player": "Sesma Berges, David", "type": "yellow"}]}, "awayTeam": {"name": "Juvenil A", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Portoles Ariño, Alberto", "starters": [{"name": "Junquera Franco, Sergio", "dorsal": 1}, {"name": "Navallas Orrit, Lucas", "dorsal": 3}, {"name": "Lamarca Jauregui, Ruben", "dorsal": 5}, {"name": "Nestor Vicente Vicente", "dorsal": 6}, {"name": "Najdi, Mohamad H", "dorsal": 7}, {"name": "Reina, Stevan Yolexander", "dorsal": 8}, {"name": "Villabona Negrete, David", "dorsal": 10}, {"name": "Casals Almacellas, Ricard", "dorsal": 11}, {"name": "Ingalaturre Cano, Javier", "dorsal": 17}, {"name": "Mur Marin, Bruno", "dorsal": 19}, {"name": "Junquera Franco, Alejandro Aladino", "dorsal": 21}], "substitutes": [{"name": "Sopena Garrapiz, Miguel", "dorsal": 4}, {"name": "Eddafiri Hajji, Eshak", "dorsal": 12}, {"name": "Casado Perez, Guillermo", "dorsal": 13}, {"name": "Tshiteya, Christian Rene", "dorsal": 18}, {"name": "Casanova Laso, Alvaro", "dorsal": 20}, {"name": "Martinez, Jayden Nehemiah", "dorsal": 23}, {"name": "El Yagoubi Bellahbib, Housam", "dorsal": 25}], "substitutions": [{"minute": "72", "playerOut": "Mur Marin, Bruno", "playerIn": "Sopena Garrapiz, Miguel"}, {"minute": "72", "playerOut": "Casals Almacellas, Ricard", "playerIn": "Tshiteya, Christian Rene"}, {"minute": "72", "playerOut": "Navallas Orrit, Lucas", "playerIn": "Casanova Laso, Alvaro"}, {"minute": "83", "playerOut": "Junquera Franco, Alejandro Aladino", "playerIn": "Eddafiri Hajji, Eshak"}, {"minute": "83", "playerOut": "Lamarca Jauregui, Ruben", "playerIn": "Martinez, Jayden Nehemiah"}], "cards": [{"minute": "70", "player": "Najdi, Mohamad H", "type": "yellow"}, {"minute": "74", "player": "Ingalaturre Cano, Javier", "type": "yellow"}, {"minute": "86", "player": "Tshiteya, Christian Rene", "type": "yellow"}]}, "score": "6-2", "homeScore": 6, "awayScore": 2, "goals": [{"minute": "22", "player": "Borao Perez, Guillermo", "homeScore": 1, "awayScore": 0}, {"minute": "24", "player": "Domínguez Cantín, Adrián", "homeScore": 2, "awayScore": 0}, {"minute": "38", "player": "Najdi, Mohamad H", "homeScore": 2, "awayScore": 1}, {"minute": "56", "player": "Diop, Ndakhte", "homeScore": 3, "awayScore": 1}, {"minute": "62", "player": "Mur Marin, Bruno", "homeScore": 3, "awayScore": 2}, {"minute": "68", "player": "Diop, Ndakhte", "homeScore": 4, "awayScore": 2}, {"minute": "84", "player": "Sesma Berges, David", "homeScore": 5, "awayScore": 2}, {"minute": "89", "player": "Domínguez Cantín, Adrián", "homeScore": 6, "awayScore": 2}], "referees": ["Baiges Dones, Daniel David", "Jari Maleki, Zakaria", "Mbarki Bouhafa, Adnan"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J9','Valdefierro-C.D.','Cadete B',937408,'{"codActa": "937408", "time": "15:00", "stadium": "Valdefierro-C.M.F.", "city": "Zaragoza", "homeTeam": {"name": "Valdefierro-C.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000478076_Logo_Valdefierro_Rebranding_vectorizado_25_26.png?nova=1", "coach": "Garcia Pescador, Miguel", "starters": [{"name": "Lorente Campillo, Diego", "dorsal": 3}, {"name": "Barrios Ibañez, Alvaro", "dorsal": 4}, {"name": "Sierra Pascual, Pablo", "dorsal": 5}, {"name": "Ibañez Ahmad, David", "dorsal": 6}, {"name": "Peña Perez, Unai", "dorsal": 10}, {"name": "Serra Zapata, Ian", "dorsal": 14}, {"name": "Serrate Berges, Julen", "dorsal": 17}, {"name": "Sebastián Liarte, Gabriel", "dorsal": 19}, {"name": "Roy Vicente, Bruno", "dorsal": 22}, {"name": "Ojeda Lucea, Saul", "dorsal": 23}, {"name": "Wiencis Wiencis, Kacper Bartlomiej", "dorsal": 25}], "substitutes": [{"name": "Aznar Delgado, Diego", "dorsal": 7}, {"name": "Barcea, Lucian Florin", "dorsal": 9}, {"name": "Villarroya Granada, Enrique", "dorsal": 20}, {"name": "Garreta Sancho, Javier", "dorsal": 84}], "substitutions": [{"minute": "59", "playerOut": "Lorente Campillo, Diego", "playerIn": "Villarroya Granada, Enrique"}, {"minute": "66", "playerOut": "Barrios Ibañez, Alvaro", "playerIn": "Aznar Delgado, Diego"}, {"minute": "71", "playerOut": "Serrate Berges, Julen", "playerIn": "Barcea, Lucian Florin"}], "cards": [{"minute": "22", "player": "Sierra Pascual, Pablo", "type": "yellow"}, {"minute": "33", "player": "Serrate Berges, Julen", "type": "yellow"}, {"minute": "67", "player": "Sebastián Liarte, Gabriel", "type": "yellow"}, {"minute": "79", "player": "Peña Perez, Unai", "type": "yellow"}, {"minute": "80", "player": "Roy Vicente, Bruno", "type": "yellow"}]}, "awayTeam": {"name": "Cadete B", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Plumed Sancho, Francisco", "starters": [{"name": "Ehara, Haruto", "dorsal": 2}, {"name": "Kostiuchik, Artur", "dorsal": 3}, {"name": "Pisa Palacin, Eric", "dorsal": 4}, {"name": "Palomeque Samperiz, Simon", "dorsal": 5}, {"name": "Lapshin, Luka", "dorsal": 6}, {"name": "Khouta Nihah, Rayan", "dorsal": 7}, {"name": "Torcal Encontra, Daniel", "dorsal": 9}, {"name": "Mellado Mingarro, Alejo", "dorsal": 10}, {"name": "Casas da Silva, Gabriel", "dorsal": 11}, {"name": "Addo, Desmond Donald", "dorsal": 13}, {"name": "Saldivar Lagraña, Jose Angel", "dorsal": 14}], "substitutes": [{"name": "Laplaza Arnal, Angel", "dorsal": 1}, {"name": "Huerva Loriente, Iván", "dorsal": 8}, {"name": "Mallén Cruz, Marco", "dorsal": 15}, {"name": "Ardanuy Ramon, Hugo", "dorsal": 18}, {"name": "Boonparsert, Phakin Chalermakas", "dorsal": 19}, {"name": "Maestre Sanchez, Manuel", "dorsal": 20}, {"name": "Diallo Diallo, Ibrahima Tanou", "dorsal": 22}], "substitutions": [{"minute": "65", "playerOut": "Khouta Nihah, Rayan", "playerIn": "Diallo Diallo, Ibrahima Tanou"}, {"minute": "69", "playerOut": "Saldivar Lagraña, Jose Angel", "playerIn": "Huerva Loriente, Iván"}, {"minute": "77", "playerOut": "Pisa Palacin, Eric", "playerIn": "Boonparsert, Phakin Chalermakas"}, {"minute": "77", "playerOut": "Mellado Mingarro, Alejo", "playerIn": "Mallén Cruz, Marco"}], "cards": [{"minute": "56", "player": "Saldivar Lagraña, Jose Angel", "type": "yellow"}, {"minute": "77", "player": "Lapshin, Luka", "type": "yellow"}, {"minute": "79", "player": "Casas da Silva, Gabriel", "type": "yellow"}]}, "score": "2-2", "homeScore": 2, "awayScore": 2, "goals": [{"minute": "29", "player": "Sebastián Liarte, Gabriel", "homeScore": 1, "awayScore": 0}, {"minute": "42", "player": "Mellado Mingarro, Alejo", "homeScore": 1, "awayScore": 1}, {"minute": "62", "player": "Sebastián Liarte, Gabriel", "homeScore": 2, "awayScore": 1}, {"minute": "80", "player": "Palomeque Samperiz, Simon", "homeScore": 2, "awayScore": 2}], "referees": ["Bescos Dominguez, Raul"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J24','Amistad-U.D.','Cadete A',938253,'{"codActa": "938253", "time": "14:15", "stadium": "Juslibol San Pantaleón", "city": "Juslibol", "homeTeam": {"name": "Amistad-U.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Equipos/00100_0000051358_amistad logo.jpg?nova=1", "coach": "Lipe Salvador, Ignacio Luis", "starters": [{"name": "Egea Brezoi, Dario", "dorsal": 3}, {"name": "Nebra Trullen, Mateo", "dorsal": 4}, {"name": "Sabau, Darius Ioan", "dorsal": 6}, {"name": "Vicuña Borao, Jorge", "dorsal": 8}, {"name": "Gómez Cañete, Martín", "dorsal": 9}, {"name": "Gascon Vera, Guillem", "dorsal": 10}, {"name": "Hernandez Ferrandez, Beltran", "dorsal": 13}, {"name": "Baciu, Flavius Stefan Daniel", "dorsal": 15}, {"name": "Gracia Marin, Javier", "dorsal": 19}, {"name": "Lopez Gracia, Alejandro", "dorsal": 20}, {"name": "Gonzalez Villanova, Mario", "dorsal": 24}], "substitutes": [{"name": "Graciada Lapuente, Alejandro", "dorsal": 5}, {"name": "Monge Bruna, Nicolas", "dorsal": 7}, {"name": "Lara Sanchez, Samuel", "dorsal": 11}, {"name": "Martinez Cruz, Alejandro", "dorsal": 14}, {"name": "Guimera Moreno, Adria", "dorsal": 17}, {"name": "Petriz Gruita, Eric Martin", "dorsal": 31}], "substitutions": [{"minute": "41", "playerOut": "Gascon Vera, Guillem", "playerIn": "Martinez Cruz, Alejandro"}, {"minute": "65", "playerOut": "Lopez Gracia, Alejandro", "playerIn": "Guimera Moreno, Adria"}, {"minute": "70", "playerOut": "Gómez Cañete, Martín", "playerIn": "Graciada Lapuente, Alejandro"}, {"minute": "79", "playerOut": "Sabau, Darius Ioan", "playerIn": "Lara Sanchez, Samuel"}, {"minute": "79", "playerOut": "Nebra Trullen, Mateo", "playerIn": "Monge Bruna, Nicolas"}], "cards": [{"minute": "25", "player": "Gascon Vera, Guillem", "type": "yellow"}, {"minute": "39", "player": "Gracia Marin, Javier", "type": "yellow"}, {"minute": "65", "player": "Egea Brezoi, Dario", "type": "yellow"}]}, "awayTeam": {"name": "Cadete A", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Alejandre Clemente, Ruben", "starters": [{"name": "Espurz Redon, Adrian", "dorsal": 1}, {"name": "Bardaji Bretcanu, Flavio", "dorsal": 4}, {"name": "Viñuales Rodriguez, Adrian", "dorsal": 6}, {"name": "Bachiri Bartal, Osama", "dorsal": 8}, {"name": "Abadias Otal, Daniel", "dorsal": 9}, {"name": "Aziaba, Ryan", "dorsal": 10}, {"name": "Rodriguez Lancho, Javier", "dorsal": 11}, {"name": "Bielsa Alonso, David", "dorsal": 12}, {"name": "Svilar, Luka", "dorsal": 17}, {"name": "Rasmussen, Felix Boje", "dorsal": 19}, {"name": "Vogelsberg, Matthew Stephen", "dorsal": 22}], "substitutes": [{"name": "De los Santos Saviñon, Jonedwin Gabriel", "dorsal": 3}, {"name": "Kapitan, Kirill", "dorsal": 5}, {"name": "Ahmed, Yusuf Abdifatah", "dorsal": 7}, {"name": "Zmogins, Reinis", "dorsal": 13}, {"name": "Lagüéns Angarón, Jorge", "dorsal": 21}], "substitutions": [{"minute": "41", "playerOut": "Abadias Otal, Daniel", "playerIn": "Ahmed, Yusuf Abdifatah"}, {"minute": "70", "playerOut": "Bardaji Bretcanu, Flavio", "playerIn": "Lagüéns Angarón, Jorge"}, {"minute": "76", "playerOut": "Vogelsberg, Matthew Stephen", "playerIn": "De los Santos Saviñon, Jonedwin Gabriel"}], "cards": [{"minute": "79", "player": "Bachiri Bartal, Osama", "type": "yellow"}]}, "score": "2-0", "homeScore": 2, "awayScore": 0, "goals": [{"minute": "46", "player": "Martinez Cruz, Alejandro", "homeScore": 1, "awayScore": 0}, {"minute": "78", "player": "Martinez Cruz, Alejandro", "homeScore": 2, "awayScore": 0}], "referees": ["Bona Inés, Miguel Angel"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J9','Infantil A','Hernan Cortes Junquera-C.F.',940367,'{"codActa": "940367", "time": "17:30", "stadium": "HUESCA-Universidad", "city": "Huesca", "homeTeam": {"name": "Infantil A", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Plumed Sancho, Francisco", "starters": [{"name": "Rubio Royo, Hugo", "dorsal": 1}, {"name": "Monesma Yebra, Adrian", "dorsal": 2}, {"name": "Lample Sanagustin, Enzo", "dorsal": 4}, {"name": "Diallo Diallo, Nasirou", "dorsal": 5}, {"name": "Alvarado Sevilla, Jonathan David", "dorsal": 6}, {"name": "Preciado Luna, Ronald Daniel", "dorsal": 7}, {"name": "Gimenez Lopez, Cesar", "dorsal": 8}, {"name": "Escartin Gracia, Alexis", "dorsal": 9}, {"name": "Roman Lasilla, Juan", "dorsal": 10}, {"name": "Guevara Garofalo, Cesar Andrés", "dorsal": 11}, {"name": "Remiki, Nasr Eddine", "dorsal": 15}], "substitutes": [{"name": "Galindo Esteban, Fernando", "dorsal": 3}, {"name": "So, Chun Lam", "dorsal": 12}, {"name": "Dmytryk, Bohdan", "dorsal": 13}, {"name": "Olano Espiau, Martin", "dorsal": 14}, {"name": "Shibata Williamson, Kai", "dorsal": 17}, {"name": "Ramirez, Elian", "dorsal": 19}, {"name": "Armas Villarroel, Andrés", "dorsal": 21}], "substitutions": [{"minute": "34", "playerOut": "Rubio Royo, Hugo", "playerIn": "Dmytryk, Bohdan"}, {"minute": "35", "playerOut": "Remiki, Nasr Eddine", "playerIn": "Ramirez, Elian"}, {"minute": "57", "playerOut": "Roman Lasilla, Juan", "playerIn": "Shibata Williamson, Kai"}, {"minute": "61", "playerOut": "Escartin Gracia, Alexis", "playerIn": "Armas Villarroel, Andrés"}, {"minute": "61", "playerOut": "Gimenez Lopez, Cesar", "playerIn": "Olano Espiau, Martin"}], "cards": [{"minute": "69", "player": "Olano Espiau, Martin", "type": "yellow"}, {"minute": "69", "player": "Alvarado Sevilla, Jonathan David", "type": "yellow"}]}, "awayTeam": {"name": "Hernan Cortes Junquera-C.F.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000274922_escudo.png?nova=1", "coach": "Nueno Peiro, Alvaro Raul", "starters": [{"name": "Seral Tolosana, Francisco", "dorsal": 1}, {"name": "Guillen Perez, Gabriel", "dorsal": 4}, {"name": "Aceves Campos, Hugo", "dorsal": 5}, {"name": "Lahoz Igual, Lucas", "dorsal": 7}, {"name": "Doubij El Haddadi, Adam", "dorsal": 8}, {"name": "Lahuerta Hernando, Mario", "dorsal": 11}, {"name": "Cordero Alonso, Mario", "dorsal": 12}, {"name": "Barranquero Quattrone, Leo", "dorsal": 18}, {"name": "Beltran Gonzalez, Juan Manuel", "dorsal": 20}, {"name": "Carrascon Izquierdo, Hector", "dorsal": 21}, {"name": "Angulo Cespedes, Antonio Martin", "dorsal": 26}], "substitutes": [{"name": "Blas Martinez, Miguel", "dorsal": 2}, {"name": "Polo Perez, Alejandro", "dorsal": 3}, {"name": "Estaun Gonzalez, Ruben", "dorsal": 6}, {"name": "Esteban Gallego, Nicolás", "dorsal": 9}, {"name": "Andres Belio, Javier", "dorsal": 10}, {"name": "Naval Montañes, Unax", "dorsal": 13}, {"name": "Vela Lana, Jorge", "dorsal": 15}], "substitutions": [{"minute": "35", "playerOut": "Guillen Perez, Gabriel", "playerIn": "Andres Belio, Javier"}, {"minute": "58", "playerOut": "Doubij El Haddadi, Adam", "playerIn": "Esteban Gallego, Nicolás"}, {"minute": "58", "playerOut": "Lahuerta Hernando, Mario", "playerIn": "Estaun Gonzalez, Ruben"}, {"minute": "66", "playerOut": "Aceves Campos, Hugo", "playerIn": "Polo Perez, Alejandro"}, {"minute": "66", "playerOut": "Cordero Alonso, Mario", "playerIn": "Blas Martinez, Miguel"}, {"minute": "66", "playerOut": "Angulo Cespedes, Antonio Martin", "playerIn": "Vela Lana, Jorge"}], "cards": []}, "score": "1-0", "homeScore": 1, "awayScore": 0, "goals": [{"minute": "8", "player": "Guevara Garofalo, Cesar Andrés", "homeScore": 1, "awayScore": 0}], "referees": ["Pacheco Terron, Samuel"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J18','Binefar-Futbol Base','Cadete C',943138,'{"codActa": "943138", "time": "11:00", "stadium": "Binefar Nuevo Los Olmos", "city": "Binéfar", "homeTeam": {"name": "Binefar-Futbol Base", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000460195_Logo_Club.jpg?nova=1", "coach": "Suarez Guillera, Francisco Javier", "starters": [{"name": "Suarez Rusu, Izan", "dorsal": 1}, {"name": "Barrau Barrabes, Jesus", "dorsal": 2}, {"name": "Samake Camara, Mahamadou", "dorsal": 3}, {"name": "El Kaddari, Mohamed", "dorsal": 4}, {"name": "Torres Guirao, Roberto", "dorsal": 5}, {"name": "Ric Carrasquer, Lizer", "dorsal": 6}, {"name": "Kante, Bourama", "dorsal": 7}, {"name": "Berguices Ciria, Amai", "dorsal": 8}, {"name": "Alonzo Contreras, Ricardo", "dorsal": 9}, {"name": "Kedouni Kasri, Adam", "dorsal": 10}, {"name": "Civiac Cullere, Guillermo", "dorsal": 11}], "substitutes": [{"name": "Fofana Tounkara, Abdoul Nasser", "dorsal": 12}, {"name": "García Monter, Hugo", "dorsal": 13}, {"name": "Keita Traore, Founeke", "dorsal": 14}, {"name": "Rueda Loaiza, Axel Lisley", "dorsal": 15}, {"name": "Salillas Arasanz, David", "dorsal": 16}], "substitutions": [{"minute": "58", "playerOut": "Samake Camara, Mahamadou", "playerIn": "Keita Traore, Founeke"}, {"minute": "67", "playerOut": "Civiac Cullere, Guillermo", "playerIn": "Rueda Loaiza, Axel Lisley"}, {"minute": "67", "playerOut": "Alonzo Contreras, Ricardo", "playerIn": "Salillas Arasanz, David"}, {"minute": "72", "playerOut": "Suarez Rusu, Izan", "playerIn": "García Monter, Hugo"}], "cards": [{"minute": "55", "player": "Samake Camara, Mahamadou", "type": "yellow"}]}, "awayTeam": {"name": "Cadete C", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Eroles Prats, Ivan", "starters": [{"name": "Samitier Laliena, Hector", "dorsal": 1}, {"name": "Hernandez Valentin, Pablo", "dorsal": 2}, {"name": "Romero Banzo, Alejandro", "dorsal": 4}, {"name": "Aragones Allue, Francisco Javier", "dorsal": 5}, {"name": "Malo Vento, Sergio", "dorsal": 6}, {"name": "Balanta Zambrano, Alan Steven", "dorsal": 7}, {"name": "Sissoho, Omar Fai", "dorsal": 9}, {"name": "Plaza Daga, Daren", "dorsal": 10}, {"name": "Pérez Gascon, Daniel", "dorsal": 15}, {"name": "Vitales Til, Mateo", "dorsal": 16}, {"name": "Kaber, Adam", "dorsal": 22}], "substitutes": [{"name": "Benedicto Barrio, Bruno", "dorsal": 3}, {"name": "Tellechea Perez, Marcos", "dorsal": 8}, {"name": "Chattaf Sfiri, Fahd", "dorsal": 11}, {"name": "Pineda Palacios, David Alessandro", "dorsal": 12}, {"name": "Cavero Blanco, Ivan", "dorsal": 19}, {"name": "Mega Pescador, Abel", "dorsal": 20}, {"name": "Susín Gracia, Urbez", "dorsal": 21}], "substitutions": [{"minute": "41", "playerOut": "Vitales Til, Mateo", "playerIn": "Cavero Blanco, Ivan"}, {"minute": "41", "playerOut": "Kaber, Adam", "playerIn": "Benedicto Barrio, Bruno"}, {"minute": "56", "playerOut": "Balanta Zambrano, Alan Steven", "playerIn": "Mega Pescador, Abel"}, {"minute": "56", "playerOut": "Pérez Gascon, Daniel", "playerIn": "Tellechea Perez, Marcos"}, {"minute": "70", "playerOut": "Hernandez Valentin, Pablo", "playerIn": "Chattaf Sfiri, Fahd"}, {"minute": "70", "playerOut": "Aragones Allue, Francisco Javier", "playerIn": "Susín Gracia, Urbez"}, {"minute": "70", "playerOut": "Malo Vento, Sergio", "playerIn": "Pineda Palacios, David Alessandro"}], "cards": [{"minute": "79", "player": "Mega Pescador, Abel", "type": "yellow"}]}, "score": "2-1", "homeScore": 2, "awayScore": 1, "goals": [{"minute": "21", "player": "Sissoho, Omar Fai", "homeScore": 0, "awayScore": 1}, {"minute": "35", "player": "Kante, Bourama", "homeScore": 1, "awayScore": 1}, {"minute": "40", "player": "Kante, Bourama", "homeScore": 2, "awayScore": 1}], "referees": ["Gañan Perez, Antonio"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J5','Binefar-Futbol Base','Infantil B',943320,'{"codActa": "943320", "time": "15:30", "stadium": "Binefar Nuevo Los Olmos", "city": "Binéfar", "homeTeam": {"name": "Binefar-Futbol Base", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000460195_Logo_Club.jpg?nova=1", "coach": "Fofana Keita, Abdoulaye", "starters": [{"name": "Monfort Galdeano, Marco", "dorsal": 1}, {"name": "Jarne Fontan, Lucas", "dorsal": 2}, {"name": "Cano Murillo, Enzo", "dorsal": 3}, {"name": "Bernad Domec, Alvaro", "dorsal": 4}, {"name": "Samoura Jobarteh, Alagi Idrissa", "dorsal": 5}, {"name": "Palau Zuferri, Hugo", "dorsal": 6}, {"name": "Tunkara Nimaga, Isa", "dorsal": 7}, {"name": "Torrens Puyuelo, Mateo", "dorsal": 8}, {"name": "Kante, Sekou", "dorsal": 9}, {"name": "Nimaga, Mahamadou", "dorsal": 10}, {"name": "Keita Camara, Muhamadu", "dorsal": 11}], "substitutes": [{"name": "Chabane, Sid Ahmed", "dorsal": 12}, {"name": "Gatius Cortes, Leo", "dorsal": 13}, {"name": "Burrell Lacort, Nestor José", "dorsal": 14}, {"name": "Moul Douira Es Salhi, Mahmoud", "dorsal": 15}, {"name": "Valero Sese, Martín", "dorsal": 16}, {"name": "Candumbel Mendes, Vicente", "dorsal": 17}, {"name": "Salas Blanch, Hugo", "dorsal": 19}], "substitutions": [], "cards": [{"minute": "50", "player": "Palau Zuferri, Hugo", "type": "yellow"}, {"minute": "61", "player": "Fofana Keita, Abdoulaye", "type": "yellow"}, {"minute": "69", "player": "Nimaga, Mahamadou", "type": "yellow"}]}, "awayTeam": {"name": "Infantil B", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "No presenta", "starters": [{"name": "Garrido Molina, Adrian", "dorsal": 1}, {"name": "Barba Santolaria, Javier", "dorsal": 3}, {"name": "Amtil, Omar", "dorsal": 4}, {"name": "Pascual Fernandes, Saúl", "dorsal": 7}, {"name": "Cagigos Peña, Joel", "dorsal": 8}, {"name": "Mashal, Kareem Ibraheem", "dorsal": 9}, {"name": "El Hajoui El Kalai, Islam", "dorsal": 14}, {"name": "Rodríguez López, Adrián", "dorsal": 15}, {"name": "Lapshin, Yanush", "dorsal": 16}, {"name": "Pascual Fernandes, Iker", "dorsal": 19}, {"name": "El Rhali El Bardiai, Ilyas", "dorsal": 21}], "substitutes": [{"name": "Piedrafita Porquet, Francisco", "dorsal": 6}, {"name": "Figueredo Hidalgo, Victor", "dorsal": 10}, {"name": "Hurtado Rodriguez, Iker", "dorsal": 11}, {"name": "Buil Lasierra, Mateo", "dorsal": 13}, {"name": "Gonzalez Zurita, Luis Daniel", "dorsal": 17}, {"name": "Rodriguez Zamora, Hugo", "dorsal": 18}, {"name": "Cagigos Peña, Eric", "dorsal": 20}], "substitutions": [], "cards": []}, "score": "2-2", "homeScore": 2, "awayScore": 2, "goals": [{"minute": "39", "player": "Lapshin, Yanush", "homeScore": 0, "awayScore": 1}, {"minute": "51", "player": "El Rhali El Bardiai, Ilyas", "homeScore": 0, "awayScore": 2}, {"minute": "65", "player": "Nimaga, Mahamadou", "homeScore": 1, "awayScore": 2}, {"minute": "69", "player": "Torrens Puyuelo, Mateo", "homeScore": 2, "awayScore": 2}], "referees": ["Mata Prada, Marcelo"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J8','Juvenil B','Huesca-S.D.',944040,'{"codActa": "944040", "time": "19:30", "stadium": "HUESCA-Universidad", "city": "Huesca", "homeTeam": {"name": "Juvenil B", "logoUrl": "https://filesffaragon.filesnovanet.es/pnfg/img/web_responsive_2/ESP/escudo_sm_resultados_.jpg", "coach": "Cabrera Carrasquer, Sergio Carlos", "starters": [{"name": "Prediger, Lucas Giancarlo Santoro", "dorsal": 1}, {"name": "Munoz, Samuel", "dorsal": 2}, {"name": "Shteynberg, Daniel Michael", "dorsal": 6}, {"name": "Fondop, Yohan Elysee", "dorsal": 7}, {"name": "Halley, Kaasha Fyah Nathaniel", "dorsal": 8}, {"name": "Yuoh, Kabili Wesseh", "dorsal": 9}, {"name": "Papanayotou, Konstantinos", "dorsal": 11}, {"name": "Davitian, Masis Ratevos", "dorsal": 15}, {"name": "Abrahamyan, Eric", "dorsal": 16}, {"name": "Mejias, Gianluca Lorenzo", "dorsal": 17}, {"name": "Pandey, Sagan Behadur", "dorsal": 22}], "substitutes": [{"name": "Heric, Emil Daniel", "dorsal": 3}, {"name": "Reina, Jovan Miles", "dorsal": 10}, {"name": "Sandejas, Jaime Rafael Jacob", "dorsal": 13}, {"name": "Solomon, Luke Aiden", "dorsal": 14}, {"name": "Cury Martino, Lucas", "dorsal": 18}, {"name": "Yuoh, Kaifa Kley", "dorsal": 19}], "substitutions": [{"minute": "55", "playerOut": "Pandey, Sagan Behadur", "playerIn": "Reina, Jovan Miles"}, {"minute": "55", "playerOut": "Abrahamyan, Eric", "playerIn": "Yuoh, Kaifa Kley"}, {"minute": "75", "playerOut": "Davitian, Masis Ratevos", "playerIn": "Heric, Emil Daniel"}, {"minute": "78", "playerOut": "Yuoh, Kabili Wesseh", "playerIn": "Solomon, Luke Aiden"}, {"minute": "78", "playerOut": "Mejias, Gianluca Lorenzo", "playerIn": "Cury Martino, Lucas"}], "cards": [{"minute": "82", "player": "Reina, Jovan Miles", "type": "yellow"}, {"minute": "89", "player": "Fondop, Yohan Elysee", "type": "yellow"}, {"minute": "89", "player": "Halley, Kaasha Fyah Nathaniel", "type": "yellow"}]}, "awayTeam": {"name": "Huesca-S.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000223477_huesca_sd.png", "coach": "Bordetas Sanchez, Jorge", "starters": [{"name": "Gaudo Recio, Diego", "dorsal": 1}, {"name": "Murunga, Thierry Mukanda", "dorsal": 2}, {"name": "Hereza Esteban, Jaime", "dorsal": 3}, {"name": "Garcia Viu, Ehedey", "dorsal": 4}, {"name": "Vitalla Fernandez, Fernando", "dorsal": 5}, {"name": "Ramiro Albert, Alejandro", "dorsal": 6}, {"name": "Bermejo Alonso, Ignacio", "dorsal": 7}, {"name": "Mur Gutierrez, Lizer", "dorsal": 8}, {"name": "Cortes Doñate, Ignacio", "dorsal": 10}, {"name": "Breslavskyi, Arsenii", "dorsal": 11}, {"name": "Gallizo Diez, Daniel", "dorsal": 16}], "substitutes": [{"name": "Puyal Garcia, Acher", "dorsal": 12}, {"name": "Majdouline, Youssef", "dorsal": 13}, {"name": "Marquina Montori, David", "dorsal": 15}], "substitutions": [{"minute": "61", "playerOut": "Breslavskyi, Arsenii", "playerIn": "Marquina Montori, David"}, {"minute": "75", "playerOut": "Gallizo Diez, Daniel", "playerIn": "Puyal Garcia, Acher"}], "cards": [{"minute": "26", "player": "Mur Gutierrez, Lizer", "type": "yellow"}, {"minute": "87", "player": "Ramiro Albert, Alejandro", "type": "yellow"}, {"minute": "89", "player": "Vitalla Fernandez, Fernando", "type": "yellow"}]}, "score": "3-2", "homeScore": 3, "awayScore": 2, "goals": [{"minute": "60", "player": "Gallizo Diez, Daniel", "homeScore": 0, "awayScore": 1}, {"minute": "72", "player": "Reina, Jovan Miles", "homeScore": 1, "awayScore": 1}, {"minute": "82", "player": "Ramiro Albert, Alejandro", "homeScore": 1, "awayScore": 2}, {"minute": "86", "player": "Fondop, Yohan Elysee", "homeScore": 2, "awayScore": 2}, {"minute": "89", "player": "Fondop, Yohan Elysee", "homeScore": 3, "awayScore": 2}], "referees": ["s principal Blanco Boné, Gonzalo"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J8','Monzon Futbol Base - Automoviles Cabrero','Juvenil C',944072,'{"codActa": "944072", "time": "15:30", "stadium": "Monzon Isidro Calderón", "city": "Monzón", "homeTeam": {"name": "Monzon Futbol Base - Automoviles Cabrero", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000139369_escudocolorfaf.jpg", "coach": "Quesada Luque, Antonio", "starters": [{"name": "Miguel Casañal, Jorge", "dorsal": 1}, {"name": "Ariño Varela, Pablo", "dorsal": 2}, {"name": "Latorre Bueno, Cristhian", "dorsal": 3}, {"name": "Latorre Monclus, Daniel", "dorsal": 4}, {"name": "Blasco Latre, Manuel", "dorsal": 5}, {"name": "Nevot Sarasa, Carlos", "dorsal": 6}, {"name": "Andreu Sampietro, Javier", "dorsal": 7}, {"name": "Benabarre Torreguitart, David", "dorsal": 8}, {"name": "Gorski Bobrowska, Kacper", "dorsal": 9}, {"name": "Lacasa Busqueta, Javier", "dorsal": 10}, {"name": "Marin Bernal, Erik", "dorsal": 11}], "substitutes": [{"name": "Touijar Hadj Allal Marrakchi, Ismael", "dorsal": 12}, {"name": "Perez Coscujuela, Hugo", "dorsal": 13}, {"name": "Español Castillon, Jaime", "dorsal": 14}, {"name": "Kermiche Mellakhi, Wail", "dorsal": 15}, {"name": "Garanto Vera, Pablo", "dorsal": 16}, {"name": "Sanagustin Sorinas, Jorge", "dorsal": 17}, {"name": "Tounkara Fofana, Mahamadou", "dorsal": 18}], "substitutions": [{"minute": "59", "playerOut": "Gorski Bobrowska, Kacper", "playerIn": "Kermiche Mellakhi, Wail"}, {"minute": "59", "playerOut": "Andreu Sampietro, Javier", "playerIn": "Tounkara Fofana, Mahamadou"}, {"minute": "59", "playerOut": "Benabarre Torreguitart, David", "playerIn": "Garanto Vera, Pablo"}, {"minute": "65", "playerOut": "Latorre Monclus, Daniel", "playerIn": "Touijar Hadj Allal Marrakchi, Ismael"}, {"minute": "65", "playerOut": "Ariño Varela, Pablo", "playerIn": "Español Castillon, Jaime"}, {"minute": "69", "playerOut": "Blasco Latre, Manuel", "playerIn": "Sanagustin Sorinas, Jorge"}], "cards": [{"minute": "16", "player": "Lacasa Busqueta, Javier", "type": "yellow"}, {"minute": "34", "player": "Marin Bernal, Erik", "type": "yellow"}, {"minute": "81", "player": "Kermiche Mellakhi, Wail", "type": "yellow"}, {"minute": "83", "player": "Latorre Bueno, Cristhian", "type": "yellow"}, {"minute": "88", "player": "Español Castillon, Jaime", "type": "yellow"}]}, "awayTeam": {"name": "Juvenil C", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png", "coach": "Ory Ramos, Jorge", "starters": [{"name": "Grande Sanchez, Iker", "dorsal": 4}, {"name": "Walker, Braylon James", "dorsal": 5}, {"name": "Hidalgo Monesma, Jacobo", "dorsal": 8}, {"name": "Mellado Mingarro, Isaac", "dorsal": 9}, {"name": "Montoya Belanche, Nicolas", "dorsal": 10}, {"name": "El Aitour Boubnaina, Bousslham", "dorsal": 11}, {"name": "Barrio Arazo, Lorien", "dorsal": 12}, {"name": "Routh, Oliver Santiago", "dorsal": 13}, {"name": "Laplaza Ortega, Mauro", "dorsal": 15}, {"name": "Maranon, Sebastian Asbun", "dorsal": 20}, {"name": "German Bibian, Rodrigo", "dorsal": 21}], "substitutes": [{"name": "Way, Reid Milo", "dorsal": 1}, {"name": "Aso Gomez, Enzo", "dorsal": 2}, {"name": "Alvarez Carrillo, Hector", "dorsal": 14}, {"name": "Rivas Ballesteros, Gonzalo", "dorsal": 16}, {"name": "Santos Abadia, Angel Yoel", "dorsal": 17}, {"name": "Pascual Fernandes, Lorien", "dorsal": 22}], "substitutions": [{"minute": "59", "playerOut": "Hidalgo Monesma, Jacobo", "playerIn": "Alvarez Carrillo, Hector"}, {"minute": "59", "playerOut": "El Aitour Boubnaina, Bousslham", "playerIn": "Santos Abadia, Angel Yoel"}, {"minute": "73", "playerOut": "Mellado Mingarro, Isaac", "playerIn": "Aso Gomez, Enzo"}, {"minute": "84", "playerOut": "Maranon, Sebastian Asbun", "playerIn": "Rivas Ballesteros, Gonzalo"}, {"minute": "84", "playerOut": "Montoya Belanche, Nicolas", "playerIn": "Pascual Fernandes, Lorien"}], "cards": [{"minute": "35", "player": "Hidalgo Monesma, Jacobo", "type": "yellow"}, {"minute": "78", "player": "Alvarez Carrillo, Hector", "type": "yellow"}, {"minute": "79", "player": "Santos Abadia, Angel Yoel", "type": "yellow"}, {"minute": "81", "player": "Ory Ramos, Jorge", "type": "yellow"}, {"minute": "83", "player": "Aso Gomez, Enzo", "type": "yellow"}]}, "score": "1-1", "homeScore": 1, "awayScore": 1, "goals": [{"minute": "56", "player": "Laplaza Ortega, Mauro", "homeScore": 0, "awayScore": 1}, {"minute": "80", "player": "Nevot Sarasa, Carlos", "homeScore": 1, "awayScore": 1}], "referees": ["s principal Deniz Marrero, Oliver"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J7','Peñas Oscenses-C.D. Hoscafrost "A"','Juvenil D',949737,'{"codActa": "949737", "time": "17:30", "stadium": "Huesca San Jorge-2", "city": "Huesca", "homeTeam": {"name": "Peñas Oscenses-C.D. Hoscafrost \"A\"", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000080862_penas_oscenses_2.jpg?nova=1", "coach": "Arias Mendez, Wilson Alberto", "starters": [{"name": "Alakbarli, Zeyd Orxan", "dorsal": 1}, {"name": "Mesa Ortiz, Santiago", "dorsal": 2}, {"name": "Kelai Oubdil, Youssef", "dorsal": 3}, {"name": "Ayerbe Arruebo, Jorge", "dorsal": 4}, {"name": "Pueyo Montaner, Martin", "dorsal": 6}, {"name": "Mañes Viu, Hugo", "dorsal": 7}, {"name": "Rodriguez Hernandez, Cesar", "dorsal": 9}, {"name": "Dual Gimenez, Jose Antonio", "dorsal": 14}, {"name": "Gharnaout, Mahdi", "dorsal": 19}, {"name": "Sebastian Ruiz, Jeronimo", "dorsal": 20}, {"name": "Bonet Lafuente, Andres", "dorsal": 28}], "substitutes": [{"name": "Cirac Elfau, Oscar", "dorsal": 5}, {"name": "Piedrafita Rivas, David", "dorsal": 8}, {"name": "Galeano Opere, Rodrigo", "dorsal": 10}, {"name": "Diarra, Drissa", "dorsal": 11}, {"name": "Vale Molina, Juan Esteban", "dorsal": 17}, {"name": "Rodriguez de Guzman Viñuales, Iker", "dorsal": 21}], "substitutions": [], "cards": [{"minute": "67", "player": "Piedrafita Rivas, David", "type": "yellow"}]}, "awayTeam": {"name": "Juvenil D", "logoUrl": "https://filesffaragon.filesnovanet.es/pnfg/img/FFAragon/ESP/escudo_sm_resultados_.jpg", "coach": "No presenta", "starters": [{"name": "Mediano Melero, Bruno", "dorsal": 2}, {"name": "Remiki, Walid", "dorsal": 3}, {"name": "Garcia Gaston, Raul", "dorsal": 5}, {"name": "Diallo Diallo, Soulaymane", "dorsal": 6}, {"name": "Diaw Ndiaye, Papa Daouda", "dorsal": 7}, {"name": "Saldivar Lagraña, Juan Jose", "dorsal": 11}, {"name": "Hermosilla Sanchez, Diego Alonso", "dorsal": 13}, {"name": "Tchatchibara Amadou, Rafik", "dorsal": 15}, {"name": "Rodríguez Zamora, Héctor", "dorsal": 18}, {"name": "Hransak, Master Tanasith", "dorsal": 19}, {"name": "Elorde, Anthony", "dorsal": 22}], "substitutes": [{"name": "Fuentes Viñuales, Miguel", "dorsal": 1}, {"name": "Sanango Garofalo, Fausto Mateo", "dorsal": 4}, {"name": "Pastor Opere, Alejandro", "dorsal": 8}, {"name": "Romero Banzo, Saul", "dorsal": 10}, {"name": "Shkarpetkin, Egor", "dorsal": 14}, {"name": "Tassybekov, Elzhan", "dorsal": 16}, {"name": "Maa Zehar Rais, Adam", "dorsal": 20}], "substitutions": [], "cards": [{"minute": "19", "player": "Rodríguez Zamora, Héctor", "type": "yellow"}, {"minute": "41", "player": "Remiki, Walid", "type": "yellow"}, {"minute": "54", "player": "Saldivar Lagraña, Juan Jose", "type": "yellow"}]}, "score": "1-2", "homeScore": 1, "awayScore": 2, "goals": [{"minute": "24", "player": "Elorde, Anthony", "homeScore": 0, "awayScore": 1}, {"minute": "78", "player": "Maa Zehar Rais, Adam", "homeScore": 0, "awayScore": 2}, {"minute": "89", "player": "Dual Gimenez, Jose Antonio", "homeScore": 1, "awayScore": 2}], "referees": ["Falceto Bara, Mateo"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J7','Infantil D','Sabiñanigo-A.D. Futbol Base',951466,'{"codActa": "951466", "time": "15:00", "stadium": "HUESCA-Universidad", "city": "Huesca", "homeTeam": {"name": "Infantil D", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "No presenta", "starters": [{"name": "Miro Perez, Gabriel", "dorsal": 1}, {"name": "Sorochenko, Vladimir", "dorsal": 5}, {"name": "Serna Kindo, Ángel Marcelo", "dorsal": 6}, {"name": "Rais Sarghini, Nizar", "dorsal": 7}, {"name": "Chait, Zakariae", "dorsal": 8}, {"name": "Segura Arruego, Jorge", "dorsal": 9}, {"name": "Diaw Ndiaye, Abdoul Aziz", "dorsal": 12}, {"name": "Rodriguez Moreno, Rafael", "dorsal": 14}, {"name": "Alvarez Essindi, Charles Raphael", "dorsal": 16}, {"name": "Santiago", "dorsal": 19}, {"name": "Suarez Sanchez, Yerai Dario", "dorsal": 21}], "substitutes": [{"name": "Lascorz Muñoz, Nicolas", "dorsal": 3}, {"name": "El Hasnaqui Ben Fedoul, Khalid", "dorsal": 4}, {"name": "Garcia Estallo, Acher", "dorsal": 13}, {"name": "Trawally Juwara, Mahamadou", "dorsal": 15}, {"name": "Boukraa Belahbib, Ayman", "dorsal": 17}, {"name": "Yaya Huertas, Santiago", "dorsal": 18}, {"name": "Fuentes Villafranca, Guillermo", "dorsal": 22}], "substitutions": [], "cards": []}, "awayTeam": {"name": "Sabiñanigo-A.D. Futbol Base", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000386912_Escudo_Futbol_base_Sabi.png?nova=1", "coach": "Olarte Gomez, Eliseo", "starters": [{"name": "Ramon Cajal, Martin", "dorsal": 1}, {"name": "Lacueva Ascaso, Jaime", "dorsal": 3}, {"name": "El Hasnaoui, Yassine", "dorsal": 4}, {"name": "Faiteh, Youssef", "dorsal": 8}, {"name": "Laguarta Valero, Daniel", "dorsal": 9}, {"name": "Narvión Toro, Mario", "dorsal": 11}, {"name": "Brand Zambrano, Emanuel", "dorsal": 14}, {"name": "Ara Subias, Gabriel", "dorsal": 15}, {"name": "Cenusa Robles, Andrei", "dorsal": 16}, {"name": "Lopez Ayuda, Alejo", "dorsal": 17}, {"name": "Carballal Giménez, Erik", "dorsal": 21}], "substitutes": [{"name": "Montero Bernabeu, Enzo", "dorsal": 2}, {"name": "Ramon Cajal, Bruno", "dorsal": 5}, {"name": "Peiro Arranz, Marcos", "dorsal": 6}, {"name": "Archilla Sanjuan, Thiago", "dorsal": 7}, {"name": "El Adli, Rayane", "dorsal": 10}, {"name": "Diaz Martinez, Zaid", "dorsal": 18}, {"name": "Orduña Cosin, Ruben", "dorsal": 19}], "substitutions": [], "cards": []}, "score": "3-1", "homeScore": 3, "awayScore": 1, "goals": [{"minute": "17", "player": "Santiago", "homeScore": 1, "awayScore": 0}, {"minute": "23", "player": "Narvión Toro, Mario", "homeScore": 1, "awayScore": 1}, {"minute": "43", "player": "Santiago", "homeScore": 2, "awayScore": 1}, {"minute": "48", "player": "Santiago", "homeScore": 3, "awayScore": 1}], "referees": ["Cuello Plana, Eiden"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J7','Cantera Oscense','Infantil C',951467,'{"codActa": "951467", "time": "09:00", "stadium": "Huesca San Jorge-1", "city": "Huesca", "homeTeam": {"name": "Cantera Oscense", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000386363_escudo_efo.jpg?nova=1", "coach": "Facuy Rosario, Jose Ángel", "starters": [{"name": "Rubiella Segura, Alvaro", "dorsal": 1}, {"name": "Bezdedeanu Anghel, Raul Adrian", "dorsal": 2}, {"name": "Lasierra Ferrando, Axier", "dorsal": 4}, {"name": "Lasierra Ferrando, Aimar", "dorsal": 6}, {"name": "Val Ferrer, Aaron", "dorsal": 7}, {"name": "Rubio Segura, Cristian", "dorsal": 8}, {"name": "Bautista Plaza, Jesus", "dorsal": 10}, {"name": "Sus López, Mario", "dorsal": 15}, {"name": "Berbel Cordero, Lucas", "dorsal": 16}, {"name": "Bernad Sanz, Daniel", "dorsal": 17}, {"name": "Reneo Mas, Lorenzo", "dorsal": 19}], "substitutes": [{"name": "Perez Dominguez, Alvaro", "dorsal": 5}, {"name": "Gabarre Lafarga, Enzo", "dorsal": 11}, {"name": "Escartin Zabau, Lorien", "dorsal": 12}, {"name": "Larraz Sanz, Marcos", "dorsal": 14}, {"name": "Moreno Subias, Adrian", "dorsal": 18}, {"name": "De la Fuente Moreno, Armando", "dorsal": 22}, {"name": "Santos Abadia, Cristian Domingo", "dorsal": 23}], "substitutions": [], "cards": []}, "awayTeam": {"name": "Infantil C", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Eroles Prats, Ivan", "starters": [{"name": "Rodrigo Oros, Alvaro", "dorsal": 2}, {"name": "Bercero Barreña, Alberto", "dorsal": 4}, {"name": "Santolaria Gavin, Martin", "dorsal": 6}, {"name": "Perez Walon, Victor", "dorsal": 9}, {"name": "Zaoui Miftah El Khair, Mohamed", "dorsal": 10}, {"name": "Lozano Roman, Iker", "dorsal": 11}, {"name": "Escario Diaz, Alejandro", "dorsal": 12}, {"name": "Nasarre Escar, Adrián", "dorsal": 13}, {"name": "Rodriguez Flores, Jonathan David", "dorsal": 19}, {"name": "Tiemtore Compaore, Aruseb Assami", "dorsal": 21}, {"name": "Lanaspa Gil, Lizer", "dorsal": 22}], "substitutes": [{"name": "Malo Vento, Alex", "dorsal": 1}, {"name": "Lopez Lozano, Aaron Natalio", "dorsal": 7}, {"name": "Vicente Lores, Nacho", "dorsal": 14}, {"name": "Prieto Verde, Javier", "dorsal": 15}, {"name": "Lahlal Errafay, Adham", "dorsal": 18}, {"name": "Suciu Maris, Alex Iuan", "dorsal": 20}], "substitutions": [], "cards": []}, "score": "2-5", "homeScore": 2, "awayScore": 5, "goals": [{"minute": "16", "player": "Rodriguez Flores, Jonathan David", "homeScore": 0, "awayScore": 1}, {"minute": "19", "player": "Lozano Roman, Iker", "homeScore": 0, "awayScore": 2}, {"minute": "31", "player": "Vicente Lores, Nacho", "homeScore": 0, "awayScore": 3}, {"minute": "34", "player": "Bautista Plaza, Jesus", "homeScore": 1, "awayScore": 3}, {"minute": "41", "player": "Lahlal Errafay, Adham", "homeScore": 1, "awayScore": 4}, {"minute": "58", "player": "Vicente Lores, Nacho", "homeScore": 1, "awayScore": 5}, {"minute": "61", "player": "Santos Abadia, Cristian Domingo", "homeScore": 2, "awayScore": 5}], "referees": ["Abardia Tosat, Ignacio"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J6','Cantera Oscense','Cadete D',952200,'{"codActa": "952200", "time": "09:00", "stadium": "Huesca San Jorge-1", "city": "Huesca", "homeTeam": {"name": "Cantera Oscense", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000386363_escudo_efo.jpg?nova=1", "coach": "No presenta", "starters": [{"name": "Perez Omiste, Jesus", "dorsal": 1}, {"name": "Zamora Zamora, Jorge", "dorsal": 5}, {"name": "Biarge Seral, Pablo", "dorsal": 7}, {"name": "Allue Anoro, Bruno", "dorsal": 8}, {"name": "Arnal Lopez, Samuel", "dorsal": 10}, {"name": "Salinas Mejuto, Mateo", "dorsal": 21}, {"name": "Rivarés Montes, Ignacio", "dorsal": 24}, {"name": "Cremades Bastarós, Nicolás", "dorsal": 31}, {"name": "Buera Aguado, Nicolas", "dorsal": 35}, {"name": "Lledó Juanes, Rubén", "dorsal": 37}, {"name": "Garcia Nogues, Ruy", "dorsal": 39}], "substitutes": [{"name": "Borbon Sanagustín, Adrián", "dorsal": 12}, {"name": "Mendoza Villaescusa, Ignacio", "dorsal": 15}, {"name": "Palomino Alastruey, Lorien", "dorsal": 16}, {"name": "Bretos Barrao, Pablo", "dorsal": 17}, {"name": "Romero Olivan, Pablo David", "dorsal": 19}, {"name": "Calvo Pintado, Bruno", "dorsal": 33}], "substitutions": [], "cards": []}, "awayTeam": {"name": "Cadete D", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "No presenta", "starters": [{"name": "Almudevar Monclus, Asier", "dorsal": 2}, {"name": "Salazar Mahecha, Pablo", "dorsal": 3}, {"name": "Losfablos Chacon, Mateo", "dorsal": 5}, {"name": "Ziani El Kanar, Islam", "dorsal": 6}, {"name": "Ibor Arazo, Neizan", "dorsal": 11}, {"name": "Perez Kandyurin, Oscar", "dorsal": 12}, {"name": "Mera, Eugen Andy", "dorsal": 13}, {"name": "Castillo Gonzalez, Yeuri", "dorsal": 14}, {"name": "Yaqublu, Hasan", "dorsal": 19}, {"name": "Kessler, Tyler Russell", "dorsal": 21}, {"name": "Myrzaly, Zanggar", "dorsal": 22}], "substitutes": [{"name": "Krejsing, Andre Nolfi", "dorsal": 1}, {"name": "Marquina Gimenez, Miguel", "dorsal": 7}, {"name": "Marino, Marco Salvatore", "dorsal": 8}, {"name": "Touil Maliki, Omar", "dorsal": 9}, {"name": "Santolaria Santolaria, Eloy", "dorsal": 16}, {"name": "Manjón Conte, Javier", "dorsal": 17}, {"name": "Paz Marquez, Angel Gabriel", "dorsal": 20}], "substitutions": [], "cards": []}, "score": "0-2", "homeScore": 0, "awayScore": 2, "goals": [{"minute": "39", "player": "Kessler, Tyler Russell", "homeScore": 0, "awayScore": 1}, {"minute": "55", "player": "Myrzaly, Zanggar", "homeScore": 0, "awayScore": 2}], "referees": ["Allali Aouaj, Sallah Eddine"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-14','J7','San Mateo-C.D.','Alevín A',960049,'{"codActa": "960049", "time": "12:35", "stadium": "San Mateo de Gº-Sta.Engracia", "city": "", "homeTeam": {"name": "San Mateo-C.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000315140_SAN_MATEO.jpg?nova=1", "coach": "Royo Barberan, Miguel Antonio", "starters": [{"name": "Royo Forcada, Marcos", "dorsal": 1}, {"name": "Vela Gomez, Javier", "dorsal": 3}, {"name": "Barrutieta Allueva, Leonardo di Angelo", "dorsal": 4}, {"name": "Morente Blasco, Leo", "dorsal": 6}, {"name": "Belarre Garcia, Telmo", "dorsal": 7}, {"name": "Seruendo Lope, Leo", "dorsal": 8}, {"name": "Tauler Almale, Alex", "dorsal": 9}, {"name": "Mayoral Vela, Jorge", "dorsal": 10}, {"name": "Ortiz Minguez, Hugo", "dorsal": 11}, {"name": "Cebrian Guerrero, Victor", "dorsal": 12}, {"name": "Román Blanco, Gala", "dorsal": 16}], "substitutes": [{"name": "Bentahir Bailout, Rida", "dorsal": 2}, {"name": "Lafita Acin, Oliver", "dorsal": 5}, {"name": "Poc Sabate, Adrian", "dorsal": 19}, {"name": "Szymon", "dorsal": 24}, {"name": "Miguel", "dorsal": 26}, {"name": "Villagrasa Lezcano, Andrea", "dorsal": 27}], "substitutions": [], "cards": [{"minute": "37", "player": "Royo Escuer, Cristian", "type": "yellow"}]}, "awayTeam": {"name": "Alevín A", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Camba Berdugo, Leopoldo", "starters": [{"name": "Escartin Gracia, Dylan", "dorsal": 2}, {"name": "Sazatornil Arnedo, Arles", "dorsal": 3}, {"name": "Kaber, Omar", "dorsal": 7}, {"name": "Bah Bah, Alfaoumarou", "dorsal": 8}, {"name": "Carrasquer Garuz, Iago", "dorsal": 11}, {"name": "Añaños Carceller, Olmo", "dorsal": 12}, {"name": "Castan Lopez, Jorge", "dorsal": 13}, {"name": "Gimenez Gimenez, Luis Miguel", "dorsal": 14}, {"name": "Ascaso Sierra, Martin", "dorsal": 16}, {"name": "Bouali Sbaai, Youssef", "dorsal": 18}, {"name": "Laliena Añon, Izan", "dorsal": 22}], "substitutes": [{"name": "Escario Pastor, Alejandro", "dorsal": 1}, {"name": "Mendoza Munguia, Irvin Daniel", "dorsal": 5}, {"name": "Sazatornil Arnedo, Bosco", "dorsal": 6}, {"name": "Ezaoui Kouraj, Yahya", "dorsal": 9}, {"name": "El Aitour Boubnaina, Mohamed Ali", "dorsal": 10}, {"name": "Bouali Sbaai, Abdeljalil", "dorsal": 15}, {"name": "Dieste Lascorz, Fernando", "dorsal": 20}], "substitutions": [], "cards": [{"minute": "36", "player": "Bouali Sbaai, Youssef", "type": "yellow"}]}, "score": "1-4", "homeScore": 1, "awayScore": 4, "goals": [{"minute": "3", "player": "Kaber, Omar", "homeScore": 0, "awayScore": 1}, {"minute": "25", "player": "Kaber, Omar", "homeScore": 0, "awayScore": 2}, {"minute": "31", "player": "Mendoza Munguia, Irvin Daniel", "homeScore": 0, "awayScore": 3}, {"minute": "40", "player": "Cebrian Guerrero, Victor", "homeScore": 1, "awayScore": 3}, {"minute": "43", "player": "Kaber, Omar", "homeScore": 1, "awayScore": 4}], "referees": ["Martinez Pellicer , Marcos"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-15','J11','Caspe-C.D.','Primer Equipo',935790,'{"codActa": "935790", "time": "16:30", "stadium": "Caspe Los Rosales", "city": "Caspe", "homeTeam": {"name": "Caspe-C.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000159560_898ec445a5f8772a5a1b61d5d019d680.jpg?nova=1", "coach": "Romero Diez, Luis Javier", "starters": [{"name": "Vicente Gilabert, Ivan", "dorsal": 2}, {"name": "Charneca Fernandez, Adrian", "dorsal": 5}, {"name": "Caparros Escuder, Andres", "dorsal": 7}, {"name": "Kombe Borico, Marvin", "dorsal": 9}, {"name": "Rubio Solanas, Alejandro", "dorsal": 10}, {"name": "Romanos Beatove, Hugo", "dorsal": 11}, {"name": "Acin Labrador, Guillermo", "dorsal": 13}, {"name": "Cabrero Gracia, Jorge", "dorsal": 14}, {"name": "Marin Gracia, Javier", "dorsal": 15}, {"name": "Rubi Sanz, Manuel Isaac", "dorsal": 17}, {"name": "Gracia Lahoz, Cristian", "dorsal": 27}], "substitutes": [{"name": "Mañez Campos, Mario", "dorsal": 1}, {"name": "Losin Babiarz, Karol Wiktor", "dorsal": 4}, {"name": "Lorente Carrasco, Ivan", "dorsal": 6}, {"name": "Martin del Pozo, Marcos", "dorsal": 29}, {"name": "Lopes da Silva, Edson", "dorsal": 30}, {"name": "Dos Santos Larrayad, Adrian", "dorsal": 92}], "substitutions": [{"minute": "72", "playerOut": "Cabrero Gracia, Jorge", "playerIn": "Lopes da Silva, Edson"}, {"minute": "72", "playerOut": "Vicente Gilabert, Ivan", "playerIn": "Lorente Carrasco, Ivan"}, {"minute": "84", "playerOut": "Gracia Lahoz, Cristian", "playerIn": "Dos Santos Larrayad, Adrian"}, {"minute": "84", "playerOut": "Caparros Escuder, Andres", "playerIn": "Losin Babiarz, Karol Wiktor"}, {"minute": "87", "playerOut": "Kombe Borico, Marvin", "playerIn": "Martin del Pozo, Marcos"}], "cards": [{"minute": "39", "player": "Cabrero Gracia, Jorge", "type": "yellow"}, {"minute": "40", "player": "Vicente Gilabert, Ivan", "type": "yellow"}]}, "awayTeam": {"name": "Primer Equipo", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000495869_Escudo_redondo_Rub__n.png?nova=1", "coach": "Oriol Lomares, Josep", "starters": [{"name": "Kosariev, Oleksandr", "dorsal": 1}, {"name": "Diallo, Alassane", "dorsal": 5}, {"name": "Gracia Quindos, Danel", "dorsal": 6}, {"name": "Bautista Jimenez, Hugo", "dorsal": 7}, {"name": "Mendez Gomez, Adria", "dorsal": 8}, {"name": "Petit Ortiz, Adria", "dorsal": 9}, {"name": "Guillen Gomez, Alberto", "dorsal": 10}, {"name": "Arechavaleta Ciordia, Jorge", "dorsal": 16}, {"name": "Mercadal Camisón, Sergio", "dorsal": 21}, {"name": "Beltran Alonso, Marco", "dorsal": 22}, {"name": "Calvo Martinez, Pau", "dorsal": 24}], "substitutes": [{"name": "Monnie, Reynold Bryan", "dorsal": 3}, {"name": "Melero Camara, Pablo", "dorsal": 4}, {"name": "Beattie Orfila, Erik", "dorsal": 11}, {"name": "Andrzejewsk, Alan Pawel", "dorsal": 13}, {"name": "Subias Martinez, Alejandro", "dorsal": 14}, {"name": "Palacios Hinestroza, Wagner Roberth", "dorsal": 15}, {"name": "Quiroz Laosa, Alejandro", "dorsal": 18}, {"name": "Fernandez Salinas, Daniel", "dorsal": 19}, {"name": "Reist, Joaquin", "dorsal": 20}], "substitutions": [{"minute": "45", "playerOut": "Guillen Gomez, Alberto", "playerIn": "Palacios Hinestroza, Wagner Roberth"}, {"minute": "71", "playerOut": "Beltran Alonso, Marco", "playerIn": "Quiroz Laosa, Alejandro"}, {"minute": "71", "playerOut": "Calvo Martinez, Pau", "playerIn": "Melero Camara, Pablo"}, {"minute": "81", "playerOut": "Arechavaleta Ciordia, Jorge", "playerIn": "Monnie, Reynold Bryan"}], "cards": [{"minute": "34", "player": "Petit Ortiz, Adria", "type": "red"}]}, "score": "2-0", "homeScore": 2, "awayScore": 0, "goals": [{"minute": "65", "player": "Kombe Borico, Marvin", "homeScore": 1, "awayScore": 0}, {"minute": "69", "player": "Cabrero Gracia, Jorge", "homeScore": 2, "awayScore": 0}], "referees": ["Albano Gota, Lorenzo", "Periz Martinez, Jesus", "Ceamanos Sobradiel, Victor"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}'),
('2026-11-15','J5','Siglo Xxi Oscense Peña los 30 ''D''','Alevín B',970000,'{"codActa": "970000", "time": "11:15", "stadium": "HUESCA-C.Deportiva F7-1", "city": "", "homeTeam": {"name": "Siglo Xxi Oscense Peña los 30 ''D''", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000053411_siglo_XXI_oscense.jpg?nova=1", "coach": "Dorado Diaz, David", "starters": [{"name": "Echabbaki Lakhsim, Adam", "dorsal": 2}, {"name": "Perez Buisan, Alejandro", "dorsal": 3}, {"name": "Ramirez Crivell, Marcos", "dorsal": 6}, {"name": "Perez Buisan, Luis", "dorsal": 9}, {"name": "Banzo Ara, Javier", "dorsal": 11}, {"name": "Vicente Lores, Leo", "dorsal": 14}, {"name": "Gassa Kaoukabi, Mohamed Ali", "dorsal": 17}, {"name": "Cortiella Cambra, Jordi", "dorsal": 25}], "substitutes": [{"name": "Martinez Martinez, Leurys", "dorsal": 4}, {"name": "Larrieu Marrase, Edgar", "dorsal": 5}, {"name": "Tellechea Perez, Ibai", "dorsal": 7}, {"name": "Laguna Claver, Diego", "dorsal": 8}, {"name": "Hassissi El Hajjaji, Samy", "dorsal": 10}, {"name": "Mirasol Barreu, Hugo", "dorsal": 12}, {"name": "Jaimes Siso, Carlos Omar", "dorsal": 13}, {"name": "Muñoz Palma, Fabri Josue", "dorsal": 19}], "substitutions": [], "cards": []}, "awayTeam": {"name": "Alevín B", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "No presenta", "starters": [{"name": "Chattaf Sfiri, Mohammed Amine", "dorsal": 6}, {"name": "Sghir Braik, Ilyas", "dorsal": 7}, {"name": "Amaya Ruano, Isaac", "dorsal": 8}, {"name": "Massa Otmane, Mehdi", "dorsal": 9}, {"name": "Diallo Diallo, Abdoulrahmane", "dorsal": 11}, {"name": "Castan Lopez, Jorge", "dorsal": 13}, {"name": "Hernandez Paul, Enrique", "dorsal": 15}, {"name": "Ibnou Bouzid, Ali", "dorsal": 17}], "substitutes": [{"name": "El Khaoua Mustaphi, Rayan", "dorsal": 1}, {"name": "Li, Jinxun", "dorsal": 2}, {"name": "Chihab Otmane, Hamza", "dorsal": 3}, {"name": "Ziani Zeyeni, Mohamed Yassin", "dorsal": 10}, {"name": "Brun Cubeles, Jose", "dorsal": 14}, {"name": "Yang, Haoran", "dorsal": 16}], "substitutions": [], "cards": []}, "score": "2-7", "homeScore": 2, "awayScore": 7, "goals": [{"minute": "4", "player": "Massa Otmane, Mehdi", "homeScore": 0, "awayScore": 1}, {"minute": "7", "player": "Chattaf Sfiri, Mohammed Amine", "homeScore": 0, "awayScore": 2}, {"minute": "9", "player": "Massa Otmane, Mehdi", "homeScore": 0, "awayScore": 3}, {"minute": "11", "player": "Perez Buisan, Luis", "homeScore": 1, "awayScore": 3}, {"minute": "33", "player": "Hernandez Paul, Enrique", "homeScore": 1, "awayScore": 4}, {"minute": "35", "player": "Chihab Otmane, Hamza", "homeScore": 1, "awayScore": 5}, {"minute": "37", "player": "Yang, Haoran", "homeScore": 1, "awayScore": 6}, {"minute": "41", "player": "Yang, Haoran", "homeScore": 1, "awayScore": 7}, {"minute": "59", "player": "Muñoz Palma, Fabri Josue", "homeScore": 2, "awayScore": 7}], "referees": ["Ciria Alastruey, Lorién"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-17T00:00:00Z"}');

UPDATE partidos p
   SET acta_fed = v.acta || jsonb_build_object('competition', p.competition, 'jornada', p.jornada, 'date', to_char(p.date, 'DD/MM/YYYY')),
       id_partido_fed = v.mid
  FROM _actas_fed v
 WHERE p.date::date = v.fecha AND p.jornada = v.jornada
   AND p.local_team = v.local AND p.visitor_team = v.visitante;

UPDATE eventos_calendario e
   SET acta_fed = v.acta || jsonb_build_object('competition', e.competition, 'jornada', e.jornada,
                                               'date', to_char(e.date AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY')),
       id_partido_fed = v.mid
  FROM _actas_fed v
 WHERE e.club_id = 'escuela-huesca' AND e.type = 'Partido'
   AND (e.date AT TIME ZONE 'Europe/Madrid')::date = v.fecha AND e.jornada = v.jornada
   AND e.local_team = v.local AND e.visitor_team = v.visitante;

DROP TABLE IF EXISTS pg_temp._actas_fed;

-- 3) Estadísticas por jugador (solo los partidos nuevos)
CREATE OR REPLACE FUNCTION pg_temp.norm_key(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
    SELECT string_agg(w, ' ' ORDER BY w) FROM unnest(regexp_split_to_array(
        btrim(regexp_replace(translate(upper(COALESCE(t,'')), 'ÁÉÍÓÚÜÀÈÌÒÙ', 'AEIOUUAEIOU'), '[^A-Z0-9Ñ ]', ' ', 'g')),
        '\s+')) w WHERE w <> ''
$f$;

DROP TABLE IF EXISTS pg_temp.fed_stats;
CREATE TEMP TABLE fed_stats (team_id text, player_name text, dorsal int, fecha date, rival_raw text,
    jornada text, titular boolean, minutos int, goles int, amarillas int, rojas int, fed_match_id int,
    equipo_id uuid, jugador_id uuid, key text);
INSERT INTO fed_stats (team_id, player_name, dorsal, fecha, rival_raw, jornada, titular, minutos, goles, amarillas, rojas, fed_match_id) VALUES
('1874190','Junquera Franco, Sergio',1,'2026-11-14','V:Ebro-C.D.','10',true,90,0,0,0,933265),
('1874190','Navallas Orrit, Lucas',3,'2026-11-14','V:Ebro-C.D.','10',true,72,0,0,0,933265),
('1874190','Sopena Garrapiz, Miguel',4,'2026-11-14','V:Ebro-C.D.','10',false,18,0,0,0,933265),
('1874190','Lamarca Jauregui, Ruben',5,'2026-11-14','V:Ebro-C.D.','10',true,83,0,0,0,933265),
('1874190','Nestor Vicente Vicente',6,'2026-11-14','V:Ebro-C.D.','10',true,90,0,0,0,933265),
('1874190','Najdi, Mohamad H',7,'2026-11-14','V:Ebro-C.D.','10',true,90,1,1,0,933265),
('1874190','Reina, Stevan Yolexander',8,'2026-11-14','V:Ebro-C.D.','10',true,90,0,0,0,933265),
('1874190','Villabona Negrete, David',10,'2026-11-14','V:Ebro-C.D.','10',true,90,0,0,0,933265),
('1874190','Casals Almacellas, Ricard',11,'2026-11-14','V:Ebro-C.D.','10',true,72,0,0,0,933265),
('1874190','Eddafiri Hajji, Eshak',12,'2026-11-14','V:Ebro-C.D.','10',false,7,0,0,0,933265),
('1874190','Casado Perez, Guillermo',13,'2026-11-14','V:Ebro-C.D.','10',false,0,0,0,0,933265),
('1874190','Ingalaturre Cano, Javier',17,'2026-11-14','V:Ebro-C.D.','10',true,90,0,1,0,933265),
('1874190','Tshiteya, Christian Rene',18,'2026-11-14','V:Ebro-C.D.','10',false,18,0,1,0,933265),
('1874190','Mur Marin, Bruno',19,'2026-11-14','V:Ebro-C.D.','10',true,72,1,0,0,933265),
('1874190','Casanova Laso, Alvaro',20,'2026-11-14','V:Ebro-C.D.','10',false,18,0,0,0,933265),
('1874190','Junquera Franco, Alejandro Aladino',21,'2026-11-14','V:Ebro-C.D.','10',true,83,0,0,0,933265),
('1874190','Martinez, Jayden Nehemiah',23,'2026-11-14','V:Ebro-C.D.','10',false,7,0,0,0,933265),
('1874190','El Yagoubi Bellahbib, Housam',25,'2026-11-14','V:Ebro-C.D.','10',false,0,0,0,0,933265),
('5301041','Laplaza Arnal, Angel',1,'2026-11-14','V:Valdefierro-C.D.','9',false,0,0,0,0,937408),
('5301041','Ehara, Haruto',2,'2026-11-14','V:Valdefierro-C.D.','9',true,80,0,0,0,937408),
('5301041','Kostiuchik, Artur',3,'2026-11-14','V:Valdefierro-C.D.','9',true,80,0,0,0,937408),
('5301041','Pisa Palacin, Eric',4,'2026-11-14','V:Valdefierro-C.D.','9',true,77,0,0,0,937408),
('5301041','Palomeque Samperiz, Simon',5,'2026-11-14','V:Valdefierro-C.D.','9',true,80,1,0,0,937408),
('5301041','Lapshin, Luka',6,'2026-11-14','V:Valdefierro-C.D.','9',true,80,0,1,0,937408),
('5301041','Khouta Nihah, Rayan',7,'2026-11-14','V:Valdefierro-C.D.','9',true,65,0,0,0,937408),
('5301041','Huerva Loriente, Iván',8,'2026-11-14','V:Valdefierro-C.D.','9',false,11,0,0,0,937408),
('5301041','Torcal Encontra, Daniel',9,'2026-11-14','V:Valdefierro-C.D.','9',true,80,0,0,0,937408),
('5301041','Mellado Mingarro, Alejo',10,'2026-11-14','V:Valdefierro-C.D.','9',true,77,1,0,0,937408),
('5301041','Casas da Silva, Gabriel',11,'2026-11-14','V:Valdefierro-C.D.','9',true,80,0,1,0,937408),
('5301041','Addo, Desmond Donald',13,'2026-11-14','V:Valdefierro-C.D.','9',true,80,0,0,0,937408),
('5301041','Saldivar Lagraña, Jose Angel',14,'2026-11-14','V:Valdefierro-C.D.','9',true,69,0,1,0,937408),
('5301041','Mallén Cruz, Marco',15,'2026-11-14','V:Valdefierro-C.D.','9',false,3,0,0,0,937408),
('5301041','Ardanuy Ramon, Hugo',18,'2026-11-14','V:Valdefierro-C.D.','9',false,0,0,0,0,937408),
('5301041','Boonparsert, Phakin Chalermakas',19,'2026-11-14','V:Valdefierro-C.D.','9',false,3,0,0,0,937408),
('5301041','Maestre Sanchez, Manuel',20,'2026-11-14','V:Valdefierro-C.D.','9',false,0,0,0,0,937408),
('5301041','Diallo Diallo, Ibrahima Tanou',22,'2026-11-14','V:Valdefierro-C.D.','9',false,15,0,0,0,937408),
('2804927','Espurz Redon, Adrian',1,'2026-11-14','V:Amistad-U.D.','24',true,80,0,0,0,938253),
('2804927','De los Santos Saviñon, Jonedwin Gabriel',3,'2026-11-14','V:Amistad-U.D.','24',false,4,0,0,0,938253),
('2804927','Bardaji Bretcanu, Flavio',4,'2026-11-14','V:Amistad-U.D.','24',true,70,0,0,0,938253),
('2804927','Kapitan, Kirill',5,'2026-11-14','V:Amistad-U.D.','24',false,0,0,0,0,938253),
('2804927','Viñuales Rodriguez, Adrian',6,'2026-11-14','V:Amistad-U.D.','24',true,80,0,0,0,938253),
('2804927','Ahmed, Yusuf Abdifatah',7,'2026-11-14','V:Amistad-U.D.','24',false,39,0,0,0,938253),
('2804927','Bachiri Bartal, Osama',8,'2026-11-14','V:Amistad-U.D.','24',true,80,0,1,0,938253),
('2804927','Abadias Otal, Daniel',9,'2026-11-14','V:Amistad-U.D.','24',true,41,0,0,0,938253),
('2804927','Aziaba, Ryan',10,'2026-11-14','V:Amistad-U.D.','24',true,80,0,0,0,938253),
('2804927','Rodriguez Lancho, Javier',11,'2026-11-14','V:Amistad-U.D.','24',true,80,0,0,0,938253),
('2804927','Bielsa Alonso, David',12,'2026-11-14','V:Amistad-U.D.','24',true,80,0,0,0,938253),
('2804927','Zmogins, Reinis',13,'2026-11-14','V:Amistad-U.D.','24',false,0,0,0,0,938253),
('2804927','Svilar, Luka',17,'2026-11-14','V:Amistad-U.D.','24',true,80,0,0,0,938253),
('2804927','Rasmussen, Felix Boje',19,'2026-11-14','V:Amistad-U.D.','24',true,80,0,0,0,938253),
('2804927','Lagüéns Angarón, Jorge',21,'2026-11-14','V:Amistad-U.D.','24',false,10,0,0,0,938253),
('2804927','Vogelsberg, Matthew Stephen',22,'2026-11-14','V:Amistad-U.D.','24',true,76,0,0,0,938253),
('2804928','Rubio Royo, Hugo',1,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,34,0,0,0,940367),
('2804928','Monesma Yebra, Adrian',2,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,70,0,0,0,940367),
('2804928','Galindo Esteban, Fernando',3,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',false,0,0,0,0,940367),
('2804928','Lample Sanagustin, Enzo',4,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,70,0,0,0,940367),
('2804928','Diallo Diallo, Nasirou',5,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,70,0,0,0,940367),
('2804928','Alvarado Sevilla, Jonathan David',6,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,70,0,1,0,940367),
('2804928','Preciado Luna, Ronald Daniel',7,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,70,0,0,0,940367),
('2804928','Gimenez Lopez, Cesar',8,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,61,0,0,0,940367),
('2804928','Escartin Gracia, Alexis',9,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,61,0,0,0,940367),
('2804928','Roman Lasilla, Juan',10,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,57,0,0,0,940367),
('2804928','Guevara Garofalo, Cesar Andrés',11,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,70,1,0,0,940367),
('2804928','So, Chun Lam',12,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',false,0,0,0,0,940367),
('2804928','Dmytryk, Bohdan',13,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',false,36,0,0,0,940367),
('2804928','Olano Espiau, Martin',14,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',false,9,0,1,0,940367),
('2804928','Remiki, Nasr Eddine',15,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',true,35,0,0,0,940367),
('2804928','Shibata Williamson, Kai',17,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',false,13,0,0,0,940367),
('2804928','Ramirez, Elian',19,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',false,35,0,0,0,940367),
('2804928','Armas Villarroel, Andrés',21,'2026-11-14','L:Hernan Cortes Junquera-C.F.','9',false,9,0,0,0,940367),
('1874191','Samitier Laliena, Hector',1,'2026-11-14','V:Binefar-Futbol Base','18',true,80,0,0,0,943138),
('1874191','Hernandez Valentin, Pablo',2,'2026-11-14','V:Binefar-Futbol Base','18',true,70,0,0,0,943138),
('1874191','Benedicto Barrio, Bruno',3,'2026-11-14','V:Binefar-Futbol Base','18',false,39,0,0,0,943138),
('1874191','Romero Banzo, Alejandro',4,'2026-11-14','V:Binefar-Futbol Base','18',true,80,0,0,0,943138),
('1874191','Aragones Allue, Francisco Javier',5,'2026-11-14','V:Binefar-Futbol Base','18',true,70,0,0,0,943138),
('1874191','Malo Vento, Sergio',6,'2026-11-14','V:Binefar-Futbol Base','18',true,70,0,0,0,943138),
('1874191','Balanta Zambrano, Alan Steven',7,'2026-11-14','V:Binefar-Futbol Base','18',true,56,0,0,0,943138),
('1874191','Tellechea Perez, Marcos',8,'2026-11-14','V:Binefar-Futbol Base','18',false,24,0,0,0,943138),
('1874191','Sissoho, Omar Fai',9,'2026-11-14','V:Binefar-Futbol Base','18',true,80,1,0,0,943138),
('1874191','Plaza Daga, Daren',10,'2026-11-14','V:Binefar-Futbol Base','18',true,80,0,0,0,943138),
('1874191','Chattaf Sfiri, Fahd',11,'2026-11-14','V:Binefar-Futbol Base','18',false,10,0,0,0,943138),
('1874191','Pineda Palacios, David Alessandro',12,'2026-11-14','V:Binefar-Futbol Base','18',false,10,0,0,0,943138),
('1874191','Pérez Gascon, Daniel',15,'2026-11-14','V:Binefar-Futbol Base','18',true,56,0,0,0,943138),
('1874191','Vitales Til, Mateo',16,'2026-11-14','V:Binefar-Futbol Base','18',true,41,0,0,0,943138),
('1874191','Cavero Blanco, Ivan',19,'2026-11-14','V:Binefar-Futbol Base','18',false,39,0,0,0,943138),
('1874191','Mega Pescador, Abel',20,'2026-11-14','V:Binefar-Futbol Base','18',false,24,0,1,0,943138),
('1874191','Susín Gracia, Urbez',21,'2026-11-14','V:Binefar-Futbol Base','18',false,10,0,0,0,943138),
('1874191','Kaber, Adam',22,'2026-11-14','V:Binefar-Futbol Base','18',true,41,0,0,0,943138),
('4607890','Garrido Molina, Adrian',1,'2026-11-14','V:Binefar-Futbol Base','5',true,70,0,0,0,943320),
('4607890','Barba Santolaria, Javier',3,'2026-11-14','V:Binefar-Futbol Base','5',true,70,0,0,0,943320),
('4607890','Amtil, Omar',4,'2026-11-14','V:Binefar-Futbol Base','5',true,70,0,0,0,943320),
('4607890','Piedrafita Porquet, Francisco',6,'2026-11-14','V:Binefar-Futbol Base','5',false,0,0,0,0,943320),
('4607890','Pascual Fernandes, Saúl',7,'2026-11-14','V:Binefar-Futbol Base','5',true,70,0,0,0,943320),
('4607890','Cagigos Peña, Joel',8,'2026-11-14','V:Binefar-Futbol Base','5',true,70,0,0,0,943320),
('4607890','Mashal, Kareem Ibraheem',9,'2026-11-14','V:Binefar-Futbol Base','5',true,70,0,0,0,943320),
('4607890','Figueredo Hidalgo, Victor',10,'2026-11-14','V:Binefar-Futbol Base','5',false,0,0,0,0,943320),
('4607890','Hurtado Rodriguez, Iker',11,'2026-11-14','V:Binefar-Futbol Base','5',false,0,0,0,0,943320),
('4607890','Buil Lasierra, Mateo',13,'2026-11-14','V:Binefar-Futbol Base','5',false,0,0,0,0,943320),
('4607890','El Hajoui El Kalai, Islam',14,'2026-11-14','V:Binefar-Futbol Base','5',true,70,0,0,0,943320),
('4607890','Rodríguez López, Adrián',15,'2026-11-14','V:Binefar-Futbol Base','5',true,70,0,0,0,943320),
('4607890','Lapshin, Yanush',16,'2026-11-14','V:Binefar-Futbol Base','5',true,70,1,0,0,943320),
('4607890','Gonzalez Zurita, Luis Daniel',17,'2026-11-14','V:Binefar-Futbol Base','5',false,0,0,0,0,943320),
('4607890','Rodriguez Zamora, Hugo',18,'2026-11-14','V:Binefar-Futbol Base','5',false,0,0,0,0,943320),
('4607890','Pascual Fernandes, Iker',19,'2026-11-14','V:Binefar-Futbol Base','5',true,70,0,0,0,943320),
('4607890','Cagigos Peña, Eric',20,'2026-11-14','V:Binefar-Futbol Base','5',false,0,0,0,0,943320),
('4607890','El Rhali El Bardiai, Ilyas',21,'2026-11-14','V:Binefar-Futbol Base','5',true,70,1,0,0,943320),
('5591480','Prediger, Lucas Giancarlo Santoro',1,'2026-11-14','L:Huesca-S.D.','8',true,90,0,0,0,944040),
('5591480','Munoz, Samuel',2,'2026-11-14','L:Huesca-S.D.','8',true,90,0,0,0,944040),
('5591480','Heric, Emil Daniel',3,'2026-11-14','L:Huesca-S.D.','8',false,15,0,0,0,944040),
('5591480','Shteynberg, Daniel Michael',6,'2026-11-14','L:Huesca-S.D.','8',true,90,0,0,0,944040),
('5591480','Fondop, Yohan Elysee',7,'2026-11-14','L:Huesca-S.D.','8',true,90,2,1,0,944040),
('5591480','Halley, Kaasha Fyah Nathaniel',8,'2026-11-14','L:Huesca-S.D.','8',true,90,0,1,0,944040),
('5591480','Yuoh, Kabili Wesseh',9,'2026-11-14','L:Huesca-S.D.','8',true,78,0,0,0,944040),
('5591480','Reina, Jovan Miles',10,'2026-11-14','L:Huesca-S.D.','8',false,35,1,1,0,944040),
('5591480','Papanayotou, Konstantinos',11,'2026-11-14','L:Huesca-S.D.','8',true,90,0,0,0,944040),
('5591480','Sandejas, Jaime Rafael Jacob',13,'2026-11-14','L:Huesca-S.D.','8',false,0,0,0,0,944040),
('5591480','Solomon, Luke Aiden',14,'2026-11-14','L:Huesca-S.D.','8',false,12,0,0,0,944040),
('5591480','Davitian, Masis Ratevos',15,'2026-11-14','L:Huesca-S.D.','8',true,75,0,0,0,944040),
('5591480','Abrahamyan, Eric',16,'2026-11-14','L:Huesca-S.D.','8',true,55,0,0,0,944040),
('5591480','Mejias, Gianluca Lorenzo',17,'2026-11-14','L:Huesca-S.D.','8',true,78,0,0,0,944040),
('5591480','Cury Martino, Lucas',18,'2026-11-14','L:Huesca-S.D.','8',false,12,0,0,0,944040),
('5591480','Yuoh, Kaifa Kley',19,'2026-11-14','L:Huesca-S.D.','8',false,35,0,0,0,944040),
('5591480','Pandey, Sagan Behadur',22,'2026-11-14','L:Huesca-S.D.','8',true,55,0,0,0,944040),
('2804926','Way, Reid Milo',1,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',false,0,0,0,0,944072),
('2804926','Aso Gomez, Enzo',2,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',false,17,0,1,0,944072),
('2804926','Grande Sanchez, Iker',4,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,90,0,0,0,944072),
('2804926','Walker, Braylon James',5,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,90,0,0,0,944072),
('2804926','Hidalgo Monesma, Jacobo',8,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,59,0,1,0,944072),
('2804926','Mellado Mingarro, Isaac',9,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,73,0,0,0,944072),
('2804926','Montoya Belanche, Nicolas',10,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,84,0,0,0,944072),
('2804926','El Aitour Boubnaina, Bousslham',11,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,59,0,0,0,944072),
('2804926','Barrio Arazo, Lorien',12,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,90,0,0,0,944072),
('2804926','Routh, Oliver Santiago',13,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,90,0,0,0,944072),
('2804926','Alvarez Carrillo, Hector',14,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',false,31,0,1,0,944072),
('2804926','Laplaza Ortega, Mauro',15,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,90,1,0,0,944072),
('2804926','Rivas Ballesteros, Gonzalo',16,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',false,6,0,0,0,944072),
('2804926','Santos Abadia, Angel Yoel',17,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',false,31,0,1,0,944072),
('2804926','Maranon, Sebastian Asbun',20,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,84,0,0,0,944072),
('2804926','German Bibian, Rodrigo',21,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',true,90,0,0,0,944072),
('2804926','Pascual Fernandes, Lorien',22,'2026-11-14','V:Monzon Futbol Base - Automoviles Cabrero','8',false,6,0,0,0,944072),
('22382611','Fuentes Viñuales, Miguel',1,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',false,0,0,0,0,949737),
('22382611','Mediano Melero, Bruno',2,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,0,0,949737),
('22382611','Remiki, Walid',3,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,1,0,949737),
('22382611','Sanango Garofalo, Fausto Mateo',4,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',false,0,0,0,0,949737),
('22382611','Garcia Gaston, Raul',5,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,0,0,949737),
('22382611','Diallo Diallo, Soulaymane',6,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,0,0,949737),
('22382611','Diaw Ndiaye, Papa Daouda',7,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,0,0,949737),
('22382611','Pastor Opere, Alejandro',8,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',false,0,0,0,0,949737),
('22382611','Romero Banzo, Saul',10,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',false,0,0,0,0,949737),
('22382611','Saldivar Lagraña, Juan Jose',11,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,1,0,949737),
('22382611','Hermosilla Sanchez, Diego Alonso',13,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,0,0,949737),
('22382611','Shkarpetkin, Egor',14,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',false,0,0,0,0,949737),
('22382611','Tchatchibara Amadou, Rafik',15,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,0,0,949737),
('22382611','Tassybekov, Elzhan',16,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',false,0,0,0,0,949737),
('22382611','Rodríguez Zamora, Héctor',18,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,1,0,949737),
('22382611','Hransak, Master Tanasith',19,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,0,0,0,949737),
('22382611','Maa Zehar Rais, Adam',20,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',false,0,1,0,0,949737),
('22382611','Elorde, Anthony',22,'2026-11-14','V:Peñas Oscenses-C.D. Hoscafrost "A"','7',true,90,1,0,0,949737),
('23292361','Miro Perez, Gabriel',1,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Lascorz Muñoz, Nicolas',3,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',false,0,0,0,0,951466),
('23292361','El Hasnaqui Ben Fedoul, Khalid',4,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',false,0,0,0,0,951466),
('23292361','Sorochenko, Vladimir',5,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Serna Kindo, Ángel Marcelo',6,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Rais Sarghini, Nizar',7,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Chait, Zakariae',8,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Segura Arruego, Jorge',9,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Diaw Ndiaye, Abdoul Aziz',12,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Garcia Estallo, Acher',13,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',false,0,0,0,0,951466),
('23292361','Rodriguez Moreno, Rafael',14,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Trawally Juwara, Mahamadou',15,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',false,0,0,0,0,951466),
('23292361','Alvarez Essindi, Charles Raphael',16,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Boukraa Belahbib, Ayman',17,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',false,0,0,0,0,951466),
('23292361','Yaya Huertas, Santiago',18,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',false,0,0,0,0,951466),
('23292361','Santiago',19,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,3,0,0,951466),
('23292361','Suarez Sanchez, Yerai Dario',21,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',true,70,0,0,0,951466),
('23292361','Fuentes Villafranca, Guillermo',22,'2026-11-14','L:Sabiñanigo-A.D. Futbol Base','7',false,0,0,0,0,951466),
('23215033','Malo Vento, Alex',1,'2026-11-14','V:Cantera Oscense','7',false,0,0,0,0,951467),
('23215033','Rodrigo Oros, Alvaro',2,'2026-11-14','V:Cantera Oscense','7',true,70,0,0,0,951467),
('23215033','Bercero Barreña, Alberto',4,'2026-11-14','V:Cantera Oscense','7',true,70,0,0,0,951467),
('23215033','Santolaria Gavin, Martin',6,'2026-11-14','V:Cantera Oscense','7',true,70,0,0,0,951467),
('23215033','Lopez Lozano, Aaron Natalio',7,'2026-11-14','V:Cantera Oscense','7',false,0,0,0,0,951467),
('23215033','Perez Walon, Victor',9,'2026-11-14','V:Cantera Oscense','7',true,70,0,0,0,951467),
('23215033','Zaoui Miftah El Khair, Mohamed',10,'2026-11-14','V:Cantera Oscense','7',true,70,0,0,0,951467),
('23215033','Lozano Roman, Iker',11,'2026-11-14','V:Cantera Oscense','7',true,70,1,0,0,951467),
('23215033','Escario Diaz, Alejandro',12,'2026-11-14','V:Cantera Oscense','7',true,70,0,0,0,951467),
('23215033','Nasarre Escar, Adrián',13,'2026-11-14','V:Cantera Oscense','7',true,70,0,0,0,951467),
('23215033','Vicente Lores, Nacho',14,'2026-11-14','V:Cantera Oscense','7',false,0,2,0,0,951467),
('23215033','Prieto Verde, Javier',15,'2026-11-14','V:Cantera Oscense','7',false,0,0,0,0,951467),
('23215033','Lahlal Errafay, Adham',18,'2026-11-14','V:Cantera Oscense','7',false,0,1,0,0,951467),
('23215033','Rodriguez Flores, Jonathan David',19,'2026-11-14','V:Cantera Oscense','7',true,70,1,0,0,951467),
('23215033','Suciu Maris, Alex Iuan',20,'2026-11-14','V:Cantera Oscense','7',false,0,0,0,0,951467),
('23215033','Tiemtore Compaore, Aruseb Assami',21,'2026-11-14','V:Cantera Oscense','7',true,70,0,0,0,951467),
('23215033','Lanaspa Gil, Lizer',22,'2026-11-14','V:Cantera Oscense','7',true,70,0,0,0,951467),
('6073640','Krejsing, Andre Nolfi',1,'2026-11-14','V:Cantera Oscense','6',false,0,0,0,0,952200),
('6073640','Almudevar Monclus, Asier',2,'2026-11-14','V:Cantera Oscense','6',true,80,0,0,0,952200),
('6073640','Salazar Mahecha, Pablo',3,'2026-11-14','V:Cantera Oscense','6',true,80,0,0,0,952200),
('6073640','Losfablos Chacon, Mateo',5,'2026-11-14','V:Cantera Oscense','6',true,80,0,0,0,952200),
('6073640','Ziani El Kanar, Islam',6,'2026-11-14','V:Cantera Oscense','6',true,80,0,0,0,952200),
('6073640','Marquina Gimenez, Miguel',7,'2026-11-14','V:Cantera Oscense','6',false,0,0,0,0,952200),
('6073640','Marino, Marco Salvatore',8,'2026-11-14','V:Cantera Oscense','6',false,0,0,0,0,952200),
('6073640','Touil Maliki, Omar',9,'2026-11-14','V:Cantera Oscense','6',false,0,0,0,0,952200),
('6073640','Ibor Arazo, Neizan',11,'2026-11-14','V:Cantera Oscense','6',true,80,0,0,0,952200),
('6073640','Perez Kandyurin, Oscar',12,'2026-11-14','V:Cantera Oscense','6',true,80,0,0,0,952200),
('6073640','Mera, Eugen Andy',13,'2026-11-14','V:Cantera Oscense','6',true,80,0,0,0,952200),
('6073640','Castillo Gonzalez, Yeuri',14,'2026-11-14','V:Cantera Oscense','6',true,80,0,0,0,952200),
('6073640','Santolaria Santolaria, Eloy',16,'2026-11-14','V:Cantera Oscense','6',false,0,0,0,0,952200),
('6073640','Manjón Conte, Javier',17,'2026-11-14','V:Cantera Oscense','6',false,0,0,0,0,952200),
('6073640','Yaqublu, Hasan',19,'2026-11-14','V:Cantera Oscense','6',true,80,0,0,0,952200),
('6073640','Paz Marquez, Angel Gabriel',20,'2026-11-14','V:Cantera Oscense','6',false,0,0,0,0,952200),
('6073640','Kessler, Tyler Russell',21,'2026-11-14','V:Cantera Oscense','6',true,80,1,0,0,952200),
('6073640','Myrzaly, Zanggar',22,'2026-11-14','V:Cantera Oscense','6',true,80,1,0,0,952200),
('23215262','Escario Pastor, Alejandro',1,'2026-11-14','V:San Mateo-C.D.','7',false,0,0,0,0,960049),
('23215262','Escartin Gracia, Dylan',2,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,0,0,960049),
('23215262','Sazatornil Arnedo, Arles',3,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,0,0,960049),
('23215262','Mendoza Munguia, Irvin Daniel',5,'2026-11-14','V:San Mateo-C.D.','7',false,0,1,0,0,960049),
('23215262','Sazatornil Arnedo, Bosco',6,'2026-11-14','V:San Mateo-C.D.','7',false,0,0,0,0,960049),
('23215262','Kaber, Omar',7,'2026-11-14','V:San Mateo-C.D.','7',true,60,3,0,0,960049),
('23215262','Bah Bah, Alfaoumarou',8,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,0,0,960049),
('23215262','Ezaoui Kouraj, Yahya',9,'2026-11-14','V:San Mateo-C.D.','7',false,0,0,0,0,960049),
('23215262','El Aitour Boubnaina, Mohamed Ali',10,'2026-11-14','V:San Mateo-C.D.','7',false,0,0,0,0,960049),
('23215262','Carrasquer Garuz, Iago',11,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,0,0,960049),
('23215262','Añaños Carceller, Olmo',12,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,0,0,960049),
('23215262','Castan Lopez, Jorge',13,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,0,0,960049),
('23215262','Gimenez Gimenez, Luis Miguel',14,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,0,0,960049),
('23215262','Bouali Sbaai, Abdeljalil',15,'2026-11-14','V:San Mateo-C.D.','7',false,0,0,0,0,960049),
('23215262','Ascaso Sierra, Martin',16,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,0,0,960049),
('23215262','Bouali Sbaai, Youssef',18,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,1,0,960049),
('23215262','Dieste Lascorz, Fernando',20,'2026-11-14','V:San Mateo-C.D.','7',false,0,0,0,0,960049),
('23215262','Laliena Añon, Izan',22,'2026-11-14','V:San Mateo-C.D.','7',true,60,0,0,0,960049),
('940','Kosariev, Oleksandr',1,'2026-11-15','V:Caspe-C.D.','11',true,90,0,0,0,935790),
('940','Monnie, Reynold Bryan',3,'2026-11-15','V:Caspe-C.D.','11',false,9,0,0,0,935790),
('940','Melero Camara, Pablo',4,'2026-11-15','V:Caspe-C.D.','11',false,19,0,0,0,935790),
('940','Diallo, Alassane',5,'2026-11-15','V:Caspe-C.D.','11',true,90,0,0,0,935790),
('940','Gracia Quindos, Danel',6,'2026-11-15','V:Caspe-C.D.','11',true,90,0,0,0,935790),
('940','Bautista Jimenez, Hugo',7,'2026-11-15','V:Caspe-C.D.','11',true,90,0,0,0,935790),
('940','Mendez Gomez, Adria',8,'2026-11-15','V:Caspe-C.D.','11',true,90,0,0,0,935790),
('940','Petit Ortiz, Adria',9,'2026-11-15','V:Caspe-C.D.','11',true,34,0,0,1,935790),
('940','Guillen Gomez, Alberto',10,'2026-11-15','V:Caspe-C.D.','11',true,45,0,0,0,935790),
('940','Beattie Orfila, Erik',11,'2026-11-15','V:Caspe-C.D.','11',false,0,0,0,0,935790),
('940','Andrzejewsk, Alan Pawel',13,'2026-11-15','V:Caspe-C.D.','11',false,0,0,0,0,935790),
('940','Subias Martinez, Alejandro',14,'2026-11-15','V:Caspe-C.D.','11',false,0,0,0,0,935790),
('940','Palacios Hinestroza, Wagner Roberth',15,'2026-11-15','V:Caspe-C.D.','11',false,45,0,0,0,935790),
('940','Arechavaleta Ciordia, Jorge',16,'2026-11-15','V:Caspe-C.D.','11',true,81,0,0,0,935790),
('940','Quiroz Laosa, Alejandro',18,'2026-11-15','V:Caspe-C.D.','11',false,19,0,0,0,935790),
('940','Fernandez Salinas, Daniel',19,'2026-11-15','V:Caspe-C.D.','11',false,0,0,0,0,935790),
('940','Reist, Joaquin',20,'2026-11-15','V:Caspe-C.D.','11',false,0,0,0,0,935790),
('940','Mercadal Camisón, Sergio',21,'2026-11-15','V:Caspe-C.D.','11',true,90,0,0,0,935790),
('940','Beltran Alonso, Marco',22,'2026-11-15','V:Caspe-C.D.','11',true,71,0,0,0,935790),
('940','Calvo Martinez, Pau',24,'2026-11-15','V:Caspe-C.D.','11',true,71,0,0,0,935790),
('5004161','El Khaoua Mustaphi, Rayan',1,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',false,0,0,0,0,970000),
('5004161','Li, Jinxun',2,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',false,0,0,0,0,970000),
('5004161','Chihab Otmane, Hamza',3,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',false,0,1,0,0,970000),
('5004161','Chattaf Sfiri, Mohammed Amine',6,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',true,60,1,0,0,970000),
('5004161','Sghir Braik, Ilyas',7,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',true,60,0,0,0,970000),
('5004161','Amaya Ruano, Isaac',8,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',true,60,0,0,0,970000),
('5004161','Massa Otmane, Mehdi',9,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',true,60,2,0,0,970000),
('5004161','Ziani Zeyeni, Mohamed Yassin',10,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',false,0,0,0,0,970000),
('5004161','Diallo Diallo, Abdoulrahmane',11,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',true,60,0,0,0,970000),
('5004161','Castan Lopez, Jorge',13,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',true,60,0,0,0,970000),
('5004161','Brun Cubeles, Jose',14,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',false,0,0,0,0,970000),
('5004161','Hernandez Paul, Enrique',15,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',true,60,1,0,0,970000),
('5004161','Yang, Haoran',16,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',false,0,2,0,0,970000),
('5004161','Ibnou Bouzid, Ali',17,'2026-11-15','V:Siglo Xxi Oscense Peña los 30 ''D''','5',true,60,0,0,0,970000);

UPDATE fed_stats f SET key = pg_temp.norm_key(f.player_name),
    equipo_id = (SELECT e.id FROM equipos e WHERE e.id_equipo_fed = f.team_id LIMIT 1);

UPDATE fed_stats f SET jugador_id = (
    SELECT p.id FROM plantillas p
    WHERE p.equipo_id = f.equipo_id AND pg_temp.norm_key(p.nombre) = f.key
    ORDER BY p.id LIMIT 1);

UPDATE fed_stats f SET jugador_id = (
    SELECT p.id FROM plantillas p
    WHERE p.equipo_id = f.equipo_id
      AND array_length(string_to_array(pg_temp.norm_key(p.nombre), ' '), 1) >= 2
      AND string_to_array(pg_temp.norm_key(p.nombre), ' ') <@ string_to_array(f.key, ' '))
WHERE f.jugador_id IS NULL AND f.equipo_id IS NOT NULL
  AND (SELECT count(*) FROM plantillas p
       WHERE p.equipo_id = f.equipo_id
         AND array_length(string_to_array(pg_temp.norm_key(p.nombre), ' '), 1) >= 2
         AND string_to_array(pg_temp.norm_key(p.nombre), ' ') <@ string_to_array(f.key, ' ')) = 1;

DELETE FROM estadisticas_partido_jugador
 WHERE origen = 'federacion' AND fed_match_id IN (SELECT DISTINCT fed_match_id FROM fed_stats);

INSERT INTO estadisticas_partido_jugador
    (jugador_id, equipo_id, fed_match_id, fecha, jornada, competicion, rival, es_local,
     titular, minutos, goles, amarillas, rojas)
SELECT DISTINCT ON (f.jugador_id, f.fed_match_id)
       f.jugador_id, f.equipo_id, f.fed_match_id, f.fecha, 'J' || f.jornada, e.competicion,
       substr(f.rival_raw, 3), left(f.rival_raw, 1) = 'L',
       f.titular, f.minutos, f.goles, f.amarillas, f.rojas
FROM fed_stats f JOIN equipos e ON e.id = f.equipo_id
WHERE f.jugador_id IS NOT NULL
ORDER BY f.jugador_id, f.fed_match_id, f.minutos DESC;

-- Goles recibidos (mismo cálculo que 20261109120000, limitado a los partidos nuevos)
WITH actas AS (
    SELECT DISTINCT ON (mid) mid, acta FROM (
        SELECT id_partido_fed AS mid, acta_fed AS acta FROM eventos_calendario
         WHERE acta_fed IS NOT NULL AND id_partido_fed IN (SELECT fed_match_id FROM fed_stats)
        UNION ALL
        SELECT id_partido_fed, acta_fed FROM partidos
         WHERE acta_fed IS NOT NULL AND id_partido_fed IN (SELECT fed_match_id FROM fed_stats)
    ) x ORDER BY mid
),
raw_goals AS (
    SELECT a.mid,
           NULLIF(substring(g->>'minute' from '^\d+'), '')::int AS minute,
           COALESCE((g->>'homeScore')::int, 0) AS hs,
           COALESCE((g->>'awayScore')::int, 0) AS aws
      FROM actas a, jsonb_array_elements(COALESCE(a.acta->'goals', '[]'::jsonb)) g
),
goals AS (
    SELECT mid, minute,
           CASE WHEN hs > COALESCE(lag(hs) OVER w, 0) THEN 'H' ELSE 'A' END AS side
      FROM raw_goals
    WINDOW w AS (PARTITION BY mid ORDER BY minute, hs + aws)
),
entries AS (
    SELECT s.id,
           CASE WHEN s.titular THEN 0 ELSE COALESCE((
               SELECT min(NULLIF(substring(sub->>'minute' from '^\d+'), '')::int)
                 FROM actas a,
                      jsonb_array_elements(COALESCE((a.acta -> CASE WHEN s.es_local THEN 'homeTeam' ELSE 'awayTeam' END) -> 'substitutions', '[]'::jsonb)) sub
                WHERE a.mid = s.fed_match_id
                  AND (pg_temp.norm_key(sub->>'playerIn') = pg_temp.norm_key(p.nombre)
                       OR (array_length(string_to_array(pg_temp.norm_key(p.nombre), ' '), 1) >= 2
                           AND string_to_array(pg_temp.norm_key(p.nombre), ' ') <@ string_to_array(pg_temp.norm_key(sub->>'playerIn'), ' ')))
           ), 0) END AS entrada
      FROM estadisticas_partido_jugador s
      JOIN plantillas p ON p.id = s.jugador_id
     WHERE s.fed_match_id IN (SELECT fed_match_id FROM fed_stats)
)
UPDATE estadisticas_partido_jugador s
   SET goles_recibidos = (
        SELECT count(*) FROM goals g
         WHERE g.mid = s.fed_match_id
           AND g.side = CASE WHEN s.es_local THEN 'A' ELSE 'H' END
           AND g.minute > e.entrada
           AND g.minute <= e.entrada + s.minutos)
  FROM entries e
 WHERE e.id = s.id AND s.minutos > 0;

DO $n$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT DISTINCT team_id, player_name FROM fed_stats WHERE jugador_id IS NULL ORDER BY 1, 2 LOOP
        RAISE NOTICE 'Sin emparejar (equipo fed %): %', r.team_id, r.player_name;
    END LOOP;
END $n$;

DROP TABLE IF EXISTS pg_temp.fed_stats;
END
$mig$;

-- Comprobación: partidos 14-15/11 con acta y marcador
SELECT jornada, local_team, visitor_team, score, status, acta_fed IS NOT NULL AS tiene_acta
  FROM eventos_calendario
 WHERE type = 'Partido' AND club_id = 'escuela-huesca'
   AND date >= '2026-11-13' AND date < '2026-11-16'
 ORDER BY date, jornada;
