import React, { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '../../../shared/components/DataTable';
import type { CompetitionTeam } from '../types';
import { getTeamConfig } from '@shared/services/dataService';
import { useGeminiStandings } from '../hooks/useGeminiStandings';
import { useTeam } from '@context/TeamContext';
import { getFederationTeamLogo } from '../data/teamLogos';

interface StandingTeam {
  pos: number;
  team: string;
  localidad: string;
  logoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

interface LeagueTableProps {
  teams?: CompetitionTeam[];
  myTeamName?: string;
  leagueName?: string;
}

interface ScorerRow {
  pos: number;
  jugador: string;
  equipo: string;
  goles: number;
  partidos: number;
}

type CompetitionSection =
  | 'clasificacion'
  | 'resultados'
  | 'goleadores'
  | 'porteros'
  | 'cruzada'
  | 'extendida';

type OfficialStandingRow = {
  pos: number;
  team: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
};

const HUESCA_JUVENIL_2627_TEAMS = [
  'E.F.B. EJEA',
  'CALAMOCHA-C.F.',
  'AMISTAD-U.D.',
  'ESTADIO MIRALBUENO EL OLIVAR',
  'RACING CLUB ZARAGOZA',
  'SANTO DOMINGO JUVENTUD C.F.',
  'HERNAN CORTES JUNQUERA-C.F.',
  'FRAGA-FUTBOL BASE',
  'SAN GREGORIO ARRABAL-C.D.',
  'IPC LA ESCUELA',
  'REAL ZARAGOZA S.A.D.',
  'HUESCA-S.D.',
  'STADIUM CASABLANCA-C.D.',
  'EBRO-C.D.',
  'OLIVER-C.D.',
  'MONTECARLO-U.D.',
  'LA LITERA-ESCUELA DEP.',
  'BALSAS PICARRAL-U.D.',
];

const HUESCA_JUVENIL_2627_STANDINGS: OfficialStandingRow[] = HUESCA_JUVENIL_2627_TEAMS.map((team, index) => ({
  pos: index + 1,
  team,
  points: 0,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
}));

const HUESCA_JUVENIL_2627_FIXTURES = {
  primera: [
    { jornada: 1, fecha: '06/09/2026', local: 'E.F.B. EJEA', visitante: 'CALAMOCHA-C.F.', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'AMISTAD-U.D.', visitante: 'ESTADIO MIRALBUENO EL OLIVAR', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'RACING CLUB ZARAGOZA', visitante: 'SANTO DOMINGO JUVENTUD C.F.', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'HERNAN CORTES JUNQUERA-C.F.', visitante: 'FRAGA-FUTBOL BASE', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'SAN GREGORIO ARRABAL-C.D.', visitante: 'IPC LA ESCUELA', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'REAL ZARAGOZA S.A.D.', visitante: 'HUESCA-S.D.', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'STADIUM CASABLANCA-C.D.', visitante: 'EBRO-C.D.', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'OLIVER-C.D.', visitante: 'MONTECARLO-U.D.', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'LA LITERA-ESCUELA DEP.', visitante: 'BALSAS PICARRAL-U.D.', resultado: 'vs' },
  ],
  segunda: [
    { jornada: 18, fecha: '24/01/2027', local: 'ESTADIO MIRALBUENO EL OLIVAR', visitante: 'AMISTAD-U.D.', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'SANTO DOMINGO JUVENTUD C.F.', visitante: 'RACING CLUB ZARAGOZA', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'FRAGA-FUTBOL BASE', visitante: 'HERNAN CORTES JUNQUERA-C.F.', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'IPC LA ESCUELA', visitante: 'SAN GREGORIO ARRABAL-C.D.', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'HUESCA-S.D.', visitante: 'REAL ZARAGOZA S.A.D.', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'EBRO-C.D.', visitante: 'STADIUM CASABLANCA-C.D.', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'CALAMOCHA-C.F.', visitante: 'E.F.B. EJEA', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'MONTECARLO-U.D.', visitante: 'OLIVER-C.D.', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'BALSAS PICARRAL-U.D.', visitante: 'LA LITERA-ESCUELA DEP.', resultado: 'vs' },
  ],
};

/**
 * Datos oficiales de clasificación por club (teamId → standings data).
 * Cada club puede tener sus propios datos hardcodeados.
 */
const OFFICIAL_STANDINGS_BY_CLUB: Record<string, ReadonlyArray<OfficialStandingRow>> = {
  'cd-derio': [
    { pos: 1, team: 'PORTUGALETE, C.', points: 59, played: 23, won: 19, drawn: 2, lost: 2 },
    { pos: 2, team: 'LEIOA, S.D.', points: 42, played: 23, won: 13, drawn: 3, lost: 7 },
    { pos: 3, team: 'LAGUN ONAK, C.D.', points: 40, played: 23, won: 13, drawn: 1, lost: 9 },
    { pos: 4, team: 'TOURING, C.D.', points: 38, played: 23, won: 10, drawn: 8, lost: 5 },
    { pos: 5, team: 'SAN IGNACIO C.D. "A"', points: 37, played: 23, won: 11, drawn: 4, lost: 8 },
    { pos: 6, team: 'AURRERA DE VITORIA, CD "A"', points: 37, played: 23, won: 11, drawn: 4, lost: 8 },
    { pos: 7, team: 'DEPORTIVO ALAVES "C"', points: 36, played: 23, won: 10, drawn: 6, lost: 7 },
    { pos: 8, team: 'DERIO, C.D.', points: 36, played: 23, won: 11, drawn: 3, lost: 9 },
    { pos: 9, team: 'CULTURAL DPVA. DURANGO, S.', points: 33, played: 23, won: 8, drawn: 9, lost: 6 },
    { pos: 10, team: 'ARETXABALETA, U.D.', points: 32, played: 23, won: 9, drawn: 5, lost: 9 },
    { pos: 11, team: 'REAL SOCIEDAD DE FUTBOL "C"', points: 32, played: 23, won: 10, drawn: 2, lost: 11 },
    { pos: 12, team: 'SANTURTZI, C.D.', points: 26, played: 23, won: 6, drawn: 8, lost: 9 },
    { pos: 13, team: 'ZAMUDIO, S.D. "A"', points: 25, played: 23, won: 7, drawn: 4, lost: 12 },
    { pos: 14, team: 'AÑORGA K.K.E', points: 24, played: 23, won: 7, drawn: 3, lost: 13 },
    { pos: 15, team: 'EIBAR SAD, S.D. "C"', points: 23, played: 23, won: 6, drawn: 5, lost: 12 },
    { pos: 16, team: 'PASAIA KIROL ELKARTEA', points: 23, played: 23, won: 6, drawn: 5, lost: 12 },
    { pos: 17, team: 'ZARAUTZ K.E.', points: 21, played: 23, won: 6, drawn: 3, lost: 14 },
    { pos: 18, team: 'DEUSTO, S.D.', points: 17, played: 23, won: 4, drawn: 5, lost: 14 },
  ],
  'escuela-huesca::Juvenil A': [
    { pos: 1,  team: 'MONZÓN FÚTBOL BASE - AT. Gigamontrans', points: 51, played: 20, won: 16, drawn: 3, lost: 1 },
    { pos: 2,  team: 'REAL ZARAGOZA S.A.D.', points: 43, played: 20, won: 13, drawn: 4, lost: 3 },
    { pos: 3,  team: 'EBRO-C.D.', points: 42, played: 21, won: 13, drawn: 3, lost: 5 },
    { pos: 4,  team: 'AMISTAD-U.D.', points: 36, played: 20, won: 11, drawn: 3, lost: 6 },
    { pos: 5,  team: 'SANTO DOMINGO JUVENTUD C.F.', points: 34, played: 21, won: 10, drawn: 4, lost: 7 },
    { pos: 6,  team: 'OLIVER-C.D.', points: 33, played: 20, won: 11, drawn: 0, lost: 9 },
    { pos: 7,  team: 'STADIUM CASABLANCA-C.D.', points: 32, played: 21, won: 9, drawn: 5, lost: 7 },
    { pos: 8,  team: 'RACING CLUB ZARAGOZA', points: 30, played: 21, won: 9, drawn: 3, lost: 9 },
    { pos: 9,  team: 'FRAGA-FÚTBOL BASE', points: 29, played: 20, won: 9, drawn: 2, lost: 9 },
    { pos: 10, team: 'IPC LA ESCUELA', points: 29, played: 21, won: 9, drawn: 2, lost: 10 },
    { pos: 11, team: 'BALSAS PICARRAL-U.D.', points: 26, played: 21, won: 7, drawn: 5, lost: 9 },
    { pos: 12, team: 'SAN GREGORIO ARRABAL-C.D.', points: 26, played: 21, won: 8, drawn: 2, lost: 11 },
    { pos: 13, team: 'HUESCA-S.D.', points: 25, played: 20, won: 7, drawn: 4, lost: 9 },
    { pos: 14, team: 'UNION LA JOTA VADORREY-C.D.', points: 25, played: 21, won: 6, drawn: 7, lost: 8 },
    { pos: 15, team: 'ESTADIO MIRALBUENO EL OLIVAR', points: 19, played: 21, won: 4, drawn: 7, lost: 10 },
    { pos: 16, team: 'TERUEL-C.D.', points: 19, played: 20, won: 5, drawn: 4, lost: 11 },
    { pos: 17, team: 'SAN AGUSTIN-C.D.', points: 18, played: 21, won: 4, drawn: 6, lost: 11 },
    { pos: 18, team: 'CALATAYUD-EFB', points: 6, played: 20, won: 2, drawn: 0, lost: 18 },
  ],
  'escuela-huesca::Cadete A': [
    { pos: 1,  team: 'REAL ZARAGOZA S.A.D.', points: 55, played: 21, won: 18, drawn: 1, lost: 2 },
    { pos: 2,  team: 'HUESCA-S.D.', points: 52, played: 21, won: 17, drawn: 1, lost: 3 },
    { pos: 3,  team: 'RACING CLUB ZARAGOZA', points: 52, played: 21, won: 16, drawn: 4, lost: 1 },
    { pos: 4,  team: 'SANTO DOMINGO JUVENTUD C.F.', points: 49, played: 21, won: 15, drawn: 4, lost: 2 },
    { pos: 5,  team: 'MONTECARLO-U.D.', points: 38, played: 20, won: 12, drawn: 2, lost: 6 },
    { pos: 6,  team: 'OLIVER-C.D.', points: 34, played: 19, won: 10, drawn: 4, lost: 5 },
    { pos: 7,  team: 'BALSAS PICARRAL-U.D.', points: 29, played: 20, won: 8, drawn: 5, lost: 7 },
    { pos: 8,  team: 'STADIUM CASABLANCA-C.D.', points: 29, played: 20, won: 8, drawn: 5, lost: 7 },
    { pos: 9,  team: 'HERNAN CORTES JUNQUERA-C.F.', points: 28, played: 20, won: 7, drawn: 7, lost: 6 },
    { pos: 10, team: 'SAN AGUSTIN-C.D.', points: 27, played: 21, won: 9, drawn: 0, lost: 12 },
    { pos: 11, team: 'HUESCA-S.D. ESCUELA DE FUTBOL', points: 25, played: 20, won: 7, drawn: 4, lost: 9 },
    { pos: 12, team: 'AMISTAD-U.D.', points: 23, played: 20, won: 6, drawn: 5, lost: 9 },
    { pos: 13, team: 'BINEFAR-FUTBOL BASE', points: 22, played: 20, won: 6, drawn: 4, lost: 10 },
    { pos: 14, team: 'ESTADIO MIRALBUENO EL OLIVAR', points: 22, played: 20, won: 6, drawn: 4, lost: 10 },
    { pos: 15, team: 'FRAGA-FÚTBOL BASE', points: 16, played: 21, won: 5, drawn: 1, lost: 15 },
    { pos: 16, team: 'CUARTE-C.D.', points: 9, played: 20, won: 3, drawn: 0, lost: 17 },
    { pos: 17, team: 'CALATAYUD-EFB', points: 7, played: 21, won: 2, drawn: 1, lost: 18 },
    { pos: 18, team: 'MONZÓN FÚTBOL BASE - AT. AHP Guarvi', points: 6, played: 20, won: 2, drawn: 0, lost: 18 },
  ],
};

/**
 * Datos oficiales de goleadores por club (teamId → scorers data).
 * Cada club puede tener sus propios datos hardcodeados.
 */
const OFFICIAL_SCORERS_BY_CLUB: Record<string, Omit<ScorerRow, 'pos'>[]> = {
  'cd-derio': [
    { jugador: 'ARANBURU RANDEZ, IMANOL', equipo: 'PORTUGALETE, C.', goles: 11, partidos: 18 },
    { jugador: 'SORAZU MANGAS, JON', equipo: 'LAGUN ONAK, C.D.', goles: 10, partidos: 22 },
    { jugador: 'BARRON ARTETXE, JULEN', equipo: 'DERIO, C.D.', goles: 9, partidos: 21 },
    { jugador: 'DIAZ HORTELANO, NICOLAS', equipo: 'AURRERA DE VITORIA, CD A', goles: 9, partidos: 22 },
    { jugador: 'PEREZ ALVAREZ, ANDONI', equipo: 'PORTUGALETE, C.', goles: 8, partidos: 16 },
    { jugador: 'GOROSABEL AÑORGA, JAKES', equipo: 'REAL SOCIEDAD DE FUTBOL C', goles: 8, partidos: 18 },
    { jugador: 'URIA PORRES, IKER', equipo: 'DEPORTIVO ALAVES C', goles: 8, partidos: 22 },
    { jugador: 'SAENZ DE VITERI BARRADO, IÑAKI', equipo: 'DEPORTIVO ALAVES C', goles: 8, partidos: 23 },
    { jugador: 'PEREZ GARITANO, ALEXANDER', equipo: 'PORTUGALETE, C.', goles: 7, partidos: 16 },
    { jugador: 'FUENTE FERNANDEZ, MARIO', equipo: 'EIBAR SAD, S.D. C', goles: 7, partidos: 20 },
    { jugador: 'ALFAGEME PEREZ, UNAI', equipo: 'ZARAUTZ K.E.', goles: 7, partidos: 21 },
    { jugador: 'ARIETALEANIZBEASKOA MIOTA, UNAI', equipo: 'CULTURAL DPVA. DURANGO, S.', goles: 7, partidos: 21 },
    { jugador: 'ORTIZ ALONSO, JON', equipo: 'TOURING, C.D.', goles: 7, partidos: 23 },
    { jugador: 'DE LA PARRA OTAMENDI, ANDER', equipo: 'DERIO, C.D.', goles: 6, partidos: 14 },
    { jugador: 'BELOKI LECETA, UNAI', equipo: 'ARETXABALETA, U.D.', goles: 6, partidos: 16 },
    { jugador: 'FERNANDEZ DE CASADEVANTE FACCHIN, IÑIGO', equipo: 'ZARAUTZ K.E.', goles: 6, partidos: 17 },
    { jugador: 'CRESPO CARVALHO, GORKA', equipo: 'PORTUGALETE, C.', goles: 6, partidos: 20 },
    { jugador: 'GARAI PETRALANDA, OIER', equipo: 'ZAMUDIO, S.D. A', goles: 5, partidos: 14 },
    { jugador: 'GARCES GIRALDO, UNAI', equipo: 'LEIOA, S.D.', goles: 5, partidos: 15 },
    { jugador: 'LYUBOMIROV HVOYNEV, DANIEL', equipo: 'DEPORTIVO ALAVES C', goles: 5, partidos: 18 },
  ],
};

const normalizeTeam = (name: string) => name
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/g, '');

const normalizeTeamLabel = (team: string) =>
  team
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const buildOfficialStandings = (teams: CompetitionTeam[], clubId: string): StandingTeam[] => {
  let officialData = OFFICIAL_STANDINGS_BY_CLUB[clubId];
  if (clubId === 'escuela-huesca' || clubId === 'escuela-huesca::Juvenil A') {
    officialData = HUESCA_JUVENIL_2627_STANDINGS;
  } else if (clubId.startsWith('escuela-huesca::')) {
    officialData = [];
  }
  if (!officialData) return []; // Este club no tiene datos oficiales hardcodeados
  const byName = new Map(teams.map(t => [normalizeTeam(t.nombre), t]));
  return officialData.map((row, i) => {
    const team = byName.get(normalizeTeam(row.team));
    const formOptions: ('W' | 'D' | 'L')[] = ['W', 'D', 'L'];
    const form = row.played === 0 ? [] : Array.from({ length: 5 }, (_, idx) => formOptions[(row.pos + i + idx) % 3]);
    return {
      pos: row.pos,
      team: team?.nombre || row.team,
      localidad: team?.localidad || '',
      logoUrl: team?.logoUrl || getFederationTeamLogo(row.team),
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: 0,
      goalsAgainst: 0,
      points: row.points,
      form,
    };
  });
};

/**
 * Genera datos de clasificación simulados a partir de los equipos reales.
 * Ordena por puntos descendente y asigna posición.
 */
/** Convierte un id (numérico o string, p.ej. UUID de Supabase) en un número estable para usar como semilla. */
const idToSeed = (id: number | string): number => {
  if (typeof id === 'number') return id;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const generateStandingsFromTeams = (teams: CompetitionTeam[], myTeamName: string): StandingTeam[] => {
  if (teams.length === 0) return [];

  const standings = teams.map(team => {
    const seed = idToSeed(team.id) * 7 + 3;
    const isMyTeam = team.nombre.toLowerCase().includes(myTeamName.toLowerCase());
    
    const played = 18;
    const won = isMyTeam ? 9 : Math.max(1, Math.min(14, (seed % 13) + 1));
    const drawn = Math.max(0, Math.min(played - won, (seed % 7)));
    const lost = played - won - drawn;
    const goalsFor = won * 2 + drawn + Math.floor(seed % 5);
    const goalsAgainst = lost * 2 + drawn + Math.floor((seed + 3) % 5);
    const points = won * 3 + drawn;
    const formOptions: ('W' | 'D' | 'L')[] = ['W', 'D', 'L'];
    const form: ('W' | 'D' | 'L')[] = Array.from({ length: 5 }, (_, i) => formOptions[(seed + i) % 3]);

    return {
      pos: 0,
      team: team.nombre,
      localidad: team.localidad || '',
      logoUrl: team.logoUrl || getFederationTeamLogo(team.nombreEnFed) || getFederationTeamLogo(team.nombre),
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      points,
      form,
    };
  });

  standings.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
  standings.forEach((s, i) => { s.pos = i + 1; });

  return standings;
};

const FormBadge: React.FC<{ result: 'W' | 'D' | 'L' }> = ({ result }) => {
  const colors = {
    W: 'bg-emerald-500 text-white',
    D: 'bg-amber-400 text-white',
    L: 'bg-red-400 text-white',
  };
  return (
    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${colors[result]}`}>
      {result}
    </span>
  );
};

const isMyTeamName = (name: string, myTeam: string): boolean => {
  if (!myTeam) return false;
  return normalizeTeam(name).includes(normalizeTeam(myTeam));
};

const TeamName: React.FC<{ name: string; myTeam: string; className?: string }> = ({ name, myTeam, className = '' }) => {
  const isMine = isMyTeamName(name, myTeam);
  return (
    <span className={`${className} ${isMine ? '!text-[var(--accent)] !font-black' : ''}`}>
      {name}
    </span>
  );
};

const TeamCrest: React.FC<{ name: string; logoUrl?: string; size?: string }> = ({ name, logoUrl, size = 'w-7 h-7' }) => {
  const resolvedLogoUrl = logoUrl || getFederationTeamLogo(name);
  return (
    <span className={`${size} rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {resolvedLogoUrl ? (
        <img loading="lazy" decoding="async" src={resolvedLogoUrl} alt={name} className="max-w-full max-h-full object-contain" />
      ) : (
        <i className="fa-solid fa-shield text-slate-300 text-[10px]"></i>
      )}
    </span>
  );
};

const columnHelper = createColumnHelper<StandingTeam>();

const LeagueTable: React.FC<LeagueTableProps> = ({ teams = [], myTeamName = '', leagueName = '' }) => {
  const [useAI, setUseAI] = useState(true);
  const [activeSection, setActiveSection] = useState<CompetitionSection>('clasificacion');
  const [resultsLeg, setResultsLeg] = useState<'primera' | 'segunda'>('primera');
  const [selectedEquipo, setSelectedEquipo] = useState<string>('TODOS');

  // Obtener el club activo para aislar datos por club
  const { selectedTeam: currentTeam } = useTeam();
  const currentClubId = currentTeam?.id || '';

  // Extraer sub-equipos disponibles (ej: 'Juvenil A', 'Cadete A') para poder filtrar
  const availableEquipos = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach(team => {
      const rawEquipo = team.equipo?.trim();
      if (!rawEquipo) return;
      const key = normalizeTeamLabel(rawEquipo);
      if (!map.has(key)) {
        map.set(key, rawEquipo);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }, [teams]);
  const hasMultipleEquipos = availableEquipos.length > 1;

  // Equipos filtrados por sub-equipo seleccionado
  const filteredTeams = useMemo(() => {
    if (selectedEquipo === 'TODOS' || !hasMultipleEquipos) return teams;
    return teams.filter(t => normalizeTeamLabel(t.equipo || '') === normalizeTeamLabel(selectedEquipo));
  }, [teams, selectedEquipo, hasMultipleEquipos]);

  // Clave de standings: para clubs con sub-equipos usar 'clubId::equipo'
  const standingsKey = useMemo(() => {
    if (hasMultipleEquipos && selectedEquipo !== 'TODOS') {
      return `${currentClubId}::${selectedEquipo}`;
    }
    return currentClubId;
  }, [currentClubId, selectedEquipo, hasMultipleEquipos]);

  // Obtener nombre de mi equipo y liga desde config si no se pasan como prop
  const { resolvedMyTeam, resolvedLeagueName } = useMemo(() => {
    let teamName = myTeamName;
    let league = leagueName;
    try {
      const parsed = getTeamConfig();
      if (parsed) {
        if (!teamName) teamName = parsed.teamName || '';
        if (!league) league = parsed.leagueName || '';
      }
    } catch { /* ignore */ }
    return { resolvedMyTeam: teamName, resolvedLeagueName: league };
  }, [myTeamName, leagueName]);

  // Hook de Gemini para clasificación real
  const {
    standings: geminiStandings,
    isLoading: geminiLoading,
    error: geminiError,
    source: geminiSource,
    refresh: geminiRefresh,
    lastUpdated,
    sources: geminiSources,
  } = useGeminiStandings({
    teamName: resolvedMyTeam,
    competition: resolvedLeagueName,
    autoFetch: useAI && !!resolvedLeagueName,
  });

  // Convertir datos de Gemini al formato StandingTeam
  const aiStandings = useMemo<StandingTeam[]>(() => {
    if (!geminiStandings.length) return [];
    return geminiStandings.map(row => ({
      pos: row.pos,
      team: row.team,
      localidad: '',
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      points: row.points,
      form: row.form,
      logoUrl: getFederationTeamLogo(row.team),
    }));
  }, [geminiStandings]);

  // Decidir qué datos mostrar: oficiales del club > IA > simulados
  const simulatedStandings = useMemo(() => generateStandingsFromTeams(filteredTeams, resolvedMyTeam), [filteredTeams, resolvedMyTeam]);
  const officialStandings = useMemo(() => buildOfficialStandings(filteredTeams, standingsKey), [filteredTeams, standingsKey]);
  const hasOfficialData = officialStandings.length > 0;
  const hasAIData = useAI && aiStandings.length > 0 && !hasOfficialData;
  const standings = hasOfficialData ? officialStandings : (hasAIData ? aiStandings : simulatedStandings);
  const isAISource = hasAIData && (geminiSource === 'gemini' || geminiSource === 'cache');
  const isHuescaCurrentSeason = standingsKey === 'escuela-huesca' || standingsKey === 'escuela-huesca::Juvenil A';
  const hasStarted = standings.some(row => row.played > 0);
  const isPreseasonTable = hasOfficialData && !hasStarted;

  const columns = useMemo(() => [
    columnHelper.accessor('pos', {
      header: '#',
      size: 52,
      cell: info => <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold mx-auto bg-slate-50 text-slate-400">{info.getValue()}</div>,
    }),
    columnHelper.accessor('team', {
      header: 'Equipo',
      cell: info => (
        <div className="flex items-center gap-2 min-w-0">
          <TeamCrest name={info.getValue()} logoUrl={info.row.original.logoUrl} />
          <TeamName name={info.getValue()} myTeam={resolvedMyTeam} className="text-sm font-medium text-slate-700 truncate" />
        </div>
      ),
    }),
    columnHelper.accessor('points', {
      header: 'Pts',
      size: 55,
      cell: info => <span className="text-sm font-bold tabular-nums text-slate-700">{info.getValue()}</span>,
    }),
    columnHelper.accessor('played', {
      header: 'J',
      size: 50,
      cell: info => <span className="text-sm text-slate-500 font-medium tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('won', {
      header: 'G',
      size: 50,
      cell: info => <span className="text-sm text-emerald-600 font-semibold tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('drawn', {
      header: 'E',
      size: 50,
      cell: info => <span className="text-sm text-amber-500 font-semibold tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('lost', {
      header: 'P',
      size: 50,
      cell: info => <span className="text-sm text-red-400 font-semibold tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'form',
      header: 'Últimos',
      size: 140,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.form.length > 0
            ? row.original.form.map((result, i) => (
              <FormBadge key={i} result={result} />
            ))
            : <span className="text-xs font-bold text-slate-300">-</span>}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'lastResult',
      header: 'Resultado',
      size: 90,
      enableSorting: false,
      cell: ({ row }) => {
        // Simulación: mostrar el resultado del último partido
        // En datos reales, adaptar a la estructura
        const last = row.original.form && row.original.form.length > 0 ? row.original.form[0] : null;
        let text = '';
        let color = '';
        if (last === 'W') { text = 'G'; color = 'text-emerald-600'; }
        else if (last === 'D') { text = 'E'; color = 'text-amber-500'; }
        else if (last === 'L') { text = 'P'; color = 'text-red-400'; }
        return last ? <span className={`font-bold ${color}`}>{text}</span> : <span>-</span>;
      },
    }),
  ], [resolvedMyTeam]);

  const extendedColumns = useMemo(() => [
    columnHelper.accessor('pos', {
      header: '#',
      size: 52,
      cell: info => <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold mx-auto bg-slate-50 text-slate-400">{info.getValue()}</div>,
    }),
    columnHelper.accessor('team', {
      header: 'Equipo',
      cell: info => (
        <div className="flex items-center gap-2 min-w-0">
          <TeamCrest name={info.getValue()} logoUrl={info.row.original.logoUrl} />
          <TeamName name={info.getValue()} myTeam={resolvedMyTeam} className="text-sm font-medium text-slate-700 truncate" />
        </div>
      ),
    }),
    columnHelper.accessor('played', {
      header: 'PJ',
      size: 54,
      cell: info => <span className="text-sm text-slate-500 font-medium tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('won', {
      header: 'PG',
      size: 54,
      cell: info => <span className="text-sm text-emerald-600 font-semibold tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('drawn', {
      header: 'PE',
      size: 54,
      cell: info => <span className="text-sm text-amber-500 font-semibold tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('lost', {
      header: 'PP',
      size: 54,
      cell: info => <span className="text-sm text-red-400 font-semibold tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('goalsFor', {
      header: 'GF',
      size: 54,
      cell: info => <span className="text-sm text-slate-500 font-medium tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('goalsAgainst', {
      header: 'GC',
      size: 54,
      cell: info => <span className="text-sm text-slate-500 font-medium tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'gd',
      header: 'DG',
      size: 54,
      cell: ({ row }) => {
        const gd = row.original.goalsFor - row.original.goalsAgainst;
        return <span className={`text-sm font-semibold tabular-nums ${gd >= 0 ? 'text-emerald-600' : 'text-red-400'}`}>{gd}</span>;
      },
    }),
    columnHelper.accessor('points', {
      header: 'Pts',
      size: 58,
      cell: info => <span className="text-sm font-bold tabular-nums text-slate-700">{info.getValue()}</span>,
    }),
  ], []);

  const resultsData = useMemo(() => {
    if (isHuescaCurrentSeason && isPreseasonTable) {
      return HUESCA_JUVENIL_2627_FIXTURES[resultsLeg];
    }
    const sorted = [...standings].sort((a, b) => a.pos - b.pos);
    const list = sorted.slice(0, Math.min(sorted.length, 12));
    return list.map((team, i) => {
      const rival = list[(i + 1) % list.length];
      const homeGoals = (team.points + i) % 4;
      const awayGoals = (rival.points + i + 1) % 4;
      return {
        jornada: resultsLeg === 'primera' ? i + 1 : i + 12,
        local: team.team,
        visitante: rival.team,
        resultado: `${homeGoals}-${awayGoals}`,
      };
    });
  }, [standings, resultsLeg, isHuescaCurrentSeason, isPreseasonTable]);

  const scorersData = useMemo<ScorerRow[]>(() => {
    if (isPreseasonTable) return [];
    const clubScorers = OFFICIAL_SCORERS_BY_CLUB[standingsKey] || OFFICIAL_SCORERS_BY_CLUB[currentClubId];
    if (clubScorers && clubScorers.length > 0) {
      return clubScorers.map((row, i) => ({ ...row, pos: i + 1 }));
    }
    return [...standings]
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
      .map((row, i) => ({
        pos: i + 1,
        jugador: `${row.team.split(',')[0]} #${i + 9}`,
        equipo: row.team,
        goles: Math.max(4, 18 - i - (row.pos % 4)),
        partidos: row.played,
      }));
  }, [standings, currentClubId, standingsKey, isPreseasonTable]);

  const keepersData = useMemo(() => {
    if (isPreseasonTable) return [];
    return [...standings]
      .sort((a, b) => (a.goalsAgainst || a.pos) - (b.goalsAgainst || b.pos))
      .slice(0, 10)
      .map((row, i) => ({
        pos: i + 1,
        portero: `${row.team.split(',')[0]} GK`,
        equipo: row.team,
        imbatido: Math.max(2, 11 - i),
        encajados: row.goalsAgainst,
      }));
  }, [standings, isPreseasonTable]);

  const sectionTabs: Array<{ id: CompetitionSection; label: string; icon: string }> = [
    { id: 'clasificacion', label: 'Ver clasificación', icon: 'fa-list-ol' },
    { id: 'resultados', label: 'Ver resultados', icon: 'fa-list-check' },
    { id: 'goleadores', label: 'Tabla goleadores', icon: 'fa-futbol' },
    { id: 'porteros', label: 'Tabla porteros', icon: 'fa-hand' },
    { id: 'cruzada', label: 'Tabla cruzada', icon: 'fa-table-cells-large' },
    { id: 'extendida', label: 'Versión extendida', icon: 'fa-bars-staggered' },
  ];

  // Loading state mientras Gemini carga
  if (geminiLoading && useAI) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg animate-pulse">
            <i className="fa-solid fa-robot text-white text-sm"></i>
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">
              {resolvedLeagueName || 'Clasificación'}
            </h2>
            <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping"></span>
              Obteniendo datos reales con Gemini AI...
            </p>
          </div>
        </div>
        {/* Skeleton rows */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" style={{ animationDelay: `${i * 80}ms` }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div className="py-12 text-center">
        <i className="fa-solid fa-trophy text-3xl text-slate-200 mb-3"></i>
        <p className="text-sm text-slate-400 font-semibold">No hay equipos de competición importados</p>
        <p className="text-xs text-slate-300 mt-1">Importa datos desde Configuración → Fuentes de Datos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtro por sub-equipo (solo si hay m\u00e1s de uno, ej: Cadete A, Juvenil A) */}
      {availableEquipos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo:</span>
          {availableEquipos.length > 1 && (
            <button
              onClick={() => setSelectedEquipo('TODOS')}
              className={`h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedEquipo === 'TODOS'
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
          )}
          {availableEquipos.map(eq => (
            <button
              key={eq}
              onClick={() => setSelectedEquipo(eq)}
              className={`h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedEquipo === eq
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {eq}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`h-12 px-3 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeSection === tab.id
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                : 'bg-emerald-500 border-emerald-500 text-white/95 hover:bg-emerald-600 hover:border-emerald-600'
            }`}
          >
            <i className={`fa-solid ${tab.icon} text-xs`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Header con nombre de la liga */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
            isAISource
              ? 'bg-linear-to-br from-violet-400 to-violet-600'
              : 'bg-linear-to-br from-amber-400 to-amber-600'
          }`}>
            <i className={`text-white text-sm ${isAISource ? 'fa-solid fa-robot' : 'fa-solid fa-trophy'}`}></i>
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">
              {resolvedLeagueName || 'Clasificación'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {standings.length} equipos
              {hasOfficialData
                ? <span className="text-emerald-600"> · Clasificación oficial</span>
                : (
                  isAISource
                    ? <span className="text-violet-500"> · Datos reales vía Gemini AI</span>
                    : <span> · Jornada simulada</span>
                )
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de fuente */}
          {isAISource && (
            <div className="flex items-center gap-1.5 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">
              <i className="fa-solid fa-sparkles text-violet-500 text-[9px]"></i>
              <span className="text-[9px] font-bold text-violet-600 uppercase tracking-wider">
                {geminiSource === 'cache' ? 'Cache IA' : 'Gemini AI'}
              </span>
            </div>
          )}

          {/* Error badge */}
          {geminiError && useAI && (
            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100" title={geminiError}>
              <i className="fa-solid fa-exclamation-triangle text-amber-500 text-[9px]"></i>
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Fallback simulado</span>
            </div>
          )}

          {/* Toggle IA / Simulado */}
          <button
            onClick={() => setUseAI(!useAI)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all ${
              useAI
                ? 'bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
            title={useAI ? 'Cambiar a datos simulados' : 'Usar datos reales (Gemini AI)'}
          >
            <i className={`text-[8px] ${useAI ? 'fa-solid fa-robot' : 'fa-solid fa-dice'}`}></i>
            {useAI ? 'IA' : 'SIM'}
          </button>

          {/* Botón refrescar (solo si IA activa) */}
          {useAI && isAISource && (
            <button
              onClick={() => geminiRefresh()}
              className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-100 transition-all"
              title={lastUpdated ? `Última actualización: ${lastUpdated.toLocaleTimeString('es-ES')}` : 'Refrescar datos'}
            >
              <i className="fa-solid fa-arrows-rotate text-[8px]"></i>
            </button>
          )}

          {/* Mi equipo badge */}
          {resolvedMyTeam && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-slate-800"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{resolvedMyTeam}</span>
            </div>
          )}
        </div>
      </div>

      {/* Timestamp de actualización */}
      {isAISource && lastUpdated && (
        <p className="text-[9px] text-slate-300 font-medium px-1 -mt-2">
          Actualizado: {lastUpdated.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {isPreseasonTable && (
        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-1 -mt-2">
          Temporada 2026/2027 · primera jornada: 06/09/2026
        </p>
      )}

      {activeSection === 'clasificacion' && (
        <DataTable<StandingTeam>
          data={standings}
          columns={columns}
          sortable
          compact
          emptyMessage="No hay datos de clasificación"
          emptyIcon="fa-solid fa-trophy"
          rowClassName={(row) =>
            resolvedMyTeam && row.team.toLowerCase().includes(resolvedMyTeam.toLowerCase()) ? 'bg-violet-50/50 hover:bg-violet-50' : ''
          }
          hideToolbar
        />
      )}

      {activeSection === 'resultados' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setResultsLeg('primera')}
              className={`h-10 rounded-lg text-sm font-bold transition-all ${
                resultsLeg === 'primera' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Primera Vuelta
            </button>
            <button
              onClick={() => setResultsLeg('segunda')}
              className={`h-10 rounded-lg text-sm font-bold transition-all ${
                resultsLeg === 'segunda' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Segunda Vuelta
            </button>
          </div>
          <div className="grid gap-2">
            {resultsData.map((match) => (
              <div key={`${match.jornada}-${match.local}`} className="grid grid-cols-[72px_1fr_auto_1fr] items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  J{match.jornada}{'fecha' in match ? ` · ${match.fecha}` : ''}
                </span>
                <div className="flex items-center gap-2 min-w-0 justify-end text-right">
                  <TeamName name={match.local} myTeam={resolvedMyTeam} className="text-sm font-semibold text-slate-700 truncate" />
                  <TeamCrest name={match.local} size="w-6 h-6" />
                </div>
                <span className="px-2 py-1 rounded-md bg-slate-800 text-white text-xs font-black tabular-nums">{match.resultado}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <TeamCrest name={match.visitante} size="w-6 h-6" />
                  <TeamName name={match.visitante} myTeam={resolvedMyTeam} className="text-sm font-semibold text-slate-700 truncate" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'goleadores' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          {scorersData.length === 0 && (
            <div className="px-4 py-10 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">
              Sin goleadores hasta el inicio de la temporada
            </div>
          )}
          {scorersData.map((row) => (
            <div key={row.pos} className="grid grid-cols-[44px_1fr_auto_90px] items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-b-0">
              <span className="text-sm font-black text-slate-400">{row.pos}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{row.jugador}</p>
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamCrest name={row.equipo} size="w-5 h-5" />
                  <TeamName name={row.equipo} myTeam={resolvedMyTeam} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate block" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 tabular-nums whitespace-nowrap">{row.partidos} PJ</span>
              <span className="justify-self-end text-sm font-black text-emerald-600">{row.goles} goles</span>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'porteros' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          {keepersData.length === 0 && (
            <div className="px-4 py-10 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">
              Sin porteros destacados hasta el inicio de la temporada
            </div>
          )}
          {keepersData.map((row) => (
            <div key={row.pos} className="grid grid-cols-[44px_1fr_auto] items-center px-4 py-2.5 border-b border-slate-50 last:border-b-0">
              <span className="text-sm font-black text-slate-400">{row.pos}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{row.portero}</p>
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamCrest name={row.equipo} size="w-5 h-5" />
                  <TeamName name={row.equipo} myTeam={resolvedMyTeam} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate block" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-sky-600">{row.imbatido} imbatidos</p>
                <p className="text-[10px] font-bold text-slate-400">{row.encajados} encajados</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'cruzada' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          <table className="min-w-[1600px] w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Equipo</th>
                {standings.map((team) => (
                  <th key={`head-${team.pos}`} className="text-center text-[10px] font-black text-slate-400 px-2 py-2">{team.pos}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((team, rowIndex) => (
                <tr key={`row-${team.pos}`} className="border-t border-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap"><TeamName name={team.team} myTeam={resolvedMyTeam} className="text-[11px] font-semibold text-slate-700" /></td>
                  {standings.map((rival, colIndex) => {
                    if (rowIndex === colIndex) {
                      return <td key={`cell-${team.pos}-${rival.pos}`} className="text-center text-[10px] text-slate-300">-</td>;
                    }
                    const cell = isPreseasonTable ? '-' : `${(team.pos + colIndex) % 4}-${(rival.pos + rowIndex) % 3}`;
                    return <td key={`cell-${team.pos}-${rival.pos}`} className="text-center text-[10px] font-bold text-slate-500">{cell}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSection === 'extendida' && (
        <DataTable<StandingTeam>
          data={standings}
          columns={extendedColumns}
          sortable
          compact
          emptyMessage="No hay datos de clasificación extendida"
          emptyIcon="fa-solid fa-table-list"
          hideToolbar
        />
      )}

      {/* Footer con info de fuente y grounding sources */}
      {isAISource && activeSection === 'clasificacion' && (
        <div className="space-y-1.5 px-1">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-magnifying-glass text-[9px] text-violet-400"></i>
            <p className="text-[9px] text-violet-400 font-semibold uppercase tracking-wider">
              Datos en tiempo real vía Google Search + Gemini AI
            </p>
          </div>
          {geminiSources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] text-slate-300 font-medium">Fuentes:</span>
              {geminiSources.slice(0, 5).map((src, i) => (
                <a
                  key={i}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-[9px] text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition-all"
                  title={src.uri}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[7px]"></i>
                  {src.title || `Fuente ${i + 1}`}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeagueTable;
