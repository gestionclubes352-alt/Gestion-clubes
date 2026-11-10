import React, { useEffect, useMemo, useState } from 'react';
import { teamRank } from './CompetitionExtraPanels';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '../../../shared/components/DataTable';
import type { CompetitionTeam, OfficialStandingRow } from '../types';
import { FEDERATION_STANDINGS_BY_COMPETITION, HUESCA_COMPETITION_BY_TEAM } from '../data/federationStandings';
import { FEDERATION_SCORERS_BY_COMPETITION, FEDERATION_KEEPERS_BY_COMPETITION } from '../data/federationLeaders';
import { FEDERATION_RESULTS_BY_COMPETITION } from '../data/federationResults';
import type { Match } from '../../partidos/types';
import { getTeamConfig } from '@shared/services/dataService';
import type { CalendarioCompeticionPartido } from '@shared/services/dataService';
import { useGeminiStandings } from '../hooks/useGeminiStandings';
import { useTeam } from '@context/TeamContext';
import { getFederationTeamLogo } from '../data/teamLogos';
import TableScrollContainer from '@shared/components/TableScrollContainer';
import { compareEquipoNames } from '@shared/components/EquipoSelect';
import GlobalCompetitionsView, { isOwnTeamInCompetition, internalNameInCompetition } from './GlobalCompetitionsView';
import { HorariosPanel, SancionesPanel, useActas, ownSideOf, norm, type ActaRow } from './CompetitionExtraPanels';
import StandingsCharts from './StandingsCharts';
import ActaMatchSheet from '../../partidos/components/ActaMatchSheet';

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
  matches?: Match[];
  calendarMatches?: CalendarioCompeticionPartido[];
  myTeamName?: string;
  leagueName?: string;
  /**
   * Id del club real (Supabase, `perfil.club_id`) del usuario activo. Tiene prioridad sobre el
   * equipo demo de `useTeam()`, que no refleja el club real cuando se ha iniciado sesión.
   */
  clubId?: string;
  /** Nombre del club real, para poder identificar clubs con datos hardcodeados (ej. Huesca) aunque su id de Supabase no coincida con el id demo. */
  clubName?: string;
  /** Oculta el selector de sub-equipo (ej. para el rol Jugador, que solo puede ver su propio equipo). */
  hideTeamFilter?: boolean;
  /** Fuerza la sección mostrada (la navegación por pestañas la gestiona el contenedor). */
  forcedSection?: 'horarios' | 'actas' | 'calendario' | 'clasificacion' | 'resultados';
  /** Oculta la barra interna de secciones cuando el contenedor ya ofrece sus propias pestañas. */
  hideSectionTabs?: boolean;
}

interface ScorerRow {
  pos: number;
  jugador: string;
  equipo: string;
  /** Nombre interno del equipo del club (ej. "Cadete A"); si existe se muestra en lugar del federativo. */
  equipoLabel?: string;
  goles: number;
  partidos?: number;
}

type CompetitionSection =
  | 'global'
  | 'horarios'
  | 'actas'
  | 'sanciones'
  | 'calendario'
  | 'clasificacion'
  | 'resultados'
  | 'goleadores'
  | 'porteros'
  | 'cruzada';


type CalendarDisplayMatch = {
  jornada: number;
  fecha: string;
  local: string;
  visitante: string;
  resultado: string;
  hora?: string;
  campo?: string;
  status?: string;
};

/**
 * Clasificación oficial Liga Nacional Juvenil Grupo 6 (2026/27), tras la jornada 7.
 * Generada el 2026-11-07 desde la vista agg_standings del Docker local (ffv-postgres),
 * competición 23183382-22-23183383. Para actualizarla, volver a lanzar esa consulta.
 */
const HUESCA_JUVENIL_2627_STANDINGS: OfficialStandingRow[] = [
  { pos: 1, team: 'REAL ZARAGOZA S.A.D.', points: 19, played: 7, won: 6, drawn: 1, lost: 0, goalsFor: 30, goalsAgainst: 5, form: 'WWWWW' },
  { pos: 2, team: 'AMISTAD-U.D.', points: 15, played: 7, won: 4, drawn: 3, lost: 0, goalsFor: 18, goalsAgainst: 8, form: 'WDWDW' },
  { pos: 3, team: 'STADIUM CASABLANCA-C.D.', points: 14, played: 7, won: 4, drawn: 2, lost: 1, goalsFor: 15, goalsAgainst: 8, form: 'DWWDW' },
  { pos: 4, team: 'SAN GREGORIO ARRABAL-C.D.', points: 12, played: 7, won: 3, drawn: 3, lost: 1, goalsFor: 16, goalsAgainst: 11, form: 'WDDWL' },
  { pos: 5, team: 'EBRO-C.D.', points: 12, played: 7, won: 3, drawn: 3, lost: 1, goalsFor: 13, goalsAgainst: 11, form: 'WDDLW' },
  { pos: 6, team: 'MONTECARLO-U.D.', points: 11, played: 7, won: 3, drawn: 2, lost: 2, goalsFor: 15, goalsAgainst: 13, form: 'DWDLL' },
  { pos: 7, team: 'RACING CLUB ZARAGOZA', points: 11, played: 7, won: 3, drawn: 2, lost: 2, goalsFor: 12, goalsAgainst: 12, form: 'DWDWL' },
  { pos: 8, team: 'ESTADIO MIRALBUENO EL OLIVAR', points: 10, played: 7, won: 3, drawn: 1, lost: 3, goalsFor: 14, goalsAgainst: 14, form: 'LLWDW' },
  { pos: 9, team: 'LA LITERA-ESCUELA DEP.', points: 10, played: 7, won: 3, drawn: 1, lost: 3, goalsFor: 11, goalsAgainst: 13, form: 'DWWLW' },
  { pos: 10, team: 'IPC LA ESCUELA', points: 9, played: 7, won: 2, drawn: 3, lost: 2, goalsFor: 14, goalsAgainst: 10, form: 'DDLDW' },
  { pos: 11, team: 'HERNAN CORTES JUNQUERA-C.F.', points: 9, played: 7, won: 3, drawn: 0, lost: 4, goalsFor: 11, goalsAgainst: 10, form: 'WLWWL' },
  { pos: 12, team: 'FRAGA-FUTBOL BASE', points: 8, played: 7, won: 2, drawn: 2, lost: 3, goalsFor: 9, goalsAgainst: 13, form: 'DLWDL' },
  { pos: 13, team: 'SANTO DOMINGO JUVENTUD C.F.', points: 8, played: 7, won: 2, drawn: 2, lost: 3, goalsFor: 8, goalsAgainst: 12, form: 'LDLWL' },
  { pos: 14, team: 'BALSAS PICARRAL-U.D.', points: 8, played: 7, won: 2, drawn: 2, lost: 3, goalsFor: 6, goalsAgainst: 10, form: 'LDLDW' },
  { pos: 15, team: 'OLIVER-C.D.', points: 6, played: 7, won: 2, drawn: 0, lost: 5, goalsFor: 7, goalsAgainst: 13, form: 'LLLWL' },
  { pos: 16, team: 'E.F.B. EJEA', points: 3, played: 7, won: 1, drawn: 0, lost: 6, goalsFor: 8, goalsAgainst: 17, form: 'LLLLL' },
  { pos: 17, team: 'CALAMOCHA-C.F.', points: 0, played: 7, won: 0, drawn: 0, lost: 7, goalsFor: 6, goalsAgainst: 33, form: 'LLLLL' },
];

