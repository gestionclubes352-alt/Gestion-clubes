-- =====================================================================
-- Sincroniza las plantillas con los datos de la Federación (temporada 2026-27)
-- Origen: BD federativa (ffv-postgres/statsbomb), temporada 2026-2027, equipos del
-- club Huesca (Escuela). Solo se tocan los equipos de ese club.
--
-- NO borra y reinserta a ciegas: conserva el id de los jugadores que ya
-- existen (coinciden por nombre), de modo que sus OBJETIVOS INDIVIDUALES,
-- RESIDENCIA, lesiones, mediciones y usuario vinculado se mantienen.
--   1) Backup de plantillas, objetivos_individuales y residencia_jugadores.
--   2) Jugadores existentes que coinciden con la federación -> UPDATE
--      (datos federativos; se conserva fecha de nacimiento, foto, etc.).
--   3) Jugadores existentes que NO están en la federación -> se borran
--      salvo que tengan objetivos, residencia o usuario (esos se conservan).
--   4) Jugadores federados nuevos -> INSERT.
-- Equipos: Primer equipo, Juvenil A-D, Cadete A-D, Infantil A-D, Alevín A y B.
-- (Infantil A = Huesca-S.D. EF División Honor; Infantil B = Huesca-S.D. EF Preferente;
--  Infantil C = Ipc la Escuela "A"; Infantil D = Ipc la Escuela "B" -- Primera Infantil.)
-- Revisa los NOTICE finales (conservados sin coincidencia en la federación).
-- =====================================================================

CREATE TABLE IF NOT EXISTS backup_plantillas_20261108 AS TABLE plantillas;
CREATE TABLE IF NOT EXISTS backup_objetivos_individuales_20261108 AS TABLE objetivos_individuales;
CREATE TABLE IF NOT EXISTS backup_residencia_jugadores_20261108 AS TABLE residencia_jugadores;

