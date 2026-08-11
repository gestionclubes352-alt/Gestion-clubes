import React, { useState, useMemo } from 'react';
import SearchableSelect from '@shared/components/SearchableSelect';

/** Opciones base que siempre aparecen en el desplegable de equipos */
const DEFAULT_EQUIPOS = [
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

/** Opción de equipo, opcionalmente asociada a un club (para diferenciar equipos homónimos de distintos clubes) */
export interface EquipoOption {
  value: string;
  club?: string;
  /** Id del club al que pertenece este equipo, para poder distinguir equipos homónimos de clubes distintos */
  clubId?: string;
}

export interface CreateEquipoOptionInput {
  value: string;
  club?: string;
}

/** Clave única de una opción: el nombre del equipo por sí solo puede repetirse entre clubes distintos */
const optionKey = (opt: EquipoOption) => `${opt.clubId ?? ''}::${opt.value}`;

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
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClubName, setNewClubName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  const options = useMemo(() => {
    // Se deduplica por club+nombre (no solo por nombre): equipos homónimos de clubes
    // distintos (p.ej. "Juvenil A" en dos clubes) deben aparecer ambos, no fusionarse.
    const seen = new Map<string, EquipoOption>();
    normalizedTeams.forEach(t => { const key = optionKey(t); if (!seen.has(key)) seen.set(key, t); });
    // Sin equipos dados de alta todavía: ofrecer catálogo genérico como punto de partida
    if (seen.size === 0 && useDefaultTeams) DEFAULT_EQUIPOS.forEach(t => { const opt = { value: t }; seen.set(optionKey(opt), opt); });
    // Si el valor actual no está en la lista, añadirlo (con su clubId conocido, si lo hay)
    const currentOpt = { value, clubId: selectedClubId };
    if (value && !seen.has(optionKey(currentOpt))) seen.set(optionKey(currentOpt), currentOpt);
    return Array.from(seen.values());
  }, [normalizedTeams, value, selectedClubId, useDefaultTeams]);

  const resetAddForm = () => {
    setIsAdding(false);
    setNewName('');
    setNewClubName('');
    setCreateError(null);
  };

  const handleCreate = async () => {
    const teamName = newName.trim();
    const clubName = newClubName.trim();
    if (!teamName || (addNewMode === 'clubTeam' && !clubName)) return;
    setCreateError(null);
    try {
      setIsCreating(true);
      if (onCreateOption) {
        const created = await onCreateOption({ value: teamName, club: addNewMode === 'clubTeam' ? clubName : undefined });
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
    if (!hasClubInfo) return null;
    const groups = new Map<string, EquipoOption[]>();
    options.forEach(opt => {
      const key = opt.club || 'Otros equipos';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(opt);
    });
    return Array.from(groups.entries());
  }, [options, hasClubInfo]);

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
        <div className="flex flex-col sm:flex-row gap-2">
          {addNewMode === 'clubTeam' && (
            <input
              type="text"
              autoFocus
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') resetAddForm();
              }}
              placeholder="Club..."
              disabled={isCreating}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 disabled:opacity-50"
            />
          )}
          <input
            type="text"
            autoFocus={addNewMode === 'team'}
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
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || (addNewMode === 'clubTeam' && !newClubName.trim()) || isCreating}
            className="px-3 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-black disabled:opacity-40"
          >
            <i className={`fa-solid ${isCreating ? 'fa-spinner animate-spin' : 'fa-check'}`}></i>
          </button>
          <button
            type="button"
            onClick={resetAddForm}
            disabled={isCreating}
            className="px-3 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-black disabled:opacity-40"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
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
