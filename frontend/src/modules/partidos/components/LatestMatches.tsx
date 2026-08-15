import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import type { Match, MatchReport } from '../types';
import type { CompetitionTeam } from '@modules/competicion';
import type { Club } from '@modules/clubes/types';
import { db, getTeamConfig, localidadesService, instalacionesCamposService } from '@shared/services/dataService';
import type { Localidad, InstalacionCampo } from '@shared/services/dataService';
import PlayerStatsSummary from './PlayerStatsSummary';
import SearchableSelect from '@shared/components/SearchableSelect';
import { compareEquipoNames } from '@shared/components/EquipoSelect';
import { DataTable } from '@shared/components/DataTable';
import type { DataTableAction } from '@shared/components/DataTable';

const getMyClubIdsForCompetition = (competition: string, competitionTeams: CompetitionTeam[]): Set<string> => {
  const ids = new Set<string>();
  competitionTeams
    .filter(team => isSameCompetition(team.competicion, competition) && team.clubId)
    .forEach(team => {
      if (team.clubId) ids.add(String(team.clubId));
    });
  return ids;
};

const getMyTeamNamesForCompetition = (competition: string, competitionTeams: CompetitionTeam[]): Set<string> => {
  const names = new Set<string>();
  // Agregar nombres conocidos del equipo (hardcoded como fallback)
  names.add('ipc la escuela');
  names.add('juvenil a');

  competitionTeams
    .filter(team => isSameCompetition(team.competicion, competition))
    .forEach(team => {
      if (team.nombreEnFed) names.add(normalizeTeamKey(team.nombreEnFed));
      if (team.nombre) names.add(normalizeTeamKey(team.nombre));
      if (team.equipo) names.add(normalizeTeamKey(team.equipo));
    });
  return names;
};

const isMyTeam = (name: string, myTeamNames: Set<string> | undefined): boolean => {
  if (!myTeamNames || myTeamNames.size === 0) return false;
  return myTeamNames.has(normalizeTeamKey(name));
};

const normalizeTeamKey = (value: string | undefined) =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const containsTeamWords = (value: string | undefined, teamValue: string | undefined) => {
  const source = normalizeTeamKey(value);
  const target = normalizeTeamKey(teamValue);
  if (!source || !target) return false;
  return target.split(' ').every(word => source.includes(word));
};

const isSameCompetition = (teamCompetition: string | undefined, matchCompetition: string | undefined) => {
  if (!teamCompetition || !matchCompetition) return false;
  return normalizeTeamKey(teamCompetition) === normalizeTeamKey(matchCompetition);
};

const internalNameOfTeam = (team: CompetitionTeam) => (team.equipo || team.nombre || '').trim();

const isLikelyInternalTeamName = (value: string | undefined) => {
  const normalized = normalizeTeamKey(value);
  return /^(primer equipo|filial|senior|juvenil|cadete|infantil|alevin|benjamin|prebenjamin)(\s+[a-z0-9]+)?$/.test(normalized);
};

const dateKeyOf = (date: string | undefined) => String(date || '').slice(0, 10);

// El equipo "propio" de un partido es el que coincide con nuestros equipos en esa competición.
const ownTeamNameOf = (match: Match, competitionTeams: CompetitionTeam[]): string => {
  const local = match.localTeam || '';
  const visitor = match.visitorTeam || '';

  // Primero, intentar identificar por clubId (más confiable)
  const myClubIds = getMyClubIdsForCompetition(match.competition, competitionTeams);
  if (myClubIds.size > 0) {
    if (match.localTeamClubId && myClubIds.has(String(match.localTeamClubId))) return local;
    if (match.visitorTeamClubId && myClubIds.has(String(match.visitorTeamClubId))) return visitor;
  }

  // Fallback: identificar por nombre
  const myTeams = getMyTeamNamesForCompetition(match.competition, competitionTeams);
  if (isMyTeam(local, myTeams)) return local;
  if (isMyTeam(visitor, myTeams)) return visitor;
  return local || visitor;
};

const ALL_FILTER = 'ALL';

/** Convierte una URL de YouTube/Vimeo en su URL de embebido para reproducir en un modal. */
const getMatchVideoEmbedUrl = (url: string): string => {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (vimeoMatch) {
    const hash = vimeoMatch[2];
    return `https://player.vimeo.com/video/${vimeoMatch[1]}${hash ? `?h=${hash}` : ''}`;
  }
  return url;
};

const getCompetitionType = (competition: string | undefined): string => {
  if (!competition) return '-';
  const normalized = competition.trim().toUpperCase();
  if (normalized.includes('LIGA')) return 'LIGA';
  if (normalized.includes('COPA')) return 'COPA';
  if (normalized.includes('AMISTOSO')) return 'AMISTOSO';
  if (normalized.includes('TORNEO')) return 'TORNEO';
  if (normalized.includes('CAMPEONATO')) return 'CAMPEONATO';
  const firstWord = normalized.split(/[\s,]+/)[0];
  return firstWord || '-';
};

interface LatestMatchesProps {
  matches: Match[];
  onSave: (match: Match) => Promise<void>;
  onDelete: (id: number | string) => Promise<void>;
  onEdit?: (match: Match) => void;
  onClickMatch?: (match: Match) => void;
  onCreate?: () => void;
  competitionTeams?: CompetitionTeam[];
  clubes?: Club[];
  ownClubId?: string | number;
  onSelectPlayer?: (playerId: string) => void;
}

