// Resultados de partidos jugados por competición federativa (rivales incluidos).
// Generado el 2026-11-09 desde la tabla match del Docker local (ffv-postgres, BD statsbomb).
// Para actualizar: volver a exportar match (jornada, local, visitante, goles) de cada competición.
// Formato de fila: [jornada, local, visitante, 'goles local-goles visitante'].

export type FederationResultRow = [number, string, string, string];

const RAW_FEDERATION_RESULTS_BY_COMPETITION: Record<string, FederationResultRow[]> = {
 "23183313-22-23183314": [
  [
   1,
   "Montecarlo-U.D.",
   "San Gregorio Arrabal-C.D.",
   "2-0"
  ],
  [
   1,
   "San Agustin-C.D.",
   "Balsas Picarral-U.D.",
   "6-5"
  ],
  [
   1,
   "Stadium Casablanca-C.D.",
   "Santo Domingo Juventud C.F.",
   "3-1"
  ],
  [
   1,
   "Amistad-U.D.",
   "Huesca-S.D.",
   "0-4"
  ],
  [
   1,
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "Binefar-Futbol Base",
   "2-2"
  ],
  [
   1,
   "Teruel-C.D.",
   "Racing Club Zaragoza",
   "0-4"
  ],
  [
   1,
   "Real Zaragoza S.A.D.",
   "Oliver-C.D.",
   "3-1"
  ],
  [
   1,
   "Huesca-S.D. Escuela de Futbol",
   "Hernan Cortes Junquera-C.F.",
   "2-1"
  ],
  [
   2,
   "San Gregorio Arrabal-C.D.",
   "Real Zaragoza S.A.D.",
   "1-4"
  ],
  [
   2,
   "Hernan Cortes Junquera-C.F.",
   "San Agustin-C.D.",
   "2-1"
  ],
  [
   2,
   "Santo Domingo Juventud C.F.",
   "Huesca-S.D. Escuela de Futbol",
   "0-4"
  ],
  [
   2,
   "Huesca-S.D.",
   "Stadium Casablanca-C.D.",
   "1-1"
  ],
  [
   2,
   "Binefar-Futbol Base",
   "Amistad-U.D.",
   "2-1"
  ],
  [
   2,
   "Racing Club Zaragoza",
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "2-2"
  ],
  [
   2,
   "Oliver-C.D.",
   "Teruel-C.D.",
   "3-0"
  ],
  [
   2,
   "Balsas Picarral-U.D.",
   "Montecarlo-U.D.",
   "2-4"
  ],
  [
   3,
   "San Gregorio Arrabal-C.D.",
   "Balsas Picarral-U.D.",
   "0-0"
  ],
  [
   3,
   "Montecarlo-U.D.",
   "Hernan Cortes Junquera-C.F.",
   "2-2"
  ],
  [
   3,
   "San Agustin-C.D.",
   "Santo Domingo Juventud C.F.",
   "0-0"
  ],
  [
   3,
   "Huesca-S.D. Escuela de Futbol",
   "Huesca-S.D.",
   "1-2"
  ],
  [
   3,
   "Stadium Casablanca-C.D.",
   "Binefar-Futbol Base",
   "4-2"
  ],
  [
   3,
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "Oliver-C.D.",
   "1-4"
  ],
  [
   3,
   "Real Zaragoza S.A.D.",
   "Teruel-C.D.",
   "13-0"
  ],
  [
   3,
   "Amistad-U.D.",
   "Racing Club Zaragoza",
   "2-3"
  ],
  [
   4,
   "Balsas Picarral-U.D.",
   "Real Zaragoza S.A.D.",
   "0-6"
  ],
  [
   4,
   "Hernan Cortes Junquera-C.F.",
   "San Gregorio Arrabal-C.D.",
   "4-1"
  ],
  [
   4,
   "Huesca-S.D.",
   "San Agustin-C.D.",
   "3-1"
  ],
  [
   4,
   "Binefar-Futbol Base",
   "Huesca-S.D. Escuela de Futbol",
   "0-4"
  ],
  [
   4,
   "Racing Club Zaragoza",
   "Stadium Casablanca-C.D.",
   "5-1"
  ],
  [
   4,
   "Teruel-C.D.",
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "0-4"
  ],
  [
   4,
   "Santo Domingo Juventud C.F.",
   "Montecarlo-U.D.",
   "1-0"
  ],
  [
   4,
   "Oliver-C.D.",
   "Amistad-U.D.",
   "2-2"
  ],
  [
   5,
   "Balsas Picarral-U.D.",
   "Hernan Cortes Junquera-C.F.",
   "1-0"
  ],
  [
   5,
   "San Gregorio Arrabal-C.D.",
   "Santo Domingo Juventud C.F.",
   "1-1"
  ],
  [
   5,
   "San Agustin-C.D.",
   "Binefar-Futbol Base",
   "2-5"
  ],
  [
   5,
   "Huesca-S.D. Escuela de Futbol",
   "Racing Club Zaragoza",
   "1-0"
  ],
  [
   5,
   "Stadium Casablanca-C.D.",
   "Oliver-C.D.",
   "3-2"
  ],
  [
   5,
   "Amistad-U.D.",
   "Teruel-C.D.",
   "4-1"
  ],
  [
   5,
   "Real Zaragoza S.A.D.",
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "13-0"
  ],
  [
   5,
   "Montecarlo-U.D.",
   "Huesca-S.D.",
   "2-2"
  ],
  [
   6,
   "Hernan Cortes Junquera-C.F.",
   "Real Zaragoza S.A.D.",
   "0-4"
  ],
  [
   6,
   "Santo Domingo Juventud C.F.",
   "Balsas Picarral-U.D.",
   "2-3"
  ],
  [
   6,
   "Binefar-Futbol Base",
   "Montecarlo-U.D.",
   "2-3"
  ],
  [
   6,
   "Racing Club Zaragoza",
   "San Agustin-C.D.",
   "4-0"
  ],
  [
   6,
   "Oliver-C.D.",
   "Huesca-S.D. Escuela de Futbol",
   "3-5"
  ],
  [
   6,
   "Teruel-C.D.",
   "Stadium Casablanca-C.D.",
   "2-2"
  ],
  [
   6,
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "Amistad-U.D.",
   "4-1"
  ],
  [
   6,
   "Huesca-S.D.",
   "San Gregorio Arrabal-C.D.",
   "4-0"
  ],
  [
   7,
   "Hernan Cortes Junquera-C.F.",
   "Santo Domingo Juventud C.F.",
   "2-1"
  ],
  [
   7,
   "Balsas Picarral-U.D.",
   "Huesca-S.D.",
   "0-1"
  ],
  [
   7,
   "San Gregorio Arrabal-C.D.",
   "Binefar-Futbol Base",
   "3-1"
  ],
  [
   7,
   "San Agustin-C.D.",
   "Oliver-C.D.",
   "2-2"
  ],
  [
   7,
   "Huesca-S.D. Escuela de Futbol",
   "Teruel-C.D.",
   "2-2"
  ],
  [
   7,
   "Stadium Casablanca-C.D.",
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "4-1"
  ],
  [
   7,
   "Real Zaragoza S.A.D.",
   "Amistad-U.D.",
   "6-0"
  ],
  [
   7,
   "Montecarlo-U.D.",
   "Racing Club Zaragoza",
   "1-4"
  ],
  [
   8,
   "Santo Domingo Juventud C.F.",
   "Real Zaragoza S.A.D.",
   "0-4"
  ],
  [
   8,
   "Huesca-S.D.",
   "Hernan Cortes Junquera-C.F.",
   "7-0"
  ],
  [
   8,
   "Binefar-Futbol Base",
   "Balsas Picarral-U.D.",
   "0-1"
  ],
  [
   8,
   "Racing Club Zaragoza",
   "San Gregorio Arrabal-C.D.",
   "3-2"
  ],
  [
   8,
   "Oliver-C.D.",
   "Montecarlo-U.D.",
   "0-2"
  ],
  [
   8,
   "Teruel-C.D.",
   "San Agustin-C.D.",
   "2-2"
  ],
  [
   8,
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "Huesca-S.D. Escuela de Futbol",
   "1-3"
  ],
  [
   8,
   "Amistad-U.D.",
   "Stadium Casablanca-C.D.",
   "2-0"
  ]
 ],
 "23183315-22-23200330": [
  [
   1,
   "Oliver-C.D.",
   "Atletico Teruel C.F.",
   "2-0"
  ],
  [
   1,
   "Fraga-Fútbol Base",
   "Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina",
   "1-0"
  ],
  [
   1,
   "Huesca-S.D. Escuela de Futbol",
   "Amistad-U.D.",
   "2-3"
  ],
  [
   1,
   "Santo Domingo Juventud C.F.",
   "Stadium Casablanca-C.D. Patatas Gómez",
   "5-4"
  ],
  [
   1,
   "Balsas Picarral-U.D.",
   "Huesca-S.D.",
   "0-2"
  ],
  [
   1,
   "Racing Club Zaragoza",
   "Montecarlo-U.D.",
   "2-3"
  ],
  [
   1,
   "Hernan Cortes Junquera-C.F.",
   "Cuarte-C.D.",
   "1-0"
  ],
  [
   1,
   "Teruel-C.D.",
   "Real Zaragoza S.A.D.",
   "2-3"
  ],
  [
   2,
   "Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina",
   "Oliver-C.D.",
   "2-6"
  ],
  [
   2,
   "Amistad-U.D.",
   "Fraga-Fútbol Base",
   "1-0"
  ],
  [
   2,
   "Cuarte-C.D.",
   "Santo Domingo Juventud C.F.",
   "0-1"
  ],
  [
   2,
   "Huesca-S.D.",
   "Hernan Cortes Junquera-C.F.",
   "1-1"
  ],
  [
   2,
   "Real Zaragoza S.A.D.",
   "Balsas Picarral-U.D.",
   "10-0"
  ],
  [
   2,
   "Montecarlo-U.D.",
   "Teruel-C.D.",
   "4-3"
  ],
  [
   2,
   "Atletico Teruel C.F.",
   "Racing Club Zaragoza",
   "0-2"
  ],
  [
   2,
   "Stadium Casablanca-C.D. Patatas Gómez",
   "Huesca-S.D. Escuela de Futbol",
   "4-3"
  ],
  [
   3,
   "Atletico Teruel C.F.",
   "Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina",
   "2-2"
  ],
  [
   3,
   "Huesca-S.D. Escuela de Futbol",
   "Cuarte-C.D.",
   "2-2"
  ],
  [
   3,
   "Santo Domingo Juventud C.F.",
   "Huesca-S.D.",
   "2-0"
  ],
  [
   3,
   "Hernan Cortes Junquera-C.F.",
   "Real Zaragoza S.A.D.",
   "1-12"
  ],
  [
   3,
   "Balsas Picarral-U.D.",
   "Montecarlo-U.D.",
   "2-5"
  ],
  [
   3,
   "Racing Club Zaragoza",
   "Teruel-C.D.",
   "4-1"
  ],
  [
   3,
   "Oliver-C.D.",
   "Amistad-U.D.",
   "0-3"
  ],
  [
   3,
   "Fraga-Fútbol Base",
   "Stadium Casablanca-C.D. Patatas Gómez",
   "1-2"
  ],
  [
   4,
   "Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina",
   "Racing Club Zaragoza",
   "2-10"
  ],
  [
   4,
   "Amistad-U.D.",
   "Atletico Teruel C.F.",
   "2-0"
  ],
  [
   4,
   "Stadium Casablanca-C.D. Patatas Gómez",
   "Oliver-C.D.",
   "3-6"
  ],
  [
   4,
   "Cuarte-C.D.",
   "Fraga-Fútbol Base",
   "1-1"
  ],
  [
   4,
   "Huesca-S.D.",
   "Huesca-S.D. Escuela de Futbol",
   "7-0"
  ],
  [
   4,
   "Real Zaragoza S.A.D.",
   "Santo Domingo Juventud C.F.",
   "3-0"
  ],
  [
   4,
   "Montecarlo-U.D.",
   "Hernan Cortes Junquera-C.F.",
   "3-1"
  ],
  [
   4,
   "Teruel-C.D.",
   "Balsas Picarral-U.D.",
   "2-2"
  ],
  [
   5,
   "Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina",
   "Amistad-U.D.",
   "0-2"
  ],
  [
   5,
   "Oliver-C.D.",
   "Cuarte-C.D.",
   "4-1"
  ],
  [
   5,
   "Huesca-S.D. Escuela de Futbol",
   "Real Zaragoza S.A.D.",
   "0-7"
  ],
  [
   5,
   "Santo Domingo Juventud C.F.",
   "Montecarlo-U.D.",
   "2-1"
  ],
  [
   5,
   "Hernan Cortes Junquera-C.F.",
   "Teruel-C.D.",
   "0-3"
  ],
  [
   5,
   "Racing Club Zaragoza",
   "Balsas Picarral-U.D.",
   "7-0"
  ],
  [
   5,
   "Atletico Teruel C.F.",
   "Stadium Casablanca-C.D. Patatas Gómez",
   "1-1"
  ],
  [
   5,
   "Fraga-Fútbol Base",
   "Huesca-S.D.",
   "1-1"
  ],
  [
   6,
   "Amistad-U.D.",
   "Racing Club Zaragoza",
   "3-3"
  ],
  [
   6,
   "Stadium Casablanca-C.D. Patatas Gómez",
   "Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina",
   "6-4"
  ],
  [
   6,
   "Cuarte-C.D.",
   "Atletico Teruel C.F.",
   "1-2"
  ],
  [
   6,
   "Huesca-S.D.",
   "Oliver-C.D.",
   "3-4"
  ],
  [
   6,
   "Real Zaragoza S.A.D.",
   "Fraga-Fútbol Base",
   "6-0"
  ],
  [
   6,
   "Montecarlo-U.D.",
   "Huesca-S.D. Escuela de Futbol",
   "3-2"
  ],
  [
   6,
   "Teruel-C.D.",
   "Santo Domingo Juventud C.F.",
   "2-4"
  ],
  [
   6,
   "Balsas Picarral-U.D.",
   "Hernan Cortes Junquera-C.F.",
   "0-3"
  ],
  [
   7,
   "Amistad-U.D.",
   "Stadium Casablanca-C.D. Patatas Gómez",
   "2-3"
  ],
  [
   7,
   "Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina",
   "Cuarte-C.D.",
   "0-5"
  ],
  [
   7,
   "Atletico Teruel C.F.",
   "Huesca-S.D.",
   "3-0"
  ],
  [
   7,
   "Oliver-C.D.",
   "Real Zaragoza S.A.D.",
   "1-7"
  ],
  [
   7,
   "Fraga-Fútbol Base",
   "Montecarlo-U.D.",
   "0-4"
  ],
  [
   7,
   "Santo Domingo Juventud C.F.",
   "Balsas Picarral-U.D.",
   "3-0"
  ],
  [
   8,
   "Stadium Casablanca-C.D. Patatas Gómez",
   "Racing Club Zaragoza",
   "4-5"
  ],
  [
   8,
   "Cuarte-C.D.",
   "Amistad-U.D.",
   "1-2"
  ],
  [
   8,
   "Huesca-S.D.",
   "Escuela Futbol Oscense-C.D. Chat. y Desg. Marquina",
   "1-0"
  ],
  [
   8,
   "Real Zaragoza S.A.D.",
   "Atletico Teruel C.F.",
   "9-1"
  ],
  [
   8,
   "Montecarlo-U.D.",
   "Oliver-C.D.",
   "1-4"
  ],
  [
   8,
   "Teruel-C.D.",
   "Fraga-Fútbol Base",
   "2-1"
  ],
  [
   8,
   "Balsas Picarral-U.D.",
   "Huesca-S.D. Escuela de Futbol",
   "1-2"
  ],
  [
   8,
   "Hernan Cortes Junquera-C.F.",
   "Santo Domingo Juventud C.F.",
   "0-1"
  ]
 ],
 "23183316-22-23258924": [
  [
   1,
   "Robres-C.D.",
   "Fraga-U.D.",
   "1-2"
  ],
  [
   1,
   "Tamarite-C.D.J.",
   "Real Zaragoza Deportivo Aragón",
   "1-2"
  ],
  [
   1,
   "Caspe-C.D.",
   "Monzon-Atletico Alumbra",
   "3-0"
  ],
  [
   1,
   "La Almunia-C.D.",
   "Huesca-S.D.",
   "2-2"
  ],
  [
   1,
   "Andorra-C.F.",
   "Binefar-C.D.",
   "2-4"
  ],
  [
   1,
   "Internacional Huesca",
   "Epila-C.F.-A.D.",
   "0-2"
  ],
  [
   1,
   "Illueca-C.F.",
   "Cuarte-C.D.",
   "0-2"
  ],
  [
   1,
   "Belchite 97-C.D.",
   "Brea-C.D.",
   "1-1"
  ],
  [
   1,
   "Almudevar A.D.",
   "Ejea-S.D.",
   "1-0"
  ],
  [
   2,
   "Epila-C.F.-A.D.",
   "Andorra-C.F.",
   "0-0"
  ],
  [
   2,
   "Brea-C.D.",
   "Illueca-C.F.",
   "3-0"
  ],
  [
   2,
   "Fraga-U.D.",
   "Almudevar A.D.",
   "3-1"
  ],
  [
   2,
   "Monzon-Atletico Alumbra",
   "Robres-C.D.",
   "4-3"
  ],
  [
   2,
   "Huesca-S.D.",
   "Caspe-C.D.",
   "1-0"
  ],
  [
   2,
   "Real Zaragoza Deportivo Aragón",
   "La Almunia-C.D.",
   "2-0"
  ],
  [
   2,
   "Binefar-C.D.",
   "Tamarite-C.D.J.",
   "2-3"
  ],
  [
   2,
   "Cuarte-C.D.",
   "Internacional Huesca",
   "5-2"
  ],
  [
   2,
   "Ejea-S.D.",
   "Belchite 97-C.D.",
   "2-1"
  ],
  [
   3,
   "Robres-C.D.",
   "Huesca-S.D.",
   "1-1"
  ],
  [
   3,
   "La Almunia-C.D.",
   "Binefar-C.D.",
   "2-1"
  ],
  [
   3,
   "Caspe-C.D.",
   "Real Zaragoza Deportivo Aragón",
   "1-1"
  ],
  [
   3,
   "Tamarite-C.D.J.",
   "Epila-C.F.-A.D.",
   "1-2"
  ],
  [
   3,
   "Andorra-C.F.",
   "Cuarte-C.D.",
   "1-0"
  ],
  [
   3,
   "Internacional Huesca",
   "Brea-C.D.",
   "1-1"
  ],
  [
   3,
   "Illueca-C.F.",
   "Ejea-S.D.",
   "0-2"
  ],
  [
   3,
   "Almudevar A.D.",
   "Belchite 97-C.D.",
   "4-0"
  ],
  [
   3,
   "Monzon-Atletico Alumbra",
   "Fraga-U.D.",
   "0-0"
  ],
  [
   4,
   "Monzon-Atletico Alumbra",
   "Almudevar A.D.",
   "2-1"
  ],
  [
   4,
   "Huesca-S.D.",
   "Fraga-U.D.",
   "0-0"
  ],
  [
   4,
   "Real Zaragoza Deportivo Aragón",
   "Robres-C.D.",
   "4-0"
  ],
  [
   4,
   "Binefar-C.D.",
   "Caspe-C.D.",
   "2-2"
  ],
  [
   4,
   "Epila-C.F.-A.D.",
   "La Almunia-C.D.",
   "1-3"
  ],
  [
   4,
   "Brea-C.D.",
   "Andorra-C.F.",
   "3-0"
  ],
  [
   4,
   "Ejea-S.D.",
   "Internacional Huesca",
   "2-1"
  ],
  [
   4,
   "Belchite 97-C.D.",
   "Illueca-C.F.",
   "0-3"
  ],
  [
   4,
   "Tamarite-C.D.J.",
   "Cuarte-C.D.",
   "2-1"
  ],
  [
   5,
   "Robres-C.D.",
   "Binefar-C.D.",
   "1-2"
  ],
  [
   5,
   "Monzon-Atletico Alumbra",
   "Huesca-S.D.",
   "2-0"
  ],
  [
   5,
   "Fraga-U.D.",
   "Real Zaragoza Deportivo Aragón",
   "1-2"
  ],
  [
   5,
   "Caspe-C.D.",
   "Epila-C.F.-A.D.",
   "3-2"
  ],
  [
   5,
   "La Almunia-C.D.",
   "Cuarte-C.D.",
   "1-3"
  ],
  [
   5,
   "Andorra-C.F.",
   "Ejea-S.D.",
   "1-3"
  ],
  [
   5,
   "Internacional Huesca",
   "Belchite 97-C.D.",
   "3-0"
  ],
  [
   5,
   "Almudevar A.D.",
   "Illueca-C.F.",
   "0-1"
  ],
  [
   5,
   "Brea-C.D.",
   "Tamarite-C.D.J.",
   "1-0"
  ],
  [
   6,
   "Huesca-S.D.",
   "Almudevar A.D.",
   "0-0"
  ],
  [
   6,
   "Epila-C.F.-A.D.",
   "Robres-C.D.",
   "3-0"
  ],
  [
   6,
   "Cuarte-C.D.",
   "Caspe-C.D.",
   "2-2"
  ],
  [
   6,
   "Brea-C.D.",
   "La Almunia-C.D.",
   "1-0"
  ],
  [
   6,
   "Ejea-S.D.",
   "Tamarite-C.D.J.",
   "5-3"
  ],
  [
   6,
   "Fraga-U.D.",
   "Binefar-C.D.",
   "2-0"
  ],
  [
   6,
   "Real Zaragoza Deportivo Aragón",
   "Monzon-Atletico Alumbra",
   "3-0"
  ],
  [
   7,
   "Huesca-S.D.",
   "Real Zaragoza Deportivo Aragón",
   "2-0"
  ],
  [
   7,
   "Monzon-Atletico Alumbra",
   "Binefar-C.D.",
   "1-3"
  ],
  [
   7,
   "Robres-C.D.",
   "Cuarte-C.D.",
   "2-2"
  ],
  [
   7,
   "Caspe-C.D.",
   "Brea-C.D.",
   "2-1"
  ],
  [
   7,
   "La Almunia-C.D.",
   "Ejea-S.D.",
   "2-0"
  ],
  [
   7,
   "Tamarite-C.D.J.",
   "Belchite 97-C.D.",
   "3-1"
  ],
  [
   7,
   "Andorra-C.F.",
   "Illueca-C.F.",
   "3-1"
  ],
  [
   8,
   "Epila-C.F.-A.D.",
   "Monzon-Atletico Alumbra",
   "2-2"
  ],
  [
   8,
   "Cuarte-C.D.",
   "Fraga-U.D.",
   "2-0"
  ],
  [
   8,
   "Illueca-C.F.",
   "Tamarite-C.D.J.",
   "4-0"
  ],
  [
   8,
   "Real Zaragoza Deportivo Aragón",
   "Almudevar A.D.",
   "4-0"
  ],
  [
   8,
   "Binefar-C.D.",
   "Huesca-S.D.",
   "1-1"
  ],
  [
   8,
   "Brea-C.D.",
   "Robres-C.D.",
   "0-0"
  ],
  [
   8,
   "Ejea-S.D.",
   "Caspe-C.D.",
   "0-0"
  ],
  [
   8,
   "Belchite 97-C.D.",
   "La Almunia-C.D.",
   "0-2"
  ],
  [
   8,
   "Internacional Huesca",
   "Andorra-C.F.",
   "2-2"
  ],
  [
   9,
   "Fraga-U.D.",
   "Brea-C.D.",
   "0-2"
  ],
  [
   9,
   "La Almunia-C.D.",
   "Illueca-C.F.",
   "2-0"
  ],
  [
   9,
   "Tamarite-C.D.J.",
   "Internacional Huesca",
   "1-3"
  ],
  [
   9,
   "Real Zaragoza Deportivo Aragón",
   "Binefar-C.D.",
   "3-3"
  ],
  [
   9,
   "Huesca-S.D.",
   "Epila-C.F.-A.D.",
   "2-0"
  ],
  [
   9,
   "Monzon-Atletico Alumbra",
   "Cuarte-C.D.",
   "2-2"
  ],
  [
   9,
   "Robres-C.D.",
   "Ejea-S.D.",
   "1-1"
  ],
  [
   9,
   "Caspe-C.D.",
   "Belchite 97-C.D.",
   "2-2"
  ],
  [
   9,
   "Almudevar A.D.",
   "Andorra-C.F.",
   "2-0"
  ],
  [
   10,
   "Binefar-C.D.",
   "Almudevar A.D.",
   "0-0"
  ],
  [
   10,
   "Epila-C.F.-A.D.",
   "Real Zaragoza Deportivo Aragón",
   "0-1"
  ],
  [
   10,
   "Cuarte-C.D.",
   "Huesca-S.D.",
   "1-0"
  ],
  [
   10,
   "Brea-C.D.",
   "Monzon-Atletico Alumbra",
   "0-1"
  ],
  [
   10,
   "Ejea-S.D.",
   "Fraga-U.D.",
   "2-1"
  ],
  [
   10,
   "Belchite 97-C.D.",
   "Robres-C.D.",
   "1-1"
  ],
  [
   10,
   "Illueca-C.F.",
   "Caspe-C.D.",
   "2-2"
  ],
  [
   10,
   "Internacional Huesca",
   "La Almunia-C.D.",
   "3-1"
  ],
  [
   10,
   "Andorra-C.F.",
   "Tamarite-C.D.J.",
   "2-1"
  ]
 ],
 "23183321-22-23197223": [
  [
   1,
   "Escuela Futbol Oscense-C.D. Humeco \"A\"",
   "Frula-A.D.",
   "6-0"
  ],
  [
   1,
   "Sabiñanigo-A.D. Futbol Base",
   "Peñas Oscenses-C.D. Hoscafrost \"A\"",
   "7-2"
  ],
  [
   1,
   "Peñas Sariñena-C.D.",
   "Huesca International Football Academy",
   "4-2"
  ],
  [
   1,
   "Santiago Grañen-C.D.",
   "Escuela Futbol Oscense-C.D. La tabla nueva Modimela \"B\"",
   "3-1"
  ],
  [
   2,
   "Frula-A.D.",
   "Santiago Grañen-C.D.",
   "1-2"
  ],
  [
   2,
   "Peñas Oscenses-C.D. Hoscafrost \"A\"",
   "Futbol Base Peñas Oscenses Aridos Boiria",
   "0-4"
  ],
  [
   2,
   "Huesca International Football Academy",
   "Sabiñanigo-A.D. Futbol Base",
   "4-7"
  ],
  [
   2,
   "Escuela Futbol Oscense-C.D. La tabla nueva Modimela \"B\"",
   "Peñas Sariñena-C.D.",
   "3-2"
  ],
  [
   3,
   "Escuela Futbol Oscense-C.D. Humeco \"A\"",
   "Peñas Oscenses-C.D. Hoscafrost \"A\"",
   "9-0"
  ],
  [
   3,
   "Futbol Base Peñas Oscenses Aridos Boiria",
   "Huesca International Football Academy",
   "6-0"
  ],
  [
   3,
   "Sabiñanigo-A.D. Futbol Base",
   "Escuela Futbol Oscense-C.D. La tabla nueva Modimela \"B\"",
   "1-1"
  ],
  [
   3,
   "Peñas Sariñena-C.D.",
   "Santiago Grañen-C.D.",
   "4-3"
  ],
  [
   4,
   "Peñas Oscenses-C.D. Hoscafrost \"A\"",
   "Frula-A.D.",
   "2-1"
  ],
  [
   4,
   "Huesca International Football Academy",
   "Escuela Futbol Oscense-C.D. Humeco \"A\"",
   "1-6"
  ],
  [
   4,
   "Escuela Futbol Oscense-C.D. La tabla nueva Modimela \"B\"",
   "Futbol Base Peñas Oscenses Aridos Boiria",
   "0-2"
  ],
  [
   4,
   "Peñas Sariñena-C.D.",
   "Sabiñanigo-A.D. Futbol Base",
   "0-3"
  ],
  [
   5,
   "Frula-A.D.",
   "Huesca International Football Academy",
   "3-0"
  ],
  [
   5,
   "Escuela Futbol Oscense-C.D. Humeco \"A\"",
   "Escuela Futbol Oscense-C.D. La tabla nueva Modimela \"B\"",
   "3-1"
  ],
  [
   5,
   "Futbol Base Peñas Oscenses Aridos Boiria",
   "Peñas Sariñena-C.D.",
   "4-3"
  ],
  [
   5,
   "Sabiñanigo-A.D. Futbol Base",
   "Santiago Grañen-C.D.",
   "5-1"
  ],
  [
   6,
   "Peñas Oscenses-C.D. Hoscafrost \"A\"",
   "Santiago Grañen-C.D.",
   "3-2"
  ],
  [
   6,
   "Escuela Futbol Oscense-C.D. La tabla nueva Modimela \"B\"",
   "Frula-A.D.",
   "0-1"
  ],
  [
   6,
   "Peñas Sariñena-C.D.",
   "Escuela Futbol Oscense-C.D. Humeco \"A\"",
   "2-1"
  ],
  [
   6,
   "Sabiñanigo-A.D. Futbol Base",
   "Futbol Base Peñas Oscenses Aridos Boiria",
   "6-4"
  ]
 ],
 "23183325-22-23198218": [
  [
   1,
   "Ipc la Escuela",
   "Almudevar A.D.",
   "3-0"
  ],
  [
   1,
   "Barbastro-U.D.",
   "Sabiñanigo-A.D. Futbol Base",
   "1-1"
  ],
  [
   1,
   "Escuela Futbol Oscense-C.D. Apartamentos Rio Gallego",
   "La Litera-Escuela Dep.",
   "2-3"
  ],
  [
   1,
   "Jacetano-C.F. Peña Enta Deban",
   "Peñas Oscenses-C.D. Climetel",
   "5-0"
  ],
  [
   1,
   "Binefar-Futbol Base",
   "Cantera Oscense",
   "3-1"
  ],
  [
   1,
   "Peñas Sariñena-C.D.",
   "Monzon Futbol Base-At. Sgr Kafe Var One Friomonzón",
   "3-1"
  ],
  [
   2,
   "Sabiñanigo-A.D. Futbol Base",
   "Ipc la Escuela",
   "2-4"
  ],
  [
   2,
   "La Litera-Escuela Dep.",
   "Barbastro-U.D.",
   "2-1"
  ],
  [
   2,
   "Sobrarbe-Escuela Dep.",
   "Escuela Futbol Oscense-C.D. Apartamentos Rio Gallego",
   "2-0"
  ],
  [
   2,
   "Cantera Oscense",
   "Jacetano-C.F. Peña Enta Deban",
   "1-8"
  ],
  [
   2,
   "Monzon Futbol Base-At. Sgr Kafe Var One Friomonzón",
   "Binefar-Futbol Base",
   "2-2"
  ],
  [
   2,
   "Peñas Sariñena-C.D.",
   "Almudevar A.D.",
   "3-2"
  ],
  [
   3,
   "Sabiñanigo-A.D. Futbol Base",
   "La Litera-Escuela Dep.",
   "0-4"
  ],
  [
   3,
   "Barbastro-U.D.",
   "Sobrarbe-Escuela Dep.",
   "0-2"
  ],
  [
   3,
   "Jacetano-C.F. Peña Enta Deban",
   "Monzon Futbol Base-At. Sgr Kafe Var One Friomonzón",
   "7-0"
  ],
  [
   3,
   "Binefar-Futbol Base",
   "Almudevar A.D.",
   "2-1"
  ],
  [
   3,
   "Ipc la Escuela",
   "Peñas Sariñena-C.D.",
   "1-2"
  ],
  [
   3,
   "Escuela Futbol Oscense-C.D. Apartamentos Rio Gallego",
   "Peñas Oscenses-C.D. Climetel",
   "2-1"
  ],
  [
   4,
   "La Litera-Escuela Dep.",
   "Ipc la Escuela",
   "3-1"
  ],
  [
   4,
   "Sobrarbe-Escuela Dep.",
   "Sabiñanigo-A.D. Futbol Base",
   "4-0"
  ],
  [
   4,
   "Peñas Oscenses-C.D. Climetel",
   "Barbastro-U.D.",
   "0-3"
  ],
  [
   4,
   "Cantera Oscense",
   "Escuela Futbol Oscense-C.D. Apartamentos Rio Gallego",
   "1-3"
  ],
  [
   4,
   "Almudevar A.D.",
   "Jacetano-C.F. Peña Enta Deban",
   "0-7"
  ],
  [
   4,
   "Peñas Sariñena-C.D.",
   "Binefar-Futbol Base",
   "5-4"
  ]
 ],
 "23183329-22-23200389": [
  [
   1,
   "Barbastro-U.D.",
   "Sabiñanigo-A.D. Futbol Base",
   "7-2"
  ],
  [
   1,
   "Escuela Futbol Oscense-C.D. Riegos Comenge",
   "La Litera-Escuela Dep.",
   "5-1"
  ],
  [
   1,
   "Futbol Base Peñas Oscenses Globaltec",
   "Sobrarbe-Escuela Dep.",
   "1-6"
  ],
  [
   1,
   "Jacetano-C.F. Frankfurter",
   "Peñas Oscenses-C.D. Miguel Escuer",
   "4-2"
  ],
  [
   1,
   "Binefar-Futbol Base",
   "Cantera Oscense",
   "2-0"
  ],
  [
   1,
   "Peñas Sariñena-C.D.",
   "Monzón Fútbol Base-At. Politejo",
   "5-1"
  ],
  [
   1,
   "Huesca-S.D. Escuela de Futbol",
   "Almudevar A.D.",
   "8-2"
  ],
  [
   2,
   "Sabiñanigo-A.D. Futbol Base",
   "Huesca-S.D. Escuela de Futbol",
   "1-4"
  ],
  [
   2,
   "La Litera-Escuela Dep.",
   "Barbastro-U.D.",
   "0-1"
  ],
  [
   2,
   "Sobrarbe-Escuela Dep.",
   "Escuela Futbol Oscense-C.D. Riegos Comenge",
   "3-1"
  ],
  [
   2,
   "Peñas Oscenses-C.D. Miguel Escuer",
   "Futbol Base Peñas Oscenses Globaltec",
   "3-1"
  ],
  [
   2,
   "Cantera Oscense",
   "Jacetano-C.F. Frankfurter",
   "3-1"
  ],
  [
   2,
   "Monzón Fútbol Base-At. Politejo",
   "Binefar-Futbol Base",
   "2-2"
  ],
  [
   2,
   "Peñas Sariñena-C.D.",
   "Almudevar A.D.",
   "2-2"
  ],
  [
   3,
   "Sabiñanigo-A.D. Futbol Base",
   "La Litera-Escuela Dep.",
   "3-2"
  ],
  [
   3,
   "Barbastro-U.D.",
   "Sobrarbe-Escuela Dep.",
   "5-2"
  ],
  [
   3,
   "Escuela Futbol Oscense-C.D. Riegos Comenge",
   "Peñas Oscenses-C.D. Miguel Escuer",
   "10-1"
  ],
  [
   3,
   "Futbol Base Peñas Oscenses Globaltec",
   "Cantera Oscense",
   "0-7"
  ],
  [
   3,
   "Jacetano-C.F. Frankfurter",
   "Monzón Fútbol Base-At. Politejo",
   "2-0"
  ],
  [
   3,
   "Binefar-Futbol Base",
   "Almudevar A.D.",
   "4-0"
  ],
  [
   3,
   "Huesca-S.D. Escuela de Futbol",
   "Peñas Sariñena-C.D.",
   "3-0"
  ],
  [
   4,
   "La Litera-Escuela Dep.",
   "Huesca-S.D. Escuela de Futbol",
   "1-1"
  ],
  [
   4,
   "Sobrarbe-Escuela Dep.",
   "Sabiñanigo-A.D. Futbol Base",
   "4-1"
  ],
  [
   4,
   "Peñas Oscenses-C.D. Miguel Escuer",
   "Barbastro-U.D.",
   "0-10"
  ],
  [
   4,
   "Cantera Oscense",
   "Escuela Futbol Oscense-C.D. Riegos Comenge",
   "1-1"
  ],
  [
   4,
   "Monzón Fútbol Base-At. Politejo",
   "Futbol Base Peñas Oscenses Globaltec",
   "9-2"
  ],
  [
   4,
   "Almudevar A.D.",
   "Jacetano-C.F. Frankfurter",
   "4-2"
  ],
  [
   4,
   "Peñas Sariñena-C.D.",
   "Binefar-Futbol Base",
   "1-5"
  ]
 ],
 "23183332-22-23362987": [
  [
   1,
   "Jacetano-C.F. Turismo Villanúa",
   "Sabiñanigo-A.D. Futbol Base",
   "2-5"
  ],
  [
   1,
   "Huesca-S.D. Escuela de Futbol",
   "Cantera Oscense",
   "3-1"
  ],
  [
   1,
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "Santiago Grañen-C.D.",
   "2-2"
  ],
  [
   2,
   "Sabiñanigo-A.D. Futbol Base",
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "1-6"
  ],
  [
   2,
   "Cantera Oscense",
   "Jacetano-C.F. Turismo Villanúa",
   "3-2"
  ],
  [
   2,
   "Huesca-S.D. Escuela de Futbol",
   "Santiago Grañen-C.D.",
   "3-3"
  ],
  [
   3,
   "Sabiñanigo-A.D. Futbol Base",
   "Cantera Oscense",
   "3-1"
  ],
  [
   3,
   "Jacetano-C.F. Turismo Villanúa",
   "Santiago Grañen-C.D.",
   "1-4"
  ],
  [
   3,
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "Huesca-S.D. Escuela de Futbol",
   "3-1"
  ],
  [
   4,
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "Cantera Oscense",
   "2-0"
  ],
  [
   4,
   "Huesca-S.D. Escuela de Futbol",
   "Jacetano-C.F. Turismo Villanúa",
   "4-0"
  ],
  [
   4,
   "Sabiñanigo-A.D. Futbol Base",
   "Santiago Grañen-C.D.",
   "2-6"
  ],
  [
   5,
   "Cantera Oscense",
   "Santiago Grañen-C.D.",
   "1-6"
  ],
  [
   5,
   "Sabiñanigo-A.D. Futbol Base",
   "Huesca-S.D. Escuela de Futbol",
   "2-2"
  ],
  [
   5,
   "Jacetano-C.F. Turismo Villanúa",
   "Escuela Futbol Oscense-C.D. R. Blasco",
   "2-4"
  ]
 ],
 "23183333-22-23362986": [
  [
   1,
   "Cantera Oscense",
   "Sabiñanigo-A.D. Futbol Base",
   "0-2"
  ],
  [
   1,
   "Jacetano-C.F. Castiello de Jaca",
   "Ipc la Escuela \"A\"",
   "1-5"
  ],
  [
   1,
   "Ipc la Escuela \"B\"",
   "Escuela Futbol Oscense-C.D. P. Castillo Finanweska",
   "0-4"
  ],
  [
   2,
   "Sabiñanigo-A.D. Futbol Base",
   "Ipc la Escuela \"B\"",
   "3-1"
  ],
  [
   2,
   "Ipc la Escuela \"A\"",
   "Cantera Oscense",
   "7-0"
  ],
  [
   2,
   "Escuela Futbol Oscense-C.D. P. Castillo Finanweska",
   "Jacetano-C.F. Castiello de Jaca",
   "12-1"
  ],
  [
   3,
   "Sabiñanigo-A.D. Futbol Base",
   "Ipc la Escuela \"A\"",
   "0-7"
  ],
  [
   3,
   "Cantera Oscense",
   "Escuela Futbol Oscense-C.D. P. Castillo Finanweska",
   "2-7"
  ],
  [
   3,
   "Ipc la Escuela \"B\"",
   "Jacetano-C.F. Castiello de Jaca",
   "3-0"
  ],
  [
   4,
   "Ipc la Escuela \"B\"",
   "Ipc la Escuela \"A\"",
   "1-4"
  ],
  [
   4,
   "Escuela Futbol Oscense-C.D. P. Castillo Finanweska",
   "Sabiñanigo-A.D. Futbol Base",
   "2-1"
  ],
  [
   4,
   "Jacetano-C.F. Castiello de Jaca",
   "Cantera Oscense",
   "1-2"
  ],
  [
   5,
   "Ipc la Escuela \"A\"",
   "Escuela Futbol Oscense-C.D. P. Castillo Finanweska",
   "2-3"
  ],
  [
   5,
   "Sabiñanigo-A.D. Futbol Base",
   "Jacetano-C.F. Castiello de Jaca",
   "1-3"
  ],
  [
   5,
   "Cantera Oscense",
   "Ipc la Escuela \"B\"",
   "3-1"
  ],
  [
   6,
   "Sabiñanigo-A.D. Futbol Base",
   "Cantera Oscense",
   "1-3"
  ],
  [
   6,
   "Ipc la Escuela \"A\"",
   "Jacetano-C.F. Castiello de Jaca",
   "11-2"
  ],
  [
   6,
   "Escuela Futbol Oscense-C.D. P. Castillo Finanweska",
   "Ipc la Escuela \"B\"",
   "4-0"
  ]
 ],
 "23183372-22-23442812": [
  [
   1,
   "Ipc la Escuela",
   "Ranillas-At. \"A\"",
   "8-0"
  ],
  [
   1,
   "El Salvador-S.D. \"A\"",
   "Amistad-U.D. \"C\"",
   "2-3"
  ],
  [
   1,
   "Oliver-C.D. \"A\"",
   "Valdefierro-C.D. \"B\"",
   "4-0"
  ],
  [
   1,
   "San Mateo-C.D.",
   "Estadio Miralbueno El Olivar \"B\"",
   "3-2"
  ],
  [
   2,
   "Ranillas-At. \"A\"",
   "San Mateo-C.D.",
   "0-0"
  ],
  [
   2,
   "Valdefierro-C.D. \"B\"",
   "El Salvador-S.D. \"A\"",
   "0-8"
  ],
  [
   2,
   "Estadio Miralbueno El Olivar \"B\"",
   "Oliver-C.D. \"A\"",
   "1-5"
  ],
  [
   2,
   "Amistad-U.D. \"C\"",
   "Ipc la Escuela",
   "2-2"
  ],
  [
   3,
   "Ranillas-At. \"A\"",
   "Amistad-U.D. \"C\"",
   "1-4"
  ],
  [
   3,
   "El Salvador-S.D. \"A\"",
   "Estadio Miralbueno El Olivar \"B\"",
   "2-0"
  ],
  [
   3,
   "San Mateo-C.D.",
   "Oliver-C.D. \"A\"",
   "1-5"
  ],
  [
   3,
   "Valdefierro-C.D. \"B\"",
   "Ipc la Escuela",
   "0-9"
  ],
  [
   4,
   "Amistad-U.D. \"C\"",
   "San Mateo-C.D.",
   "4-2"
  ],
  [
   4,
   "Valdefierro-C.D. \"B\"",
   "Ranillas-At. \"A\"",
   "1-1"
  ],
  [
   4,
   "Estadio Miralbueno El Olivar \"B\"",
   "Ipc la Escuela",
   "1-8"
  ],
  [
   4,
   "Oliver-C.D. \"A\"",
   "El Salvador-S.D. \"A\"",
   "1-0"
  ],
  [
   5,
   "Amistad-U.D. \"C\"",
   "Valdefierro-C.D. \"B\"",
   "4-0"
  ],
  [
   5,
   "Ranillas-At. \"A\"",
   "Estadio Miralbueno El Olivar \"B\"",
   "1-1"
  ],
  [
   5,
   "Ipc la Escuela",
   "Oliver-C.D. \"A\"",
   "1-1"
  ],
  [
   5,
   "San Mateo-C.D.",
   "El Salvador-S.D. \"A\"",
   "1-4"
  ],
  [
   6,
   "San Mateo-C.D.",
   "Valdefierro-C.D. \"B\"",
   "3-1"
  ],
  [
   6,
   "Estadio Miralbueno El Olivar \"B\"",
   "Amistad-U.D. \"C\"",
   "2-4"
  ],
  [
   6,
   "Oliver-C.D. \"A\"",
   "Ranillas-At. \"A\"",
   "7-1"
  ],
  [
   6,
   "El Salvador-S.D. \"A\"",
   "Ipc la Escuela",
   "1-3"
  ]
 ],
 "23183382-22-23183383": [
  [
   1,
   "Amistad-U.D.",
   "Estadio Miralbueno El Olivar",
   "3-1"
  ],
  [
   1,
   "Racing Club Zaragoza",
   "Santo Domingo Juventud C.F.",
   "1-2"
  ],
  [
   1,
   "Real Zaragoza S.A.D.",
   "Huesca-S.D.",
   "5-2"
  ],
  [
   1,
   "Stadium Casablanca-C.D.",
   "Ebro-C.D.",
   "1-2"
  ],
  [
   1,
   "E.F.B. Ejea \"A\"",
   "Calamocha-C.F.",
   "5-0"
  ],
  [
   1,
   "La Litera-Escuela Dep.",
   "Balsas Picarral-U.D.",
   "1-2"
  ],
  [
   1,
   "Hernan Cortes Junquera-C.F.",
   "Fraga-Fútbol Base",
   "0-3"
  ],
  [
   1,
   "San Gregorio Arrabal-C.D.",
   "Ipc la Escuela",
   "2-1"
  ],
  [
   1,
   "Oliver-C.D.",
   "Montecarlo-U.D.",
   "0-2"
  ],
  [
   2,
   "Estadio Miralbueno El Olivar",
   "La Litera-Escuela Dep.",
   "4-1"
  ],
  [
   2,
   "Santo Domingo Juventud C.F.",
   "Amistad-U.D.",
   "1-1"
  ],
  [
   2,
   "Fraga-Fútbol Base",
   "Racing Club Zaragoza",
   "0-4"
  ],
  [
   2,
   "Huesca-S.D.",
   "San Gregorio Arrabal-C.D.",
   "2-2"
  ],
  [
   2,
   "Calamocha-C.F.",
   "Stadium Casablanca-C.D.",
   "1-4"
  ],
  [
   2,
   "Ipc la Escuela",
   "Hernan Cortes Junquera-C.F.",
   "2-1"
  ],
  [
   2,
   "Ebro-C.D.",
   "Real Zaragoza S.A.D.",
   "2-2"
  ],
  [
   2,
   "Montecarlo-U.D.",
   "E.F.B. Ejea \"A\"",
   "3-0"
  ],
  [
   2,
   "Balsas Picarral-U.D.",
   "Oliver-C.D.",
   "0-1"
  ],
  [
   3,
   "Amistad-U.D.",
   "Fraga-Fútbol Base",
   "2-0"
  ],
  [
   3,
   "Real Zaragoza S.A.D.",
   "Calamocha-C.F.",
   "7-1"
  ],
  [
   3,
   "Stadium Casablanca-C.D.",
   "Montecarlo-U.D.",
   "4-2"
  ],
  [
   3,
   "E.F.B. Ejea \"A\"",
   "Balsas Picarral-U.D.",
   "0-2"
  ],
  [
   3,
   "La Litera-Escuela Dep.",
   "Oliver-C.D.",
   "3-2"
  ],
  [
   3,
   "Estadio Miralbueno El Olivar",
   "Santo Domingo Juventud C.F.",
   "2-0"
  ],
  [
   3,
   "Racing Club Zaragoza",
   "Ipc la Escuela",
   "0-5"
  ],
  [
   3,
   "Hernan Cortes Junquera-C.F.",
   "Huesca-S.D.",
   "1-2"
  ],
  [
   3,
   "San Gregorio Arrabal-C.D.",
   "Ebro-C.D.",
   "1-3"
  ],
  [
   4,
   "Santo Domingo Juventud C.F.",
   "La Litera-Escuela Dep.",
   "3-1"
  ],
  [
   4,
   "Huesca-S.D.",
   "Racing Club Zaragoza",
   "0-1"
  ],
  [
   4,
   "Calamocha-C.F.",
   "San Gregorio Arrabal-C.D.",
   "0-5"
  ],
  [
   4,
   "Fraga-Fútbol Base",
   "Estadio Miralbueno El Olivar",
   "2-2"
  ],
  [
   4,
   "Ipc la Escuela",
   "Amistad-U.D.",
   "1-1"
  ],
  [
   4,
   "Ebro-C.D.",
   "Hernan Cortes Junquera-C.F.",
   "0-4"
  ],
  [
   4,
   "Montecarlo-U.D.",
   "Real Zaragoza S.A.D.",
   "0-3"
  ],
  [
   4,
   "Balsas Picarral-U.D.",
   "Stadium Casablanca-C.D.",
   "0-0"
  ],
  [
   4,
   "Oliver-C.D.",
   "E.F.B. Ejea \"A\"",
   "3-0"
  ],
  [
   5,
   "Santo Domingo Juventud C.F.",
   "Fraga-Fútbol Base",
   "0-1"
  ],
  [
   5,
   "Estadio Miralbueno El Olivar",
   "Ipc la Escuela",
   "2-1"
  ],
  [
   5,
   "Amistad-U.D.",
   "Huesca-S.D.",
   "3-1"
  ],
  [
   5,
   "Racing Club Zaragoza",
   "Ebro-C.D.",
   "1-1"
  ],
  [
   5,
   "Hernan Cortes Junquera-C.F.",
   "Calamocha-C.F.",
   "3-0"
  ],
  [
   5,
   "San Gregorio Arrabal-C.D.",
   "Montecarlo-U.D.",
   "4-4"
  ],
  [
   5,
   "Real Zaragoza S.A.D.",
   "Balsas Picarral-U.D.",
   "5-0"
  ],
  [
   5,
   "Stadium Casablanca-C.D.",
   "Oliver-C.D.",
   "2-1"
  ],
  [
   5,
   "La Litera-Escuela Dep.",
   "E.F.B. Ejea \"A\"",
   "2-1"
  ],
  [
   6,
   "Ipc la Escuela",
   "Santo Domingo Juventud C.F.",
   "2-2"
  ],
  [
   6,
   "Huesca-S.D.",
   "Estadio Miralbueno El Olivar",
   "4-3"
  ],
  [
   6,
   "Calamocha-C.F.",
   "Racing Club Zaragoza",
   "2-3"
  ],
  [
   6,
   "Montecarlo-U.D.",
   "Hernan Cortes Junquera-C.F.",
   "2-0"
  ],
  [
   6,
   "Balsas Picarral-U.D.",
   "San Gregorio Arrabal-C.D.",
   "1-1"
  ],
  [
   6,
   "Oliver-C.D.",
   "Real Zaragoza S.A.D.",
   "0-5"
  ],
  [
   6,
   "E.F.B. Ejea \"A\"",
   "Stadium Casablanca-C.D.",
   "2-4"
  ],
  [
   6,
   "Ebro-C.D.",
   "Amistad-U.D.",
   "2-2"
  ],
  [
   6,
   "Fraga-Fútbol Base",
   "La Litera-Escuela Dep.",
   "1-3"
  ],
  [
   7,
   "Santo Domingo Juventud C.F.",
   "Huesca-S.D.",
   "0-4"
  ],
  [
   7,
   "Estadio Miralbueno El Olivar",
   "Ebro-C.D.",
   "0-3"
  ],
  [
   7,
   "Amistad-U.D.",
   "Calamocha-C.F.",
   "6-2"
  ],
  [
   7,
   "Fraga-Fútbol Base",
   "Ipc la Escuela",
   "2-2"
  ],
  [
   7,
   "Racing Club Zaragoza",
   "Montecarlo-U.D.",
   "2-2"
  ],
  [
   7,
   "Hernan Cortes Junquera-C.F.",
   "Balsas Picarral-U.D.",
   "2-1"
  ],
  [
   7,
   "San Gregorio Arrabal-C.D.",
   "Oliver-C.D.",
   "1-0"
  ],
  [
   7,
   "Real Zaragoza S.A.D.",
   "E.F.B. Ejea \"A\"",
   "3-0"
  ],
  [
   7,
   "La Litera-Escuela Dep.",
   "Stadium Casablanca-C.D.",
   "0-0"
  ],
  [
   8,
   "Huesca-S.D.",
   "Fraga-Fútbol Base",
   "2-2"
  ],
  [
   8,
   "Ebro-C.D.",
   "Santo Domingo Juventud C.F.",
   "3-1"
  ],
  [
   8,
   "Calamocha-C.F.",
   "Estadio Miralbueno El Olivar",
   "1-5"
  ],
  [
   8,
   "Montecarlo-U.D.",
   "Amistad-U.D.",
   "2-2"
  ],
  [
   8,
   "Oliver-C.D.",
   "Hernan Cortes Junquera-C.F.",
   "4-0"
  ],
  [
   8,
   "E.F.B. Ejea \"A\"",
   "San Gregorio Arrabal-C.D.",
   "0-2"
  ],
  [
   8,
   "Ipc la Escuela",
   "La Litera-Escuela Dep.",
   "4-0"
  ],
  [
   8,
   "Balsas Picarral-U.D.",
   "Racing Club Zaragoza",
   "1-1"
  ],
  [
   8,
   "Stadium Casablanca-C.D.",
   "Real Zaragoza S.A.D.",
   "0-1"
  ],
  [
   9,
   "Fraga-Fútbol Base",
   "Ebro-C.D.",
   "0-2"
  ],
  [
   9,
   "Santo Domingo Juventud C.F.",
   "Calamocha-C.F.",
   "4-1"
  ],
  [
   9,
   "Estadio Miralbueno El Olivar",
   "Montecarlo-U.D.",
   "1-2"
  ],
  [
   9,
   "Amistad-U.D.",
   "Balsas Picarral-U.D.",
   "3-2"
  ],
  [
   9,
   "Racing Club Zaragoza",
   "Oliver-C.D.",
   "0-3"
  ],
  [
   9,
   "La Litera-Escuela Dep.",
   "Real Zaragoza S.A.D.",
   "0-1"
  ],
  [
   9,
   "Ipc la Escuela",
   "Huesca-S.D.",
   "1-3"
  ],
  [
   9,
   "Hernan Cortes Junquera-C.F.",
   "E.F.B. Ejea \"A\"",
   "2-0"
  ],
  [
   9,
   "San Gregorio Arrabal-C.D.",
   "Stadium Casablanca-C.D.",
   "0-3"
  ]
 ],
 "23185096-22-23198208": [
  [
   1,
   "San Jose-U.D.",
   "Estadio Miralbueno El Olivar",
   "0-4"
  ],
  [
   1,
   "Huesca-S.D.",
   "Santo Domingo Juventud C.F.",
   "4-1"
  ],
  [
   1,
   "Cuarte-C.D.",
   "Valdefierro-C.D.",
   "2-2"
  ],
  [
   1,
   "Barbastro-U.D.",
   "Amistad-U.D.",
   "1-2"
  ],
  [
   1,
   "Balsas Picarral-U.D.",
   "Borja-E.F.B.",
   "4-0"
  ],
  [
   1,
   "Oliver-C.D.",
   "Huesca-S.D. Escuela de Futbol",
   "3-2"
  ],
  [
   1,
   "Fraga-Fútbol Base",
   "E.F.B. Ejea",
   "1-1"
  ],
  [
   1,
   "Monzón Fútbol Base - At. Ahp Guarvi",
   "Escalerillas Distrito 8-AT.",
   "1-0"
  ],
  [
   2,
   "Santo Domingo Juventud C.F.",
   "San Jose-U.D.",
   "5-1"
  ],
  [
   2,
   "Valdefierro-C.D.",
   "Huesca-S.D.",
   "4-2"
  ],
  [
   2,
   "Amistad-U.D.",
   "Cuarte-C.D.",
   "0-2"
  ],
  [
   2,
   "Borja-E.F.B.",
   "Barbastro-U.D.",
   "2-4"
  ],
  [
   2,
   "Huesca-S.D. Escuela de Futbol",
   "Balsas Picarral-U.D.",
   "4-1"
  ],
  [
   2,
   "Monzón Fútbol Base - At. Ahp Guarvi",
   "Estadio Miralbueno El Olivar",
   "2-0"
  ],
  [
   2,
   "E.F.B. Ejea",
   "Oliver-C.D.",
   "2-1"
  ],
  [
   2,
   "Escalerillas Distrito 8-AT.",
   "Fraga-Fútbol Base",
   "5-3"
  ],
  [
   3,
   "Estadio Miralbueno El Olivar",
   "Santo Domingo Juventud C.F.",
   "3-1"
  ],
  [
   3,
   "San Jose-U.D.",
   "Valdefierro-C.D.",
   "0-7"
  ],
  [
   3,
   "Huesca-S.D.",
   "Amistad-U.D.",
   "7-2"
  ],
  [
   3,
   "Barbastro-U.D.",
   "Huesca-S.D. Escuela de Futbol",
   "1-0"
  ],
  [
   3,
   "Oliver-C.D.",
   "Escalerillas Distrito 8-AT.",
   "5-1"
  ],
  [
   3,
   "Cuarte-C.D.",
   "Borja-E.F.B.",
   "4-1"
  ],
  [
   3,
   "Balsas Picarral-U.D.",
   "E.F.B. Ejea",
   "0-2"
  ],
  [
   3,
   "Monzón Fútbol Base - At. Ahp Guarvi",
   "Fraga-Fútbol Base",
   "1-2"
  ],
  [
   4,
   "Valdefierro-C.D.",
   "Estadio Miralbueno El Olivar",
   "2-1"
  ],
  [
   4,
   "Borja-E.F.B.",
   "Huesca-S.D.",
   "1-2"
  ],
  [
   4,
   "Huesca-S.D. Escuela de Futbol",
   "Cuarte-C.D.",
   "1-3"
  ],
  [
   4,
   "E.F.B. Ejea",
   "Barbastro-U.D.",
   "1-2"
  ],
  [
   4,
   "Escalerillas Distrito 8-AT.",
   "Balsas Picarral-U.D.",
   "1-1"
  ],
  [
   4,
   "Fraga-Fútbol Base",
   "Oliver-C.D.",
   "2-4"
  ],
  [
   4,
   "Santo Domingo Juventud C.F.",
   "Monzón Fútbol Base - At. Ahp Guarvi",
   "1-2"
  ],
  [
   4,
   "Amistad-U.D.",
   "San Jose-U.D.",
   "7-0"
  ],
  [
   5,
   "Huesca-S.D.",
   "Huesca-S.D. Escuela de Futbol",
   "2-1"
  ],
  [
   5,
   "Santo Domingo Juventud C.F.",
   "Valdefierro-C.D.",
   "1-4"
  ],
  [
   5,
   "Estadio Miralbueno El Olivar",
   "Amistad-U.D.",
   "4-1"
  ],
  [
   5,
   "San Jose-U.D.",
   "Borja-E.F.B.",
   "2-7"
  ],
  [
   5,
   "Cuarte-C.D.",
   "E.F.B. Ejea",
   "2-0"
  ],
  [
   5,
   "Barbastro-U.D.",
   "Escalerillas Distrito 8-AT.",
   "3-2"
  ],
  [
   5,
   "Monzón Fútbol Base - At. Ahp Guarvi",
   "Oliver-C.D.",
   "0-1"
  ],
  [
   5,
   "Balsas Picarral-U.D.",
   "Fraga-Fútbol Base",
   "1-3"
  ],
  [
   6,
   "Valdefierro-C.D.",
   "Monzón Fútbol Base - At. Ahp Guarvi",
   "3-2"
  ],
  [
   6,
   "Amistad-U.D.",
   "Santo Domingo Juventud C.F.",
   "3-1"
  ],
  [
   6,
   "Borja-E.F.B.",
   "Estadio Miralbueno El Olivar",
   "2-2"
  ],
  [
   6,
   "Huesca-S.D. Escuela de Futbol",
   "San Jose-U.D.",
   "4-0"
  ],
  [
   6,
   "E.F.B. Ejea",
   "Huesca-S.D.",
   "1-4"
  ],
  [
   6,
   "Escalerillas Distrito 8-AT.",
   "Cuarte-C.D.",
   "1-7"
  ],
  [
   6,
   "Fraga-Fútbol Base",
   "Barbastro-U.D.",
   "6-2"
  ],
  [
   6,
   "Oliver-C.D.",
   "Balsas Picarral-U.D.",
   "3-0"
  ],
  [
   7,
   "Valdefierro-C.D.",
   "Amistad-U.D.",
   "3-0"
  ],
  [
   7,
   "San Jose-U.D.",
   "E.F.B. Ejea",
   "1-2"
  ],
  [
   7,
   "Huesca-S.D.",
   "Escalerillas Distrito 8-AT.",
   "6-3"
  ],
  [
   7,
   "Cuarte-C.D.",
   "Fraga-Fútbol Base",
   "5-1"
  ],
  [
   7,
   "Barbastro-U.D.",
   "Oliver-C.D.",
   "2-4"
  ],
  [
   7,
   "Monzón Fútbol Base - At. Ahp Guarvi",
   "Balsas Picarral-U.D.",
   "1-2"
  ],
  [
   7,
   "Santo Domingo Juventud C.F.",
   "Borja-E.F.B.",
   "4-2"
  ],
  [
   7,
   "Estadio Miralbueno El Olivar",
   "Huesca-S.D. Escuela de Futbol",
   "2-5"
  ],
  [
   8,
   "Amistad-U.D.",
   "Monzón Fútbol Base - At. Ahp Guarvi",
   "6-3"
  ],
  [
   8,
   "Borja-E.F.B.",
   "Valdefierro-C.D.",
   "0-3"
  ],
  [
   8,
   "E.F.B. Ejea",
   "Estadio Miralbueno El Olivar",
   "2-3"
  ],
  [
   8,
   "Escalerillas Distrito 8-AT.",
   "San Jose-U.D.",
   "6-2"
  ],
  [
   8,
   "Fraga-Fútbol Base",
   "Huesca-S.D.",
   "3-3"
  ],
  [
   8,
   "Oliver-C.D.",
   "Cuarte-C.D.",
   "1-3"
  ],
  [
   8,
   "Balsas Picarral-U.D.",
   "Barbastro-U.D.",
   "1-1"
  ],
  [
   8,
   "Santo Domingo Juventud C.F.",
   "Huesca-S.D. Escuela de Futbol",
   "3-4"
  ]
 ],
 "23596848-22-23596900": [
  [
   1,
   "Escuela Futbol Oscense-C.D. 'C'",
   "Siglo Xxi Oscense Peña los 30 'D'",
   "1-6"
  ],
  [
   1,
   "Jacetano-C.F. Automoviles Serrablo 'C'",
   "Peñas Oscenses-C.D. Ecomputer/La10ma",
   "2-2"
  ],
  [
   1,
   "Siglo Xxi Oscense Zynk 'C'",
   "Sabiñanigo-A.D. Futbol Base 'C'",
   "3-3"
  ],
  [
   2,
   "Peñas Oscenses-C.D. Ecomputer/La10ma",
   "Escuela Futbol Oscense-C.D. 'C'",
   "5-4"
  ],
  [
   2,
   "Ipc la Escuela",
   "Siglo Xxi Oscense Zynk 'C'",
   "6-1"
  ],
  [
   2,
   "Sabiñanigo-A.D. Futbol Base 'C'",
   "Jacetano-C.F. Automoviles Serrablo 'C'",
   "4-9"
  ],
  [
   3,
   "Siglo Xxi Oscense Peña los 30 'D'",
   "Peñas Oscenses-C.D. Ecomputer/La10ma",
   "6-2"
  ],
  [
   3,
   "Escuela Futbol Oscense-C.D. 'C'",
   "Sabiñanigo-A.D. Futbol Base 'C'",
   "4-4"
  ],
  [
   3,
   "Jacetano-C.F. Automoviles Serrablo 'C'",
   "Ipc la Escuela",
   "1-5"
  ],
  [
   4,
   "Sabiñanigo-A.D. Futbol Base 'C'",
   "Siglo Xxi Oscense Peña los 30 'D'",
   "3-8"
  ],
  [
   4,
   "Ipc la Escuela",
   "Escuela Futbol Oscense-C.D. 'C'",
   "5-0"
  ],
  [
   4,
   "Siglo Xxi Oscense Zynk 'C'",
   "Jacetano-C.F. Automoviles Serrablo 'C'",
   "2-3"
  ]
 ]
};

const isExcludedTeam = (name: string) => /^huesca-s\.d\.$/i.test(name.trim());

/** Resultados sin los partidos del club excluido (Huesca-S.D.). */
export const FEDERATION_RESULTS_BY_COMPETITION: Record<string, FederationResultRow[]> = Object.fromEntries(
  Object.entries(RAW_FEDERATION_RESULTS_BY_COMPETITION).map(([id, rows]) => [
    id,
    rows.filter(r => !isExcludedTeam(r[1]) && !isExcludedTeam(r[2])),
  ]),
);
