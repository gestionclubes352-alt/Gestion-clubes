-- Escudos oficiales extraidos de Futbol Aragon para LIGA NACIONAL JUVENIL,
-- Grupo 6, temporada 2026/2027. Actualiza registros existentes sin crear
-- clubes/equipos nuevos ni modificar URLs ya cargadas manualmente.

WITH escudos(nombre, logo_url) AS (
  VALUES
    ('E.F.B. EJEA', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000386921_2.jpg'),
    ('CALAMOCHA-C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000037092_ESCUDO%20CF%20FUTBOL%20CALAMOCHA2.jpg'),
    ('AMISTAD-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000051358_amistad%20logo.jpg'),
    ('ESTADIO MIRALBUENO EL OLIVAR', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000052164_Escudo_El_Olivar.jpg'),
    ('RACING CLUB ZARAGOZA', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000111548_unnamed1.jpg'),
    ('SANTO DOMINGO JUVENTUD C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000041942_santo%20d.juventud.jpg'),
    ('HERNAN CORTES JUNQUERA-C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000274922_escudo.png'),
    ('FRAGA-FÚTBOL BASE', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000149281_ESCUDO.jpg'),
    ('SAN GREGORIO ARRABAL-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000038152_san-gregorio.jpg'),
    ('IPC LA ESCUELA', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png'),
    ('REAL ZARAGOZA S.A.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000047835_Escudo-Zaragoza.jpg'),
    ('HUESCA-S.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000223477_huesca_sd.png'),
    ('STADIUM CASABLANCA-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000039874_Escudo%20Stadium.jpg'),
    ('EBRO-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000169078_CD_EBRO.jpg'),
    ('OLIVER-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000070387_CDO.jpg'),
    ('MONTECARLO-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000041121_ESCUDITO2.jpg'),
    ('LA LITERA-ESCUELA DEP.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000157222_ESCUDO_E.D._LA_LITERA.jpg'),
    ('BALSAS PICARRAL-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000391775_escudo.jpg')
)
UPDATE equipos e
SET logo_url = escudos.logo_url
FROM escudos
WHERE (e.logo_url IS NULL OR e.logo_url = '')
  AND (
    upper(e.nombre) = escudos.nombre
    OR upper(coalesce(e.nombre_en_fed, '')) = escudos.nombre
  );

WITH escudos(nombre, logo_url) AS (
  VALUES
    ('E.F.B. EJEA', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000386921_2.jpg'),
    ('CALAMOCHA-C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000037092_ESCUDO%20CF%20FUTBOL%20CALAMOCHA2.jpg'),
    ('AMISTAD-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000051358_amistad%20logo.jpg'),
    ('ESTADIO MIRALBUENO EL OLIVAR', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000052164_Escudo_El_Olivar.jpg'),
    ('RACING CLUB ZARAGOZA', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000111548_unnamed1.jpg'),
    ('SANTO DOMINGO JUVENTUD C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000041942_santo%20d.juventud.jpg'),
    ('HERNAN CORTES JUNQUERA-C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000274922_escudo.png'),
    ('FRAGA-FÚTBOL BASE', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000149281_ESCUDO.jpg'),
    ('SAN GREGORIO ARRABAL-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000038152_san-gregorio.jpg'),
    ('IPC LA ESCUELA', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png'),
    ('REAL ZARAGOZA S.A.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000047835_Escudo-Zaragoza.jpg'),
    ('HUESCA-S.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000223477_huesca_sd.png'),
    ('STADIUM CASABLANCA-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000039874_Escudo%20Stadium.jpg'),
    ('EBRO-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000169078_CD_EBRO.jpg'),
    ('OLIVER-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000070387_CDO.jpg'),
    ('MONTECARLO-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000041121_ESCUDITO2.jpg'),
    ('LA LITERA-ESCUELA DEP.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000157222_ESCUDO_E.D._LA_LITERA.jpg'),
    ('BALSAS PICARRAL-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000391775_escudo.jpg')
)
UPDATE equipos_rivales r
SET escudo_url = escudos.logo_url
FROM escudos
WHERE (r.escudo_url IS NULL OR r.escudo_url = '')
  AND upper(r.nombre) = escudos.nombre;

WITH escudos(nombre, logo_url) AS (
  VALUES
    ('E.F.B. EJEA', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000386921_2.jpg'),
    ('CALAMOCHA-C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000037092_ESCUDO%20CF%20FUTBOL%20CALAMOCHA2.jpg'),
    ('AMISTAD-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000051358_amistad%20logo.jpg'),
    ('ESTADIO MIRALBUENO EL OLIVAR', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000052164_Escudo_El_Olivar.jpg'),
    ('RACING CLUB ZARAGOZA', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000111548_unnamed1.jpg'),
    ('SANTO DOMINGO JUVENTUD C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000041942_santo%20d.juventud.jpg'),
    ('HERNAN CORTES JUNQUERA-C.F.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000274922_escudo.png'),
    ('FRAGA-FÚTBOL BASE', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000149281_ESCUDO.jpg'),
    ('SAN GREGORIO ARRABAL-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000038152_san-gregorio.jpg'),
    ('IPC LA ESCUELA', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png'),
    ('REAL ZARAGOZA S.A.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000047835_Escudo-Zaragoza.jpg'),
    ('HUESCA-S.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000223477_huesca_sd.png'),
    ('STADIUM CASABLANCA-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000039874_Escudo%20Stadium.jpg'),
    ('EBRO-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000169078_CD_EBRO.jpg'),
    ('OLIVER-C.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000070387_CDO.jpg'),
    ('MONTECARLO-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000041121_ESCUDITO2.jpg'),
    ('LA LITERA-ESCUELA DEP.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000157222_ESCUDO_E.D._LA_LITERA.jpg'),
    ('BALSAS PICARRAL-U.D.', 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000391775_escudo.jpg')
)
UPDATE clubes c
SET escudo_url = escudos.logo_url
FROM escudos
WHERE (c.escudo_url IS NULL OR c.escudo_url = '')
  AND upper(c.nombre) = escudos.nombre;