const LatestMatches: React.FC<LatestMatchesProps> = ({ matches, onSave, onDelete, onEdit, onClickMatch, onCreate, competitionTeams = [], clubes = [], ownClubId, onSelectPlayer }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'STATS'>('MATCHES');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'calendar'>('table');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [tipoFilter, setTipoFilter] = useState<string>(ALL_FILTER);
  const [competitionFilter, setCompetitionFilter] = useState<string>(ALL_FILTER);
  const [jornadaFilter, setJornadaFilter] = useState<string>(ALL_FILTER);
  const [equipoInternoFilter, setEquipoInternoFilter] = useState<string>(ALL_FILTER);
  const [localidadFilter, setLocalidadFilter] = useState<string>(ALL_FILTER);
  const [instalacionPrincipalFilter, setInstalacionPrincipalFilter] = useState<string>(ALL_FILTER);
  const [campoFilter, setCampoFilter] = useState<string>(ALL_FILTER);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [instalacionesCampos, setInstalacionesCampos] = useState<InstalacionCampo[]>([]);
  const [matchReportsById, setMatchReportsById] = useState<Map<string, MatchReport>>(new Map());
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const locs = await localidadesService.list();
        const insts = await instalacionesCamposService.list();
        if (locs) setLocalidades(locs as Localidad[]);
        if (insts) setInstalacionesCampos(insts as InstalacionCampo[]);
      } catch (err) {
        console.error('Error al cargar localidades e instalaciones:', err);
      }
    })();
  }, []);

  // Vídeo, goles a favor/contra y ocasiones vienen del informe de partido (match_reports),
  // no del propio Match, así que se cargan aparte y se cruzan por id.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await db.match_reports.get();
        const map = new Map<string, MatchReport>();
        (data || []).forEach((report: MatchReport) => map.set(String(report.id), report));
        setMatchReportsById(map);
      } catch (err) {
        console.error('Error al cargar los informes de partido:', err);
      }
    })();
  }, []);

  const campoParentMap = useMemo(
    () => new Map(instalacionesCampos.filter(i => i.parent_instalacion_id).map(i => [i.id, i.parent_instalacion_id as string])),
    [instalacionesCampos]
  );

  useEffect(() => {
    if (instalacionPrincipalFilter !== ALL_FILTER && campoFilter !== ALL_FILTER && campoParentMap.get(campoFilter) !== instalacionPrincipalFilter) {
      setCampoFilter(ALL_FILTER);
    }
  }, [instalacionPrincipalFilter, campoFilter, campoParentMap]);

  // Solo nuestros propios equipos (por clubId), no los rivales del catálogo de la competición.
  const ownCompetitionTeams = useMemo(
    () => (ownClubId ? competitionTeams.filter((team) => String(team.clubId) === String(ownClubId)) : []),
    [competitionTeams, ownClubId]
  );

  // Mapa nombreEnFed -> nombre interno canónico (p.ej. "juvenil a" de la federación -> "Juvenil A"),
  // para poder resolver el equipo interno de partidos de liga que no tienen nombreInterno rellenado a mano.
  // Se calcula primero porque lo usa resolveEquipoInterno.
  const internalNameByFedName = useMemo(() => {
    const map = new Map<string, string>();
    ownCompetitionTeams.forEach((team) => {
      const canonical = (team.equipo || team.nombre || '').trim();
      if (!canonical) return;
      map.set(normalizeTeamKey(canonical), canonical);
      const fedName = normalizeTeamKey(team.nombreEnFed);
      if (fedName) map.set(fedName, canonical);
    });
    return map;
  }, [ownCompetitionTeams]);

  const normalizeInternalCandidate = (candidate?: string): string | undefined => {
    const key = normalizeTeamKey(candidate);
    if (!key) return undefined;
    return internalNameByFedName.get(key) || (isLikelyInternalTeamName(candidate) ? candidate?.trim() : undefined);
  };

  const findInternalNameForCandidate = (match: Match, candidate?: string): string | undefined => {
    const normalizedInternal = normalizeInternalCandidate(candidate);
    if (normalizedInternal) return normalizedInternal;

    const key = normalizeTeamKey(candidate);
    if (!key) return undefined;

    const competitionTeams = ownCompetitionTeams.filter((team) => isSameCompetition(team.competicion, match.competition));
    const pools = competitionTeams.length > 0 ? [competitionTeams, ownCompetitionTeams] : [ownCompetitionTeams];

    for (const pool of pools) {
      const byInternalOrFed = pool.find((team) =>
        [team.equipo, team.nombreEnFed].map(normalizeTeamKey).includes(key)
      );
      if (byInternalOrFed) return internalNameOfTeam(byInternalOrFed);

      const byClubName = pool.filter((team) => normalizeTeamKey(team.nombre) === key);
      if (byClubName.length === 1) return internalNameOfTeam(byClubName[0]);
    }

    return internalNameByFedName.get(key);
  };

  const findInternalNameByCompetitionContext = (match: Match): string | undefined => {
    const candidates = [match.nombreInterno, match.team, match.localTeam, match.visitorTeam];
    const clubIds = [match.localTeamClubId, match.visitorTeamClubId].filter(Boolean).map(String);

    const matchesSide = (team: CompetitionTeam) => {
      const aliases = [team.equipo, team.nombreEnFed, team.nombre].map(normalizeTeamKey).filter(Boolean);
      const candidateMatch = candidates.some(candidate => aliases.includes(normalizeTeamKey(candidate)));
      const clubIdMatch = team.clubId != null && clubIds.includes(String(team.clubId));
      return candidateMatch || clubIdMatch;
    };

    const contextualMatches = ownCompetitionTeams.filter((team) => {
      if (!matchesSide(team)) return false;

      const internal = internalNameOfTeam(team);
      const etapa = team.etapa || internal.split(' ')[0];
      const competitionMatches =
        isSameCompetition(team.competicion, match.competition) ||
        containsTeamWords(match.competition, internal) ||
        containsTeamWords(match.competition, etapa);

      return competitionMatches;
    });

    const uniqueInternalNames = Array.from(new Set(contextualMatches.map(internalNameOfTeam).filter(Boolean)));
    return uniqueInternalNames.length === 1 ? uniqueInternalNames[0] : undefined;
  };

  const resolveEquipoInterno = (match: Match): string => {
    const own = ownCompetitionTeams.length > 0 ? ownTeamNameOf(match, ownCompetitionTeams) : '';
    const candidates = [match.nombreInterno, match.team, match.localTeam, match.visitorTeam, own];
    for (const candidate of candidates) {
      const mapped = findInternalNameForCandidate(match, candidate);
      if (mapped) return mapped;
    }
    const byCompetitionContext = findInternalNameByCompetitionContext(match);
    if (byCompetitionContext) return byCompetitionContext;
    return normalizeInternalCandidate(match.nombreInterno) || normalizeInternalCandidate(match.team) || own || match.nombreInterno || match.team || '';
  };

  // Tipos de Competición: filtrados por Equipo Interno si está seleccionado
  const tipoOptions = useMemo(() => {
    const types = new Set<string>();
    const sourceMatches = equipoInternoFilter === ALL_FILTER
      ? matches
      : matches.filter((m) => resolveEquipoInterno(m) === equipoInternoFilter);
    sourceMatches.forEach((m) => {
      if (m.competition) {
        const type = getCompetitionType(m.competition);
        if (type !== '-') types.add(type);
      }
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matches, equipoInternoFilter, competitionTeams, ownCompetitionTeams, internalNameByFedName]);

  // Equipos Internos: filtrados por Competición si está seleccionada
  const equipoInternoOptions = useMemo(() => {
    const names = new Map<string, string>();
    const addName = (name?: string) => {
      const value = name?.trim();
      const key = normalizeTeamKey(value);
      if (value && key && !names.has(key)) names.set(key, value);
    };

    // Filtrar equipos propios según competición si está seleccionada
    const filteredOwnTeams = competitionFilter === ALL_FILTER
      ? ownCompetitionTeams
      : ownCompetitionTeams.filter((team) => isSameCompetition(team.competicion, competitionFilter));

    filteredOwnTeams.forEach((team) => addName(internalNameOfTeam(team)));

    // Si hay competición seleccionada, solo mostrar equipos de esa competición
    const sourceMatches = competitionFilter === ALL_FILTER ? matches : matches.filter((m) => m.competition === competitionFilter);

    sourceMatches.forEach((m) => {
      addName(isLikelyInternalTeamName(m.nombreInterno) ? m.nombreInterno : undefined);
      addName(isLikelyInternalTeamName(m.team) ? m.team : undefined);
    });
    return Array.from(names.values()).sort(compareEquipoNames);
  }, [ownCompetitionTeams, matches, competitionFilter]);

  // Competiciones: filtradas por Equipo Interno y Tipo si está seleccionados
  const competitionOptions = useMemo(() => {
    const names = new Set<string>();

    // Si hay equipo seleccionado, solo mostrar competiciones de ese equipo
    let sourceMatches = equipoInternoFilter === ALL_FILTER
      ? matches
      : matches.filter((m) => resolveEquipoInterno(m) === equipoInternoFilter);

    // Si hay tipo seleccionado, filtrar por tipo
    if (tipoFilter !== ALL_FILTER) {
      sourceMatches = sourceMatches.filter((m) => getCompetitionType(m.competition) === tipoFilter);
    }

    sourceMatches.forEach((m) => { if (m.competition) names.add(m.competition); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [matches, equipoInternoFilter, tipoFilter, competitionTeams, ownCompetitionTeams, internalNameByFedName]);

  // Filtro combinado para Equipo Interno, Tipo y Competición
  const filteredByEquipoAndCompetition = useMemo(() => {
    let result = matches;

    if (equipoInternoFilter !== ALL_FILTER) {
      result = result.filter((m) => resolveEquipoInterno(m) === equipoInternoFilter);
    }

    if (tipoFilter !== ALL_FILTER) {
      result = result.filter((m) => getCompetitionType(m.competition) === tipoFilter);
    }

    if (competitionFilter !== ALL_FILTER) {
      result = result.filter((m) => m.competition === competitionFilter);
    }

    if (localidadFilter !== ALL_FILTER) {
      result = result.filter((m) => m.localidad_id === localidadFilter);
    }

    if (instalacionPrincipalFilter !== ALL_FILTER) {
      result = result.filter((m) =>
        m.instalacion_campo_id === instalacionPrincipalFilter
        || (m.instalacion_campo_id ? campoParentMap.get(m.instalacion_campo_id) === instalacionPrincipalFilter : false)
      );
    }

    if (campoFilter !== ALL_FILTER) {
      result = result.filter((m) => m.instalacion_campo_id === campoFilter);
    }

    return result;
  }, [matches, equipoInternoFilter, tipoFilter, competitionFilter, competitionTeams, ownCompetitionTeams, internalNameByFedName, localidadFilter, instalacionPrincipalFilter, campoFilter, campoParentMap]);

  // Jornada depende de Equipo Interno y Competición
  const jornadaOptions = useMemo(() => {
    const names = new Set<string>();
    filteredByEquipoAndCompetition.forEach((m) => { if (m.jornada) names.add(m.jornada); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [filteredByEquipoAndCompetition]);

  // Partidos filtrados por Equipo Interno, Tipo, Competición y Jornada: base para los filtros de ubicación,
  // para que Localidad/Instalación/Campo solo muestren opciones con partidos reales (no todo el catálogo).
  const matchesForLocationFilters = useMemo(() => {
    let result = matches;
    if (equipoInternoFilter !== ALL_FILTER) {
      result = result.filter((m) => resolveEquipoInterno(m) === equipoInternoFilter);
    }
    if (tipoFilter !== ALL_FILTER) {
      result = result.filter((m) => getCompetitionType(m.competition) === tipoFilter);
    }
    if (competitionFilter !== ALL_FILTER) {
      result = result.filter((m) => m.competition === competitionFilter);
    }
    if (jornadaFilter !== ALL_FILTER) {
      result = result.filter((m) => m.jornada === jornadaFilter);
    }
    return result;
  }, [matches, equipoInternoFilter, tipoFilter, competitionFilter, jornadaFilter, competitionTeams, ownCompetitionTeams, internalNameByFedName]);

  // Localidad: solo las que tienen partidos reales dentro del filtrado anterior
  const localidadOptions = useMemo(() => {
    const ids = new Set<string>();
    matchesForLocationFilters.forEach((m) => { if (m.localidad_id) ids.add(m.localidad_id); });
    return localidades
      .filter((loc) => ids.has(loc.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [matchesForLocationFilters, localidades]);

  // Instalación: depende de Localidad, solo las que tienen partidos reales
  const instalacionesPrincipalesOptions = useMemo(() => {
    const ids = new Set<string>();
    matchesForLocationFilters
      .filter((m) => localidadFilter === ALL_FILTER || m.localidad_id === localidadFilter)
      .forEach((m) => {
        if (!m.instalacion_campo_id) return;
        ids.add(campoParentMap.get(m.instalacion_campo_id) || m.instalacion_campo_id);
      });
    return instalacionesCampos
      .filter((i) => !i.parent_instalacion_id && ids.has(i.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [matchesForLocationFilters, localidadFilter, campoParentMap, instalacionesCampos]);

  // Campo: depende de Localidad e Instalación, solo los que tienen partidos reales
  const camposOptions = useMemo(() => {
    const ids = new Set<string>();
    matchesForLocationFilters
      .filter((m) => localidadFilter === ALL_FILTER || m.localidad_id === localidadFilter)
      .filter((m) =>
        instalacionPrincipalFilter === ALL_FILTER
        || m.instalacion_campo_id === instalacionPrincipalFilter
        || (m.instalacion_campo_id ? campoParentMap.get(m.instalacion_campo_id) === instalacionPrincipalFilter : false)
      )
      .forEach((m) => {
        if (m.instalacion_campo_id && campoParentMap.has(m.instalacion_campo_id)) ids.add(m.instalacion_campo_id);
      });
    return instalacionesCampos
      .filter((i) => !!i.parent_instalacion_id && ids.has(i.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [matchesForLocationFilters, localidadFilter, instalacionPrincipalFilter, campoParentMap, instalacionesCampos]);

  // Filtro final: aplicar filtro de Jornada y excluir partidos de hoy
  const today = new Date('2026-08-14').toISOString().split('T')[0];
  const filteredMatches = useMemo(
    () => {
      let result = jornadaFilter === ALL_FILTER ? filteredByEquipoAndCompetition : filteredByEquipoAndCompetition.filter((m) => m.jornada === jornadaFilter);
      // Excluir partidos de hoy
      result = result.filter((m) => {
        const matchDate = m.date ? new Date(m.date).toISOString().split('T')[0] : null;
        return matchDate !== today;
      });
      return result;
    },
    [filteredByEquipoAndCompetition, jornadaFilter]
  );

  // Si cambia Competición, el equipo interno elegido puede dejar de ser válido
  useEffect(() => {
    if (equipoInternoFilter !== ALL_FILTER && !equipoInternoOptions.includes(equipoInternoFilter)) {
      setEquipoInternoFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipoInternoOptions]);

  // Si cambia Tipo, la competición elegida puede dejar de ser válida
  useEffect(() => {
    if (competitionFilter !== ALL_FILTER && !competitionOptions.includes(competitionFilter)) {
      setCompetitionFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionOptions]);

  // Si cambia Equipo Interno o Tipo, la competición elegida puede dejar de ser válida
  useEffect(() => {
    if (competitionFilter !== ALL_FILTER && !competitionOptions.includes(competitionFilter)) {
      setCompetitionFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoFilter, competitionOptions]);

  // Si cambian Equipo Interno o Competición, la jornada elegida puede dejar de ser válida
  useEffect(() => {
    if (jornadaFilter !== ALL_FILTER && !jornadaOptions.includes(jornadaFilter)) {
      setJornadaFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaOptions]);

  // Si cambia Equipo Interno, el tipo elegido puede dejar de ser válido
  useEffect(() => {
    if (tipoFilter !== ALL_FILTER && !tipoOptions.includes(tipoFilter)) {
      setTipoFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoOptions]);

  // Si cambian los filtros anteriores, la localidad elegida puede dejar de ser válida
  useEffect(() => {
    if (localidadFilter !== ALL_FILTER && !localidadOptions.some((loc) => loc.id === localidadFilter)) {
      setLocalidadFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localidadOptions]);

  // Si cambian Localidad u otros filtros anteriores, la instalación elegida puede dejar de ser válida
  useEffect(() => {
    if (instalacionPrincipalFilter !== ALL_FILTER && !instalacionesPrincipalesOptions.some((i) => i.id === instalacionPrincipalFilter)) {
      setInstalacionPrincipalFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instalacionesPrincipalesOptions]);

  // Si cambian Instalación u otros filtros anteriores, el campo elegido puede dejar de ser válido
  useEffect(() => {
    if (campoFilter !== ALL_FILTER && !camposOptions.some((c) => c.id === campoFilter)) {
      setCampoFilter(ALL_FILTER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camposOptions]);

  const clubNameById = useMemo(() => new Map(clubes.map((club) => [String(club.id), club.nombre])), [clubes]);

  // Fallback por nombre para partidos antiguos guardados sin clubId por equipo: si dos
  // clubes tienen un equipo homónimo (p.ej. "Juvenil A"), esto solo puede acertar uno de los dos.
  const clubNameByTeamName = useMemo(() => {
    const map = new Map<string, string>();
    competitionTeams.forEach((team) => {
      const teamName = team.equipo || team.nombre;
      const clubName = team.clubId != null ? clubNameById.get(String(team.clubId)) : undefined;
      if (teamName && clubName && !map.has(teamName)) map.set(teamName, clubName);
    });
    return map;
  }, [competitionTeams, clubNameById]);

  const clubLogoById = useMemo(() => new Map(clubes.map((club) => [String(club.id), club.logoUrl])), [clubes]);

  // Preferimos el clubId guardado con el propio partido (exacto, no ambiguo);
  // solo caemos al emparejamiento por nombre para partidos guardados antes de este fix.
  const resolveClubLabel = (teamName: string, clubId?: string): string | undefined =>
    (clubId && clubNameById.get(String(clubId))) || clubNameByTeamName.get(teamName);

  const resolveClubLogo = (clubId?: string): string | undefined =>
    clubId ? clubLogoById.get(String(clubId)) : undefined;

  const findCompetitionTeamForSide = (match: Match, teamName: string, clubId?: string): CompetitionTeam | undefined => {
    const key = normalizeTeamKey(teamName);
    const sameCompetitionTeams = competitionTeams.filter((team) => isSameCompetition(team.competicion, match.competition));
    const pools = sameCompetitionTeams.length > 0 ? [sameCompetitionTeams, competitionTeams] : [competitionTeams];
    const matchesName = (team: CompetitionTeam) =>
      [team.equipo, team.nombreEnFed, team.nombre].some((value) => normalizeTeamKey(value) === key);

    for (const pool of pools) {
      if (clubId) {
        const teamsByClub = pool.filter((team) => String(team.clubId ?? '') === String(clubId));
        const exact = teamsByClub.find(matchesName) || (teamsByClub.length === 1 ? teamsByClub[0] : undefined);
        if (exact) return exact;
      }

      const byName = pool.find(matchesName);
      if (byName) return byName;
    }

    return undefined;
  };

  const sideDisplayOf = (match: Match, sideName: string, clubId?: string) => {
    const competitionTeam = findCompetitionTeamForSide(match, sideName, clubId);
    const clubName = resolveClubLabel(sideName, clubId) || competitionTeam?.nombre || sideName;
    const sideIsOwn =
      (!!ownClubId && !!clubId && String(clubId) === String(ownClubId)) ||
      (ownCompetitionTeams.length > 0 && normalizeTeamKey(ownTeamNameOf(match, ownCompetitionTeams)) === normalizeTeamKey(sideName));
    const federationName =
      competitionTeam?.nombreEnFed && normalizeTeamKey(competitionTeam.nombreEnFed) !== normalizeTeamKey(clubName)
        ? competitionTeam.nombreEnFed
        : undefined;
    const teamName = (sideIsOwn ? resolveEquipoInterno(match) : '') || competitionTeam?.equipo || competitionTeam?.etapa || federationName || sideName;

    return {
      clubName,
      teamName,
      logo: resolveClubLogo(clubId) || competitionTeam?.logoUrl,
      isOwn: sideIsOwn,
    };
  };

  const groupedMatches = useMemo(() => {
    const groups = new Map<string, Match[]>();
    filteredMatches.forEach((match) => {
      const jornada = match.jornada || '-';
      const key = `${match.competition}|${jornada}|${dateKeyOf(match.date)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(match);
    });
    return Array.from(groups.entries()).map(([key, matches]) => {
      const [competition, jornada] = key.split('|');
      return { groupKey: key, competition, jornada, matches: matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
    }).sort((a, b) => {
      if (a.competition !== b.competition) return a.competition.localeCompare(b.competition, 'es');
      const numA = parseInt(a.jornada) || 0;
      const numB = parseInt(b.jornada) || 0;
      if (numA !== numB) return numA - numB;
      return new Date(a.matches[0]?.date || '').getTime() - new Date(b.matches[0]?.date || '').getTime();
    });
  }, [filteredMatches]);

  const monthNames = t('calendarView.months', { returnObjects: true }) as string[];
  const dayNamesLong = t('calendarView.daysLong', { returnObjects: true }) as string[];
  const orderedDayNamesLong = useMemo(() => [...dayNamesLong.slice(1), dayNamesLong[0]], [dayNamesLong]);

  const getMonthMatrix = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const matrix: (Date | null)[][] = [];
    let week: (Date | null)[] = [];
    let day = new Date(firstDay);
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < leadingBlanks; i++) week.push(null);
    while (day <= lastDay) {
      week.push(new Date(day));
      if (week.length === 7) {
        matrix.push(week);
        week = [];
      }
      day = new Date(day);
      day.setDate(day.getDate() + 1);
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      matrix.push(week);
    }
    return matrix;
  };

  const matchesByDay = useMemo(() => {
    const map = {} as Record<string, Match[]>;
    filteredMatches.forEach((match) => {
      const d = new Date(match.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(match);
    });
    return map;
  }, [filteredMatches]);

  interface MatchRow {
    match: Match;
    tipo: string;
    competition: string;
    jornada: string;
    dateLabel: string;
    time: string;
    localLabel: string;
    localLogo?: string;
    localIsOwn: boolean;
    visitorLabel: string;
    visitorLogo?: string;
    visitorIsOwn: boolean;
    resultLabel: string;
    statusLabel: string;
    location: string;
    videoUrl: string;
    goalsFavor: number;
    goalsContra: number;
    ocasionesCount: number;
  }

  const tableRows: MatchRow[] = useMemo(() => {
    const rows = filteredMatches.map((match) => {
      const local = match.localTeam || 'DEMO';
      const visitor = match.visitorTeam || 'Rival';
      const localDisplay = sideDisplayOf(match, local, match.localTeamClubId);
      const visitorDisplay = sideDisplayOf(match, visitor, match.visitorTeamClubId);
      const report = matchReportsById.get(String(match.id));
      const goalsFavor = (report?.matchGoals || []).filter((g) => g.side === 'FAVOR').length;
      const goalsContra = (report?.matchGoals || []).filter((g) => g.side === 'CONTRA').length;
      const ocasionesCount = (report?.videoEvents || []).filter((e) => e.type === 'OCASION').length;
      return {
        match,
        tipo: getCompetitionType(match.competition),
        competition: match.competition || '-',
        jornada: match.jornada || '-',
        dateLabel: match.date ? new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
        time: match.time || '-',
        localLabel: `${localDisplay.teamName}${localDisplay.clubName && localDisplay.clubName !== localDisplay.teamName ? ` (${localDisplay.clubName})` : ''}`,
        localLogo: localDisplay.logo,
        localIsOwn: localDisplay.isOwn,
        visitorLabel: `${visitorDisplay.teamName}${visitorDisplay.clubName && visitorDisplay.clubName !== visitorDisplay.teamName ? ` (${visitorDisplay.clubName})` : ''}`,
        visitorLogo: visitorDisplay.logo,
        visitorIsOwn: visitorDisplay.isOwn,
        resultLabel: match.status === 'Finished' ? (match.score || '-') : 'VS',
        statusLabel: match.status === 'Finished' ? 'Finalizado' : 'Próximo',
        location: match.location || '-',
        videoUrl: report?.videoUrl || '',
        goalsFavor,
        goalsContra,
        ocasionesCount,
      };
    });
    // Ordenar por fecha ascendente (más cercano primero)
    return rows.sort((a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime());
  }, [filteredMatches, ownCompetitionTeams, competitionTeams, clubes, matchReportsById]);

  const matchColumnHelper = createColumnHelper<MatchRow>();
  const tableColumns = useMemo(() => [
    matchColumnHelper.accessor('tipo', { header: 'TIPO' }),
    matchColumnHelper.accessor('competition', { header: t('matchesList.colCompetition') }),
    matchColumnHelper.accessor('jornada', { header: t('matchesList.colJornada') }),
    matchColumnHelper.accessor('dateLabel', { header: t('matchesList.colDate') }),
    matchColumnHelper.accessor('time', { header: t('matchesList.colTime') }),
    matchColumnHelper.accessor('localLabel', {
      header: t('matchesList.colLocal'),
      cell: (info) => (
        <div className="flex items-center gap-2">
          {info.row.original.localLogo && (
            <img loading="lazy" decoding="async" src={info.row.original.localLogo} alt="" className="h-5 w-5 object-contain shrink-0" />
          )}
          <span className={`truncate ${info.row.original.localIsOwn ? 'font-black' : ''}`}>{info.getValue()}</span>
        </div>
      ),
    }),
    matchColumnHelper.accessor('visitorLabel', {
      header: t('matchesList.colVisitor'),
      cell: (info) => (
        <div className="flex items-center gap-2">
          {info.row.original.visitorLogo && (
            <img loading="lazy" decoding="async" src={info.row.original.visitorLogo} alt="" className="h-5 w-5 object-contain shrink-0" />
          )}
          <span className={`truncate ${info.row.original.visitorIsOwn ? 'font-black' : ''}`}>{info.getValue()}</span>
        </div>
      ),
    }),
    matchColumnHelper.accessor('resultLabel', { header: t('matchesList.colResult') }),
    matchColumnHelper.accessor('statusLabel', { header: t('matchesList.colStatus') }),
    matchColumnHelper.accessor('location', { header: t('matchesList.colLocation') }),
    matchColumnHelper.accessor('videoUrl', {
      header: 'VÍDEO',
      cell: (info) =>
        info.getValue() ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVideoModalUrl(info.getValue()); }}
            className="w-7 h-7 rounded-full bg-sport-primary/10 text-sport-primary hover:bg-sport-primary hover:text-white transition-all flex items-center justify-center"
            title="Ver vídeo completo del partido"
          >
            <i className="fa-solid fa-play text-[10px]"></i>
          </button>
        ) : (
          <span className="text-slate-300">-</span>
        ),
    }),
    matchColumnHelper.accessor('goalsFavor', {
      header: 'GOLES F',
      cell: (info) => <span className="font-black text-emerald-600">{info.getValue()}</span>,
    }),
    matchColumnHelper.accessor('goalsContra', {
      header: 'GOLES C',
      cell: (info) => <span className="font-black text-red-500">{info.getValue()}</span>,
    }),
    matchColumnHelper.accessor('ocasionesCount', { header: 'OCASIONES' }),
  ], [t]);

  const tableActions: DataTableAction<MatchRow>[] = useMemo(() => {
    const actions: DataTableAction<MatchRow>[] = [];
    if (onEdit) {
      actions.push({
        icon: 'fa-regular fa-pen-to-square',
        label: t('matchesList.editViaEvents'),
        onClick: (row) => onEdit(row.match),
        hidden: (row) => !!row.match.readonly,
      });
    }
    actions.push({
      icon: 'fa-regular fa-trash-can',
      label: t('matchesList.deleteEvent'),
      onClick: (row) => onDelete(String(row.match.id)),
      hidden: (row) => !!row.match.readonly,
      danger: true,
    });
    return actions;
  }, [onEdit, onDelete, t]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h3 className="text-[var(--accent)] font-black text-xl uppercase tracking-tighter">{t('matchesList.matchHistory')}</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('matchesList.matchHistoryDesc')}</p>
        </div>
        <button
          onClick={onCreate}
          className="bg-sport-primary hover:bg-sport-primary-dark text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl"
        >
          <i className="fa-solid fa-plus"></i>
          {t('matchesList.newMatch')}
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('MATCHES')}
          className={`px-6 py-3 flex items-center gap-2 transition-all border-b-[3px] whitespace-nowrap ${activeTab === 'MATCHES' ? 'border-sport-primary text-sport-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-calendar-days text-[10px]"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">{t('matchesList.tabMatches')}</span>
        </button>
        <button
          onClick={() => setActiveTab('STATS')}
          className={`px-6 py-3 flex items-center gap-2 transition-all border-b-[3px] whitespace-nowrap ${activeTab === 'STATS' ? 'border-sport-primary text-sport-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-table text-[10px]"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">{t('matchesList.tabStats')}</span>
        </button>
      </div>

      {activeTab === 'STATS' ? (
        <PlayerStatsSummary matches={matches} onSelectPlayer={onSelectPlayer} />
      ) : (
      <>
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <div className="flex items-end">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full lg:w-auto lg:justify-start">
            <button
              onClick={() => setViewMode('cards')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'cards' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={t('matchesList.cardsView')}
            >
              <i className="fa-solid fa-grip text-sm"></i>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={t('matchesList.tableView')}
            >
              <i className="fa-solid fa-table text-sm"></i>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                viewMode === 'calendar' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={t('calendarView.viewCalendar')}
            >
              <i className="fa-solid fa-calendar-days text-sm"></i>
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Equipo
          </label>
          <SearchableSelect
            value={equipoInternoFilter}
            onChange={(e) => setEquipoInternoFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>Todos los equipos</option>
            {equipoInternoOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
            TIPO
          </label>
          <SearchableSelect
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>Todos los tipos</option>
            {tipoOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Competición
          </label>
          <SearchableSelect
            value={competitionFilter}
            onChange={(e) => setCompetitionFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>{t('playerStatsSummary.allCompetitions')}</option>
            {competitionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Jornada
          </label>
          <SearchableSelect
            value={jornadaFilter}
            onChange={(e) => setJornadaFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>{t('matchesList.allJornadas')}</option>
            {jornadaOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Localidad
          </label>
          <SearchableSelect
            value={localidadFilter}
            onChange={(e) => setLocalidadFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>Todas</option>
            {localidadOptions.map((loc) => <option key={loc.id} value={loc.id}>{loc.nombre}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Instalación
          </label>
          <SearchableSelect
            value={instalacionPrincipalFilter}
            onChange={(e) => setInstalacionPrincipalFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>Todas</option>
            {instalacionesPrincipalesOptions.map((inst) => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}
          </SearchableSelect>
        </div>
        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Campo
          </label>
          <SearchableSelect
            value={campoFilter}
            onChange={(e) => setCampoFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-sport-primary"
          >
            <option value={ALL_FILTER}>Todos</option>
            {camposOptions.map((campo) => <option key={campo.id} value={campo.id}>{campo.nombre}</option>)}
          </SearchableSelect>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="flex-1 w-full space-y-6">
          <div className="bg-white/60 backdrop-blur rounded-3xl border border-slate-100 shadow-xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-[var(--accent)] font-black text-3xl md:text-4xl uppercase tracking-widest">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
                {t('calendarView.monthlyCalendar')}
              </p>
            </div>

            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all shadow-sm">
                <i className="fa-solid fa-chevron-left text-sm"></i>
              </button>
              <div className="flex-1"></div>
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all shadow-sm">
                <i className="fa-solid fa-chevron-right text-sm"></i>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-3 md:gap-4 mb-3">
              {orderedDayNamesLong.map(day => (
                <div key={day} className="text-[9px] md:text-xs font-black text-slate-400 uppercase text-center py-2">{day.slice(0,3)}</div>
              ))}
            </div>

            {getMonthMatrix(currentMonth).map((week, i) => (
              <div key={i} className="grid grid-cols-7 gap-3 md:gap-4 mb-3">
                {week.map((date, j) => {
                  const dayMatches = date ? matchesByDay[`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`] || [] : [];
                  const isCurrentMonth = date && date.getMonth() === currentMonth.getMonth();

                  return (
                    <div
                      key={j}
                      className={`relative min-h-32 md:min-h-40 lg:min-h-48 rounded-lg border-2 p-2.5 md:p-3 flex flex-col transition-all ${
                        isCurrentMonth ? 'bg-white border-slate-200' : 'bg-slate-50/40 border-slate-100 opacity-30'
                      }`}
                    >
                      <div className="absolute top-2 right-2 text-xs md:text-sm font-black text-slate-800">{date ? date.getDate() : ''}</div>

                      {isCurrentMonth && (
                        <button
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white flex items-center justify-center font-black text-sm shadow-md transition-all"
                          onClick={() => onCreate && onCreate()}
                          title={t('matchesList.newMatch')}
                        >
                          <i className="fa-solid fa-plus text-xs"></i>
                        </button>
                      )}

                      <div className="flex-1 flex flex-col gap-1.5 pt-4">
                        {dayMatches.map((match) => {
                          const local = match.localTeam || 'DEMO';
                          const visitor = match.visitorTeam || 'Rival';
                          const localDisplay = sideDisplayOf(match, local, match.localTeamClubId);
                          const visitorDisplay = sideDisplayOf(match, visitor, match.visitorTeamClubId);
                          const isReadOnly = match.readonly;
                          const bgColor = match.status === 'Finished'
                            ? 'bg-pink-50 border-pink-300 hover:bg-pink-100'
                            : 'bg-lime-50 border-lime-300 hover:bg-lime-100';

                          return (
                            <div
                              key={match.id}
                              className={`rounded-lg border-2 p-2 flex flex-col gap-1 cursor-pointer group/match transition-all ${bgColor} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                              onClick={() => !isReadOnly && onClickMatch && onClickMatch(match)}
                            >
                              <div className="flex items-center gap-1.5 justify-between text-[9px] md:text-[10px]">
                                <div className="flex items-center gap-1">
                                  <i className="fa-solid fa-clock text-[8px]"></i>
                                  <span className="font-black">{match.time || '—'}</span>
                                </div>
                                {!isReadOnly && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(String(match.id)); }}
                                    className="hidden group-hover/match:block w-4 h-4 rounded-full flex-shrink-0 transition-all"
                                    style={{
                                      color: match.status === 'Finished' ? 'rgb(219, 39, 119)' : 'rgb(101, 163, 13)',
                                    }}
                                    onMouseEnter={(e) => {
                                      const color = match.status === 'Finished' ? 'rgb(190, 24, 93)' : 'rgb(84, 140, 4)';
                                      e.currentTarget.style.backgroundColor = color;
                                    }}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    title={t('common.delete')}
                                  >
                                    <i className="fa-solid fa-xmark text-[7px]"></i>
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 text-[7px] md:text-[8px] font-bold leading-tight">
                                <div className="flex items-center gap-0.5 min-w-0">
                                  {localDisplay.logo && (
                                    <img loading="lazy" decoding="async" src={localDisplay.logo} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                                  )}
                                  <span className="truncate">{localDisplay.isOwn ? localDisplay.teamName : (localDisplay.clubName || localDisplay.teamName)}</span>
                                </div>
                                <span className={`font-black text-[7px] flex-shrink-0 ${match.status === 'Finished' ? 'text-pink-600' : 'text-lime-600'}`}>VS</span>
                                <div className="flex items-center gap-0.5 min-w-0 justify-end">
                                  <span className="truncate">{visitorDisplay.isOwn ? visitorDisplay.teamName : (visitorDisplay.clubName || visitorDisplay.teamName)}</span>
                                  {visitorDisplay.logo && (
                                    <img loading="lazy" decoding="async" src={visitorDisplay.logo} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                              {match.status === 'Finished' && match.score && (
                                <div className={`text-[7px] font-black text-center py-0.5 rounded ${match.status === 'Finished' ? 'text-pink-700' : 'text-lime-700'}`}>
                                  {match.score}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <DataTable<MatchRow>
          data={tableRows}
          columns={tableColumns}
          actions={tableActions}
          searchable
          sortable
          paginated
          pageSize={30}
          pageSizeOptions={[30, 50, 100]}
          exportable
          exportFilename="partidos"
          emptyMessage={t('matchesList.noMatches')}
          emptyIcon="fa-solid fa-calendar-xmark"
          onRowClick={(row) => !row.match.readonly && onClickMatch && onClickMatch(row.match)}
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {groupedMatches.map(({ groupKey, competition, jornada, matches }) => (
          <div key={groupKey} className="space-y-4">
            <div className="bg-gradient-to-r from-sport-primary/10 to-transparent p-3 md:p-4 rounded-lg border-l-4 border-sport-primary">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Competición</p>
                  <p className="text-xs font-black text-slate-800 uppercase">{competition}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Jornada</p>
                  <p className="text-xs font-black text-sport-primary uppercase">{jornada}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fecha</p>
                  <div className="flex flex-wrap gap-1 text-xs font-black text-slate-800">
                    {matches.length > 0 ? new Date(matches[0].date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 divide-y divide-slate-100 overflow-hidden">
              {matches.map((match, idx) => {
          const local = match.localTeam || 'DEMO';
          const visitor = match.visitorTeam || 'Rival';
          const localDisplay = sideDisplayOf(match, local, match.localTeamClubId);
          const visitorDisplay = sideDisplayOf(match, visitor, match.visitorTeamClubId);
          const isReadOnly = match.readonly;

          return (
            <div
              key={match.id}
              onClick={() => !isReadOnly && onClickMatch && onClickMatch(match)}
              className={`group flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 transition-all ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'} ${isReadOnly ? '' : 'hover:bg-red-50/40 cursor-pointer'}`}
            >
              <div className="flex-1 min-w-0 flex items-center justify-end gap-2 text-right">
                <span className={`font-black text-xs md:text-sm uppercase truncate ${localDisplay.isOwn ? 'text-[var(--accent)]' : 'text-slate-800'}`}>
                  {localDisplay.isOwn ? localDisplay.teamName : (localDisplay.clubName || localDisplay.teamName)}
                </span>
                {localDisplay.logo ? (
                  <img loading="lazy" decoding="async" src={localDisplay.logo} alt={localDisplay.clubName} className="h-6 w-6 object-contain shrink-0" />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-slate-100 shrink-0" />
                )}
              </div>

              <div className="shrink-0 bg-slate-800 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest px-2.5 md:px-3 py-1.5 rounded-md">
                {match.status === 'Finished' ? (match.score || '-') : 'VS'}
              </div>

              <div className="flex-1 min-w-0 flex items-center gap-2">
                {visitorDisplay.logo ? (
                  <img loading="lazy" decoding="async" src={visitorDisplay.logo} alt={visitorDisplay.clubName} className="h-6 w-6 object-contain shrink-0" />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-slate-100 shrink-0" />
                )}
                <span className={`font-black text-xs md:text-sm uppercase truncate ${visitorDisplay.isOwn ? 'text-[var(--accent)]' : 'text-slate-800'}`}>
                  {visitorDisplay.isOwn ? visitorDisplay.teamName : (visitorDisplay.clubName || visitorDisplay.teamName)}
                </span>
              </div>

              {!isReadOnly && (
              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit && onEdit(match);
                  }}
                  className="w-6 h-6 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-md transition-all flex items-center justify-center shadow-sm"
                  title={t('matchesList.editViaEvents')}
                >
                  <i className="fa-regular fa-pen-to-square text-[10px]"></i>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(String(match.id));
                  }}
                  className="w-6 h-6 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-md transition-all flex items-center justify-center shadow-sm"
                  title={t('matchesList.deleteEvent')}
                >
                  <i className="fa-regular fa-trash-can text-[10px]"></i>
                </button>
              </div>
              )}
            </div>
          );
        })}
            </div>
          </div>
        ))}

        {groupedMatches.length === 0 && (
          <div className="py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-40">
            <i className="fa-solid fa-calendar-xmark text-4xl mb-4 text-slate-300"></i>
            <p className="font-black text-sm uppercase tracking-widest text-slate-400">{t('matchesList.noMatches')}</p>
          </div>
        )}
      </div>
      )}
      </>
      )}

      {videoModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setVideoModalUrl(null)}
        >
          <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setVideoModalUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest"
            >
              <i className="fa-solid fa-xmark"></i> Cerrar
            </button>
            <iframe
              src={getMatchVideoEmbedUrl(videoModalUrl)}
              className="w-full h-full rounded-2xl border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vídeo del partido"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LatestMatches;
