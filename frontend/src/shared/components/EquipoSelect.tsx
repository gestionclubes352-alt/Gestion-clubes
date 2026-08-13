import React, { useState, useMemo, useEffect } from 'react';
import SearchableSelect from '@shared/components/SearchableSelect';
import { clubesService } from '@shared/services';
import type { Club } from '@shared/services/dataService';

/** Opciones base que siempre aparecen en el desplegable de equipos */
export const DEFAULT_EQUIPOS = [
  'Primer equipo',
  'Filial',
  'Juvenil A',
  'Juvenil B',
  'Cadete A',
  'Cadete B',
  'Infantil A',
  'Infantil B',
  'Alevín A',
  'Alevín B',
];

/** Orden canónico de categorías (de mayor a menor edad). Los nombres de equipo se componen
 * de una de estas categorías más, opcionalmente, una letra de subgrupo (p.ej. "Juvenil C"). */
const CATEGORY_ORDER = ['Primer equipo', 'Filial', 'Juvenil', 'Cadete', 'Infantil', 'Alevín', 'Benjamín', 'Prebenjamín'];

/** Separa un nombre de equipo en su categoría base y su letra de subgrupo, si la tiene
 * (p.ej. "Cadete C" -> { base: 'Cadete', suffix: 'C' }). */
const parseEquipoName = (name: string): { base: string; suffix: string } => {
  const trimmed = name.trim();
  const match = trimmed.match(/^(.+?)\s+([A-Za-z])$/);
  if (match && CATEGORY_ORDER.includes(match[1])) {
    return { base: match[1], suffix: match[2].toUpperCase() };
  }
  return { base: trimmed, suffix: '' };
};

/** Compara dos nombres de equipo interno según el orden canónico de categorías (Primer equipo,
 * Filial, Juvenil, Cadete, Infantil, Alevín...) y, dentro de cada categoría, por letra de
 * subgrupo (A, B, C...). El resto de nombres no reconocidos se ordenan alfabéticamente al final. */
export const compareEquipoNames = (a: string, b: string): number => {
  const pa = parseEquipoName(a);
  const pb = parseEquipoName(b);
  const aIndex = CATEGORY_ORDER.indexOf(pa.base);
  const bIndex = CATEGORY_ORDER.indexOf(pb.base);
  if (aIndex !== -1 && bIndex !== -1) {
    if (aIndex !== bIndex) return aIndex - bIndex;
    return pa.suffix.localeCompare(pb.suffix, 'es');
  }
  if (aIndex !== -1) return -1;
  if (bIndex !== -1) return 1;
  return a.localeCompare(b, 'es');
};

/** Opción de equipo, opcionalmente asociada a un club (para diferenciar equipos homónimos de distintos clubes) */
export interface EquipoOption {
  value: string;
  club?: string;
  /** Id del club al que pertenece este equipo, para poder distinguir equipos homónimos de clubes distintos */
  clubId?: string;
  /** Grupo explícito para el desplegable (p.ej. "Equipos de la competición" vs. el nombre de un club).
   * Si se indica en alguna opción, sustituye al agrupado automático por `club` y respeta el orden de
   * llegada de los grupos (para poder mostrar primero los equipos ya adheridos y luego el resto). */
  group?: string;
}

export interface CreateEquipoOptionInput {
  value: string;
  club?: string;
}

/** Clave única de una opción: el nombre del equipo por sí solo puede repetirse entre clubes distintos */
const optionKey = (opt: EquipoOption) => `${opt.clubId ?? ''}::${opt.value}`;

/** Ordena opciones de equipo según el orden predefinido en DEFAULT_EQUIPOS */
const sortTeamOptions = (teams: EquipoOption[]): EquipoOption[] => {
  return teams.sort((a, b) => compareEquipoNames(a.value, b.value));
};

interface EquipoSelectProps {
  value: string;
  onChange: (value: string, clubId?: string) => void;
  /** Equipos adicionales que existan en los datos (se mezclan con los defaults sin duplicados) */
  extraTeams?: (string | EquipoOption)[];
  /** Clases CSS del select */
  className?: string;
  /** Texto del placeholder / opción vacía */
  placeholder?: string;
  /** clubId actualmente asociado a `value`, para preseleccionar la opción correcta cuando hay equipos homónimos de distintos clubes */
  selectedClubId?: string;
  useDefaultTeams?: boolean;
  onCreateOption?: (input: CreateEquipoOptionInput) => void | EquipoOption | Promise<void | EquipoOption>;
  addNewMode?: 'team' | 'clubTeam';
  addLabel?: string;
  /** Se invoca cada vez que cambia si hay un alta de equipo/club sin confirmar (formulario inline abierto). */
  onAddingChange?: (isAdding: boolean) => void;
}