CREATE OR REPLACE FUNCTION pg_temp.norm_key(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
    SELECT string_agg(w, ' ' ORDER BY w) FROM unnest(regexp_split_to_array(
        btrim(regexp_replace(translate(upper(COALESCE(t,'')), 'ÁÉÍÓÚÜÀÈÌÒÙ', 'AEIOUUAEIOU'), '[^A-Z0-9Ñ ]', ' ', 'g')),
        '\s+')) w WHERE w <> ''
$f$;

DO $$
DECLARE
    r RECORD;
    n_upd INT := 0; n_del INT := 0; n_ins INT := 0;
BEGIN
    CREATE TEMP TABLE fed (equipo_nombre text, nombre_pila text, apellidos text, apodo text, dorsal int,
                           equipo_id uuid, nombre text, key text, matched_id uuid) ON COMMIT DROP;
    INSERT INTO fed (equipo_nombre, nombre_pila, apellidos, apodo, dorsal) VALUES
    ('Primer equipo','Alan Pawel','Andrzejewsk',NULL,13),
    ('Primer equipo','Jorge','Arechavaleta Ciordia',NULL,16),
    ('Primer equipo','Marc','Barrantes Campo',NULL,17),
    ('Primer equipo','Hugo','Bautista Jimenez',NULL,7),
    ('Primer equipo','Erik','Beattie Orfila',NULL,11),
    ('Primer equipo','Marco','Beltran Alonso',NULL,22),
    ('Primer equipo','Pau','Calvo Martinez',NULL,24),
    ('Primer equipo','Alassane','Diallo',NULL,5),
    ('Primer equipo','Ivan','Eroles Prats',NULL,1),
    ('Primer equipo','Daniel','Fernandez Salinas',NULL,19),
    ('Primer equipo','Danel','Garcia Quindos',NULL,6),
    ('Primer equipo','Alberto','Guillen Gomez',NULL,10),
    ('Primer equipo','Oleksandr','Kosariev',NULL,1),
    ('Primer equipo','Pablo','Melero Camara',NULL,4),
    ('Primer equipo','Adria','Mendez Gomez',NULL,8),
    ('Primer equipo','Sergio','Mercadal Camisón',NULL,21),
    ('Primer equipo','Reynold Bryan','Monnie',NULL,3),
    ('Primer equipo','Wagner Roberth','Palacios Hinestroza',NULL,15),
    ('Primer equipo','Adria','Petit Ortiz',NULL,9),
    ('Primer equipo','Joaquin','Reist',NULL,20),
    ('Primer equipo','Adria','Rubira Colas',NULL,23),
    ('Primer equipo','Alejandro','Subias Martinez',NULL,14),
    ('Juvenil A','Manel','Anglada Dieguez',NULL,16),
    ('Juvenil A','Victor','Aroca Bernuz',NULL,1),
    ('Juvenil A','Ramon','Barral Pau',NULL,22),
    ('Juvenil A','Guillermo','Casado Perez',NULL,13),
    ('Juvenil A','Ricard','Casals Almacellas',NULL,11),
    ('Juvenil A','Alvaro','Casanova Laso',NULL,20),
    ('Juvenil A','Alberto','Cea Rubio',NULL,14),
    ('Juvenil A','Eshak','Eddafiri Hajji',NULL,12),
    ('Juvenil A','Cesar','Gonzalez Garcia',NULL,9),
    ('Juvenil A','Javier','Ingalaturre Cano',NULL,17),
    ('Juvenil A','Alejandro Aladino','Junquera Franco',NULL,21),
    ('Juvenil A','Sergio','Junquera Franco',NULL,13),
    ('Juvenil A','Ruben','Lamarca Jauregui',NULL,5),
    ('Juvenil A','Bruno','Mur Marin',NULL,19),
    ('Juvenil A','Mohamad H','Najdi',NULL,7),
    ('Juvenil A','Lucas','Navallas Orrit',NULL,3),
    ('Juvenil A','Nestor Vicente Vicente',NULL,NULL,6),
    ('Juvenil A','Stevan Yolexander','Reina',NULL,8),
    ('Juvenil A','Miguel','Sopena Garrapiz',NULL,4),
    ('Juvenil A','Christian Rene','Tshiteya',NULL,18),
    ('Juvenil A','David','Villabona Negrete',NULL,10),
    ('Cadete C','Francisco Javier','Aragones Allue',NULL,5),
    ('Cadete C','Alan Steven','Balanta Zambrano',NULL,7),
    ('Cadete C','Bruno','Benedicto Barrio',NULL,3),
    ('Cadete C','Ivan','Cavero Blanco',NULL,19),
    ('Cadete C','Fahd','Chattaf Sfiri',NULL,11),
    ('Cadete C','Pablo','Hernandez Valentin',NULL,2),
    ('Cadete C','Adam','Kaber',NULL,22),
    ('Cadete C','Nicolas','Laguna Lamana',NULL,1),
    ('Cadete C','Sergio','Malo Vento',NULL,6),
    ('Cadete C','Daniel','Pérez Gascon',NULL,15),
    ('Cadete C','David Alessandro','Pineda Palacios',NULL,12),
    ('Cadete C','Aritz','Plasin del Campo',NULL,17),
    ('Cadete C','Daren','Plaza Daga',NULL,10),
    ('Cadete C','Alejandro','Romero Banzo',NULL,4),
    ('Cadete C','Hector','Samitier Laliena',NULL,14),
    ('Cadete C','Omar Fai','Sissoho',NULL,9),
    ('Cadete C','Urbez','Susín Gracia',NULL,21),
    ('Cadete C','Marcos','Tellechea Perez',NULL,8),
    ('Cadete C','Mateo','Vitales Til',NULL,16),
    ('Juvenil C','Hector','Alvarez Carrillo',NULL,16),
    ('Juvenil C','Enzo','Aso Gomez',NULL,2),
    ('Juvenil C','Lorien','Barrio Arazo',NULL,12),
    ('Juvenil C','Yeray','Cantero Marin',NULL,7),
    ('Juvenil C','Boubakar','Diallo Diallo',NULL,6),
    ('Juvenil C','Bousslham','El Aitour Boubnaina',NULL,11),
    ('Juvenil C','Jake Daniel Duarte','Ferreira',NULL,18),
    ('Juvenil C','Ivan','Garcia Moreu',NULL,19),
    ('Juvenil C','Rodrigo','German Bibian',NULL,21),
    ('Juvenil C','Iker','Grande Sanchez',NULL,4),
    ('Juvenil C','Jacobo','Hidalgo Monesma',NULL,8),
    ('Juvenil C','Mauro','Laplaza Ortega',NULL,15),
    ('Juvenil C','Sebastian Asbun','Maranon',NULL,20),
    ('Juvenil C','Isaac','Mellado Mingarro',NULL,9),
    ('Juvenil C','Nicolas','Montoya Belanche',NULL,10),
    ('Juvenil C','Gonzalo','Rivas Ballesteros',NULL,16),
    ('Juvenil C','Oliver Santiago','Routh',NULL,13),
    ('Juvenil C','Angel Yoel','Santos Abadia',NULL,17),
    ('Juvenil C','Braylon James','Walker',NULL,5),
    ('Juvenil C','Reid Milo','Way',NULL,1),
    ('Cadete A','Daniel','Abadias Otal',NULL,9),
    ('Cadete A','Yusuf Abdifatah','Ahmed',NULL,7),
    ('Cadete A','Ryan','Aziaba',NULL,10),
    ('Cadete A','Osama','Bachiri Bartal',NULL,8),
    ('Cadete A','Flavio','Bardaji Bretcanu',NULL,4),
    ('Cadete A','David','Bielsa Alonso',NULL,12),
    ('Cadete A','Hugo','Bueno Benet',NULL,2),
    ('Cadete A','Alvaro','Burriel Marco',NULL,18),
    ('Cadete A','Jonedwin Gabriel','De los Santos Saviñon',NULL,3),
    ('Cadete A','Bohdan','Dmytryk',NULL,13),
    ('Cadete A','Adrian','Espurz Redon',NULL,1),
    ('Cadete A','Kirill','Kapitan',NULL,5),
    ('Cadete A','Jorge','Lagüéns Angarón',NULL,21),
    ('Cadete A','Angel','Laplaza Arnal',NULL,1),
    ('Cadete A','Luka','Lapshin',NULL,20),
    ('Cadete A','Felix Boje','Rasmussen',NULL,19),
    ('Cadete A','Javier','Rodriguez Lancho',NULL,11),
    ('Cadete A','Iker','Rubira Castro',NULL,15),
    ('Cadete A','Luka','Svilar',NULL,17),
    ('Cadete A','Adrian','Viñuales Rodriguez',NULL,6),
    ('Cadete A','Matthew Stephen','Vogelsberg',NULL,22),
    ('Cadete A','Reinis','Zmogins',NULL,13),
    ('Infantil A','Jonathan David','Alvarado Sevilla',NULL,14),
    ('Infantil A','Andrés','Armas Villarroel',NULL,22),
    ('Infantil A','Javier','Barba Santolaria',NULL,16),
    ('Infantil A','Nasirou','Diallo Diallo',NULL,4),
    ('Infantil A','Bohdan','Dmytryk',NULL,13),
    ('Infantil A','Islam','El Hajoui El Kalai',NULL,17),
    ('Infantil A','Ilyas','El Rhali El Bardiai',NULL,19),
    ('Infantil A','Alexis','Escartin Gracia',NULL,9),
    ('Infantil A','Fernando','Galindo Esteban',NULL,22),
    ('Infantil A','Adrian','Garrido Molina',NULL,13),
    ('Infantil A','Cesar','Gimenez Lopez',NULL,22),
    ('Infantil A','Cesar Andrés','Guevara Garofalo',NULL,12),
    ('Infantil A','Anthony Daniel','Ibrahim',NULL,17),
    ('Infantil A','Enzo','Lample Sanagustin',NULL,15),
    ('Infantil A','Adrian','Monesma Yebra',NULL,17),
    ('Infantil A','Martin','Olano Espiau',NULL,21),
    ('Infantil A','Saúl','Pascual Fernandes',NULL,15),
    ('Infantil A','Ronald Daniel','Preciado Luna',NULL,11),
    ('Infantil A','Elian','Ramirez',NULL,11),
    ('Infantil A','Nasr Eddine','Remiki',NULL,18),
    ('Infantil A','Adrián','Rodríguez López',NULL,6),
    ('Infantil A','Juan','Roman Lasilla',NULL,20),
    ('Infantil A','Hugo','Rubio Royo',NULL,1),
    ('Infantil A','Chun Lam','So',NULL,21),
    ('Infantil A','Prashaan','Verman',NULL,4),
    ('Infantil B','Omar','Amtil',NULL,4),
    ('Infantil B','Andrés','Armas Villarroel',NULL,18),
    ('Infantil B','Ibrahima','Bah Bah',NULL,2),
    ('Infantil B','Javier','Barba Santolaria',NULL,3),
    ('Infantil B','Mateo','Buil Lasierra',NULL,1),
    ('Infantil B','Eric','Cagigos Peña',NULL,20),
    ('Infantil B','Joel','Cagigos Peña',NULL,8),
    ('Infantil B','Islam','El Hajoui El Kalai',NULL,14),
    ('Infantil B','Anas','El Rhali El Bardiai',NULL,12),
    ('Infantil B','Ilyas','El Rhali El Bardiai',NULL,21),
    ('Infantil B','Victor','Figueredo Hidalgo',NULL,10),
    ('Infantil B','Adrian','Garrido Molina',NULL,13),
    ('Infantil B','Iker','Hurtado Rodriguez',NULL,11),
    ('Infantil B','Yanush','Lapshin',NULL,16),
    ('Infantil B','Marco','Lardies Campo',NULL,5),
    ('Infantil B','Kareem Ibraheem','Mashal',NULL,9),
    ('Infantil B','Iker','Pascual Fernandes',NULL,19),
    ('Infantil B','Saúl','Pascual Fernandes',NULL,7),
    ('Infantil B','Francisco','Piedrafita Porquet',NULL,6),
    ('Infantil B','Adrián','Rodríguez López',NULL,15),
    ('Alevín B','Isaac','Amaya Ruano',NULL,8),
    ('Alevín B','Jose','Brun Cubeles',NULL,14),
    ('Alevín B','Jorge','Castan Lopez',NULL,13),
    ('Alevín B','Mohammed Amine','Chattaf Sfiri',NULL,6),
    ('Alevín B','Hamza','Chihab Otmane',NULL,3),
    ('Alevín B','Abdoulrahmane','Diallo Diallo',NULL,11),
    ('Alevín B','Rayan','El Khaoua Mustaphi',NULL,1),
    ('Alevín B','Enrique','Hernandez Paul',NULL,15),
    ('Alevín B','Ali','Ibnou Bouzid',NULL,17),
    ('Alevín B','Jinxun','Li',NULL,2),
    ('Alevín B','Mehdi','Massa Otmane',NULL,9),
    ('Alevín B','Ilyas','Sghir Braik',NULL,7),
    ('Alevín B','Haoran','Yang',NULL,16),
    ('Alevín B','Mohamed Yassin','Ziani Zeyeni',NULL,10),
    ('Cadete B','Desmond Donald','Addo',NULL,1),
    ('Cadete B','Hugo','Ardanuy Ramon',NULL,19),
    ('Cadete B','Alan Ebrain','Bastidas Granados',NULL,19),
    ('Cadete B','Phakin Chalermakas','Boonparsert',NULL,19),
    ('Cadete B','Miguel','Calavia Otin',NULL,2),
    ('Cadete B','Gabriel','Casas da Silva',NULL,11),
    ('Cadete B','Ibrahima Tanou','Diallo Diallo',NULL,18),
    ('Cadete B','Haruto','Ehara',NULL,18),
    ('Cadete B','Iván','Huerva Loriente',NULL,15),
    ('Cadete B','Rayan','Khouta Nihah',NULL,17),
    ('Cadete B','Artur','Kostiuchik',NULL,4),
    ('Cadete B','Andre Nolfi','Krejsing',NULL,13),
    ('Cadete B','Angel','Laplaza Arnal',NULL,13),
    ('Cadete B','Luka','Lapshin',NULL,6),
    ('Cadete B','Bastian Yu Jin','Law',NULL,3),
    ('Cadete B','Manuel','Maestre Sanchez',NULL,22),
    ('Cadete B','Marco','Mallén Cruz',NULL,15),
    ('Cadete B','Alejo','Mellado Mingarro',NULL,10),
    ('Cadete B','Simon','Palomeque Samperiz',NULL,5),
    ('Cadete B','Eric','Pisa Palacin',NULL,14),
    ('Cadete B','Dylan Stif','Quintero Valencia',NULL,13),
    ('Cadete B','Jose Angel','Saldivar Lagraña',NULL,14),
    ('Cadete B','Thanawat','Thanyawatpornkul',NULL,20),
    ('Cadete B','Daniel','Torcal Encontra',NULL,9),
    ('Juvenil B','Eric','Abrahamyan',NULL,16),
    ('Juvenil B','Matthew Cameron','Callum',NULL,4),
    ('Juvenil B','Lucas','Cury Martino',NULL,18),
    ('Juvenil B','Masis Ratevos','Davitian',NULL,15),
    ('Juvenil B','Yohan Elysee','Fondop',NULL,7),
    ('Juvenil B','Ciro','Gioia',NULL,12),
    ('Juvenil B','Kaasha Fyah Nathaniel','Halley',NULL,8),
    ('Juvenil B','Emil Daniel','Heric',NULL,3),
    ('Juvenil B','Sebastian Gerrard','James',NULL,21),
    ('Juvenil B','Alain-Christian','Louima',NULL,5),
    ('Juvenil B','Denzel Bene','Machatine',NULL,20),
    ('Juvenil B','Gianluca Lorenzo','Mejias',NULL,17),
    ('Juvenil B','Samuel','Munoz',NULL,2),
    ('Juvenil B','Sagan Behadur','Pandey',NULL,22),
    ('Juvenil B','Konstantinos','Papanayotou',NULL,11),
    ('Juvenil B','Lucas Giancarlo Santoro','Prediger',NULL,1),
    ('Juvenil B','Jovan Miles','Reina',NULL,10),
    ('Juvenil B','Jaime Rafael Jacob','Sandejas',NULL,13),
    ('Juvenil B','Egor','Shkarpetkin',NULL,14),
    ('Juvenil B','Daniel Michael','Shteynberg',NULL,6),
    ('Juvenil B','Luke Aiden','Solomon',NULL,14),
    ('Juvenil B','Kabili Wesseh','Yuoh',NULL,9),
    ('Juvenil B','Kaifa Kley','Yuoh',NULL,19),
    ('Cadete D','Asier','Almudevar Monclus',NULL,2),
    ('Cadete D','Ismael','Bordas Al Yaluli',NULL,4),
    ('Cadete D','Izan','Bueno Martinez',NULL,18),
    ('Cadete D','Yeuri','Castillo Gonzalez',NULL,14),
    ('Cadete D','Neizan','Ibor Arazo',NULL,11),
    ('Cadete D','Tyler Russell','Kessler',NULL,21),
    ('Cadete D','Andre Nolfi','Krejsing',NULL,1),
    ('Cadete D','Mateo','Losfablos Chacon',NULL,5),
    ('Cadete D','Marco Salvatore','Marino',NULL,8),
    ('Cadete D','Miguel','Marquina Gimenez',NULL,7),
    ('Cadete D','Eugen Andy','Mera',NULL,13),
    ('Cadete D','Zanggar','Myrzaly',NULL,22),
    ('Cadete D','Angel Gabriel','Paz Marquez',NULL,20),
    ('Cadete D','Oscar','Perez Kandyurin',NULL,12),
    ('Cadete D','Pablo','Salazar Mahecha',NULL,3),
    ('Cadete D','Eloy','Santolaria Santolaria',NULL,16),
    ('Cadete D','Aleksandar','Stojanovic',NULL,10),
    ('Cadete D','Omar','Touil Maliki',NULL,19),
    ('Cadete D','Islam','Ziani El Kanar',NULL,19),
    ('Juvenil D','Aran','Ascaso Castellarnau',NULL,12),
    ('Juvenil D','Soulaymane','Diallo Diallo',NULL,6),
    ('Juvenil D','Papa Daouda','Diaw Ndiaye',NULL,7),
    ('Juvenil D','Miguel','Fuentes Viñuales',NULL,1),
    ('Juvenil D','Raul','Garcia Gaston',NULL,5),
    ('Juvenil D','Diego Alonso','Hermosilla Sanchez',NULL,13),
    ('Juvenil D','Master Tanasith','Hransak',NULL,19),
    ('Juvenil D','Pedro Luis','Lopes Silva',NULL,9),
    ('Juvenil D','Adam','Maa Zehar Rais',NULL,20),
    ('Juvenil D','Bruno','Mediano Melero',NULL,2),
    ('Juvenil D','Alejandro','Pastor Opere',NULL,8),
    ('Juvenil D','Dylan Stif','Quintero Valencia',NULL,13),
    ('Juvenil D','Walid','Remiki',NULL,3),
    ('Juvenil D','Saul','Romero Banzo',NULL,10),
    ('Juvenil D','Juan Jose','Saldivar Lagraña',NULL,11),
    ('Juvenil D','Fausto Mateo','Sanango Garofalo',NULL,4),
    ('Juvenil D','Egor','Shkarpetkin',NULL,14),
    ('Juvenil D','Chi Fung','Si Tou',NULL,17),
    ('Juvenil D','Elzhan','Tassybekov',NULL,16),
    ('Juvenil D','Rafik','Tchatchibara Amadou',NULL,15),
    ('Infantil C','Alberto','Bercero Barreña',NULL,4),
    ('Infantil C','Iago','Carrasquer Garuz',NULL,12),
    ('Infantil C','Ibrahima','Diallo Diallo',NULL,17),
    ('Infantil C','Alejandro','Escario Diaz',NULL,12),
    ('Infantil C','Demetre','Gabunia',NULL,3),
    ('Infantil C','Izan','García Santander',NULL,8),
    ('Infantil C','Adham','Lahlal Errafay',NULL,18),
    ('Infantil C','Lizer','Lanaspa Gil',NULL,22),
    ('Infantil C','Aaron Natalio','Lopez Lozano',NULL,7),
    ('Infantil C','Iker','Lozano Roman',NULL,11),
    ('Infantil C','Alex','Malo Vento',NULL,1),
    ('Infantil C','Adrián','Nasarre Escar',NULL,13),
    ('Infantil C','Noel',NULL,NULL,16),
    ('Infantil C','Victor','Perez Walon',NULL,9),
    ('Infantil C','Javier','Prieto Verde',NULL,25),
    ('Infantil C','Alvaro','Rodrigo Oros',NULL,2),
    ('Infantil C','Jonathan David','Rodriguez Flores',NULL,19),
    ('Infantil C','Martin','Santolaria Gavin',NULL,6),
    ('Infantil C','Alex Iuan','Suciu Maris',NULL,20),
    ('Infantil C','Aruseb Assami','Tiemtore Compaore',NULL,21),
    ('Infantil C','Manuel','Torres Sazatornil',NULL,5),
    ('Infantil C','Nacho','Vicente Lores',NULL,14),
    ('Infantil C','Mohamed','Zaoui Miftah El Khair',NULL,10),
    ('Alevín A','Olmo','Añaños Carceller',NULL,12),
    ('Alevín A','Martin','Ascaso Sierra',NULL,16),
    ('Alevín A','Alfaoumarou','Bah Bah',NULL,8),
    ('Alevín A','Abdeljalil','Bouali Sbaai',NULL,15),
    ('Alevín A','Youssef','Bouali Sbaai',NULL,18),
    ('Alevín A','Iago','Carrasquer Garuz',NULL,11),
    ('Alevín A','Jorge','Castan Lopez',NULL,1),
    ('Alevín A','Fernando','Dieste Lascorz',NULL,20),
    ('Alevín A','Mohamed Ali','El Aitour Boubnaina',NULL,10),
    ('Alevín A','Alejandro','Escario Pastor',NULL,1),
    ('Alevín A','Dylan','Escartin Gracia',NULL,2),
    ('Alevín A','Yahya','Ezaoui Kouraj',NULL,9),
    ('Alevín A','Luis Miguel','Gimenez Gimenez',NULL,14),
    ('Alevín A','Omar','Kaber',NULL,7),
    ('Alevín A','Izan','Laliena Añon',NULL,22),
    ('Alevín A','Jinxun','Li',NULL,21),
    ('Alevín A','Jose David','Lopez Carvajal',NULL,13),
    ('Alevín A','Mehdi','Massa Otmane',NULL,4),
    ('Alevín A','Irvin Daniel','Mendoza Munguia',NULL,5),
    ('Alevín A','Arles','Sazatornil Arnedo',NULL,3),
    ('Alevín A','Bosco','Sazatornil Arnedo',NULL,6),
    ('Infantil D','Charles Raphael','Alvarez Essindi',NULL,16),
    ('Infantil D','Ayman','Boukraa Belahbib',NULL,17),
    ('Infantil D','Jorge','Castan Lopez',NULL,1),
    ('Infantil D','Zakariae','Chait',NULL,8),
    ('Infantil D','Abdoul Aziz','Diaw Ndiaye',NULL,12),
    ('Infantil D','Khalid','El Hasnaqui Ben Fedoul',NULL,4),
    ('Infantil D','Guillermo','Fuentes Villafranca',NULL,22),
    ('Infantil D','Acher','Garcia Estallo',NULL,13),
    ('Infantil D','Nicolas','Lascorz Muñoz',NULL,3),
    ('Infantil D','Eloy','Mateo Brun',NULL,11),
    ('Infantil D','Gabriel','Miro Perez',NULL,1),
    ('Infantil D','Diego Roberto','Paz Marquez',NULL,20),
    ('Infantil D','Nizar','Rais Sarghini',NULL,7),
    ('Infantil D','Rafael','Rodriguez Moreno',NULL,14),
    ('Infantil D','Santiago',NULL,NULL,19),
    ('Infantil D','Jorge','Segura Arruego',NULL,9),
    ('Infantil D','Ángel Marcelo','Serna Kindo',NULL,6),
    ('Infantil D','Makan','Sissoko',NULL,10),
    ('Infantil D','Vladimir','Sorochenko',NULL,5),
    ('Infantil D','Yerai Dario','Suarez Sanchez',NULL,21),
    ('Infantil D','Mahamadou','Trawally Juwara',NULL,15),
    ('Infantil D','Santiago','Yaya Huertas',NULL,18),
    ('Primer equipo','Alejandro','Quiroz Laosa',NULL,18);

    -- equipo destino (propio, por nombre)
    UPDATE fed f SET equipo_id = (SELECT e.id FROM equipos e JOIN clubes c ON c.id = e.club_id
                                  WHERE e.nombre = f.equipo_nombre AND COALESCE(e.es_rival, false) = false
                                    AND c.nombre ILIKE '%huesca%'
                                  ORDER BY (c.nombre ILIKE '%escuela%') DESC, c.created_at LIMIT 1);
    IF EXISTS (SELECT 1 FROM fed WHERE equipo_id IS NULL) THEN
        RAISE EXCEPTION 'Equipos sin correspondencia: %',
            (SELECT string_agg(DISTINCT equipo_nombre, ', ') FROM fed WHERE equipo_id IS NULL);
    END IF;

    UPDATE fed SET apellidos = COALESCE(apellidos, ''), nombre_pila = COALESCE(nombre_pila, '');
    UPDATE fed SET nombre = upper(btrim(nombre_pila || ' ' || apellidos)),
                   key = pg_temp.norm_key(nombre_pila || ' ' || apellidos);

    -- jugadores propios existentes
    CREATE TEMP TABLE cur ON COMMIT DROP AS
      SELECT p.id, p.equipo_id, pg_temp.norm_key(p.nombre) AS key
      FROM plantillas p WHERE p.equipo_id IN (SELECT equipo_id FROM fed);

    -- a) coincidencia exacta (mismos tokens), preferentemente en el mismo equipo
    UPDATE fed f SET matched_id = (SELECT c.id FROM cur c WHERE c.key = f.key
                                   ORDER BY (c.equipo_id = f.equipo_id) DESC LIMIT 1);

    -- b) coincidencia por inclusión (la app suele tener 1 apellido): candidato único en el mismo equipo
    UPDATE fed f SET matched_id = (
        SELECT c.id FROM cur c
        WHERE c.equipo_id = f.equipo_id
          AND array_length(string_to_array(c.key, ' '), 1) >= 2
          AND string_to_array(c.key, ' ') <@ string_to_array(f.key, ' ')
          AND NOT EXISTS (SELECT 1 FROM fed g WHERE g.matched_id = c.id) LIMIT 1)
    WHERE f.matched_id IS NULL
      AND (SELECT count(*) FROM cur c WHERE c.equipo_id = f.equipo_id
             AND array_length(string_to_array(c.key, ' '), 1) >= 2
             AND string_to_array(c.key, ' ') <@ string_to_array(f.key, ' ')) = 1;

    -- dos filas federativas no pueden apuntar al mismo jugador
    UPDATE fed f SET matched_id = NULL
    WHERE matched_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM fed g WHERE g.matched_id = f.matched_id AND g.ctid < f.ctid);

    -- UPDATE de coincidentes: conserva id => objetivos/residencia intactos.
    UPDATE plantillas p SET dorsal = NULL FROM fed f WHERE p.id = f.matched_id;
    UPDATE plantillas p SET
        equipo_id = f.equipo_id, nombre = f.nombre, nombre_completo = f.nombre,
        nombre_pila = initcap(lower(f.nombre_pila)), primer_apellido = NULLIF(initcap(lower(f.apellidos)), ''),
        apodo = COALESCE(NULLIF(f.apodo, ''), p.apodo), temporada = '26/27'
    FROM fed f WHERE p.id = f.matched_id;
    GET DIAGNOSTICS n_upd = ROW_COUNT;

    -- borrar NO federados salvo que tengan datos que conservar
    CREATE TEMP TABLE keep_ids ON COMMIT DROP AS
      SELECT jugador_id AS id FROM objetivos_individuales WHERE jugador_id IS NOT NULL
      UNION SELECT jugador_id FROM residencia_jugadores WHERE jugador_id IS NOT NULL
      UNION SELECT jugador_id FROM usuarios WHERE jugador_id IS NOT NULL
      UNION SELECT matched_id FROM fed WHERE matched_id IS NOT NULL;

    DELETE FROM plantillas p
    WHERE p.equipo_id IN (SELECT equipo_id FROM fed)
      AND p.id NOT IN (SELECT id FROM keep_ids);
    GET DIAGNOSTICS n_del = ROW_COUNT;

    -- INSERT de federados nuevos
    INSERT INTO plantillas (equipo_id, nombre, nombre_completo, nombre_pila, primer_apellido, apodo,
                            dorsal, estado, temporada, etapa)
    SELECT f.equipo_id, f.nombre, f.nombre, initcap(lower(f.nombre_pila)), NULLIF(initcap(lower(f.apellidos)), ''),
           NULLIF(f.apodo, ''),
           CASE WHEN f.rn = 1 AND NOT EXISTS (SELECT 1 FROM plantillas q WHERE q.equipo_id = f.equipo_id AND q.dorsal = f.dorsal)
                THEN f.dorsal END,
           'APTO', '26/27',
           CASE WHEN f.equipo_nombre LIKE 'Juvenil%' THEN 'Juvenil'
                WHEN f.equipo_nombre LIKE 'Cadete%' THEN 'Cadete'
                WHEN f.equipo_nombre LIKE 'Infantil%' THEN 'Infantil'
                WHEN f.equipo_nombre LIKE 'Alev%' THEN 'Alevín' ELSE 'Senior' END
    FROM (SELECT g.*, row_number() OVER (PARTITION BY g.equipo_id, g.dorsal ORDER BY g.ctid) AS rn
          FROM fed g WHERE g.matched_id IS NULL) f;
    GET DIAGNOSTICS n_ins = ROW_COUNT;

    -- dorsal de los actualizados (sin chocar con otro del equipo)
    UPDATE plantillas p SET dorsal = f.dorsal
    FROM (SELECT g.*, row_number() OVER (PARTITION BY g.equipo_id, g.dorsal ORDER BY g.ctid) AS rn
          FROM fed g WHERE g.matched_id IS NOT NULL AND g.dorsal IS NOT NULL) f
    WHERE p.id = f.matched_id AND f.rn = 1
      AND NOT EXISTS (SELECT 1 FROM plantillas q WHERE q.equipo_id = f.equipo_id AND q.dorsal = f.dorsal AND q.id <> p.id);

    RAISE NOTICE 'Actualizados: %, borrados: %, insertados: %', n_upd, n_del, n_ins;

    FOR r IN
        SELECT e.nombre AS equipo, p.nombre FROM plantillas p JOIN equipos e ON e.id = p.equipo_id
        WHERE p.equipo_id IN (SELECT equipo_id FROM fed)
          AND p.id NOT IN (SELECT matched_id FROM fed WHERE matched_id IS NOT NULL)
          AND p.temporada IS DISTINCT FROM '26/27'
    LOOP
        RAISE NOTICE 'CONSERVADO sin coincidencia federativa (tiene objetivos/residencia/usuario): % - %', r.equipo, r.nombre;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
