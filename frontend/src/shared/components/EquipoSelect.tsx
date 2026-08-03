import React, { useState, useMemo } from 'react';

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
}

interface EquipoSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Equipos adicionales que existan en los datos (se mezclan con los defaults sin duplicados) */
  extraTeams?: (string | EquipoOption)[];
  /** Clases CSS del select */
  className?: string;
  /** Texto del placeholder / opción vacía */
  placeholder?: string;
}

const EquipoSelect: React.FC<EquipoSelectProps> = ({
  value,
  onChange,
  extraTeams = [],
  className = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900 appearance-none cursor-pointer',
  placeholder = 'Seleccionar...',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

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
    const seen = new Map<string, EquipoOption>();
    normalizedTeams.forEach(t => { if (!seen.has(t.value)) seen.set(t.value, t); });
    // Sin equipos dados de alta todavía: ofrecer catálogo genérico como punto de partida
    if (seen.size === 0) DEFAULT_EQUIPOS.forEach(t => seen.set(t, { value: t }));
    // Si el valor actual no está en la lista, añadirlo
    if (value && !seen.has(value)) seen.set(value, { value });
    return Array.from(seen.values());
  }, [normalizedTeams, value]);

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

  if (isAdding) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              onChange(newName.trim());
              setIsAdding(false);
              setNewName('');
            } else if (e.key === 'Escape') {
              setIsAdding(false);
              setNewName('');
            }
          }}
          placeholder="Nombre del equipo..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-black text-slate-900"
        />
        <button
          type="button"
          onClick={() => {
            if (newName.trim()) {
              onChange(newName.trim());
              setIsAdding(false);
              setNewName('');
            }
          }}
          className="px-3 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-black"
        >
          <i className="fa-solid fa-check"></i>
        </button>
        <button
          type="button"
          onClick={() => { setIsAdding(false); setNewName(''); }}
          className="px-3 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-black"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => {
        if (e.target.value === '__ADD_NEW__') {
          setIsAdding(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      <option value="">{placeholder}</option>
      {groupedOptions
        ? groupedOptions.map(([club, teams]) => (
          <optgroup key={club} label={club}>
            {teams.map(team => (
              <option key={`${club}-${team.value}`} value={team.value}>{team.value}</option>
            ))}
          </optgroup>
        ))
        : options.map(team => (
          <option key={team.value} value={team.value}>{team.value}</option>
        ))}
      <option value="__ADD_NEW__">+ Añadir nuevo equipo...</option>
    </select>
  );
};

export default EquipoSelect;
