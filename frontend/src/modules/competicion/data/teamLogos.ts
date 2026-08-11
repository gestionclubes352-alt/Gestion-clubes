const FEDERATION_TEAM_LOGOS: Record<string, string> = {
  'E.F.B. EJEA': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000386921_2.jpg',
  'CALAMOCHA-C.F.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000037092_ESCUDO%20CF%20FUTBOL%20CALAMOCHA2.jpg',
  'AMISTAD-U.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000051358_amistad%20logo.jpg',
  'ESTADIO MIRALBUENO EL OLIVAR': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000052164_Escudo_El_Olivar.jpg',
  'RACING CLUB ZARAGOZA': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000111548_unnamed1.jpg',
  'SANTO DOMINGO JUVENTUD C.F.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000041942_santo%20d.juventud.jpg',
  'HERNAN CORTES JUNQUERA-C.F.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000274922_escudo.png',
  'FRAGA-F\u00daTBOL BASE': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000149281_ESCUDO.jpg',
  'SAN GREGORIO ARRABAL-C.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000038152_san-gregorio.jpg',
  'IPC LA ESCUELA': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000309492_00100_0000225155_EFH_Logo_66.png',
  'REAL ZARAGOZA S.A.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000047835_Escudo-Zaragoza.jpg',
  'HUESCA-S.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000223477_huesca_sd.png',
  'STADIUM CASABLANCA-C.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000039874_Escudo%20Stadium.jpg',
  'EBRO-C.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000169078_CD_EBRO.jpg',
  'OLIVER-C.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000070387_CDO.jpg',
  'MONTECARLO-U.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Equipos/00100_0000041121_ESCUDITO2.jpg',
  'LA LITERA-ESCUELA DEP.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000157222_ESCUDO_E.D._LA_LITERA.jpg',
  'BALSAS PICARRAL-U.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000391775_escudo.jpg',
  'PE\u00d1AS OSCENSES-C.D. Aramovil': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000080862_penas_oscenses_2.jpg',
  'PE\u00d1AS OSCENSES-C.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000080862_penas_oscenses_2.jpg',
  'HUESCA-S.D. ESCUELA DE FUTBOL': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000225155_EFH_Logo_66.png',
  'MONZON FUTBOL BASE - Mallazo': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000139369_escudocolorfaf.jpg',
  'MONZON FUTBOL BASE': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000139369_escudocolorfaf.jpg',
  'ALMUDEVAR A.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000040474_ESCUDO%20ALMUDEVAR.jpg',
  'BARBASTRO-U.D.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000400603_Escudo_02.png',
  'SOBRARBE-ESCUELA DEP.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000315862_logo_escuela.jpg',
  'HUESCA INTERNATIONAL FOOTBALL ACADEMY "A"': 'https://files.futbolaragon.com/pnfg/img/web_responsive_2/ESP/escudo_sm_resultados_.jpg',
  'HUESCA INTERNATIONAL FOOTBALL ACADEMY': 'https://files.futbolaragon.com/pnfg/img/web_responsive_2/ESP/escudo_sm_resultados_.jpg',
  'JACETANO-C.F. Arok Sport': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000314482_logo_Jacetano_nuevo.png',
  'JACETANO-C.F.': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000314482_logo_Jacetano_nuevo.png',
  'BINEFAR-FUTBOL BASE': 'https://ffaragon.filesnovanet.es/pnfg/pimg/Clubes/00100_0000460195_Logo_Club.jpg',
};

export const normalizeFederationTeamName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const FEDERATION_LOGOS_BY_NORMALIZED_NAME = new Map(
  Object.entries(FEDERATION_TEAM_LOGOS).map(([name, logoUrl]) => [
    normalizeFederationTeamName(name),
    logoUrl,
  ])
);

export const getFederationTeamLogo = (name?: string | null): string | undefined => {
  if (!name) return undefined;
  return FEDERATION_LOGOS_BY_NORMALIZED_NAME.get(normalizeFederationTeamName(name));
};