const HUESCA_JUVENIL_2627_FIXTURES = {
  primera: [
    { jornada: 1, fecha: '06/09/2026', local: 'E.F.B. EJEA', visitante: 'CALAMOCHA-C.F.', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'AMISTAD-U.D.', visitante: 'ESTADIO MIRALBUENO EL OLIVAR', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'RACING CLUB ZARAGOZA', visitante: 'SANTO DOMINGO JUVENTUD C.F.', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'HERNAN CORTES JUNQUERA-C.F.', visitante: 'FRAGA-FUTBOL BASE', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'SAN GREGORIO ARRABAL-C.D.', visitante: 'IPC LA ESCUELA', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'STADIUM CASABLANCA-C.D.', visitante: 'EBRO-C.D.', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'OLIVER-C.D.', visitante: 'MONTECARLO-U.D.', resultado: 'vs' },
    { jornada: 1, fecha: '06/09/2026', local: 'LA LITERA-ESCUELA DEP.', visitante: 'BALSAS PICARRAL-U.D.', resultado: 'vs' },
  ],
  segunda: [
    { jornada: 18, fecha: '24/01/2027', local: 'ESTADIO MIRALBUENO EL OLIVAR', visitante: 'AMISTAD-U.D.', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'SANTO DOMINGO JUVENTUD C.F.', visitante: 'RACING CLUB ZARAGOZA', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'FRAGA-FUTBOL BASE', visitante: 'HERNAN CORTES JUNQUERA-C.F.', resultado: 'vs' },
    { jornada: 18, fecha: '24/01/2027', local: 'IPC LA ESCUELA', visitante: 'SAN GREGORIO ARRABAL-C.D.', resultado: 'vs' },
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
    { pos: 13, team: 'UNION LA JOTA VADORREY-C.D.', points: 25, played: 21, won: 6, drawn: 7, lost: 8 },
    { pos: 14, team: 'ESTADIO MIRALBUENO EL OLIVAR', points: 19, played: 21, won: 4, drawn: 7, lost: 10 },
    { pos: 15, team: 'TERUEL-C.D.', points: 19, played: 20, won: 5, drawn: 4, lost: 11 },
    { pos: 16, team: 'SAN AGUSTIN-C.D.', points: 18, played: 21, won: 4, drawn: 6, lost: 11 },
    { pos: 17, team: 'CALATAYUD-EFB', points: 6, played: 20, won: 2, drawn: 0, lost: 18 },
  ],
  'escuela-huesca::Cadete A': [
    { pos: 1,  team: 'REAL ZARAGOZA S.A.D.', points: 55, played: 21, won: 18, drawn: 1, lost: 2 },
    { pos: 2,  team: 'RACING CLUB ZARAGOZA', points: 52, played: 21, won: 16, drawn: 4, lost: 1 },
    { pos: 3,  team: 'SANTO DOMINGO JUVENTUD C.F.', points: 49, played: 21, won: 15, drawn: 4, lost: 2 },
    { pos: 4,  team: 'MONTECARLO-U.D.', points: 38, played: 20, won: 12, drawn: 2, lost: 6 },
    { pos: 5,  team: 'OLIVER-C.D.', points: 34, played: 19, won: 10, drawn: 4, lost: 5 },
    { pos: 6,  team: 'BALSAS PICARRAL-U.D.', points: 29, played: 20, won: 8, drawn: 5, lost: 7 },
    { pos: 7,  team: 'STADIUM CASABLANCA-C.D.', points: 29, played: 20, won: 8, drawn: 5, lost: 7 },
    { pos: 8,  team: 'HERNAN CORTES JUNQUERA-C.F.', points: 28, played: 20, won: 7, drawn: 7, lost: 6 },
    { pos: 9, team: 'SAN AGUSTIN-C.D.', points: 27, played: 21, won: 9, drawn: 0, lost: 12 },
    { pos: 10, team: 'HUESCA-S.D. ESCUELA DE FUTBOL', points: 25, played: 20, won: 7, drawn: 4, lost: 9 },
    { pos: 11, team: 'AMISTAD-U.D.', points: 23, played: 20, won: 6, drawn: 5, lost: 9 },
    { pos: 12, team: 'BINEFAR-FUTBOL BASE', points: 22, played: 20, won: 6, drawn: 4, lost: 10 },
    { pos: 13, team: 'ESTADIO MIRALBUENO EL OLIVAR', points: 22, played: 20, won: 6, drawn: 4, lost: 10 },
    { pos: 14, team: 'FRAGA-FÚTBOL BASE', points: 16, played: 21, won: 5, drawn: 1, lost: 15 },
    { pos: 15, team: 'CUARTE-C.D.', points: 9, played: 20, won: 3, drawn: 0, lost: 17 },
    { pos: 16, team: 'CALATAYUD-EFB', points: 7, played: 21, won: 2, drawn: 1, lost: 18 },
    { pos: 17, team: 'MONZÓN FÚTBOL BASE - AT. AHP Guarvi', points: 6, played: 20, won: 2, drawn: 0, lost: 18 },
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

/**
 * URL embebida de clasificación oficial de la Federación Aragonesa de Fútbol (futbolaragon.com)
 * por club. Cuando existe, se muestra un iframe con la clasificación en vivo en lugar de la
 * tabla calculada/hardcodeada.
 */
const FEDERATION_STANDINGS_URL_BY_TEAM: Record<string, string> = {
  'escuela-huesca::juvenil a': 'https://www.futbolaragon.com/pnfg/NPcd/NFG_VisClasificacion?cod_primaria=1000120&codjornada=1&codcompeticion=23183382&codgrupo=23183383&codjornada=1',
  'escuela-huesca::primer equipo': 'https://www.futbolaragon.com/pnfg/NPcd/NFG_VisClasificacion?cod_primaria=1000120&codjornada=1&codcompeticion=23183382&codgrupo=23183383&codjornada=1',
};

const FEDERATION_CALENDAR_URL_BY_TEAM: Record<string, string> = {
  'escuela-huesca::juvenil a': 'https://www.futbolaragon.com/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=22&codcompeticion=23183382&codgrupo=23183383&CodJornada=1',
  'escuela-huesca::primer equipo': 'https://www.futbolaragon.com/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=22&codcompeticion=23183382&codgrupo=23183383&CodJornada=1',
};

const FEDERATION_COMPETITION_URL_BY_TEAM: Record<string, string> = {
  'escuela-huesca::juvenil a': 'https://www.futbolaragon.com/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=23183382&CodGrupo=23183383&CodTemporada=22&cod_agrupacion=&CodJornada=1&Sch_Tipo_Juego=1',
  'escuela-huesca::primer equipo': 'https://www.futbolaragon.com/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=23183382&CodGrupo=23183383&CodTemporada=22&cod_agrupacion=&CodJornada=1&Sch_Tipo_Juego=1',
};

const pad2 = (n: number) => String(n).padStart(2, '0');

// Fecha en una sola línea (dd/mm/yyyy). Admite ISO ("2026-10-24T22:00:00.000Z") o texto ya formateado.
const formatMatchDate = (value?: string | null): string => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return value;
};

// Hora solo HH:mm.
const formatMatchTime = (value?: string | null): string => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${pad2(Number(m[1]))}:${m[2]}` : value;
};

const normalizeTeam = (name: string) => name
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/g, '');

// Las jornadas de partidos propios vienen como "J6"; Number("J6") es NaN.
const parseJornada = (value: number | string | undefined | null): number =>
  parseInt(String(value ?? '').replace(/\D/g, ''), 10);

const normalizeTeamLabel = (team: string) =>
  team
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

/** Competiciones federativas del club Huesca (id federativo → nombre y etapa) para la vista agrupada "Todos". */
const HUESCA_ETAPAS = ['Senior', 'Juvenil', 'Cadete', 'Infantil', 'Alevín'] as const;
const HUESCA_COMPETITIONS: ReadonlyArray<{ id: string; name: string; etapa: (typeof HUESCA_ETAPAS)[number] }> = [
  { id: '23183316-22-23258924', name: 'Tercera RFEF G-17', etapa: 'Senior' },
  { id: '23183382-22-23183383', name: 'Liga Nacional Juvenil Grupo 6', etapa: 'Juvenil' },
  { id: '23245982-22-23245995', name: 'Copa - Juvenil Preferente Grupo 1 - Huesca', etapa: 'Juvenil' },
  { id: '23245982-22-23245996', name: 'Copa - Juvenil Preferente Grupo 2 - Huesca', etapa: 'Juvenil' },
  { id: '23183317-22-23183319', name: 'Juvenil Preferente Grupo 2 - Huesca', etapa: 'Juvenil' },
  { id: '23183321-22-23197223', name: 'Primera Juvenil Grupo 2 - Huesca Occidental', etapa: 'Juvenil' },
  { id: '23183313-22-23183314', name: 'División Honor Cadete Grupo Único', etapa: 'Cadete' },
  { id: '23185096-22-23198208', name: 'Cadete Autonómica Grupo 1 - Norte', etapa: 'Cadete' },
  { id: '23183325-22-23198218', name: 'Cadete Preferente Grupo 2 - Huesca', etapa: 'Cadete' },
  { id: '23183332-22-23362987', name: 'Primera Cadete Grupo 2 - Huesca Occidental', etapa: 'Cadete' },
  { id: '23183315-22-23200330', name: 'División Honor Infantil', etapa: 'Infantil' },
  { id: '23183329-22-23200389', name: 'Infantil Preferente Grupo 2 - Huesca', etapa: 'Infantil' },
  { id: '23183333-22-23362986', name: 'Primera Infantil Subgrupo 1 - Huesca', etapa: 'Infantil' },
  { id: '23183372-22-23442812', name: 'Segunda Alevín Grupo 5 - Zaragoza', etapa: 'Alevín' },
  { id: '23596848-22-23596900', name: 'Segunda Alevín Fútbol 8 Grupo 2 - Huesca Occidental', etapa: 'Alevín' },
];
const HUESCA_OWN_TEAM_REGEX = /ipc la escuela|huesca international|internacional huesca|huesca-s\.d\. escuela de futbol/i;

/** Competición federativa → nombre interno del equipo del club (ej. "Cadete A"). */
const HUESCA_INTERNAL_NAME_BY_COMPETITION: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  Object.entries(HUESCA_COMPETITION_BY_TEAM).forEach(([team, comp]) => {
    if (map[comp]) return;
    map[comp] = team.replace(/\b\w/g, c => c.toUpperCase()).replace(/^Alevin/, 'Alevín');
  });
  return map;
})();

/** Sustituye el nombre federativo de nuestros equipos por su nombre interno. */
const withInternalTeamName = <T extends { equipo: string }>(rows: T[], competitionId: string): Array<T & { equipoLabel?: string }> => {
  const internal = HUESCA_INTERNAL_NAME_BY_COMPETITION[competitionId];
  return rows.map(r => (internal && HUESCA_OWN_TEAM_REGEX.test(r.equipo) ? { ...r, equipoLabel: internal } : r));
};

/** Clave de enfrentamiento tolerante a sufijos de equipo B/C entre comillas (ej. E.F.B. Ejea "A" == E.F.B. EJEA). */
const resultPairingKey = (jornada: number, local?: string | null, visitante?: string | null) =>
  `${Number(jornada)}|${normalizeTeam((local || '').replace(/"[^"]*"/g, ''))}|${normalizeTeam((visitante || '').replace(/"[^"]*"/g, ''))}`;

/** Resultados federativos (todos los partidos jugados de la competición) indexados por enfrentamiento. */
const buildFederationResultsLookup = (standingsKey: string): Map<string, string> => {
  const competition = standingsKey === 'escuela-huesca'
    ? HUESCA_COMPETITION_BY_TEAM['juvenil a']
    : standingsKey.startsWith('escuela-huesca::')
      ? HUESCA_COMPETITION_BY_TEAM[standingsKey.slice('escuela-huesca::'.length)]
      : undefined;
  const lookup = new Map<string, string>();
  (competition ? FEDERATION_RESULTS_BY_COMPETITION[competition] || [] : []).forEach(([jornada, local, visitante, score]) => {
    lookup.set(resultPairingKey(jornada, local, visitante), score);
  });
  return lookup;
};

const PRIMARY_TEAM_NAME = 'IPC LA ESCUELA';
const PRIMARY_TEAM_ALIASES = new Set(['IPC LA ESCUELA', 'IPC ESCUELA'].map(normalizeTeam));

const buildOfficialStandings = (teams: CompetitionTeam[], clubId: string): StandingTeam[] => {
  let officialData = OFFICIAL_STANDINGS_BY_CLUB[clubId];
  if (clubId === 'escuela-huesca') {
    officialData = HUESCA_JUVENIL_2627_STANDINGS;
  } else if (clubId.startsWith('escuela-huesca::')) {
    // Clasificación federativa (Docker ffv-postgres) de la competición asignada a cada equipo interno
    const competition = HUESCA_COMPETITION_BY_TEAM[clubId.slice('escuela-huesca::'.length)];
    officialData = (competition && FEDERATION_STANDINGS_BY_COMPETITION[competition]) || [];
  }
  if (!officialData) return []; // Este club no tiene datos oficiales hardcodeados
  const byName = new Map(teams.map(t => [normalizeTeam(t.nombre), t]));
  return officialData.map((row, i) => {
    const team = byName.get(normalizeTeam(row.team));
    const formOptions: ('W' | 'D' | 'L')[] = ['W', 'D', 'L'];
    // Forma real si el dato oficial la trae; si no, se mantiene la simulada de los clubs hardcodeados antiguos.
    const form: ('W' | 'D' | 'L')[] = row.form !== undefined
      ? row.form.split('').filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L')
      : (row.played === 0 ? [] : Array.from({ length: 5 }, (_, idx) => formOptions[(row.pos + i + idx) % 3]));
    return {
      pos: row.pos,
      team: team?.nombre || row.team,
      localidad: team?.localidad || '',
      logoUrl: team?.logoUrl || getFederationTeamLogo(row.team),
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goalsFor ?? 0,
      goalsAgainst: row.goalsAgainst ?? 0,
      points: row.points,
      form,
    };
  });
};

/** Empareja un lado de un partido (nombre + clubId opcional) con un CompetitionTeam. */
const findTeamForSide = (
  teams: CompetitionTeam[],
  sideName?: string,
  sideClubId?: string | number
): CompetitionTeam | undefined => {
  if (sideClubId != null) {
    const byClub = teams.find(t => t.clubId != null && String(t.clubId) === String(sideClubId));
    if (byClub) return byClub;
  }
  if (!sideName) return undefined;
  const normalizedSide = normalizeTeam(sideName);
  if (!normalizedSide) return undefined;
  return teams.find(t =>
    [t.nombreEnFed, t.equipo, t.nombre].some(n => !!n && normalizeTeam(n) === normalizedSide)
  );
};

const MATCH_SCORE_REGEX = /^(\d+)\s*-\s*(\d+)$/;

interface TeamMatchStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  formEntries: { date: string; result: 'W' | 'D' | 'L' }[];
}

/**
 * Calcula la clasificación real a partir de los partidos registrados con resultado ('Finished').
 * Los equipos sin partidos jugados muestran 0 en todas las columnas.
 */
const computeStandingsFromMatches = (teams: CompetitionTeam[], matches: Match[]): StandingTeam[] => {
  if (teams.length === 0) return [];

  const statsByTeamId = new Map<number | string, TeamMatchStats>();
  teams.forEach(team => {
    statsByTeamId.set(team.id, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, formEntries: [] });
  });

  const applyResult = (team: CompetitionTeam | undefined, date: string, gf: number, ga: number) => {
    if (!team) return;
    const stats = statsByTeamId.get(team.id);
    if (!stats) return;
    stats.played += 1;
    stats.goalsFor += gf;
    stats.goalsAgainst += ga;
    let result: 'W' | 'D' | 'L';
    if (gf > ga) { stats.won += 1; stats.points += 3; result = 'W'; }
    else if (gf === ga) { stats.drawn += 1; stats.points += 1; result = 'D'; }
    else { stats.lost += 1; result = 'L'; }
    stats.formEntries.push({ date, result });
  };

  matches.forEach(match => {
    if (match.status !== 'Finished' || !match.score) return;
    const scoreMatch = MATCH_SCORE_REGEX.exec(match.score.trim());
    if (!scoreMatch) return;
    const golLocal = parseInt(scoreMatch[1], 10);
    const golVisitante = parseInt(scoreMatch[2], 10);

    const localTeam = findTeamForSide(teams, match.localTeam, match.localTeamClubId);
    const visitorTeam = findTeamForSide(teams, match.visitorTeam, match.visitorTeamClubId);
    applyResult(localTeam, match.date, golLocal, golVisitante);
    applyResult(visitorTeam, match.date, golVisitante, golLocal);
  });

  const standings = teams.map(team => {
    const stats = statsByTeamId.get(team.id)!;
    const form = [...stats.formEntries]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, 5)
      .map(entry => entry.result);
    return {
      pos: 0,
      team: team.nombre,
      localidad: team.localidad || '',
      logoUrl: team.logoUrl || getFederationTeamLogo(team.nombreEnFed) || getFederationTeamLogo(team.nombre),
      played: stats.played,
      won: stats.won,
      drawn: stats.drawn,
      lost: stats.lost,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      points: stats.points,
      form,
    };
  });

  standings.sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor
  );
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

/** Nombres genéricos de equipos internos del club (p. ej. "Primer Equipo", "Filial", "Juvenil A"). */
const INTERNAL_TEAM_NAME_REGEX = /^(primer equipo|filial|juvenil [a-d]|cadete [a-d]|infantil [a-d]|alevin [a-d])$/i;
const isInternalTeamName = (name: string): boolean =>
  INTERNAL_TEAM_NAME_REGEX.test(name.trim().normalize('NFD').replace(/[̀-ͯ]/g, '')) || HUESCA_OWN_TEAM_REGEX.test(name);

const isMyTeamName = (name: string, myTeam: string): boolean => {
  if (isInternalTeamName(name)) return true;
  if (!myTeam) return false;
  const normalizedName = normalizeTeam(name);
  const normalizedMyTeam = normalizeTeam(myTeam);
  if (PRIMARY_TEAM_ALIASES.has(normalizedName) && PRIMARY_TEAM_ALIASES.has(normalizedMyTeam)) return true;
  // Club Huesca: todos los equipos internos (IPC La Escuela A/B, Huesca International, Huesca-S.D. Escuela de Fútbol)
  if (PRIMARY_TEAM_ALIASES.has(normalizedMyTeam) && HUESCA_OWN_TEAM_REGEX.test(name)) return true;
  return normalizedName.includes(normalizedMyTeam);
};

const TeamName: React.FC<{ name: string; myTeam?: string; isMine?: boolean; className?: string }> = ({ name, myTeam = '', isMine: forcedMine, className = '' }) => {
  const isMine = forcedMine ?? isMyTeamName(name, myTeam);
  return (
    <span className={`${className} ${isMine ? '!text-[#9f1239] !font-black !tracking-wide' : ''}`}>
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

const buildStandingColumns = (isOwn: (team: string) => boolean, dense = false, displayName?: (team: string) => string) => {
  const cols = [
    columnHelper.accessor('pos', {
      header: '#',
      size: dense ? 30 : 36,
      cell: info => <div className={`${dense ? 'w-5 h-5' : 'w-6 h-6'} rounded-lg flex items-center justify-center text-xs font-bold mx-auto bg-slate-50 text-slate-400`}>{info.getValue()}</div>,
    }),
    columnHelper.accessor('team', {
      header: 'Equipo',
      cell: info => (
        <div className="flex items-center gap-1.5 min-w-0">
          <TeamCrest name={info.getValue()} logoUrl={info.row.original.logoUrl} size={dense ? "w-5 h-5" : "w-5 h-5"} />
          <TeamName name={displayName ? displayName(info.getValue()) : info.getValue()} isMine={isOwn(info.getValue())} className="text-xs font-medium text-slate-700 truncate" />
        </div>
      ),
    }),
    columnHelper.accessor('points', {
      header: 'Pts',
      size: dense ? 30 : 40,
      cell: info => <span className="text-xs font-bold tabular-nums text-slate-700">{info.getValue()}</span>,
    }),
    columnHelper.accessor('played', {
      header: 'J',
      size: dense ? 30 : 34,
      cell: info => <span className="text-xs text-slate-500 font-medium tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('won', {
      header: 'G',
      size: dense ? 30 : 34,
      cell: info => <span className="text-xs text-emerald-600 font-semibold tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('drawn', {
      header: 'E',
      size: dense ? 30 : 34,
      cell: info => <span className="text-xs text-amber-500 font-semibold tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('lost', {
      header: 'P',
      size: dense ? 30 : 34,
      cell: info => <span className="text-xs text-red-400 font-semibold tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('goalsFor', {
      header: 'GF',
      size: dense ? 30 : 34,
      cell: info => <span className="text-xs text-slate-500 font-medium tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor('goalsAgainst', {
      header: 'GC',
      size: dense ? 30 : 34,
      cell: info => <span className="text-xs text-slate-500 font-medium tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'goalDiff',
      header: 'DG',
      size: dense ? 30 : 40,
      cell: ({ row }) => {
        const dg = row.original.goalsFor - row.original.goalsAgainst;
        return <span className={`text-sm font-semibold tabular-nums ${dg > 0 ? 'text-emerald-600' : dg < 0 ? 'text-red-400' : 'text-slate-400'}`}>{dg > 0 ? `+${dg}` : dg}</span>;
      },
    }),
    columnHelper.display({
      id: 'form',
      header: 'Últimos',
      size: 110,
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
      size: 70,
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
  ];
  return dense ? cols.filter(c => c.id !== 'form' && c.id !== 'lastResult') : cols;
};

const LeagueTable: React.FC<LeagueTableProps> = ({ teams = [], matches = [], calendarMatches = [], myTeamName = '', leagueName = '', clubId, clubName, hideTeamFilter = false, forcedSection, hideSectionTabs = false }) => {
  const [useAI, setUseAI] = useState(true);
  const [sectionState, setActiveSection] = useState<CompetitionSection>('clasificacion');
  const rawSection: CompetitionSection = forcedSection ?? sectionState;
  // "Actas" se fusionó con "Resultados": cada partido con acta tiene su botón Acta.
  const activeSection: CompetitionSection = rawSection === 'actas' ? 'resultados' : rawSection;
  const [resultsLeg, setResultsLeg] = useState<'primera' | 'segunda'>('primera');
  const [groupBy, setGroupBy] = useState<'fecha' | 'jornada'>('fecha');
  const [selectedEquipo, setSelectedEquipo] = useState<string>('TODOS');

  // Obtener el club activo para aislar datos por club. `clubId` (club real de Supabase) tiene
  // prioridad; si no se pasa, se cae al equipo demo de useTeam() (compatibilidad). Si el club real
  // no coincide con el id demo pero su nombre indica Huesca, se usa igualmente la clave 'escuela-huesca'
  // para poder reutilizar los datos hardcodeados de esa escuela.
  const { selectedTeam: currentTeam } = useTeam();
  const isRealHuescaClub = !!clubName && normalizeTeam(clubName).includes('huesca');
  const isHuescaClub = isRealHuescaClub
    || normalizeTeam(String(clubId || '')).includes('huesca')
    || normalizeTeam(String(currentTeam?.id || '')).includes('huesca');
  const currentClubId = isHuescaClub ? 'escuela-huesca' : (clubId || currentTeam?.id || '');
  // Actas federativas disponibles: permiten abrir el acta desde cada fila de Resultados.
  const { rows: actaRows } = useActas(currentClubId, 'TODOS');
  const [openActaId, setOpenActaId] = useState<string | null>(null);
  const openActa = actaRows.find(r => r.id === openActaId) ?? null;

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
    // Mismo orden que en Plantillas (Primer equipo, Juvenil, Cadete, Infantil, Alevín...)
    return Array.from(map.values()).sort(compareEquipoNames);
  }, [teams]);
  const hasMultipleEquipos = availableEquipos.length > 1;

  // Cuando la cabecera ya ha filtrado a un único equipo, `selectedEquipo` sigue en TODOS.
  // En ese caso usamos el único sub-equipo recibido para no mezclar sus fuentes de datos.
  const effectiveSelectedEquipo = useMemo(() => {
    if (hideTeamFilter) {
      const ownEquipo = availableEquipos.find(
        equipo => normalizeTeamLabel(equipo) === normalizeTeamLabel(myTeamName || currentTeam?.name || '')
      );
      if (ownEquipo) return ownEquipo;
      return availableEquipos.length === 1 ? availableEquipos[0] : 'TODOS';
    }
    const selectedIsAvailable = availableEquipos.some(
      equipo => normalizeTeamLabel(equipo) === normalizeTeamLabel(selectedEquipo)
    );
    if (selectedEquipo !== 'TODOS' && selectedIsAvailable) return selectedEquipo;
    return availableEquipos.length === 1 ? availableEquipos[0] : 'TODOS';
  }, [availableEquipos, selectedEquipo, hideTeamFilter, myTeamName, currentTeam?.name]);

  // Actas indexadas por jornada + rival: el acta nombra a nuestro equipo por su categoría ("Juvenil A")
  // y la clasificación federativa por el club ("IPC LA ESCUELA"), así que el rival es la clave fiable.
  const actaByMatch = useMemo(() => {
    const map = new Map<string, ActaRow>();
    actaRows.forEach(r => {
      if (effectiveSelectedEquipo !== 'TODOS' && normalizeTeamLabel(r.team) !== normalizeTeamLabel(effectiveSelectedEquipo)) return;
      const j = parseInt(String(r.jornada).replace(/\D/g, ''), 10);
      const own = ownSideOf(r);
      if (!Number.isFinite(j) || !own) return;
      const rival = own === 'home' ? r.acta.awayTeam.name : r.acta.homeTeam.name;
      map.set(`${j}|${norm(rival)}`, r);
    });
    return map;
  }, [actaRows, effectiveSelectedEquipo]);

  // Búsqueda tolerante: exacta por jornada+rival y, si falla, por coincidencia parcial del nombre
  // (la clasificación y el acta suelen escribir distinto el mismo rival: comillas, "C.D.", sufijos…).
  const findActaForMatch = (jornada: number | string, local: string, visitante: string): ActaRow | undefined => {
    const j = parseInt(String(jornada).replace(/\D/g, ''), 10);
    if (!Number.isFinite(j)) return undefined;
    const exact = actaByMatch.get(`${j}|${norm(local)}`) ?? actaByMatch.get(`${j}|${norm(visitante)}`);
    if (exact) return exact;
    const wanted = [norm(local), norm(visitante)].filter(n => n.length >= 5);
    for (const [key, row] of actaByMatch) {
      const [kj, kRival] = key.split('|');
      if (Number(kj) !== j || kRival.length < 5) continue;
      if (wanted.some(w => w.includes(kRival) || kRival.includes(w))) return row;
    }
    return undefined;
  };

  // Equipos filtrados por sub-equipo seleccionado
  const filteredTeams = useMemo(() => {
    if (effectiveSelectedEquipo === 'TODOS' || !hasMultipleEquipos) return teams;
    return teams.filter(t => normalizeTeamLabel(t.equipo || '') === normalizeTeamLabel(effectiveSelectedEquipo));
  }, [teams, effectiveSelectedEquipo, hasMultipleEquipos]);

  // Clave de standings: para clubs con sub-equipos usar 'clubId::equipo'
  const standingsKey = useMemo(() => {
    if (effectiveSelectedEquipo !== 'TODOS') {
      return `${currentClubId}::${normalizeTeamLabel(effectiveSelectedEquipo)}`;
    }
    return currentClubId;
  }, [currentClubId, effectiveSelectedEquipo]);

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

  // Filtrar partidos a los equipos actualmente mostrados, para no arrastrar partidos de otras competiciones
  const filteredTeamIds = useMemo(() => new Set(filteredTeams.map(t => t.id)), [filteredTeams]);
  const relevantMatches = useMemo(() => matches.filter(match => {
    const localTeam = findTeamForSide(filteredTeams, match.localTeam, match.localTeamClubId);
    const visitorTeam = findTeamForSide(filteredTeams, match.visitorTeam, match.visitorTeamClubId);
    return (localTeam && filteredTeamIds.has(localTeam.id)) || (visitorTeam && filteredTeamIds.has(visitorTeam.id));
  }), [matches, filteredTeams, filteredTeamIds]);

  // Clasificación calculada a partir de los partidos registrados ('Finished') de estos equipos.
  const matchStandings = useMemo(() => computeStandingsFromMatches(filteredTeams, relevantMatches), [filteredTeams, relevantMatches]);
  const hasRealMatchData = matchStandings.some(row => row.played > 0);

  // Decidir qué datos mostrar: oficiales del club > partidos registrados > IA > (0 en todo si no hay nada)
  const federationStandingsUrl = FEDERATION_STANDINGS_URL_BY_TEAM[standingsKey];
  const federationCalendarUrl = FEDERATION_CALENDAR_URL_BY_TEAM[standingsKey];
  const federationCompetitionUrl = FEDERATION_COMPETITION_URL_BY_TEAM[standingsKey] || federationCalendarUrl;
  const isHuescaOfficialClub = currentClubId === 'escuela-huesca' || isHuescaClub;
  const highlightedTeamName = isHuescaOfficialClub
    ? (filteredTeams.length === 1 && (filteredTeams[0].nombreEnFed || filteredTeams[0].nombre)) || PRIMARY_TEAM_NAME
    : resolvedMyTeam;

  const officialStandings = useMemo(() => buildOfficialStandings(filteredTeams, standingsKey), [filteredTeams, standingsKey]);
  const hasOfficialData = officialStandings.length > 0;
  const hasAIData = useAI && aiStandings.length > 0 && !hasOfficialData && !hasRealMatchData;
  const standings = hasOfficialData ? officialStandings : (hasRealMatchData ? matchStandings : (hasAIData ? aiStandings : matchStandings));
  const isAISource = hasAIData && (geminiSource === 'gemini' || geminiSource === 'cache');
  const isHuescaCurrentSeason = standingsKey === 'escuela-huesca' || standingsKey.startsWith('escuela-huesca::');
  const hasStarted = standings.some(row => row.played > 0);
  const isPreseasonTable = hasOfficialData && !hasStarted;
  const federationDisplayStandings = standings;
  const activeCompetitionStandings = federationStandingsUrl ? federationDisplayStandings : standings;

  const columns = useMemo(() => buildStandingColumns(name => isMyTeamName(name, highlightedTeamName)), [highlightedTeamName]);


  const federationCalendarData = useMemo(() => {
    // Si la clasificación solo contiene al equipo propio, mostramos sus partidos.
    // Cuando contiene la competición completa, mostramos todos los enfrentamientos.
    const competitionTeams = new Set(standings.map(team => normalizeTeam(team.team)));
    const ownTeamAliases = new Set(
      filteredTeams
        .flatMap(team => [team.nombre, team.nombreEnFed, team.equipo])
        .filter((name): name is string => !!name)
        .map(normalizeTeam)
    );
    const hasFullCompetition = standings.length > 1;
    const uniqueMatches = new Map<string, CalendarDisplayMatch>();

    // Partidos del club (con resultado, hora y campo) indexados por enfrentamiento,
    // para completar el calendario federativo, que suele venir sin resultados.
    const clubMatchByPairing = new Map<string, (typeof matches)[number]>();
    matches.forEach(m => {
      if (!m.localTeam || !m.visitorTeam) return;
      clubMatchByPairing.set(`${parseJornada(m.jornada)}|${normalizeTeam(m.localTeam)}|${normalizeTeam(m.visitorTeam)}`, m);
    });

    const federationResults = buildFederationResultsLookup(standingsKey);

    const scheduleRows: CalendarDisplayMatch[] = calendarMatches.length > 0
      ? calendarMatches.map(match => {
        const clubMatch = clubMatchByPairing.get(
          `${Number(match.jornada)}|${normalizeTeam(match.equipo_local)}|${normalizeTeam(match.equipo_visitante)}`
        );
        const clubScore = clubMatch?.status === 'Finished' && clubMatch.score ? clubMatch.score : undefined;
        // 'vs' es el marcador de "sin jugar": no debe impedir usar el resultado federativo.
        const dbResult = match.resultado && match.resultado.trim() !== 'vs' ? match.resultado : undefined;
        const resultado = dbResult
          || clubScore
          || federationResults.get(resultPairingKey(match.jornada, match.equipo_local, match.equipo_visitante));
        return {
          jornada: match.jornada,
          fecha: match.fecha,
          local: match.equipo_local,
          visitante: match.equipo_visitante,
          resultado: resultado || 'vs',
          hora: clubMatch?.time || undefined,
          campo: clubMatch?.location || undefined,
          status: resultado ? 'Finished' : 'Upcoming',
        };
      })
      : matches.map(match => ({
        jornada: parseJornada(match.jornada),
        fecha: match.date,
        local: match.localTeam,
        visitante: match.visitorTeam,
        resultado: match.score || federationResults.get(resultPairingKey(parseJornada(match.jornada), match.localTeam, match.visitorTeam)) || 'vs',
        hora: match.time,
        campo: match.location,
        status: match.status,
      }));

    scheduleRows.forEach(match => {
      if (!match.local || !match.visitante) return;
      const jornada = Number(match.jornada);
      if (!Number.isFinite(jornada)) return;
      const localName = normalizeTeam(match.local);
      const visitorName = normalizeTeam(match.visitante);
      // Los partidos propios usan el nombre interno ("Primer Equipo"), que no figura en la clasificación federativa.
      const localInCompetition = competitionTeams.has(localName) || isInternalTeamName(match.local) || ownTeamAliases.has(localName);
      const visitorInCompetition = competitionTeams.has(visitorName) || isInternalTeamName(match.visitante) || ownTeamAliases.has(visitorName);
      // Un partido de nuestro propio equipo siempre se muestra, aunque el rival esté excluido de la clasificación.
      const involvesOwnTeam = ownTeamAliases.has(localName) || ownTeamAliases.has(visitorName)
        || isInternalTeamName(match.local) || isInternalTeamName(match.visitante);
      const belongsToCompetition = hasFullCompetition
        ? (localInCompetition && visitorInCompetition) || involvesOwnTeam
        : involvesOwnTeam;
      if (!belongsToCompetition) return;
      const key = `${jornada}|${match.fecha}|${normalizeTeam(match.local)}|${normalizeTeam(match.visitante)}`;
      uniqueMatches.set(key, {
        jornada,
        fecha: match.fecha,
        local: match.local,
        visitante: match.visitante,
        resultado: match.resultado,
        hora: match.hora,
        campo: match.campo,
        status: match.status,
      });
    });

    return Array.from(uniqueMatches.values()).sort((a, b) => a.jornada - b.jornada || a.fecha.localeCompare(b.fecha));
  }, [calendarMatches, matches, standings, filteredTeams, standingsKey]);

  const availableJornadas = useMemo(() => {
    return Array.from(new Set(federationCalendarData.map(match => match.jornada))).sort((a, b) => a - b);
  }, [federationCalendarData]);

  const resultsData = useMemo<CalendarDisplayMatch[]>(() => {
    if (federationCalendarData.length > 0) {
      return federationCalendarData;
    }
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
        fecha: '',
        local: team.team,
        visitante: rival.team,
        resultado: `${homeGoals}-${awayGoals}`,
        hora: undefined,
        campo: undefined,
        status: 'Finished',
      };
    });
  }, [federationCalendarData, standings, resultsLeg, isHuescaCurrentSeason, isPreseasonTable]);

  // Orden de visualización: por fecha (por defecto) o por jornada.
  const displayData = useMemo<CalendarDisplayMatch[]>(() => {
    const dateKey = (v?: string | null) => {
      const f = formatMatchDate(v);
      const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return m ? `${m[3]}${m[2]}${m[1]}` : '99999999';
    };
    const list = [...resultsData];
    const rank = (m: CalendarDisplayMatch) => teamRank(m.local, m.visitante);
    if (groupBy === 'fecha') {
      list.sort((a, b) => dateKey(a.fecha).localeCompare(dateKey(b.fecha)) || rank(a) - rank(b) || a.jornada - b.jornada);
    } else {
      list.sort((a, b) => a.jornada - b.jornada || dateKey(a.fecha).localeCompare(dateKey(b.fecha)) || rank(a) - rank(b));
    }
    return list;
  }, [resultsData, groupBy]);

  // Partido que marca "esta semana": el primero desde el lunes actual (o el último si ya pasó todo).
  const thisWeekMatch = useMemo<CalendarDisplayMatch | null>(() => {
    const now = new Date();
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const monKey = `${mon.getFullYear()}${String(mon.getMonth() + 1).padStart(2, '0')}${String(mon.getDate()).padStart(2, '0')}`;
    const keyOf = (v?: string | null) => {
      const m = formatMatchDate(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return m ? `${m[3]}${m[2]}${m[1]}` : null;
    };
    let best: CalendarDisplayMatch | null = null;
    let bestKey = '';
    let last: CalendarDisplayMatch | null = null;
    let lastKey = '';
    resultsData.forEach(m => {
      const k = keyOf(m.fecha);
      if (!k) return;
      if (k >= monKey && (!best || k < bestKey)) { best = m; bestKey = k; }
      if (!last || k > lastKey) { last = m; lastKey = k; }
    });
    return best ?? last;
  }, [resultsData]);

  const scrollToThisWeek = React.useCallback(() => {
    document.getElementById('results-this-week')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Al abrir resultados, ir automáticamente a la semana actual.
  useEffect(() => {
    if (activeSection !== 'resultados' || !thisWeekMatch) return;
    const t = setTimeout(scrollToThisWeek, 150);
    return () => clearTimeout(t);
  }, [activeSection, thisWeekMatch, scrollToThisWeek]);

  // Competición federativa del equipo interno de Huesca seleccionado (para goleadores/porteros reales)
  const federationCompetition = standingsKey.startsWith('escuela-huesca::')
    ? HUESCA_COMPETITION_BY_TEAM[standingsKey.slice('escuela-huesca::'.length)]
    : undefined;

  // Vista "Todos los equipos" de Huesca: agrega las competiciones de todos los equipos internos
  const isHuescaAllTeams = standingsKey === 'escuela-huesca';
  const allHuescaCompetitions = useMemo(
    () => Array.from(new Set(Object.values(HUESCA_COMPETITION_BY_TEAM))),
    []
  );

  const scorersData = useMemo<ScorerRow[]>(() => {
    if (isHuescaAllTeams) {
      return allHuescaCompetitions
        .flatMap(comp => withInternalTeamName(FEDERATION_SCORERS_BY_COMPETITION[comp] || [], comp))
        .filter(row => HUESCA_OWN_TEAM_REGEX.test(row.equipo))
        .sort((a, b) => b.goles - a.goles)
        .map((row, i) => ({ ...row, pos: i + 1 }));
    }
    if (federationCompetition) {
      return withInternalTeamName(FEDERATION_SCORERS_BY_COMPETITION[federationCompetition] || [], federationCompetition).map((row, i) => ({ ...row, pos: i + 1 }));
    }
    if (isPreseasonTable || isHuescaCurrentSeason) return [];
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
  }, [standings, currentClubId, standingsKey, isPreseasonTable, isHuescaCurrentSeason, federationCompetition, isHuescaAllTeams, allHuescaCompetitions]);

  const keepersData = useMemo<Array<{ pos: number; portero: string; equipo: string; equipoLabel?: string; imbatido: number; encajados?: number; partidos?: number }>>(() => {
    if (isHuescaAllTeams) {
      return allHuescaCompetitions
        .flatMap(comp => withInternalTeamName(FEDERATION_KEEPERS_BY_COMPETITION[comp] || [], comp))
        .filter(row => HUESCA_OWN_TEAM_REGEX.test(row.equipo))
        .sort((a, b) => b.imbatido - a.imbatido)
        .map((row, i) => ({ ...row, pos: i + 1 }));
    }
    if (federationCompetition) {
      return withInternalTeamName(FEDERATION_KEEPERS_BY_COMPETITION[federationCompetition] || [], federationCompetition).map((row, i) => ({ ...row, pos: i + 1 }));
    }
    if (isPreseasonTable || isHuescaCurrentSeason) return [];
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
  }, [standings, isPreseasonTable, isHuescaCurrentSeason, federationCompetition, isHuescaAllTeams, allHuescaCompetitions]);

  // La vista Global agrupa todas las competiciones del club (datos federativos de Huesca);
  // no se ofrece al rol Jugador (hideTeamFilter) ni a otros clubes.
  const showGlobalTab = isHuescaClub && !hideTeamFilter;
  const sectionTabs: Array<{ id: CompetitionSection; label: string; icon: string }> = [
    ...(showGlobalTab ? [{ id: 'global' as CompetitionSection, label: 'Global', icon: 'fa-globe' }] : []),
    { id: 'horarios', label: 'Horarios', icon: 'fa-clock' },
    { id: 'resultados', label: 'Resultados y Actas', icon: 'fa-list-check' },
    { id: 'clasificacion', label: 'Clasificación', icon: 'fa-trophy' },
    { id: 'sanciones', label: 'Sanciones', icon: 'fa-square' },
    { id: 'goleadores', label: 'Goleadores', icon: 'fa-futbol' },
    { id: 'porteros', label: 'Porteros', icon: 'fa-hand' },
    { id: 'cruzada', label: 'Cruzada', icon: 'fa-table-cells-large' },
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

  const filterAndTabs = (
    <>
      {/* Filtro por sub-equipo (solo si hay más de uno, ej: Cadete A, Juvenil A) */}
      {!hideTeamFilter && availableEquipos.length > 0 && (
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

      {!hideSectionTabs && <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones de competición">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeSection === tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-semibold transition-all ${
              activeSection === tab.id
                ? 'border-blue-600 bg-blue-600 text-white shadow'
                : 'border-blue-400 bg-white text-slate-700 hover:bg-blue-50'
            }`}
          >
            <i className={`fa-solid ${tab.icon} text-[10px]`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>}
    </>
  );

  if (activeSection === 'global' && showGlobalTab) {
    return (
      <div className="space-y-4">
        {filterAndTabs}
        <GlobalCompetitionsView
          equipoFilter={selectedEquipo}
          clubId={currentClubId}
          onNavigate={(equipo, section) => {
            setSelectedEquipo(equipo);
            setActiveSection(section);
          }}
        />
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
      {filterAndTabs}

      {/* Header con nombre de la liga */}
      <div className={`flex items-center justify-between flex-wrap gap-2 ${activeSection === 'horarios' ? 'hidden' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
            isAISource
              ? 'bg-linear-to-br from-violet-400 to-violet-600'
              : 'bg-linear-to-br from-amber-400 to-amber-600'
          }`}>
            <i className={`text-white text-sm ${isAISource ? 'fa-solid fa-robot' : 'fa-solid fa-trophy'}`}></i>
          </div>
          <div>
            {resolvedLeagueName && (
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">
                {resolvedLeagueName}
              </h2>
            )}
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {standings.length} equipos
              {hasOfficialData
                ? <span className="text-emerald-600"> · Clasificación oficial</span>
                : (
                  isAISource
                    ? <span className="text-violet-500"> · Datos reales vía Gemini AI</span>
                    : (hasRealMatchData
                      ? <span className="text-emerald-600"> · Calculada desde partidos registrados</span>
                      : <span> · Aún sin partidos disputados</span>)
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

      {activeSection === 'clasificacion' && federationStandingsUrl && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-amber-600 shadow-lg">
                <i className="fa-solid fa-trophy text-white"></i>
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">Clasificación oficial · Federación Aragonesa de Fútbol</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Datos de la federación · ordenados por puntos</p>
              </div>
            </div>
            <a
              href={federationStandingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:border-amber-300 hover:text-amber-600"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
              Abrir en nueva pestaña
            </a>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 bg-white p-2 sm:p-3 xl:grid-cols-[minmax(0,56rem)_minmax(0,1fr)]">
            <div className="min-w-0">
              <DataTable<StandingTeam>
                data={federationDisplayStandings}
                columns={columns}
                sortable
                compact
                fit
                emptyMessage="No hay datos de clasificación"
                emptyIcon="fa-solid fa-trophy"
                rowClassName={(row) =>
                  isMyTeamName(row.team, highlightedTeamName) ? 'bg-[#9f1239]/10 hover:bg-[#9f1239]/15 border-l-4 border-[#9f1239]' : ''
                }
                hideToolbar
              />
              <div className="mt-4"><StandingsCharts part="teams" rows={federationDisplayStandings} isOwn={name => isMyTeamName(name, highlightedTeamName)} /></div>
            </div>
            <StandingsCharts part="players" rows={federationDisplayStandings} isOwn={name => isMyTeamName(name, highlightedTeamName)} />
          </div>

          <p className="border-t border-slate-100 px-5 py-3 text-[11px] font-semibold text-slate-400">
            Consulta oficial de la competición. Para abrir el portal federativo, utiliza «Abrir en nueva pestaña».
          </p>
        </section>
      )}

      {activeSection === 'clasificacion' && !federationStandingsUrl && standingsKey === 'escuela-huesca' && (
        <div className="space-y-8">
          {HUESCA_ETAPAS.map(etapa => {
            const comps = HUESCA_COMPETITIONS.filter(c => c.etapa === etapa && FEDERATION_STANDINGS_BY_COMPETITION[c.id]?.length);
            if (comps.length === 0) return null;
            return (
              <section key={etapa} className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-[#c8102e]"></span>
                  {etapa}
                  <span className="text-[10px] font-bold text-slate-400">· {comps.length} {comps.length === 1 ? 'competición' : 'competiciones'}</span>
                </h3>
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                  {comps.map(comp => {
                    const rows: StandingTeam[] = FEDERATION_STANDINGS_BY_COMPETITION[comp.id].map(row => ({
                      pos: row.pos,
                      team: row.team,
                      localidad: '',
                      logoUrl: getFederationTeamLogo(row.team),
                      played: row.played,
                      won: row.won,
                      drawn: row.drawn,
                      lost: row.lost,
                      goalsFor: row.goalsFor ?? 0,
                      goalsAgainst: row.goalsAgainst ?? 0,
                      points: row.points,
                      form: (row.form || '').split('').filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L'),
                    }));
                    const isOwn = (name: string) => isOwnTeamInCompetition(comp.id, name) || isInternalTeamName(name);
                    return (
                      <div key={comp.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-amber-600 shadow">
                            <i className="fa-solid fa-trophy text-white text-xs"></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate">{comp.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{rows.length} equipos · Temporada 2026/2027</p>
                          </div>
                        </div>
                        <div className="p-2">
                          <DataTable<StandingTeam>
                            data={rows}
                            columns={buildStandingColumns(name => isOwn(name), true, name => {
                              const internal = internalNameInCompetition(comp.id, name);
                              return internal ? `${name} - ${internal}` : name;
                            })}
                            compact
                            fit
                            cellTextClassName="text-[11px] [&_span]:!text-[11px]"
                            emptyMessage="No hay datos de clasificación"
                            emptyIcon="fa-solid fa-trophy"
                            rowClassName={(row) => isOwn(row.team) ? '!bg-[#9f1239]/20 hover:!bg-[#9f1239]/25 border-l-4 border-[#9f1239] shadow-[inset_0_0_0_1px_rgba(159,18,57,0.35)]' : ''}
                            hideToolbar
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {activeSection === 'clasificacion' && !federationStandingsUrl && standingsKey !== 'escuela-huesca' && (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,56rem)_minmax(0,1fr)]">
          <div className="min-w-0">
            <DataTable<StandingTeam>
              data={standings}
              columns={columns}
              sortable
              compact
              fit
              emptyMessage="No hay datos de clasificación"
              emptyIcon="fa-solid fa-trophy"
              rowClassName={(row) =>
                isMyTeamName(row.team, highlightedTeamName) ? 'bg-[#9f1239]/10 hover:bg-[#9f1239]/15 border-l-4 border-[#9f1239]' : ''
              }
              hideToolbar
            />
            <div className="mt-4"><StandingsCharts part="teams" rows={standings} isOwn={name => isMyTeamName(name, highlightedTeamName)} /></div>
          </div>
          <StandingsCharts part="players" rows={standings} isOwn={name => isMyTeamName(name, highlightedTeamName)} />
        </div>
      )}

      {activeSection === 'horarios' && <HorariosPanel matches={matches} equipo={effectiveSelectedEquipo} />}
      {activeSection === 'sanciones' && <SancionesPanel clubId={currentClubId} equipo={effectiveSelectedEquipo} />}

      {activeSection === 'calendario' && federationCalendarUrl && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c8102e] text-white shadow-lg">
              <i className="fa-solid fa-calendar-days"></i>
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Calendario oficial · Federación Aragonesa de Fútbol</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Jornadas y partidos de la Liga Nacional Juvenil · Grupo 6</p>
            </div>
          </div>
          <a
            href={federationCompetitionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:border-[#c8102e]/50 hover:text-[#c8102e]"
          >
            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
            Ver competición oficial
          </a>
        </section>
      )}

      {activeSection === 'resultados' && openActa && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setOpenActaId(null)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:border-slate-400"
          >
            <i className="fa-solid fa-arrow-left"></i>Volver a resultados
          </button>
          <ActaMatchSheet acta={openActa.acta} ownSide={ownSideOf(openActa)} />
        </div>
      )}

      {(activeSection === 'resultados' || activeSection === 'calendario') && !(activeSection === 'resultados' && openActa) && (
        <div className="space-y-4">
          {federationCalendarData.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                {activeSection === 'calendario' ? 'Calendario completo' : 'Resultados completos'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {availableJornadas.length} jornadas · {resultsData.length} enfrentamientos · calendario oficial
              </span>
            </div>
          ) : (
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
          )}
          <div className="sticky top-0 z-30 mx-auto flex w-full max-w-3xl items-center justify-end gap-2 bg-white/95 py-2 backdrop-blur">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agrupar por</span>
            {(['fecha', 'jornada'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setGroupBy(opt)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  groupBy === opt ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
            <button
              type="button"
              onClick={scrollToThisWeek}
              disabled={!thisWeekMatch}
              className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 transition-all hover:bg-blue-100 disabled:opacity-50"
            >
              Esta semana
            </button>
          </div>
          <div className="mx-auto grid w-full max-w-3xl gap-1.5">
            {displayData.map((match, index) => {
              const matchTime = formatMatchTime(match.hora);
              const matchLocation = match.campo;
              const matchDate = formatMatchDate(match.fecha);
              const isPrimaryMatch = isMyTeamName(match.local, highlightedTeamName) || isMyTeamName(match.visitante, highlightedTeamName);
              const previousMatch = index > 0 ? displayData[index - 1] : undefined;
              const showJornadaHeader = !previousMatch || (groupBy === 'fecha'
                ? formatMatchDate(previousMatch.fecha) !== matchDate
                : previousMatch.jornada !== match.jornada);
              return (
                <React.Fragment key={`${match.jornada}-${match.fecha}-${match.local}-${match.visitante}`}>
                  {showJornadaHeader && (
                    <div
                      id={thisWeekMatch && (groupBy === 'fecha'
                        ? formatMatchDate(thisWeekMatch.fecha) === matchDate
                        : thisWeekMatch.jornada === match.jornada) ? 'results-this-week' : undefined}
                      className="flex scroll-mt-24 items-center gap-3 pt-3 first:pt-0"
                    >
                      <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                        {groupBy === 'fecha' ? (matchDate || 'Sin fecha') : `Jornada ${match.jornada}`}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {groupBy === 'fecha' ? '' : matchDate}
                      </span>
                    </div>
                  )}
                  <div className={`grid gap-2 rounded-lg border bg-white px-2.5 py-1 md:grid-cols-[64px_minmax(0,1fr)_96px_minmax(0,1fr)] md:items-center ${isPrimaryMatch ? 'border-[#9f1239]/50 bg-[#9f1239]/10 ring-1 ring-inset ring-[#9f1239]/40' : 'border-slate-100'}`}>
                    <div className="flex flex-row items-center gap-2 text-[9px] font-black uppercase leading-tight tracking-wider text-slate-400 md:flex-col md:items-start md:gap-0">
                      <span className="whitespace-nowrap">J{match.jornada}</span>
                      <span className="whitespace-nowrap">{matchDate}</span>
                      {activeSection === 'resultados' && matchTime && (
                        <span className="whitespace-nowrap text-slate-500"><i className="fa-regular fa-clock mr-1 text-[9px]"></i>{matchTime}</span>
                      )}
                    </div>
                    <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                      <TeamName name={match.local} myTeam={highlightedTeamName} className="truncate text-xs font-semibold leading-tight text-slate-700" />
                      <TeamCrest name={match.local} size="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-center gap-0.5 border-y border-slate-100 py-2 md:border-y-0 md:border-x md:px-2 md:py-0">
                      {activeSection === 'resultados' ? (
                        <>
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-black uppercase leading-tight tabular-nums whitespace-nowrap ${match.resultado === 'vs' ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-white'}`}>
                            {match.resultado === 'vs' ? 'Sin jugar' : match.resultado}
                          </span>
                          {(() => {
                            const acta = findActaForMatch(match.jornada, match.local, match.visitante);
                            return acta ? (
                              <button
                                type="button"
                                onClick={() => setOpenActaId(acta.id)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:border-[#c8102e]/50 hover:text-[#c8102e]"
                              >
                                <i className="fa-solid fa-clipboard-list text-[9px]"></i>Acta
                              </button>
                            ) : null;
                          })()}
                        </>
                      ) : (
                        <>
                          <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-[11px] font-black uppercase leading-tight tabular-nums text-white">{match.resultado}</span>
                          <span className="text-[9px] font-bold leading-tight text-slate-500">{matchTime || 'Hora pendiente'}</span>
                          <span className="max-w-full truncate text-[9px] font-semibold leading-tight text-slate-400" title={matchLocation || 'Campo pendiente'}>{matchLocation || 'Campo pendiente'}</span>
                        </>
                      )}
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamCrest name={match.visitante} size="w-6 h-6" />
                      <TeamName name={match.visitante} myTeam={highlightedTeamName} className="truncate text-xs font-semibold leading-tight text-slate-700" />
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === 'goleadores' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden max-w-2xl">
          {scorersData.length === 0 && (
            <div className="px-4 py-10 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">
              Sin goleadores hasta el inicio de la temporada
            </div>
          )}
          {scorersData.map((row) => (
            <div key={row.pos} className={`grid grid-cols-[28px_1fr_auto_64px] items-center gap-2 px-3 py-1.5 border-b border-slate-50 last:border-b-0 ${isMyTeamName(row.equipo, highlightedTeamName) ? 'border-l-4 border-[#9f1239] bg-[#9f1239]/10' : ''}`}>
              <span className="text-sm font-black text-slate-400">{row.pos}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{row.jugador}</p>
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamCrest name={row.equipo} size="w-5 h-5" />
                  <TeamName name={row.equipoLabel || row.equipo} myTeam={highlightedTeamName} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate block" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 tabular-nums whitespace-nowrap">{row.partidos !== undefined ? `${row.partidos} PJ` : ''}</span>
              <span className="justify-self-end text-sm font-black text-emerald-600">{row.goles}</span>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'porteros' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden max-w-2xl">
          {keepersData.length === 0 && (
            <div className="px-4 py-10 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">
              Sin porteros destacados hasta el inicio de la temporada
            </div>
          )}
          {keepersData.map((row) => (
            <div key={row.pos} className={`grid grid-cols-[28px_1fr_auto] items-center gap-2 px-3 py-1.5 border-b border-slate-50 last:border-b-0 ${isMyTeamName(row.equipo, highlightedTeamName) ? 'border-l-4 border-[#9f1239] bg-[#9f1239]/10' : ''}`}>
              <span className="text-sm font-black text-slate-400">{row.pos}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{row.portero}</p>
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamCrest name={row.equipo} size="w-5 h-5" />
                  <TeamName name={row.equipoLabel || row.equipo} myTeam={highlightedTeamName} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate block" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-sky-600">{row.imbatido} imbatidos</p>
                {row.partidos !== undefined && <p className="text-[10px] font-bold text-slate-400">{row.partidos} PJ</p>}
                {row.encajados !== undefined && <p className="text-[10px] font-bold text-slate-400">{row.encajados} encajados</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'cruzada' && (
        <TableScrollContainer className="rounded-2xl border border-slate-100 bg-white">
          <table className="min-w-[640px] w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-1">Equipo</th>
                {activeCompetitionStandings.map((team) => (
                  <th key={`head-${team.pos}`} className="text-center text-[10px] font-black text-slate-400 px-0.5 py-1">{team.pos}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeCompetitionStandings.map((team, rowIndex) => (
                <tr key={`row-${team.pos}`} className={`border-t border-slate-50 ${isMyTeamName(team.team, highlightedTeamName) ? 'bg-[#9f1239]/10' : ''}`}>
                  <td className={`px-2 py-1 whitespace-nowrap ${isMyTeamName(team.team, highlightedTeamName) ? 'border-l-4 border-[#9f1239] bg-[#9f1239]/10' : ''}`}><TeamName name={team.team} myTeam={highlightedTeamName} className="text-[11px] font-semibold text-slate-700" /></td>
                  {activeCompetitionStandings.map((rival, colIndex) => {
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
        </TableScrollContainer>
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