const EquipoSelect: React.FC<EquipoSelectProps> = ({
  value,
  onChange,
  extraTeams = [],
  className = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer',
  placeholder = 'Seleccionar...',
  selectedClubId,
  useDefaultTeams = true,
  onCreateOption,
  addNewMode = 'team',
  addLabel = '+ Añadir nuevo equipo...',
  onAddingChange,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClubName, setNewClubName] = useState('');
  const [newClubId, setNewClubId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);

  const normalizedTeams = useMemo(
    () => extraTeams
      .map((t): EquipoOption | null => {
        if (!t) return null;
        return typeof t === 'string' ? { value: t } : t;
      })
      .filter((t): t is EquipoOption => !!t && t.value.trim().length > 0),
    [extraTeams]
  );

  const hasClubInfo = normalizedTeams.some(t => t.club);
  const hasGroupInfo = normalizedTeams.some(t => t.group);

  // Lista deduplicada por club+nombre, preservando el orden de llegada (necesario para poder
  // agrupar "equipos adheridos primero, resto del catálogo después" sin que un sort alfabético
  // global se lo cargue).
  const dedupedList = useMemo(() => {
    const seen = new Map<string, EquipoOption>();
    normalizedTeams.forEach(t => { const key = optionKey(t); if (!seen.has(key)) seen.set(key, t); });
    // Sin equipos dados de alta todavía: ofrecer catálogo genérico como punto de partida
    if (seen.size === 0 && useDefaultTeams) DEFAULT_EQUIPOS.forEach(t => { const opt = { value: t }; seen.set(optionKey(opt), opt); });
    // Si el valor actual no está en la lista, añadirlo (con su clubId conocido, si lo hay)
    const currentOpt = { value, clubId: selectedClubId };
    if (value && !seen.has(optionKey(currentOpt))) seen.set(optionKey(currentOpt), currentOpt);
    return Array.from(seen.values());
  }, [normalizedTeams, value, selectedClubId, useDefaultTeams]);

  const options = useMemo(() => sortTeamOptions([...dedupedList]), [dedupedList]);

  useEffect(() => {
    onAddingChange?.(isAdding);
  }, [isAdding]);

  useEffect(() => {
    if (!isAdding || addNewMode !== 'clubTeam') return;
    const loadClubs = async () => {
      try {
        setClubsLoading(true);
        const data = await clubesService.list();
        setClubs((data as Club[]) || []);
      } catch (err) {
        console.error('Error loading clubs:', err);
        setCreateError('Error al cargar los clubes');
      } finally {
        setClubsLoading(false);
      }
    };
    loadClubs();
  }, [isAdding, addNewMode]);

  const resetAddForm = () => {
    setIsAdding(false);
    setNewName('');
    setNewClubName('');
    setNewClubId('');
    setCreateError(null);
  };

  const handleCreate = async () => {
    const teamName = newName.trim();
    const clubName = newClubName.trim();
    if (!teamName || (addNewMode === 'clubTeam' && !newClubId)) return;
    setCreateError(null);
    try {
      setIsCreating(true);
      const selectedClub = clubs.find(c => String(c.id) === newClubId);
      const clubNameForOption = selectedClub?.nombre || clubName;

      if (onCreateOption) {
        const created = await onCreateOption({
          value: teamName,
          club: addNewMode === 'clubTeam' ? clubNameForOption : undefined
        });
        if (created) onChange(created.value, created.clubId);
      } else {
        onChange(teamName);
      }
      resetAddForm();
    } catch (err) {
      console.error('Error creating team option:', err);
      setCreateError(err instanceof Error ? err.message : 'Error al crear el equipo');
    } finally {
      setIsCreating(false);
    }
  };

  const groupedOptions = useMemo(() => {
    if (!hasGroupInfo && !hasClubInfo) return null;
    // Se agrupa iterando la lista SIN ordenar (dedupedList) para que el orden de los grupos
    // sea el de llegada (p.ej. "Equipos de la competición" antes que el resto de clubes),
    // y solo se ordena alfabéticamente dentro de cada grupo.
    const groups = new Map<string, EquipoOption[]>();
    const order: string[] = [];
    dedupedList.forEach(opt => {
      const key = (hasGroupInfo ? opt.group : opt.club) || 'Otros equipos';
      if (!groups.has(key)) { groups.set(key, []); order.push(key); }
      groups.get(key)!.push(opt);
    });
    const result = order.map(key => [key, sortTeamOptions(groups.get(key)!)] as const);
    console.log('[EquipoSelect DEBUG] hasGroupInfo=', hasGroupInfo, 'hasClubInfo=', hasClubInfo, 'groups=', result.map(([k, v]) => ({ key: k, values: v.map(o => o.value) })));
    return result;
  }, [dedupedList, hasGroupInfo, hasClubInfo]);

  // Clave de la opción actualmente seleccionada: si se conoce el clubId se prioriza la
  // coincidencia exacta club+nombre; si no, se cae al primer equipo con ese nombre (dato legado).
  const selectedKey = useMemo(() => {
    if (!value) return '';
    if (selectedClubId) {
      const exact = options.find(o => o.value === value && (o.clubId ?? '') === selectedClubId);
      if (exact) return optionKey(exact);
    }
    const anyMatch = options.find(o => o.value === value);
    return anyMatch ? optionKey(anyMatch) : '';
  }, [value, selectedClubId, options]);

  if (isAdding) {
    return (
      <div className="space-y-2">
        {addNewMode === 'clubTeam' && (
          <div className="space-y-2">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Selecciona o crea un club
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                autoFocus
                value={newClubId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setNewClubId(selectedId);
                  if (selectedId === '__CREATE_NEW__') {
                    setNewClubName('');
                  } else {
                    const selected = clubs.find(c => String(c.id) === selectedId);
                    setNewClubName(selected?.nombre || '');
                  }
                }}
                disabled={isCreating || clubsLoading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 disabled:opacity-50"
              >
                <option value="">Selecciona un club...</option>
                {clubs.map(club => (
                  <option key={club.id} value={String(club.id)}>
                    {club.nombre}
                  </option>
                ))}
                <option value="__CREATE_NEW__">+ Crear nuevo club...</option>
              </select>
            </div>
            {newClubId === '__CREATE_NEW__' && (
              <input
                type="text"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') resetAddForm();
                }}
                placeholder="Nombre del nuevo club..."
                disabled={isCreating}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 disabled:opacity-50"
              />
            )}
          </div>
        )}
        <div className="space-y-2">
          <input
            type="text"
            autoFocus={addNewMode === 'team' || (addNewMode === 'clubTeam' && newClubId !== '__CREATE_NEW__')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              } else if (e.key === 'Escape') {
                resetAddForm();
              }
            }}
            placeholder="Nombre del equipo..."
            disabled={isCreating}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 disabled:opacity-50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || (addNewMode === 'clubTeam' && !newClubId) || isCreating}
              className="flex-1 px-3 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-black disabled:opacity-40"
            >
              <i className={`fa-solid ${isCreating ? 'fa-spinner animate-spin' : 'fa-check'}`}></i>
            </button>
            <button
              type="button"
              onClick={resetAddForm}
              disabled={isCreating}
              className="flex-1 px-3 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-black disabled:opacity-40"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        {createError && <p className="text-[10px] font-semibold text-red-600">{createError}</p>}
      </div>
    );
  }

  return (
    <SearchableSelect
      value={selectedKey}
      onChange={(e) => {
        if (e.target.value === '__ADD_NEW__') {
          setIsAdding(true);
        } else {
          const opt = options.find(o => optionKey(o) === e.target.value);
          if (opt) onChange(opt.value, opt.clubId);
        }
      }}
      className={className}
    >
      <option value="">{placeholder}</option>
      {groupedOptions
        ? groupedOptions.map(([club, teams]) => (
          <optgroup key={club} label={club}>
            {teams.map(team => (
              <option key={optionKey(team)} value={optionKey(team)}>
                {team.club ? `${team.value} (${team.club})` : team.value}
              </option>
            ))}
          </optgroup>
        ))
        : options.map(team => (
          <option key={optionKey(team)} value={optionKey(team)}>{team.value}</option>
        ))}
      <option value="__ADD_NEW__">{addLabel}</option>
    </SearchableSelect>
  );
};

export default EquipoSelect;
