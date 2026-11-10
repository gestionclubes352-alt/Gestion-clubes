-- =====================================================================
-- Actualización con la BD federativa del 09/11/2026 (ffv_statsbomb_20261109_170748.dump).
-- SOLO AÑADE LO NUEVO respecto a lo ya cargado; no borra nada ni pisa marcadores manuales.
--   1) Partidos (partidos + eventos_calendario) de los 15 equipos del club 100718:
--        * se insertan los que aún no existen (nuevas jornadas del calendario)
--        * se reprograman fecha/hora/estadio de los que no se han jugado
--        * se rellena marcador y estado de los jugados (solo filas sin marcador)
--   2) Actas federativas (acta_fed) de los 13 partidos del 07 y 08/11/2026.
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
(933186,'Liga Nacional Juvenil Grupo 6','2026-09-06','18:30','J1','San Gregorio Arrabal-C.D.','Juvenil A','San Gregorio Arrabal-C.D.','Juvenil A','La Azucarera-C.M.F.','2-1','Finished'),
(935699,'Tercera RFEF G-17','2026-09-06','12:00','J1','Primer Equipo','Epila-C.F.-A.D.','Epila-C.F.-A.D.','Primer Equipo','Huesca San Jorge-1','0-2','Finished'),
(937348,'Cadete Autonómica Grupo 1 - Norte','2026-09-12','16:00','J1','Oliver-C.D.','Cadete B','Oliver-C.D.','Cadete B','Municipal la Camisera','3-2','Finished'),
(940299,'División Honor Infantil','2026-09-12','17:30','J1','Infantil A','Amistad-U.D.','Amistad-U.D.','Infantil A','HUESCA-Universidad','2-3','Finished'),
(944066,'Copa - Juvenil Preferente Grupo 2 - Huesca','2026-09-12','17:00','J1','Binefar-Futbol Base','Juvenil C','Binefar-Futbol Base','Juvenil C','Binefar Nuevo Los Olmos','3-1','Finished'),
(933195,'Liga Nacional Juvenil Grupo 6','2026-09-13','18:30','J2','Juvenil A','Hernan Cortes Junquera-C.F.','Hernan Cortes Junquera-C.F.','Juvenil A','HUESCA-Universidad','2-1','Finished'),
(935709,'Tercera RFEF G-17','2026-09-13','12:00','J2','Cuarte-C.D.','Primer Equipo','Cuarte-C.D.','Primer Equipo','Cuarte de HUERVA-Estadio Juan Guerrero "El Lobo"','5-2','Finished'),
(938065,'División Honor Cadete Grupo Único','2026-09-13','16:00','J1','Cadete A','Hernan Cortes Junquera-C.F.','Hernan Cortes Junquera-C.F.','Cadete A','HUESCA-Universidad','2-1','Finished'),
(937356,'Cadete Autonómica Grupo 1 - Norte','2026-09-19','12:30','J2','Cadete B','Balsas Picarral-U.D.','Balsas Picarral-U.D.','Cadete B','HUESCA-Universidad','4-1','Finished'),
(938074,'División Honor Cadete Grupo Único','2026-09-19','10:45','J2','Santo Domingo Juventud C.F.','Cadete A','Santo Domingo Juventud C.F.','Cadete A','Joaquin GONZALEZ-1','0-4','Finished'),
(944023,'Copa - Juvenil Preferente Grupo 1 - Huesca','2026-09-19','14:30','J2','Juvenil B','Almudevar A.D.','Almudevar A.D.','Juvenil B','HUESCA-Universidad','4-1','Finished'),
(949710,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-09-19','15:30','J1','Peñas Sariñena-C.D.','Juvenil D','Peñas Sariñena-C.D.','Juvenil D','SARIÑENA-El Carmen','4-2','Finished'),
(933203,'Liga Nacional Juvenil Grupo 6','2026-09-20','16:00','J3','Racing Club Zaragoza','Juvenil A','Racing Club Zaragoza','Juvenil A','Parque Deportivo EBRO-1','0-5','Finished'),
(935718,'Tercera RFEF G-17','2026-09-20','12:00','J3','Primer Equipo','Brea-C.D.','Brea-C.D.','Primer Equipo','Huesca San Jorge-1','1-1','Finished'),
(940308,'División Honor Infantil','2026-09-20','12:30','J2','Stadium Casablanca-C.D. Patatas Gómez','Infantil A','Stadium Casablanca-C.D. Patatas Gómez','Infantil A','St. CASABLANCA-Gregorio Usabel','4-3','Finished'),
(937363,'Cadete Autonómica Grupo 1 - Norte','2026-09-26','12:30','J3','Barbastro-U.D.','Cadete B','Barbastro-U.D.','Cadete B','BARBASTRO-Munic. de los Deportes','1-0','Finished'),
(938082,'División Honor Cadete Grupo Único','2026-09-26','17:40','J3','Cadete A','Huesca-S.D.','Huesca-S.D.','Cadete A','HUESCA-Universidad','1-2','Finished'),
(940316,'División Honor Infantil','2026-09-26','19:30','J3','Infantil A','Cuarte-C.D.','Cuarte-C.D.','Infantil A','HUESCA-Universidad','2-2','Finished'),
(944025,'Copa - Juvenil Preferente Grupo 1 - Huesca','2026-09-26','16:00','J3','Huesca-S.D.','Juvenil B','Huesca-S.D.','Juvenil B','Huesca Base Aragonesa de Futbol-HA Campo 3','0-9','Finished'),
(944057,'Copa - Juvenil Preferente Grupo 2 - Huesca','2026-09-26','10:35','J3','Juvenil C','Monzon Futbol Base - Automoviles Cabrero','Monzon Futbol Base - Automoviles Cabrero','Juvenil C','HUESCA-Universidad','2-3','Finished'),
(949715,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-09-26','15:45','J2','Juvenil D','Sabiñanigo-A.D. Futbol Base','Sabiñanigo-A.D. Futbol Base','Juvenil D','HUESCA-Universidad','4-7','Finished'),
(951449,'Primera Infantil Subgrupo 1 - Huesca','2026-09-26','12:00','J1','Jacetano-C.F. Castiello de Jaca','Infantil C','Jacetano-C.F. Castiello de Jaca','Infantil C','Jaca Oroel','1-5','Finished'),
(951450,'Primera Infantil Subgrupo 1 - Huesca','2026-09-26','09:00','J1','Infantil D','Escuela Futbol Oscense-C.D. P. Castillo Finanweska','Escuela Futbol Oscense-C.D. P. Castillo Finanweska','Infantil D','HUESCA-Universidad','0-4','Finished'),
(952185,'Primera Cadete Grupo 2 - Huesca Occidental','2026-09-26','13:50','J1','Cadete D','Cantera Oscense','Cantera Oscense','Cadete D','HUESCA-Universidad','3-1','Finished'),
(959994,'Segunda Alevín Grupo 5 - Zaragoza','2026-09-26','12:40','J1','Alevín A','Ranillas-At. "A"','Ranillas-At. "A"','Alevín A','HUESCA-Universidad','8-0','Finished'),
(933212,'Liga Nacional Juvenil Grupo 6','2026-09-27','16:00','J4','Juvenil A','Amistad-U.D.','Amistad-U.D.','Juvenil A','HUESCA-Universidad','1-1','Finished'),
(935728,'Tercera RFEF G-17','2026-09-27','12:00','J4','Ejea-S.D.','Primer Equipo','Ejea-S.D.','Primer Equipo','EJEA-Estadio de Luchan','2-1','Finished'),
(933220,'Liga Nacional Juvenil Grupo 6','2026-10-03','16:00','J5','Estadio Miralbueno El Olivar','Juvenil A','Estadio Miralbueno El Olivar','Juvenil A','El OLIVAR-Campo 1','2-1','Finished'),
(937371,'Cadete Autonómica Grupo 1 - Norte','2026-10-03','12:10','J4','Cadete B','Cuarte-C.D.','Cuarte-C.D.','Cadete B','HUESCA-Universidad','1-3','Finished'),
(938091,'División Honor Cadete Grupo Único','2026-10-03','12:00','J4','Binefar-Futbol Base','Cadete A','Binefar-Futbol Base','Cadete A','Binefar Nuevo Los Olmos','0-4','Finished'),
(940325,'División Honor Infantil','2026-10-03','11:00','J4','Huesca-S.D.','Infantil A','Huesca-S.D.','Infantil A','Huesca Base Aragonesa de Futbol-HA Campo 3','7-0','Finished'),
(944028,'Copa - Juvenil Preferente Grupo 1 - Huesca','2026-10-03','13:00','J4','Jacetano-C.F. Arok Sport','Juvenil B','Jacetano-C.F. Arok Sport','Juvenil B','Jaca Oroel','1-2','Finished'),
(944058,'Copa - Juvenil Preferente Grupo 2 - Huesca','2026-10-03','17:30','J4','Juvenil C','Sobrarbe-Escuela Dep.','Sobrarbe-Escuela Dep.','Juvenil C','HUESCA-Universidad','1-0','Finished'),
(949719,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-10-03','17:00','J3','Futbol Base Peñas Oscenses Aridos Boiria','Juvenil D','Futbol Base Peñas Oscenses Aridos Boiria','Juvenil D','Huesca San Jorge-1','6-0','Finished'),
(951451,'Primera Infantil Subgrupo 1 - Huesca','2026-10-03','10:00','J2','Sabiñanigo-A.D. Futbol Base','Infantil D','Sabiñanigo-A.D. Futbol Base','Infantil D','SABIÑANIGO-Joaquín Ascaso','3-1','Finished'),
(951452,'Primera Infantil Subgrupo 1 - Huesca','2026-10-03','09:00','J2','Infantil C','Cantera Oscense','Cantera Oscense','Infantil C','HUESCA-Universidad','7-0','Finished'),
(952204,'Primera Cadete Grupo 2 - Huesca Occidental','2026-10-03','14:00','J2','Cadete D','Santiago Grañen-C.D.','Santiago Grañen-C.D.','Cadete D','HUESCA-Universidad','3-3','Finished'),
(935737,'Tercera RFEF G-17','2026-10-04','12:00','J5','Primer Equipo','Belchite 97-C.D.','Belchite 97-C.D.','Primer Equipo','Huesca San Jorge-1','3-0','Finished'),
(959999,'Segunda Alevín Grupo 5 - Zaragoza','2026-10-04','10:30','J2','Amistad-U.D. "C"','Alevín A','Amistad-U.D. "C"','Alevín A','Juslibol San Pantaleón','2-2','Finished'),
(937378,'Cadete Autonómica Grupo 1 - Norte','2026-10-09','19:30','J5','Huesca-S.D.','Cadete B','Huesca-S.D.','Cadete B','Huesca Base Aragonesa de Futbol-HA Campo 1','2-1','Finished'),
(933229,'Liga Nacional Juvenil Grupo 6','2026-10-10','10:00','J6','Juvenil A','Santo Domingo Juventud C.F.','Santo Domingo Juventud C.F.','Juvenil A','HUESCA-Universidad','2-2','Finished'),
(935747,'Tercera RFEF G-17','2026-10-10','16:30','J6','Illueca-C.F.','Primer Equipo','Illueca-C.F.','Primer Equipo','Illueca Papa Luna',NULL,'Upcoming'),
(938099,'División Honor Cadete Grupo Único','2026-10-10','13:45','J5','Cadete A','Racing Club Zaragoza','Racing Club Zaragoza','Cadete A','HUESCA-Universidad','1-0','Finished'),
(940333,'División Honor Infantil','2026-10-10','12:00','J5','Infantil A','Real Zaragoza S.A.D.','Real Zaragoza S.A.D.','Infantil A','HUESCA-Universidad','0-7','Finished'),
(943019,'Cadete Preferente Grupo 2 - Huesca','2026-10-14','20:00','J1','Cadete C','Almudevar A.D.','Almudevar A.D.','Cadete C','Huesca San Jorge-1','3-0','Finished'),
(935756,'Tercera RFEF G-17','2026-10-17','16:30','J7','Almudevar A.D.','Primer Equipo','Almudevar A.D.','Primer Equipo','Almudevar Virgen de la Corona',NULL,'Upcoming'),
(944031,'Copa - Juvenil Preferente Grupo 1 - Huesca','2026-10-17','12:40','J5','Juvenil B','Peñas Oscenses-C.D. Aramovil','Peñas Oscenses-C.D. Aramovil','Juvenil B','HUESCA-Universidad','2-2','Finished'),
(944063,'Copa - Juvenil Preferente Grupo 2 - Huesca','2026-10-17','12:30','J5','Barbastro-U.D.','Juvenil C','Barbastro-U.D.','Juvenil C','BARBASTRO-Munic. de los Deportes','1-1','Finished'),
(949724,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-10-17','09:00','J4','Juvenil D','Escuela Futbol Oscense-C.D. Humeco "A"','Escuela Futbol Oscense-C.D. Humeco "A"','Juvenil D','HUESCA-Universidad','1-6','Finished'),
(951454,'Primera Infantil Subgrupo 1 - Huesca','2026-10-17','11:30','J3','Sabiñanigo-A.D. Futbol Base','Infantil C','Sabiñanigo-A.D. Futbol Base','Infantil C','SABIÑANIGO-Joaquín Ascaso','0-7','Finished'),
(951456,'Primera Infantil Subgrupo 1 - Huesca','2026-10-17','11:00','J3','Infantil D','Jacetano-C.F. Castiello de Jaca','Jacetano-C.F. Castiello de Jaca','Infantil D','HUESCA-Universidad','3-0','Finished'),
(952192,'Primera Cadete Grupo 2 - Huesca Occidental','2026-10-17','09:00','J3','Escuela Futbol Oscense-C.D. R. Blasco','Cadete D','Escuela Futbol Oscense-C.D. R. Blasco','Cadete D','Huesca San Jorge-2','3-1','Finished'),
(960031,'Segunda Alevín Grupo 5 - Zaragoza','2026-10-17','11:30','J3','Valdefierro-C.D. "B"','Alevín A','Valdefierro-C.D. "B"','Alevín A','Valdefierro-C.M.F.','0-9','Finished'),
(969986,'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','2026-10-17',NULL,'J1','Atsedena','Alevín B','Atsedena','Alevín B',NULL,NULL,'Upcoming'),
(943201,'Infantil Preferente Grupo 2 - Huesca','2026-10-18','09:30','J1','Infantil B','Almudevar A.D.','Almudevar A.D.','Infantil B','HUESCA-Universidad','8-2','Finished'),
(937386,'Cadete Autonómica Grupo 1 - Norte','2026-10-24',NULL,'J6','Cadete B','San Jose-U.D.','San Jose-U.D.','Cadete B','HUESCA-Universidad','4-0','Finished'),
(938108,'División Honor Cadete Grupo Único','2026-10-24',NULL,'J6','Oliver-C.D.','Cadete A','Oliver-C.D.','Cadete A','Municipal la Camisera','3-5','Finished'),
(940342,'División Honor Infantil','2026-10-24',NULL,'J6','Montecarlo-U.D.','Infantil A','Montecarlo-U.D.','Infantil A','José Luis Violeta','3-2','Finished'),
(943020,'Cadete Preferente Grupo 2 - Huesca','2026-10-24','12:45','J2','Sabiñanigo-A.D. Futbol Base','Cadete C','Sabiñanigo-A.D. Futbol Base','Cadete C','SABIÑANIGO-Joaquín Ascaso','2-4','Finished'),
(943202,'Infantil Preferente Grupo 2 - Huesca','2026-10-24',NULL,'J2','Sabiñanigo-A.D. Futbol Base','Infantil B','Sabiñanigo-A.D. Futbol Base','Infantil B','SABIÑANIGO-Joaquín Ascaso','1-4','Finished'),
(944051,'Copa - Juvenil Preferente Grupo 2 - Huesca','2026-10-24','14:20','J6','Juvenil C','Binefar-Futbol Base','Binefar-Futbol Base','Juvenil C','HUESCA-Universidad','3-5','Finished'),
(949728,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-10-24',NULL,'J5','Frula-A.D.','Juvenil D','Frula-A.D.','Juvenil D','Frula El Pedregal','3-0','Finished'),
(951457,'Primera Infantil Subgrupo 1 - Huesca','2026-10-24',NULL,'J4','Infantil D','Infantil C','Ipc la Escuela "A"','Infantil D','HUESCA-Universidad','1-4','Finished'),
(952195,'Primera Cadete Grupo 2 - Huesca Occidental','2026-10-24',NULL,'J4','Cadete D','Jacetano-C.F. Turismo Villanúa','Jacetano-C.F. Turismo Villanúa','Cadete D','HUESCA-Universidad','4-0','Finished'),
(960008,'Segunda Alevín Grupo 5 - Zaragoza','2026-10-24','10:50','J4','Estadio Miralbueno El Olivar "B"','Alevín A','Estadio Miralbueno El Olivar "B"','Alevín A','El OLIVAR-Campo 1','1-8','Finished'),
(969990,'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','2026-10-24',NULL,'J2','Alevín B','Siglo Xxi Oscense Zynk ''C''','Siglo Xxi Oscense Zynk ''C''','Alevín B','HUESCA-Universidad F7-1 (medio campo)','6-1','Finished'),
(933237,'Liga Nacional Juvenil Grupo 6','2026-10-25',NULL,'J7','Fraga-Fútbol Base','Juvenil A','Fraga-Fútbol Base','Juvenil A','Fraga La Estacada','2-2','Finished'),
(935765,'Tercera RFEF G-17','2026-10-25','12:00','J8','Primer Equipo','Andorra-C.F.','Andorra-C.F.','Primer Equipo','Huesca San Jorge-1','2-2','Finished'),
(935773,'Tercera RFEF G-17','2026-10-31','16:00','J9','Tamarite-C.D.J.','Primer Equipo','Tamarite-C.D.J.','Primer Equipo','TAMARITE-La Colomina','1-3','Finished'),
(938116,'División Honor Cadete Grupo Único','2026-10-31','12:00','J7','Cadete A','Teruel-C.D.','Teruel-C.D.','Cadete A','HUESCA-Universidad','2-2','Finished'),
(940350,'División Honor Infantil','2026-10-31','13:40','J7','Infantil A','Teruel-C.D.','Teruel-C.D.','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943033,'Cadete Preferente Grupo 2 - Huesca','2026-10-31','17:15','J3','Cadete C','Peñas Sariñena-C.D.','Peñas Sariñena-C.D.','Cadete C','HUESCA-Universidad','1-2','Finished'),
(943215,'Infantil Preferente Grupo 2 - Huesca','2026-10-31','10:30','J3','Infantil B','Peñas Sariñena-C.D.','Peñas Sariñena-C.D.','Infantil B','HUESCA-Universidad','3-0','Finished'),
(951460,'Primera Infantil Subgrupo 1 - Huesca','2026-10-31','09:00','J5','Infantil C','Escuela Futbol Oscense-C.D. P. Castillo Finanweska','Escuela Futbol Oscense-C.D. P. Castillo Finanweska','Infantil C','HUESCA-Universidad','2-3','Finished'),
(951462,'Primera Infantil Subgrupo 1 - Huesca','2026-10-31','10:30','J5','Cantera Oscense','Infantil D','Cantera Oscense','Infantil D','Huesca San Jorge-2','3-1','Finished'),
(960012,'Segunda Alevín Grupo 5 - Zaragoza','2026-10-31','15:10','J5','Alevín A','Oliver-C.D. "A"','Oliver-C.D. "A"','Alevín A','HUESCA-Universidad','1-1','Finished'),
(969993,'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','2026-10-31','11:00','J3','Jacetano-C.F. Automoviles Serrablo ''C''','Alevín B','Jacetano-C.F. Automoviles Serrablo ''C''','Alevín B','Jaca Oroel F7','1-5','Finished'),
(933246,'Liga Nacional Juvenil Grupo 6','2026-11-01','15:00','J8','Juvenil A','La Litera-Escuela Dep.','La Litera-Escuela Dep.','Juvenil A','HUESCA-Universidad','4-0','Finished'),
(937393,'Cadete Autonómica Grupo 1 - Norte','2026-11-01','12:00','J7','Estadio Miralbueno El Olivar','Cadete B','Estadio Miralbueno El Olivar','Cadete B','El OLIVAR-Campo 1','2-5','Finished'),
(937521,'Cadete Autonómica Grupo 1 - Norte','2026-11-07','12:45','J8','Santo Domingo Juventud C.F.','Cadete B','Santo Domingo Juventud C.F.','Cadete B','Joaquin GONZALEZ-1','3-4','Finished'),
(938125,'División Honor Cadete Grupo Único','2026-11-07',NULL,'J8','Escuela Futbol Oscense-C.D. R. Blasco','Cadete A','Escuela Futbol Oscense-C.D. R. Blasco','Cadete A','Huesca San Jorge-1','1-3','Finished'),
(940359,'División Honor Infantil','2026-11-07',NULL,'J8','Balsas Picarral-U.D.','Infantil A','Balsas Picarral-U.D.','Infantil A','Picarral-C.M.F.','1-2','Finished'),
(943034,'Cadete Preferente Grupo 2 - Huesca','2026-11-07',NULL,'J4','La Litera-Escuela Dep.','Cadete C','La Litera-Escuela Dep.','Cadete C','TAMARITE-La Colomina','3-1','Finished'),
(943216,'Infantil Preferente Grupo 2 - Huesca','2026-11-07','12:00','J4','La Litera-Escuela Dep.','Infantil B','La Litera-Escuela Dep.','Infantil B','TAMARITE-La Colomina','1-1','Finished'),
(944038,'Copa - Juvenil Preferente Grupo 1 - Huesca','2026-11-07','15:00','J7','Almudevar A.D.','Juvenil B','Almudevar A.D.','Juvenil B','Almudevar Virgen de la Corona','0-5','Finished'),
(951464,'Primera Infantil Subgrupo 1 - Huesca','2026-11-07','11:00','J6','Infantil C','Jacetano-C.F. Castiello de Jaca','Jacetano-C.F. Castiello de Jaca','Infantil C','HUESCA-Universidad','11-2','Finished'),
(951465,'Primera Infantil Subgrupo 1 - Huesca','2026-11-07','09:00','J6','Escuela Futbol Oscense-C.D. P. Castillo Finanweska','Infantil D','Escuela Futbol Oscense-C.D. P. Castillo Finanweska','Infantil D','Huesca San Jorge-1','4-0','Finished'),
(952197,'Primera Cadete Grupo 2 - Huesca Occidental','2026-11-07','17:45','J5','Sabiñanigo-A.D. Futbol Base','Cadete D','Sabiñanigo-A.D. Futbol Base','Cadete D','SABIÑANIGO-Joaquín Ascaso','2-2','Finished'),
(960017,'Segunda Alevín Grupo 5 - Zaragoza','2026-11-07','11:00','J6','El Salvador-S.D. "A"','Alevín A','El Salvador-S.D. "A"','Alevín A','El Salvador Quique Oribe-COL.','1-3','Finished'),
(969997,'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','2026-11-07','09:30','J4','Alevín B','Escuela Futbol Oscense-C.D. ''C''','Escuela Futbol Oscense-C.D. ''C''','Alevín B','HUESCA-Universidad F7-1 (medio campo)','5-0','Finished'),
(933255,'Liga Nacional Juvenil Grupo 6','2026-11-08','18:00','J9','Juvenil A','Huesca-S.D.','Huesca-S.D.','Juvenil A','HUESCA-Universidad','1-3','Finished'),
(935782,'Tercera RFEF G-17','2026-11-08','12:00','J10','Primer Equipo','La Almunia-C.D.','La Almunia-C.D.','Primer Equipo','Huesca San Jorge-1','3-1','Finished'),
(933265,'Liga Nacional Juvenil Grupo 6','2026-11-14','18:45','J10','Ebro-C.D.','Juvenil A','Ebro-C.D.','Juvenil A','Almozara (antiguo El Carmen)-C.M.F.',NULL,'Upcoming'),
(937408,'Cadete Autonómica Grupo 1 - Norte','2026-11-14','15:00','J9','Valdefierro-C.D.','Cadete B','Valdefierro-C.D.','Cadete B','Valdefierro-C.M.F.',NULL,'Upcoming'),
(938133,'División Honor Cadete Grupo Único','2026-11-14',NULL,'J9','Cadete A','Amistad-U.D.','Amistad-U.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(938253,'División Honor Cadete Grupo Único','2026-11-14',NULL,'J24','Amistad-U.D.','Cadete A','Amistad-U.D.','Cadete A','Juslibol San Pantaleón',NULL,'Upcoming'),
(940367,'División Honor Infantil','2026-11-14',NULL,'J9','Infantil A','Hernan Cortes Junquera-C.F.','Hernan Cortes Junquera-C.F.','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943047,'Cadete Preferente Grupo 2 - Huesca','2026-11-14',NULL,'J5','Cadete C','Binefar-Futbol Base','Binefar-Futbol Base','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(943229,'Infantil Preferente Grupo 2 - Huesca','2026-11-14',NULL,'J5','Infantil B','Binefar-Futbol Base','Binefar-Futbol Base','Infantil B','HUESCA-Universidad',NULL,'Upcoming'),
(943320,'Infantil Preferente Grupo 2 - Huesca','2026-11-14','15:30','J5','Binefar-Futbol Base','Infantil B','Binefar-Futbol Base','Infantil B','Binefar Nuevo Los Olmos',NULL,'Upcoming'),
(949737,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-11-14','17:30','J7','Peñas Oscenses-C.D. Hoscafrost "A"','Juvenil D','Peñas Oscenses-C.D. Hoscafrost "A"','Juvenil D','Huesca San Jorge-2',NULL,'Upcoming'),
(951466,'Primera Infantil Subgrupo 1 - Huesca','2026-11-14',NULL,'J7','Infantil D','Sabiñanigo-A.D. Futbol Base','Sabiñanigo-A.D. Futbol Base','Infantil D','HUESCA-Universidad',NULL,'Upcoming'),
(951467,'Primera Infantil Subgrupo 1 - Huesca','2026-11-14',NULL,'J7','Cantera Oscense','Infantil C','Cantera Oscense','Infantil C','Huesca San Jorge-1',NULL,'Upcoming'),
(952200,'Primera Cadete Grupo 2 - Huesca Occidental','2026-11-14',NULL,'J6','Cantera Oscense','Cadete D','Cantera Oscense','Cadete D','Huesca San Jorge-1',NULL,'Upcoming'),
(960021,'Segunda Alevín Grupo 5 - Zaragoza','2026-11-14',NULL,'J7','Alevín A','San Mateo-C.D.','San Mateo-C.D.','Alevín A','HUESCA-Universidad',NULL,'Upcoming'),
(960049,'Segunda Alevín Grupo 5 - Zaragoza','2026-11-14',NULL,'J7','San Mateo-C.D.','Alevín A','San Mateo-C.D.','Alevín A','San Mateo de Gº-Sta.Engracia',NULL,'Upcoming'),
(970000,'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','2026-11-14',NULL,'J5','Siglo Xxi Oscense Peña los 30 ''D''','Alevín B','Siglo Xxi Oscense Peña los 30 ''D''','Alevín B','HUESCA-C.Deportiva F7-1',NULL,'Upcoming'),
(935790,'Tercera RFEF G-17','2026-11-15','16:30','J11','Caspe-C.D.','Primer Equipo','Caspe-C.D.','Primer Equipo','Caspe Los Rosales',NULL,'Upcoming'),
(937416,'Cadete Autonómica Grupo 1 - Norte','2026-11-21',NULL,'J10','Cadete B','Amistad-U.D.','Amistad-U.D.','Cadete B','HUESCA-Universidad',NULL,'Upcoming'),
(938142,'División Honor Cadete Grupo Único','2026-11-21',NULL,'J10','Stadium Casablanca-C.D.','Cadete A','Stadium Casablanca-C.D.','Cadete A','St. CASABLANCA-Gregorio Usabel',NULL,'Upcoming'),
(940376,'División Honor Infantil','2026-11-21',NULL,'J10','Santo Domingo Juventud C.F.','Infantil A','Santo Domingo Juventud C.F.','Infantil A','Joaquin GONZALEZ-1',NULL,'Upcoming'),
(943048,'Cadete Preferente Grupo 2 - Huesca','2026-11-21',NULL,'J6','Sobrarbe-Escuela Dep.','Cadete C','Sobrarbe-Escuela Dep.','Cadete C','Tierrantona El Comellón',NULL,'Upcoming'),
(943230,'Infantil Preferente Grupo 2 - Huesca','2026-11-21',NULL,'J6','Sobrarbe-Escuela Dep.','Infantil B','Sobrarbe-Escuela Dep.','Infantil B','Ainsa Municipal El Cinca',NULL,'Upcoming'),
(949742,'Primera Juvenil Grupo 2 - Huesca Occidental','2026-11-21',NULL,'J8','Santiago Grañen-C.D.','Juvenil D','Santiago Grañen-C.D.','Juvenil D','Grañen Municipal',NULL,'Upcoming'),
(951469,'Primera Infantil Subgrupo 1 - Huesca','2026-11-21',NULL,'J8','Infantil C','Sabiñanigo-A.D. Futbol Base','Sabiñanigo-A.D. Futbol Base','Infantil C','HUESCA-Universidad',NULL,'Upcoming'),
(951471,'Primera Infantil Subgrupo 1 - Huesca','2026-11-21','11:15','J8','Jacetano-C.F. Castiello de Jaca','Infantil D','Jacetano-C.F. Castiello de Jaca','Infantil D','Jaca Oroel',NULL,'Upcoming'),
(952189,'Primera Cadete Grupo 2 - Huesca Occidental','2026-11-21',NULL,'J7','Santiago Grañen-C.D.','Cadete D','Santiago Grañen-C.D.','Cadete D','Grañen Municipal',NULL,'Upcoming'),
(960022,'Segunda Alevín Grupo 5 - Zaragoza','2026-11-21','13:50','J8','Ranillas-At. "A"','Alevín A','Ranillas-At. "A"','Alevín A','Nuevo Ranillas-C.M.F.',NULL,'Upcoming'),
(970004,'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental','2026-11-21',NULL,'J6','Alevín B','Peñas Oscenses-C.D. Ecomputer/La10ma','Peñas Oscenses-C.D. Ecomputer/La10ma','Alevín B','HUESCA-Universidad F7-1 (medio campo)',NULL,'Upcoming'),
(933274,'Liga Nacional Juvenil Grupo 6','2026-11-22',NULL,'J11','Juvenil A','Calamocha-C.F.','Calamocha-C.F.','Juvenil A','HUESCA-Universidad',NULL,'Upcoming'),
(935799,'Tercera RFEF G-17','2026-11-22','12:00','J12','Primer Equipo','Robres-C.D.','Robres-C.D.','Primer Equipo','Huesca San Jorge-1',NULL,'Upcoming'),
(938150,'División Honor Cadete Grupo Único','2026-11-28',NULL,'J11','Real Zaragoza S.A.D.','Cadete A','Real Zaragoza S.A.D.','Cadete A','Ciudad Deportiva R.Z. - 1',NULL,'Upcoming'),
(940384,'División Honor Infantil','2026-11-28',NULL,'J11','Racing Club Zaragoza','Infantil A','Racing Club Zaragoza','Infantil A','Parque Deportivo EBRO-1',NULL,'Upcoming'),
(943061,'Cadete Preferente Grupo 2 - Huesca','2026-11-28',NULL,'J7','Cadete C','Jacetano-C.F. Peña Enta Deban','Jacetano-C.F. Peña Enta Deban','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(938158,'División Honor Cadete Grupo Único','2026-12-05',NULL,'J12','Cadete A','San Agustin-C.D.','San Agustin-C.D.','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940392,'División Honor Infantil','2026-12-05',NULL,'J12','Infantil A','Fraga-Fútbol Base','Fraga-Fútbol Base','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943062,'Cadete Preferente Grupo 2 - Huesca','2026-12-05',NULL,'J8','Peñas Oscenses-C.D. Climetel','Cadete C','Peñas Oscenses-C.D. Climetel','Cadete C','Huesca San Jorge-1',NULL,'Upcoming'),
(938165,'División Honor Cadete Grupo Único','2026-12-12',NULL,'J13','Montecarlo-U.D.','Cadete A','Montecarlo-U.D.','Cadete A','José Luis Violeta',NULL,'Upcoming'),
(940399,'División Honor Infantil','2026-12-12',NULL,'J13','Oliver-C.D.','Infantil A','Oliver-C.D.','Infantil A','Municipal la Camisera',NULL,'Upcoming'),
(943075,'Cadete Preferente Grupo 2 - Huesca','2026-12-12',NULL,'J9','Cadete C','Futbol Base Peñas Oscenses Inmobiliaria Buil','Futbol Base Peñas Oscenses Inmobiliaria Buil','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(943930,'Juvenil Preferente Grupo 2 - Huesca','2026-12-12',NULL,'J1','Juvenil C','Sobrarbe-Escuela Dep.','Sobrarbe-Escuela Dep.','Juvenil C','HUESCA-Universidad',NULL,'Upcoming'),
(943931,'Juvenil Preferente Grupo 2 - Huesca','2026-12-12',NULL,'J1','Monzon Futbol Base - Automoviles Cabrero','Juvenil B','Monzon Futbol Base - Automoviles Cabrero','Juvenil B','Monzon Isidro Calderón',NULL,'Upcoming'),
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
(943138,'Cadete Preferente Grupo 2 - Huesca','2027-03-06',NULL,'J18','Binefar-Futbol Base','Cadete C','Binefar-Futbol Base','Cadete C','Binefar Nuevo Los Olmos',NULL,'Upcoming'),
(938236,'División Honor Cadete Grupo Único','2027-03-13',NULL,'J22','Teruel-C.D.','Cadete A','Teruel-C.D.','Cadete A','TERUEL-Luis Milla',NULL,'Upcoming'),
(940470,'División Honor Infantil','2027-03-13',NULL,'J22','Teruel-C.D.','Infantil A','Teruel-C.D.','Infantil A','TERUEL-Luis Milla',NULL,'Upcoming'),
(943139,'Cadete Preferente Grupo 2 - Huesca','2027-03-13',NULL,'J19','Cadete C','Sobrarbe-Escuela Dep.','Sobrarbe-Escuela Dep.','Cadete C','HUESCA-Universidad',NULL,'Upcoming'),
(938245,'División Honor Cadete Grupo Único','2027-03-20',NULL,'J23','Cadete A','Escuela Futbol Oscense-C.D. R. Blasco','Escuela Futbol Oscense-C.D. R. Blasco','Cadete A','HUESCA-Universidad',NULL,'Upcoming'),
(940479,'División Honor Infantil','2027-03-20',NULL,'J23','Infantil A','Balsas Picarral-U.D.','Balsas Picarral-U.D.','Infantil A','HUESCA-Universidad',NULL,'Upcoming'),
(943152,'Cadete Preferente Grupo 2 - Huesca','2027-03-20',NULL,'J20','Jacetano-C.F. Peña Enta Deban','Cadete C','Jacetano-C.F. Peña Enta Deban','Cadete C','Jaca Oroel',NULL,'Upcoming'),
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

-- 2) Actas de los partidos del 07 y 08/11/2026
DROP TABLE IF EXISTS pg_temp._actas_fed;
CREATE TEMP TABLE _actas_fed (fecha DATE, jornada TEXT, local TEXT, visitante TEXT, mid INTEGER, acta JSONB);
INSERT INTO _actas_fed VALUES
('2026-11-07','J8','Santo Domingo Juventud C.F.','Cadete B',937521,'{"codActa": "937521", "time": "12:45", "stadium": "Joaquin GONZALEZ-1", "city": "Madrid", "homeTeam": {"name": "Santo Domingo Juventud C.F.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Equipos/00100_0000041942_santo d.juventud.jpg?nova=1", "coach": "Mballo, Sadou", "starters": [{"name": "Compadre Thomas, Alvaro", "dorsal": 26}, {"name": "Calzon Masina, Thiago", "dorsal": 31}, {"name": "Asensio Latorre, Enzo", "dorsal": 34}, {"name": "Aranda Fernandez, Jorge", "dorsal": 35}, {"name": "Aguilar Icaza, Jose Alfredo", "dorsal": 37}, {"name": "Ejea Baena, Fabio", "dorsal": 38}, {"name": "Benslimane Benhammou, Issam", "dorsal": 40}, {"name": "Gasca Gracia, Lucas", "dorsal": 41}, {"name": "Romero Claveria, Hugo", "dorsal": 44}, {"name": "Forner Calvo, Francisco", "dorsal": 47}, {"name": "Tabuenca Pueyo, Daniel", "dorsal": 49}], "substitutes": [{"name": "Marco Jimenez, Yago", "dorsal": 27}, {"name": "Pardo Balduque, Adrian", "dorsal": 29}, {"name": "Baeta Serrano, Daniel", "dorsal": 30}, {"name": "Roglan Bosque, Hector", "dorsal": 36}, {"name": "Royo Bueno, Oscar", "dorsal": 39}], "substitutions": [{"minute": "57", "playerOut": "Ejea Baena, Fabio", "playerIn": "Pardo Balduque, Adrian"}, {"minute": "57", "playerOut": "Benslimane Benhammou, Issam", "playerIn": "Baeta Serrano, Daniel"}, {"minute": "69", "playerOut": "Gasca Gracia, Lucas", "playerIn": "Roglan Bosque, Hector"}, {"minute": "69", "playerOut": "Asensio Latorre, Enzo", "playerIn": "Royo Bueno, Oscar"}], "cards": [{"minute": "28", "player": "Asensio Latorre, Enzo", "type": "yellow"}, {"minute": "51", "player": "Aguilar Icaza, Jose Alfredo", "type": "yellow"}, {"minute": "80", "player": "Mballo, Sadou", "type": "yellow"}, {"minute": "80", "player": "Roglan Bosque, Hector", "type": "yellow"}]}, "awayTeam": {"name": "Cadete B", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Plumed Sancho, Francisco", "starters": [{"name": "Ehara, Haruto", "dorsal": 2}, {"name": "Pisa Palacin, Eric", "dorsal": 4}, {"name": "Palomeque Samperiz, Simon", "dorsal": 5}, {"name": "Lapshin, Luka", "dorsal": 6}, {"name": "Khouta Nihah, Rayan", "dorsal": 7}, {"name": "Torcal Encontra, Daniel", "dorsal": 9}, {"name": "Mellado Mingarro, Alejo", "dorsal": 10}, {"name": "Casas da Silva, Gabriel", "dorsal": 11}, {"name": "Addo, Desmond Donald", "dorsal": 13}, {"name": "Saldivar Lagraña, Jose Angel", "dorsal": 14}, {"name": "Calavia Otin, Miguel", "dorsal": 17}], "substitutes": [{"name": "Kostiuchik, Artur", "dorsal": 3}, {"name": "Huerva Loriente, Iván", "dorsal": 8}, {"name": "Mallén Cruz, Marco", "dorsal": 15}, {"name": "Ardanuy Ramon, Hugo", "dorsal": 18}, {"name": "Boonparsert, Phakin Chalermakas", "dorsal": 19}, {"name": "Maestre Sanchez, Manuel", "dorsal": 20}, {"name": "Diallo Diallo, Ibrahima Tanou", "dorsal": 22}], "substitutions": [{"minute": "51", "playerOut": "Calavia Otin, Miguel", "playerIn": "Kostiuchik, Artur"}, {"minute": "64", "playerOut": "Pisa Palacin, Eric", "playerIn": "Huerva Loriente, Iván"}, {"minute": "64", "playerOut": "Saldivar Lagraña, Jose Angel", "playerIn": "Diallo Diallo, Ibrahima Tanou"}], "cards": []}, "score": "3-4", "homeScore": 3, "awayScore": 4, "goals": [{"minute": "7", "player": "Calzon Masina, Thiago", "homeScore": 1, "awayScore": 0}, {"minute": "10", "player": "Tabuenca Pueyo, Daniel", "homeScore": 2, "awayScore": 0}, {"minute": "27", "player": "Palomeque Samperiz, Simon", "homeScore": 2, "awayScore": 1}, {"minute": "49", "player": "Torcal Encontra, Daniel", "homeScore": 2, "awayScore": 2}, {"minute": "51", "player": "Tabuenca Pueyo, Daniel", "homeScore": 3, "awayScore": 2}, {"minute": "66", "player": "Khouta Nihah, Rayan", "homeScore": 3, "awayScore": 3}, {"minute": "73", "player": "Casas da Silva, Gabriel", "homeScore": 3, "awayScore": 4}], "referees": ["Carrillo Cabeza, Alejandro"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J8','Escuela Futbol Oscense-C.D. R. Blasco','Cadete A',938125,'{"codActa": "938125", "time": "", "stadium": "Huesca San Jorge-1", "city": "Huesca", "homeTeam": {"name": "Escuela Futbol Oscense-C.D. R. Blasco", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000354800_efo.jpg?nova=1", "coach": "Buil Cavero, Alberto", "starters": [{"name": "Airas Morlans, Hugo", "dorsal": 5}, {"name": "Vinue Olles, Jorge", "dorsal": 7}, {"name": "Goh Bougma, Rodric", "dorsal": 9}, {"name": "Lopez Pastor, Aitor", "dorsal": 10}, {"name": "Bonet Bosque, Hector", "dorsal": 13}, {"name": "Labadia Ortega, Gonzalo", "dorsal": 14}, {"name": "Artigas Nogueras, Daniel", "dorsal": 16}, {"name": "Ladiane Thiongane, Maodo", "dorsal": 20}, {"name": "De Diego Escartin, Mateo", "dorsal": 21}, {"name": "Londoño Lopez, Santiago", "dorsal": 22}, {"name": "Abadias Puyuelo, Lorien", "dorsal": 23}], "substitutes": [{"name": "Tricas Gimenez, Pablo", "dorsal": 2}, {"name": "Santolaria Peralta, Nicolas", "dorsal": 3}, {"name": "Gallego Jordan, Javier", "dorsal": 4}, {"name": "Guliyev, Yavuz", "dorsal": 8}, {"name": "Oumeziane Jemi, Rayan", "dorsal": 11}, {"name": "Guillén Muzás, Lorenzo", "dorsal": 19}, {"name": "Rodriguez Salvatierra, Jorge", "dorsal": 25}], "substitutions": [{"minute": "54", "playerOut": "Ladiane Thiongane, Maodo", "playerIn": "Santolaria Peralta, Nicolas"}, {"minute": "54", "playerOut": "Lopez Pastor, Aitor", "playerIn": "Guliyev, Yavuz"}, {"minute": "54", "playerOut": "Airas Morlans, Hugo", "playerIn": "Oumeziane Jemi, Rayan"}, {"minute": "63", "playerOut": "Goh Bougma, Rodric", "playerIn": "Guillén Muzás, Lorenzo"}, {"minute": "66", "playerOut": "Artigas Nogueras, Daniel", "playerIn": "Gallego Jordan, Javier"}, {"minute": "66", "playerOut": "Londoño Lopez, Santiago", "playerIn": "Tricas Gimenez, Pablo"}], "cards": [{"minute": "20", "player": "Buil Cavero, Alberto", "type": "yellow"}, {"minute": "39", "player": "Airas Morlans, Hugo", "type": "yellow"}, {"minute": "59", "player": "Londoño Lopez, Santiago", "type": "yellow"}, {"minute": "79", "player": "Labadia Ortega, Gonzalo", "type": "yellow"}, {"minute": "79", "player": "Abadias Puyuelo, Lorien", "type": "yellow"}]}, "awayTeam": {"name": "Cadete A", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Alejandre Clemente, Ruben", "starters": [{"name": "Kapitan, Kirill", "dorsal": 5}, {"name": "Viñuales Rodriguez, Adrian", "dorsal": 6}, {"name": "Ahmed, Yusuf Abdifatah", "dorsal": 7}, {"name": "Bachiri Bartal, Osama", "dorsal": 8}, {"name": "Abadias Otal, Daniel", "dorsal": 9}, {"name": "Aziaba, Ryan", "dorsal": 10}, {"name": "Bielsa Alonso, David", "dorsal": 12}, {"name": "Svilar, Luka", "dorsal": 17}, {"name": "Rasmussen, Felix Boje", "dorsal": 19}, {"name": "Vogelsberg, Matthew Stephen", "dorsal": 22}, {"name": "Espurz Redon, Adrian", "dorsal": 26}], "substitutes": [{"name": "Laplaza Arnal, Angel", "dorsal": 1}, {"name": "De los Santos Saviñon, Jonedwin Gabriel", "dorsal": 3}, {"name": "Bardaji Bretcanu, Flavio", "dorsal": 4}, {"name": "Rodriguez Lancho, Javier", "dorsal": 11}, {"name": "Lagüéns Angarón, Jorge", "dorsal": 21}], "substitutions": [{"minute": "58", "playerOut": "Abadias Otal, Daniel", "playerIn": "Rodriguez Lancho, Javier"}, {"minute": "66", "playerOut": "Aziaba, Ryan", "playerIn": "Lagüéns Angarón, Jorge"}, {"minute": "77", "playerOut": "Viñuales Rodriguez, Adrian", "playerIn": "Bardaji Bretcanu, Flavio"}], "cards": []}, "score": "1-3", "homeScore": 1, "awayScore": 3, "goals": [{"minute": "29", "player": "Vinue Olles, Jorge", "homeScore": 1, "awayScore": 0}, {"minute": "35", "player": "Aziaba, Ryan", "homeScore": 1, "awayScore": 1}, {"minute": "52", "player": "Vogelsberg, Matthew Stephen", "homeScore": 1, "awayScore": 2}, {"minute": "69", "player": "Rodriguez Lancho, Javier", "homeScore": 1, "awayScore": 3}], "referees": ["Royan Garcia, Alberto"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J8','Balsas Picarral-U.D.','Infantil A',940359,'{"codActa": "940359", "time": "", "stadium": "Picarral-C.M.F.", "city": "Zaragoza", "homeTeam": {"name": "Balsas Picarral-U.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000391775_escudo.jpg?nova=1", "coach": "No presenta", "starters": [{"name": "Miana Cembellin, Daniel", "dorsal": 1}, {"name": "Barriendos Amella, Diego", "dorsal": 2}, {"name": "Perez Horna, Samuel", "dorsal": 4}, {"name": "Acosta Geraldo, Jackson Yoriel", "dorsal": 5}, {"name": "Salvatierra Marin, Pablo", "dorsal": 6}, {"name": "Fleta Lenguas, Daniel", "dorsal": 7}, {"name": "Flores Ferreres, Daniel", "dorsal": 8}, {"name": "Cornea Marin, Lucas Daniel", "dorsal": 9}, {"name": "Aguilo Andres, Leo", "dorsal": 10}, {"name": "Perez Licona, Enoc Isaac", "dorsal": 15}, {"name": "Vinacua Martinez, Santiago", "dorsal": 17}], "substitutes": [{"name": "Arilla Ramos, Jorge", "dorsal": 3}, {"name": "Eleyatt Ariza, Rafael", "dorsal": 11}, {"name": "Rubio Sadaba, Javier", "dorsal": 13}, {"name": "Vela Segura, Martin", "dorsal": 14}, {"name": "Guirado Marco, Mateo", "dorsal": 20}, {"name": "Salas Blanco, Jorge Miguel", "dorsal": 21}], "substitutions": [{"minute": "18", "playerOut": "Cornea Marin, Lucas Daniel", "playerIn": "Salas Blanco, Jorge Miguel"}, {"minute": "43", "playerOut": "Perez Licona, Enoc Isaac", "playerIn": "Vela Segura, Martin"}, {"minute": "65", "playerOut": "Fleta Lenguas, Daniel", "playerIn": "Eleyatt Ariza, Rafael"}, {"minute": "65", "playerOut": "Acosta Geraldo, Jackson Yoriel", "playerIn": "Guirado Marco, Mateo"}, {"minute": "65", "playerOut": "Aguilo Andres, Leo", "playerIn": "Arilla Ramos, Jorge"}], "cards": []}, "awayTeam": {"name": "Infantil A", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Plumed Sancho, Francisco", "starters": [{"name": "Ibrahim, Anthony Daniel", "dorsal": 3}, {"name": "Diallo Diallo, Nasirou", "dorsal": 4}, {"name": "Verman, Prashaan", "dorsal": 5}, {"name": "Alvarado Sevilla, Jonathan David", "dorsal": 6}, {"name": "Ramirez, Elian", "dorsal": 7}, {"name": "Gimenez Lopez, Cesar", "dorsal": 8}, {"name": "Escartin Gracia, Alexis", "dorsal": 9}, {"name": "Roman Lasilla, Juan", "dorsal": 10}, {"name": "Shibata, Kai", "dorsal": 11}, {"name": "Guevara Garofalo, Cesar Andrés", "dorsal": 12}, {"name": "Dmytryk, Bohdan", "dorsal": 13}], "substitutes": [{"name": "Rubio Royo, Hugo", "dorsal": 1}, {"name": "Monesma Yebra, Adrian", "dorsal": 2}, {"name": "Lample Sanagustin, Enzo", "dorsal": 14}, {"name": "Olano Espiau, Martin", "dorsal": 15}, {"name": "Preciado Luna, Ronald Daniel", "dorsal": 17}, {"name": "Armas Villarroel, Andrés", "dorsal": 19}, {"name": "So, Chun Lam", "dorsal": 21}], "substitutions": [{"minute": "35", "playerOut": "Ramirez, Elian", "playerIn": "Preciado Luna, Ronald Daniel"}, {"minute": "43", "playerOut": "Shibata, Kai", "playerIn": "Armas Villarroel, Andrés"}, {"minute": "48", "playerOut": "Diallo Diallo, Nasirou", "playerIn": "Monesma Yebra, Adrian"}, {"minute": "61", "playerOut": "Roman Lasilla, Juan", "playerIn": "Olano Espiau, Martin"}], "cards": [{"minute": "26", "player": "Ibrahim, Anthony Daniel", "type": "yellow"}]}, "score": "1-2", "homeScore": 1, "awayScore": 2, "goals": [{"minute": "1", "player": "Ramirez, Elian", "homeScore": 0, "awayScore": 1}, {"minute": "28", "player": "Salvatierra Marin, Pablo", "homeScore": 1, "awayScore": 1}, {"minute": "52", "player": "Verman, Prashaan", "homeScore": 1, "awayScore": 2}], "referees": ["Makoudi , Anas"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J4','La Litera-Escuela Dep.','Cadete C',943034,'{"codActa": "943034", "time": "", "stadium": "TAMARITE-La Colomina", "city": "Tamarite de Litera", "homeTeam": {"name": "La Litera-Escuela Dep.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000157222_ESCUDO_E.D._LA_LITERA.jpg?nova=1", "coach": "Fauria Bendicho, Antonio", "starters": [{"name": "Sans Ramos, Josep", "dorsal": 3}, {"name": "Ondoño Castells, Lucas", "dorsal": 4}, {"name": "Sobrevía Balagueró, Jon", "dorsal": 5}, {"name": "Tomas Soria, Imanol", "dorsal": 6}, {"name": "Sarr, Alioune", "dorsal": 7}, {"name": "Sanuwo Damba, Musa", "dorsal": 8}, {"name": "Morancho Ariño, Bruno", "dorsal": 10}, {"name": "Blanc Brualla, Biel", "dorsal": 13}, {"name": "Manga Sambu, Edmilson Inguesso", "dorsal": 19}, {"name": "Ouatiki, Abdelali", "dorsal": 22}, {"name": "Touray, Mahamed", "dorsal": 23}], "substitutes": [{"name": "Ribera Dejuan, Iker", "dorsal": 1}, {"name": "Nimaga Sanneh, Ali", "dorsal": 2}, {"name": "Raluy Moles, Cesc", "dorsal": 16}, {"name": "Fidalgo Palacin, Guillermo", "dorsal": 17}, {"name": "Carrera Puyal, Raul", "dorsal": 18}, {"name": "Sarr, Mouhamed", "dorsal": 21}, {"name": "Reina Duran, Rafael", "dorsal": 25}], "substitutions": [{"minute": "40", "playerOut": "Blanc Brualla, Biel", "playerIn": "Ribera Dejuan, Iker"}, {"minute": "40", "playerOut": "Ouatiki, Abdelali", "playerIn": "Raluy Moles, Cesc"}, {"minute": "40", "playerOut": "Manga Sambu, Edmilson Inguesso", "playerIn": "Nimaga Sanneh, Ali"}, {"minute": "65", "playerOut": "Sarr, Alioune", "playerIn": "Fidalgo Palacin, Guillermo"}, {"minute": "72", "playerOut": "Morancho Ariño, Bruno", "playerIn": "Carrera Puyal, Raul"}, {"minute": "72", "playerOut": "Touray, Mahamed", "playerIn": "Sarr, Mouhamed"}], "cards": [{"minute": "28", "player": "Ouatiki, Abdelali", "type": "yellow"}, {"minute": "55", "player": "Sobrevía Balagueró, Jon", "type": "yellow"}, {"minute": "61", "player": "Sarr, Alioune", "type": "yellow"}]}, "awayTeam": {"name": "Cadete C", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Eroles Prats, Ivan", "starters": [{"name": "Samitier Laliena, Hector", "dorsal": 1}, {"name": "Hernandez Valentin, Pablo", "dorsal": 2}, {"name": "Benedicto Barrio, Bruno", "dorsal": 3}, {"name": "Romero Banzo, Alejandro", "dorsal": 4}, {"name": "Aragones Allue, Francisco Javier", "dorsal": 5}, {"name": "Malo Vento, Sergio", "dorsal": 6}, {"name": "Sissoho, Omar Fai", "dorsal": 9}, {"name": "Plaza Daga, Daren", "dorsal": 10}, {"name": "Pérez Gascon, Daniel", "dorsal": 15}, {"name": "Vitales Til, Mateo", "dorsal": 16}, {"name": "Cavero Blanco, Ivan", "dorsal": 19}], "substitutes": [{"name": "Balanta Zambrano, Alan Steven", "dorsal": 7}, {"name": "Tellechea Perez, Marcos", "dorsal": 8}, {"name": "Chattaf Sfiri, Fahd", "dorsal": 11}, {"name": "Pineda Palacios, David Alessandro", "dorsal": 12}, {"name": "Plasin del Campo, Aritz", "dorsal": 17}, {"name": "Susín Gracia, Urbez", "dorsal": 21}, {"name": "Kaber, Adam", "dorsal": 22}], "substitutions": [{"minute": "52", "playerOut": "Vitales Til, Mateo", "playerIn": "Tellechea Perez, Marcos"}, {"minute": "52", "playerOut": "Cavero Blanco, Ivan", "playerIn": "Balanta Zambrano, Alan Steven"}, {"minute": "65", "playerOut": "Pérez Gascon, Daniel", "playerIn": "Pineda Palacios, David Alessandro"}, {"minute": "65", "playerOut": "Malo Vento, Sergio", "playerIn": "Susín Gracia, Urbez"}, {"minute": "68", "playerOut": "Benedicto Barrio, Bruno", "playerIn": "Plasin del Campo, Aritz"}, {"minute": "68", "playerOut": "Sissoho, Omar Fai", "playerIn": "Kaber, Adam"}, {"minute": "68", "playerOut": "Romero Banzo, Alejandro", "playerIn": "Chattaf Sfiri, Fahd"}], "cards": []}, "score": "3-1", "homeScore": 3, "awayScore": 1, "goals": [{"minute": "14", "player": "Plaza Daga, Daren", "homeScore": 0, "awayScore": 1}, {"minute": "36", "player": "Sanuwo Damba, Musa", "homeScore": 1, "awayScore": 1}, {"minute": "62", "player": "Touray, Mahamed", "homeScore": 2, "awayScore": 1}, {"minute": "79", "player": "Sanuwo Damba, Musa", "homeScore": 3, "awayScore": 1}], "referees": ["Mata Prada, Marcelo"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J4','La Litera-Escuela Dep.','Infantil B',943216,'{"codActa": "943216", "time": "12:00", "stadium": "TAMARITE-La Colomina", "city": "Tamarite de Litera", "homeTeam": {"name": "La Litera-Escuela Dep.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000157222_ESCUDO_E.D._LA_LITERA.jpg?nova=1", "coach": "Angurell Garreta, Aleix", "starters": [{"name": "Fofana Ceesay, Mahamadou Ceesay", "dorsal": 1}, {"name": "Bendicho Benedico, Hugo", "dorsal": 2}, {"name": "Gaudens Brieba, Marc", "dorsal": 4}, {"name": "Falceto Martín, Sergio", "dorsal": 5}, {"name": "Perat Torres, Oriol", "dorsal": 6}, {"name": "Cuy Alos, Raul", "dorsal": 8}, {"name": "Faro Anaya, Telmo", "dorsal": 10}, {"name": "Citoler Ferrer, Acher", "dorsal": 11}, {"name": "Coulibaly Coulibaly, Mohamed Madani", "dorsal": 14}, {"name": "Jamil, Saad", "dorsal": 16}, {"name": "Serra Lax, Alex", "dorsal": 17}], "substitutes": [{"name": "Marquijana Kyryllova, Maxim", "dorsal": 3}, {"name": "El Hajjy, Saad", "dorsal": 7}, {"name": "Lagridi Fathallah, Said", "dorsal": 12}, {"name": "Faye, Boubacar", "dorsal": 18}, {"name": "Dalmau Capdevila, Héctor", "dorsal": 19}, {"name": "Vargas Alvarez, Gonzalo", "dorsal": 20}, {"name": "Magaña Pociello, Jorge", "dorsal": 23}], "substitutions": [], "cards": [{"minute": "32", "player": "Dalmau Capdevila, Héctor", "type": "yellow"}]}, "awayTeam": {"name": "Infantil B", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "No presenta", "starters": [{"name": "Barba Santolaria, Javier", "dorsal": 3}, {"name": "Lardies Campo, Marco", "dorsal": 5}, {"name": "Pascual Fernandes, Saúl", "dorsal": 7}, {"name": "Mashal, Kareem Ibraheem", "dorsal": 9}, {"name": "Figueredo Hidalgo, Victor", "dorsal": 10}, {"name": "Hurtado Rodriguez, Iker", "dorsal": 11}, {"name": "Garrido Molina, Adrian", "dorsal": 13}, {"name": "Rodríguez López, Adrián", "dorsal": 15}, {"name": "Lapshin, Yanush", "dorsal": 16}, {"name": "Pascual Fernandes, Iker", "dorsal": 19}, {"name": "Cagigos Peña, Eric", "dorsal": 20}], "substitutes": [{"name": "Buil Lasierra, Mateo", "dorsal": 1}, {"name": "Amtil, Omar", "dorsal": 4}, {"name": "Piedrafita Porquet, Francisco", "dorsal": 6}, {"name": "Cagigos Peña, Joel", "dorsal": 8}, {"name": "El Rhali El Bardiai, Anas", "dorsal": 12}, {"name": "Gonzalez Zurita, Luis Daniel", "dorsal": 17}, {"name": "El Rhali El Bardiai, Ilyas", "dorsal": 21}], "substitutions": [], "cards": [{"minute": "55", "player": "Pascual Fernandes, Iker", "type": "yellow"}]}, "score": "1-1", "homeScore": 1, "awayScore": 1, "goals": [{"minute": "9", "player": "Citoler Ferrer, Acher", "homeScore": 1, "awayScore": 0}, {"minute": "59", "player": "Mashal, Kareem Ibraheem", "homeScore": 1, "awayScore": 1}], "referees": ["Lueza Gistau, Daniel Jose"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J7','Almudevar A.D.','Juvenil B',944038,'{"codActa": "944038", "time": "15:00", "stadium": "Almudevar Virgen de la Corona", "city": "Almudévar", "homeTeam": {"name": "Almudevar A.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000040474_ESCUDO ALMUDEVAR.jpg", "coach": "Gomez Torres, Raul", "starters": [{"name": "Lazaar, Younes", "dorsal": 1}, {"name": "Aliod Recio, Mateo", "dorsal": 3}, {"name": "Herrero Aliod, Adrian", "dorsal": 5}, {"name": "Zurita Hernandez, Thomas", "dorsal": 6}, {"name": "Barrero Torrecilla, Victor", "dorsal": 8}, {"name": "Tomas Sanchez, Miguel Antonio", "dorsal": 9}, {"name": "Abadia Pueyo, Rodrigo", "dorsal": 10}, {"name": "Bouguarne Rouani, Adam", "dorsal": 11}, {"name": "Huelamo Chavala, Teo", "dorsal": 16}, {"name": "Bruned Necula, Mario Armand", "dorsal": 18}, {"name": "Diallo Bah, Mamadou Aliou", "dorsal": 22}], "substitutes": [{"name": "Viscay, Angel Josue", "dorsal": 7}, {"name": "Claver Bolea, Leonardo", "dorsal": 15}, {"name": "Ba Ndiaye, Cheikh Ibrahima", "dorsal": 19}], "substitutions": [{"minute": "46", "playerOut": "Bouguarne Rouani, Adam", "playerIn": "Ba Ndiaye, Cheikh Ibrahima"}, {"minute": "46", "playerOut": "Bruned Necula, Mario Armand", "playerIn": "Viscay, Angel Josue"}, {"minute": "69", "playerOut": "Zurita Hernandez, Thomas", "playerIn": "Claver Bolea, Leonardo"}], "cards": [{"minute": "21", "player": "Bruned Necula, Mario Armand", "type": "yellow"}, {"minute": "24", "player": "Bouguarne Rouani, Adam", "type": "yellow"}, {"minute": "88", "player": "Gomez Sanchez, Sergio", "type": "yellow"}]}, "awayTeam": {"name": "Juvenil B", "logoUrl": "https://filesffaragon.filesnovanet.es/pnfg/img/web_responsive_2/ESP/escudo_sm_resultados_.jpg", "coach": "Cabrera Carrasquer, Sergio Carlos", "starters": [{"name": "Munoz, Samuel", "dorsal": 2}, {"name": "Callum, Matthew Cameron", "dorsal": 4}, {"name": "Halley, Kaasha Fyah Nathaniel", "dorsal": 8}, {"name": "Yuoh, Kabili Wesseh", "dorsal": 9}, {"name": "Reina, Jovan Miles", "dorsal": 10}, {"name": "Sandejas, Jaime Rafael Jacob", "dorsal": 13}, {"name": "Davitian, Masis Ratevos", "dorsal": 15}, {"name": "Abrahamyan, Eric", "dorsal": 16}, {"name": "Yuoh, Kaifa Kley", "dorsal": 19}, {"name": "James, Sebastian Gerrard", "dorsal": 21}, {"name": "Pandey, Sagan Behadur", "dorsal": 22}], "substitutes": [{"name": "Prediger, Lucas Giancarlo Santoro", "dorsal": 1}, {"name": "Shteynberg, Daniel Michael", "dorsal": 6}, {"name": "Fondop, Yohan Elysee", "dorsal": 7}, {"name": "Papanayotou, Konstantinos", "dorsal": 11}, {"name": "Solomon, Luke Aiden", "dorsal": 14}, {"name": "Mejias, Gianluca Lorenzo", "dorsal": 17}, {"name": "Cury Martino, Lucas", "dorsal": 18}], "substitutions": [{"minute": "46", "playerOut": "Sandejas, Jaime Rafael Jacob", "playerIn": "Prediger, Lucas Giancarlo Santoro"}, {"minute": "46", "playerOut": "Reina, Jovan Miles", "playerIn": "Mejias, Gianluca Lorenzo"}, {"minute": "46", "playerOut": "Yuoh, Kaifa Kley", "playerIn": "Fondop, Yohan Elysee"}, {"minute": "54", "playerOut": "Abrahamyan, Eric", "playerIn": "Cury Martino, Lucas"}, {"minute": "54", "playerOut": "Yuoh, Kabili Wesseh", "playerIn": "Solomon, Luke Aiden"}, {"minute": "62", "playerOut": "James, Sebastian Gerrard", "playerIn": "Papanayotou, Konstantinos"}, {"minute": "62", "playerOut": "Munoz, Samuel", "playerIn": "Shteynberg, Daniel Michael"}], "cards": [{"minute": "29", "player": "Reina, Jovan Miles", "type": "yellow"}, {"minute": "69", "player": "Fondop, Yohan Elysee", "type": "yellow"}, {"minute": "71", "player": "Mejias, Gianluca Lorenzo", "type": "yellow"}]}, "score": "0-5", "homeScore": 0, "awayScore": 5, "goals": [{"minute": "6", "player": "Yuoh, Kaifa Kley", "homeScore": 0, "awayScore": 1}, {"minute": "14", "player": "Yuoh, Kabili Wesseh", "homeScore": 0, "awayScore": 2}, {"minute": "45", "player": "Davitian, Masis Ratevos", "homeScore": 0, "awayScore": 3}, {"minute": "52", "player": "Yuoh, Kabili Wesseh", "homeScore": 0, "awayScore": 4}, {"minute": "85", "player": "Cury Martino, Lucas", "homeScore": 0, "awayScore": 5}], "referees": ["s principal Brosed Aso, Hugo"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J6','Infantil C','Jacetano-C.F. Castiello de Jaca',951464,'{"codActa": "951464", "time": "11:00", "stadium": "HUESCA-Universidad", "city": "Huesca", "homeTeam": {"name": "Infantil C", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "No presenta", "starters": [{"name": "Malo Vento, Alex", "dorsal": 1}, {"name": "Rodrigo Oros, Alvaro", "dorsal": 2}, {"name": "Gabunia, Demetre", "dorsal": 3}, {"name": "Bercero Barreña, Alberto", "dorsal": 4}, {"name": "García Santander, Izan", "dorsal": 8}, {"name": "Zaoui Miftah El Khair, Mohamed", "dorsal": 10}, {"name": "Lozano Roman, Iker", "dorsal": 11}, {"name": "Escario Diaz, Alejandro", "dorsal": 12}, {"name": "Rodriguez Flores, Jonathan David", "dorsal": 19}, {"name": "Suciu Maris, Alex Iuan", "dorsal": 20}, {"name": "Lanaspa Gil, Lizer", "dorsal": 22}], "substitutes": [{"name": "Torres Sazatornil, Manuel", "dorsal": 5}, {"name": "Lopez Lozano, Aaron Natalio", "dorsal": 7}, {"name": "Perez Walon, Victor", "dorsal": 9}, {"name": "Nasarre Escar, Adrián", "dorsal": 13}, {"name": "Prieto Verde, Javier", "dorsal": 15}, {"name": "Diallo Diallo, Ibrahima", "dorsal": 17}, {"name": "Lahlal Errafay, Adham", "dorsal": 18}], "substitutions": [], "cards": []}, "awayTeam": {"name": "Jacetano-C.F. Castiello de Jaca", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000314482_logo_Jacetano_nuevo.png?nova=1", "coach": "No presenta", "starters": [{"name": "Duato Navas, Xavi", "dorsal": 1}, {"name": "Faraji Houbban, Ismael", "dorsal": 4}, {"name": "Stroe, Lucas Leonardo", "dorsal": 5}, {"name": "Terrén Añaños, Erik", "dorsal": 6}, {"name": "Lopez Cifuentes, Jhon Alexander", "dorsal": 7}, {"name": "Cerrillo Poveda, Daniel", "dorsal": 8}, {"name": "Grafiella Rufas, Ian", "dorsal": 9}, {"name": "Rivas Marquez, Leo", "dorsal": 10}, {"name": "Abadias Bauza, Diego", "dorsal": 11}, {"name": "Serrano Todea, David Casián", "dorsal": 12}, {"name": "Gallego Rodriguez, Martin", "dorsal": 19}], "substitutes": [{"name": "Barrios Jimenez, Mateo", "dorsal": 3}, {"name": "Paiz Navas, Enzo", "dorsal": 13}, {"name": "Ariño Alias, Mateo", "dorsal": 17}], "substitutions": [], "cards": []}, "score": "11-2", "homeScore": 11, "awayScore": 2, "goals": [{"minute": "26", "player": "Terrén Añaños, Erik", "homeScore": 0, "awayScore": 1}, {"minute": "31", "player": "Perez Walon, Victor", "homeScore": 1, "awayScore": 1}, {"minute": "34", "player": "Perez Walon, Victor", "homeScore": 2, "awayScore": 1}, {"minute": "37", "player": "Lahlal Errafay, Adham", "homeScore": 3, "awayScore": 1}, {"minute": "38", "player": "Perez Walon, Victor", "homeScore": 4, "awayScore": 1}, {"minute": "46", "player": "Rodriguez Flores, Jonathan David", "homeScore": 5, "awayScore": 1}, {"minute": "48", "player": "Zaoui Miftah El Khair, Mohamed", "homeScore": 6, "awayScore": 1}, {"minute": "49", "player": "Terrén Añaños, Erik", "homeScore": 6, "awayScore": 2}, {"minute": "55", "player": "Zaoui Miftah El Khair, Mohamed", "homeScore": 7, "awayScore": 2}, {"minute": "63", "player": "Lanaspa Gil, Lizer", "homeScore": 8, "awayScore": 2}, {"minute": "65", "player": "Lozano Roman, Iker", "homeScore": 9, "awayScore": 2}, {"minute": "68", "player": "Lozano Roman, Iker", "homeScore": 10, "awayScore": 2}, {"minute": "70", "player": "García Santander, Izan", "homeScore": 11, "awayScore": 2}], "referees": ["Cuello Plana, Eiden"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J6','Escuela Futbol Oscense-C.D. P. Castillo Finanweska','Infantil D',951465,'{"codActa": "951465", "time": "09:00", "stadium": "Huesca San Jorge-1", "city": "Huesca", "homeTeam": {"name": "Escuela Futbol Oscense-C.D. P. Castillo Finanweska", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000354800_efo.jpg?nova=1", "coach": "Sanz Faure, Iker", "starters": [{"name": "Buera Borraz, Alvaro", "dorsal": 1}, {"name": "Campo Portaña, Martin", "dorsal": 3}, {"name": "Vinue Gabarre, Jorge", "dorsal": 4}, {"name": "Millan Lopez, Isaac", "dorsal": 6}, {"name": "Suelves Juarez, Marcos", "dorsal": 7}, {"name": "Bonet Magdalena, Izan", "dorsal": 11}, {"name": "Molleda Panzano, Francisco", "dorsal": 14}, {"name": "Peñuelas Gracia, Leo", "dorsal": 15}, {"name": "Gella Anies, Daniel", "dorsal": 17}, {"name": "Araguas Estallo, Lorien", "dorsal": 18}, {"name": "Hinojosa Fontestad, Sancho", "dorsal": 28}], "substitutes": [{"name": "Abadias Coiduras, Miguel Angel", "dorsal": 2}, {"name": "Romero Calvo, Martin", "dorsal": 9}, {"name": "Benedé Martín, Abel", "dorsal": 10}, {"name": "Azor Garcia, David", "dorsal": 16}, {"name": "Tolosa Cabrero, Alejandro", "dorsal": 27}, {"name": "Castillo Chércoles, Marco", "dorsal": 30}, {"name": "Gracia Pueyo, Daniel", "dorsal": 33}], "substitutions": [], "cards": []}, "awayTeam": {"name": "Infantil D", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "No presenta", "starters": [{"name": "Lascorz Muñoz, Nicolas", "dorsal": 3}, {"name": "Sorochenko, Vladimir", "dorsal": 5}, {"name": "Rais Sarghini, Nizar", "dorsal": 7}, {"name": "Chait, Zakariae", "dorsal": 8}, {"name": "Mateo Brun, Eloy", "dorsal": 11}, {"name": "Diaw Ndiaye, Abdoul Aziz", "dorsal": 12}, {"name": "Garcia Estallo, Acher", "dorsal": 13}, {"name": "Rodriguez Moreno, Rafael", "dorsal": 14}, {"name": "Trawally Juwara, Mahamadou", "dorsal": 15}, {"name": "Alvarez Essindi, Charles Raphael", "dorsal": 16}, {"name": "Boukraa Belahbib, Ayman", "dorsal": 17}], "substitutes": [{"name": "Miro Perez, Gabriel", "dorsal": 1}, {"name": "El Hasnaqui Ben Fedoul, Khalid", "dorsal": 4}, {"name": "Serna Kindo, Ángel Marcelo", "dorsal": 6}, {"name": "Segura Arruego, Jorge", "dorsal": 9}, {"name": "Sissoko, Makan", "dorsal": 10}, {"name": "Santiago", "dorsal": 19}, {"name": "Paz Marquez, Diego Roberto", "dorsal": 20}], "substitutions": [], "cards": [{"minute": "69", "player": "El Hasnaqui Ben Fedoul, Khalid", "type": "yellow"}]}, "score": "4-0", "homeScore": 4, "awayScore": 0, "goals": [{"minute": "6", "player": "Gella Anies, Daniel", "homeScore": 1, "awayScore": 0}, {"minute": "27", "player": "Benedé Martín, Abel", "homeScore": 2, "awayScore": 0}, {"minute": "35", "player": "Suelves Juarez, Marcos", "homeScore": 3, "awayScore": 0}, {"minute": "52", "player": "Tolosa Cabrero, Alejandro", "homeScore": 4, "awayScore": 0}], "referees": ["Alonso Ascaso, Lucas"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J5','Sabiñanigo-A.D. Futbol Base','Cadete D',952197,'{"codActa": "952197", "time": "17:45", "stadium": "SABIÑANIGO-Joaquín Ascaso", "city": "Sabiñánigo", "homeTeam": {"name": "Sabiñanigo-A.D. Futbol Base", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000386912_Escudo_Futbol_base_Sabi.png?nova=1", "coach": "Belio Simon, Juan", "starters": [{"name": "Garcia Abon, Joel", "dorsal": 3}, {"name": "Escolano Otin, Mateo", "dorsal": 5}, {"name": "Marcuello Lardiés, Román", "dorsal": 6}, {"name": "Gimenez Arto, Erik", "dorsal": 7}, {"name": "Ramirez Pineda, Sebastian", "dorsal": 9}, {"name": "Neagu, Alexandru Gabriel", "dorsal": 11}, {"name": "Vazquez Fernandez, Iker", "dorsal": 13}, {"name": "Gracia Murillo, Acher", "dorsal": 14}, {"name": "Dufo Alastruey, Pablo", "dorsal": 15}, {"name": "Bouna Kehal, Elias", "dorsal": 17}, {"name": "Villacampa Ara, Diego Jesus", "dorsal": 19}], "substitutes": [{"name": "Llamosas Berrendo, Iago", "dorsal": 1}, {"name": "Mazza Blason, Aiur", "dorsal": 8}, {"name": "Ourba Soriano, Walid", "dorsal": 12}, {"name": "Morales Velasquez, Ricardo", "dorsal": 16}, {"name": "Martinez Lucero, Matthew", "dorsal": 18}, {"name": "Ramirez Perez, Santiago", "dorsal": 20}], "substitutions": [], "cards": [{"minute": "38", "player": "Garcia Abon, Joel", "type": "yellow"}]}, "awayTeam": {"name": "Cadete D", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "No presenta", "starters": [{"name": "Krejsing, Andre Nolfi", "dorsal": 1}, {"name": "Almudevar Monclus, Asier", "dorsal": 2}, {"name": "Salazar Mahecha, Pablo", "dorsal": 3}, {"name": "Losfablos Chacon, Mateo", "dorsal": 5}, {"name": "Marquina Gimenez, Miguel", "dorsal": 7}, {"name": "Marino, Marco Salvatore", "dorsal": 8}, {"name": "Castillo Gonzalez, Yeuri", "dorsal": 14}, {"name": "Santolaria Santolaria, Eloy", "dorsal": 16}, {"name": "Paz Marquez, Angel Gabriel", "dorsal": 20}, {"name": "Kessler, Tyler Russell", "dorsal": 21}, {"name": "Myrzaly, Zanggar", "dorsal": 22}], "substitutes": [{"name": "Bordas Al Yaluli, Ismael", "dorsal": 4}, {"name": "Ziani El Kanar, Islam", "dorsal": 6}, {"name": "Stojanovic, Aleksandar", "dorsal": 10}, {"name": "Ibor Arazo, Neizan", "dorsal": 11}, {"name": "Perez Kandyurin, Oscar", "dorsal": 12}, {"name": "Mera, Eugen Andy", "dorsal": 13}, {"name": "Yaqublu, Hasan", "dorsal": 19}], "substitutions": [], "cards": [{"minute": "17", "player": "Castillo Gonzalez, Yeuri", "type": "yellow"}]}, "score": "2-2", "homeScore": 2, "awayScore": 2, "goals": [{"minute": "19", "player": "Ramirez Pineda, Sebastian", "homeScore": 1, "awayScore": 0}, {"minute": "25", "player": "Garcia Abon, Joel", "homeScore": 2, "awayScore": 0}, {"minute": "27", "player": "Myrzaly, Zanggar", "homeScore": 2, "awayScore": 1}, {"minute": "42", "player": "Marino, Marco Salvatore", "homeScore": 2, "awayScore": 2}], "referees": ["Abardia Tosat, Ignacio"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J6','El Salvador-S.D. "A"','Alevín A',960017,'{"codActa": "960017", "time": "11:00", "stadium": "El Salvador Quique Oribe-COL.", "city": "Madrid", "homeTeam": {"name": "El Salvador-S.D. \"A\"", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000064528_Escudo_El_Salvador.JPG?nova=1", "coach": "De la Fuente Garcia, Jose Manuel", "starters": [{"name": "Villoslada Garcia, Martin", "dorsal": 5}, {"name": "Gallego Pernia, Victor", "dorsal": 6}, {"name": "Larrubia Perez, Bruno", "dorsal": 8}, {"name": "Huertas Diaz, Santiago", "dorsal": 9}, {"name": "Rada Diez, Alvaro", "dorsal": 10}, {"name": "Perez Samaniego, Nicolas", "dorsal": 13}, {"name": "Ramos Royo, Martin", "dorsal": 17}, {"name": "Becerril Garcia, Cayetano", "dorsal": 19}, {"name": "Paris Pelet, Alvaro", "dorsal": 29}, {"name": "Eduardo S.", "dorsal": 33}, {"name": "Bayonesta Olivan, Manuel", "dorsal": 37}], "substitutes": [{"name": "Calavia Jimenez, Mateo", "dorsal": 1}, {"name": "Lafuente Tuquet, Nicolas", "dorsal": 3}, {"name": "Martinez Cabistany, Santiago", "dorsal": 18}, {"name": "Membrado Marin, Jorge", "dorsal": 21}, {"name": "Villaverde Pinilla, Jorge", "dorsal": 22}, {"name": "Cordeiro Espada, Mario", "dorsal": 31}, {"name": "Vidorreta Marin, Javier", "dorsal": 36}], "substitutions": [], "cards": []}, "awayTeam": {"name": "Alevín A", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Camba Berdugo, Leopoldo", "starters": [{"name": "Escario Pastor, Alejandro", "dorsal": 1}, {"name": "Escartin Gracia, Dylan", "dorsal": 2}, {"name": "Sazatornil Arnedo, Arles", "dorsal": 3}, {"name": "Mendoza Munguia, Irvin Daniel", "dorsal": 5}, {"name": "Sazatornil Arnedo, Bosco", "dorsal": 6}, {"name": "El Aitour Boubnaina, Mohamed Ali", "dorsal": 10}, {"name": "Gimenez Gimenez, Luis Miguel", "dorsal": 14}, {"name": "Bouali Sbaai, Abdeljalil", "dorsal": 15}, {"name": "Ascaso Sierra, Martin", "dorsal": 16}, {"name": "Dieste Lascorz, Fernando", "dorsal": 20}, {"name": "Laliena Añon, Izan", "dorsal": 22}], "substitutes": [{"name": "Bah Bah, Alfaoumarou", "dorsal": 8}, {"name": "Ezaoui Kouraj, Yahya", "dorsal": 9}, {"name": "Carrasquer Garuz, Iago", "dorsal": 11}, {"name": "Añaños Carceller, Olmo", "dorsal": 12}, {"name": "Bouali Sbaai, Youssef", "dorsal": 18}], "substitutions": [], "cards": []}, "score": "1-3", "homeScore": 1, "awayScore": 3, "goals": [{"minute": "2", "player": "Huertas Diaz, Santiago", "homeScore": 1, "awayScore": 0}, {"minute": "35", "player": "Ezaoui Kouraj, Yahya", "homeScore": 1, "awayScore": 1}, {"minute": "41", "player": "Ezaoui Kouraj, Yahya", "homeScore": 1, "awayScore": 2}, {"minute": "59", "player": "Carrasquer Garuz, Iago", "homeScore": 1, "awayScore": 3}], "referees": ["Narro Valle, Gabriel"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-07','J4','Alevín B','Escuela Futbol Oscense-C.D. ''C''',969997,'{"codActa": "969997", "time": "09:30", "stadium": "HUESCA-Universidad F7-1 (medio campo)", "city": "", "homeTeam": {"name": "Alevín B", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "No presenta", "starters": [{"name": "Li, Jinxun", "dorsal": 2}, {"name": "Chihab Otmane, Hamza", "dorsal": 3}, {"name": "Chattaf Sfiri, Mohammed Amine", "dorsal": 6}, {"name": "Ziani Zeyeni, Mohamed Yassin", "dorsal": 10}, {"name": "Diallo Diallo, Abdoulrahmane", "dorsal": 11}, {"name": "Castan Lopez, Jorge", "dorsal": 13}, {"name": "Yang, Haoran", "dorsal": 16}, {"name": "Ibnou Bouzid, Ali", "dorsal": 17}], "substitutes": [{"name": "El Khaoua Mustaphi, Rayan", "dorsal": 1}, {"name": "Sghir Braik, Ilyas", "dorsal": 7}, {"name": "Amaya Ruano, Isaac", "dorsal": 8}, {"name": "Massa Otmane, Mehdi", "dorsal": 9}, {"name": "Brun Cubeles, Jose", "dorsal": 14}, {"name": "Hernandez Paul, Enrique", "dorsal": 15}], "substitutions": [], "cards": []}, "awayTeam": {"name": "Escuela Futbol Oscense-C.D. ''C''", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000354800_efo.jpg?nova=1", "coach": "Generelo Cebollero, Pablo", "starters": [{"name": "Millan Lopez, Saul", "dorsal": 1}, {"name": "Peñalver Lopez, Gonzalo", "dorsal": 4}, {"name": "Muñoz Sorrosal, Ian Marcos", "dorsal": 7}, {"name": "Bescos Coarasa, Jacobo", "dorsal": 9}, {"name": "French Labarta, Adrian", "dorsal": 10}, {"name": "Tolosa Cabrero, Lucia", "dorsal": 11}, {"name": "Castellor Enrique, Ugo", "dorsal": 15}, {"name": "Melo Matos, Austin Onassis", "dorsal": 16}], "substitutes": [{"name": "Salazar Ros, Marc", "dorsal": 3}, {"name": "Tornero Muro, Mario", "dorsal": 5}, {"name": "Jimenez Abella, Erik", "dorsal": 8}, {"name": "Pascual Allue, Antonio", "dorsal": 12}, {"name": "Barry Diallo, Ismaila", "dorsal": 13}, {"name": "Lles Lopez, Leo", "dorsal": 14}, {"name": "Alonso Garcia, Mateo", "dorsal": 17}, {"name": "Brau Perez, Asier", "dorsal": 18}], "substitutions": [], "cards": []}, "score": "5-0", "homeScore": 5, "awayScore": 0, "goals": [{"minute": "1", "player": "Chattaf Sfiri, Mohammed Amine", "homeScore": 1, "awayScore": 0}, {"minute": "3", "player": "Li, Jinxun", "homeScore": 2, "awayScore": 0}, {"minute": "7", "player": "Yang, Haoran", "homeScore": 3, "awayScore": 0}, {"minute": "9", "player": "Chattaf Sfiri, Mohammed Amine", "homeScore": 4, "awayScore": 0}, {"minute": "13", "player": "Li, Jinxun", "homeScore": 5, "awayScore": 0}], "referees": ["Morante Ortega, Juan Carlos"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-08','J9','Juvenil A','Huesca-S.D.',933255,'{"codActa": "933255", "time": "18:00", "stadium": "HUESCA-Universidad", "city": "Huesca", "homeTeam": {"name": "Juvenil A", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png?nova=1", "coach": "Portoles Ariño, Alberto", "starters": [{"name": "Junquera Franco, Sergio", "dorsal": 1}, {"name": "Navallas Orrit, Lucas", "dorsal": 3}, {"name": "Lamarca Jauregui, Ruben", "dorsal": 5}, {"name": "Nestor Vicente Vicente", "dorsal": 6}, {"name": "Najdi, Mohamad H", "dorsal": 7}, {"name": "Reina, Stevan Yolexander", "dorsal": 8}, {"name": "Villabona Negrete, David", "dorsal": 10}, {"name": "Casals Almacellas, Ricard", "dorsal": 11}, {"name": "Ingalaturre Cano, Javier", "dorsal": 17}, {"name": "Casanova Laso, Alvaro", "dorsal": 20}, {"name": "Junquera Franco, Alejandro Aladino", "dorsal": 21}], "substitutes": [{"name": "Sopena Garrapiz, Miguel", "dorsal": 4}, {"name": "Eddafiri Hajji, Eshak", "dorsal": 12}, {"name": "Casado Perez, Guillermo", "dorsal": 13}, {"name": "Cea Rubio, Alberto", "dorsal": 14}, {"name": "Tshiteya, Christian Rene", "dorsal": 18}, {"name": "Mur Marin, Bruno", "dorsal": 19}, {"name": "Martinez, Jayden Nehemiah", "dorsal": 23}], "substitutions": [{"minute": "63", "playerOut": "Casanova Laso, Alvaro", "playerIn": "Mur Marin, Bruno"}, {"minute": "70", "playerOut": "Casals Almacellas, Ricard", "playerIn": "Tshiteya, Christian Rene"}, {"minute": "81", "playerOut": "Ingalaturre Cano, Javier", "playerIn": "Cea Rubio, Alberto"}, {"minute": "81", "playerOut": "Navallas Orrit, Lucas", "playerIn": "Martinez, Jayden Nehemiah"}, {"minute": "81", "playerOut": "Junquera Franco, Alejandro Aladino", "playerIn": "Sopena Garrapiz, Miguel"}], "cards": [{"minute": "13", "player": "Ingalaturre Cano, Javier", "type": "yellow"}, {"minute": "55", "player": "Villabona Negrete, David", "type": "yellow"}]}, "awayTeam": {"name": "Huesca-S.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000223477_huesca_sd.png?nova=1", "coach": "Tejada Fernandez Mela, Pablo", "starters": [{"name": "Marquina Montori, Lucas", "dorsal": 1}, {"name": "Gistau Visar, Marcos", "dorsal": 3}, {"name": "Giral Gonzalez, Miguel", "dorsal": 4}, {"name": "Paulo Augusto, Quintino", "dorsal": 5}, {"name": "Cerdan Betran, Hugo", "dorsal": 8}, {"name": "Anquela Guardiola, Daniel", "dorsal": 11}, {"name": "Feddal Bakkha, Luay", "dorsal": 12}, {"name": "Losfablos Mestre, Pablo", "dorsal": 14}, {"name": "Giménez Valdovinos, Alejandro", "dorsal": 15}, {"name": "Broto Ruiz, Alex", "dorsal": 18}, {"name": "Es Saidi Zerrouk, Yaha", "dorsal": 19}], "substitutes": [{"name": "Nieto Borruel, Hugo", "dorsal": 2}, {"name": "Carrera Angulo, Jorge", "dorsal": 6}, {"name": "Illana Burgase, Julian Jesus", "dorsal": 7}, {"name": "Alaman Bermon, Javier", "dorsal": 9}, {"name": "Bellaoui Maichou, Omar", "dorsal": 10}, {"name": "Carrillo Rodriguez, Jorge", "dorsal": 13}, {"name": "Lapusan, Raul", "dorsal": 17}], "substitutions": [{"minute": "80", "playerOut": "Cerdan Betran, Hugo", "playerIn": "Nieto Borruel, Hugo"}, {"minute": "80", "playerOut": "Giménez Valdovinos, Alejandro", "playerIn": "Lapusan, Raul"}, {"minute": "88", "playerOut": "Es Saidi Zerrouk, Yaha", "playerIn": "Bellaoui Maichou, Omar"}, {"minute": "88", "playerOut": "Broto Ruiz, Alex", "playerIn": "Illana Burgase, Julian Jesus"}, {"minute": "88", "playerOut": "Anquela Guardiola, Daniel", "playerIn": "Carrera Angulo, Jorge"}], "cards": [{"minute": "53", "player": "Losfablos Mestre, Pablo", "type": "yellow"}, {"minute": "83", "player": "Es Saidi Zerrouk, Yaha", "type": "yellow"}]}, "score": "1-3", "homeScore": 1, "awayScore": 3, "goals": [{"minute": "44", "player": "Feddal Bakkha, Luay", "homeScore": 0, "awayScore": 1}, {"minute": "51", "player": "Najdi, Mohamad H", "homeScore": 1, "awayScore": 1}, {"minute": "75", "player": "Giral Gonzalez, Miguel", "homeScore": 1, "awayScore": 2}, {"minute": "79", "player": "Broto Ruiz, Alex", "homeScore": 1, "awayScore": 3}], "referees": ["Monteagudo Soler, Edgar", "Escar Jiménez , Samuel", "Abadia Brau, Mateo"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}'),
('2026-11-08','J10','Primer Equipo','La Almunia-C.D.',935782,'{"codActa": "935782", "time": "12:00", "stadium": "Huesca San Jorge-1", "city": "Huesca", "homeTeam": {"name": "Primer Equipo", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Clubes/00100_0000495869_Escudo_redondo_Rub__n.png?nova=1", "coach": "Oriol Lomares, Josep", "starters": [{"name": "Kosariev, Oleksandr", "dorsal": 1}, {"name": "Diallo, Alassane", "dorsal": 5}, {"name": "Bautista Jimenez, Hugo", "dorsal": 7}, {"name": "Mendez Gomez, Adria", "dorsal": 8}, {"name": "Petit Ortiz, Adria", "dorsal": 9}, {"name": "Guillen Gomez, Alberto", "dorsal": 10}, {"name": "Arechavaleta Ciordia, Jorge", "dorsal": 16}, {"name": "Mercadal Camisón, Sergio", "dorsal": 21}, {"name": "Beltran Alonso, Marco", "dorsal": 22}, {"name": "Rubira Colas, Adria", "dorsal": 23}, {"name": "Calvo Martinez, Pau", "dorsal": 24}], "substitutes": [{"name": "Monnie, Reynold Bryan", "dorsal": 3}, {"name": "Melero Camara, Pablo", "dorsal": 4}, {"name": "Gracia Quindos, Danel", "dorsal": 6}, {"name": "Beattie Orfila, Erik", "dorsal": 11}, {"name": "Andrzejewsk, Alan Pawel", "dorsal": 13}, {"name": "Palacios Hinestroza, Wagner Roberth", "dorsal": 15}, {"name": "Quiroz Laosa, Alejandro", "dorsal": 18}, {"name": "Fernandez Salinas, Daniel", "dorsal": 19}, {"name": "Reist, Joaquin", "dorsal": 20}], "substitutions": [{"minute": "69", "playerOut": "Guillen Gomez, Alberto", "playerIn": "Gracia Quindos, Danel"}, {"minute": "78", "playerOut": "Calvo Martinez, Pau", "playerIn": "Melero Camara, Pablo"}, {"minute": "78", "playerOut": "Rubira Colas, Adria", "playerIn": "Quiroz Laosa, Alejandro"}, {"minute": "88", "playerOut": "Mendez Gomez, Adria", "playerIn": "Beattie Orfila, Erik"}], "cards": [{"minute": "37", "player": "Oriol Lomares, Josep", "type": "yellow"}, {"minute": "45", "player": "Mendez Gomez, Adria", "type": "yellow"}, {"minute": "45", "player": "Lisa Membrives, Samuel", "type": "yellow"}, {"minute": "89", "player": "Quiroz Laosa, Alejandro", "type": "yellow"}]}, "awayTeam": {"name": "La Almunia-C.D.", "logoUrl": "https://www.futbolaragon.com/pnfg/pimg/Equipos/00100_0000040355_escudo.png?nova=1", "coach": "Ballestero Ferrer, Ivan", "starters": [{"name": "Rodriguez Cisneros, Erick Sebastian", "dorsal": 2}, {"name": "Franco Garcia, Alvaro Angel", "dorsal": 3}, {"name": "Molinos Gracia, Jose Miguel", "dorsal": 5}, {"name": "Bouayadi Kadiri, Hamza", "dorsal": 9}, {"name": "Lairla Gomez, Joel", "dorsal": 13}, {"name": "Jimenez Sebastian, Antonio Alberto", "dorsal": 14}, {"name": "Motilva Sancho, Adrian", "dorsal": 15}, {"name": "Magarin Sese, Agustin", "dorsal": 16}, {"name": "Gumiel Suarez, Jaime", "dorsal": 18}, {"name": "Gracia Llorente, Hugo", "dorsal": 19}, {"name": "Fernandez Arruebo, Victor", "dorsal": 20}], "substitutes": [{"name": "Mayoral Segura, Miguel", "dorsal": 1}, {"name": "Garcia Diez, Hector", "dorsal": 6}, {"name": "Gil Ezquerra, Alvaro", "dorsal": 7}, {"name": "Roy Gajon, Alejandro", "dorsal": 10}, {"name": "Embid Aznar, Miguel", "dorsal": 11}, {"name": "Casals Montel, Joel", "dorsal": 12}, {"name": "Arnal Moreno, Pablo", "dorsal": 27}], "substitutions": [{"minute": "46", "playerOut": "Fernandez Arruebo, Victor", "playerIn": "Embid Aznar, Miguel"}, {"minute": "46", "playerOut": "Jimenez Sebastian, Antonio Alberto", "playerIn": "Garcia Diez, Hector"}, {"minute": "46", "playerOut": "Gracia Llorente, Hugo", "playerIn": "Roy Gajon, Alejandro"}, {"minute": "69", "playerOut": "Gumiel Suarez, Jaime", "playerIn": "Gil Ezquerra, Alvaro"}, {"minute": "80", "playerOut": "Magarin Sese, Agustin", "playerIn": "Casals Montel, Joel"}], "cards": [{"minute": "27", "player": "Jimenez Sebastian, Antonio Alberto", "type": "yellow"}, {"minute": "41", "player": "Lairla Gomez, Joel", "type": "yellow"}, {"minute": "42", "player": "Ballestero Ferrer, Ivan", "type": "yellow"}, {"minute": "46", "player": "Magarin Sese, Agustin", "type": "yellow"}, {"minute": "78", "player": "Garcia Diez, Hector", "type": "yellow"}, {"minute": "83", "player": "Molinos Gracia, Jose Miguel", "type": "yellow"}, {"minute": "84", "player": "Motilva Sancho, Adrian", "type": "yellow"}]}, "score": "3-1", "homeScore": 3, "awayScore": 1, "goals": [{"minute": "18", "player": "Calvo Martinez, Pau", "homeScore": 1, "awayScore": 0}, {"minute": "33", "player": "Petit Ortiz, Adria", "homeScore": 2, "awayScore": 0}, {"minute": "38", "player": "Molinos Gracia, Jose Miguel", "homeScore": 2, "awayScore": 1}, {"minute": "40", "player": "Petit Ortiz, Adria", "homeScore": 3, "awayScore": 1}], "referees": ["Haghiac , Mihaita Marius", "Romeo Gracia, Sergio", "Hurtado Rodriguez, Ernesto"], "incidents": [], "source": "ffv-docker", "fetchedAt": "2026-11-09T00:00:00Z"}');

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
('1874190','Junquera Franco, Sergio',1,'2026-11-08','L:Huesca-S.D.','9',true,90,0,0,0,933255),
('1874190','Navallas Orrit, Lucas',3,'2026-11-08','L:Huesca-S.D.','9',true,81,0,0,0,933255),
('1874190','Lamarca Jauregui, Ruben',5,'2026-11-08','L:Huesca-S.D.','9',true,90,0,0,0,933255),
('1874190','Nestor Vicente Vicente',6,'2026-11-08','L:Huesca-S.D.','9',true,90,0,0,0,933255),
('1874190','Najdi, Mohamad H',7,'2026-11-08','L:Huesca-S.D.','9',true,90,1,0,0,933255),
('1874190','Reina, Stevan Yolexander',8,'2026-11-08','L:Huesca-S.D.','9',true,90,0,0,0,933255),
('1874190','Villabona Negrete, David',10,'2026-11-08','L:Huesca-S.D.','9',true,90,0,1,0,933255),
('1874190','Casals Almacellas, Ricard',11,'2026-11-08','L:Huesca-S.D.','9',true,70,0,0,0,933255),
('1874190','Ingalaturre Cano, Javier',17,'2026-11-08','L:Huesca-S.D.','9',true,81,0,1,0,933255),
('1874190','Casanova Laso, Alvaro',20,'2026-11-08','L:Huesca-S.D.','9',true,63,0,0,0,933255),
('1874190','Junquera Franco, Alejandro Aladino',21,'2026-11-08','L:Huesca-S.D.','9',true,81,0,0,0,933255),
('1874190','Sopena Garrapiz, Miguel',4,'2026-11-08','L:Huesca-S.D.','9',false,9,0,0,0,933255),
('1874190','Eddafiri Hajji, Eshak',12,'2026-11-08','L:Huesca-S.D.','9',false,0,0,0,0,933255),
('1874190','Casado Perez, Guillermo',13,'2026-11-08','L:Huesca-S.D.','9',false,0,0,0,0,933255),
('1874190','Cea Rubio, Alberto',14,'2026-11-08','L:Huesca-S.D.','9',false,9,0,0,0,933255),
('1874190','Tshiteya, Christian Rene',18,'2026-11-08','L:Huesca-S.D.','9',false,20,0,0,0,933255),
('1874190','Mur Marin, Bruno',19,'2026-11-08','L:Huesca-S.D.','9',false,27,0,0,0,933255),
('1874190','Martinez, Jayden Nehemiah',23,'2026-11-08','L:Huesca-S.D.','9',false,9,0,0,0,933255),
('940','Kosariev, Oleksandr',1,'2026-11-08','L:La Almunia-C.D.','10',true,90,0,0,0,935782),
('940','Diallo, Alassane',5,'2026-11-08','L:La Almunia-C.D.','10',true,90,0,0,0,935782),
('940','Bautista Jimenez, Hugo',7,'2026-11-08','L:La Almunia-C.D.','10',true,90,0,0,0,935782),
('940','Mendez Gomez, Adria',8,'2026-11-08','L:La Almunia-C.D.','10',true,88,0,1,0,935782),
('940','Petit Ortiz, Adria',9,'2026-11-08','L:La Almunia-C.D.','10',true,90,2,0,0,935782),
('940','Guillen Gomez, Alberto',10,'2026-11-08','L:La Almunia-C.D.','10',true,69,0,0,0,935782),
('940','Arechavaleta Ciordia, Jorge',16,'2026-11-08','L:La Almunia-C.D.','10',true,90,0,0,0,935782),
('940','Mercadal Camisón, Sergio',21,'2026-11-08','L:La Almunia-C.D.','10',true,90,0,0,0,935782),
('940','Beltran Alonso, Marco',22,'2026-11-08','L:La Almunia-C.D.','10',true,90,0,0,0,935782),
('940','Rubira Colas, Adria',23,'2026-11-08','L:La Almunia-C.D.','10',true,78,0,0,0,935782),
('940','Calvo Martinez, Pau',24,'2026-11-08','L:La Almunia-C.D.','10',true,78,1,0,0,935782),
('940','Monnie, Reynold Bryan',3,'2026-11-08','L:La Almunia-C.D.','10',false,0,0,0,0,935782),
('940','Melero Camara, Pablo',4,'2026-11-08','L:La Almunia-C.D.','10',false,12,0,0,0,935782),
('940','Gracia Quindos, Danel',6,'2026-11-08','L:La Almunia-C.D.','10',false,21,0,0,0,935782),
('940','Beattie Orfila, Erik',11,'2026-11-08','L:La Almunia-C.D.','10',false,2,0,0,0,935782),
('940','Andrzejewsk, Alan Pawel',13,'2026-11-08','L:La Almunia-C.D.','10',false,0,0,0,0,935782),
('940','Palacios Hinestroza, Wagner Roberth',15,'2026-11-08','L:La Almunia-C.D.','10',false,0,0,0,0,935782),
('940','Quiroz Laosa, Alejandro',18,'2026-11-08','L:La Almunia-C.D.','10',false,12,0,1,0,935782),
('940','Fernandez Salinas, Daniel',19,'2026-11-08','L:La Almunia-C.D.','10',false,0,0,0,0,935782),
('940','Reist, Joaquin',20,'2026-11-08','L:La Almunia-C.D.','10',false,0,0,0,0,935782),
('5301041','Ehara, Haruto',2,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,80,0,0,0,937521),
('5301041','Pisa Palacin, Eric',4,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,64,0,0,0,937521),
('5301041','Palomeque Samperiz, Simon',5,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,80,1,0,0,937521),
('5301041','Lapshin, Luka',6,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,80,0,0,0,937521),
('5301041','Khouta Nihah, Rayan',7,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,80,1,0,0,937521),
('5301041','Torcal Encontra, Daniel',9,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,80,1,0,0,937521),
('5301041','Mellado Mingarro, Alejo',10,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,80,0,0,0,937521),
('5301041','Casas da Silva, Gabriel',11,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,80,1,0,0,937521),
('5301041','Addo, Desmond Donald',13,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,80,0,0,0,937521),
('5301041','Saldivar Lagraña, Jose Angel',14,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,64,0,0,0,937521),
('5301041','Calavia Otin, Miguel',17,'2026-11-07','V:Santo Domingo Juventud C.F.','8',true,51,0,0,0,937521),
('5301041','Kostiuchik, Artur',3,'2026-11-07','V:Santo Domingo Juventud C.F.','8',false,29,0,0,0,937521),
('5301041','Huerva Loriente, Iván',8,'2026-11-07','V:Santo Domingo Juventud C.F.','8',false,16,0,0,0,937521),
('5301041','Mallén Cruz, Marco',15,'2026-11-07','V:Santo Domingo Juventud C.F.','8',false,0,0,0,0,937521),
('5301041','Ardanuy Ramon, Hugo',18,'2026-11-07','V:Santo Domingo Juventud C.F.','8',false,0,0,0,0,937521),
('5301041','Boonparsert, Phakin Chalermakas',19,'2026-11-07','V:Santo Domingo Juventud C.F.','8',false,0,0,0,0,937521),
('5301041','Maestre Sanchez, Manuel',20,'2026-11-07','V:Santo Domingo Juventud C.F.','8',false,0,0,0,0,937521),
('5301041','Diallo Diallo, Ibrahima Tanou',22,'2026-11-07','V:Santo Domingo Juventud C.F.','8',false,16,0,0,0,937521),
('2804927','Kapitan, Kirill',5,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,80,0,0,0,938125),
('2804927','Viñuales Rodriguez, Adrian',6,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,77,0,0,0,938125),
('2804927','Ahmed, Yusuf Abdifatah',7,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,80,0,0,0,938125),
('2804927','Bachiri Bartal, Osama',8,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,80,0,0,0,938125),
('2804927','Abadias Otal, Daniel',9,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,58,0,0,0,938125),
('2804927','Aziaba, Ryan',10,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,66,1,0,0,938125),
('2804927','Bielsa Alonso, David',12,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,80,0,0,0,938125),
('2804927','Svilar, Luka',17,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,80,0,0,0,938125),
('2804927','Rasmussen, Felix Boje',19,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,80,0,0,0,938125),
('2804927','Vogelsberg, Matthew Stephen',22,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,80,1,0,0,938125),
('2804927','Espurz Redon, Adrian',26,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',true,80,0,0,0,938125),
('2804927','Laplaza Arnal, Angel',1,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',false,0,0,0,0,938125),
('2804927','De los Santos Saviñon, Jonedwin Gabriel',3,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',false,0,0,0,0,938125),
('2804927','Bardaji Bretcanu, Flavio',4,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',false,3,0,0,0,938125),
('2804927','Rodriguez Lancho, Javier',11,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',false,22,1,0,0,938125),
('2804927','Lagüéns Angarón, Jorge',21,'2026-11-07','V:Escuela Futbol Oscense-C.D. R. Blasco','8',false,14,0,0,0,938125),
('2804928','Ibrahim, Anthony Daniel',3,'2026-11-07','V:Balsas Picarral-U.D.','8',true,70,0,1,0,940359),
('2804928','Diallo Diallo, Nasirou',4,'2026-11-07','V:Balsas Picarral-U.D.','8',true,48,0,0,0,940359),
('2804928','Verman, Prashaan',5,'2026-11-07','V:Balsas Picarral-U.D.','8',true,70,1,0,0,940359),
('2804928','Alvarado Sevilla, Jonathan David',6,'2026-11-07','V:Balsas Picarral-U.D.','8',true,70,0,0,0,940359),
('2804928','Ramirez, Elian',7,'2026-11-07','V:Balsas Picarral-U.D.','8',true,35,1,0,0,940359),
('2804928','Gimenez Lopez, Cesar',8,'2026-11-07','V:Balsas Picarral-U.D.','8',true,70,0,0,0,940359),
('2804928','Escartin Gracia, Alexis',9,'2026-11-07','V:Balsas Picarral-U.D.','8',true,70,0,0,0,940359),
('2804928','Roman Lasilla, Juan',10,'2026-11-07','V:Balsas Picarral-U.D.','8',true,61,0,0,0,940359),
('2804928','Shibata, Kai',11,'2026-11-07','V:Balsas Picarral-U.D.','8',true,43,0,0,0,940359),
('2804928','Guevara Garofalo, Cesar Andrés',12,'2026-11-07','V:Balsas Picarral-U.D.','8',true,70,0,0,0,940359),
('2804928','Dmytryk, Bohdan',13,'2026-11-07','V:Balsas Picarral-U.D.','8',true,70,0,0,0,940359),
('2804928','Rubio Royo, Hugo',1,'2026-11-07','V:Balsas Picarral-U.D.','8',false,0,0,0,0,940359),
('2804928','Monesma Yebra, Adrian',2,'2026-11-07','V:Balsas Picarral-U.D.','8',false,22,0,0,0,940359),
('2804928','Lample Sanagustin, Enzo',14,'2026-11-07','V:Balsas Picarral-U.D.','8',false,0,0,0,0,940359),
('2804928','Olano Espiau, Martin',15,'2026-11-07','V:Balsas Picarral-U.D.','8',false,9,0,0,0,940359),
('2804928','Preciado Luna, Ronald Daniel',17,'2026-11-07','V:Balsas Picarral-U.D.','8',false,35,0,0,0,940359),
('2804928','Armas Villarroel, Andrés',19,'2026-11-07','V:Balsas Picarral-U.D.','8',false,27,0,0,0,940359),
('2804928','So, Chun Lam',21,'2026-11-07','V:Balsas Picarral-U.D.','8',false,0,0,0,0,940359),
('1874191','Samitier Laliena, Hector',1,'2026-11-07','V:La Litera-Escuela Dep.','4',true,80,0,0,0,943034),
('1874191','Hernandez Valentin, Pablo',2,'2026-11-07','V:La Litera-Escuela Dep.','4',true,80,0,0,0,943034),
('1874191','Benedicto Barrio, Bruno',3,'2026-11-07','V:La Litera-Escuela Dep.','4',true,68,0,0,0,943034),
('1874191','Romero Banzo, Alejandro',4,'2026-11-07','V:La Litera-Escuela Dep.','4',true,68,0,0,0,943034),
('1874191','Aragones Allue, Francisco Javier',5,'2026-11-07','V:La Litera-Escuela Dep.','4',true,80,0,0,0,943034),
('1874191','Malo Vento, Sergio',6,'2026-11-07','V:La Litera-Escuela Dep.','4',true,65,0,0,0,943034),
('1874191','Sissoho, Omar Fai',9,'2026-11-07','V:La Litera-Escuela Dep.','4',true,68,0,0,0,943034),
('1874191','Plaza Daga, Daren',10,'2026-11-07','V:La Litera-Escuela Dep.','4',true,80,1,0,0,943034),
('1874191','Pérez Gascon, Daniel',15,'2026-11-07','V:La Litera-Escuela Dep.','4',true,65,0,0,0,943034),
('1874191','Vitales Til, Mateo',16,'2026-11-07','V:La Litera-Escuela Dep.','4',true,52,0,0,0,943034),
('1874191','Cavero Blanco, Ivan',19,'2026-11-07','V:La Litera-Escuela Dep.','4',true,52,0,0,0,943034),
('1874191','Balanta Zambrano, Alan Steven',7,'2026-11-07','V:La Litera-Escuela Dep.','4',false,28,0,0,0,943034),
('1874191','Tellechea Perez, Marcos',8,'2026-11-07','V:La Litera-Escuela Dep.','4',false,28,0,0,0,943034),
('1874191','Chattaf Sfiri, Fahd',11,'2026-11-07','V:La Litera-Escuela Dep.','4',false,12,0,0,0,943034),
('1874191','Pineda Palacios, David Alessandro',12,'2026-11-07','V:La Litera-Escuela Dep.','4',false,15,0,0,0,943034),
('1874191','Plasin del Campo, Aritz',17,'2026-11-07','V:La Litera-Escuela Dep.','4',false,12,0,0,0,943034),
('1874191','Susín Gracia, Urbez',21,'2026-11-07','V:La Litera-Escuela Dep.','4',false,15,0,0,0,943034),
('1874191','Kaber, Adam',22,'2026-11-07','V:La Litera-Escuela Dep.','4',false,12,0,0,0,943034),
('4607890','Barba Santolaria, Javier',3,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,0,0,943216),
('4607890','Lardies Campo, Marco',5,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,0,0,943216),
('4607890','Pascual Fernandes, Saúl',7,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,0,0,943216),
('4607890','Mashal, Kareem Ibraheem',9,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,1,0,0,943216),
('4607890','Figueredo Hidalgo, Victor',10,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,0,0,943216),
('4607890','Hurtado Rodriguez, Iker',11,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,0,0,943216),
('4607890','Garrido Molina, Adrian',13,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,0,0,943216),
('4607890','Rodríguez López, Adrián',15,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,0,0,943216),
('4607890','Lapshin, Yanush',16,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,0,0,943216),
('4607890','Pascual Fernandes, Iker',19,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,1,0,943216),
('4607890','Cagigos Peña, Eric',20,'2026-11-07','V:La Litera-Escuela Dep.','4',true,70,0,0,0,943216),
('4607890','Buil Lasierra, Mateo',1,'2026-11-07','V:La Litera-Escuela Dep.','4',false,0,0,0,0,943216),
('4607890','Amtil, Omar',4,'2026-11-07','V:La Litera-Escuela Dep.','4',false,0,0,0,0,943216),
('4607890','Piedrafita Porquet, Francisco',6,'2026-11-07','V:La Litera-Escuela Dep.','4',false,0,0,0,0,943216),
('4607890','Cagigos Peña, Joel',8,'2026-11-07','V:La Litera-Escuela Dep.','4',false,0,0,0,0,943216),
('4607890','El Rhali El Bardiai, Anas',12,'2026-11-07','V:La Litera-Escuela Dep.','4',false,0,0,0,0,943216),
('4607890','Gonzalez Zurita, Luis Daniel',17,'2026-11-07','V:La Litera-Escuela Dep.','4',false,0,0,0,0,943216),
('4607890','El Rhali El Bardiai, Ilyas',21,'2026-11-07','V:La Litera-Escuela Dep.','4',false,0,0,0,0,943216),
('5591480','Munoz, Samuel',2,'2026-11-07','V:Almudevar A.D.','7',true,62,0,0,0,944038),
('5591480','Callum, Matthew Cameron',4,'2026-11-07','V:Almudevar A.D.','7',true,90,0,0,0,944038),
('5591480','Halley, Kaasha Fyah Nathaniel',8,'2026-11-07','V:Almudevar A.D.','7',true,90,0,0,0,944038),
('5591480','Yuoh, Kabili Wesseh',9,'2026-11-07','V:Almudevar A.D.','7',true,54,2,0,0,944038),
('5591480','Reina, Jovan Miles',10,'2026-11-07','V:Almudevar A.D.','7',true,46,0,1,0,944038),
('5591480','Sandejas, Jaime Rafael Jacob',13,'2026-11-07','V:Almudevar A.D.','7',true,46,0,0,0,944038),
('5591480','Davitian, Masis Ratevos',15,'2026-11-07','V:Almudevar A.D.','7',true,90,1,0,0,944038),
('5591480','Abrahamyan, Eric',16,'2026-11-07','V:Almudevar A.D.','7',true,54,0,0,0,944038),
('5591480','Yuoh, Kaifa Kley',19,'2026-11-07','V:Almudevar A.D.','7',true,46,1,0,0,944038),
('5591480','James, Sebastian Gerrard',21,'2026-11-07','V:Almudevar A.D.','7',true,62,0,0,0,944038),
('5591480','Pandey, Sagan Behadur',22,'2026-11-07','V:Almudevar A.D.','7',true,90,0,0,0,944038),
('5591480','Prediger, Lucas Giancarlo Santoro',1,'2026-11-07','V:Almudevar A.D.','7',false,44,0,0,0,944038),
('5591480','Shteynberg, Daniel Michael',6,'2026-11-07','V:Almudevar A.D.','7',false,28,0,0,0,944038),
('5591480','Fondop, Yohan Elysee',7,'2026-11-07','V:Almudevar A.D.','7',false,44,0,1,0,944038),
('5591480','Papanayotou, Konstantinos',11,'2026-11-07','V:Almudevar A.D.','7',false,28,0,0,0,944038),
('5591480','Solomon, Luke Aiden',14,'2026-11-07','V:Almudevar A.D.','7',false,36,0,0,0,944038),
('5591480','Mejias, Gianluca Lorenzo',17,'2026-11-07','V:Almudevar A.D.','7',false,44,0,1,0,944038),
('5591480','Cury Martino, Lucas',18,'2026-11-07','V:Almudevar A.D.','7',false,36,1,0,0,944038),
('23215033','Malo Vento, Alex',1,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,0,0,0,951464),
('23215033','Rodrigo Oros, Alvaro',2,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,0,0,0,951464),
('23215033','Gabunia, Demetre',3,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,0,0,0,951464),
('23215033','Bercero Barreña, Alberto',4,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,0,0,0,951464),
('23215033','García Santander, Izan',8,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,1,0,0,951464),
('23215033','Zaoui Miftah El Khair, Mohamed',10,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,2,0,0,951464),
('23215033','Lozano Roman, Iker',11,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,2,0,0,951464),
('23215033','Escario Diaz, Alejandro',12,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,0,0,0,951464),
('23215033','Rodriguez Flores, Jonathan David',19,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,1,0,0,951464),
('23215033','Suciu Maris, Alex Iuan',20,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,0,0,0,951464),
('23215033','Lanaspa Gil, Lizer',22,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',true,70,1,0,0,951464),
('23215033','Torres Sazatornil, Manuel',5,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',false,0,0,0,0,951464),
('23215033','Lopez Lozano, Aaron Natalio',7,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',false,0,0,0,0,951464),
('23215033','Perez Walon, Victor',9,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',false,0,3,0,0,951464),
('23215033','Nasarre Escar, Adrián',13,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',false,0,0,0,0,951464),
('23215033','Prieto Verde, Javier',15,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',false,0,0,0,0,951464),
('23215033','Diallo Diallo, Ibrahima',17,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',false,0,0,0,0,951464),
('23215033','Lahlal Errafay, Adham',18,'2026-11-07','L:Jacetano-C.F. Castiello de Jaca','6',false,0,1,0,0,951464),
('23292361','Lascorz Muñoz, Nicolas',3,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Sorochenko, Vladimir',5,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Rais Sarghini, Nizar',7,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Chait, Zakariae',8,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Mateo Brun, Eloy',11,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Diaw Ndiaye, Abdoul Aziz',12,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Garcia Estallo, Acher',13,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Rodriguez Moreno, Rafael',14,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Trawally Juwara, Mahamadou',15,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Alvarez Essindi, Charles Raphael',16,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Boukraa Belahbib, Ayman',17,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',true,70,0,0,0,951465),
('23292361','Miro Perez, Gabriel',1,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',false,0,0,0,0,951465),
('23292361','El Hasnaqui Ben Fedoul, Khalid',4,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',false,0,0,1,0,951465),
('23292361','Serna Kindo, Ángel Marcelo',6,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',false,0,0,0,0,951465),
('23292361','Segura Arruego, Jorge',9,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',false,0,0,0,0,951465),
('23292361','Sissoko, Makan',10,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',false,0,0,0,0,951465),
('23292361','Santiago',19,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',false,0,0,0,0,951465),
('23292361','Paz Marquez, Diego Roberto',20,'2026-11-07','V:Escuela Futbol Oscense-C.D. P. Castillo Finanweska','6',false,0,0,0,0,951465),
('6073640','Krejsing, Andre Nolfi',1,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,0,0,0,952197),
('6073640','Almudevar Monclus, Asier',2,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,0,0,0,952197),
('6073640','Salazar Mahecha, Pablo',3,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,0,0,0,952197),
('6073640','Losfablos Chacon, Mateo',5,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,0,0,0,952197),
('6073640','Marquina Gimenez, Miguel',7,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,0,0,0,952197),
('6073640','Marino, Marco Salvatore',8,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,1,0,0,952197),
('6073640','Castillo Gonzalez, Yeuri',14,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,0,1,0,952197),
('6073640','Santolaria Santolaria, Eloy',16,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,0,0,0,952197),
('6073640','Paz Marquez, Angel Gabriel',20,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,0,0,0,952197),
('6073640','Kessler, Tyler Russell',21,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,0,0,0,952197),
('6073640','Myrzaly, Zanggar',22,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',true,80,1,0,0,952197),
('6073640','Bordas Al Yaluli, Ismael',4,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',false,0,0,0,0,952197),
('6073640','Ziani El Kanar, Islam',6,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',false,0,0,0,0,952197),
('6073640','Stojanovic, Aleksandar',10,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',false,0,0,0,0,952197),
('6073640','Ibor Arazo, Neizan',11,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',false,0,0,0,0,952197),
('6073640','Perez Kandyurin, Oscar',12,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',false,0,0,0,0,952197),
('6073640','Mera, Eugen Andy',13,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',false,0,0,0,0,952197),
('6073640','Yaqublu, Hasan',19,'2026-11-07','V:Sabiñanigo-A.D. Futbol Base','5',false,0,0,0,0,952197),
('23215262','Escario Pastor, Alejandro',1,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Escartin Gracia, Dylan',2,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Sazatornil Arnedo, Arles',3,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Mendoza Munguia, Irvin Daniel',5,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Sazatornil Arnedo, Bosco',6,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','El Aitour Boubnaina, Mohamed Ali',10,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Gimenez Gimenez, Luis Miguel',14,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Bouali Sbaai, Abdeljalil',15,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Ascaso Sierra, Martin',16,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Dieste Lascorz, Fernando',20,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Laliena Añon, Izan',22,'2026-11-07','V:El Salvador-S.D. "A"','6',true,60,0,0,0,960017),
('23215262','Bah Bah, Alfaoumarou',8,'2026-11-07','V:El Salvador-S.D. "A"','6',false,0,0,0,0,960017),
('23215262','Ezaoui Kouraj, Yahya',9,'2026-11-07','V:El Salvador-S.D. "A"','6',false,0,2,0,0,960017),
('23215262','Carrasquer Garuz, Iago',11,'2026-11-07','V:El Salvador-S.D. "A"','6',false,0,1,0,0,960017),
('23215262','Añaños Carceller, Olmo',12,'2026-11-07','V:El Salvador-S.D. "A"','6',false,0,0,0,0,960017),
('23215262','Bouali Sbaai, Youssef',18,'2026-11-07','V:El Salvador-S.D. "A"','6',false,0,0,0,0,960017),
('5004161','Li, Jinxun',2,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',true,60,2,0,0,969997),
('5004161','Chihab Otmane, Hamza',3,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',true,60,0,0,0,969997),
('5004161','Chattaf Sfiri, Mohammed Amine',6,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',true,60,2,0,0,969997),
('5004161','Ziani Zeyeni, Mohamed Yassin',10,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',true,60,0,0,0,969997),
('5004161','Diallo Diallo, Abdoulrahmane',11,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',true,60,0,0,0,969997),
('5004161','Castan Lopez, Jorge',13,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',true,60,0,0,0,969997),
('5004161','Yang, Haoran',16,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',true,60,1,0,0,969997),
('5004161','Ibnou Bouzid, Ali',17,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',true,60,0,0,0,969997),
('5004161','El Khaoua Mustaphi, Rayan',1,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',false,0,0,0,0,969997),
('5004161','Sghir Braik, Ilyas',7,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',false,0,0,0,0,969997),
('5004161','Amaya Ruano, Isaac',8,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',false,0,0,0,0,969997),
('5004161','Massa Otmane, Mehdi',9,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',false,0,0,0,0,969997),
('5004161','Brun Cubeles, Jose',14,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',false,0,0,0,0,969997),
('5004161','Hernandez Paul, Enrique',15,'2026-11-07','L:Escuela Futbol Oscense-C.D. ''C''','4',false,0,0,0,0,969997);

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

-- Comprobación: partidos 07-08/11 con acta y marcador
SELECT jornada, local_team, visitor_team, score, status, acta_fed IS NOT NULL AS tiene_acta
  FROM eventos_calendario
 WHERE type = 'Partido' AND club_id = 'escuela-huesca'
   AND date >= '2026-11-06' AND date < '2026-11-09'
 ORDER BY date, jornada;
